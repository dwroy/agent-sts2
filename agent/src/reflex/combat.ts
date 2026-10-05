/**
 * Combat (PLAN.md §6.1). The highest-frequency decision, so it carries the most structure:
 *
 *   1. code enumerates every legal card × target, plus potions and end_turn, and computes the numbers
 *   2. Jev picks one option, with the computed facts attached to each option
 *   3. code applies the safety floor, the confidence gate, and a deterministic fallback
 *
 * Jev never adds damage, never counts energy, and never derives whether a play is lethal.
 */

import { topAlternatives, type ChoiceAnswer } from "./jev/answers.js";
import { choiceQ } from "./jev/questions.js";
import type { ActionRequest } from "../hand/mod/client.js";
import { enemyJson, enemyViews, handCardJson, handViews, playerJson, potionViews } from "../memory/narrow.js";
import { playerPowers } from "../memory/narrow.js";
import { briefJson } from "../memory/run-brief.js";
import { afterPlayFirst, isPlayFirst, modelHandCard } from "./card-model.js";
import { resolveDamage } from "./damage.js";
import { startTurnHpLossOf } from "./start-loss.js";
import type { Decision, DecisionEnv, ResolvedAction } from "../memory/types.js";
import { asArray, asRecord, bool, num, numOrNull, str, type JsonValue } from "../core/util/json.js";

interface Candidate {
  key: string;
  intent: ActionRequest;
  summary: Record<string, JsonValue>;
  score: number;
  isEndTurn: boolean;
  lethal: boolean;
}

function describeOption(summary: Record<string, JsonValue>): JsonValue {
  return summary;
}

export function planCombat(env: DecisionEnv): Decision | null {
  const { state, knowledge, brief, thresholds } = env;
  const strict = env.strictJev;
  const combat = asRecord(state.raw["combat"]);
  const readiness = asRecord(combat["action_readiness"]);

  // The mod's single gate: false always means "wait", whatever the reason says (PLAN.md §2.1 fact 3).
  if (readiness["can_use_combat_actions"] === false) return null;
  // `play_card` is normally advertised alongside `end_turn`, but ending the turn must stay possible
  // even if it is not: otherwise a combat with nothing playable would deadlock.
  if (!state.available_actions.includes("play_card") && !state.available_actions.includes("end_turn")) return null;

  const player = asRecord(combat["player"]);
  const energy = num(player["energy"]);
  const stars = num(player["stars"]);
  const playerBlock = num(player["block"]);
  const playerHp = numOrNull(player["current_hp"]);
  const playerMaxHp = numOrNull(player["max_hp"]);

  const enemies = enemyViews({ raw: combat }, knowledge);
  const living = enemies.filter((enemy) => enemy.alive);
  const ourPowers = playerPowers(player);
  // Incoming damage is resolved with the same rules: our Vulnerable raises it, the enemy's Weak
  // lowers it, our Intangible caps it, and block is consumed across every attacker in order.
  const incomingOutcome = (() => {
    let block = playerBlock;
    let hpLoss = 0;
    let total = 0;
    const modifiers = new Set<string>();
    for (const enemy of living) {
      for (const attack of enemy.attacks) {
        const outcome = resolveDamage({
          perHit: attack.damage,
          hits: attack.hits,
          targetBlock: block,
          // The intent number already includes our Vulnerable and the enemy's Weak (WY41 F48 T4: the
          // intent showed 22, this path said 33).
          targetPowers: ourPowers.filter((power) => power.id !== "VULNERABLE_POWER"),
          attackerPowers: enemy.power_lines.filter((power) => power.id !== "WEAK_POWER"),
        });
        block = outcome.blockAfter;
        hpLoss += outcome.hpLoss;
        total += outcome.total;
        for (const note of outcome.modifiers) modifiers.add(note);
      }
    }
    return { hpLoss, total, modifiers: [...modifiers], blockAfter: block };
  })();
  // Cards that hurt while held at the end of the turn (Beckon 6 HP each, Burn 2): neither the enemy
  // intents nor the mod's lethal flag count them (F6NT F17 T11: 8 HP, two Beckons drawn by Burning
  // Pact, end turn shown as "incoming 0, not lethal"; they dealt 12).
  const heldModels = asArray(combat["hand"]).map((entry, fallbackIndex) => modelHandCard(entry, fallbackIndex, knowledge, str(asRecord(state.run?.raw)["character_id"])));
  const heldPenaltyOf = new Map(heldModels.map((model) => [model.index, model.heldPenalty ?? 0] as const));
  const heldHpLoss = heldModels.reduce((sum, model) => sum + (model.heldHpLoss ?? 0), 0);
  const heldDamage = heldModels.reduce((sum, model) => sum + Math.max(0, (model.heldPenalty ?? 0) - (model.heldHpLoss ?? 0)), 0);
  // HP lost at the start of our next turn (Crimson Mantle 1 a copy, Inferno 1 a copy) comes before we act
  // (24HM F33 T14: 1 HP predicted after the enemy turn, the Mantle's 1 killed us at the start of T15; C4F14F3XPN0N F33:
  // two Inferno+ took 2). The turn planner and the SL judge count it the same way (strategy/start-loss.ts).
  const mantle = ourPowers.find((power) => power.id === "CRIMSON_MANTLE_POWER")?.amount ?? 0;
  const inferno = ourPowers.find((power) => power.id === "INFERNO_POWER")?.amount ?? 0;
  const startTurnHpLoss = startTurnHpLossOf(state, inferno, mantle);
  const incoming = incomingOutcome.hpLoss + Math.max(0, heldDamage - incomingOutcome.blockAfter) + heldHpLoss + startTurnHpLoss;
  const endTurnWouldKill = bool(combat["end_turn_will_kill_player"]) || (playerHp !== null && incoming >= playerHp);
  const hand = handViews({ raw: combat }, knowledge);
  // Foul Potion hurts us too: never offered here either (WY41 F48: drunk at 7 HP; 39J9 before that).
  // Foul Potion included (Dai 2026-09-28: Jev decides); these per-card options simulate no potion.
  const potions = potionViews({ raw: asRecord(state.run?.raw) }, knowledge);

  const candidates: Candidate[] = [];
  const enemyByIndex = new Map(enemies.map((enemy) => [enemy.index, enemy]));

  // A card's own HP cost (Blood Wall, Offering, Hemokinesis) is paid in full, block or not (C2WY F22
  // T6: Blood Wall at 1 HP was listed as survivable and killed us).
  const hpCostByIndex = new Map(
    asArray(combat["hand"]).map((entry, fallbackIndex) => {
      const model = modelHandCard(entry, fallbackIndex, knowledge, str(asRecord(state.run?.raw)["character_id"]));
      return [model.index, model.hpLoss] as const;
    }),
  );
  const pushCard = (card: (typeof hand)[number], targetIndex: number | null, into: Candidate[] = candidates, budget = energy): void => {
    const target = targetIndex === null ? null : enemyByIndex.get(targetIndex) ?? null;
    const perHit = card.damage;
    // Modifier-aware: Vulnerable on the target, Weak on us, Intangible on the target, and block
    // consumed hit by hit. The mod's own number excludes all of these.
    const outcome =
      perHit === null || target === null
        ? null
        : resolveDamage({
            perHit,
            hits: card.hits,
            targetBlock: target.block,
            targetPowers: target.power_lines,
            attackerPowers: ourPowers,
          });
    const totalDamage = outcome?.total ?? (perHit === null ? null : perHit * card.hits);
    const damageAfterBlock = outcome?.hpLoss ?? null;
    const hpAfter =
      damageAfterBlock === null || target?.hp === null || target?.hp === undefined
        ? null
        : target.hp - damageAfterBlock;
    const kills = hpAfter !== null && hpAfter <= 0;
    const isLastEnemy = kills && living.length === 1;
    const blockGain = card.block ?? 0;
    const hpCost = hpCostByIndex.get(card.index) ?? 0;
    // Playing a card that hurts while held (a playable Beckon) takes its penalty out of the turn.
    // incoming already includes current block; only this card's new block reduces it further
    // (VLV17NUSFS61 F48 attempt 6 T5, Z6CFLDR3N4SB F48 attempt 1 T10; silent-0130).
    const incomingAfter = Math.max(0, incoming - (heldPenaltyOf.get(card.index) ?? 0) - blockGain) + hpCost;
    // Paying its HP cost kills us before anything else happens: not an option.
    if (hpCost > 0 && playerHp !== null && hpCost >= playerHp) return;

    const key = targetIndex === null ? card.key : `${card.key}->e${targetIndex}`;
    const summary: Record<string, JsonValue> = {
      action: target === null ? `Play ${card.name}` : `Play ${card.name} on ${target.name}`,
      cost: `${card.cost} energy`,
      text: card.text,
    };
    if (totalDamage !== null) {
      summary["damage"] = totalDamage;
      if (card.hits > 1) summary["hits"] = card.hits;
    }
    if (damageAfterBlock !== null && target?.hp !== null && target?.hp !== undefined) {
      summary["target_hp"] = `${target.hp} -> ${Math.max(0, hpAfter ?? 0)}`;
      summary["damage_after_block"] = damageAfterBlock;
      summary["kills_target"] = kills;
      if (outcome && outcome.modifiers.length > 0) summary["modifiers"] = outcome.modifiers.join("; ");
    }
    if (card.hits > 1 && totalDamage !== null) summary["total_damage"] = totalDamage;
    if (blockGain > 0) summary["block_gained"] = blockGain;
    if (hpCost > 0) summary["hp_cost"] = hpCost;
    summary["incoming_damage_after_this"] = incomingAfter;
    if (card.cost > budget) summary["warning"] = "costs more energy than you have";
    if (stars > 0) summary["stars_after"] = stars;

    const score =
      (isLastEnemy ? 100_000 : 0) +
      (kills ? 500 : 0) +
      (damageAfterBlock ?? 0) * 3 +
      (incoming > 0 ? blockGain * 2 : 0) +
      (card.cost > budget ? -1_000 : 0) -
      hpCost * 3;

    into.push({ key, intent: targetIndex === null ? { action: "play_card", card_index: card.index } : { action: "play_card", card_index: card.index, target_index: targetIndex }, summary, score, isEndTurn: false, lethal: kills });
  };

  for (const card of hand) {
    if (!card.playable) continue;
    if (card.requires_target) {
      for (const targetIndex of card.valid_targets) pushCard(card, targetIndex);
    } else {
      pushCard(card, null);
    }
  }
  // Enthralled (card-model playFirst): while it is in the hand the mod locks every other card (blocked_by_hook, preventer
  // ENTHRALLED; afterPlayFirst). Its option names what it unlocks and is worth the best of those with the energy left after it
  // (HYQW47E7CBSC F38 T4: it alone was playable, worth nothing, and the turn ended at 5 energy).
  const rawHand = asArray(combat["hand"]).map(asRecord);
  const locked = hand.filter((card) => !card.playable && rawHand.some((entry) => numOrNull(entry["index"]) === card.index && afterPlayFirst(entry)));
  const first = locked.length > 0 ? hand.find((card) => card.playable && isPlayFirst(card.card_id, card.text)) : undefined;
  if (first) {
    const left = energy - first.cost;
    const after: Candidate[] = [];
    for (const card of locked) {
      if (card.requires_target) {
        for (const targetIndex of card.valid_targets) pushCard(card, targetIndex, after, left);
      } else {
        pushCard(card, null, after, left);
      }
    }
    const best = Math.max(...after.map((candidate) => candidate.score));
    for (const candidate of candidates.filter((entry) => entry.intent.action === "play_card" && entry.intent.card_index === first.index)) {
      candidate.summary["unlocks"] = `nothing else can be played while it is in the hand; once it is played: ${[...new Set(locked.map((card) => card.name))].join(", ")} (${left} energy left)`;
      if (best > candidate.score) candidate.score = best;
    }
  }

  for (const potion of potions) {
    if (!potion.can_use) continue;
    const targets: (number | null)[] = potion.requires_target ? potion.valid_targets : [null];
    for (const targetIndex of targets) {
      const target = targetIndex === null ? null : enemyByIndex.get(targetIndex) ?? null;
      const key = targetIndex === null ? potion.key : `${potion.key}->e${targetIndex}`;
      candidates.push({
        key,
        intent:
          targetIndex === null
            ? { action: "use_potion", option_index: potion.slot }
            : { action: "use_potion", option_index: potion.slot, target_index: targetIndex },
        summary: {
          action: target === null ? `Drink ${potion.name}` : `Drink ${potion.name} on ${target.name}`,
          text: potion.text,
          simulated: "no: this potion's effect is not in any number here",
          note: endTurnWouldKill
            ? "emergency: the mod reports that ending the turn would be lethal"
            : "uses a consumable; only worth it if it changes the outcome",
        },
        // A consumable is never the code-side default unless the turn is lethal, and even then it only
        // has to beat `end_turn` — a real play (block or a kill) still outranks it. Jev may pick a
        // potion whenever it judges one worthwhile.
        score: endTurnWouldKill ? 5 : -50,
        isEndTurn: false,
        lethal: false,
      });
    }
  }

  const endTurnScore = endTurnWouldKill ? -1_000_000 : incoming === 0 ? 10 : -incoming;
  candidates.push({
    key: "end_turn",
    intent: { action: "end_turn" },
    summary: {
      action: "End the turn",
      incoming_damage: incoming,
      hp_after_enemy_turn: playerHp === null ? null : playerHp - incoming,
      block: playerBlock,
      lethal: endTurnWouldKill,
      note: endTurnWouldKill
        ? "the mod reports that ending the turn now would kill the player"
        : incoming === 0
          ? "no incoming damage is visible"
          : "the enemy turn will resolve",
    },
    score: endTurnScore,
    isEndTurn: true,
    lethal: endTurnWouldKill,
  });

  // Safety floor (PLAN.md §6.1 step 3.1). In strict mode it is disabled: the lethal flag is a fact we
  // put in front of the model (`situation.ending_turn_would_kill_me` and each option's `lethal`),
  // and the model decides. The filter only runs when we are allowed to override Jev.
  const safeCandidates =
    !strict && endTurnWouldKill && candidates.length > 1
      ? candidates.filter((candidate) => !candidate.isEndTurn)
      : candidates;

  if (safeCandidates.length === 0) return null;
  if (safeCandidates.length === 1 && safeCandidates[0]?.isEndTurn) {
    return { kind: "act", label: "combat/end_turn", intent: { action: "end_turn" }, rationale: "no playable cards; ending the turn" };
  }

  const byKey = new Map(safeCandidates.map((candidate) => [candidate.key, candidate]));
  const criteria: Record<string, string | null> = {};
  for (const candidate of safeCandidates) criteria[candidate.key] = JSON.stringify(describeOption(candidate.summary));

  const questionState: Record<string, JsonValue> = {
    run_brief: briefJson(brief),
    situation: {
      screen: "COMBAT",
      turn: state.turn,
      hp: playerHp === null ? null : `${playerHp}/${playerMaxHp ?? "?"}`,
      block: playerBlock,
      energy,
      stars,
      enemies_alive: living.length,
      incoming_damage_if_turn_ends: incoming,
      ending_turn_would_kill_me: endTurnWouldKill,
      warning: endTurnWouldKill ? "the mod reports that ending the turn now would kill the player" : null,
      cards_played_this_turn: num(player["cards_played_this_turn"]),
    },
    player: playerJson(player, knowledge),
    enemies: living.map(enemyJson),
    hand: hand.map(handCardJson),
    potions: potions.map((potion) => ({ key: potion.key, name: potion.name, text: potion.text, can_use: potion.can_use })),
    note: "Each option below already states its computed effect. Do not recompute it.",
    // SL (docs/sl.md): how the earlier attempts at this fight went (a retried fight only).
    ...(env.sl ? { previous_attempts: env.sl.previousAttempts } : {}),
  };

  const best = (pool: Candidate[]): Candidate => pool.reduce((a, b) => (b.score > a.score ? b : a));

  const fallbackResolve = (why: string, confidence: number | null): ResolvedAction => {
    const choice = best(safeCandidates);
    return {
      intent: choice.intent,
      rationale: `${why}; deterministic fallback chose ${choice.key} (${str(choice.summary["action"])})`,
      confidence,
      fallback: true,
    };
  };

  return {
    kind: "ask",
    label: "combat/play",
    state: questionState,
    questions: {
      play: choiceQ("Which single action should I take right now?", criteria),
      survival: choiceQ("If the enemy turn starts after my action, what is the worst realistic outcome?", {
        safe: "I take little or no damage",
        manageable: "I take damage but stay comfortably alive",
        dangerous: "I could drop low enough that the next turn is a problem",
        lethal: "I would probably die",
      }),
    },
    resolve(answers) {
      const answer = answers["play"];
      // Strict mode: an unusable answer means we cannot act on Jev's decision. Ask again next
      // iteration rather than quietly choosing for it.
      const unusable = (why: string): ResolvedAction =>
        strict
          ? { intent: null, rationale: `${why} (trust-jev: waiting to ask again instead of choosing in code)`, confidence: null, fallback: false }
          : fallbackResolve(why, null);

      if (!answer || answer.type !== "choice") return unusable("no usable answer from Jev");
      const chosen = byKey.get(answer.choice);
      if (!chosen) return unusable(`Jev chose unknown option "${answer.choice}"`);

      if (strict) {
        return {
          intent: chosen.intent,
          rationale: `Jev chose ${chosen.key} (${str(chosen.summary["action"])}) with confidence ${answer.confidence.toFixed(2)}`,
          confidence: answer.confidence,
          fallback: false,
        };
      }

      const survival = answers["survival"];
      const survivalChoice = survival?.type === "choice" ? survival.choice : null;

      // Safety override: never end the turn into a lethal the mod already flagged.
      if (chosen.isEndTurn && endTurnWouldKill) {
        return fallbackResolve("end_turn would be lethal and the mod flagged it, overriding", answer.confidence);
      }
      if (chosen.isEndTurn && survivalChoice === "lethal" && (survival as ChoiceAnswer).confidence >= thresholds.strong) {
        const alternative = best(safeCandidates.filter((candidate) => !candidate.isEndTurn));
        return {
          intent: alternative.intent,
          rationale: `Jev rated the incoming turn as lethal (${(survival as ChoiceAnswer).confidence.toFixed(2)}) instead of ending the turn`,
          confidence: answer.confidence,
          fallback: true,
        };
      }

      if (answer.confidence < thresholds.act && safeCandidates.length > 2) {
        // The shortlist is the model's top options plus the code-best ones. Real answers carry a
        // full distribution, but a sparse or partial one must not silently disable the re-ask.
        const keys: string[] = [];
        const seen = new Set<string>();
        for (const entry of topAlternatives(answer, 3)) {
          if (byKey.has(entry.option) && !seen.has(entry.option)) {
            seen.add(entry.option);
            keys.push(entry.option);
          }
        }
        for (const candidate of [...safeCandidates].sort((a, b) => b.score - a.score)) {
          if (keys.length >= 4) break;
          if (!seen.has(candidate.key)) {
            seen.add(candidate.key);
            keys.push(candidate.key);
          }
        }
        const shortlist = keys
          .map((key) => byKey.get(key))
          .filter((candidate): candidate is Candidate => candidate !== undefined);
        if (shortlist.length >= 2) {
          return {
            intent: null,
            rationale: `confidence ${answer.confidence.toFixed(2)} is below the act threshold; re-asking on the shortlist`,
            confidence: answer.confidence,
            fallback: false,
            reask: {
              instructions: "Which single action should I take right now? (shortlist)",
              criteria: Object.fromEntries(shortlist.map((candidate) => [candidate.key, JSON.stringify(candidate.summary)])),
              map: Object.fromEntries(shortlist.map((candidate) => [candidate.key, candidate.intent])),
              fallbackIntent: best(safeCandidates).intent,
              fallbackRationale: "shortlist answer was still below the act threshold; using the code choice",
              actThreshold: thresholds.act,
            },
          };
        }
      }

      if (answer.confidence < thresholds.act) {
        return fallbackResolve(`confidence ${answer.confidence.toFixed(2)} is below the act threshold`, answer.confidence);
      }

      return {
        intent: chosen.intent,
        rationale: `Jev chose ${chosen.key} (${str(chosen.summary["action"])}) with confidence ${answer.confidence.toFixed(2)}`,
        confidence: answer.confidence,
        fallback: false,
      };
    },
  };
}

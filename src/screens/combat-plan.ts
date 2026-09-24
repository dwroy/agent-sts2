/**
 * Combat, turn-planned (phase 2). Division of labour:
 *
 *   code  — enumerates every play order for the hand, simulates the turn, scores the end states
 *           (turn-solver.ts). Lethal, "only one line survives", and clear-best plans are played
 *           without asking anyone.
 *   Jev   — chooses between the few strategically different plans that code cannot separate
 *           (e.g. block now vs. set up Strength vs. race), and decides about potions when the turn
 *           is dangerous.
 *
 * A chosen plan is committed: its remaining steps are played without re-asking as long as the hand
 * is exactly what the plan expected. Anything unexpected (a draw, a random effect) invalidates it and
 * the turn is re-planned from the real board.
 *
 * Falls back to the per-card question (combat.ts) when the solver has nothing to offer: no plan
 * survives the turn, or the board is outside what the solver models.
 */

import { choiceQ } from "../jev/questions.js";
import type { ActionRequest } from "../mod/client.js";
import { playerJson, potionViews } from "../project/narrow.js";
import { briefJson } from "../project/run-brief.js";
import type { CombatPlanMemo, Decision, DecisionEnv, ResolvedAction } from "../project/types.js";
import { isModelledPotion, modelHandCard, modelPotion, type CardModel } from "../strategy/card-model.js";
import { distinctPlans, solveTurn, type EnemySim, type Plan, type PlayerSim, type SolverInput, type Step } from "../strategy/turn-solver.js";
import { asArray, asRecord, bool, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { planCombat as planCombatPerCard } from "./combat.js";

/** Enemy powers the solver models, or that do not change this turn's numbers. */
const MODELLED_ENEMY_POWERS = new Set([
  "VULNERABLE_POWER", "WEAK_POWER", "STRENGTH_POWER", "ARTIFACT_POWER", "INTANGIBLE_POWER", "SLIPPERY_POWER",
  "HARDENED_SHELL_POWER", "THORNS_POWER", "CURL_UP_POWER", "FLUTTER_POWER", "HARD_TO_KILL_POWER", "SLOW_POWER",
  "ILLUSION_POWER", "MINION_POWER", "TERRITORIAL_POWER", "PLOW_POWER", "ESCAPE_ARTIST_POWER", "PLATING_POWER",
  "SLUMBER_POWER", "INFESTED_POWER", "SWIPE_POWER", "IMBALANCED_POWER", "RITUAL_POWER", "SHRINK_POWER",
  "GUARDED_POWER", "SOAR_POWER", "SKITTISH_POWER", "REFLECT_POWER", "SUCK_POWER", "PAINFUL_STABS_POWER", "PAPER_CUTS_POWER",
  "CRAB_RAGE_POWER", "BURROWED_POWER", "RAMPART_POWER",
]);

/** Plans closer than this (in score points ≈ HP) are a judgement call and go to Jev. */
const CLOSE_CALL = 6;
const MAX_OPTIONS = 4;

function powerAmount(holder: Record<string, unknown>, id: string): number {
  for (const entry of asArray(holder["powers"])) {
    const power = asRecord(entry);
    if (str(power["power_id"]) === id) return numOrNull(power["amount"]) ?? 1;
  }
  return 0;
}

function enemySims(combat: Record<string, unknown>): EnemySim[] {
  return asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .map((enemy, fallbackIndex) => ({
      index: numOrNull(enemy["index"]) ?? fallbackIndex,
      name: str(enemy["name"], str(enemy["enemy_id"])),
      hp: num(enemy["current_hp"]),
      maxHp: num(enemy["max_hp"]),
      block: num(enemy["block"]),
      vulnerable: powerAmount(enemy, "VULNERABLE_POWER"),
      weak: powerAmount(enemy, "WEAK_POWER"),
      artifact: powerAmount(enemy, "ARTIFACT_POWER"),
      intangible: powerAmount(enemy, "INTANGIBLE_POWER") > 0,
      slippery: powerAmount(enemy, "SLIPPERY_POWER"),
      hpLossCap: powerAmount(enemy, "HARDENED_SHELL_POWER") > 0 ? powerAmount(enemy, "HARDENED_SHELL_POWER") : null,
      thorns: powerAmount(enemy, "THORNS_POWER"),
      curlUp: powerAmount(enemy, "CURL_UP_POWER"),
      flutter: powerAmount(enemy, "FLUTTER_POWER"),
      perHitCap: powerAmount(enemy, "HARD_TO_KILL_POWER") > 0 ? powerAmount(enemy, "HARD_TO_KILL_POWER") : null,
      slow: powerAmount(enemy, "SLOW_POWER") > 0,
      illusion: powerAmount(enemy, "ILLUSION_POWER") > 0,
      minion: powerAmount(enemy, "MINION_POWER") > 0,
      halved: powerAmount(enemy, "GUARDED_POWER") > 0 || powerAmount(enemy, "SOAR_POWER") > 0,
      skittish: powerAmount(enemy, "SKITTISH_POWER"),
      reflect: powerAmount(enemy, "REFLECT_POWER") > 0,
      punishesUnblocked: (powerAmount(enemy, "SUCK_POWER") > 0 ? 4 : 0) + (powerAmount(enemy, "PAINFUL_STABS_POWER") > 0 ? 3 : 0) + (powerAmount(enemy, "PAPER_CUTS_POWER") > 0 ? 5 : 0),
      unmodelled: asArray(enemy["powers"]).some((power) => !MODELLED_ENEMY_POWERS.has(str(asRecord(power)["power_id"]))),
      attacks: asArray(enemy["intents"])
        .map(asRecord)
        .flatMap((intent) => {
          const damage = numOrNull(intent["damage"]);
          if (damage === null) return [];
          return [{ damage, hits: Math.max(1, Math.round(numOrNull(intent["hits"]) ?? 1)) }];
        }),
    }));
}

export function fightKind(combat: Record<string, unknown>, env: DecisionEnv): SolverInput["fightKind"] {
  let kind: SolverInput["fightKind"] = "unknown";
  for (const entry of asArray(combat["enemies"])) {
    const type = env.knowledge.monster(str(asRecord(entry)["enemy_id"]))?.type ?? "";
    if (type === "Boss") return "boss";
    if (type === "Elite") kind = "elite";
    else if (type === "Normal" && kind === "unknown") kind = "monster";
  }
  return kind;
}

function handSignature(hand: CardModel[]): string {
  return hand
    .map((card) => `${card.cardId}${card.upgraded ? "+" : ""}`)
    .sort()
    .join(",");
}

function stepText(step: Step): string {
  return step.targetName ? `${step.name} -> ${step.targetName}` : step.name;
}

function describePlan(plan: Plan, playerHp: number): Record<string, JsonValue> {
  const o = plan.outcome;
  const summary: Record<string, JsonValue> = {
    plays: plan.steps.length === 0 ? "nothing (end the turn now)" : plan.steps.map(stepText).join(", then "),
    result: o.winsFight ? "wins the fight this turn" : o.dies ? "I DIE at the end of the turn" : `survives with ${o.hpAfter}/${playerHp} HP before healing`,
    hp_lost: o.hpLoss,
    damage_dealt: o.damageDealt,
  };
  if (o.kills.length > 0) summary["kills"] = o.kills.join(", ");
  if (!o.winsFight) summary["enemies_after"] = o.enemyHpAfter.filter((enemy) => enemy.hp > 0).map((enemy) => `${enemy.name} ${enemy.hp} HP${enemy.vulnerable ? `, Vulnerable ${enemy.vulnerable}` : ""}${enemy.weak ? `, Weak ${enemy.weak}` : ""}`).join("; ");
  if (o.blockGained > 0) summary["block_gained"] = o.blockGained;
  if (o.strengthGained > 0) summary["strength_gained"] = o.strengthGained;
  if (o.cardsDrawn > 0) summary["cards_drawn"] = o.cardsDrawn;
  if (o.energyLeft > 0) summary["energy_unused"] = o.energyLeft;
  if (o.unknownCards.length > 0) summary["unmodelled_cards"] = o.unknownCards.join(", ");
  return summary;
}

function intentFor(step: Step, hand: CardModel[]): ActionRequest | null {
  if (step.cardId.startsWith("POTION:")) {
    const slot = Number(step.cardId.split(":")[2]);
    return step.target === null ? { action: "use_potion", option_index: slot } : { action: "use_potion", option_index: slot, target_index: step.target };
  }
  const card = hand.find((entry) => entry.cardId === step.cardId && entry.playable);
  if (!card) return null;
  if (step.target === null) return { action: "play_card", card_index: card.index };
  if (!card.validTargets.includes(step.target)) return null;
  return { action: "play_card", card_index: card.index, target_index: step.target };
}

function firstIntent(plan: Plan, hand: CardModel[]): ActionRequest {
  const first = plan.steps[0];
  if (!first) return { action: "end_turn" };
  return intentFor(first, hand) ?? { action: "end_turn" };
}

/** What the hand should look like after the first step of `plan` (for the commitment check). */
function expectedHandAfterFirst(plan: Plan, hand: CardModel[]): string {
  const first = plan.steps[0];
  if (!first) return handSignature(hand);
  const played = hand.find((card) => card.cardId === first.cardId && card.playable);
  return handSignature(hand.filter((card) => card !== played));
}

function commit(env: DecisionEnv, turn: number | null, plan: Plan, hand: CardModel[], via: CombatPlanMemo["via"]): void {
  const first = plan.steps[0];
  const drawsOrRandom = first ? hand.find((card) => card.cardId === first.cardId)?.draw ?? 0 : 0;
  env.screenMemory.combatPlan =
    plan.steps.length > 1 && drawsOrRandom === 0
      ? { turn, remaining: plan.steps.slice(1), expectedHand: expectedHandAfterFirst(plan, hand), via }
      : null;
}

export function planCombatTurn(env: DecisionEnv): Decision | null {
  const { state } = env;
  const combat = asRecord(state.raw["combat"]);
  const readiness = asRecord(combat["action_readiness"]);
  if (readiness["can_use_combat_actions"] === false) return null;
  if (!state.available_actions.includes("play_card") && !state.available_actions.includes("end_turn")) return null;

  const player = asRecord(combat["player"]);
  const hand = asArray(combat["hand"]).map((entry, index) => modelHandCard(entry, index, env.knowledge));
  const enemies = enemySims(combat);
  if (enemies.length === 0) return null;

  const playerSim: PlayerSim = {
    hp: num(player["current_hp"]),
    maxHp: num(player["max_hp"]),
    block: num(player["block"]),
    energy: num(player["energy"]),
    weak: powerAmount(player, "WEAK_POWER") > 0,
    vulnerable: powerAmount(player, "VULNERABLE_POWER") > 0,
    intangible: powerAmount(player, "INTANGIBLE_POWER") > 0,
    shrunk: powerAmount(player, "SHRINK_POWER") > 0,
    juggernaut: powerAmount(player, "JUGGERNAUT_POWER"),
    rage: powerAmount(player, "RAGE_POWER"),
    keepsBlock: powerAmount(player, "BARRICADE_POWER") > 0 || powerAmount(player, "BLUR_POWER") > 0,
    gambit: powerAmount(player, "THE_GAMBIT_POWER") > 0,
    endTurnBlock: powerAmount(player, "PLATING_POWER") + powerAmount(player, "METALLICIZE_POWER"),
  };
  const kind = fightKind(combat, env);

  // 1. A committed plan whose board is exactly as expected: keep executing it.
  const memo = env.screenMemory.combatPlan;
  if (memo && memo.turn === state.turn && memo.remaining.length > 0 && memo.expectedHand === handSignature(hand)) {
    const next = memo.remaining[0]!;
    const intent = intentFor(next, hand);
    if (intent) {
      env.screenMemory.combatPlan =
        memo.remaining.length > 1
          ? { ...memo, remaining: memo.remaining.slice(1), expectedHand: handSignature(hand.filter((card) => card !== hand.find((entry) => entry.cardId === next.cardId && entry.playable))) }
          : null;
      return {
        kind: "act",
        label: "combat/plan-continue",
        intent,
        rationale: `continuing the ${memo.via === "jev" ? "Jev-chosen" : memo.via === "deepseek" ? "DeepSeek-chosen" : memo.via === "claude" ? "Claude-chosen" : "code-chosen"} plan: ${stepText(next)}`,
      };
    }
  }
  env.screenMemory.combatPlan = null;

  const playable = hand.filter((card) => card.playable);
  if (playable.length === 0) {
    return { kind: "act", label: "combat/end_turn", intent: { action: "end_turn" }, rationale: "no playable cards; ending the turn" };
  }

  const potionsAll = potionViews({ raw: asRecord(state.run?.raw) }, env.knowledge).filter((potion) => potion.can_use);
  const potionUseCost = kind === "boss" ? 0 : kind === "elite" ? 5 : 15;
  const potionCards = potionsAll
    .map((potion) => modelPotion(potion.potion_id, potion.name, potion.slot, potion.valid_targets, potionUseCost))
    .filter((card): card is CardModel => card !== null);
  const solved = solveTurn({
    hand: [...hand, ...potionCards],
    player: playerSim,
    enemies,
    fightKind: kind,
    turn: state.turn ?? 1,
    cardsPlayedThisTurn: num(player["cards_played_this_turn"]),
  });
  const best = solved.plans[0];
  if (!best) return planCombatPerCard(env);

  const endNow = solved.plans.find((plan) => plan.steps.length === 0);
  const modSaysLethal = bool(combat["end_turn_will_kill_player"]);
  const calcNote =
    endNow && endNow.outcome.dies !== modSaysLethal
      ? ` [calc mismatch: solver says ending now ${endNow.outcome.dies ? "kills" : "does not kill"}, mod says ${modSaysLethal ? "lethal" : "safe"}]`
      : "";

  // 2. Nothing survives: the solver has no good answer. Let the per-card question (with potions)
  //    handle it.
  if (best.outcome.dies) return planCombatPerCard(env);

  const potions = potionsAll.filter((potion) => !isModelledPotion(potion.potion_id));
  const dangerous =
    best.outcome.hpLoss >= Math.max(12, playerSim.hp * 0.4) || (kind !== "monster" && kind !== "unknown" && best.outcome.hpLoss >= 10);

  // 3. Code-decided cases.
  if (best.outcome.winsFight) {
    commit(env, state.turn, best, hand, "code");
    return { kind: "act", label: "combat/lethal", intent: firstIntent(best, hand), rationale: `lethal: ${best.steps.map(stepText).join(", ")}${calcNote}` };
  }
  const options = distinctPlans(solved.plans.filter((plan) => !plan.outcome.dies), MAX_OPTIONS);
  const second = options[1];
  const clear = !second || best.score - second.score >= CLOSE_CALL;
  if (clear && !(dangerous && potions.length > 0)) {
    commit(env, state.turn, best, hand, "code");
    return {
      kind: "act",
      label: "combat/plan",
      intent: firstIntent(best, hand),
      rationale: `code plan (${second ? `+${(best.score - second.score).toFixed(1)} over next` : "only line"}): ${best.steps.length ? best.steps.map(stepText).join(", ") : "end turn"}; hp -${best.outcome.hpLoss}, dmg ${best.outcome.damageDealt}${calcNote}`,
    };
  }

  // 4. A judgement call (or a dangerous turn with potions available): ask Jev.
  const criteria: Record<string, string | null> = {};
  const byKey = new Map<string, { plan?: Plan; potion?: ActionRequest; label: string }>();
  options.forEach((plan, index) => {
    const key = `plan${index + 1}`;
    criteria[key] = JSON.stringify(describePlan(plan, playerSim.maxHp));
    byKey.set(key, { plan, label: plan.steps.map(stepText).join(", ") || "end turn" });
  });
  if (dangerous) {
    for (const potion of potions) {
      const targets: (number | null)[] = potion.requires_target ? potion.valid_targets : [null];
      for (const target of targets.slice(0, 2)) {
        const key = target === null ? potion.key : `${potion.key}->e${target}`;
        const enemyName = target === null ? null : enemies.find((enemy) => enemy.index === target)?.name ?? `enemy ${target}`;
        criteria[key] = JSON.stringify({
          plays: `drink ${potion.name}${enemyName ? ` on ${enemyName}` : ""} first, then re-plan the turn`,
          text: potion.text,
          note: `best card plan alone loses ${best.outcome.hpLoss} HP this turn`,
        });
        byKey.set(key, {
          potion: target === null ? { action: "use_potion", option_index: potion.slot } : { action: "use_potion", option_index: potion.slot, target_index: target },
          label: `drink ${potion.name}`,
        });
      }
    }
  }

  const questionState: Record<string, JsonValue> = {
    run_brief: briefJson(env.brief),
    fight: kind,
    situation: {
      turn: state.turn,
      hp: `${playerSim.hp}/${playerSim.maxHp}`,
      block: playerSim.block,
      energy: playerSim.energy,
      incoming_if_i_do_nothing: endNow?.outcome.incomingAfterBlock ?? null,
    },
    player: playerJson(player, env.knowledge),
    enemies: asArray(combat["enemies"])
      .map(asRecord)
      .filter((enemy) => enemy["is_alive"] !== false)
      .map((enemy) => ({
        name: str(enemy["name"]),
        hp: `${num(enemy["current_hp"])}/${num(enemy["max_hp"])}`,
        block: num(enemy["block"]),
        intents: asArray(enemy["intents"]).map((intent) => `${str(asRecord(intent)["intent_type"])} ${str(asRecord(intent)["label"])}`).join(", "),
      })),
    note: "Each option is a whole turn, already simulated by code; its numbers are exact for this turn. Choose the one that is best for winning the whole fight, not just this turn.",
  };

  const fallback = (why: string): ResolvedAction => {
    commit(env, state.turn, best, hand, "code");
    return { intent: firstIntent(best, hand), rationale: `${why}; using the code-best plan`, confidence: null, fallback: true };
  };

  return {
    kind: "ask",
    label: dangerous && potions.length > 0 ? "combat/plan-choice+potion" : "combat/plan-choice",
    state: questionState,
    questions: { plan: choiceQ("Which plan should I play this turn?", criteria) },
    escalate: {
      question: "plan",
      below: kind === "elite" || kind === "boss" || dangerous ? 0.5 : 0.3,
      why: `${kind} fight${dangerous ? ", dangerous turn" : ""}`,
    },
    resolve(answers): ResolvedAction {
      const answer = answers["plan"];
      if (!answer || answer.type !== "choice") return fallback("no usable answer from Jev");
      const chosen = byKey.get(answer.choice);
      if (!chosen) return fallback(`Jev chose unknown option "${answer.choice}"`);
      if (chosen.potion) {
        env.screenMemory.combatPlan = null;
        return { intent: chosen.potion, rationale: `Jev chose to ${chosen.label} (confidence ${answer.confidence.toFixed(2)})`, confidence: answer.confidence, fallback: false };
      }
      const plan = chosen.plan!;
      commit(env, state.turn, plan, hand, "jev");
      const rank = options.indexOf(plan) + 1;
      return {
        intent: firstIntent(plan, hand),
        rationale: `Jev chose plan ${rank}/${options.length} (${chosen.label}) with confidence ${answer.confidence.toFixed(2)}; code rank ${rank}${calcNote}`,
        confidence: answer.confidence,
        fallback: false,
      };
    },
  };
}

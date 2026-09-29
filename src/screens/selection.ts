/**
 * Card selection screens: smith, remove, transform, enchant, and combat multi-select (PLAN.md §6.4).
 *
 * Multi-select is driven to `min_select` and then confirmed: asking the model once per pick keeps
 * each question local and avoids multi-step plans, which Jev is documented to handle poorly.
 */

import { asArray, asRecord, bool, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { RUN_PLAN_WANT_BONUS } from "../strategy/run-plan.js";
import { deckEntries, describeDeck } from "../project/deck.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import { buildPickDecision, type PickOption } from "./pick.js";
import { buildFacts, deepseekDecides } from "../strategy/build-facts.js";
import { cardValue, damageRole, deckProfile, isBlockCardId } from "../strategy/card-value.js";
import { expectedNextDamage, meanMoveDamage } from "../knowledge/move-model.js";
import { freeCardPick, modelHandCard, thisTurnScore, type CardModel, type ThisTurnBoard } from "../strategy/card-model.js";
import { exhaustPileSize, fightPlaysPerTurn } from "./combat-plan.js";
import { sameCard, selectionTask, type DeckTask, type TargetScore } from "./oneshot.js";

export function planSelection(env: DecisionEnv): Decision | null {
  const { state, knowledge } = env;
  const selection = asRecord(state.raw["selection"]);
  if (!state.available_actions.includes("select_deck_card") && !state.available_actions.includes("confirm_selection")) {
    return null;
  }

  const kind = str(selection["kind"]);
  const prompt = str(selection["prompt"], "Choose a card.");
  const min = numOrNull(selection["min_select"]) ?? 1;
  const max = numOrNull(selection["max_select"]) ?? min;
  const selected = numOrNull(selection["selected_count"]) ?? 0;
  const canConfirm = bool(selection["can_confirm"]);

  // "Up to N" enchant/upgrade screens (min 0): confirming with nothing selected hung the mod's
  // confirm_selection for good (Twisted Hammer, 2026-09-24), and picking is a pure gain anyway.
  const pickFirst = selected === 0 && (kind === "deck_enchant_select" || kind === "deck_upgrade_select");
  // "Discard/replace any number" (Gambler's Brew, min 0): confirming at once threw the potion away
  // (1ZQJ T4: "selected 0/0 required"). Code picks the dead cards one by one, then confirms.
  if (kind === "combat_hand_select" && min === 0 && /弃|替换|discard|replace/i.test(prompt)) {
    // The discards the combat plan drank it for (turn-solver gambleWays), while they are in hand.
    const planned = env.screenMemory.gambleDiscards;
    if (planned && planned.turn === state.turn) {
      const cards = asArray(selection["cards"]).map(asRecord);
      const left = [...planned.cardIds];
      for (const card of cards.filter((entry) => bool(entry["selected"]))) {
        const at = left.indexOf(str(card["card_id"]));
        if (at >= 0) left.splice(at, 1);
      }
      const next = cards.find((card) => !bool(card["selected"]) && left.includes(str(card["card_id"])));
      if (next && selected < max) {
        return { kind: "act", label: "selection/discard", intent: { action: "select_deck_card", option_index: numOrNull(next["index"]) ?? 0 }, rationale: `code: discard ${str(next["name"], str(next["card_id"]))} (the combat plan's Gambler's Brew discard)` };
      }
      if (canConfirm && selected > 0) return { kind: "act", label: "selection/confirm", intent: { action: "confirm_selection" }, rationale: `selected ${selected}: the combat plan's discards` };
    }
    const pick = discardPick(asRecord(state.raw["combat"]), asArray(selection["cards"]).map(asRecord), knowledge);
    if (pick && selected < max) {
      return { kind: "act", label: "selection/discard", intent: { action: "select_deck_card", option_index: pick.index }, rationale: `code: discard ${pick.name} (${pick.why})` };
    }
    if (canConfirm) return { kind: "act", label: "selection/confirm", intent: { action: "confirm_selection" }, rationale: `selected ${selected}; nothing else worth discarding` };
  }
  // Touch of Insanity ("选择一张牌使其免费"): the most expensive card, the one the solver planned with
  // (G8AQ T4: the model made a 1-cost Twin Strike free).
  if (kind === "combat_hand_select" && selected === 0 && /免费|free/i.test(prompt)) {
    const pick = freePick(asRecord(state.raw["combat"]), asArray(selection["cards"]).map(asRecord), knowledge);
    if (pick) {
      return { kind: "act", label: "selection/free-card", intent: { action: "select_deck_card", option_index: pick.index }, rationale: `code: make ${pick.name} free for this combat (highest cost, ${pick.cost} energy)` };
    }
  }
  // "Exhaust / take any number" (min 0) screens: confirming with nothing picked wasted the potion or
  // card (BFVA F33 T1: Ashwater with Howl from Beyond+ in hand, the planned exhaust confirmed at 0/1;
  // T4: Neow's Fury "put up to 2 into your hand" confirmed at 0/2). Code picks, then confirms.
  if (kind === "combat_hand_select" && min === 0 && selected < max) {
    const offered = asArray(selection["cards"]).map(asRecord).filter((card) => !bool(card["selected"]));
    if (/消耗|exhaust/i.test(prompt)) {
      const context = combatExhaustContext(state.raw, offered, knowledge);
      // Only what is better gone: Howl from Beyond (it replays from the exhaust pile), Status, Curse.
      const worth = offered
        .map((card) => ({ card, score: combatExhaustScore(str(card["card_id"]), str(card["card_type"], knowledge.card(str(card["card_id"]))?.type ?? ""), context, isBlockCard(card)) }))
        .filter((entry) => entry.score >= 90)
        .sort((a, b) => b.score - a.score)[0];
      if (worth) {
        return { kind: "act", label: "selection/exhaust", intent: { action: "select_deck_card", option_index: numOrNull(worth.card["index"]) ?? 0 }, rationale: `code: exhaust ${str(worth.card["name"], str(worth.card["card_id"]))} (${worth.score >= 200 ? "replays from the exhaust pile" : "junk"})` };
      }
    } else if (/手牌|into your hand/i.test(prompt)) {
      const combat = asRecord(state.raw["combat"]);
      const incoming = incomingDamage(combat);
      const enemies = Math.max(1, asArray(combat["enemies"]).filter((enemy) => asRecord(enemy)["is_alive"] !== false).length);
      const best = offered
        .map((card, fallbackIndex) => ({ card, score: thisTurnScore(modelHandCard(card, numOrNull(card["index"]) ?? fallbackIndex, knowledge), incoming, enemies, thisTurnBoard(state.raw, knowledge)) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)[0];
      if (best) {
        return { kind: "act", label: "selection/take", intent: { action: "select_deck_card", option_index: numOrNull(best.card["index"]) ?? 0 }, rationale: `code: take ${str(best.card["name"], str(best.card["card_id"]))} into the hand` };
      }
    }
  }
  // BUILD_ONESHOT: the card(s) DeepSeek named with the shop/rest/event choice that opened this screen.
  const planned = pendingPickStep(env, kind, prompt, selected, max);
  if (planned) return planned;
  if (selected >= min && canConfirm && !pickFirst) {
    return { kind: "act", label: "selection/confirm", intent: { action: "confirm_selection" }, rationale: `selected ${selected}/${min} required` };
  }
  if (selected >= max) return null; // the mod usually closes the screen itself; wait for it

  const isUpgrade = kind === "deck_upgrade_select";
  // The mod reports "pick cards to ADD to the deck" (events) with the same kind as removal; only the
  // prompt tells them apart. Scoring it as a removal picked the worst cards on a live run.
  // "Add to deck" and "put on top of the draw pile" (Headbutt) both want the BEST card, yet the mod
  // labels them like a removal.
  // A removal only ever offers cards from the deck; an offer containing a card the deck does not have
  // is an "add" (events phrase it as just "choose a card").
  const deckIds = new Set(deckEntries(state, knowledge).map((entry) => entry.card_id));
  const offersNewCards =
    kind === "deck_card_select" &&
    asArray(selection["cards"]).some((card) => !deckIds.has(str(asRecord(card)["card_id"])));
  const isAdd = offersNewCards || /加入到?你的.{0,12}牌组|add .{0,30}to your deck|抽牌堆顶|top of your draw pile/i.test(prompt);
  // "Choose a card in hand to exhaust" (Baking Gloves every turn, True Grit+, Burning Pact …): code
  // gives up the least valuable card for this fight (combatExhaustScore) instead of asking every turn.
  const isExhaust = kind === "combat_hand_select" && /消耗|exhaust/i.test(prompt);
  // A card offered into the hand mid-combat (Attack/Skill/Power potions, "choose 1 of 3", Secret
  // Weapon): it is for this turn, so what it does now counts, not its deck-building rating (7Q5G T5:
  // DeepSeek took Bloodletting at 11 HP facing 28 as "an A-tier energy card"; 1R3C T1: Stoke).
  const combat = asRecord(state.raw["combat"]);
  const forThisTurn =
    state.in_combat &&
    !isExhaust &&
    !kind.startsWith("combat_hand") &&
    (kind === "choose_card_select" || /加入你的手牌|放入你的手牌|into your hand/i.test(prompt));
  const incoming = forThisTurn ? incomingDamage(combat) : 0;
  const livingEnemies = asArray(combat["enemies"]).filter((enemy) => asRecord(enemy)["is_alive"] !== false).length;
  const board = forThisTurn ? thisTurnBoard(state.raw, knowledge) : {};
  const exhaustContext = isExhaust ? combatExhaustContext(state.raw, asArray(selection["cards"]).map(asRecord), knowledge) : null;
  // Headbutt in combat: the card on top of the draw pile is next turn's first draw. With a big hit
  // coming it should be block (Y27B F33 T10: Pommel Strike+ went on top instead of Flame Barrier, 24
  // block with Unmovable; T11's 36 overwhelm killed us with the demon at 12/379; VQSA twice too).
  const onTop = state.in_combat && /抽牌堆顶|top of your draw pile/i.test(prompt);
  const topContext = onTop ? combatExhaustContext(state.raw, asArray(selection["cards"]).map(asRecord), knowledge) : null;
  const topDanger = topContext !== null && topContext.hp !== undefined && topContext.incoming >= topContext.hp * 0.3;
  const candidates = asArray(selection["cards"])
    .map(asRecord)
    .filter((card) => !bool(card["selected"]))
    .filter((card) => !isUpgrade || !bool(card["upgraded"]));

  if (candidates.length === 0) {
    // Nothing left to pick but the screen still waits for a confirm (VC4LRL945UEF: after two discards
    // the mod sent no selection payload and only confirm_selection; 25 min stuck).
    if (state.available_actions.includes("confirm_selection") && (selected > 0 || Object.keys(selection).length === 0)) {
      return { kind: "act", label: "selection/confirm", intent: { action: "confirm_selection" }, rationale: "nothing left to select: confirming" };
    }
    return null;
  }

  const entries = deckEntries(state, knowledge);
  // Cards the turn's plan still means to play stay out of an exhaust pick (F3SS F33 T5: Brand took the
  // Bash+ the plan played next).
  const plannedIds = new Set(isExhaust ? (env.screenMemory.planBeforeSelection ?? []).map((step) => `${step.cardId}${step.upgraded ? "+" : ""}`) : []);
  const options: PickOption[] = candidates.map((card, fallbackIndex) => {
    const index = numOrNull(card["index"]) ?? fallbackIndex;
    const cardId = str(card["card_id"]);
    const info = knowledge.card(cardId);
    const name = str(card["name"], info?.name ?? cardId);
    return {
      key: `card${index}`,
      label: name,
      intent: { action: "select_deck_card", option_index: index },
      // Removing/exhausting: an upgraded copy is worth keeping over a plain one (Strike+ vs Strike tied).
      score: forThisTurn
        ? thisTurnScore(modelHandCard(card, index, knowledge), incoming, Math.max(1, livingEnemies), board)
        : topDanger
          ? (isBlockCard(card) && cardId !== "THE_GAMBIT" ? 100 + (modelHandCard(card, index, knowledge).block ?? 0) : 0) + selectionScore("deck_add_select", cardId, str(card["card_type"], info?.type ?? "")) / 10
        : exhaustContext
          ? combatExhaustScore(cardId, str(card["card_type"], info?.type ?? ""), exhaustContext, isBlockCard(card), exhaustCardOf(modelHandCard(card, index, knowledge))) - (bool(card["upgraded"]) ? 8 : 0) -
            (plannedIds.has(`${cardId}${bool(card["upgraded"]) ? "+" : ""}`) ? PLANNED_CARD_KEEP : 0)
          : selectionScore(isAdd ? "deck_add_select" : kind, cardId, str(card["card_type"], info?.type ?? "")) -
            (!isAdd && !isUpgrade && bool(card["upgraded"]) ? 8 : 0) +
            // RUN_PLAN=v1: the plan's removal targets go first; its wanted cards are what an add takes.
            (kind === "deck_card_select" && !isAdd && env.screenMemory.runPlan?.remove.includes(cardId) ? 40 : 0) +
            (isAdd && env.screenMemory.runPlan?.want.includes(cardId) ? RUN_PLAN_WANT_BONUS : 0),
      summary: {
        card: name,
        upgraded: bool(card["upgraded"]),
        type: str(card["card_type"], info?.type ?? ""),
        cost: numOrNull(card["energy_cost"]) ?? info?.cost ?? null,
        text: truncate(str(card["resolved_rules_text"]) || info?.description || "", 160),
      } satisfies JsonValue,
    };
  });

  const verb = forThisTurn
    ? "take into my hand"
    : isExhaust
    ? "exhaust"
    : isAdd
    ? "add"
    : isUpgrade
    ? "upgrade"
    : kind === "deck_card_select"
      ? "remove"
      : kind === "deck_transform_select"
        ? "transform"
        : kind === "deck_enchant_select"
          ? "enchant"
          : "choose";

  // Knowledge Demon's Curse of Knowledge: code picks, each curse costed in HP for this deck and board
  // (curseCosts). Disintegration (6 a turn, stacking) over a long fight cost ~100 HP and lost
  // DG1CDGW8Y5JE and VKPXGMV8YV31 from full HP; Sloth (3 cards a turn) costs nothing to a deck that
  // plays 3 a turn, but Y3XT F33 T5 took it with Hellraiser up: the auto-played Strikes used the cap and
  // Impervious / Defend / a finisher were locked T6-T8 (64 -> 12 HP). Rupture turns Disintegration into
  // Strength, so then it is the pick; Disintegration that would eat the HP left is the last one.
  const curseIds = candidates.map((card) => str(card["card_id"]));
  if (curseIds.length > 1 && curseIds.every((id) => KNOWLEDGE_CURSES.has(id))) {
    const turn = state.turn ?? 1;
    const disintegration = candidates.find((card) => str(card["card_id"]) === "DISINTEGRATION");
    const sloth = candidates.find((card) => str(card["card_id"]) === "SLOTH");
    const costs = curseCosts(combat, {
      turn,
      disintegration: disintegration ? disintegrationAmount(disintegration) : 0,
      slothCap: sloth ? dynamicValue(sloth, /Sloth/i) ?? SLOTH_DEFAULT_CAP : SLOTH_DEFAULT_CAP,
      handPlays: fightPlaysPerTurn(env, turn),
      deck: asArray(asRecord(state.run?.raw)["deck"]).map(asRecord),
      maxEnergy: numOrNull(asRecord(state.run?.raw)["max_energy"]) ?? CURSE_FALLBACK_ENERGY,
    });
    const ranked = curseIds.map((id, i) => [costs.rank(id), i] as const).sort((a, b) => a[0] - b[0]);
    const best = options[ranked[0]![1]]!;
    const shown = curseIds.map((id) => `${id} ${costs.text(id)}`).join("; ");
    return { kind: "act", label: "selection/curse", intent: best.intent, rationale: `code: Knowledge Demon curse -> ${best.label} (HP cost for this deck: ${shown}; ${costs.basis})` };
  }

  const params = {
    label: `selection/${verb}`,
    instructions: forThisTurn
      ? `Which card should I ${verb}? This card is only for this turn — judge its immediate effect (block against the incoming attack, damage, lethal), not its deck-building rating.`
      : `Which card should I ${verb}?`,
    actThreshold: env.thresholds.act,
    strictJev: env.strictJev,
    escalateBelow: 0.4,
    options,
    // Exhaust picks happen every turn with Baking Gloves and are low-stakes: code always decides.
    codeMargin: env.combatPlanner === "card" || verb === "choose" || verb === "enchant" ? undefined : verb === "exhaust" || topDanger ? 0 : 6,
    maxModelOptions: 4,
    state: {
      run_brief: briefJson(env.brief),
      situation: {
        screen: "CARD_SELECTION",
        task: verb,
        prompt,
        selecting: `${selected + 1} of ${max}${min !== max ? ` (at least ${min})` : ""}`,
        ...(kind === "deck_enchant_select" ? { enchantment: enchantmentNote(env) } : {}),
        ...(forThisTurn
          ? {
              note: "this card is only for this turn — judge its immediate effect",
              hp: `${numOrNull(asRecord(combat["player"])["current_hp"]) ?? "?"}/${numOrNull(asRecord(combat["player"])["max_hp"]) ?? "?"}`,
              energy: numOrNull(asRecord(combat["player"])["energy"]),
              incoming_attack: incoming,
            }
          : {}),
      },
      deck: describeDeck(entries),
      candidates: options.map((option) => option.summary as JsonValue),
    },
  };
  // BUILD_DECIDER=deepseek: out-of-combat deck picks (upgrade, remove, transform, add, enchant, choose) are
  // DeepSeek's call; in-combat picks stay with code and Jev.
  if (!deepseekDecides(env) || forThisTurn || isExhaust || onTop) return buildPickDecision(params);
  const why = SELECTION_WHY[isAdd ? "add" : verb] ?? "code's ranking for this pick";
  return buildPickDecision({
    ...params,
    options: options.map((option) => ({ ...option, why })),
    deepseek: { facts: buildFacts(env, { selection: { task: verb, prompt, selecting: `${selected + 1} of ${max}${min !== max ? ` (at least ${min})` : ""}`, ...(kind === "deck_enchant_select" ? { enchantment: enchantmentNote(env) } : {}) } }) },
  });
}

/**
 * The next card a one-shot plan named for this screen (screenMemory.pendingPick), as a plan step; null when
 * there is none. A screen of another task, a card the screen does not offer, or another run/floor drops the
 * pick: this screen is then asked as before (the step-by-step question).
 */
export function pendingPickStep(env: DecisionEnv, kind: string, prompt: string, selected: number, max: number): Decision | null {
  const pending = env.screenMemory.pendingPick;
  if (!pending || env.state.in_combat) return null;
  const drop = (): null => {
    env.screenMemory.pendingPick = undefined;
    return null;
  };
  if (pending.runId !== str(env.state.raw["run_id"]) || pending.floor !== (env.state.run?.floor ?? null)) return drop();
  if (selectionTask(kind, prompt) !== pending.task || pending.cards.length === 0) return drop();
  if (selected >= max) return null;
  const target = pending.cards[0]!;
  const card = asArray(asRecord(env.state.raw["selection"])["cards"])
    .map(asRecord)
    .find((candidate) => !bool(candidate["selected"]) && sameCard(candidate, target));
  if (!card) return drop();
  const index = numOrNull(card["index"]) ?? 0;
  const name = pending.names[0] ?? str(card["name"], target.card_id);
  return {
    kind: "act",
    label: `selection/${pending.task}`,
    intent: { action: "select_deck_card", option_index: index },
    rationale: `DeepSeek plan ${pending.ref} step ${pending.step}: ${pending.task} ${name} (named with the ${pending.source} choice)`,
    plan: { ref: pending.ref, step: pending.step, choice: name },
    apply: () => {
      pending.cards.shift();
      pending.names.shift();
      pending.step += 1;
      const shopPlan = env.screenMemory.shopPlan;
      if (pending.source === "shop" && shopPlan && shopPlan.ref === pending.ref) shopPlan.actions += 1;
      if (pending.cards.length === 0 && env.screenMemory.pendingPick === pending) env.screenMemory.pendingPick = undefined;
    },
  };
}

/**
 * The enchantment an enchant screen applies: the game's prompt does not name it (「选择1张牌来附魔。」), so
 * the enchantments the event just before named, with their measured effects (knowledge/enchant-text.ts).
 */
export function enchantmentNote(env: DecisionEnv): string {
  const memo = env.screenMemory.eventEnchants;
  const fresh = memo !== undefined && memo.runId === str(env.state.raw["run_id"]) && memo.floor === (env.state.run?.floor ?? null);
  if (!fresh || memo.lines.length === 0) return "not named by the game: effect text unavailable";
  return memo.lines.length === 1 ? memo.lines[0]! : `one of the event's: ${memo.lines.join(" | ")}`;
}

/**
 * Code's ranking of a deck card as the target of a one-shot follow-up (the value the selection screen
 * would give it; screens/oneshot.ts withFollowUp): higher = picked first.
 */
export function followUpTargetScore(env: DecisionEnv, task: DeckTask): TargetScore {
  const kind = task === "upgrade" ? "deck_upgrade_select" : task === "remove" ? "deck_card_select" : task === "transform" ? "deck_transform_select" : null;
  return (card) => {
    if (!kind) return { score: 0, why: `code does not rank cards to ${task}` };
    const id = card.identity.card_id;
    const score =
      selectionScore(kind, id, card.type) -
      (task !== "upgrade" && card.identity.upgraded ? 8 : 0) +
      (task === "remove" && env.screenMemory.runPlan?.remove.includes(id) ? 40 : 0);
    return { score, why: SELECTION_WHY[task] ?? "code's ranking" };
  };
}

/** What code's value means on each out-of-combat selection (DeepSeek's view). */
const SELECTION_WHY: Record<string, string> = {
  upgrade: "upgrade priority: Demon Form, Offering, Bash, Pyre, Corruption … first, then card value; Strikes/Defends 10",
  remove: "removal order: Curse 100, Status 90, Strike 80, Defend 70, else 100 - card value; Strength cards -50; run plan removals +40",
  transform: "transform order: Curse 100, Status 90, Strike 80, Defend 70, else 100 - card value",
  add: "card value for the deck (run plan wanted +bonus)",
};

/**
 * Code-side preference for deck selection screens (phase 2). Upgrade: the cards whose upgrade matters
 * most (Bash's extra Vulnerable, then the strongest cards). Remove/transform: curses and statuses,
 * then Strikes, then Defends. Higher is better.
 */
const KNOWLEDGE_CURSES = new Set(["SLOTH", "MIND_ROT", "DISINTEGRATION", "WASTE_AWAY"]);

/** Damage per turn assumed when none has been dealt yet (the curses come on T1/T5/T9). */
const CURSE_FALLBACK_DAMAGE = 25;
/** HP kept in hand for the demon's own attacks when Disintegration is weighed against the others. */
const CURSE_HP_MARGIN = 20;
/** Enemy damage per turn when the move model does not know the enemy (Knowledge Demon's cycle: ~15). */
const CURSE_FALLBACK_INCOMING = 15;
/** Energy per turn when the run does not say. */
const CURSE_FALLBACK_ENERGY = 3;
/** Cards drawn at the start of a turn. */
const CURSE_HAND_DRAW = 5;
/** Block of a block card when the deck's cards carry no Block value. */
const CURSE_FALLBACK_BLOCK = 6;
/** Sloth's cap when the card does not carry it. */
const SLOTH_DEFAULT_CAP = 3;

/** The Disintegration a curse card adds (6, 7, 8 on the three offers). */
function disintegrationAmount(card: Record<string, unknown>): number {
  const dynamic = dynamicValue(card, /Disintegration/i);
  if (dynamic !== null) return dynamic;
  const text = /(\d+)点伤害|(\d+) damage/i.exec(str(card["resolved_rules_text"]));
  return text ? Number(text[1] ?? text[2]) : 0;
}

function dynamicValue(card: Record<string, unknown>, name: RegExp): number | null {
  for (const entry of asArray(card["dynamic_values"])) {
    const value = asRecord(entry);
    if (name.test(str(value["name"]))) return numOrNull(value["current_value"]);
  }
  return null;
}

export interface CurseInputs {
  turn: number;
  /** Disintegration the offered card adds (0 when not offered). */
  disintegration: number;
  /** Sloth's cards-per-turn cap. */
  slothCap: number;
  /** Mean cards played by hand per finished turn of this fight (combat-plan fightPlaysPerTurn), or null. */
  handPlays: number | null;
  /** The run's deck (state.run.deck). */
  deck: Record<string, unknown>[];
  maxEnergy: number;
}

/**
 * Each Knowledge Demon curse's cost in HP over the rest of the fight, measured on this deck and board:
 * - damage per turn so far (25 before any), enemy HP left -> turns left N;
 * - cards a turn C = cards played by hand per turn this fight (energy before any turn) + the Strikes
 *   Hellraiser plays by itself (draws x the deck's share of cards named Strike: they count toward Sloth
 *   and cost no energy);
 * - a curse that takes x cards a turn (Sloth: C - cap; Mind Rot: one draw, x = min(1, C / draws);
 *   Waste Away: one energy of the hand-played cards, x = hand plays / energy) cuts the damage by x/C:
 *   the fight lasts N' = N / (1 - x/C) turns, each extra one a turn of the enemy's damage (move model,
 *   15 when unknown), and the lost cards' block (the deck's block-card share of the hand-played
 *   cards x their mean Block) is lost on each of the N' turns;
 * - Disintegration costs its amount x N (Rupture: -1, it is the pick), and when it with the one
 *   already on us and a 20 HP margin exceeds the HP it ranks last whatever the others cost (PU21 T9).
 */
export function curseCosts(combat: Record<string, unknown>, inputs: CurseInputs): { rank: (id: string) => number; text: (id: string) => string; basis: string } {
  const { turn, deck } = inputs;
  const player = asRecord(combat["player"]);
  const powers = asArray(player["powers"]).map(asRecord);
  const has = (id: string): number => numOrNull(powers.find((power) => str(power["power_id"]) === id)?.["amount"]) ?? 0;
  const enemies = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  const left = enemies.reduce((sum, enemy) => sum + (numOrNull(enemy["current_hp"]) ?? 0), 0);
  const dealt = enemies.reduce((sum, enemy) => sum + Math.max(0, (numOrNull(enemy["max_hp"]) ?? 0) - (numOrNull(enemy["current_hp"]) ?? 0)), 0);
  const perTurn = turn > 1 ? Math.max(10, dealt / (turn - 1)) : CURSE_FALLBACK_DAMAGE;
  const turnsLeft = left / perTurn;
  const hp = numOrNull(player["current_hp"]) ?? 0;
  const incoming = enemies.reduce((sum, enemy) => sum + (meanMoveDamage(str(enemy["enemy_id"])) ?? 0), 0) || CURSE_FALLBACK_INCOMING;

  const energy = Math.max(1, inputs.maxEnergy);
  const handPlays = inputs.handPlays ?? energy;
  const draws = Math.max(1, CURSE_HAND_DRAW - has("MIND_ROT_POWER"));
  const hellraiser = has("HELLRAISER_POWER") > 0;
  const isAuto = (card: Record<string, unknown>): boolean => hellraiser && str(card["card_id"]).includes("STRIKE");
  const autoPlays = deck.length > 0 ? (draws * deck.filter(isAuto).length) / deck.length : 0;
  const cards = Math.max(1, handPlays + autoPlays);
  const handCards = deck.filter((card) => !isAuto(card));
  const blockCards = handCards.filter((card) => isBlockCardId(str(card["card_id"])));
  const blockShare = handCards.length > 0 ? blockCards.length / handCards.length : 0;
  const blocks = blockCards.map((card) => dynamicValue(card, /^Block$/i)).filter((value): value is number => value !== null);
  const meanBlock = blocks.length > 0 ? blocks.reduce((sum, value) => sum + value, 0) / blocks.length : CURSE_FALLBACK_BLOCK;

  const lostCards: Record<string, number> = {
    SLOTH: Math.max(0, cards - inputs.slothCap),
    MIND_ROT: Math.min(1, cards / draws),
    WASTE_AWAY: handPlays / energy,
  };
  const cardCost = (lost: number): number => {
    const share = Math.min(0.9, lost / cards);
    if (share <= 0) return 0;
    const longer = turnsLeft / (1 - share);
    return (longer - turnsLeft) * incoming + Math.min(incoming, lost * blockShare * meanBlock) * longer;
  };
  const disintegrationTotal = has("DISINTEGRATION_POWER") + inputs.disintegration;
  const outlastsHp = disintegrationTotal * turnsLeft + CURSE_HP_MARGIN > hp;
  const cost = (id: string): number => {
    if (id === "DISINTEGRATION") return has("RUPTURE_POWER") > 0 ? -1 : inputs.disintegration * turnsLeft;
    return cardCost(lostCards[id] ?? 0);
  };
  return {
    rank: (id) => (id === "DISINTEGRATION" && has("RUPTURE_POWER") === 0 && outlastsHp ? 1e6 : 0) + cost(id),
    text: (id) =>
      id === "DISINTEGRATION"
        ? has("RUPTURE_POWER") > 0
          ? "Rupture: Strength"
          : `${Math.round(cost(id))}${outlastsHp ? " (outlasts the HP)" : ""}`
        : `${Math.round(cost(id))} (${(lostCards[id] ?? 0).toFixed(1)} cards a turn)`,
    basis: `${Math.round(perTurn)} dmg/turn, ${turnsLeft.toFixed(1)} turns left, ${cards.toFixed(1)} cards/turn (${autoPlays.toFixed(1)} auto), ${Math.round(incoming)} incoming`,
  };
}

/** Cards whose upgrade gains the most (guide + DeepSeek's repeated upgrade picks); above plain card value. */
const UPGRADE_PRIORITY: Record<string, number> = {
  DEMON_FORM: 100, OFFERING: 98, BASH: 95, PYRE: 94, CORRUPTION: 92, BATTLE_TRANCE: 90, STONE_ARMOR: 88,
  UNMOVABLE: 88, INFLAME: 85, FEED: 85, UPPERCUT: 80,
};

/** Attack cards the fight's deck keeps at least (6A36: Burning Pact took 3 of the 4, 32/38 dealt in 12 turns). */
export const MIN_COMBAT_ATTACKS = 4;
/** Exhaust score of a Defend while more than EXHAUST_LOW_INCOMING is coming (kept over most cards). */
export const EXHAUST_DEFEND_UNDER_FIRE = 20;
/** Incoming damage (after block) at or below which a Defend is the cheaper card to exhaust. */
export const EXHAUST_LOW_INCOMING = 10;

interface ExhaustContext {
  /** Attack cards left in the fight: hand, draw pile and discard pile. */
  attacks: number;
  /**
   * The bigger of this turn's incoming (after block) and next turn's expected hit from the move model
   * (U6W7 F42: nothing much this turn, Defend++ exhausted at 12 HP, next turn's attack was 21).
   */
  incoming: number;
  /** Player HP now: at or below `incoming`, block cards are never exhausted. */
  hp?: number;
  /** An enemy has SANDPIT_POWER: Frantic Escape is the countdown's only answer, never junk. */
  sandpit?: boolean;
  /** Attack cards in hand right now. */
  handAttacks?: number;
  /** Our Strength now: an attack's worth grows with it per hit (6HRZ F33 T6: Exterminate went at Strength 6). */
  strength?: number;
  /** An enemy has Artifact: Vulnerable/Weak cards are what strips it (XWPV F48: Bash+ exhausted at Artifact 2). */
  artifact?: boolean;
  /** Two or more non-minion enemies (Kaiser Crab): AoE is worth double. */
  multiEnemy?: boolean;
  /** Strike Dummy: cards named Strike deal 3 more. */
  strikeDummy?: boolean;
  /**
   * This turn's attack from enemies that are Vulnerable, or that a card in hand can make Vulnerable
   * (no Artifact): what Colossus halves (LY0N909D4A0V F33 T3: Bash+ in hand, 9x3 coming).
   */
  vulnerableIncoming?: number;
}

/** What an exhaust candidate does, for the in-combat score (hits per play, applies a debuff, hits all). */
export interface ExhaustCard {
  hits?: number;
  debuff?: boolean;
  aoe?: boolean;
  /** Damage per hit as the card reads now (with our Strength), from the card model. */
  damage?: number | null;
  /** Block the card gives as it reads now, from the card model. */
  block?: number;
  /** Colossus: this turn, damage from Vulnerable enemies is halved. */
  colossus?: boolean;
}

/** A basic Defend's printed block: a block card that gives more is kept below a Defend under fire. */
const DEFEND_BASE_BLOCK = 5;

/** A basic Strike's printed damage: the yardstick an attack is compared with (plus our Strength). */
const STRIKE_BASE_DAMAGE = 6;

/** Cards whose Vulnerable/Weak strips an enemy's Artifact. */
const DEBUFF_EXHAUST_KEEP = new Set(["BASH", "THUNDERCLAP", "TAUNT", "UPPERCUT", "SHOCKWAVE", "DISARM", "INTIMIDATE"]);

/** A card that gives block: a Defend, a Block value, or block in its text. */
function isBlockCard(card: Record<string, unknown>): boolean {
  if (str(card["card_id"]).startsWith("DEFEND_")) return true;
  if (asArray(card["dynamic_values"]).some((entry) => str(asRecord(entry)["name"]) === "Block" && (numOrNull(asRecord(entry)["current_value"]) ?? numOrNull(asRecord(entry)["value"]) ?? 0) > 0)) return true;
  return /\d+点格挡|gain \d+ block/i.test(str(card["resolved_rules_text"], str(card["rules_text"])));
}

function isAttackCard(cardId: string, type: string, line: string): boolean {
  if (type) return type === "Attack";
  return cardId.startsWith("STRIKE_") || /造成\d+点伤害|deals? \d+ damage/i.test(line);
}

function exhaustCardOf(model: CardModel): ExhaustCard {
  return { hits: model.hits, debuff: model.vulnerable > 0 || model.weak > 0, aoe: model.target === "all", damage: model.damage, block: model.block, ...(model.special === "colossus" ? { colossus: true } : {}) };
}

/** What the in-combat exhaust pick needs to know: attacks left in the fight's deck and the attack coming. */
function combatExhaustContext(raw: Record<string, unknown>, offered: Record<string, unknown>[], knowledge: DecisionEnv["knowledge"]): ExhaustContext {
  const combat = asRecord(raw["combat"]);
  const view = asRecord(asRecord(raw["agent_view"])["combat"]);
  const typeOf = (cardId: string, fallback = ""): string => fallback || knowledge.card(cardId)?.type || "";
  // The hand as offered (the exhausting card is already out of it); the raw hand when it is larger.
  const rawHand = asArray(combat["hand"]).map(asRecord);
  const hand = rawHand.length > offered.length ? rawHand : offered;
  let attacks = hand.filter((card) => isAttackCard(str(card["card_id"]), typeOf(str(card["card_id"]), str(card["card_type"])), str(card["resolved_rules_text"]))).length;
  for (const pile of [view["draw"], view["discard"]]) {
    for (const entry of asArray(pile).map(asRecord)) {
      const line = str(entry["line"]);
      const cardId = str(asArray(entry["card_ids"])[0]);
      const count = Number(/^[^[：:]*?\*(\d+)\s*\[/.exec(line)?.[1] ?? 1);
      if (isAttackCard(cardId, typeOf(cardId), line)) attacks += count;
    }
  }
  // Next turn's hit counts too: an exhaust is for the rest of the fight, not just this enemy turn.
  const nextTurn = asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .reduce((sum, enemy) => sum + (expectedNextDamage(str(enemy["enemy_id"]), str(enemy["move_id"], str(enemy["intent"]))) ?? 0), 0);
  const hp = numOrNull(asRecord(combat["player"])["current_hp"]) ?? numOrNull(asRecord(raw["run"])["current_hp"]) ?? undefined;
  const sandpit = asArray(combat["enemies"])
    .map(asRecord)
    .some((enemy) => enemy["is_alive"] !== false && asArray(enemy["powers"]).some((power) => str(asRecord(power)["power_id"]) === "SANDPIT_POWER"));
  const handAttacks = hand.filter((card) => isAttackCard(str(card["card_id"]), typeOf(str(card["card_id"]), str(card["card_type"])), str(card["resolved_rules_text"]))).length;
  const living = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  const powerOf = (entity: Record<string, unknown>, id: string): number =>
    asArray(entity["powers"]).map(asRecord).filter((power) => str(power["power_id"]) === id).reduce((sum, power) => sum + (numOrNull(power["amount"]) ?? 0), 0);
  const strength = powerOf(asRecord(combat["player"]), "STRENGTH_POWER");
  const artifact = living.some((enemy) => powerOf(enemy, "ARTIFACT_POWER") > 0);
  const multiEnemy = living.filter((enemy) => powerOf(enemy, "MINION_POWER") <= 0).length >= 2;
  const strikeDummy = asArray(asRecord(raw["run"])["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === "STRIKE_DUMMY");
  // What Colossus halves this turn: the attack of the enemies Vulnerable now, plus what a Vulnerable card
  // in hand reaches (all enemies for an AoE one, the biggest attacker for a single-target one); Artifact
  // eats the card's Vulnerable.
  const sources = hand.map((card, index) => modelHandCard(card, numOrNull(card["index"]) ?? index, knowledge)).filter((model) => model.vulnerable > 0 && model.special !== "colossus");
  const aoeVulnerable = sources.some((model) => model.target === "all");
  // (The selection's card entries carry no target: anything not all-enemies counts as one target.)
  const singleVulnerable = sources.some((model) => model.target !== "all" && model.target !== "self");
  let vulnerableIncoming = 0;
  let reachable = 0;
  for (const enemy of living) {
    const attack = asArray(enemy["intents"]).map(asRecord).reduce((sum, intent) => sum + (numOrNull(intent["damage"]) ?? 0) * Math.max(1, numOrNull(intent["hits"]) ?? 1), 0);
    if (powerOf(enemy, "VULNERABLE_POWER") > 0 || (aoeVulnerable && powerOf(enemy, "ARTIFACT_POWER") <= 0)) vulnerableIncoming += attack;
    else if (singleVulnerable && powerOf(enemy, "ARTIFACT_POWER") <= 0) reachable = Math.max(reachable, attack);
  }
  vulnerableIncoming += reachable;
  return { attacks, incoming: Math.max(incomingDamage(combat), Math.round(nextTurn)), hp, sandpit, handAttacks, strength, artifact, multiEnemy, strikeDummy, vulnerableIncoming };
}

/**
 * In-combat exhaust (Burning Pact, True Grit+), higher = exhausted first. Status/Curse first; then the
 * least useful card for this fight, not the removal ranking (6A36: Strike 80 > Defend 70 let six
 * Burning Pacts take the Strikes, and the 9-card deck could no longer kill a 38 HP Sludge Spinner).
 * Attacks stay while the fight's deck holds MIN_COMBAT_ATTACKS or fewer; a Defend goes before a
 * Strike when little is coming.
 */
/** Exhaust-score malus for a card the committed plan still plays (below any junk, above nothing). */
export const PLANNED_CARD_KEEP = 150;

export function combatExhaustScore(cardId: string, type: string, context: ExhaustContext, blocks = cardId.startsWith("DEFEND_"), card: ExhaustCard = {}): number {
  const base = baseExhaustScore(cardId, type, context, blocks);
  if (base >= 90 || base <= 0) return base;
  // Toasty Mittens exhausts a card every turn: the static card value took Exterminate at Strength 6
  // (6HRZ F33 T6), Fight Me 8 times (XWPV F48) and Bash+ with the boss's Artifact up (2Q37, 6HRZ,
  // XWPV; 4th time). Strength scaling stays; an attack loses 2 per hit per Strength point; a Strike
  // with Strike Dummy, AoE into two bodies, and debuffs against Artifact are kept.
  if (damageRole(cardId) === "scaling") return Math.min(base, 5);
  let score = base;
  if (type === "Attack") {
    const hits = Math.max(1, card.hits ?? 1);
    if (context.multiEnemy && (card.aoe || damageRole(cardId) === "aoe")) score -= 15;
    // An attack that hits harder than a Strike is kept below a Defend under fire, the more so the
    // harder it hits: the static card value let Toasty Mittens take Bludgeon (35 damage, 34 points)
    // over a Defend (20) and Ultimate Strike over Dismantle (VNWR16YEJASM F33 T4/T6), and Bash+ over
    // a Defend (981WMX8MQ7DK F33 T2), in a boss race short of damage. Basic Strikes still go first.
    const perPlay = (card.damage ?? 0) * hits;
    const strike = STRIKE_BASE_DAMAGE + Math.max(0, context.strength ?? 0);
    if (!cardId.startsWith("STRIKE_") && perPlay > strike) {
      // Its damage as it reads now already has our Strength and Strike Dummy in it: the damage cap is
      // the whole measure. Taking them off again as flat discounts sank Pommel Strike (15 damage) to 3,
      // under the Artifact-capped Bash's 10, and the only Artifact answer went (8V0HD9Y207WY F24 T3);
      // it also tied Ultimate Strike (18) with Pommel Strike (13) at 11 (LY0N909D4A0V F33 T5).
      score = Math.min(score, Math.round((EXHAUST_DEFEND_UNDER_FIRE * strike) / perPlay));
    } else {
      score -= hits * Math.max(0, context.strength ?? 0) * 2;
      if (context.strikeDummy && /STRIKE/.test(cardId)) score -= 10;
    }
  }
  // Likewise a block card that out-blocks a Defend (Blood Wall's 16 went at 41 over a Defend's 20,
  // 981WMX8MQ7DK F33 T2 once the attacks were kept). Colossus blocks what it halves as well: half the
  // attack of the enemies that are, or a card in hand makes, Vulnerable (LY0N909D4A0V F33 T3: 4 block
  // read as 29 over a Defend's 20 with Bash+ in hand and 9x3 coming; it went, 16 HP lost instead of ~8).
  const block = (card.block ?? 0) + (card.colossus ? (context.vulnerableIncoming ?? 0) / 2 : 0);
  if (!cardId.startsWith("DEFEND_") && type !== "Attack" && block > DEFEND_BASE_BLOCK) {
    score = Math.min(score, Math.round((EXHAUST_DEFEND_UNDER_FIRE * DEFEND_BASE_BLOCK) / block));
  }
  if (context.artifact && (card.debuff || DEBUFF_EXHAUST_KEEP.has(cardId))) score = Math.min(score, 10);
  return Math.max(1, score);
}

function baseExhaustScore(cardId: string, type: string, context: ExhaustContext, blocks: boolean): number {
  // Howl from Beyond plays itself once from the exhaust pile, then goes to the discard pile: a free hit.
  if (cardId === "HOWL_FROM_BEYOND") return 200;
  // Frantic Escape is a Status, but against the Sandpit it is the only thing that pushes the countdown
  // back (THMG F33 T4: Burning Pact took it as 90-point junk; both lines then left the Sandpit at 1).
  if (cardId === "FRANTIC_ESCAPE" && context.sandpit) return -50;
  if (type === "Curse") return 100;
  if (type === "Status") return 90;
  // HP at or below the hit coming (this turn or next): the block is what keeps us alive.
  // The only attack in hand is what kills (4UWK F24 T8: at 1 HP with the Prism at 33 and buffing, the
  // gloves took Uppercut, the only attack, because every block card scored -10; the kill was there).
  if (type === "Attack" && context.handAttacks !== undefined && context.handAttacks <= 1) return -20;
  // Among block cards a plain Defend goes first (G1Z0 F48: Toasty Mittens took True Grit, then Taunt).
  if (blocks && context.hp !== undefined && context.hp <= context.incoming) return cardId.startsWith("DEFEND_") ? -9 : -10;
  // An unplayed power is the deck's engine (4UWK: the gloves exhausted Barricade twice).
  if (type === "Power") return 5;
  const value = cardValue(cardId, "", type, deckProfile([]), 2, 20).value;
  if (type === "Attack" && context.attacks <= MIN_COMBAT_ATTACKS) return 0;
  // A Defend goes first only when little is coming; with a real hit coming it is kept below most
  // cards (7DXA F33 T2 and JR66 F48 T2: Toasty Mittens took the only Defend at 65 over Forgotten
  // Ritual's 46, -4 and -26 HP).
  if (cardId.startsWith("DEFEND_")) return context.incoming <= EXHAUST_LOW_INCOMING ? 80 : EXHAUST_DEFEND_UNDER_FIRE;
  if (cardId.startsWith("STRIKE_")) return 70;
  return Math.max(1, 100 - value);
}

function selectionScore(kind: string, cardId: string, type: string): number {
  if (kind === "deck_add_select") return cardValue(cardId, "", type, deckProfile([]), 1, 10).value;
  if (kind === "deck_upgrade_select") {
    if (cardId in UPGRADE_PRIORITY) return UPGRADE_PRIORITY[cardId]!;
    if (cardId.startsWith("STRIKE_") || cardId.startsWith("DEFEND_")) return 10;
    return cardValue(cardId, "", type, deckProfile([]), 2, 20).value;
  }
  if (kind === "deck_card_select" || kind === "deck_transform_select") {
    if (type === "Curse") return 100;
    if (type === "Status") return 90;
    if (cardId.startsWith("STRIKE_")) return 80;
    if (cardId.startsWith("DEFEND_")) return 70;
    // A Strength card is the deck's scaling: never a removal (F8HR F20: 200 gold to remove Fight Me,
    // the only one; the Entomancer then lived at 71/145).
    if (damageRole(cardId) === "scaling") return -50;
    return 100 - cardValue(cardId, "", type, deckProfile([]), 2, 20).value;
  }
  return 0;
}

/**
 * The next card to discard on a "discard any number, draw as many" screen, or null when every card
 * left is worth keeping: Status/Curse and unplayable cards first, then cards with no value this turn
 * (Defend with no attack coming), then basics the energy cannot reach after the better cards.
 */
export function discardPick(
  combat: Record<string, unknown>,
  cards: Record<string, unknown>[],
  knowledge: DecisionEnv["knowledge"],
): { index: number; name: string; why: string } | null {
  const energy = numOrNull(asRecord(combat["player"])["energy"]) ?? 3;
  const incoming = incomingDamage(combat);
  const enemies = Math.max(1, asArray(combat["enemies"]).filter((enemy) => asRecord(enemy)["is_alive"] !== false).length);
  const hand = asArray(combat["hand"]).map(asRecord);
  const open = cards.filter((card) => !bool(card["selected"]));
  const viewed = open.map((card, fallbackIndex) => {
    const index = numOrNull(card["index"]) ?? fallbackIndex;
    // The hand entry carries playability; the selection entry may not.
    const inHand = hand.find((entry) => numOrNull(entry["index"]) === index && str(entry["card_id"]) === str(card["card_id"]));
    const model = modelHandCard({ ...card, ...(inHand ?? {}) }, index, knowledge);
    const type = str(card["card_type"], model.type);
    const playable = inHand ? bool(inHand["playable"]) || str(inHand["unplayable_reason"]) === "not_enough_energy" : model.cost >= 0;
    return { index, name: model.name, cardId: model.cardId, type, model, playable, score: thisTurnScore(model, incoming, enemies) };
  });
  const junk = viewed.find((card) => card.type === "Status" || card.type === "Curse" || !card.playable || card.model.cost > energy);
  if (junk) return { index: junk.index, name: junk.name, why: junk.type === "Status" || junk.type === "Curse" ? junk.type.toLowerCase() : "cannot be played this turn" };
  const dead = viewed.find((card) => card.score <= 0 && card.model.flatValue <= 0 && card.model.draw === 0);
  if (dead) return { index: dead.index, name: dead.name, why: incoming === 0 && dead.model.block > 0 ? "block with no attack coming" : "no value this turn" };
  // Spend the energy on the best cards per energy; basics that do not fit are redrawn.
  let left = energy;
  const byValue = [...viewed].sort((a, b) => b.score / Math.max(1, b.model.cost) - a.score / Math.max(1, a.model.cost));
  const unreached: typeof viewed = [];
  for (const card of byValue) {
    if (card.model.cost <= left) left -= Math.max(0, card.model.cost);
    else unreached.push(card);
  }
  const basic = unreached.find((card) => /^(STRIKE|DEFEND)_/.test(card.cardId));
  if (basic) return { index: basic.index, name: basic.name, why: `basic card the ${energy} energy will not reach` };
  return null;
}

/**
 * The card to make free (Touch of Insanity): freeCardPick's choice, or the most expensive card when
 * none costs 2+ (the potion is already drunk).
 */
export function freePick(
  combat: Record<string, unknown>,
  cards: Record<string, unknown>[],
  knowledge: DecisionEnv["knowledge"],
): CardModel | null {
  const hand = asArray(combat["hand"]).map(asRecord);
  const models = cards.map((card, fallbackIndex) => {
    const index = numOrNull(card["index"]) ?? fallbackIndex;
    const inHand = hand.find((entry) => numOrNull(entry["index"]) === index && str(entry["card_id"]) === str(card["card_id"]));
    const model = modelHandCard({ ...card, ...(inHand ?? {}) }, index, knowledge);
    return { ...model, type: str(card["card_type"], model.type) };
  });
  const usable = models.filter((card) => card.type !== "Status" && card.type !== "Curse" && card.cost >= 0);
  return freeCardPick(usable) ?? (usable.length > 0 ? usable.reduce((best, card) => (card.cost > best.cost ? card : best)) : null);
}

/** Enemy attack damage coming this turn, less the block already up. */
function incomingDamage(combat: Record<string, unknown>): number {
  const attacks = asArray(combat["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .reduce(
      (sum, enemy) =>
        sum + asArray(enemy["intents"]).map(asRecord).reduce((s, intent) => s + (numOrNull(intent["damage"]) ?? 0) * Math.max(1, numOrNull(intent["hits"]) ?? 1), 0),
      0,
    );
  return Math.max(0, attacks - (numOrNull(asRecord(combat["player"])["block"]) ?? 0));
}


/**
 * The combat board a card picked for this turn is scored on (ThisTurnBoard): the exhaust pile plus the
 * exhausting cards in hand, and the most Vulnerable on a living enemy. The exhaust pile is left unknown
 * when the state carries no piles.
 */
export function thisTurnBoard(raw: Record<string, unknown>, knowledge: DecisionEnv["knowledge"]): ThisTurnBoard {
  const combat = asRecord(raw["combat"]);
  const pile = exhaustPileSize(raw);
  const exhaustingInHand = asArray(combat["hand"]).map(asRecord).filter((card, index) => modelHandCard(card, numOrNull(card["index"]) ?? index, knowledge).exhausts).length;
  const vulnerable = Math.max(
    0,
    ...asArray(combat["enemies"])
      .map(asRecord)
      .filter((enemy) => enemy["is_alive"] !== false)
      .map((enemy) => asArray(enemy["powers"]).map(asRecord).filter((power) => str(power["power_id"]) === "VULNERABLE_POWER").reduce((sum, power) => sum + (numOrNull(power["amount"]) ?? 0), 0)),
  );
  return { ...(pile === undefined ? {} : { exhaustReach: pile + exhaustingInHand }), vulnerable };
}

export { thisTurnDamage, thisTurnScore, type ThisTurnBoard } from "../strategy/card-model.js";

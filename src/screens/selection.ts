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
import { cardValue, damageRole, deckProfile } from "../strategy/card-value.js";
import { expectedNextDamage } from "../knowledge/move-model.js";
import { freeCardPick, modelHandCard, type CardModel } from "../strategy/card-model.js";
import { PACTS_END_EXHAUST } from "../strategy/turn-solver.js";
import { exhaustPileSize } from "./combat-plan.js";

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
          ? combatExhaustScore(cardId, str(card["card_type"], info?.type ?? ""), exhaustContext, isBlockCard(card)) - (bool(card["upgraded"]) ? 8 : 0) -
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

  // Knowledge Demon's Curse of Knowledge: code picks. Disintegration (6 a turn, stacking) over a fight
  // this long cost ~100 HP and lost DG1CDGW8Y5JE and VKPXGMV8YV31 from full HP; Sloth (3 plays a
  // turn) rarely binds a 3-energy deck, Mind Rot costs a card a turn. Rupture turns Disintegration
  // into Strength, so then it is the pick. Waste Away (-1 energy every turn, the third offer) is the
  // worst: PU21 took it as "only this turn" and played 2 energy a turn to the end. It is only taken when
  // Disintegration would eat the HP left before the demon dies (see curseRank).
  const curseIds = candidates.map((card) => str(card["card_id"]));
  if (curseIds.length > 1 && curseIds.every((id) => id in KNOWLEDGE_CURSE_ORDER)) {
    const disintegration = candidates.find((card) => str(card["card_id"]) === "DISINTEGRATION");
    const rank = curseRank(combat, disintegration ? disintegrationAmount(disintegration) : 0, state.turn ?? 1);
    const best = options[curseIds.map((id, i) => [rank(id), i] as const).sort((a, b) => a[0] - b[0])[0]![1]]!;
    return { kind: "act", label: "selection/curse", intent: best.intent, rationale: `code: Knowledge Demon curse -> ${best.label} (Sloth > Mind Rot > Disintegration > Waste Away, unless Rupture or Disintegration outlasts HP)` };
  }

  return buildPickDecision({
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
  });
}

/**
 * Code-side preference for deck selection screens (phase 2). Upgrade: the cards whose upgrade matters
 * most (Bash's extra Vulnerable, then the strongest cards). Remove/transform: curses and statuses,
 * then Strikes, then Defends. Higher is better.
 */
const KNOWLEDGE_CURSE_ORDER: Record<string, number> = { SLOTH: 1, MIND_ROT: 2, DISINTEGRATION: 3, WASTE_AWAY: 4 };

/** Damage per turn assumed when none has been dealt yet (the curses come on T1/T5/T9). */
const CURSE_FALLBACK_DAMAGE = 25;
/** HP kept in hand for the demon's own attacks when Disintegration is weighed against Waste Away. */
const CURSE_HP_MARGIN = 20;

/** The Disintegration a curse card adds (6, 7, 8 on the three offers). */
function disintegrationAmount(card: Record<string, unknown>): number {
  for (const entry of asArray(card["dynamic_values"])) {
    const value = asRecord(entry);
    if (/Disintegration/i.test(str(value["name"]))) return numOrNull(value["current_value"]) ?? 0;
  }
  const text = /(\d+)点伤害|(\d+) damage/i.exec(str(card["resolved_rules_text"]));
  return text ? Number(text[1] ?? text[2]) : 0;
}

/**
 * Rank of a Knowledge Demon curse (lower is taken). Disintegration becomes the first pick with
 * Rupture, and the last one when it would take more than the HP left before the demon dies (turns
 * left from the damage dealt so far, 25 a turn before any): Disintegration × turns + 20 > HP. PU21 T9
 * (33 HP, ~8 turns left, Disintegration 8) is that case; with HP to spare Waste Away is the worst.
 */
export function curseRank(combat: Record<string, unknown>, offered: number, turn: number): (id: string) => number {
  const player = asRecord(combat["player"]);
  const powers = asArray(player["powers"]).map(asRecord);
  const has = (id: string): number => numOrNull(powers.find((power) => str(power["power_id"]) === id)?.["amount"]) ?? 0;
  const enemies = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  const left = enemies.reduce((sum, enemy) => sum + (numOrNull(enemy["current_hp"]) ?? 0), 0);
  const dealt = enemies.reduce((sum, enemy) => sum + Math.max(0, (numOrNull(enemy["max_hp"]) ?? 0) - (numOrNull(enemy["current_hp"]) ?? 0)), 0);
  const perTurn = turn > 1 ? Math.max(10, dealt / (turn - 1)) : CURSE_FALLBACK_DAMAGE;
  const turnsLeft = Math.ceil(left / perTurn);
  const hp = numOrNull(player["current_hp"]) ?? 0;
  const outlastsHp = (has("DISINTEGRATION_POWER") + offered) * turnsLeft + CURSE_HP_MARGIN > hp;
  return (id) => {
    if (id === "DISINTEGRATION" && has("RUPTURE_POWER") > 0) return 0;
    if (id === "DISINTEGRATION" && outlastsHp) return KNOWLEDGE_CURSE_ORDER["WASTE_AWAY"]! + 1;
    return KNOWLEDGE_CURSE_ORDER[id]!;
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
}

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
  return { attacks, incoming: Math.max(incomingDamage(combat), Math.round(nextTurn)), hp, sandpit, handAttacks };
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

export function combatExhaustScore(cardId: string, type: string, context: ExhaustContext, blocks = cardId.startsWith("DEFEND_")): number {
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
 * What a card does this turn, in rough HP-equivalent points: damage (every enemy for AoE), block up
 * to the incoming attack (a little beyond), debuffs, Strength, draw and energy, a power's lasting
 * value, less its energy cost and HP cost.
 */
export function thisTurnScore(card: CardModel, incoming: number, enemies: number, board: ThisTurnBoard = {}): number {
  // The Gambit: any unblocked attack kills us for the rest of the fight (S780: picked at 79/80 HP from a
  // Colorless Potion, died to a 9-damage hit). Never worth taking.
  if (card.cardId === "THE_GAMBIT") return -100;
  const damage = thisTurnDamage(card, board) * Math.max(1, card.hits) * (card.target === "all" ? enemies : 1);
  const block = Math.min(card.block, incoming) + 0.3 * Math.max(0, card.block - incoming);
  const score =
    damage +
    block +
    2.5 * Math.min(card.vulnerable, 3) +
    1.5 * Math.min(card.weak, 3) +
    5 * card.strength +
    2 * card.tempStrength +
    3 * card.draw +
    4 * card.energyGain +
    card.flatValue -
    2 * Math.max(0, card.cost) -
    card.hpLoss;
  return Math.round(score);
}

/** What the board lets a card deal this turn (thisTurnScore). */
export interface ThisTurnBoard {
  /**
   * Cards the exhaust pile can hold this turn: its size now plus the exhausting cards in hand. Pact's
   * End needs 3 (the solver's PACTS_END_EXHAUST); below that it deals nothing (9LSQ F17 T1, H1FA twice:
   * an Attack Potion took it over Fight Me with the exhaust pile empty, and it sat in hand).
   */
  exhaustReach?: number;
  /** Most Vulnerable on a living enemy: Bully deals 2 more per stack. */
  vulnerable?: number;
}

/** Bully: extra damage per Vulnerable stack on its target (as in the solver). */
const BULLY_PER_VULNERABLE = 2;

/** A card's damage per hit this turn on this board. */
export function thisTurnDamage(card: CardModel, board: ThisTurnBoard = {}): number {
  if (card.cardId === "PACTS_END" && board.exhaustReach !== undefined && board.exhaustReach < PACTS_END_EXHAUST) return 0;
  if (card.cardId === "BULLY") return (card.damage ?? 0) + BULLY_PER_VULNERABLE * (board.vulnerable ?? 0);
  return card.damage ?? 0;
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

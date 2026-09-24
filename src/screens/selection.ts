/**
 * Card selection screens: smith, remove, transform, enchant, and combat multi-select (PLAN.md §6.4).
 *
 * Multi-select is driven to `min_select` and then confirmed: asking the model once per pick keeps
 * each question local and avoids multi-step plans, which Jev is documented to handle poorly.
 */

import { asArray, asRecord, bool, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { deckEntries, describeDeck } from "../project/deck.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import { buildPickDecision, type PickOption } from "./pick.js";
import { cardValue, deckProfile } from "../strategy/card-value.js";

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
  // gives up the least valuable card — statuses/curses, then basics — instead of asking every turn.
  const isExhaust = kind === "combat_hand_select" && /消耗|exhaust/i.test(prompt);
  const candidates = asArray(selection["cards"])
    .map(asRecord)
    .filter((card) => !bool(card["selected"]))
    .filter((card) => !isUpgrade || !bool(card["upgraded"]));

  if (candidates.length === 0) return null;

  const entries = deckEntries(state, knowledge);
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
      score:
        selectionScore(isAdd ? "deck_add_select" : isExhaust ? "combat_exhaust" : kind, cardId, str(card["card_type"], info?.type ?? "")) -
        (!isAdd && !isUpgrade && bool(card["upgraded"]) ? 8 : 0),
      summary: {
        card: name,
        upgraded: bool(card["upgraded"]),
        type: str(card["card_type"], info?.type ?? ""),
        cost: numOrNull(card["energy_cost"]) ?? info?.cost ?? null,
        text: truncate(str(card["resolved_rules_text"]) || info?.description || "", 160),
      } satisfies JsonValue,
    };
  });

  const verb = isExhaust
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
  // into Strength, so then it is the pick.
  const curseIds = candidates.map((card) => str(card["card_id"]));
  if (curseIds.length > 1 && curseIds.every((id) => id in KNOWLEDGE_CURSE_ORDER)) {
    const powers = asArray(asRecord(asRecord(state.raw["combat"])["player"])["powers"]).map((power) => str(asRecord(power)["power_id"]));
    const rank = (id: string): number => (id === "DISINTEGRATION" && powers.includes("RUPTURE_POWER") ? 0 : KNOWLEDGE_CURSE_ORDER[id]!);
    const best = options[curseIds.map((id, i) => [rank(id), i] as const).sort((a, b) => a[0] - b[0])[0]![1]]!;
    return { kind: "act", label: "selection/curse", intent: best.intent, rationale: `code: Knowledge Demon curse -> ${best.label} (Sloth > Mind Rot > Disintegration unless Rupture)` };
  }

  return buildPickDecision({
    label: `selection/${verb}`,
    instructions: `Which card should I ${verb}?`,
    actThreshold: env.thresholds.act,
    strictJev: env.strictJev,
    escalateBelow: 0.4,
    options,
    // Exhaust picks happen every turn with Baking Gloves and are low-stakes: code always decides.
    codeMargin: env.combatPlanner === "card" || verb === "choose" || verb === "enchant" ? undefined : verb === "exhaust" ? 0 : 6,
    maxModelOptions: 4,
    state: {
      run_brief: briefJson(env.brief),
      situation: {
        screen: "CARD_SELECTION",
        task: verb,
        prompt,
        selecting: `${selected + 1} of ${max}${min !== max ? ` (at least ${min})` : ""}`,
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
const KNOWLEDGE_CURSE_ORDER: Record<string, number> = { SLOTH: 1, MIND_ROT: 2, DISINTEGRATION: 3 };

/** Cards whose upgrade gains the most (guide + DeepSeek's repeated upgrade picks); above plain card value. */
const UPGRADE_PRIORITY: Record<string, number> = {
  DEMON_FORM: 100, OFFERING: 98, BASH: 95, PYRE: 94, CORRUPTION: 92, BATTLE_TRANCE: 90, STONE_ARMOR: 88,
  UNMOVABLE: 88, INFLAME: 85, FEED: 85, UPPERCUT: 80,
};

function selectionScore(kind: string, cardId: string, type: string): number {
  if (kind === "combat_exhaust") {
    // Howl from Beyond replays itself every turn from the exhaust pile: exhausting it is a gain.
    if (cardId === "HOWL_FROM_BEYOND") return 200;
    kind = "deck_card_select";
  }
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
    return 100 - cardValue(cardId, "", type, deckProfile([]), 2, 20).value;
  }
  return 0;
}

import { asArray, asRecord, bool, numOrNull, str, type JsonValue } from "../../core/util/json.js";
import type { GameState } from "../mod/schema.js";

/**
 * A5HKP18P4Q0T F14 T5 / N3YHJMV1ATFR F42 T4 (silent-0205): expose the
 * retained hand at Survivor's single-discard boundary. This is a snapshot
 * projection, not a solver: discard triggers, draws and outcomes stay unknown.
 */
export function survivorDiscardFacts(state: GameState, currentSurvivor: boolean): Map<number, JsonValue> | null {
  const selection = asRecord(state.raw["selection"]);
  if (!currentSurvivor || !state.in_combat || str(asRecord(state.run?.raw)["character_id"]).toUpperCase() !== "SILENT" ||
      state.run?.ascension !== 10 || str(selection["kind"]) !== "combat_hand_select" ||
      !/丢弃|弃掉|discard/i.test(str(selection["prompt"])) ||
      selection["min_select"] !== 1 || selection["max_select"] !== 1 || selection["selected_count"] !== 0) return null;

  const combat = asRecord(state.raw["combat"]);
  if (!/PlayCardAction$/.test(str(asRecord(combat["action_readiness"])["running_action_type"]))) return null;
  const player = asRecord(combat["player"]);
  const energy = numOrNull(player["energy"]);
  const hp = numOrNull(player["current_hp"]);
  const block = numOrNull(player["block"]);
  if (energy === null || energy < 0 || hp === null || block === null) return null;
  const offered = asArray(selection["cards"]).map(asRecord);
  const hand = asArray(combat["hand"]).map(asRecord);
  if (!offered.length || offered.length !== hand.length || offered.some((card) => bool(card["selected"]))) return null;

  // Match copies by explicit slot and observed card attributes; never guess from ID alone.
  const slots = hand.map((card) => numOrNull(card["index"]));
  const offerSlots = offered.map((card) => numOrNull(card["index"]));
  if (slots.some((slot) => slot === null || !Number.isInteger(slot) || slot < 0) ||
      new Set(slots).size !== hand.length || new Set(offerSlots).size !== offered.length) return null;
  for (const card of offered) {
    const actual = hand.find((entry) => entry["index"] === card["index"]);
    if (!actual || !str(card["card_id"]) ||
        ["card_id", "upgraded", "energy_cost", "star_cost", "costs_x", "star_costs_x", "resolved_rules_text"]
          .some((key) => actual[key] !== card[key])) return null;
  }

  const cardFacts = (card: Record<string, unknown>): JsonValue => {
    const cost = numOrNull(card["energy_cost"]);
    const fixedEnergyOnly = card["costs_x"] === false && card["star_costs_x"] === false && card["star_cost"] === 0 && cost !== null && cost >= 0;
    const energySufficient = fixedEnergyOnly ? cost! <= energy : null;
    // Playability is the mod's value before the choice, not a promise about the next state.
    const playable = typeof card["playable"] === "boolean" ? card["playable"] : null;
    return {
      hand_index_before_discard: numOrNull(card["index"]),
      card_id: str(card["card_id"]), name: str(card["name"]), upgraded: bool(card["upgraded"]),
      energy_cost_now: cost, playable_before_discard: playable,
      unplayable_reason: str(card["unplayable_reason"]) || null,
      energy_sufficient_for_this_card_alone: energySufficient,
      energy_after_this_card_alone: playable === true && energySufficient === true ? energy - cost! : null,
      text_now: str(card["resolved_rules_text"]),
    };
  };
  return new Map(offered.map((card) => [card["index"] as number, {
    basis: "仅从当前实存手牌移除此副本；弃牌触发尚未结算，后续费用、可打性和牌面变化须重读。每张牌的能量余额独立计算，不能相加成整线；抽到的牌、伤害、格挡、剩血及胜负均未推演。",
    current_resources: { hp, block, energy },
    discarded: { hand_index_before_discard: card["index"] as number, card_id: str(card["card_id"]), name: str(card["name"]), upgraded: bool(card["upgraded"]) },
    retained_cards: hand.filter((entry) => entry["index"] !== card["index"]).map(cardFacts),
  } satisfies JsonValue]));
}

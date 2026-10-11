import { asArray, asRecord, numOrNull, str, type JsonValue } from "../../core/util/json.js";
import type { GameState } from "../mod/schema.js";

/**
 * 6D0M76419BU7 F12 T3 (silent-0407): the selection snapshot still marks
 * Deflect and Defend playable; SMOGGY_POWER blocks them after Survivor finishes.
 * Report that observed restriction separately from the unsettled mod flag.
 */
export function survivorSmoggyFacts(state: GameState, currentSurvivor: boolean): Map<number, JsonValue> | null {
  const selection = asRecord(state.raw["selection"]);
  if (!currentSurvivor || !state.in_combat || state.run?.ascension !== 10 ||
      str(asRecord(state.run.raw)["character_id"]).toUpperCase() !== "SILENT" ||
      selection["kind"] !== "combat_hand_select" || !/丢弃|弃掉|discard/i.test(str(selection["prompt"])) ||
      selection["min_select"] !== 1 || selection["max_select"] !== 1 || selection["selected_count"] !== 0) return null;
  const combat = asRecord(state.raw["combat"]);
  const readiness = asRecord(combat["action_readiness"]);
  if (!/PlayCardAction$/.test(str(readiness["running_action_type"])) || readiness["hand_in_card_selection"] !== true) return null;
  const player = asRecord(combat["player"]);
  const smog = asArray(player["powers"]).map(asRecord).filter((power) => power["power_id"] === "SMOGGY_POWER");
  if (smog.length !== 1 || smog[0]!["amount"] !== 1 || player["skills_played_this_turn"] !== 1) return null;
  const energy = numOrNull(player["energy"]);
  if (energy === null || energy < 0) return null;
  const cards = asArray(selection["cards"]).map(asRecord);
  const hand = asArray(combat["hand"]).map(asRecord);
  if (!cards.length || cards.length !== hand.length || cards.some((card) => card["selected"] !== false)) return null;
  const slots = cards.map((card) => numOrNull(card["index"]));
  if (slots.some((slot) => slot === null || !Number.isInteger(slot) || slot < 0) ||
      new Set(slots).size !== cards.length || new Set(hand.map((card) => card["index"])).size !== hand.length) return null;
  for (const card of cards) {
    const actual = hand.find((entry) => entry["index"] === card["index"]);
    if (!actual || !str(card["card_id"]) ||
        ["card_id", "upgraded", "energy_cost", "costs_x", "star_cost", "star_costs_x", "resolved_rules_text"]
          .some((key) => actual[key] !== card[key])) return null;
  }
  // Only these plain cards and this counter/power combination were checked here.
  const blocked = cards.filter((card) => card["upgraded"] === false && card["card_type"] === "Skill" &&
    (card["card_id"] === "DEFLECT" || card["card_id"] === "DEFEND_SILENT"));
  if (!blocked.length) return null;
  return new Map(cards.map((discarded) => [discarded["index"] as number, {
    basis: "静默A10实盘6D0M76419BU7/F12T3：1层烟雾且已打1张技能时，生存者选牌帧仍显示偏折/防御可打，完成弃牌后才标烟雾禁止。费用足够不能当作可补挡；以下为烟雾与计数保持时已核普通偏折/防御的限制，弃牌触发、其他牌与完整后继未验证，选择后仍须重读。",
    energy_now: energy,
    smoggy_amount: 1,
    skills_played_this_turn: 1,
    retained_restricted_cards: blocked.filter((card) => card["index"] !== discarded["index"]).map((card) => {
      const actual = hand.find((entry) => entry["index"] === card["index"])!;
      const cost = numOrNull(card["energy_cost"]);
      return {
        hand_index_before_discard: card["index"] as number,
        card_id: str(card["card_id"]), name: str(card["name"]),
        energy_cost_now: cost,
        energy_sufficient_for_this_card_alone: cost !== null && cost >= 0 && card["costs_x"] === false &&
          card["star_costs_x"] === false && card["star_cost"] === 0 ? energy >= cost : null,
        mod_playable_during_selection: typeof actual["playable"] === "boolean" ? actual["playable"] : null,
        observed_restriction_after_survivor: "SMOGGY_POWER",
      };
    }),
  } satisfies JsonValue]));
}

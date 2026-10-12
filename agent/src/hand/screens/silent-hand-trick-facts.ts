import { asArray, asRecord, numOrNull, str, type JsonValue } from "../../core/util/json.js";
import type { GameState } from "../mod/schema.js";

/** KFRDELW2TH2P F33 T7, silent-0274: a Sly target still needs a remaining play. */
export function handTrickSlothFacts(state: GameState, currentHandTrick: boolean): Map<number, JsonValue> | null {
  const selection = asRecord(state.raw["selection"]);
  if (!currentHandTrick || !state.in_combat || state.run?.ascension !== 10 ||
      str(asRecord(state.run.raw)["character_id"]).toUpperCase() !== "SILENT" ||
      selection["kind"] !== "combat_hand_select" || !/奇巧|sly/i.test(str(selection["prompt"])) ||
      selection["min_select"] !== 1 || selection["max_select"] !== 1 || selection["selected_count"] !== 0) return null;
  const combat = asRecord(state.raw["combat"]);
  const readiness = asRecord(combat["action_readiness"]);
  const player = asRecord(combat["player"]);
  const sloth = asArray(player["powers"]).map(asRecord).filter((p) => p["power_id"] === "SLOTH_POWER");
  // The first manual skill avoids treating earlier automatic replays as unused slots.
  if (sloth.length !== 1 || sloth[0]!["amount"] !== 3 || player["cards_played_this_turn"] !== 1 ||
      player["skills_played_this_turn"] !== 1 || player["attacks_played_this_turn"] !== 0 ||
      readiness["hand_in_card_selection"] !== true || !/PlayCardAction$/.test(str(readiness["running_action_type"]))) return null;
  const energy = numOrNull(player["energy"]);
  if (energy === null || energy < 0) return null;
  const cards = asArray(selection["cards"]).map(asRecord);
  const hand = asArray(combat["hand"]).map(asRecord);
  const indices = cards.map((c) => numOrNull(c["index"]));
  if (!cards.length || indices.some((i) => i === null || !Number.isInteger(i) || i < 0) ||
      new Set(indices).size !== cards.length || new Set(hand.map((c) => c["index"])).size !== hand.length) return null;
  for (const card of cards) {
    const actual = hand.find((c) => c["index"] === card["index"]);
    if (!actual || !str(card["card_id"]) || card["selected"] !== false ||
        ["card_id", "upgraded", "energy_cost", "costs_x", "star_cost", "star_costs_x", "resolved_rules_text"]
          .some((k) => card[k] !== actual[k])) return null;
  }
  const snapshot = hand.map((card) => ({
    index: numOrNull(card["index"]), card_id: str(card["card_id"]),
    energy_cost_now: numOrNull(card["energy_cost"]),
    mod_playable_during_selection: typeof card["playable"] === "boolean" ? card["playable"] : null,
    blocker_now: str(card["unplayable_preventer_id"]) || null,
    text: str(card["resolved_rules_text"]),
  }));
  return new Map(cards.map((card) => {
    const cost = numOrNull(card["energy_cost"]);
    const fixedCost = cost !== null && cost >= 0 && card["costs_x"] === false &&
      card["star_costs_x"] === false && card["star_cost"] === 0;
    return [card["index"] as number, {
      basis: "静默A10 KFRDELW2TH2P/F33T7：手上技法后还剩2个手动出牌名额；防御和带毒刺击用完名额后，奇巧爆发剩1能量仍被懒惰锁住。选择目标不等于已经施放。",
      sloth_cap: 3, manual_cards_played: 1, remaining_manual_plays_upper_bound: 2,
      energy_now: energy, target_energy_after_one_play: fixedCost ? energy - cost : null,
      energy_sufficient_for_target_alone: fixedCost ? energy >= cost : null,
      other_manual_plays_that_exhaust_the_cap: 2,
      target_requires_later_skill: card["card_id"] === "BURST" && card["upgraded"] === false ? true : null,
      hand_now: snapshot,
      continuation_verified: false,
      limitation: "选牌帧可打标记与费用只描述当前状态；自动重放也可能耗名额，完整后继和收益尚未验证。先耗尽名额再打目标不可兑现；不能据此固定选择防御或断言爆发先打能赢。",
    } satisfies JsonValue];
  }));
}

import { asArray, asRecord, bool, numOrNull, str, type JsonValue } from "../../core/util/json.js";
import type { GameState } from "../mod/schema.js";

/** C7GNN3DDFUFY T7 / H1T1F8ML9FUE T6 / R3AJCGQGGMR4 T5, A10 F33, silent-0117. */
export function sandpitDiscardFacts(state: GameState, currentPrepared: boolean, currentSurvivor = false, currentDaggerThrow = false): {
  context: JsonValue; options: Map<number, JsonValue>;
} | null {
  const selection = asRecord(state.raw["selection"]);
  const picks = currentPrepared ? 2 : currentSurvivor || currentDaggerThrow ? 1 : 0;
  if (!picks || !state.in_combat || state.run?.ascension !== 10 ||
      str(asRecord(state.run.raw)["character_id"]).toUpperCase() !== "SILENT" ||
      selection["kind"] !== "combat_hand_select" || !/丢弃|discard/i.test(str(selection["prompt"])) ||
      selection["min_select"] !== picks || selection["max_select"] !== picks ||
      (selection["selected_count"] !== 0 && !(picks === 2 && selection["selected_count"] === 1))) return null;
  const combat = asRecord(state.raw["combat"]);
  if (!/PlayCardAction$/.test(str(asRecord(combat["action_readiness"])["running_action_type"]))) return null;
  const enemies = asArray(combat["enemies"]).map(asRecord).filter((e) => e["is_alive"] !== false);
  if (enemies.length !== 1 || enemies[0]!["enemy_id"] !== "THE_INSATIABLE") return null;
  const pits = asArray(enemies[0]!["powers"]).map(asRecord).filter((p) => p["power_id"] === "SANDPIT_POWER");
  const pit = currentPrepared ? 1 : 2;
  if (pits.length !== 1 || pits[0]!["amount"] !== pit) return null;
  const energy = numOrNull(asRecord(combat["player"])["energy"]);
  if (energy === null || energy < 0) return null;
  const hand = asArray(combat["hand"]).map(asRecord);
  const offered = asArray(selection["cards"]).map(asRecord);
  const selected = selection["selected_count"] as number;
  if (!offered.length || offered.length + selected !== hand.length || offered.some((c) => c["selected"] !== false)) return null;
  const validSlots = (cards: Record<string, unknown>[]) => {
    const slots = cards.map((c) => numOrNull(c["index"]));
    return slots.every((i) => i !== null && Number.isInteger(i) && i >= 0) && new Set(slots).size === cards.length;
  };
  if (!validSlots(hand) || !validSlots(offered)) return null;
  for (const card of offered) {
    const actual = hand.find((c) => c["index"] === card["index"]);
    if (!actual || !str(card["card_id"]) ||
        ["card_id", "upgraded", "energy_cost", "star_cost", "costs_x", "star_costs_x", "resolved_rules_text"]
          .some((key) => card[key] !== actual[key])) return null;
  }
  // The second pick omits the first selected card while combat.hand still contains it.
  const remaining = hand.filter((c) => offered.some((o) => o["index"] === c["index"]));
  const escape = (c: Record<string, unknown>) => c["card_id"] === "FRANTIC_ESCAPE";
  const payable = (c: Record<string, unknown>): boolean | null => {
    const cost = numOrNull(c["energy_cost"]);
    return !bool(c["upgraded"]) && c["costs_x"] === false && c["star_costs_x"] === false &&
      c["star_cost"] === 0 && cost !== null && cost >= 0 ? cost <= energy : null;
  };
  const escapes = remaining.filter(escape);
  const count = (cards: Record<string, unknown>[]) => cards.some((c) => payable(c) === null)
    ? null : cards.filter((c) => payable(c) === true).length;
  const before = count(escapes);
  return {
    context: {
      sandpit_now: pit, energy_now: energy,
      selected_count: selected, selections_still_required: picks - selected,
      already_selected_escape_count: hand.filter((c) => escape(c) && !remaining.includes(c)).length,
      energy_payable_escapes_before_this_pick: before,
      basis: currentPrepared
        ? "沙坑与攻击是两条独立截止条件：若敌人仍存活且沙坑未延长，敌方回合沙坑1归零会致死，HP和格挡不能抵消。按当前费用核对逃离，不把原后继标记为null当安全。"
        : "当前沙坑为2，按此刻能量与费用列出弃牌后保留的逃离。既有静默实盘曾在弃掉唯一逃离后，下一轮沙坑1且无逃离而判死；沙坑与攻击是两条独立截止条件。这里不预报下轮抽牌、费用或倒计时，不以保留逃离保证获胜。",
      limitation: "这里只扣除已选和本次拟弃副本；还须完成剩余弃牌。弃牌触发、后续可打性、攻击生存与胜负未推演，选择完成后按真实手牌和剩费重算；保留逃离不等于有可活线。",
    },
    options: new Map(offered.map((card) => {
      const left = escapes.filter((c) => c["index"] !== card["index"]);
      const after = count(left);
      return [card["index"] as number, {
        remaining_escape_count_after_this_pick: left.length,
        energy_payable_escapes_after_this_pick: after,
        removes_last_energy_payable_escape: before === null || after === null ? null : before > 0 && after === 0,
        remaining_escapes: left.map((c) => ({
          hand_index: c["index"] as number, energy_cost_now: numOrNull(c["energy_cost"]),
          energy_sufficient_alone: payable(c), playable_before_selection_settles: typeof c["playable"] === "boolean" ? c["playable"] : null,
        })),
      } satisfies JsonValue];
    })),
  };
}

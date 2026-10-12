import { asArray, asRecord, numOrNull, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import { giantPhaseAtTurnStart } from "../sl/attempts.js";

/** YQL8RZ8BWN1E A10 F17 T10, silent-0017/0250: distinguish husk poison from surviving the displayed blast. */
export function silentGiantPotionFacts(state: GameState): Record<string, JsonValue> {
  if (!state.in_combat || state.run?.floor !== 17) return {};
  const phase = giantPhaseAtTurnStart(state);
  if (!phase) return {};
  const combat = asRecord(state.raw["combat"]), player = asRecord(combat["player"]);
  const enemy = asArray(combat["enemies"]).map(asRecord).find((entry) => entry["is_alive"] === true)!;
  const hp = numOrNull(player["current_hp"]), block = numOrNull(player["block"]);
  if (hp === null || !Number.isFinite(hp) || hp <= 0 || block === null || !Number.isFinite(block) || block < 0) return {};
  const powers = enemy["powers"];
  const poison = asArray(powers).map(asRecord).filter((power) => power["power_id"] === "POISON_POWER");
  const amount = poison.length === 1 ? numOrNull(poison[0]!["amount"]) : null;
  const poisonNow = !Array.isArray(powers) || poison.length > 1 ? null
    : poison.length === 0 ? 0 : amount !== null && Number.isInteger(amount) && amount >= 0 ? amount : null;
  const poisonAvailable = asArray(state.run.raw["potions"]).map(asRecord).some((potion) =>
    str(potion["potion_id"]) === "POISON_POTION" && potion["can_use"] === true &&
    asArray(potion["valid_target_indices"]).includes(enemy["index"] as JsonValue));
  return { giant_blast_current: {
    scope: "observed_current_snapshot",
    phase: phase.phase, body_hp: phase.body_hp, raw_husk_hp: phase.raw_hp,
    poison_now: poisonNow, hp_now: hp, block_now: block,
    incoming_now: phase.incoming_at_turn_start,
    fight_won: false,
    note: "本体已结束，当前仍待自爆结算；占位体血量及其扣血不代表本体进度。毒层不是已兑现毒伤，当前血挡和来袭也不是候选执行后的结算。本栏不改必死判断或参考路径排序。",
    ...(poisonAvailable ? { poison_potion_observation: {
      scope: "single_observed_use",
      evidence: { run: "YQL8RZ8BWN1E", floor: 17, turn: 10, state_lines: [280160, 280161] },
      before: { poison: 2, hp: 26, block: 13, incoming: 41 },
      after: { poison: 8, hp: 26, block: 13, incoming: 41 },
      note: "这次实盘在本体结束后饮用毒药水，只观察到残壳毒2→8，血26、挡13、自爆来袭41均未变；不能把新增6毒算作减伤6或本体进度。此处不是当前饮用结果的预测，提前饮用、留药和整战收益仍未知，不据此删除或强制选择药水。",
    } } : {}),
  } };
}

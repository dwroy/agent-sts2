import { asArray, asRecord, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";

/** P33 F39 T1/T2 and 177AS F5 T3/T4: these living summons are absent from boardRolloutInput. */
export function silentSummonCoverage(state: GameState): Record<string, JsonValue> {
  const run = asRecord(state.run?.raw);
  if (str(run["character_id"]).toLowerCase() !== "silent" || run["ascension"] !== 10) return {};
  const enemies = asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord);
  const missing = enemies.flatMap((enemy, position) => {
    if (enemy["is_alive"] === false || typeof enemy["current_hp"] !== "number" || enemy["current_hp"] <= 0) return [];
    const id = str(enemy["enemy_id"]), move = str(enemy["move_id"]);
    const observed = (id === "FABRICATOR" && move === "FABRICATE_MOVE") ||
      (id === "TWO_TAILED_RAT" && move === "CALL_FOR_BACKUP_MOVE");
    if (!observed || !asArray(enemy["intents"]).some((intent) => asRecord(intent)["intent_type"] === "Summon")) return [];
    return [{ index_now: typeof enemy["index"] === "number" ? enemy["index"] : position,
      enemy_id: id, name: str(enemy["name"], id), move_id: move }];
  });
  if (missing.length === 0) return {};
  return {
    unmodelled_summons: {
      scope: "current_observed_summon_move",
      enemies: missing,
      note: "当前所列召唤招式曾在静默A10实盘产生新敌人，但后续rollout尚未加入这些新个体。若招式兑现，下一轮威胁、剩余敌血、结束战斗比例及参考排名可能漏算增援；不能把清空旧敌人当成覆盖完整战斗。新增数量、血量、行动顺序和概率未确定，不能据此指定击杀顺序。若本轮先结束战斗，召唤未必兑现；实际行动后按新状态重算。",
    },
  };
}

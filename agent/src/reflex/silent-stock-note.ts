import { asArray, asRecord, numOrNull, str } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";

/** R3AJCGQGGMR4 A10 F45 T2/T6, silent-0311/0312: observed resets are not a future HP distribution. */
export function silentStockNote(state: GameState, enemy: Record<string, unknown>): string | null {
  if (!state.in_combat || state.run?.ascension !== 10 ||
      str(asRecord(state.run.raw)["character_id"]).toUpperCase() !== "SILENT" ||
      enemy["enemy_id"] !== "AXEBOT" || enemy["is_alive"] === false) return null;
  const stocks = asArray(enemy["powers"]).map(asRecord).filter((power) => power["power_id"] === "STOCK_POWER");
  if (stocks.length !== 1 || ![1, 2].includes(numOrNull(stocks[0]!["amount"]) ?? -1)) return null;
  return "（库存是剩余复活次数，当前体归零不等于整战结束。静默A10实盘R3AJCGQGGMR4 F45 T2/T6已见后体最大生命变化、旧毒清除；未来恢复血量及跨体效果尚未完整校准。当前HP＋库存×当前最大HP不是已知的整场需求；后续rollout仍沿用当前最大HP，跨体胜率和剩余需求存在已知覆盖缺口。启动后的格挡、力量和意图须读现场，不能沿用固定启动数值或把当前攻击取消当作整战获胜。）";
}

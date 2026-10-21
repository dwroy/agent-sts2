import type { JsonValue } from "../core/util/json.js";
import type { CardValueTable } from "./card-value.js";

const hp = (v: number | null) => v === null ? null : Number(v.toFixed(2));
const probability = (v: number) => Number(v.toFixed(4));

/** A bounded supplement in offer order. The brain keeps its original question and resolver. */
export function brainCardValueFacts(table: CardValueTable): { options: Record<string, JsonValue>; context: JsonValue } {
  const options: Record<string, JsonValue> = {};
  for (const option of table.options) {
    const bosses = option.known ? option.targets.filter(t => t.kind === "boss") : [];
    const mean = (field: "hp_loss" | "saved_hp" | "win" | "win_delta") => bosses.length
      ? bosses.reduce((sum, target) => sum + target[field] * target.weight, 0) : null;
    const win = mean("win"), change = mean("win_delta");
    options[option.id] = {
      act_hp_saved: hp(option.saved_hp), error_scale: hp(option.error),
      boss: { hp_loss: hp(mean("hp_loss")), hp_saved: hp(mean("saved_hp")),
        win: win === null ? null : probability(win), win_change: change === null ? null : probability(change) },
      cores: option.advances.slice(0, 2).map(a => ({ direction: a.direction.slice(0, 80), combo: a.combo.slice(0, 100),
        advanced: a.advanced, missing: a.missing,
        unknown: (table.cores.find(c => c.direction === a.direction && c.combo === a.combo)?.unknown ?? ["core_outside_scope"]).slice(0, 2) })),
      more_cores: Math.max(0, option.advances.length - 2), unknown: option.unknown.slice(0, 2),
    };
  }
  return { options, context: {
    model: table.model_id, remaining: table.route.counts, route_source: table.route.source,
    note: "增量多在误差范围内，仅供参考。act_hp_saved为本幕剩余战斗相对跳过预计少掉的血（正值少掉血）；error_scale为整场留出误差累计尺度，不是增量置信区间。boss为本幕Boss预计掉血、相对跳过少掉血、胜率及胜率变化（0–1概率单位），按当前HP/资源条件预测，不预测沿路存活。cores列最多两个推进组合的补牌数及还差几张；unknown条件未核实，不代表成型或收益。观察数据有历史选择混杂；null为未知；不据此强制排序。",
  } };
}

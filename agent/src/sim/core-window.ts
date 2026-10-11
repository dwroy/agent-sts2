import type { TransitionTrace } from "../reflex/turn-solver.js";
import { summarizeSamples, pairedDifference } from "./quantitative-stats.js";

/** Counts one named pair of distinct observed discard components, not arbitrary card actions. */
export interface CoreTurnTrace {
  turn: number;
  complete: boolean;
  bandages: number | null;
  events: TransitionTrace[];
}

/** L704 F48 T3: two actual discard components with Bandages; other original signatures stay separate. */
export function coreWindow(turns: readonly CoreTurnTrace[]) {
  const complete = turns.length > 0 && turns.every((t) => t.complete && t.events.every((e) =>
    !e.after.pendingSelection && e.after.unknown.length === 0 && e.after.unknownHand === 0));
  const byCard: Record<string, { manual: number; effects: number; firstPlay: number }> = {};
  const discards = new Map<string, number[]>();
  for (const turn of turns) for (const event of turn.events) {
    const id = event.step.cardId;
    const count = byCard[id] ?? { manual: 0, effects: 0, firstPlay: turn.turn };
    count.manual += 1; count.effects += event.effects; byCard[id] = count;
    if (turn.bandages === 3 && event.step.discards?.length && !event.after.pendingSelection && event.after.unknown.length === 0) {
      // A replay is still one manual component activation; the real discarded cards are reported separately.
      const entries = discards.get(id) ?? []; entries.push(turn.turn); discards.set(id, entries);
    }
  }
  const pairs: { components: string[]; count: number | null; firstCompletion: number | null }[] = [];
  const ids = [...discards.keys()].sort();
  for (let a = 0; a < ids.length; a += 1) for (let b = a + 1; b < ids.length; b += 1) {
    const left = ids[a]!, right = ids[b]!;
    if (left !== "ACROBATICS" || right !== "CALCULATED_GAMBLE") continue;
    const count = Math.min(discards.get(left)!.length, discards.get(right)!.length);
    pairs.push({ components: [left, right], count: complete ? count : null,
      firstCompletion: complete ? Math.max(discards.get(left)![0]!, discards.get(right)![0]!) : null });
  }
  return {
    schema: "silent-core-window-v1", complete, turns: turns.length,
    energyPaid: complete ? turns.flatMap((t) => t.events).reduce((sum, e) => sum + e.payment, 0) : null,
    byCard,
    combinations: {
      discardBandages: { pairs, unit: "所列两种组件各完成一次实际弃牌并触发已建绷带；跨轮可配对，手动激活不含自动重放；各对重叠，不可相加", evidence: "L704TLETMZBM/A10/F48/attempt3/T3/silent-0194/0376", total: null },
      poisonDefense: { count: null, reason: "缺毒源、触媒、指定防御的全链同窗口归属；不以叠毒或总伤冒充" },
      dexterityDefense: { count: null, reason: "既有敏捷缺来源身份；两永久步法签名不由夜魇代理，须核实际后继挡和输出" },
      shivDefense: { count: null, reason: "各供刀/增益/防御分支不等价，额度/手位与全部后继需独立核实" },
    },
    limits: "有限已模拟窗口的条件计数，非抽弃回流圈数或无限见证；未建模、缺转移保留null。完整战斗/胜率另看终止原因。",
  };
}

export type CoreWindowResult = ReturnType<typeof coreWindow>;
/** Use sample IDs for all paired metrics; never fill a missing trace with zero. */
export function summarizeCoreWindows(samples: readonly (CoreWindowResult | undefined)[], base: readonly (CoreWindowResult | undefined)[], ids: readonly number[]) {
  if (samples.length !== ids.length || base.length !== ids.length || new Set(ids).size !== ids.length) throw new Error("mismatched core samples");
  const paid = (rows: readonly (CoreWindowResult | undefined)[]) => rows.flatMap((r, i) => r?.energyPaid == null ? [] : [{ sample: ids[i]!, value: r.energyPaid }]);
  const known = samples.filter((r): r is CoreWindowResult => r !== undefined && r.complete);
  const names = [...new Set(known.flatMap((r) => Object.keys(r.byCard)))].sort();
  const pairs = [...new Set(known.flatMap((r) => r.combinations.discardBandages.pairs.map((p) => p.components.join("+"))))];
  return { samples: samples.length, valid: known.length, missing: samples.length - known.length,
    energy_paid: summarizeSamples(paid(samples).map((r) => r.value)),
    manual_actions: summarizeSamples(known.map((r) => Object.values(r.byCard).reduce((sum, c) => sum + c.manual, 0))),
    effect_resolutions: summarizeSamples(known.map((r) => Object.values(r.byCard).reduce((sum, c) => sum + c.effects, 0))),
    paired_energy_paid: pairedDifference(paid(base), paid(samples)),
    cards: Object.fromEntries(names.map((id) => [id, {
      manual: summarizeSamples(known.map((r) => r.byCard[id]?.manual ?? 0)),
      effects: summarizeSamples(known.map((r) => r.byCard[id]?.effects ?? 0)),
      first_play_when_played: summarizeSamples(known.flatMap((r) => r.byCard[id] ? [r.byCard[id]!.firstPlay] : [])),
    }])),
    combinations: { discardBandages: Object.fromEntries(pairs.map((pair) => [pair, {
      count: summarizeSamples(known.map((r) => r.combinations.discardBandages.pairs.find((p) => p.components.join("+") === pair)?.count ?? 0)),
      first_completion_when_completed: summarizeSamples(known.flatMap((r) => {
        const p = r.combinations.discardBandages.pairs.find((p) => p.components.join("+") === pair);
        return p?.firstCompletion == null ? [] : [p.firstCompletion];
      })),
    }])), poisonDefense: null, dexterityDefense: null, shivDefense: null,
      limits: "仅计已验证杂技/下注各一次真实弃牌且绷带建立的具名组合，其他弃牌分支及其余三核心缺全链归属，保持未知；不相加、不当回流圈数。" },
    limits: "公开策略首次施放分母只含实际施放的完成轨迹，并非所有合法方案中的最早可达启动；未到手/未施放样本保留在总分母。模拟支付不是金币成本、药价或最优牌组评分。" };
}

/** Boss-relative efficiency, with explicit input provenance and no inferred missing damage. */
import { pairedDifference, summarizeSamples } from "./quantitative-stats.js";

export interface BossMarginReference {
  bossHp: number;
  myHp: number;
  enemyIds: string[];
  unknown: string[];
  startTurn?: number;
}
export interface BossMarginTrace {
  reference: BossMarginReference;
  outgoingHp: number;
  receivedHp: number | null;
}
export interface MarginSample {
  turns: number; won: boolean; died: boolean; capped: boolean; timeUp: boolean;
  bossMargin?: BossMarginTrace;
  sequence?: unknown;
}

/** Same-window rates; the denominators are the scenario entry HP, never its changing final HP. */
export function bossRelativeMargin(myDpr: number, enemyDpr: number, bossHp: number, myHp: number): number | null {
  if (![myDpr, enemyDpr, bossHp, myHp].every(Number.isFinite) || myDpr < 0 || enemyDpr < 0 || bossHp <= 0 || myHp <= 0) return null;
  return myDpr / bossHp - enemyDpr / myHp;
}

export function marginOf(sample: MarginSample): number | null {
  const trace = sample.bossMargin;
  if (!trace || trace.reference.unknown.length || trace.receivedHp === null || sample.sequence || sample.capped || sample.timeUp
      || !(sample.won || sample.died) || !Number.isSafeInteger(sample.turns) || sample.turns < 1) return null;
  return bossRelativeMargin(trace.outgoingHp / sample.turns, trace.receivedHp / sample.turns, trace.reference.bossHp, trace.reference.myHp);
}

/** Every sample keeps its identity, including missing attribution and truncated/sequence fights. */
export function summarizeBossMargin(samples: readonly MarginSample[], base: readonly MarginSample[], ids: readonly number[], baseIds: readonly number[] = ids) {
  if (samples.length !== ids.length || base.length !== baseIds.length || new Set(ids).size !== ids.length
      || new Set(baseIds).size !== baseIds.length) throw new Error("boss margin sample identity mismatch");
  const values = (rows: readonly MarginSample[], identities: readonly number[]) => rows.flatMap((s, i) => {
    const value = marginOf(s);
    return value === null ? [] : [{ sample: identities[i]!, value }];
  });
  const option = values(samples, ids), baseline = values(base, baseIds);
  const comparable = option.length === samples.length && baseline.length === base.length && samples.length > 0;
  return {
    ...(baseIds !== ids ? { pairedIdentity: "explicit_sample_indices", referenceSamples: base.length } : {}),
    schema: "boss-relative-margin-v1", formula: "my_dpr/boss_hp-enemy_dpr/my_hp", unit: "reference_hp_fraction_per_turn",
    status: comparable ? "complete_conditional_model" : "unknown_or_incomplete_attribution",
    rankingEligible: comparable, samples: samples.length, valid: option.length, missing: samples.length - option.length,
    reference: samples[0]?.bossMargin?.reference ?? null,
    window: "scenario_entry_through_terminal_including_setup_and_terminal_turns",
    incomingScope: "enemy_responses_and_held_or_end_turn_status_damage_after_mitigation; own_cost_or_healing_not_separable_is_unknown",
    referencesVary: samples.some((s) => JSON.stringify(s.bossMargin?.reference) !== JSON.stringify(samples[0]?.bossMargin?.reference)),
    score: comparable ? summarizeSamples(option.map((s) => s.value)) : null,
    observedSubset: summarizeSamples(option.map((s) => s.value)),
    myDpr: summarizeSamples(samples.flatMap((s) => marginOf(s) === null ? [] : [s.bossMargin!.outgoingHp / s.turns])),
    enemyDpr: summarizeSamples(samples.flatMap((s) => marginOf(s) === null ? [] : [s.bossMargin!.receivedHp! / s.turns])),
    paired: pairedDifference(baseline, option),
    won: summarizeSamples(samples.flatMap((s) => { const v = marginOf(s); return s.won && v !== null ? [v] : []; })),
    died: summarizeSamples(samples.flatMap((s) => { const v = marginOf(s); return s.died && v !== null ? [v] : []; })),
    limits: "同一模拟窗口含准备轮及终止轮，入口血量固定；战中题仅代表从当前回合到终止的剩余窗口。敌方DPR计减伤后的敌人响应及持有/回合末状态伤害，不仅是攻击意图；自伤/回血无法拆分时未知。S不是胜率。缺失归属、截断及连续多Boss不补零；子集均值不能作全体排序。自伤、回血、复活和死亡时序仍独立检查；模型未校准不因样本完成而可信。",
  };
}

export const BOSS_MARGIN_NOTE = "Boss基准目标为S=my_dpr/boss_hp−enemy_dpr/my_hp。只在boss_relative_margin或bossMargin明确rankingEligible=true、同Boss/同窗口且原信任闸允许时比较S及配对差，较大为目标；先满足实际存活/资源约束，不能用高均值覆盖启动前死亡。unknown、缺失归属或截断不得当0分或自行心算补齐。";

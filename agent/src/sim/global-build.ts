/** G2 shadow aggregation: paired model predictions, explicit coverage and no S sort key. */
import { asArray, asRecord, type JsonValue } from "../core/util/json.js";
import { DecisionBudgetExpired } from "../core/decision-budget.js";
import type { CompareResult, OptionSim } from "./build-sim.js";
import { completeAdaptiveBuild } from "./build-sim.js";
import type { GlobalBossCandidate, GlobalBossPool } from "./global-build-pool.js";

export interface GlobalBossTarget extends GlobalBossCandidate {
  act: number;
  source: "visible_actual_boss" | "observed_silent_pool";
  unknown: string | null;
}
export interface GlobalOptionPrediction {
  key: string;
  base: number | null;
  option: number | null;
  delta_win: { mean: number; se: number } | null;
  delta_s: { mean: number; se: number } | null;
  samples: number | null;
  unknown: string | null;
}
export interface GlobalBossPrediction {
  target: GlobalBossTarget;
  status: "computed" | "reused_current" | "budgeted_partial" | "unknown";
  reused_current?: boolean;
  rows: GlobalOptionPrediction[];
  wall_ms: number;
  reported_sim_ms: number | null;
  completion: JsonValue | null;
  adaptive: JsonValue | null;
  production_calibration: "unknown";
}
export interface GlobalBuildSummary {
  key: string;
  known_acts: number[];
  unknown_acts: number[];
  sum_delta_p_over_p: number | null;
  conditional_snapshot_product: { base: number; option: number; delta: number } | null;
  known_only: { sum_delta_p_over_p: number | null; snapshot_product: { base: number; option: number; delta: number } | null };
  scope: "fixed_current_snapshot_not_run_win_probability";
  reasons: string[];
}
export interface GlobalBuildResult {
  schema: "global-build-v1";
  mode: "shadow";
  delivered: false;
  status: "complete" | "partial" | "unknown";
  primary: "paired_win_probability";
  s_sort: false;
  targets: GlobalBossPrediction[];
  summaries: GlobalBuildSummary[];
  final_sequence: { status: "unknown"; reason: "G1a_natural_consumer_pending" };
  pool: GlobalBossPool;
  wall_ms: number;
  limits: string;
}

/** Actual visibility takes precedence. No Boss identity is inferred from its frequency. */
export function globalBossTargets(pool: GlobalBossPool, currentAct: number, visible: ReadonlyMap<number, string>,
  trustReason: (boss: string, act: number) => string | null): GlobalBossTarget[] {
  const targets: GlobalBossTarget[] = [];
  for (let act = currentAct; act <= 3; act++) {
    const actual = visible.get(act);
    const known = pool.stages.find((stage) => stage.act === act)?.candidates ?? [];
    const candidates: GlobalBossCandidate[] = actual ? [{ boss: actual, count: 0, frequency: 1, evidence: ["actual_visible_run_state"] }] : [...known];
    if (!candidates.length) candidates.push({ boss: "unknown", count: 0, frequency: 1, evidence: [] });
    for (const candidate of candidates) targets.push({ ...candidate, act,
      source: actual ? "visible_actual_boss" : "observed_silent_pool",
      unknown: act === 3 ? "Act3_quality_gate_and_production_trust_unknown" : candidate.boss === "unknown"
        ? "no_observed_silent_boss_pool" : !actual && pool.unknown.length ? "observed_pool_has_unassigned_boss_records"
          : trustReason(candidate.boss, act) });
  }
  return targets;
}

function unknownRows(keys: readonly string[], reason: string): GlobalOptionPrediction[] {
  return keys.map((key) => ({ key, base: null, option: null, delta_win: null, delta_s: null, samples: null, unknown: reason }));
}

/** Require the original matching H1 completion provenance, including an empty returned prefix. */
export function isBudgetedGlobalPrefix(result: CompareResult): boolean {
  const completion = result.completion;
  return completion?.required === true && completion.budgeted === true
    && completion.failure === false && completion.status === "partial"
    && completion.samples === result.samples && completion.requested === result.requested
    && Number.isSafeInteger(result.samples) && result.samples >= 0
    && Number.isSafeInteger(result.requested) && result.requested > 0 && result.samples <= result.requested
    && (result.timedOut || result.samples < result.requested);
}

function predictionRows(result: CompareResult, keys: readonly string[]): GlobalOptionPrediction[] {
  const ranking = asRecord(result.buildRanking);
  return keys.map((key) => {
    const option: OptionSim | undefined = key === "@current" ? result.base : result.options.find((row) => row.key === key);
    if (!option) return unknownRows([key], "offered_candidate_not_modeled")[0]!;
    const n = Math.min(option.samples, option.pairedReference?.samples ?? result.base.samples);
    // B3's paired reference belongs to this option's prefix, not the baseline's later samples.
    const base = option.pairedReference?.rawWin ?? result.base.win;
    const delta = option.diff ?? (option.win === result.base.win ? { raw: 0, se: 0 } : null);
    // B3 rounds the paired difference to four decimals. Adding it to an exact prefix reference
    // can move a legitimate 0/1 outside [0,1]; read this option's own recorded prefix mean instead.
    const p = delta ? key === "@current" ? base : option.win : NaN;
    if (n < 2 || !Number.isFinite(base) || !Number.isFinite(p) || !Number.isFinite(delta?.se) || base < 0 || base > 1 || p < -1e-9 || p > 1 + 1e-9)
      return unknownRows([key], "paired_probability_or_reference_missing")[0]!;
    const row = asArray(ranking["rows"]).map(asRecord).find((value) => value["key"] === key);
    const margin = asRecord(row?.["delta_s"]);
    const deltaS = row?.["s_eligible"] === true && typeof margin["mean"] === "number" && Number.isFinite(margin["mean"])
      && typeof margin["se"] === "number" && Number.isFinite(margin["se"])
      ? { mean: margin["mean"], se: margin["se"] } : null;
    return { key, base, option: Math.max(0, Math.min(1, p)), delta_win: { mean: delta!.raw, se: delta!.se },
      delta_s: deltaS, samples: n, unknown: null };
  });
}

/** Unknown stages never become zero, and partial products are not labelled a whole-run prediction. */
export function summarizeGlobalBuild(targets: readonly GlobalBossPrediction[], keys: readonly string[], acts: readonly number[]): GlobalBuildSummary[] {
  return keys.map((key) => {
    const knownActs: number[] = [], unknownActs: number[] = [], reasons: string[] = [];
    let sum = 0, ratioKnown = true, pBase = 1, pOption = 1;
    for (const act of acts) {
      const stage = targets.filter((target) => target.target.act === act);
      const rows = stage.map((target) => ({ target, row: target.rows.find((row) => row.key === key) }));
      if (!rows.length || rows.some(({ row }) => !row || row.unknown || row.base === null || row.option === null)) {
        unknownActs.push(act);
        reasons.push(...rows.map(({ target, row }) => row?.unknown ?? target.target.unknown ?? "missing_candidate_or_stage"));
        if (!rows.length) reasons.push("missing_stage");
        continue;
      }
      const weight = rows.reduce((n, { target }) => n + target.target.frequency, 0);
      if (!Number.isFinite(weight) || Math.abs(weight - 1) > 1e-9) {
        unknownActs.push(act); reasons.push("incomplete_observed_pool_weight"); continue;
      }
      const base = rows.reduce((p, { target, row }) => p + target.target.frequency * row!.base!, 0);
      const option = rows.reduce((p, { target, row }) => p + target.target.frequency * row!.option!, 0);
      const delta = rows.reduce((p, { target, row }) => p + target.target.frequency * row!.delta_win!.mean, 0);
      knownActs.push(act); pBase *= base; pOption *= option;
      if (base > 0) sum += delta / base;
      else { ratioKnown = false; reasons.push("zero_baseline_ratio_undefined"); }
    }
    const product = knownActs.length ? { base: pBase, option: pOption, delta: pOption - pBase } : null;
    const knownSum = knownActs.length && ratioKnown ? sum : null;
    return { key, known_acts: knownActs, unknown_acts: unknownActs,
      sum_delta_p_over_p: unknownActs.length ? null : knownSum,
      conditional_snapshot_product: unknownActs.length ? null : product,
      known_only: { sum_delta_p_over_p: knownSum, snapshot_product: product },
      scope: "fixed_current_snapshot_not_run_win_probability", reasons: [...new Set(reasons)] };
  });
}

export async function evaluateGlobalBuild(args: {
  pool: GlobalBossPool; currentAct: number; visible: ReadonlyMap<number, string>; keys: readonly string[];
  currentBoss: string; current: CompareResult; trustReason: (boss: string, act: number) => string | null;
  evaluate: (target: GlobalBossTarget) => Promise<CompareResult>; now?: () => number;
}): Promise<GlobalBuildResult> {
  if (!Number.isSafeInteger(args.currentAct) || args.currentAct < 1 || args.currentAct > 3)
    throw new Error("remaining_act_structure_not_observed");
  const now = args.now ?? (() => performance.now()), started = now();
  const targets: GlobalBossPrediction[] = [];
  for (const target of globalBossTargets(args.pool, args.currentAct, args.visible, args.trustReason)) {
    const began = now();
    if (target.unknown) {
      targets.push({ target, status: "unknown", rows: unknownRows(args.keys, target.unknown), wall_ms: 0,
        reported_sim_ms: null, completion: null, adaptive: null, production_calibration: "unknown" });
      continue;
    }
    try {
      const reused = target.act === args.currentAct && target.boss === args.currentBoss;
      const result = reused ? args.current : await args.evaluate(target);
      const completion = result.completion;
      // H1 prefixes remain unknown for G2's full-result aggregation, without inventing a worker failure.
      if (isBudgetedGlobalPrefix(result)) {
        const rows = predictionRows(result, args.keys).map((row) => {
          const option = row.key === "@current" ? result.base : result.options.find((option) => option.key === row.key);
          return { ...row, samples: option ? Math.min(option.samples, option.pairedReference?.samples ?? result.base.samples) : null,
            unknown: row.unknown ?? "budgeted_prefix_incomplete" };
        });
        targets.push({ target, status: "budgeted_partial", reused_current: reused, rows,
          wall_ms: Math.max(0, Math.round(now() - began)), reported_sim_ms: result.elapsedMs,
          completion: completion as unknown as JsonValue, adaptive: result.adaptive ?? null, production_calibration: "unknown" });
        continue;
      }
      if (result.timedOut || result.samples < 1 || result.samples !== result.requested && !completeAdaptiveBuild(result))
        throw new Error("global_required_computation_incomplete");
      targets.push({ target, status: reused ? "reused_current" : "computed", rows: predictionRows(result, args.keys),
        wall_ms: Math.max(0, Math.round(now() - began)), reported_sim_ms: result.elapsedMs,
        completion: result.completion ? result.completion as unknown as JsonValue : null,
        adaptive: result.adaptive ?? null, production_calibration: "unknown" });
    } catch (error) {
      // Only this stage's typed budget stop is an expected missing observation; worker errors stay errors.
      const reason = error instanceof DecisionBudgetExpired && error.stage === "G2_global_shadow"
        ? "decision_budget_exhausted:G2_global_shadow"
        : `global_computation_failed:${String(error instanceof Error ? error.message : error).slice(0, 300)}`;
      targets.push({ target, status: "unknown", rows: unknownRows(args.keys, reason), wall_ms: Math.max(0, Math.round(now() - began)),
        reported_sim_ms: null, completion: null, adaptive: null, production_calibration: "unknown" });
    }
  }
  const summaries = summarizeGlobalBuild(targets, args.keys, Array.from({ length: 4 - args.currentAct }, (_, i) => args.currentAct + i));
  return { schema: "global-build-v1", mode: "shadow", delivered: false,
    status: summaries.some((row) => row.known_acts.length) ? summaries.every((row) => !row.unknown_acts.length) ? "complete" : "partial" : targets.some((target) => target.status === "budgeted_partial") ? "partial" : "unknown",
    primary: "paired_win_probability", s_sort: false, targets, summaries,
    final_sequence: { status: "unknown", reason: "G1a_natural_consumer_pending" }, pool: args.pool,
    wall_ms: Math.max(0, Math.round(now() - started)),
    limits: "只读shadow：逐Boss同题同种子配对；S只记录，不作排序键。选项概率和配对差沿用B3四位小数记录，基准用该选项自身配对前缀，不通过取整差反推概率。后续幕固定当前牌组/资源，不预测沿途升级、回血或奖励；各幕快照概率乘积不是实际整局通关率。池权重来自本角色本进阶已观察战斗记录（含重试），不是游戏生成概率。第三幕质量闸/当前生产可信度及最终连战未知；不把缺口填0，不放宽既有校准门槛。" };
}

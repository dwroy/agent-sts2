/** H2 counterfactual inventories, not a completion policy or a qualification of a core. */
import { DecisionBudget, HUMAN_PACE_BUDGETS, withDecisionBudget, withinDecisionBudget } from "../core/decision-budget.js";
import { applyBuildAction, missingRequirements } from "../construction/planner.js";
import type { BuildState, Component, CoreTemplate } from "../construction/types.js";
import { continuousBossResult, type ContinuousBossResult } from "./continuous-boss-result.js";
import { globalBossTargets, type GlobalBossTarget } from "./global-build.js";
import type { GlobalBossPool } from "./global-build-pool.js";

export interface DirectionVariant { key: string; state: BuildState; added: Component[] }
export interface DirectionInventory {
  id: string; candidate: boolean; evidence: CoreTemplate["evidence"] | null; limits: string[];
  missing: { id: string; count: number }[]; variants: DirectionVariant[]; unknown: string | null;
}
/** Enumerate alternatives, without treating the first component as a learned preference. */
export function directionInventories(state: BuildState, cores: readonly CoreTemplate[], ascension: number,
  remaining = () => Infinity, maximum = 32): DirectionInventory[] {
  const result: DirectionInventory[] = [{ id: "uncommitted", candidate: true, evidence: null, limits: [], missing: [],
    variants: [{ key: "uncommitted:0", state: structuredClone(state), added: [] }], unknown: null }];
  for (const core of cores.filter((c) => c.character === "silent" && c.ascensions.includes(ascension))) {
    let frontier: DirectionVariant[] = [{ key: "", state: structuredClone(state), added: [] }];
    const complete = new Map<string, DirectionVariant>();
    let reason: string | null = null, steps = 0;
    while (frontier.length) {
      if (remaining() <= 0) { reason = "direction_budget_exhausted"; break; }
      if (++steps > 512) { reason = "component_expansion_bound"; break; }
      const variant = frontier.shift()!, missing = missingRequirements(variant.state, core);
      if (!missing.length) {
        const key = inventoryKey(variant.state);
        if (!complete.has(key)) complete.set(key, variant);
        continue;
      }
      const need = missing[0]!, requirement = core.requirements.find((r) => r.id === need.id)!;
      for (const component of requirement.any) {
        const next = component.kind === "card" ? applyBuildAction(variant.state,
          { kind: "add", card: { id: component.id, upgraded: component.upgraded === true }, price: 0 })
          : applyBuildAction(variant.state, { kind: "relic", id: component.id, price: 0 });
        if (!next || (missingRequirements(next, core).find((r) => r.id === need.id)?.count ?? 0) >= need.count) continue;
        const key = inventoryKey(next);
        if (!complete.has(key) && !frontier.some((v) => inventoryKey(v.state) === key))
          frontier.push({ key: "", state: next, added: [...variant.added, { ...component }] });
      }
      if (frontier.length + complete.size > maximum) {
        reason = "component_alternatives_exceed_bound"; frontier = frontier.slice(0, Math.max(0, maximum - complete.size));
      }
    }
    result.push({ id: core.id, candidate: core.status !== "validated", evidence: structuredClone(core.evidence), limits: [...core.limits],
      missing: missingRequirements(state, core), variants: [...complete.values()].map((v, i) => ({ ...v, key: `${core.id}:${i}` })),
      unknown: reason ?? (!complete.size ? "component_resource_contract_or_requirements_unresolved" : null) });
  }
  return result;
}
function inventoryKey(state: BuildState): string {
  return JSON.stringify([state.cards.map((c) => `${c.id}:${c.upgraded}`).sort(), [...state.relics].sort()]);
}

export interface DirectionMetric {
  status: "computed" | "partial" | "unknown"; reason: string | null;
  win: number | null; win_se: number | null; s: { mean: number; se: number } | null;
  samples: number; requested: number; continuous?: ContinuousBossResult;
}
export type DirectionEvaluator = (target: GlobalBossTarget, variant: DirectionVariant,
  budget: DecisionBudget) => Promise<DirectionMetric>;
export interface DirectionPrediction { variant: string; target: GlobalBossTarget; result: DirectionMetric }
const unknownMetric = (reason: string): DirectionMetric => ({ status: "unknown", reason, win: null, win_se: null, s: null, samples: 0, requested: 0 });

/** Aggregate Boss weights within one target group; never multiply fights or invent a prior over cores. */
export function summarizeDirection(rows: readonly DirectionPrediction[], variants: readonly DirectionVariant[], inventoryUnknown: string | null) {
  return variants.map((variant) => {
    const selected = rows.filter((row) => row.variant === variant.key);
    const reasons = [...new Set([...(inventoryUnknown ? [inventoryUnknown] : []),
      ...selected.flatMap((row) => row.result.status !== "computed" || row.result.reason ? [row.result.reason ?? "incomplete_model_result"] : [])])];
    const weight = selected.reduce((n, row) => n + row.target.frequency, 0);
    if (!selected.length || Math.abs(weight - 1) > 1e-9) reasons.push("incomplete_observed_target_weights");
    const known = !reasons.length && selected.every((row) => row.result.win !== null);
    const sKnown = known && selected.every((row) => row.result.s !== null);
    return { variant: variant.key, win: known ? selected.reduce((p, row) => p + row.target.frequency * row.result.win!, 0) : null,
      S: sKnown ? selected.reduce((s, row) => s + row.target.frequency * row.result.s!.mean, 0) : null,
      unknown: reasons, scope: "observed_weighted_fixed_inventory_raw_simulation" };
  });
}

/** The production G2 quality gate is authoritative, including its explicit Act3 objection. */
export async function evaluateDirections(args: {
  state: BuildState; cores: readonly CoreTemplate[]; ascension: number; pool: GlobalBossPool;
  evaluate: DirectionEvaluator; now?: () => number;
  evaluateBatch?: (target: GlobalBossTarget, variants: readonly DirectionVariant[], budget: DecisionBudget,
    cap: number) => Promise<ReadonlyMap<string, DirectionMetric>>;
  /** Fixed tests inject synthetic targets. Production callers must use G2's targets. */
  targets?: readonly GlobalBossTarget[];
}) {
  const budget = new DecisionBudget("H2_direction", "direction", args.now);
  return withDecisionBudget(budget, async () => {
    const inventories = directionInventories(args.state, args.cores, args.ascension, () => budget.remaining());
    const targets = (args.targets ?? globalBossTargets(args.pool, 2, new Map(), () => null)).map((target) =>
      args.pool.character !== "silent" || args.pool.ascension !== args.ascension ? { ...target, unknown: "observed_pool_role_or_ascension_mismatch" } : target);
    const rows: DirectionPrediction[] = [];
    const batched = new Map<GlobalBossTarget, ReadonlyMap<string, DirectionMetric>>();
    if (args.evaluateBatch) {
      const known = targets.filter((target) => !target.unknown), variants = inventories.flatMap((row) => row.variants);
      for (const [index, target] of known.entries()) {
        if (budget.remaining() <= 1000) break;
        const cap = budget.remaining() / (known.length - index);
        try {
          batched.set(target, await withinDecisionBudget("H2_direction_target_batch",
            () => args.evaluateBatch!(target, variants, budget, cap), cap));
        } catch (error) { batched.set(target, new Map(variants.map((v) => [v.key,
          unknownMetric(`direction_batch_unknown:${String(error instanceof Error ? error.message : error).slice(0, 160)}`)]))); }
      }
    }
    for (const inventory of inventories) for (const variant of inventory.variants) for (const target of targets) {
      const existing = batched.get(target)?.get(variant.key);
      const reason = target.unknown ?? (!existing && budget.remaining() <= 1000 ? "direction_budget_exhausted" : null);
      let result = reason ? unknownMetric(reason) : existing ?? (args.evaluateBatch ? unknownMetric("batch_variant_unavailable") : null);
      if (!result) {
        try {
          result = await withinDecisionBudget("H2_direction_comparison", () => args.evaluate(target, variant, budget));
          if (budget.remaining() <= 0) result = unknownMetric("direction_budget_exhausted_late_result");
        } catch (error) { result = unknownMetric(`direction_computation_failed:${String(error instanceof Error ? error.message : error).slice(0, 160)}`); }
      }
      if (result.status === "computed" && (result.samples < 2 || !Number.isSafeInteger(result.samples)
        || !Number.isFinite(result.win) || result.win === null || result.win < 0 || result.win > 1
        || result.win_se === null || !Number.isFinite(result.win_se) || result.win_se < 0
        || result.s !== null && (!Number.isFinite(result.s.mean) || !Number.isFinite(result.s.se) || result.s.se < 0)))
        result = unknownMetric("invalid_model_result");
      rows.push({ variant: variant.key, target, result });
    }
    budget.pause();
    const emptySequence = continuousBossResult([], 0, true)!;
    return { schema: "human-pace-direction-v1", mode: "shadow", delivered: false, s_sort: false,
      budget_ms: HUMAN_PACE_BUDGETS.direction, time_budget: budget.record(),
      inventories: inventories.map(({ variants, ...inventory }) => ({ ...inventory,
        variants: variants.map(({ key, added, state }) => ({ key, added, cards: state.cards.length, relics: state.relics.length,
          inventory_requirements_satisfied: true, functional_core: "unknown", actual_casts: "unknown", actual_run_outcome: "unknown" })),
        summaries: [2, 3].map((act) => ({ act, rows: summarizeDirection(rows.filter((row) => row.target.act === act), variants, inventory.unknown) })) })), predictions: rows,
      final_sequence: { status: "unknown", reason: "G1a_natural_consumer_and_production_calibration_pending",
        result: emptySequence, S: null },
      pool: args.pool,
      limits: "学习者模板的条件组件假设，不预测获得政策或概率，不授予核心资格。any组件分别列出，无方向先验，不选定最佳方向。目标权重为本角色已观察战斗记录（含SL），不是生成概率或独立局分布。第三幕/最终连战质量与生产可信度未知时不补数字、不启动worker；不乘单战率。持有、模拟施放、存活及实际整局结果分列；S只记录。" };
  });
}

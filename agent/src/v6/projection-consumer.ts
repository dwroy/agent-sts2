import type { V6Config } from "./config.js";
import type { DirectionWeights } from "./formats.js";
import type { DirectionEvaluation, DirectionComparison } from "./replan-triggers.js";
import type { V6ProjectionTable } from "../sim/v6-projection.js";
import { v6ProjectionEntries } from "../sim/v6-projection-entries.js";
import { v6Digest } from "../sim/v6-completion.js";

/** Consume W3's paired comparisons; never infer a paired SE from marginal estimates. */
export function directionEvaluationFromProjection(table: V6ProjectionTable, config: V6Config, baselineId: string,
  plan?: DirectionWeights, extra: Pick<DirectionEvaluation, "bossEntryHp" | "hazardHp" | "acquiredComponentIds" | "pivotMatched"> = {}): DirectionEvaluation {
  if (config.mode === "off" || !table.enabled) return { id: "off", entries: [] };
  const entries = v6ProjectionEntries(table, config, baselineId);
  const leader = Object.keys(plan?.direction_weights ?? {}).sort((a, b) => plan!.direction_weights[b]! - plan!.direction_weights[a]! || a.localeCompare(b))[0];
  const chains = table.targets.filter(t => t.kind === "chain");
  const coreCompletion = Object.fromEntries(Object.entries(table.rankings).map(([direction, combos]) => {
    const rows = entries.filter(e => e.direction_id === direction && e.combo_id === combos[0] && chains.some(t => t.id === e.target_id));
    const known = chains.length > 0 && chains.every(t => t.probability !== null && rows.some(e => e.target_id === t.id && e.availability.skip !== null))
      && Math.abs(chains.reduce((sum, t) => sum + t.probability!, 0) - 1) <= 1e-6;
    return [direction, known ? rows.reduce((sum, e) => sum + e.availability.skip! * chains.find(t => t.id === e.target_id)!.probability!, 0) : null];
  }));
  const comparisons: DirectionComparison[] = [];
  if (table.phase === "act" && leader) for (const [direction, combos] of Object.entries(table.rankings)) {
    if (direction === leader || !chains.length) continue;
    const rows = chains.map(t => ({ t, delta: table.act_evaluations.find(e => e.direction_id === direction && e.combination_id === combos[0] && e.target_id === t.id)
      ?.versus.find(v => v.direction_id === leader && v.combination_id === table.rankings[leader]?.[0])?.joint_paired_delta }));
    if (rows.some(r => r.t.probability === null || !r.delta) || Math.abs(rows.reduce((sum, r) => sum + r.t.probability!, 0) - 1) > 1e-6) continue;
    comparisons.push({ direction, leader, mean: rows.reduce((sum, r) => sum + r.t.probability! * r.delta!.mean, 0),
      se: rows.reduce((sum, r) => sum + r.t.probability! * r.delta!.se, 0), n: Math.min(...rows.map(r => r.delta!.n)) });
  }
  if (table.phase === "pick" && leader) for (const row of table.pick_direction_comparisons) {
    const delta = row.joint_paired_delta;
    if (row.reference_direction_id !== leader || row.direction_id === leader || !delta || !Number.isFinite(row.known_mass)
      || Math.abs(row.known_mass - 1) > 1e-6) continue;
    comparisons.push({ direction: row.direction_id, leader, ...delta, optionId: row.option_id, labels: [...row.labels],
      offeredCore: row.option_id !== baselineId && table.entries.some(e => e.option_id === row.option_id
        && e.direction_id === row.direction_id && e.direction_role === "core") });
  }
  return { id: v6Digest({ entries, comparisons, targets: table.targets }), entries,
    targets: table.targets.map(t => ({ id: t.id, kind: t.kind })), coreCompletion, comparisons, ...extra };
}

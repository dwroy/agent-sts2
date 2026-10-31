/** Target-local knownness. Optional later targets never erase current-boss information. */
import type { V6CombinationProjection, V6ProjectionTable } from "../sim/v6-projection.js";
import type { JsonValue } from "../core/util/json.js";
const finiteProbability = (p: unknown): p is number => typeof p === "number" && Number.isFinite(p) && p >= 0 && p <= 1;
export function knownCombination(row: V6CombinationProjection): boolean {
  const e = row.entry, p = e.availability.take, w = e.win_complete, bound = e.expected_win_bound;
  if (!row.combination_id || !finiteProbability(p)) return false;
  if (bound) return p < .05 && bound.lower === 0 && bound.upper === p && e.expected_win == null
    && bound.reason === (p === 0 ? "formation_impossible" : "low_probability_not_simulated");
  return finiteProbability(e.expected_win) && !!w && finiteProbability(w.value) && Number.isInteger(w.n) && w.n >= 2
    && Number.isFinite(w.se) && w.se >= 0 && Math.abs(e.expected_win - p * w.value) < 1e-9;
}
export function bestTargetCombination(table: V6ProjectionTable, option: string, target: string): V6CombinationProjection | undefined {
  const rows = table.combinations.filter(r => r.entry.option_id === option && r.entry.target_id === target && knownCombination(r));
  // Prefer measured expectations. Bounds remain separate and explicitly retain their unmeasured W.
  return rows.sort((a, b) => Number(b.entry.expected_win != null) - Number(a.entry.expected_win != null)
    || (b.entry.expected_win ?? b.entry.expected_win_bound!.upper) - (a.entry.expected_win ?? a.entry.expected_win_bound!.upper)
    || String(a.combination_id).localeCompare(String(b.combination_id)))[0];
}
export function currentBossKnown(table: V6ProjectionTable | null | undefined, option: string): boolean {
  if (!table?.enabled) return false;
  const targets = table.targets.filter(t => t.kind === "current");
  return targets.length === 1 && !targets[0]!.unknown && targets[0]!.probability === 1
    && !!bestTargetCombination(table, option, targets[0]!.id);
}
/** Small mandatory per-option current target, plus optional known/unknown later targets. */
export function targetValueSummaries(table: V6ProjectionTable | undefined, option: string): JsonValue[] {
  if (!table) return [];
  return [...table.targets].sort((a, b) => Number(b.kind === "current") - Number(a.kind === "current"))
    .map(t => {
      const r = bestTargetCombination(table, option, t.id), e = r?.entry;
      return { target: t.id, kind: t.kind, combo: r?.combination_id ?? null,
        P: e?.availability.take ?? null, W: e?.win_complete?.value ?? null, n: e?.win_complete?.n ?? 0,
        ...(e ? { P_baseline: e.availability.skip, delta_P: e.availability.take != null && e.availability.skip != null ? e.availability.take - e.availability.skip : null } : {}),
        PW: e?.expected_win ?? null, ...(e?.expected_win_bound ? { PW_bound: [0, e.expected_win_bound.upper], reason: e.expected_win_bound.reason } : {}),
        trust: e?.trust ?? "unknown", ...(e?.trust_details ? { validation: e.trust_details } : {}),
        selection: "computed_subset_best", ...(r ? {} : { reason: t.unknown ?? "target_value_unavailable" }) };
    });
}

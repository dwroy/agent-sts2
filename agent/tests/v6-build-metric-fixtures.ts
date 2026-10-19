/** Synthetic parser fixtures; contains no game observations. */
import { buildObservedMetricNames, type BuildMetric } from "../src/v6/build-core.js";
export const unknownBuildStatistic = () => ({ n: 0, unit: "independent_run", method: "synthetic missing observation", value: null, se: null,
  distribution: [], evidence: [], unknown_reason: "fixture has no observations", small_sample: true });
export function pooledMetrics(): BuildMetric[] {
  return (["first", "including_sl"] as const).map(attempt => ({ attempt, target_ascension: 0, sources: [],
    raw_counts: { runs: 0, formed_runs: 0, cleared_runs: 0, chain_reached: 0, chain_won: 0, bosses: {} },
    observed: Object.fromEntries(buildObservedMetricNames.map(k => [k, unknownBuildStatistic()])) as BuildMetric["observed"],
    bosses: {}, availability: [], simulation: [], regression: [], shrinkage: [] }));
}

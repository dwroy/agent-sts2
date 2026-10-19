/** Synthetic multi-combo contracts only; these are not game knowledge. */
import { buildObservedMetricNames, validateBuildCore, type BuildCore } from "../src/v6/build-core.js";
import { observation, projection } from "./v6-fixtures.js";
import { validateProjectionEntry } from "../src/v6/formats.js";
import { pooledMetrics } from "./v6-build-metric-fixtures.js";
const unknown = { n: 0, unit: "fixture", method: "synthetic contract", value: null, se: null,
  distribution: [], evidence: [], unknown_reason: "not measured", small_sample: true };
const observed = (value: number) => ({ ...unknown, n: 3, value, evidence: [observation], unknown_reason: null });
export function coreFixture(direction = "TEST_A"): BuildCore {
  const metrics = pooledMetrics().map(metric => ({ ...metric,
    sources: [{ version: "fixture", ascension: 1, run_ids: ["FIXTURE_RUN", "FIXTURE_2", "FIXTURE_3"],
      counts: { runs: 3, formed_runs: 3, cleared_runs: 1, chain_reached: 0, chain_won: 0, bosses: { TEST_TARGET: { reached: 3, won: 1 } } } }],
    raw_counts: { runs: 3, formed_runs: 3, cleared_runs: 1, chain_reached: 0, chain_won: 0, bosses: { TEST_TARGET: { reached: 3, won: 1 } } },
    observed: { ...metric.observed, dpr_boss: observed(20), startup_turn: observed(3), cleared_runs: observed(1) },
    bosses: { TEST_TARGET: { reached: observed(3), won: observed(1), win_rate: observed(1 / 3) } } }));
  const min = `${direction}:min`, common = `${direction}:common`;
  const raw = { schema: "build-core-v1", direction, name: "Synthetic core", status: "candidate", scope: { character: "silent", ascensions: [0, 1] },
    card_pool: { TEST_CARD: { roles: ["core"], contribution: "Fixture only", upgraded_matters: true, combos: [min, common], evidence: [observation] },
      TEST_OTHER: { roles: ["support"], contribution: "Fixture only", upgraded_matters: false, combos: [common], evidence: [observation] } },
    combos: [
      { id: min, types: ["must_pick_minimal"], boss: null, cards: [{ id: "TEST_CARD", count: 1, upgraded: true }], prerequisites: null, metrics,
        fits: { bosses_positive: [], bosses_negative: [], routes: [], situations: [] }, evidence: [observation], confidence: "low", linked_experience: [] },
      { id: common, types: ["common", "max_dpr"], boss: "TEST_TARGET", cards: [{ id: "TEST_CARD", count: 1, upgraded: true }, { any_of: ["TEST_OTHER"], count: 2, upgraded: false }],
        prerequisites: null, metrics, fits: { bosses_positive: [], bosses_negative: [], routes: [], situations: [] }, evidence: [observation], confidence: "low", linked_experience: [] },
    ], pivot_signals: [], failure_modes: [], linked_experience: [], linked_reflex: [] };
  const parsed = validateBuildCore(raw); if (!parsed.ok) throw Error(parsed.issues.join("; ")); return parsed.value;
}
export function comboProjection(combo = "TEST_A:min") {
  const parsed = validateProjectionEntry({ ...projection, combo_id: combo, combo_source: "build-core-v1", availability: { take: .6, skip: .5 },
    win_complete: { value: .8, se: .04, n: 100 }, win_incomplete: { value: .2, se: .04, n: 100 }, incomplete_source: "empirical",
    expected_win: .56, direction_value: .56, combo_metrics: [{ ascension: 0, attempt: "first", dpr_boss: { value: 25, n: 3, method: "fixture only" },
      startup_turn: { value: 2, n: 3, method: "fixture only" }, history: { reached: 3, won: 1, attempt: "first" } }] });
  if (!parsed.ok) throw Error(parsed.issues.join("; ")); return parsed.value;
}

import { describe, expect, it } from "vitest";
import { buildMetricSchema, validateBuildCore } from "../src/v6/build-core.js";
import { evaluateBuildFits, evaluateBuildPrerequisites } from "../src/v6/build-core-conditions.js";
import { validate } from "../src/v6/schema.js";
import { pooledMetrics, unknownBuildStatistic as unknown } from "./v6-build-metric-fixtures.js";
import { coreFixture } from "./v6-direction-core-fixtures.js";
const evidence = [{ run_id: "FIXTURE_RUN", floor: 8 }];
const stat = (value: number | null) => ({ ...unknown(), n: 2, value, evidence, unknown_reason: value === null ? "unidentified fixed fixture" : null });
function metric() {
  const m = pooledMetrics()[0]!;
  m.sources = [0, 1].map((ascension, i) => ({ ascension, version: `fixture_${i}`, run_ids: [`FIXTURE_${i}`],
    counts: { runs: 1, formed_runs: 1, cleared_runs: i, chain_reached: 0, chain_won: 0, bosses: { TARGET: { reached: 1, won: i } } } }));
  m.raw_counts = { runs: 2, formed_runs: 2, cleared_runs: 1, chain_reached: 0, chain_won: 0, bosses: { TARGET: { reached: 2, won: 1 } } };
  return m;
}
describe("pooled build-core-v1 contract", () => {
  it("reconciles disjoint source runs and raw per-boss counts without version/ascension partitions", () => {
    expect(validate(buildMetricSchema, metric()).ok).toBe(true);
    for (const mutate of [
      (m: ReturnType<typeof metric>) => { m.raw_counts.runs = 3; },
      (m: ReturnType<typeof metric>) => { m.sources[1]!.run_ids = ["FIXTURE_0"]; },
      (m: ReturnType<typeof metric>) => { m.raw_counts.cleared_runs = 0; },
      (m: ReturnType<typeof metric>) => { m.raw_counts.bosses.TARGET!.won = 0; },
      (m: ReturnType<typeof metric>) => { m.sources[1]!.counts.runs = 2; },
    ]) { const m = metric(); mutate(m); expect(validate(buildMetricSchema, m).ok).toBe(false); }
    expect(validate(buildMetricSchema, { ...metric(), ascension: 0 }).ok).toBe(false);
    expect(validate(buildMetricSchema, { ...metric(), version: "fixture" }).ok).toBe(false);
    const m = metric(); m.sources[0]!.counts.formed_runs = null; m.raw_counts.formed_runs = null;
    expect(validate(buildMetricSchema, m).ok).toBe(true);
  });
  it("requires exactly first/including_sl while source ascensions do not restrict pooling", () => {
    const c = coreFixture(); c.combos[0]!.metrics[0]!.sources[0]!.ascension = 99;
    expect(validateBuildCore(c).ok).toBe(true);
    c.combos[0]!.metrics[1]!.attempt = "first";
    expect(validateBuildCore(c).ok).toBe(false);
  });
  it("keeps missing entry HP and unavailable simulation outcomes explicitly unknown", () => {
    const m = metric(); m.simulation = [{ target: "TARGET", entry_hp: null, win_rate: unknown(), hp_loss: unknown(),
      completion_turns: unknown(), dpr: unknown(), trust: "unknown", labels: ["exact_A10_static_missing"] }];
    expect(validate(buildMetricSchema, m).ok).toBe(true);
    m.simulation[0]!.win_rate = stat(.5);
    expect(validate(buildMetricSchema, m).ok).toBe(false);
    m.simulation[0]!.entry_hp = 50;
    expect(validate(buildMetricSchema, m).ok).toBe(true);
  });
  it("accepts unidentifiable regression with real evidence and rejects out-of-range rates", () => {
    const m = metric(); m.regression = [{ target: "TARGET", win_rate: stat(null), hp_loss: stat(null), completion_turns: stat(null),
      ascension_offset: { win_rate: stat(null), hp_loss: stat(null), completion_turns: stat(null) },
      method: "fixed combo/target intercept; one A10-centered shared offset; cluster bootstrap", labels: ["rank_deficient"] }];
    expect(validate(buildMetricSchema, m).ok).toBe(true);
    m.regression[0]!.win_rate = stat(1.1); expect(validate(buildMetricSchema, m).ok).toBe(false);
  });
  it("retains raw estimates and checks the explicit direction shrinkage arithmetic", () => {
    const m = metric(); m.shrinkage = [{ basis: "regression", target: "TARGET", metric: "win_rate", raw: stat(1),
      direction: stat(.5), estimate: stat(.6), combo_weight: .2, method: "fixed weighted estimate", labels: ["n_below_10"] }];
    expect(validate(buildMetricSchema, m).ok).toBe(true);
    m.shrinkage[0]!.estimate = stat(.8); expect(validate(buildMetricSchema, m).ok).toBe(false);
  });
  it("uses the whitelist for executable prerequisites and three-valued fits without inventing rules", () => {
    const combo = coreFixture().combos[0]!;
    combo.prerequisites = { op: "contains", field: "player.relics", value: "FIXTURE_RELIC" };
    combo.fits.situations = [{ text: "synthetic applicability", evidence, when: { op: "gte", field: "player.hp", value: 10 } }];
    expect(evaluateBuildPrerequisites(combo, { player: { relics: [] } })).toBe(false);
    expect(evaluateBuildPrerequisites(combo, { player: { relics: ["FIXTURE_RELIC"] } })).toBe(true);
    expect(evaluateBuildPrerequisites(combo, {})).toBeNull();
    expect(evaluateBuildFits(combo, {}).situations[0]!.applies).toBeNull();
    expect(evaluateBuildFits(combo, { player: { hp: 12 } }).situations[0]!.applies).toBe(true);
    const c = coreFixture(); c.combos[0]!.prerequisites = { op: "eq", field: "private.secret", value: 1 };
    expect(validateBuildCore(c).ok).toBe(false);
  });
});

import { expect, it } from "vitest";
import { v6ProjectionEntries } from "../src/sim/v6-projection-entries.js";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { validateProjectionEntry } from "../src/v6/formats.js";
import { directionSummaries, directionTask } from "../src/v6/direction-plan.js";
import { asArray, asRecord } from "../src/core/util/json.js";
import { FixedRunner, request, source } from "./v6-projection-fixture.js";
it("hands actual combination rows to W4 without cloning a direction maximum into each combo", async () => {
  const r = request(), d = r.directions[0]!;
  r.completionSources = [source(undefined, 2)];
  const provider = r.completionSources[0]!, resolve = provider.resolve;
  provider.resolve = c => {
    const out = resolve(c)!; out.combinations[0]!.id = d.combos[0]!.id;
    // A second combination with W0=1 makes copying the direction maximum observable.
    out.combinations[1]!.general = out.combinations[1]!.samples;
    return out;
  };
  const table = await new V6ProjectionEngine(new FixedRunner()).evaluate(r), entries = v6ProjectionEntries(table, r.config, "take");
  expect(entries).toHaveLength(2); expect(entries.every(e => validateProjectionEntry(e).ok)).toBe(true);
  const row = table.combinations.find(r => r.combination_id === "D:minimal" && r.entry.option_id === "take")!;
  expect(row.entry.availability).toEqual({ take: .75, skip: .5 });
  expect(row.completed_win).toEqual({ value: 1, se: 0, n: r.config.samples_pick });
  expect(row.general_win?.n).toBe(r.config.samples_pick);
  expect(row.general_win?.value).toBeCloseTo(.25, 14);
  expect(r.weights).toEqual({ D: 1 }); expect(table.targets.map(t => t.probability)).toEqual([1]);
  // Compatibility audit only: P*Wk+(1-P)*W0=.8125, whereas the parked P*Wk design gives .75.
  const legacyMixture = .75 * 1 + (1 - .75) * .25;
  expect(legacyMixture).toBe(.8125);
  expect(entries[0]).toMatchObject({ combo_id: "D:minimal", combo_source: "construction-transition", expected_win: legacyMixture, direction_value: 1 });
  expect(entries[1]).toMatchObject({ win_complete: { value: 1 }, win_incomplete: { value: 1 }, expected_win: 1, direction_value: 1 });
  const task = directionTask({ summaries: directionSummaries("silent", 10, [], [d.core], null), entries, appearedCards: [], potionIds: [], floor: 5, current: null });
  const combo = asRecord(asArray(asRecord(asArray(task["build_cores"])[0])["combos"])[0]);
  expect(combo["evaluations"]).toBeUndefined();
  expect(task).not.toHaveProperty("direction_evaluation");
  expect(task).not.toHaveProperty("availability");
  expect(combo).toMatchObject({ id: "D:minimal", completed_results: [], unknown_reasons: ["completed_core_cache_miss"] });
  expect(JSON.stringify(task)).not.toMatch(/"(?:expected_win|win_incomplete|availability)":/);
  expect(v6ProjectionEntries(table, { ...r.config, mode: "off" })).toEqual([]);
});
it("precomputes baseline simulations for reuse and preserves the P=1 boundary in strict rows", async () => {
  const r = request(), runner = new FixedRunner(), engine = new V6ProjectionEngine(runner);
  await engine.precompute(r); const t = await engine.evaluate(r);
  expect(t.telemetry.simulations).toBe(0); expect(t.telemetry.cache_hits).toBeGreaterThan(0);
  r.completionSources = [source({ skip: 1, take: 1 })];
  const certain = v6ProjectionEntries(await engine.evaluate(r), r.config);
  expect(certain.every(e => e.win?.value === 1 && e.win_incomplete === null && e.expected_win === 1 && validateProjectionEntry(e).ok)).toBe(true);
  const task = directionTask({ summaries: directionSummaries("silent", 10, [], [r.directions[0]!.core], null), entries: certain.map(e => ({ ...e, combo_id: "D:minimal" })), appearedCards: [], potionIds: [], floor: 5, current: null });
  const combo = asRecord(asArray(asRecord(asArray(task["build_cores"])[0])["combos"])[0]);
  expect(task).not.toHaveProperty("direction_evaluation");
  expect(combo).toMatchObject({ completed_results: [], unknown_reasons: ["completed_core_cache_miss"] });
  expect(certain.map(e => e.option_id)).toEqual(["skip", "take"]);
  expect(validateProjectionEntry({ ...certain[0], availability: { take: .5, skip: .5 } }).ok).toBe(false);
});

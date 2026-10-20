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
  provider.resolve = c => { const out = resolve(c)!; out.combinations[0]!.id = d.combos[0]!.id; return out; };
  const table = await new V6ProjectionEngine(new FixedRunner()).evaluate(r), entries = v6ProjectionEntries(table, r.config, "take");
  expect(entries).toHaveLength(2); expect(entries.every(e => validateProjectionEntry(e).ok)).toBe(true);
  expect(entries[0]).toMatchObject({ combo_id: "D:minimal", combo_source: "construction-transition", expected_win: .75, direction_value: .75 });
  const task = directionTask({ summaries: directionSummaries("silent", 10, [], [d.core], null), entries, appearedCards: [], potionIds: [], floor: 5, current: null });
  const combo = asRecord(asArray(asRecord(asArray(task["build_cores"])[0])["combos"])[0]);
  expect(combo["evaluations"]).toBeUndefined();
  const evaluations = asArray(task["direction_evaluation"]).map(asRecord);
  expect(evaluations.map(e => e["combo_id"])).toEqual(entries.map(e => e.combo_id));
  expect(evaluations.filter(e => e["combo_id"] === combo["id"])).toEqual([
    expect.objectContaining({ expected_win: .75 }),
  ]);
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
  const evaluations = asArray(task["direction_evaluation"]).map(asRecord).filter(e => e["combo_id"] === combo["id"]);
  expect(evaluations.map(e => e["option_id"])).toEqual(certain.map(e => e.option_id));
  expect(evaluations).toHaveLength(certain.length);
  expect(evaluations.every(e => e["expected_win"] === 1 && e["win_incomplete"] === null)).toBe(true);
  expect(validateProjectionEntry({ ...certain[0], availability: { take: .5, skip: .5 } }).ok).toBe(false);
  expect(validateProjectionEntry({ ...certain[0], win_incomplete: { value: .5, se: .1, n: 20 }, incomplete_source: "empirical" }).ok).toBe(false);
  expect(validateProjectionEntry({ ...certain[0], expected_win: .9 }).ok).toBe(false);
});

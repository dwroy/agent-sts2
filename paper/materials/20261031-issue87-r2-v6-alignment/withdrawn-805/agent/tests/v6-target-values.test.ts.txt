import { expect, it, vi } from "vitest";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { constructionCoverage } from "../src/v6/construction-safety.js";
import { currentBossKnown, targetValueSummaries } from "../src/v6/target-values.js";
import { validateProjectionEntries } from "../src/v6/formats.js";
import { FixedRunner, request, source } from "./v6-projection-fixture.js";

it("counts low probabilities as bounded known values without inventing W or PW", async () => {
  const r = request(), runner = new FixedRunner(); r.completionSources = [source({ skip: 0, take: .04 })];
  const table = await new V6ProjectionEngine(runner).evaluate(r);
  expect(runner.calls).toHaveLength(0);
  for (const row of table.combinations) {
    const p = row.entry.availability.take!;
    expect(row.entry).toMatchObject({ expected_win: null, win_complete: null,
      expected_win_bound: { lower: 0, upper: p, reason: p === 0 ? "formation_impossible" : "low_probability_not_simulated" } });
    expect(currentBossKnown(table, row.entry.option_id)).toBe(true);
  }
  // A target-local bound is known information, but is not a measured weighted outcome for routing.
  expect(constructionCoverage(["take", "skip"], table)).toEqual({ total: 2, known: 0, ratio: 0,
    unknown: ["take", "skip"], reason: "insufficient_known_options" });
  expect(validateProjectionEntries(table.combinations.map(r => r.entry)).every(v => v.ok)).toBe(true);
  expect(targetValueSummaries(table, "take")[0]).toMatchObject({ P: .04, W: null, PW: null, PW_bound: [0, .04] });
  table.combinations[1]!.entry.expected_win_bound!.upper = .5;
  expect(currentBossKnown(table, "take")).toBe(false);
});

it("retains current Boss W with failed model trust while later unknown targets stay separate", async () => {
  const r = request(), current = r.targets[0]!;
  r.targets = [current, { ...current, id: "future", kind: "future", probability: .3, unknown: "missing_opening" },
    { ...current, id: "relay", kind: "chain", probability: .7, unknown: "missing_ordered_pair" }];
  r.trust = () => ({ value: "low_optimistic", labels: ["trust_gate_failed"], details: { n: 12, brier: .4, bias: .3, passed: false } });
  const table = await new V6ProjectionEngine(new FixedRunner()).evaluate(r);
  expect(constructionCoverage(["skip", "take"], table)).toMatchObject({ known: 2, ratio: 1, reason: null });
  const [currentView, ...later] = targetValueSummaries(table, "take");
  expect(currentView).toMatchObject({ P: .75, W: 1, PW: .75, trust: "low_optimistic", validation: { n: 12, brier: .4, bias: .3, passed: false } });
  expect(later.every(v => (v as any).PW === null)).toBe(true);
  expect(table.target_mixtures.find(m => m.kind === "clearance")!.value).toBeNull();
});

it("foreground prepares current targets and reuses cached optional fights without new work", async () => {
  const r = request(), runner = new FixedRunner(), engine = new V6ProjectionEngine(runner), prepare = r.prepare;
  r.targets = [r.targets[0]!, { ...r.targets[0]!, id: "future", kind: "future", probability: 1 }];
  const spy = vi.fn(prepare); r.prepare = spy;
  const cold = await engine.evaluate({ ...r, currentBossFirst: true });
  expect(spy.mock.calls.every(([t]) => t.kind === "current")).toBe(true);
  expect(cold.combinations.find(r => r.entry.target_id === "future")!.entry.win).toBeNull();
  await engine.evaluate(r); const count = runner.calls.length; spy.mockClear();
  r.cachedPreparation = prepare;
  const warm = await engine.evaluate({ ...r, currentBossFirst: true });
  expect(runner.calls).toHaveLength(count);
  expect(spy.mock.calls.every(([t]) => t.kind === "current")).toBe(true);
  expect(warm.combinations.find(r => r.entry.target_id === "future")!.entry.win?.n).toBe(20);
});

it("retains deterministic P bounds after the combat deadline instead of erasing the table", async () => {
  const r = request(); r.completionSources = [source({ skip: 0, take: .04 })];
  let clock = 0; const engine = new V6ProjectionEngine(new FixedRunner(), () => { clock += 6000; return clock; });
  const table = await engine.evaluate(r);
  expect(table.combinations).toHaveLength(2);
  for (const row of table.combinations) {
    const p = row.entry.availability.take!;
    expect(currentBossKnown(table, row.entry.option_id)).toBe(true);
    expect(row.entry).toMatchObject({ win: null, win_complete: null, expected_win: null,
      expected_win_bound: { lower: 0, upper: p, reason: p === 0 ? "formation_impossible" : "low_probability_not_simulated" } });
  }
  expect(constructionCoverage(["skip", "take"], table)).toEqual({ total: 2, known: 0, ratio: 0,
    unknown: ["skip", "take"], reason: "insufficient_known_options" });
});

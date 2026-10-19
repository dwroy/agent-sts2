import { describe, expect, it } from "vitest";
import { V6ProjectionEngine, v6WinTier, v6DeltaTier } from "../src/sim/v6-projection.js";
import { validateProjectionEntry } from "../src/v6/formats.js";
import { v6Config } from "../src/v6/config.js";
import { direction, FixedRunner, request, source } from "./v6-projection-fixture.js";
describe("V6 combination expectation", () => {
  it("uses P Wk+(1-P)W0, paired supply uncertainty and fixed seeds", async () => {
    const runner = new FixedRunner(), engine = new V6ProjectionEngine(runner), r = request();
    const t = await engine.evaluate(r), skip = t.combinations[0]!, take = t.combinations[1]!;
    expect(skip.completed_win?.value).toBe(1); expect(skip.general_win?.value).toBeCloseTo(.25);
    expect(skip.entry.win?.value).toBeCloseTo(.625); expect(take.entry.win?.value).toBeCloseTo(.8125);
    expect(take.entry.paired_delta?.mean).toBeCloseTo(.1875); expect(take.entry.paired_delta!.se).toBeGreaterThan(0);
    expect(t.weighted.find(x => x.option_id === "take")?.win?.value).toBeCloseTo(.8125);
    expect(t.entries.every(e => validateProjectionEntry(e).ok)).toBe(true);
    expect(runner.calls.every(c => c.seed === 42 && c.samples === 20)).toBe(true);
    const repeat = await engine.evaluate(r); expect(repeat.entries).toEqual(t.entries); expect(repeat.telemetry.simulations).toBe(0);
  });
  it("shares identical completed decks within/across combinations and invalidates held resources", async () => {
    const runner = new FixedRunner(), engine = new V6ProjectionEngine(runner), r = request(); r.completionSources = [source(undefined, 2)];
    const t = await engine.evaluate(r); expect(t.telemetry.simulations).toBe(40); expect(t.combinations).toHaveLength(4);
    expect(t.telemetry.cache_hits).toBeGreaterThanOrEqual(6);
    r.contextDigest = "different-potions"; const u = await engine.evaluate(r); expect(u.telemetry.simulations).toBe(40);
  });
  it("does not run combat below 5%, including zero, and keeps missing values unknown", async () => {
    const runner = new FixedRunner(), r = request(); r.completionSources = [source({ skip: 0, take: .04 })];
    const t = await new V6ProjectionEngine(runner).evaluate(r);
    expect(runner.calls).toHaveLength(0); expect(t.combinations.map(x => x.entry.availability.take)).toEqual([0, .04]);
    expect(t.combinations.every(x => x.entry.win === null)).toBe(true);
    r.completionSources = []; const u = await new V6ProjectionEngine(runner).evaluate(r);
    expect(u.combinations[0]?.unknown_reasons).toContain("no_combination_provider_result");
  });
  it("needs no W0 when P=1, uses 100 at act start and caches the complete table", async () => {
    const r = request(), runner = new FixedRunner(), e = new V6ProjectionEngine(runner); r.phase = "act"; r.completionSources = [source({ skip: 1, take: 1 })];
    const t = await e.evaluate(r); expect(t.entries[0]?.win?.value).toBe(1); expect(t.combinations[0]?.general_win).toBeNull();
    expect(runner.calls[0]?.samples).toBe(100); expect(t.act_evaluations).toHaveLength(1); expect(t.rankings.D).toEqual(["k0"]);
    expect((await e.evaluate(r)).telemetry.act_cache_hit).toBe(true);
  });
  it("never normalizes away omitted positive brain weight", async () => {
    const r = request(); r.directions = [direction(), direction("small")]; r.weights = { D: .95, small: .05 };
    const t = await new V6ProjectionEngine(new FixedRunner()).evaluate(r), w = t.weighted[0]!;
    expect(w.known_weight).toBe(.95); expect(w.win).toBeNull(); expect(w.labels).toContain("missing_direction_weight_not_renormalized");
  });
  it("off does not validate, resolve, prepare or simulate", async () => {
    const r = request(), runner = new FixedRunner(); r.config = v6Config({}); r.contextDigest = "";
    r.prepare = () => { throw new Error("must not call"); }; r.completionSources[0]!.resolve = () => { throw new Error("must not call"); };
    const t = await new V6ProjectionEngine(runner).evaluate(r); expect(t.enabled).toBe(false); expect(t.entries).toEqual([]); expect(runner.calls).toEqual([]);
  });
  it("deadline produces ordered logged degradation and unknown instead of zero", async () => {
    const r = request(), runner = new FixedRunner(); let time = 0; r.config.budgets.pick_ms = 1;
    r.completionSources[0]!.resolve = () => { time = 10; return null; };
    const t = await new V6ProjectionEngine(runner, () => time++).evaluate(r);
    expect(t.telemetry.degradation).toEqual(["drop_lowest_direction", "current_and_chain_targets_only", "remaining_unknown"]);
    expect(t.entries[0]?.win).toBeNull();
  });
  it("reserves aggregation time inside an independent configurable computation budget", async () => {
    const r = request(), provider = r.completionSources[0]!, resolve = provider.resolve, deadlines: number[] = [];
    provider.resolve = c => { deadlines.push(c.deadline); return resolve(c); };
    const engine = new V6ProjectionEngine(new FixedRunner(), () => 100);
    await engine.evaluate(r);
    r.config.budgets.jev_ms = 60000; await engine.evaluate(r);
    r.config.budgets.pick_ms = 8000; await engine.evaluate(r);
    r.phase = "act"; await engine.evaluate(r);
    expect(deadlines).toEqual([4600, 4600, 7600, 59600]);
  });
  it("uses exact configured tier boundaries and strict paired SE", () => {
    const c = v6Config({}); expect([0, .05, .3, .7, .95, 1].map(x => v6WinTier(x, c))).toEqual(["certain_loss", "certain_loss", "unfavored", "favored", "certain_win", "certain_win"]);
    expect(v6DeltaTier({ mean: .05, se: .025, n: 20 }, c)).toBe("better"); expect(v6DeltaTier({ mean: -.06, se: .02, n: 20 }, c)).toBe("much_worse");
  });
});

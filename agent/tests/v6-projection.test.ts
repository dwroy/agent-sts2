import { describe, expect, it } from "vitest";
import { V6ProjectionEngine, v6WinTier, v6DeltaTier } from "../src/sim/v6-projection.js";
import { validateProjectionEntry } from "../src/v6/formats.js";
import { v6Config } from "../src/v6/config.js";
import { direction, FixedRunner, request, source } from "./v6-projection-fixture.js";
describe("V6 combination expectation", () => {
  it("uses only P times Wk and paired combat seeds, without W0", async () => {
    const runner = new FixedRunner(), engine = new V6ProjectionEngine(runner), r = request();
    const t = await engine.evaluate(r), skip = t.combinations[0]!, take = t.combinations[1]!;
    expect(skip.completed_win?.value).toBe(1); expect(skip.general_win).toBeNull();
    expect(skip.entry.win?.value).toBeCloseTo(.5); expect(take.entry.win?.value).toBeCloseTo(.75);
    expect(take.entry.paired_delta?.mean).toBeCloseTo(.25); expect(take.entry.paired_delta!.se).toBe(0);
    expect(t.weighted.find(x => x.option_id === "take")?.win?.value).toBeCloseTo(.75);
    expect(t.entries.every(e => validateProjectionEntry(e).ok)).toBe(true);
    expect(runner.calls.every(c => c.seed === 42 && c.samples === 20)).toBe(true);
    const repeat = await engine.evaluate(r); expect(repeat.entries).toEqual(t.entries); expect(repeat.telemetry.simulations).toBe(0);
  });
  it("shares identical completed decks within/across combinations and invalidates held resources", async () => {
    const runner = new FixedRunner(), engine = new V6ProjectionEngine(runner), r = request(); r.completionSources = [source(undefined, 2)];
    const t = await engine.evaluate(r); expect(t.telemetry.simulations).toBe(20); expect(t.combinations).toHaveLength(4);
    expect(t.telemetry.cache_hits).toBeGreaterThanOrEqual(2);
    r.contextDigest = "new-question-same-input";
    expect((await engine.evaluate(r)).telemetry.simulations).toBe(0);
    const prepare = r.prepare;
    r.prepare = (...args) => { const p = prepare(...args)!; p.input.solver.player.hp--; return p; };
    expect((await engine.evaluate(r)).telemetry.simulations).toBe(20);
    r.modelVersion = "new-frozen-model";
    expect((await engine.evaluate(r)).telemetry.simulations).toBe(20);
  });
  it("reuses act-start absolute seeds at pick, then computes only missing larger-sample indices", async () => {
    const runner = new FixedRunner(), engine = new V6ProjectionEngine(runner), r = request(); r.phase = "act";
    expect((await engine.evaluate(r)).telemetry.simulations).toBe(100);
    r.phase = "pick"; r.contextDigest = "pick-question";
    const hot = await engine.evaluate(r), fresh = await new V6ProjectionEngine(new FixedRunner()).evaluate(r);
    expect(hot.telemetry.simulations).toBe(0); expect(hot.entries).toEqual(fresh.entries);
    r.config.samples_pick = 120;
    expect((await engine.evaluate(r)).telemetry.simulations).toBe(20);
  });
  it("keeps current paired results when the bounded cross-request cache evicts another completed input", async () => {
    const r = request();
    const bounded = await new V6ProjectionEngine(new FixedRunner(), () => 0, 1).evaluate(r);
    const ordinary = await new V6ProjectionEngine(new FixedRunner(), () => 0).evaluate(r);
    expect(bounded.entries).toEqual(ordinary.entries);
    expect(bounded.combinations.map(c => [c.completed_win, c.general_win]))
      .toEqual(ordinary.combinations.map(c => [c.completed_win, c.general_win]));
  });
  it("retains complete samples across a timed-out idle slice without changing seed indices", async () => {
    const runner = new FixedRunner(), run = runner.run.bind(runner); let first = true;
    runner.run = async r => { const result = await run(r);
      if (first) { first = false; result.timedOut = true;
        for (const deck of result.outcomes) for (const order of deck) order.splice(7, order.length - 7);
      } return result;
    };
    const r = request(), engine = new V6ProjectionEngine(runner);
    expect((await engine.evaluate(r)).telemetry.simulations).toBe(7);
    const resumed = await engine.evaluate(r);
    expect(resumed.telemetry.simulations).toBe(13);
    expect(resumed.entries).toEqual((await new V6ProjectionEngine(new FixedRunner()).evaluate(r)).entries);
    expect(runner.calls[1]!.stripes?.every(s => s && s.of === 20 && s.at >= 7)).toBe(true);
  });
  it("does not exhaust the shared budget when a runner times out before the shared deadline", async () => {
    const r = request(), runner = new FixedRunner(), run = runner.run.bind(runner);
    r.targets = Array.from({ length: 4 }, (_, i) => ({ ...r.targets[0]!, id: `boss${i}` }));
    r.prepare = (t, s) => { const input = request().prepare(t, s)!; input.input.meta.enc += t.id; return input; };
    runner.run = async req => ({ ...await run(req), timedOut: true });
    const table = await new V6ProjectionEngine(runner, () => 0).evaluate(r);
    expect(runner.calls).toHaveLength(4);
    expect(table.telemetry.degradation).toEqual([]);
    expect(table.combinations.some(x => x.unknown_reasons.includes("budget_remaining_unknown"))).toBe(false);
  });
  it("gives eligible paired fights the remaining budget instead of slicing it across ineligible catalog rows", async () => {
    const r = request(), runner = new FixedRunner(), run = runner.run.bind(runner); let time = 0;
    r.targets = Array.from({ length: 40 }, (_, i) => ({ ...r.targets[0]!, id: `boss${i}` }));
    r.prepare = (t, s) => { const p = request().prepare(t, s)!; p.input.meta.enc += t.id; return p; };
    runner.run = async req => { expect(req.deadlineMs).toBeGreaterThanOrEqual(4000);
      const result = await run(req); time = 5000; return result;
    };
    const table = await new V6ProjectionEngine(runner, () => time).evaluate(r);
    expect(runner.calls).toHaveLength(1);
    expect(table.entries.filter(x => x.target_id === "boss0").every(x => x.win !== null)).toBe(true);
    expect(table.entries.filter(x => x.target_id !== "boss0").every(x => x.win === null)).toBe(true);
  });
  it("invalidates cached samples when a caller mutates a retained prepared object between requests", async () => {
    const r = request(), runner = new FixedRunner(), engine = new V6ProjectionEngine(runner), prepare = r.prepare;
    const inputs = new Map<string, NonNullable<ReturnType<typeof prepare>>>();
    r.prepare = (t, s, o) => { const key = JSON.stringify([t, s]);
      if (!inputs.has(key)) inputs.set(key, prepare(t, s, o)!); return inputs.get(key)!;
    };
    expect((await engine.evaluate(r)).telemetry.simulations).toBe(20);
    for (const input of inputs.values()) input.input.solver.player.hp--;
    expect((await engine.evaluate(r)).telemetry.simulations).toBe(20);
  });
  it("preserves a completed target while explicitly labeling an unknown competing combination", async () => {
    const r = request(), provider = source(undefined, 2), resolve = provider.resolve;
    provider.resolve = c => { const result = resolve(c)!;
      result.combinations[1]!.availability = { skip: 0, take: 0 };
      result.combinations[1]!.supply = { skip: Array(200).fill(false), take: Array(200).fill(false) }; return result;
    };
    r.completionSources = [provider];
    const complete = (await new V6ProjectionEngine(new FixedRunner()).evaluate(r)).entries[0]!;
    expect(complete.win).not.toBeNull();
    expect(complete.combination_coverage).toMatchObject({ selection: "catalog_maximum", evaluated_combinations: 2, pending_combinations: 0 });
    provider.resolve = c => { const result = resolve(c)!;
      result.combinations[1]!.availability = { skip: null, take: null };
      result.combinations[1]!.supply = { skip: null, take: null }; return result;
    };
    const partial = (await new V6ProjectionEngine(new FixedRunner()).evaluate(r)).entries[0]!;
    expect(partial.win?.n).toBe(20);
    expect(partial.combination_coverage).toMatchObject({ selection: "computed_subset_maximum", selected_combination_id: "k0", evaluated_combinations: 1, pending_combinations: 1 });
    expect(validateProjectionEntry(partial).ok).toBe(true);
    expect(validateProjectionEntry({ ...partial, combination_coverage: { ...partial.combination_coverage, pending_combinations: 0 } }).ok).toBe(false);
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
    expect(runner.calls[0]?.samples).toBe(100); expect(t.act_evaluations).toHaveLength(1); expect(t.rankings.D).toEqual(["k0", "D:minimal"]);
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

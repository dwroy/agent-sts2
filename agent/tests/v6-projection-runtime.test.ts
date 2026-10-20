import { afterEach, expect, it, vi } from "vitest";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { V6ProjectionRuntime } from "../src/v6/projection-runtime.js";
import { DecisionBudget, currentDecisionBudget, withDecisionBudget } from "../src/core/decision-budget.js";
import { board, env, setupOneshotTests } from "./oneshot-support.js";
import { request, FixedRunner } from "./v6-projection-fixture.js";
setupOneshotTests(); afterEach(() => vi.unstubAllEnvs());
it("does not load frozen inputs or simulate while off, and does not evaluate foreground in combat", async () => {
  const load = vi.fn(), engine = { evaluate: vi.fn(), precompute: vi.fn() }, runtime = new V6ProjectionRuntime(engine, load);
  const e = env(board("xljq-f5-reward", "reward"));
  vi.stubEnv("V6_BUILD", "off");
  expect(await runtime.evaluate(e, "act")).toBeNull(); expect(await runtime.precompute(e, 500)).toBeNull();
  expect(await runtime.evaluateRequest(e, request())).toBeNull(); expect(await runtime.context(e, "pick")).toBeNull();
  vi.stubEnv("V6_BUILD", "on"); e.state.in_combat = true;
  expect(await runtime.evaluate(e, "pick")).toBeNull();
  expect(load).not.toHaveBeenCalled(); expect(engine.evaluate).not.toHaveBeenCalled();
});
it("passes official requests and keeps act/pick computation separate from an exhausted parent", async () => {
  vi.stubEnv("V6_BUILD", "on"); const e = env(board("xljq-f5-reward", "reward"));
  let now = 0; const parent = new DecisionBudget("parent", "routine", () => now, 5000, 0); now = 5000;
  const load = vi.fn(async (_e, phase) => ({ ...request(), phase }));
  const engine = { evaluate: vi.fn(async r => {
    expect(currentDecisionBudget()?.remaining()).toBe(r.phase === "act" ? 60000 : 5000); now += 10; return null as never;
  }), precompute: vi.fn() };
  const runtime = new V6ProjectionRuntime(engine, load);
  await withDecisionBudget(parent, async () => { await runtime.evaluate(e, "act"); await runtime.evaluate(e, "pick"); });
  expect(load.mock.calls.map(c => c[1])).toEqual(["act", "pick"]);
  expect(parent.record()).toMatchObject({ shared_actual_ms: 5000, independent_actual_ms: 20 });
});
it("bounds precomputation to the idle window and joins a pending result", async () => {
  vi.stubEnv("V6_BUILD", "shadow"); const e = env(board("xljq-f5-reward", "reward"));
  let release!: (value: never) => void;
  const load = vi.fn(async () => request()), engine = { evaluate: vi.fn(), precompute: vi.fn(async r => {
    expect(r.config.budgets.pick_ms).toBe(25); return new Promise<never>(resolve => { release = resolve; });
  }) };
  const runtime = new V6ProjectionRuntime(engine, load), first = runtime.precompute(e, 25);
  await vi.waitFor(() => expect(engine.precompute).toHaveBeenCalledTimes(1));
  const second = runtime.precompute(e, 25); release(null as never); await Promise.all([first, second]);
  expect(load).toHaveBeenCalledTimes(1); expect(engine.precompute).toHaveBeenCalledTimes(1);
  expect(await runtime.precompute(e, 0)).toBeNull();
});

it("waits for the shared idle engine before starting the foreground budget and releases after failure", async () => {
  vi.stubEnv("V6_BUILD", "on"); const e = env(board("xljq-f5-reward", "reward"));
  let finish!: (value: never) => void;
  const engine = { evaluate: vi.fn(async () => { expect(currentDecisionBudget()!.remaining()).toBeGreaterThan(4900); return null as never; }),
    precompute: vi.fn(() => new Promise<never>(resolve => { finish = resolve; })) };
  const runtime = new V6ProjectionRuntime(engine, async () => request());
  const idle = runtime.precompute(e, 100);
  await vi.waitFor(() => expect(engine.precompute).toHaveBeenCalledTimes(1));
  const foreground = withDecisionBudget(new DecisionBudget("test", "routine"), () => runtime.evaluateRequest(e, request())); await Promise.resolve(); expect(engine.evaluate).not.toHaveBeenCalled();
  finish(null as never); expect(await idle).toBeNull(); await foreground; expect(engine.evaluate).toHaveBeenCalledTimes(1);
  engine.evaluate.mockRejectedValueOnce(new Error("fixed failure"));
  await expect(runtime.evaluateRequest(e, request())).rejects.toThrow("fixed failure");
  const later = runtime.precompute(e, 100);
  await vi.waitFor(() => expect(engine.precompute).toHaveBeenCalledTimes(2)); finish(null as never); await later;
});

it("exposes the shared factory context and records a W7 request under its own compute budget", async () => {
  vi.stubEnv("V6_BUILD", "on"); const e = env(board("xljq-f5-reward", "reward")), r = request();
  const context = { factory: { create: vi.fn() }, situation: { marker: "fixed" } } as any;
  const input = vi.fn(async () => context), record = vi.fn();
  const engine = { evaluate: vi.fn(async candidate => {
    expect(candidate).toEqual({ ...r, currentBossFirst: true }); expect(currentDecisionBudget()!.remaining()).toBeGreaterThan(4900); return { phase: "pick", enabled: false } as never;
  }), precompute: vi.fn() };
  const runtime = new V6ProjectionRuntime(engine, vi.fn(), record, input);
  expect(await runtime.context(e, "pick")).toBe(context);
  expect(await withDecisionBudget(new DecisionBudget("W7", "routine"), () => runtime.evaluateRequest(e, r))).toEqual({ phase: "pick", enabled: false });
  expect(record).toHaveBeenCalledWith(e, { ...r, currentBossFirst: true }, { phase: "pick", enabled: false });
  e.state.in_combat = true;
  expect(await runtime.context(e, "pick")).toBeNull(); expect(await runtime.evaluateRequest(e, r)).toBeNull();
  expect(input).toHaveBeenCalledTimes(1); expect(engine.evaluate).toHaveBeenCalledTimes(1);
});

it("charges the foreground wait to an externally owned room allowance without another allocation", async () => {
  vi.stubEnv("V6_BUILD", "on"); const e = env(board("xljq-f5-reward", "reward"));
  let now = 0, finish!: (value: never) => void;
  const budget = new DecisionBudget("room", "routine", () => now, 5000, 0), record = vi.fn();
  const engine = { precompute: vi.fn(() => new Promise<never>(resolve => { finish = resolve; })),
    evaluate: vi.fn(async candidate => {
      expect(candidate.config.budgets.pick_ms).toBe(3200);
      expect(currentDecisionBudget()).toBe(budget); now += 200; return { phase: "pick", enabled: false } as never;
    }) };
  const runtime = new V6ProjectionRuntime(engine, async () => request(), record), idle = runtime.precompute(e, 100);
  await vi.waitFor(() => expect(engine.precompute).toHaveBeenCalledTimes(1));
  const foreground = withDecisionBudget(budget, () => runtime.evaluateRequest(e, request(),
    { budget_ms: 5000, signal: new AbortController().signal }));
  now = 1800; finish(null as never); await idle; await foreground;
  expect(engine.evaluate).toHaveBeenCalledTimes(1); expect(record).toHaveBeenCalledTimes(1);
  expect(budget.record()).toMatchObject({ shared_actual_ms: 2000, independent_actual_ms: 0 });
});

it.each(["cancel", "expire"])("does not start late room simulation after %s while waiting for the foreground lease", async mode => {
  vi.stubEnv("V6_BUILD", "on"); const e = env(board("xljq-f5-reward", "reward")), controller = new AbortController();
  let now = 0, finish!: (value: never) => void;
  const budget = new DecisionBudget("room", "routine", () => now, 5000, 0), record = vi.fn();
  const engine = { evaluate: vi.fn(), precompute: vi.fn(() => new Promise<never>(resolve => { finish = resolve; })) };
  const runtime = new V6ProjectionRuntime(engine, async () => request(), record), idle = runtime.precompute(e, 100);
  await vi.waitFor(() => expect(engine.precompute).toHaveBeenCalledTimes(1));
  const foreground = withDecisionBudget(budget, () => runtime.evaluateRequest(e, request(), { budget_ms: 5000, signal: controller.signal }));
  if (mode === "cancel") controller.abort(); else now = 5000;
  finish(null as never); await idle; expect(await foreground).toBeNull();
  expect(engine.evaluate).not.toHaveBeenCalled(); expect(record).not.toHaveBeenCalled();
  const later = runtime.precompute(e, 100);
  await vi.waitFor(() => expect(engine.precompute).toHaveBeenCalledTimes(2)); finish(null as never); await later;
});

it.each(["cancel", "expire"])("retains bounded partial results after expiry but discards explicit %s during evaluation", async mode => {
  vi.stubEnv("V6_BUILD", "on"); const e = env(board("xljq-f5-reward", "reward")), controller = new AbortController();
  let now = 0;
  const budget = new DecisionBudget("room", "routine", () => now, 5000, 0), record = vi.fn();
  const engine = { precompute: vi.fn(), evaluate: vi.fn(async () => {
    if (mode === "cancel") controller.abort(); else now = 5000;
    return { phase: "pick", enabled: false } as never;
  }) };
  const runtime = new V6ProjectionRuntime(engine, vi.fn(), record);
  const result = await withDecisionBudget(budget, () => runtime.evaluateRequest(e, request(),
    { budget_ms: 5000, signal: controller.signal }));
  expect(result).toEqual(mode === "cancel" ? null : { phase: "pick", enabled: false });
  expect(engine.evaluate).toHaveBeenCalledTimes(1); expect(record).toHaveBeenCalledTimes(mode === "cancel" ? 0 : 1);
});

 it("reuses identical resource/offer fingerprints but invalidates HP, weights and offers", async () => {
  vi.stubEnv("V6_BUILD", "on"); const e = env(board("xljq-f5-reward", "reward")), r = request();
  const engine = new V6ProjectionEngine(new FixedRunner()), evaluate = vi.spyOn(engine, "evaluate");
  const runtime = new V6ProjectionRuntime(engine, async () => r);
  const first = await runtime.evaluate(e, "pick");
  r.config = { ...r.config, budgets: { ...r.config.budgets, pick_ms: 1234 } };
  const hit = await runtime.evaluate(e, "pick");
  expect(evaluate).toHaveBeenCalledTimes(1); expect(hit!.combinations).toEqual(first!.combinations);
  hit!.combinations[0]!.entry.expected_win = 0;
  expect((await runtime.evaluate(e, "pick"))!.combinations[0]!.entry.expected_win).not.toBe(0);
  r.baseline.state.hp--; await runtime.evaluate(e, "pick");
  r.weights = { D: .5 }; await runtime.evaluate(e, "pick");
  r.options = [...r.options, { ...r.options[0]!, id: "another" }]; await runtime.evaluate(e, "pick");
  expect(evaluate).toHaveBeenCalledTimes(4);
 });
 it("admits baseline-only idle preparation in combat without enabling foreground evaluation", async () => {
  vi.stubEnv("V6_BUILD", "on"); const e = env(board("xljq-f5-reward", "reward")); e.state.in_combat = true;
  const load = vi.fn(async () => request()), engine = new V6ProjectionEngine(new FixedRunner());
  const runtime = new V6ProjectionRuntime(engine, load);
  expect(await runtime.evaluate(e, "pick")).toBeNull();
  expect(await runtime.precompute(e, 500)).not.toBeNull();
  expect(load).toHaveBeenCalledWith(e, "pick", true);
 });
it("refreshes a cached foreground table after idle work completes optional targets", async () => {
  vi.stubEnv("V6_BUILD", "on"); const e = env(board("xljq-f5-reward", "reward")), r = request();
  r.targets.push({ ...r.targets[0]!, id: "future", kind: "future", probability: 1 });
  const engine = new V6ProjectionEngine(new FixedRunner()), runtime = new V6ProjectionRuntime(engine, async () => r);
  const cold = await runtime.evaluate(e, "pick");
  expect(cold!.combinations.find(row => row.entry.target_id === "future")!.entry.win).toBeNull();
  r.cachedPreparation = r.prepare;
  await runtime.precompute(e, 5000);
  const warm = await runtime.evaluate(e, "pick");
  expect(warm!.combinations.find(row => row.entry.target_id === "future")!.entry.win?.n).toBe(20);
});

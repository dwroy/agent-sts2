import { afterEach, expect, it, vi } from "vitest";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { observeV6CardReward } from "../src/v6/card-reward-scope.js";
import { V6ProjectionRuntime } from "../src/v6/projection-runtime.js";
import { DecisionBudget, currentDecisionBudget, withDecisionBudget } from "../src/core/decision-budget.js";
import { board, env, setupOneshotTests } from "./oneshot-support.js";
import { request } from "./v6-projection-fixture.js";
setupOneshotTests(); afterEach(() => vi.unstubAllEnvs());
it("does not load frozen inputs or simulate while off or in combat", async () => {
  const load = vi.fn(), engine = { evaluate: vi.fn(), precompute: vi.fn() }, runtime = new V6ProjectionRuntime(engine, load);
  const e = env(board("xljq-f5-reward", "reward"));
  vi.stubEnv("V6_BUILD", "off");
  expect(await runtime.evaluate(e, "act")).toBeNull(); expect(await runtime.precompute(e, 500)).toBeNull();
  expect(await runtime.evaluateRequest(e, request())).toBeNull(); expect(await runtime.context(e, "pick")).toBeNull();
  vi.stubEnv("V6_BUILD", "on"); e.state.in_combat = true;
  expect(await runtime.evaluate(e, "pick")).toBeNull(); expect(await runtime.precompute(e, 500)).toBeNull();
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
    expect(candidate).toBe(r); expect(currentDecisionBudget()!.remaining()).toBeGreaterThan(4900); return { phase: "pick" } as never;
  }), precompute: vi.fn() };
  const runtime = new V6ProjectionRuntime(engine, vi.fn(), record, input);
  expect(await runtime.context(e, "pick")).toBe(context);
  expect(await withDecisionBudget(new DecisionBudget("W7", "routine"), () => runtime.evaluateRequest(e, r))).toEqual({ phase: "pick" });
  expect(record).toHaveBeenCalledWith(e, r, { phase: "pick" });
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
      expect(currentDecisionBudget()).toBe(budget); now += 200; return { phase: "pick" } as never;
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

it.each(["cancel", "expire"])("does not record a room result after %s during evaluation", async mode => {
  vi.stubEnv("V6_BUILD", "on"); const e = env(board("xljq-f5-reward", "reward")), controller = new AbortController();
  let now = 0;
  const budget = new DecisionBudget("room", "routine", () => now, 5000, 0), record = vi.fn();
  const engine = { precompute: vi.fn(), evaluate: vi.fn(async () => {
    if (mode === "cancel") controller.abort(); else now = 5000;
    return { phase: "pick" } as never;
  }) };
  const runtime = new V6ProjectionRuntime(engine, vi.fn(), record);
  expect(await withDecisionBudget(budget, () => runtime.evaluateRequest(e, request(),
    { budget_ms: 5000, signal: controller.signal }))).toBeNull();
  expect(engine.evaluate).toHaveBeenCalledTimes(1); expect(record).not.toHaveBeenCalled();
});
it("isolates background core work from the model budget, joins it, and never starts it in foreground", async () => {
  vi.stubEnv("V6_BUILD", "off"); vi.stubEnv("V6_CARD_DECIDER", "jev");
  const e = env(board("xljq-f5-reward", "reward")), r = request();
  let finish!: () => void;
  const cardEngine = { evaluate: vi.fn(async () => ({ telemetry: { elapsed_ms: 0, preparation_ms: 0 } })),
    precompute: vi.fn(() => new Promise<void>(resolve => { finish = resolve; })) };
  const context = vi.fn(() => ({ fingerprint: "fixed" })), input = vi.fn(async () => ({
    factory: { create: () => ({ status: "ready", request: r }) }, situation: {} }));
  const engine = { evaluate: vi.fn(), precompute: vi.fn() }, record = vi.fn();
  const runtime = new V6ProjectionRuntime(engine, vi.fn(), undefined, input as never,
    { engine: cardEngine as never, context, record });
  await runtime.startCardBackground(e, 100); expect(await runtime.evaluateCard(e)).toBeNull(); expect(input).not.toHaveBeenCalled();
  vi.stubEnv("V6_BUILD", "on"); e.state.in_combat = true;
  const parent = new DecisionBudget("model", "routine"), remaining = parent.remaining();
  await withDecisionBudget(parent, async () => {
    const background = runtime.startCardBackground(e, 100);
    await vi.waitFor(() => expect(cardEngine.precompute).toHaveBeenCalledOnce());
    expect(currentDecisionBudget()).toBe(parent); expect(parent.remaining()).toBeLessThanOrEqual(remaining);
    expect(input).toHaveBeenCalledWith(e, "pick", true);
    observeV6CardReward(e.screenMemory, e.state);
    e.state.in_combat = false;
    observeV6CardReward(e.screenMemory, e.state);
    const foreground = runtime.evaluateCard(e); await Promise.resolve(); expect(cardEngine.evaluate).not.toHaveBeenCalled();
    expect(cardEngine.precompute.mock.calls[0]![3].aborted).toBe(true);
    finish(); await background; await foreground;
  });
  expect(cardEngine.evaluate).toHaveBeenCalledOnce(); expect(cardEngine.precompute).toHaveBeenCalledOnce(); expect(record).toHaveBeenCalledOnce();
});

it.each(["resolve", "reject"])("uses the original brain wait for bounded B work and cancels on %s without joining", async mode => {
  vi.stubEnv("V6_BUILD", "on"); vi.stubEnv("V6_CARD_DECIDER", "brain");
  const e = env(board("xljq-f5-reward", "reward")), r = request();
  let finish!: () => void, respond!: () => void, fail!: (error: Error) => void;
  const original = new Promise<string>((resolve, reject) => { respond = () => resolve("original answer"); fail = reject; });
  const cardEngine = { evaluate: vi.fn(), precompute: vi.fn(() => new Promise<void>(resolve => { finish = resolve; })) };
  const input = vi.fn(async () => ({ factory: { create: () => ({ status: "ready", request: r }) }, situation: {} }));
  const runtime = new V6ProjectionRuntime({ evaluate: vi.fn(), precompute: vi.fn() }, vi.fn(), undefined,
    input as never, { engine: cardEngine as never, context: () => ({ fingerprint: "fixed" }), record: vi.fn() });
  const parent = new DecisionBudget("original brain", "routine");
  const result = withDecisionBudget(parent, () => runtime.duringModelWait(e, original));
  // Attach rejection handling before settling the already-issued original request.
  const assertion = mode === "resolve" ? expect(result).resolves.toBe("original answer") : expect(result).rejects.toThrow("original failure");
  await vi.waitFor(() => expect(cardEngine.precompute).toHaveBeenCalledOnce());
  expect(cardEngine.precompute.mock.calls[0]![2]).toBeGreaterThan(4500);
  expect(cardEngine.precompute.mock.calls[0]![2]).toBeLessThanOrEqual(5000);
  const signal = cardEngine.precompute.mock.calls[0]![3]; expect(signal.aborted).toBe(false);
  if (mode === "resolve") respond(); else fail(new Error("original failure"));
  await assertion; expect(signal.aborted).toBe(true); // No join: finish() has not been called.
  expect(cardEngine.evaluate).not.toHaveBeenCalled(); expect(input).toHaveBeenCalledOnce();
  finish(); await runtime.startCardBackground(e, 1);
});

it("does no V6 reads while wrapping the original model request with V6 off", async () => {
  vi.stubEnv("V6_BUILD", "off");
  const input = vi.fn(), engine = { evaluate: vi.fn(), precompute: vi.fn() };
  const runtime = new V6ProjectionRuntime(engine, vi.fn(), undefined, input,
    { engine: engine as never, context: vi.fn(), record: vi.fn() });
  expect(await runtime.duringModelWait(env(board("xljq-f5-reward", "reward")), Promise.resolve(42))).toBe(42);
  expect(input).not.toHaveBeenCalled(); expect(engine.precompute).not.toHaveBeenCalled();
});

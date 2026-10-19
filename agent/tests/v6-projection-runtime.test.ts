import { afterEach, expect, it, vi } from "vitest";
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

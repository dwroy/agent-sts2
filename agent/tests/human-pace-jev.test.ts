/** An SDK fixture verifies cancellation of the real JevClient path, without HTTP. */
import { afterEach, expect, it, vi } from "vitest";
import { DecisionBudget, DecisionBudgetExpired, withDecisionBudget, withCombatComputation } from "../src/core/decision-budget.js";
import { JevClient } from "../src/reflex/jev/client.js";
const fixture = vi.hoisted(() => ({ calls: 0, aborted: 0, options: undefined as { timeout?: number; signal?: AbortSignal } | undefined }));
vi.mock("@typesafe-ai/sdk", async (original) => ({ ...await original<object>(), TypeSafeClient: class {
  systemOne(_request: unknown, options: typeof fixture.options) {
    fixture.calls++; fixture.options = options;
    return { withResponse: () => new Promise((_, reject) => options?.signal?.addEventListener("abort", () => {
      fixture.aborted++; reject(new Error("fixed abort"));
    })) };
  }
} }));
afterEach(() => vi.useRealTimers());
it("passes the remaining allowance and abort signal to the SDK and rejects the late result at the deadline", async () => {
  vi.useFakeTimers();
  const budget = new DecisionBudget("Jev-SDK", "routine", () => Date.now(), 700);
  const client = new JevClient({ apiKey: "fixed-not-a-credential", model: "fixed", baseUrl: "http://fixture.invalid" });
  const rejection = expect(withDecisionBudget(budget, () => client.ask({}, {}, 20000))).rejects.toBeInstanceOf(DecisionBudgetExpired);
  expect(fixture.options?.timeout).toBe(700); expect(fixture.options?.signal).toBeInstanceOf(AbortSignal);
  await vi.advanceTimersByTimeAsync(700); await rejection;
  await vi.advanceTimersByTimeAsync(4000);
  expect(fixture.calls).toBe(1); expect(fixture.aborted).toBe(1);
});

it.each(["ordinary", "elite", "boss"] as const)("actually invokes Jev with its protected three seconds after %s computation is spent", async (kind) => {
  vi.useFakeTimers();
  const budget = new DecisionBudget(`reserved-${kind}`, kind, () => Date.now());
  withDecisionBudget(budget, () => withCombatComputation(() => budget.charge(budget.remaining())));
  const calls = fixture.calls, aborted = fixture.aborted;
  const client = new JevClient({ apiKey: "fixed-not-a-credential", model: "fixed", baseUrl: "http://fixture.invalid" });
  const rejection = expect(withDecisionBudget(budget, () => client.ask({}, {}))).rejects.toBeInstanceOf(DecisionBudgetExpired);
  expect(fixture.calls).toBe(calls + 1); expect(fixture.options?.timeout).toBe(3000);
  await vi.advanceTimersByTimeAsync(2999); expect(fixture.aborted).toBe(aborted);
  await vi.advanceTimersByTimeAsync(1); await rejection; expect(fixture.aborted).toBe(aborted + 1);
  expect(budget.record()).toMatchObject({ jev_actual_ms: 3000, timed_out: true });
});

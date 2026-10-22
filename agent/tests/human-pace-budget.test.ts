/** Fixed clocks and in-memory engines only. No game, network, or model invocation. */
import { afterEach, expect, it, vi } from "vitest";
import { DecisionBudget, DecisionBudgetExpired, DecisionBudgetLedger, HUMAN_PACE_BUDGETS, outsideDecisionBudget,
  shadowBudgetAvailable, withinDecisionBudget, withDecisionBudget, currentDecisionBudget,
  withShadowDecisionBudget, measureDecisionBudgetStage } from "../src/core/decision-budget.js";
import { BrainRouter, EngineFailure, type BrainLogRow } from "../src/brain/router.js";
import { BrainWait, type BrainWaitEvent } from "../src/brain/wait.js";
import { pickSpec } from "../src/brain/specs.js";
import type { BrainEngine, BrainRequest } from "../src/brain/types.js";
import { loadConfig } from "../src/core/config.js";
import { withJevRetry } from "../src/reflex/jev/client.js";

afterEach(() => vi.useRealTimers());
it("shares a turn allowance across re-asks, excludes animation/transport, and logs each entry separately", async () => {
  let time = 0;
  const ledger = new DecisionBudgetLedger(() => time), first = ledger.open("run:48:1:1", "boss");
  expect(HUMAN_PACE_BUDGETS).toEqual({ ordinary: 10000, elite: 15000, boss: 60000, retry: 10000,
    routine: 5000, brain: 90000, direction: 60000 });
  time += 2000;
  await withDecisionBudget(first, () => outsideDecisionBudget(async () => { time += 50000; }));
  time += 3000; first.pause();
  expect(first.record()).toMatchObject({ budget_ms: 60000, actual_ms: 5000, turn_actual_ms: 5000, timed_out: false });
  time += 90000;
  const again = ledger.open("run:48:1:1", "boss");
  expect(again).toBe(first); expect(again.remaining()).toBe(55000);
  time += 55000; again.useFallback("current_candidate");
  expect(again.record()).toMatchObject({ entry_budget_ms: 55000, actual_ms: 55000, turn_actual_ms: 60000,
    timed_out: true, fallback: "current_candidate", animation_time_included: false });
  expect(withDecisionBudget(again, () => shadowBudgetAvailable("F48_joint"))).toBe(false);
  expect(again.record().shadow_unknown).toContain("F48_joint");
  expect(ledger.open("run:48:1:2", "retry").remaining()).toBe(10000);
});

it("does not accept work that returned after a synchronous overrun or start work with no time left", async () => {
  let time = 0, calls = 0;
  const budget = new DecisionBudget("fixed", "ordinary", () => time);
  await expect(withDecisionBudget(budget, () => withinDecisionBudget("fixed", async (signal) => {
    calls++; time = 10001; expect(signal?.aborted).toBe(false); return "late";
  }))).rejects.toBeInstanceOf(DecisionBudgetExpired);
  await expect(withDecisionBudget(budget, () => withinDecisionBudget("expired", async () => { calls++; return "never"; })))
    .rejects.toBeInstanceOf(DecisionBudgetExpired);
  expect(calls).toBe(1); expect(budget.record().stages[0]?.timed_out).toBe(true);
});

const choices = { a: "fixed A", b: "fixed B" };
const request = (): BrainRequest => ({ label: "rest/plan", system: "fixture", question: "fixed", options: choices,
  payload: {}, spec: pickSpec("rest/plan", choices, {}) });

it.each(["hang", "quota"])("hard-stops a %s L2 call at 90 seconds with xhigh, abort, no fallback engine or late retries", async (mode) => {
  vi.useFakeTimers();
  const rows: BrainLogRow[] = [], events: BrainWaitEvent[] = [];
  let calls = 0, aborted = 0;
  const engine: BrainEngine = { name: "codex", model: "fixture-only", decide: async (req, signal) => {
    calls++; expect(req.effort).toBe("xhigh"); expect(req.timeoutMs).toBeLessThanOrEqual(90000);
    if (mode === "quota") throw new EngineFailure("fixed quota", "quota", 3600000);
    return new Promise((_, reject) => signal?.addEventListener("abort", () => { aborted++; reject(new Error("fixed aborted")); }));
  } };
  const wait = new BrainWait({ event: (e) => events.push(e) });
  const router = new BrainRouter({ config: loadConfig({ BRAIN_LOG: "off" }).brain, codexOnly: true,
    engine: () => engine, wait, log: (row) => rows.push(row) });
  const budget = new DecisionBudget("fixed-L2", "routine", () => Date.now());
  const rejection = expect(withDecisionBudget(budget, () => router.decide(request()))).rejects.toBeInstanceOf(DecisionBudgetExpired);
  await vi.advanceTimersByTimeAsync(90000); await rejection;
  await vi.advanceTimersByTimeAsync(2000);
  expect(calls).toBe(1); expect(aborted).toBe(mode === "hang" ? 1 : 0);
  expect(wait.suspendedMs).toBe(0);
  expect(events.at(-1)).toMatchObject({ state: "budget", budget_policy: "human_pace_hard_deadline" });
  expect(rows.some((row) => row.answer === null)).toBe(true);
});

it("bounds Jev retry backoff by the same allowance and never launches the next request after expiry", async () => {
  vi.useFakeTimers();
  let calls = 0;
  const budget = new DecisionBudget("fixed-Jev", "routine", () => Date.now(), 500);
  const rejection = expect(withDecisionBudget(budget, () => withJevRetry(async () => {
    calls++; throw Object.assign(new Error("fixed busy"), { status: 503 });
  }))).rejects.toBeInstanceOf(DecisionBudgetExpired);
  await vi.advanceTimersByTimeAsync(500); await rejection;
  await vi.advanceTimersByTimeAsync(3000); expect(calls).toBe(1);
});

it("gives each L2 question its own 90 seconds after real computation and observers, without debiting either allowance", async () => {
  let time = 0;
  const budget = new DecisionBudget("fixed-L2-preparation", "brain", () => time);
  const requests: BrainRequest[] = [];
  const engine: BrainEngine = { name: "codex", model: "fixed", decide: async (req) => {
    requests.push(req); expect(req.timeoutMs).toBe(90000); time += 80000;
    return { engine: "codex", model: "fixed", answer: { choice: "a", reason: "fixed" }, problems: [],
      attempts: 1, latencyMs: 80000, usage: { inputTokens: 0, outputTokens: 0 }, toolCalls: [] };
  } };
  const router = new BrainRouter({ config: loadConfig({ BRAIN_LOG: "off" }).brain, codexOnly: true,
    engine: () => engine, log: () => {} });
  await withDecisionBudget(budget, async () => {
    await measureDecisionBudgetStage("B3_current", async () => {
      time += 11000;
      await withShadowDecisionBudget("G2_global_shadow", async () => {
        expect(currentDecisionBudget()).not.toBe(budget); time += 70000;
      });
    });
    expect(budget.remaining()).toBe(79000);
    for (let i = 0; i < 2; i++) {
      expect((await router.decide(request())).answer).toEqual({ choice: "a", reason: "fixed" });
      expect(currentDecisionBudget()).toBe(budget); expect(budget.remaining()).toBe(79000);
    }
  });
  expect(requests).toHaveLength(2);
  expect(budget.record()).toMatchObject({ actual_ms: 241000, shared_actual_ms: 11000,
    independent_actual_ms: 230000, timed_out: false });
  expect(budget.record().stages).toEqual(expect.arrayContaining([
    expect.objectContaining({ stage: "G2_global_shadow", scope: "shadow", actual_ms: 70000 }),
    expect.objectContaining({ stage: "B3_current", actual_ms: 11000 }),
    expect.objectContaining({ stage: "L2_brain", scope: "L2", budget_ms: 90000, actual_ms: 80000 }),
  ]));
});

it("keeps the L2 deadline and abort after the shared real budget is already exhausted", async () => {
  vi.useFakeTimers();
  const budget = new DecisionBudget("fixed-exhausted-real", "brain", () => Date.now());
  budget.charge(95000);
  let aborts = 0;
  const router = new BrainRouter({ config: loadConfig({ BRAIN_LOG: "off" }).brain, codexOnly: true, log: () => {},
    engine: () => ({ name: "codex", model: "fixed", decide: async (req, signal) => {
      expect(req.timeoutMs).toBe(90000);
      return new Promise((_, reject) => signal?.addEventListener("abort", () => { aborts++; reject(new Error("fixed abort")); }));
    } }) });
  const pending = expect(withDecisionBudget(budget, () => router.decide(request()))).rejects.toBeInstanceOf(DecisionBudgetExpired);
  await vi.advanceTimersByTimeAsync(89999); expect(aborts).toBe(0);
  await vi.advanceTimersByTimeAsync(1); await pending; expect(aborts).toBe(1);
  expect(budget.elapsed()).toBe(95000);
  expect(budget.record().stages.at(-1)).toMatchObject({ stage: "L2_brain", budget_ms: 90000, actual_ms: 90000, timed_out: true });
});

it("restores the parent after synchronous and asynchronous observer failures and keeps its original deadline", async () => {
  let time = 0;
  const budget = new DecisionBudget("fixed-shadow-failure", "ordinary", () => time);
  await withDecisionBudget(budget, async () => {
    time += 2000;
    expect(() => withShadowDecisionBudget("P1_readiness_shadow", () => { time += 1000; throw new Error("fixed sync"); })).toThrow("fixed sync");
    await expect(withShadowDecisionBudget("G2_global_shadow", async () => { time += 3000; throw new Error("fixed async"); })).rejects.toThrow("fixed async");
    expect(currentDecisionBudget()).toBe(budget); expect(budget.running).toBe(true); expect(budget.remaining()).toBe(8000);
    time += 8000; expect(budget.remaining()).toBe(0);
  });
  expect(budget.record()).toMatchObject({ shared_actual_ms: 10000, independent_actual_ms: 4000, actual_ms: 14000 });
});


it.each(["high", "xhigh"])("honors configured Codex effort %s while preserving the independent 90-second deadline", async (effort) => {
  vi.useFakeTimers();
  const seen: (string | undefined)[] = [];
  let aborted = 0;
  const engine: BrainEngine = { name: "codex", model: "fixture-only", decide: async (req, signal) => {
    seen.push(req.effort);
    return new Promise((_, reject) => signal?.addEventListener("abort", () => {
      aborted++; reject(new Error("fixed aborted"));
    }));
  } };
  const router = new BrainRouter({ config: loadConfig({ BRAIN_CODEX_EFFORT: effort, BRAIN_LOG: "off" }).brain,
    codexOnly: true, engine: () => engine, log: () => {} });
  const budget = new DecisionBudget("configured-effort-L2", "routine", () => Date.now());
  const rejection = expect(withDecisionBudget(budget, () => router.decide(request())))
    .rejects.toBeInstanceOf(DecisionBudgetExpired);
  await vi.advanceTimersByTimeAsync(90000); await rejection;
  await vi.advanceTimersByTimeAsync(2000);
  expect(seen).toEqual([effort]);
  expect(aborted).toBe(1);
});

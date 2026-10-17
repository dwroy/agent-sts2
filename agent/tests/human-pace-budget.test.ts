/** Fixed clocks and in-memory engines only. No game, network, or model invocation. */
import { afterEach, expect, it, vi } from "vitest";
import { DecisionBudget, DecisionBudgetExpired, DecisionBudgetLedger, HUMAN_PACE_BUDGETS, outsideDecisionBudget,
  shadowBudgetAvailable, withinDecisionBudget, withDecisionBudget } from "../src/core/decision-budget.js";
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

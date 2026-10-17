/** Symbolic inventories and fixed clocks test architecture, not game mechanics. */
import { afterEach, expect, it, vi } from "vitest";
import { directionInventories, evaluateDirections } from "../src/sim/human-pace-direction.js";
import type { BuildState, CoreTemplate } from "../src/construction/types.js";
import type { GlobalBossPool } from "../src/sim/global-build-pool.js";
import { DecisionBudget, currentDecisionBudget, withDecisionBudget } from "../src/core/decision-budget.js";
import { humanPaceH2Policy } from "../src/core/human-pace-shadow-config.js";
import { structuredActPlan } from "../src/sim/human-pace-observer.js";
import type { RunPlan } from "../src/memory/run-plan.js";

export const state: BuildState = { cards: [{ id: "A", upgraded: false }], relics: [], hp: 10, maxHp: 10, gold: 0, floor: 1, cap: null };
export const core: CoreTemplate = { id: "FIXED", name: "fixed", character: "silent", ascensions: [10], status: "candidate",
  requirements: [{ id: "pair", any: [{ kind: "card", id: "A" }, { kind: "card", id: "B" }, { kind: "card", id: "C" }], count: 2, distinct: true }],
  evidence: { runs: ["FIXTURE"], source: "fixed", sha256: "a".repeat(64) }, limits: ["symbolic fixture only"] };
export const pool: GlobalBossPool = { character: "silent", ascension: 10, unknown: [], unit: "observed_fight_records_including_retries",
  source: { path: "fixed", sha256: "b".repeat(64), generated: "fixed" }, stages: [2, 3].map((act) => ({ act,
    candidates: [{ boss: `FIXED_${act}`, count: 1, frequency: 1, evidence: ["FIXTURE"] }] })) };
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

it("enumerates distinct alternatives without choosing a card or calling ownership a functional core", async () => {
  const before = structuredClone(state), variants = directionInventories(state, [core], 10);
  expect(variants[1]?.missing).toEqual([{ id: "pair", count: 1 }]);
  expect(variants[1]?.variants.map((v) => v.added[0]?.id).sort()).toEqual(["B", "C"]);
  expect(state).toEqual(before);
  expect(directionInventories({ ...state, cap: 1 }, [core], 10)[1]).toMatchObject({ variants: [], unknown: "component_resource_contract_or_requirements_unresolved" });
  expect(directionInventories(state, [core], 10, () => Infinity, 1)[1]?.unknown).toBe("component_alternatives_exceed_bound");
  expect(directionInventories(state, [core], 9)).toHaveLength(1);
});

it("keeps G2's Act3 objection and G1a continuous unknown, with no worker on rejected targets", async () => {
  const evaluate = vi.fn(async () => ({ status: "computed" as const, reason: null, win: 0.75, win_se: 0.1, s: { mean: 7, se: 1 }, samples: 4, requested: 4 }));
  const result = await evaluateDirections({ state, cores: [core], ascension: 10, pool, evaluate });
  expect(evaluate).toHaveBeenCalledTimes(3);
  expect(result.predictions.filter((r) => r.target.act === 3).every((r) => r.result.win === null && r.result.s === null)).toBe(true);
  expect(result.final_sequence.result).toMatchObject({ schema: "continuous-boss-result-v1", joint: { value: null }, S: { status: "unknown" } });
  expect(result).toMatchObject({ delivered: false, s_sort: false, budget_ms: 60000 });
  expect(result.inventories[1]?.variants[0]).toMatchObject({ actual_casts: "unknown", functional_core: "unknown", actual_run_outcome: "unknown" });
  expect(result.inventories[1]?.summaries[0]?.rows[0]).toMatchObject({ win: 0.75, S: 7 });
  expect(result.pool.unit).toBe("observed_fight_records_including_retries");
});

it("uses a separate60s deadline, rejects late estimates, and does not charge the paused foreground", async () => {
  let time = 0;
  const parent = new DecisionBudget("real", "brain", () => time); time = 50; parent.pause();
  await withDecisionBudget(parent, async () => {
    const result = await evaluateDirections({ state, cores: [], ascension: 10, pool, now: () => time,
      evaluate: async () => { expect(currentDecisionBudget()?.kind).toBe("direction"); time += 60001;
        return { status: "computed", reason: null, win: 1, win_se: 0, s: null, samples: 2, requested: 2 }; } });
    expect(result.predictions[0]?.result).toMatchObject({ status: "unknown", win: null });
    expect(result.time_budget.timed_out).toBe(true);
    expect(currentDecisionBudget()).toBe(parent);
  });
  expect(parent.elapsed()).toBe(50);
});

it("hard stops a hanging direction callback under the same60s budget", async () => {
  vi.useFakeTimers();
  const pending = evaluateDirections({ state, cores: [], ascension: 10, pool, now: () => Date.now(), evaluate: async () => new Promise(() => {}) });
  await vi.advanceTimersByTimeAsync(60001);
  const result = await pending;
  expect(result.time_budget.timed_out).toBe(true);
  expect(result.predictions[0]?.result).toMatchObject({ win: null, status: "unknown" });
});

it("batches all directions per target and shares the60s budget across observed Bosses", async () => {
  let time = 0;
  const targets = ["X", "Y"].map((boss) => ({ boss, act: 2, count: 1, frequency: 0.5, evidence: ["FIXTURE"],
    source: "observed_silent_pool" as const, unknown: null }));
  const batch = vi.fn<NonNullable<Parameters<typeof evaluateDirections>[0]["evaluateBatch"]>>(async (_target, variants, _budget, cap: number) => {
    expect(variants).toHaveLength(3); expect(cap).toBe(30000); time += 30000;
    return new Map(variants.map((v: { key: string }) => [v.key, { status: "computed" as const, reason: null,
      win: 0.5, win_se: 0.1, s: null, samples: 2, requested: 2 }]));
  });
  const evaluate = vi.fn();
  const result = await evaluateDirections({ state, cores: [core], ascension: 10, pool, targets, now: () => time, evaluate, evaluateBatch: batch });
  expect(batch).toHaveBeenCalledTimes(2); expect(evaluate).not.toHaveBeenCalled();
  // Returning exactly at the hard deadline is a late result, never a fresh estimate.
  expect(result.time_budget.timed_out).toBe(true);
  expect(result.predictions.filter((row) => row.target.boss === "X").every((row) => row.result.win === 0.5)).toBe(true);
  expect(result.predictions.filter((row) => row.target.boss === "Y").every((row) => row.result.win === null)).toBe(true);
});

it("projects only an already accepted plan, leaving unprovided directions and wake fields unknown", () => {
  const plan: RunPlan = { runId: "FIXED", act: 1, floor: 1, hpPct: 1, trigger: "start", archetype: "fixed",
    want: ["A"], avoid: ["B"], remove: [], blockTarget: null, elites: "normal", rest: "auto", bossPrep: "fixed", summary: "fixed" };
  expect(structuredActPlan(plan)).toMatchObject({ direction: "uncommitted", wake: { checkpoint: null, pivot_if: null }, take_priority: ["A"] });
  expect(humanPaceH2Policy("SILENT", { HUMAN_PACE_H2: "on" })).toMatchObject({ mode: "shadow", delivered: false });
  for (const role of [null, "ironclad", "regent", "defect", "necrobinder"]) expect(humanPaceH2Policy(role).mode).toBe("off");
});

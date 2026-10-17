import { expect, it, vi } from "vitest";
import { globalBuildPolicy } from "../src/core/global-build-config.js";
import { globalReadinessHistory, observeGlobalBuild, type GlobalBuildMemory } from "../src/sim/global-build-observer.js";
import type { GlobalBossPool } from "../src/sim/global-build-pool.js";
import type { CompareResult, OptionSim } from "../src/sim/build-sim.js";
import type { GlobalBossTarget } from "../src/sim/global-build.js";
import type { DeckSimRunner } from "../src/sim/build-sim-pool.js";
import { board } from "./boss-sim-fixture.js";
import { DecisionBudgetExpired } from "../src/core/decision-budget.js";

// Algebraic prediction records; these do not assert game mechanics or calibration.
const base: OptionSim = { key: "current", samples: 100, win: .5, winCal: .5, diff: null,
  bossLeft: 0, hpLossMean: 1, hpLossWon: 1, turns: 1, deathTurn: null, order: null, hp: 10 };
const result = (): CompareResult => ({ base: structuredClone(base), options: [{ ...structuredClone(base), key: "skip" }],
  samples: 100, requested: 100, timedOut: false, elapsedMs: 50, workers: 0, orders: 1, order: null });
const pool: GlobalBossPool = { character: "silent", ascension: 10, unknown: [],
  source: { path: "fixed", sha256: "fixed", generated: null }, unit: "observed_fight_records_including_retries",
  stages: [1, 2, 3].map((act) => ({ act, candidates: [{ boss: `B${act}`, count: 1, frequency: 1, evidence: ["fixed"] }] })) };
function request() {
  const runner: DeckSimRunner = { run: vi.fn(async () => { throw new Error("test supplies comparison records, no worker"); }) };
  const memory: GlobalBuildMemory = {};
  return { runner, memory, runId: "fixed-global-run", floor: 2, label: "reward/card", ascension: 10,
    currentAct: 1, currentBoss: "B1", input: board(), options: [{ key: "skip", change: null }],
    sampling: { requested: 100, seed: 7, adaptiveMode: "on" }, keys: ["@current", "skip"], current: result(),
    visible: new Map([[1, "B1"]]), trustReason: () => null, pool,
    evaluate: vi.fn(async (_target: GlobalBossTarget, _runner: DeckSimRunner) => result()), now: () => 0 };
}

it("starts Silent in shadow and cannot turn an on request into a premature release", () => {
  expect(globalBuildPolicy("SILENT", {})).toMatchObject({ mode: "shadow", requested: "shadow" });
  expect(globalBuildPolicy("SILENT", { GLOBAL_BUILD_EVAL: "on" })).toMatchObject({ mode: "shadow", requested: "on", admission: "pending_two_natural_shadow" });
  expect(globalBuildPolicy("SILENT", { GLOBAL_BUILD_EVAL: "off" }).mode).toBe("off");
  for (const character of ["IRONCLAD", "REGENT", "DEFECT", "NECROBINDER", undefined])
    expect(globalBuildPolicy(character, { GLOBAL_BUILD_EVAL: "on" })).toEqual({ mode: "off", requested: "off", admission: "not_applicable" });
});

it("reuses identical complete results despite memo timing fields, while a new seed invalidates the memo", async () => {
  const args = request();
  const first = await observeGlobalBuild(args);
  const second = await observeGlobalBuild({ ...args, current: { ...args.current, elapsedMs: 0,
    completion: { required: true, uniqueDecks: 1, originalDecks: 1, memoHit: true, originalComputeMs: 50 } } });
  expect(first.memo_hit).toBe(false);
  expect(second.memo_hit).toBe(true);
  expect(args.evaluate).toHaveBeenCalledTimes(1);
  expect(args.runner.run).not.toHaveBeenCalled();
  expect(globalReadinessHistory(args.memory, args.runId)).toHaveLength(1);
  await observeGlobalBuild({ ...args, sampling: { ...args.sampling, seed: 8 } });
  expect(args.evaluate).toHaveBeenCalledTimes(2);
  expect(globalReadinessHistory(args.memory, args.runId)).toHaveLength(2);
});

it("keeps the compact readiness history within one run and retains unknown Act3 entries", async () => {
  const args = request();
  await observeGlobalBuild(args);
  expect(globalReadinessHistory(args.memory, args.runId)[0]!.readiness).toMatchObject([
    { act: 1, boss: "B1", base: .5, unknown: null }, { act: 2, boss: "B2", base: .5, unknown: null },
    { act: 3, boss: "B3", base: null, unknown: "Act3_quality_gate_and_production_trust_unknown" },
  ]);
  expect(globalReadinessHistory(args.memory, "another-run")).toEqual([]);
  await observeGlobalBuild({ ...args, runId: "another-run", floor: 1 });
  expect(globalReadinessHistory(args.memory, args.runId)).toEqual([]);
  expect(globalReadinessHistory(args.memory, "another-run")).toHaveLength(1);
});

it("does not cache service failures or borrow a pool from another ascension", async () => {
  const args = request();
  args.evaluate.mockRejectedValue(new Error("fixed worker failure"));
  await observeGlobalBuild(args);
  await observeGlobalBuild(args);
  expect(args.evaluate).toHaveBeenCalledTimes(2);
  const value = await observeGlobalBuild({ ...request(), pool: { ...pool, ascension: 9 } });
  expect(value.summaries.every((summary) => summary.known_acts.length === 0)).toBe(true);
  expect(value.targets[0]!.rows[0]!.unknown).toBe("observed_pool_character_or_ascension_mismatch");
});

it("does not memoize a skipped G2 target as a completed observation after the budget is renewed", async () => {
  const args = request();
  args.evaluate.mockRejectedValueOnce(new DecisionBudgetExpired("G2_global_shadow"));
  const first = await observeGlobalBuild(args);
  expect(first.targets[1]!.rows[0]!.unknown).toBe("decision_budget_exhausted:G2_global_shadow");
  const recovered = await observeGlobalBuild(args);
  expect(recovered.memo_hit).toBe(false);
  expect(recovered.targets[1]!.status).toBe("computed");
  expect((await observeGlobalBuild(args)).memo_hit).toBe(true);
  expect(args.evaluate).toHaveBeenCalledTimes(2);
  expect(args.runner.run).not.toHaveBeenCalled();
});

// H1 prefixes must never mask a later non-budget or failed completion with identical numeric data.
it("keys a budgeted prefix by completion provenance while ignoring only memo timing", async () => {
  const args = request();
  Object.assign(args.current, { requested: 1000, timedOut: true,
    completion: { required: true, uniqueDecks: 1, originalDecks: 1, memoHit: false,
      budgeted: true, status: "partial", failure: false, samples: 100, requested: 1000 } });
  const first = await observeGlobalBuild(args);
  expect(first.targets[0]!.status).toBe("budgeted_partial");
  const same = await observeGlobalBuild({ ...args, current: { ...args.current,
    completion: { ...args.current.completion!, memoHit: true, originalComputeMs: 50 } } });
  expect(same.memo_hit).toBe(true);
  for (const completion of [undefined, { ...args.current.completion!, budgeted: undefined },
    { ...args.current.completion!, failure: true } as unknown as CompareResult["completion"]]) {
    const rejected = await observeGlobalBuild({ ...args, current: { ...args.current, completion } });
    expect(rejected.memo_hit).toBe(false);
    expect(rejected.targets[0]!.status).toBe("unknown");
    expect(rejected.targets[0]!.rows[0]!.unknown).toContain("global_computation_failed:");
  }
  expect(args.runner.run).not.toHaveBeenCalled();
});

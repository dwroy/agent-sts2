import { afterEach, expect, it, vi } from "vitest";
import { globalBuildFailure, globalBuildForB3 } from "../src/sim/global-build-b3.js";
import { board as inputBoard } from "./boss-sim-fixture.js";
import { board, env, setupOneshotTests } from "./oneshot-support.js";
import type { CompareResult, OptionSim } from "../src/sim/build-sim.js";
import type { DeckSimRunner } from "../src/sim/build-sim-pool.js";
import type { FightSampleResult } from "../src/sim/boss-sim.js";
import type { GlobalBossPool } from "../src/sim/global-build-pool.js";
import { DecisionBudget, withDecisionBudget } from "../src/core/decision-budget.js";

vi.mock("../src/sim/boss-trust.js", async (original) => ({ ...await original<object>(), bossTrustReason: () => null }));
setupOneshotTests();
afterEach(() => vi.unstubAllEnvs());

function request(character = "SILENT") {
  const raw = board("xljq-f5-reward", "reward");
  Object.assign(raw.run as object, { character_id: character, ascension: 10, act_id: "0" });
  const environment = env(raw), input = inputBoard({ bossHp: 12 });
  const pool: GlobalBossPool = { character: "silent", ascension: 10, stages: [1, 2, 3].map((act) => ({ act,
    candidates: [{ boss: `B${act}`, count: 1, frequency: 1, evidence: ["fixed"] }] })),
    unknown: [], source: { path: "fixed", sha256: "fixed", generated: null }, unit: "observed_fight_records_including_retries" };
  const base: OptionSim = { key: "current", samples: 2, win: .5, winCal: .5, diff: null, bossLeft: 0,
    hpLossMean: 1, hpLossWon: 1, turns: 1, deathTurn: null, order: null, hp: 10 };
  const current: CompareResult = { base, options: [{ ...base, key: "skip" }], samples: 2, requested: 2,
    timedOut: false, elapsedMs: 1, workers: 0, orders: 1, order: null };
  const runner: DeckSimRunner = { run: vi.fn(async (request) => {
    const from = request.range?.from ?? 0, to = request.range?.to ?? request.samples;
    const reference = { bossHp: 12, myHp: input.solver.player.hp, enemyIds: ["ALGEBRA"], unknown: [] };
    const sample: FightSampleResult = { won: true, died: false, capped: false, timeUp: false, turns: 1,
      hpLoss: 1, revived: 0, drunk: [], enemyHpLeft: 0, lossByTurn: [1], dmgByTurn: [12], incomingByTurn: [1],
      enemyLossByTurn: [12], policyTurns: 1, policyNodes: 0, bossMargin: { reference, outgoingHp: 12, receivedHp: 1 } };
    return { outcomes: request.decks.map(() => request.orders.map(() => Array.from({ length: request.samples }, (_, i) => i >= from && i < to ? structuredClone(sample) : undefined))),
      complete: Array.from({ length: to - from }, (_, i) => from + i), timedOut: false, elapsedMs: 1, workers: 0 };
  }) };
  return { env: environment, required: true, degraded: false, label: "reward/card", bossId: "B1", input,
    options: [{ key: "skip", change: null }], keys: ["@current", "skip"], current,
    setup: { runner, samples: 2, seed: 7, now: () => 0, globalPool: pool },
    makeComparison: vi.fn(() => ({ input, options: [{ key: "skip", change: null }] })) };
}

it("delegates new future evaluations to the existing B3 runner and stores shadow readiness", async () => {
  vi.stubEnv("GLOBAL_BUILD_EVAL", "shadow");
  vi.stubEnv("SIM_ADAPTIVE", "on");
  const args = request();
  const value = await globalBuildForB3(args) as Record<string, unknown>;
  expect(value).toMatchObject({ schema: "global-build-v1", mode: "shadow", delivered: false, status: "partial", s_sort: false });
  expect(args.makeComparison).toHaveBeenCalledTimes(1);
  expect(args.setup.runner.run).toHaveBeenCalled();
  expect((value.targets as { target: { act: number }; status: string }[]).find((row) => row.target.act === 2)!.status).toBe("computed");
  expect((args.env.screenMemory as object)).toHaveProperty("globalBuildHistory.points.0");
});

it("keeps off, other roles and historical callers free of added work or memory", async () => {
  for (const args of [request("IRONCLAD"), { ...request(), required: false }]) {
    expect(await globalBuildForB3(args)).toBeNull();
    expect(args.makeComparison).not.toHaveBeenCalled();
    expect(args.env.screenMemory).not.toHaveProperty("globalBuildHistory");
  }
  vi.stubEnv("GLOBAL_BUILD_EVAL", "off");
  const args = request();
  expect(await globalBuildForB3(args)).toBeNull();
  expect(globalBuildFailure(args.env, true, "fixed")).toBeNull();
});

it("retains a future worker failure as unknown without replacing the completed current B3", async () => {
  vi.stubEnv("GLOBAL_BUILD_EVAL", "shadow");
  const args = request(), before = structuredClone(args.current);
  vi.mocked(args.setup.runner.run).mockRejectedValue(new Error("fixed supplemental worker failure"));
  const value = await globalBuildForB3(args) as Record<string, unknown>;
  expect(args.current).toEqual(before);
  expect(value).toMatchObject({ mode: "shadow", delivered: false, status: "partial" });
  expect(JSON.stringify(value)).toContain("fixed supplemental worker failure");
  expect(globalBuildFailure(args.env, true, "current_C1_failure")).toMatchObject({ status: "unknown", reason: "current_C1_failure" });
});

// U5W7NUE925NK F15/F16 lost the future sample arrays; this covers the reproducible zero-prefix boundary only.
it("preserves an empty future H1 prefix without claiming DPR, probability or full completion", async () => {
  vi.stubEnv("GLOBAL_BUILD_EVAL", "shadow");
  vi.stubEnv("SIM_ADAPTIVE", "on");
  const args = request(), before = structuredClone(args.current);
  vi.mocked(args.setup.runner.run).mockImplementation(async (request) => ({
    outcomes: request.decks.map(() => request.orders.map(() => Array.from({ length: request.samples }))),
    complete: [], timedOut: true, elapsedMs: 1, workers: 0,
  }));
  const value = await withDecisionBudget(new DecisionBudget("fixed-zero-prefix", "brain", () => 0),
    () => globalBuildForB3(args)) as any;
  const future = value.targets.find((row: any) => row.target.act === 2);
  expect(future).toMatchObject({ status: "budgeted_partial", reused_current: false,
    completion: { budgeted: true, status: "partial", failure: false, samples: 0, requested: 2 } });
  expect(future.rows).toHaveLength(2);
  for (const row of future.rows) expect(row).toMatchObject({ samples: 0, base: null, option: null,
    delta_win: null, delta_s: null, unknown: "paired_probability_or_reference_missing" });
  expect(value.summaries[0]).toMatchObject({ known_acts: [1], unknown_acts: [2, 3], conditional_snapshot_product: null });
  expect(value).toMatchObject({ delivered: false, s_sort: false });
  expect(args.current).toEqual(before);
});

it.each([1, 2])("retains missing future DPR as a service error for %i nonempty outcomes without completed fights", async (count) => {
  vi.stubEnv("GLOBAL_BUILD_EVAL", "shadow");
  vi.stubEnv("SIM_ADAPTIVE", "off");
  const args = request(), run = vi.mocked(args.setup.runner.run).getMockImplementation()!;
  vi.mocked(args.setup.runner.run).mockImplementation(async (request) => {
    const value = await run(request);
    value.complete = value.complete.slice(0, count);
    value.timedOut = count < request.samples;
    for (const deck of value.outcomes) for (const order of deck) for (const [index, sample] of order.entries()) {
      if (index >= count) order[index] = undefined;
      else if (sample) Object.assign(sample, { won: false, died: false, capped: true });
    }
    return value;
  });
  const value = await withDecisionBudget(new DecisionBudget("fixed-nonempty-prefix", "brain", () => 0),
    () => globalBuildForB3(args));
  expect(JSON.stringify(value)).toContain("global_computation_failed:global_required_paired_DPR_missing");
});

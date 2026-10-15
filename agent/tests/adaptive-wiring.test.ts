import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { compareOptions } from "../src/sim/build-sim.js";
import { SerialDeckRunner, type DeckRunRequest, type DeckSimRunner } from "../src/sim/build-sim-pool.js";
import { runLines } from "../src/sim/boss-lines.js";
import { solveTurn } from "../src/reflex/turn-solver.js";
import { board as fightBoard } from "./boss-sim-fixture.js";
import { board, decide, env, setupOneshotTests } from "./oneshot-support.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { bossEvaluationPending, withBossSim } from "../src/sim/build-sim-facts.js";
import { fightSample, slimInput } from "../src/sim/boss-sim.js";

setupOneshotTests();
beforeAll(() => setMonsterDbForTests(FIXTURE_DB));
afterAll(() => setMonsterDbForTests(null));
afterEach(() => vi.unstubAllEnvs());

it("B3 shadow keeps every full sample and number, has separate memo identity, and reuses its completed result", async () => {
  const base = fightBoard({ bossHp: 12 });
  const calls: DeckRunRequest[] = [];
  const serial = new SerialDeckRunner();
  const runner: DeckSimRunner = { run: async (r) => { calls.push(r); return serial.run(r); } };
  const options = [{ key: "skip", change: null }, { key: "same", change: {} }];
  const opts = { requireComplete: true, quantitative: true, samples: 12, seed: 7, now: () => 0 };
  const off = await compareOptions(runner, base, options, opts);
  const on = await compareOptions(runner, base, options, { ...opts, adaptive: { allowS: true } });
  const { adaptive, ...unchanged } = on;
  expect(unchanged).toEqual(off);
  expect(adaptive).toMatchObject({ mode: "shadow", status: "produced", evaluable: true });
  expect(calls).toHaveLength(2);
  expect(calls.every((r) => r.samples === 12 && r.deadlineMs === undefined)).toBe(true);
  const reused = await compareOptions(runner, base, options, { ...opts, adaptive: { allowS: true } });
  expect(reused.completion?.memoHit).toBe(true);
  expect(reused.adaptive).toEqual(adaptive);
  expect(calls).toHaveLength(2);
});

it("B2 shadow preserves complete line outcomes, order choices and old ranking inputs", () => {
  const base = fightBoard({ bossHp: 12 });
  const plans = solveTurn(base.solver).plans.slice(0, 2);
  const opts = { samples: 12, seed: 7, deadlineMs: Infinity, serial: true, now: () => 0 };
  const off = runLines(base, plans, opts);
  const on = runLines(base, plans, { ...opts, adaptive: { allowS: false } });
  const { adaptive, ...unchanged } = on;
  expect(unchanged).toEqual(off);
  expect(adaptive).toMatchObject({ mode: "shadow", lane: "b2", status: "produced" });
  expect(on.samples).toBe(12);
});

it("B3 records the shadow result without changing the actual question sent to the brain", async () => {
  const raw = board("xljq-f5-reward", "reward");
  const e = env(raw, undefined, { requiredBossEvaluation: true });
  const decision = decide(e);
  e.state.run!.raw["character_id"] = "SILENT";
  const sample = fightSample(slimInput({ ...fightBoard({ bossHp: 12 }), captureBossMargin: true }), null, 7);
  const runner: DeckSimRunner = { run: async (req) => ({
    outcomes: req.decks.map(() => req.orders.map(() => Array.from({ length: req.samples }, () => sample))),
    complete: Array.from({ length: req.samples }, (_, i) => i), timedOut: false, elapsedMs: 0, workers: 0,
  }) };
  const setup = { runner, db: FIXTURE_DB, mm: FIXTURE_MM, samples: 4, now: () => 0 };
  vi.stubEnv("SIM_ADAPTIVE", "off");
  const off = await withBossSim(decision, e, setup);
  vi.stubEnv("SIM_ADAPTIVE", "shadow");
  const shadow = await withBossSim(decision, e, setup);
  expect(shadow.decision).toEqual(off.decision);
  expect(off.record).not.toHaveProperty("adaptive");
  expect(shadow.record).toHaveProperty("adaptive.status", "produced");
  expect(shadow.record).toHaveProperty("completion.status", "complete");
});

it("the admitted B3 on switch reaches completion and P2 facts through the actual live adapter", async () => {
  vi.stubEnv("SIM_ADAPTIVE", "on");
  vi.stubEnv("S_BUILD_RANK", "on");
  const e = env(board("xljq-f5-reward", "reward"), undefined, { requiredBossEvaluation: true });
  const decision = decide(e);
  e.state.run!.raw["character_id"] = "SILENT";
  const sample = fightSample(slimInput({ ...fightBoard({ bossHp: 12 }), captureBossMargin: true }), null, 7);
  const requests: DeckRunRequest[] = [];
  const runner: DeckSimRunner = { run: async (request) => {
    requests.push(request);
    return { outcomes: request.decks.map(() => request.orders.map(() => Array.from({ length: request.samples }, () => sample))),
      complete: Array.from({ length: request.samples }, (_, i) => i), timedOut: false, elapsedMs: 0, workers: 0 };
  } };
  const result = await withBossSim(decision, e, { runner, db: FIXTURE_DB, mm: FIXTURE_MM, samples: 4, now: () => 0 });
  expect(requests).toHaveLength(1);
  expect(requests[0]?.range).toEqual({ from: 0, to: 4 });
  expect(result.record).toMatchObject({ completion: { status: "complete_adaptive" },
    adaptive: { mode: "on", status: "complete_adaptive" }, build_ranking: { status: "produced", mode: "on" } });
  expect(bossEvaluationPending(result.decision, e.state, result.record)).toBeNull();
  expect(result.decision.kind === "ask" && result.decision.state["facts"]).toHaveProperty("build_ranking.schema", "build-ranking-v1");
});

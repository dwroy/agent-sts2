import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { bossEvaluationPending, withBossSim } from "../src/sim/build-sim-facts.js";
import type { DeckRunRequest, DeckSimRunner } from "../src/sim/build-sim-pool.js";
import { fightSample, slimInput } from "../src/sim/boss-sim.js";
import { board as fightBoard } from "./boss-sim-fixture.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { board, decide, env, setupOneshotTests } from "./oneshot-support.js";

setupOneshotTests();
beforeAll(() => setMonsterDbForTests(FIXTURE_DB));
afterAll(() => setMonsterDbForTests(null));
afterEach(() => vi.unstubAllEnvs());
const outcome = fightSample(slimInput({ ...fightBoard({ bossHp: 12 }), captureBossMargin: true }), null, 7);
function question() {
  const raw = board("xljq-f5-reward", "reward");
  const e = env(raw, undefined, { requiredBossEvaluation: true });
  const decision = decide(e);
  // Only switch the already-built fixture question to exercise the Silent controller policy.
  e.state.run!.raw["character_id"] = "SILENT";
  return { e, decision };
}
function result(req: DeckRunRequest, n: number) {
  return { outcomes: req.decks.map(() => req.orders.map(() => Array.from({ length: req.samples }, (_, i) => i < n ? outcome : undefined))),
    complete: Array.from({ length: n }, (_, i) => i), timedOut: n < req.samples, elapsedMs: 1000, workers: 0 };
}

it.each([0, 250, 320, "throw"] as const)("B3 fails twice then permits the bounded third attempt (%s) through the dispatch gate", async (third) => {
  const { e, decision } = question();
  const calls: DeckRunRequest[] = [];
  const runner: DeckSimRunner = { run: async (req) => {
    calls.push(req);
    if (calls.length <= 2 || third === "throw") throw new Error("fixed worker failure");
    return result(req, third);
  } };
  const setup = { runner, samples: 1000, db: FIXTURE_DB, mm: FIXTURE_MM, now: () => 0 };
  for (let i = 1; i <= 2; i++) {
    const value = await withBossSim(decision, e, setup);
    expect(value.record).toMatchObject({ completion: { status: "pending", attempts: i } });
    expect(bossEvaluationPending(value.decision, e.state, value.record!)).not.toBeNull();
  }
  const value = await withBossSim(decision, e, setup);
  expect(calls).toHaveLength(3);
  expect(calls.slice(0, 2).map((r) => r.deadlineMs)).toEqual([undefined, undefined]);
  expect(calls[2]!.deadlineMs).toBe(11_000);
  expect(value.record).toMatchObject({ completion: { status: "degraded", attempts: 3, samples: typeof third === "number" ? third : 0 } });
  expect(bossEvaluationPending(value.decision, e.state, value.record!)).toBeNull();
  expect(JSON.stringify(value.decision.state)).toContain("故障降级");
  if (third === 320) expect(value.record?.["samples"]).toBe(320);
  else expect(value.record?.["base"]).toBeUndefined();
});

it("one failure followed by a successful full attempt resets the counter; off retains mandatory retries", async () => {
  const { e, decision } = question();
  let fail = true;
  const runner: DeckSimRunner = { run: async (req) => { if (fail) throw new Error("fixed failure"); return result(req, req.samples); } };
  const setup = { runner, samples: 4, db: FIXTURE_DB, mm: FIXTURE_MM, now: () => 0 };
  await withBossSim(decision, e, setup);
  fail = false;
  const good = await withBossSim(decision, e, setup);
  expect(good.record).toMatchObject({ completion: { status: "complete", attempts: 2 } });
  expect(e.screenMemory.simFailure).toBeUndefined();
  expect(bossEvaluationPending(good.decision, e.state, good.record!)).toBeNull();
  vi.stubEnv("SIM_FAILURE_EXIT", "off");
  const broken: DeckSimRunner = { run: async (req) => { expect(req.deadlineMs).toBeUndefined(); throw new Error("off failure"); } };
  for (let i = 0; i < 3; i++) {
    const value = await withBossSim(decision, e, { ...setup, runner: broken });
    expect(value.record).toMatchObject({ completion: { status: "pending" } });
  }
});

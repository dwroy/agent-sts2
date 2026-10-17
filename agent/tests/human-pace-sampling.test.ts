/** Fixed returned sample prefixes; these tests never start workers or invoke a model. */
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { DecisionBudget, withDecisionBudget } from "../src/core/decision-budget.js";
import { bossLineSim, simLog, bossLinesOptions, BossLinesPool, releaseBossLinesPool, type BossLineSimArgs } from "../src/sim/boss-lines.js";
import { compareOptions } from "../src/sim/build-sim.js";
import { bossEvaluationPending, withBossSim } from "../src/sim/build-sim-facts.js";
import type { DeckRunRequest, DeckSimRunner } from "../src/sim/build-sim-pool.js";
import { ComputeMemo } from "../src/sim/compute-memo.js";
import { createScreenMemory } from "../src/memory/types.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { fightSample, sampleSeed, slimInput } from "../src/sim/boss-sim.js";
import { board as fightBoard } from "./boss-sim-fixture.js";
import { board, decide, env, setupOneshotTests } from "./oneshot-support.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { f48JointShadow } from "../src/sim/f48-joint-shadow.js";
import { jointInput, scope, candidate, sample } from "./f48-joint-fixture.js";
import { summarizeBossMargin } from "../src/sim/boss-margin.js";

const trust = vi.hoisted(() => ({ reason: null as string | null }));
vi.mock("../src/reflex/rollout-live.js", async (original) => ({
  ...await original<typeof import("../src/reflex/rollout-live.js")>(),
  boardRolloutInput: (_state: unknown, _knowledge: unknown, solver: unknown) => ({ ...fightBoard({ bossHp: 12 }), solver, enemies: [{ index: 0, id: "SOUL_FYSH", move: "HIT", strength: 0, powers: {} }], handBase: [] }),
  fightMetaOf: () => fightBoard({ bossHp: 12 }).meta, fightRelicsOf: () => ({}),
}));
vi.mock("../src/sim/boss-trust.js", async (original) => ({ ...await original<object>(), bossTrustReason: () => trust.reason }));
vi.mock("node:os", async (original) => ({ ...await original<object>(), loadavg: () => [1, 1, 1] }));
setupOneshotTests();
const original = { ...bossLinesOptions };
let returned: ReturnType<typeof fightSample>;
beforeAll(() => { setMonsterDbForTests(FIXTURE_DB); returned = fightSample(slimInput(fightBoard({ bossHp: 12 })), null, 7); });
afterAll(() => setMonsterDbForTests(null));
beforeEach(() => {
  vi.spyOn(performance, "now").mockReturnValue(0);
  vi.stubEnv("GLOBAL_BUILD_EVAL", "shadow"); vi.stubEnv("SIM_ADAPTIVE", "on");
  vi.stubEnv("S_READINESS", "shadow"); vi.stubEnv("S_BUILD_RANK", "shadow");
  Object.assign(bossLinesOptions, { serial: false, now: () => 0 }); trust.reason = null;
});
afterEach(() => { Object.assign(bossLinesOptions, original); vi.restoreAllMocks(); vi.unstubAllEnvs(); releaseBossLinesPool(); });
function b2Args(): BossLineSimArgs {
  const input = fightBoard({ bossHp: 12 });
  return { state: { raw: { run_id: "H1-fixed" }, turn: 1, run: { floor: 17, ascension: 10, raw: { character_id: "SILENT" } } },
    knowledge: {}, memory: createScreenMemory("COMBAT"), solver: input.solver, piles: input.piles, randomPotions: [],
    lines: input.plans.slice(0, 2), turn: 1, drinks: () => false, samples: 1000, requiredComplete: true } as unknown as BossLineSimArgs;
}
function prefixRunner(n: number, expired?: () => void) {
  const calls: DeckRunRequest[] = [];
  const runner: DeckSimRunner = { run: async (r) => {
    calls.push(r); const from = r.range?.from ?? 0, to = Math.min(r.range?.to ?? r.samples, from + n);
    const complete = Array.from({ length: to - from }, (_, i) => from + i);
    const outcomes = r.decks.map(() => r.orders.map(() => Array.from({ length: r.samples }, (_, i) => complete.includes(i) ? returned : undefined)));
    expired?.();
    return { outcomes, complete, timedOut: to < (r.range?.to ?? r.samples), elapsedMs: 1, workers: 0 };
  } };
  return { runner, calls };
}

it("B2 retains only completed paired prefixes on a mid-C2 deadline and reuses the first attempt with no extra work", () => {
  const args = b2Args(), memo = new ComputeMemo("fixed");
  const pool = vi.spyOn(BossLinesPool.prototype, "run").mockImplementation((_input, pairs, count, _seed, ms, _now, _progress, work) => {
    expect(ms).toBeGreaterThan(0); expect(ms).toBeLessThanOrEqual(59000);
    const from = work?.range.from ?? 0, end = from + 47;
    return { outcomes: pairs.map(() => Array.from({ length: count }, (_, i) => i < end ? returned : undefined)),
      complete: [...Array.from({ length: 47 }, (_, i) => from + i), 49], timedOut: true, elapsedMs: 1200, workers: 0, done: 47 * pairs.length };
  });
  const first = withDecisionBudget(new DecisionBudget("first", "boss", () => 0), () => bossLineSim({ ...args, memo }));
  expect(first).toMatchObject({ available: true, completion: { status: "partial", failure: false, samples: 47, requested: 1000 } });
  if (!first.available) throw new Error(first.reason);
  expect(first.run.lines.every((line) => line.samples === 47 && line.outcomes.length === 47)).toBe(true);
  expect(first.run.adaptive).toMatchObject({ status: "partial", rounds: [] });
  expect(args.memory.simFailure).toBeUndefined();
  const log = simLog(first, (plan) => `p${args.lines.indexOf(plan)}`);
  expect(Object.values((log as any).lines).every((line: any) => line.samples === 47 && line.raw_win_mc_interval95.length === 2)).toBe(true);
  const retry = withDecisionBudget(new DecisionBudget("retry", "retry", () => 0), () => bossLineSim({ ...args, memo, samples: 600 }));
  expect(retry).toMatchObject({ available: true, completion: { status: "partial", samples: 47, requested: 1000 } });
  expect(pool).toHaveBeenCalledTimes(1); expect(memo.hits).toBe(1);
  const changed = { ...args, solver: { ...args.solver, player: { ...args.solver.player, hp: args.solver.player.hp - 1 } }, memo };
  withDecisionBudget(new DecisionBudget("changed", "boss", () => 0), () => bossLineSim(changed));
  expect(pool).toHaveBeenCalledTimes(2);
});

// 2PQK67ULZY90 F33 T3: the original error retained n=200/600 but not its sample arrays.
// These abstract outcomes reproduce the caller bug without claiming the missing runtime arrays.
it("B2 pairs an eliminated prefix with a longer reference after a later C2 deadline", () => {
  const args = b2Args();
  args.samples = 600;
  args.lines = [args.lines[0]!, args.lines[1]!, { ...args.lines[1]! }];
  const pool = vi.spyOn(BossLinesPool.prototype, "run").mockImplementation((_input, pairs, count, _seed, _ms, _now, _progress, work) => {
    const from = work!.range.from, to = from === 0 ? work!.range.to : from + 14;
    const active = new Set(work!.activePairs);
    return { outcomes: pairs.map((pair, index) => Array.from({ length: count }, (_, id) => {
      if (!active.has(index) || id < from || id >= to) return undefined;
      const won = pair.lineIndex !== 0 && id % 100 < 80;
      return { ...returned, won, died: !won, capped: false, timeUp: false, turns: 2, hpLoss: won ? 1 : 70,
        bossMargin: { reference: { bossHp: 100, myHp: 70, enemyIds: ["fixture"], unknown: [] }, outgoingHp: won ? 100 : 20, receivedHp: won ? 1 : 70 } };
    })), complete: Array.from({ length: to - from }, (_, i) => from + i), timedOut: from > 0,
      elapsedMs: 1, workers: 0, done: (to - from) * active.size };
  });
  const result = withDecisionBudget(new DecisionBudget("unequal-prefix", "boss", () => 0), () => bossLineSim(args));
  expect(result).toMatchObject({ available: true, completion: { status: "partial", budgeted: true, failure: false, samples: 200, requested: 600 } });
  if (!result.available) throw new Error(result.reason);
  expect(pool).toHaveBeenCalledTimes(2);
  expect(result.run.adaptive).toMatchObject({ status: "partial", candidates: [
    { key: "line:0", samples: 200, stop: "eliminated" },
    { key: "line:1", samples: 214, stop: "budget" }, { key: "line:2", samples: 214, stop: "budget" },
  ] });
  expect(result.run.lines.map((line) => line.samples)).toEqual([200, 214, 214]);
  const margin = result.byPlan.get(args.lines[0]!)!.bossMargin!;
  expect(margin).toMatchObject({ samples: 200, referenceSamples: 214, pairedIdentity: "explicit_sample_indices",
    paired: { difference: { n: 200 }, unmatchedBase: 14, unmatchedOption: 0 } });
  // Independently recompute from the returned prefixes; neither side is padded or truncated.
  expect(margin).toEqual(summarizeBossMargin(result.run.lines[0]!.outcomes, result.run.lines[1]!.outcomes,
    Array.from({ length: 200 }, (_, i) => i), Array.from({ length: 214 }, (_, i) => i)));
  expect(args.memory.simFailure).toBeUndefined();
});

it.each([
  { ids: [], baseIds: [0] }, { ids: [0], baseIds: [] },
  { ids: [0, 0], baseIds: [0] }, { ids: [0], baseIds: [0, 0] },
])("keeps the boss margin identity guard for missing or duplicate IDs: %j", ({ ids, baseIds }) => {
  expect(() => summarizeBossMargin(ids.length === 2 ? [returned, returned] : [returned],
    baseIds.length === 2 ? [returned, returned] : [returned], ids, baseIds)).toThrow("boss margin sample identity mismatch");
});

it("pairs margins by explicit IDs and keeps unknown attribution and one-sample error unknown", () => {
  const known = { ...returned, turns: 2, won: true, died: false, capped: false, timeUp: false,
    bossMargin: { reference: { bossHp: 100, myHp: 70, enemyIds: ["fixture"], unknown: [] }, outgoingHp: 100, receivedHp: 0 } };
  const missing = { ...known, bossMargin: { ...known.bossMargin, receivedHp: null } };
  const result = summarizeBossMargin([known, missing], [known, known, known], [3, 7], [7, 3, 9]);
  expect(result).toMatchObject({ rankingEligible: false, valid: 1, missing: 1, score: null,
    paired: { difference: { n: 1, mean: 0, meanSe: null }, unmatchedBase: 2, unmatchedOption: 0 } });
});

it("preserves the B2 C1 failure exit for a real worker error", () => {
  vi.spyOn(BossLinesPool.prototype, "run").mockImplementation(() => { throw new Error("fixed B2 worker failure"); });
  const args = b2Args();
  const run = () => withDecisionBudget(new DecisionBudget("B2-fault", "boss", () => 0), () => bossLineSim(args));
  expect(run()).toMatchObject({ available: false, completion: { status: "pending", failure: true } });
  expect(run()).toMatchObject({ available: false, completion: { status: "pending", failure: true } });
  expect(run()).toMatchObject({ available: false, completion: { status: "degraded", failure: true, samples: 0 } });
});

it("B3 passes finite total deadlines, keeps real candidate counts, and does not eliminate from a partial first batch", async () => {
  const input = fightBoard({ bossHp: 12 }), { runner, calls } = prefixRunner(47);
  const options = [{ key: "skip", change: null }, { key: "change", change: { solver: { ...input.solver, player: { ...input.solver.player, hp: 65 } } } }];
  const opts = { samples: 1000, requireComplete: true, quantitative: true, adaptive: { mode: "on" as const, allowS: true }, deadlineMs: 11000 };
  const first = await withDecisionBudget(new DecisionBudget("first", "brain", () => 0), () => compareOptions(runner, input, options, opts));
  expect(calls).toHaveLength(1); expect(calls[0]?.deadlineMs).toBe(11000); expect(calls[0]?.progressTimeoutMs).toBeUndefined();
  expect(first).toMatchObject({ samples: 47, timedOut: true, adaptive: { status: "partial", rounds: [] },
    completion: { required: true, budgeted: true, status: "partial", failure: false, samples: 47, requested: 1000 } });
  expect(first.options.every((o) => o.samples === 47 && o.pairedReference?.samples === 47)).toBe(true);
  const reused = await withDecisionBudget(new DecisionBudget("retry", "retry", () => 0), () => compareOptions(runner, input, options, opts));
  expect(reused.completion?.memoHit).toBe(true); expect(calls).toHaveLength(1);
});

it("the live B3 adapter releases normal partials, leaves n<2 uncertainty unknown, and preserves C1 for an actual worker fault", async () => {
  const e = env(board("xljq-f5-reward", "reward"), undefined, { requiredBossEvaluation: true });
  const decision = decide(e); e.state.run!.raw["character_id"] = "SILENT";
  const { runner } = prefixRunner(1);
  const result = await withDecisionBudget(new DecisionBudget("B3", "brain", () => 0), () => withBossSim(decision, e,
    { runner, samples: 1000, db: FIXTURE_DB, mm: FIXTURE_MM, now: () => 0 }));
  expect(result.record).toMatchObject({ completion: { status: "partial", samples: 1, failure: false }, global_build: { final_sequence: { status: "unknown" } } });
  expect(withDecisionBudget(new DecisionBudget("pending-gate", "brain", () => 0), () => bossEvaluationPending(result.decision, e.state, result.record))).toBeNull();
  expect(JSON.stringify(result.decision)).toContain("误差unknown");
  expect(Object.values((result.record as any).options).every((o: any) => o.se_cal === null && o.samples === 1)).toBe(true);
  const bad = await withDecisionBudget(new DecisionBudget("fault", "brain", () => 0), () => withBossSim(decision, e,
    { runner: { run: async () => { throw new Error("fixed worker failure"); } }, samples: 1000, db: FIXTURE_DB, mm: FIXTURE_MM, now: () => 0 }));
  expect(bad.record).toMatchObject({ completion: { status: "pending", failure: true, samples: 0 } });
  expect(bossEvaluationPending(bad.decision, e.state, bad.record)).toBeTruthy();
});

it("caps low-trust B2 sampling within the same budget and labels it without changing death/potion rules", () => {
  trust.reason = "fixed learner low-trust boundary";
  const pool = vi.spyOn(BossLinesPool.prototype, "run").mockImplementation((_input, pairs, count) => ({
    outcomes: pairs.map(() => Array.from({ length: count }, () => returned)), complete: Array.from({ length: count }, (_, i) => i),
    timedOut: false, elapsedMs: 0, workers: 0, done: count * pairs.length,
  }));
  const result = withDecisionBudget(new DecisionBudget("low-trust", "boss", () => 0), () => bossLineSim(b2Args()));
  expect(pool.mock.calls[0]?.[2]).toBe(200);
  expect(result).toMatchObject({ available: true, completion: { status: "complete_budget", samples: 200 }, best: null, tied: [], bestDry: null });
  if (result.available) {
    expect([...result.byPlan.values()][0]?.text).toContain("低可信、未完整");
    expect([...result.byPlan.values()].every((line) => line.bossMargin?.rankingEligible === false)).toBe(true);
  }
});

it("skips F48, P1/P2, G2 and S shadow extensions after expiry while preserving the partial primary computation", async () => {
  let time = 0; const budget = new DecisionBudget("expired", "brain", () => time, 3000);
  const e = env(board("xljq-f5-reward", "reward"), undefined, { requiredBossEvaluation: true });
  const decision = decide(e); e.state.run!.raw["character_id"] = "SILENT";
  const { runner } = prefixRunner(3, () => { time = 3000; });
  const result = await withDecisionBudget(budget, () => withBossSim(decision, e,
    { runner, samples: 1000, db: FIXTURE_DB, mm: FIXTURE_MM, now: () => 0 }));
  expect(result.record).toMatchObject({ completion: { status: "partial", samples: 3, failure: false }, build_ranking: { status: "unknown" },
    global_build: { status: "unknown", reason: "decision_budget_exhausted" } });
  expect(budget.record().shadow_unknown).toEqual(expect.arrayContaining(["P1_readiness_shadow", "P2_S_build_counterfactual", "G2_global_shadow"]));
  const joint = withDecisionBudget(budget, () => f48JointShadow(scope, [candidate("a", [sample(sampleSeed(7, 0), 8, true)])], jointInput()));
  expect(joint).toMatchObject({ status: "unknown", reason: "decision_budget_exhausted", candidates: [] });
});

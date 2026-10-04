/**
 * The SL retry compute memo (src/sim/compute-memo.ts, docs/sl.md §10.6): a retried fight's rollouts and B2 runs on a board
 * an earlier attempt planned come back from it, and every question and resolution is the one the computation gives.
 * - the key: equal inputs give equal keys however V8 stores their strings; what JSON would merge (undefined, NaN, -0,
 *   Maps, Sets) and which objects are one are told apart; a function: no key; the switches and a test's data swap: a new key;
 * - the store: a fresh copy each time, a byte cap, one fight at a time, the switch;
 * - the rollout's least budget (RolloutResult.budgetNeedMs): the same run with that budget on the same clock readings is
 *   cut nowhere, with less it is;
 * - the planner on logged boss boards (The Kin T5, B2 on in this thread): with the memo, the same digest as without, the
 *   second plan of a board a hit for both the rollout and B2; a B2 run cut by its deadline is not kept, and a hit needs
 *   the deadline it took (B2) and the budget it needed (the rollout); a hit is charged to the turn as if it had run.
 */
import { createHash } from "node:crypto";
import { serialize } from "node:v8";

import { afterEach, describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import type { AskDecision, DecisionEnv } from "../src/project/types.js";
import { planCombatTurn, plannerTiming } from "../src/screens/combat-plan.js";
import { BOSS_LINES_DEADLINE_MS, BOSS_LINES_MIN_MS, BOSS_LINES_SAMPLES, BOSS_LINES_WORKERS, bossLinesOptions, bossLinesPoolData, releaseBossLinesPool, workerDataSignature } from "../src/sim/boss-lines.js";
import { canonicalText, COMPUTE_MEMO_MAX_BYTES, ComputeMemo, computeMemoFor, computeMemoOptions, currentComputeMemo, dropComputeMemo, memoKey } from "../src/sim/compute-memo.js";
import { RETRY_COMPUTE } from "../src/sl/controller.js";
import { passivePiecesOptions } from "../src/strategy/passive-pieces.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutDecision, type RolloutInput, type RolloutResult } from "../src/strategy/rollout.js";
import { ROLLOUT_BUDGET_MS, rolloutLiveOptions, rolloutTap } from "../src/strategy/rollout-live.js";
import { bumpDataVersion } from "../src/util/data-version.js";
import { logged, loggedEnv } from "./logged.js";

describe("the key", () => {
  it("equal values, equal text, however their strings were built; what JSON merges is told apart", () => {
    // A string sliced out of a two-byte one is stored two bytes a character inside V8; the same text typed is one byte.
    const twoByte = ("同族" + "STRIKE_IRONCLAD").slice(2);
    const a = { card: twoByte, n: [1, 2] };
    const b = { card: "STRIKE_IRONCLAD", n: [1, 2] };
    expect(canonicalText(a)).toBe(canonicalText(b));
    expect(memoKey("t", a)).toBe(memoKey("t", b));
    // (V8 may write the two differently: the reason the key is not the structured-clone bytes.)
    void serialize(a).equals(serialize(b));
    const differ = (x: unknown, y: unknown) => expect(canonicalText(x)).not.toBe(canonicalText(y));
    differ({ a: undefined }, {});
    differ({ a: NaN }, { a: null });
    differ({ a: -0 }, { a: 0 });
    differ({ a: Infinity }, { a: null });
    differ({ a: new Map([["x", 1]]) }, { a: { x: 1 } });
    differ({ a: new Set([1]) }, { a: [1] });
    differ([undefined], [null]);
    // Which objects are one: a plan shown and the same plan among the solver's lines, against an equal copy.
    const plan = { steps: [{ card: "BASH" }] };
    differ({ plans: [plan], shown: [plan] }, { plans: [plan], shown: [{ steps: [{ card: "BASH" }] }] });
    expect(canonicalText({ plans: [plan], shown: [plan] })).toContain('"ref","at":2}');
    expect(canonicalText({ plans: [plan], shown: [plan] })).toBe(canonicalText({ plans: [{ steps: [{ card: "BASH" }] }], shown: [{ steps: [{ card: "BASH" }] }] }).replace(/"shown":\[.*\]\}$/, '"shown":[{"\\u0000":"ref","at":2}]}'));
    // Key order counts (another order: another key, a miss, never a wrong hit).
    differ({ a: 1, b: 2 }, { b: 2, a: 1 });
    expect(memoKey("t", { now: () => 0 })).toBeNull();
    expect(memoKey("t", { n: 1n })).toBeNull();
  });

  it("B2's pool runs are keyed by the data its workers load: one signature of the data files' contents; no pool, none", () => {
    const signature = workerDataSignature();
    expect(signature).toMatch(/^[0-9a-f]{32}$/);
    expect(workerDataSignature()).toBe(signature);
    expect(bossLinesPoolData()).toBeNull();
  });

  it("the process-wide switches and a test's data swap give another key", () => {
    const before = memoKey("t", { x: 1 });
    passivePiecesOptions.enabled = !passivePiecesOptions.enabled;
    const flipped = memoKey("t", { x: 1 });
    passivePiecesOptions.enabled = !passivePiecesOptions.enabled;
    expect(flipped).not.toBe(before);
    expect(memoKey("t", { x: 1 })).toBe(before);
    bumpDataVersion();
    expect(memoKey("t", { x: 1 })).not.toBe(before);
    expect(memoKey("u", { x: 1 })).not.toBe(memoKey("t", { x: 1 }));
  });
});

describe("the store", () => {
  afterEach(() => {
    computeMemoOptions.maxBytes = COMPUTE_MEMO_MAX_BYTES;
    computeMemoOptions.enabled = true;
    dropComputeMemo();
  });

  it("a fresh copy each time, the oldest out past the byte cap, one fight at a time, off with the switch", () => {
    const memo = new ComputeMemo("f");
    memo.set("k", { a: [1, 2], m: new Map([["x", 1]]) }, { ms: 5 });
    const got = memo.get<{ a: number[]; m: Map<string, number> }, { ms: number }>("k")!;
    expect(got.meta).toEqual({ ms: 5 });
    got.value.a.push(3);
    expect(memo.get<{ a: number[]; m: Map<string, number> }, unknown>("k")!.value).toEqual({ a: [1, 2], m: new Map([["x", 1]]) });
    expect(memo.get("nope")).toBeNull();
    expect(memo.set("f", { f: () => 0 }, null)).toBe(false);
    computeMemoOptions.maxBytes = 2_000;
    const big = { s: "x".repeat(900) };
    memo.set("b1", big, null);
    memo.set("b2", big, null);
    // Under the cap: all kept.
    expect(memo.size).toBe(3);
    memo.set("b3", big, null);
    // Over it: the oldest go first until it fits.
    expect(memo.get("k")).toBeNull();
    expect(memo.get("b1")).toBeNull();
    expect(memo.get("b2")).not.toBeNull();
    expect(memo.get("b3")).not.toBeNull();
    expect(memo.storedBytes).toBeLessThanOrEqual(2_000);
    // One value over the cap is not kept at all.
    expect(memo.set("huge", { s: "x".repeat(3_000) }, null)).toBe(false);
    const one = computeMemoFor("run:1:17")!;
    expect(computeMemoFor("run:1:17")).toBe(one);
    expect(computeMemoFor("run:1:33")).not.toBe(one);
    computeMemoOptions.enabled = false;
    expect(computeMemoFor("run:1:33")).toBeNull();
  });
});

/** A clock that moves 1 ms each time it is read: the same run reads the same times. */
function ticking(): () => number {
  let t = 0;
  return () => (t += 1);
}

/**
 * The whole decision as data: the question, Jev's view, and each option's (and no answer's) resolution. `wall`: the log's
 * rollout.ms and boss_sim.ms left out (the wall clock: a memo hit's is the lookup's), for runs on a moving clock.
 */
function digestOf(decision: ReturnType<typeof planCombatTurn>, wall = false): string {
  if (!decision || decision.kind !== "ask") return JSON.stringify(decision ?? null);
  const ask = decision as AskDecision;
  const keys = Object.keys((ask.questions["plan"] as { criteria: Record<string, unknown> }).criteria);
  const pick = (key: string, confidence: number): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;
  const res = (answers: AnswerSet) => {
    const { apply: _apply, ...rest } = ask.resolve(answers);
    if (!wall || !rest.log) return rest;
    const log = { ...rest.log } as Record<string, unknown>;
    for (const part of ["rollout", "boss_sim"]) {
      if (log[part] && typeof log[part] === "object") {
        const { ms: _ms, ...other } = log[part] as Record<string, unknown>;
        log[part] = other;
      }
    }
    return { ...rest, log };
  };
  const view = {
    label: ask.label,
    state: ask.state,
    questions: ask.questions,
    jevView: ask.jevView ?? null,
    resolved: Object.fromEntries([...keys.map((key) => [key, res(pick(key, 0.9))]), ...keys.map((key) => [`${key}@0.3`, res(pick(key, 0.3))]), ["none", res({} as AnswerSet)], ["bad", res(pick("nope", 0.9))]]),
  };
  return createHash("sha256").update(JSON.stringify(view)).digest("hex").slice(0, 32);
}

const BOARD = "k8tc-f17-t5";
/** An SL retry of the logged board (attempt 2, its compute at test sizes). */
function retryEnv(compute: Partial<typeof RETRY_COMPUTE> = {}): DecisionEnv {
  const sl = { attempt: 2, maxAttempts: 6, previousAttempts: { note: "the earlier attempt" }, showSim: true, compute: { ...RETRY_COMPUTE, rolloutSamples: 12, bossSimSamples: 6, ...compute } };
  return loggedEnv(logged(BOARD), { jevContext: "off", sl } as Partial<DecisionEnv>);
}
type Timing = { memo?: { rollout_ms?: number; boss_sim_ms?: number; hits: number; stored: number } };
const timingNow = () => plannerTiming.last as Timing | null;

describe("the planner with the memo (The Kin T5, B2 in this thread)", () => {
  afterEach(() => {
    rolloutLiveOptions.now = null;
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
    bossLinesOptions.enabled = false;
    bossLinesOptions.serial = false;
    bossLinesOptions.now = null;
    bossLinesOptions.samples = BOSS_LINES_SAMPLES;
    bossLinesOptions.deadlineMs = BOSS_LINES_DEADLINE_MS;
    bossLinesOptions.minMs = BOSS_LINES_MIN_MS;
    bossLinesOptions.holdHp = null;
    bossLinesOptions.workers = BOSS_LINES_WORKERS;
    releaseBossLinesPool();
    computeMemoOptions.enabled = true;
    rolloutTap.onRollout = null;
    dropComputeMemo();
  });

  // One function for the potions' hold values (it is in B2's key by identity, as the live table's is).
  const noHold = () => null;
  function setup(clock: () => () => number): void {
    rolloutLiveOptions.now = clock();
    potionMcOptions.now = clock();
    bossLinesOptions.now = clock();
    bossLinesOptions.enabled = true;
    bossLinesOptions.serial = true;
    bossLinesOptions.holdHp = noHold;
  }

  it("the same question and every resolution as without it; the board planned again comes from it, rollout and B2", () => {
    setup(() => () => 0);
    computeMemoOptions.enabled = false;
    const off = digestOf(planCombatTurn(retryEnv()));
    expect(currentComputeMemo()).toBeNull();
    computeMemoOptions.enabled = true;
    dropComputeMemo();
    const first = planCombatTurn(retryEnv());
    // The row's timing (beside the decision, not in its log): the planner's parts, its CPU, the load, B2's fights.
    const timing = plannerTiming.last as Record<string, unknown>;
    expect(Object.keys(timing)).toEqual(expect.arrayContaining(["planner_ms", "solve_ms", "mc_ms", "rollout_ms", "boss_sim_ms", "other_ms", "cpu_ms", "load1", "probe_ms"]));
    expect(timing["probe_ms"]).toBeGreaterThan(0);
    expect(timing["boss_sim"]).toEqual({ pairs: expect.any(Number), sims_done: 6 * (timing["boss_sim"] as { pairs: number }).pairs, samples: 6, workers: 0 });
    expect((first as AskDecision).resolve({} as AnswerSet).log).not.toHaveProperty("timing");
    expect(timingNow()?.memo).toMatchObject({ hits: 0 });
    expect(timingNow()?.memo?.rollout_ms).toBeUndefined();
    expect(currentComputeMemo()!.size).toBe(2);
    expect(digestOf(first)).toBe(off);
    const again = planCombatTurn(retryEnv());
    expect(timingNow()?.memo).toMatchObject({ rollout_ms: 0, boss_sim_ms: 0, hits: 2 });
    expect(digestOf(again)).toBe(off);
    // Not a retry (no env.sl): no memo, and the fight's goes.
    planCombatTurn(loggedEnv(logged(BOARD), { jevContext: "off" }));
    expect(currentComputeMemo()).toBeNull();
    expect(timingNow()?.memo).toBeUndefined();
  }, 300_000);

  it("on a worker pool (one worker): the run comes back too, keyed by the data the workers load, after the pool is built again", () => {
    setup(() => () => 0);
    bossLinesOptions.serial = false;
    bossLinesOptions.workers = 1;
    const first = planCombatTurn(retryEnv());
    expect((plannerTiming.last as { boss_sim?: { workers: number } }).boss_sim?.workers).toBe(1);
    expect(bossLinesPoolData()).toBe(workerDataSignature());
    // A question with no sample releases the pool (boss-lines.ts); the next one builds it again on the same data.
    releaseBossLinesPool();
    expect(bossLinesPoolData()).toBeNull();
    const again = planCombatTurn(retryEnv());
    expect(timingNow()?.memo).toMatchObject({ rollout_ms: 0, boss_sim_ms: 0, hits: 2 });
    expect(digestOf(again)).toBe(digestOf(first));
  }, 300_000);

  it("a hit is charged to the turn as the run was; B2 needs the deadline it took, a run its deadline cut is not kept", () => {
    setup(ticking);
    const env1 = retryEnv();
    const first = planCombatTurn(env1);
    const spentB2 = env1.screenMemory.bossLines!.spentMs;
    const spentRollout = env1.screenMemory.slRetryCompute!.spentMs;
    expect(spentB2).toBeGreaterThan(0);
    // The same board on a fresh turn memory: both from the memo, charged what the runs took (the rollout: its own time
    // plus this lookup's wall clock, which the ticking clock makes a few ms).
    setup(ticking);
    const env2 = retryEnv();
    const again = planCombatTurn(env2);
    expect(timingNow()?.memo?.boss_sim_ms).toBe(spentB2);
    expect(env2.screenMemory.bossLines!.spentMs).toBe(spentB2);
    expect(env2.screenMemory.slRetryCompute!.spentMs).toBeGreaterThanOrEqual(timingNow()!.memo!.rollout_ms!);
    expect(env2.screenMemory.slRetryCompute!.spentMs).toBeLessThan(spentRollout + 50);
    expect(digestOf(again, true)).toBe(digestOf(first, true));
    // B2's deadline shorter than the stored run took: run again (and that run, cut, is not kept).
    setup(ticking);
    bossLinesOptions.minMs = 1;
    bossLinesOptions.deadlineMs = Math.max(1, Math.floor(spentB2 / 2));
    const cut = planCombatTurn(retryEnv()) as AskDecision;
    expect(timingNow()?.memo?.boss_sim_ms).toBeUndefined();
    expect((cut.resolve({} as AnswerSet).log as { boss_sim: { timed_out: boolean } }).boss_sim.timed_out).toBe(true);
    const stored = currentComputeMemo()!.size;
    bossLinesOptions.deadlineMs = BOSS_LINES_DEADLINE_MS;
    setup(ticking);
    planCombatTurn(retryEnv());
    expect(timingNow()?.memo?.boss_sim_ms).toBe(spentB2);
    expect(currentComputeMemo()!.size).toBe(stored);
  }, 300_000);

  it("the rollout needs the budget the stored run needed: less, it runs again; enough, it comes from the memo", () => {
    setup(ticking);
    bossLinesOptions.enabled = false;
    let result: RolloutResult | null = null;
    rolloutTap.onRollout = (_input, r) => {
      result = r;
    };
    planCombatTurn(retryEnv());
    const stored = result as RolloutResult | null;
    expect(stored?.degraded).toEqual([]);
    const need = stored!.budgetNeedMs!;
    expect(need).toBeGreaterThan(0);
    // The question's budget (the SL compute's, the usual one under it) just the stored run's need: what is left of it after
    // the rollout's margin is less, so not from the memo.
    rolloutLiveOptions.budgetMs = 1;
    setup(ticking);
    bossLinesOptions.enabled = false;
    planCombatTurn(retryEnv({ rolloutBudgetMs: need }));
    expect(timingNow()?.memo?.rollout_ms).toBeUndefined();
    // A second's more than it needed: from the memo.
    setup(ticking);
    bossLinesOptions.enabled = false;
    planCombatTurn(retryEnv({ rolloutBudgetMs: need + 1_000 }));
    expect(timingNow()?.memo?.rollout_ms).toBe(stored!.elapsedMs);
  }, 300_000);
});

describe("the rollout's least budget (budgetNeedMs)", () => {
  afterEach(() => {
    rolloutLiveOptions.now = null;
    potionMcOptions.now = null;
    rolloutTap.onRollout = null;
  });

  it("with exactly that budget the same run is cut nowhere and gives the same result; with less, it is cut", () => {
    rolloutLiveOptions.now = () => 0;
    potionMcOptions.now = () => 0;
    let input: RolloutInput | null = null;
    rolloutTap.onRollout = (i) => {
      input ??= i;
    };
    planCombatTurn(loggedEnv(logged(BOARD), { jevContext: "off" }));
    const base = input as RolloutInput | null;
    expect(base).not.toBeNull();
    const run = (budgetMs: number) => rolloutDecision({ ...base!, options: { ...base!.options, now: ticking(), budgetMs } });
    const free = run(1e9);
    expect(free.degraded).toEqual([]);
    const need = free.budgetNeedMs!;
    expect(need).toBeGreaterThan(0);
    const exact = run(need);
    expect(exact.degraded).toEqual([]);
    expect(JSON.stringify({ ...exact, elapsedMs: 0, budgetNeedMs: 0 })).toBe(JSON.stringify({ ...free, elapsedMs: 0, budgetNeedMs: 0 }));
    expect(run(need - 1).degraded.length).toBeGreaterThan(0);
  }, 120_000);
});

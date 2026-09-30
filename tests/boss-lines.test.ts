/**
 * B2's line comparison (src/sim/boss-lines.ts, docs/boss-sim.md §11) on the synthetic boards of
 * tests/boss-sim-fixture.ts: no knowledge data, no model call, nothing written. Common random numbers and determinism,
 * the worker pool against the serial run, the deadline, the ranking's ties, low-trust bosses, and the fight plan
 * summarised from the best line's samples.
 */

import { afterAll, describe, expect, it } from "vitest";

import { availableParallelism } from "node:os";

import { BOSS_LINES_WORKERS, BossLinesPool, bossKeyOf, bossLinesOptions, fightPlanText, LOW_TRUST_BOSSES, rankLines, runLines, runPairsSerial, linesInput, lineSimText, simWinsLess, type BossLineSim } from "../src/sim/boss-lines.js";
import { BuildSimPool } from "../src/sim/build-sim-pool.js";
import { simPoolsHolding } from "../src/sim/sim-pools.js";
import { summarizeLine, type BossSimLineResult, type FightSampleResult } from "../src/sim/boss-sim.js";
import type { Plan } from "../src/strategy/turn-solver.js";
import { board } from "./boss-sim-fixture.js";

const noHold = () => null;
const pool = new BossLinesPool(3);
afterAll(async () => {
  await pool.close();
});

/** A sample with the given outcome (the fields the ranking and the plan read). */
function sample(won: boolean, hpLoss: number, turns: number, over: Partial<FightSampleResult> = {}): FightSampleResult {
  return {
    won,
    died: !won,
    capped: false,
    timeUp: false,
    turns,
    hpLoss,
    revived: 0,
    drunk: [],
    enemyHpLeft: won ? 0 : 50,
    lossByTurn: Array.from({ length: turns }, () => hpLoss / turns),
    dmgByTurn: Array.from({ length: turns }, () => 20),
    incomingByTurn: Array.from({ length: turns }, () => 10),
    enemyLossByTurn: Array.from({ length: turns }, () => hpLoss / turns),
    blockByTurn: Array.from({ length: turns }, () => 5),
    powers: [],
    drinks: [],
    kills: won ? [[turns, "TEST_BOSS", 0]] : [],
    policyTurns: turns,
    policyNodes: 0,
    ...over,
  };
}
const line = (i: number, outcomes: FightSampleResult[]): BossSimLineResult => summarizeLine(i, outcomes);

describe("B2 lines: common random numbers, determinism, the pool, the deadline", () => {
  it("every line on the same seeds: the same line twice is the same, sample by sample; serial and pool agree", () => {
    const input = board();
    const lines = input.plans.slice(0, 3);
    const a = runLines(input, [lines[0]!, lines[0]!, lines[1]!], { samples: 40, seed: 3, deadlineMs: Infinity, serial: true, holdHp: noHold });
    expect(a.samples).toBe(40);
    expect(a.lines[0]!.outcomes).toEqual(a.lines[1]!.outcomes);
    const again = runLines(input, [lines[0]!, lines[0]!, lines[1]!], { samples: 40, seed: 3, deadlineMs: Infinity, serial: true, holdHp: noHold });
    expect(again.lines.map((l) => l.outcomes)).toEqual(a.lines.map((l) => l.outcomes));
    const slim = linesInput(input, noHold);
    const pairs = lines.map((plan) => ({ plan, order: null }));
    const serial = runPairsSerial(slim, pairs, 30, 9);
    const pooled = pool.run(slim, pairs, 30, 9, 60_000);
    expect(pooled.timedOut).toBe(false);
    expect(pooled.complete).toHaveLength(30);
    expect(pooled.outcomes).toEqual(serial.outcomes);
  }, 60_000);

  it("the deadline: the samples every line finished, the same ones for every line, and the count in the text", () => {
    const input = board();
    const slim = linesInput(input, noHold);
    const pairs = input.plans.slice(0, 2).map((plan) => ({ plan, order: null }));
    const cut = pool.run(slim, pairs, 20_000, 1, 400);
    expect(cut.timedOut).toBe(true);
    expect(cut.complete.length).toBeLessThan(20_000);
    for (const i of cut.complete) expect(cut.outcomes.every((row) => row[i] !== undefined)).toBe(true);
    // The pool is ready for the next question right away (the workers dropped the rest of the job).
    const next = pool.run(slim, pairs, 20, 1, 60_000);
    expect(next.complete).toHaveLength(20);
    const text = lineSimText(line(0, [sample(true, 10, 5)]), 0.9, null, { samples: 412, requested: 600, timedOut: true }, 4, { best: true, winTied: true, lowTrust: null });
    expect(text).toContain("412 of 600 samples (time limit)");
    // A serial run stops at its deadline too (a clock that moves 1 ms a call).
    let t = 0;
    const serial = runPairsSerial(slim, pairs, 100, 1, 5, () => (t += 1));
    expect(serial.timedOut).toBe(true);
    expect(serial.complete.length).toBeLessThan(100);
  }, 60_000);
});

describe("B2 ranking", () => {
  // 100 paired samples: A wins 60, B 58 (the same samples but two), C 30.
  const outcomes = (wins: number, loss: number) => Array.from({ length: 100 }, (_, i) => (i < wins ? sample(true, loss, 6) : sample(false, 80, 7)));
  it("the top win rate's tie group (within 2 paired standard errors), then the least HP lost", () => {
    const a = line(0, outcomes(60, 20));
    const b = line(1, outcomes(58, 12));
    const c = line(2, outcomes(30, 5));
    const r = rankLines([a, b, c]);
    // B is 2 points below A on the same samples: within 2 SE, and it loses less HP when it wins.
    expect(r.winTied).toEqual([true, true, false]);
    expect(r.best).toBe(1);
    expect(r.tied).toEqual([]);
    expect(r.vsBest[0]!.winDiff).toBeCloseTo(0.02, 5);
    expect(r.vsBest[2]!.winDiff).toBeCloseTo(-0.28, 5);
  });

  it("V4.2: within the tie group, the least HP lost in the samples won (median), not the mean over every sample; code's fallback ranks the same", () => {
    // A wins 59 (losing 20 each), B 62 (losing 22 each): B's 3 more wins make its mean over every sample lower (44.0
    // against 44.6, a death counting 80), but A loses less when it wins.
    const a = line(0, outcomes(59, 20));
    const b = line(1, outcomes(62, 22));
    expect(b.hpLoss.mean).toBeLessThan(a.hpLoss.mean);
    const r = rankLines([a, b]);
    expect(r.winTied).toEqual([true, true]);
    expect(r.best).toBe(0);
    // Code's fallback (the potion-free lines): the same criterion.
    const dry = line(2, outcomes(62, 22));
    expect(rankLines([dry, a, b], 2, (i) => i !== 2).best).toBe(1);
    expect(rankLines([a, b, dry], 2, (i) => i !== 0).tied).toEqual([1, 2]);
    // A line with no winning sample comes last in its tie group.
    const none = line(0, Array.from({ length: 100 }, () => sample(false, 80, 7)));
    const one = line(1, Array.from({ length: 100 }, (_, i) => (i === 0 ? sample(true, 60, 6) : sample(false, 80, 7))));
    expect(rankLines([none, one]).best).toBe(1);
  });

  it("lines whose shown numbers are the same are tied: no single best", () => {
    const a = line(0, outcomes(60, 20));
    const b = line(1, outcomes(60, 20));
    const r = rankLines([a, b]);
    expect(r.tied).toEqual([0, 1]);
  });

  it("only eligible lines rank (code's fallback: potion-free lines)", () => {
    const a = line(0, outcomes(90, 20));
    const b = line(1, outcomes(40, 12));
    expect(rankLines([a, b], 2, (i) => i === 1).best).toBe(1);
  });

  it("the HP guard never swaps into a line the simulation sees winning less beyond 2 standard errors", () => {
    const pick = { steps: [] } as unknown as Plan;
    const worse = { steps: [] } as unknown as Plan;
    const close = { steps: [] } as unknown as Plan;
    const lines = [line(0, outcomes(60, 20)), line(1, outcomes(30, 5)), line(2, outcomes(59, 10))];
    const byPlan = new Map([pick, worse, close].map((plan, i) => [plan, { result: { ...lines[i]!, order: null }, calibrated: 0.5, vsBest: null, winTied: true, text: "" }]));
    const sim = { available: true, byPlan } as unknown as BossLineSim;
    expect(simWinsLess(sim, worse, pick)).toBe(true);
    expect(simWinsLess(sim, close, pick)).toBe(false);
    expect(simWinsLess(null, worse, pick)).toBe(false);
  });

  it("low-trust bosses by their enemies: the Crab's claws, the Queen, the Test Subject, and others", () => {
    expect(bossKeyOf(["CRUSHER", "ROCKET"])).toBe("KAISER_CRAB");
    expect(bossKeyOf(["TORCH_HEAD_AMALGAM", "QUEEN"])).toBe("QUEEN");
    expect(bossKeyOf(["KIN_FOLLOWER", "KIN_PRIEST"])).toBe("THE_KIN");
    expect(Object.keys(LOW_TRUST_BOSSES).sort()).toEqual(["AEONGLASS", "KAISER_CRAB", "KNOWLEDGE_DEMON", "QUEEN", "TEST_SUBJECT", "THE_INSATIABLE"]);
    expect(LOW_TRUST_BOSSES[bossKeyOf(["SOUL_FYSH"])!]).toBeUndefined();
    const text = lineSimText(line(0, outcomes(60, 20)), 0.6, null, { samples: 100, requested: 100, timedOut: false }, 2, { best: true, winTied: true, lowTrust: LOW_TRUST_BOSSES["QUEEN"]! });
    expect(text.startsWith("low confidence: win 60% (the simulation's best line)")).toBe(true);
  });
});

describe("B2 fight plan", () => {
  it("what most winning samples do, in fight turns: Powers, the hardest hits (incoming only, V4.2: no simulated block), kills, potions, the end", () => {
    const input = board();
    input.solver.hand.push({ ...input.solver.hand[0]!, cardId: "INFLAME", name: "Inflame", type: "Power" });
    const won = (k: number) =>
      sample(true, 20, 7, {
        powers: k % 4 === 3 ? [] : [[1, "INFLAME"]],
        incomingByTurn: [10, 10, 10, 34, 10, 10, 36],
        blockByTurn: [5, 5, 5, 30, 5, 5, 28],
        drinks: k % 2 === 0 ? [[4, "BLOCK_POTION"]] : [],
      });
    const outcomes = [...Array.from({ length: 40 }, (_, k) => won(k)), ...Array.from({ length: 10 }, () => sample(false, 70, 5))];
    // From fight turn 3: the plan's turns are fight turns (the start turn is T3).
    const text = fightPlanText(input, line(0, outcomes), 3)!;
    expect(text).toBe("T3 play Inflame; T6, T9 the enemies hit hardest (incoming ~34, ~36); drink block potion ~T6; the boss dies ~T9 (median of 40 winning samples)");
    expect(text).not.toMatch(/block ~/);
    // Few winning samples: the plan says so.
    const losing = fightPlanText(input, line(0, Array.from({ length: 20 }, (_, k) => (k < 3 ? sample(true, 10, 6) : sample(false, 70, 4)))), 1)!;
    expect(losing).toContain("no plan wins in most samples: 3/20 won");
  });
});

describe("V4.2 worker pools", () => {
  it("a boss fight's pool has 20 workers by default (BOSS_SIM_WORKERS unset), fewer on a machine with few cores", () => {
    expect(process.env["BOSS_SIM_WORKERS"]).toBeUndefined();
    expect(BOSS_LINES_WORKERS).toBe(20);
    expect(bossLinesOptions.workers).toBe(20);
    expect(new BossLinesPool().size).toBe(Math.max(1, Math.min(24, availableParallelism() - 2, 20)));
  });

  it("B2's and B3's pools never hold workers at once: each one starting its workers releases the other's; the released one starts again on its next run", async () => {
    const build = new BuildSimPool(2);
    const lines = new BossLinesPool(2);
    const input = board();
    const req = { base: input, decks: [{}], orders: [null], samples: 2, seed: 1 };
    const pairs = [{ plan: input.plans[0]!, order: null }];
    try {
      expect((await build.run(req)).complete).toHaveLength(2);
      expect(build.live).toBe(2);
      expect(simPoolsHolding()).toContain("build");
      // A boss fight's first question: the build pool's workers go.
      expect(lines.run(linesInput(input, noHold), pairs, 2, 1, 60_000).complete).toHaveLength(2);
      expect(build.live).toBe(0);
      expect(lines.live).toBe(2);
      expect(simPoolsHolding()).not.toContain("build");
      // The next deck-building question: its workers start again, and the boss pool's go.
      expect((await build.run(req)).complete).toHaveLength(2);
      expect(build.live).toBe(2);
      expect(lines.live).toBe(0);
      expect(simPoolsHolding()).not.toContain("boss-lines");
    } finally {
      await build.close();
      await lines.close();
    }
    expect(simPoolsHolding()).not.toContain("build");
  }, 120_000);
});

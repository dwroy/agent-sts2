/**
 * Whole boss fight simulator (src/sim/boss-sim.ts, rollout.ts simulateFight): deterministic under a seed, plays to the
 * fight's end and no further, stops at the turn cap, the worker pool gives the serial numbers exactly, and lines are
 * compared on common random numbers; plus the whole-fight scripts (rollout.ts fightNextMove). Synthetic boards only:
 * no knowledge data refreshed per run, no model call, nothing written.
 */

import { describe, expect, it } from "vitest";

import { BOSS_SIM_PLATT, BossSimPool, calibratedWinProb, compareLines, fightOrders, redealInput, runBestOrder, runBossSim, sampleSeed, slimInput } from "../src/sim/boss-sim.js";
import { fightRelicsOf, relicBlockOf } from "../src/reflex/rollout-live.js";
import { policyWeights, rolloutDecision, simulateFight, type EnemyTable, type RolloutInput } from "../src/reflex/rollout.js";
import { solveTap, solveTurn, type EnemySim } from "../src/reflex/turn-solver.js";
import { board, card, defend, liveDigest, strike } from "./boss-sim-fixture.js";

const pick = (r: ReturnType<typeof runBossSim>) => r.lines.map((l) => ({ win: l.winProb, loss: l.hpLoss, turns: l.turns, outcomes: l.outcomes.map((o) => [o.won, o.died, o.turns, o.hpLoss]) }));

describe("boss sim (whole fight)", () => {
  it("is deterministic under a seed, and another seed changes it", () => {
    const input = board();
    const a = runBossSim(input, input.plans.slice(0, 2), { samples: 12, seed: 5 });
    const b = runBossSim(input, input.plans.slice(0, 2), { samples: 12, seed: 5 });
    expect(pick(a)).toEqual(pick(b));
    const c = runBossSim(input, input.plans.slice(0, 2), { samples: 12, seed: 6 });
    expect(pick(c)).not.toEqual(pick(a));
  });

  it("plays every sample to the fight's end and no further", () => {
    const input = board();
    const res = runBossSim(input, [input.plans[0]!], { samples: 16, seed: 3 });
    const line = res.lines[0]!;
    expect(line.wins + line.deaths + line.capped).toBe(16);
    expect(line.capped).toBe(0);
    for (let i = 0; i < 16; i += 1) {
      const { records } = simulateFight(slimInput(input), input.plans[0]!, 30, sampleSeed(3, i));
      const ends = records.map((r) => r.won || r.died);
      // Only the last turn ends the fight.
      expect(ends.slice(0, -1).every((end) => !end)).toBe(true);
      expect(ends[ends.length - 1]).toBe(true);
      expect(line.outcomes[i]!.turns).toBe(records.length);
    }
    // A death costs all our HP; a win at most that.
    for (const o of line.outcomes) expect(o.died ? o.hpLoss === 70 : o.hpLoss <= 70).toBe(true);
  });

  it("stops at the turn cap: a fight nobody can end is capped, not won or lost", () => {
    // A boss that never attacks and gains 999 block a turn: nothing ends the fight.
    const wall: EnemyTable = { moves: { WALL: { damage: 0, hits: 1, strength: 0, block: 999 } }, next: { WALL: { WALL: 1 } } };
    const sim: EnemySim = { index: 0, name: "Wall", hp: 500, maxHp: 500, block: 999, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] };
    const input = board({ enemies: [{ sim, info: { index: 0, id: "WALL", move: "WALL", strength: 0, powers: {} } }], tables: { WALL: wall } });
    const res = runBossSim(input, [input.plans[0]!], { samples: 3, seed: 1, maxTurns: 7 });
    const line = res.lines[0]!;
    expect(line.capped).toBe(3);
    expect(line.wins + line.deaths).toBe(0);
    expect(line.outcomes.every((o) => o.turns === 7)).toBe(true);
  });

  it("runs on worker threads with exactly the serial numbers", async () => {
    const input = board();
    const lines = input.plans.slice(0, 3);
    const serial = runBossSim(input, lines, { samples: 20, seed: 11 });
    const pool = new BossSimPool(3);
    try {
      const parallel = await pool.run(input, lines, { samples: 20, seed: 11 });
      expect(parallel.workers).toBeGreaterThan(0);
      expect(pick(parallel)).toEqual(pick(serial));
      // A second run on the same pool (the workers kept): the same again.
      const again = await pool.run(input, lines, { samples: 20, seed: 11 });
      expect(pick(again)).toEqual(pick(serial));
    } finally {
      await pool.close();
    }
  }, 60_000);

  it("compares lines on common random numbers: the same seed per sample, the same enemy moves", () => {
    const input = board({ bossHp: 400, playerHp: 80 });
    const [a, b] = [input.plans[0]!, input.plans[input.plans.length - 1]!];
    expect(a).not.toBe(b);
    // The same line twice: sample by sample identical, a paired difference of exactly 0.
    const twice = runBossSim(input, [a, a], { samples: 8, seed: 2 });
    expect(twice.lines[0]!.outcomes).toEqual(twice.lines[1]!.outcomes);
    expect(compareLines(twice.lines[0]!, twice.lines[1]!)).toMatchObject({ samples: 8, winDiff: 0, winSe: 0, hpLossDiff: 0, hpLossSe: 0, onlyA: 0, onlyB: 0 });
    // Two lines: the paired difference is the difference of the means.
    const both = runBossSim(input, [a, b], { samples: 8, seed: 2 });
    const cmp = compareLines(both.lines[0]!, both.lines[1]!);
    expect(cmp.winDiff).toBeCloseTo(both.lines[0]!.winProb - both.lines[1]!.winProb, 6);
    expect(cmp.hpLossDiff).toBeCloseTo(both.lines[0]!.hpLoss.mean - both.lines[1]!.hpLoss.mean, 1);
    // Two different lines: the boss's move each turn is the same while both fights go on (its own random stream).
    for (let i = 0; i < 8; i += 1) {
      const ra = simulateFight(slimInput(input), a, 30, sampleSeed(2, i)).records;
      const rb = simulateFight(slimInput(input), b, 30, sampleSeed(2, i)).records;
      const n = Math.min(ra.length, rb.length);
      expect(n).toBeGreaterThan(1);
      const moves = (records: typeof ra) => records.slice(0, n).map((r) => r.snap.E.find((e) => e[0] === 0)?.[8] ?? null);
      expect(moves(ra)).toEqual(moves(rb));
    }
  });

  it("the Queen burns bright while the Amalgam lives, then Off With Your Head", () => {
    const queen: EnemyTable = {
      moves: { BURN_BRIGHT_FOR_ME_MOVE: { damage: 0, hits: 1, strength: 0, block: 0 }, OFF_WITH_YOUR_HEAD_MOVE: { damage: 3, hits: 5, strength: 0, block: 0 } },
      next: { BURN_BRIGHT_FOR_ME_MOVE: { BURN_BRIGHT_FOR_ME_MOVE: 1, OFF_WITH_YOUR_HEAD_MOVE: 1 }, OFF_WITH_YOUR_HEAD_MOVE: { BURN_BRIGHT_FOR_ME_MOVE: 1 } },
    };
    const amalgam: EnemyTable = { moves: { TACKLE: { damage: 5, hits: 1, strength: 0, block: 0 } }, next: { TACKLE: { TACKLE: 1 } } };
    const run = (amalgamHp: number) => {
      const enemies: { sim: EnemySim; info: RolloutEnemy }[] = [
        { sim: { index: 0, name: "Queen", hp: 300, maxHp: 300, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] } as EnemySim, info: { index: 0, id: "QUEEN", move: "BURN_BRIGHT_FOR_ME_MOVE", strength: 0, powers: {} } },
        {
          sim: { index: 1, name: "Amalgam", hp: amalgamHp, maxHp: 200, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, minion: true, attacks: [{ damage: 5, hits: 1 }] } as EnemySim,
          info: { index: 1, id: "TORCH_HEAD_AMALGAM", move: "TACKLE", strength: 0, powers: { MINION_POWER: 1 } },
        },
      ];
      const base = board({ enemies, tables: { QUEEN: queen, TORCH_HEAD_AMALGAM: amalgam }, playerHp: 80 });
      const solver = { ...base.solver, hand: base.solver.hand.map((c) => (c.target === "single" ? { ...c, validTargets: [0, 1] } : c)) };
      const input = { ...base, solver, plans: solveTurn(solver).plans };
      // A line that kills the Amalgam when it can (the solver chips minions at a discount).
      const plan = input.plans.find((p) => p.outcome.enemyHpAfter.some((e) => e.index === 1 && e.hp <= 0)) ?? input.plans[0]!;
      return simulateFight(slimInput(input), plan, 4, 9).records.map((r) => r.snap.E.find((e) => e[0] === 0)?.[8]);
    };
    // A 200-HP Amalgam outlives 4 turns: Burn Bright every turn (the move model alone left it half the time).
    expect(run(200)).toEqual(["BURN_BRIGHT_FOR_ME_MOVE", "BURN_BRIGHT_FOR_ME_MOVE", "BURN_BRIGHT_FOR_ME_MOVE", "BURN_BRIGHT_FOR_ME_MOVE"]);
    // A 1-HP Amalgam dies on turn 1: Off With Your Head next.
    expect(run(1).slice(0, 2)).toEqual(["BURN_BRIGHT_FOR_ME_MOVE", "OFF_WITH_YOUR_HEAD_MOVE"]);
  });

  it("a living Waterfall Giant never explodes; its Pressure Gun grows each use", () => {
    const giant: EnemyTable = {
      moves: {
        STOMP_MOVE: { damage: 5, hits: 1, strength: 0, block: 0 },
        PRESSURE_GUN_MOVE: { damage: 20, hits: 1, strength: 0, block: 0, growth: 5 },
        EXPLODE_MOVE: { damage: 60, hits: 1, strength: 0, block: 0 },
      },
      next: { STOMP_MOVE: { PRESSURE_GUN_MOVE: 9, EXPLODE_MOVE: 1 }, PRESSURE_GUN_MOVE: { STOMP_MOVE: 9, EXPLODE_MOVE: 1 } },
    };
    const sim: EnemySim = { index: 0, name: "Giant", hp: 2000, maxHp: 2000, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 5, hits: 1 }] };
    const input = board({ enemies: [{ sim, info: { index: 0, id: "WATERFALL_GIANT", move: "STOMP_MOVE", strength: 0, powers: {} } }], tables: { WATERFALL_GIANT: giant }, playerHp: 80 });
    for (let seed = 1; seed <= 5; seed += 1) {
      const records = simulateFight(slimInput(input), input.plans[0]!, 12, seed).records;
      const moves = records.map((r) => r.snap.E[0]![8]);
      expect(moves).not.toContain("EXPLODE_MOVE");
      // The shown intent of each Pressure Gun: 20, 25, 30 … (turn 1's intents are the board's).
      const guns = records.slice(1).filter((r) => r.snap.E[0]![8] === "PRESSURE_GUN_MOVE").map((r) => r.snap.E[0]![7]);
      expect(guns).toEqual(guns.map((_, k) => 20 + 5 * k));
    }
  });

  it("the Matriarch sleeps its Asleep turns and wakes early when hurt, its Plating gone", () => {
    const matriarch: EnemyTable = {
      moves: { SLEEP_MOVE: { damage: 0, hits: 1, strength: 0, block: 0 }, SLASH_MOVE: { damage: 19, hits: 1, strength: 0, block: 0 } },
      next: { SLEEP_MOVE: { SLEEP_MOVE: 6, SLASH_MOVE: 4 }, SLASH_MOVE: { SLASH_MOVE: 1 } },
    };
    const run = (hand: CardModel[]) => {
      const sim: EnemySim = { index: 0, name: "Matriarch", hp: 233, maxHp: 233, block: 12, vulnerable: 0, weak: 0, artifact: 0, intangible: false, asleep: 3, attacks: [] };
      const input = board({ enemies: [{ sim, info: { index: 0, id: "LAGAVULIN_MATRIARCH", move: "SLEEP_MOVE", strength: 0, powers: { ASLEEP_POWER: 3, PLATING_POWER: 12 } } }], tables: { LAGAVULIN_MATRIARCH: matriarch }, playerHp: 80 });
      const solver = { ...input.solver, hand };
      const plans = solveTurn(solver).plans;
      const plan = plans.find((p) => (p.outcome.damageDealt > 0) === hand.some((c) => c.damage !== null)) ?? plans[0]!;
      return simulateFight(slimInput({ ...input, solver, plans }), plan, 5, 4).records.map((r) => r.snap.E[0]![8]);
    };
    // Untouched on turn 1: asleep through turn 3, Slash on turn 4 (logged: Asleep 3/2/1, first attack T4).
    const quiet = run([defend(0), defend(1), defend(2)]);
    expect(quiet.slice(0, 4)).toEqual(["SLEEP_MOVE", "SLEEP_MOVE", "SLEEP_MOVE", "SLASH_MOVE"]);
    // Hurt through its block on turn 1: stunned that enemy turn, Slash on turn 2 (logged 0NZB: 233 -> 173, Slash T2).
    const hurt = run([strike(0), strike(1), card(2, "HEAVY", { damage: 20 })]);
    expect(hurt.slice(0, 2)).toEqual(["SLEEP_MOVE", "SLASH_MOVE"]);
  });
});

/** liveDigest() as computed at 89b8cd0, before the B1.5 policy knobs, turn relics and the policy's own start turn. */
const LIVE_DIGEST_89B8CD0 = '[[["BASH>0,STRIKE>0",8.6,10,17],["DEFEND>-,BASH>0",6.4,5,8],["STRIKE>0,BASH>0",6.2,10,14],["STRIKE>0,DEFEND>-,DEFEND>-",4.8,0,6],["STRIKE>0,STRIKE>0,DEFEND>-",4.6,5,12],["BASH>0",1.4,10,8]],[["BASH,STRIKE",45.677,0.927,6.25,0,0],["DEFEND,BASH",38.699,0.94,6.625,0,0],["STRIKE,BASH",41.302,0.943,6.5,0,0],["STRIKE,DEFEND,DEFEND",36.766,0.938,7,0,0]],[["STRIKE>0,DEFEND>-,DEFEND>-",4.8,0,6],["DEFEND>-,BASH>0",1.713,5,8],["DEFEND>-,DEFEND>-",0,0,0],["STRIKE>0,STRIKE>0,DEFEND>-",-0.087,5,12],["BASH>0,STRIKE>0",-0.775,10,17],["STRIKE>0,BASH>0",-3.175,10,14]],[["STRIKE,DEFEND,DEFEND",15,0.248,8,0,0],["DEFEND,BASH",16,0.258,7.375,0,0],["DEFEND,DEFEND",14.375,0.261,8,0,0],["BASH,STRIKE",17.25,0.12,7.2,3,0]],[["BASH>0,STRIKE>0",8.6,10,17],["DEFEND>-,BASH>0",6.4,5,8],["STRIKE>0,BASH>0",6.2,10,14],["STRIKE>0,DEFEND>-,DEFEND>-",4.8,0,6],["STRIKE>0,STRIKE>0,DEFEND>-",4.6,5,12],["BASH>0",1.4,10,8]],[["BASH,STRIKE",11.125,1,2.625,0,8],["DEFEND,BASH",14.625,1,3.75,0,8],["STRIKE,BASH",11.125,1,2.625,0,8],["STRIKE,DEFEND,DEFEND",9.75,1,5,0,8]],[["BASH>0,STRIKE>0",-3.36,24,17],["STRIKE>0,BASH>0",-6.12,24,14],["DEFEND>-,BASH>0",-6.64,19,8],["STRIKE>0,STRIKE>0,DEFEND>-",-7.96,19,12],["STRIKE>0,DEFEND>-,DEFEND>-",-8.48,14,6],["BASH>0",-11.64,24,8]],[["BASH,STRIKE",69.5,0.087,7.6,3,0],["STRIKE,BASH",69.5,0.079,7.8,3,0],["DEFEND,BASH",68.875,0.099,8.167,2,0],["STRIKE,DEFEND,DEFEND",69.5,0.086,8.167,2,0]]]';

describe("boss sim B1.5: the policy knobs change the whole-fight sim only", () => {
  it("the live solver and 5-turn rollout give the numbers they gave before B1.5", () => {
    expect(JSON.stringify(liveDigest())).toBe(LIVE_DIGEST_89B8CD0);
  });

  it("the rollout ignores the whole-fight-only turn relics; unset knobs give the solver no knob", () => {
    const input = board();
    const opts = { budgetMs: 1e9, seed: 3, samples: 8, horizon: 5, k: 3 };
    const digest = (i: RolloutInput) => rolloutDecision({ ...i, options: opts }).lines.map((l) => [l.hpLoss, l.winProb, l.turnsToWin, l.deaths]);
    const relics = { energy: [{ amount: 3, turn: 2 }], block: [{ amount: 30, turn: 2 }] };
    expect(digest({ ...input, fightRelics: relics })).toEqual(digest(input));
    expect(policyWeights({}, input.solver.player, input.solver.enemies)).toEqual({});
    expect(policyWeights({ policyDamageScale: 0.5 }, input.solver.player, input.solver.enemies)).toEqual({ damageScale: 0.5 });
  });

  it("the HP weight knob: x hpScale x (1 + threat x this turn's attack / our HP), and a heavier HP weight blocks more", () => {
    const hit = (damage: number): EnemySim => ({ index: 0, name: "Boss", hp: 120, maxHp: 120, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage, hits: 1 }] });
    expect(policyWeights({ policyThreat: 2 }, { hp: 50 }, [hit(25)])).toEqual({ hpScale: 2 });
    expect(policyWeights({ policyHpScale: 1.5, policyThreat: 2, policyDamageScale: 1 }, { hp: 50 }, [hit(25)])).toEqual({ damageScale: 1, hpScale: 3 });
    expect(policyWeights({ policyThreat: 2 }, { hp: 50 }, [{ ...hit(25), hp: 0 }])).toEqual({ hpScale: 1 });
    // Two Strikes or two Defends into an 8 hit: the live weights take the damage, a heavy HP weight the block.
    const solver = { ...board().solver, hand: [strike(0), strike(1), defend(2), defend(3)], enemies: [hit(8)], player: { ...board().solver.player, energy: 2 } };
    const live = solveTurn(solver).plans[0]!;
    const heavy = solveTurn({ ...solver, hpScale: 4 }).plans[0]!;
    expect(live.outcome.hpLoss).toBeGreaterThan(heavy.outcome.hpLoss);
    expect(heavy.outcome.blockGained).toBeGreaterThan(live.outcome.blockGained);
  });

  it("no line: the policy plays the start turn too, the line it would pick", () => {
    const input = board();
    const slim = slimInput(input);
    const weights = policyWeights(slim.options!, input.solver.player, input.solver.enemies);
    const own = solveTurn({ ...input.solver, ...weights, maxNodes: slim.options!.policyNodes }).plans[0]!;
    for (const seed of [1, 2, 3]) {
      const a = simulateFight(slim, null, 30, seed).records;
      const b = simulateFight(slim, own, 30, seed).records;
      expect(a.map((r) => [r.loss, r.dmg, r.won, r.died])).toEqual(b.map((r) => [r.loss, r.dmg, r.won, r.died]));
    }
  });

  it("redeal: a pre-fight start has every card in the draw pile, the hand drawn in the sample, the entry HP", () => {
    const input = board();
    const pre = redealInput(input, { fresh: true, hp: 55 });
    expect(pre.solver.hand).toEqual([]);
    expect(pre.piles.draw.length).toBe(input.piles.draw.length + input.piles.discard.length + 5);
    expect(pre.options?.drawFirst).toBe(5);
    expect(pre.solver.player.hp).toBe(55);
    const hands: string[] = [];
    solveTap.onSolve = (i) => {
      hands.push(i.hand.map((c) => c.cardId).sort().join(","));
    };
    try {
      simulateFight(slimInput(pre), null, 1, 7);
      simulateFight(slimInput(pre), null, 1, 8);
    } finally {
      solveTap.onSolve = null;
    }
    // Five cards drawn from the shuffle, differently under another seed (12 cards: 6 Strikes, 5 Defends, a Bash).
    expect(hands.every((h) => h.split(",").length === 5)).toBe(true);
    const res = runBossSim(pre, [null], { samples: 40, seed: 2 });
    expect(res.lines[0]!.outcomes.every((o) => o.hpLoss <= 55)).toBe(true);
    // The same deck twice on the same seeds: no difference; a deck less its Bash is compared sample by sample.
    const again = runBossSim(pre, [null], { samples: 40, seed: 2 });
    expect(compareLines(again.lines[0]!, res.lines[0]!)).toMatchObject({ winDiff: 0, hpLossDiff: 0 });
  });

  it("turn relics: Candelabra 2 energy on turn 2, Chandelier 3 on turn 3, Horn Cleat 14 block on turn 2, Happy Flower every 3rd turn", () => {
    const relic = (id: string, stack: number | null = null) => ({ relic_id: id, stack });
    // PASSIVE_PIECES off: Horn Cleat is the whole fight's alone; on, it is relicBlockOf's (the 5-turn rollout's too) and
    // left out here, so the whole fight's turn 2 gets it once.
    expect(fightRelicsOf({ relics: [relic("CANDELABRA"), relic("CHANDELIER"), relic("HORN_CLEAT"), relic("HAPPY_FLOWER", 1), relic("ANCHOR")] }, 1, 10, false)).toEqual({
      energy: [{ amount: 2, turn: 2 }, { amount: 3, turn: 3 }, { amount: 1, turn: 3 }, { amount: 1, turn: 6 }, { amount: 1, turn: 9 }],
      block: [{ amount: 14, turn: 2 }],
    });
    expect(fightRelicsOf({ relics: [relic("HORN_CLEAT")] }, 1, 10, true).block).toEqual([]);
    expect(relicBlockOf({ relics: [relic("HORN_CLEAT")] }, 40, true)).toEqual([{ amount: 14, turn: 2 }]);
    expect(relicBlockOf({ relics: [relic("HORN_CLEAT")] }, 40, false)).toEqual([]);
    expect(fightRelicsOf({ relics: [relic("HAPPY_FLOWER", 0)] }, 4, 10).energy.map((e) => e.turn)).toEqual([7, 10]);
    // The whole fight's turn 2 gets them; the rollout's turn 2 (the live planner's) does not.
    const input = { ...board(), fightRelics: { energy: [{ amount: 2, turn: 2 }], block: [{ amount: 14, turn: 2 }] } };
    const seen: [number, number][] = [];
    solveTap.onSolve = (i) => {
      seen.push([i.player.energy, i.player.block]);
    };
    try {
      simulateFight(slimInput(input), input.plans[0]!, 2, 1);
      simulateFight(slimInput(input), input.plans[0]!, 2, 1, false);
    } finally {
      solveTap.onSolve = null;
    }
    expect(seen[0]![0]).toBe(5);
    expect(seen[0]![1]).toBeGreaterThanOrEqual(14);
    expect(seen[1]![0]).toBe(3);
  });

  it("kill orders: one per order of two kinds of enemy, none for one; each line keeps its best order's numbers", async () => {
    const base = board();
    const gunk: EnemySim = { index: 1, name: "Gunk", hp: 30, maxHp: 30, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 7, hits: 2 }] };
    const input = board({ enemies: [{ sim: base.solver.enemies[0]!, info: base.enemies[0]! }, { sim: gunk, info: { index: 1, id: "GUNK", move: "HIT", strength: 0, powers: {} } }], tables: { TEST_BOSS: base.tables["TEST_BOSS"]!, GUNK: base.tables["TEST_BOSS"]! } });
    expect(fightOrders(base)).toEqual([]);
    expect(fightOrders(input).map((o) => o.key).sort()).toEqual(["GUNK>TEST_BOSS", "TEST_BOSS>GUNK"]);
    const res = await runBestOrder(runBossSim, input, [null, input.plans[0]!], { samples: 20, seed: 4 });
    expect(res.byOrder.map((o) => o.order)).toEqual([null, ...fightOrders(input).map((o) => o.label)]);
    for (let i = 0; i < 2; i += 1) {
      expect(res.lines[i]!.winProb).toBe(Math.max(...res.byOrder.map((o) => o.result.lines[i]!.winProb)));
    }
  });

  it("the Platt map: monotone, 0 and 1 pulled in by half a sample", () => {
    const at = (p: number) => calibratedWinProb(p, 200, "start");
    expect(at(0)).toBeGreaterThan(0);
    expect(at(1)).toBeLessThan(1);
    for (const [lo, hi] of [[0, 0.1], [0.1, 0.5], [0.5, 0.9], [0.9, 1]] as const) expect(at(hi)).toBeGreaterThan(at(lo));
    const { a, b } = BOSS_SIM_PLATT.pre;
    expect(calibratedWinProb(0.5, 200, "pre")).toBeCloseTo(1 / (1 + Math.exp(-a)), 10);
    expect(b).toBeGreaterThan(0);
  });
});

/**
 * Whole boss fight simulator (src/sim/boss-sim.ts, rollout.ts simulateFight): deterministic under a seed, plays to the
 * fight's end and no further, stops at the turn cap, the worker pool gives the serial numbers exactly, and lines are
 * compared on common random numbers; plus the whole-fight scripts (rollout.ts fightNextMove). Synthetic boards only:
 * no knowledge data refreshed per run, no model call, nothing written.
 */

import { describe, expect, it } from "vitest";

import { BossSimPool, compareLines, runBossSim, sampleSeed, slimInput } from "../src/sim/boss-sim.js";
import type { CardModel } from "../src/strategy/card-model.js";
import { simulateFight, type EnemyTable, type FightMeta, type RolloutEnemy, type RolloutInput } from "../src/strategy/rollout.js";
import { solveTurn, type EnemySim, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index,
    key: `c${index}`,
    cardId,
    name: cardId,
    type: "Attack",
    upgraded: false,
    cost: 1,
    xCost: false,
    playable: true,
    target: "single",
    validTargets: [0],
    damage: null,
    hits: 1,
    block: 0,
    vulnerable: 0,
    weak: 0,
    strength: 0,
    tempStrength: 0,
    enemyStrength: 0,
    enemyTempStrengthLoss: 0,
    hpLoss: 0,
    energyGain: 0,
    draw: 0,
    exhausts: false,
    special: null,
    known: true,
    flatValue: 0,
    heldPenalty: 0,
    text: "",
    ...overrides,
  };
}

const strike = (i: number) => card(i, "STRIKE", { damage: 6 });
const defend = (i: number) => card(i, "DEFEND", { type: "Skill", target: "self", validTargets: [], block: 5 });
const bash = (i: number) => card(i, "BASH", { cost: 2, damage: 8, vulnerable: 2 });

const META: FightMeta = { act: 1, t: 1, asc: 8, kind: "boss", enc: "TEST_BOSS", deck: { n: 12, atk: 7, skl: 5, pow: 0, junk: 0, dmg: 50, blk: 25, up: 0 }, relics: 1, max_en: 3 };

/** A boss with a random two-move chain: a hit, or Strength and block. */
const BOSS: EnemyTable = {
  moves: { HIT: { damage: 10, hits: 1, strength: 0, block: 0 }, BUFF: { damage: 0, hits: 1, strength: 2, block: 8 }, FLURRY: { damage: 4, hits: 3, strength: 0, block: 0 } },
  next: { HIT: { BUFF: 1, FLURRY: 1 }, BUFF: { HIT: 2, FLURRY: 1 }, FLURRY: { HIT: 1, BUFF: 1 } },
};

function board(opts: { bossHp?: number; playerHp?: number; enemies?: { sim: EnemySim; info: RolloutEnemy }[]; tables?: Record<string, EnemyTable> } = {}): RolloutInput {
  const hand = [strike(0), strike(1), defend(2), bash(3), defend(4)];
  const player: PlayerSim = { hp: opts.playerHp ?? 70, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
  const boss: EnemySim = { index: 0, name: "Boss", hp: opts.bossHp ?? 120, maxHp: opts.bossHp ?? 120, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 10, hits: 1 }] };
  const enemies = opts.enemies ?? [{ sim: boss, info: { index: 0, id: "TEST_BOSS", move: "HIT", strength: 0, powers: {} } }];
  const solver: SolverInput = { hand, player, enemies: enemies.map((e) => e.sim), fightKind: "boss", turn: 1 };
  const draw = [5, 6, 7, 8, 9, 10, 11].map((i) => (i % 2 ? defend(i) : strike(i)));
  return {
    solver,
    plans: solveTurn(solver).plans,
    enemies: enemies.map((e) => e.info),
    tables: opts.tables ?? { TEST_BOSS: BOSS },
    piles: { draw, discard: [], handBase: hand },
    meta: META,
    playerPowers: {},
    potions: 0,
    mm: {},
    model: null,
    gates: null,
  };
}

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

/**
 * B4's boss mechanics (docs/boss-sim.md §13), on synthetic boards (tests/boss-sim-fixture.ts; no knowledge data, no
 * model call, nothing written): the Kaiser Crab's faced hit, the Queen and her Torch Head Amalgam (measured bases,
 * Burn Bright's Strength, the Amalgam's death), the Knowledge Demon's three curses, the Insatiable's Sandpit and Frantic
 * Escapes. All whole-fight only: the 5-turn rollout reads none of it (checked here), and tests/boss-sim.test.ts pins
 * the live solver's and rollout's numbers.
 */

import { afterEach, describe, expect, it } from "vitest";

import type { CardModel } from "../src/strategy/card-model.js";
import { ALLY_STRENGTH_MOVES, AMALGAM_DEATH_STRENGTH, KNOWLEDGE_CURSES, rolloutDecision, simulateFight, STATUS_INTO_DRAW, type EnemyTable, type RolloutInput } from "../src/strategy/rollout.js";
import { SHOWN_MOVE_BASES } from "../src/strategy/rollout-live.js";
import { solveTap, solveTurn, type EnemySim, type SolverInput } from "../src/strategy/turn-solver.js";
import { board, card, defend, strike } from "./boss-sim-fixture.js";

/** The policy's solver inputs of one whole-fight sample (or the 5-turn rollout's when `rollout`), turn by turn. */
function solves(input: RolloutInput, plan: Parameters<typeof simulateFight>[1], maxTurns: number, seed = 5): SolverInput[] {
  const seen: SolverInput[] = [];
  solveTap.onSolve = (solver) => seen.push(solver);
  try {
    simulateFight(input, plan, maxTurns, seed);
  } finally {
    solveTap.onSolve = null;
  }
  return seen;
}

function rolloutSolves(input: RolloutInput, seed = 5): SolverInput[] {
  const seen: SolverInput[] = [];
  solveTap.onSolve = (solver) => seen.push(solver);
  try {
    rolloutDecision({ ...input, options: { samples: 1, seed, budgetMs: 1e9, k: 1, include: [input.plans[0]!] } });
  } finally {
    solveTap.onSolve = null;
  }
  return seen;
}

const enemy = (index: number, name: string, hp: number, attacks: { damage: number; hits: number }[] = []): EnemySim => ({ index, name, hp, maxHp: hp, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks });

afterEach(() => {
  solveTap.onSolve = null;
});

describe("B4 Kaiser Crab: the faced hit", () => {
  it("a Surrounded move's later hit is its faced hit, x1.5 behind us (not the logged average x1.5 again)", () => {
    const both = (c: CardModel) => ({ ...c, validTargets: [0, 1] });
    const base = board();
    const input = { ...base, solver: { ...base.solver, hand: base.solver.hand.map((c) => (c.target === "single" ? both(c) : c)) } };
    const solver: SolverInput = { ...input.solver, enemies: [enemy(0, "Claw0", 90, [{ damage: 10, hits: 1 }]), enemy(1, "Claw1", 90, [{ damage: 10, hits: 1 }])], player: { ...input.solver.player, surrounded: true, facing: 0 } };
    // The table's 12 is the average over the logged facings; faced it is 10.
    const table: EnemyTable = { moves: { HIT: { damage: 12, hits: 1, faceDamage: 10, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const two: RolloutInput = { ...input, solver, enemies: [0, 1].map((index) => ({ index, id: "CLAW", move: "HIT", strength: 0, powers: {} })), tables: { CLAW: table } };
    const plan = solveTurn(solver).plans.find((p) => p.steps.some((s) => s.target === 1) && p.steps.every((s) => s.target === undefined || s.target === 1))!;
    const turn2 = solves(two, plan, 2)[0]!;
    expect(turn2.player.facing).toBe(1);
    expect(turn2.enemies.find((e) => e.index === 1)!.attacks[0]!.damage).toBe(10);
    expect(turn2.enemies.find((e) => e.index === 0)!.attacks[0]!.damage).toBe(15);
    // Not Surrounded: the table's own number, as before.
    const flat = solves({ ...two, solver: { ...solver, player: { ...solver.player, surrounded: false } } }, plan, 2)[0]!;
    expect(flat.enemies.map((e) => e.attacks[0]!.damage)).toEqual([12, 12]);
    // The 5-turn rollout never reads the faced hit.
    const rollout = rolloutSolves({ ...two, plans: [plan] });
    expect(rollout[0]!.enemies.map((e) => e.attacks[0]!.damage)).toEqual([12, 12]);
  });
});

describe("B4 the Queen and her Torch Head Amalgam", () => {
  const amalgamTable: EnemyTable = {
    moves: {
      BEAM_MOVE: { damage: 12, hits: 3, shown: true, fightDamage: SHOWN_MOVE_BASES["TORCH_HEAD_AMALGAM"]!["BEAM_MOVE"], strength: 0, block: 0 },
      TACKLE_3_MOVE: { damage: 22, hits: 1, shown: true, fightDamage: SHOWN_MOVE_BASES["TORCH_HEAD_AMALGAM"]!["TACKLE_3_MOVE"], strength: 0, block: 0 },
    },
    next: { BEAM_MOVE: { TACKLE_3_MOVE: 1 }, TACKLE_3_MOVE: { BEAM_MOVE: 1 } },
  };
  const queenTable: EnemyTable = {
    moves: {
      YOU_ARE_MINE_MOVE: { damage: 0, hits: 1, strength: 0, block: 0 },
      BURN_BRIGHT_FOR_ME_MOVE: { damage: 0, hits: 1, strength: 0, block: 20 },
      OFF_WITH_YOUR_HEAD_MOVE: { damage: 7, hits: 5, shown: true, fightDamage: SHOWN_MOVE_BASES["QUEEN"]!["OFF_WITH_YOUR_HEAD_MOVE"], strength: 0, block: 0 },
      EXECUTION_MOVE: { damage: 25, hits: 1, shown: true, fightDamage: SHOWN_MOVE_BASES["QUEEN"]!["EXECUTION_MOVE"], strength: 0, block: 0 },
    },
    next: { YOU_ARE_MINE_MOVE: { BURN_BRIGHT_FOR_ME_MOVE: 1 }, BURN_BRIGHT_FOR_ME_MOVE: { BURN_BRIGHT_FOR_ME_MOVE: 5, OFF_WITH_YOUR_HEAD_MOVE: 1 }, OFF_WITH_YOUR_HEAD_MOVE: { EXECUTION_MOVE: 1 }, EXECUTION_MOVE: { OFF_WITH_YOUR_HEAD_MOVE: 1 } },
  };
  function queenBoard(opts: { amalgamHp: number; queenMove: string; hand?: CardModel[] }): RolloutInput {
    const base = board();
    const hand = opts.hand ?? [defend(0), defend(1), defend(2)];
    const solver: SolverInput = {
      ...base.solver,
      hand,
      player: { ...base.solver.player, hp: 300, maxHp: 300, vulnerable: true },
      enemies: [enemy(0, "Amalgam", opts.amalgamHp, [{ damage: 12, hits: 3 }]), enemy(1, "Queen", 400)],
    };
    return {
      ...base,
      solver,
      plans: solveTurn(solver).plans,
      enemies: [
        { index: 0, id: "TORCH_HEAD_AMALGAM", move: "BEAM_MOVE", strength: 0, powers: { MINION_POWER: 1 } },
        { index: 1, id: "QUEEN", move: opts.queenMove, strength: 0, powers: {} },
      ],
      tables: { TORCH_HEAD_AMALGAM: amalgamTable, QUEEN: queenTable },
      playerPowers: { VULNERABLE_POWER: 99 },
      piles: { draw: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => defend(10 + i)), discard: [], handBase: hand },
    };
  }

  it("the measured bases take Strength and our Vulnerable; each Burn Bright gives the Amalgam 1 Strength", () => {
    expect(ALLY_STRENGTH_MOVES["BURN_BRIGHT_FOR_ME_MOVE"]).toEqual({ ally: "TORCH_HEAD_AMALGAM", amount: 1 });
    const input = queenBoard({ amalgamHp: 200, queenMove: "BURN_BRIGHT_FOR_ME_MOVE" });
    const turns = solves(input, input.plans[0]!, 3);
    const hit = (s: SolverInput) => s.enemies.find((e) => e.index === 0)!.attacks[0]!;
    // Turn 2: Tackle 3, base 14 + 1 Strength, x1.5 Vulnerable = 22 (as logged); turn 3: Beam (8 + 2) x 1.5 = 15, 3 hits.
    expect(hit(turns[0]!)).toEqual({ damage: 22, hits: 1 });
    expect(hit(turns[1]!)).toEqual({ damage: 15, hits: 3 });
    // The 5-turn rollout keeps the shown hits and no Strength from Burn Bright.
    const rollout = rolloutSolves(input);
    expect(hit(rollout[0]!)).toEqual({ damage: 22, hits: 1 });
    expect(hit(rollout[1]!)).toEqual({ damage: 12, hits: 3 });
  });

  it("the Amalgam's death gives the Queen 2 Strength and Off With Your Head next, also straight after You Are Mine", () => {
    const killer = [card(0, "KILL", { damage: 30, cost: 1 }), defend(1), defend(2)];
    for (const queenMove of ["BURN_BRIGHT_FOR_ME_MOVE", "YOU_ARE_MINE_MOVE"]) {
      const input = queenBoard({ amalgamHp: 20, queenMove, hand: killer });
      const plan = input.plans.find((p) => p.steps.some((s) => s.cardId === "KILL" && s.target === 0))!;
      const turn2 = solves(input, plan, 2)[0]!;
      expect(turn2.enemies.map((e) => e.index)).toEqual([1]);
      // Off With Your Head: (3 + 2 Strength) x 1.5 = 7, 5 hits (logged 7x5 on the Queen's first one).
      expect(turn2.enemies[0]!.attacks).toEqual([{ damage: Math.floor((3 + AMALGAM_DEATH_STRENGTH) * 1.5), hits: 5 }]);
    }
  });
});

describe("B4 the Knowledge Demon's curses", () => {
  const table: EnemyTable = {
    moves: {
      CURSE_OF_KNOWLEDGE_MOVE: { damage: 0, hits: 1, strength: 0, block: 0, playerPowers: { MIND_ROT_POWER: 1, SLOTH_POWER: 3, WASTE_AWAY_POWER: 1, DISINTEGRATION_POWER: 7 }, playerPowerChoice: ["MIND_ROT_POWER", "SLOTH_POWER", "WASTE_AWAY_POWER", "DISINTEGRATION_POWER"] },
      SLAP_MOVE: { damage: 2, hits: 1, strength: 0, block: 0 },
      KNOWLEDGE_OVERWHELMING_MOVE: { damage: 1, hits: 3, strength: 0, block: 0 },
      PONDER_MOVE: { damage: 1, hits: 1, strength: 0, block: 0, heal: 30 },
    },
    next: { CURSE_OF_KNOWLEDGE_MOVE: { SLAP_MOVE: 1 }, SLAP_MOVE: { KNOWLEDGE_OVERWHELMING_MOVE: 1 }, KNOWLEDGE_OVERWHELMING_MOVE: { PONDER_MOVE: 1 }, PONDER_MOVE: { CURSE_OF_KNOWLEDGE_MOVE: 10, SLAP_MOVE: 1 } },
  };
  function demon(move: string, playerPowers: Record<string, number>): RolloutInput {
    const base = board();
    const solver: SolverInput = { ...base.solver, player: { ...base.solver.player, hp: 400, maxHp: 400 }, enemies: [enemy(0, "Demon", 5000)] };
    return { ...base, solver, plans: solveTurn(solver).plans, enemies: [{ index: 0, id: "KNOWLEDGE_DEMON", move, strength: 0, powers: {} }], tables: { KNOWLEDGE_DEMON: table }, playerPowers };
  }
  const moves = (input: RolloutInput, turns: number) => simulateFight(input, null, turns, 3).records.map((r) => r.snap.E[0]![8]);

  it("three uses a fight, then Ponder -> Slap", () => {
    expect(KNOWLEDGE_CURSES).toBe(3);
    const seq = moves(demon("CURSE_OF_KNOWLEDGE_MOVE", {}), 16);
    expect(seq).toHaveLength(16);
    expect(seq.map((m, t) => (m === "CURSE_OF_KNOWLEDGE_MOVE" ? t + 1 : 0)).filter((t) => t > 0)).toEqual([1, 5, 9]);
    expect(seq.slice(11, 16)).toEqual(["PONDER_MOVE", "SLAP_MOVE", "KNOWLEDGE_OVERWHELMING_MOVE", "PONDER_MOVE", "SLAP_MOVE"]);
  });

  it("the curses already on us count: two held, one more", () => {
    const seq = moves(demon("PONDER_MOVE", { MIND_ROT_POWER: 1, SLOTH_POWER: 3 }), 12);
    expect(seq.filter((m) => m === "CURSE_OF_KNOWLEDGE_MOVE")).toHaveLength(1);
  });
});

describe("B4 the Insatiable's Sandpit", () => {
  const escape = card(90, "FRANTIC_ESCAPE", { type: "Status", target: "self", validTargets: [], special: "frantic_escape", cost: 1 });
  const table: EnemyTable = {
    moves: {
      LIQUIFY_GROUND_MOVE: { damage: 0, hits: 1, strength: 0, block: 0, sandpit: 4, statusCards: [{ cardId: "FRANTIC_ESCAPE", count: 6, pile: "discard" }] },
      THRASH_MOVE: { damage: 1, hits: 1, strength: 0, block: 0 },
    },
    next: { LIQUIFY_GROUND_MOVE: { THRASH_MOVE: 1 }, THRASH_MOVE: { THRASH_MOVE: 1 } },
  };
  function worm(): RolloutInput {
    const base = board();
    const solver: SolverInput = { ...base.solver, player: { ...base.solver.player, hp: 400, maxHp: 400 }, enemies: [enemy(0, "Worm", 5000)] };
    return { ...base, solver, plans: solveTurn(solver).plans, enemies: [{ index: 0, id: "THE_INSATIABLE", move: "LIQUIFY_GROUND_MOVE", strength: 0, powers: {} }], tables: { THE_INSATIABLE: table }, statusCards: { FRANTIC_ESCAPE: escape } };
  }

  it("Liquify Ground starts the count at 4; it falls a turn; at 0 we are eaten", () => {
    const input = worm();
    const turns = solves(input, input.plans[0]!, 3);
    expect(turns[0]!.enemies[0]!.sandpit).toBe(4);
    // No Escape played on turn 2 (none drawn, or the policy kept its energy): 3 on turn 3, else more.
    expect(turns[1]!.enemies[0]!.sandpit).toBeGreaterThanOrEqual(3);
    // Without Frantic Escapes to play: turns 2-5 count 4, 3, 2, 1, eaten at the end of turn 5 with most of the 400 HP.
    const bare: RolloutInput = { ...input, tables: { THE_INSATIABLE: { ...table, moves: { ...table.moves, LIQUIFY_GROUND_MOVE: { ...table.moves["LIQUIFY_GROUND_MOVE"]!, statusCards: [] } } } } };
    const run = simulateFight(bare, bare.plans[0]!, 12, 5).records;
    expect(run).toHaveLength(5);
    expect(run[4]!.died).toBe(true);
    expect(run[4]!.snap.hp).toBeGreaterThan(350);
    // The 5-turn rollout never starts the count.
    expect(rolloutSolves(input)[0]!.enemies[0]!.sandpit).toBeUndefined();
  });

  it("3 of the 6 Frantic Escapes go into the draw pile (the rest to the discard pile)", () => {
    expect(STATUS_INTO_DRAW["LIQUIFY_GROUND_MOVE"]).toBe(3);
    // Turn 2 draws 5 of the 7 cards left + 3 Escapes: some samples draw Escapes, none more than 3.
    const drawn = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((seed) => {
      const input = worm();
      return solves(input, input.plans[0]!, 2, seed)[0]!.hand.filter((c) => c.cardId === "FRANTIC_ESCAPE").length;
    });
    expect(Math.max(...drawn)).toBeGreaterThan(0);
    expect(Math.max(...drawn)).toBeLessThanOrEqual(3);
    // The 5-turn rollout puts all 6 in the discard pile: none on turn 2.
    expect(rolloutSolves(worm())[0]!.hand.filter((c) => c.cardId === "FRANTIC_ESCAPE")).toHaveLength(0);
  });
});

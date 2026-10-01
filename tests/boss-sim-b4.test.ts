/**
 * B4's boss mechanics (docs/boss-sim.md §13), on synthetic boards (tests/boss-sim-fixture.ts; no knowledge data, no
 * model call, nothing written): the Kaiser Crab's faced hit (B5), the Knowledge Demon's three curses, the Insatiable's
 * Sandpit and Frantic Escapes. The Queen's fixes stay on branch v4-sim-crabqueen (B5 validation, docs/boss-sim.md §14).
 * All whole-fight only: the 5-turn rollout reads none of it (checked here), and tests/boss-sim.test.ts pins the live
 * solver's and rollout's numbers.
 */

import { afterEach, describe, expect, it } from "vitest";

import type { CardModel } from "../src/strategy/card-model.js";
import { KNOWLEDGE_CURSES, rolloutDecision, simulateFight, STATUS_INTO_DRAW, type EnemyTable, type RolloutInput } from "../src/strategy/rollout.js";
import { solveTap, solveTurn, type EnemySim, type SolverInput } from "../src/strategy/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

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

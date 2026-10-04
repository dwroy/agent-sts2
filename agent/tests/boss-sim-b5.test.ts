/**
 * B5's one-turn lookahead of the whole-fight simulator's policy (docs/boss-sim.md §14), on synthetic boards
 * (tests/boss-sim-fixture.ts; no knowledge data, no model call, nothing written): the next turn's attacks forecast from
 * the move model (an expectation, never the sample's own next move), the solver's next-hit rule, and that none of it
 * reaches the live solver or the 5-turn rollout (tests/boss-sim.test.ts pins their numbers as before).
 */

import { afterEach, describe, expect, it } from "vitest";

import { BOSS_SIM_LOOKAHEAD, slimInput } from "../src/sim/boss-sim.js";
import { rolloutDecision, simulateFight, type EnemyTable, type RolloutInput } from "../src/reflex/rollout.js";
import { ERUPTION_NEXT_BLOCK, nextHitShortfall, solveTap, solveTurn, type EnemySim, type SolverInput } from "../src/reflex/turn-solver.js";
import { board, card, strike } from "./boss-sim-fixture.js";

const enemy = (index: number, name: string, hp: number, attacks: { damage: number; hits: number }[] = [], weak = 0): EnemySim => ({ index, name, hp, maxHp: hp, block: 0, vulnerable: 0, weak, artifact: 0, intangible: false, attacks });

/** The policy's solver inputs of one whole-fight sample, turn by turn. */
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

const committed = { ...BOSS_SIM_LOOKAHEAD };
afterEach(() => {
  solveTap.onSolve = null;
  Object.assign(BOSS_SIM_LOOKAHEAD, committed);
});

/** A 0-cost card that pays 4 HP for 2 energy, and five Strikes: with the energy, two more Strikes (12 damage). */
const payHand = () => [card(0, "OFFERING_LIKE", { type: "Skill", target: "self", validTargets: [], cost: 0, hpLoss: 4, energyGain: 2 }), strike(1), strike(2), strike(3), strike(4), strike(5)];

/** A boss that winds up (no attack) and then hits for 40, then rests: the hit is known a turn ahead. */
const WIND_UP: EnemyTable = {
  moves: { WIND_UP: { damage: 0, hits: 1, strength: 0, block: 0 }, SMASH: { damage: 40, hits: 1, strength: 0, block: 0 }, REST: { damage: 0, hits: 1, strength: 0, block: 0 } },
  next: { WIND_UP: { SMASH: 1 }, SMASH: { REST: 1 }, REST: { WIND_UP: 1 } },
};

function windUpBoard(move: string, hp = 70): RolloutInput {
  const base = board({ playerHp: hp });
  const attacks = move === "SMASH" ? [{ damage: 40, hits: 1 }] : [];
  const solver: SolverInput = { ...base.solver, enemies: [enemy(0, "Boss", 300, attacks)] };
  return { ...base, solver, plans: solveTurn(solver).plans, enemies: [{ index: 0, id: "TEST_BOSS", move, strength: 0, powers: {} }], tables: { TEST_BOSS: WIND_UP } };
}

describe("B5 the next-hit rule (solver)", () => {
  it("counts the part of this turn's loss that ends below the next hit's reach through a fresh hand", () => {
    const next = { attacks: [{ index: 0, damage: 40 }, { index: 1, damage: 10 }], handBlock: ERUPTION_NEXT_BLOCK, weight: 1 };
    const living = [enemy(0, "A", 50), enemy(1, "B", 50)];
    // Reach 50 - 12 = 38: ending at 30 after losing 15, 8 of the 15 are below it.
    expect(nextHitShortfall(next, living, 30, 15)).toBe(8);
    // Never more than this turn's own loss; nothing when we end above the reach.
    expect(nextHitShortfall(next, living, 10, 5)).toBe(5);
    expect(nextHitShortfall(next, living, 40, 15)).toBe(0);
    // A killed enemy does not hit next turn; one still Weak then hits for 75%.
    expect(nextHitShortfall(next, [living[1]!], 0.5, 20)).toBe(0);
    expect(nextHitShortfall(next, [enemy(0, "A", 50, [], 2), living[1]!], 20, 30)).toBe(30 + 10 - 12 - 20);
    // Weak 1 wears off before its next turn.
    expect(nextHitShortfall(next, [enemy(0, "A", 50, [], 1), living[1]!], 20, 30)).toBe(18);
  });

  it("with the next hit known, a turn with nothing coming keeps HP a self-damage card would cost (and the live solver is unchanged without it)", () => {
    const solver: SolverInput = { hand: payHand(), player: { hp: 22, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 }, enemies: [enemy(0, "Boss", 300)], fightKind: "boss", turn: 2 };
    const plain = solveTurn(solver);
    const paysPlain = plain.plans[0]!.steps.some((s) => s.cardId === "OFFERING_LIKE");
    const ahead = solveTurn({ ...solver, nextHit: { attacks: [{ index: 0, damage: 40 }], handBlock: ERUPTION_NEXT_BLOCK, weight: 1 } });
    // Without the rule 4 HP buy two more Strikes; with a 40 hit next turn (reach 40 - 12 = 28), 22 -> 18 ends all 4 below it.
    expect(paysPlain).toBe(true);
    expect(ahead.plans[0]!.steps.some((s) => s.cardId === "OFFERING_LIKE")).toBe(false);
    // The same input without nextHit: the same plans and scores as before (the field is never set live).
    expect(solveTurn({ ...solver }).plans.map((p) => [p.steps.map((s) => s.cardId).join(","), p.score])).toEqual(plain.plans.map((p) => [p.steps.map((s) => s.cardId).join(","), p.score]));
  });
});

describe("B5 the policy's one-turn lookahead (whole fights)", () => {
  it("each policy turn gets the next turn's forecast attack from the move model; off, the later turns have none", () => {
    const input = windUpBoard("REST");
    const on = solves({ ...input, options: { policyLookahead: { lethal: 1, threat: 0 } } }, null, 3);
    // Turn 1 (REST): next WIND_UP 0; turn 2 (WIND_UP): next SMASH 40; turn 3 (SMASH): next REST 0.
    expect(on.map((s) => s.nextIncoming ?? 0)).toEqual([0, 40, 0]);
    expect(on[1]!.nextHit).toEqual({ attacks: [{ index: 0, damage: 40 }], handBlock: ERUPTION_NEXT_BLOCK, weight: 1 });
    const off = solves(input, null, 3);
    expect(off.map((s) => s.nextIncoming)).toEqual([undefined, undefined, undefined]);
    expect(off.every((s) => s.nextHit === undefined && s.hpScale === undefined)).toBe(true);
  });

  it("the forecast is the move model's expectation, the same whatever the sample's own next move", () => {
    const split: EnemyTable = {
      moves: { WIND_UP: { damage: 0, hits: 1, strength: 2, block: 0 }, SMASH: { damage: 40, hits: 1, strength: 0, block: 0 }, REST: { damage: 0, hits: 1, strength: 0, block: 0 } },
      next: { WIND_UP: { SMASH: 1, REST: 1 }, SMASH: { WIND_UP: 1 }, REST: { WIND_UP: 1 } },
    };
    const input = { ...windUpBoard("WIND_UP"), tables: { TEST_BOSS: split }, options: { policyLookahead: { lethal: 0, threat: 1 } } };
    for (const seed of [1, 2, 3, 4]) {
      const first = solves(input, null, 1, seed)[0]!;
      // Half the draws SMASH at the Strength WIND_UP gives (40 + 2), half REST: 21; the HP weight times 1 + 21 / 70.
      expect(first.nextIncoming).toBe(21);
      expect(first.hpScale).toBeCloseTo(1 + 21 / 70, 9);
    }
  });

  it("before a known big hit the lookahead keeps the HP a greedy turn spends", () => {
    const base = windUpBoard("WIND_UP", 22);
    const hand = payHand();
    const input: RolloutInput = { ...base, solver: { ...base.solver, hand }, piles: { ...base.piles, handBase: hand } };
    const first = (options: RolloutInput["options"]) => {
      const seen = solves({ ...input, options }, null, 1)[0]!;
      return solveTurn(seen).plans[0]!.steps.some((s) => s.cardId === "OFFERING_LIKE");
    };
    expect(first(undefined)).toBe(true);
    expect(first({ policyLookahead: { lethal: 1, threat: 0 } })).toBe(false);
  });

  it("the 5-turn rollout never looks ahead, even with the option set", () => {
    const input = windUpBoard("WIND_UP");
    const seen: SolverInput[] = [];
    solveTap.onSolve = (solver) => seen.push(solver);
    rolloutDecision({ ...input, options: { samples: 1, seed: 5, budgetMs: 1e9, k: 1, include: [input.plans[0]!], policyLookahead: { lethal: 1, threat: 1 } } });
    solveTap.onSolve = null;
    expect(seen.length).toBeGreaterThan(1);
    expect(seen.every((s) => s.nextHit === undefined && s.nextIncoming === undefined && s.hpScale === undefined)).toBe(true);
  });

  it("slimInput carries the committed lookahead (BOSS_SIM_LOOKAHEAD) into the policy's options, none when both are 0", () => {
    const input = windUpBoard("WIND_UP");
    BOSS_SIM_LOOKAHEAD.lethal = 0;
    BOSS_SIM_LOOKAHEAD.threat = 0;
    expect(slimInput(input).options?.policyLookahead).toBeUndefined();
    BOSS_SIM_LOOKAHEAD.lethal = 1;
    BOSS_SIM_LOOKAHEAD.threat = 0.5;
    expect(slimInput(input).options?.policyLookahead).toEqual({ lethal: 1, threat: 0.5 });
  });
});

/** TD1HVGS7H6LB SILENT A10 F17 T3 (two attempts), silent-0171: recorded model outcomes, not a replayed win. */
import { describe, expect, it } from "vitest";
import { dominates, type Outcome, type Plan } from "../src/reflex/turn-solver.js";

// Only fixed outcome facts are compared: no knowledge files, card formulas or model calls.
function plan(damage: number, poison?: number): Plan {
  const outcome: Outcome = {
    winsFight: false, hpLoss: 9, hpAfter: 36, dies: false, blockGained: 0,
    damageDealt: damage, kills: [], restocked: [],
    enemyHpAfter: [{ index: 0, name: "WATERFALL_GIANT", hp: 220 - damage, vulnerable: 0, weak: 0,
      ...(poison !== undefined ? { poison } : {}) }],
    incomingAfterBlock: 9, energyLeft: 0, vulnerableApplied: 0, weakApplied: 0,
    strengthGained: 0, cardsDrawn: 0, unknownCards: [], sandpitAfter: null,
    startTurnKills: [], withersAdded: 0, sleepCost: 0, lasting: 0,
  };
  return { steps: [], outcome, score: 0 };
}

describe("recorded residual poison and dominance", () => {
  it("F17 T3: 21 damage and no poison cannot dominate Jev's 19 damage and three residual poison", () => {
    const jev = plan(19, 3);
    const replacement = plan(21, 0);
    expect(jev.outcome.enemyHpAfter[0]!.hp).toBe(201);
    expect(replacement.outcome.enemyHpAfter[0]!.hp).toBe(199);
    expect(dominates(replacement, jev)).toBe(false);
    expect(dominates(jev, replacement)).toBe(false);
  });

  it("preserves existing comparisons with no poison, including omitted versus explicit zero", () => {
    expect(dominates(plan(21), plan(19, 0))).toBe(true);
    expect(dominates(plan(19, 0), plan(21))).toBe(false);
  });

  it("preserves existing axes when both alternatives leave identical poison", () => {
    expect(dominates(plan(21, 3), plan(19, 3))).toBe(true);
  });

  it("does not collapse different target poison states to a summed poison value", () => {
    const first = plan(21, 3);
    const second = plan(19, 0);
    first.outcome.enemyHpAfter.push({ index: 1, name: "FIXED_SECOND_TARGET", hp: 100, vulnerable: 0, weak: 0, poison: 0 });
    second.outcome.enemyHpAfter.push({ index: 1, name: "FIXED_SECOND_TARGET", hp: 100, vulnerable: 0, weak: 0, poison: 3 });
    expect(dominates(first, second)).toBe(false);
    expect(dominates(second, first)).toBe(false);
  });

  it("keeps completed-fight comparisons unchanged", () => {
    const first = plan(21, 0);
    const second = plan(19, 3);
    first.outcome.winsFight = second.outcome.winsFight = true;
    first.outcome.enemyHpAfter[0]!.hp = second.outcome.enemyHpAfter[0]!.hp = 0;
    expect(dominates(first, second)).toBe(true);
  });

  it("does not treat poison on an already killed target as remaining live state", () => {
    const first = plan(40, 0);
    const second = plan(19, 3);
    first.outcome.enemyHpAfter[0]!.hp = 0;
    for (const result of [first, second]) {
      result.outcome.enemyHpAfter.push({ index: 1, name: "FIXED_SECOND_TARGET", hp: 100, vulnerable: 0, weak: 0 });
    }
    expect(dominates(first, second)).toBe(true);
  });
});

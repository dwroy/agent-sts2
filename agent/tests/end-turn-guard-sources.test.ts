import { expect, it } from "vitest";
import { endTurnLethalNote } from "../src/reflex/combat-plan.js";
import { solveTurn, type SolverInput } from "../src/reflex/turn-solver.js";

// silent-0338: RMNXHZKV716Y, Silent A10 F49 final attempt T2 (d313188/313190).
function endTurn(overrides: Partial<SolverInput["player"]> = {}) {
  const input: SolverInput = {
    hand: [], turn: 2, fightKind: "boss",
    player: { hp: 11, maxHp: 77, block: 0, energy: 3, strengthNow: 0,
      weak: false, vulnerable: false, intangible: false, orichalcum: 6, ...overrides },
    enemies: [{ index: 0, name: "Queen", hp: 100, maxHp: 100, block: 0,
      vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 16, hits: 1 }] }],
  };
  return solveTurn(input).plans.find((plan) => plan.steps.length === 0)!;
}

it("F49 T2: explains the six Orichalcum block already included in the ten-HP loss", () => {
  const plan = endTurn();
  expect(plan.outcome.hpLoss).toBe(10);
  expect(plan.outcome.dies).toBe(false);
  expect(plan.outcome.endTurnGuards).toContainEqual({ what: "Orichalcum block at the turn's end", amount: 6 });
  expect(endTurnLethalNote(plan, true, 11)).toContain("Orichalcum block at the turn's end 6");
  expect(endTurnLethalNote(plan, true, 11)).not.toContain("no end-of-turn block");
});

it("reports only triggered sources when existing block suppresses Orichalcum", () => {
  const plan = endTurn({ block: 7 });
  expect(plan.outcome.hpLoss).toBe(9);
  expect(plan.outcome.endTurnGuards).toBeUndefined();
});

it("preserves the numbers and absence of diagnostics without either relic", () => {
  const plan = endTurn({ orichalcum: 0 });
  expect(plan.outcome.hpLoss).toBe(16);
  expect(plan.outcome.dies).toBe(true);
  expect(plan.outcome.endTurnGuards).toBeUndefined();
  expect(endTurnLethalNote(plan, true, 11)).toBe("");
});

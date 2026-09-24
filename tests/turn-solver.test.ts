import { describe, expect, it } from "vitest";

import type { CardModel } from "../src/strategy/card-model.js";
import { distinctPlans, solveTurn, type EnemySim, type PlayerSim } from "../src/strategy/turn-solver.js";

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
    hpLoss: 0,
    energyGain: 0,
    draw: 0,
    exhausts: false,
    special: null,
    known: true,
    flatValue: 0,
    text: "",
    ...overrides,
  };
}

const strike = (index: number): CardModel => card(index, "STRIKE_IRONCLAD", { damage: 6 });
const defend = (index: number): CardModel => card(index, "DEFEND_IRONCLAD", { type: "Skill", target: "self", validTargets: [], block: 5 });
const inflame = (index: number): CardModel =>
  card(index, "INFLAME", { type: "Power", target: "self", validTargets: [], strength: 2, flatValue: 4 });

function enemy(overrides: Partial<EnemySim> = {}): EnemySim {
  return { index: 0, name: "Byrdonis", hp: 10, maxHp: 91, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...overrides };
}

function player(overrides: Partial<PlayerSim> = {}): PlayerSim {
  return { hp: 10, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, ...overrides };
}

describe("solveTurn", () => {
  it("finds the two-card lethal the single-card lookahead missed (floor 7, live run)", () => {
    const result = solveTurn({
      hand: [inflame(0), defend(1), defend(2), strike(3), strike(4)],
      player: player(),
      enemies: [enemy({ vulnerable: 2, attacks: [{ damage: 24, hits: 1 }] })],
      fightKind: "elite",
    });
    const best = result.plans[0]!;
    expect(best.outcome.winsFight).toBe(true);
    expect(best.outcome.dies).toBe(false);
  });

  it("blocks when it cannot kill and the hit is big", () => {
    const result = solveTurn({
      hand: [strike(0), strike(1), defend(2), defend(3), defend(4)],
      player: player({ hp: 20 }),
      enemies: [enemy({ hp: 60, attacks: [{ damage: 18, hits: 1 }] })],
      fightKind: "monster",
    });
    const best = result.plans[0]!;
    expect(best.outcome.dies).toBe(false);
    expect(best.outcome.blockGained).toBeGreaterThanOrEqual(15);
  });

  it("plays Bash before Strikes so the Strikes are Vulnerable", () => {
    const bash = card(0, "BASH", { cost: 2, damage: 8, vulnerable: 2 });
    const result = solveTurn({
      hand: [bash, strike(1)],
      player: player({ hp: 80 }),
      enemies: [enemy({ hp: 40, attacks: [] })],
      fightKind: "monster",
    });
    const best = result.plans[0]!;
    expect(best.steps.map((step) => step.cardId)).toEqual(["BASH", "STRIKE_IRONCLAD"]);
    expect(best.outcome.damageDealt).toBe(8 + 9);
  });

  it("plays Strength before attacks", () => {
    const result = solveTurn({
      hand: [strike(0), inflame(1), strike(2)],
      player: player({ hp: 80 }),
      enemies: [enemy({ hp: 50, attacks: [] })],
      fightKind: "monster",
    });
    const best = result.plans[0]!;
    expect(best.steps[0]!.cardId).toBe("INFLAME");
    expect(best.outcome.damageDealt).toBe(16);
  });

  it("kills the attacker that matters when two enemies are up", () => {
    const result = solveTurn({
      hand: [strike(0, ), strike(1)].map((entry) => ({ ...entry, validTargets: [0, 1] })),
      player: player({ hp: 30 }),
      enemies: [
        enemy({ index: 0, name: "Big", hp: 50, attacks: [{ damage: 5, hits: 1 }] }),
        enemy({ index: 1, name: "Small", hp: 12, attacks: [{ damage: 12, hits: 1 }] }),
      ],
      fightKind: "monster",
    });
    const best = result.plans[0]!;
    expect(best.outcome.kills).toEqual(["Small"]);
  });

  it("returns distinct strategies for the model to choose between", () => {
    const result = solveTurn({
      hand: [strike(0), strike(1), defend(2), defend(3), inflame(4)],
      player: player({ hp: 50 }),
      enemies: [enemy({ hp: 45, attacks: [{ damage: 11, hits: 1 }] })],
      fightKind: "monster",
    });
    const picks = distinctPlans(result.plans, 4);
    expect(picks.length).toBeGreaterThanOrEqual(2);
    expect(result.truncated).toBe(false);
  });
});

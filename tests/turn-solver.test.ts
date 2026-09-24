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

describe("enemy powers", () => {
  it("Slippery turns each HP loss into 1, so cheap hits strip it first", () => {
    const result = solveTurn({
      hand: [strike(0), strike(1)],
      player: player({ hp: 80 }),
      enemies: [enemy({ hp: 170, slippery: 1, attacks: [] })],
      fightKind: "boss",
    });
    expect(result.plans[0]!.outcome.damageDealt).toBe(1 + 6);
  });

  it("Hardened Shell caps the HP lost in a turn", () => {
    const result = solveTurn({
      hand: [strike(0), strike(1), strike(2)],
      player: player({ hp: 80 }),
      enemies: [enemy({ hp: 100, hpLossCap: 10, attacks: [] })],
      fightKind: "elite",
    });
    expect(result.plans[0]!.outcome.damageDealt).toBe(10);
  });
});

describe("potions", () => {
  it("uses a damage potion when it completes a lethal, and not otherwise in a hallway fight", async () => {
    const { modelPotion } = await import("../src/strategy/card-model.js");
    const rock = modelPotion("POTION_SHAPED_ROCK", "rock", 1, [0], 15)!;
    const lethal = solveTurn({
      hand: [strike(0), rock],
      player: player({ hp: 10, energy: 1 }),
      enemies: [enemy({ hp: 16, attacks: [{ damage: 30, hits: 1 }] })],
      fightKind: "monster",
    });
    expect(lethal.plans[0]!.outcome.winsFight).toBe(true);
    expect(lethal.plans[0]!.steps.some((step) => step.cardId.startsWith("POTION:"))).toBe(true);

    const idle = solveTurn({
      hand: [strike(0), rock],
      player: player({ hp: 80, energy: 1 }),
      enemies: [enemy({ hp: 60, attacks: [{ damage: 5, hits: 1 }] })],
      fightKind: "monster",
    });
    expect(idle.plans[0]!.steps.some((step) => step.cardId.startsWith("POTION:"))).toBe(false);
  });
});

describe("more enemy powers", () => {
  it("Flutter halves attack damage, so a big hit is not a lethal", () => {
    const bludgeon = card(0, "BLUDGEON", { cost: 3, damage: 32 });
    const result = solveTurn({
      hand: [bludgeon],
      player: player({ hp: 80 }),
      enemies: [enemy({ hp: 51, vulnerable: 1, flutter: 5, attacks: [{ damage: 21, hits: 1 }] })],
      fightKind: "monster",
    });
    expect(result.plans.some((plan) => plan.outcome.winsFight)).toBe(false);
  });

  it("minions leave when the leader dies", () => {
    const result = solveTurn({
      hand: [strike(0)].map((entry) => ({ ...entry, validTargets: [0, 1] })),
      player: player({ hp: 80 }),
      enemies: [
        enemy({ index: 0, name: "Leader", hp: 6, attacks: [{ damage: 10, hits: 1 }] }),
        enemy({ index: 1, name: "Minion", hp: 30, minion: true, attacks: [{ damage: 5, hits: 1 }] }),
      ],
      fightKind: "monster",
    });
    expect(result.plans[0]!.outcome.winsFight).toBe(true);
  });
});

describe("Fortifier", () => {
  it("plays Defend before tripling the block (boss floor 17, live run)", async () => {
    const { modelPotion } = await import("../src/strategy/card-model.js");
    const fortifier = modelPotion("FORTIFIER", "fortifier", 0, [], 0)!;
    const result = solveTurn({
      hand: [defend(0), fortifier],
      player: player({ hp: 19, energy: 1 }),
      enemies: [enemy({ hp: 62, attacks: [{ damage: 12, hits: 1 }] })],
      fightKind: "boss",
    });
    const best = result.plans[0]!;
    expect(best.steps.map((step) => step.cardId.split(":")[0])).toEqual(["DEFEND_IRONCLAD", "POTION"]);
    expect(best.outcome.hpLoss).toBe(0);
  });
});

describe("status cards in hand", () => {
  it("plays Toxic to exhaust it instead of eating 5 damage each (floor 22, live run)", () => {
    const toxic = (index: number): CardModel => card(index, "TOXIC", { type: "Status", target: "none", validTargets: [], heldPenalty: 5, exhausts: true });
    const result = solveTurn({
      hand: [toxic(0), toxic(1)],
      player: player({ hp: 33, energy: 3 }),
      enemies: [enemy({ hp: 45, attacks: [{ damage: 15, hits: 1 }] })],
      fightKind: "monster",
    });
    const best = result.plans[0]!;
    expect(best.steps.length).toBe(2);
    expect(best.outcome.hpLoss).toBe(15);
  });
});

describe("Duplication potion", () => {
  it("plays the next card twice (floor 12 elite, live run)", async () => {
    const { modelPotion } = await import("../src/strategy/card-model.js");
    const dup = modelPotion("DUPLICATOR", "dup", 2, [], 5)!;
    const setup = card(0, "SETUP_STRIKE", { damage: 7, tempStrength: 3 });
    const result = solveTurn({
      hand: [dup, setup, strike(1), card(2, "TWIN_STRIKE", { damage: 5, hits: 2 })],
      player: player({ hp: 67, maxHp: 92, energy: 3 }),
      enemies: [enemy({ hp: 42, attacks: [{ damage: 4, hits: 4 }] })],
      fightKind: "elite",
    });
    const best = result.plans[0]!;
    expect(best.outcome.winsFight).toBe(true);
    expect(best.steps[0]!.cardId.startsWith("POTION:DUPLICATOR")).toBe(true);
  });
});

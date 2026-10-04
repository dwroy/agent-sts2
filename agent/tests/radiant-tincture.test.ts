/**
 * Radiant Tincture (明耀酊剂): 「获得{Energy}。在你的下{RadiancePower}个回合开始时，额外获得1点能量。」 Energy 1,
 * RadiancePower 3. Y3XT F48: not in POTION_EFFECTS, so it was "unsimulated" and never offered T1-T3 of
 * the last boss; now it is a normal line: 1 energy now, and 1 more on each of the next 3 turns.
 */

import { describe, expect, it } from "vitest";

import { modelPotion, type CardModel } from "../src/strategy/card-model.js";
import { rolloutDecision, type FightMeta } from "../src/strategy/rollout.js";
import { RADIANCE_ENERGY_VALUE, RADIANCE_LATER_ENERGY, solveTurn, type EnemySim, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";

function strike(index: number): CardModel {
  return {
    index, key: `c${index}`, cardId: "STRIKE", name: "Strike", type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true,
    target: "single", validTargets: [0], damage: 6, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0,
    enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0, draw: 0, exhausts: false, special: null, known: true,
    flatValue: 0, heldPenalty: 0, text: "",
  };
}

/** Every read advances 0.01 ms: the budget never cuts the horizon. */
function fakeClock(): () => number {
  let t = 0;
  return () => (t += 0.01);
}

const META: FightMeta = { act: 3, t: 1, asc: 8, kind: "boss", enc: "DUMMY", deck: { n: 30, atk: 30, skl: 0, pow: 0, junk: 0, dmg: 180, blk: 0, up: 0 }, relics: 1, max_en: 3 };
const player: PlayerSim = { hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
const dummy: EnemySim = { index: 0, name: "Dummy", hp: 900, maxHp: 900, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] };

describe("Radiant Tincture is a potion line", () => {
  const tincture = modelPotion("RADIANT_TINCTURE", "Radiant Tincture", 0, [])!;

  it("models 1 energy now and the 3 later energies", () => {
    expect(tincture).not.toBeNull();
    expect(tincture.energyGain).toBe(1);
    expect(tincture.special).toBe("radiance");
  });

  it("the solver plays a 4th card with it and counts the later energy as lasting value", () => {
    const hand = [strike(0), strike(1), strike(2), strike(3), tincture];
    const plans = solveTurn({ hand, player, enemies: [dummy], fightKind: "boss", turn: 1 }).plans;
    const drunk = plans.find((plan) => plan.steps.some((step) => step.cardId.startsWith("POTION:RADIANT_TINCTURE")) && plan.steps.length === 5)!;
    const dry = plans.find((plan) => plan.steps.every((step) => !step.cardId.startsWith("POTION:")))!;
    expect(drunk.outcome.damageDealt).toBe(24);
    expect(dry.outcome.damageDealt).toBe(18);
    expect(drunk.outcome.lasting - dry.outcome.lasting).toBeCloseTo(RADIANCE_ENERGY_VALUE * RADIANCE_LATER_ENERGY, 5);
  });

  it("the rollout's next turns have the extra energy (4 Strikes a turn instead of 3)", () => {
    const hand = [strike(0), strike(1), strike(2), strike(3), tincture];
    const solver: SolverInput = { hand, player, enemies: [dummy], fightKind: "boss", turn: 1 };
    const plans = solveTurn(solver).plans;
    const drunk = plans.find((plan) => plan.steps.some((step) => step.cardId.startsWith("POTION:RADIANT_TINCTURE")) && plan.steps.length === 5)!;
    const dry = plans.find((plan) => plan.steps.length === 3 && plan.steps.every((step) => step.cardId === "STRIKE"))!;
    const draw = Array.from({ length: 40 }, (_, i) => strike(10 + i));
    const result = rolloutDecision({
      solver, plans, enemies: [{ index: 0, id: "DUMMY", move: null, strength: 0, powers: {} }], tables: {},
      piles: { draw, discard: [], handBase: hand }, meta: META, playerPowers: {}, potions: 1, mm: {},
      model: null, gates: null, options: { budgetMs: 1e9, now: fakeClock(), seed: 5, include: [drunk, dry], horizon: 5, samples: 8 },
    });
    const line = (plan: typeof drunk) => result.lines.find((entry) => entry.plan === plan)!;
    // Turns 2-4 (perTurn[0..2]) get the Radiance energy, turn 5 does not.
    expect(line(drunk).perTurn.slice(0, 3).map((turn) => turn.dmg.mean)).toEqual([24, 24, 24]);
    expect(line(drunk).perTurn[3]!.dmg.mean).toBe(18);
    // The line that keeps it drinks it on turn 2: 4 Strikes on turns 2-5.
    expect(line(dry).perTurn.map((turn) => turn.dmg.mean)).toEqual([24, 24, 24, 24]);
  });

  it("Radiance already up (RADIANCE_POWER 2 after a drink) gives the next 2 rollout turns their energy", () => {
    const hand = [strike(0), strike(1), strike(2)];
    const solver: SolverInput = { hand, player, enemies: [dummy], fightKind: "boss", turn: 2 };
    const plans = solveTurn(solver).plans;
    const draw = Array.from({ length: 40 }, (_, i) => strike(10 + i));
    const result = rolloutDecision({
      solver, plans, enemies: [{ index: 0, id: "DUMMY", move: null, strength: 0, powers: {} }], tables: {},
      piles: { draw, discard: [], handBase: hand }, meta: META, playerPowers: { RADIANCE_POWER: 2 }, potions: 0, mm: {},
      model: null, gates: null, options: { budgetMs: 1e9, now: fakeClock(), seed: 6, include: [plans[0]!], horizon: 5, samples: 8 },
    });
    expect(result.lines[0]!.perTurn.map((turn) => turn.dmg.mean)).toEqual([24, 24, 18, 18]);
  });
});

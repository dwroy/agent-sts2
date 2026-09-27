/**
 * Threats the solver used to miss: a sleeper woken into next turn (FH3M F30, RC9A F27), Vital Spark
 * (KQK2 F25), Ravenous (5JU3 F11) and Ritual growth in next turn's hit (NX48 F35).
 */

import { describe, expect, it } from "vitest";

import { nextDamageWithGrowth } from "../src/knowledge/move-model.js";
import type { CardModel } from "../src/strategy/card-model.js";
import { solveTurn, WAKE_MARGIN, wokenHits, type EnemySim, type PlayerSim } from "../src/strategy/turn-solver.js";

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0, 1],
    damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0,
    draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...overrides,
  };
}
const enemy = (over: Partial<EnemySim> = {}): EnemySim => ({ index: 0, name: "E", hp: 40, maxHp: 40, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...over });
const player = (over: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 14, maxHp: 86, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, ...over });

describe("wake danger", () => {
  // FH3M F30 T2: 14 HP, Slumbering Beetle at Slumber 2 behind 0 block, a bowlbug hitting 6. An AoE
  // (Inferno via Offering) chips the beetle: Slumber 2 -> 1, it wakes on its own turn and ROLL_OUT 16
  // lands next turn. A single-target line on the bowlbug lets it sleep.
  const beetle = enemy({ index: 0, name: "Slumbering Beetle", hp: 89, maxHp: 89, slumber: 2, wakeHit: 16 });
  const bowlbug = enemy({ index: 1, name: "Rock Bowlbug", hp: 20, maxHp: 46, attacks: [{ damage: 6, hits: 1 }] });
  const aoe = card(0, "INFERNO_BLAST", { target: "all", validTargets: [], damage: 7, cost: 2 });
  const hit = card(1, "STRIKE", { damage: 9, cost: 1 });
  const defend = card(2, "DEFEND", { type: "Skill", target: "self", validTargets: [], block: 5 });

  it("counts the woken sleeper's first hit on the lines that wake it", () => {
    const result = solveTurn({ hand: [aoe, hit, defend], player: player(), enemies: [beetle, bowlbug], fightKind: "monster", nextIncoming: 6 });
    const waking = result.plans.find((plan) => plan.steps.some((step) => step.cardId === "INFERNO_BLAST"));
    expect(waking?.outcome.wakeHit).toBe(16);
    const quiet = result.plans.find((plan) => !plan.steps.some((step) => step.cardId === "INFERNO_BLAST"));
    expect(quiet?.outcome.wakeHit ?? 0).toBe(0);
    // The best line lets it sleep: the waking line ends within 16 + 6 + margin of next turn's hits.
    expect(result.plans[0]!.steps.map((step) => step.cardId)).not.toContain("INFERNO_BLAST");
    expect(waking!.outcome.hpAfter).toBeLessThanOrEqual(6 + 16 + WAKE_MARGIN);
  });

  it("Slumber 3 chipped once still sleeps through next turn; Asleep 1 wakes anyway (no extra hit)", () => {
    const start = [enemy({ slumber: 3, wakeHit: 16 }), enemy({ index: 1, asleep: 1, wakeHit: 20 })];
    const after = [
      { ...start[0]!, slumber: 2, alive: true, newlyWeak: false, strengthDelta: 0, lostThisTurn: 1 },
      { ...start[1]!, asleep: 0, alive: true, newlyWeak: false, strengthDelta: 0, lostThisTurn: 1 },
    ];
    expect(wokenHits(after, { hand: [], player: player(), enemies: start, fightKind: "monster" })).toBe(0);
  });
});

describe("Vital Spark (KQK2 F25 T5)", () => {
  it("every Skill played adds the Spark to each hit this turn", () => {
    // JAB 15 against 16 block from three Skills: predicted 0, took 11 (Vital Spark 4).
    const prism = enemy({ name: "Infested Prism", hp: 171, maxHp: 171, attacks: [{ damage: 15, hits: 1 }], vitalSpark: 4 });
    const skill = (index: number, block: number) => card(index, `BLOCK${index}`, { type: "Skill", target: "self", validTargets: [], block, cost: 1 });
    const result = solveTurn({ hand: [skill(0, 6), skill(1, 5), skill(2, 5)], player: player({ hp: 18 }), enemies: [prism], fightKind: "elite" });
    const all = result.plans.find((plan) => plan.steps.length === 3)!;
    expect(all.outcome.hpLoss).toBe(15 + 3 * 4 - 16);
    const none = result.plans.find((plan) => plan.steps.length === 0)!;
    expect(none.outcome.hpLoss).toBe(15);
  });
});

describe("Ravenous (5JU3 F11 T3)", () => {
  it("killing one slug stuns the others this turn and feeds them Strength", () => {
    const slug = (index: number, hp: number) => enemy({ index, name: `Slug ${index}`, hp, maxHp: 29, attacks: [{ damage: 3, hits: 2 }], ravenous: 4 });
    const kill = card(0, "STRIKE", { damage: 6, validTargets: [0, 1, 2] });
    const result = solveTurn({ hand: [kill], player: player({ hp: 13, energy: 1 }), enemies: [slug(0, 1), slug(1, 27), slug(2, 28)], fightKind: "monster" });
    const eat = result.plans.find((plan) => plan.steps[0]?.target === 0)!;
    // The two survivors skip their attacks this turn (13 -> 13).
    expect(eat.outcome.hpLoss).toBe(0);
    const chip = result.plans.find((plan) => plan.steps[0]?.target === 1)!;
    expect(chip.outcome.hpLoss).toBe(18);
  });
});

describe("Ritual growth in next turn's hit (NX48 F35)", () => {
  it("an attack repeated next turn hits Ritual more per hit than the one shown", () => {
    // Devoted Sculptor SAVAGE 21 shown at Ritual 9: 30 next turn, not the model's average 22.
    expect(nextDamageWithGrowth(22, 9, [{ damage: 21, hits: 1 }])).toBe(30);
    expect(nextDamageWithGrowth(22, 0, [{ damage: 21, hits: 1 }])).toBe(22);
    expect(nextDamageWithGrowth(null, 3, [])).toBeNull();
    expect(nextDamageWithGrowth(10, 3, [])).toBe(13);
  });
});

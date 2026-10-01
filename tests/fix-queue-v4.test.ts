/**
 * The V4.1 A8 window's code bugs (notes/fix-queue-v4.md). One describe per fix; the boards are synthetic or the logged
 * numbers of the question written into the test, never the refreshing knowledge files; no LLM, nothing written to logs/.
 */

import { describe, expect, it } from "vitest";

import { hpGuardNote, hpGuardReplacement, hpGuardSlack } from "../src/screens/combat-plan.js";
import { potionEffect, potionShell } from "../src/strategy/card-model.js";
import type { LineEstimate } from "../src/strategy/rollout.js";
import { pickRolloutBest, rolloutTies } from "../src/strategy/rollout-live.js";
import { solveTurn, type EnemySim, type Plan, type PlayerSim } from "../src/strategy/turn-solver.js";

const player = (over: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0, ...over });
const enemy = (over: Partial<EnemySim> = {}): EnemySim => ({ index: 0, name: "Dummy", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...over });

/** A rollout line as the saturated ranking reads it: this turn's exact loss, deaths, enemy HP left, turns alive. */
function rolled(name: string, turnLoss: number, over: Partial<LineEstimate> & { hpLoss: number }): LineEstimate {
  return {
    plan: { steps: [], name, outcome: { hpLoss: turnLoss } } as unknown as Plan,
    value: -over.hpLoss - 40,
    wins: 0,
    deaths: 8,
    samples: 8,
    enemyHpLeft: 100,
    turnsSurvived: 3,
    leaderHpLeft: null,
    ...over,
  } as LineEstimate;
}

describe("1. A saturated board ranks by the fight's progress, not this turn's HP loss (fix-queue-v4 rollout-live:488-494)", () => {
  it("CDR0Q6929CKR F33 T5 (the Insatiable, 40 HP, every line dead 8/8): -16 leaving ~66 over the turtle -9 leaving ~116", () => {
    // The logged question's numbers (decisions.jsonl): this turn's loss, enemy HP left, turns alive; further loss 40 = our HP.
    const logged: [string, number, number, number][] = [
      ["plan1", 17, 89, 2.6],
      ["plan2", 16, 66, 3],
      ["plan3", 16, 102, 2.6],
      ["plan4", 10, 90, 3],
      ["plan5", 15, 123, 2.6],
      ["plan6", 9, 116, 3],
      ["plan7", 16, 120, 3],
      ["p1", 17, 70, 2.6],
    ];
    const lines = logged.map(([name, loss, left, alive]) => rolled(name, loss, { hpLoss: 40, enemyHpLeft: left, turnsSurvived: alive }));
    const picked = pickRolloutBest(lines, 40);
    expect(picked.saturated).toBe(true);
    // Was plan6 ("防御, 坚毅": 0 damage, the least HP lost this turn).
    expect((picked.best!.plan as unknown as { name: string }).name).toBe("plan2");
    expect(rolloutTies(picked, lines, lines.map((line) => line.plan)).best).toBe(picked.best);
  });

  it("HME0FA7VA0J6 F33 T3 (Kaiser Crab, 4 samples, every line dead 4/4): the turtle line leaving 198 is not the best", () => {
    const logged: [string, number, number, number][] = [
      ["plan1 Whirlwind+", 18, 165, 4],
      ["plan2 Inferno+, Whirlwind+", 19, 146, 4],
      ["plan3", 12, 192, 4],
      ["plan5 Demon Form+", 18, 175, 4],
      ["plan6 Defend, Strike, Whirlwind+", 7, 198, 4.3],
      ["plan7", 8, 150, 4.3],
    ];
    const lines = logged.map(([name, loss, left, alive]) => rolled(name, loss, { hpLoss: 80, samples: 4, deaths: 4, enemyHpLeft: left, turnsSurvived: alive }));
    const picked = pickRolloutBest(lines, 80);
    expect(picked.saturated).toBe(true);
    expect((picked.best!.plan as unknown as { name: string }).name).toBe("plan2 Inferno+, Whirlwind+");
  });

  it("deaths still come first; the same progress and turns alive: this turn's loss; equal on every key: tied", () => {
    const lives = rolled("lives once", 12, { hpLoss: 40, deaths: 7, enemyHpLeft: 150 });
    const races = rolled("races", 20, { hpLoss: 40, deaths: 8, enemyHpLeft: 60 });
    expect(pickRolloutBest([races, lives], 40).best).toBe(lives);
    const a = rolled("a", 14, { hpLoss: 40, enemyHpLeft: 80, turnsSurvived: 3 });
    const b = rolled("b", 9, { hpLoss: 40, enemyHpLeft: 80.5, turnsSurvived: 3.05 });
    expect(pickRolloutBest([a, b], 40).best).toBe(b);
    const longer = rolled("longer", 20, { hpLoss: 40, enemyHpLeft: 80.5, turnsSurvived: 3.5 });
    expect(pickRolloutBest([a, b, longer], 40).best).toBe(longer);
    const c = rolled("c", 9, { hpLoss: 40, enemyHpLeft: 80, turnsSurvived: 3 });
    expect(pickRolloutBest([b, c], 40)).toEqual({ best: null, saturated: true, tied: [b, c] });
  });
});

describe("2. One sample never saturates; a healing drink is not taken off this turn's loss (fix-queue-v4 rollout-live:479/458/493)", () => {
  it("F4K88F267RCX F48 T1 (\"3-turn rollout (1 sample)\", every line capped at our 63 HP): not saturated", () => {
    const one = (name: string, loss: number, left: number) => rolled(name, loss, { hpLoss: 63, samples: 1, deaths: 0, enemyHpLeft: left, turnsSurvived: 3 });
    const lines = [one("plan1", 17, 497), one("plan3", 6, 487), one("plan4", 7, 531)];
    const picked = pickRolloutBest(lines, 63);
    expect(picked.saturated).toBe(false);
    // Two samples or more, the same numbers: saturated as before.
    expect(pickRolloutBest(lines.map((line) => ({ ...line, samples: 2 })), 63).saturated).toBe(true);
  });

  it("W80JV2YVC8UZ F48 T1: Blood Potion at 84/88 heals 4; the line counts what the turn takes, not net of the heal", () => {
    const blood = { ...potionShell("BLOOD_POTION", "Blood Potion", 0, []), ...potionEffect("BLOOD_POTION")! };
    const solved = solveTurn({ hand: [blood], player: player({ hp: 84, maxHp: 88, energy: 0 }), enemies: [enemy({ attacks: [{ damage: 10, hits: 1 }] })], fightKind: "boss", turn: 1 });
    const drink = solved.plans.find((plan) => plan.steps.length === 1)!;
    expect(drink.outcome.hpLoss).toBe(6);
    expect(drink.outcome.potionHeal).toBe(4);
    expect(solved.plans.find((plan) => plan.steps.length === 0)!.outcome.potionHeal).toBeUndefined();
    // Saturated, the same progress and turns alive: the drink line nets 2 (6 taken, 4 healed), the dry one loses 5.
    const drinks = rolled("drinks", 2, { hpLoss: 84, enemyHpLeft: 300 });
    (drinks.plan.outcome as { potionHeal?: number }).potionHeal = 4;
    const dry = rolled("dry", 5, { hpLoss: 84, enemyHpLeft: 300 });
    expect(pickRolloutBest([drinks, dry], 84)).toMatchObject({ best: dry, saturated: true });
  });
});

describe("3. The elite/boss HP guard compares HP lost, not the potions' held value (fix-queue-v4 combat-plan:478-480)", () => {
  const line = (name: string, hpLoss: number, potionCost = 0): Plan =>
    ({
      steps: potionCost > 0 ? [{ cardId: "POTION:FYSH_OIL:0", name: "potion Fysh Oil", cardIndex: 100, target: null, upgraded: false, targetName: null }] : [{ cardId: "STRIKE_IRONCLAD", name, cardIndex: 0, target: 0, upgraded: false, targetName: "Eel" }],
      score: 0,
      outcome: { hpLoss, winsFight: false, dies: false, damageDealt: 12, ...(potionCost > 0 ? { potionCost } : {}) },
    }) as unknown as Plan;

  it("G3MU2NADPEDU F9 (Terror Eel, 50 HP): Fysh Oil (held value 9.1) at the same HP loss as the dry line is not vetoed", () => {
    const slack = hpGuardSlack(50, "elite");
    expect(slack).toBe(8);
    const oil = line("oil", 6, 9.1);
    const dry = line("dry", 6);
    expect(hpGuardReplacement(oil, [dry, oil], 50, slack)).toBeNull();
    // More HP lost than the slack allows still trips it, whatever the cost.
    const dearOil = line("oil, no block", 16, 9.1);
    expect(hpGuardReplacement(dearOil, [dry, dearOil], 50, slack)).toBe(dry);
    expect(hpGuardNote(2, dearOil, slack, 1, dry)).not.toMatch(/potions/);
  });

  it("a boss fight: potions cost 0 there, the guard reads the same either way", () => {
    const drink = line("drink", 10, 0);
    const dry = line("dry", 4);
    expect(hpGuardReplacement(drink, [dry, drink], 80, hpGuardSlack(80, "boss"))).toBeNull();
  });
});

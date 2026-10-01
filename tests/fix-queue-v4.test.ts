/**
 * The V4.1 A8 window's code bugs (notes/fix-queue-v4.md). One describe per fix; the boards are synthetic or the logged
 * numbers of the question written into the test, never the refreshing knowledge files; no LLM, nothing written to logs/.
 */

import { describe, expect, it } from "vitest";

import type { LineEstimate } from "../src/strategy/rollout.js";
import { pickRolloutBest, rolloutTies } from "../src/strategy/rollout-live.js";
import type { Plan } from "../src/strategy/turn-solver.js";

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

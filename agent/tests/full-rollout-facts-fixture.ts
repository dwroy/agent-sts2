import { vi } from "vitest";
import * as live from "../src/reflex/rollout-live.js";
import type { LineEstimate } from "../src/reflex/rollout.js";
import { withPotionWorkFixture } from "./apotheosis-potion-fixture.js";

/** Synthetic full-size receipts for format consumers, not forecasts about the logged fight. */
function fullFacts(args: live.LiveRolloutArgs): live.LiveRollout {
  const lines: LineEstimate[] = args.shown.map((plan, index) => ({
    plan, order: null, orders: [], tags: [], score: plan.score, currentValue: 0,
    oneTurn: { hpLoss: 0, winProb: 0.5, turns: 1, modelValue: null, value: 0 },
    hpLoss: 4 + index, value: -24 - index, enemyHpLeft: 40, leaderHpLeft: null,
    turnsSurvived: 5, turnsToWin: null, deaths: 0, turnsToDeath: null,
    winProb: 0.5, wins: 0, horizon: 5, samples: 8,
    perTurn: [2, 3, 4, 5].map(turn => ({ turn, fighting: 8,
      loss: { mean: 1, min: 0, max: 2 }, dmg: { mean: 2, min: 1, max: 3 }, alive: 8, won: 0 })),
    valueModelTerminal: null, modelForecast: { oneTurn: null, rollout: { hpLoss: 12, winProb: 0.5 } },
    basis: { rolloutSamples: 8, horizon: 5, modelN: 30, w: 0, segment: "none", gateN: 0 },
  }));
  return {
    available: true, best: args.shown[0] ?? null, tied: [], saturated: false,
    result: { lines, orders: [], horizon: 5, samples: 8, elapsedMs: 0, degraded: [],
      policyTurns: 0, policyMs: 0, policyNodes: 0 },
    byPlan: new Map(lines.map(line => [line.plan, line])),
    meta: { act: 2, t: 3, asc: 8, kind: "hallway", enc: "fixed-facts",
      deck: { n: 0, atk: 0, skl: 0, pow: 0, junk: 0, dmg: 0, blk: 0, up: 0 }, relics: 0, max_en: 3 },
    gate: { segment: "enc:fixed-facts", w: 0, n: 30, advantage: 0, ci: [null, null] },
    encounterN: 30, minRows: 30, potionsHeld: false, potionCostsHeld: false,
    revives: [], lossCap: args.solver.player.hp, ordersDropped: 0, noPotion: null,
    spentMs: 0, elapsedMs: 0,
  };
}

/** Keep the real solver, question renderer and resolver; bound only their fixture's sampling work. */
export function withFullRolloutFacts<T>(run: () => T): T {
  const sampler = vi.spyOn(live, "liveRollout").mockImplementation(fullFacts);
  try {
    return withPotionWorkFixture(run);
  } finally {
    sampler.mockRestore();
  }
}

import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { ROLLOUT_BUDGET_MS, rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { withRolloutFixtureClock } from "./rollout-clock-fixture.js";

/** The ZY39 ranking fixture needs T3-T5, not an unbounded five-turn sampling run. */
export function withBatchCIllusionFixture<T>(run: () => T): T {
  const previousBudget = rolloutLiveOptions.budgetMs;
  const previousPotionClock = potionMcOptions.now;
  rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
  potionMcOptions.now = () => 0;
  try {
    return withRolloutFixtureClock(run);
  } finally {
    rolloutLiveOptions.budgetMs = previousBudget;
    potionMcOptions.now = previousPotionClock;
  }
}

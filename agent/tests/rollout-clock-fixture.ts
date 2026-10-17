import { ROLLOUT_BUDGET_MS, rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { withPotionWorkFixture } from "./apotheosis-potion-fixture.js";

/** Budget fixtures measure simulated work, independently of pauses by the OS scheduler. */
export function withRolloutFixtureClock<T>(run: () => T, step = 3): T {
  const previous = rolloutLiveOptions.now;
  let elapsed = 0;
  rolloutLiveOptions.now = () => (elapsed += step);
  try {
    return run();
  } finally {
    rolloutLiveOptions.now = previous;
  }
}

/** Ranking transport replays keep the production budget and bound work across all logged boards. */
export function withRolloutRankingFixture<T>(run: () => T, workStep = 3): T {
  const budget = rolloutLiveOptions.budgetMs;
  rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
  try {
    return withPotionWorkFixture(() => withRolloutFixtureClock(run, workStep));
  } finally {
    rolloutLiveOptions.budgetMs = budget;
  }
}

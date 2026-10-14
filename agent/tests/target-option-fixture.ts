import { ROLLOUT_BUDGET_MS } from "../src/reflex/rollout-live.js";
import { withRolloutRankingFixture } from "./rollout-clock-fixture.js";

/** Target-label transport needs the real planner under a finite, repeatable work clock. */
export function withTargetOptionFixture<T>(run: (budgetMs: number) => T): T {
  return withRolloutRankingFixture(() => run(ROLLOUT_BUDGET_MS));
}

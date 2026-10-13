import type { Decision } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { logged, loggedEnv } from "./logged.js";
import { withRolloutFixtureClock } from "./rollout-clock-fixture.js";

/** Replay the held-potion facts contract without treating host pauses as simulated work. */
export function heldPotionFixture(): Decision | null {
  const enabled = rolloutLiveOptions.enabled;
  const potionNow = potionMcOptions.now;
  rolloutLiveOptions.enabled = true;
  potionMcOptions.now = () => 0;
  try {
    return withRolloutFixtureClock(() => planCombatTurn(loggedEnv(logged("v1mf-f33-t4"), { jevContext: "v1" })), 0);
  } finally {
    rolloutLiveOptions.enabled = enabled;
    potionMcOptions.now = potionNow;
  }
}

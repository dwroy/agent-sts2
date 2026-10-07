import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";

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

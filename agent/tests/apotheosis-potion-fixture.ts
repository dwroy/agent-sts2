import { MC_SAMPLES, potionMcOptions } from "../src/reflex/potion-mc.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";

/** Reference transport needs a real median forecast, with work independent of host scheduling. */
export function withApotheosisPotionFixture<T>(run: () => T): T {
  const previous = potionMcOptions.now;
  let work = 0;
  potionMcOptions.now = () => (work += 100);
  try {
    return run();
  } finally {
    potionMcOptions.now = previous;
  }
}

/** Fixed planner fixtures charge bounded sample work rather than scheduler pauses. */
export function withPotionWorkFixture<T>(run: () => T): T {
  const previous = { now: potionMcOptions.now, budget: potionMcOptions.budgetMs, samples: potionMcOptions.samples };
  let work = 0;
  potionMcOptions.now = () => (work += 100);
  potionMcOptions.budgetMs = 400;
  potionMcOptions.samples = MC_SAMPLES;
  try {
    return run();
  } finally {
    potionMcOptions.now = previous.now;
    potionMcOptions.budgetMs = previous.budget;
    potionMcOptions.samples = previous.samples;
  }
}

/** Question determinism needs repeated seeded outcomes, within a finite work budget. */
export function withPotionQuestionFixture<T>(run: () => T): T {
  const previous = rolloutLiveOptions.enabled;
  rolloutLiveOptions.enabled = false;
  try {
    return withPotionWorkFixture(run);
  } finally {
    rolloutLiveOptions.enabled = previous;
  }
}

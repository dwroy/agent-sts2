import { potionMcOptions } from "../src/reflex/potion-mc.js";

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

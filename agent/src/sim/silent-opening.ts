/** TXZ6RVMQA09D A10 F43/45/46/48/49, silent-0255: five pre-action four-HP losses. */
import { asArray, asRecord, str } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";

// Only companions actually held in the observed run; other combinations keep the unmodelled path.
const OBSERVED_COMPANIONS = new Set([
  "RING_OF_THE_SNAKE", "LOST_COFFER", "ORICHALCUM", "REPTILE_TRINKET", "KUSARIGAMA", "PAELS_BLOOD",
  "BOOK_OF_FIVE_RINGS", "AMETHYST_AUBERGINE", "SAI", "ROYAL_POISON", "RIPPLE_BASIN", "NUNCHAKU",
]);

/** Fresh simulated fights only; live T1 and SL-restored boards already include the opening. */
export function observedRoyalPoisonOpeningLoss(state: GameState): number {
  const run = asRecord(state.run?.raw);
  if (str(run["character_id"]).toLowerCase() !== "silent" || state.run?.ascension !== 10) return 0;
  const relics = asArray(run["relics"]).map(asRecord);
  if (!relics.some((r) => str(r["relic_id"]) === "ROYAL_POISON")
    || relics.some((r) => !OBSERVED_COMPANIONS.has(str(r["relic_id"])) || r["is_melted"] === true)) return 0;
  // Every occupied potion in these openings was manually usable in combat; no automatic revive was observed.
  if (asArray(run["potions"]).map(asRecord).some((p) => p["occupied"] === true && str(p["usage"]) !== "CombatOnly")) return 0;
  return 4;
}

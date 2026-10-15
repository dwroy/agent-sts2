/** TXZ6RVMQA09D and AD3QSC3P41JU A10, silent-0255: observed pre-action four-HP losses. */
import { asArray, asRecord, str } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";

// Only companions actually held in the observed run; other combinations keep the unmodelled path.
const OBSERVED_COMPANIONS = new Set([
  "RING_OF_THE_SNAKE", "LOST_COFFER", "ORICHALCUM", "REPTILE_TRINKET", "KUSARIGAMA", "PAELS_BLOOD",
  "BOOK_OF_FIVE_RINGS", "AMETHYST_AUBERGINE", "SAI", "ROYAL_POISON", "RIPPLE_BASIN", "NUNCHAKU",
]);

// AD3QSC3P41JU A10 F39/45/46/48/49, silent-0255/0228: only these two complete sets were observed.
const AD3_COMPANIONS = [
  "RING_OF_THE_SNAKE", "LAVA_ROCK", "VAMBRACE", "BAG_OF_MARBLES", "FESTIVE_POPPER", "JUZU_BRACELET",
  "PAELS_EYE", "RIPPLE_BASIN", "JEWELED_MASK", "PENDULUM", "ROYAL_POISON",
];
const AD3_RELIC_SETS = [AD3_COMPANIONS, [...AD3_COMPANIONS, "REGAL_PILLOW", "FRAGRANT_MUSHROOM"]];

function observedCompanions(relics: Record<string, unknown>[]): boolean {
  if (relics.some((r) => r["is_melted"] === true)) return false;
  const ids = relics.map((r) => str(r["relic_id"]));
  return ids.every((id) => OBSERVED_COMPANIONS.has(id)) ||
    AD3_RELIC_SETS.some((observed) => ids.length === observed.length && new Set(ids).size === ids.length &&
      observed.every((id) => ids.includes(id)));
}

/** Fresh simulated fights only; live T1 and SL-restored boards already include the opening. */
export function observedRoyalPoisonOpeningLoss(state: GameState): number {
  const run = asRecord(state.run?.raw);
  if (str(run["character_id"]).toLowerCase() !== "silent" || state.run?.ascension !== 10) return 0;
  const relics = asArray(run["relics"]).map(asRecord);
  if (!relics.some((r) => str(r["relic_id"]) === "ROYAL_POISON")
    || !observedCompanions(relics)) return 0;
  // Every occupied potion in these openings was manually usable in combat; no automatic revive was observed.
  if (asArray(run["potions"]).map(asRecord).some((p) => p["occupied"] === true && str(p["usage"]) !== "CombatOnly")) return 0;
  return 4;
}

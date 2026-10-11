import { asArray, asRecord, str } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";

const OBSERVED_RELICS = ["BLOOD_VIAL", "CENTENNIAL_PUZZLE", "JUZU_BRACELET", "LOST_COFFER",
  "PAELS_FLESH", "RING_OF_THE_SNAKE", "SWORD_OF_STONE"];
const OBSERVED_POWERS = new Map<string, number>([
  ["MIND_ROT_POWER", 1], ["PLATING_POWER", 2], ["ACCELERANT_POWER", 1], ["SLOTH_POWER", 3],
]);

/** KFRDELW2TH2P F33 T7, silent-0278: six related drinks each add six, without immediate HP damage. */
export function observedDemonPoison(state: GameState): number | null {
  if (!state.in_combat || state.run?.ascension !== 10 ||
      str(asRecord(state.run.raw)["character_id"]).toUpperCase() !== "SILENT") return null;
  const run = asRecord(state.run.raw);
  const relics = asArray(run["relics"]).map((r) => str(asRecord(r)["relic_id"])).sort();
  // Keep the complete observed modifier combination; missing or new relics are not assumed neutral.
  if (relics.length !== OBSERVED_RELICS.length || relics.some((id, i) => id !== OBSERVED_RELICS[i])) return null;
  const combat = asRecord(state.raw["combat"]);
  const powers = asArray(asRecord(combat["player"])["powers"]).map(asRecord);
  if (powers.length !== OBSERVED_POWERS.size || new Set(powers.map((p) => p["power_id"])).size !== powers.length ||
      powers.some((p) => !OBSERVED_POWERS.has(str(p["power_id"])) ||
        OBSERVED_POWERS.get(str(p["power_id"])) !== p["amount"])) return null;
  const enemies = asArray(combat["enemies"]).map(asRecord);
  if (enemies.length !== 1 || enemies[0]!["enemy_id"] !== "KNOWLEDGE_DEMON" || enemies[0]!["is_alive"] !== true) return null;
  const enemyPowers = asArray(enemies[0]!["powers"]).map(asRecord);
  if (enemyPowers.length !== 2 ||
      !enemyPowers.some((p) => p["power_id"] === "STRENGTH_POWER" && p["amount"] === 3) ||
      !enemyPowers.some((p) => p["power_id"] === "POISON_POWER" && typeof p["amount"] === "number" &&
        Number.isFinite(p["amount"]) && p["amount"] > 0)) return null;
  return 6;
}

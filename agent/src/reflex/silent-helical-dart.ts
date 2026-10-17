import { asArray, asRecord, str } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { PlayerSim } from "./turn-solver.js";

/** T0DGVABPV60U A10 F48 T2/T4; silent-0293. Keep unobserved joint triggers on their prior model. */
export function silentHelicalDart(state: GameState): PlayerSim["helicalDart"] {
  const run = asRecord(state.run?.raw);
  if (!state.in_combat || state.run?.ascension !== 10 || str(run["character_id"]).toLowerCase() !== "silent") return undefined;
  const relics = asArray(run["relics"]).map(asRecord);
  const darts = relics.filter((entry) => entry["relic_id"] === "HELICAL_DART");
  if (darts.length !== 1 || darts[0]?.["is_melted"] !== false ||
      relics.some((entry) => ["KUNAI", "SHURIKEN"].includes(str(entry["relic_id"])))) return undefined;
  const combat = asRecord(state.raw["combat"]);
  if (asArray(combat["enemies"]).filter((entry) => Number(asRecord(entry)["current_hp"]) > 0).length !== 1) return undefined;
  const powers = asArray(asRecord(combat["player"])["powers"]).map(asRecord);
  if (powers.some((entry) => ["FRAIL_POWER", "SHADOWMELD_POWER", "UNMOVABLE_POWER", "TENDER_POWER",
    "SPEED_POTION_POWER", "ANTICIPATE_POWER"].includes(str(entry["power_id"])) && Number(entry["amount"]) !== 0)) return undefined;
  const temporary = powers.filter((entry) => entry["power_id"] === "HELICAL_DART_POWER");
  const amount = temporary.length === 0 ? 0 : temporary[0]?.["amount"];
  if (temporary.length > 1 || typeof amount !== "number" || !Number.isInteger(amount) || amount < 0) return undefined;
  return { temporary: amount };
}

import { asArray, asRecord, str } from "../core/util/json.js";
import { monsterMoves, moveDamageAt } from "../knowledge/monster-db.js";

const ENEMY_POWERS = new Set(["BACK_ATTACK_LEFT_POWER", "CRAB_RAGE_POWER", "STRENGTH_POWER", "WEAK_POWER", "POISON_POWER"]);
const PLAYER_POWERS = new Set(["SURROUNDED_POWER", "THORNS_POWER", "AFTERIMAGE_POWER", "ACCELERANT_POWER", "DEXTERITY_POWER"]);
const amount = (raw: Record<string, unknown>, id: string): number => {
  const power = asArray(raw["powers"]).map(asRecord).find((p) => p["power_id"] === id);
  return typeof power?.["amount"] === "number" ? power["amount"] : 0;
};

/** NHA F33 T2, S9 F33 T7; silent-0263/0264. Preserve Weak's fraction before changing facing. */
export function observedCrusherWeakFacing(combat: Record<string, unknown>, enemy: Record<string, unknown>, asc: number | undefined, character: string): { observedWeakFacingBase?: number } {
  if (character.toLowerCase() !== "silent" || asc !== 10 || enemy["enemy_id"] !== "CRUSHER" ||
      enemy["move_id"] !== "ENLARGING_STRIKE_MOVE" || amount(enemy, "WEAK_POWER") !== 1 ||
      ![-2, 3].includes(amount(enemy, "STRENGTH_POWER")) || amount(enemy, "BACK_ATTACK_LEFT_POWER") !== 1 ||
      amount(enemy, "CRAB_RAGE_POWER") !== 1 ||
      asArray(enemy["powers"]).some((p) => !ENEMY_POWERS.has(str(asRecord(p)["power_id"])))) return {};
  const player = asRecord(combat["player"]);
  if (amount(player, "SURROUNDED_POWER") !== 1 ||
      asArray(player["powers"]).some((p) => !PLAYER_POWERS.has(str(asRecord(p)["power_id"])))) return {};
  const living = asArray(combat["enemies"]).map(asRecord).filter((e) => e["is_alive"] === true);
  if (living.length !== 2 || !living.some((e) => e["enemy_id"] === "CRUSHER") ||
      !living.some((e) => e["enemy_id"] === "ROCKET")) return {};
  const intents = asArray(enemy["intents"]).map(asRecord);
  if (intents.length !== 1 || intents[0]?.["intent_type"] !== "Attack" || intents[0]["hits"] !== 1 || typeof intents[0]["damage"] !== "number") return {};
  // JLN/S9 F33 T2 independently show the unmodified 4/6 pair. Read the exact ascension, from its first sample.
  const logged = moveDamageAt(monsterMoves(), "CRUSHER", "ENLARGING_STRIKE_MOVE", asc);
  const base = logged?.base ?? logged?.perHit;
  if (!logged || logged.estimated || logged.from !== asc || logged.hits !== 1 || base !== 4) return {};
  const facingBase = (base + amount(enemy, "STRENGTH_POWER")) * 0.75;
  return [Math.floor(facingBase), Math.floor(facingBase * 1.5)].includes(intents[0]["damage"]) ? { observedWeakFacingBase: facingBase } : {};
}

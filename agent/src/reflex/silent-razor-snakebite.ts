import { asArray, asRecord, num, str } from "../core/util/json.js";

// W1YY8PEWGUF9 F33 T10 / F45 T1, silent-0477/0478: certify the complete action, not upgrade order.
export function observedRazorSnakebiteCard(raw: Record<string, unknown>, character: string, ascension: number | null): boolean {
  const values = asArray(raw["dynamic_values"]).map(asRecord);
  return character.toLowerCase() === "silent" && ascension === 10 && raw["card_id"] === "SNAKEBITE" &&
    raw["upgraded"] === false && raw["energy_cost"] === 2 && raw["costs_x"] === false &&
    raw["star_costs_x"] === false && raw["star_cost"] === 0 && raw["target_type"] === "AnyEnemy" &&
    raw["requires_target"] === true && raw["enchantment"] == null &&
    raw["rules_text"] === "给予{PoisonPower:diff()}层中毒。" &&
    str(raw["resolved_rules_text"]).replace(/\s+/g, "") === "保留。给予7层中毒。重放1。" &&
    values.length === 1 && values[0]?.["name"] === "PoisonPower" &&
    ["base_value", "current_value", "enchanted_value"].every((field) => values[0]?.[field] === 7) &&
    values[0]?.["is_modified"] === false && values[0]?.["was_just_upgraded"] === false;
}

const PLAYER_POWERS = new Set(["DEXTERITY_POWER", "INFINITE_BLADES_POWER", "DEMON_FORM_POWER", "MIND_ROT_POWER",
  "STRENGTH_POWER", "SLOTH_POWER", "DISINTEGRATION_POWER"]);
const ENEMY_POWERS = new Set(["STRENGTH_POWER", "WEAK_POWER"]);

/** undefined: outside this evidence's role/relic; false: held, but the current board is unverified. */
export function observedRazorSnakebiteScope(run: unknown, combat: Record<string, unknown>, ascension: number | null): boolean | undefined {
  const raw = asRecord(run);
  if (str(raw["character_id"]).toLowerCase() !== "silent" || ascension !== 10 ||
      !asArray(raw["relics"]).some((entry) => {
        const relic = asRecord(entry);
        return relic["relic_id"] === "RAZOR_TOOTH" && relic["is_melted"] === false;
      })) return undefined;
  const player = asRecord(combat["player"]);
  const enemies = asArray(combat["enemies"]).map(asRecord).filter((enemy) => num(enemy["current_hp"]) > 0);
  // Unknown powers may alter the action; a missing list is not evidence of their absence.
  return Array.isArray(player["powers"]) && asArray(player["powers"]).every((power) => PLAYER_POWERS.has(str(asRecord(power)["power_id"]))) &&
    enemies.length === 1 && Array.isArray(enemies[0]!["powers"]) &&
    asArray(enemies[0]!["powers"]).every((power) => ENEMY_POWERS.has(str(asRecord(power)["power_id"])));
}

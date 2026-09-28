/**
 * Potion numbers. The mod sends potion descriptions as templates (「获得{Block}点格挡」) and neither the
 * live state nor the game data (`/data/potions`) carries their values, so the models read "{ThornsPower}
 * Thorns" and "damage -{DamageDecrease}%" (W8JD F29-F31: Beetle Juice carried to the 1-HP turn; Liquid
 * Bronze, Speed Potion, Fire Potion shown the same way).
 *
 * Values measured in states.jsonl (A8 runs to 09-28): the power, block, HP, energy or hand size that
 * changed on the drink. E.g. Beetle Juice: SHRINK_POWER 4 on the target and its intent 23 -> 16, 20 -> 14,
 * 14 -> 9 (30% less, rounded down); Liquid Bronze THORNS_POWER 3 (20 drinks); Speed Potion DEXTERITY 5 and
 * SPEED_POTION_POWER 5; Fire Potion 20 (44 drinks, Vulnerable or not); Potion-Shaped Rock 15.
 */

import { stripMarkup } from "../util/json.js";

export const POTION_VALUES: Record<string, Record<string, number>> = {
  BEETLE_JUICE: { Repeat: 4, DamageDecrease: 30 },
  BLOCK_POTION: { Block: 12 },
  BLOOD_POTION: { HealPercent: 20 },
  BOTTLED_POTENTIAL: { Cards: 5 },
  CLARITY: { Cards: 1, ClarityPower: 3 },
  CURE_ALL: { Energy: 1, Cards: 2 },
  DEXTERITY_POTION: { DexterityPower: 2 },
  DISTILLED_CHAOS: { Repeat: 3 },
  ENERGY_POTION: { Energy: 2 },
  EXPLOSIVE_AMPOULE: { Damage: 10 },
  FIRE_POTION: { Damage: 20 },
  FLEX_POTION: { StrengthPower: 5 },
  FOUL_POTION: { Damage: 12 },
  FRUIT_JUICE: { MaxHp: 5 },
  FYSH_OIL: { StrengthPower: 1, DexterityPower: 1 },
  GLOWWATER_POTION: { Cards: 10 },
  HEART_OF_IRON: { PlatingPower: 7 },
  LIQUID_BRONZE: { ThornsPower: 3 },
  LUCKY_TONIC: { BufferPower: 1 },
  MAZALETHS_GIFT: { RitualPower: 1 },
  POTION_OF_BINDING: { WeakPower: 1, VulnerablePower: 1 },
  POTION_SHAPED_ROCK: { Damage: 15 },
  POWDERED_DEMISE: { Demise: 9 },
  RADIANT_TINCTURE: { Energy: 1, RadiancePower: 3 },
  REGEN_POTION: { RegenPower: 5 },
  SHACKLING_POTION: { StrengthPower: 7 },
  SHIP_IN_A_BOTTLE: { Block: 10 },
  SNECKO_OIL: { Cards: 7 },
  SPEED_POTION: { DexterityPower: 5 },
  STABLE_SERUM: { Repeat: 2 },
  STRENGTH_POTION: { StrengthPower: 2 },
  SWIFT_POTION: { Cards: 3 },
  VULNERABLE_POTION: { VulnerablePower: 3 },
  WEAK_POTION: { WeakPower: 3 },
};

/** What an unfilled placeholder reads as: the text around it stays accurate. */
export const UNKNOWN_VALUE = "?(数值未知)";

/**
 * A potion description with its `{Name}` / `{Name:format()}` placeholders filled from POTION_VALUES
 * (energy and star icons as words), the rest marked UNKNOWN_VALUE; markup stripped.
 */
export function fillPotionText(potionId: string, text: string): string {
  const values = POTION_VALUES[potionId] ?? {};
  const filled = text.replace(/\{([A-Za-z]+)(?::([A-Za-z]+)\((\d*)\))?\}/g, (_whole, name: string, format: string | undefined, arg: string | undefined) => {
    const value = arg ? Number(arg) : values[name];
    if (value === undefined) return UNKNOWN_VALUE;
    if (format === "energyIcons") return `${value}点能量`;
    if (format === "starIcons") return `${value}颗星`;
    return String(value);
  });
  return stripMarkup(filled);
}

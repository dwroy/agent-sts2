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
  return fillTemplate(POTION_VALUES[potionId] ?? {}, text);
}

/**
 * Relic numbers known to the code (measured or used by the solver). The game data's relic descriptions are
 * templates too (G8YY F20 shop: 拳刃 「为它附魔：动量{Momentum}」): what is not known here reads as
 * UNKNOWN_VALUE, never as a raw {Name}.
 */
export const RELIC_VALUES: Record<string, Record<string, number>> = {
  // combat-plan MERCURY_HOURGLASS_DAMAGE (PLC F33: Rocket 108 -> 105 at turn start).
  MERCURY_HOURGLASS: { Damage: 3 },
  // combat-plan INTIMIDATING_HELMET_BLOCK (PU21 F12-F14: block 0 -> 4).
  INTIMIDATING_HELMET: { Block: 4 },
  // combat-plan BEATING_REMNANT_CAP (CCPR F48: every Test Subject line cost 20).
  BEATING_REMNANT: { HpLoss: 20, Damage: 20 },
  // combat-plan kusarigamaOf: every 3rd attack, 6 to a random enemy.
  KUSARIGAMA: { Cards: 3, Damage: 6 },
  // relic-notes: heal 25 at the start of each boss fight; +1 max HP a combat.
  PANTOGRAPH: { Heal: 25 },
  CHOSEN_CHEESE: { MaxHp: 1 },
};

/** A relic description with its placeholders filled from RELIC_VALUES (unknown ones marked), markup stripped. */
export function fillRelicText(relicId: string, text: string): string {
  return fillTemplate(RELIC_VALUES[relicId] ?? {}, text);
}

/**
 * A game text with its `{Name}` / `{Name:format()}` placeholders filled from `values` (energy and star
 * icons as words), the rest marked UNKNOWN_VALUE; markup stripped. Conditional templates
 * (`{X.StringValue:cond:…|…}`) keep their fallback wording.
 */
export function fillTemplate(values: Record<string, number>, text: string): string {
  const conditional = text.replace(/\{[A-Za-z.]+:cond:[^|{}]*(?:\{[^}]*\}[^|{}]*)*\|([^}]*)\}/g, (_whole, fallback: string) => fallback);
  const filled = conditional.replace(/\{([A-Za-z]+)(?::([A-Za-z]+)\((\d*)\))?\}/g, (_whole, name: string, format: string | undefined, arg: string | undefined) => {
    const value = arg ? Number(arg) : values[name];
    if (value === undefined) return format === "energyIcons" ? `${UNKNOWN_VALUE}点能量` : format === "starIcons" ? `${UNKNOWN_VALUE}颗星` : UNKNOWN_VALUE;
    if (format === "energyIcons") return `${value}点能量`;
    if (format === "starIcons") return `${value}颗星`;
    return String(value);
  });
  // Anything still in braces (a format this reader does not know) is unknown, not a raw template.
  return stripMarkup(filled.replace(/\{[A-Za-z][^{}]*\}/g, UNKNOWN_VALUE));
}

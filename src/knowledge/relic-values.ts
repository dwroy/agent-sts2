/**
 * Relic numbers. Like potions (potion-values.ts), relic descriptions arrive as templates
 * (「在战斗结束时，回复{Heal}点生命。」) and neither the live state nor /data/relics carries the values.
 * Only values measured in states.jsonl are filled; every other placeholder is marked unknown, never
 * guessed (Dai 2026-09-28: facts for DeepSeek, no invented effects).
 *
 * Measured (A8 runs to 09-28): Burning Blood heals 6 after a fight (841 of 914 fights ending below max
 * HP); Bag of Marbles puts 1 Vulnerable on each enemy at T1 (294 of 311); Toasty Mittens +1 Strength a
 * turn (NZWR: Strength 13 by T11 with Inflame). Measured 09-28 over all logged combat states: Lantern
 * +1 energy on turn 1 (185 of 229 first turns; the rest had other energy sources); Pael's Flesh +1
 * energy from turn 3 (342 of 398 turns ≥3, 0 on turns 1–2 in 232 of 284); Parrying Shield hits a
 * random enemy for 6 when the turn ends with ≥10 block (6 dealt at every block 10–30, never below 10).
 * Measured 09-29: Royal Poison takes 4 HP at the start of each fight (58 of 85 logged fight starts with it
 * lost exactly 4 from the last state before the fight; the rest had other start-of-fight losses or heals).
 */

import { stripMarkup } from "../util/json.js";
import { UNKNOWN_VALUE } from "./potion-values.js";

export const RELIC_VALUES: Record<string, Record<string, number>> = {
  BURNING_BLOOD: { Heal: 6 },
  BAG_OF_MARBLES: { VulnerablePower: 1 },
  TOASTY_MITTENS: { StrengthPower: 1 },
  LANTERN: { Energy: 1 },
  PAELS_FLESH: { Energy: 1 },
  PARRYING_SHIELD: { Block: 10, Damage: 6 },
  ROYAL_POISON: { Damage: 4 },
};

/** A relic description with its `{Name}` placeholders filled from RELIC_VALUES, the rest marked unknown. */
export function fillRelicText(relicId: string, text: string): string {
  const values = RELIC_VALUES[relicId] ?? {};
  const filled = text.replace(/\{([A-Za-z]+)(?::([A-Za-z]+)\((\d*)\))?\}/g, (_whole, name: string, format: string | undefined, arg: string | undefined) => {
    const value = arg ? Number(arg) : values[name];
    if (value === undefined) return UNKNOWN_VALUE;
    if (format === "energyIcons") return `${value}点能量`;
    if (format === "starIcons") return `${value}颗星`;
    return String(value);
  });
  return stripMarkup(filled);
}

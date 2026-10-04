/**
 * Fight hints for Jev (M1, JEV_CONTEXT=v1): short conditional lessons retrieved by enemy id, fight
 * kind, act and HP band from jev-hints.json. Jev has no system prompt and reads things literally, so
 * experience reaches it only as data in the question state, a few relevant lines at a time.
 */

import { readFileSync } from "node:fs";

import { fillGuideFacts } from "../sim/boss-clock.js";
import { fillDbNumbers } from "./monster-db.js";
import { KNOWLEDGE_DIR, knowledgeFile } from "./files.js";

export interface JevHint {
  id: string;
  when: {
    enemies?: string[];
    fight?: string[];
    act?: number[];
    hp_below_pct?: number;
    enemy_powers?: string[];
    no_attack?: boolean;
  };
  text: string;
  evidence: string[];
}

export interface HintQuery {
  /** enemy_id of every living enemy. */
  enemyIds: string[];
  fight: string;
  act: number | null;
  /** Player HP as a percentage of max HP. */
  hpPct: number;
  /** power_id of every power on a living enemy. */
  enemyPowers: string[];
  /** True when no living enemy shows an attack intent this turn. */
  noAttack: boolean;
}

export const MAX_HINTS = 5;
export const MAX_HINT_WORDS = 25;

let cached: JevHint[] | null = null;

export function loadHints(): JevHint[] {
  if (cached) return cached;
  try {
    const path = knowledgeFile(KNOWLEDGE_DIR, "jev-hints.json");
    cached = (JSON.parse(readFileSync(path, "utf8")) as { hints: JevHint[] }).hints;
  } catch {
    cached = [];
  }
  return cached;
}

export function hintMatches(hint: JevHint, query: HintQuery): boolean {
  const w = hint.when;
  if (w.enemies && !w.enemies.some((id) => query.enemyIds.includes(id))) return false;
  if (w.fight && !w.fight.includes(query.fight)) return false;
  if (w.act && (query.act === null || !w.act.includes(query.act))) return false;
  if (w.hp_below_pct !== undefined && !(query.hpPct < w.hp_below_pct)) return false;
  if (w.enemy_powers && !w.enemy_powers.some((id) => query.enemyPowers.includes(id))) return false;
  if (w.no_attack !== undefined && w.no_attack !== query.noAttack) return false;
  return true;
}

/** Specificity: enemy-keyed hints first, then the ones with more conditions; file order breaks ties. */
function specificity(hint: JevHint): number {
  const w = hint.when;
  return (w.enemies ? 10 : 0) + Object.keys(w).length;
}

/** Up to `max` matching hints, most specific first. */
export function selectHints(query: HintQuery, hints: JevHint[] = loadHints(), max = MAX_HINTS): JevHint[] {
  return hints
    .map((hint, order) => ({ hint, order }))
    .filter(({ hint }) => hintMatches(hint, query))
    .sort((a, b) => specificity(b.hint) - specificity(a.hint) || a.order - b.order)
    .slice(0, max)
    .map(({ hint }) => hint);
}

/**
 * A hint's text as Jev reads it: its damage/amount placeholders ({DMG:ROCKET:LASER_MOVE} and the like)
 * filled from the monster DB at this ascension (monster-db fillDbNumbers), so no A0/A8 number reaches Jev
 * as fact at A9 (the Rocket's Laser "about 49" is 35, 52 from behind); and its counted records
 * ({CRAB_KILLS_EN}, {LAG_NO_STRENGTH_EN}: boss-clock fillGuideFacts) from the fight data, not hand-written
 * ("9/12 vs 8/39" went stale), by this ascension's band (from A8 up A8 and A9 apart: boss-clock recordBand).
 */
export function hintText(hint: JevHint, ascension: number): string {
  return fillGuideFacts(fillDbNumbers(hint.text, ascension), ascension);
}

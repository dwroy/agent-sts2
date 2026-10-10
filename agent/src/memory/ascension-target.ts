/**
 * TARGET_ASCENSION: the ascension character select holds the run at (hand/screens/misc.ts planCharacterSelect).
 *
 * - A number (Roy 2026-09-28: stay on A8 for 10 runs even after a win): that level, whatever the game offers by default.
 * - "climb" (Roy 2026-10-04, the Silent from A0): per character, one above the highest ascension that character has won
 *   (logs/runs.jsonl `victory` rows of its `character`, any win: first try or after SL), A0 before its first win; capped
 *   at the highest the game offers (character select's max_ascension, when it shows one). A row with no `character` is
 *   an Ironclad run (every run before the field).
 * - Unset (or anything else): null, the game's default is taken.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { brainSources } from "../brain/source.js";

import { LOGS_DIR } from "../core/paths.js";
import { characterKey, DEFAULT_CHARACTER } from "../knowledge/files.js";

export type AscensionMode = "fixed" | "climb";

/** TARGET_ASCENSION's mode: "climb", "fixed" (a level), or null (unset or not understood). */
export function ascensionMode(raw: string | undefined | null): AscensionMode | null {
  if (raw === undefined || raw === null || raw.trim() === "") return null;
  if (raw.trim().toLowerCase() === "climb") return "climb";
  return fixedAscension(raw) === null ? null : "fixed";
}

/** TARGET_ASCENSION as a level, or null when unset or not a number. */
export function fixedAscension(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null || raw.trim() === "") return null;
  const level = Number(raw);
  return Number.isInteger(level) && level >= 0 ? level : null;
}

/** Where the climb reads the finished runs (tests point it elsewhere). */
export const ascensionClimbOptions = { runsPath: join(LOGS_DIR, "runs.jsonl") };

/** The highest ascension `character` (a knowledge id) has won in the runs file, or null before its first win. */
export function highestWon(character: string, runsPath: string = ascensionClimbOptions.runsPath, includeNonCodex = false): number | null {
  let text: string;
  try {
    text = readFileSync(runsPath, "utf8");
  } catch {
    return null;
  }
  let best: number | null = null;
  const sources = includeNonCodex ? null : brainSources(join(runsPath, "..", "brain.jsonl"));
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let row: { run_id?: string; victory?: unknown; ascension?: unknown; character?: unknown };
    try {
      row = JSON.parse(line) as typeof row;
    } catch {
      continue;
    }
    const of = characterKey(typeof row.character === "string" ? row.character : null) ?? DEFAULT_CHARACTER;
    if (row.victory !== true || of !== character || typeof row.ascension !== "number") continue;
    if (!includeNonCodex && (!row.run_id || !sources?.get(row.run_id)?.eligible)) continue;
    best = best === null ? row.ascension : Math.max(best, row.ascension);
  }
  return best;
}

/** The climb's level for `character`: one above its highest win (0 before any), at most `max` when given. */
export function climbTarget(character: string, max: number | null = null, runsPath: string = ascensionClimbOptions.runsPath): number {
  const won = highestWon(character, runsPath);
  const next = won === null ? 0 : won + 1;
  return max !== null && max >= 0 ? Math.min(next, max) : next;
}

/**
 * The level TARGET_ASCENSION (`raw`) asks for this character now, with its mode; null level when it asks for none.
 * `max`: the highest the game offers on character select (the climb never asks for more).
 */
export function resolveTargetAscension(raw: string | undefined | null, character: string, max: number | null = null, runsPath?: string): { level: number | null; mode: AscensionMode | null } {
  const mode = ascensionMode(raw);
  if (mode === "climb") return { level: climbTarget(character, max, runsPath), mode };
  return { level: fixedAscension(raw), mode };
}

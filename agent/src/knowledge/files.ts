/**
 * Where each knowledge data file is (docs/layout.md): the character-independent facts under <knowledge>/common/, our own
 * play's results and advice under <knowledge>/characters/<character>/. Every loader finds its file through
 * knowledgeFile, so the files can move between the two (a mixed file split, another character added) here alone.
 *
 * Only one character is played: DEFAULT_CHARACTER. Choosing it per run is a later change (this module's `character`
 * parameter is where it goes in).
 *
 * No node:fs here (see core/paths.ts).
 */
import { join } from "node:path";

import { KNOWLEDGE_DIR } from "../core/paths.js";

export { KNOWLEDGE_DIR };

/** The character whose knowledge is read. */
export const DEFAULT_CHARACTER = "ironclad";

/**
 * The files under common/: facts about the game that hold for every character. monster-db.json also carries our
 * encounter records (encounters.by_asc, bosses, threat_by_asc), which belong to a character: to be split.
 */
export const COMMON_FILES: ReadonlySet<string> = new Set(["monster-db.json", "move-model.json", "event-pages.json", "card-upgrades.json"]);

/** The two data directories a character reads, in a knowledge directory `dir`: common/ and characters/<character>/. */
export function knowledgeDataDirs(dir: string = KNOWLEDGE_DIR, character: string = DEFAULT_CHARACTER): string[] {
  return [join(dir, "common"), join(dir, "characters", character)];
}

/** The directory of `name` inside a knowledge directory `dir` (the project's by default). */
export function knowledgeSubdir(name: string, dir: string = KNOWLEDGE_DIR, character: string = DEFAULT_CHARACTER): string {
  return COMMON_FILES.has(name) ? join(dir, "common") : join(dir, "characters", character);
}

/** The path of the knowledge file `name` (a bare file name: "room-costs.json") inside `dir` (the project's by default). */
export function knowledgeFile(dir: string, name: string, character: string = DEFAULT_CHARACTER): string {
  return join(knowledgeSubdir(name, dir, character), name);
}

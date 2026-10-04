/**
 * Where each knowledge data file is (docs/layout.md): the character-independent facts under <knowledge>/common/, our own
 * play's results and advice under <knowledge>/characters/<character>/. Every loader finds its file through
 * knowledgeFile, so the files can move between the two (a mixed file split, another character added) here alone.
 *
 * The character is the run's (2026-10-04, multi-character): the game's character_id lower-cased ("IRONCLAD" ->
 * "ironclad", "SILENT" -> "silent"). The process plays one character, the configured CHARACTER (core/config.ts
 * run.character; the play loop stops when the run on screen is another one: hand/screens/index.ts), so the loaders read
 * knowledgeCharacter(): what setKnowledgeCharacter was given at startup, else CHARACTER from the environment (worker
 * threads share it), else DEFAULT_CHARACTER. A character without a characters/<id>/ directory, or without one of its
 * files, has no knowledge yet: every loader reads that as empty (no experience, no hard-fight list, no hints, no
 * statistics) and never falls back to another character's.
 *
 * No node:fs here (see core/paths.ts).
 */
import { join } from "node:path";

import { KNOWLEDGE_DIR } from "../core/paths.js";

export { KNOWLEDGE_DIR };

/** The character played when CHARACTER is unset (every run before 2026-10-04 was the Ironclad). */
export const DEFAULT_CHARACTER = "ironclad";

/** The game's names of its characters (character select's `name`), by knowledge id. Names only, no play advice. */
export const CHARACTER_NAMES: Readonly<Record<string, { zh: string; en: string }>> = {
  ironclad: { zh: "铁甲战士", en: "Ironclad" },
  silent: { zh: "静默猎手", en: "Silent" },
  regent: { zh: "储君", en: "Regent" },
  necrobinder: { zh: "亡灵契约师", en: "Necrobinder" },
  defect: { zh: "故障机器人", en: "Defect" },
};

/**
 * A character's knowledge id from the game's character_id, CHARACTER, a runs.jsonl `character` or a display name
 * ("IRONCLAD", "Silent", "静默猎手"): lower-cased, or null when empty or not an id (letters, digits, "_").
 */
export function characterKey(raw: string | null | undefined): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [id, names] of Object.entries(CHARACTER_NAMES)) {
    if (lower === id || text === names.zh || lower === names.en.toLowerCase()) return id;
  }
  return /^[a-z0-9_]+$/.test(lower) ? lower : null;
}

/** A character's display name ("铁甲战士" / "Ironclad"); an unknown id as written. */
export function characterName(id: string, lang: "zh" | "en" = "zh"): string {
  return CHARACTER_NAMES[id]?.[lang] ?? id;
}

let activeCharacter: string | null = null;

/** The character whose knowledge the loaders read (see the module comment). */
export function knowledgeCharacter(): string {
  return activeCharacter ?? characterKey(process.env["CHARACTER"]) ?? DEFAULT_CHARACTER;
}

/**
 * Sets the run's character for every loader (core/index.ts, from the config; tests). Loaders cache what they read, so
 * this is called before the first load; null goes back to CHARACTER / the default. Returns the id now in effect.
 */
export function setKnowledgeCharacter(id: string | null): string {
  const before = knowledgeCharacter();
  activeCharacter = id === null ? null : (characterKey(id) ?? id);
  const now = knowledgeCharacter();
  if (now !== before) for (const listener of listeners) listener(now);
  return now;
}

const listeners: Array<(character: string) => void> = [];

/**
 * Called with the new character whenever setKnowledgeCharacter changes it: for the few tables filled when their module
 * loads (sim/boss-trust.ts), which a module import reads before main() has loaded .env and the config.
 */
export function onKnowledgeCharacterChange(listener: (character: string) => void): void {
  listeners.push(listener);
}

/**
 * The files under common/: facts about the game that hold for every character. Our fight records against the monsters
 * (encounters, bosses, each monster's threat_by_asc) are a character's: characters/<id>/monster-records.json, merged
 * into the monster DB by its loaders (knowledge/monster-db.ts mergeMonsterRecords).
 */
export const COMMON_FILES: ReadonlySet<string> = new Set(["monster-db.json", "move-model.json", "event-pages.json", "card-upgrades.json"]);

/** A character's own monster records, beside the common monster DB. */
export const MONSTER_RECORDS_FILE = "monster-records.json";

/** The two data directories a character reads, in a knowledge directory `dir`: common/ and characters/<character>/. */
export function knowledgeDataDirs(dir: string = KNOWLEDGE_DIR, character: string = knowledgeCharacter()): string[] {
  return [join(dir, "common"), join(dir, "characters", character)];
}

/** The directory of `name` inside a knowledge directory `dir` (the project's by default). */
export function knowledgeSubdir(name: string, dir: string = KNOWLEDGE_DIR, character: string = knowledgeCharacter()): string {
  return COMMON_FILES.has(name) ? join(dir, "common") : join(dir, "characters", character);
}

/** The path of the knowledge file `name` (a bare file name: "room-costs.json") inside `dir` (the project's by default). */
export function knowledgeFile(dir: string, name: string, character: string = knowledgeCharacter()): string {
  return join(knowledgeSubdir(name, dir, character), name);
}

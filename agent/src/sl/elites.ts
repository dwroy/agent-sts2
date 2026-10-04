/**
 * The hard elites that get SL retries (docs/sl.md): knowledge/characters/<id>/sl-elites.json, the top 5 by logged A8-A9
 * death rate (Dai 2026-10-02; the Ironclad's list). A fight is a listed elite when any enemy alive at its start has one
 * of an entry's enemy ids. A character with no list yet (no file) has no listed fights.
 */
import { readFileSync } from "node:fs";
import { DEFAULT_CHARACTER, KNOWLEDGE_DIR, knowledgeCharacter, knowledgeFile } from "../knowledge/files.js";

/** The run's character's list (knowledge/files.ts knowledgeCharacter). */
export function slElitesPath(): string {
  return knowledgeFile(KNOWLEDGE_DIR, "sl-elites.json");
}

/** The path when this module loaded (the character then in effect). */
export const SL_ELITES_PATH = slElitesPath();

export interface SlElite {
  name: string;
  zh: string;
  enemy_ids: string[];
  deaths: number;
  fights: number;
}

export interface SlEliteList {
  source: string;
  date: string;
  elites: SlElite[];
}

const cached = new Map<string, SlEliteList>();

/**
 * The list in sl-elites.json (read once). No file for a new character: an empty list (no hard fights listed yet). Throws
 * when the Ironclad's is missing or any is malformed: SL must not guess.
 */
export function loadSlElites(path: string = slElitesPath()): SlEliteList {
  const hit = cached.get(path);
  if (hit) return hit;
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    // The Ironclad's list is part of its knowledge: missing, SL must not guess. A new character has none yet.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" || knowledgeCharacter() === DEFAULT_CHARACTER) throw error;
    const empty: SlEliteList = { source: `no ${path}`, date: "", elites: [] };
    cached.set(path, empty);
    return empty;
  }
  const parsed = JSON.parse(text) as Partial<SlEliteList>;
  if (!Array.isArray(parsed.elites) || parsed.elites.some((elite) => !Array.isArray(elite?.enemy_ids) || elite.enemy_ids.length === 0)) {
    throw new Error(`${path}: expected {elites: [{name, enemy_ids: [...]}, ...]}`);
  }
  const list: SlEliteList = { source: String(parsed.source ?? ""), date: String(parsed.date ?? ""), elites: parsed.elites as SlElite[] };
  cached.set(path, list);
  return list;
}

/** The listed elite these enemy ids belong to, or null. */
export function listedElite(enemyIds: readonly string[], list: SlEliteList): SlElite | null {
  return list.elites.find((elite) => elite.enemy_ids.some((id) => enemyIds.includes(id))) ?? null;
}

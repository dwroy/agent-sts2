/**
 * The hard elites that get SL retries (docs/sl.md): src/sl/sl-elites.json, the top 5 by logged A8-A9 death rate
 * (Dai 2026-10-02). A fight is a listed elite when any enemy alive at its start has one of an entry's enemy ids.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SL_ELITES_PATH = join(dirname(fileURLToPath(import.meta.url)), "sl-elites.json");

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

let cached: SlEliteList | null = null;

/** The list in sl-elites.json (read once). Throws when the file is missing or malformed: SL must not guess. */
export function loadSlElites(path: string = SL_ELITES_PATH): SlEliteList {
  if (path === SL_ELITES_PATH && cached) return cached;
  const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<SlEliteList>;
  if (!Array.isArray(parsed.elites) || parsed.elites.some((elite) => !Array.isArray(elite?.enemy_ids) || elite.enemy_ids.length === 0)) {
    throw new Error(`${path}: expected {elites: [{name, enemy_ids: [...]}, ...]}`);
  }
  const list: SlEliteList = { source: String(parsed.source ?? ""), date: String(parsed.date ?? ""), elites: parsed.elites as SlElite[] };
  if (path === SL_ELITES_PATH) cached = list;
  return list;
}

/** The listed elite these enemy ids belong to, or null. */
export function listedElite(enemyIds: readonly string[], list: SlEliteList): SlElite | null {
  return list.elites.find((elite) => elite.enemy_ids.some((id) => enemyIds.includes(id))) ?? null;
}

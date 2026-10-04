/**
 * Static game metadata from `GET /data/{collection}` (PLAN.md §4).
 *
 * The collections are hundreds of KB and only change when the mod/game version does, so they are
 * cached on disk keyed by `mod_version`. Every lookup is by id: the live state carries ids, and the
 * English text always comes from here rather than from the localized state payload.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { DATA_DIR, fromRoot } from "../core/paths.js";
import type { ModClient } from "../hand/mod/client.js";
import { asArray, asRecord, numOrNull, str, stripMarkup } from "../core/util/json.js";
import { fillPotionText } from "./potion-values.js";

export interface CardInfo {
  id: string;
  name: string;
  type: string;
  rarity: string;
  cost: number | null;
  target: string;
  description: string;
  keywords: string[];
  tags: string[];
  damage: number | null;
  block: number | null;
  /** Card pool: "ironclad", "silent", …, "colorless", "curse", "status". */
  color: string;
  /** The rules template ({Damage} …) and its vars (base values), as the mod's hand cards carry them. */
  descriptionRaw: string;
  vars: Record<string, unknown>[];
  xCost: boolean;
}

export interface MonsterInfo {
  id: string;
  name: string;
  type: string;
  min_hp: number | null;
  max_hp: number | null;
  moves: string[];
}

export interface RelicInfo {
  id: string;
  name: string;
  description: string;
  rarity: string;
}

export interface PotionInfo {
  id: string;
  name: string;
  description: string;
  rarity: string;
  usage: string;
  target_type: string;
}

export interface PowerInfo {
  id: string;
  name: string;
  description: string;
  type: string;
}

export interface EventInfo {
  id: string;
  name: string;
  description: string;
  options: { id: string; title: string; description: string }[];
}

export interface KnowledgeStats {
  cards: number;
  monsters: number;
  relics: number;
  potions: number;
  powers: number;
  events: number;
  characters: number;
}

export interface Knowledge {
  card(id: string | null | undefined): CardInfo | null;
  /** Every card in the game data (the random-card potions draw from these pools). */
  cards(): CardInfo[];
  monster(id: string | null | undefined): MonsterInfo | null;
  relic(id: string | null | undefined): RelicInfo | null;
  /** Every relic in the game data (an event option names one by its game name). */
  relics(): RelicInfo[];
  potion(id: string | null | undefined): PotionInfo | null;
  power(id: string | null | undefined): PowerInfo | null;
  event(id: string | null | undefined): EventInfo | null;
  stats: KnowledgeStats;
  source: "live" | "cache";
}

const COLLECTIONS = ["cards", "monsters", "relics", "potions", "powers", "events", "characters"] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

export interface KnowledgeFile {
  mod_version: string;
  fetched_at: string;
  collections: Partial<Record<CollectionName, unknown[]>>;
}

function parseCard(entry: unknown): CardInfo | null {
  const obj = asRecord(entry);
  const id = str(obj["id"]);
  if (!id) return null;
  return {
    id,
    name: str(obj["name"], id),
    type: str(obj["type"]),
    rarity: str(obj["rarity"]),
    cost: numOrNull(obj["cost"]),
    target: str(obj["target"]),
    description: stripMarkup(str(obj["description"])),
    keywords: asArray(obj["keywords"]).map((value) => str(value)).filter(Boolean),
    tags: asArray(obj["tags"]).map((value) => str(value)).filter(Boolean),
    damage: numOrNull(obj["damage"]),
    block: numOrNull(obj["block"]),
    color: str(obj["color"]),
    descriptionRaw: str(obj["description_raw"]),
    vars: asArray(obj["vars"]).map(asRecord),
    xCost: obj["is_x_cost"] === true,
  };
}

function parseMonster(entry: unknown): MonsterInfo | null {
  const obj = asRecord(entry);
  const id = str(obj["id"]);
  if (!id) return null;
  return {
    id,
    name: str(obj["name"], id),
    type: str(obj["type"]),
    min_hp: numOrNull(obj["min_hp"]),
    max_hp: numOrNull(obj["max_hp"]),
    moves: asArray(obj["moves"]).map((move) => str(asRecord(move)["id"] ?? asRecord(move)["name"] ?? move)).filter(Boolean),
  };
}

function parseRelic(entry: unknown): RelicInfo | null {
  const obj = asRecord(entry);
  const id = str(obj["id"]);
  if (!id) return null;
  return {
    id,
    name: str(obj["name"], id),
    description: stripMarkup(str(obj["description"])),
    rarity: str(obj["rarity"]),
  };
}

function parsePotion(entry: unknown): PotionInfo | null {
  const obj = asRecord(entry);
  const id = str(obj["id"]);
  if (!id) return null;
  return {
    id,
    name: str(obj["name"], id),
    // The template's numbers filled in (potion-values.ts): the mod leaves them as {Name}.
    description: fillPotionText(id, str(obj["description"])),
    rarity: str(obj["rarity"]),
    usage: str(obj["usage"]),
    target_type: str(obj["target_type"]),
  };
}

function parsePower(entry: unknown): PowerInfo | null {
  const obj = asRecord(entry);
  const id = str(obj["id"]);
  if (!id) return null;
  return {
    id,
    name: str(obj["name"], id),
    description: stripMarkup(str(obj["description"])),
    type: str(obj["type"]),
  };
}

function parseEvent(entry: unknown): EventInfo | null {
  const obj = asRecord(entry);
  const id = str(obj["id"]);
  if (!id) return null;
  return {
    id,
    name: str(obj["name"], id),
    description: stripMarkup(str(obj["description"])),
    options: asArray(obj["options"]).map((option) => {
      const item = asRecord(option);
      return {
        id: str(item["id"]),
        title: stripMarkup(str(item["title"])),
        description: stripMarkup(str(item["description"])),
      };
    }),
  };
}

function buildIndex<T>(entries: unknown[], parse: (entry: unknown) => T | null): Map<string, T> {
  const map = new Map<string, T>();
  for (const entry of entries) {
    const parsed = parse(entry);
    if (parsed) map.set(String((parsed as unknown as { id: string }).id), parsed);
  }
  return map;
}

export function makeKnowledge(collections: Partial<Record<CollectionName, unknown[]>>, source: "live" | "cache"): Knowledge {
  const cards = buildIndex(collections.cards ?? [], parseCard);
  const monsters = buildIndex(collections.monsters ?? [], parseMonster);
  const relics = buildIndex(collections.relics ?? [], parseRelic);
  const potions = buildIndex(collections.potions ?? [], parsePotion);
  const powers = buildIndex(collections.powers ?? [], parsePower);
  const events = buildIndex(collections.events ?? [], parseEvent);

  return {
    card: (id) => (id ? cards.get(id) ?? null : null),
    cards: () => [...cards.values()],
    monster: (id) => (id ? monsters.get(id) ?? null : null),
    relic: (id) => (id ? relics.get(id) ?? null : null),
    relics: () => [...relics.values()],
    potion: (id) => (id ? potions.get(id) ?? null : null),
    power: (id) => (id ? powers.get(id) ?? null : null),
    event: (id) => (id ? events.get(id) ?? null : null),
    stats: {
      cards: cards.size,
      monsters: monsters.size,
      relics: relics.size,
      potions: potions.size,
      powers: powers.size,
      events: events.size,
      characters: asArray(collections.characters).length,
    },
    source,
  };
}

export interface LoadKnowledgeOptions {
  cacheDir?: string;
  modVersion: string;
  refresh?: boolean;
}

/**
 * The game-data cache's directory: the option, else GAME_DATA_DIR (relative to the project root), else the project's
 * data/. A fake mod run (tools/fake-mod.mjs) points GAME_DATA_DIR at a temp dir.
 */
export function gameDataDir(options: { cacheDir?: string } = {}, env: NodeJS.ProcessEnv = process.env): string {
  const configured = env["GAME_DATA_DIR"]?.trim();
  return options.cacheDir ?? (configured ? fromRoot(configured) : DATA_DIR);
}

/**
 * Why a fetched catalogue must not replace the cache at `cacheDir`, or null when it may. 2026-10-04 20:00: a doctor run
 * against the fake mod wrote its empty catalogue (mod 0.13.0-fake) over the project's data/game-data.json, which the
 * builders, the eval and the live game read. A catalogue with no cards is never written (it caches nothing); a fake
 * mod's never goes into the project's data/.
 */
export function cacheWriteRefusal(file: KnowledgeFile, cacheDir: string): string | null {
  if (asArray(file.collections.cards).length === 0) return `the catalogue from mod ${file.mod_version} has no cards`;
  if (/-fake$/.test(file.mod_version) && resolve(cacheDir) === resolve(DATA_DIR)) return `mod ${file.mod_version} is a fake mod: not cached in the project's data/`;
  return null;
}

/** Fetches every collection (or reuses the on-disk cache) and returns id → English metadata lookups. */
export async function loadKnowledge(client: ModClient, options: LoadKnowledgeOptions): Promise<Knowledge> {
  const cacheDir = gameDataDir(options);
  const cachePath = join(cacheDir, "game-data.json");

  if (!options.refresh) {
    try {
      const cached = JSON.parse(await readFile(cachePath, "utf8")) as KnowledgeFile;
      if (cached.mod_version === options.modVersion && cached.collections?.cards?.length) {
        return makeKnowledge(cached.collections, "cache");
      }
    } catch {
      // no usable cache
    }
  }

  const collections: Partial<Record<CollectionName, unknown[]>> = {};
  for (const name of COLLECTIONS) {
    const raw = await client.collection(name);
    collections[name] = asArray(raw);
  }

  const file: KnowledgeFile = {
    mod_version: options.modVersion,
    fetched_at: new Date().toISOString(),
    collections,
  };
  try {
    if (cacheWriteRefusal(file, cacheDir) === null) {
      await mkdir(dirname(cachePath), { recursive: true });
      await writeFile(cachePath, JSON.stringify(file), "utf8");
    }
  } catch {
    // A read-only filesystem is not fatal: we simply refetch next time.
  }
  return makeKnowledge(collections, "live");
}

export function describeKnowledge(knowledge: Knowledge): string {
  const { stats } = knowledge;
  return `${stats.cards} cards, ${stats.monsters} monsters, ${stats.relics} relics, ${stats.potions} potions, ${stats.powers} powers, ${stats.events} events`;
}

/**
 * Enemy dossiers (enemy-dossiers.json): per boss / elite / dangerous hallway enemy, what kills runs and
 * what beats it, distilled from notes/lessons.md. DeepSeek's run plan and fight plans read them; the
 * run plan's commitments derived from them (entry HP, potions to save, card roles) are enforced by code
 * (strategy/run-plan.ts), so the preparation survives the fights on the way.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { JsonValue } from "../util/json.js";

export type CardRole = "aoe" | "strength" | "block" | "draw" | "exhaust" | "multi_hit" | "frontload" | "debuff";
export type PotionRole = "block" | "weak" | "damage" | "strength" | "heal" | "any";

export interface Dossier {
  name: string;
  kind: "boss" | "elite" | "hallway";
  act: number;
  hp?: { a7?: number; a8?: number };
  danger: string;
  win_pattern: string;
  entry_hp_pct?: number;
  need_damage_per_turn?: number | null;
  must_have?: CardRole[];
  save_potions?: PotionRole[];
  avoid?: string;
  deaths?: number;
  evidence?: string[];
  /** Monster ids of a multi-enemy entry (crab claws, Kin, Decimillipede segments, beetle group). */
  ids?: string[];
}

let cache: Record<string, Dossier> | null = null;

function load(): Record<string, Dossier> {
  if (cache) return cache;
  try {
    const path = join(dirname(fileURLToPath(import.meta.url)), "enemy-dossiers.json");
    cache = (JSON.parse(readFileSync(path, "utf8")) as { enemies?: Record<string, Dossier> }).enemies ?? {};
  } catch {
    cache = {};
  }
  return cache;
}

/** The dossier of an enemy id; a boss id like KAISER_CRAB_BOSS also matches KAISER_CRAB. */
export function dossierFor(enemyId: string): (Dossier & { id: string }) | null {
  const all = load();
  const upper = enemyId.toUpperCase();
  const key = all[upper]
    ? upper
    : Object.keys(all).find((id) => (all[id]!.ids ?? []).includes(upper)) ?? Object.keys(all).find((id) => upper.startsWith(id) || upper.includes(id));
  return key ? { ...all[key]!, id: key } : null;
}

/** The act's elites and dangerous hallway enemies, most deaths first. */
export function actThreats(act: number, limit = 8): (Dossier & { id: string })[] {
  return Object.entries(load())
    .filter(([, dossier]) => dossier.act === act && dossier.kind !== "boss")
    .map(([id, dossier]) => ({ ...dossier, id }))
    .sort((a, b) => (b.deaths ?? 0) - (a.deaths ?? 0))
    .slice(0, limit);
}

/** The lowest damage a turn any of this act's elites needs (dossier need_damage_per_turn), null when none is known. */
export function actEliteNeed(act: number): number | null {
  const needs = Object.values(load())
    .filter((dossier) => dossier.act === act && dossier.kind === "elite" && (dossier.need_damage_per_turn ?? 0) > 0)
    .map((dossier) => dossier.need_damage_per_turn!);
  return needs.length > 0 ? Math.min(...needs) : null;
}

/** A compact view for a model prompt. */
export function dossierJson(dossier: Dossier & { id: string }, ascension: number): Record<string, JsonValue> {
  const hp = ascension >= 8 ? dossier.hp?.a8 ?? dossier.hp?.a7 : dossier.hp?.a7 ?? dossier.hp?.a8;
  return {
    id: dossier.id,
    name: dossier.name,
    kind: dossier.kind,
    ...(hp ? { hp } : {}),
    danger: dossier.danger,
    win_pattern: dossier.win_pattern,
    ...(dossier.entry_hp_pct !== undefined ? { entry_hp_pct: dossier.entry_hp_pct } : {}),
    ...(dossier.need_damage_per_turn ? { need_damage_per_turn: dossier.need_damage_per_turn } : {}),
    ...(dossier.must_have?.length ? { needs: dossier.must_have } : {}),
    ...(dossier.save_potions?.length ? { reserve: dossier.save_potions } : {}),
    ...(dossier.avoid ? { avoid: dossier.avoid } : {}),
    ...(dossier.deaths ? { deaths: dossier.deaths } : {}),
  };
}

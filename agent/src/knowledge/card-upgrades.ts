/**
 * What upgrading a card changes (knowledge/builders/build-card-upgrades.py -> card-upgrades.json): for every card id
 * logged both plain and upgraded, the dynamic values' base numbers and the energy cost that differ, each
 * way. The game data has no upgraded numbers (its upgrade text repeats the base one). Used to simulate
 * Blessing of the Forge (card-model upgradeDelta).
 */

import { readFileSync } from "node:fs";
import { bumpDataVersion } from "../core/util/data-version.js";
import { KNOWLEDGE_DIR, knowledgeFile } from "./files.js";

export interface CardUpgrade {
  /** Distinct logged entries seen plain / upgraded. */
  n: [number, number];
  /** Energy cost plain -> upgraded, when it changes. */
  cost?: [number, number];
  /** Dynamic value (by name) base plain -> upgraded, for those that change. */
  vars: Record<string, [number, number]>;
  /** Whole observed plain/upgraded faces for text-only differences; never inferred rules. */
  faces?: [ObservedUpgradeFace, ObservedUpgradeFace];
}

export interface ObservedUpgradeFace {
  card: Record<string, unknown>;
  evidence: {
    file: string; off: number; sha256: string; path: string; run_id: string;
    character: string | null; ascension: number | null; floor: number | null; ts: string | null;
  };
  /** Independent runs supporting this exact unmodified out-of-combat face. */
  n_runs: number;
}

let cached: Record<string, CardUpgrade> | null = null;

function load(): Record<string, CardUpgrade> {
  if (cached) return cached;
  try {
    cached = JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, "card-upgrades.json"), "utf8")) as Record<string, CardUpgrade>;
  } catch {
    cached = {};
  }
  return cached;
}

/** For tests: use this table instead of card-upgrades.json (null reloads the file). */
export function setCardUpgradesForTests(table: Record<string, CardUpgrade> | null): void {
  bumpDataVersion();
  cached = table;
}

/** Observed numeric or text changes, or null when the paired evidence is absent. */
export function cardUpgrade(cardId: string): CardUpgrade | null {
  return load()[cardId] ?? null;
}

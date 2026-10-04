/**
 * Prints the ids of the cards and relics that give lasting Strength, by the deck profile's own test
 * (agent/src/project/deck-profile.ts strengthSourceIds over the game data), as JSON for eval/metrics.py
 * (docs/eval.md: "Strength source at the act-1 boss"). One definition: the evaluator does not keep a list.
 *
 * Usage: npx tsx eval/strength-sources.ts [game-data.json]   (default data/game-data.json)
 * Fails (exit 1) when the game data is missing or has no cards or relics: never an empty set.
 */
import { readFileSync } from "node:fs";

import { makeKnowledge } from "../agent/src/knowledge/index.js";
import { strengthSourceIds } from "../agent/src/project/deck-profile.js";
import { fromRoot } from "../agent/src/core/paths.js";

const path = process.argv[2] ?? fromRoot("data/game-data.json");
// The knowledge cache ({mod_version, fetched_at, collections}) or bare collections (agent/tests/logged-states/game-data.json).
const file = JSON.parse(readFileSync(path, "utf8")) as { mod_version?: string; fetched_at?: string; collections?: Record<string, unknown[]> };
const knowledge = makeKnowledge(file.collections ?? (file as Record<string, unknown[]>), "cache");
if (knowledge.stats.cards === 0 || knowledge.stats.relics === 0) {
  console.error(`strength-sources: no cards or relics in ${path}`);
  process.exit(1);
}
const ids = strengthSourceIds(knowledge);
console.log(JSON.stringify({ source: path, mod_version: file.mod_version ?? null, fetched_at: file.fetched_at ?? null, ...ids }));

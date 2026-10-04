/**
 * Shows the experience-knowledge slice DeepSeek would get for recorded states (no API call): the lessons
 * picked for the screen and the outcome-stats rows of what is offered, with the section's size.
 *
 * Usage: npx tsx tools/knowledge-slice.ts <states.jsonl> [label]
 *   Each line is a raw state (or {"state": ...} as in logs/states.jsonl). Without a label the screen's
 *   usual one is used (REWARD reward/card, SHOP shop/buy, REST rest/choose, EVENT event/choose,
 *   MAP map/route-plan, CARD_SELECTION selection/remove, COMBAT fight-plan).
 */
import { readFileSync } from "node:fs";

import { knowledgeSlice } from "../src/knowledge/experience.js";
import { parseGameState } from "../src/hand/mod/schema.js";

const LABELS: Record<string, string> = {
  REWARD: "reward/card",
  SHOP: "shop/buy",
  REST: "rest/choose",
  EVENT: "event/choose",
  MAP: "map/route-plan",
  CARD_SELECTION: "selection/remove",
  COMBAT: "fight-plan",
};

const file = process.argv[2];
if (!file) throw new Error("usage: knowledge-slice.ts <states.jsonl> [label]");
for (const line of readFileSync(file, "utf8").split("\n")) {
  if (!line.trim()) continue;
  const parsed = JSON.parse(line) as Record<string, unknown>;
  const raw = (typeof parsed["state"] === "object" && parsed["state"] !== null ? parsed["state"] : parsed) as Record<string, unknown>;
  const state = parseGameState(raw);
  const label = process.argv[3] ?? LABELS[state.screen] ?? state.screen.toLowerCase();
  const slice = knowledgeSlice(state, label);
  console.log(`=== ${String(raw["run_id"] ?? "?")} F${state.run?.floor ?? "?"} ${state.screen} ${label}: ${slice.lessons.length} lessons, ${slice.stats} stats rows, ${slice.text.length} chars`);
  console.log(slice.text || "(empty)");
}

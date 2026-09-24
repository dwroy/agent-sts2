/**
 * Offline check of the combat turn planner over recorded states (logs/states.jsonl):
 * what it would do on every combat board, and where its end-turn lethal estimate disagrees with the mod.
 * Usage: npx tsx tools/solver-replay.ts [states.jsonl] [--verbose]
 */
import { readFileSync } from "node:fs";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";

const path = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "logs/states.jsonl";
const verbose = process.argv.includes("--verbose");
const config = loadConfig(process.env);
const knowledge = makeKnowledge(JSON.parse(readFileSync(".cache/game-data.json", "utf8")).collections, "cache");
const counts: Record<string, number> = {};
let mismatches = 0;
for (const line of readFileSync(path, "utf8").split("\n")) {
  if (!line.trim()) continue;
  const entry = JSON.parse(line) as { screen: string; state: Record<string, unknown> };
  if (entry.screen !== "COMBAT") continue;
  const state = parseGameState(entry.state);
  const env: DecisionEnv = {
    state,
    knowledge,
    brief: buildRunBrief(state, knowledge),
    screenMemory: createScreenMemory("COMBAT"),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    shopDiscardPotions: [],
  };
  const started = performance.now();
  const decision = planCombatTurn(env);
  const ms = performance.now() - started;
  const label = decision === null ? "wait" : decision.label;
  counts[label] = (counts[label] ?? 0) + 1;
  const rationale = decision === null ? "" : decision.kind === "act" ? decision.rationale : `ASK ${Object.keys(decision.questions["plan"]?.criteria ?? {}).join("/")}`;
  if (rationale.includes("calc mismatch")) mismatches += 1;
  if (verbose || rationale.includes("calc mismatch") || ms > 200) {
    console.log(`F${state.run?.floor} T${state.turn} ${label} ${ms.toFixed(0)}ms | ${rationale}`);
    if (decision?.kind === "ask" && verbose) {
      for (const [key, value] of Object.entries(decision.questions["plan"]?.criteria ?? {})) console.log(`    ${key}: ${value}`);
    }
  }
}
console.log(counts, "calc mismatches:", mismatches);

/**
 * Rebuild the exact Jev combat request ({state, questions}) for recorded combat boards. Nothing is sent.
 * Usage: STATES=<states lines> [PICK=potion] npx tsx tools/jev-prompt-dump.ts out.json
 * PICK=potion takes the latest board whose options include a potion line; MIN_OPTIONS=n skips smaller boards.
 */
import { readFileSync, writeFileSync } from "node:fs";

import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { fromRoot } from "../src/core/paths.js";

const out = process.argv[2] ?? fromRoot("logs/jev-prompt-sample.json");
const config = loadConfig(process.env);
const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");
const lines = readFileSync(process.env["STATES"] ?? fromRoot("logs/states.jsonl"), "utf8").trim().split("\n").reverse();
const wantPotion = process.env["PICK"] === "potion";
for (const line of lines) {
  const entry = JSON.parse(line) as { screen: string; state: Record<string, unknown> };
  if (entry.screen !== "COMBAT") continue;
  const state = parseGameState(entry.state);
  const env: DecisionEnv = {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"),
    thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", fightPlan: "off", buildDecider: "deepseek",
  };
  const decision = planCombatTurn(env);
  if (decision?.kind !== "ask") continue;
  if (wantPotion && !JSON.stringify(decision.questions).includes("potion ")) continue;
  const options = Object.values(decision.questions).reduce((n, q) => n + Object.keys(q.criteria ?? {}).length, 0);
  if (options < Number(process.env["MIN_OPTIONS"] ?? 0)) continue;
  writeFileSync(out, JSON.stringify({ floor: state.run?.floor, turn: state.turn, label: decision.label, request: { state: decision.state, questions: decision.questions } }, null, 1));
  console.log(`F${state.run?.floor} T${state.turn} ${decision.label} -> ${out} (${JSON.stringify(decision.state).length + JSON.stringify(decision.questions).length} chars)`);
  break;
}

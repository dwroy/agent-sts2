/**
 * Rebuild the exact DeepSeek request for the last recorded combat board that goes to the models:
 * system prompt (+ guide) and the user message. Nothing is sent. Usage: npx tsx tools/deepseek-prompt-dump.ts [out.json]
 */
import { readFileSync, writeFileSync } from "node:fs";

import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { fromRoot } from "../src/core/paths.js";
import { scanBackward } from "../src/memory/journal-replay.js";

const out = process.argv[2] ?? fromRoot("logs/deepseek-prompt-sample.json");
const config = loadConfig(process.env);
const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");
scanBackward(process.env["STATES"] ?? fromRoot("logs/states.jsonl"), (line) => {
  let entry: { screen: string; state: Record<string, unknown> };
  try {
    entry = JSON.parse(line) as typeof entry;
  } catch (error) {
    // Live logs may end with an unfinished JSON row.
    if (error instanceof SyntaxError) return true;
    throw error;
  }
  if (entry.screen !== "COMBAT") return true;
  const state = parseGameState(entry.state);
  const env: DecisionEnv = {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"),
    thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", shopDiscardPotions: [],
  };
  const decision = planCombatTurn(env);
  if (decision?.kind !== "ask") return true;
  const [key, question] = Object.entries(decision.questions)[0]!;
  const user = { state: decision.state, question: question.instructions, options: question.criteria };
  writeFileSync(out, JSON.stringify({ question_key: key, floor: state.run?.floor, turn: state.turn, user_message: user }, null, 1));
  console.log(`F${state.run?.floor} T${state.turn} ${decision.label} -> ${out} (${JSON.stringify(user).length} chars)`);
  return false;
});

/**
 * Rebuild the DeepSeek user message for a recorded card-reward screen (state + question + options; the
 * run memory is taken from the matching deepseek-reasoning.jsonl row when given, as logged; to rebuild the
 * memory itself in the current layout, replay the run with tools/deepseek-prompt-replay.ts). The message is
 * built exactly as DeepSeekClient.choose sends it (deepseek-message.ts). Nothing is sent.
 * Usage: STATES=<states.jsonl> [MEMORY=<reasoning row json>] npx tsx tools/deepseek-reward-prompt-dump.ts out.json
 */
import { readFileSync, writeFileSync } from "node:fs";

import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { choiceMessage } from "../src/brain/llm/deepseek-message.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planReward } from "../src/hand/screens/reward.js";
import type { JsonValue } from "../src/core/util/json.js";
import { fromRoot } from "../src/core/paths.js";

const out = process.argv[2] ?? fromRoot("logs/deepseek-reward-prompt.json");
const config = loadConfig(process.env);
const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");
const memoryRow = process.env["MEMORY"] ? (JSON.parse(readFileSync(process.env["MEMORY"], "utf8")) as { memory?: unknown }) : null;
const lines = readFileSync(process.env["STATES"] ?? fromRoot("logs/states.jsonl"), "utf8").trim().split("\n").reverse();
for (const line of lines) {
  const entry = JSON.parse(line) as { screen: string; state: Record<string, unknown> };
  if (entry.screen !== "REWARD") continue;
  const state = parseGameState(entry.state);
  const env: DecisionEnv = {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("REWARD"),
    thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], buildDecider: "deepseek",
  };
  const decision = planReward(env);
  if (decision?.kind !== "ask") continue;
  const [key, question] = Object.entries(decision.questions)[0]!;
  const message = choiceMessage(decision.state, question.instructions, question.criteria, memoryRow?.memory as JsonValue | undefined);
  writeFileSync(out, JSON.stringify({ question_key: key, floor: state.run?.floor, system_prompt: "(static: SYSTEM + ironclad guide + 经验手册, see src/brain/llm/deepseek.ts)", user_message: JSON.parse(message) as JsonValue }, null, 1));
  console.log(`F${state.run?.floor} ${decision.label} -> ${out} (${message.length} chars)`);
  break;
}

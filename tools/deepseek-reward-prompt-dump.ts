/**
 * Rebuild the DeepSeek user message for a recorded card-reward screen (state + question + options; the
 * run memory is taken from the matching deepseek-reasoning.jsonl row when given). Nothing is sent.
 * Usage: STATES=<states.jsonl> [MEMORY=<reasoning row json>] npx tsx tools/deepseek-reward-prompt-dump.ts out.json
 */
import { readFileSync, writeFileSync } from "node:fs";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/project/types.js";
import { planReward } from "../src/screens/reward.js";

const out = process.argv[2] ?? "logs/deepseek-reward-prompt.json";
const config = loadConfig(process.env);
const knowledge = makeKnowledge(JSON.parse(readFileSync(".cache/game-data.json", "utf8")).collections, "cache");
const memoryRow = process.env["MEMORY"] ? (JSON.parse(readFileSync(process.env["MEMORY"], "utf8")) as { memory?: unknown }) : null;
const lines = readFileSync(process.env["STATES"] ?? "logs/states.jsonl", "utf8").trim().split("\n").reverse();
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
  const user = { state: decision.state, ...(memoryRow?.memory === undefined ? {} : { memory: memoryRow.memory }), question: question.instructions, options: question.criteria };
  writeFileSync(out, JSON.stringify({ question_key: key, floor: state.run?.floor, system_prompt: "(static: SYSTEM + ironclad guide + 经验手册, see src/llm/deepseek.ts)", user_message: user }, null, 1));
  console.log(`F${state.run?.floor} ${decision.label} -> ${out} (${JSON.stringify(user).length} chars)`);
  break;
}

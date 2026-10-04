/**
 * Dry run of the RUN_PLAN=v1 request on recorded MAP states (one raw state per line): builds the
 * request the loop would send, asks DeepSeek, prints the parsed plan with latency and tokens.
 *
 * Usage: npx tsx tools/run-plan-dry.ts <states.jsonl>
 */
import { readFileSync } from "node:fs";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { DeepSeekClient } from "../src/llm/deepseek.js";
import { parseGameState } from "../src/mod/schema.js";
import { RunJournal } from "../src/project/run-journal.js";
import { fightPlanInput } from "../src/strategy/fight-plan.js";
import { parseRunPlan, RUN_PLAN_TASK, runPlanInput, runPlanTrigger } from "../src/strategy/run-plan.js";
import { asArray, type JsonValue } from "../src/util/json.js";
import { fromRoot } from "../src/core/paths.js";

const file = process.argv[2];
if (!file) throw new Error("usage: run-plan-dry.ts <states.jsonl>");
try {
  (process as NodeJS.Process & { loadEnvFile: (f?: string) => void }).loadEnvFile(".env");
} catch {
  // no .env
}
const config = loadConfig(process.env);
if (!config.deepseek) throw new Error("no DeepSeek key configured");
const deepseek = new DeepSeekClient({ ...config.deepseek, reasoningLog: "" });
const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");

for (const line of readFileSync(file, "utf8").split("\n")) {
  if (!line.trim()) continue;
  const state = parseGameState(JSON.parse(line) as Record<string, unknown>);
  const trigger = runPlanTrigger(null, state) ?? "start";
  const shown = fightPlanInput(state, knowledge, "run", {});
  const memory = new RunJournal().render(state, knowledge, undefined);
  const payload: Record<string, JsonValue> = {
    task: RUN_PLAN_TASK,
    run_state: runPlanInput(state, knowledge, trigger, asArray(shown["deck"]).map(String), asArray(shown["relics"]).map(String), asArray(shown["potions"]).map(String)),
    memory: { ...memory },
  };
  const { json, meta } = await deepseek.askJson(payload, "run-plan");
  const plan = parseRunPlan(json, state, knowledge, trigger);
  console.log(`F${state.run?.floor}: ${(meta.latencyMs / 1000).toFixed(1)} s, in ${meta.inputTokens} (cache ${meta.cacheHitTokens}), out ${meta.outputTokens}, effort ${meta.effort}`);
  console.log(`  ${plan.archetype} | want ${plan.want.join(",")} | avoid ${plan.avoid.join(",")} | remove ${plan.remove.join(",")} | block ${plan.blockTarget} | elites ${plan.elites} | rest ${plan.rest}`);
  console.log(`  boss: ${plan.bossPrep}`);
  console.log(`  ${plan.summary}`);
}

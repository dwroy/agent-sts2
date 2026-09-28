/**
 * Dry run of the FIGHT_PLAN=v1 request on recorded states: for each elite/boss COMBAT state in the
 * file (one raw mod state per line), builds the request the loop would send, asks DeepSeek, and prints
 * the parsed plan with its latency and tokens. Nothing is played.
 *
 * Usage: npx tsx tools/fight-plan-dry.ts <states.jsonl> [--floors 17,33,48] [--dump]
 */
import { readFileSync } from "node:fs";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { moveModel } from "../src/knowledge/move-model.js";
import { DeepSeekClient } from "../src/llm/deepseek.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { RunJournal } from "../src/project/run-journal.js";
import { createScreenMemory, type DecisionEnv } from "../src/project/types.js";
import { fightKind } from "../src/screens/combat-plan.js";
import { FIGHT_PLAN_TASK, fightKey, fightPlanInput, parseFightPlan } from "../src/strategy/fight-plan.js";
import { asRecord, str, type JsonValue } from "../src/util/json.js";

const file = process.argv[2];
if (!file) throw new Error("usage: fight-plan-dry.ts <states.jsonl> [--floors a,b] [--dump]");
const floorsAt = process.argv.indexOf("--floors");
const floors = floorsAt >= 0 ? new Set(process.argv[floorsAt + 1]!.split(",").map(Number)) : null;
const dump = process.argv.includes("--dump");

if ((process as NodeJS.Process & { loadEnvFile?: (f?: string) => void }).loadEnvFile) {
  try {
    (process as NodeJS.Process & { loadEnvFile: (f?: string) => void }).loadEnvFile(".env");
  } catch {
    // no .env
  }
}
const config = loadConfig(process.env);
if (!config.deepseek) throw new Error("no DeepSeek key configured");
const deepseek = new DeepSeekClient({ ...config.deepseek, reasoningLog: "" });
const knowledge = makeKnowledge(JSON.parse(readFileSync(".cache/game-data.json", "utf8")).collections, "cache");

for (const line of readFileSync(file, "utf8").split("\n")) {
  if (!line.trim()) continue;
  const state = parseGameState(JSON.parse(line) as Record<string, unknown>);
  if (floors && !floors.has(state.run?.floor ?? -1)) continue;
  const env = { state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory(state.screen) } as unknown as DecisionEnv;
  const kind = fightKind(asRecord(state.raw["combat"]), env);
  if (kind !== "elite" && kind !== "boss") continue;
  const memory = new RunJournal().render(state, knowledge, undefined);
  const payload: Record<string, JsonValue> = {
    task: FIGHT_PLAN_TASK,
    fight_state: fightPlanInput(state, knowledge, kind, moveModel()),
    memory: { ...memory },
  };
  if (dump) console.log(JSON.stringify(payload, null, 1));
  const { json, meta } = await deepseek.askJson(payload, "fight-plan");
  const plan = parseFightPlan(json, state, knowledge, { runId: str(state.raw["run_id"]), fight: fightKey(state), kind, replans: 0 });
  console.log(
    `F${state.run?.floor} ${kind} ${plan.enemyIds.join("+")}: ${(meta.latencyMs / 1000).toFixed(1)} s, in ${meta.inputTokens} (cache ${meta.cacheHitTokens}), out ${meta.outputTokens} (reasoning ${meta.reasoningTokens}), effort ${meta.effort}`,
  );
  console.log(`  raw: ${JSON.stringify(json)}`);
  console.log(`  parsed: ${plan.approach}; setup ${plan.setup.join(", ") || "-"}; focus ${plan.focus ?? "-"}; potions ${JSON.stringify(plan.potions)}`);
}

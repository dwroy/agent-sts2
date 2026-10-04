/**
 * DeepSeek vs GPT on one logged question (Dai 2026-10-03: "拿一次实际请求看看 ds 和 GPT 分别怎么回答").
 *
 * The row is a brain.jsonl row that codex answered in live play; the system prompt is re-rendered from a snapshot of the
 * live knowledge files and frozen facts (taken only when its sha equals the row's system_sha), then the same request goes
 * through the router with BRAIN_ENGINE=deepseek and no fallback. Logs go to --out, never to the live logs.
 *
 *   npx tsx experiments/brain-replay/ds-vs-gpt-1003/ask-ds.ts --rows ROWS.jsonl --knowledge DIR --facts DIR --out DIR
 */
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { createRouter } from "../../../agent/src/brain/brain.js";
import { KnowledgePrompt } from "../../../agent/src/brain/knowledge.js";
import { carriesRunPlan, fightPlanSpec, freeSpec, pickSpec, routePlanSpec, runPlanSpec, shopPlanSpec, withRunPlanField } from "../../../agent/src/brain/specs.js";
import type { AnswerSpec, BrainRequest } from "../../../agent/src/brain/types.js";
import { loadConfig } from "../../../agent/src/config.js";
import { frozenFacts } from "../../../agent/src/knowledge/render/facts.js";
import { DeepSeekClient } from "../../../agent/src/llm/deepseek.js";

const { values } = parseArgs({ options: { rows: { type: "string" }, knowledge: { type: "string" }, facts: { type: "string" }, out: { type: "string" } } });
type Row = Record<string, any>;
const rows: Row[] = readFileSync(values.rows!, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
const sha = (text: string): string => createHash("sha256").update(text).digest("hex").slice(0, 12);
const knowledge = new KnowledgePrompt({ facts: frozenFacts(values.facts), mechanics: true, moveRules: true });

function specOf(row: Row): AnswerSpec {
  const label: string = row.label;
  const state = row.payload;
  if (row.options) {
    if (label.startsWith("shop/") || label === "map/route-plan" || label === "map/route-review") {
      const kind = label.startsWith("shop/") ? shopPlanSpec(label, row.options, state) : routePlanSpec(label, state);
      return carriesRunPlan(state) ? withRunPlanField(kind) : kind;
    }
    return pickSpec(label, row.options, state);
  }
  return label === "run-plan" ? runPlanSpec(label) : label === "fight-plan" ? fightPlanSpec(label) : freeSpec(label, { type: "object" });
}

const out = values.out!;
mkdirSync(out, { recursive: true });
const config = loadConfig({ ...process.env, BRAIN_ENGINE: "deepseek", BRAIN_FALLBACK: "none", KNOWLEDGE_PREFIX: "full", BRAIN_LOG: join(out, "brain-ds.jsonl"), DEEPSEEK_REASONING_LOG: join(out, "deepseek-reasoning.jsonl"), DEEPSEEK_FACTS_SNAPSHOT_DIR: values.facts! } as NodeJS.ProcessEnv);
const router = createRouter(config, new DeepSeekClient(config.deepseek!));
for (const row of rows) {
  const { system, note } = knowledge.system({ ascension: row.knowledge.ascension, knowledgeDir: values.knowledge! });
  const exact = sha(system) === row.system_sha && note.prefix_sha === row.knowledge.prefix_sha;
  console.log(`${row.run_id} ${row.label} ${row.ts}: system ${sha(system)} vs logged ${row.system_sha}: ${exact ? "exact" : "DIFFERENT"}`);
  if (!exact) continue;
  const req: BrainRequest = { runId: row.run_id, label: row.label, system, ...(row.memory === undefined ? {} : { memory: row.memory }), question: row.question, ...(row.options ? { options: row.options } : {}), payload: row.payload, spec: specOf(row), knowledge: note };
  const began = Date.now();
  let result: Record<string, unknown>;
  try {
    const answer = await router.decide(req);
    result = { ok: true, answer: answer.answer, problems: answer.problems, attempts: answer.attempts, latency_ms: answer.latencyMs, usage: answer.usage, reasoning: answer.reasoning ?? "" };
  } catch (error) {
    result = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  appendFileSync(join(out, "results.jsonl"), `${JSON.stringify({ run_id: row.run_id, ts: row.ts, label: row.label, wall_ms: Date.now() - began, codex: { answer: row.answer, latency_ms: row.latency_ms, usage: row.usage }, deepseek: result })}\n`);
  console.log(JSON.stringify({ label: row.label, ok: result["ok"], latency_ms: result["latency_ms"], error: result["error"] }));
}

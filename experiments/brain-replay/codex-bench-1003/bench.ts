/**
 * Codex benchmark (Roy 2026-10-03): logged A9 brain questions sent to the codex engine exactly as DeepSeek got them.
 *
 * The question (memory, question, options, payload) is brain.jsonl's row; the system prompt is the full-knowledge prefix
 * re-rendered (src/brain/knowledge.ts) from a snapshot of the live knowledge files, and taken only when its sha equals the
 * row's system_sha (byte-identical to what DeepSeek got). The spec is the one Brain builds for the label (brain.ts). Each
 * question goes through the router with BRAIN_ENGINE=codex and no fallback (its re-ask included), one at a time.
 *
 *   npx tsx experiments/brain-replay/codex-bench-1003/bench.ts --rows ROWS.jsonl --knowledge DIR --facts DIR --out DIR [--check]
 */
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { createRouter } from "../../../agent/src/brain/brain.js";
import { KnowledgePrompt } from "../../../agent/src/brain/knowledge.js";
import { carriesRunPlan, fightPlanSpec, freeSpec, pickSpec, routePlanSpec, runPlanSpec, shopPlanSpec, withRunPlanField } from "../../../agent/src/brain/specs.js";
import type { AnswerSpec, BrainRequest } from "../../../agent/src/brain/types.js";
import { loadConfig } from "../../../agent/src/core/config.js";
import { frozenFacts } from "../../../agent/src/knowledge/render/facts.js";

const { values } = parseArgs({ options: { rows: { type: "string" }, knowledge: { type: "string" }, facts: { type: "string" }, out: { type: "string" }, check: { type: "boolean", default: false }, "stop-after-ms": { type: "string", default: "300000" } } });
type Row = Record<string, any>;
const rows: Row[] = readFileSync(values.rows!, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
const sha = (text: string): string => createHash("sha256").update(text).digest("hex").slice(0, 12);
const knowledge = new KnowledgePrompt({ facts: frozenFacts(values.facts), mechanics: true, moveRules: true });

/** The spec Brain builds for a row (brain.ts choose / choosePlan / askJson). */
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
const config = loadConfig({ ...process.env, BRAIN_ENGINE: "codex", BRAIN_FALLBACK: "none", KNOWLEDGE_PREFIX: "full", BRAIN_LOG: join(out, "brain-codex.jsonl") } as NodeJS.ProcessEnv);
const router = createRouter(config, null);
for (const row of rows) {
  const { system, note } = knowledge.system({ ascension: row.knowledge.ascension, knowledgeDir: values.knowledge! });
  const exact = sha(system) === row.system_sha && note.prefix_sha === row.knowledge.prefix_sha;
  console.log(`${row.run_id} ${row.label} ${row.ts}: system ${sha(system)} vs logged ${row.system_sha}, prefix ${note.prefix_sha} vs ${row.knowledge.prefix_sha}: ${exact ? "exact" : "DIFFERENT"}`);
  if (values.check || !exact) continue;
  const spec = specOf(row);
  const req: BrainRequest = { runId: row.run_id, label: row.label, system, ...(row.memory === undefined ? {} : { memory: row.memory }), question: row.question, ...(row.options ? { options: row.options } : {}), payload: row.payload, spec, knowledge: note };
  const began = Date.now();
  let result: Record<string, unknown>;
  try {
    const answer = await router.decide(req);
    const first = (answer as { first?: { answer: unknown; problems: string[] } }).first;
    result = { ok: true, answer: answer.answer, problems: answer.problems, attempts: answer.attempts, reasks: (answer as { reasks?: number }).reasks ?? 0, first_problems: first?.problems ?? [], latency_ms: answer.latencyMs, usage: answer.usage, reasoning: answer.reasoning ?? "", raw: answer.raw };
  } catch (error) {
    result = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  const wall = Date.now() - began;
  const line = { run_id: row.run_id, ts: row.ts, label: row.label, wall_ms: wall, deepseek: { answer: row.answer, latency_ms: row.latency_ms, usage: row.usage }, codex: result };
  appendFileSync(join(out, "results.jsonl"), `${JSON.stringify(line)}\n`);
  console.log(JSON.stringify({ label: row.label, wall_ms: wall, ok: result["ok"], attempts: result["attempts"], usage: result["usage"], error: result["error"] }));
  if (wall > Number(values["stop-after-ms"])) {
    console.log(`stopping: the call took ${wall} ms`);
    break;
  }
  if (!result["ok"] && /quota|usage limit/i.test(String(result["error"]))) {
    console.log("stopping: usage limit");
    break;
  }
}
writeFileSync(join(out, ".done"), new Date().toISOString());

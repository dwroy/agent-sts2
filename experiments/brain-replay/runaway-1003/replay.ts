/**
 * Codex session-mode runaways (2026-10-03, L3G50U6KX5ST / 3JHE2AWF5MWB: 10 of 66 session turns cut at
 * BRAIN_CODEX_MAX_ANSWER_CHARS=2000): the logged questions sent again to codex in session mode at effort high, one turn
 * each (no stall retry, no re-ask, no fallback), with the trace that keeps a cut answer's text (answer_text). The rows are
 * brain.jsonl's rows of the DeepSeek fallback after a question ran away twice (the same request codex got: memory,
 * question, options, payload). The system prompt is re-rendered from a snapshot of the live knowledge files: --loose
 * sends it when its sha differs from the logged one (the post-run refresh had rewritten the stats files by then).
 * Everything goes to --out (its own codex state directory, brain log and codex-calls.jsonl); never the live logs.
 *
 *   npx tsx experiments/brain-replay/runaway-1003/replay.ts --rows ROWS.jsonl --knowledge DIR --facts DIR --out DIR [--check] [--loose] [--only HH:MM:SS,...]
 *
 * Run 2026-10-03 22:08 CST (results.jsonl, codex-calls.jsonl here; system ece37937b139, not the logged 44fda70dfe08 /
 * 2598246a37e8): L3G5 F16 rest/plan answered (17.2 s), L3G5 F31 reward/card ran away again (20.5 s, cut at 2,044
 * characters: 1,875 of them whitespace after a complete choice and reason), 3JHE reward/card answered (45.7 s); both
 * answers padded 2-3 whitespace characters at the same place (after the reason).
 */
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { CodexEngine } from "../../../src/brain/engines/codex.js";
import { KnowledgePrompt } from "../../../src/brain/knowledge.js";
import { BrainRouter } from "../../../src/brain/router.js";
import { pickSpec } from "../../../src/brain/specs.js";
import type { BrainRequest, EngineName } from "../../../src/brain/types.js";
import { loadConfig } from "../../../src/config.js";
import { frozenFacts } from "../../../src/knowledge/render/facts.js";

const { values } = parseArgs({ options: { rows: { type: "string" }, knowledge: { type: "string" }, facts: { type: "string" }, out: { type: "string" }, check: { type: "boolean", default: false }, loose: { type: "boolean", default: false }, only: { type: "string", default: "" } } });
type Row = Record<string, any>;
const rows: Row[] = readFileSync(values.rows!, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
const sha = (text: string): string => createHash("sha256").update(text).digest("hex").slice(0, 12);
const knowledge = new KnowledgePrompt({ facts: frozenFacts(values.facts), mechanics: true, moveRules: true });
const out = values.out!;
mkdirSync(out, { recursive: true });
const only = new Set(values.only!.split(",").filter(Boolean));

const config = loadConfig({
  ...process.env,
  BRAIN_ENGINE: "codex",
  BRAIN_FALLBACK: "none",
  BRAIN_CODEX_MODE: "session",
  BRAIN_CODEX_EFFORT: "high",
  BRAIN_CODEX_STALL_RETRIES: "0",
  BRAIN_REASK: "off",
  KNOWLEDGE_PREFIX: "full",
  BRAIN_LOG: join(out, "brain-codex.jsonl"),
} as NodeJS.ProcessEnv);
const engine = new CodexEngine({ settings: config.brain.engines.codex, codex: config.brain.codex, stateDir: join(out, "codex-state"), traceFile: join(out, "codex-calls.jsonl"), note: (m) => console.log(`note: ${m}`) });
const router = new BrainRouter({ config: { ...config.brain, log: join(out, "brain-codex.jsonl") }, engine: (name: EngineName) => { if (name !== "codex") throw new Error(`no ${name} here`); return engine; } });
try {
  for (const row of rows) {
    const { system, note } = knowledge.system({ ascension: row.knowledge.ascension, knowledgeDir: values.knowledge! });
    const exact = sha(system) === row.system_sha && note.prefix_sha === row.knowledge.prefix_sha;
    console.log(`${row.run_id} ${row.label} ${row.ts}: system ${sha(system)} vs logged ${row.system_sha}, prefix ${note.prefix_sha} vs ${row.knowledge.prefix_sha}: ${exact ? "exact" : "DIFFERENT"}`);
    if (values.check || (!exact && !values.loose) || (only.size > 0 && !only.has(String(row.ts).slice(11, 19)))) continue;
    const req: BrainRequest = { runId: row.run_id, label: row.label, system, ...(row.memory === undefined ? {} : { memory: row.memory }), question: row.question, options: row.options, payload: row.payload, spec: pickSpec(row.label, row.options, row.payload), knowledge: note };
    const began = Date.now();
    let result: Record<string, unknown>;
    try {
      const answer = await router.decide(req);
      result = { ok: true, answer: answer.answer, latency_ms: answer.latencyMs, usage: answer.usage, raw: answer.raw };
    } catch (error) {
      result = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
    appendFileSync(join(out, "results.jsonl"), `${JSON.stringify({ run_id: row.run_id, ts: row.ts, label: row.label, wall_ms: Date.now() - began, result })}\n`);
    console.log(JSON.stringify({ label: row.label, wall_ms: Date.now() - began, ok: result["ok"], error: result["error"], raw: String(result["raw"] ?? "").slice(0, 300) }));
  }
} finally {
  await engine.close();
}

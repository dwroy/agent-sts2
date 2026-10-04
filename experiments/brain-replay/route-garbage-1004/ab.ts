/**
 * The route field at xhigh (2026-10-04, V4.6 runs 4-6): codex wrote "keep" and then the route_reason the instruction asks
 * for (codex's schema had none) or its own words into route ('keep fin? No must exact keep', 'keep 替换为空格? '); 19 of
 * 146 codex route reviews at xhigh, 4 still garbled after the re-ask. Logged questions (brain.jsonl rows: the request as
 * codex got it) are sent to codex in session mode at effort xhigh, one turn each (no stall retry, no re-ask, no
 * fallback), one variant per process:
 *   reason   BRAIN_CODEX_ROUTE_REASON=keep   (route_reason back in codex's schema, capped at 60 characters)
 *   pattern  BRAIN_CODEX_ROUTE_PATTERN=on    (route takes only "keep" or space-separated node ids)
 * The system prompt is re-rendered from a snapshot of the live knowledge files and the day's frozen facts (date pinned
 * to 2026-10-04); a row whose logged system_sha differs is sent anyway with --loose (said in its output line). Output
 * goes to --out/<variant>: codex state, brain log, codex-calls.jsonl, results.jsonl (the raw answer text kept).
 *
 *   npx tsx experiments/brain-replay/route-garbage-1004/ab.ts --rows ROWS.jsonl --knowledge DIR --facts DIR --out DIR --variant reason|pattern [--loose] [--check]
 */
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { CodexEngine } from "../../../agent/src/brain/engines/codex.js";
import { KnowledgePrompt } from "../../../agent/src/brain/knowledge.js";
import { BrainRouter } from "../../../agent/src/brain/router.js";
import { pickSpec } from "../../../agent/src/brain/specs.js";
import type { BrainRequest, EngineName } from "../../../agent/src/brain/types.js";
import { loadConfig } from "../../../agent/src/config.js";
import { frozenFacts } from "../../../agent/src/knowledge/render/facts.js";

const VARIANTS: Record<string, Record<string, string>> = {
  reason: { BRAIN_CODEX_ROUTE_REASON: "keep" },
  pattern: { BRAIN_CODEX_ROUTE_PATTERN: "on" },
};

const { values } = parseArgs({ options: { rows: { type: "string" }, knowledge: { type: "string" }, facts: { type: "string" }, out: { type: "string" }, variant: { type: "string" }, loose: { type: "boolean", default: false }, check: { type: "boolean", default: false } } });
const variant = values.variant ?? "";
if (!VARIANTS[variant]) throw new Error(`--variant reason|pattern, got ${variant}`);
type Row = Record<string, any>;
const rows: Row[] = readFileSync(values.rows!, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
const sha = (text: string): string => createHash("sha256").update(text).digest("hex").slice(0, 12);
const knowledge = new KnowledgePrompt({ facts: frozenFacts(values.facts, () => new Date("2026-10-04T04:00:00.000Z")), mechanics: true, moveRules: true });
const out = join(values.out!, variant);
mkdirSync(out, { recursive: true });

const config = loadConfig({
  ...process.env,
  ...VARIANTS[variant],
  BRAIN_ENGINE: "codex",
  BRAIN_FALLBACK: "none",
  BRAIN_CODEX_MODE: "session",
  BRAIN_CODEX_EFFORT: "xhigh",
  BRAIN_CODEX_STALL_RETRIES: "0",
  BRAIN_REASK: "off",
  KNOWLEDGE_PREFIX: "full",
  BRAIN_LOG: join(out, "brain-codex.jsonl"),
} as NodeJS.ProcessEnv);
const engine = new CodexEngine({ settings: config.brain.engines.codex, codex: config.brain.codex, stateDir: join(out, "codex-state"), traceFile: join(out, "codex-calls.jsonl"), note: (m) => console.log(`note: ${m}`) });
const router = new BrainRouter({
  config: { ...config.brain, log: join(out, "brain-codex.jsonl") },
  engine: (name: EngineName) => {
    if (name !== "codex") throw new Error(`no ${name} here`);
    return engine;
  },
});
try {
  for (const row of rows) {
    const { system, note } = knowledge.system({ ascension: row.knowledge.ascension, knowledgeDir: values.knowledge! });
    const exact = sha(system) === row.system_sha && note.prefix_sha === row.knowledge.prefix_sha;
    console.log(`${variant} ${row.run_id} ${row.label} ${row.ts}: system ${sha(system)} vs logged ${row.system_sha}: ${exact ? "exact" : "DIFFERENT"}`);
    if (values.check || (!exact && !values.loose)) continue;
    const req: BrainRequest = { runId: row.run_id, label: row.label, system, ...(row.memory === undefined ? {} : { memory: row.memory }), question: row.question, options: row.options, payload: row.payload, spec: pickSpec(row.label, row.options, row.payload), knowledge: note };
    const began = Date.now();
    let result: Record<string, unknown>;
    try {
      const answer = await router.decide(req);
      result = { ok: true, answer: answer.answer, problems: answer.problems, latency_ms: answer.latencyMs, usage: answer.usage, raw: answer.raw, notes: answer.notes ?? [] };
    } catch (error) {
      result = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
    appendFileSync(join(out, "results.jsonl"), `${JSON.stringify({ variant, run_id: row.run_id, ts: row.ts, label: row.label, exact_system: exact, wall_ms: Date.now() - began, result })}\n`);
    console.log(JSON.stringify({ variant, label: row.label, ts: row.ts, wall_ms: Date.now() - began, ok: result["ok"], raw: result["raw"], problems: result["problems"], notes: result["notes"], error: result["error"] }));
  }
} finally {
  await engine.close();
}

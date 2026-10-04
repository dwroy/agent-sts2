/**
 * Codex answer-schema A/B (2026-10-03, after the session-mode runaways: 22 of 128 turns of L3G5 / 3JHE / C4F1, every one
 * a pick that used none of the stable schema's optional fields). Logged questions (brain.jsonl rows: the request as codex
 * got it) are sent to codex in session mode at effort high, one turn each (no stall retry, no re-ask, no fallback), with
 * one schema variant per process:
 *   current  BRAIN_CODEX_SCHEMA_FIELDS=all  BRAIN_CODEX_REASON_LAST=off  (the kind's stable schema: live until now)
 *   A        BRAIN_CODEX_SCHEMA_FIELDS=used BRAIN_CODEX_REASON_LAST=off  (only the fields the question uses)
 *   B        BRAIN_CODEX_SCHEMA_FIELDS=used BRAIN_CODEX_REASON_LAST=on   (the same, reason last)
 * Every variant runs with BRAIN_CODEX_ACCEPT_CUT=on and BRAIN_CODEX_MAX_ANSWER_BLANKS=100 (live), so a runaway is cut at
 * once and its prefix, when it closes into a whole answer, is taken (variant C, logged as accepted_from_cut).
 * The system prompt is re-rendered from a snapshot of the live knowledge files and the day's frozen facts (the date
 * pinned to 2026-10-03); a row whose logged system_sha differs is sent anyway with --loose (said in its output line).
 * Everything goes to --out/<variant> (its own codex state, brain log, codex-calls.jsonl, results.jsonl).
 *
 *   npx tsx experiments/brain-replay/schema-ab-1003/ab.ts --rows ROWS.jsonl --knowledge DIR --facts DIR --out DIR --variant current|A|B [--loose] [--check]
 */
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { CodexEngine } from "../../../agent/src/brain/engines/codex.js";
import { KnowledgePrompt } from "../../../agent/src/brain/knowledge.js";
import { BrainRouter } from "../../../agent/src/brain/router.js";
import { carriesRunPlan, pickSpec, routePlanSpec, shopPlanSpec, withRunPlanField } from "../../../agent/src/brain/specs.js";
import type { AnswerSpec, BrainRequest, EngineName } from "../../../agent/src/brain/types.js";
import { loadConfig } from "../../../agent/src/core/config.js";
import { frozenFacts } from "../../../agent/src/knowledge/render/facts.js";

const VARIANTS: Record<string, Record<string, string>> = {
  current: { BRAIN_CODEX_SCHEMA_FIELDS: "all", BRAIN_CODEX_REASON_LAST: "off" },
  A: { BRAIN_CODEX_SCHEMA_FIELDS: "used", BRAIN_CODEX_REASON_LAST: "off" },
  B: { BRAIN_CODEX_SCHEMA_FIELDS: "used", BRAIN_CODEX_REASON_LAST: "on" },
};

const { values } = parseArgs({ options: { rows: { type: "string" }, knowledge: { type: "string" }, facts: { type: "string" }, out: { type: "string" }, variant: { type: "string" }, loose: { type: "boolean", default: false }, check: { type: "boolean", default: false } } });
const variant = values.variant ?? "";
if (!VARIANTS[variant]) throw new Error(`--variant current|A|B, got ${variant}`);
type Row = Record<string, any>;
const rows: Row[] = readFileSync(values.rows!, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
const sha = (text: string): string => createHash("sha256").update(text).digest("hex").slice(0, 12);
// The facts table of the day the questions were asked (frozenFacts reads <day>-prefix-facts.json).
const knowledge = new KnowledgePrompt({ facts: frozenFacts(values.facts, () => new Date("2026-10-03T14:00:00.000Z")), mechanics: true, moveRules: true });
const out = join(values.out!, variant);
mkdirSync(out, { recursive: true });

/** The spec Brain builds for a row (brain.ts choose / choosePlan). */
function specOf(row: Row): AnswerSpec {
  const label: string = row.label;
  const state = row.payload;
  if (label.startsWith("shop/") || label === "map/route-plan" || label === "map/route-review") {
    const kind = label.startsWith("shop/") ? shopPlanSpec(label, row.options, state) : routePlanSpec(label, state);
    return carriesRunPlan(state) ? withRunPlanField(kind) : kind;
  }
  return pickSpec(label, row.options, state);
}

const config = loadConfig({
  ...process.env,
  ...VARIANTS[variant],
  BRAIN_ENGINE: "codex",
  BRAIN_FALLBACK: "none",
  BRAIN_CODEX_MODE: "session",
  BRAIN_CODEX_EFFORT: "high",
  BRAIN_CODEX_STALL_RETRIES: "0",
  BRAIN_CODEX_ACCEPT_CUT: "on",
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
    const req: BrainRequest = { runId: row.run_id, label: row.label, system, ...(row.memory === undefined ? {} : { memory: row.memory }), question: row.question, options: row.options, payload: row.payload, spec: specOf(row), knowledge: note };
    const began = Date.now();
    let result: Record<string, unknown>;
    try {
      const answer = await router.decide(req);
      result = { ok: true, answer: answer.answer, problems: answer.problems, latency_ms: answer.latencyMs, usage: answer.usage, raw: answer.raw, notes: answer.notes ?? [] };
    } catch (error) {
      result = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
    appendFileSync(join(out, "results.jsonl"), `${JSON.stringify({ variant, run_id: row.run_id, ts: row.ts, label: row.label, exact_system: exact, wall_ms: Date.now() - began, result })}\n`);
    console.log(JSON.stringify({ variant, label: row.label, ts: row.ts, wall_ms: Date.now() - began, ok: result["ok"], choice: (result["answer"] as Row | undefined)?.["choice"] ?? null, error: result["error"], notes: result["notes"] }));
  }
} finally {
  await engine.close();
}

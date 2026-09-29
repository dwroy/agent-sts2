/**
 * Replays logged brain questions through the V4 router with a chosen engine (and model), and tabulates
 * first-answer validity, validity after the router's re-ask, latency, tokens, cost, tool calls, agreement with
 * the choice logged in play and agreement between engines.
 *
 * Questions: jev-sts2-dsh/experiments/dsh/data/dataset.jsonl (93 real questions rebuilt byte-for-byte, with the
 * system prompt they were asked with), sampled stratified by question group (every group before any repeats).
 *
 * Usage (worktree root):
 *   npx tsx tools/brain-replay.ts --engine deepseek|claude [--model M] [--effort E] [--n 5 | --ids q001,q002 | --ids-file F]
 *     [--tag smoke-0929] [--env-file PATH] [--fake-tools] [--reask on|off] [--dry] [--summary-only]
 *     [--knowledge off|full] [--system logged|current|PATH] [--lessons PATH] [--max-claude-calls N] [--claude-tools on|off]
 * --knowledge full: the system prompt and memory as KNOWLEDGE_PREFIX=full makes them (src/brain/knowledge.ts), the prefix
 * rendered from this checkout's src/knowledge at the question's ascension; --lessons pins the post-mortems file (a
 * snapshot, so every arm reads the same). --system: the prompt of an off arm: "logged" (default, the dsh data's
 * system-prompt.txt, as asked in play), "current" (v3's prompt from today's guide and handbook), or a file.
 * Output: experiments/brain-replay/<tag>/results.jsonl, brain-<engine>-<knowledge>.jsonl and
 * deepseek-reasoning-<engine>-<knowledge>.jsonl (raw, not committed) and summary.md (recomputed from every results row
 * of the tag, all arms).
 *
 * Keys: the DeepSeek key comes from the env file's DEEPSEEK_API_KEY_FILE (or the environment); nothing prints
 * or stores it. Claude runs under this machine's login.
 */
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { createRouter } from "../src/brain/brain.js";
import { KnowledgePrompt } from "../src/brain/knowledge.js";
import { pickSpec, runPlanSpec, shopPlanSpec } from "../src/brain/specs.js";
import { userMessage } from "../src/brain/message.js";
import type { BrainRequest } from "../src/brain/types.js";
import { loadConfig } from "../src/config.js";
import { DeepSeekClient } from "../src/llm/deepseek.js";
import type { ToolContext, ToolDef } from "../src/tools/types.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DSH_DATA = "/home/dw/Projects/sts2-jev/jev-sts2-dsh/experiments/dsh/data";
const FAKE_TOOLS = join(REPO, "experiments/brain-replay/fake-tools.mjs");

const { values } = parseArgs({
  options: {
    engine: { type: "string", default: "deepseek" },
    model: { type: "string" },
    effort: { type: "string" },
    n: { type: "string", default: "5" },
    ids: { type: "string" },
    tag: { type: "string", default: "smoke" },
    "env-file": { type: "string" },
    "fake-tools": { type: "boolean", default: false },
    reask: { type: "string" },
    dataset: { type: "string", default: join(DSH_DATA, "dataset.jsonl") },
    system: { type: "string", default: "logged" },
    dry: { type: "boolean", default: false },
    "summary-only": { type: "boolean", default: false },
    knowledge: { type: "string", default: "off" },
    "ids-file": { type: "string" },
    lessons: { type: "string" },
    "max-claude-calls": { type: "string" },
    "claude-tools": { type: "string" },
  },
});

interface Row {
  id: string;
  label: string;
  kind: "pick" | "shop-plan" | "run-plan" | null;
  user_message: string;
  criteria: Record<string, string | null>;
  logged: Record<string, unknown> | null;
  skipped?: string;
}

/** The question groups of the dsh analysis, cheapest first (a small sample covers the quick ones first). */
const GROUPS = ["reward/card", "rest/plan", "selection/*", "shop/plan", "run-plan", "event/choose+plan", "map/route-plan", "event/act-plan"];

function groupOf(label: string): string {
  if (label.startsWith("selection/")) return "selection/*";
  if (label === "event/choose" || label === "event/plan") return "event/choose+plan";
  return label;
}

/** Every group once, in GROUPS order, then again, ...: the first n. Within a group, by id. */
export function stratified(rows: Row[], n: number): Row[] {
  const byGroup = new Map<string, Row[]>();
  for (const row of rows) {
    const group = groupOf(row.label);
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group)!.push(row);
  }
  for (const list of byGroup.values()) list.sort((a, b) => a.id.localeCompare(b.id));
  const out: Row[] = [];
  for (let round = 0; out.length < n; round += 1) {
    let added = false;
    for (const group of GROUPS) {
      const row = byGroup.get(group)?.[round];
      if (row && out.length < n) {
        out.push(row);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}

/** The BrainRequest a logged question was: its memory, question, options or task input, and its spec. */
function requestOf(row: Row, system: string): BrainRequest {
  const msg = JSON.parse(row.user_message) as Record<string, unknown>;
  if (row.kind === "run-plan") {
    const { memory, task, ...input } = msg;
    return { label: row.label, system, ...(memory === undefined ? {} : { memory: memory as Record<string, unknown> }), question: String(task ?? ""), payload: input, spec: runPlanSpec(row.label) };
  }
  const state = (msg["state"] ?? {}) as Record<string, unknown>;
  const options = msg["options"] as Record<string, string | null>;
  const spec = row.kind === "shop-plan" ? shopPlanSpec(row.label, options, state) : pickSpec(row.label, options, state);
  return { label: row.label, system, ...(msg["memory"] === undefined ? {} : { memory: msg["memory"] as Record<string, unknown> }), question: String(msg["question"] ?? ""), options, payload: state, spec };
}

/** KEY=VALUE lines (comments and blanks skipped); values are never printed. */
function readEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith("#")) env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
  return env;
}

/** The decision logged in play, as an answer object (a run plan's is its raw plan); null when none was logged. */
function loggedAnswer(row: Row): Record<string, unknown> | null {
  const logged = row.logged ?? {};
  if (row.kind === "run-plan") {
    const raw = logged["raw"];
    const plan = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : logged;
    return typeof plan["elites"] === "string" ? plan : null;
  }
  if (row.kind === "shop-plan") return Array.isArray(logged["plan"]) ? { plan: logged["plan"], reason: logged["reason"] } : null;
  return typeof logged["choice"] === "string" ? { choice: logged["choice"], reason: logged["reason"], ...(typeof logged["route"] === "string" ? { route: logged["route"] } : {}) } : null;
}

/** Does the answer make the same decision as the one logged in play? null when there is nothing to compare. */
function agreesWithLogged(row: Row, answer: Record<string, unknown> | null): boolean | null {
  const logged = loggedAnswer(row);
  if (!answer || !logged) return null;
  if (row.kind === "pick") return answer["choice"] === logged["choice"];
  return decisionKey(row.kind, answer) === decisionKey(row.kind, logged);
}

/** The ascension a question was asked at (the first "ascension" number in its message); null when none. */
function ascensionOf(row: Row): number | null {
  const m = /"ascension":\s*(\d+)/.exec(row.user_message);
  return m ? Number(m[1]) : null;
}

function stripLeave(plan: unknown): unknown[] {
  const steps = Array.isArray(plan) ? plan : [];
  const at = steps.indexOf("leave");
  return at >= 0 ? steps.slice(0, at) : steps;
}

/**
 * The decision two answers are compared on: a pick's choice and route (a route that repeats the choice, as a route
 * plan's may, adds nothing); a shop list's purchases before "leave" as a set (the same buys in another order are the
 * same decision); a run plan's elites and rest policies.
 */
function decisionKey(kind: Row["kind"], answer: Record<string, unknown> | null): string | null {
  if (!answer) return null;
  if (kind === "pick") return `${String(answer["choice"])}${answer["route"] && answer["route"] !== answer["choice"] ? `|${String(answer["route"])}` : ""}`;
  if (kind === "shop-plan") return JSON.stringify(stripLeave(answer["plan"]).map(String).sort());
  return `${String(answer["elites"])}|${String(answer["rest"])}`;
}

interface Result {
  ts: string;
  id: string;
  label: string;
  group: string;
  kind: Row["kind"];
  engine: string;
  model: string;
  /** The system prompt: "off" (the --system one) or "full" (KNOWLEDGE_PREFIX=full); absent in older rows (off). */
  knowledge?: string;
  system_sha?: string;
  system_chars?: number;
  prefix_sha?: string;
  tools: string[];
  ok: boolean;
  first_ok: boolean;
  reasks: number;
  attempts: number;
  problems: string[];
  latency_ms: number;
  usage: Record<string, number | undefined>;
  tool_calls: string[];
  answer: Record<string, unknown> | null;
  agrees_logged: boolean | null;
  fell_back_from?: unknown;
  error?: string;
}

const pct = (a: number, b: number): string => (b === 0 ? "-" : `${a}/${b} (${Math.round((100 * a) / b)}%)`);
const quantile = (xs: number[], q: number): number => {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))]!;
};

/** A result's arm: engine, model, knowledge mode, tools. */
function armOf(r: Result): string {
  return `${r.engine} ${r.model} ${r.knowledge ?? "off"}${r.tools.length ? " +tools" : ""}`;
}

function summary(results: Result[], tag: string): string {
  const arms = new Map<string, Result[]>();
  for (const r of results) {
    const arm = armOf(r);
    if (!arms.has(arm)) arms.set(arm, []);
    arms.get(arm)!.push(r);
  }
  const lines = [`# Brain replay: ${tag}`, "", `Generated by tools/brain-replay.ts from ${results.length} results (raw rows: results.jsonl, brain-*.jsonl; not committed).`, ""];
  lines.push("First answer valid: valid with no re-ask of any kind (the router's, or v3 DeepSeek's own consistency re-ask). Cache read: DeepSeek prompt_cache_hit_tokens, Claude cache_read_input_tokens. Cost: DeepSeek at deepseek-flash prices (miss $0.3/M, hit $0.006/M, output $1.2/M); Claude the CLI's total_cost_usd (API-price equivalent under the subscription, not charged).", "");
  lines.push("| arm (engine model knowledge) | n | first answer valid | valid after re-ask | errors | p50 s | p95 s | input tok | mean input/q | cache read (%) | cache write | output tok | reasoning tok | cost $ | $/q | tool calls | agrees with logged |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const [arm, rs] of arms) {
    const sum = (key: string): number => rs.reduce((s, r) => s + (r.usage[key] ?? 0), 0);
    const lat = rs.filter((r) => !r.error).map((r) => r.latency_ms / 1000);
    const calls = rs.flatMap((r) => r.tool_calls);
    const names = [...new Set(calls)].join(", ");
    const compared = rs.filter((r) => r.agrees_logged !== null);
    const input = sum("inputTokens");
    const hitShare = input > 0 ? ` (${Math.round((100 * sum("cacheHitTokens")) / input)}%)` : "";
    lines.push(`| ${arm} | ${rs.length} | ${pct(rs.filter((r) => r.first_ok).length, rs.length)} | ${pct(rs.filter((r) => r.ok).length, rs.length)} | ${rs.filter((r) => r.error).length} | ${quantile(lat, 0.5).toFixed(1)} | ${quantile(lat, 0.95).toFixed(1)} | ${input} | ${Math.round(input / Math.max(1, rs.length))} | ${sum("cacheHitTokens")}${hitShare} | ${sum("cacheWriteTokens")} | ${sum("outputTokens")} | ${sum("reasoningTokens")} | ${sum("costUsd").toFixed(4)} | ${(sum("costUsd") / Math.max(1, rs.length)).toFixed(4)} | ${calls.length}${names ? ` (${names})` : ""} | ${pct(compared.filter((r) => r.agrees_logged).length, compared.length)} |`);
  }
  lines.push("", "Per question:", "", "| id | label | arm | valid | attempts | re-asks | s | input | cache read | cache write | output | reasoning | cost $ | tools called | decision | logged |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of results) {
    lines.push(`| ${r.id} | ${r.label} | ${armOf(r)} | ${r.ok ? (r.first_ok ? "yes" : "yes (re-asked)") : r.error ? `error: ${r.error.slice(0, 60)}` : `no: ${r.problems.join("; ").slice(0, 60)}`} | ${r.attempts} | ${r.reasks} | ${(r.latency_ms / 1000).toFixed(1)} | ${r.usage["inputTokens"] ?? 0} | ${r.usage["cacheHitTokens"] ?? 0} | ${r.usage["cacheWriteTokens"] ?? 0} | ${r.usage["outputTokens"] ?? 0} | ${r.usage["reasoningTokens"] ?? 0} | ${(r.usage["costUsd"] ?? 0).toFixed(4)} | ${r.tool_calls.join(", ") || "-"} | ${String(decisionKey(r.kind, r.answer) ?? "-").slice(0, 40)} | ${r.agrees_logged === null ? "-" : r.agrees_logged ? "same" : "differs"} |`);
  }
  // Engine pairs on the questions both answered.
  const armNames = [...arms.keys()];
  if (armNames.length > 1) {
    lines.push("", "Agreement between engines (same decision on the questions both answered):", "", "| pair | agree |", "|---|---|");
    for (let i = 0; i < armNames.length; i += 1) {
      for (let j = i + 1; j < armNames.length; j += 1) {
        const a = new Map(arms.get(armNames[i]!)!.map((r) => [r.id, r] as const));
        let both = 0;
        let same = 0;
        for (const r of arms.get(armNames[j]!)!) {
          const other = a.get(r.id);
          if (!other || !r.answer || !other.answer) continue;
          both += 1;
          if (decisionKey(r.kind, r.answer) === decisionKey(other.kind, other.answer)) same += 1;
        }
        lines.push(`| ${armNames[i]} ~ ${armNames[j]} | ${pct(same, both)} |`);
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const out = join(REPO, "experiments/brain-replay", values.tag!);
  mkdirSync(out, { recursive: true });
  const resultsFile = join(out, "results.jsonl");
  const rows = readFileSync(values.dataset!, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Row).filter((row) => !row.skipped && row.kind);
  const byId = new Map(rows.map((row) => [row.id, row] as const));
  // Agreement with the logged choice is recomputed from the dataset (rows written before a comparison rule changed).
  const readResults = (): Result[] =>
    (existsSync(resultsFile) ? readFileSync(resultsFile, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Result) : []).map((r) => {
      const row = byId.get(r.id);
      return row ? { ...r, agrees_logged: agreesWithLogged(row, r.answer) } : r;
    });
  if (values["summary-only"]) {
    writeFileSync(join(out, "summary.md"), summary(readResults(), values.tag!));
    return;
  }
  const idList = values["ids-file"] ? readFileSync(values["ids-file"], "utf8").replace(/#.*$/gm, "").split(/[\s,]+/).filter((id) => /^q\d+$/.test(id)) : values.ids ? values.ids.split(",") : null;
  const picked = idList ? idList.map((id) => rows.find((row) => row.id === id)).filter((row): row is Row => Boolean(row)) : stratified(rows, Number(values.n));

  const engine = values.engine!;
  const knowledgeMode = values.knowledge === "full" ? "full" : "off";
  if (values.lessons) process.env["KNOWLEDGE_LESSONS_FILE"] = resolve(values.lessons);
  // One brain log and reasoning log per arm: arms may run at the same time.
  const armFile = (name: string): string => join(out, `${name}-${engine}-${knowledgeMode}.jsonl`);
  const env: Record<string, string> = { ...(values["env-file"] ? readEnvFile(values["env-file"]) : {}), BRAIN_ENGINE: engine, BRAIN_LOG: armFile("brain"), KNOWLEDGE_PREFIX: knowledgeMode };
  if (values.model) env[`BRAIN_${engine.toUpperCase()}_MODEL`] = values.model;
  if (values.effort) env[`BRAIN_${engine.toUpperCase()}_EFFORT`] = values.effort;
  if (values.reask) env["BRAIN_REASK"] = values.reask;
  if (values["fake-tools"]) env[`BRAIN_${engine.toUpperCase()}_TOOLS`] = "on";
  if (values["claude-tools"]) env["BRAIN_CLAUDE_TOOLS"] = values["claude-tools"];
  if (values["max-claude-calls"]) env["BRAIN_CLAUDE_MAX_CALLS"] = values["max-claude-calls"];
  // Only the settings this tool needs: DeepSeek's key file, model, efforts and timeout from the env file.
  const config = loadConfig({ ...(process.env["DEEPSEEK_API_KEY"] ? { DEEPSEEK_API_KEY: process.env["DEEPSEEK_API_KEY"] } : {}), ...env } as unknown as NodeJS.ProcessEnv);
  // Never the live reasoning log: this run's own file.
  const deepseek = config.deepseek ? new DeepSeekClient({ ...config.deepseek, reasoningLog: armFile("deepseek-reasoning") }) : null;
  // The off arm's prompt: as asked in play (logged), v3's prompt today (current), or a file.
  const systemSource = values.system === "logged" ? join(DSH_DATA, "system-prompt.txt") : values.system!;
  let system: string;
  if (systemSource === "current") {
    if (!config.deepseek) throw new Error("--system current builds v3's prompt from the DeepSeek settings: give --env-file");
    system = new DeepSeekClient(config.deepseek).systemPrompt;
  } else {
    system = readFileSync(systemSource, "utf8");
  }
  // The rebuilt messages must be the logged ones, byte for byte (checked before the knowledge mode changes the memory).
  const base = picked.map((row) => ({ row, req: requestOf(row, system) }));
  const drift = base.filter(({ row, req }) => userMessage(req) !== row.user_message).map(({ row }) => row.id);
  console.log(`${picked.length} questions: ${picked.map((row) => `${row.id} ${row.label}`).join(", ")}; messages not reproduced: ${drift.length ? drift.join(",") : "none"}`);
  const knowledgeDir = join(REPO, "src/knowledge");
  const prompt = new KnowledgePrompt();
  const requests = base.map(({ row, req }) => {
    if (knowledgeMode === "off") return { row, req };
    const ascension = ascensionOf(row);
    return { row, req: prompt.apply(req, ascension === null ? null : { ascension, knowledgeDir }) };
  });
  for (const { row, req } of requests) {
    if (req.knowledge?.error) throw new Error(`${row.id}: ${req.knowledge.error}`);
  }
  if (knowledgeMode === "full") console.log(`knowledge full: ${[...new Set(requests.map(({ req }) => `A${req.knowledge?.ascension} prefix ${req.knowledge?.prefix_sha} (${req.knowledge?.prefix_chars} chars), system ${req.system.length} chars`))].join("; ")}`);
  if (values.dry || drift.length > 0) return;
  const router = createRouter(config, deepseek, values["fake-tools"] ? { claudeToolsModule: FAKE_TOOLS } : {});
  const tools: ToolDef[] = values["fake-tools"] ? ((await import(FAKE_TOOLS)) as { buildTools: (ctx: ToolContext) => ToolDef[] }).buildTools({ ascension: 8, knowledgeDir: join(REPO, "src/knowledge"), logsDir: "/nonexistent" }) : [];
  const systemFields = (req: BrainRequest): Pick<Result, "knowledge" | "system_sha" | "system_chars" | "prefix_sha"> => ({
    knowledge: knowledgeMode,
    system_sha: createHash("sha256").update(req.system).digest("hex").slice(0, 12),
    system_chars: req.system.length,
    ...(req.knowledge?.prefix_sha ? { prefix_sha: req.knowledge.prefix_sha } : {}),
  });
  for (const { row, req } of requests) {
    const started = Date.now();
    const request: BrainRequest = tools.length > 0 ? { ...req, tools, toolContext: { ascension: 8, knowledgeDir: join(REPO, "src/knowledge"), logsDir: "/nonexistent", state: req.payload } } : req;
    let result: Result;
    try {
      const answer = await router.decide(request);
      const parsed = answer.answer && typeof answer.answer === "object" ? (answer.answer as Record<string, unknown>) : null;
      // First answer valid: no router re-ask and no problems (v3's own consistency re-ask shows in attempts).
      const firstOk = answer.problems.length === 0 && !("first" in answer);
      result = {
        ts: new Date().toISOString(), id: row.id, label: row.label, group: groupOf(row.label), kind: row.kind, engine: answer.engine, model: answer.model, ...systemFields(request), tools: tools.map((t) => t.name),
        ok: parsed !== null && answer.problems.length === 0, first_ok: firstOk && parsed !== null && answer.attempts === 1, reasks: "first" in answer ? 1 : 0, attempts: answer.attempts, problems: answer.problems,
        latency_ms: answer.latencyMs, usage: { ...answer.usage }, tool_calls: answer.toolCalls.map((call) => call.name), answer: parsed, agrees_logged: agreesWithLogged(row, parsed),
        ...(answer.fellBackFrom ? { fell_back_from: answer.fellBackFrom } : {}),
      };
    } catch (error) {
      result = {
        ts: new Date().toISOString(), id: row.id, label: row.label, group: groupOf(row.label), kind: row.kind, engine, model: values.model ?? "", ...systemFields(request), tools: tools.map((t) => t.name),
        ok: false, first_ok: false, reasks: 0, attempts: 0, problems: [], latency_ms: Date.now() - started, usage: {}, tool_calls: [], answer: null, agrees_logged: null,
        error: error instanceof Error ? error.message.slice(0, 300) : String(error),
      };
    }
    appendFileSync(resultsFile, `${JSON.stringify(result)}\n`);
    console.log(`${row.id} ${row.label} ${result.engine} ${result.model}: ${result.ok ? "valid" : result.error ? `error ${result.error.slice(0, 120)}` : `invalid ${result.problems.join("; ").slice(0, 120)}`} in ${(result.latency_ms / 1000).toFixed(1)} s, tools [${result.tool_calls.join(", ")}], ${decisionKey(row.kind, result.answer) ?? "-"} (logged: ${result.agrees_logged === null ? "-" : result.agrees_logged ? "same" : "differs"})`);
  }
  writeFileSync(join(out, "summary.md"), summary(readResults(), values.tag!));
  console.log(`summary: ${join(out, "summary.md")}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

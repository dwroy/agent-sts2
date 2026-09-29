/**
 * Replays logged brain questions through the V4 router with a chosen engine (and model), and tabulates
 * first-answer validity, validity after the router's re-ask, latency, tokens, cost, tool calls, agreement with
 * the choice logged in play and agreement between engines.
 *
 * Questions: jev-sts2-dsh/experiments/dsh/data/dataset.jsonl (93 real questions rebuilt byte-for-byte, with the
 * system prompt they were asked with), sampled stratified by question group (every group before any repeats).
 *
 * Usage (worktree root):
 *   npx tsx tools/brain-replay.ts --engine deepseek|claude [--model M] [--effort E] [--n 5 | --ids q001,q002]
 *     [--tag smoke-0929] [--env-file PATH] [--fake-tools] [--reask on|off] [--dry] [--summary-only]
 * Output: experiments/brain-replay/<tag>/results.jsonl and brain.jsonl (raw, not committed) and summary.md
 * (recomputed from every results row of the tag, all engines).
 *
 * Keys: the DeepSeek key comes from the env file's DEEPSEEK_API_KEY_FILE (or the environment); nothing prints
 * or stores it. Claude runs under this machine's login.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { createRouter } from "../src/brain/brain.js";
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
    system: { type: "string", default: join(DSH_DATA, "system-prompt.txt") },
    dry: { type: "boolean", default: false },
    "summary-only": { type: "boolean", default: false },
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

/** Does the answer make the same decision as the one logged in play? null when there is nothing to compare. */
function agreesWithLogged(row: Row, answer: Record<string, unknown> | null): boolean | null {
  const logged = row.logged ?? {};
  if (!answer) return null;
  if (row.kind === "pick") return typeof logged["choice"] === "string" ? answer["choice"] === logged["choice"] : null;
  if (row.kind === "shop-plan") return Array.isArray(logged["plan"]) ? JSON.stringify(stripLeave(answer["plan"])) === JSON.stringify(stripLeave(logged["plan"])) : null;
  if (row.kind === "run-plan") return typeof logged["elites"] === "string" ? answer["elites"] === logged["elites"] && answer["rest"] === logged["rest"] : null;
  return null;
}

function stripLeave(plan: unknown): unknown[] {
  const steps = Array.isArray(plan) ? plan : [];
  const at = steps.indexOf("leave");
  return at >= 0 ? steps.slice(0, at) : steps;
}

/** The decision two answers are compared on. */
function decisionKey(kind: Row["kind"], answer: Record<string, unknown> | null): string | null {
  if (!answer) return null;
  if (kind === "pick") return `${String(answer["choice"])}${answer["route"] ? `|${String(answer["route"])}` : ""}`;
  if (kind === "shop-plan") return JSON.stringify(stripLeave(answer["plan"]));
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

function summary(results: Result[], tag: string): string {
  const arms = new Map<string, Result[]>();
  for (const r of results) {
    const arm = `${r.engine} ${r.model}${r.tools.length ? " +tools" : ""}`;
    if (!arms.has(arm)) arms.set(arm, []);
    arms.get(arm)!.push(r);
  }
  const lines = [`# Brain replay: ${tag}`, "", `Generated by tools/brain-replay.ts from ${results.length} results (raw rows: results.jsonl, brain.jsonl; not committed).`, ""];
  lines.push("| engine / model | n | first answer valid | valid after re-ask | errors | p50 s | p95 s | input tok | cache read | cache write | output tok | cost $ | tool calls | agrees with logged |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const [arm, rs] of arms) {
    const sum = (key: string): number => rs.reduce((s, r) => s + (r.usage[key] ?? 0), 0);
    const lat = rs.filter((r) => !r.error).map((r) => r.latency_ms / 1000);
    const calls = rs.flatMap((r) => r.tool_calls);
    const names = [...new Set(calls)].join(", ");
    const compared = rs.filter((r) => r.agrees_logged !== null);
    lines.push(`| ${arm} | ${rs.length} | ${pct(rs.filter((r) => r.first_ok).length, rs.length)} | ${pct(rs.filter((r) => r.ok).length, rs.length)} | ${rs.filter((r) => r.error).length} | ${quantile(lat, 0.5).toFixed(1)} | ${quantile(lat, 0.95).toFixed(1)} | ${sum("inputTokens")} | ${sum("cacheHitTokens")} | ${sum("cacheWriteTokens")} | ${sum("outputTokens")} | ${sum("costUsd").toFixed(4)} | ${calls.length}${names ? ` (${names})` : ""} | ${pct(compared.filter((r) => r.agrees_logged).length, compared.length)} |`);
  }
  lines.push("", "Per question:", "", "| id | label | engine / model | valid | re-asks | s | input | cache read | cache write | output | cost $ | tools called | decision | logged |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of results) {
    lines.push(`| ${r.id} | ${r.label} | ${r.engine} ${r.model} | ${r.ok ? "yes" : r.error ? `error: ${r.error.slice(0, 60)}` : `no: ${r.problems.join("; ").slice(0, 60)}`} | ${r.reasks} | ${(r.latency_ms / 1000).toFixed(1)} | ${r.usage["inputTokens"] ?? 0} | ${r.usage["cacheHitTokens"] ?? 0} | ${r.usage["cacheWriteTokens"] ?? 0} | ${r.usage["outputTokens"] ?? 0} | ${(r.usage["costUsd"] ?? 0).toFixed(4)} | ${r.tool_calls.join(", ") || "-"} | ${String(decisionKey(r.kind, r.answer) ?? "-").slice(0, 40)} | ${r.agrees_logged === null ? "-" : r.agrees_logged ? "same" : "differs"} |`);
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
  const readResults = (): Result[] => (existsSync(resultsFile) ? readFileSync(resultsFile, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Result) : []);
  if (values["summary-only"]) {
    writeFileSync(join(out, "summary.md"), summary(readResults(), values.tag!));
    return;
  }
  const rows = readFileSync(values.dataset!, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Row).filter((row) => !row.skipped && row.kind);
  const system = readFileSync(values.system!, "utf8");
  const picked = values.ids ? values.ids.split(",").map((id) => rows.find((row) => row.id === id)).filter((row): row is Row => Boolean(row)) : stratified(rows, Number(values.n));
  // The rebuilt messages must be the logged ones, byte for byte.
  const requests = picked.map((row) => ({ row, req: requestOf(row, system) }));
  const drift = requests.filter(({ row, req }) => userMessage(req) !== row.user_message).map(({ row }) => row.id);
  console.log(`${picked.length} questions: ${picked.map((row) => `${row.id} ${row.label}`).join(", ")}; messages not reproduced: ${drift.length ? drift.join(",") : "none"}`);
  if (values.dry || drift.length > 0) return;

  const engine = values.engine!;
  const env: Record<string, string> = { ...(values["env-file"] ? readEnvFile(values["env-file"]) : {}), BRAIN_ENGINE: engine, BRAIN_LOG: join(out, "brain.jsonl") };
  if (values.model) env[`BRAIN_${engine.toUpperCase()}_MODEL`] = values.model;
  if (values.effort) env[`BRAIN_${engine.toUpperCase()}_EFFORT`] = values.effort;
  if (values.reask) env["BRAIN_REASK"] = values.reask;
  if (values["fake-tools"]) env[`BRAIN_${engine.toUpperCase()}_TOOLS`] = "on";
  // Only the settings this tool needs: DeepSeek's key file, model, efforts and timeout from the env file.
  const config = loadConfig({ ...(process.env["DEEPSEEK_API_KEY"] ? { DEEPSEEK_API_KEY: process.env["DEEPSEEK_API_KEY"] } : {}), ...env } as unknown as NodeJS.ProcessEnv);
  // Never the live reasoning log: this run's own file.
  const deepseek = config.deepseek ? new DeepSeekClient({ ...config.deepseek, reasoningLog: join(out, "deepseek-reasoning.jsonl") }) : null;
  const router = createRouter(config, deepseek, values["fake-tools"] ? { claudeToolsModule: FAKE_TOOLS } : {});
  const tools: ToolDef[] = values["fake-tools"] ? ((await import(FAKE_TOOLS)) as { buildTools: (ctx: ToolContext) => ToolDef[] }).buildTools({ ascension: 8, knowledgeDir: join(REPO, "src/knowledge"), logsDir: "/nonexistent" }) : [];
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
        ts: new Date().toISOString(), id: row.id, label: row.label, group: groupOf(row.label), kind: row.kind, engine: answer.engine, model: answer.model, tools: tools.map((t) => t.name),
        ok: parsed !== null && answer.problems.length === 0, first_ok: firstOk && parsed !== null, reasks: "first" in answer ? 1 : 0, attempts: answer.attempts, problems: answer.problems,
        latency_ms: answer.latencyMs, usage: { ...answer.usage }, tool_calls: answer.toolCalls.map((call) => call.name), answer: parsed, agrees_logged: agreesWithLogged(row, parsed),
        ...(answer.fellBackFrom ? { fell_back_from: answer.fellBackFrom } : {}),
      };
    } catch (error) {
      result = {
        ts: new Date().toISOString(), id: row.id, label: row.label, group: groupOf(row.label), kind: row.kind, engine, model: values.model ?? "", tools: tools.map((t) => t.name),
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

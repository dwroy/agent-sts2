/**
 * Codex as a brain engine: headless `codex exec` (codex-cli 0.160, npm @openai/codex) under this machine's ChatGPT
 * login (`codex login` in ~/.codex: the subscription; Dai 2026-10-03), one process per call. Model and effort are
 * always sent (default gpt-6.1-sol at xhigh: config.ts DEFAULT_CODEX_MODEL / DEFAULT_CODEX_EFFORT).
 *
 * - Isolation (measured 2026-10-03, experiments/brain-replay/codex-isolation.md): the model sees our system prompt
 *   (as codex's base instructions: model_instructions_file) and the user message, nothing else, and has no tool.
 *   --ignore-user-config (no config.toml: no MCP servers, plugins, hook trust, notify, profiles), --ignore-rules,
 *   --ephemeral (no session file), the features that add context, tools or background work disabled (CODEX_DISABLED_FEATURES:
 *   hooks, memories, plugins, apps, multi-agent, shell, ...), and -c overrides for the rest (codexConfig: no AGENTS.md
 *   project docs, no permissions / apps / collaboration / environment sections, no skills, no web search, no
 *   request_user_input). gpt-6.1-sol's catalog entry runs every tool through a JavaScript `exec` tool and adds the
 *   multi-agent tools: the engine passes codex its own catalog entry (`codex debug models`) with those switched off
 *   (model_catalog_json: tool_mode, multi_agent_version, experimental_supported_tools, apply_patch_tool_type).
 *   Codex's SQLite state and logs go to a directory of ours (sqlite_home, log_dir), not into CODEX_HOME.
 *   Codex loads $CODEX_HOME/AGENTS.md (or AGENTS.override.md) whatever the flags: a call with one there is refused
 *   (instructionFiles) rather than sent with it.
 *   A warning that codex ignored one of these settings (a codex version that renamed it) or an unknown feature flag
 *   refuses the call too: an isolation that may not hold is not used.
 * - The answer: --output-schema with the kind's stable schema (specs.ts stableSchema, as the claude engine's default),
 *   made strict for OpenAI's structured outputs (strictSchema: every property required, optional ones nullable; the
 *   nulls are dropped again from the answer, dropNulls), so the router's validation and re-ask work unchanged. The
 *   schema sits in front of the prompt cache, so it is the same for every question of a kind. A free-form task schema
 *   (an object without properties) cannot be strict: no --output-schema, the answer is read from the text.
 * - Usage from the stream's turn.completed: input_tokens (cached included), cached_input_tokens, output_tokens
 *   (reasoning included), reasoning_output_tokens. The stream reports no rate-limit state.
 * - Failures (codexFailure): a used-up subscription (usage limit) rests codex for the rest of the process (the router
 *   then sends every question to BRAIN_FALLBACK and says so once); a rate limit, an overload, a lost login and a
 *   program that does not start rest it for a while, as Claude's. The router's timeout (BRAIN_CODEX_TIMEOUT_MS, 10
 *   minutes) kills the process group. The prompt goes in on stdin, which is then closed (codex exec waits on an open
 *   stdin).
 * - Stalls (2026-10-03: RNTVAT76BPV0 in play, and its question replayed): codex streams over a
 *   WebSocket; a call could get its first output token and then nothing for 10 minutes, with no retry by codex. Each run
 *   is watched (runOnce): codex's trace-safe telemetry on stderr (CODEX_RUST_LOG) marks the first output token, after
 *   which a silent stream is killed after BRAIN_CODEX_STALL_MS and asked once more (BRAIN_CODEX_STALL_RETRIES); thinking
 *   before it is capped only by BRAIN_CODEX_FIRST_TOKEN_MS (off by default) and the router's BRAIN_CODEX_TIMEOUT_MS.
 *   codex's own retry notices ("Reconnecting... 1/5") are retries, not failures.
 * - Trace: every run writes a row to codex-calls.jsonl next to brain.jsonl (CodexTraceRow: the event timeline with
 *   arrival times, retries, errors, the first-token time, the stderr tail with credentials masked; never the prompt or
 *   the answer text), the stalled and timed-out runs included.
 * - Environment: only the basics a process needs (engines/process.ts agentEnv), CODEX_HOME for the login, the log
 *   filter, and the program's own directory first in PATH (the npm launcher is `#!/usr/bin/env node`).
 * - Usage guard (engines/codex-usage.ts): the plan's windows and credits are read at process start (Brain.preflight)
 *   and before a call every BRAIN_CODEX_USAGE_EVERY_CALLS calls or BRAIN_CODEX_USAGE_EVERY_MIN minutes; a window at
 *   BRAIN_CODEX_USAGE_STOP_PCT or credits in use rest codex for the rest of the process (the used-up-plan path), so a
 *   call never goes out past the stop. Each brain.jsonl row about codex carries the latest reading (`limits`).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";

import { DEFAULT_CODEX_EFFORT, DEFAULT_CODEX_MODEL, type BrainConfig, type BrainEngineSettings } from "../../config.js";
import type { JsonSchema } from "../../tools/types.js";
import { EngineFailure, labelPrefix, type FailureKind } from "../router.js";
import { normalisePick, parseAnswerText, promptWithReask } from "../message.js";
import { stableSchema } from "../specs.js";
import type { BrainAnswer, BrainEngine, BrainRequest, ToolCallRecord } from "../types.js";
import { CodexSession, configProblems, RpcError, SessionError, type SessionOptions, type SessionTurn } from "./codex-session.js";
import { CodexUsageGuard, readCodexUsage, type CodexUsage, type UsageNote } from "./codex-usage.js";
import { AgentAbortedError, AgentStartError, agentEnv, makeWorkDir, removeDir, runAgent } from "./process.js";

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

export interface CodexEngineOptions {
  settings: BrainEngineSettings;
  codex: BrainConfig["codex"];
  /** Where codex keeps its SQLite state and logs (default: CODEX_STATE_DIR in the temp dir). */
  stateDir?: string;
  /** One JSON row per codex run (codex-calls.jsonl next to brain.jsonl): its event timeline, retries, stderr tail; null: none. */
  traceFile?: string | null;
  /** Session mode's request timeouts (tests). */
  sessionTimeouts?: SessionOptions["timeouts"];
  /** Where the engine says what the console should see (a usage read that failed); the router's note. */
  note?: (message: string) => void;
  /** The usage read (default: readCodexUsage through a short-lived app-server; tests), and the guard's clock. */
  readUsage?: () => Promise<CodexUsage>;
  now?: () => number;
}

/** A codex run's trace row (codex-calls.jsonl): no prompt and no answer text, only what happened when. */
export interface CodexTraceRow {
  ts: string;
  run_id?: string;
  /** exec (one codex exec per run) or session (a turn on the app-server thread). */
  mode?: "exec" | "session";
  turn_id?: string;
  /** Session mode: the streamed deltas, the streamed answer's length, and whether the thread went back to its base. */
  deltas?: number;
  answer_chars?: number;
  reverted?: boolean;
  /** Session mode: requests the server made of us (none is expected: no tool is offered). */
  server_requests?: string[];
  label: string;
  model: string;
  effort: string;
  /** 1, or 2 for the run after a stall. */
  attempt: number;
  /** answered | failed (codex said why) | stalled (no event for stall_ms: killed) | aborted (the router's timeout) | error (did not run). */
  outcome: "answered" | "failed" | "stalled" | "aborted" | "error";
  ms: number;
  exit?: number | null;
  signal?: string | null;
  thread_id?: string | null;
  first_event_ms?: number;
  last_event_ms?: number;
  /** The first output token (stderr telemetry codex.turn_ttft), when it came. */
  ttft_ms?: number;
  /** The longest silence (start, events, end). */
  max_gap_ms: number;
  stall_ms: number | null;
  first_token_ms: number | null;
  /** Why a stalled run was killed. */
  stall?: string;
  retries: string[];
  errors: string[];
  warnings: string[];
  events: TraceEvent[];
  events_dropped?: number;
  stderr_tail: string;
  usage?: Json;
  error?: string;
}

/** The trace keeps the first and the last events of a long stream. */
const TRACE_HEAD = 60;
const TRACE_TAIL = 40;

/** Codex's SQLite state and logs for brain calls: ours, kept between calls (a fresh one costs its migrations each time). */
export const CODEX_STATE_DIR = join(tmpdir(), "jev-brain-codex-state");

/**
 * Features off for every brain call (codex-cli 0.160 names; `codex features list`): the ones that add context
 * (hooks, memories, skills search, tool suggestions), tools (shell, exec, image generation and viewing, browser and
 * computer use, goals, sleep, multi-agent), background work (memory consolidation, the shared app-server daemon,
 * shell snapshots) or retries without end.
 */
export const CODEX_DISABLED_FEATURES = [
  "hooks",
  "memories",
  "plugins",
  "apps",
  "multi_agent",
  "shell_tool",
  "unified_exec",
  "image_generation",
  "browser_use",
  "computer_use",
  "goals",
  "view_image",
  "skill_search",
  "tool_suggest",
  "sleep_tool",
  "code_mode_host",
  "shell_snapshot",
  "workspace_dependencies",
  "in_app_browser",
  "daemon_auto_start",
  "unbounded_connection_retries",
] as const;

/** A TOML value for `codex exec -c key=value` (JSON strings are valid TOML basic strings). */
function toml(value: string): string {
  return JSON.stringify(value);
}

/** The -c overrides of a brain call (exported for tests). */
export function codexConfig(opts: { systemFile: string; catalogFile: string; stateDir: string; effort: string; summary: string; serviceTier: string | null }): string[] {
  return [
    `approval_policy=${toml("never")}`,
    `web_search=${toml("disabled")}`,
    // No project docs (AGENTS.md in the working directory or its git root; the directory is empty anyway).
    "project_doc_max_bytes=0",
    "include_permissions_instructions=false",
    "include_apps_instructions=false",
    "include_collaboration_mode_instructions=false",
    "include_environment_context=false",
    "skills.include_instructions=false",
    "skills.bundled.enabled=false",
    "tools.experimental_request_user_input={ enabled = false }",
    "check_for_update_on_startup=false",
    `history.persistence=${toml("none")}`,
    "analytics.enabled=false",
    `model_instructions_file=${toml(opts.systemFile)}`,
    `model_catalog_json=${toml(opts.catalogFile)}`,
    `sqlite_home=${toml(opts.stateDir)}`,
    `log_dir=${toml(join(opts.stateDir, "log"))}`,
    `model_reasoning_effort=${toml(opts.effort)}`,
    `model_reasoning_summary=${toml(opts.summary)}`,
    ...(opts.serviceTier ? [`service_tier=${toml(opts.serviceTier)}`] : []),
  ];
}

/** `codex exec`'s arguments for one call (exported for tests); the prompt goes on stdin ("-"). */
export function codexArgs(opts: { cwd: string; model: string; schemaFile: string | null } & Parameters<typeof codexConfig>[0]): string[] {
  return [
    "exec",
    "--json",
    "--ephemeral",
    "--skip-git-repo-check",
    "--ignore-user-config",
    "--ignore-rules",
    "--cd", opts.cwd,
    "--sandbox", "read-only",
    "--model", opts.model,
    ...(opts.schemaFile ? ["--output-schema", opts.schemaFile] : []),
    ...codexConfig(opts).flatMap((setting) => ["-c", setting]),
    ...CODEX_DISABLED_FEATURES.flatMap((feature) => ["--disable", feature]),
    "-",
  ];
}

/* ---- the answer schema ------------------------------------------------------------------------- */

/** A JSON Schema as OpenAI's strict mode takes it (type lists such as ["string", "null"], null in an enum). */
export type StrictSchema = Record<string, unknown>;

/** Whether a schema can be made strict: every object in it lists its properties (no free-form or map object). */
function strictable(schema: JsonSchema): boolean {
  if (schema.type === "object" || schema.properties) {
    if (!schema.properties || Object.keys(schema.properties).length === 0) return false;
    if (isObject(schema.additionalProperties)) return false;
    return Object.values(schema.properties).every(strictable);
  }
  if (schema.items) return strictable(schema.items);
  return true;
}

/** A schema that also takes null (an optional property under strict mode). */
function nullable(schema: StrictSchema): StrictSchema {
  const type = schema["type"];
  if (typeof type !== "string") return { anyOf: [schema, { type: "null" }] };
  const out: StrictSchema = { ...schema, type: [type, "null"] };
  if (Array.isArray(schema["enum"])) out["enum"] = [...(schema["enum"] as unknown[]), null];
  return out;
}

/**
 * The schema in OpenAI's strict structured-output form (what codex --output-schema sends): every object lists all its
 * properties as required, an optional one taking null instead, and allows no others. null when the schema cannot be
 * strict (a free-form object): the call then goes without --output-schema.
 */
export function strictSchema(schema: JsonSchema): StrictSchema | null {
  if (!strictable(schema)) return null;
  const walk = (node: JsonSchema): StrictSchema => {
    if (node.properties) {
      const required = new Set(node.required ?? []);
      const properties: Record<string, StrictSchema> = {};
      for (const [key, child] of Object.entries(node.properties)) properties[key] = required.has(key) ? walk(child) : nullable(walk(child));
      return { ...node, properties, required: Object.keys(properties), additionalProperties: false };
    }
    if (node.items) return { ...node, items: walk(node.items) };
    return { ...node };
  };
  return walk(schema);
}

/** The answer with the nulls of optional properties dropped (strictSchema's nullable fields, as if left out). */
export function dropNulls(value: unknown, schema: JsonSchema | undefined): unknown {
  if (!schema) return value;
  if (Array.isArray(value)) return schema.items ? value.map((item) => dropNulls(item, schema.items)) : value;
  if (!isObject(value) || !schema.properties) return value;
  const required = new Set(schema.required ?? []);
  const out: Json = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === null && !required.has(key)) continue;
    out[key] = dropNulls(item, schema.properties[key]);
  }
  return out;
}

/* ---- the model catalog ------------------------------------------------------------------------- */

/**
 * The model's catalog entry (from `codex debug models`) as the brain sends it: no JavaScript `exec` tool mode, no
 * multi-agent tools, no experimental tools, no apply_patch tool, no search tool. Everything else (context window,
 * reasoning levels, truncation) is codex's own.
 */
export function brainCatalogEntry(entry: Json): Json {
  return { ...entry, tool_mode: null, multi_agent_version: null, experimental_supported_tools: [], apply_patch_tool_type: null, supports_search_tool: false };
}

/** The entry for a model slug in `codex debug models` output; null when the catalog does not list it. */
export function catalogEntry(stdout: string, model: string): Json | null {
  try {
    const catalog = JSON.parse(stdout) as unknown;
    const models = isObject(catalog) && Array.isArray(catalog["models"]) ? catalog["models"] : [];
    const entry = models.find((item) => isObject(item) && item["slug"] === model);
    return isObject(entry) ? entry : null;
  } catch {
    return null;
  }
}

/** The reasoning efforts a catalog entry supports. */
export function catalogEfforts(entry: Json): string[] {
  const levels = Array.isArray(entry["supported_reasoning_levels"]) ? entry["supported_reasoning_levels"] : [];
  return levels.map((level) => (isObject(level) ? level["effort"] : level)).filter((effort): effort is string => typeof effort === "string");
}

/* ---- the stream -------------------------------------------------------------------------------- */

export interface CodexStream {
  threadId: string | null;
  /** agent_message texts, in order (the last is the answer). */
  messages: string[];
  /** reasoning summaries, in order. */
  reasoning: string[];
  /** turn.completed's usage. */
  usage: Json | null;
  /** turn.failed / error messages (not the retry notices). */
  errors: string[];
  /** codex's own retry notices ("Reconnecting... 1/5 (stream disconnected before completion: …)"): it retried the request. */
  retries: string[];
  /** Items of type "error" (codex's warnings: an ignored setting, ...). */
  warnings: string[];
  /** Items that are neither a message, reasoning nor a warning (a tool the model used). */
  toolItems: Json[];
  completed: boolean;
}

/** codex's notice that it retries the sampling request after a dropped or idle stream (core/src/responses_retry.rs). */
export const RETRY_NOTICE = /^Reconnecting\.\.\.\s*\d+\/\d+/;

/** Codex's --json events (one JSON object per line; anything else is skipped). */
export function parseCodexStream(stdout: string): CodexStream {
  const stream: CodexStream = { threadId: null, messages: [], reasoning: [], usage: null, errors: [], retries: [], warnings: [], toolItems: [], completed: false };
  for (const line of stdout.split("\n")) {
    const text = line.trim();
    if (!text.startsWith("{")) continue;
    let event: Json;
    try {
      const value = JSON.parse(text) as unknown;
      if (!isObject(value)) continue;
      event = value;
    } catch {
      continue;
    }
    const type = event["type"];
    if (type === "thread.started" && typeof event["thread_id"] === "string") stream.threadId = event["thread_id"];
    else if (type === "turn.completed") {
      stream.completed = true;
      if (isObject(event["usage"])) stream.usage = event["usage"];
    } else if (type === "turn.failed") {
      const error = isObject(event["error"]) ? event["error"]["message"] : event["error"];
      if (typeof error === "string" && !stream.errors.includes(error)) stream.errors.push(error);
    } else if (type === "error" && typeof event["message"] === "string") {
      // A retry notice is not a failure: the turn goes on (and may complete).
      if (RETRY_NOTICE.test(event["message"])) stream.retries.push(event["message"]);
      else if (!stream.errors.includes(event["message"])) stream.errors.push(event["message"]);
    } else if (type === "item.completed" && isObject(event["item"])) {
      const item = event["item"];
      const kind = item["type"];
      const itemText = typeof item["text"] === "string" ? item["text"] : "";
      if (kind === "agent_message") stream.messages.push(itemText);
      else if (kind === "reasoning") stream.reasoning.push(itemText);
      else if (kind === "error") stream.warnings.push(typeof item["message"] === "string" ? item["message"] : itemText);
      else stream.toolItems.push(item);
    }
  }
  return stream;
}

/** A warning that says codex did not apply one of our settings: the isolation may not hold. */
const IGNORED_SETTING = /unrecognized configuration setting|is ignored|unknown feature/i;

/* ---- failures ---------------------------------------------------------------------------------- */

/** How long the router rests codex after each kind of failure. A used-up subscription: the rest of the process. */
export const CODEX_REST_MS: Partial<Record<FailureKind, number>> = {
  quota: Number.POSITIVE_INFINITY,
  auth: 30 * 60_000,
  rate_limit: 2 * 60_000,
  overloaded: 60_000,
  unavailable: 30 * 60_000,
};

/**
 * The failure a finished codex run reports, from its stream (turn.failed / error events, a warning that a setting was
 * ignored) and its exit code and stderr; null when it answered. Kinds: quota (the plan's usage limit or credits),
 * rate_limit (429), overloaded (5xx, capacity), auth (not logged in, a refresh that failed), unavailable (codex did
 * not take our settings: an unknown feature flag or an ignored setting), error (anything else, a context overflow
 * included: its message says so, for the brain's v3-prompt retry).
 */
export function codexFailure(stream: CodexStream, run: { code: number | null; signal: NodeJS.Signals | null; stderr: string }): EngineFailure | null {
  const ignored = stream.warnings.find((warning) => IGNORED_SETTING.test(warning));
  const stderrLine = run.stderr
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^WARNING: proceeding, even though we could not create PATH aliases/.test(line))
    .slice(-3)
    .join(" | ");
  if (ignored) return new EngineFailure(`codex did not take a brain isolation setting [unavailable]: ${ignored.slice(0, 300)}`, "unavailable", CODEX_REST_MS.unavailable);
  const answered = stream.completed && stream.messages.length > 0 && stream.errors.length === 0;
  if (answered) return null;
  const text = [...stream.errors, stderrLine].join(" | ");
  let kind: FailureKind = "error";
  if (/unknown feature flag|unknown configuration|error loading config/i.test(text)) kind = "unavailable";
  else if (/usage limit|hit your limit|purchase more credits|out of credits|insufficient credits|quota/i.test(text)) kind = "quota";
  else if (/\b429\b|rate.?limit|too many requests/i.test(text)) kind = "rate_limit";
  else if (/\b50[234]\b|overloaded|server is busy|at capacity/i.test(text)) kind = "overloaded";
  else if (/\b401\b|\b403\b|unauthori[sz]ed|not logged in|log ?in again|codex login|refresh token|authenticat/i.test(text)) kind = "auth";
  const what = stream.completed && stream.messages.length === 0 && stream.errors.length === 0 ? "codex gave no answer" : `codex exited ${run.code ?? run.signal}`;
  return new EngineFailure(`${what} [${kind}]: ${(text || "no error message").slice(0, 400)}`, kind, CODEX_REST_MS[kind] ?? 0);
}

/* ---- the call trace ---------------------------------------------------------------------------- */

/** One event of a call's stream as the trace keeps it: when it came (ms after the start) and what it was; never its text. */
export interface TraceEvent {
  t: number;
  type: string;
  /** item.* events: the item's type (reasoning, agent_message, error, ...). */
  item?: string;
  /** The item's text length (reasoning summaries, the answer): the size, not the words. */
  chars?: number;
  /** error / turn.failed events and error items: codex's message (a retry notice, a failure), truncated. */
  message?: string;
}

/** A line of codex's --json stream as a trace event (null: not an event). */
export function traceEvent(line: string, t: number): TraceEvent | null {
  const text = line.trim();
  if (!text.startsWith("{")) return null;
  let event: Json;
  try {
    const value = JSON.parse(text) as unknown;
    if (!isObject(value)) return null;
    event = value;
  } catch {
    return null;
  }
  const out: TraceEvent = { t, type: String(event["type"] ?? "?") };
  const item = isObject(event["item"]) ? event["item"] : null;
  if (item) {
    out.item = String(item["type"] ?? "?");
    if (typeof item["text"] === "string") out.chars = item["text"].length;
    if (out.item === "error" && typeof item["message"] === "string") out.message = item["message"].slice(0, 300);
  }
  const message = typeof event["message"] === "string" ? event["message"] : isObject(event["error"]) && typeof event["error"]["message"] === "string" ? event["error"]["message"] : null;
  if (message) out.message = message.slice(0, 300);
  return out;
}

/** Text with anything that looks like a credential masked (JWTs, bearer values, token / key / cookie fields). */
export function redact(text: string): string {
  return text
    .replace(/eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]+/g, "<jwt>")
    .replace(/\b(Bearer|Basic)\s+[^\s"',;]+/gi, "$1 <redacted>")
    .replace(/((?:access|refresh|id|session)[_-]?token|api[_-]?key|secret|password|cookie|set-cookie)(["']?\s*[:=]\s*["']?)[^\s"',;}]+/gi, "$1$2<redacted>")
    .replace(/\b(sk|rk|sess)-[A-Za-z0-9_-]{16,}/g, "<key>");
}

/** codex's stderr for the trace: its warning about PATH aliases dropped, credentials masked, the last part kept. */
export function stderrTail(stderr: string, max = 1500): string {
  const lines = stderr.split("\n").filter((line) => line.trim() && !/could not create PATH aliases/.test(line));
  return redact(lines.join("\n")).slice(-max);
}

/** The largest silence in a call: between its start, its events and its end (ms). */
export function maxGap(events: TraceEvent[], endMs: number): number {
  let gap = 0;
  let last = 0;
  for (const event of events) {
    gap = Math.max(gap, event.t - last);
    last = event.t;
  }
  return Math.max(gap, endMs - last);
}

/* ---- isolation guards -------------------------------------------------------------------------- */

/**
 * The instruction files codex reads from its home whatever the flags ($CODEX_HOME/AGENTS.override.md, AGENTS.md),
 * when one is there and not empty: codex would put it in front of every brain question.
 */
export function instructionFiles(home: string): string[] {
  return ["AGENTS.override.md", "AGENTS.md"]
    .map((name) => join(home, name))
    .filter((path) => {
      try {
        return statSync(path).isFile() && readFileSync(path, "utf8").trim().length > 0;
      } catch {
        return false;
      }
    });
}

/**
 * codex's log filter for brain calls: warnings, and its trace-safe telemetry (event names, durations, token counts; the
 * prompt only as its length, auth as header names) on stderr, whose codex.turn_ttft line marks the first output token.
 */
export const CODEX_RUST_LOG = "warn,codex_otel.trace_safe=info";

/** The telemetry line of the turn's first output token. */
export const TTFT_LINE = /event\.name="codex\.turn_ttft"/;

/** The child's environment: the basics, CODEX_HOME, the log filter, and the program's directory first in PATH (node for the npm launcher). */
export function codexEnv(bin: string, home: string): Record<string, string> {
  const base = agentEnv();
  const path = isAbsolute(bin) ? [dirname(bin), base["PATH"] ?? ""].filter(Boolean).join(":") : (base["PATH"] ?? "");
  return { ...base, PATH: path, CODEX_HOME: home, RUST_LOG: CODEX_RUST_LOG };
}

/* ---- the start-up check ------------------------------------------------------------------------ */

/** How long `codex --version` and `codex debug models` may take at start-up. */
export const CODEX_CHECK_TIMEOUT_MS = 30_000;

export type CodexCheck = { ok: true; version: string } | { ok: false; error: string };

async function runQuick(bin: string, args: string[], env: Record<string, string>, timeoutMs: number): Promise<Awaited<ReturnType<typeof runAgent>>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await runAgent(bin, args, { cwd: tmpdir(), env, stdin: "", signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`no answer within ${timeoutMs} ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** `codex debug models` with our state directory and the features that could run anything off. */
function catalogArgs(stateDir: string): string[] {
  return ["debug", "models", "-c", `sqlite_home=${toml(stateDir)}`, "-c", `log_dir=${toml(join(stateDir, "log"))}`, ...CODEX_DISABLED_FEATURES.flatMap((feature) => ["--disable", feature])];
}

/**
 * The start-up check (Brain.preflight): `<bin> --version` answers; the login file exists in codex's home (checked,
 * never read); no AGENTS.md there; the catalog lists the model and the effort. Any other outcome says why.
 */
export async function checkCodex(codex: BrainConfig["codex"], model: string, effort: string, opts: { stateDir?: string; timeoutMs?: number } = {}): Promise<CodexCheck> {
  const env = codexEnv(codex.bin, codex.home);
  const timeoutMs = opts.timeoutMs ?? CODEX_CHECK_TIMEOUT_MS;
  const stateDir = opts.stateDir ?? CODEX_STATE_DIR;
  try {
    const run = await runQuick(codex.bin, ["--version"], env, timeoutMs);
    const version = run.stdout.trim().split("\n")[0]?.trim() ?? "";
    if (run.code !== 0 || !version) return { ok: false, error: `\`${codex.bin} --version\` exited ${run.code ?? run.signal}: ${(run.stderr || run.stdout).trim().slice(0, 200)}` };
    if (!existsSync(join(codex.home, "auth.json"))) return { ok: false, error: `no codex login in ${codex.home} (run \`codex login\` there, or set BRAIN_CODEX_HOME)` };
    const agents = instructionFiles(codex.home);
    if (agents.length > 0) return { ok: false, error: `${agents.join(", ")} would be loaded into every brain call (codex reads it whatever the flags); move it, or point BRAIN_CODEX_HOME at a home without one` };
    mkdirSync(stateDir, { recursive: true });
    const models = await runQuick(codex.bin, catalogArgs(stateDir), env, timeoutMs);
    const entry = catalogEntry(models.stdout, model);
    if (!entry) return { ok: false, error: `codex's model catalog has no ${model} (\`codex debug models\` exited ${models.code ?? models.signal})` };
    const efforts = catalogEfforts(entry);
    if (efforts.length > 0 && !efforts.includes(effort)) return { ok: false, error: `${model} does not take reasoning effort ${effort} (it takes ${efforts.join(", ")})` };
    return { ok: true, version: version.slice(0, 120) };
  } catch (error) {
    return { ok: false, error: (error instanceof Error ? error.message : String(error)).slice(0, 200) };
  }
}

/* ---- session mode ------------------------------------------------------------------------------- */

/** What one question's call needs in either mode. */
interface CodexCall {
  model: string;
  effort: string;
  env: Record<string, string>;
  entry: Json;
  kindSchema: JsonSchema;
  schema: StrictSchema | null;
}

/** `codex app-server`'s arguments in session mode: stdio, and exec mode's isolation overrides and feature switches. */
export function sessionArgs(opts: { catalogFile: string; stateDir: string; effort: string; summary: string; serviceTier: string | null }): string[] {
  const settings = codexConfig({ systemFile: "", ...opts }).filter((setting) => !setting.startsWith("model_instructions_file="));
  return ["app-server", "--listen", "stdio://", ...settings.flatMap((setting) => ["-c", setting]), ...CODEX_DISABLED_FEATURES.flatMap((feature) => ["--disable", feature])];
}

/** codexErrorInfo kinds that mean the stream to the backend broke (restart the session once). */
const TRANSPORT_INFO = ["httpConnectionFailed", "responseStreamConnectionFailed", "responseStreamDisconnected", "responseTooManyFailedAttempts"];

/** A failed or interrupted session turn as exec mode's failures (codexFailure's kinds), and whether its stream broke. */
export function sessionFailure(turn: SessionTurn): { error: EngineFailure; transport: boolean } {
  const info = turn.error?.info;
  const tag = typeof info === "string" ? info : isObject(info) ? Object.keys(info)[0] ?? "" : "";
  const message = [turn.error?.message ?? "", ...turn.errors].filter(Boolean).join(" | ") || `the turn ended ${turn.status}`;
  let kind: FailureKind = "error";
  if (tag === "usageLimitExceeded" || /usage limit|hit your limit|purchase more credits/i.test(message)) kind = "quota";
  else if (tag === "rateLimitExceeded" || /\b429\b|rate.?limit|too many requests/i.test(message)) kind = "rate_limit";
  else if (tag === "serverOverloaded" || tag === "internalServerError" || /overloaded|\b50[234]\b/i.test(message)) kind = "overloaded";
  else if (tag === "unauthorized" || /\b401\b|unauthori[sz]ed|not logged in/i.test(message)) kind = "auth";
  const overflow = tag === "contextWindowExceeded" ? " (context window exceeded)" : "";
  const transport = kind === "error" && (TRANSPORT_INFO.includes(tag) || /stream disconnected|connection (failed|reset|closed)|websocket/i.test(message));
  return { error: new EngineFailure(`codex session turn ${turn.status} [${kind}]: ${message.slice(0, 400)}${overflow}`, kind, CODEX_REST_MS[kind] ?? 0), transport };
}

/** A session turn's trace row (codex-calls.jsonl, as exec mode's: no prompt or answer text). */
function sessionTrace(
  req: BrainRequest,
  c: CodexCall,
  attempt: number,
  r: { outcome: CodexTraceRow["outcome"]; turn?: SessionTurn; threadId?: string | null; ms?: number; error?: string; stderr: string; serverRequests?: string[] },
): CodexTraceRow {
  const turn = r.turn;
  return {
    ts: new Date().toISOString(),
    ...(req.runId ? { run_id: req.runId } : {}),
    mode: "session",
    label: req.label,
    model: c.model,
    effort: c.effort,
    attempt,
    outcome: r.outcome,
    ms: turn?.ms ?? r.ms ?? 0,
    thread_id: turn?.threadId ?? r.threadId ?? null,
    ...(turn?.turnId ? { turn_id: turn.turnId } : {}),
    ...(turn && turn.firstDeltaMs !== null ? { ttft_ms: turn.firstDeltaMs } : {}),
    ...(turn ? { deltas: turn.deltas, answer_chars: turn.answerChars, reverted: turn.reverted } : {}),
    max_gap_ms: turn?.maxGapMs ?? 0,
    stall_ms: null,
    first_token_ms: null,
    ...(turn?.stall ? { stall: turn.stall } : {}),
    retries: turn?.retries ?? [],
    errors: [...(turn?.errors ?? []), ...(turn?.error ? [turn.error.message] : [])],
    warnings: [],
    events: (turn?.events ?? []) as TraceEvent[],
    stderr_tail: stderrTail(r.stderr),
    ...(turn?.usage ? { usage: turn.usage } : {}),
    ...(r.serverRequests && r.serverRequests.length > 0 ? { server_requests: r.serverRequests } : {}),
    ...(r.error ? { error: r.error.slice(0, 300) } : {}),
  };
}

/* ---- the engine -------------------------------------------------------------------------------- */

export class CodexEngine implements BrainEngine {
  readonly name = "codex" as const;
  /** The model's catalog entry per model slug, read once per process (`codex debug models`). */
  private readonly catalogs = new Map<string, Promise<Json>>();

  /** The plan's usage guard (engines/codex-usage.ts): read at process start (Brain.preflight) and before due calls. */
  readonly usage: CodexUsageGuard;

  constructor(private readonly opts: CodexEngineOptions) {
    const { bin, home } = opts.codex;
    const read = opts.readUsage ?? (() => readCodexUsage({ bin, home, env: codexEnv(bin, home), stateDir: join(this.stateDir, "usage") }));
    this.usage = new CodexUsageGuard(opts.codex.usage, read, { note: (message) => this.opts.note?.(message), ...(opts.now ? { now: opts.now } : {}) });
  }

  /** The latest usage reading, for brain.jsonl (router.ts: rows about codex). */
  limits(): UsageNote | null {
    return this.usage.note();
  }

  get model(): string {
    return this.opts.settings.model ?? DEFAULT_CODEX_MODEL;
  }

  /** The model for a question: BRAIN_CODEX_MODEL_<PREFIX>, else BRAIN_CODEX_MODEL. */
  modelFor(label: string): string {
    return this.opts.settings.modelByPrefix[labelPrefix(label)] ?? this.model;
  }

  private get stateDir(): string {
    return this.opts.stateDir ?? CODEX_STATE_DIR;
  }

  /** The brain's catalog entry for a model (cached; a failure is not, so a later call tries again). */
  private catalog(model: string, effort: string, env: Record<string, string>): Promise<Json> {
    const cached = this.catalogs.get(model);
    if (cached) return cached.then((entry) => this.checkEffort(model, entry, effort));
    const loading = (async (): Promise<Json> => {
      let run: Awaited<ReturnType<typeof runAgent>>;
      try {
        run = await runQuick(this.opts.codex.bin, catalogArgs(this.stateDir), env, CODEX_CHECK_TIMEOUT_MS);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new EngineFailure(`codex debug models failed [unavailable]: ${message.slice(0, 200)}`, "unavailable", CODEX_REST_MS.unavailable);
      }
      const entry = catalogEntry(run.stdout, model);
      if (!entry) throw new EngineFailure(`codex's model catalog has no ${model} [unavailable] (\`codex debug models\` exited ${run.code ?? run.signal}: ${run.stderr.trim().slice(-200)})`, "unavailable", CODEX_REST_MS.unavailable);
      return brainCatalogEntry(entry);
    })();
    this.catalogs.set(model, loading);
    loading.catch(() => this.catalogs.delete(model));
    return loading.then((entry) => this.checkEffort(model, entry, effort));
  }

  private checkEffort(model: string, entry: Json, effort: string): Json {
    const efforts = catalogEfforts(entry);
    if (efforts.length > 0 && !efforts.includes(effort)) throw new EngineFailure(`${model} does not take reasoning effort ${effort} [unavailable] (it takes ${efforts.join(", ")})`, "unavailable", CODEX_REST_MS.unavailable);
    return entry;
  }

  /** Calls so far in this process: a stalled run's wall clock is added to the next one's latency. */
  private stalledMs = 0;

  /**
   * One codex run, watched. stdout's --json events and stderr's telemetry (codex.turn_ttft: the first output token,
   * CODEX_RUST_LOG) give its phases: thinking until the first token, then the output. A run is killed as stalled when
   * its first token has not come within first_token_ms (when set), or when, after it, the stream is silent for
   * stall_ms (the stall seen in play: the first token at 18 s, then nothing for 10 minutes on an open WebSocket, no
   * retry by codex). The caller's abort (the router's timeout) kills it too. Every run leaves a trace row
   * (codex-calls.jsonl), the aborted and stalled ones included, with what codex had sent by then.
   */
  private async runOnce(
    bin: string,
    args: string[],
    o: { cwd: string; env: Record<string, string>; stdin: string; signal: AbortSignal | undefined; req: BrainRequest; model: string; effort: string; attempt: number },
  ): Promise<
    | { kind: "done"; run: Awaited<ReturnType<typeof runAgent>>; stream: CodexStream; totalMs: number }
    | { kind: "stalled"; why: string }
    | { kind: "thrown"; error: unknown }
  > {
    const { stallMs, firstTokenMs } = this.opts.codex;
    const started = Date.now();
    const events: TraceEvent[] = [];
    let dropped = 0;
    let ttftMs: number | null = null;
    const controller = new AbortController();
    let stalled: string | null = null;
    let timer: NodeJS.Timeout | undefined;
    const stallAfter = (ms: number, why: () => string): void => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        stalled = why();
        controller.abort();
      }, ms);
    };
    const onOuterAbort = (): void => controller.abort();
    if (o.signal?.aborted) controller.abort();
    o.signal?.addEventListener("abort", onOuterAbort, { once: true });
    if (firstTokenMs) stallAfter(firstTokenMs, () => `no first token within ${Math.round(firstTokenMs / 1000)} s`);
    const silence = (): string => {
      const last = events[events.length - 1];
      return `no stream event for ${Math.round((stallMs ?? 0) / 1000)} s after the first token at ${Math.round((ttftMs ?? 0) / 1000)} s (last: ${last ? `${last.type}${last.item ? `/${last.item}` : ""} at ${Math.round(last.t / 1000)} s` : "none"})`;
    };
    const onStdoutLine = (line: string): void => {
      const event = traceEvent(line, Date.now() - started);
      if (!event) return;
      if (ttftMs !== null && stallMs) stallAfter(stallMs, silence);
      if (events.length < TRACE_HEAD + TRACE_TAIL) events.push(event);
      else {
        events.splice(TRACE_HEAD, 1);
        events.push(event);
        dropped += 1;
      }
    };
    const onStderrLine = (line: string): void => {
      if (ttftMs !== null || !TTFT_LINE.test(line)) return;
      ttftMs = Date.now() - started;
      if (stallMs) stallAfter(stallMs, silence);
      else clearTimeout(timer);
    };
    const trace = (row: Partial<CodexTraceRow> & Pick<CodexTraceRow, "outcome">, stderr: string): void => {
      const ms = Date.now() - started;
      this.writeTrace({
        ts: new Date().toISOString(),
        ...(o.req.runId ? { run_id: o.req.runId } : {}),
        mode: "exec",
        label: o.req.label,
        model: o.model,
        effort: o.effort,
        attempt: o.attempt,
        ms,
        ...(ttftMs !== null ? { ttft_ms: ttftMs } : {}),
        ...(events.length > 0 ? { first_event_ms: events[0]!.t, last_event_ms: events[events.length - 1]!.t } : {}),
        max_gap_ms: maxGap(events, ms),
        stall_ms: stallMs,
        first_token_ms: firstTokenMs,
        retries: [],
        errors: [],
        warnings: [],
        events,
        ...(dropped > 0 ? { events_dropped: dropped } : {}),
        stderr_tail: stderrTail(stderr),
        ...row,
      });
    };
    try {
      const run = await runAgent(bin, args, { cwd: o.cwd, env: o.env, stdin: o.stdin, signal: controller.signal, onStdoutLine, onStderrLine });
      const stream = parseCodexStream(run.stdout);
      const answered = codexFailure(stream, run) === null;
      trace({ outcome: answered ? "answered" : "failed", exit: run.code, signal: run.signal, thread_id: stream.threadId, retries: stream.retries, errors: stream.errors, warnings: stream.warnings, ...(stream.usage ? { usage: stream.usage } : {}) }, run.stderr);
      const totalMs = run.ms + this.stalledMs;
      this.stalledMs = 0;
      return { kind: "done", run, stream, totalMs };
    } catch (error) {
      if (error instanceof AgentAbortedError) {
        const stream = parseCodexStream(error.stdout);
        trace({ outcome: stalled ? "stalled" : "aborted", ...(stalled ? { stall: stalled } : {}), thread_id: stream.threadId, retries: stream.retries, errors: stream.errors, warnings: stream.warnings }, error.stderr);
        if (stalled && !o.signal?.aborted) {
          this.stalledMs += error.ms;
          return { kind: "stalled", why: stalled };
        }
        this.stalledMs = 0;
        return { kind: "thrown", error };
      }
      trace({ outcome: "error", error: (error instanceof Error ? error.message : String(error)).slice(0, 300) }, "");
      this.stalledMs = 0;
      // Not found / not executable: rest it, so the next questions go to the fallback without trying again.
      if (error instanceof AgentStartError) return { kind: "thrown", error: new EngineFailure(`${error.message} [unavailable]`, "unavailable", CODEX_REST_MS.unavailable) };
      return { kind: "thrown", error };
    } finally {
      clearTimeout(timer);
      o.signal?.removeEventListener("abort", onOuterAbort);
    }
  }

  private writeTrace(row: CodexTraceRow): void {
    const file = this.opts.traceFile;
    if (!file) return;
    try {
      mkdirSync(dirname(file), { recursive: true });
      appendFileSync(file, `${JSON.stringify(row)}\n`, "utf8");
    } catch {
      // the trace must never break play
    }
  }

  /** Session mode's app-server and thread (BRAIN_CODEX_MODE=session), made on the first question. */
  private session: CodexSession | null = null;
  /** Why session mode is off for this process (exec mode answers), once it is. */
  private sessionOff: string | null = null;
  /** Session restarts so far (one, then exec mode). */
  private sessionRestarts = 0;

  /** The mode the next question goes out in. */
  get mode(): "exec" | "session" {
    return this.opts.codex.mode === "session" && !this.sessionOff ? "session" : "exec";
  }

  async decide(req: BrainRequest, signal?: AbortSignal): Promise<BrainAnswer> {
    const { bin, home } = this.opts.codex;
    const agents = instructionFiles(home);
    if (agents.length > 0) throw new EngineFailure(`${agents.join(", ")} would be loaded into the brain call (codex reads it whatever the flags) [unavailable]`, "unavailable", CODEX_REST_MS.unavailable);
    // The plan's usage, when a read is due: a window at the stop or credits in use rest codex for the process.
    await this.usage.beforeCall();
    const model = this.modelFor(req.label);
    const effort = req.effort ?? this.opts.settings.effort ?? DEFAULT_CODEX_EFFORT;
    const env = codexEnv(bin, home);
    mkdirSync(this.stateDir, { recursive: true });
    const entry = await this.catalog(model, effort, env);
    const kindSchema = stableSchema(req.spec);
    const schema = strictSchema(kindSchema);
    const call = { model, effort, env, entry, kindSchema, schema };
    return this.mode === "session" ? this.decideSession(req, signal, call) : this.decideExec(req, signal, call);
  }

  /** Session mode off for the rest of the process (said once); exec mode answers from now on. */
  private turnSessionOff(why: string): void {
    if (this.sessionOff) return;
    this.sessionOff = why.slice(0, 300);
    this.opts.note?.(`WARNING: codex session mode is off for the rest of this process (${this.sessionOff}); codex answers in exec mode`);
    const session = this.session;
    this.session = null;
    void session?.close();
  }

  /** The session for this process, made when there is none (its app-server arguments carry the isolation). */
  private sessionFor(c: CodexCall): CodexSession {
    if (this.session) return this.session;
    const { bin, home, summary, serviceTier } = this.opts.codex;
    const catalogDir = join(this.stateDir, "session-catalog");
    mkdirSync(catalogDir, { recursive: true });
    const catalogFile = join(catalogDir, `${process.pid}.json`);
    writeFileSync(catalogFile, JSON.stringify({ models: [c.entry] }), "utf8");
    this.session = new CodexSession({
      bin,
      home,
      args: sessionArgs({ catalogFile, stateDir: this.stateDir, effort: c.effort, summary, serviceTier }),
      env: c.env,
      stateDir: this.stateDir,
      model: c.model,
      serviceTier,
      onRateLimits: (params) => this.usage.observe(params),
      ...(this.opts.sessionTimeouts ? { timeouts: this.opts.sessionTimeouts } : {}),
    });
    return this.session;
  }

  /**
   * Session mode: the question as a turn on the base thread (codex-session.ts), reverted after. A stalled turn is
   * asked once more (BRAIN_CODEX_STALL_RETRIES); a dead server or a broken stream restarts the session once, then
   * exec mode takes over; an isolation problem (config.toml, instruction sources) turns session mode off at once.
   */
  private async decideSession(req: BrainRequest, signal: AbortSignal | undefined, c: CodexCall): Promise<BrainAnswer> {
    const { home, summary, stallMs, firstTokenMs, stallRetries, maxAnswerChars } = this.opts.codex;
    const prompt = promptWithReask(req);
    let attempt = 1;
    let spentMs = 0;
    for (;;) {
      const began = Date.now();
      let turn: SessionTurn;
      const session = this.sessionFor(c);
      try {
        await session.ensureThread(req.system, () => [...configProblems(home).map((problem) => `config.toml: ${problem}`), ...instructionFiles(home)]);
        this.usage.noteCall();
        turn = await session.ask({ prompt, schema: c.schema, effort: c.effort, summary, model: c.model, ...(signal ? { signal } : {}), stallMs, firstTokenMs, maxAnswerChars });
      } catch (error) {
        if (!(error instanceof SessionError || error instanceof RpcError)) throw error;
        spentMs += Date.now() - began;
        this.writeTrace(sessionTrace(req, c, attempt, { outcome: "error", error: error.message, threadId: session.threadId, ms: Date.now() - began, stderr: session.stderrTail() }));
        if (error instanceof SessionError && error.kind === "isolation") {
          this.turnSessionOff(error.message);
          return this.decideExec(req, signal, c, spentMs);
        }
        if (signal?.aborted) throw error;
        if (this.sessionRestarts >= 1) {
          this.turnSessionOff(`the app-server failed again after a restart: ${error.message}`);
          return this.decideExec(req, signal, c, spentMs);
        }
        this.sessionRestarts += 1;
        await this.session?.close();
        this.session = null;
        continue;
      }
      spentMs += turn.ms;
      this.writeTrace(sessionTrace(req, c, attempt, { outcome: turn.status === "completed" ? (turn.text ? "answered" : "failed") : turn.status === "stalled" ? "stalled" : turn.status === "aborted" ? "aborted" : "failed", turn, stderr: session.stderrTail(), serverRequests: session.serverRequests }));
      if (turn.status === "completed" && turn.text) {
        if (!session.hasPath()) void session.refreshPath();
        const usage = turn.usage ?? {};
        return this.answer(req, c, {
          text: turn.text,
          latencyMs: spentMs,
          usage: { input_tokens: usage["inputTokens"], cached_input_tokens: usage["cachedInputTokens"], cache_write_input_tokens: usage["cacheWriteInputTokens"], output_tokens: usage["outputTokens"], reasoning_output_tokens: usage["reasoningOutputTokens"] },
          reasoning: turn.reasoning,
          toolCalls: [],
          native: { mode: "session", thread_id: turn.threadId, turn_id: turn.turnId, retries: turn.retries, runs: attempt, reverted: turn.reverted, schema: c.schema ? "strict" : "none" },
        });
      }
      if (turn.status === "completed") throw new EngineFailure("codex gave no answer [error] (session turn completed without an agent message)", "error");
      if (turn.status === "aborted") throw new Error(`codex session turn aborted after ${turn.ms} ms`);
      if (turn.status === "stalled") {
        if (attempt <= stallRetries && !signal?.aborted) {
          attempt += 1;
          continue;
        }
        throw new EngineFailure(`codex stalled [timeout]: ${turn.stall ?? "no notification"} (${attempt} turn(s), session mode)`, "timeout");
      }
      // failed / interrupted: what codex said, classified as exec mode's failures; a broken stream restarts the session once.
      const failure = sessionFailure(turn);
      if (failure.transport && !signal?.aborted) {
        if (this.sessionRestarts >= 1) {
          this.turnSessionOff(`the stream to the backend failed again after a restart: ${failure.error.message}`);
          return this.decideExec(req, signal, c, spentMs);
        }
        this.sessionRestarts += 1;
        await this.session?.close();
        this.session = null;
        continue;
      }
      throw failure.error;
    }
  }

  /** Exec mode: one `codex exec` per question (and once more after a stall). */
  private async decideExec(req: BrainRequest, signal: AbortSignal | undefined, c: CodexCall, spentBeforeMs = 0): Promise<BrainAnswer> {
    const { bin, summary, serviceTier } = this.opts.codex;
    const { model, effort, env, entry, schema } = c;
    // The files next to an empty working directory (codex is given no tool to read either).
    const work = makeWorkDir("jev-brain-codex-");
    try {
      const cwd = join(work, "cwd");
      mkdirSync(cwd);
      const systemFile = join(work, "system.md");
      writeFileSync(systemFile, req.system, "utf8");
      const catalogFile = join(work, "catalog.json");
      writeFileSync(catalogFile, JSON.stringify({ models: [entry] }), "utf8");
      const schemaFile = schema ? join(work, "schema.json") : null;
      if (schemaFile) writeFileSync(schemaFile, JSON.stringify(schema), "utf8");
      const args = codexArgs({ cwd, model, schemaFile, systemFile, catalogFile, stateDir: this.stateDir, effort, summary, serviceTier });
      const stdin = promptWithReask(req);
      let attempt = 1;
      this.usage.noteCall();
      let outcome = await this.runOnce(bin, args, { cwd, env, stdin, signal, req, model, effort, attempt });
      // A stalled run: killed and asked once more (the router's BRAIN_CODEX_TIMEOUT_MS still caps the whole call).
      while (outcome.kind === "stalled" && attempt <= this.opts.codex.stallRetries && !signal?.aborted) {
        attempt += 1;
        this.usage.noteCall();
        outcome = await this.runOnce(bin, args, { cwd, env, stdin, signal, req, model, effort, attempt });
      }
      if (outcome.kind === "stalled") throw new EngineFailure(`codex stalled [timeout]: ${outcome.why} (${attempt} run(s))`, "timeout");
      if (outcome.kind === "thrown") throw outcome.error;
      const { run, stream } = outcome;
      const failure = codexFailure(stream, run);
      if (failure) throw failure;
      const toolCalls: ToolCallRecord[] = stream.toolItems.map((item) => ({ name: `codex:${String(item["type"] ?? "item")}`, input: item, output: "", ms: 0 }));
      return this.answer(req, c, {
        text: stream.messages[stream.messages.length - 1] ?? "",
        latencyMs: outcome.totalMs + spentBeforeMs,
        usage: stream.usage ?? {},
        reasoning: stream.reasoning,
        toolCalls,
        native: { mode: "exec", thread_id: stream.threadId, warnings: stream.warnings, retries: stream.retries, runs: attempt, schema: schema ? "strict" : "none" },
      });
    } finally {
      removeDir(work);
    }
  }

  /** The BrainAnswer of an answered call (both modes): the text read back, the strict schema's nulls dropped, codex's usage. */
  private answer(req: BrainRequest, c: CodexCall, r: { text: string; latencyMs: number; usage: Json; reasoning: string[]; toolCalls: ToolCallRecord[]; native: Json }): BrainAnswer {
    const parsed = parseAnswerText(r.text);
    const answer = parsed ? (dropNulls(parsed, c.kindSchema) as Json) : null;
    return {
      engine: this.name,
      model: c.model,
      effort: c.effort,
      answer: answer ? normalisePick(req, answer) : null,
      problems: answer ? [] : [`no JSON answer in the reply: ${r.text.slice(0, 120)}`],
      attempts: 1,
      latencyMs: r.latencyMs,
      usage: {
        inputTokens: num(r.usage["input_tokens"]),
        cacheHitTokens: num(r.usage["cached_input_tokens"]),
        ...(num(r.usage["cache_write_input_tokens"]) > 0 ? { cacheWriteTokens: num(r.usage["cache_write_input_tokens"]) } : {}),
        outputTokens: num(r.usage["output_tokens"]),
        reasoningTokens: num(r.usage["reasoning_output_tokens"]),
      },
      toolCalls: r.toolCalls,
      ...(r.reasoning.length > 0 ? { reasoning: r.reasoning.join("\n\n") } : {}),
      raw: r.text,
      native: r.native,
    };
  }

  /** Ends session mode's app-server and deletes its thread (the play process's end; tests). */
  async close(): Promise<void> {
    const session = this.session;
    this.session = null;
    await session?.close();
  }

}

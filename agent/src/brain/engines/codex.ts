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
 *   arrival times, retries, errors, the first-token time, the stderr tail with credentials masked; never the prompt),
 *   the stalled and timed-out runs included. A row names its question (question_id, as brain.jsonl's row) and the
 *   call's time so far (call_ms). A session turn cut before its answer (a runaway, a stall, an abort) keeps the answer
 *   text it had streamed (answer_text); an answered one does not (brain.jsonl has the answer).
 * - Time: a call's latency is exactly its own runs (the stalled ones before the one that answered included); a run
 *   given up on is never billed to a later question (2026-10-03, J4S28FRQKD7G: two stalled runs of a reward question
 *   that fell back were added to the next question's latency, the act-plan's 41 s logged as 316 s).
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

import { DEFAULT_CODEX_EFFORT, DEFAULT_CODEX_MODEL, type BrainConfig, type BrainEngineSettings } from "../../core/config.js";
import type { JsonSchema } from "../tools/types.js";
import { EngineFailure, labelPrefix, withNotes, type FailureKind } from "../router.js";
import { normalisePick, parseAnswerText, promptWithReask } from "../message.js";
import { lenientRoute, stableSchema } from "../specs.js";
import type { AnswerSpec, BrainAnswer, BrainEngine, BrainRequest, ToolCallRecord } from "../types.js";
import { CodexSession, configProblems, RpcError, SessionError, type SessionOptions, type SessionTurn } from "./codex-session.js";
import { CodexUsageGuard, readCodexUsage, refreshCodexAuth, type CodexUsage, type UsageNote } from "./codex-usage.js";
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
  /**
   * The usage read (default: readCodexUsage through a short-lived app-server; tests), codex's token refresh after a read
   * refused on the login (default: refreshCodexAuth, account/read refreshToken), and the guard's clock.
   */
  refreshAuth?: () => Promise<void>;
  readUsage?: () => Promise<CodexUsage>;
  now?: () => number;
}

/**
 * A codex run's trace row (codex-calls.jsonl): no prompt, only what happened when; the answer text only when a session
 * turn was cut before its answer (answer_text).
 */
export interface CodexTraceRow {
  ts: string;
  run_id?: string;
  /** The question's id (BrainRequest.questionId: brain.jsonl's question_id). */
  question_id?: string;
  /** exec (one codex exec per run) or session (a turn on the app-server thread). */
  mode?: "exec" | "session";
  turn_id?: string;
  /**
   * Session mode: the streamed deltas, the streamed answer's length, its longest whitespace run between JSON tokens
   * (BRAIN_CODEX_MAX_ANSWER_BLANKS), and whether the thread went back to its base.
   */
  deltas?: number;
  answer_chars?: number;
  max_blank_run?: number;
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
  /** This run's wall clock. */
  ms: number;
  /**
   * The engine call's time so far: this run and the call's runs before it (a stalled run, session mode's turns before
   * exec mode took over). An answering run's call_ms is the latency the call reports (brain.jsonl's latency_ms, its
   * re-ask apart).
   */
  call_ms?: number;
  /**
   * Session mode, a turn that ended without its answer (a runaway: past BRAIN_CODEX_MAX_ANSWER_CHARS or
   * BRAIN_CODEX_MAX_ANSWER_BLANKS; a stall, an abort, a failure): the answer text it had streamed (at most
   * ANSWER_TEXT_KEEP characters). Answers are not secret.
   */
  answer_text?: string;
  /** Session mode: this cut turn's answer was taken (BRAIN_CODEX_ACCEPT_CUT): its prefix closed into a whole, valid answer. */
  accepted_from_cut?: boolean;
  /** Session mode, BRAIN_CODEX_ACCEPT_CUT on: why this runaway cut's prefix was not taken (asked again instead). */
  cut_rejected?: string;
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

/**
 * The schema codex's answer schema is made from for a question (before codexSchema): the kind's stable schema (specs.ts
 * stableSchema), with
 * - fields "all": every field the kind can have (an optional one the question does not use is answered null);
 *   "used": only the fields the question's own spec has (spec.schema, built from the request: route with a route review
 *   or an act route, cards when an option lists eligible_cards, discard with a discard option, run_plan with a due run
 *   plan). 2026-10-03: all 22 session runaways of L3G5/3JHE/C4F1 were picks that used none of the optional fields (0 in
 *   67 picks with a route): after `reason` the strict schema still wanted three nulls, and codex wrote whitespace.
 * - reasonLast: `reason` moved to the end (codex writes the fields in this order).
 * DeepSeek's and Claude's schemas stay as they are.
 */
export function codexKindSchema(spec: AnswerSpec, opts: { fields: "all" | "used"; reasonLast: boolean }): JsonSchema {
  const schema = stableSchema(spec);
  const props = schema.properties;
  if (!props) return schema;
  const all = Object.keys(props);
  const own = spec.schema.properties ? new Set(Object.keys(spec.schema.properties)) : null;
  let keys = opts.fields === "used" && own ? all.filter((key) => own.has(key)) : all;
  if (opts.reasonLast && keys.includes("reason")) keys = [...keys.filter((key) => key !== "reason"), "reason"];
  if (keys.length === all.length && keys.every((key, i) => key === all[i])) return schema;
  return { ...schema, properties: Object.fromEntries(keys.map((key) => [key, props[key]!])), ...(schema.required ? { required: schema.required.filter((key) => keys.includes(key)) } : {}) };
}

/**
 * The JSON object a cut answer's streamed prefix closes into: its top-level members up to the last complete one, closed
 * with "}" (a member cut half-way is left out); null when no prefix closes into an object. A runaway cut (whitespace
 * after a complete reason) closes into the whole answer it had written.
 */
export function closeCutAnswer(text: string): { json: Record<string, unknown>; text: string } | null {
  const start = text.indexOf("{");
  if (start < 0 || text.slice(0, start).trim()) return null;
  // Where a top-level member may end: before each top-level comma, at the object's own end, at the text's end.
  const ends = new Set<number>([text.length]);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") depth += 1;
    else if (ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) {
        ends.add(i + 1);
        break;
      }
    } else if (ch === "," && depth === 1) ends.add(i);
  }
  for (const end of [...ends].sort((x, y) => y - x)) {
    const body = text.slice(start, end).trimEnd();
    const open = body.endsWith(",") ? body.slice(0, -1).trimEnd() : body;
    for (const candidate of [body, `${open}}`]) {
      try {
        const value = JSON.parse(candidate) as unknown;
        if (isObject(value)) return { json: value, text: candidate };
      } catch {
        // not an object yet: close it, or try an earlier member boundary
      }
    }
  }
  return null;
}

/**
 * The answer schema codex gets: the kind's stable schema made strict, with two changes against runaway answers
 * (2026-10-03, RNTVAT76BPV0 / J4S28FRQKD7G: 7 of 27 live calls at high stalled; the replayed ones streamed route_reason
 * as an endless chain of single characters, 「稳。好。走。保。…」, after a short phrase):
 * - routeReason "drop" (BRAIN_CODEX_ROUTE_REASON, default): no route_reason field (it is only logged: the route review's
 *   reason in the decision log); "keep": the field stays, capped at ROUTE_REASON_CHARS.
 * - maxFieldChars (BRAIN_CODEX_MAX_FIELD_CHARS, default 600): every free-text string (no enum) gets that maxLength,
 *   which OpenAI's strict mode enforces while it samples: a runaway in any text field ends there. Logged answers' longest
 *   single field is ~180 characters; the act route ~90.
 * DeepSeek's and Claude's schemas and every prompt stay as they are.
 */
export function codexSchema(kindSchema: JsonSchema, opts: { routeReason: "drop" | "keep"; maxFieldChars: number | null; routePattern?: boolean }): StrictSchema | null {
  let schema = kindSchema;
  if (opts.routeReason === "drop" && schema.properties?.["route_reason"]) {
    const { route_reason: _dropped, ...properties } = schema.properties;
    schema = { ...schema, properties, required: (schema.required ?? []).filter((key) => key !== "route_reason") };
  }
  const strict = strictSchema(schema);
  if (!strict || (!opts.maxFieldChars && !opts.routePattern)) return strict;
  const cap = opts.maxFieldChars;
  const walk = (node: StrictSchema, key: string | null): StrictSchema => {
    const out: StrictSchema = { ...node };
    const type = node["type"];
    const types = Array.isArray(type) ? type : [type];
    if (cap && types.includes("string") && !Array.isArray(node["enum"])) out["maxLength"] = key === "route_reason" ? Math.min(cap, ROUTE_REASON_CHARS) : cap;
    if (opts.routePattern && key === "route" && types.includes("string")) out["pattern"] = ROUTE_PATTERN;
    if (isObject(node["properties"])) out["properties"] = Object.fromEntries(Object.entries(node["properties"]).map(([k, v]) => [k, walk(v as StrictSchema, k)]));
    if (isObject(node["items"])) out["items"] = walk(node["items"] as StrictSchema, null);
    if (Array.isArray(node["anyOf"])) out["anyOf"] = node["anyOf"].map((v) => (isObject(v) ? walk(v as StrictSchema, key) : v));
    return out;
  };
  return walk(strict, null);
}

/**
 * The route field's pattern (BRAIN_CODEX_ROUTE_PATTERN): "keep" or node ids separated by single spaces, nothing else (no
 * route_reason or second thoughts written into it, as V4.6 at xhigh did).
 */
export const ROUTE_PATTERN = "^(keep|r[0-9]+c[0-9]+( r[0-9]+c[0-9]+)*)$";

/** route_reason's cap when it is kept (BRAIN_CODEX_ROUTE_REASON=keep): the prompt asks for 15 characters. */
export const ROUTE_REASON_CHARS = 60;

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

/**
 * The child's environment: the basics, CODEX_HOME, the log filter, and the program's directory first in PATH (node for the
 * npm launcher). `base` is the environment to start from (the brain: agentEnv(); the offline learner: its own key-free env).
 */
export function codexEnv(bin: string, home: string, base: Record<string, string> = agentEnv()): Record<string, string> {
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
export async function checkCodex(codex: Pick<BrainConfig["codex"], "bin" | "home">, model: string, effort: string, opts: { stateDir?: string; timeoutMs?: number } = {}): Promise<CodexCheck> {
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
  r: { outcome: CodexTraceRow["outcome"]; turn?: SessionTurn; threadId?: string | null; ms?: number; callMs: number; error?: string; stderr: string; serverRequests?: string[] },
): CodexTraceRow {
  const turn = r.turn;
  const cut = turn && r.outcome !== "answered" && turn.answerText ? turn.answerText : "";
  return {
    ts: new Date().toISOString(),
    ...(req.runId ? { run_id: req.runId } : {}),
    ...(req.questionId ? { question_id: req.questionId } : {}),
    mode: "session",
    label: req.label,
    model: c.model,
    effort: c.effort,
    attempt,
    outcome: r.outcome,
    ms: turn?.ms ?? r.ms ?? 0,
    call_ms: r.callMs,
    ...(cut ? { answer_text: cut } : {}),
    thread_id: turn?.threadId ?? r.threadId ?? null,
    ...(turn?.turnId ? { turn_id: turn.turnId } : {}),
    ...(turn && turn.firstDeltaMs !== null ? { ttft_ms: turn.firstDeltaMs } : {}),
    ...(turn ? { deltas: turn.deltas, answer_chars: turn.answerChars, max_blank_run: turn.maxBlankRun, reverted: turn.reverted } : {}),
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
    const refreshAuth = opts.refreshAuth ?? (() => refreshCodexAuth({ bin, home, env: codexEnv(bin, home), stateDir: join(this.stateDir, "usage") }));
    this.usage = new CodexUsageGuard(opts.codex.usage, read, { note: (message) => this.opts.note?.(message), refreshAuth, ...(opts.now ? { now: opts.now } : {}) });
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

  /**
   * One codex run, watched. stdout's --json events and stderr's telemetry (codex.turn_ttft: the first output token,
   * CODEX_RUST_LOG) give its phases: thinking until the first token, then the output. A run is killed as stalled when
   * its first token has not come within first_token_ms (when set), or when, after it, the stream is silent for
   * stall_ms (the stall seen in play: the first token at 18 s, then nothing for 10 minutes on an open WebSocket, no
   * retry by codex). The caller's abort (the router's timeout) kills it too. Every run leaves a trace row
   * (codex-calls.jsonl), the aborted and stalled ones included, with what codex had sent by then. `ms` is the run's own
   * wall clock (as its trace row's); `spentMs` what the call spent before it (its call_ms adds them).
   */
  private async runOnce(
    bin: string,
    args: string[],
    o: { cwd: string; env: Record<string, string>; stdin: string; signal: AbortSignal | undefined; req: BrainRequest; model: string; effort: string; attempt: number; spentMs: number },
  ): Promise<
    | { kind: "done"; run: Awaited<ReturnType<typeof runAgent>>; stream: CodexStream; ms: number }
    | { kind: "stalled"; why: string; ms: number }
    | { kind: "thrown"; error: unknown; ms: number }
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
    let ms = 0;
    const trace = (row: Partial<CodexTraceRow> & Pick<CodexTraceRow, "outcome">, stderr: string): void => {
      ms = Date.now() - started;
      this.writeTrace({
        ts: new Date().toISOString(),
        ...(o.req.runId ? { run_id: o.req.runId } : {}),
        ...(o.req.questionId ? { question_id: o.req.questionId } : {}),
        mode: "exec",
        label: o.req.label,
        model: o.model,
        effort: o.effort,
        attempt: o.attempt,
        ms,
        call_ms: o.spentMs + ms,
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
      return { kind: "done", run, stream, ms };
    } catch (error) {
      if (error instanceof AgentAbortedError) {
        const stream = parseCodexStream(error.stdout);
        trace({ outcome: stalled ? "stalled" : "aborted", ...(stalled ? { stall: stalled } : {}), thread_id: stream.threadId, retries: stream.retries, errors: stream.errors, warnings: stream.warnings }, error.stderr);
        if (stalled && !o.signal?.aborted) return { kind: "stalled", why: stalled, ms };
        return { kind: "thrown", error, ms };
      }
      trace({ outcome: "error", error: (error instanceof Error ? error.message : String(error)).slice(0, 300) }, "");
      // Not found / not executable: rest it, so the next questions go to the fallback without trying again.
      if (error instanceof AgentStartError) return { kind: "thrown", error: new EngineFailure(`${error.message} [unavailable]`, "unavailable", CODEX_REST_MS.unavailable), ms };
      return { kind: "thrown", error, ms };
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
    const kindSchema = codexKindSchema(req.spec, { fields: this.opts.codex.schemaFields, reasonLast: this.opts.codex.reasonLast });
    const schema = codexSchema(kindSchema, { routeReason: this.opts.codex.routeReason, maxFieldChars: this.opts.codex.maxFieldChars, routePattern: this.opts.codex.routePattern });
    const call = { model, effort, env, entry, kindSchema, schema };
    // The usage guard's changes since the last row (codex back after reads failed, a refreshed token): on this question's row.
    const usageNotes = this.usage.takeNotes();
    try {
      const answer = await (this.mode === "session" ? this.decideSession(req, signal, call) : this.decideExec(req, signal, call));
      return usageNotes.length > 0 ? { ...answer, notes: [...usageNotes, ...(answer.notes ?? [])] } : answer;
    } catch (error) {
      throw withNotes(error, usageNotes);
    }
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
    const { home, summary, stallMs, firstTokenMs, stallRetries, maxAnswerChars, maxAnswerBlanks, acceptCut } = this.opts.codex;
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
        turn = await session.ask({ prompt, schema: c.schema, effort: c.effort, summary, model: c.model, ...(signal ? { signal } : {}), stallMs, firstTokenMs, maxAnswerChars, maxAnswerBlanks });
      } catch (error) {
        if (!(error instanceof SessionError || error instanceof RpcError)) throw error;
        const ms = Date.now() - began;
        spentMs += ms;
        this.writeTrace(sessionTrace(req, c, attempt, { outcome: "error", error: error.message, threadId: session.threadId, ms, callMs: spentMs, stderr: session.stderrTail() }));
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
      // A runaway cut whose prefix is already a whole answer (BRAIN_CODEX_ACCEPT_CUT): taken instead of asking again.
      const judged = turn.status === "stalled" && acceptCut && turn.stall?.endsWith("(runaway)") ? this.fromCut(req, c, turn.answerText) : null;
      const cut = judged && "text" in judged ? judged.text : null;
      this.writeTrace({ ...sessionTrace(req, c, attempt, { outcome: turn.status === "completed" ? (turn.text ? "answered" : "failed") : turn.status === "stalled" ? "stalled" : turn.status === "aborted" ? "aborted" : "failed", turn, callMs: spentMs, stderr: session.stderrTail(), serverRequests: session.serverRequests }), ...(cut ? { accepted_from_cut: true } : judged && "rejected" in judged ? { cut_rejected: judged.rejected } : {}) });
      if (cut) {
        const usage = turn.usage ?? {};
        return this.answer(req, c, {
          text: cut,
          latencyMs: spentMs,
          usage: { input_tokens: usage["inputTokens"], cached_input_tokens: usage["cachedInputTokens"], cache_write_input_tokens: usage["cacheWriteInputTokens"], output_tokens: usage["outputTokens"], reasoning_output_tokens: usage["reasoningOutputTokens"] },
          reasoning: turn.reasoning,
          toolCalls: [],
          native: { mode: "session", thread_id: turn.threadId, turn_id: turn.turnId, retries: turn.retries, runs: attempt, reverted: turn.reverted, schema: c.schema ? "strict" : "none", accepted_from_cut: turn.stall ?? "" },
          notes: [`accepted from a cut answer (${turn.stall ?? "runaway"}): its streamed prefix closed into a whole answer`],
        });
      }
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

  /**
   * Exec mode: one `codex exec` per question (and once more after a stall). The latency is this call's own runs (and
   * what session mode spent on it before handing it over: spentBeforeMs), nothing else.
   */
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
      let spentMs = spentBeforeMs;
      this.usage.noteCall();
      let outcome = await this.runOnce(bin, args, { cwd, env, stdin, signal, req, model, effort, attempt, spentMs });
      spentMs += outcome.ms;
      // A stalled run: killed and asked once more (the router's BRAIN_CODEX_TIMEOUT_MS still caps the whole call).
      while (outcome.kind === "stalled" && attempt <= this.opts.codex.stallRetries && !signal?.aborted) {
        attempt += 1;
        this.usage.noteCall();
        outcome = await this.runOnce(bin, args, { cwd, env, stdin, signal, req, model, effort, attempt, spentMs });
        spentMs += outcome.ms;
      }
      if (outcome.kind === "stalled") throw new EngineFailure(`codex stalled [timeout]: ${outcome.why} (${attempt} run(s))`, "timeout");
      if (outcome.kind === "thrown") throw outcome.error;
      const { run, stream } = outcome;
      const failure = codexFailure(stream, run);
      if (failure) throw failure;
      const toolCalls: ToolCallRecord[] = stream.toolItems.map((item) => ({ name: `codex:${String(item["type"] ?? "item")}`, input: item, output: "", ms: 0 }));
      return this.answer(req, c, {
        text: stream.messages[stream.messages.length - 1] ?? "",
        latencyMs: spentMs,
        usage: stream.usage ?? {},
        reasoning: stream.reasoning,
        toolCalls,
        native: { mode: "exec", thread_id: stream.threadId, warnings: stream.warnings, retries: stream.retries, runs: attempt, schema: schema ? "strict" : "none" },
      });
    } finally {
      removeDir(work);
    }
  }

  /**
   * A runaway cut's answer (BRAIN_CODEX_ACCEPT_CUT): its streamed prefix closed into an object (closeCutAnswer) with
   * every field an answer of its kind must have (the kind schema's required: a pick's choice and reason) and passing the
   * question's checks (spec.validate, and softValidate: an act route it lacks). A field the question needs only for some
   * options (cards for an option with eligible_cards, discard for a ":discard" option) is the checks' to ask for, as for
   * any answer; the per-question spec lists it as required whenever an option could need it (2026-10-03, ET3V5177HXSY
   * F42 rest/plan: a whole "o1:c21" answer was refused for lacking "discard", which only o0:discard takes). Otherwise
   * why not (the trace row's cut_rejected): the cut is a stall as before (asked again, then the fallback).
   */
  private fromCut(req: BrainRequest, c: CodexCall, streamed: string): { text: string } | { rejected: string } {
    const closed = streamed ? closeCutAnswer(streamed) : null;
    if (!closed) return { rejected: "the streamed prefix closes into no JSON object" };
    const answer = normalisePick(req, dropNulls(closed.json, c.kindSchema) as Json);
    const missing = (c.kindSchema.required ?? []).filter((key) => answer[key] === undefined || answer[key] === null);
    if (missing.length > 0) return { rejected: `missing ${missing.join(", ")}` };
    const problems = [...req.spec.validate(answer), ...(req.spec.softValidate?.(answer) ?? [])];
    if (problems.length > 0) return { rejected: problems.join("; ").slice(0, 200) };
    return { text: closed.text };
  }

  /** The BrainAnswer of an answered call (both modes): the text read back, the strict schema's nulls dropped, codex's usage. */
  private answer(req: BrainRequest, c: CodexCall, r: { text: string; latencyMs: number; usage: Json; reasoning: string[]; toolCalls: ToolCallRecord[]; native: Json; notes?: string[] }): BrainAnswer {
    const parsed = parseAnswerText(r.text);
    let answer = parsed ? normalisePick(req, dropNulls(parsed, c.kindSchema) as Json) : null;
    // A route of "keep" plus words, or of node ids plus words, read as the route it names (specs.ts lenientRoute).
    const notes = [...(r.notes ?? [])];
    const route = answer && req.spec.kind === "pick" && "route" in answer ? lenientRoute(req.payload, answer["route"]) : null;
    if (answer && route) {
      answer = { ...answer, route: route.route };
      notes.push(route.why);
    }
    return {
      engine: this.name,
      model: c.model,
      effort: c.effort,
      answer,
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
      ...(notes.length ? { notes } : {}),
    };
  }

  /** Ends session mode's app-server and deletes its thread (the play process's end; tests). */
  async close(): Promise<void> {
    const session = this.session;
    this.session = null;
    await session?.close();
  }

}

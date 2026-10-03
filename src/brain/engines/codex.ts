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
 * - Environment: only the basics a process needs (engines/process.ts agentEnv), CODEX_HOME for the login, and the
 *   program's own directory first in PATH (the npm launcher is `#!/usr/bin/env node`).
 * - Usage guard (engines/codex-usage.ts): the plan's windows and credits are read at process start (Brain.preflight)
 *   and before a call every BRAIN_CODEX_USAGE_EVERY_CALLS calls or BRAIN_CODEX_USAGE_EVERY_MIN minutes; a window at
 *   BRAIN_CODEX_USAGE_STOP_PCT or credits in use rest codex for the rest of the process (the used-up-plan path), so a
 *   call never goes out past the stop. Each brain.jsonl row about codex carries the latest reading (`limits`).
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";

import { DEFAULT_CODEX_EFFORT, DEFAULT_CODEX_MODEL, type BrainConfig, type BrainEngineSettings } from "../../config.js";
import type { JsonSchema } from "../../tools/types.js";
import { EngineFailure, labelPrefix, type FailureKind } from "../router.js";
import { normalisePick, parseAnswerText, promptWithReask } from "../message.js";
import { stableSchema } from "../specs.js";
import type { BrainAnswer, BrainEngine, BrainRequest, ToolCallRecord } from "../types.js";
import { CodexUsageGuard, readCodexUsage, type CodexUsage, type UsageNote } from "./codex-usage.js";
import { AgentStartError, agentEnv, makeWorkDir, removeDir, runAgent } from "./process.js";

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

export interface CodexEngineOptions {
  settings: BrainEngineSettings;
  codex: BrainConfig["codex"];
  /** Where codex keeps its SQLite state and logs (default: CODEX_STATE_DIR in the temp dir). */
  stateDir?: string;
  /** Where the engine says what the console should see (a usage read that failed); the router's note. */
  note?: (message: string) => void;
  /** The usage read (default: readCodexUsage through a short-lived app-server; tests), and the guard's clock. */
  readUsage?: () => Promise<CodexUsage>;
  now?: () => number;
}

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
  /** turn.failed / error messages. */
  errors: string[];
  /** Items of type "error" (codex's warnings: an ignored setting, ...). */
  warnings: string[];
  /** Items that are neither a message, reasoning nor a warning (a tool the model used). */
  toolItems: Json[];
  completed: boolean;
}

/** Codex's --json events (one JSON object per line; anything else is skipped). */
export function parseCodexStream(stdout: string): CodexStream {
  const stream: CodexStream = { threadId: null, messages: [], reasoning: [], usage: null, errors: [], warnings: [], toolItems: [], completed: false };
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
      if (!stream.errors.includes(event["message"])) stream.errors.push(event["message"]);
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

/** The child's environment: the basics, CODEX_HOME, and the program's directory first in PATH (node for the npm launcher). */
export function codexEnv(bin: string, home: string): Record<string, string> {
  const base = agentEnv();
  const path = isAbsolute(bin) ? [dirname(bin), base["PATH"] ?? ""].filter(Boolean).join(":") : (base["PATH"] ?? "");
  return { ...base, PATH: path, CODEX_HOME: home };
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

  async decide(req: BrainRequest, signal?: AbortSignal): Promise<BrainAnswer> {
    const { bin, home, summary, serviceTier } = this.opts.codex;
    const agents = instructionFiles(home);
    if (agents.length > 0) throw new EngineFailure(`${agents.join(", ")} would be loaded into the brain call (codex reads it whatever the flags) [unavailable]`, "unavailable", CODEX_REST_MS.unavailable);
    // The plan's usage, when a read is due: a window at the stop or credits in use rest codex for the process.
    await this.usage.beforeCall();
    const model = this.modelFor(req.label);
    const effort = req.effort ?? this.opts.settings.effort ?? DEFAULT_CODEX_EFFORT;
    const env = codexEnv(bin, home);
    mkdirSync(this.stateDir, { recursive: true });
    const entry = await this.catalog(model, effort, env);
    // The files next to an empty working directory (codex is given no tool to read either).
    const work = makeWorkDir("jev-brain-codex-");
    try {
      const cwd = join(work, "cwd");
      mkdirSync(cwd);
      const systemFile = join(work, "system.md");
      writeFileSync(systemFile, req.system, "utf8");
      const catalogFile = join(work, "catalog.json");
      writeFileSync(catalogFile, JSON.stringify({ models: [entry] }), "utf8");
      const kindSchema = stableSchema(req.spec);
      const schema = strictSchema(kindSchema);
      const schemaFile = schema ? join(work, "schema.json") : null;
      if (schemaFile) writeFileSync(schemaFile, JSON.stringify(schema), "utf8");
      const args = codexArgs({ cwd, model, schemaFile, systemFile, catalogFile, stateDir: this.stateDir, effort, summary, serviceTier });
      let run: Awaited<ReturnType<typeof runAgent>>;
      this.usage.noteCall();
      try {
        run = await runAgent(bin, args, { cwd, env, stdin: promptWithReask(req), ...(signal ? { signal } : {}) });
      } catch (error) {
        // Not found / not executable: rest it, so the next questions go to the fallback without trying again.
        if (error instanceof AgentStartError) throw new EngineFailure(`${error.message} [unavailable]`, "unavailable", CODEX_REST_MS.unavailable);
        throw error;
      }
      const stream = parseCodexStream(run.stdout);
      const failure = codexFailure(stream, run);
      if (failure) throw failure;
      const text = stream.messages[stream.messages.length - 1] ?? "";
      const usage = stream.usage ?? {};
      const parsed = parseAnswerText(text);
      const answer = parsed ? (dropNulls(parsed, kindSchema) as Json) : null;
      const toolCalls: ToolCallRecord[] = stream.toolItems.map((item) => ({ name: `codex:${String(item["type"] ?? "item")}`, input: item, output: "", ms: 0 }));
      return {
        engine: this.name,
        model,
        effort,
        answer: answer ? normalisePick(req, answer) : null,
        problems: answer ? [] : [`no JSON answer in the reply: ${text.slice(0, 120)}`],
        attempts: 1,
        latencyMs: run.ms,
        usage: {
          inputTokens: num(usage["input_tokens"]),
          cacheHitTokens: num(usage["cached_input_tokens"]),
          ...(num(usage["cache_write_input_tokens"]) > 0 ? { cacheWriteTokens: num(usage["cache_write_input_tokens"]) } : {}),
          outputTokens: num(usage["output_tokens"]),
          reasoningTokens: num(usage["reasoning_output_tokens"]),
        },
        toolCalls,
        ...(stream.reasoning.length > 0 ? { reasoning: stream.reasoning.join("\n\n") } : {}),
        raw: text,
        native: { thread_id: stream.threadId, warnings: stream.warnings, schema: schema ? "strict" : "none" },
      };
    } finally {
      removeDir(work);
    }
  }
}

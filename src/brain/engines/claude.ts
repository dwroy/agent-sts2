/**
 * Claude as a brain engine: headless Claude Code (`claude -p`) under this machine's Claude login (the
 * subscription; Dai 2026-09-29), one process per call. Mainly for the offline learner later; also a game engine.
 *
 * - The answer: --json-schema; the CLI returns it as `structured_output` in its --output-format json result,
 *   with usage and total_cost_usd (under the login: the API-price equivalent). The CLI turns the schema into a
 *   tool definition that precedes the system prompt in the cache prefix, so by default it is the same for every
 *   question of a kind (specs.ts stableSchema; BRAIN_CLAUDE_SCHEMA=question sends the question's own) and the
 *   router's validation checks the question's keys.
 * - The context is ours only: --system-prompt-file replaces Claude Code's prompt; --setting-sources "" loads no
 *   user/project/local settings, so no hooks (the global SessionStart memory hook), no user plugins, no
 *   CLAUDE.md; the working directory is an empty temp dir, created for the call and removed after it, at the
 *   same path for every call of the process (the path is in the model's context: a new one per call would
 *   defeat the prompt cache).
 *   Measured 2026-09-29 (experiments/brain-replay/claude-isolation.md): what remains is Claude Code's own
 *   identity line, an environment note (temp cwd, OS), the model name, the date and the login's e-mail.
 *   --safe-mode is not used: it drops --mcp-config servers too. --bare is not used: it ignores the login.
 * - Tools: --tools "" removes every built-in tool (Read, Bash, ...); --strict-mcp-config with --mcp-config names
 *   only our stdio MCP server (src/tools/mcp-server.ts, started by Claude Code with the question's context and a
 *   state file), whose tools are pre-approved with --allowedTools mcp__gkb under --permission-mode dontAsk
 *   (anything else is denied, never prompted). The server writes each call to a record file read back here.
 * - Model: BRAIN_CLAUDE_MODEL (an alias such as opus / sonnet, or a full id), BRAIN_CLAUDE_MODEL_<PREFIX> for one
 *   question kind; the model that answered is read back from the result (modelUsage).
 * - Failures (claudeFailure): a used-up subscription quota, a rate limit, an overload or a lost login come back
 *   as an EngineFailure with a rest period, so the router answers from BRAIN_FALLBACK at once and keeps doing
 *   so for a while; the router's timeout kills the process (by PID). Nothing here waits on a human.
 * - Environment: only the basics a process needs (engines/process.ts agentEnv): none of our keys.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { BrainConfig, BrainEngineSettings } from "../../config.js";
import { claudeMcpConfig, MCP_SERVER_NAME } from "../../tools/mcp-launch.js";
import { EngineFailure, labelPrefix, type FailureKind } from "../router.js";
import { normalisePick, parseAnswerText, promptWithReask, TOOLS_NOTE } from "../message.js";
import { stableSchema } from "../specs.js";
import type { BrainAnswer, BrainEngine, BrainRequest, ToolCallRecord } from "../types.js";
import { agentEnv, runAgent, stableWorkDir } from "./process.js";

type Json = Record<string, unknown>;

export interface ClaudeEngineOptions {
  settings: BrainEngineSettings;
  claude: BrainConfig["claude"];
  /** A module whose buildTools(ctx) the tool server uses instead of the registry's (tests, smoke runs). */
  toolsModule?: string;
}

/** The CLI's arguments for one call (exported for tests). */
export function claudeArgs(req: BrainRequest, opts: { model: string; effort: string | null; systemFile: string; mcpConfig: string | null; maxBudgetUsd: number | null; schema?: "kind" | "question" }): string[] {
  return [
    "-p",
    "--output-format", "json",
    "--json-schema", JSON.stringify(opts.schema === "question" ? req.spec.schema : stableSchema(req.spec)),
    "--system-prompt-file", opts.systemFile,
    "--tools", "",
    "--strict-mcp-config",
    ...(opts.mcpConfig ? ["--mcp-config", opts.mcpConfig, "--allowedTools", `mcp__${MCP_SERVER_NAME}`] : []),
    "--permission-mode", "dontAsk",
    "--model", opts.model,
    ...(opts.effort ? ["--effort", opts.effort] : []),
    "--no-session-persistence",
    "--setting-sources", "",
    ...(opts.maxBudgetUsd ? ["--max-budget-usd", String(opts.maxBudgetUsd)] : []),
  ];
}

/** The CLI's result object out of its stdout (--output-format json: one object; stream lines tolerated). */
export function claudeResult(stdout: string): Json | null {
  const lines = stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const value = JSON.parse(lines[i]!) as unknown;
      if (value && typeof value === "object" && !Array.isArray(value) && (value as Json)["type"] === "result") return value as Json;
    } catch {
      // not a JSON line
    }
  }
  return null;
}

/** The tool calls the server recorded (one JSON row per call). */
function readRecords(file: string): ToolCallRecord[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as ToolCallRecord];
      } catch {
        return [];
      }
    });
}

const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

/** How long the router rests Claude after each kind of failure. */
export const CLAUDE_REST_MS: Partial<Record<FailureKind, number>> = {
  quota: 30 * 60_000,
  auth: 30 * 60_000,
  rate_limit: 2 * 60_000,
  overloaded: 60_000,
};

/**
 * The failure a finished CLI run reports, from its result (is_error, subtype, api_error_status, the result text)
 * and its stderr / exit code; null when it answered. Kinds: quota (the subscription's 5-hour or weekly limit, or
 * credit), rate_limit (429), overloaded (529), auth (not logged in), error (anything else).
 */
export function claudeFailure(result: Json | null, run: { code: number | null; signal: NodeJS.Signals | null; stderr: string; stdout: string }): EngineFailure | null {
  const failed = !result || result["is_error"] === true || (result["subtype"] !== undefined && result["subtype"] !== "success");
  if (!failed) return null;
  const text = [typeof result?.["result"] === "string" ? result["result"] : "", String(result?.["terminal_reason"] ?? ""), run.stderr, result ? "" : run.stdout].join(" ").slice(0, 2000);
  const status = num(result?.["api_error_status"]);
  let kind: FailureKind = "error";
  if (/usage limit|(?<!rate )limit reached|hit your limit|out of (extra )?usage|quota|credit balance|weekly limit|5-hour limit/i.test(text)) kind = "quota";
  else if (status === 429 || /rate.?limit|too many requests/i.test(text)) kind = "rate_limit";
  else if (status === 529 || /overloaded/i.test(text)) kind = "overloaded";
  else if (status === 401 || status === 403 || /not logged in|please run \/login|oauth token|authenticat|invalid api key/i.test(text)) kind = "auth";
  const what = !result ? `claude exited ${run.code ?? run.signal} without a result` : `claude ${String(result["subtype"] ?? "error")}${status ? ` (HTTP ${status})` : ""}`;
  const detail = (typeof result?.["result"] === "string" && result["result"]) || run.stderr || run.stdout;
  return new EngineFailure(`${what} [${kind}]: ${String(detail).trim().slice(0, 300)}`, kind, CLAUDE_REST_MS[kind] ?? 0);
}

export class ClaudeEngine implements BrainEngine {
  readonly name = "claude" as const;

  constructor(private readonly opts: ClaudeEngineOptions) {}

  get model(): string {
    return this.opts.settings.model ?? "claude-sonnet-5";
  }

  /** The model for a question: BRAIN_CLAUDE_MODEL_<PREFIX>, else BRAIN_CLAUDE_MODEL. */
  modelFor(label: string): string {
    return this.opts.settings.modelByPrefix[labelPrefix(label)] ?? this.model;
  }

  async decide(req: BrainRequest, signal?: AbortSignal): Promise<BrainAnswer> {
    const tools = req.tools ?? [];
    if (tools.length > 0 && !req.toolContext) throw new Error("tools given without a toolContext");
    // Empty, and at the same path for every call of this process: Claude Code puts the working directory in the
    // model's context, and a changing path would defeat the prompt cache.
    const workDir = stableWorkDir("jev-brain-claude-");
    const work = workDir.dir;
    try {
      // The system prompt goes in a file: it holds knowledge text (no secrets) and can outgrow an argument.
      const systemFile = join(work, "system.md");
      writeFileSync(systemFile, tools.length > 0 ? req.system + TOOLS_NOTE : req.system, "utf8");
      const recordFile = join(work, "tool-calls.jsonl");
      let mcpConfig: string | null = null;
      if (tools.length > 0) {
        const ctx = req.toolContext!;
        const stateFile = join(work, "state.json");
        writeFileSync(stateFile, JSON.stringify(ctx.state ?? null), "utf8");
        mcpConfig = claudeMcpConfig(ctx, { stateFile, recordFile, ...(this.opts.toolsModule ? { toolsModule: this.opts.toolsModule } : {}) });
      }
      const effort = req.effort ?? this.opts.settings.effort;
      const model = this.modelFor(req.label);
      const args = claudeArgs(req, { model, effort, systemFile, mcpConfig, maxBudgetUsd: this.opts.claude.maxBudgetUsd, schema: this.opts.claude.schema });
      const run = await runAgent(this.opts.claude.bin, args, { cwd: work, env: agentEnv(), stdin: promptWithReask(req), ...(signal ? { signal } : {}) });
      const toolCalls = readRecords(recordFile);
      const result = claudeResult(run.stdout);
      const failure = claudeFailure(result, run);
      if (failure || !result) throw failure ?? new EngineFailure("claude gave no result", "error");
      const text = typeof result["result"] === "string" ? result["result"] : "";
      // The model that answered (an alias resolves to a full id).
      const used = Object.keys((result["modelUsage"] ?? {}) as Json);
      const answeredBy = used.find((id) => id.startsWith("claude-")) ?? used[0] ?? model;
      const usage = (result["usage"] ?? {}) as Json;
      const details = (usage["output_tokens_details"] ?? {}) as Json;
      const structured = result["structured_output"];
      const parsed = structured && typeof structured === "object" && !Array.isArray(structured) ? (structured as Json) : parseAnswerText(text);
      const costUsd = result["total_cost_usd"];
      return {
        engine: this.name,
        model: answeredBy,
        answer: parsed ? normalisePick(req, parsed) : null,
        problems: parsed ? [] : [`no structured answer in the reply: ${text.slice(0, 120)}`],
        attempts: 1,
        latencyMs: run.ms,
        usage: {
          inputTokens: num(usage["input_tokens"]) + num(usage["cache_creation_input_tokens"]) + num(usage["cache_read_input_tokens"]),
          cacheHitTokens: num(usage["cache_read_input_tokens"]),
          cacheWriteTokens: num(usage["cache_creation_input_tokens"]),
          outputTokens: num(usage["output_tokens"]),
          reasoningTokens: num(details["thinking_tokens"]),
          // Under the subscription this is the API-price equivalent: a gauge of quota use, not a charge.
          ...(typeof costUsd === "number" ? { costUsd } : {}),
        },
        toolCalls,
        raw: text,
        native: { num_turns: result["num_turns"], duration_api_ms: result["duration_api_ms"], permission_denials: result["permission_denials"] },
      };
    } finally {
      workDir.release();
    }
  }
}

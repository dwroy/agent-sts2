/**
 * Run summaries from the agents' event streams: claude `--output-format stream-json --verbose` (system/init,
 * assistant, user, result) and `codex exec --json` (codex-cli 0.160, checked against real runs 2026-10-04:
 * thread.started {thread_id}; turn.started; item.started / item.updated / item.completed {item: {id, type, ...}} with
 * item types agent_message {text}, reasoning {text}, command_execution {command, aggregated_output, exit_code, status},
 * file_change {changes, status}, mcp_tool_call {server, tool, status}, web_search, todo_list, error (a warning);
 * turn.completed {usage: input_tokens (cached included), cached_input_tokens, cache_write_input_tokens, output_tokens
 * (reasoning included), reasoning_output_tokens}; turn.failed {error: {message}}; error {message} (codex's
 * "Reconnecting... n/5" retry notices are retries, not failures)). Lines that are not JSON are ignored here (they
 * stay in the log).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { RETRY_NOTICE } from "../../agent/src/brain/engines/codex.js";
import type { EngineName } from "./engines.js";

export interface RunSummary {
  engine: EngineName;
  model?: string;
  sessionId?: string;
  /** Agent turns: claude's num_turns; codex's completed turns. */
  turns?: number;
  /** Tool calls by tool name. */
  toolCalls: Record<string, number>;
  /** input = uncached input; codex's input_tokens include the cached ones, which go to cacheRead here. */
  tokens: { input: number; output: number; cacheRead: number; cacheCreation: number; reasoning?: number };
  /** Reported by claude (what the calls would cost on the API; the subscription is not billed per call). */
  costUsd?: number;
  /** The agent's own duration (claude result.duration_ms). */
  durationMs?: number;
  /** "success", "error_max_turns", "error_during_execution", "turn.failed", ... */
  status?: string;
  isError: boolean;
  permissionDenials: string[];
  mcpServers: { name: string; status: string }[];
  /** The agent's final message. */
  result?: string;
  errors: string[];
  /** codex: its retry notices ("Reconnecting... 1/5 ...") and warnings (items of type error). */
  retries?: string[];
  warnings?: string[];
  /**
   * codex: where the wall time went, from the arrival times of the events (ms after the launch): the first event, the
   * first item (the model's first output), the first and last tool call, the time inside tool calls (item.started to
   * item.completed), and every item as {t, kind, ms, what} for the log (capped at TIMELINE_MAX).
   */
  rollout?: RolloutStats;
  timing?: { firstEventMs?: number; firstItemMs?: number; firstToolMs?: number; lastToolEndMs?: number; toolMs: number; timeline: { t: number; kind: string; ms?: number; what?: string }[] };
}

/**
 * What codex's own session record ($CODEX_HOME/sessions/YYYY/MM/DD/rollout-…-<thread id>.jsonl) says that its --json
 * stream does not: the AGENTS.md files it put in front of the task, and every tool call by name. gpt-6.1-sol runs
 * tools through a JavaScript `exec` tool (code mode); those calls reach the stream only when they run a shell command
 * (command_execution), so the stream's count misses the rest (the 2026-10-04 smoke run: 2 exec calls, 0 items).
 */
export interface RolloutStats {
  path: string;
  /** The directories whose AGENTS.md codex loaded ("AGENTS.md instructions for <dir>"). */
  agentsMd: string[];
  /** Tool calls by name (function_call / custom_tool_call / local_shell_call ...). */
  toolCalls: Record<string, number>;
}

/** The session file of a thread under a codex home (newest day directories first); undefined when not found. */
export function findRollout(codexHome: string, threadId: string): string | undefined {
  const list = (dir: string): string[] => {
    try {
      return readdirSync(dir).sort().reverse();
    } catch {
      return [];
    }
  };
  const sessions = join(codexHome, "sessions");
  for (const year of list(sessions)) for (const month of list(join(sessions, year))) for (const day of list(join(sessions, year, month))) {
    const name = list(join(sessions, year, month, day)).find((file) => file.endsWith(`-${threadId}.jsonl`));
    if (name) return join(sessions, year, month, day, name);
  }
  return undefined;
}

/** RolloutStats of a session file (lines that are not JSON are skipped). */
export function rolloutStats(path: string): RolloutStats {
  const stats: RolloutStats = { path, agentsMd: [], toolCalls: {} };
  for (const line of readFileSync(path, "utf8").split("\n")) {
    let row: unknown;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isObject(row) || row["type"] !== "response_item" || !isObject(row["payload"])) continue;
    const payload = row["payload"];
    const kind = String(payload["type"] ?? "");
    if (kind === "message" && payload["role"] === "user") {
      for (const match of JSON.stringify(payload["content"] ?? "").matchAll(/AGENTS\.md instructions for ([^\\"<\n]+)/g)) {
        const dir = match[1]!.trim();
        if (!stats.agentsMd.includes(dir)) stats.agentsMd.push(dir);
      }
    } else if (kind.endsWith("_call") && kind !== "reasoning") {
      const name = String(payload["name"] ?? kind);
      stats.toolCalls[name] = (stats.toolCalls[name] ?? 0) + 1;
    }
  }
  return stats;
}

/** Items kept in a codex run's timeline. */
export const TIMELINE_MAX = 400;

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

export class SummaryTracker {
  readonly summary: RunSummary;

  /** codex item.started times by item id. */
  private readonly started = new Map<string, number>();

  /** `model`: what the launcher asked for (codex's stream does not name it). */
  constructor(engine: EngineName, model?: string) {
    this.summary = { engine, toolCalls: {}, tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }, isError: false, permissionDenials: [], mcpServers: [], errors: [] };
    if (engine === "codex") {
      this.summary.tokens.reasoning = 0;
      this.summary.retries = [];
      this.summary.warnings = [];
      this.summary.timing = { toolMs: 0, timeline: [] };
      if (model) this.summary.model = model;
    }
  }

  /** Feeds one stdout line (`tMs`: its arrival, ms after the launch); returns the parsed event (or undefined for a non-JSON line). */
  feed(line: string, tMs?: number): Json | undefined {
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      return undefined;
    }
    if (!isObject(event)) return undefined;
    if (this.summary.engine === "claude") this.claude(event);
    else this.codex(event, tMs);
    return event;
  }

  private countTool(name: string): void {
    this.summary.toolCalls[name] = (this.summary.toolCalls[name] ?? 0) + 1;
  }

  private claude(event: Json): void {
    const s = this.summary;
    if (event["type"] === "system" && event["subtype"] === "init") {
      if (typeof event["model"] === "string") s.model = event["model"];
      if (typeof event["session_id"] === "string") s.sessionId = event["session_id"];
      if (Array.isArray(event["mcp_servers"])) {
        s.mcpServers = event["mcp_servers"].filter(isObject).map((server) => ({ name: String(server["name"]), status: String(server["status"]) }));
      }
    } else if (event["type"] === "assistant" && isObject(event["message"]) && Array.isArray(event["message"]["content"])) {
      for (const block of event["message"]["content"]) if (isObject(block) && block["type"] === "tool_use") this.countTool(String(block["name"]));
    } else if (event["type"] === "result") {
      s.status = typeof event["subtype"] === "string" ? event["subtype"] : undefined;
      s.isError = event["is_error"] === true || (s.status !== undefined && s.status !== "success");
      if (typeof event["num_turns"] === "number") s.turns = event["num_turns"];
      if (typeof event["total_cost_usd"] === "number") s.costUsd = event["total_cost_usd"];
      if (typeof event["duration_ms"] === "number") s.durationMs = event["duration_ms"];
      if (typeof event["session_id"] === "string") s.sessionId = event["session_id"];
      if (typeof event["result"] === "string") s.result = event["result"];
      const usage = event["usage"];
      if (isObject(usage)) {
        s.tokens = {
          input: num(usage["input_tokens"]),
          output: num(usage["output_tokens"]),
          cacheRead: num(usage["cache_read_input_tokens"]),
          cacheCreation: num(usage["cache_creation_input_tokens"]),
        };
      }
      if (Array.isArray(event["permission_denials"])) {
        s.permissionDenials = event["permission_denials"].filter(isObject).map((denial) => String(denial["tool_name"] ?? "?"));
      }
      if (Array.isArray(event["errors"])) s.errors.push(...event["errors"].map(String));
    }
  }

  private codex(event: Json, tMs?: number): void {
    const s = this.summary;
    const timing = s.timing!;
    if (tMs !== undefined && timing.firstEventMs === undefined) timing.firstEventMs = tMs;
    const type = event["type"];
    if (type === "thread.started" && typeof event["thread_id"] === "string") s.sessionId = event["thread_id"];
    else if (type === "turn.completed") {
      s.turns = (s.turns ?? 0) + 1;
      const usage = event["usage"];
      if (isObject(usage)) {
        const cached = num(usage["cached_input_tokens"]);
        s.tokens.input += Math.max(0, num(usage["input_tokens"]) - cached);
        s.tokens.cacheRead += cached;
        s.tokens.cacheCreation += num(usage["cache_write_input_tokens"]);
        s.tokens.output += num(usage["output_tokens"]);
        s.tokens.reasoning = (s.tokens.reasoning ?? 0) + num(usage["reasoning_output_tokens"]);
      }
      if (s.status === undefined) s.status = "success";
    } else if (type === "turn.failed") {
      s.isError = true;
      s.status = "turn.failed";
      const error = isObject(event["error"]) ? event["error"]["message"] : event["error"];
      if (error !== undefined) s.errors.push(String(error));
    } else if (type === "error") {
      const message = String(event["message"] ?? "");
      if (RETRY_NOTICE.test(message)) s.retries!.push(message);
      else {
        s.isError = true;
        s.status = "error";
        s.errors.push(message);
      }
    } else if ((type === "item.started" || type === "item.completed") && isObject(event["item"])) {
      const item = event["item"];
      const kind = String(item["type"] ?? item["item_type"] ?? "");
      const id = String(item["id"] ?? "");
      if (tMs !== undefined && timing.firstItemMs === undefined) timing.firstItemMs = tMs;
      const tool = !["agent_message", "reasoning", "error", "todo_list", "user_message"].includes(kind);
      if (type === "item.started") {
        if (tMs !== undefined) this.started.set(id, tMs);
        if (tool && tMs !== undefined && timing.firstToolMs === undefined) timing.firstToolMs = tMs;
        return;
      }
      const began = this.started.get(id);
      const ms = began !== undefined && tMs !== undefined ? tMs - began : undefined;
      if (tool) {
        if (tMs !== undefined && timing.firstToolMs === undefined) timing.firstToolMs = tMs;
        if (tMs !== undefined) timing.lastToolEndMs = tMs;
        if (ms !== undefined) timing.toolMs += ms;
      }
      if (tMs !== undefined && timing.timeline.length < TIMELINE_MAX) {
        const what = kind === "command_execution" ? String(item["command"] ?? "") : kind === "mcp_tool_call" ? `${String(item["server"] ?? "")}.${String(item["tool"] ?? "")}` : kind === "agent_message" ? String(item["text"] ?? "") : kind === "file_change" ? JSON.stringify(item["changes"] ?? []) : "";
        timing.timeline.push({ t: tMs, kind, ...(ms !== undefined ? { ms } : {}), ...(what ? { what: what.slice(0, 100) } : {}) });
      }
      if (kind === "agent_message" && typeof item["text"] === "string") s.result = item["text"];
      else if (kind === "error") s.warnings!.push(String(item["message"] ?? item["text"] ?? ""));
      else if (kind === "mcp_tool_call") this.countTool(`mcp:${String(item["server"] ?? "?")}.${String(item["tool"] ?? "?")}`);
      else if (tool && kind) this.countTool(kind);
    }
  }
}

/** One short progress line for a stream event (stderr while the agent runs), or undefined. */
export function progressLine(engine: EngineName, event: Json): string | undefined {
  if (engine === "claude") {
    if (event["type"] === "system" && event["subtype"] === "init") return `会话开始：模型 ${String(event["model"] ?? "?")}`;
    if (event["type"] === "assistant" && isObject(event["message"]) && Array.isArray(event["message"]["content"])) {
      const tools = event["message"]["content"].filter((block) => isObject(block) && block["type"] === "tool_use") as Json[];
      if (tools.length === 0) return undefined;
      return tools.map((block) => `工具 ${String(block["name"])} ${JSON.stringify(block["input"] ?? {}).slice(0, 120)}`).join("\n");
    }
    return undefined;
  }
  if (event["type"] === "item.completed" && isObject(event["item"])) {
    const item = event["item"];
    const kind = String(item["type"] ?? "");
    if (kind === "command_execution") return `命令 ${String(item["command"] ?? "").slice(0, 120)}（退出码 ${String(item["exit_code"] ?? "?")}）`;
    if (kind === "mcp_tool_call") return `MCP ${String(item["server"] ?? "?")}.${String(item["tool"] ?? "?")} ${String(item["status"] ?? "")}`;
    if (kind === "file_change") return `改文件 ${JSON.stringify(item["changes"] ?? []).slice(0, 120)}`;
    if (kind === "agent_message") return `说：${String(item["text"] ?? "").replace(/\s+/g, " ").slice(0, 80)}`;
  }
  if (event["type"] === "error" && typeof event["message"] === "string") return `codex：${event["message"].slice(0, 120)}`;
  return undefined;
}

const k = (n: number): string => (n >= 10_000 ? `${(n / 1000).toFixed(1)}k` : String(n));

/** The human summary printed at the end (Chinese, like the rest of the ops output). */
export function formatSummary(summary: RunSummary, extra: { task: string; exitCode: number | null; signal: string | null; timedOut: boolean; wallMs: number; logPath: string; redacted: number }): string {
  const t = summary.tokens;
  const inputAll = t.input + t.cacheRead + t.cacheCreation;
  const hit = inputAll > 0 ? `${((t.cacheRead / inputAll) * 100).toFixed(1)}%` : "—";
  const tools = Object.entries(summary.toolCalls).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name}×${count}`).join(" ") || "无";
  const status = extra.timedOut ? "超时被终止" : summary.status ?? (extra.exitCode === 0 ? "success" : "无结果");
  const lines = [
    `== 学习者 ${summary.engine} / ${extra.task} ==`,
    `状态：${status}${summary.isError ? "（出错）" : ""}；退出码 ${extra.exitCode ?? "—"}${extra.signal ? `，信号 ${extra.signal}` : ""}`,
    `模型：${summary.model ?? "未记录"}；会话：${summary.sessionId ?? "未记录"}`,
    `轮数：${summary.turns ?? "未记录"}；工具调用：${tools}`,
    `token：输入 ${k(t.input)}、输出 ${k(t.output)}${t.reasoning !== undefined ? `（其中推理 ${k(t.reasoning)}）` : ""}、cache 读 ${k(t.cacheRead)}、cache 写 ${k(t.cacheCreation)}（命中 ${hit}）`,
    `成本：${summary.costUsd !== undefined ? `$${summary.costUsd.toFixed(4)}（API 价折算；订阅不按次计费）` : "未提供"}`,
    `耗时：${summary.durationMs !== undefined ? `${(summary.durationMs / 1000).toFixed(1)} s（agent 自报）、` : ""}${(extra.wallMs / 1000).toFixed(1)} s（墙钟）`,
  ];
  const timing = summary.timing;
  if (timing && timing.firstEventMs !== undefined) {
    const sec = (ms: number | undefined): string => (ms === undefined ? "—" : `${(ms / 1000).toFixed(1)} s`);
    lines.push(`时间：首个事件 ${sec(timing.firstEventMs)}、模型首个输出 ${sec(timing.firstItemMs)}、首次工具 ${sec(timing.firstToolMs)}、末次工具结束 ${sec(timing.lastToolEndMs)}；工具内共 ${sec(timing.toolMs)}，其余（模型生成、推理、网络）${sec(extra.wallMs - timing.toolMs - timing.firstEventMs)}`);
  }
  if (summary.rollout) {
    const calls = Object.entries(summary.rollout.toolCalls).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name}×${count}`).join(" ") || "无";
    lines.push(`codex 会话记录：AGENTS.md ${summary.rollout.agentsMd.length > 0 ? `已加载（${summary.rollout.agentsMd.join("、")}）` : "未加载"}；模型的工具调用 ${calls}；${summary.rollout.path}`);
  }
  if (summary.retries && summary.retries.length > 0) lines.push(`codex 重连：${summary.retries.length} 次`);
  if (summary.warnings && summary.warnings.length > 0) lines.push(`codex 警告：${summary.warnings.join("；").slice(0, 300)}`);
  if (summary.permissionDenials.length > 0) lines.push(`被拒的工具调用：${summary.permissionDenials.length} 次（${[...new Set(summary.permissionDenials)].join(", ")}）`);
  if (summary.mcpServers.length > 0) lines.push(`MCP：${summary.mcpServers.map((server) => `${server.name}=${server.status}`).join(", ")}`);
  if (summary.errors.length > 0) lines.push(`错误：${summary.errors.join("；").slice(0, 500)}`);
  if (extra.redacted > 0) lines.push(`注意：日志里发现 ${extra.redacted} 处 key，已替换成 [REDACTED]`);
  lines.push(`日志：${extra.logPath}`);
  return lines.join("\n");
}

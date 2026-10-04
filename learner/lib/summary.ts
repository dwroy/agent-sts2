/**
 * Run summaries from the agents' event streams: claude `--output-format stream-json --verbose` (system/init,
 * assistant, user, result) and `codex exec --json` (thread.started, turn.completed with usage, item.completed,
 * turn.failed, error). Lines that are not JSON are ignored here (they stay in the log).
 */
import type { EngineName } from "./engines.js";

export interface RunSummary {
  engine: EngineName;
  model?: string;
  sessionId?: string;
  /** Agent turns: claude's num_turns; codex's completed turns. */
  turns?: number;
  /** Tool calls by tool name. */
  toolCalls: Record<string, number>;
  tokens: { input: number; output: number; cacheRead: number; cacheCreation: number };
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
}

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

export class SummaryTracker {
  readonly summary: RunSummary;

  constructor(engine: EngineName) {
    this.summary = { engine, toolCalls: {}, tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }, isError: false, permissionDenials: [], mcpServers: [], errors: [] };
  }

  /** Feeds one stdout line; returns the parsed event (or undefined for a non-JSON line). */
  feed(line: string): Json | undefined {
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      return undefined;
    }
    if (!isObject(event)) return undefined;
    if (this.summary.engine === "claude") this.claude(event);
    else this.codex(event);
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

  private codex(event: Json): void {
    const s = this.summary;
    const type = event["type"];
    if (type === "thread.started" && typeof event["thread_id"] === "string") s.sessionId = event["thread_id"];
    else if (type === "turn.completed") {
      s.turns = (s.turns ?? 0) + 1;
      const usage = event["usage"];
      if (isObject(usage)) {
        s.tokens.input += num(usage["input_tokens"]);
        s.tokens.output += num(usage["output_tokens"]);
        s.tokens.cacheRead += num(usage["cached_input_tokens"]);
      }
      if (s.status === undefined) s.status = "success";
    } else if (type === "turn.failed" || type === "error") {
      s.isError = true;
      s.status = String(type);
      const error = isObject(event["error"]) ? event["error"]["message"] : event["message"];
      if (error !== undefined) s.errors.push(String(error));
    } else if (type === "item.completed" && isObject(event["item"])) {
      const item = event["item"];
      const kind = String(item["type"] ?? item["item_type"] ?? "");
      if (kind === "agent_message" && typeof item["text"] === "string") s.result = item["text"];
      else if (kind === "mcp_tool_call") this.countTool(`mcp:${String(item["tool"] ?? "?")}`);
      else if (kind && kind !== "reasoning") this.countTool(kind);
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
    if (kind === "command_execution") return `命令 ${String(item["command"] ?? "").slice(0, 120)}`;
    if (kind === "file_change" || kind === "mcp_tool_call") return `${kind} ${JSON.stringify(item).slice(0, 120)}`;
  }
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
    `token：输入 ${k(t.input)}、输出 ${k(t.output)}、cache 读 ${k(t.cacheRead)}、cache 写 ${k(t.cacheCreation)}（命中 ${hit}）`,
    `成本：${summary.costUsd !== undefined ? `$${summary.costUsd.toFixed(4)}（API 价折算；订阅不按次计费）` : "未提供"}`,
    `耗时：${summary.durationMs !== undefined ? `${(summary.durationMs / 1000).toFixed(1)} s（agent 自报）、` : ""}${(extra.wallMs / 1000).toFixed(1)} s（墙钟）`,
  ];
  if (summary.permissionDenials.length > 0) lines.push(`被拒的工具调用：${summary.permissionDenials.length} 次（${[...new Set(summary.permissionDenials)].join(", ")}）`);
  if (summary.mcpServers.length > 0) lines.push(`MCP：${summary.mcpServers.map((server) => `${server.name}=${server.status}`).join(", ")}`);
  if (summary.errors.length > 0) lines.push(`错误：${summary.errors.join("；").slice(0, 500)}`);
  if (extra.redacted > 0) lines.push(`注意：日志里发现 ${extra.redacted} 处 key，已替换成 [REDACTED]`);
  lines.push(`日志：${extra.logPath}`);
  return lines.join("\n");
}

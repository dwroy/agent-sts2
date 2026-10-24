/** Best-effort, bounded broadcast from the existing stream. No model/terminal connection or awaited I/O. */
import { createHash } from "node:crypto";
import { promptWithReask, userMessage } from "./message.js";
import { appendFile, mkdir, rename, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { BrainRequest } from "./types.js";

export type BrainLiveEvent =
  | { kind: "text" | "reasoning" | "status" | "error"; text: string }
  | { kind: "prompt"; request: BrainRequest; phase: string }
  | { kind: "tool-start"; name: string; input: unknown }
  | { kind: "tool-end"; name: string; output: string; ms: number; isError?: boolean; sources?: unknown[] };
export type BrainObserver = (event: BrainLiveEvent) => void;

export function observeBrain(observer: BrainObserver | undefined, event: BrainLiveEvent): void {
  try { observer?.(event); } catch { /* An observer cannot affect a decision or a tool result. */ }
}

/** Redact the complete field before any byte/paragraph cutoff. Preserve layout, never terminal controls. */
const SENSITIVE_FIELD = /^(?:.*(?:api[_ -]?key|token|secret|password|authorization|cookie).*|key|(?:(?:external[_ -]?)?player|steam|external_user)[_ -]?(?:id|name)|external[_ -]?(?:run|game|match)[_ -]?id)$/i;
const FIELD_TEXT = /["']?(?:[\w.-]*(?:api[_ -]?key|token|secret|password|authorization|cookie)[\w.-]*|key|(?:(?:external[_ -]?)?player|steam|external_user)[_ -]?(?:id|name)|external[_ -]?(?:run|game|match)[_ -]?id)["']?\s*[:=]\s*(?:"(?:[^"\\]|\\[\s\S])*(?:"|\\?$)|'(?:[^'\\]|\\[\s\S])*(?:'|\\?$)|[^\s,;}]+)/gi;

/** Track quoted sensitive values across provider chunks and sentence boundaries, including escaped quotes. */
interface SensitiveQuote { quote: string; escaped: boolean }
function consumeSensitiveQuote(text: string, state: SensitiveQuote): boolean {
  for (const ch of text) {
    if (state.escaped) state.escaped = false;
    else if (ch === "\\") state.escaped = true;
    else if (ch === state.quote) return true;
  }
  return false;
}
function openSensitiveQuote(text: string): SensitiveQuote | undefined {
  const assignment = /["']?(?:[\w.-]*(?:api[_ -]?key|token|secret|password|authorization|cookie)[\w.-]*|key|(?:external[_ -]?)?(?:player|run|game|match)[_ -]?(?:id|name))["']?\s*[:=]\s*(["'])/gi;
  for (const match of text.matchAll(assignment)) {
    const state = { quote: match[1]!, escaped: false };
    if (!consumeSensitiveQuote(text.slice(match.index! + match[0].length), state)) return state;
  }
  return undefined;
}

export function redactLiveText(value: string, privateValues: string[] = []): string {
  let text = value;
  // Structured strings can contain escaped quotes/newlines in a sensitive field's value.
  text = text.replace(/"((?:[^"\\]|\\.)*)"\s*:\s*("(?:[^"\\]|\\.)*"|[0-9]+)/g, (whole, key: string) =>
    SENSITIVE_FIELD.test(key) ? '"[敏感字段已隐藏]"' : whole);
  for (const secret of privateValues) if (secret) text = text.split(secret).join("[外部标识已隐藏]");
  return text.replace(/(?:https?|wss?):\/\/[^\s"'<>]+/gi, "[地址已隐藏]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[邮箱已隐藏]")
    .replace(/\b(?:bearer\s+\S+|(?:sk|ghp|gho|github_pat|xox[baprs])[-_][A-Za-z0-9_-]+)/gi, "[凭据已隐藏]")
    .replace(FIELD_TEXT, "[敏感字段已隐藏]")
    .replace(/\b[A-Za-z0-9_+/=-]{32,}\b/g, token => /^[a-f0-9]{64}$/i.test(token) ? token : "[长标识已隐藏]")
    .replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, " ");
}

export function safeLiveText(value: string, limit = 600, privateValues: string[] = []): string {
  const text = redactLiveText(value, privateValues).replace(/\s+/g, " ");
  return text.slice(0, limit) + (text.length > limit ? "…" : "");
}

/** Keep UTF-8 code points intact; prefer paragraph/line boundaries on both sides of the omission. */
export function boundLiveText(text: string, limit: number): string {
  const bytes = Buffer.byteLength(text);
  if (bytes <= limit) return text;
  const raw = Buffer.from(text);
  let budget = limit;
  for (;;) {
    const half = Math.max(0, Math.floor(budget / 2));
    let end = half, start = raw.length - half;
    while (end > 0 && (raw[end]! & 0xc0) === 0x80) end--;
    while (start < raw.length && (raw[start]! & 0xc0) === 0x80) start++;
    let head = raw.subarray(0, end).toString("utf8"), tail = raw.subarray(start).toString("utf8");
    const last = head.lastIndexOf("\n"), first = tail.indexOf("\n");
    if (last >= head.length / 2) head = head.slice(0, last + 1);
    if (first >= 0 && first < tail.length / 2) tail = tail.slice(first + 1);
    const h = Buffer.byteLength(head), t = Buffer.byteLength(tail);
    const result = `${head}\n[… 中间省略 ${bytes - h - t} B；脱敏全文 ${bytes} B；保留 [0, ${h}) 与 [${bytes - t}, ${bytes}) …]\n${tail}`;
    const excess = Buffer.byteLength(result) - limit;
    if (excess <= 0 || budget <= 0) return result;
    budget = Math.max(0, budget - excess);
  }
}

function privateIdentifiers(payload: unknown, depth = 0, out: string[] = [], external = false): string[] {
  if (depth > 20 || out.length >= 4096 || !payload || typeof payload !== "object") return out;
  const source = (payload as Record<string, unknown>).source;
  external ||= typeof source === "string" && source.startsWith("external:");
  for (const [key, value] of Object.entries(payload)) {
    if ((SENSITIVE_FIELD.test(key) || (external && /^(?:run|game|match|session)[_-]?id$/i.test(key))) && (typeof value === "string" || typeof value === "number")) out.push(String(value));
    else if (typeof value === "object") privateIdentifiers(value, depth + 1, out, external);
  }
  return out;
}

function displayJson(value: unknown, indent?: number): string {
  return JSON.stringify(value, (key, item: unknown) => SENSITIVE_FIELD.test(key) ? "[敏感字段已隐藏]" : item, indent) ?? "null";
}

function displayPrompt(req: BrainRequest): string {
  const message = userMessage(req);
  // JSON whitespace gives the terminal paragraph boundaries without changing any field content.
  return displayJson(JSON.parse(message), 2) + promptWithReask(req).slice(message.length);
}

export interface BrainLiveOptions { mode?: "detailed" | "compact"; questionBytes?: number; toolBytes?: number; systemBytes?: number }
function byteLimit(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 256 && n <= 1024 * 1024 ? n : fallback;
}

function params(input: unknown): string {
  if (!input || typeof input !== "object") return "参数已折叠";
  return Object.entries(input).slice(0, 12).filter(([key]) => /^[A-Za-z_]{1,40}$/.test(key) && !/key|token|secret|auth|password|player|steam|user|cookie/i.test(key))
    .map(([key, value]) => `${key}=${typeof value === "string" ? `文本/${value.length}字` : typeof value === "number" && Number.isFinite(value) ? value : Array.isArray(value) ? `${value.length}项` : "已折叠"}`).join(", ");
}
function floor(payload: unknown, depth = 0): string {
  if (depth > 6 || !payload || typeof payload !== "object") return "?";
  const p = payload as Record<string, unknown>;
  if (typeof p.floor === "number") return String(p.floor);
  for (const key of ["state", "run", "context", "facts"]) { const n = floor(p[key], depth + 1); if (n !== "?") return n; }
  return "?";
}

/** One writer per router. Two rolling files, each at most 64 MiB by default; no awaited decision-path I/O. */
export class BrainLiveWriter {
  private pending: { file: string; text: string }[] = [];
  private pendingBytes = 0;
  private draining = false;
  private failed = false;
  private dropped = false;
  private sizes = new Map<string, number>();
  private finished: (() => void)[] = [];
  private readonly options: Required<BrainLiveOptions>;
  private systems = new Map<string, string>();
  private privateByQuestion = new Map<string, string[]>();
  constructor(private readonly logs: string, private readonly cap = 64 * 1024 * 1024, options: BrainLiveOptions = {}) {
    this.options = {
      mode: options.mode ?? (process.env.BRAIN_LIVE_MODE === "compact" ? "compact" : "detailed"),
      questionBytes: byteLimit(options.questionBytes ?? process.env.BRAIN_LIVE_QUESTION_BYTES, 16 * 1024),
      toolBytes: byteLimit(options.toolBytes ?? process.env.BRAIN_LIVE_TOOL_BYTES, 4 * 1024),
      systemBytes: byteLimit(options.systemBytes ?? process.env.BRAIN_LIVE_SYSTEM_BYTES, 2 * 1024),
    };
  }

  private enqueue(file: string, text: string): void {
    if (this.failed) return;
    const bytes = Buffer.byteLength(text);
    if (this.pendingBytes + bytes > 8 * 1024 * 1024) { this.dropped = true; return; }
    this.pending.push({ file, text }); this.pendingBytes += bytes;
    if (!this.draining) { this.draining = true; setImmediate(() => { void this.drain(); }); }
  }
  private async drain(): Promise<void> {
    try {
      while (this.pending.length) {
        const item = this.pending.shift()!; this.pendingBytes -= Buffer.byteLength(item.text);
        await mkdir(dirname(item.file), { recursive: true });
        let size = this.sizes.get(item.file) ?? await stat(item.file).then(s => s.size, () => 0);
        const text = (this.dropped ? "!!! 直播队列达到上限，部分展示增量省略；原对局日志保留。\n" : "") + item.text;
        this.dropped = false;
        if (size + Buffer.byteLength(text) > this.cap) {
          await rename(item.file, join(dirname(item.file), "previous.txt")).catch((e: NodeJS.ErrnoException) => { if (e.code !== "ENOENT") throw e; });
          size = 0;
        }
        const bounded = Buffer.byteLength(text) <= this.cap ? text : boundLiveText(text, Math.max(0, this.cap - 1)) + "\n";
        await appendFile(item.file, bounded, { mode: 0o600 });
        this.sizes.set(item.file, size + Buffer.byteLength(bounded));
      }
    } catch { this.failed = true; this.pending = []; this.pendingBytes = 0; }
    finally { this.draining = false; for (const done of this.finished.splice(0)) done(); }
  }
  /** Test/normal-shutdown flush only. The decision path never awaits the writer. */
  flush(): Promise<void> { return !this.draining ? Promise.resolve() : new Promise((done) => this.finished.push(done)); }

  verdict(req: BrainRequest, answer: unknown, accepted: boolean, ms: number, error?: string): void {
    if (!/^[0-9A-Z]{12}$/.test(req.runId ?? "")) return;
    const privateValues = [...privateIdentifiers(req), ...(this.privateByQuestion.get(req.questionId ?? "") ?? [])];
    const safe = (text: string) => this.options.mode === "compact" ? safeLiveText(text, 1200, privateValues) : redactLiveText(text, privateValues);
    this.enqueue(join(this.logs, "brain-live", req.runId!, "current.txt"),
      `${accepted ? "最终选择与理由" : "!!! 未接受/错误/兜底待后续"} · 题 ${safe(req.questionId ?? "?")} · 总耗时 ${ms} ms
${safe(error ?? (displayJson(answer)))}
`);
  }

  begin(req: BrainRequest, engine: string, model: string, effort: string, fallback: boolean): { observe: BrainObserver; finish: (answer: unknown, error?: string) => void } {
    const file = /^[0-9A-Z]{12}$/.test(req.runId ?? "") ? join(this.logs, "brain-live", req.runId!, "current.txt") : "";
    const privateValues = [...(this.privateByQuestion.get(req.questionId ?? "") ?? []), ...privateIdentifiers({ payload: req.payload, memory: req.memory, options: req.options })];
    this.privateByQuestion.set(req.questionId ?? "", privateValues);
    if (this.privateByQuestion.size > 8) this.privateByQuestion.delete(this.privateByQuestion.keys().next().value!);
    const safe = (text: string, limit?: number) => safeLiveText(text, limit, privateValues);
    const emit = (text: string) => { if (file) this.enqueue(file, `${text}\n`); };
    const detailed = this.options.mode === "detailed";
    const full = (text: string) => redactLiveText(text, privateValues);
    const bounded = (text: string, bytes: number) => boundLiveText(full(text), bytes);
    const buffers = { text: "", reasoning: "" };
    const counts = { text: 0, reasoning: 0 };
    const droppedSegment = { text: false, reasoning: false };
    const sensitiveQuote: { text?: SensitiveQuote; reasoning?: SensitiveQuote } = {};
    let closed = false;
    let hasSummary = false;
    const prefix = (kind: "text" | "reasoning") => kind === "text" ? "正文" : "推理摘要";
    emit(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${new Date().toISOString()} · F${floor(req.payload)} · ${safe(req.label, 100)} · 题 ${safe(req.questionId ?? "?", 100)}\n${safe(engine)} / ${safe(model)} · 请求强度 ${safe(effort)}${fallback ? " · !!! 兜底" : ""}${req.reask ? " · 重问" : ""}`);
    if (detailed) {
      const sha = createHash("sha256").update(req.system).digest("hex");
      if (this.systems.get(file) === sha) emit(`系统提示同上（SHA256 ${sha}）`);
      else {
        this.systems.set(file, sha);
        // Keep only the current run in memory. System metadata never changes the provider's prompt.
        if (this.systems.size > 2) this.systems.delete(this.systems.keys().next().value!);
        const preview = full(req.system).split("\n").slice(0, 12).join("\n");
        emit(`系统提示 · 原文 ${Buffer.byteLength(req.system)} B · SHA256 ${sha} · 预览前 12 行\n${boundLiveText(preview, this.options.systemBytes)}`);
      }
      emit(`题目全文（含状态、选项、本局记录与重问；脱敏后上限 ${this.options.questionBytes} B）：\n${bounded(displayPrompt(req), this.options.questionBytes)}`);
    } else emit(`题面（截断）：${safe(req.question, 160)}`);
    const flushSegments = () => {
      for (const kind of ["reasoning", "text"] as const) {
        if (!droppedSegment[kind] && buffers[kind]) {
          sensitiveQuote[kind] = openSensitiveQuote(buffers[kind]);
          emit(`${prefix(kind)}：${detailed ? full(buffers[kind]) : safe(buffers[kind])}`);
        }
        buffers[kind] = ""; droppedSegment[kind] = false;
      }
    };
    let lastKind: "text" | "reasoning" | undefined;
    const delta = (kind: "text" | "reasoning", value: string) => {
      if (detailed && lastKind && lastKind !== kind) flushSegments();
      lastKind = kind;
      if (kind === "reasoning" && value.trim()) hasSummary = true;
      // Sentence boundaries prevent split credentials/identifiers from leaking across writes. Unfinished long spans
      // show progress counts; no prefix of an unknown token is written. No hidden/internal chain-of-thought API is used.
      const chunks = value.split(/([\n。！？；])/u);
      for (const part of chunks) {
        if (sensitiveQuote[kind]) {
          if (consumeSensitiveQuote(part, sensitiveQuote[kind]!)) sensitiveQuote[kind] = undefined;
          continue;
        }
        if (/^[\n。！？；]$/u.test(part)) {
          sensitiveQuote[kind] = openSensitiveQuote(buffers[kind]);
          if (!droppedSegment[kind] && buffers[kind]) emit(`${prefix(kind)}：${detailed ? full(buffers[kind] + part) : safe(buffers[kind] + part)}`);
          buffers[kind] = ""; droppedSegment[kind] = false;
        } else if (!droppedSegment[kind]) {
          buffers[kind] += part;
          if (Buffer.byteLength(buffers[kind]) > (detailed ? 256 * 1024 : 4096)) {
            sensitiveQuote[kind] = openSensitiveQuote(buffers[kind]);
            buffers[kind] = ""; droppedSegment[kind] = true; emit(`${prefix(kind)}：[超长段折叠，继续接收]`);
          }
        }
      }
      counts[kind] += value.length;
      // Progress is visible even when a provider emits a long JSON string without sentence boundaries.
      if (counts[kind] - (counts[kind] % 256) !== (counts[kind] - value.length) - ((counts[kind] - value.length) % 256)) emit(`${prefix(kind)}流：已收到 ${counts[kind]} 字（未完成段待安全分句）`);
    };
    return {
      observe: (event) => {
        if (closed) return;
        if (event.kind === "text" || event.kind === "reasoning") delta(event.kind, event.text);
        else if (event.kind === "prompt") {
          if (detailed) {
            flushSegments();
            emit(`题目全文 · ${safe(event.phase)}：\n${bounded(displayPrompt(event.request), this.options.questionBytes)}`);
          }
        } else if (event.kind === "tool-start") {
          privateIdentifiers(event.input, 0, privateValues, event.name.startsWith("external_"));
          if (detailed) flushSegments();
          emit(detailed ? `检索 · 工具开始 ${safe(event.name, 100)} · 完整参数（脱敏）：\n${bounded(displayJson(event.input), this.options.toolBytes)}`
            : `工具开始 ${safe(event.name, 100)} (${safe(params(event.input), 240)})`);
        } else if (event.kind === "tool-end") {
          privateIdentifiers(event.sources, 0, privateValues);
          const external = event.sources?.some(source => !!source && typeof source === "object" &&
            typeof (source as Record<string, unknown>).source === "string" && String((source as Record<string, unknown>).source).startsWith("external:")) ?? false;
          try { privateIdentifiers(JSON.parse(event.output), 0, privateValues, external); } catch { /* Prose tools have no envelope. */ }
          if (detailed) {
            flushSegments();
            emit(`检索 · ${event.isError ? "!!! 工具错误" : "工具返回"} ${safe(event.name, 100)} → 原文 ${Buffer.byteLength(event.output)} B · ${event.ms} ms\n${bounded(event.output, this.options.toolBytes)}`);
            let sources = event.sources;
            if (!sources) { try { const envelope = JSON.parse(event.output); sources = envelope.sources ?? (envelope.source ? [{ source: envelope.source, version: envelope.version }] : []); } catch { /* Missing provenance stays unknown. */ } }
            emit(`检索 · 来源与版本：${bounded(displayJson(sources?.length ? sources : "未提供（未知）"), this.options.toolBytes)}`);
          } else emit(`${event.isError ? "!!! 工具错误" : "工具返回"} ${safe(event.name, 100)} → ${Buffer.byteLength(event.output)} B · ${event.ms} ms · 摘要 ${safe(event.output, 180)}`);
        }
        else if ("text" in event) emit(`${event.kind === "error" ? "!!! 错误/卡住/超时" : "状态"} ${safe(event.text, 240)}`);
      },
      finish: (answer, error) => {
        if (closed) return;
        closed = true;
        flushSegments();
        if (detailed && !hasSummary) emit("推理摘要：本题无公开推理摘要");
        if (error) emit(`!!! 错误/卡住/超时 ${safe(error, 240)}`);
        else emit(`本次尝试答案与理由：${detailed ? full(displayJson(answer)) : safe(JSON.stringify(answer) ?? "无有效答案", 1200)}`);
      },
    };
  }
}

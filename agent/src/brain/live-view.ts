/** Best-effort, bounded broadcast from the existing stream. No model/terminal connection or awaited I/O. */
import { appendFile, mkdir, rename, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { BrainRequest } from "./types.js";

export type BrainLiveEvent =
  | { kind: "text" | "reasoning" | "status" | "error"; text: string }
  | { kind: "tool-start"; name: string; input: unknown }
  | { kind: "tool-end"; name: string; output: string; ms: number; isError?: boolean };
export type BrainObserver = (event: BrainLiveEvent) => void;

export function observeBrain(observer: BrainObserver | undefined, event: BrainLiveEvent): void {
  try { observer?.(event); } catch { /* An observer cannot affect a decision or a tool result. */ }
}

/** Redact before truncation; never write raw notifications, payloads, query bodies or terminal escapes. */
export function safeLiveText(value: string, limit = 600, privateValues: string[] = []): string {
  let text = value.slice(0, limit + 4096);
  for (const secret of privateValues) if (secret) text = text.split(secret).join("[外部标识已隐藏]");
  text = text.replace(/(?:https?|wss?):\/\/[^\s"'<>]+/gi, "[地址已隐藏]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[邮箱已隐藏]")
    .replace(/\b(?:bearer\s+\S+|(?:sk|ghp|gho|github_pat|xox[baprs])[-_][A-Za-z0-9_-]+)/gi, "[凭据已隐藏]")
    .replace(/["']?(?:[\w.-]*(?:key|token|secret|password|authorization|cookie)[\w.-]*|(?:external[_ -]?)?player[_ -]?(?:id|name)|steam[_ -]?id)["']?\s*[:=]\s*(?:"[^"\n]*(?:"|$)|'[^'\n]*(?:'|$)|[^\s,;}]+)/gi, "[敏感字段已隐藏]")
    .replace(/\b[A-Za-z0-9_+/=-]{32,}\b/g, "[长标识已隐藏]")
    .replace(/[\x00-\x1f\x7f-\x9f]/g, " ");
  return text.slice(0, limit) + (text.length > limit ? "…" : "");
}

function privateIdentifiers(payload: unknown, depth = 0, out: string[] = []): string[] {
  if (depth > 6 || out.length >= 64 || !payload || typeof payload !== "object") return out;
  for (const [key, value] of Object.entries(payload).slice(0, 100)) {
    if (/(?:player|steam|external_user)[_-]?(?:id|name)|api[_-]?key|secret|password|authorization|cookie/i.test(key) &&
        (typeof value === "string" || typeof value === "number")) out.push(String(value));
    else if (typeof value === "object") privateIdentifiers(value, depth + 1, out);
  }
  return out;
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

/** One writer per router. Each run retains current.txt plus previous.txt, each at most 4 MiB. */
export class BrainLiveWriter {
  private pending: { file: string; text: string }[] = [];
  private pendingBytes = 0;
  private draining = false;
  private failed = false;
  private dropped = false;
  private sizes = new Map<string, number>();
  private finished: (() => void)[] = [];
  constructor(private readonly logs: string, private readonly cap = 4 * 1024 * 1024) {}

  private enqueue(file: string, text: string): void {
    if (this.failed) return;
    const bytes = Buffer.byteLength(text);
    if (this.pendingBytes + bytes > 128 * 1024) { this.dropped = true; return; }
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
        const bounded = Buffer.byteLength(text) <= this.cap ? text : Buffer.from(text).subarray(0, Math.max(0, this.cap - 4)).toString("utf8") + "\n";
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
    const safe = (text: string, limit = 1200) => safeLiveText(text, limit, privateIdentifiers(req.payload));
    this.enqueue(join(this.logs, "brain-live", req.runId!, "current.txt"),
      `${accepted ? "最终选择与理由" : "!!! 未接受/错误/兜底待后续"} · 题 ${safe(req.questionId ?? "?", 100)} · 总耗时 ${ms} ms
${safe(error ?? (JSON.stringify(answer) ?? "无答案"))}
`);
  }

  begin(req: BrainRequest, engine: string, model: string, effort: string, fallback: boolean): { observe: BrainObserver; finish: (answer: unknown, error?: string) => void } {
    const file = /^[0-9A-Z]{12}$/.test(req.runId ?? "") ? join(this.logs, "brain-live", req.runId!, "current.txt") : "";
    const privateValues = privateIdentifiers(req.payload);
    const safe = (text: string, limit?: number) => safeLiveText(text, limit, privateValues);
    const emit = (text: string) => { if (file) this.enqueue(file, `${text}\n`); };
    const buffers = { text: "", reasoning: "" };
    const counts = { text: 0, reasoning: 0 };
    const droppedSegment = { text: false, reasoning: false };
    const sensitiveQuote: { text?: string; reasoning?: string } = {};
    let closed = false;
    const prefix = (kind: "text" | "reasoning") => kind === "text" ? "正文" : "推理摘要";
    emit(`\n${new Date().toISOString()} · F${floor(req.payload)} · ${safe(req.label, 100)} · 题 ${safe(req.questionId ?? "?", 100)}\n${safe(engine)} / ${safe(model)} · 请求强度 ${safe(effort)}${fallback ? " · !!! 兜底" : ""}${req.reask ? " · 重问" : ""}\n题面（截断）：${safe(req.question, 160)}`);
    const delta = (kind: "text" | "reasoning", value: string) => {
      // Sentence boundaries prevent split credentials/identifiers from leaking across writes. Unfinished long spans
      // show progress counts; no prefix of an unknown token is written. No hidden/internal chain-of-thought API is used.
      const chunks = value.slice(0, 64 * 1024).split(/([\n。！？；])/u);
      for (const part of chunks) {
        if (sensitiveQuote[kind]) {
          if (part.includes(sensitiveQuote[kind]!)) sensitiveQuote[kind] = undefined;
          continue;
        }
        if (/^[\n。！？；]$/u.test(part)) {
          const openSensitive = /["']?[\w.-]*(?:key|token|secret|password|authorization|cookie)[\w.-]*["']?\s*[:=]\s*(["'])[^"']*$/i.exec(buffers[kind]);
          if (openSensitive) sensitiveQuote[kind] = openSensitive[1];
          if (!droppedSegment[kind] && buffers[kind]) emit(`${prefix(kind)}：${safe(buffers[kind] + part)}`);
          buffers[kind] = ""; droppedSegment[kind] = false;
        } else if (!droppedSegment[kind]) {
          buffers[kind] += part;
          if (buffers[kind].length > 4096) { buffers[kind] = ""; droppedSegment[kind] = true; emit(`${prefix(kind)}：[超长段折叠，继续接收]`); }
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
        else if (event.kind === "tool-start") emit(`工具开始 ${safe(event.name, 100)} (${safe(params(event.input), 240)})`);
        else if (event.kind === "tool-end") emit(`${event.isError ? "!!! 工具错误" : "工具返回"} ${safe(event.name, 100)} → ${Buffer.byteLength(event.output)} B · ${event.ms} ms · 摘要 ${safe(event.output, 180)}`);
        else if ("text" in event) emit(`${event.kind === "error" ? "!!! 错误/卡住/超时" : "状态"} ${safe(event.text, 240)}`);
      },
      finish: (answer, error) => {
        if (closed) return;
        closed = true;
        for (const kind of ["reasoning", "text"] as const) if (!droppedSegment[kind] && buffers[kind]) emit(`${prefix(kind)}：${safe(buffers[kind])}`);
        if (error) emit(`!!! 错误/卡住/超时 ${safe(error, 240)}`);
        else emit(`本次尝试答案与理由：${safe(JSON.stringify(answer) ?? "无有效答案", 1200)}`);
      },
    };
  }
}

/** Interactive learner transport. The scheduler owns the supervisor; the pane owns only this batch's TUI. */
import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, fsyncSync, openSync, readFileSync, readdirSync, readSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { composerState, runCommand, type HerdrResult } from "../../ops/codex/herdr.js";
import { findRollout } from "./summary.js";
import { configTomlProblems } from "../../agent/src/brain/engines/codex-session.js";
import { learnerInteractiveArgs, shellQuote, type EngineRequest } from "./engines.js";
import type { StartupLease } from "./startup-recovery.js";

type Row = { timestamp?: string; type?: string; payload?: Record<string, unknown> };
const TRANSIENT = /at capacity|rate.?limit|stream disconnected|reconnecting|error sending request/i;
const ACCEPTANCE_WARN_MS = 120_000;
const ACCEPTANCE_TIMEOUT_MS = 600_000;
const queuedInputs = (screen: string): boolean => /^[^\w\n]*Queued follow-up inputs\b/m.test(screen.replace(/\u001b\[[0-9;]*m/g, ""));
const emptyComposer = (screen: string): boolean => composerState(screen) === "empty" && !queuedInputs(screen);
const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));
const textOf = (row: Row): string => {
  const p = row.payload ?? {};
  if (row.type === "event_msg" && p.type === "user_message") return String(p.message ?? "");
  if (row.type === "response_item" && p.type === "message" && p.role === "user") {
    return (Array.isArray(p.content) ? p.content : []).map((part: { text?: unknown }) => String(part.text ?? "")).join("\n");
  }
  return "";
};

/** Partial rows wait for a newline; reads and retained memory are bounded independently of session size. */
export class NativeRows {
  private offset = 0;
  atEnd(file: string): boolean { return this.offset >= statSync(file).size; }
  settled(file: string): boolean { return this.atEnd(file) && !this.partial; }
  private partial = "";
  read(file: string): Row[] {
    const fd = openSync(file, "r");
    try {
      if (statSync(file).size < this.offset) throw new Error("native rollout truncated");
      const chunk = Buffer.alloc(256 * 1024);
      const bytes = readSync(fd, chunk, 0, chunk.length, this.offset);
      this.offset += bytes;
      // Buffer partial UTF-8 bytes, not decoded replacement characters.
      this.partial += chunk.subarray(0, bytes).toString("latin1");
      if (this.partial.length > 16 * 1024 * 1024) throw new Error("native row exceeds 16 MiB");
      const lines = this.partial.split("\n");
      this.partial = lines.pop()!;
      return lines.filter(Boolean).map((line) => JSON.parse(Buffer.from(line, "latin1").toString("utf8")) as Row);
    } finally { closeSync(fd); }
  }
}

export interface PromptProof { marker: string; prompt_sha256?: string }
export interface TurnBinding { turn_id: string; marker: string; prompt_sha256: string }
export interface NativePreludeProof { turn_id: string; cwd: string; sha256: string }
export interface NativeEnvironmentProof {
  session: string; turn_id: string; cwd: string; timestamp: string; message_id: string;
  current_date: string; timezone: string; filesystem_sha256: string; sha256: string;
}
const promptHash = (text: string): string => createHash("sha256").update(text.replace(/\r\n/g, "\n").trimEnd()).digest("hex");

interface EnvironmentProfile { date: string; timezone: string; filesystem: string; timestamp: number }
function nativeEnvironmentSource(row: Row, turn: string, bootstrap = false): boolean {
  const p = row.payload ?? {}, meta = p.internal_chat_message_metadata_passthrough as Record<string, unknown> | undefined;
  if (typeof p.id !== "string" || p.id.length !== 40 || !/^msg_[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(p.id) ||
      Object.keys(p).sort().join(",") !== "content,id,internal_chat_message_metadata_passthrough,role,type" || !meta ||
      Object.keys(meta).sort().join(",") !== "content_item_kinds,content_item_metadata,create_time,turn_id" ||
      meta.turn_id !== turn || typeof meta.create_time !== "number" || !Number.isFinite(meta.create_time) ||
      Math.floor(meta.create_time * 1000) !== Date.parse(row.timestamp ?? "")) return false;
  const kinds = bootstrap ? ["agents_md.instructions", "environments.environment_context"] : ["environments.environment_context"];
  const sources = bootstrap ? ["agents_md", "harness"] : ["harness"];
  const items = meta.content_item_metadata;
  return JSON.stringify(meta.content_item_kinds) === JSON.stringify(kinds) && Array.isArray(items) && items.length === sources.length &&
    items.every((item, at) => item && Object.keys(item).join(",") === "provenance" && item.provenance &&
      Object.keys(item.provenance).sort().join(",") === (sources[at] === "harness" ? "hook,type" : "type") &&
      item.provenance.type === sources[at] && (sources[at] !== "harness" || item.provenance.hook === false));
}
/** Match only the native managed/restricted grammar. No XML entities, free text or unknown tags. */
function restrictedFilesystem(xml: string, cwd: string): boolean {
  if (/[<>&\r\n]/.test(cwd) || Buffer.byteLength(xml) > 64 * 1024) return false;
  const prefix = `<filesystem><workspace_roots><root>${cwd}</root></workspace_roots><permission_profile type="managed"><file_system type="restricted" glob_scan_max_depth="`;
  if (!xml.startsWith(prefix)) return false;
  const rest = /^[0-9]{1,3}">(.+)<\/file_system><\/permission_profile><\/filesystem>$/.exec(xml.slice(prefix.length));
  if (!rest) return false;
  const body = rest[1]!;
  const entry = /<entry access="(?:read|write|deny)"(?: escalatable="false")?><(path|glob|special)>([^<>&\x00-\x1f]+)<\/\1><\/entry>/gy;
  let at = 0;
  while (at < body.length) {
    entry.lastIndex = at;
    const match = entry.exec(body);
    if (!match || (match[1] === "special" ? ![":root", ":slash_tmp", ":tmpdir"].includes(match[2]!) : !match[2]!.startsWith("/"))) return false;
    at = entry.lastIndex;
  }
  return at > 0;
}
function environmentProfile(text: string, timestamp: unknown, cwd: string, bootstrap = false): EnvironmentProfile | undefined {
  if (typeof timestamp !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(timestamp)) return undefined;
  const millis = Date.parse(timestamp);
  if (!Number.isFinite(millis) || new Date(millis).toISOString() !== timestamp) return undefined;
  const start = `<environment_context>\n${bootstrap ? `  <cwd>${cwd}</cwd>\n  <shell>bash</shell>\n` : ""}`;
  if (!text.startsWith(start)) return undefined;
  const fields = /^  <current_date>(\d{4}-\d{2}-\d{2})<\/current_date>\n  <timezone>([A-Za-z0-9_+./-]{1,64})<\/timezone>\n  (<filesystem>[^\r\n]+<\/filesystem>)\n<\/environment_context>$/.exec(text.slice(start.length));
  if (!fields || fields[0] !== text.slice(start.length) || !restrictedFilesystem(fields[3]!, cwd)) return undefined;
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: fields[2], year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(millis);
    const value = (kind: string) => parts.find((part) => part.type === kind)?.value;
    if (`${value("year")}-${value("month")}-${value("day")}` !== fields[1]) return undefined;
  } catch { return undefined; }
  return { date: fields[1]!, timezone: fields[2]!, filesystem: fields[3]!, timestamp: millis };
}
const policyIdentity = (p: Record<string, unknown>): string => {
  const sorted = (value: unknown): unknown => Array.isArray(value) ? value.map(sorted) : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sorted(item)])) : value;
  return JSON.stringify(sorted([p.approval_policy ?? null, p.sandbox_policy ?? null]));
};

/** Herdr names are limited to 32 ASCII characters; labels and scheduler keys remain complete. */
export function learnerAgentName(label: string, pane: string, cwd: string): string {
  return `learner-${createHash("sha256").update(JSON.stringify([label, pane, resolve(cwd)])).digest("hex").slice(0, 24)}`;
}

/** Codex 0.163 bootstrap is one two-part user item before turn_context, never an event user message. */
function bootstrapContext(row: Row, cwd: string): boolean {
  const p = row.payload;
  if (row.type !== "response_item" || p?.type !== "message" || p.role !== "user" || !Array.isArray(p.content) || p.content.length !== 2) return false;
  if (!p.content.every((part) => part?.type === "input_text" && typeof part.text === "string")) return false;
  const [instructions, environment] = p.content.map((part) => (part.text as string).replace(/\r\n/g, "\n"));
  return instructions!.startsWith(`# AGENTS.md instructions for ${cwd}\n\n<INSTRUCTIONS>\n`) &&
    instructions!.endsWith("\n</INSTRUCTIONS>") && instructions!.split("</INSTRUCTIONS>").length === 2 &&
    environment!.startsWith("<environment_context>\n") && environment!.endsWith("\n</environment_context>") &&
    environment!.split("<environment_context>").length === 2 && environment!.split("<cwd>").length === 2 &&
    /^<environment_context>\n[ \t]*<cwd>([^<\n]+)<\/cwd>\n/.exec(environment!)?.[1] === cwd;
}

/** Each turn needs its own one-use, explicitly sent prompt proof; authorization never carries across turns. */
export class NativeBatch {
  session?: string;
  cwd?: string;
  accepted = false;
  turn?: string;
  currentTurn?: string;
  foreignActivity = false;
  open = false;
  complete = false;
  aborted = false;
  message = "";
  error = "";
  progress = 0;
  usage?: Record<string, unknown>;
  readonly submissions: PromptProof[] = [];
  readonly bindings: TurnBinding[] = [];
  readonly preludes: NativePreludeProof[] = [];
  readonly environmentUpdates: NativeEnvironmentProof[] = [];
  private environment?: EnvironmentProfile;
  private policy?: string;
  private restrictedPolicy = false;
  private environmentIds = new Set<string>();
  private pendingPrelude?: NativePreludeProof;
  private contextSeen = false;
  private pending = new Map<string, PromptProof>();
  private seenTurns = new Set<string>();
  hasPending(): boolean { return this.pending.size > 0; }
  private usageByTurn = new Map<string, Record<string, unknown>>();
  constructor(readonly marker: string) { this.expectPrompt(marker); }
  expectPrompt(marker: string, text?: string): void {
    this.expectProof({ marker, ...(text === undefined ? {} : { prompt_sha256: promptHash(text) }) });
  }
  expectProof(value: PromptProof): void {
    const { marker } = value;
    if (value.prompt_sha256 !== undefined && !/^[a-f0-9]{64}$/.test(value.prompt_sha256)) throw new Error("invalid learner prompt hash");
    if (this.bindings.some((binding) => binding.marker === marker)) throw new Error("cannot resend a consumed learner marker");
    const proof = { ...value };
    const old = this.submissions.findIndex((item) => item.marker === marker);
    if (old >= 0) this.submissions[old] = proof; else this.submissions.push(proof);
    this.pending.set(marker, proof);
  }
  totalUsage(): Record<string, number> | undefined {
    if (!this.usageByTurn.size) return undefined;
    const total: Record<string, number> = {};
    for (const usage of this.usageByTurn.values()) for (const [key, value] of Object.entries(usage)) {
      if (typeof value === "number" && Number.isFinite(value)) total[key] = (total[key] ?? 0) + value;
    }
    return total;
  }
  feed(row: Row): void {
    const p = row.payload ?? {};
    if (row.type === "session_meta") {
      if (this.session && (this.session !== p.id || this.cwd !== p.cwd)) this.foreignActivity = true;
      this.session = String(p.id ?? ""); this.cwd = String(p.cwd ?? "");
    }
    if (row.type === "event_msg" && p.type === "task_started") {
      this.currentTurn = String(p.turn_id ?? "");
      if (!this.currentTurn || this.seenTurns.has(this.currentTurn) || !this.hasPending()) this.foreignActivity = true;
      this.seenTurns.add(this.currentTurn);
      this.open = true; this.accepted = false;
      if (this.pendingPrelude) this.foreignActivity = true;
      this.contextSeen = false;
      this.complete = false; this.aborted = false; this.message = ""; this.error = ""; this.usage = undefined;
    }
    if (row.type === "turn_context") {
      if (!this.currentTurn || p.turn_id !== this.currentTurn || !this.cwd || p.cwd !== this.cwd) this.foreignActivity = true;
      const policy = policyIdentity(p);
      if (this.policy !== undefined && this.policy !== policy) this.foreignActivity = true;
      this.policy = policy;
      const sandbox = p.sandbox_policy as Record<string, unknown> | undefined;
      this.restrictedPolicy = p.approval_policy === "never" && sandbox?.type === "workspace-write" && sandbox.network_access === false;
      this.contextSeen = true;
      if (this.pendingPrelude) {
        if (!this.foreignActivity) this.preludes.push(this.pendingPrelude);
        this.pendingPrelude = undefined;
      }
    }
    const user = textOf(row);
    if ((row.type === "event_msg" && p.type === "user_message") ||
        (row.type === "response_item" && p.type === "message" && p.role === "user")) {
      if (!this.foreignActivity && this.session && this.cwd && this.currentTurn && this.seenTurns.size === 1 &&
          !this.bindings.length && !this.preludes.length && !this.pendingPrelude && !this.contextSeen && bootstrapContext(row, this.cwd)) {
        this.pendingPrelude = { turn_id: this.currentTurn, cwd: this.cwd, sha256: promptHash(user) };
        this.environment = nativeEnvironmentSource(row, this.currentTurn, true)
          ? environmentProfile(String((p.content as { text: string }[])[1]!.text).replace(/\r\n/g, "\n"), row.timestamp, this.cwd, true) : undefined;
        if (this.environment) this.environmentIds.add(p.id as string);
        return; // Staged context alone never accepts a task; the matching turn_context must precede the exact prompt.
      }
      if (!this.foreignActivity && this.accepted && this.open && !this.complete && !this.aborted &&
          this.session && this.cwd && this.turn === this.currentTurn && this.contextSeen &&
          this.environment && this.restrictedPolicy && row.type === "response_item" && p.type === "message" && p.role === "user" &&
          Array.isArray(p.content) && p.content.length === 1 && p.content[0]?.type === "input_text" && typeof p.content[0].text === "string" &&
          Object.keys(p.content[0]).sort().join(",") === "text,type" && nativeEnvironmentSource(row, this.turn!) &&
          !this.environmentIds.has(p.id as string) && this.environmentIds.size < 1024) {
        const update = environmentProfile(p.content[0].text.replace(/\r\n/g, "\n"), row.timestamp, this.cwd);
        const days = update ? (Date.parse(update.date) - Date.parse(this.environment.date)) / 86_400_000 : -1;
        if (update && update.timezone === this.environment.timezone && update.filesystem === this.environment.filesystem &&
            update.timestamp >= this.environment.timestamp && (days === 0 || days === 1)) {
          this.environment = update;
          this.environmentIds.add(p.id as string);
          this.environmentUpdates.push({ session: this.session, turn_id: this.turn!, cwd: this.cwd, timestamp: row.timestamp!, message_id: p.id as string,
            current_date: update.date, timezone: update.timezone, filesystem_sha256: promptHash(update.filesystem), sha256: promptHash(user) });
          return; // Metadata never consumes a prompt, starts a turn, or grants new task authority.
        }
      }
      const marker = user.replace(/\r\n/g, "\n").split("\n")[0]!;
      const hash = promptHash(user);
      const existing = this.bindings.find((binding) => binding.turn_id === this.currentTurn);
      const expected = this.pending.get(marker);
      if (this.pendingPrelude) { this.accepted = false; this.foreignActivity = true; }
      else if (existing?.marker === marker && existing.prompt_sha256 === hash) {
        this.accepted = !this.foreignActivity; // duplicate event_msg / response_item for the same native message
      } else if (!existing && this.currentTurn && expected && (!expected.prompt_sha256 || expected.prompt_sha256 === hash)) {
        this.turn = this.currentTurn; this.accepted = !this.foreignActivity;
        this.bindings.push({ turn_id: this.turn, marker, prompt_sha256: hash }); this.pending.delete(marker);
      } else { this.accepted = false; this.foreignActivity = true; }
    }
    // Cover the entire active turn before its dispatched prompt, including before any bootstrap item.
    if (this.currentTurn && !this.accepted &&
        row.type === "response_item" && (/_call(?:_output)?$/.test(String(p.type)) || p.type === "reasoning" ||
          (p.type === "message" && p.role === "assistant"))) this.foreignActivity = true;
    if (!this.accepted || this.currentTurn !== this.turn || this.foreignActivity) {
      if (row.type === "event_msg" && ["task_complete", "turn_aborted"].includes(String(p.type)) && p.turn_id === this.currentTurn) {
        this.open = false; this.foreignActivity = true;
      }
      return;
    }
    if (row.type === "response_item" && /^(function_call|custom_tool_call|local_shell_call)$/.test(String(p.type))) this.progress++;
    if (row.type === "event_msg" && p.type === "error") this.error = String(p.message ?? p.error ?? "native error");
    if (row.type === "token_usage_record" && p.turn_id === this.turn) {
      this.usage = (p.turn_token_usage ?? p.usage) as Record<string, unknown> | undefined;
      if (this.usage) this.usageByTurn.set(this.turn!, this.usage);
    }
    if (row.type !== "event_msg" || p.turn_id !== this.turn) return;
    if (p.type === "turn_aborted") { this.open = false; this.aborted = true; }
    if (p.type === "task_complete") {
      this.open = false; this.complete = true;
      this.message = typeof p.last_agent_message === "string" ? p.last_agent_message : "";
    }
  }
  successful(): boolean {
    return this.accepted && !this.hasPending() && !this.foreignActivity && this.currentTurn === this.turn && this.complete && !this.open &&
      !this.aborted && !!this.message.trim() && !this.error && !TRANSIENT.test(this.message);
  }
}

/** Persist only the role's explicit path/locale settings, never arbitrary inherited environment values. */
export function learnerTuiEnv(env: Record<string, string>): Record<string, string> {
  const names = ["HOME", "PATH", "LANG", "LC_ALL", "LC_CTYPE", "TMPDIR", "TMP", "TEMP", "TERM", "COLORTERM", "CODEX_HOME", "RUST_LOG",
    "STS2_CODEX_LEARNER_BIN", "STS2_CODEX_FAST_BIN", "STS2_WORKSPACE", "STS2_LIVE", "STS2_ROOT", "STS2_LOGS_DIR",
    "CODEX_OPS_ROOT", "CODEX_OPS_DIR", "LEARNER_BASE_REF", "LEARNER_BATCH_ID", "LEARNER_STATE_FILE", "LEARNER_CODEX_HOME",
    "CHARACTER", "TARGET_ASCENSION", "WSL_INTEROP", "WSL_DISTRO_NAME", "SYSTEMROOT", "SSL_CERT_FILE", "SSL_CERT_DIR", "NODE_EXTRA_CA_CERTS", "REQUESTS_CA_BUNDLE"];
  const out = Object.fromEntries(names.filter((key) => env[key] !== undefined).map((key) => [key, env[key]!]));
  // Herdr provides an ANSI terminal even when a noninteractive dispatcher inherits TERM=dumb.
  // Prevent Codex's pre-TUI confirmation; never answer a startup dialog with task input.
  if (!out.TERM?.trim() || out.TERM.trim().toLowerCase() === "dumb") out.TERM = "xterm-256color";
  for (const key of ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"]) {
    if (!env[key]) continue;
    const url = new URL(env[key]);
    if (url.username || url.password || url.search || url.hash) throw new Error("credential-bearing proxy cannot be persisted in a TUI launcher");
    out[key] = env[key]!;
  }
  for (const key of ["NO_PROXY", "no_proxy"]) if (env[key]) out[key] = env[key]!;
  return out;
}

/** TUI lacks exec's --ignore-user-config/--ignore-rules; reject inherited context/tools instead of weakening isolation. */
export function learnerTuiConfigSafe(request: EngineRequest, home: string): boolean {
  const files = new Set([join(home, "config.toml")]);
  let dir = resolve(request.cwd);
  const stop = resolve(request.projectRoot);
  for (;;) {
    files.add(join(dir, ".codex", "config.toml"));
    const parent = dirname(dir);
    if (dir === stop || parent === dir) break;
    dir = parent;
  }
  try {
    for (const file of files) if (existsSync(file) && (statSync(file).size > 64 * 1024 || configTomlProblems(readFileSync(file, "utf8")).length)) return false;
    return true;
  } catch { return false; }
}

function candidates(home: string, since: number): string[] {
  const list = (dir: string): string[] => { try { return readdirSync(dir).sort().reverse(); } catch { return []; } };
  const root = join(home, "sessions");
  const files: string[] = [];
  // Only recent date directories; never scan old session bodies or credentials.
  for (const year of list(root).slice(0, 2)) for (const month of list(join(root, year)).slice(0, 2)) {
    for (const day of list(join(root, year, month)).slice(0, 3)) {
      for (const name of list(join(root, year, month, day))) {
        if (!name.endsWith(".jsonl")) continue;
        const path = join(root, year, month, day, name);
        if (statSync(path).mtimeMs >= since) files.push(path);
      }
    }
  }
  return files;
}

function birth(pid: number): string | undefined {
  try {
    const raw = readFileSync(`/proc/${pid}/stat`, "utf8");
    const fields = raw.slice(raw.lastIndexOf(")") + 2).split(" ");
    return ["Z", "X"].includes(fields[0]!) ? undefined : fields[19];
  } catch { return undefined; }
}

export interface TuiOptions {
  request: EngineRequest;
  command: string;
  prompt: string;
  env: Record<string, string>;
  pane: string;
  label: string;
  scratch: string;
  receipt: string;
  codexHome: string;
  timeoutMs?: number;
  lease?: StartupLease;
  log: (event: Record<string, unknown>) => void;
  attention: (reason: string) => void;
  /** Test-only clocks and transport; production uses the installed herdr CLI and ten-minute retry. */
  h?: (args: string[]) => Promise<HerdrResult>;
  now?: () => number;
  pause?: (ms: number) => Promise<void>;
  pollMs?: number;
  retryMs?: number;
}
export interface TuiResult {
  code: number;
  reason: string;
  session?: string;
  turn?: string;
  rollout?: string;
  message: string;
  usage?: Record<string, unknown>;
  error?: string;
  stopped: boolean;
}

/** Never retry a start or an uncertain prompt. Every retry continues the same live native session. */
export async function runLearnerTui(o: TuiOptions): Promise<TuiResult> {
  const h = o.h ?? ((args: string[]) => runCommand(o.env.HERDR_BIN || "herdr", args, 20_000, o.env));
  const readScreen = () => h(["pane", "read", o.pane, "--source", "visible", "--format", "ansi"]);
  let originalHostTitle: string | undefined;
  const paneSnapshot = async (): Promise<Record<string, unknown> | undefined> => {
    const info = await h(["pane", "get", o.pane]);
    const pane = info.result?.pane as Record<string, unknown> | undefined;
    if (!info.ok || pane?.pane_id !== o.pane) return undefined;
    if (pane.label === o.label) return pane;
    if (pane.label !== undefined || !o.lease?.current() ||
        [pane.workspace_id, pane.tab_id, pane.terminal_id].some((id) => typeof id !== "string" || !id)) return undefined;
    // Current Herdr exposes labels on tabs, while older receipts included pane.label.
    // Require the original host registration and exact tab title; never invent a pane label.
    try {
      const directory = resolve(o.request.projectRoot ?? o.request.cwd, o.env.CODEX_OPS_DIR ?? "ops/codex-ops");
      const host = JSON.parse(readFileSync(join(directory, "herdr.json"), "utf8"));
      const entry = host.panes?.[o.label];
      if (host.workspace_id !== pane.workspace_id || entry?.pane_id !== o.pane || typeof entry.title !== "string" ||
          !entry.title || (originalHostTitle !== undefined && originalHostTitle !== entry.title)) return undefined;
      const tabs = await h(["tab", "list", "--workspace", String(pane.workspace_id)]);
      const matches = (tabs.result?.tabs as Record<string, unknown>[] | undefined)?.filter((tab) => tab.tab_id === pane.tab_id);
      if (!tabs.ok || matches?.length !== 1 || matches[0]!.label !== entry.title || matches[0]!.pane_count !== 1) return undefined;
      originalHostTitle = entry.title;
      return pane;
    } catch { return undefined; }
  };
  const unstarted = async (reason: string): Promise<TuiResult> => {
    const result: TuiResult = { code: 3, reason, message: "", stopped: true };
    let identity: Record<string, unknown> | undefined;
    if (/^[A-Za-z0-9]+:p[A-Za-z0-9]+$/.test(o.pane) && /^learner-[a-z0-9-]+$/.test(o.label) && o.lease?.current()) {
      try {
        identity = await paneSnapshot();
      } catch { /* Missing identity is preserved as missing evidence for the independent recycler. */ }
    }
    writeFileSync(o.receipt, JSON.stringify({ state: "not-started", models_started: 0, result,
      pane: o.pane, label: o.label, cwd: o.request.cwd, identity, submitted: false,
      submissions: [], bindings: [], retirement_authorized: false }) + "\n", { mode: 0o600 });
    const fd = openSync(o.receipt, "r"); try { fsyncSync(fd); } finally { closeSync(fd); }
    o.attention("learner TUI initialization refused before model startup; inspect original local settings");
    return result;
  };
  if (!learnerTuiConfigSafe(o.request, o.codexHome)) return unstarted("inherited-tui-config-not-isolated");
  let tuiEnv: Record<string, string>;
  try { tuiEnv = learnerTuiEnv(o.env); } catch { return unstarted("unsafe-tui-environment"); }
  if (!/^[A-Za-z0-9]+:p[A-Za-z0-9]+$/.test(o.pane) || !/^learner-[a-z0-9-]+$/.test(o.label)) return unstarted("invalid-pane-identity");
  const agentName = learnerAgentName(o.label, o.pane, o.request.cwd);
  const now = o.now ?? Date.now;
  const pause = o.pause ?? sleep;
  const started = now();
  const marker = `[learner-batch:${randomUUID()}]`;
  const native = new NativeBatch(marker);
  if (o.request.resumeThread) { native.session = o.request.resumeThread; native.cwd = o.request.cwd; }
  const before = new Set(candidates(o.codexHome, started - 2000));
  const readers = new Map<string, { reader: NativeRows; batch: NativeBatch }>();
  let rollout = o.request.resumeThread ? findRollout(o.codexHome, o.request.resumeThread) : undefined;
  if (rollout) {
    // Resume reads historical rows only to the initial EOF; old completions never satisfy this dispatch.
    const reader = new NativeRows();
    while (!reader.atEnd(rollout)) reader.read(rollout);
    readers.set(rollout, { reader, batch: native });
  }
  const pidfile = join(o.scratch, "tui.pid");
  const script = join(o.scratch, "tui.sh");
  const promptFile = join(o.scratch, "tui-prompt.txt");
  const prompt = `${marker}\n${o.prompt}`;
  writeFileSync(promptFile, prompt, { mode: 0o600 });
  const sentPrompt = Buffer.byteLength(prompt) <= 96 * 1024 ? prompt
    : `${marker}\n请先完整读取 ${JSON.stringify(promptFile)} 中的原始任务提示词，再按其执行本批任务；不要省略其中的验收和产物要求。`;
  native.expectPrompt(marker, sentPrompt);
  const argv = [o.command, ...learnerInteractiveArgs(o.request)];
  // env -i prevents the pane server's credentials/config environment from leaking into the learner.
  writeFileSync(script, `#!/bin/bash\numask 077\nprintf '%s\\n' "$$" > ${shellQuote([pidfile])}\ncd ${shellQuote([o.request.cwd])} || exit 2\nexec ${shellQuote(["env", "-i", ...Object.entries(tuiEnv).map(([k, v]) => `${k}=${v}`), "nice", "-n", "19", ...argv])}\n`, { mode: 0o700 });
  let pid: number | undefined;
  let ownerBirth: string | undefined;
  let submitted = false;
  let submittedAt: number | undefined;
  let delayedMarker: string | undefined;
  let pendingMarker = marker;
  let cancelled = false;
  let uncertain = false;
  let startConfirmed = false;
  let ownershipLost = false;
  let continuation = 0;
  let retirementAuthorized = false;
  let persistedBindings = 0;
  let persistedUpdates = 0;
  let alerted = false;
  let retries = 0;
  let progress = 0;
  let retryAt: number | undefined;
  let result: TuiResult = { code: 1, reason: "startup-failed", message: "", stopped: false };
  const identity = await paneSnapshot();
  if (!identity) return unstarted("pane-identity-changed-before-startup");
  const samePane = async (): Promise<boolean> => {
    const pane = await paneSnapshot();
    return !!pane && pane.pane_id === o.pane && pane.tab_id === identity.tab_id &&
      pane.terminal_id === identity.terminal_id && pane.workspace_id === identity.workspace_id;
  };
  const save = (state: string, extra: Record<string, unknown> = {}): void => {
    writeFileSync(o.receipt, JSON.stringify({ state, pane: o.pane, label: o.label, identity, pid, birth: ownerBirth,
      agent_name: agentName, agent_name_version: 1,
      native_context_version: 1, native_preludes: native.preludes,
      native_environment_version: 1, native_environment_updates: native.environmentUpdates,
      session: native.session, cwd: o.request.cwd, rollout, turn: native.turn, submitted, retries,
      native_acceptance_warn_at_ms: submittedAt === undefined ? undefined : submittedAt + ACCEPTANCE_WARN_MS,
      native_acceptance_deadline_ms: submittedAt === undefined ? undefined : submittedAt + ACCEPTANCE_TIMEOUT_MS,
      submissions: native.submissions, bindings: native.bindings, retirement_authorized: retirementAuthorized, ...extra }) + "\n", { mode: 0o600 });
    const fd = openSync(o.receipt, "r"); try { fsyncSync(fd); } finally { closeSync(fd); }
  };
  const attention = (reason: string): void => { if (!alerted) { alerted = true; o.attention(reason); } };
  const readNative = (): void => {
    for (const file of rollout ? [rollout] : candidates(o.codexHome, started - 2000).filter((f) => !before.has(f))) {
      let entry = readers.get(file);
      if (!entry) {
        const batch = new NativeBatch(marker); batch.expectPrompt(marker, sentPrompt);
        entry = { reader: new NativeRows(), batch }; readers.set(file, entry);
      }
      for (const row of entry.reader.read(file)) {
        entry.batch.feed(row);
        if (file === rollout && native.accepted && native.bindings.at(-1)?.marker === pendingMarker && startConfirmed && !ownershipLost) uncertain = false;
        if (!rollout && entry.batch.accepted && entry.batch.cwd === o.request.cwd && entry.batch.session) {
          rollout = file;
          Object.assign(native, entry.batch);
          entry.batch = native;
          o.log({ type: "thread.started", thread_id: native.session });
          o.log({ type: "learner_tui_session", pane: o.pane, rollout, marker, session: native.session });
          // A native matching user message resolves an uncertain submission receipt.
          if (startConfirmed && !ownershipLost) uncertain = false;
        }
        if (file === rollout) {
          o.log(row as Record<string, unknown>);
          if (o.request.resumeThread && native.accepted && !native.session) native.session = o.request.resumeThread;
          if (native.accepted && !native.foreignActivity && (native.bindings.length > persistedBindings || native.environmentUpdates.length > persistedUpdates)) {
            persistedBindings = native.bindings.length;
            persistedUpdates = native.environmentUpdates.length;
            save("native-accepted"); // Persist consumption while the original task is still running, not only at retirement.
          }
        }
      }
    }
  };
  const promptAllowed = async (bound: boolean, allowUnnamed = false): Promise<boolean> => {
    if (!startConfirmed || uncertain || ownershipLost || !o.lease?.current() || !pid || !ownerBirth || !(await samePane())) return false;
    const info = await h(["pane", "process-info", "--pane", o.pane]);
    const p = info.result?.process_info as Record<string, unknown> | undefined;
    const agentInfo = await h(["agent", "get", o.pane]);
    const agent = agentInfo.result?.agent as Record<string, unknown> | undefined;
    const screen = await readScreen();
    readNative();
    return info.ok && p?.foreground_process_group_id === pid && birth(pid) === ownerBirth &&
      agentInfo.ok && agent?.agent === "codex" && agent.pane_id === o.pane && agent.foreground_cwd === o.request.cwd &&
      (agent.name === agentName || (allowUnnamed && [undefined, ""].includes(agent.name as string | undefined))) &&
      ["idle", "done"].includes(String(agent.agent_status)) &&
      screen.ok && emptyComposer(screen.stdout) && !native.foreignActivity &&
      (!bound || (native.accepted && !native.hasPending() && native.currentTurn === native.turn)) &&
      (!rollout || readers.get(rollout)!.reader.settled(rollout)) && !!o.lease?.current();
  };
  const onSignal = (): void => { cancelled = true; };
  process.once("SIGINT", onSignal); process.once("SIGTERM", onSignal);
  try {
    const info = await h(["pane", "process-info", "--pane", o.pane]);
    const p = info.result?.process_info as Record<string, unknown> | undefined;
    if (!p || p.shell_pid !== p.foreground_process_group_id) throw new Error("learner pane is not an idle shell");
    save("starting"); // journal before the external action
    const start = await h(["pane", "run", o.pane, shellQuote(["bash", script])]);
    startConfirmed = start.ok;
    if (!start.ok) { uncertain = true; attention("TUI start receipt uncertain; inspect the original pane; never start another session"); }
    for (;;) {
      if (!pid && existsSync(pidfile)) {
        const value = Number(readFileSync(pidfile, "utf8").trim());
        if (Number.isSafeInteger(value) && value > 1) { pid = value; ownerBirth = birth(pid); save("started"); }
      }
      if (!(await samePane())) { uncertain = true; attention("learner pane identity changed; original session retained"); break; }
      const agentResult = await h(["agent", "get", o.pane]);
      const agent = agentResult.result?.agent as Record<string, unknown> | undefined;
      const status = String(agent?.agent_status ?? "unknown");
      const screen = await readScreen();
      const idle = agent?.agent === "codex" && ["idle", "done"].includes(status) && screen.ok && emptyComposer(screen.stdout);
      if (!submitted && !uncertain && idle && pid && ownerBirth && birth(pid) === ownerBirth &&
          [undefined, "", agentName].includes(agent?.name as string | undefined) &&
          (agent?.foreground_cwd === undefined || agent.foreground_cwd === o.request.cwd)) {
        if (!(await promptAllowed(false, true))) { ownershipLost = true; attention("learner naming authority changed; keep original session"); break; }
        save("naming"); // persist the complete label -> bounded native name binding before mutation
        const named = await h(["agent", "rename", o.pane, agentName]);
        if (!named.ok) { uncertain = true; attention("learner TUI name receipt uncertain; no task replay"); }
        else {
          if (!(await promptAllowed(false))) { ownershipLost = true; attention("learner prompt authority changed; keep original session"); break; }
          submittedAt = now();
          save("submitting", { prompt_sha256: createHash("sha256").update(prompt).digest("hex") });
          submitted = true;
          const sent = await h(["agent", "prompt", o.pane, sentPrompt]);
          if (!sent.ok) { uncertain = true; attention("learner prompt receipt uncertain; verify native acceptance before any continuation"); }
          save(sent.ok ? "submitted" : "uncertain");
        }
      }
      readNative();
      // Submission and native polling can change the TUI within this iteration. Re-read readiness before any decision.
      const currentAgent = await h(["agent", "get", o.pane]);
      const current = currentAgent.result?.agent as Record<string, unknown> | undefined;
      const currentScreen = await readScreen();
      const finalIdle = current?.agent === "codex" && ["idle", "done"].includes(String(current.agent_status)) &&
        currentScreen.ok && emptyComposer(currentScreen.stdout);
      const caughtUp = !!rollout && readers.get(rollout)!.reader.settled(rollout);
      if (native.accepted && native.progress !== progress) { retries = 0; progress = native.progress; retryAt = undefined; alerted = false; }
      if (!o.lease?.current()) { ownershipLost = true; uncertain = true; attention("learner lease changed; completion and automatic continuation disabled"); break; }
      if (native.foreignActivity) {
        ownershipLost = true; attention("unbound native/human turn; keep original session and supervision"); break;
      }
      // Prompt delivery can return while its paste is still visible and before the native file exists.
      // Observe only: a screen/API receipt cannot bind a turn or authorize any replay or disposal.
      const awaitingNative = submitted && (!native.accepted || native.bindings.at(-1)?.marker !== pendingMarker);
      if (awaitingNative && submittedAt !== undefined && now() - submittedAt >= ACCEPTANCE_WARN_MS && delayedMarker !== pendingMarker) {
        delayedMarker = pendingMarker;
        save("awaiting-native");
        attention("learner native acceptance delayed; observing original session until deadline; no task replay");
      }
      if (awaitingNative && submittedAt !== undefined && now() - submittedAt >= ACCEPTANCE_TIMEOUT_MS) {
        uncertain = true; result.reason = "native-acceptance-timeout";
        attention("learner native acceptance timed out; keep original session; no task replay"); break;
      }
      if (!awaitingNative && currentScreen.ok && queuedInputs(currentScreen.stdout)) {
        ownershipLost = true; attention("queued follow-up inputs; keep original session and supervision"); break;
      }
      if (!awaitingNative && currentScreen.ok && composerState(currentScreen.stdout) === "text") {
        ownershipLost = true; attention("unsent human draft; keep original session and supervision"); break;
      }
      if (native.successful() && finalIdle && caughtUp && !uncertain) { result = { ...result, code: 0, reason: "native-task-complete" }; break; }
      const transient = native.accepted && finalIdle && caughtUp &&
        (TRANSIENT.test(native.error) || TRANSIENT.test(native.message) || (!native.successful() && TRANSIENT.test(currentScreen.stdout.split("\n").slice(-40).join("\n"))));
      if (transient && !uncertain) {
        retryAt ??= now() + (o.retryMs ?? 10 * 60_000);
        save(retries >= 3 ? "needs-attention" : "retry-wait", { retry_at_ms: retryAt });
        if (now() >= retryAt) {
          if (retries >= 3) attention("learner model/network error: three continuations without native tool progress; original session retained for ops/Roy");
          else if (o.lease?.current()) {
            // The actual TUI is idle with a matching error and an empty composer; continue this same session.
            // An error can leave a stale native task_started without task_complete; it is never treated as success.
            if (!(await promptAllowed(true))) { ownershipLost = true; attention("learner continuation authority changed; keep original session"); break; }
            pendingMarker = `${marker}:retry:${++continuation}`;
            const prompt = `${pendingMarker}\n上一轮因模型/网络错误中断，请沿原任务、原批次和已有产物接着做；不要重启或另开会话。`;
            native.expectPrompt(pendingMarker, prompt);
            submittedAt = now();
            save("retry-sending", { next_retry: retries + 1 });
            const sent = await h(["agent", "prompt", o.pane, prompt]);
            retries++; retryAt = undefined;
            uncertain = !sent.ok;
            o.log({ type: "learner_tui_retry", attempt: retries, session: native.session, receipt: sent.ok ? "accepted" : "uncertain" });
            if (uncertain) attention("learner continuation receipt uncertain; no automatic resend");
            save(uncertain ? "uncertain" : "submitted");
          } else { uncertain = true; attention("learner lease changed; automatic continuation disabled"); }
        }
      } else if (native.accepted && !native.open && finalIdle && caughtUp && (native.aborted || native.error || (native.complete && !native.message.trim()))) {
        result.reason = native.aborted ? "turn-aborted" : "native-error"; break;
      }
      if (cancelled || (o.timeoutMs !== undefined && now() - started >= o.timeoutMs)) {
        result.code = cancelled ? 1 : 124; result.reason = cancelled ? "cancelled" : "timeout"; break;
      }
      if (pid && ownerBirth && birth(pid) !== ownerBirth) { result.reason = "tui-exited-without-completion"; break; }
      if (!submitted && now() - started > 120_000) { result.reason = "startup-blocked"; break; }
      await pause(o.pollMs ?? 1000);
    }
  } catch {
    uncertain = true;
    result.reason = "transport-or-native-record-error";
    attention("learner TUI transport/native record failed; inspect original local receipt");
  } finally {
    // Every exit reason and every destructive step uses the same fresh authority/foreground/composer proof.
    const inspectDisposal = async (): Promise<"owned" | "exited" | "denied"> => {
      try {
        if (!startConfirmed || uncertain || ownershipLost || !o.lease?.current() || !pid || !ownerBirth || !(await samePane())) return "denied";
        readNative();
        if (native.foreignActivity || (submitted && (!native.accepted || native.hasPending() || native.currentTurn !== native.turn)) ||
            (rollout && !readers.get(rollout)!.reader.settled(rollout))) return "denied";
        const info = await h(["pane", "process-info", "--pane", o.pane]);
        const p = info.result?.process_info as Record<string, unknown> | undefined;
        if (!info.ok || !p) return "denied";
        const currentBirth = birth(pid);
        if (currentBirth !== ownerBirth) return currentBirth === undefined &&
          [p.shell_pid, pid].includes(p.foreground_process_group_id) ? "exited" : "denied";
        if (p.foreground_process_group_id !== pid) return "denied";
        const agentInfo = await h(["agent", "get", o.pane]);
        const agent = agentInfo.result?.agent as Record<string, unknown> | undefined;
        if (!agentInfo.ok && birth(pid) === undefined) return "exited";
        if (!agentInfo.ok || agent?.agent !== "codex" || agent.pane_id !== o.pane || agent.foreground_cwd !== o.request.cwd ||
            (submitted ? agent.name !== agentName : ![undefined, "", agentName].includes(agent.name as string | undefined)) ||
            !["idle", "done", ...(submitted && native.open ? ["working"] : [])].includes(String(agent.agent_status))) return "denied";
        const screen = await readScreen();
        readNative();
        if (native.foreignActivity || (submitted && (!native.accepted || native.hasPending() || native.currentTurn !== native.turn)) ||
            (rollout && !readers.get(rollout)!.reader.settled(rollout)) || ownershipLost || uncertain || !o.lease?.current()) return "denied";
        if (!screen.ok && birth(pid) === undefined) return "exited";
        if (!screen.ok || !emptyComposer(screen.stdout)) return "denied";
        const finalBirth = birth(pid);
        return finalBirth === ownerBirth ? "owned" : finalBirth === undefined ? "exited" : "denied";
      } catch { return "denied"; }
    };
    try {
      let disposition = await inspectDisposal();
      // Only a live owned process authorizes keys. An exited process authorizes read-only waiting.
      if (disposition === "owned" && birth(pid!) === ownerBirth && native.open) {
        if (!(await h(["agent", "send-keys", o.pane, "esc"])).ok) uncertain = true;
        disposition = await inspectDisposal();
      }
      const until = now() + 10_000;
      while (disposition === "owned" && birth(pid!) === ownerBirth && now() < until) {
        disposition = await inspectDisposal();
        if (disposition !== "owned" || birth(pid!) !== ownerBirth) break;
        if (!(await h(["agent", "send-keys", o.pane, "ctrl+c"])).ok) uncertain = true;
        await pause(o.pollMs ?? 1000);
        disposition = await inspectDisposal();
      }
      if (disposition !== "denied") {
        const shellBy = now() + 10_000;
        do {
          if (!o.lease?.current() || uncertain || ownershipLost || !(await samePane())) break;
          readNative();
          if (native.foreignActivity || (submitted && (!native.accepted || native.hasPending() || native.currentTurn !== native.turn)) ||
              (rollout && !readers.get(rollout)!.reader.settled(rollout))) break;
          const info = await h(["pane", "process-info", "--pane", o.pane]);
          const p = info.result?.process_info as Record<string, unknown> | undefined;
          if (!info.ok || !p) break;
          if (birth(pid!) === undefined && p.shell_pid === p.foreground_process_group_id && o.lease?.current()) {
            result.stopped = true; retirementAuthorized = true; break;
          }
          if (p.foreground_process_group_id !== pid || (birth(pid!) !== undefined && birth(pid!) !== ownerBirth)) break;
          await pause(o.pollMs ?? 1000);
        } while (now() < shellBy);
      }
    } catch {
      uncertain = true; attention("learner retirement observation failed; keep original session and supervision");
    }
    process.removeListener("SIGINT", onSignal); process.removeListener("SIGTERM", onSignal);
  }
  result = { ...result, session: native.session, turn: native.turn, rollout, message: native.message, usage: native.totalUsage(), ...(native.error ? { error: native.error.slice(0, 2000) } : {}) };
  if (!result.stopped) { result.code = 75; result.reason = "retirement-unverified"; attention("learner TUI retirement unverified; finish and reclamation forbidden"); }
  else if (result.code !== 0) attention("learner TUI ended exceptionally; preserve original evidence for ops review");
  save(result.stopped ? "session-ended" : "needs-attention", { result });
  return result;
}

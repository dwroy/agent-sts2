/** Interactive learner transport. The scheduler owns the supervisor; the pane owns only this batch's TUI. */
import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, fsyncSync, openSync, readFileSync, readdirSync, readSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { composerState, runCommand, type HerdrResult } from "../../ops/codex/herdr.js";
import { findRollout } from "./summary.js";
import { configTomlProblems } from "../../agent/src/brain/engines/codex-session.js";
import { learnerInteractiveArgs, shellQuote, type EngineRequest } from "./engines.js";
import type { StartupLease } from "./startup-recovery.js";

type Row = { type?: string; payload?: Record<string, unknown> };
const TRANSIENT = /at capacity|rate.?limit|stream disconnected|reconnecting|error sending request/i;
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

/** Only the marker accepted by this native session binds a completion to this dispatch. */
export class NativeBatch {
  session?: string;
  cwd?: string;
  accepted = false;
  turn?: string;
  open = false;
  complete = false;
  aborted = false;
  message = "";
  error = "";
  progress = 0;
  usage?: Record<string, unknown>;
  private usageByTurn = new Map<string, Record<string, unknown>>();
  totalUsage(): Record<string, number> | undefined {
    if (!this.usageByTurn.size) return undefined;
    const total: Record<string, number> = {};
    for (const usage of this.usageByTurn.values()) for (const [key, value] of Object.entries(usage)) {
      if (typeof value === "number" && Number.isFinite(value)) total[key] = (total[key] ?? 0) + value;
    }
    return total;
  }
  constructor(readonly marker: string) {}
  feed(row: Row): void {
    const p = row.payload ?? {};
    if (row.type === "session_meta") { this.session = String(p.id ?? ""); this.cwd = String(p.cwd ?? ""); }
    if (row.type === "event_msg" && p.type === "task_started") {
      this.turn = String(p.turn_id ?? ""); this.open = true; this.complete = false;
      this.aborted = false; this.message = ""; this.error = ""; this.usage = undefined;
    }
    if (textOf(row).includes(this.marker)) this.accepted = true;
    if (!this.accepted) return;
    if (row.type === "response_item" && /^(function_call|custom_tool_call|local_shell_call)$/.test(String(p.type))) this.progress++;
    if (row.type === "event_msg" && p.type === "error") this.error = String(p.message ?? p.error ?? "native error");
    if (row.type === "token_usage_record" && p.turn_id === this.turn) {
      this.usage = (p.turn_token_usage ?? p.usage) as Record<string, unknown> | undefined;
      if (this.turn && this.usage) this.usageByTurn.set(this.turn, this.usage);
    }
    if (row.type !== "event_msg" || p.turn_id !== this.turn) return;
    if (p.type === "turn_aborted") { this.open = false; this.aborted = true; }
    if (p.type === "task_complete") {
      this.open = false; this.complete = true;
      this.message = typeof p.last_agent_message === "string" ? p.last_agent_message : "";
    }
  }
  successful(): boolean { return this.accepted && this.complete && !this.open && !this.aborted && !!this.message.trim() && !this.error && !TRANSIENT.test(this.message); }
}

/** Persist only the role's explicit path/locale settings, never arbitrary inherited environment values. */
export function learnerTuiEnv(env: Record<string, string>): Record<string, string> {
  const names = ["HOME", "PATH", "LANG", "LC_ALL", "LC_CTYPE", "TMPDIR", "TMP", "TEMP", "TERM", "COLORTERM", "CODEX_HOME", "RUST_LOG",
    "STS2_CODEX_LEARNER_BIN", "STS2_CODEX_FAST_BIN", "STS2_WORKSPACE", "STS2_LIVE", "STS2_ROOT", "STS2_LOGS_DIR",
    "CODEX_OPS_ROOT", "CODEX_OPS_DIR", "LEARNER_BASE_REF", "LEARNER_BATCH_ID", "LEARNER_STATE_FILE", "LEARNER_CODEX_HOME",
    "CHARACTER", "TARGET_ASCENSION", "WSL_INTEROP", "WSL_DISTRO_NAME", "SYSTEMROOT", "SSL_CERT_FILE", "SSL_CERT_DIR", "NODE_EXTRA_CA_CERTS", "REQUESTS_CA_BUNDLE"];
  const out = Object.fromEntries(names.filter((key) => env[key] !== undefined).map((key) => [key, env[key]!]));
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
  const unstarted = (reason: string): TuiResult => {
    const result: TuiResult = { code: 3, reason, message: "", stopped: true };
    writeFileSync(o.receipt, JSON.stringify({ state: "not-started", models_started: 0, result }) + "\n", { mode: 0o600 });
    o.attention("learner TUI initialization refused before model startup; inspect original local settings");
    return result;
  };
  if (!learnerTuiConfigSafe(o.request, o.codexHome)) return unstarted("inherited-tui-config-not-isolated");
  let tuiEnv: Record<string, string>;
  try { tuiEnv = learnerTuiEnv(o.env); } catch { return unstarted("unsafe-tui-environment"); }
  if (!/^[A-Za-z0-9]+:p[A-Za-z0-9]+$/.test(o.pane) || !/^learner-[a-z0-9-]+$/.test(o.label)) return unstarted("invalid-pane-identity");
  const h = o.h ?? ((args: string[]) => runCommand(o.env.HERDR_BIN || "herdr", args, 20_000, o.env));
  const now = o.now ?? Date.now;
  const pause = o.pause ?? sleep;
  const started = now();
  const marker = `[learner-batch:${randomUUID()}]`;
  const native = new NativeBatch(marker);
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
  const argv = [o.command, ...learnerInteractiveArgs(o.request)];
  // env -i prevents the pane server's credentials/config environment from leaking into the learner.
  writeFileSync(script, `#!/bin/bash\numask 077\nprintf '%s\\n' "$$" > ${shellQuote([pidfile])}\ncd ${shellQuote([o.request.cwd])} || exit 2\nexec ${shellQuote(["env", "-i", ...Object.entries(tuiEnv).map(([k, v]) => `${k}=${v}`), "nice", "-n", "19", ...argv])}\n`, { mode: 0o700 });
  let pid: number | undefined;
  let ownerBirth: string | undefined;
  let submitted = false;
  let pendingMarker = marker;
  let cancelled = false;
  let uncertain = false;
  let alerted = false;
  let retries = 0;
  let progress = 0;
  let retryAt: number | undefined;
  let result: TuiResult = { code: 1, reason: "startup-failed", message: "", stopped: false };
  const initial = await h(["pane", "get", o.pane]);
  const identity = initial.result?.pane as Record<string, unknown> | undefined;
  if (!initial.ok || identity?.label !== o.label) return unstarted("pane-identity-changed-before-startup");
  const samePane = async (): Promise<boolean> => {
    const info = await h(["pane", "get", o.pane]);
    const pane = info.result?.pane as Record<string, unknown> | undefined;
    return !!pane && pane.label === o.label && pane.tab_id === identity.tab_id && pane.terminal_id === identity.terminal_id;
  };
  const save = (state: string, extra: Record<string, unknown> = {}): void => {
    writeFileSync(o.receipt, JSON.stringify({ state, pane: o.pane, label: o.label, identity, pid, birth: ownerBirth,
      session: native.session, rollout, turn: native.turn, submitted, retries, ...extra }) + "\n", { mode: 0o600 });
    const fd = openSync(o.receipt, "r"); try { fsyncSync(fd); } finally { closeSync(fd); }
  };
  const attention = (reason: string): void => { if (!alerted) { alerted = true; o.attention(reason); } };
  const onSignal = (): void => { cancelled = true; };
  process.once("SIGINT", onSignal); process.once("SIGTERM", onSignal);
  try {
    const info = await h(["pane", "process-info", "--pane", o.pane]);
    const p = info.result?.process_info as Record<string, unknown> | undefined;
    if (!p || p.shell_pid !== p.foreground_process_group_id) throw new Error("learner pane is not an idle shell");
    save("starting"); // journal before the external action
    const start = await h(["pane", "run", o.pane, shellQuote(["bash", script])]);
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
      const screen = await h(["pane", "read", o.pane, "--format", "ansi"]);
      const idle = agent?.agent === "codex" && ["idle", "done"].includes(status) && screen.ok && composerState(screen.stdout) === "empty";
      if (!submitted && !uncertain && idle && pid && ownerBirth && birth(pid) === ownerBirth &&
          [undefined, "", o.label].includes(agent?.name as string | undefined) &&
          (agent?.foreground_cwd === undefined || agent.foreground_cwd === o.request.cwd)) {
        const named = await h(["agent", "rename", o.pane, o.label]);
        if (!named.ok) { uncertain = true; attention("learner TUI name receipt uncertain; no task replay"); }
        else {
          save("submitting", { prompt_sha256: createHash("sha256").update(prompt).digest("hex") });
          submitted = true;
          const sent = await h(["agent", "prompt", o.pane, sentPrompt]);
          if (!sent.ok) { uncertain = true; attention("learner prompt receipt uncertain; verify native acceptance before any continuation"); }
          save(sent.ok ? "submitted" : "uncertain");
        }
      }
      for (const file of rollout ? [rollout] : candidates(o.codexHome, started - 2000).filter((f) => !before.has(f))) {
        let entry = readers.get(file);
        if (!entry) { entry = { reader: new NativeRows(), batch: new NativeBatch(marker) }; readers.set(file, entry); }
        for (const row of entry.reader.read(file)) {
          entry.batch.feed(row);
          if (file === rollout && textOf(row).includes(pendingMarker)) uncertain = false;
          if (!rollout && entry.batch.accepted && entry.batch.cwd === o.request.cwd && entry.batch.session) {
            rollout = file;
            Object.assign(native, entry.batch);
            entry.batch = native;
            o.log({ type: "thread.started", thread_id: native.session });
            o.log({ type: "learner_tui_session", pane: o.pane, rollout, marker, session: native.session });
            // A native matching user message resolves an uncertain submission receipt.
            uncertain = false;
          }
          if (file === rollout) {
            o.log(row as Record<string, unknown>);
            if (o.request.resumeThread && native.accepted && !native.session) native.session = o.request.resumeThread;
          }
        }
      }
      // Submission and native polling can change the TUI within this iteration. Re-read readiness before any decision.
      const currentAgent = await h(["agent", "get", o.pane]);
      const current = currentAgent.result?.agent as Record<string, unknown> | undefined;
      const currentScreen = await h(["pane", "read", o.pane, "--format", "ansi"]);
      const finalIdle = current?.agent === "codex" && ["idle", "done"].includes(String(current.agent_status)) &&
        currentScreen.ok && composerState(currentScreen.stdout) === "empty";
      const caughtUp = !!rollout && readers.get(rollout)!.reader.atEnd(rollout);
      if (native.accepted && native.progress !== progress) { retries = 0; progress = native.progress; retryAt = undefined; alerted = false; }
      if (o.lease && !o.lease.current()) { uncertain = true; attention("learner lease changed; completion and automatic continuation disabled"); }
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
            save("retry-sending", { next_retry: retries + 1 });
            pendingMarker = `${marker}:retry:${retries + 1}`;
            const sent = await h(["agent", "prompt", o.pane, `${pendingMarker}\n上一轮因模型/网络错误中断，请沿原任务、原批次和已有产物接着做；不要重启或另开会话。`]);
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
    result.reason = "transport-or-native-record-error";
    attention("learner TUI transport/native record failed; inspect original local receipt");
  } finally {
    // Retire only our exact PID. A changed pane, foreign foreground command or typed composer is never closed.
    let retire = true;
    if (result.code === 0) {
      const screen = await h(["pane", "read", o.pane, "--format", "ansi"]);
      if (!screen.ok || composerState(screen.stdout) !== "empty" ||
          (rollout && !readers.get(rollout)!.reader.atEnd(rollout))) {
        retire = false;
        attention("new native activity or unsent human text after completion; keep the interactive session");
      }
    }
    if (retire && pid && ownerBirth && await samePane()) {
      if (birth(pid) === ownerBirth) await h(["agent", "send-keys", o.pane, "esc"]);
      const until = now() + 10_000;
      while (birth(pid) === ownerBirth && now() < until) {
        const screen = await h(["pane", "read", o.pane, "--format", "ansi"]);
        if (screen.ok && composerState(screen.stdout) === "empty") await h(["agent", "send-keys", o.pane, "ctrl+c"]);
        await pause(o.pollMs ?? 1000);
      }
      for (const signal of ["SIGTERM", "SIGKILL"] as const) {
        if (birth(pid) === ownerBirth) { try { process.kill(pid, signal); } catch { /* raced with native exit */ } await pause(o.pollMs ?? 1000); }
      }
      const shellBy = now() + 10_000;
      do {
        const info = await h(["pane", "process-info", "--pane", o.pane]);
        const p = info.result?.process_info as Record<string, unknown> | undefined;
        result.stopped = birth(pid) !== ownerBirth && !!p && p.shell_pid === p.foreground_process_group_id;
        if (result.stopped) break;
        await pause(o.pollMs ?? 1000);
      } while (now() < shellBy);
    }
    process.removeListener("SIGINT", onSignal); process.removeListener("SIGTERM", onSignal);
  }
  result = { ...result, session: native.session, turn: native.turn, rollout, message: native.message, usage: native.totalUsage(), ...(native.error ? { error: native.error.slice(0, 2000) } : {}) };
  if (!result.stopped) { result.code = 75; result.reason = "retirement-unverified"; attention("learner TUI retirement unverified; finish and reclamation forbidden"); }
  save(result.stopped ? "session-ended" : "needs-attention", { result });
  return result;
}

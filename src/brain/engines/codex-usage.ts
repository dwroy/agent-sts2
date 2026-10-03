/**
 * The codex brain's usage guard (Dai 2026-10-03): the ChatGPT plan's rate-limit windows and credits read from codex
 * itself, so the brain stops before it eats Dai's weekly Codex window (shared with Dai's own Codex use) and never
 * spends credits. Measured on codex-cli 0.160.0 (experiments/brain-replay/codex-usage.md).
 *
 * - The read: `codex exec --json` reports no limits. A short-lived `codex app-server --listen stdio://` answers the
 *   JSON-RPC `account/rateLimits/read` (newline-delimited JSON: initialize, the initialized notification, the read),
 *   with CODEX_HOME for the login (codex reads its own token file; we never do) and the brain's state directory. It
 *   exits when its stdin closes, which we do once the answer is in; the shared app-server daemon is not started
 *   (daemon_auto_start off) nor used, and a read that does not finish within CODEX_USAGE_TIMEOUT_MS has its process
 *   group killed. One read takes about 0.9 s (0.2 s of it the start-up), most of it the backend's answer.
 * - What is kept (CodexUsage): every window's used % (rateLimits and each rateLimitsByLimitId bucket, primary and
 *   secondary; a spend-control individualLimit as 100 - remainingPercent), its length and reset time, the credits
 *   (has / unlimited / balance), ordinaryUsageAllowed, rateLimitReachedType, spendControlReached and the plan. The
 *   account id and the upsell banner are not kept. Reset credits are never consumed (account/rateLimitResetCredit).
 * - Credits: past the plan's limit the backend draws on the credit balance by itself (OpenAI's pricing page; codex
 *   0.160 has no setting, flag or request field against it: openai/codex#48394 asks for one), so the guard stops
 *   codex well before the limit and on any sign of credits in use.
 * - The guard (CodexUsageGuard): a read at process start (Brain.preflight), then before a codex call once
 *   BRAIN_CODEX_USAGE_EVERY_CALLS calls or BRAIN_CODEX_USAGE_EVERY_MIN minutes have passed since the last read. It
 *   stops codex for the rest of the process (an EngineFailure "quota" with no end: the router's used-up-plan path,
 *   said once on the console, every question to BRAIN_FALLBACK) when (a) any window is at BRAIN_CODEX_USAGE_STOP_PCT
 *   or more, or (b) credits are in use: the balance below the highest this process saw, ordinary (plan) usage not
 *   allowed, a limit reached, spend control reached, a window at 100%. A read that fails is said once and codex
 *   stays on (the next read is tried at the next due call), unless BRAIN_CODEX_USAGE_REQUIRED=on: then codex stops.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import type { BrainConfig } from "../../config.js";
import { EngineFailure } from "../router.js";

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

/** How long one read may take (start-up, the backend's answer, the exit); measured about 0.9 s. */
export const CODEX_USAGE_TIMEOUT_MS = 20_000;
/** After the answer (stdin closed), how long the app-server may take to exit before its process group is killed. */
export const CODEX_USAGE_EXIT_GRACE_MS = 3_000;

/**
 * Features off for the read (codex-cli 0.160 names): nothing that adds work at start-up, and above all no shared
 * app-server daemon started or reused (daemon_auto_start).
 */
export const CODEX_USAGE_DISABLED_FEATURES = [
  "daemon_auto_start",
  "hooks",
  "memories",
  "plugins",
  "apps",
  "multi_agent",
  "shell_tool",
  "unified_exec",
  "browser_use",
  "computer_use",
  "in_app_browser",
  "code_mode_host",
  "shell_snapshot",
  "skill_search",
  "tool_suggest",
  "workspace_dependencies",
  "unbounded_connection_retries",
] as const;

/** One rate-limit window as read. */
export interface CodexLimitWindow {
  /** The bucket and window: "codex/primary", "codex/secondary", "codex/individual". */
  name: string;
  usedPct: number;
  /** The window's length in minutes (10080: a week); null when not reported. */
  windowMins: number | null;
  /** When it resets (ISO); null when not reported. */
  resetsAt: string | null;
}

export interface CodexCredits {
  hasCredits: boolean;
  unlimited: boolean;
  /** The balance as a number (codex reports a decimal string); null when not reported. */
  balance: number | null;
}

/** One reading of account/rateLimits/read (no account id, no banner). */
export interface CodexUsage {
  /** When the read began (ISO) and how long it took. */
  readAt: string;
  ms: number;
  plan: string | null;
  windows: CodexLimitWindow[];
  credits: CodexCredits | null;
  /** The backend's permission for ordinary (plan-included) usage; null: not reported. */
  ordinaryUsageAllowed: boolean | null;
  /** rate_limit_reached, workspace_*_credits_depleted, ...; null when no limit is reached. */
  reachedType: string | null;
  spendControlReached: boolean | null;
}

const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const str = (value: unknown): string | null => (typeof value === "string" && value ? value : null);
const bool = (value: unknown): boolean | null => (typeof value === "boolean" ? value : null);

/** A reset time in seconds since the epoch as ISO; null when absent. */
function isoSeconds(value: unknown): string | null {
  const seconds = num(value);
  return seconds === null ? null : new Date(seconds * 1000).toISOString();
}

/** A decimal string or number ("500", "12.5") as a number; null otherwise. */
function decimal(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !/^\s*-?\d+(\.\d+)?\s*$/.test(value)) return null;
  return Number(value);
}

/** The usage in account/rateLimits/read's result (GetAccountRateLimitsResponse, codex-cli 0.160); throws when it has none. */
export function parseRateLimits(result: unknown): Omit<CodexUsage, "readAt" | "ms"> {
  if (!isObject(result)) throw new Error("account/rateLimits/read returned no object");
  const snapshots: Json[] = [];
  const seen = new Set<string>();
  const add = (snapshot: unknown, fallbackId: string): void => {
    if (!isObject(snapshot)) return;
    const id = str(snapshot["limitId"]) ?? fallbackId;
    if (seen.has(id)) return;
    seen.add(id);
    snapshots.push({ ...snapshot, limitId: id });
  };
  add(result["rateLimits"], "codex");
  if (isObject(result["rateLimitsByLimitId"])) for (const [id, snapshot] of Object.entries(result["rateLimitsByLimitId"])) add(snapshot, id);
  if (snapshots.length === 0) throw new Error("account/rateLimits/read returned no rate-limit snapshot");
  const windows: CodexLimitWindow[] = [];
  let credits: CodexCredits | null = null;
  let plan: string | null = null;
  let reachedType: string | null = null;
  let spendControlReached: boolean | null = null;
  for (const snapshot of snapshots) {
    const id = String(snapshot["limitId"]);
    for (const slot of ["primary", "secondary"] as const) {
      const window = snapshot[slot];
      if (!isObject(window)) continue;
      const used = num(window["usedPercent"]);
      if (used === null) continue;
      windows.push({ name: `${id}/${slot}`, usedPct: used, windowMins: num(window["windowDurationMins"]), resetsAt: isoSeconds(window["resetsAt"]) });
    }
    const individual = snapshot["individualLimit"];
    if (isObject(individual) && num(individual["remainingPercent"]) !== null) {
      windows.push({ name: `${id}/individual`, usedPct: 100 - (num(individual["remainingPercent"]) ?? 100), windowMins: null, resetsAt: isoSeconds(individual["resetsAt"]) });
    }
    const c = snapshot["credits"];
    if (isObject(c) && !credits) credits = { hasCredits: c["hasCredits"] === true, unlimited: c["unlimited"] === true, balance: decimal(c["balance"]) };
    plan ??= str(snapshot["planType"]);
    reachedType ??= str(snapshot["rateLimitReachedType"]);
    const spend = bool(snapshot["spendControlReached"]);
    if (spend !== null) spendControlReached = (spendControlReached ?? false) || spend;
  }
  return { plan, windows, credits, ordinaryUsageAllowed: bool(result["ordinaryUsageAllowed"]), reachedType, spendControlReached };
}

/** `codex app-server`'s arguments for a read: stdio, our state directory, no analytics or update check, the features off. */
export function usageArgs(stateDir: string): string[] {
  return [
    "app-server",
    "--listen", "stdio://",
    "-c", `sqlite_home=${JSON.stringify(stateDir)}`,
    "-c", `log_dir=${JSON.stringify(join(stateDir, "log"))}`,
    "-c", "analytics.enabled=false",
    "-c", "check_for_update_on_startup=false",
    ...CODEX_USAGE_DISABLED_FEATURES.flatMap((feature) => ["--disable", feature]),
  ];
}

/**
 * One request to a short-lived `codex app-server` on stdio: initialize, initialized, the request; stdin is closed once
 * the answer is in and the promise settles when the process is gone (its process group killed if it lingers past
 * CODEX_USAGE_EXIT_GRACE_MS, or at the timeout). Rejects with the error, codex's JSON-RPC error message, or why it ended.
 */
export function appServerRequest(bin: string, args: string[], opts: { cwd: string; env: Record<string, string>; method: string; params: unknown; timeoutMs: number; exitGraceMs?: number }): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(bin, args, { cwd: opts.cwd, env: opts.env, stdio: ["pipe", "pipe", "pipe"], detached: true });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    let buffer = "";
    let stderr = "";
    let outcome: { ok: true; value: unknown } | { ok: false; error: Error } | null = null;
    let settled = false;
    let graceTimer: NodeJS.Timeout | undefined;
    const killGroup = (): void => {
      if (child.pid === undefined) return;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        try {
          child.kill("SIGKILL");
        } catch {
          // already gone
        }
      }
    };
    const timer = setTimeout(() => {
      outcome ??= { ok: false, error: new Error(`no answer within ${opts.timeoutMs} ms`) };
      killGroup();
    }, opts.timeoutMs);
    const settle = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(graceTimer);
      const result = outcome ?? { ok: false as const, error: new Error(`codex app-server ended before answering${stderr.trim() ? `: ${stderr.trim().split("\n").slice(-2).join(" | ").slice(0, 300)}` : ""}`) };
      if (result.ok) resolve(result.value);
      else reject(result.error);
    };
    /** The answer is in (or failed): close stdin so the server exits; kill its group if it lingers. */
    const done = (result: { ok: true; value: unknown } | { ok: false; error: Error }): void => {
      outcome ??= result;
      try {
        child.stdin?.end();
      } catch {
        // gone already
      }
      graceTimer ??= setTimeout(killGroup, opts.exitGraceMs ?? CODEX_USAGE_EXIT_GRACE_MS);
    };
    const send = (message: Json): void => {
      try {
        child.stdin?.write(`${JSON.stringify(message)}\n`);
      } catch {
        // reported through exit
      }
    };
    child.stdin?.on("error", () => {
      // the server exited first: reported through close
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString("utf8")).slice(-4000);
    });
    child.stdout?.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line.startsWith("{")) continue;
        let message: Json;
        try {
          const value = JSON.parse(line) as unknown;
          if (!isObject(value)) continue;
          message = value;
        } catch {
          continue;
        }
        // Notifications and requests from the server (no id of ours) are not answered: the read needs none.
        if ("method" in message) continue;
        const error = isObject(message["error"]) ? message["error"] : null;
        if (message["id"] === 1) {
          if (error) done({ ok: false, error: new Error(`initialize failed: ${String(error["message"] ?? "error").slice(0, 300)}`) });
          else {
            send({ method: "initialized" });
            send({ id: 2, method: opts.method, params: opts.params });
          }
        } else if (message["id"] === 2) {
          done(error ? { ok: false, error: new Error(`${opts.method} failed: ${String(error["message"] ?? "error").slice(0, 300)}`) } : { ok: true, value: message["result"] });
        }
      }
    });
    child.on("error", (error) => {
      outcome ??= { ok: false, error: new Error(`${bin} could not start: ${error.message}`) };
      settle();
    });
    child.on("close", settle);
    send({ id: 1, method: "initialize", params: { clientInfo: { name: "jev_brain_usage", title: null, version: "1" }, capabilities: null } });
  });
}

/** Codex's home and program, and where the read keeps codex's SQLite state (a directory of ours). */
export interface UsageReadOptions {
  bin: string;
  home: string;
  env: Record<string, string>;
  stateDir: string;
  timeoutMs?: number;
  exitGraceMs?: number;
}

/** One read of the plan's windows and credits (account/rateLimits/read through a short-lived app-server). */
export async function readCodexUsage(opts: UsageReadOptions): Promise<CodexUsage> {
  const began = Date.now();
  mkdirSync(opts.stateDir, { recursive: true });
  const result = await appServerRequest(opts.bin, usageArgs(opts.stateDir), {
    cwd: opts.stateDir,
    env: opts.env,
    method: "account/rateLimits/read",
    // The background-poll form: no separate reset-credit detail lookup.
    params: { excludeResetCreditDetails: true },
    timeoutMs: opts.timeoutMs ?? CODEX_USAGE_TIMEOUT_MS,
    ...(opts.exitGraceMs === undefined ? {} : { exitGraceMs: opts.exitGraceMs }),
  });
  return { readAt: new Date(began).toISOString(), ms: Date.now() - began, ...parseRateLimits(result) };
}

/* ---- the guard --------------------------------------------------------------------------------- */

export type CodexUsageSettings = BrainConfig["codex"]["usage"];

/** The fullest window of a reading (the one the stop rule meets first). */
export function fullestWindow(usage: CodexUsage): CodexLimitWindow | null {
  return usage.windows.reduce<CodexLimitWindow | null>((top, window) => (!top || window.usedPct > top.usedPct ? window : top), null);
}

function describeWindow(window: CodexLimitWindow): string {
  const length = window.windowMins === null ? "" : window.windowMins % 1440 === 0 ? ` ${window.windowMins / 1440}-day` : ` ${window.windowMins}-minute`;
  return `${window.name}${length} window ${window.usedPct}% used${window.resetsAt ? `, resets ${window.resetsAt}` : ""}`;
}

/** What a brain.jsonl row / run-config row records of a reading. */
export interface UsageNote {
  engine: "codex";
  read_at: string;
  read_ms: number;
  plan: string | null;
  /** The fullest window: its used %, length (minutes) and reset time. */
  used_pct: number | null;
  window: string | null;
  window_min: number | null;
  resets_at: string | null;
  credits: number | null;
  ordinary_usage_allowed: boolean | null;
  reached_type: string | null;
}

export function usageNote(usage: CodexUsage): UsageNote {
  const top = fullestWindow(usage);
  return {
    engine: "codex",
    read_at: usage.readAt,
    read_ms: usage.ms,
    plan: usage.plan,
    used_pct: top?.usedPct ?? null,
    window: top?.name ?? null,
    window_min: top?.windowMins ?? null,
    resets_at: top?.resetsAt ?? null,
    credits: usage.credits?.balance ?? null,
    ordinary_usage_allowed: usage.ordinaryUsageAllowed,
    reached_type: usage.reachedType,
  };
}

/** The guard's state for run-config.jsonl. */
export interface UsageStatus {
  stop_pct: number;
  every_calls: number;
  every_min: number;
  required: boolean;
  /** The process-start reading, and the latest. */
  start: UsageNote | null;
  last: UsageNote | null;
  /** Codex calls since the latest read. */
  calls_since_read: number;
  /** Why codex was stopped, when it was. */
  stopped?: string;
  /** Why the latest read failed, when it did. */
  unreadable?: string;
}

export class CodexUsageGuard {
  /** The process-start reading (the first that worked) and the latest. */
  first: CodexUsage | null = null;
  last: CodexUsage | null = null;
  /** Why codex is stopped for the process (null: it is not). */
  stopped: string | null = null;
  /** The kind of the stop: quota (a limit or credits), unavailable (BRAIN_CODEX_USAGE_REQUIRED and no reading). */
  stopKind: "quota" | "unavailable" = "quota";
  /** Why the latest read failed (null: it worked). */
  unreadable: string | null = null;
  /** The highest credit balance this process read (a lower one means credits were spent). */
  private topBalance: number | null = null;
  private callsSinceRead = 0;
  private lastReadAt: number | null = null;
  private reading: Promise<void> | null = null;
  private saidUnreadable = false;

  constructor(
    private readonly settings: CodexUsageSettings,
    private readonly read: () => Promise<CodexUsage>,
    private readonly opts: { now?: () => number; note?: (message: string) => void } = {},
  ) {}

  private now(): number {
    return this.opts.now ? this.opts.now() : Date.now();
  }

  /** Whether a read is due before the next call: none yet, or EVERY_CALLS calls / EVERY_MIN minutes since the last. */
  due(): boolean {
    if (this.lastReadAt === null) return true;
    return this.callsSinceRead >= this.settings.everyCalls || this.now() - this.lastReadAt >= this.settings.everyMin * 60_000;
  }

  /**
   * Why a reading stops codex, or null: (a) a window at BRAIN_CODEX_USAGE_STOP_PCT or more; (b) credits in use (the
   * balance below the highest seen, ordinary usage not allowed, a limit or spend control reached, a window at 100%).
   */
  verdict(usage: CodexUsage): string | null {
    const pct = this.settings.stopPct;
    const full = usage.windows.filter((window) => window.usedPct >= 100);
    const balance = usage.credits?.balance ?? null;
    if (balance !== null && this.topBalance !== null && balance < this.topBalance) return `credits are being spent: the balance fell from ${this.topBalance} to ${balance} in this process`;
    if (usage.ordinaryUsageAllowed === false) return "the plan's included usage is not allowed now (ordinaryUsageAllowed false): further calls would draw on credits";
    if (usage.reachedType) return `a usage limit is reached (${usage.reachedType}): further calls would draw on credits`;
    if (usage.spendControlReached === true) return "spend control is reached: further calls would draw on credits";
    if (full.length > 0) return `${full.map(describeWindow).join("; ")}: further calls would draw on credits`;
    const over = usage.windows.filter((window) => window.usedPct >= pct);
    if (over.length > 0) return `${over.map(describeWindow).join("; ")} (BRAIN_CODEX_USAGE_STOP_PCT=${pct})`;
    return null;
  }

  /** One read, its verdict applied; a failed read is said once (and stops codex under BRAIN_CODEX_USAGE_REQUIRED). */
  private async readNow(): Promise<void> {
    this.callsSinceRead = 0;
    this.lastReadAt = this.now();
    let usage: CodexUsage;
    try {
      usage = await this.read();
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).slice(0, 300);
      this.unreadable = message;
      if (this.settings.required) {
        this.stop(`codex usage could not be read (${message}) and BRAIN_CODEX_USAGE_REQUIRED=on`, "unavailable");
        return;
      }
      if (!this.saidUnreadable) {
        this.saidUnreadable = true;
        this.opts.note?.(`WARNING: codex usage could not be read (${message}); codex stays on without the usage guard until a read works (BRAIN_CODEX_USAGE_REQUIRED=on stops it instead)`);
      }
      return;
    }
    this.unreadable = null;
    this.last = usage;
    this.first ??= usage;
    const why = this.verdict(usage);
    const balance = usage.credits?.balance ?? null;
    if (balance !== null && (this.topBalance === null || balance > this.topBalance)) this.topBalance = balance;
    if (why) this.stop(why, "quota");
  }

  private stop(reason: string, kind: "quota" | "unavailable"): void {
    if (this.stopped) return;
    this.stopped = `codex usage guard: ${reason}`;
    this.stopKind = kind;
  }

  /** A read now unless one is in flight (shared): process start, and every due call. */
  refresh(): Promise<void> {
    this.reading ??= this.readNow().finally(() => {
      this.reading = null;
    });
    return this.reading;
  }

  /** Process start (Brain.preflight): the first read; the stop reason when codex must not start, else null. */
  async start(): Promise<string | null> {
    if (this.lastReadAt === null) await this.refresh();
    return this.stopped;
  }

  /**
   * Before a codex call: a read when one is due; throws the stop (EngineFailure "quota", or "unavailable" for a
   * required read that failed, resting codex for the rest of the process) instead of letting the call go out.
   */
  async beforeCall(): Promise<void> {
    if (!this.stopped && (this.reading || this.due())) await this.refresh();
    if (this.stopped) throw new EngineFailure(`${this.stopped} [${this.stopKind}]`, this.stopKind, Number.POSITIVE_INFINITY);
  }

  /** A codex call went out (re-asks included): counted for EVERY_CALLS. */
  noteCall(): void {
    this.callsSinceRead += 1;
  }

  /** The latest reading for a brain.jsonl row (null before any read worked). */
  note(): UsageNote | null {
    return this.last ? usageNote(this.last) : null;
  }

  status(): UsageStatus {
    return {
      stop_pct: this.settings.stopPct,
      every_calls: this.settings.everyCalls,
      every_min: this.settings.everyMin,
      required: this.settings.required,
      start: this.first ? usageNote(this.first) : null,
      last: this.last ? usageNote(this.last) : null,
      calls_since_read: this.callsSinceRead,
      ...(this.stopped ? { stopped: this.stopped } : {}),
      ...(this.unreadable ? { unreadable: this.unreadable } : {}),
    };
  }
}

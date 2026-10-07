/** A model outage suspends the current question, never the game's saved run. */
import { appendFileSync, existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { BrainRequest } from "./types.js";

export type WaitState = "paused" | "heartbeat" | "resumed" | "cancelled" | "fault";
export interface BrainWaitEvent {
  ts: string;
  state: WaitState;
  pid: number;
  run_id: string | null;
  question_id: string;
  decision_type: string;
  reason: string;
  since: string;
  retries: number;
  next_retry: string | null;
  suspended_ms: number;
  budget_policy: "outage_time_excluded";
  original_budget_ms: number | null;
}

/** Terminal errors must cross every legacy Jev/code recovery catch. */
export class BrainBlockedError extends Error {
  constructor(readonly state: "cancelled" | "fault", message: string, override readonly cause?: unknown) {
    super(message);
    this.name = "BrainBlockedError";
  }
}
export function isBrainBlocked(error: unknown): error is BrainBlockedError {
  return error instanceof BrainBlockedError;
}

export const BRAIN_RETRY_DELAYS = [5_000, 15_000, 30_000, 60_000, 120_000, 300_000] as const;
export const BRAIN_HEARTBEAT_MS = 15_000;

export interface BrainWaitOptions {
  signal?: AbortSignal;
  stop?: () => boolean;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  event?: (event: BrainWaitEvent) => void;
  notify?: (event: BrainWaitEvent) => void;
  originalBudgetMs?: number;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const aborted = (): void => { clearTimeout(timer); reject(new BrainBlockedError("cancelled", "brain wait cancelled by stop signal")); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", aborted); resolve(); }, ms);
    if (signal?.aborted) aborted();
    else signal?.addEventListener("abort", aborted, { once: true });
  });
}

export class BrainWait {
  private active: { req: BrainRequest; began: number; reason: string; retries: number; next: number | null } | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private completedMs = 0;
  private heartbeatFailure: unknown;
  constructor(private readonly options: BrainWaitOptions = {}) {}
  get signal(): AbortSignal | undefined { return this.options.signal; }
  now(): number { return this.options.now?.() ?? Date.now(); }
  get suspendedMs(): number { return this.completedMs + (this.active ? Math.max(0, this.now() - this.active.began) : 0); }

  check(): void {
    if (this.heartbeatFailure) throw new BrainBlockedError("fault", "Codex wait heartbeat could not be recorded", this.heartbeatFailure);
    if (this.signal?.aborted || this.options.stop?.()) throw new BrainBlockedError("cancelled", "brain wait cancelled by stop signal/ops STOP; saved decision left untouched");
  }

  private emit(state: WaitState): void {
    const a = this.active;
    if (!a) return;
    const event: BrainWaitEvent = {
      ts: new Date(this.now()).toISOString(), state, pid: process.pid,
      run_id: a.req.runId ?? null, question_id: a.req.questionId ?? "", decision_type: a.req.label,
      reason: a.reason, since: new Date(a.began).toISOString(), retries: a.retries,
      next_retry: a.next === null ? null : new Date(a.next).toISOString(), suspended_ms: this.suspendedMs,
      budget_policy: "outage_time_excluded", original_budget_ms: this.options.originalBudgetMs ?? null,
    };
    this.options.event?.(event);
    if (state !== "heartbeat") this.options.notify?.(event);
  }

  pause(req: BrainRequest, reason: string, began = this.now()): void {
    if (this.active) { this.active.reason = reason; return; }
    this.active = { req, began, reason, retries: 0, next: null };
    this.emit("paused");
    this.timer = setInterval(() => {
      try { this.emit("heartbeat"); }
      catch (error) { this.heartbeatFailure = error; clearInterval(this.timer); }
    }, BRAIN_HEARTBEAT_MS);
  }

  async retry(cooldownMs = 0): Promise<void> {
    this.check();
    const a = this.active;
    if (!a) throw new Error("brain retry without a paused question");
    // Each sleep and retry delay is bounded. An outage has no attempt cap: only Codex can answer it.
    const backoff = BRAIN_RETRY_DELAYS[Math.min(a.retries, BRAIN_RETRY_DELAYS.length - 1)]!;
    const delay = Math.min(300_000, Math.max(backoff, Number.isFinite(cooldownMs) ? cooldownMs : 0));
    a.next = this.now() + delay;
    while (this.now() < a.next) {
      this.check();
      await (this.options.sleep ?? sleep)(Math.min(1_000, a.next - this.now()), this.signal);
    }
    this.check();
    a.retries += 1;
    a.next = null;
  }

  finish(state: "resumed" | "cancelled" | "fault", req?: BrainRequest, reason?: string): void {
    if (!this.active && req) this.active = { req, began: this.now(), reason: reason ?? state, retries: 0, next: null };
    if (reason && this.active) this.active.reason = reason;
    clearInterval(this.timer);
    this.emit(state);
    if (this.active) this.completedMs += Math.max(0, this.now() - this.active.began);
    this.active = null;
  }
}

/** Runtime files are outside source control. Tests pass a private fixture directory. */
export function fileBrainWait(logDir: string, opsDir: string, options: BrainWaitOptions = {}): BrainWait {
  const marker = join(logDir, "brain-wait.json");
  const timeline = join(logDir, "brain-wait.jsonl");
  return new BrainWait({
    ...options, stop: options.stop ?? (() => existsSync(join(opsDir, "STOP"))),
    event: (event) => {
      mkdirSync(logDir, { recursive: true });
      const temp = `${marker}.${process.pid}.tmp`;
      writeFileSync(temp, JSON.stringify(event) + "\n");
      renameSync(temp, marker);
      appendFileSync(timeline, JSON.stringify(event) + "\n");
      options.event?.(event);
    },
    notify: (event) => {
      const inbox = join(opsDir, "inbox-dev.md");
      mkdirSync(dirname(inbox), { recursive: true });
      appendFileSync(inbox, `\n- ${event.ts} Codex 大脑 ${event.state}；局 ${event.run_id ?? "未知"}；题 ${event.question_id} / ${event.decision_type}；原因 ${event.reason}；暂停时间不计原预算，恢复后回答同题。\n`);
      options.notify?.(event);
    },
  });
}

/**
 * The brain router (docs/v4-architecture.md §2): picks the engine for a question from the environment, validates
 * the answer (AnswerSpec.validate), re-asks at most once with the specific problems, falls back to another
 * engine when one fails or times out, and writes one row per question to logs/brain.jsonl.
 *
 * Switching engines is configuration only (config.ts readBrainConfig):
 *   BRAIN_ENGINE=claude|codex|deepseek         default deepseek (v3 behaviour); dsh: named, not built yet
 *   BRAIN_ENGINE_<PREFIX>=...                   per question kind: the label's first segment, upper case,
 *                                               non-alphanumerics as "_" (map/route-plan -> MAP, run-plan -> RUN_PLAN)
 *   BRAIN_<ENGINE>_MODEL[_<PREFIX>]             the engine's model, overall or per question kind
 *   BRAIN_FALLBACK=deepseek                     the engine asked when the chosen one errors or times out
 *
 * Rules:
 * - An answer that fails validation is re-asked once; if the second answer fails too, the answer is null (the
 *   caller keeps its state: a bad answer never replaces a good one). The DeepSeek engine without tools keeps
 *   v3's own repair (consistency re-ask, reasoning recovery), so by default the router only records problems
 *   there (BRAIN_DEEPSEEK_REASK=on changes that).
 * - An engine error (process failure, quota or rate limit, HTTP error, timeout) falls back to BRAIN_FALLBACK when
 *   it names another engine; fellBackFrom says which one failed and why. A quota, rate-limit, overload or login
 *   failure also rests that engine for a while (EngineFailure.cooldownMs): its questions go straight to the
 *   fallback, so an unattended run never waits on an engine that cannot answer. TIMEOUT_REST_AFTER timeouts in a
 *   row (a re-ask's included) rest it for TIMEOUT_REST_MS. An answer failure the engine reports as such
 *   (`answerFailure`: DeepSeek answered, unusably) is passed on for the caller's own recovery.
 * - An answer still unusable after the re-ask (both invalid, or the re-ask failed or timed out) is asked once of
 *   BRAIN_FALLBACK (fell_back_from kind "invalid"); only when that fails too does the caller fall back to Jev/code.
 * - Call budgets: BRAIN_<ENGINE>_MAX_CALLS (Claude: DEFAULT_CLAUDE_MAX_CALLS) counts every call the router makes to
 *   that engine in this process, re-asks included, apart from DeepSeek's DEEPSEEK_MAX_CALLS (the loop's). A used-up
 *   budget is an engine failure ("budget"): the question goes to BRAIN_FALLBACK, or fails when there is none. A
 *   call to the fallback also answers to the caller's budget for it (RouterDeps.fallbackBudget: the loop's
 *   DEEPSEEK_MAX_CALLS), checked and spent before each call, so one that throws is counted too.
 * - Keys never reach the log: rows hold the request, the answer, the usage and error texts only.
 */
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import type { BrainConfig } from "../config.js";
import type { BrainAnswer, BrainEngine, BrainRequest, BrainUsage, EngineName, KnowledgeNote } from "./types.js";

/** The env-var suffix of a label: its first segment, upper case, non-alphanumerics as "_". */
export function labelPrefix(label: string): string {
  return (label.split("/")[0] ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

/**
 * The tokens a failed call is known to have used (an engine attaches them to its error: withUsage), for the log row of
 * a failed question (fix-queue-v4 #8: a non-JSON DeepSeek reply's 1,042 output tokens were logged as 0). Undefined
 * when unknown (a timeout, a connection error).
 */
export function errorUsage(error: unknown): BrainUsage | undefined {
  const usage = typeof error === "object" && error !== null ? (error as { usage?: unknown }).usage : undefined;
  if (typeof usage !== "object" || usage === null) return undefined;
  const { inputTokens, outputTokens } = usage as Partial<BrainUsage>;
  return typeof inputTokens === "number" && typeof outputTokens === "number" ? (usage as BrainUsage) : undefined;
}

/** Attaches a failed call's known usage to its error (errorUsage reads it back); the error, for a rethrow. */
export function withUsage<T>(error: T, usage: BrainUsage): T {
  if (typeof error === "object" && error !== null) (error as { usage?: BrainUsage }).usage = usage;
  return error;
}

/** An error that means "the engine answered, but unusably" (not an engine failure): no fallback. */
export function isAnswerFailure(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { answerFailure?: unknown }).answerFailure === true;
}

export type FailureKind = "quota" | "rate_limit" | "overloaded" | "auth" | "timeout" | "unavailable" | "budget" | "invalid" | "error";

/**
 * Timeouts in a row after which an engine rests (its questions go to the fallback): one slow answer can be the
 * question; two in a row mean the engine is slow now (a loaded subscription, a stuck login prompt), and every
 * further question would wait the whole timeout (BRAIN_CLAUDE_TIMEOUT_MS: 2 minutes) before falling back.
 */
export const TIMEOUT_REST_AFTER = 2;
/** How long an engine rests after TIMEOUT_REST_AFTER timeouts in a row: a few questions' worth, then it is tried again. */
export const TIMEOUT_REST_MS = 10 * 60_000;

/** An engine that could not answer, with why (for the log) and how long to rest it. */
export class EngineFailure extends Error {
  constructor(
    message: string,
    readonly kind: FailureKind,
    /** How long the router should send this engine's questions straight to the fallback (0: not at all). */
    readonly cooldownMs = 0,
  ) {
    super(message);
    this.name = "EngineFailure";
  }
}

export class BrainTimeoutError extends EngineFailure {
  constructor(engine: EngineName, ms: number) {
    super(`${engine} timed out after ${ms} ms`, "timeout");
    this.name = "BrainTimeoutError";
  }
}

/** The failure kind of any error ("error" when it is not an EngineFailure). */
export function failureKind(error: unknown): FailureKind {
  return error instanceof EngineFailure ? error.kind : "error";
}

type Attempt = BrainAnswer & { first?: { answer: unknown; problems: string[] }; reasks?: number };

export interface BrainLogRow {
  ts: string;
  /** The run the question belongs to (the same value as decisions.jsonl's run_id), when known. */
  run_id?: string;
  label: string;
  engine: EngineName;
  model: string;
  /** The reasoning effort asked for (the engine's answer, else its configured one), when the engine has one. */
  effort?: string;
  system_sha: string;
  system_chars: number;
  /** KNOWLEDGE_PREFIX=full: the prefix the system carried (or why v3's went out instead). */
  knowledge?: KnowledgeNote;
  memory?: unknown;
  question: string;
  options?: Record<string, string | null>;
  payload: unknown;
  tools: string[];
  tool_calls: BrainAnswer["toolCalls"];
  answer: unknown;
  problems: string[];
  reasks: number;
  attempts: number;
  latency_ms: number;
  usage: BrainAnswer["usage"];
  first?: { answer: unknown; problems: string[] };
  fell_back_from?: BrainAnswer["fellBackFrom"] & { kind?: FailureKind };
  error?: string;
  error_kind?: FailureKind;
  raw?: string;
  reasoning_chars?: number;
}

export interface RouterDeps {
  config: BrainConfig;
  /** The engine for a name (created lazily by the caller); throws with the reason when it cannot run here. */
  engine: (name: EngineName) => BrainEngine;
  /** Where rows go; default: appended to config.log (none when that is empty). */
  log?: (row: BrainLogRow) => void;
  /** The clock (tests). */
  now?: () => number;
  /**
   * A budget the caller keeps for an engine asked as the fallback (the loop's DEEPSEEK_MAX_CALLS): checked before
   * each fallback call (none left: no fallback) and spent when the call is made.
   */
  fallbackBudget?: FallbackBudget;
}

export interface FallbackBudget {
  left(engine: EngineName): boolean;
  spend(engine: EngineName): void;
}

function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class BrainRouter {
  /** Engines resting after a quota / rate-limit / login failure: until when, and why. */
  private readonly resting = new Map<EngineName, { until: number; reason: string; kind: FailureKind }>();
  /** Calls made to each engine in this process (re-asks included), for BRAIN_<ENGINE>_MAX_CALLS. */
  private readonly calls = new Map<EngineName, number>();
  /** Timeouts in a row per engine (a call that returns or fails otherwise starts it over). */
  private readonly timeouts = new Map<EngineName, number>();
  /** Where the router says what the console should see (an engine rested for the process); set by Brain.onNote. */
  private notify: ((message: string) => void) | null = null;
  /** Engines whose rest for the process was said already (once each). */
  private readonly saidResting = new Set<EngineName>();

  constructor(private readonly deps: RouterDeps) {}

  /** Where to say that an engine is rested for the rest of the process (a used-up subscription): once per engine. */
  onNote(notify: (message: string) => void): void {
    this.notify = notify;
  }

  /** An engine failure's rest; one for the rest of the process is said once (the console). */
  private rest(engine: EngineName, error: EngineFailure, kind: FailureKind): void {
    this.resting.set(engine, { until: this.now() + error.cooldownMs, reason: message(error).slice(0, 200), kind });
    if (Number.isFinite(error.cooldownMs) || this.saidResting.has(engine)) return;
    this.saidResting.add(engine);
    const fallback = this.deps.config.fallback && this.deps.config.fallback !== engine ? this.deps.config.fallback : null;
    this.notify?.(`WARNING: brain engine ${engine} is off for the rest of this process after ${kind}: ${message(error).slice(0, 200)}; its questions go to ${fallback ?? "Jev/code (no BRAIN_FALLBACK)"}`);
  }

  get config(): BrainConfig {
    return this.deps.config;
  }

  private now(): number {
    return this.deps.now ? this.deps.now() : Date.now();
  }

  /** The engine configured for this label. */
  engineFor(label: string): EngineName {
    return this.deps.config.byPrefix[labelPrefix(label)] ?? this.deps.config.engine;
  }

  /**
   * Whether an engine gets tools (BRAIN_TOOLS / BRAIN_<ENGINE>_TOOLS). Defaults: DeepSeek off (v3 parity); with
   * KNOWLEDGE_PREFIX=full every engine off (the whole knowledge base is in the system prompt; set on explicitly to
   * add them); otherwise the others on.
   */
  toolsFor(engine: EngineName): boolean {
    const set = this.deps.config.engines[engine].tools ?? this.deps.config.tools;
    if (set !== null && set !== undefined) return set;
    // Codex runs with no tool at all (engines/codex.ts isolation): it ignores a tool list.
    return engine !== "deepseek" && engine !== "codex" && this.deps.config.knowledgePrefix !== "full";
  }

  /** Calls made to an engine so far in this process (re-asks included). */
  callsMade(engine: EngineName): number {
    return this.calls.get(engine) ?? 0;
  }

  /** Whether an engine's call budget (BRAIN_<ENGINE>_MAX_CALLS) has room; DeepSeek always (the loop keeps its budget). */
  budgetLeft(engine: EngineName): boolean {
    const max = this.deps.config.engines[engine].maxCalls;
    return max === null || max === undefined || this.callsMade(engine) < max;
  }

  /**
   * An engine that cannot run in this process (Brain.preflight: `claude --version` failed): rested for good, so
   * its questions go to the fallback, or fail at once without starting it when there is none.
   */
  markUnavailable(engine: EngineName, reason: string): void {
    this.resting.set(engine, { until: Number.POSITIVE_INFINITY, reason: reason.slice(0, 200), kind: "unavailable" });
  }

  /** The engine resting now (after a quota / rate-limit failure), if any. */
  restingUntil(engine: EngineName): number | null {
    const rest = this.resting.get(engine);
    return rest && rest.until > this.now() ? rest.until : null;
  }

  private reaskFor(engine: EngineName, req: BrainRequest): boolean {
    const set = this.deps.config.engines[engine].reask ?? this.deps.config.reask;
    if (set !== null) return set;
    if (req.spec.reask) return true;
    return engine !== "deepseek" || Boolean(req.tools && req.tools.length > 0);
  }

  /** An answer's problems: the ones that make it unusable (hard) and the ones only worth a re-ask (soft). */
  private static check(req: BrainRequest, result: BrainAnswer): { hard: string[]; soft: string[] } {
    if (result.answer === null) return { hard: result.problems.length > 0 ? result.problems : ["no answer"], soft: [] };
    const hard = req.spec.validate(result.answer);
    return { hard, soft: hard.length === 0 && req.spec.softValidate ? req.spec.softValidate(result.answer) : [] };
  }

  /** The engine, or an EngineFailure("unavailable") saying why not. */
  private engine(name: EngineName): BrainEngine {
    try {
      return this.deps.engine(name);
    } catch (error) {
      throw new EngineFailure(message(error), "unavailable");
    }
  }

  /** Whether the fallback may be asked: it can run here and the caller's budget for it has room. */
  private canFallBackTo(name: EngineName): boolean {
    return this.available(name) && (!this.deps.fallbackBudget || this.deps.fallbackBudget.left(name));
  }

  private available(name: EngineName): boolean {
    try {
      this.deps.engine(name);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * One question: the configured engine (tools stripped when that engine does not get them), validation, at most
   * one re-ask, fallback on an engine failure. Throws when no engine produced an answer object (the last error), or
   * an answer failure as the engine threw it.
   */
  async decide(req: BrainRequest): Promise<BrainAnswer> {
    const primary = this.engineFor(req.label);
    const fallback = this.deps.config.fallback && this.deps.config.fallback !== primary ? this.deps.config.fallback : null;
    const rest = this.resting.get(primary);
    let result: Attempt;
    const restNote = rest ? (Number.isFinite(rest.until) ? `resting until ${new Date(rest.until).toISOString()} after ${rest.kind}: ${rest.reason}` : `unavailable for this process: ${rest.reason}`).slice(0, 300) : "";
    if (rest && rest.until > this.now() && fallback && this.canFallBackTo(fallback)) {
      // Resting after a quota / rate-limit failure: straight to the fallback, no wait on the primary.
      const fellBackFrom = { engine: primary, error: restNote };
      const began = this.now();
      try {
        result = { ...(await this.attempt(fallback, req, true)), fellBackFrom };
      } catch (error) {
        this.write(fallback, req, null, error, { ...fellBackFrom, kind: rest.kind }, this.spent(error, began));
        throw error;
      }
      this.write(result.engine, req, result, undefined, { ...fellBackFrom, kind: rest.kind });
      return result;
    }
    if (rest && !Number.isFinite(rest.until)) {
      // Unavailable for good and no fallback to ask: fail now instead of starting it again for every question.
      const error = new EngineFailure(restNote, "unavailable");
      this.write(primary, req, null, error);
      throw error;
    }
    const began = this.now();
    try {
      result = await this.attempt(primary, req);
    } catch (error) {
      if (isAnswerFailure(error)) {
        this.write(primary, req, null, error, undefined, this.spent(error, began));
        throw error;
      }
      const kind = failureKind(error);
      if (error instanceof EngineFailure && error.cooldownMs > 0) this.rest(primary, error, kind);
      if (!fallback || !this.canFallBackTo(fallback)) {
        this.write(primary, req, null, error, undefined, this.spent(error, began));
        throw error;
      }
      const fellBackFrom = { engine: primary, error: message(error).slice(0, 300) };
      const again = this.now();
      try {
        result = { ...(await this.attempt(fallback, req, true)), fellBackFrom };
      } catch (second) {
        this.write(fallback, req, null, second, { ...fellBackFrom, kind }, this.spent(second, again));
        throw second;
      }
      this.write(result.engine, req, result, undefined, { ...fellBackFrom, kind });
      return result;
    }
    if (fallback && BrainRouter.unusable(req, result) && this.canFallBackTo(fallback)) return this.fallBackOnAnswer(primary, fallback, req, result);
    this.write(result.engine, req, result);
    return result;
  }

  /** Whether an engine's answer is unusable after its re-ask: none, or one with hard problems. */
  private static unusable(req: BrainRequest, result: BrainAnswer): boolean {
    return result.answer === null || req.spec.validate(result.answer).length > 0;
  }

  /**
   * The primary answered, but not usably after its re-ask: BRAIN_FALLBACK is asked once. Its answer (usable or
   * not) is returned with fellBackFrom; when it fails as an engine, the primary's unusable answer is returned (the
   * caller then falls back to Jev/code); its answer failure is thrown as it is.
   */
  private async fallBackOnAnswer(primary: EngineName, fallback: EngineName, req: BrainRequest, first: Attempt): Promise<BrainAnswer> {
    this.write(primary, req, first);
    const fellBackFrom = { engine: primary, error: `answer unusable after the re-ask: ${first.problems.join("; ") || "no answer"}`.slice(0, 300) };
    let result: Attempt;
    const began = this.now();
    try {
      result = { ...(await this.attempt(fallback, req, true)), fellBackFrom };
    } catch (error) {
      this.write(fallback, req, null, error, { ...fellBackFrom, kind: "invalid" }, this.spent(error, began));
      if (isAnswerFailure(error)) throw error;
      return first;
    }
    this.write(result.engine, req, result, undefined, { ...fellBackFrom, kind: "invalid" });
    return result;
  }

  /**
   * One engine: its answer validated, re-asked once when it fails and re-asking is on. Soft problems
   * (AnswerSpec.softValidate) are re-asked the same way, but an answer with only soft problems stays usable: the
   * re-asked answer when it has no hard problems, else the first one.
   */
  private async attempt(name: EngineName, request: BrainRequest, asFallback = false): Promise<Attempt> {
    const engine = this.engine(name);
    const req: BrainRequest = this.toolsFor(name) ? request : { ...request, tools: [] };
    const first = await this.call(engine, req, asFallback);
    const firstCheck = BrainRouter.check(req, first);
    const firstProblems = [...firstCheck.hard, ...firstCheck.soft];
    if (firstProblems.length === 0) return { ...first, problems: [] };
    const usableFirst = firstCheck.hard.length === 0;
    if (!this.reaskFor(name, req)) return { ...first, problems: firstProblems };
    const previous = first.raw ?? (first.answer === null ? "" : JSON.stringify(first.answer));
    let second: BrainAnswer;
    try {
      second = await this.call(engine, { ...req, reask: { answer: previous || "(no answer)", problems: firstProblems } }, asFallback);
    } catch (error) {
      if (isAnswerFailure(error)) throw error;
      const problems = [...firstProblems, `re-ask failed: ${message(error).slice(0, 200)}`];
      return { ...first, answer: usableFirst ? first.answer : null, problems, first: { answer: first.answer, problems: firstProblems }, reasks: 1, reaskCalls: 1 };
    }
    const secondCheck = BrainRouter.check(req, second);
    const secondProblems = [...secondCheck.hard, ...secondCheck.soft];
    const sum = (a: number | undefined, b: number | undefined): number | undefined => (a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0));
    const usage: BrainAnswer["usage"] = { inputTokens: first.usage.inputTokens + second.usage.inputTokens, outputTokens: first.usage.outputTokens + second.usage.outputTokens };
    for (const key of ["cacheHitTokens", "cacheWriteTokens", "reasoningTokens", "costUsd"] as const) {
      const total = sum(first.usage[key], second.usage[key]);
      if (total !== undefined) usage[key] = total;
    }
    // The re-asked answer when it is usable; else the first one when that was (its soft problems stand); else none.
    const keepFirst = secondCheck.hard.length > 0 && usableFirst;
    const chosen = keepFirst ? first : second;
    return {
      ...chosen,
      attempts: first.attempts + second.attempts,
      latencyMs: first.latencyMs + second.latencyMs,
      usage,
      toolCalls: [...first.toolCalls, ...second.toolCalls],
      answer: secondCheck.hard.length === 0 ? second.answer : keepFirst ? first.answer : null,
      problems: keepFirst ? [...firstProblems, ...secondProblems.map((problem) => `re-ask: ${problem}`)] : secondProblems,
      first: { answer: first.answer, problems: firstProblems },
      reasks: 1,
      reaskCalls: second.attempts,
    };
  }

  /** engine.decide within the engine's call budget (and, as the fallback, the caller's) and under its timeout (BRAIN_<ENGINE>_TIMEOUT_MS, or the request's). */
  private async call(engine: BrainEngine, req: BrainRequest, asFallback = false): Promise<BrainAnswer> {
    if (!this.budgetLeft(engine.name)) {
      const field = `BRAIN_${engine.name.toUpperCase()}_MAX_CALLS`;
      throw new EngineFailure(`${engine.name} call budget used up (${this.callsMade(engine.name)}/${this.deps.config.engines[engine.name].maxCalls}, ${field})`, "budget");
    }
    if (asFallback && this.deps.fallbackBudget) {
      if (!this.deps.fallbackBudget.left(engine.name)) throw new EngineFailure(`${engine.name} call budget used up (the caller's, as the fallback)`, "budget");
      this.deps.fallbackBudget.spend(engine.name);
    }
    this.calls.set(engine.name, this.callsMade(engine.name) + 1);
    const ms = req.timeoutMs ?? this.deps.config.engines[engine.name].timeoutMs;
    if (!ms) return engine.decide(req);
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new BrainTimeoutError(engine.name, ms));
      }, ms);
    });
    try {
      const answer = await Promise.race([engine.decide({ ...req, timeoutMs: ms }, controller.signal), timeout]);
      this.timeouts.delete(engine.name);
      return answer;
    } catch (error) {
      if (error instanceof BrainTimeoutError) this.noteTimeout(engine.name, ms);
      else this.timeouts.delete(engine.name);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /** A timeout: TIMEOUT_REST_AFTER in a row rest the engine for TIMEOUT_REST_MS. */
  private noteTimeout(engine: EngineName, ms: number): void {
    const count = (this.timeouts.get(engine) ?? 0) + 1;
    if (count < TIMEOUT_REST_AFTER) {
      this.timeouts.set(engine, count);
      return;
    }
    this.timeouts.delete(engine);
    this.resting.set(engine, { until: this.now() + TIMEOUT_REST_MS, reason: `${count} timeouts in a row (${ms} ms each)`, kind: "timeout" });
  }

  /** What a failed attempt cost: the wall clock since it began, and the tokens its error says it used (errorUsage). */
  private spent(error: unknown, began: number): { latencyMs: number; usage?: BrainUsage } {
    const usage = errorUsage(error);
    return { latencyMs: Math.max(0, this.now() - began), ...(usage ? { usage } : {}) };
  }

  /**
   * One log row. A failed question (no result) has `failed`: its real wall clock and known usage (fix-queue-v4 #8:
   * 41VAUAM2EFY7 F34's 300 s timeout was logged as 0 ms).
   */
  private write(engine: EngineName, req: BrainRequest, result: Attempt | null, error?: unknown, fellBackFrom?: BrainLogRow["fell_back_from"], failed?: { latencyMs: number; usage?: BrainUsage }): void {
    let model = result?.model ?? "";
    const effort = result ? result.effort : (req.effort ?? this.deps.config.engines[engine]?.effort ?? undefined);
    if (!result) {
      try {
        model = this.deps.engine(engine).model;
      } catch {
        model = "";
      }
    }
    const row: BrainLogRow = {
      ts: new Date().toISOString(),
      ...(req.runId ? { run_id: req.runId } : {}),
      label: req.label,
      engine,
      model,
      ...(effort ? { effort } : {}),
      system_sha: sha(req.system),
      system_chars: req.system.length,
      ...(req.knowledge ? { knowledge: req.knowledge } : {}),
      ...(req.memory === undefined ? {} : { memory: req.memory }),
      question: req.question,
      ...(req.options ? { options: req.options } : {}),
      payload: req.payload,
      tools: (this.toolsFor(engine) ? req.tools ?? [] : []).map((tool) => tool.name),
      tool_calls: result?.toolCalls ?? [],
      answer: result?.answer ?? null,
      problems: result?.problems ?? [],
      reasks: result?.reasks ?? 0,
      attempts: result?.attempts ?? 0,
      latency_ms: result?.latencyMs ?? failed?.latencyMs ?? 0,
      usage: result?.usage ?? failed?.usage ?? { inputTokens: 0, outputTokens: 0 },
      ...(result?.first ? { first: result.first } : {}),
      ...(fellBackFrom ? { fell_back_from: fellBackFrom } : {}),
      ...(error === undefined ? {} : { error: message(error).slice(0, 500), error_kind: failureKind(error) }),
      ...(result?.raw !== undefined && result.answer === null ? { raw: result.raw.slice(0, 4000) } : {}),
      ...(result?.reasoning ? { reasoning_chars: result.reasoning.length } : {}),
    };
    try {
      if (this.deps.log) this.deps.log(row);
      else if (this.deps.config.log) {
        mkdirSync(dirname(this.deps.config.log), { recursive: true });
        appendFileSync(this.deps.config.log, `${JSON.stringify(row)}\n`, "utf8");
      }
    } catch {
      // logging must never break play
    }
  }
}

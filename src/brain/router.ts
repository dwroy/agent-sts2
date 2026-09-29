/**
 * The brain router (docs/v4-architecture.md §2): picks the engine for a question from the environment, validates
 * the answer (AnswerSpec.validate), re-asks at most once with the specific problems, falls back to another
 * engine when one fails or times out, and writes one row per question to logs/brain.jsonl.
 *
 * Switching engines is configuration only (config.ts readBrainConfig):
 *   BRAIN_ENGINE=claude|deepseek               default deepseek (v3 behaviour); codex, dsh: named, not built yet
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
 *   fallback, so an unattended run never waits on an engine that cannot answer. An answer failure the engine
 *   reports as such (`answerFailure`: DeepSeek answered, unusably) is passed on for the caller's own recovery.
 * - Keys never reach the log: rows hold the request, the answer, the usage and error texts only.
 */
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import type { BrainConfig } from "../config.js";
import type { BrainAnswer, BrainEngine, BrainRequest, EngineName } from "./types.js";

/** The env-var suffix of a label: its first segment, upper case, non-alphanumerics as "_". */
export function labelPrefix(label: string): string {
  return (label.split("/")[0] ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

/** An error that means "the engine answered, but unusably" (not an engine failure): no fallback. */
export function isAnswerFailure(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { answerFailure?: unknown }).answerFailure === true;
}

export type FailureKind = "quota" | "rate_limit" | "overloaded" | "auth" | "timeout" | "unavailable" | "error";

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
  label: string;
  engine: EngineName;
  model: string;
  system_sha: string;
  system_chars: number;
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

  constructor(private readonly deps: RouterDeps) {}

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

  /** Whether an engine gets tools (BRAIN_TOOLS / BRAIN_<ENGINE>_TOOLS; DeepSeek off by default: v3 parity). */
  toolsFor(engine: EngineName): boolean {
    return this.deps.config.engines[engine].tools ?? this.deps.config.tools ?? engine !== "deepseek";
  }

  /** The engine resting now (after a quota / rate-limit failure), if any. */
  restingUntil(engine: EngineName): number | null {
    const rest = this.resting.get(engine);
    return rest && rest.until > this.now() ? rest.until : null;
  }

  private reaskFor(engine: EngineName, req: BrainRequest): boolean {
    const set = this.deps.config.engines[engine].reask ?? this.deps.config.reask;
    if (set !== null) return set;
    return engine !== "deepseek" || Boolean(req.tools && req.tools.length > 0);
  }

  /** The engine, or an EngineFailure("unavailable") saying why not. */
  private engine(name: EngineName): BrainEngine {
    try {
      return this.deps.engine(name);
    } catch (error) {
      throw new EngineFailure(message(error), "unavailable");
    }
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
    if (rest && rest.until > this.now() && fallback && this.available(fallback)) {
      // Resting after a quota / rate-limit failure: straight to the fallback, no wait on the primary.
      const fellBackFrom = { engine: primary, error: `resting until ${new Date(rest.until).toISOString()} after ${rest.kind}: ${rest.reason}`.slice(0, 300) };
      try {
        result = { ...(await this.attempt(fallback, req)), fellBackFrom };
      } catch (error) {
        this.write(fallback, req, null, error, { ...fellBackFrom, kind: rest.kind });
        throw error;
      }
      this.write(result.engine, req, result, undefined, { ...fellBackFrom, kind: rest.kind });
      return result;
    }
    try {
      result = await this.attempt(primary, req);
    } catch (error) {
      if (isAnswerFailure(error)) {
        this.write(primary, req, null, error);
        throw error;
      }
      const kind = failureKind(error);
      if (error instanceof EngineFailure && error.cooldownMs > 0) this.resting.set(primary, { until: this.now() + error.cooldownMs, reason: message(error).slice(0, 200), kind });
      if (!fallback || !this.available(fallback)) {
        this.write(primary, req, null, error);
        throw error;
      }
      const fellBackFrom = { engine: primary, error: message(error).slice(0, 300) };
      try {
        result = { ...(await this.attempt(fallback, req)), fellBackFrom };
      } catch (second) {
        this.write(fallback, req, null, second, { ...fellBackFrom, kind });
        throw second;
      }
      this.write(result.engine, req, result, undefined, { ...fellBackFrom, kind });
      return result;
    }
    this.write(result.engine, req, result);
    return result;
  }

  /** One engine: its answer validated, re-asked once when it fails and re-asking is on. */
  private async attempt(name: EngineName, request: BrainRequest): Promise<Attempt> {
    const engine = this.engine(name);
    const req: BrainRequest = this.toolsFor(name) ? request : { ...request, tools: [] };
    const first = await this.call(engine, req);
    const firstProblems = first.answer === null ? (first.problems.length > 0 ? first.problems : ["no answer"]) : req.spec.validate(first.answer);
    if (firstProblems.length === 0) return { ...first, problems: [] };
    if (!this.reaskFor(name, req)) return { ...first, problems: firstProblems };
    const previous = first.raw ?? (first.answer === null ? "" : JSON.stringify(first.answer));
    let second: BrainAnswer;
    try {
      second = await this.call(engine, { ...req, reask: { answer: previous || "(no answer)", problems: firstProblems } });
    } catch (error) {
      if (isAnswerFailure(error)) throw error;
      return { ...first, answer: null, problems: [...firstProblems, `re-ask failed: ${message(error).slice(0, 200)}`], first: { answer: first.answer, problems: firstProblems }, reasks: 1 };
    }
    const secondProblems = second.answer === null ? (second.problems.length > 0 ? second.problems : ["no answer"]) : req.spec.validate(second.answer);
    const sum = (a: number | undefined, b: number | undefined): number | undefined => (a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0));
    const usage: BrainAnswer["usage"] = { inputTokens: first.usage.inputTokens + second.usage.inputTokens, outputTokens: first.usage.outputTokens + second.usage.outputTokens };
    for (const key of ["cacheHitTokens", "cacheWriteTokens", "reasoningTokens", "costUsd"] as const) {
      const total = sum(first.usage[key], second.usage[key]);
      if (total !== undefined) usage[key] = total;
    }
    return {
      ...second,
      attempts: first.attempts + second.attempts,
      latencyMs: first.latencyMs + second.latencyMs,
      usage,
      toolCalls: [...first.toolCalls, ...second.toolCalls],
      answer: secondProblems.length === 0 ? second.answer : null,
      problems: secondProblems,
      first: { answer: first.answer, problems: firstProblems },
      reasks: 1,
    };
  }

  /** engine.decide under the engine's timeout (BRAIN_<ENGINE>_TIMEOUT_MS, or the request's). */
  private async call(engine: BrainEngine, req: BrainRequest): Promise<BrainAnswer> {
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
      return await Promise.race([engine.decide({ ...req, timeoutMs: ms }, controller.signal), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  private write(engine: EngineName, req: BrainRequest, result: Attempt | null, error?: unknown, fellBackFrom?: BrainLogRow["fell_back_from"]): void {
    let model = result?.model ?? "";
    if (!result) {
      try {
        model = this.deps.engine(engine).model;
      } catch {
        model = "";
      }
    }
    const row: BrainLogRow = {
      ts: new Date().toISOString(),
      label: req.label,
      engine,
      model,
      system_sha: sha(req.system),
      system_chars: req.system.length,
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
      latency_ms: result?.latencyMs ?? 0,
      usage: result?.usage ?? { inputTokens: 0, outputTokens: 0 },
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

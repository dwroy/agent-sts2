/**
 * V4 brain contract (docs/v4-architecture.md §2).
 *
 * The brain answers run-level and room-level questions (route, card rewards, shop, rest, events,
 * run plan, and later combat escalations from the reflex layer). Which model answers is a config
 * choice: every engine takes the same BrainRequest and returns the same BrainAnswer, and the router
 * owns validation, the single re-ask, fallback and logging, so switching engines is one env var.
 */
import type { JsonSchema, ToolContext, ToolDef } from "../tools/types.js";

export type EngineName = "deepseek" | "claude" | "codex" | "dsh";

/** Reasoning effort (claude --effort, codex model_reasoning_effort; xhigh: codex, Dai 2026-10-03). */
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** The answer format for one question kind, shared by every engine. */
export interface AnswerSpec {
  /** Question label, e.g. "reward/card", "map/route-plan". */
  label: string;
  /**
   * "pick": the answer's `choice` names one of the request's option keys (an engine may map an option's
   * name to its key); "plan": a free-form object in the question's format (shop list, run plan, fight plan).
   */
  kind: "pick" | "plan";
  /** JSON Schema of the answer object (JSON mode instruction, tool schema, --json-schema, --output-schema). */
  schema: JsonSchema;
  /** Problems with a parsed answer; [] means valid. Messages are specific enough to re-ask with. */
  validate(answer: unknown): string[];
  /**
   * Problems worth the one re-ask that still leave the answer usable (a route riding on a card pick: M2). When they
   * remain after the re-ask, the answer is kept and they are reported as its minor problems (the caller drops the
   * part they concern: an illegal route keeps the plan).
   */
  softValidate?(answer: unknown): string[];
  /**
   * Re-ask on problems even where the engine's default is not to (DeepSeek without tools keeps v3's own repair):
   * the route questions (M2). An explicit BRAIN_REASK / BRAIN_<ENGINE>_REASK still wins.
   */
  reask?: boolean;
}

export interface BrainRequest {
  label: string;
  /** Stable prefix: rules + knowledge. Byte-identical across a run so prefix caches hit. */
  system: string;
  /**
   * Run memory (journal), most stable part first: a string, or named sections in cache order (sent in that
   * order, empty sections dropped; the v3 DeepSeek user message depends on the exact layout).
   */
  memory?: string | Record<string, unknown>;
  /** The instruction for this decision. */
  question: string;
  /**
   * A choice question's options: option key -> criteria text (JSON of the option's facts, or null). When set,
   * the payload is the state and the answer names one key; when absent, the payload is the task's input.
   */
  options?: Record<string, string | null>;
  /** State (choice question) or task input as JSON-serialisable data. */
  payload: unknown;
  spec: AnswerSpec;
  /** Tools the engine may call; engines without tool support ignore them (their system carries the knowledge). */
  tools?: ToolDef[];
  /** What the tools read (ascension, act, knowledge and log dirs, live state); required when tools are given. */
  toolContext?: ToolContext;
  /**
   * Set by the router on its one re-ask: the previous answer as the model gave it and the problems found in it.
   * Engines render it as a follow-up turn (same conversation where the engine keeps one).
   */
  reask?: { answer: string; problems: string[] };
  effort?: Effort;
  timeoutMs?: number;
  /** What the system prompt carries when KNOWLEDGE_PREFIX is set (brain/knowledge.ts); logged in brain.jsonl. */
  knowledge?: KnowledgeNote;
  /** The run the question belongs to (the state's run_id, as decisions.jsonl logs it); logged in brain.jsonl. */
  runId?: string;
}

/** The knowledge a request carries (KNOWLEDGE_PREFIX=full), or why it fell back to v3's prompt. */
export interface KnowledgeNote {
  mode: "off" | "full";
  /** The ascension the prefix was rendered for. */
  ascension?: number;
  /** Hash and size of the rendered prefix (the same on every question while the data holds). */
  prefix_sha?: string;
  prefix_chars?: number;
  /** Why v3's prompt went out instead of the full knowledge. */
  error?: string;
}

export interface BrainUsage {
  /** Every prompt token, cached or not (DeepSeek prompt_tokens; Claude input + cache read + cache write). */
  inputTokens: number;
  /** Prompt tokens read from the cache. */
  cacheHitTokens?: number;
  /** Prompt tokens written to the cache (Claude cache_creation_input_tokens). */
  cacheWriteTokens?: number;
  outputTokens: number;
  reasoningTokens?: number;
  /** Engine-reported or price-table estimate; undefined when unknown (e.g. subscription CLI). */
  costUsd?: number;
}

export interface ToolCallRecord {
  name: string;
  input: unknown;
  /** Full tool output as returned to the model (kept for replay). */
  output: string;
  isError?: boolean;
  ms: number;
}

export interface BrainAnswer {
  engine: EngineName;
  model: string;
  /** The reasoning effort the engine asked for, when it sets one (codex model_reasoning_effort); logged in brain.jsonl. */
  effort?: string;
  /** The parsed answer when it passed spec.validate, else null. */
  answer: unknown | null;
  /** Remaining problems when answer is null (or minor ones the router accepted). */
  problems: string[];
  /** Model calls spent, including re-asks. */
  attempts: number;
  latencyMs: number;
  usage: BrainUsage;
  toolCalls: ToolCallRecord[];
  reasoning?: string;
  raw?: string;
  /**
   * The engine's own result object, for callers that log engine-specific fields (DeepSeek: the v3 answer with
   * its guide/handbook ids, effort and consistency record). Not logged by the router.
   */
  native?: unknown;
  /** Set when the router fell back to another engine; names the engine that failed and why. */
  fellBackFrom?: { engine: EngineName; error: string };
  /** Model calls the router's re-ask made (set by the router when it re-asked; the loop counts them against its budget). */
  reaskCalls?: number;
}

export interface BrainEngine {
  readonly name: EngineName;
  readonly model: string;
  /** One attempt (plus any repair loop the engine runs internally). The router validates and re-asks. */
  decide(req: BrainRequest, signal?: AbortSignal): Promise<BrainAnswer>;
  /**
   * The engine's latest reading of its plan's limits (codex: the usage guard, engines/codex-usage.ts), for the
   * brain.jsonl rows about it (`limits`); null or absent when there is none.
   */
  limits?(): object | null;
}

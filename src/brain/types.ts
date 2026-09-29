/**
 * V4 brain contract (docs/v4-architecture.md §2).
 *
 * The brain answers run-level and room-level questions (route, card rewards, shop, rest, events,
 * run plan, and later combat escalations from the reflex layer). Which model answers is a config
 * choice: every engine takes the same BrainRequest and returns the same BrainAnswer, and the router
 * owns validation, the single re-ask, fallback and logging, so switching engines is one env var.
 */
import type { JsonSchema, ToolDef } from "../tools/types.js";

export type EngineName = "deepseek" | "claude" | "codex" | "dsh";

export type Effort = "low" | "medium" | "high" | "max";

/** The answer format for one question kind, shared by every engine. */
export interface AnswerSpec {
  /** Question label, e.g. "reward/card", "map/route-plan". */
  label: string;
  /** JSON Schema of the answer object (JSON mode instruction, tool schema, --json-schema, --output-schema). */
  schema: JsonSchema;
  /** Problems with a parsed answer; [] means valid. Messages are specific enough to re-ask with. */
  validate(answer: unknown): string[];
}

export interface BrainRequest {
  label: string;
  /** Stable prefix: rules + knowledge. Byte-identical across a run so prefix caches hit. */
  system: string;
  /** Run memory (journal), most stable part first. */
  memory?: string;
  /** The instruction for this decision. */
  question: string;
  /** State and options as JSON-serialisable data. */
  payload: unknown;
  spec: AnswerSpec;
  /** Tools the engine may call; engines without tool support ignore them (their system carries the knowledge). */
  tools?: ToolDef[];
  effort?: Effort;
  timeoutMs?: number;
}

export interface BrainUsage {
  inputTokens: number;
  cacheHitTokens?: number;
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
  /** Set when the router fell back to another engine; names the engine that failed and why. */
  fellBackFrom?: { engine: EngineName; error: string };
}

export interface BrainEngine {
  readonly name: EngineName;
  readonly model: string;
  /** One attempt (plus any repair loop the engine runs internally). The router validates and re-asks. */
  decide(req: BrainRequest, signal?: AbortSignal): Promise<BrainAnswer>;
}

/**
 * The decision log (PLAN.md §10.1): one JSONL record per decision, holding the exact state
 * fingerprint, the questions, the answers, and the action taken. This is what makes tuning possible
 * and what makes `replay` meaningful.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import type { JsonValue } from "../util/json.js";

export interface DecisionRecord {
  ts: string;
  mode: string;
  screen: string;
  session: string;
  floor: number | null;
  turn: number | null;
  label: string;
  /** Who made this call: code (rules/solver), jev, deepseek, or code after an unusable model answer. */
  decider?: "code" | "jev" | "deepseek" | "claude" | "code-fallback";
  fingerprint: string;
  questions?: Record<string, JsonValue>;
  answers?: JsonValue;
  chosen?: JsonValue;
  rationale: string;
  confidence: number | null;
  fallback: boolean;
  reasked: boolean;
  /** True when a Jev-eligible decision was resolved by code because the loop ran without Jev. */
  no_jev: boolean;
  /** True when the answer came from the memo instead of a fresh call (so `usage` is zero). */
  reused_answer: boolean;
  /** `usage` counts the tokens spent on *this* decision; these are the calls behind it. */
  request_ids: string[];
  latency_ms: { plan: number; jev: number; action: number };
  usage: { input_tokens: number; output_tokens: number };
  /** Present when the decision was escalated to DeepSeek. */
  escalation?: JsonValue;
  /** Jev context version of this question (JEV_CONTEXT), present when not "off". */
  jev_context?: string;
  /** Fight-hint ids sent to Jev (src/knowledge/jev-hints.json). */
  jev_hints?: string[];
  /**
   * Which item of DeepSeek's tempo/strategy guidance Jev's pick differs from (the option's tempo note,
   * factual: "differs from DeepSeek's race: 10 less damage than the highest-damage line"). Information
   * only; whether the pick was right is judged by outcomes (ops/plan_adherence.py), not by this label.
   */
  differs_from_tempo?: string;
  /** The guidance in force when differs_from_tempo was logged. */
  tempo_context?: { run_plan_version: number | null; fight_objective: string | null };
  /**
   * Legacy (logs before 2026-09-28): the same fact under judgmental names. No longer written; kept in the
   * type so old logs stay readable (ops/plan_adherence.py reads both).
   */
  intent_deviation?: JsonValue;
  tempo_deviation?: string;
  /** DeepSeek's guidance (strategy/tempo excerpt) shown with the question. */
  ds_guidance?: string[];
  /** Jev's pick in code's reference rank (1 = code's reference option), of how many shown. */
  reference_rank?: number | null;
  reference_of?: number;
  matched_reference?: boolean;
  /** Jev's pick is not code's reference rank 1 (a fact: the reference is rule-based and can be wrong). */
  differs_from_reference?: boolean;
  result: string;
}

export interface DecisionLog {
  readonly path: string;
  write(record: DecisionRecord): void;
  close(): void;
}

export function createDecisionLog(path: string): DecisionLog {
  let ready = false;
  const ensure = (): void => {
    if (ready) return;
    mkdirSync(dirname(path), { recursive: true });
    ready = true;
  };
  return {
    path,
    write(record) {
      try {
        ensure();
        appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8");
      } catch {
        // Losing a log line must never stop a run.
      }
    },
    close() {
      // Nothing buffered: writes are synchronous so a crash cannot lose the tail.
    },
  };
}

/**
 * Raw states behind each logged decision, in the `record` fixture format, so every live run doubles as
 * a replay fixture (`replay --ask` over the exact boards the loop saw).
 */
export interface StateLog {
  write(entry: { ts: string; fingerprint: string; screen: string; session: string; state: unknown }): void;
}

export function createStateLog(path: string): StateLog {
  let ready = false;
  return {
    write(entry) {
      try {
        if (!ready) {
          mkdirSync(dirname(path), { recursive: true });
          ready = true;
        }
        appendFileSync(path, `${JSON.stringify(entry)}\n`, "utf8");
      } catch {
        // Same rule as the decision log: never stop a run over a log line.
      }
    },
  };
}

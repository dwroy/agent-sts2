/**
 * The decision log (PLAN.md §10.1): one JSONL record per decision, holding the exact state
 * fingerprint, the questions, the answers, and the action taken. This is what makes tuning possible
 * and what makes `replay` meaningful.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import type { JsonValue } from "../util/json.js";

export interface DecisionRecord {
  ts: string;
  mode: string;
  screen: string;
  session: string;
  floor: number | null;
  turn: number | null;
  label: string;
  /** This decision's id: Jev's prompts for it (jev-prompts.jsonl) carry the same one. */
  decision_id?: string;
  /** Who made this call: code (rules/solver), jev, deepseek, or code after an unusable model answer. */
  decider?: "code" | "jev" | "deepseek" | "claude" | "code-fallback";
  fingerprint: string;
  questions?: Record<string, JsonValue>;
  answers?: JsonValue;
  chosen?: JsonValue;
  rationale: string;
  confidence: number | null;
  fallback: boolean;
  /** A model was asked a second time for this decision: Jev's follow-up, or DeepSeek's re-ask by the consistency guard. */
  reasked: boolean;
  /** True when a Jev-eligible decision was resolved by code because the loop ran without Jev. */
  no_jev: boolean;
  /** True when the answer came from the memo instead of a fresh call (so `usage` is zero). */
  reused_answer: boolean;
  /** `usage` counts the tokens spent on *this* decision; these are the calls behind it. */
  request_ids: string[];
  latency_ms: { plan: number; jev: number; action: number; deepseek?: number };
  /**
   * Tokens spent on this decision by whoever decided it (Jev, or DeepSeek when decider=deepseek; a
   * DeepSeek escalation's tokens are added too). DeepSeek also reports its cache-hit and reasoning tokens.
   */
  usage: { input_tokens: number; output_tokens: number; cache_hit_tokens?: number; reasoning_tokens?: number };
  /** Present when the decision was escalated to DeepSeek. */
  escalation?: JsonValue;
  /**
   * BUILD_DECIDER=deepseek: DeepSeek decided this screen itself ({by, direct, choice, reason, latency_ms,
   * tokens, …}); kept apart from `escalation`, whose records compare against a Jev answer.
   */
  deepseek?: JsonValue;
  /** Why a DeepSeek-decided screen was decided by Jev/code instead. */
  deepseek_fallback?: string;
  /** DeepSeek's answer failed the consistency guard: {first, second, resolution, choice} (see src/llm/consistency.ts). */
  deepseek_consistency?: JsonValue;
  /** Jev context version of this question (JEV_CONTEXT), present when not "off". */
  jev_context?: string;
  /** Fight-hint ids sent to Jev (src/knowledge/jev-hints.json). */
  jev_hints?: string[];
  /** Combat plan choice: the rollout behind the facts shown to Jev ({ms, horizon, samples, degraded, best, …}). */
  rollout?: JsonValue;
  /** Combat plan choice: Jev's pick was the rollout's best line (null: no pick, or no rollout). */
  rollout_best_chosen?: boolean | null;
  /** The run the decision was made in (the state's run_id), so a restart can find its rows. */
  run_id?: string;
  /** When the loop read the state this decision was made on (orders the replay; see journal-replay.ts). */
  observed_ts?: string;
  /** What the run journal filed for this decision (the choice text and the model's raw reason), for replay. */
  journal?: { choice: string; reason: string };
  /** The route plan this decision made (map/route-plan, map/route-change), so a restart resumes it instead of re-planning. */
  route_plan?: JsonValue;
  /** A route review that rode on this question (card reward, rest site): {answer, outcome, reason, invalid?, plan_ref?, plan_step?}. */
  route_review?: JsonValue;
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
  write(entry: { ts: string; fingerprint: string; screen: string; session: string; state: unknown; observed_ts?: string; observed?: boolean }): void;
}

/**
 * Where the states behind a decision log go: logs/decisions.jsonl -> logs/states.jsonl; any other name
 * gets its own file next to it (x.jsonl -> x.states.jsonl), so two decision logs in one directory (tests)
 * never share their states, which a restart replays (journal-replay.ts).
 */
export function stateLogPath(decisionLog: string): string {
  const name = basename(decisionLog);
  return join(dirname(decisionLog), name === "decisions.jsonl" ? "states.jsonl" : `${name.replace(/\.jsonl$/, "")}.states.jsonl`);
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

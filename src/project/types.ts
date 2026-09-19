/** Shared shapes for the decision layer (PLAN.md §3.1, §5). */

import type { AnswerSet } from "../jev/answers.js";
import type { QuestionSet } from "../jev/questions.js";
import type { Knowledge } from "../knowledge/index.js";
import type { ActionRequest } from "../mod/client.js";
import type { GameState } from "../mod/schema.js";
import type { JsonValue } from "../util/json.js";
import type { RunBrief } from "./run-brief.js";

export interface DecisionEnv {
  state: GameState;
  knowledge: Knowledge;
  brief: RunBrief;
  thresholds: { act: number; strong: number };
  /** What to do on the main menu: `auto` prefers continuing an existing run. */
  runStart: "auto" | "continue" | "new";
  /** Preferred character id or name for a new run; null means "first unlocked". */
  characterPreference: string | null;
  /** Whether the loop may answer prompts that turn tutorials on (default false). */
  allowFtueModals: boolean;
  /**
   * Trust Jev completely: act on its answer regardless of confidence, and never substitute a
   * code-chosen action. Only the legality gate still applies.
   */
  strictJev: boolean;
}

/**
 * A second, narrower question asked when the first answer was not confident enough. The loop asks
 * it once and resolves it through `map`; there is never a third attempt (PLAN.md §6.1).
 */
export interface ReaskSpec {
  instructions: string;
  criteria: Record<string, string | null>;
  map: Record<string, ActionRequest>;
  /**
   * Used when the shortlist answer is *still* below the act threshold. Without this the loop would
   * accept a near-guess: a live run came back with confidence 0.11 on the narrow question.
   */
  fallbackIntent: ActionRequest;
  fallbackRationale: string;
  /** The threshold the shortlist answer has to clear. */
  actThreshold: number;
}

export interface ResolvedAction {
  /** null means "wait and re-read state" — never an invented action. */
  intent: ActionRequest | null;
  rationale: string;
  confidence: number | null;
  fallback: boolean;
  reask?: ReaskSpec;
}

export interface AskDecision {
  kind: "ask";
  label: string;
  /** The narrow, English payload sent as `state` (PLAN.md §5.1). */
  state: Record<string, JsonValue>;
  questions: QuestionSet;
  resolve(answers: AnswerSet): ResolvedAction;
}

export interface ActDecision {
  kind: "act";
  label: string;
  intent: ActionRequest;
  rationale: string;
}

export type Decision = AskDecision | ActDecision;

/** Returns null when the correct move is to wait (transitions, animations, human pause). */
export type ScreenPlanner = (env: DecisionEnv) => Decision | null;

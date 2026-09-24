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
  /**
   * Per-visit scratch state, owned by the loop and reset whenever the screen changes. The shop needs
   * it to tell "just walked in" from "already browsed and chose to leave" — a stateless planner
   * cannot, and getting that wrong produced an open/close loop on a live run.
   */
  screenMemory: ScreenMemory;
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
  /** Which combat planner to use; undefined means the turn solver. */
  combatPlanner?: "turn" | "card";
  /** Potion ids (or names) to drop when entering a shop, e.g. the Foul Potion. */
  shopDiscardPotions: string[];
}

export interface ScreenMemory {
  screen: string;
  /** True once the shop inventory has been opened during this visit. */
  shopOpened: boolean;
  /**
   * True once a card reward has been skipped on this screen. The mod documents that
   * `skip_reward_cards` "may leave the underlying reward item claimable", and a live run proved it:
   * the loop skipped, re-claimed the same card reward, and skipped again forever.
   */
  cardRewardSkipped: boolean;
  /** The rest of the combat plan chosen this turn (combat-plan.ts); null when there is none. */
  combatPlan: CombatPlanMemo | null;
  /**
   * Turn-start settle guard: the board's hand size and energy, and when either last changed. The
   * turn number flips during the enemy turn, so it cannot tell when the player's draw has landed.
   */
  turnBoard?: { turn: number | null; handLen: number; energy: number; changedAt: number };
  /** Enemy index we last targeted (Surrounded facing). */
  facing?: number | null;
  /**
   * Combat HP guard: extra HP (over the cheapest offered plan) accepted from Jev/escalator plan
   * choices in this fight (`fight` = act:floor). Survives in-combat screen changes; cleared out of combat.
   */
  hpGuard?: { fight: string; extra: number };
  /** Potions in the belt at the start of this combat turn (the per-turn potion cap). */
  potionTurn?: { fight: string; turn: number | null; startCount: number };
}

export interface CombatPlanMemo {
  turn: number | null;
  remaining: import("../strategy/turn-solver.js").Step[];
  /** Hand signature the next step expects; any other hand means the board surprised us. */
  expectedHand: string;
  /**
   * Hand size the next step expects. Commitments are only made past steps that draw nothing, so a
   * bigger hand means the turn's draw was still landing when the plan was made: replan.
   */
  handLen: number;
  via: "code" | "jev" | "deepseek" | "claude";
}

export function createScreenMemory(screen = ""): ScreenMemory {
  return { screen, shopOpened: false, cardRewardSkipped: false, combatPlan: null };
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
  /** Set when a model other than Jev made the call (escalation). */
  decider?: "jev" | "deepseek" | "claude";
  /** Set when code replaced the chosen option (combat HP guard): the option actually played. */
  guard?: { kind: "hp"; choice: string; plan: string };
}

export interface AskDecision {
  kind: "ask";
  label: string;
  /** The narrow, English payload sent as `state` (PLAN.md §5.1). */
  state: Record<string, JsonValue>;
  questions: QuestionSet;
  resolve(answers: AnswerSet): ResolvedAction;
  /**
   * Phase 2: when Jev's answer to `question` is below `below` confidence, the loop may ask DeepSeek
   * the same question (same state, same option keys) and resolve with its choice instead.
   */
  escalate?: { question: string; below: number; why: string };
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

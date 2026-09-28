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
  /** Jev's combat plan-choice context (config JEV_CONTEXT); undefined means "off". */
  jevContext?: "off" | "v1";
  /** DeepSeek's whole-fight plan at the start of elite/boss fights (config FIGHT_PLAN); undefined means "off". */
  fightPlan?: "off" | "v1";
  /**
   * Who decides deck building, route and rest sites (config BUILD_DECIDER). "deepseek": those screens ask
   * DeepSeek directly with code's values as facts, falling back to the Jev/code decision; undefined or
   * "jev": Jev with DeepSeek as the low-confidence escalation (the baseline).
   */
  buildDecider?: "deepseek" | "jev";
}

export interface ScreenMemory {
  screen: string;
  /** True once the shop inventory has been opened during this visit. */
  shopOpened: boolean;
  /** When combat was first seen with no living enemy (multi-phase boss between phases). */
  noEnemiesSince?: number;
  /**
   * True once a card reward has been skipped on this screen. The mod documents that
   * `skip_reward_cards` "may leave the underlying reward item claimable", and a live run proved it:
   * the loop skipped, re-claimed the same card reward, and skipped again forever.
   */
  cardRewardSkipped: boolean;
  /** The rest of the combat plan chosen this turn (combat-plan.ts); null when there is none. */
  combatPlan: CombatPlanMemo | null;
  /**
   * The combat plan's remaining steps when an in-combat card choice opened (the screen change clears
   * combatPlan): an exhaust pick keeps the cards the plan still means to play. Cleared out of combat.
   */
  planBeforeSelection?: import("../strategy/turn-solver.js").Step[];
  /** Gambler's Brew drunk by a plan this turn: the hand cards (ids) the plan discards with it. */
  gambleDiscards?: { turn: number | null; cardIds: string[] };
  /** Fight key where Pael's Eye's extra turn was taken (once per fight). */
  paelsEyeFight?: string;
  /** Enemy max HP (non-minions) at the fight's first look: a bigger total later means a new boss phase. */
  fightStart?: { fight: string; maxHp: number };
  /** The fight's encounter (first enemy ids seen, sorted, "+"-joined) for the rollout facts (rollout-live.ts). */
  rolloutEncounter?: { fight: string; enc: string };
  /**
   * The steps still planned after the card being played, kept even when combatPlan is dropped because
   * that card draws (4V5T F24 T4: Burning Pact drew, the plan was dropped, and its exhaust took the True
   * Grit the plan played next). Only read for the same turn.
   */
  plannedAfter?: { turn: number | null; steps: import("../strategy/turn-solver.js").Step[] };
  /**
   * Turn-start settle guard: the board's hand size and energy, and when either last changed. The
   * turn number flips during the enemy turn, so it cannot tell when the player's draw has landed.
   */
  turnBoard?: { turn: number | null; handLen: number; energy: number; changedAt: number };
  /** Enemy index we last targeted (Surrounded facing); cleared out of combat. */
  facing?: number | null;
  /**
   * Cards played per turn in this fight (Withering Presence counts them across turns: every 6th adds
   * a Wither), and the Wither damage last seen in hand. Cleared out of combat.
   */
  fightCards?: { fight: string; perTurn: Record<string, number>; witherDamage: number };
  /** "fight:turn" in which a card that costs HP was played (Demon Tongue heals the first loss a turn). */
  demonTongueTurn?: string;
  /**
   * Combat HP guard: extra HP (over the cheapest offered plan) accepted from Jev/escalator plan
   * choices in this fight (`fight` = act:floor), one entry per turn (the plan played that turn; a
   * re-plan replaces it). Survives in-combat screen changes; cleared out of combat.
   */
  hpGuard?: { fight: string; turns: Record<string, number> };
  /** Potions in the belt at the start of this combat turn (the per-turn potion cap). */
  potionTurn?: { fight: string; turn: number | null; startCount: number };
  /** Potion ids the fight plan's auto-drink used this fight: one each (H5MZ F39: both Power Potions went T1). */
  planPotionsDrunk?: { fight: string; ids: string[] };
  /**
   * The last map seen (MAP screen), kept across screens: the REST screen carries no map, and whether
   * the next node is a forced elite is on the map (G8AQ F24, XJWF F7).
   */
  lastMap?: RememberedMap;
  /** DeepSeek's plan for the current elite/boss fight (FIGHT_PLAN=v1); cleared out of combat. */
  fightPlan?: import("../strategy/fight-plan.js").FightPlan | null;
  /** Fight key (act:floor) whose plan request failed: not retried in the same fight. */
  fightPlanFailed?: string;
  /** DeepSeek's run plan (RUN_PLAN=v1): strategy weights for build and route decisions. Kept across screens. */
  runPlan?: import("../strategy/run-plan.js").RunPlan | null;
  /** "runId:floor" of a failed run-plan request: not retried on the same floor. */
  runPlanFailed?: string;
  /** DeepSeek's route for the current act (BUILD_DECIDER=deepseek); code follows it node by node. */
  routePlan?: import("../screens/map.js").RoutePlan;
  /** "runId:act" whose route-plan request failed: the rest of the act uses the Jev/code route choice. */
  routePlanFailed?: string;
  /**
   * The event last seen and its floor, kept across screens: an end page of that event on a later floor
   * is a stale frame (YNMB F4/F7, X226 F6). staleSince: when that stale frame was first seen.
   */
  eventSeen?: { runId: string; eventId: string; floor: number | null; staleSince?: number };
}

export interface RememberedMap {
  runId: string;
  /** Floor shown on the MAP screen (the node we stood on; the next room is floor + 1). */
  floor: number | null;
  nodes: { row: number; col: number; type: string; children: { row: number; col: number }[] }[];
  available: { row: number; col: number; type: string }[];
  /** The node we stood on when the map was shown, and the act boss's node (run memory lookahead). */
  current?: { row: number; col: number } | null;
  boss?: { row: number; col: number } | null;
  /** act_id the map belongs to: a map from the previous act says nothing about this one. */
  act?: string | null;
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
  /**
   * Living enemies ("index:id") when the plan was made. A kill shifts the game's enemy indices, so a
   * planned target_index then hits the wrong enemy (NEVM F23 T2: Bash meant for the Silk Bowlbug went
   * into the sleeping beetle's Plating): replan.
   */
  enemies?: string;
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
  /** Extra decision-log fields (combat: the rollout facts' timing, and whether Jev picked the rollout's best line). */
  log?: { rollout?: JsonValue; rollout_best_chosen?: boolean | null };
  /**
   * Memory effects of this resolution (the combat plan commitment, the HP-guard record). resolve()
   * itself must not touch memory: it may run more than once per decision (Jev, then an escalator).
   * The loop runs this once, for the resolution it plays.
   */
  apply?: () => void;
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
  /**
   * What Jev is asked instead of `state`/`questions` (JEV_CONTEXT=v1): same question keys and option
   * keys, richer option facts, fight hints, a trimmed brief. The escalator keeps `state`/`questions`.
   */
  jevView?: { state: Record<string, JsonValue>; questions: QuestionSet; context: string; hints: string[] };
  /**
   * BUILD_DECIDER=deepseek: DeepSeek answers `question` directly (state/questions are its view: every
   * option with code's value and why, plus the run facts). When DeepSeek is unavailable, fails or is out
   * of budget, the loop plays `baseline` instead: the decision the screen makes without DeepSeek (Jev,
   * then code).
   */
  deepseek?: { question: string; baseline: Decision; onFail?: () => void };
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

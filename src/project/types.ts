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
  /**
   * BUILD_ONESHOT (with BUILD_DECIDER=deepseek): a shop visit, rest site or event option is decided in one
   * DeepSeek question together with the deck card(s) its follow-up takes (screens/oneshot.ts). Undefined
   * means "on"; "off" keeps the step-by-step questions.
   */
  oneshot?: "on" | "off";
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
  /** The combat plan paused while an in-combat card choice is open (loop.ts noteScreenChange); resumed after it. */
  pausedCombatPlan?: CombatPlanMemo;
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
  turnBoard?: {
    /** Which fight the counters are from (run, act, floor): a new fight starts the board over. */
    fight?: string;
    /** A frame of this fight has shown a hand or energy: its counters are this fight's own. */
    live?: boolean;
    turn: number | null;
    handLen: number;
    energy: number;
    changedAt: number;
  };
  /** Enemy index we last targeted (Surrounded facing); cleared out of combat. */
  facing?: number | null;
  /**
   * Cards played by hand per turn in this fight, recorded every fight (Withering Presence counts them
   * across turns; the Knowledge Demon curse pick reads the per-turn mean), and the Wither damage last seen in hand. Cleared out of combat.
   */
  fightCards?: { fight: string; perTurn: Record<string, number>; witherDamage: number };
  /** "fight:turn" in which a card that costs HP was played (Demon Tongue heals the first loss a turn). */
  demonTongueTurn?: string;
  /**
   * Each capped enemy's HP at the first combat decision of the turn (`key` = fight:turn): Hardened Shell's
   * 20 a turn is what is left of it, not 20 again at every re-plan (combat-plan carryHpLossCaps).
   */
  turnStartHp?: { key: string; hp: Record<string, number> };
  /**
   * The exhaust pile's size at the first combat frame of the turn (`key` = fight:turn): a bigger pile later means
   * a card was exhausted this turn (Evil Eye; combat-plan exhaustedSinceTurnStart).
   */
  turnStartExhaust?: { key: string; size: number };
  /**
   * Lizard Tail (once a run: back at 50% of max HP instead of dying) seen to trigger this run: the relic shows
   * no used mark (logged `stack` null, `is_melted` false before and after). `last` is the last combat state
   * read while it is held (combat-plan trackLizardTail). Kept across the run; rebuilt by the journal replay.
   */
  lizardTail?: { runId: string; used: boolean; last?: { fight: string; turn: number; hp: number; lethal: boolean; fairies: number } };
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
  /**
   * An event option chosen with a potion discarded first (every slot full, the option gives a potion; event.ts):
   * the discard is played, then this option on the same event page.
   */
  eventAfterDiscard?: { runId: string; eventId: string; floor: number | null; option: number; title: string; at: number };
  /** The enchantments the last event's options named ("迅速2: …"), for the enchant screen that follows. */
  eventEnchants?: { runId: string; floor: number | null; lines: string[] };
  /** DeepSeek's one-shot plan for the current shop visit (BUILD_ONESHOT; screens/shop.ts). */
  shopPlan?: import("../screens/shop.js").ShopPlan;
  /** The deck card(s) a one-shot plan named for the selection screen its action opens (screens/oneshot.ts). */
  pendingPick?: import("../screens/oneshot.js").PendingPick;
  /** visitKey of a one-shot question whose answer was unusable: that visit is asked step by step. */
  oneshotFailed?: string;
  /** One-shot plans played in this run (their references count up). */
  planSeq?: { runId: string; n: number };
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
  /**
   * The node chosen from this map (the room we are in until the next MAP screen): set when the map move
   * is sent, and by the replay after a restart. The REWARD and REST states carry no map position.
   */
  chosen?: { row: number; col: number; type: string } | null;
  /** Hallway/elite fights in a row ending at `current` (the route model's fight chain). */
  fights?: number;
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
  /**
   * After a potion step: the potion belt the next step expects ("slot:potion_id" of the occupied slots, the
   * drunk slot gone). A potion does not leave the hand, so the hand (unchanged, handLen the same) cannot tell
   * whether it was drunk; the belt does. Unset after a card step.
   */
  potions?: string;
  /**
   * Resumed after an in-combat card choice (loop.ts noteScreenChange): the choice may have exhausted or upgraded
   * cards in the hand, so the hand only has to hold what the rest of the line plays (combat-plan.ts).
   */
  afterSelection?: boolean;
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
  /**
   * Extra decision-log fields (combat: the rollout facts' timing, whether Jev picked the rollout's best line,
   * the kill order behind the chosen line's rollout numbers, and the per-target options' focus by key).
   */
  log?: { rollout?: JsonValue; rollout_best_chosen?: boolean | null; chosen_order?: string; potions?: JsonValue; focus?: Record<string, string> };
  /**
   * A DeepSeek one-shot plan this decision made (BUILD_ONESHOT): its reference and steps, logged in the
   * row's `deepseek` record (plan_id, plan, plan_step 1); the later steps are their own rows.
   */
  plan?: { id: string; steps: JsonValue };
  /** The run journal's text for this choice when no option text says it (a shop plan). */
  journal?: string;
  /**
   * The route review that rode on this question (card reward, rest site; screens/route-review.ts): DeepSeek's
   * `route` answer and what code did with it. Logged in the row (route_review); a change is also logged as
   * its own map/route-change row, a step of this decision's plan (no call of its own).
   */
  routeReview?: RouteReviewResult;
  /**
   * Memory effects of this resolution (the combat plan commitment, the HP-guard record). resolve()
   * itself must not touch memory: it may run more than once per decision (Jev, then an escalator).
   * The loop runs this once, for the resolution it plays.
   */
  apply?: () => void;
}

/** DeepSeek's `route` answer on a question with a route review, and what code did with it. */
export interface RouteReviewResult {
  /** The answer's `route` as given (null: none). */
  answer: string | null;
  /** keep: the plan stays; change: the answer's route is the act's plan now; invalid: kept (why in `invalid`). */
  outcome: "keep" | "change" | "invalid";
  /** The answer's `route_reason`. */
  reason: string;
  invalid?: string;
  /** A change: the plan reference and step it is, the route key, the paths from here before and after, and the plan's why. */
  change?: { ref: string; step: number; key: string; from: string; to: string; why: string };
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
  deepseek?: {
    question: string;
    baseline: Decision;
    onFail?: () => void;
    /**
     * A one-shot question (BUILD_ONESHOT): when DeepSeek's answer is unusable (unparseable, an unknown
     * option, inconsistent, an invalid plan) the loop calls this and re-plans, so the screen asks its
     * step-by-step questions, instead of playing `baseline` (which stays the fallback when DeepSeek is
     * unavailable, fails in transport or is out of budget).
     */
    oneshot?: { fallback: () => void };
    /** The answer is a JSON plan (a shop's shopping list), not an option key: resolved by this. */
    plan?: { resolve(json: Record<string, unknown>): ResolvedAction | { invalid: string } };
    /** Deck card ids the question offers beyond the screen's own (cards to smith or remove): the knowledge slice's offered cards. */
    offeredCards?: string[];
  };
}

export interface ActDecision {
  kind: "act";
  label: string;
  intent: ActionRequest;
  rationale: string;
  /**
   * A step of a DeepSeek one-shot plan that code executes (BUILD_ONESHOT): logged as decider deepseek with
   * a reused `deepseek` record carrying the plan's reference and the step number (no call is made).
   */
  plan?: PlanStepMark;
  /** Memory effect once this action is dispatched (a plan step advancing its plan). */
  apply?: () => void;
}

/** Which plan a code-executed step belongs to (ActDecision.plan). */
export interface PlanStepMark {
  /** The plan's reference (its plan_id in the row that made it). */
  ref: string;
  /** 1-based step number within the plan. */
  step: number;
  /** The plan's own words for this step (an option key, "remove:c7", a card name). */
  choice: string;
}

export type Decision = AskDecision | ActDecision;

/** Returns null when the correct move is to wait (transitions, animations, human pause). */
export type ScreenPlanner = (env: DecisionEnv) => Decision | null;

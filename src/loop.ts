/**
 * The decision loop (PLAN.md §7).
 *
 * One iteration: read state → plan → ask Jev → gate → dispatch → verify → log. Every guard in
 * PLAN.md §8.1 lives here: legality, staleness, one action in flight, budget caps, circuit breaker,
 * and the run boundary.
 */

import { randomUUID } from "node:crypto";
import { dirname } from "node:path";

import { classifyFailure, dispatch } from "./act/dispatch.js";
import { fingerprint, gate, type GateResult } from "./act/gate.js";
import { wireIntent, withExpect } from "./act/identity.js";
import type { AppConfig } from "./config.js";
import type { AnswerSet } from "./jev/answers.js";
import { withJevRetry, type JevClient } from "./jev/client.js";
import type { Escalator } from "./llm/file-escalation.js";
import { DeepSeekAnswerError, DeepSeekClient, DeepSeekInconsistentError } from "./llm/deepseek.js";
import { createBrain, toolContextOf, type Brain, type BrainChoice, type BrainMeta, type BrainMetaUsage } from "./brain/brain.js";
import { moveModel } from "./knowledge/move-model.js";
import { facingFightOf, fightKind, noteFacing, trackLizardTail } from "./screens/combat-plan.js";
import { FIGHT_PLAN_TASK, fightKey, fightPlanInput, fightPlanJson, isFightPlanReply, loadFightPlan, logFightPlan, needsReplan, parseFightPlan } from "./strategy/fight-plan.js";
import { actOf, isRunPlanReply, loadRunPlan, logRunPlan, parseRunPlan, RUN_PLAN_TASK, runPlanInput, runPlanLine, runPlanTrigger } from "./strategy/run-plan.js";
import type { Knowledge } from "./knowledge/index.js";
import type { ActionRequest, ModClient } from "./mod/client.js";
import type { ActionResult, GameState } from "./mod/schema.js";
import { addNote, buildRunBrief } from "./project/run-brief.js";
import { isMenuRunId, ObservedStateLog, readRunLogs, replayRun } from "./project/journal-replay.js";
import { compact, describeChoice, memoryChars, memorySections, RunJournal } from "./project/run-journal.js";
import { createScreenMemory, type AskDecision, type DecisionEnv, type ResolvedAction, type RouteReviewResult, type ScreenMemory } from "./project/types.js";
import { planDecision } from "./screens/index.js";
import { rememberChosenNode, rememberMap } from "./screens/rest.js";
import { createDecisionLog, createStateLog, stateLogPath, type DecisionRecord } from "./telemetry/decision-log.js";
import { askJevLogged, createJevPromptLog, resolveJevPromptLog, type JevPromptMeta } from "./telemetry/jev-prompt-log.js";
import { createRunConfigLog } from "./telemetry/run-config.js";
import { SlController } from "./sl/controller.js";
import { asArray, asRecord, bool, num, str, toJsonValue, type JsonValue } from "./util/json.js";
import { OUTCOME_BASIS_KEY } from "./knowledge/outcome-facts.js";
import { withBossSim, type BuildSimSetup } from "./sim/build-sim-facts.js";

export type LoopMode = "shadow" | "play";

/**
 * One answered question, kept so an unchanged board does not pay for the same answer twice.
 * The *resolved* action is stored, not the raw answers: when a low-confidence answer triggered a
 * shortlist re-ask, only the finished resolution is reusable (a live run showed the raw-answers
 * version could not complete a decision it had already paid for).
 */
interface AnswerMemo {
  key: string;
  resolved: ResolvedAction;
  answers: AnswerSet;
}

export interface LoopOptions {
  config: AppConfig;
  mode: LoopMode;
  client: ModClient;
  /**
   * null runs the loop without Jev: every screen that would ask falls back to its code-side choice.
   * That mode exists to exercise the plumbing against the real game without spending tokens.
   */
  jev: JevClient | null;
  /** Escalation chain for Jev's near-guesses (Claude via files, then DeepSeek); empty disables it. */
  escalators?: Escalator[];
  knowledge: Knowledge;
  maxRuns?: number;
  maxDecisions?: number;
  maxMinutes?: number;
  /**
   * How long past `maxMinutes` a fight (or the run-end bookkeeping) may run before the loop stops
   * anyway. Default: a quarter of `maxMinutes`, at most 30.
   */
  combatGraceMinutes?: number;
  pollIntervalMs?: number;
  onEvent?: (event: LoopEvent) => void;
  /**
   * On the first state of a run already in progress (a restart), rebuild the run journal, the route plan
   * and the last map from that run's logs (journal-replay.ts). Default true.
   */
  restoreRun?: boolean;
  /** Backoff before each retry of a transient Jev failure (5xx/429/timeout); default 2/4/8/16 s. */
  jevRetryDelaysMs?: readonly number[];
  /**
   * BOSS_SIM_BUILD=on (B3): the runner that simulates the act boss for each option of a deck-building question DeepSeek
   * decides (src/sim/build-sim-facts.ts); absent or null: the questions as they were.
   */
  buildSim?: BuildSimSetup | null;
  /** SL (SL_ENABLED): the reload's poll interval (default 500 ms; tests make it short). */
  slPollMs?: number;
}

export interface LoopStats {
  decisions: number;
  jevCalls: number;
  deepseekCalls: number;
  deepseekTokens: number;
  claudeCalls: number;
  /** Answers reused instead of re-asking Jev about a board that had not moved. */
  debounced: number;
  /** Jev calls skipped because the board moved between planning and asking. */
  staleSkips: number;
  fallbacks: number;
  acts: number;
  waits: number;
  unsupported: number;
  errors: number;
  inputTokens: number;
  outputTokens: number;
  /** One entry per finished run, so the tokens of a run can be read on their own. */
  runs: RunTokenSummary[];
  runsCompleted: number;
  stoppedBecause: string;
  elapsedMs: number;
  logPath: string;
}

export interface RunTokenSummary {
  index: number;
  outcome: string;
  decisions: number;
  jevCalls: number;
  inputTokens: number;
  outputTokens: number;
  maxFloor: number | null;
  elapsedMs: number;
}

export type LoopEvent =
  | { type: "note"; message: string }
  | { type: "wait"; screen: string; reason: string }
  | { type: "decision"; record: DecisionRecord; totals: LoopTotals }
  /** Emitted when the game leaves combat, carrying the running session totals. */
  | { type: "combat_end"; totals: LoopTotals; turn: number | null }
  | { type: "stop"; reason: string };

/** A snapshot of the session counters, so a reporter can show spend while a run is still going. */
export interface LoopTotals {
  decisions: number;
  acts: number;
  jevCalls: number;
  inputTokens: number;
  outputTokens: number;
  elapsedMs: number;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Actions that preserve progression after a run ends, in the order to try them. The mod documents
 * that `continue_game_over` is what writes the score/unlock save and that leaving for the main menu
 * first skips it, so this runs before we stop.
 */
const FINALIZE_ACTIONS = ["continue_game_over", "confirm_unlock"] as const;
const MAX_FINALIZE_ACTIONS = 5;
/**
 * Gate refusals on one board (the same fingerprint, at decision or at dispatch) before the loop stops re-planning
 * the same thing: in combat it ends the turn, elsewhere it plays code's baseline decision (no model, no Jev).
 */
export const GATE_REJECTION_LIMIT = 3;

/** Wait until the board actually moves, or give up after a bounded delay. */
async function waitForStateChange(options: {
  client: ModClient;
  previous: string;
  timeoutMs: number;
  pollIntervalMs: number;
}): Promise<"changed" | "timeout"> {
  const deadline = Date.now() + options.timeoutMs;
  while (Date.now() < deadline) {
    await sleep(options.pollIntervalMs);
    try {
      const state = await options.client.state();
      if (fingerprint(state) !== options.previous) return "changed";
    } catch {
      // Keep waiting; the loop's own error handling reports a broken mod.
    }
  }
  return "timeout";
}

/** A short, human-readable note about what an action did, fed into the Run Brief. */
function noteForAction(state: GameState, resolved: ResolvedAction, label: string): string | null {
  const intent = resolved.intent;
  if (!intent) return null;
  const action = intent.action;
  if (label.startsWith("combat/")) return null;
  switch (action) {
    case "choose_map_node": {
      const map = asRecord(state.raw["map"]);
      const node = asArray(map["available_nodes"])
        .map(asRecord)
        .find((entry) => num(entry["index"]) === intent.option_index);
      return `floor ${state.run?.floor ?? "?"}: moved to ${str(node?.["node_type"], "a node")}`;
    }
    case "choose_reward_card":
      return "took a card reward";
    case "skip_reward_cards":
      return "skipped a card reward";
    case "buy_card":
    case "buy_relic":
    case "buy_potion":
      return "bought something in a shop";
    case "remove_card_at_shop":
      return "paid to remove a card";
    case "choose_rest_option":
      return "used a rest site";
    case "choose_event_option":
      return `event choice (${str(asRecord(state.raw["event"])["title"])})`;
    case "select_character":
      return "picked a character";
    case "embark":
      return "started a new run";
    case "continue_run":
      return "continued an existing run";
    case "select_deck_card":
      return "card selection";
    case "choose_bundle":
      return "chose a starting bundle";
    default:
      return null;
  }
}

export async function runLoop(options: LoopOptions): Promise<LoopStats> {
  const { config, mode, client, knowledge } = options;
  const jev = options.jev;
  const pollIntervalMs = options.pollIntervalMs ?? 400;
  const jevRetry = {
    ...(options.jevRetryDelaysMs ? { delaysMs: options.jevRetryDelaysMs } : {}),
    onRetry: (info: { attempt: number; of: number; delayMs: number; error: { kind: string; status: number | null; message: string } }) =>
      onEvent({
        type: "note",
        message: `Jev call failed transiently (${info.error.kind}${info.error.status === null ? "" : ` ${info.error.status}`}: ${info.error.message}); retry ${info.attempt}/${info.of} in ${Math.round(info.delayMs / 1000)}s`,
      }),
  };
  const maxDecisions = options.maxDecisions ?? 2_000;
  const maxRuns = options.maxRuns ?? 1;
  const maxMinutes = options.maxMinutes ?? 60;
  const log = createDecisionLog(config.log.decisionLog);
  const statesPath = stateLogPath(config.log.decisionLog);
  const stateLog = createStateLog(statesPath);
  // Every request to Jev, verbatim (V4 M3): joins the decision rows by decision_id.
  const promptLogPath = resolveJevPromptLog(config.log);
  const promptLog = promptLogPath ? createJevPromptLog(promptLogPath) : null;
  /** When the loop read the current iteration's state (orders a replay of the logs after a restart). */
  let observedTs = "";
  // States that changed the run journal without a decision on them are logged too (`observed`), so a
  // restarted process can replay the journal (journal-replay.ts).
  const observedStates = new ObservedStateLog((state, fp, ts) =>
    stateLog.write({ ts, observed_ts: ts, observed: true, fingerprint: fp, screen: state.screen, session: `${state.session.mode}/${state.session.phase}`, state: state.raw }),
  );
  const logState = (state: GameState, fp: string, ts: string): void => {
    observedStates.logging(state);
    stateLog.write({ ts, observed_ts: observedTs, fingerprint: fp, screen: state.screen, session: `${state.session.mode}/${state.session.phase}`, state: state.raw });
  };
  const onEvent = options.onEvent ?? ((): void => {});
  const startedAt = Date.now();
  const deadline = startedAt + maxMinutes * 60_000;
  // The time cap waits for a safe point: TQX5 stopped between the end of turn 8 and the boss's turn,
  // so the run never reached GAME_OVER and its result was never recorded. Hard stop after the grace.
  const hardDeadline = deadline + (options.combatGraceMinutes ?? Math.min(30, maxMinutes / 4)) * 60_000;

  const stats: LoopStats = {
    decisions: 0,
    jevCalls: 0,
    deepseekCalls: 0,
    deepseekTokens: 0,
    claudeCalls: 0,
    debounced: 0,
    staleSkips: 0,
    fallbacks: 0,
    acts: 0,
    waits: 0,
    unsupported: 0,
    errors: 0,
    inputTokens: 0,
    outputTokens: 0,
    runs: [],
    runsCompleted: 0,
    stoppedBecause: "unknown",
    elapsedMs: 0,
    logPath: log.path,
  };

  let notes: string[] = [];
  let hasSeenRun = false;
  let consecutiveFailures = 0;
  let lastShadowFingerprint: string | null = null;
  // Debounce (PLAN.md §8.1). Jev answers in well under a second, so the loop can outrun the game's
  // animations: this memo means one question per (board, decision) and one answer per board change.
  // It is cleared on every dispatch, so an answer can never be reused across an action.
  let answerMemo: AnswerMemo | null = null;
  // Consecutive gate refusals on the board `gateRejectedFp` (at decision or at dispatch); only an action that is sent
  // starts them over. At GATE_REJECTION_LIMIT the loop ends the turn (combat) or plays code's baseline instead of spinning.
  let gateRejections = 0;
  let gateRejectedFp: string | null = null;
  // The last gate refusal logged ("fingerprint|reason"): a refusal repeated on the same board is logged once.
  let lastRefusalLogged: string | null = null;
  const readMemo = (key: string): AnswerMemo | null =>
    answerMemo !== null && answerMemo.key === key ? answerMemo : null;
  let unsupportedScreen: string | null = null;
  let unsupportedCount = 0;
  // Planner failures need their own counter: a successful state read resets `consecutiveFailures`,
  // so sharing it meant a planner that threw on every iteration never tripped the breaker.
  let plannerFailures = 0;
  /* Run-boundary bookkeeping: once a run ends we finish the score/unlock actions, then stop. */
  let runEndPhase: "none" | "finalizing" | "done" = "none";
  let runEndDeadline = 0;
  let finalizeActions = 0;
  /** Baseline for the per-run token accounting, captured when a run begins. */
  let runBaseline = {
    decisions: 0,
    jevCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    startedAt: Date.now(),
    maxFloor: null as number | null,
  };
  /** Whether the previous state was in combat, so the end of a fight can be noticed. */
  let inCombatTracked = false;
  /** Reset whenever the screen changes; the shop uses it to tell "just arrived" from "chose to leave". */
  const screenMemory: ScreenMemory = createScreenMemory();
  /** Run memory for DeepSeek (choices, this fight's turns, the road to the boss); resets per run id. */
  const journal = new RunJournal();
  /** The run whose logs were replayed into the journal (once per run id and process). */
  let restoredRun = "";
  /** The DeepSeek client among the escalators (run plan, fight plan, BUILD_DECIDER=deepseek), if any. */
  const deepseekClient = (options.escalators ?? []).find((escalator): escalator is DeepSeekClient => escalator instanceof DeepSeekClient) ?? null;
  /**
   * V4: the DeepSeek decision calls go through the brain router (src/brain), which picks the engine from BRAIN_*;
   * unset, it is DeepSeek with v3's exact requests and results. The DeepSeek client stays the brain's system
   * prompt source and the budget's owner.
   */
  // DeepSeek asked as the fallback (another engine first) answers to DEEPSEEK_MAX_CALLS too: the router checks it and
  // counts the call here before making it (a call that throws is counted).
  const fallbackBudget = {
    left: (engine: string): boolean => engine !== "deepseek" || stats.deepseekCalls < (config.deepseek?.maxCalls ?? 0),
    spend: (engine: string): void => {
      if (engine === "deepseek") stats.deepseekCalls += 1;
    },
  };
  const brain: Brain | null = deepseekClient ? createBrain(config, deepseekClient, { fallbackBudget }) : null;
  brain?.onNote((message) => onEvent({ type: "note", message }));
  // Before play: a configured engine that cannot run is said once, loudly, and rested for the process (Brain.preflight).
  for (const problem of brain ? await brain.preflight() : []) onEvent({ type: "note", message: `ERROR: ${problem}` });
  // One row per run with the configuration it is played with (logs/run-config.jsonl; tools/eval metrics --group-by config).
  // SL (docs/sl.md): null when SL_ENABLED is off, and then nothing below differs from a loop without it.
  const sl = config.sl?.enabled
    ? new SlController({ config: config.sl, knowledge, client, note: (message) => onEvent({ type: "note", message }), ...(options.slPollMs === undefined ? {} : { pollMs: options.slPollMs }) })
    : null;
  const runConfigLog = createRunConfigLog({ config, brain, jevEnabled: jev !== null, mode, note: (message) => onEvent({ type: "note", message }), ...(sl ? { sl: sl.describe() } : {}) });
  const deepseekBudgetLeft = (): boolean => stats.deepseekCalls < (config.deepseek?.maxCalls ?? 0);
  /**
   * Whether the brain may take a question with this label. An engine other than DeepSeek (BRAIN_ENGINE_*) has its own
   * budget (BRAIN_<ENGINE>_MAX_CALLS, counted by the router), so its questions do not spend DEEPSEEK_MAX_CALLS; once
   * it is used up the router asks BRAIN_FALLBACK, and DeepSeek's budget applies again.
   */
  const brainBudgetLeft = (label: string): boolean => {
    if (!brain) return deepseekBudgetLeft();
    const engine = brain.engineFor(label);
    return (engine !== "deepseek" && brain.router.budgetLeft(engine)) || deepseekBudgetLeft();
  };
  /** Whether DeepSeek is asked first for this label (its call is counted up front, as v3 did). */
  const deepseekFirst = (label: string): boolean => !brain || brain.engineFor(label) === "deepseek";
  /** The router's re-ask on a question DeepSeek was asked first (a route checked by its AnswerSpec: M2): its calls. */
  const reaskCalls = (label: string, via: BrainMeta | undefined): number => (deepseekFirst(label) && via?.engine === "deepseek" ? (via.reask_calls ?? 0) : 0);
  /**
   * A plan's calls (run plan, fight plan) when DeepSeek is asked first: v3's one per plan, the router's re-asks, or
   * the one that failed before another engine answered. DeepSeek asked as the fallback was counted as it was asked
   * (fallbackBudget).
   */
  const countPlan = (label: string) => (tokens: number, via: BrainMeta | undefined): void => {
    if (deepseekFirst(label)) stats.deepseekCalls += via?.engine === "deepseek" ? via.attempts : 1;
    stats.deepseekTokens += tokens;
  };
  /**
   * The last direct DeepSeek decision (BUILD_DECIDER=deepseek), keyed by the question's content: a board
   * that moved without changing the question (an animation, a re-read before dispatch) is not asked
   * twice. Cleared on every dispatch.
   */
  // Assigned inside a closure (the DeepSeek accept step): the cast keeps TS from narrowing it to null.
  let deepseekMemo = null as { key: string; resolved: ResolvedAction; record: Record<string, JsonValue> } | null;
  // A silent wait is indistinguishable from a hang. After ~10 s on an unchanged screen, say so.
  let stallKey: string | null = null;
  let stallCount = 0;
  const noteStall = (state: GameState, reason: string): void => {
    const key = `${state.screen}|${state.available_actions.join(",")}|${reason}`;
    stallCount = stallKey === key ? stallCount + 1 : 1;
    stallKey = key;
    if (stallCount === 25) {
      onEvent({
        type: "note",
        message:
          `stuck for ${stallCount} polls on ${state.screen} ` +
          `(available actions: ${state.available_actions.join(", ") || "none"}) — ${reason}`,
      });
    }
  };
  const clearStall = (): void => {
    stallKey = null;
    stallCount = 0;
  };

  const stop = (reason: string): void => {
    stats.stoppedBecause = reason;
    onEvent({ type: "stop", reason });
  };

  const budgetReason = (): string | null => {
    if (stats.decisions >= maxDecisions) return `decision cap reached (${maxDecisions})`;
    if (stats.jevCalls >= config.budgets.maxRequests) return `request cap reached (${config.budgets.maxRequests})`;
    if (stats.inputTokens + stats.outputTokens >= config.budgets.maxTokens) {
      return `token cap reached (${config.budgets.maxTokens})`;
    }
    if (Date.now() > deadline) {
      const busy = inCombatTracked || runEndPhase === "finalizing";
      if (!busy) return `time cap reached (${maxMinutes} min)`;
      if (Date.now() > hardDeadline) return `time cap reached (${maxMinutes} min, still ${inCombatTracked ? "in combat" : "finishing the run"} after the grace period)`;
    }
    if (consecutiveFailures >= 3) return "circuit breaker: 3 consecutive failures";
    return null;
  };

  const totals = (): LoopTotals => ({
    decisions: stats.decisions,
    acts: stats.acts,
    jevCalls: stats.jevCalls,
    inputTokens: stats.inputTokens,
    outputTokens: stats.outputTokens,
    elapsedMs: Date.now() - startedAt,
  });

  for (;;) {
    const budget = budgetReason();
    if (budget) {
      stop(budget);
      break;
    }

    let state: GameState;
    try {
      state = await client.state();
    } catch (error) {
      const failure = classifyFailure(error);
      stats.errors += 1;
      consecutiveFailures += 1;
      if (failure.kind === "fatal") {
        stop(`fatal: ${failure.detail}`);
        break;
      }
      onEvent({ type: "note", message: `state read failed (${failure.kind}): ${failure.detail}` });
      await sleep(pollIntervalMs);
      continue;
    }
    consecutiveFailures = 0;

    /* ---- combat boundary: report the running total once a fight ends ------------------------ */

    const inCombat = state.in_combat || state.screen === "COMBAT";
    if (inCombat && !inCombatTracked) {
      inCombatTracked = true;
    } else if (!inCombat && inCombatTracked) {
      inCombatTracked = false;
      onEvent({ type: "combat_end", turn: state.turn, totals: totals() });
    }

    /* ---- run boundary (PLAN.md §8.1) ------------------------------------------------------- */

    const inRun = state.session.phase === "run" && state.run !== null;
    if (inRun) {
      if (!hasSeenRun) {
        hasSeenRun = true;
        runBaseline = {
          decisions: stats.decisions,
          jevCalls: stats.jevCalls,
          inputTokens: stats.inputTokens,
          outputTokens: stats.outputTokens,
          startedAt: Date.now(),
          maxFloor: state.run?.floor ?? null,
        };
      } else if (state.run?.floor != null) {
        runBaseline.maxFloor = Math.max(runBaseline.maxFloor ?? 0, state.run.floor);
      }
    }
    const runEnded = hasSeenRun && (state.screen === "GAME_OVER" || !inRun);
    let planned: ReturnType<typeof planDecision> | null = null;

    if (runEnded) {
      // SL: the fight being tracked ends with the run (the loop may stop before the per-state call below).
      sl?.observe(state, { journal, screenMemory });
      const gameOver = asRecord(state.raw["game_over"]);
      const victory = bool(gameOver["is_victory"]);
      const outcome = victory ? "victory" : state.screen === "GAME_OVER" ? "defeat" : "run ended";

      if (runEndPhase === "none") {
        runEndPhase = "finalizing";
        runEndDeadline = Date.now() + 15_000;
        onEvent({ type: "note", message: `run ended (${outcome}): finishing the score/unlock bookkeeping, then stopping` });
      }

      if (runEndPhase === "finalizing") {
        const action = FINALIZE_ACTIONS.find((candidate) => state.available_actions.includes(candidate));
        if (action && finalizeActions < MAX_FINALIZE_ACTIONS) {
          finalizeActions += 1;
          // Route it through the normal dispatch path so it is gated, logged and budgeted like any
          // other action. These three are the mod's progression-preserving actions: the docs warn
          // that leaving the score screen without `continue_game_over` skips the save.
          planned = {
            kind: "decision",
            decision: {
              kind: "act",
              label: "run/finalize",
              intent: { action },
              rationale: `${outcome}: saving the result with ${action} before stopping`,
            },
          };
        } else if (
          Date.now() < runEndDeadline &&
          state.screen === "GAME_OVER" &&
          str(gameOver["phase"]) === "summary_animating"
        ) {
          // The score screen animates before it accepts a click; wait for that, not for a state that
          // simply has nothing left to do (which means we should stop now).
          onEvent({ type: "wait", screen: state.screen, reason: `waiting for the ${outcome} screen to settle` });
          await sleep(pollIntervalMs);
          continue;
        } else {
          runEndPhase = "done";
        }
      }

      if (runEndPhase === "done") {
        stats.runsCompleted += 1;
        stats.runs.push({
          index: stats.runsCompleted,
          outcome,
          decisions: stats.decisions - runBaseline.decisions,
          jevCalls: stats.jevCalls - runBaseline.jevCalls,
          inputTokens: stats.inputTokens - runBaseline.inputTokens,
          outputTokens: stats.outputTokens - runBaseline.outputTokens,
          maxFloor: runBaseline.maxFloor,
          elapsedMs: Date.now() - runBaseline.startedAt,
        });
        if (stats.runsCompleted >= maxRuns) {
          stop(`run ${stats.runsCompleted} ended (${outcome}); stopping as requested`);
          break;
        }
        // More runs requested: reset the boundary state and let the menu planner start another.
        hasSeenRun = false;
        runEndPhase = "none";
        finalizeActions = 0;
        notes = [];
      }
    }

    const brief = buildRunBrief(state, knowledge, notes);
    noteScreenChange(screenMemory, state);
    // Per-fight combat records outlive in-combat screen changes (card choices), not the fight.
    if (!state.in_combat) resetFightMemory(screenMemory);
    if (state.screen === "SHOP" && bool(asRecord(state.raw["shop"])["is_open"])) {
      screenMemory.shopOpened = true;
    }
    // A one-shot plan lives for its room: the shop list, and a card named for a selection that never came.
    if (state.screen === "MAP" || state.in_combat) {
      screenMemory.shopPlan = undefined;
      screenMemory.pendingPick = undefined;
    }
    // A restart mid-run: rebuild the run memory and the act's route plan from this run's logs before
    // anything reads them (FA82FQHSJG2F F9: a fresh process re-planned the route without knowing F7 was
    // an elite).
    const runId = str(state.raw["run_id"]);
    runConfigLog?.observe(state);
    if (options.restoreRun !== false && !isMenuRunId(runId) && runId !== restoredRun && journal.runId !== runId) {
      restoredRun = runId;
      try {
        const logs = readRunLogs({ states: statesPath, decisions: config.log.decisionLog, runPlans: config.runPlanLog }, runId);
        if (logs.states.length > 0) {
          const replay = replayRun(logs, knowledge, { journal });
          if (replay.routePlan && replay.routePlan.runId === runId) screenMemory.routePlan = replay.routePlan;
          if (replay.lastMap && !screenMemory.lastMap) screenMemory.lastMap = replay.lastMap;
          if (replay.lizardTail && replay.lizardTail.runId === runId) screenMemory.lizardTail = replay.lizardTail;
          // The turn's first logged frame: a card exhausted before the restart still counts this turn (Evil Eye).
          if (replay.turnStartExhaust && !screenMemory.turnStartExhaust) screenMemory.turnStartExhaust = replay.turnStartExhaust;
          // A restart mid-fight: the Surrounded facing of this fight's last targeted action (else startFacing, stale).
          if (replay.facing && screenMemory.facing === undefined && replay.facing.fight === facingFightOf(state)) {
            screenMemory.facing = replay.facing.index;
            screenMemory.facingFight = replay.facing.fight;
          }
          const plan = replay.routePlan ? `; route plan (act ${replay.routePlan.act}, F${replay.routePlan.floor ?? "?"}) ${replay.routePlan.summary}` : "";
          onEvent({ type: "note", message: `run ${runId} in progress: rebuilt the run memory from its logs (${replay.counts.states} states, ${replay.counts.recorded} decisions, ${replay.counts.runPlans} run plans, ${journal.itemCount} items)${plan}` });
        } else {
          // Never silent (VG7HWJRX44RQ F14: a replay that found nothing left DeepSeek without its history,
          // run plan and route plan, and nothing said so).
          const floor = state.run?.floor ?? null;
          onEvent({ type: "note", message: `run ${runId} (F${floor ?? "?"}): no logged rows to rebuild the run memory from, starting it empty${floor !== null && floor > 1 ? " (the run is past F1: its history, run plan and route plan are lost)" : " (a new run)"}` });
        }
      } catch (error) {
        onEvent({ type: "note", message: `could not rebuild run ${runId} from its logs: ${error instanceof Error ? error.message : String(error)}` });
      }
    }
    // The REST screen has no map: keep the last one for its "forced elite next" check.
    if (state.screen === "MAP") rememberMap(screenMemory, state);
    observedTs = new Date().toISOString();
    const observedFp = fingerprint(state);
    // This board was refused GATE_REJECTION_LIMIT times (at decision or at dispatch): combat ends the turn (at the
    // gate below); elsewhere the screen's code baseline decides (planned without trust-Jev, no model or Jev asked),
    // so nothing is paid again for the same refusal.
    const gateStuck = gateRejectedFp === observedFp && gateRejections >= GATE_REJECTION_LIMIT;
    const endTurnInstead = gateStuck && state.screen === "COMBAT" && state.available_actions.includes("end_turn");
    const gateCodeBaseline = gateStuck && !endTurnInstead;
    observedStates.observed(state, observedFp, observedTs, journal.observe(state, { knowledge, screenMemory }));
    // Lizard Tail's one use this run (no used mark on the relic): read from the states as they come.
    trackLizardTail(screenMemory, state);
    sl?.observe(state, { journal, screenMemory });
    // What the brain's tools read for this state (only used when an engine gets tools).
    brain?.setToolContext(toolContextOf(state, state.run ? actOf(state) : undefined, dirname(config.log.decisionLog)));
    const slEnv = sl?.envFor(state);
    const env: DecisionEnv = {
      state,
      knowledge,
      brief,
      screenMemory,
      thresholds: config.thresholds,
      runStart: config.run.start,
      characterPreference: config.run.character,
      allowFtueModals: config.allowFtueModals,
      // Trust-Jev only means something when there is a Jev to trust: in `--no-jev` mode the
      // deterministic path is the whole point.
      strictJev: config.strictJev && jev !== null,
      combatPlanner: config.combatPlanner,
      shopDiscardPotions: config.shop.discardPotions,
      jevContext: config.jevContext,
      fightPlan: config.fightPlan,
      // BUILD_DECIDER=deepseek needs a DeepSeek client; without one the screens make the baseline decision.
      buildDecider: config.buildDecider === "deepseek" && deepseekClient ? "deepseek" : "jev",
      oneshot: config.buildOneshot,
      ...(slEnv ? { sl: slEnv } : {}),
    };
    // FIGHT_PLAN=v1: DeepSeek plans an elite/boss fight once, before its first decision.
    // RUN_PLAN=v1: DeepSeek's run strategy, renewed at the map screen when a checkpoint is due.
    if (!planned && config.runPlan === "v1" && !state.in_combat && state.screen === "MAP") {
      const deepseek = brain;
      if (deepseek && brainBudgetLeft("run-plan")) {
        const items = journal.itemCount;
        await ensureRunPlan(env, deepseek, journal, config.runPlanLog, observedTs, onEvent, countPlan("run-plan"));
        if (journal.itemCount !== items) observedStates.touched(state, observedFp, observedTs);
      }
    }
    if (config.runPlan === "v1") {
      if (screenMemory.runPlan === undefined && str(state.raw["run_id"])) screenMemory.runPlan = loadRunPlan(config.runPlanLog, str(state.raw["run_id"]));
      const line = screenMemory.runPlan && screenMemory.runPlan.runId === str(state.raw["run_id"]) ? runPlanLine(screenMemory.runPlan) : null;
      if (line) env.brief.plan = line;
    }
    if (!planned && config.fightPlan === "v1" && state.in_combat && state.screen === "COMBAT") {
      const deepseek = brain;
      if (deepseek && brainBudgetLeft("fight-plan")) {
        await ensureFightPlan(env, deepseek, journal, config.fightPlanLog, onEvent, countPlan("fight-plan"));
      }
    }
    if (!planned) {
      try {
        planned = planDecision(gateCodeBaseline ? { ...env, strictJev: false } : env);
      } catch (error) {
        // A planner bug (or a screen whose option set exceeds what a question may carry) must not take
        // the process down: report it, then let the circuit breaker stop the run if it keeps happening.
        stats.errors += 1;
        plannerFailures += 1;
        const detail = error instanceof Error ? error.message : String(error);
        onEvent({ type: "note", message: `planner failed on ${state.screen}: ${detail}` });
        if (plannerFailures >= 3) {
          stop(`planner failed repeatedly: ${detail}`);
          break;
        }
        await sleep(pollIntervalMs);
        continue;
      }
    }
    plannerFailures = 0;

    if (planned.kind === "wait") {
      stats.waits += 1;
      noteStall(state, planned.reason);
      onEvent({ type: "wait", screen: state.screen, reason: planned.reason });
      await sleep(pollIntervalMs);
      continue;
    }
    if (planned.kind === "unsupported") {
      stats.unsupported += 1;
      unsupportedCount = unsupportedScreen === state.screen ? unsupportedCount + 1 : 1;
      unsupportedScreen = state.screen;
      onEvent({ type: "note", message: `unsupported: ${planned.reason}` });
      if (unsupportedCount >= 6) {
        stop(`no planner for screen "${state.screen}"`);
        break;
      }
      await sleep(pollIntervalMs);
      continue;
    }
    if (planned.kind === "blocked") {
      stop(planned.reason);
      break;
    }

    let decision = planned.decision;
    const planStarted = Date.now();
    const stateFingerprint = observedFp;
    const codeBaseline = gateCodeBaseline && decision.kind === "ask";
    if (codeBaseline && decision.kind === "ask" && decision.deepseek) decision = decision.deepseek.baseline;
    const decisionId = randomUUID();
    let resolved: ResolvedAction;
    let jevLatency = 0;
    let deepseekLatency = 0;
    /** BUILD_DECIDER=deepseek: DeepSeek's own decision on this screen, and its log record. */
    let deepseekResolved: ResolvedAction | null = null;
    let deepseekRecord: Record<string, JsonValue> | undefined;
    let deepseekFailed = false;
    /** DeepSeek answered but the answer was unusable (not a transport failure): a one-shot question then goes step by step. */
    let deepseekAnswerUnusable: string | null = null;
    let deepseekAsked: Record<string, JsonValue> | undefined;
    let deepseekFallback: string | undefined;
    /** What DeepSeek said before its answer failed (reason, reasoning conclusion): passed on to Jev. */
    let deepseekNote: Record<string, string> | undefined;
    /** DeepSeek's answer failed the consistency guard: both answers and how it was resolved. */
    let deepseekConsistency: JsonValue | undefined;
    /** B3: the act boss simulation added to this DeepSeek question (its numbers and timing), for the log. */
    let bossSimRecord: JsonValue | undefined;
    if (decision.kind === "ask" && decision.deepseek && !codeBaseline) {
      const spec = decision.deepseek;
      let question = decision.questions[spec.question];
      const memoKey = `${str(state.raw["run_id"])}|${state.run?.floor ?? ""}|${decision.label}|${JSON.stringify(question ?? null)}`;
      if (deepseekMemo && deepseekMemo.key === memoKey) {
        stats.debounced += 1;
        deepseekResolved = deepseekMemo.resolved;
        deepseekRecord = { ...deepseekMemo.record, reused: true };
      } else if (brain && brainBudgetLeft(decision.label) && question?.type === "choice") {
        // The board may have moved while planning: never pay ~10 s for a position that no longer exists.
        let stale = false;
        try {
          stale = fingerprint(await client.state()) !== stateFingerprint;
        } catch {
          // let the ask go ahead; the dispatch re-read catches a broken mod
        }
        if (stale) {
          stats.staleSkips += 1;
          onEvent({ type: "note", message: `board changed before asking DeepSeek on ${state.screen}; re-planning` });
          await sleep(pollIntervalMs);
          continue;
        }
        // B3 (BOSS_SIM_BUILD=on): each option of a deck-building question with the act boss simulated on its deck.
        if (options.buildSim) {
          const simmed = await withBossSim(decision, env, options.buildSim);
          if (simmed.record) {
            decision = simmed.decision;
            question = decision.kind === "ask" ? decision.questions[spec.question] : question;
            bossSimRecord = simmed.record;
            const r = simmed.record;
            onEvent({ type: "note", message: `boss sim on ${decision.label}: ${r["error"] ? `failed (${String(r["error"])}), clock kept` : `${String(r["samples"])} samples per option, ${String(r["ms"])} ms`}` });
          }
        }
        if (question?.type !== "choice" || decision.kind !== "ask") throw new Error("unreachable: the boss simulation keeps the question");
        // The question's facts carry the deck, relics, potions, HP, gold, clock and plan: `now` stays empty.
        const memory = journal.render(state, knowledge, screenMemory, { label: decision.label, criteria: question.criteria, factsCovered: "facts" in decision.state, ...(spec.offeredCards ? { offeredCards: spec.offeredCards } : {}), ...(OUTCOME_BASIS_KEY in asRecord(decision.state["facts"]) ? { statsCovered: true } : {}) });
        onEvent({ type: "note", message: `DeepSeek decides ${decision.label} (${Object.keys(question.criteria).length} options, floor ${state.run?.floor ?? "?"}, run context ${memoryChars(memory)} chars)` });
        const ask = decision;
        /** Plays DeepSeek's choice; false when it does not resolve to an action. */
        const accept = (answer: BrainChoice, recovered: { line: string } | null): boolean => {
          const picked = ask.resolve({
            [spec.question]: { type: "choice", choice: answer.choice, probabilities: { [answer.choice]: 1 }, confidence: 1, raw: { escalated: "deepseek", ...(answer.cards ? { cards: answer.cards } : {}), ...(answer.route ? { route: answer.route } : {}), ...(answer.routeReason ? { route_reason: answer.routeReason } : {}), ...(answer.discard ? { discard: answer.discard } : {}) } },
          } as AnswerSet);
          // A one-shot resolution that fell back in code means the choice named no option.
          if (!picked.intent || (spec.oneshot && picked.fallback)) {
            onEvent({ type: "note", message: `DeepSeek's ${answer.choice} on ${ask.label} did not resolve (${picked.rationale}); falling back to Jev/code` });
            deepseekAnswerUnusable = `${answer.choice} did not resolve`;
            return false;
          }
          const how = recovered ? ` (recovered from reasoning: ${recovered.line})` : "";
          deepseekResolved = { ...picked, decider: "deepseek", confidence: null, fallback: false, rationale: `DeepSeek decided ${answer.choice}${how}: ${answer.reason} | ${picked.rationale}` };
          deepseekRecord = {
            by: "deepseek",
            direct: true,
            choice: answer.choice,
            reason: answer.reason,
            latency_ms: answer.latencyMs,
            tokens: answer.inputTokens + answer.outputTokens,
            input_tokens: answer.inputTokens,
            output_tokens: answer.outputTokens,
            cache_hit_tokens: answer.cacheHitTokens ?? 0,
            reasoning_tokens: answer.reasoningTokens ?? 0,
            effort: answer.effort ?? "",
            guide: answer.guideId ?? "",
            handbook: answer.handbookId ?? "",
            memory_chars: memoryChars(memory),
            memory_sections: memorySections(memory),
            ...(deepseekConsistency === undefined ? {} : { consistency: deepseekConsistency }),
            ...(recovered ? { recovered_from_reasoning: recovered.line } : {}),
            ...(answer.cards ? { cards: answer.cards } : {}),
            ...(answer.route ? { route: answer.route } : {}),
            ...(answer.routeReason ? { route_reason: answer.routeReason } : {}),
            // V4: the engine that answered, when it was not plain v3 DeepSeek.
            ...(answer.brain ? { brain: toJsonValue(answer.brain) } : {}),
            // A one-shot plan: its reference and steps; this row plays step 1, later steps are their own rows.
            ...(picked.plan ? { plan_id: picked.plan.id, plan: picked.plan.steps, plan_step: 1 } : {}),
          };
          deepseekAsked = toJsonValue(ask.questions) as Record<string, JsonValue>;
          deepseekMemo = { key: memoKey, resolved: deepseekResolved, record: deepseekRecord };
          onEvent({ type: "note", message: `DeepSeek (${(answer.latencyMs / 1000).toFixed(1)} s) ${ask.label}: ${answer.choice}${how} — ${answer.reason}` });
          return true;
        };
        try {
          // Counted up front when DeepSeek is asked first (v3); another engine's calls count in the router.
          if (deepseekFirst(decision.label)) stats.deepseekCalls += 1;
          if (spec.plan) {
            // A one-shot plan (a shop's shopping list): one JSON answer, validated by the screen. An empty reply
            // takes the last plan its reasoning drafted that the screen's check accepts, else is asked once more
            // (MZFV F24: the drafted plan was lost and the step-by-step fallback left the shop).
            const plan = spec.plan;
            const valid = (answer: Record<string, unknown>): boolean => {
              const out = plan.resolve(answer);
              return !("invalid" in out) && Boolean(out.intent);
            };
            const { json, meta, recovered, note } = await brain.choosePlan(decision.state, question.instructions, question.criteria, { label: decision.label, memory: { ...memory } }, valid);
            stats.deepseekCalls += reaskCalls(decision.label, meta.brain);
            stats.deepseekTokens += meta.inputTokens + meta.outputTokens;
            deepseekLatency = meta.latencyMs;
            const reason = str(json["reason"]).trim();
            const usage = {
              latency_ms: meta.latencyMs,
              tokens: meta.inputTokens + meta.outputTokens,
              input_tokens: meta.inputTokens,
              output_tokens: meta.outputTokens,
              cache_hit_tokens: meta.cacheHitTokens ?? 0,
              reasoning_tokens: meta.reasoningTokens ?? 0,
              effort: meta.effort ?? "",
              guide: meta.guideId ?? "",
              handbook: meta.handbookId ?? "",
              memory_chars: memoryChars(memory),
              memory_sections: memorySections(memory),
              ...(meta.brain ? { brain: toJsonValue(meta.brain) } : {}),
              ...(recovered ? { recovered_from_reasoning: "empty reply: the plan its reasoning drafted" } : {}),
              ...(note ? { note } : {}),
            };
            const out = plan.resolve(json);
            if ("invalid" in out || !out.intent) {
              const why = "invalid" in out ? out.invalid : out.rationale;
              deepseekFailed = true;
              deepseekAnswerUnusable = `plan invalid: ${why}`;
              deepseekRecord = { by: "deepseek", direct: true, choice: "", reason, answer: toJsonValue(json), invalid: why, ...usage };
              onEvent({ type: "note", message: `DeepSeek's plan on ${decision.label} is invalid (${why})` });
            } else {
              deepseekResolved = { ...out, decider: "deepseek", confidence: null, fallback: false, rationale: `DeepSeek planned: ${reason} | ${out.rationale}` };
              deepseekRecord = {
                by: "deepseek",
                direct: true,
                choice: out.plan ? JSON.stringify(out.plan.steps) : "",
                reason,
                ...usage,
                ...(out.plan ? { plan_id: out.plan.id, plan: out.plan.steps, plan_step: 1 } : {}),
              };
              deepseekAsked = toJsonValue(decision.questions) as Record<string, JsonValue>;
              deepseekMemo = { key: memoKey, resolved: deepseekResolved, record: deepseekRecord };
              onEvent({ type: "note", message: `DeepSeek (${(meta.latencyMs / 1000).toFixed(1)} s) ${decision.label}: ${deepseekRecord["choice"]}${note ? ` (${note})` : ""} — ${reason}` });
            }
          } else {
            const answer = await brain.choose(decision.state, question.instructions, question.criteria, { label: decision.label, memory: { ...memory } });
            stats.deepseekCalls += reaskCalls(decision.label, answer.brain);
            stats.deepseekTokens += answer.inputTokens + answer.outputTokens;
            deepseekLatency = answer.latencyMs;
            if (answer.consistency) {
              stats.deepseekCalls += 1; // the re-ask
              deepseekConsistency = toJsonValue(answer.consistency);
              onEvent({ type: "note", message: `DeepSeek answer on ${decision.label} was inconsistent (${answer.consistency.first.issues.join("; ")}); re-asked, resolved by ${answer.consistency.resolution}: ${answer.consistency.choice}` });
            }
            if (!accept(answer, null)) deepseekFailed = true;
          }
        } catch (error) {
          deepseekFailed = true;
          if (error instanceof DeepSeekInconsistentError) {
            deepseekAnswerUnusable = "inconsistent after re-ask";
            if (spec.oneshot) deepseekRecord = { by: "deepseek", direct: true, choice: error.record.first.choice, reason: error.record.first.reason, invalid: deepseekAnswerUnusable, tokens: error.meta.tokens };
            // v3's consistency re-ask: the first call was counted (up front, or by fallbackBudget as it was made).
            stats.deepseekCalls += error.meta.calls - 1;
            stats.deepseekTokens += error.meta.tokens;
            deepseekConsistency = toJsonValue(error.record);
            const first = error.record.first;
            deepseekNote = { reason: first.reason, ...(first.conclusion_line ? { conclusion: first.conclusion_line } : {}) };
          }
          onEvent({ type: "note", message: `DeepSeek failed on ${decision.label} (${error instanceof Error ? error.message.slice(0, 160) : String(error)})` });
          if (error instanceof DeepSeekAnswerError) {
            // Its answer was unusable, but its reasoning may still name one option (WXMB F11: reasoned
            // "heal", answer unparsed, Jev smithed at 0.05): act on that before handing the question on.
            stats.deepseekTokens += error.meta.inputTokens + error.meta.outputTokens;
            deepseekLatency = error.meta.latencyMs;
            deepseekAnswerUnusable = error.message.slice(0, 160);
            if (spec.oneshot) {
              const meta = error.meta;
              deepseekRecord = { by: "deepseek", direct: true, choice: error.detail.choice, reason: error.detail.reason, invalid: deepseekAnswerUnusable, latency_ms: meta.latencyMs, tokens: meta.inputTokens + meta.outputTokens, input_tokens: meta.inputTokens, output_tokens: meta.outputTokens, cache_hit_tokens: meta.cacheHitTokens ?? 0, reasoning_tokens: meta.reasoningTokens ?? 0, effort: meta.effort ?? "" };
            }
            // A plan's answer is not an option key: nothing to recover from its reasoning.
            const recovered = spec.plan ? null : error.recoverFrom(question.criteria);
            // The answer's route, route_reason and discard slots go with the recovered choice (answerFrom).
            if (recovered && accept(error.answerFrom(recovered), recovered)) deepseekFailed = false;
            if (deepseekFailed) {
              deepseekNote = { ...(error.detail.reason ? { reason: error.detail.reason } : {}), ...(recovered ? { conclusion: recovered.line } : {}) };
              onEvent({ type: "note", message: `DeepSeek's choice on ${decision.label} could not be recovered from its reasoning; falling back to Jev/code` });
            }
          } else {
            onEvent({ type: "note", message: `falling back to Jev/code on ${decision.label}` });
          }
        }
      } else if (brain && !brainBudgetLeft(decision.label)) {
        onEvent({ type: "note", message: `DeepSeek budget used up (${stats.deepseekCalls}/${config.deepseek?.maxCalls ?? 0}); ${decision.label} goes to Jev/code` });
      }
      if (!deepseekResolved && deepseekFailed && spec.oneshot && deepseekAnswerUnusable !== null) {
        // A one-shot question whose answer was unusable: the screen asks its step-by-step questions (logged:
        // the call was paid). Transport failures and an empty budget still play the baseline below.
        spec.oneshot.fallback();
        const usageOf = deepseekRecord ? deepseekUsage(deepseekRecord) : { input_tokens: 0, output_tokens: 0 };
        const row: DecisionRecord = {
          ts: new Date().toISOString(),
          mode,
          screen: state.screen,
          session: `${state.session.mode}/${state.session.phase}`,
          floor: state.run?.floor ?? null,
          turn: state.turn,
          label: decision.label,
          decider: "deepseek",
          fingerprint: stateFingerprint,
          questions: toJsonValue(decision.questions) as Record<string, JsonValue>,
          rationale: `one-shot answer unusable (${deepseekAnswerUnusable}); asking step by step`,
          confidence: null,
          fallback: true,
          reasked: deepseekConsistency !== undefined,
          no_jev: false,
          reused_answer: false,
          request_ids: [],
          latency_ms: { plan: 0, jev: 0, action: 0, ...(deepseekLatency > 0 ? { deepseek: deepseekLatency } : {}) },
          usage: usageOf,
          ...(deepseekRecord === undefined ? {} : { deepseek: deepseekRecord }),
          deepseek_fallback: `one-shot answer unusable: ${deepseekAnswerUnusable}; step-by-step questions`,
          ...(deepseekConsistency === undefined ? {} : { deepseek_consistency: deepseekConsistency }),
          ...(runId ? { run_id: runId } : {}),
          observed_ts: observedTs,
          result: "not dispatched: one-shot answer unusable, re-planned step by step",
        };
        log.write(row);
        logState(state, stateFingerprint, row.ts);
        onEvent({ type: "note", message: `one-shot ${decision.label} unusable (${deepseekAnswerUnusable}): asking step by step` });
        continue;
      }
      if (!deepseekResolved) {
        if (deepseekFailed) spec.onFail?.();
        deepseekFallback = deepseekFailed
          ? deepseekConsistency !== undefined ? "deepseek answer inconsistent after re-ask" : "deepseek failed"
          : "deepseek unavailable or out of budget";
        // What the screen decides without DeepSeek: code, or Jev with DeepSeek only as its escalation.
        decision = spec.baseline;
        // DeepSeek's own words, when it gave any, ride in the state Jev is shown (its option keys may
        // differ from Jev's, so only the text).
        if (deepseekNote && Object.keys(deepseekNote).length > 0 && decision.kind === "ask") decision = withAdvisorNote(decision, deepseekNote);
      }
    }
    let asked: Record<string, JsonValue> | undefined;
    let rawAnswers: JsonValue | undefined;
    let usage: { input_tokens: number; output_tokens: number; cache_hit_tokens?: number; reasoning_tokens?: number } = { input_tokens: 0, output_tokens: 0 };
    const requestIds: string[] = [];
    // A second ask for this decision: DeepSeek's re-ask after its consistency guard (BXAZV0R9ZHWK F11 rest:
    // "reasoning concluded o0 but answered o1", re-asked, the row still read reasked: false), or Jev's
    // follow-up below.
    let reasked = deepseekConsistency !== undefined;
    let escalation: JsonValue | undefined;

    let usedJev = false;
    let fromMemo = false;
    if (deepseekResolved) {
      resolved = deepseekResolved;
      asked = deepseekAsked;
      // DeepSeek's own tokens (zero when the answer was reused from the memo: no call was made).
      if (deepseekRecord && deepseekRecord["reused"] !== true) usage = deepseekUsage(deepseekRecord);
    } else if (decision.kind === "act") {
      resolved = { intent: decision.intent, rationale: decision.rationale, confidence: null, fallback: false, ...(decision.apply ? { apply: decision.apply } : {}) };
      // A step of a DeepSeek one-shot plan, played by code: DeepSeek's decision, no call made (reused).
      if (decision.plan) deepseekRecord = { by: "deepseek", direct: true, reused: true, plan_ref: decision.plan.ref, plan_step: decision.plan.step, choice: decision.plan.choice };
    } else if (!jev || codeBaseline) {
      // No-Jev mode, or a board the gate kept refusing: the resolver sees an empty answer set and takes its
      // deterministic path.
      resolved = decision.resolve({});
      if (codeBaseline) resolved = { ...resolved, fallback: true, rationale: `code baseline after ${gateRejections} gate refusals on this board: ${resolved.rationale}` };
    } else {
      if (stats.jevCalls >= config.budgets.maxRequests) {
        stop(`request cap reached (${config.budgets.maxRequests})`);
        break;
      }
      const memoKey = `${stateFingerprint}|${decision.label}`;
      const memo = readMemo(memoKey);
      if (memo) {
        // The board has not moved since we last asked this question: reuse the answer.
        stats.debounced += 1;
        fromMemo = true;
        resolved = memo.resolved;
        rawAnswers = toJsonValue(memo.answers);
        onEvent({
          type: "note",
          message: `reused the previous answer for ${decision.label} (board unchanged; no Jev call)`,
        });
      } else {
        // The board may have moved while we were planning. Re-read before spending a call on a
        // position that no longer exists.
        try {
          const fresh = await client.state();
          if (fingerprint(fresh) !== stateFingerprint) {
            stats.staleSkips += 1;
            onEvent({
              type: "note",
              message: `board changed before asking Jev on ${state.screen}; re-planning instead of paying for a stale answer`,
            });
            await sleep(pollIntervalMs);
            continue;
          }
        } catch {
          // Let the ask surface the failure with its usual classification.
        }

      // Jev's own view of the question when there is one (JEV_CONTEXT=v1); the escalator below keeps
      // decision.state/questions.
      const jevState = decision.jevView?.state ?? decision.state;
      const jevQuestions = decision.jevView?.questions ?? decision.questions;
      asked = toJsonValue(jevQuestions) as Record<string, JsonValue>;
      const promptMeta = (call: JevPromptMeta["call"]): JevPromptMeta => ({
        decisionId, runId: str(state.raw["run_id"]) || null, floor: state.run?.floor ?? null, turn: state.turn,
        fingerprint: stateFingerprint, observedTs, label: decision.label, jevContext: decision.jevView?.context ?? null, call,
      });
      let firstAnswers: AnswerSet = {};
      try {
        const result = await withJevRetry(() => askJevLogged(jev, promptLog, promptMeta("ask"), jevState, jevQuestions), jevRetry);
        usedJev = true;
        if (result.requestId) requestIds.push(result.requestId);
        stats.jevCalls += 1;
        stats.inputTokens += result.inputTokens;
        stats.outputTokens += result.outputTokens;
        jevLatency += result.latencyMs;
        usage = { input_tokens: result.inputTokens, output_tokens: result.outputTokens };
        rawAnswers = toJsonValue(result.answers);
        resolved = decision.resolve(result.answers);
        firstAnswers = result.answers;

        const esc = decision.escalate;
        const jevAnswer = esc ? result.answers[esc.question] : undefined;
        if (esc && jevAnswer?.type === "choice" && jevAnswer.confidence < esc.below) {
          const question = decision.questions[esc.question];
          const criteria = question?.type === "choice" ? question.criteria : {};
          const context: Record<string, JsonValue> = {
            label: decision.label,
            why_escalated: esc.why,
            floor: state.run?.floor ?? null,
            turn: state.turn,
            jev_choice: jevAnswer.choice,
            jev_confidence: Number(jevAnswer.confidence.toFixed(2)),
            jev_probabilities: toJsonValue(jevAnswer.probabilities),
          };
          // Only DeepSeek gets the run memory, in its user message (its system prompt stays cached).
          const memory = journal.render(state, knowledge, screenMemory, { label: decision.label, criteria, factsCovered: "facts" in decision.state });
          // BUILD_DECIDER=deepseek: combat stays with code and Jev (COMBAT_DEEPSEEK=on restores the
          // per-turn escalation), and DeepSeek is not asked again right after it failed on this question.
          const deepseekBarred = deepseekFailed || (config.buildDecider === "deepseek" && config.combatDeepseek !== "on" && (state.in_combat || decision.label.startsWith("combat/")));
          for (const escalator of options.escalators ?? []) {
            const capped =
              escalator.name === "claude"
                ? stats.claudeCalls >= config.escalation.claudeMaxCalls
                : !brainBudgetLeft(decision.label) || deepseekBarred;
            if (capped) continue;
            try {
              if (escalator.name === "claude") stats.claudeCalls += 1;
              else if (deepseekFirst(decision.label)) stats.deepseekCalls += 1;
              if (escalator.name === "claude") onEvent({ type: "note", message: `escalating ${decision.label} to Claude (Jev ${jevAnswer.choice} @${jevAnswer.confidence.toFixed(2)})` });
              // The DeepSeek escalator is asked through the brain (the engine BRAIN_* names for this label).
              const answer = await (escalator === deepseekClient && brain ? brain : escalator).choose(
                decision.state,
                question?.instructions ?? "",
                criteria,
                escalator.name === "deepseek" ? { ...context, memory: { ...memory } } : context,
              );
              if (escalator.name === "deepseek") stats.deepseekTokens += answer.inputTokens + answer.outputTokens;
              const consistency = escalator.name === "deepseek" && "consistency" in answer ? (answer as { consistency?: unknown }).consistency : undefined;
              if (consistency !== undefined) {
                stats.deepseekCalls += 1; // the re-ask
                reasked = true;
              }
              const override = decision.resolve({
                ...result.answers,
                [esc.question]: { type: "choice", choice: answer.choice, probabilities: { [answer.choice]: 1 }, confidence: 1, raw: { escalated: escalator.name, ...("discard" in answer && Array.isArray(answer.discard) ? { discard: answer.discard } : {}) } },
              } as AnswerSet);
              if (!override.intent) continue;
              const agreed = answer.choice === jevAnswer.choice;
              const who = escalator.name === "claude" ? "Claude" : "DeepSeek";
              resolved = {
                ...override,
                decider: escalator.name,
                confidence: jevAnswer.confidence,
                rationale: `${who} ${agreed ? "confirmed" : "overrode"} Jev (${jevAnswer.choice} @${jevAnswer.confidence.toFixed(2)} -> ${answer.choice}; ${esc.why}): ${answer.reason} | ${override.rationale}`,
              };
              if (escalator.name === "deepseek") {
                usage = {
                  input_tokens: usage.input_tokens + answer.inputTokens,
                  output_tokens: usage.output_tokens + answer.outputTokens,
                  cache_hit_tokens: (usage.cache_hit_tokens ?? 0) + (answer.cacheHitTokens ?? 0),
                  reasoning_tokens: (usage.reasoning_tokens ?? 0) + (answer.reasoningTokens ?? 0),
                };
              }
              escalation = { ...("brain" in answer && answer.brain ? { brain: toJsonValue(answer.brain) } : {}), by: escalator.name, jev_choice: jevAnswer.choice, jev_confidence: jevAnswer.confidence, deepseek_choice: answer.choice, choice: answer.choice, reason: answer.reason, latency_ms: answer.latencyMs, tokens: answer.inputTokens + answer.outputTokens, input_tokens: answer.inputTokens, output_tokens: answer.outputTokens, cache_hit_tokens: answer.cacheHitTokens ?? 0, guide: answer.guideId ?? "", handbook: answer.handbookId ?? "", reasoning_tokens: answer.reasoningTokens ?? 0, effort: answer.effort ?? "", ...(escalator.name === "deepseek" ? { memory_chars: memoryChars(memory) } : {}), ...(consistency === undefined ? {} : { consistency: toJsonValue(consistency) }) };
              // The escalator's raw pick stays in `choice`; code's HP guard may have played another option.
              if (override.guard) escalation = { ...escalation, guard: override.guard.kind, used_choice: override.guard.choice, used_plan: override.guard.plan };
              break;
            } catch (error) {
              onEvent({ type: "note", message: `${escalator.name} escalation failed: ${error instanceof Error ? error.message : String(error)}` });
            }
          }
        }

        if (!resolved.intent && resolved.reask) {
          reasked = true;
          const spec = resolved.reask;
          const followUp = await withJevRetry(
            () => askJevLogged(jev, promptLog, promptMeta("reask"), jevState, { pick: { type: "choice", instructions: spec.instructions, criteria: spec.criteria } }),
            jevRetry,
          );
          stats.jevCalls += 1;
          if (followUp.requestId) requestIds.push(followUp.requestId);
          stats.inputTokens += followUp.inputTokens;
          stats.outputTokens += followUp.outputTokens;
          jevLatency += followUp.latencyMs;
          usage = { ...usage, input_tokens: usage.input_tokens + followUp.inputTokens, output_tokens: usage.output_tokens + followUp.outputTokens };
          const answer = followUp.answers["pick"];
          if (answer && answer.type === "choice") {
            const intent = spec.map[answer.choice];
            if (!intent) {
              resolved = { intent: null, rationale: `shortlist answer "${answer.choice}" was not in the map`, confidence: answer.confidence, fallback: true };
            } else if (answer.confidence < spec.actThreshold) {
              // Still a near-guess after narrowing: take the deterministic choice instead.
              resolved = {
                intent: spec.fallbackIntent,
                rationale: `${spec.fallbackRationale} (shortlist confidence ${answer.confidence.toFixed(2)})`,
                confidence: answer.confidence,
                fallback: true,
              };
            } else {
              resolved = {
                intent,
                rationale: `shortlist re-ask chose ${answer.choice} (confidence ${answer.confidence.toFixed(2)})`,
                confidence: answer.confidence,
                fallback: false,
              };
            }
          } else {
            resolved = { intent: null, rationale: "shortlist re-ask returned no usable answer", confidence: null, fallback: true };
          }
        }
      } catch (error) {
        const failure = classifyFailure(error);
        stats.errors += 1;
        consecutiveFailures += 1;
        onEvent({ type: "note", message: `Jev call failed (${failure.kind}): ${failure.detail}` });
        if (failure.kind === "fatal" || consecutiveFailures >= 3) {
          stop(`Jev failure: ${failure.detail}`);
          break;
        }
        await sleep(pollIntervalMs);
        continue;
      }
      // Memoise the finished resolution (including any shortlist re-ask that ran above).
      answerMemo = { key: memoKey, resolved, answers: firstAnswers };
      }
    }

    if (resolved.fallback) stats.fallbacks += 1;

    if (!resolved.intent) {
      stats.waits += 1;
      noteStall(state, resolved.rationale);
      onEvent({ type: "wait", screen: state.screen, reason: resolved.rationale });
      await sleep(pollIntervalMs);
      continue;
    }

    // V4 M3, the execution gate: what the action's indices point at on the state it was decided on (a combat line's
    // step keeps the card, enemy and potion its line chose), checked here and again on the state it is sent to
    // (act/identity.ts). A memo's answer keeps the identity of the board it was given on.
    resolved.intent = withExpect(state, resolved.intent);
    let gated = gate(state, resolved.intent);
    if (endTurnInstead && resolved.intent.action !== "end_turn") {
      // The same illegal play kept coming back (a card whose cost rose above our energy, 2026-09-25:
      // 30 min spinning on "card_index 5 is not playable"), or kept being refused on the re-read before sending:
      // stop re-planning it and end the turn.
      onEvent({ type: "note", message: `gate rejected ${gateRejections} actions on this board: ending the turn instead of ${resolved.intent.action}` });
      const endTurn = withExpect(state, { action: "end_turn" });
      resolved.intent = endTurn;
      resolved.rationale = `fallback after repeated illegal plays: ${resolved.rationale}`;
      gated = gate(state, endTurn);
    }
    const intent: ActionRequest = resolved.intent;

    const recordBase = () => ({
      ts: new Date().toISOString(),
      mode,
      screen: state.screen,
      session: `${state.session.mode}/${state.session.phase}`,
      floor: state.run?.floor ?? null,
      turn: state.turn,
      label: decision.label,
      decision_id: decisionId,
      decider: deepseekResolved || (decision.kind === "act" && decision.plan)
        ? ("deepseek" as const)
        : decision.kind === "act"
          ? ("code" as const)
          : resolved.fallback || (!usedJev && !fromMemo)
            ? ("code-fallback" as const)
            : resolved.decider ?? ("jev" as const),
      fingerprint: stateFingerprint,
      questions: asked,
      answers: rawAnswers,
      // The action as sent; what the gate checked it against is `expect`.
      chosen: toJsonValue(wireIntent(intent)),
      ...(intent.expect ? { expect: toJsonValue(intent.expect) } : {}),
      rationale: resolved.rationale,
      confidence: resolved.confidence,
      fallback: resolved.fallback,
      reasked,
      no_jev: !usedJev && !fromMemo && !deepseekResolved && decision.kind === "ask",
      reused_answer: fromMemo,
      request_ids: requestIds,
      latency_ms: { plan: Date.now() - planStarted - jevLatency - deepseekLatency, jev: jevLatency, action: 0, ...(deepseekLatency > 0 ? { deepseek: deepseekLatency } : {}) },
      usage,
      ...(escalation === undefined ? {} : { escalation }),
      // BUILD_DECIDER=deepseek: DeepSeek's own decision (not an escalation of a Jev answer).
      ...(deepseekRecord === undefined ? {} : { deepseek: deepseekRecord }),
      ...(deepseekFallback === undefined ? {} : { deepseek_fallback: deepseekFallback }),
      ...(deepseekConsistency === undefined ? {} : { deepseek_consistency: deepseekConsistency }),
      ...(bossSimRecord === undefined ? {} : { boss_sim: bossSimRecord }),
      ...(decision.kind === "ask" && decision.jevView ? { jev_context: decision.jevView.context, jev_hints: decision.jevView.hints } : {}),
      // Combat: the rollout facts' timing and whether Jev picked the rollout's best line (rollout-live.ts).
      ...(resolved.log ?? {}),
      // A route review that rode on this question (card reward, rest site): its answer and outcome; a change is its own row.
      ...(resolved.routeReview ? { route_review: routeReviewLog(resolved.routeReview) } : {}),
      // SL (docs/sl.md): the attempt at the fight being played and the reloads so far this run (SL_ENABLED only).
      ...(sl ? sl.decisionFields() : {}),
    } satisfies Omit<DecisionRecord, "result">);

    /**
     * A refused action: nothing is sent, and neither the answer nor the committed line is served again, so the next
     * pass re-plans from the live state (the path a refusal always took). A refusal on identity (V4 M3: the indices
     * now hold something else than was decided) also forgets DeepSeek's memo, as a failed action does. It is logged
     * as a "not dispatched" row with gate_reject {at, kind, reason, expected, actual}, and so is any refusal on the
     * dispatch read (before V4 that action was sent); the same refusal on the same board is logged once unless a
     * model was paid for it again.
     */
    const refuse = async (result: GateResult, at: "decision" | "dispatch", checked: GameState): Promise<void> => {
      stats.waits += 1;
      // Counted per board: a refusal on the same fingerprint (at decision or on the re-read before sending) adds up.
      gateRejections = gateRejectedFp === stateFingerprint ? gateRejections + 1 : 1;
      gateRejectedFp = stateFingerprint;
      if (gateRejections === GATE_REJECTION_LIMIT) {
        const next = state.screen === "COMBAT" && state.available_actions.includes("end_turn") ? "ending the turn" : "playing code's baseline decision";
        onEvent({ type: "note", message: `gate refused ${gateRejections} times on this board: ${next} next` });
      }
      noteStall(checked, result.reason);
      onEvent({ type: "note", message: `gate rejected ${intent.action}${at === "dispatch" ? " at dispatch" : ""}: ${result.reason}` });
      answerMemo = null;
      screenMemory.combatPlan = null;
      if (result.kind === "identity") deepseekMemo = null;
      if (result.kind === "identity" || at === "dispatch") {
        const base = recordBase();
        const paid = !fromMemo && base.usage.input_tokens + base.usage.output_tokens > 0;
        const key = `${stateFingerprint}|${result.reason}`;
        if (paid || key !== lastRefusalLogged) {
          lastRefusalLogged = key;
          const record: DecisionRecord = {
            ...base,
            ...(runId ? { run_id: runId } : {}),
            observed_ts: observedTs,
            gate_reject: toJsonValue({ at, kind: result.kind ?? "legality", reason: result.reason, expected: result.expected ?? null, actual: result.actual ?? null }),
            result: `not dispatched: gate refused (${at}): ${result.reason}`.slice(0, 300),
          };
          log.write(record);
          logState(checked, fingerprint(checked), record.ts);
          onEvent({ type: "decision", record, totals: totals() });
        }
      }
      await sleep(pollIntervalMs);
    };

    if (!gated.ok) {
      await refuse(gated, "decision", state);
      continue;
    }
    // Passing the gate here is not progress: the refusal count and the stall clock start over only when an action
    // is sent (the re-read before sending may still refuse it).

    const baseRecord = recordBase();
    const journalEntry = {
      label: decision.label,
      by: baseRecord.decider,
      choice: resolved.journal ? compact(resolved.journal) : describeChoice(decision, resolved, rawAnswers, deepseekRecord ?? escalation),
      reason: str(asRecord(deepseekRecord ?? escalation)["reason"]),
      asked: decision.kind === "ask" && (usedJev || fromMemo || deepseekResolved !== null) && !resolved.fallback,
      intent: resolved.intent,
    };
    // What a restart needs to replay this decision into the journal (journal-replay.ts).
    const replayFields = { ...(runId ? { run_id: runId } : {}), observed_ts: observedTs, journal: { choice: journalEntry.choice, reason: journalEntry.reason } };
    /** Applies the resolution's memory effects; returns the route plan it made, for the log. */
    const applyResolved = (): { route_plan?: JsonValue } => {
      const before = screenMemory.routePlan;
      resolved.apply?.();
      // A route review's change carries its plan on its own row (logRouteChange).
      if (resolved.routeReview?.change) return {};
      return screenMemory.routePlan && screenMemory.routePlan !== before ? { route_plan: toJsonValue(screenMemory.routePlan) } : {};
    };
    /**
     * A route review's change (the answer named another route): its own map/route-change row, a step of this
     * decision's plan (deepseek.reused, plan_ref: no call of its own), on the same state and timestamp as the
     * decision's row so the replay takes both in order; filed in the run journal as the live loop plays it.
     */
    const logRouteChange = (ts: string, result: string): void => {
      const change = resolved.routeReview?.change;
      if (!change || !screenMemory.routePlan) return;
      const reason = resolved.routeReview?.reason ?? "";
      const entry = { label: "map/route-change", by: "deepseek", choice: compact(`route (${change.why}): ${change.to}`), reason, asked: true, intent: null };
      journal.record(state, entry);
      const row: DecisionRecord = {
        ts,
        mode,
        screen: state.screen,
        session: `${state.session.mode}/${state.session.phase}`,
        floor: state.run?.floor ?? null,
        turn: state.turn,
        label: "map/route-change",
        decider: "deepseek",
        fingerprint: stateFingerprint,
        rationale: `DeepSeek changed the act's route in ${decision.label} (${change.why}): ${change.from} => ${change.to}${reason ? ` — ${reason}` : ""}`,
        confidence: null,
        fallback: false,
        reasked: false,
        no_jev: false,
        reused_answer: false,
        request_ids: [],
        latency_ms: { plan: 0, jev: 0, action: 0 },
        usage: { input_tokens: 0, output_tokens: 0 },
        deepseek: { by: "deepseek", direct: true, reused: true, plan_ref: change.ref, plan_step: change.step, choice: change.key, reason, from: change.from, to: change.to },
        ...(runId ? { run_id: runId } : {}),
        observed_ts: observedTs,
        journal: { choice: entry.choice, reason },
        route_plan: toJsonValue(screenMemory.routePlan),
        result,
      };
      log.write(row);
      onEvent({ type: "note", message: `route changed in ${decision.label}: ${change.to}${reason ? ` — ${reason}` : ""}` });
    };

    if (mode === "shadow") {
      if (stateFingerprint === lastShadowFingerprint) {
        // The state has not moved since the last decision. In shadow mode that is the normal case
        // (nothing is dispatched), so report it once and keep watching rather than spinning.
        stats.waits += 1;
        onEvent({ type: "wait", screen: state.screen, reason: "already decided this state; waiting for it to change" });
        await sleep(pollIntervalMs);
        continue;
      }
      lastShadowFingerprint = stateFingerprint;
      // Shadow mode sends nothing: the recorded decision stands for the action.
      gateRejections = 0;
      gateRejectedFp = null;
      clearStall();
      const routePlan = applyResolved();
      journal.record(state, journalEntry);
      stats.decisions += 1;
      const record: DecisionRecord = { ...baseRecord, ...replayFields, ...routePlan, result: "shadow (not dispatched)" };
      log.write(record);
      logRouteChange(record.ts, "shadow (not dispatched)");
      logState(state, stateFingerprint, record.ts);
      onEvent({ type: "decision", record, totals: totals() });
      await sleep(pollIntervalMs);
      continue;
    }

    /**
     * A decision that paid for a model call but is not dispatched is still logged (result "not
     * dispatched: ..."), so its tokens reach runs.jsonl. Y3XT F36/F46: Lord's Parasol gave the whole
     * shop while DeepSeek's shop/buy call ran (84 s, 45 s); the board changed, the loop re-planned, and
     * both calls (48k tokens) were only in deepseek-reasoning.jsonl.
     */
    const logUndispatched = (why: string): void => {
      const paid = baseRecord.usage.input_tokens + baseRecord.usage.output_tokens > 0;
      if (!paid || fromMemo) return;
      const record: DecisionRecord = { ...baseRecord, ...replayFields, result: `not dispatched: ${why}` };
      log.write(record);
      logState(state, stateFingerprint, record.ts);
      onEvent({ type: "decision", record, totals: totals() });
    };

    // Re-read before touching the game: actions are not idempotent (PLAN.md §8.1).
    let fresh: GameState;
    try {
      fresh = await client.state();
    } catch (error) {
      onEvent({ type: "note", message: `pre-dispatch state re-read failed: ${classifyFailure(error).detail}` });
      logUndispatched(`pre-dispatch state re-read failed: ${classifyFailure(error).detail}`.slice(0, 300));
      await sleep(pollIntervalMs);
      continue;
    }
    if (fingerprint(fresh) !== stateFingerprint) {
      onEvent({ type: "note", message: "state changed while deciding; re-planning" });
      logUndispatched("state changed while deciding");
      continue;
    }
    // The gate once more on the state the action goes to: the fingerprint leaves out much of what the indices
    // point at (enemy ids, map coordinates, rewards, shop stock, selection cards, upgrades).
    const atDispatch = gate(fresh, intent);
    if (!atDispatch.ok) {
      await refuse(atDispatch, "dispatch", fresh);
      continue;
    }
    // SL (docs/sl.md): an end of turn the enemy turn certainly kills us after, in a fight with a retry left: the fight
    // is reloaded instead (or, when the reload fails, SL stops for the run and the loop plays on).
    if (sl && intent.action === "end_turn") {
      const slOutcome = await sl.beforeEndTurn(fresh, { label: decision.label, screenMemory, journal });
      if (slOutcome.handled) {
        const reload = slOutcome.outcome;
        const record: DecisionRecord = {
          ...baseRecord,
          ...replayFields,
          result: (reload.ok
            ? `not dispatched: SL reloaded the fight (certain death foreseen; back on T${reload.resumedTurn ?? "?"} after ${Math.round(reload.ms / 1000)} s)`
            : `not dispatched: SL reload failed at ${reload.step}: ${reload.reason}`).slice(0, 300),
        };
        log.write(record);
        logState(state, stateFingerprint, record.ts);
        onEvent({ type: "decision", record, totals: totals() });
        answerMemo = null;
        deepseekMemo = null;
        screenMemory.combatPlan = null;
        gateRejections = 0;
        gateRejectedFp = null;
        clearStall();
        if (reload.ok) {
          // What the loop would have done on the main menu it never read: the screen and the fight start over.
          noteScreenChange(screenMemory, reload.menu);
          resetFightMemory(screenMemory);
        }
        continue;
      }
    }

    const actionStarted = Date.now();
    // The action goes out: the gate's refusal count and the stall clock start over.
    gateRejections = 0;
    gateRejectedFp = null;
    clearStall();
    let actionResult: ActionResult;
    try {
      actionResult = await dispatch(client, resolved.intent);
    } catch (error) {
      const failure = classifyFailure(error);
      stats.errors += 1;
      consecutiveFailures += 1;
      onEvent({ type: "note", message: `action ${resolved.intent.action} failed (${failure.kind}): ${failure.detail}` });
      // A failed (often timed-out) action may still have gone through in the game (KFPC F4: two
      // choose_event_option timeouts both applied, the memo replayed the answer on the next page, and
      // neither click was logged). Log it as a decision, forget the answer and any committed plan, and
      // re-read the state before acting again.
      answerMemo = null;
      deepseekMemo = null;
      screenMemory.combatPlan = null;
      const failed: DecisionRecord = {
        ...baseRecord,
        ...replayFields,
        latency_ms: { ...baseRecord.latency_ms, action: Date.now() - actionStarted },
        result: `failed (${failure.kind}): ${failure.detail}`.slice(0, 300),
      };
      log.write(failed);
      logState(state, stateFingerprint, failed.ts);
      if (failure.kind === "fatal") {
        stop(`action failure: ${failure.detail}`);
        break;
      }
      await waitForStateChange({ client, previous: stateFingerprint, timeoutMs: 3_000, pollIntervalMs: 150 });
      continue;
    }

    stats.acts += 1;
    stats.decisions += 1;
    lastRefusalLogged = null;
    // The resolution's memory effects (combat plan commitment, HP-guard record), once, for the action played.
    const routePlan = applyResolved();
    journal.record(state, journalEntry);
    sl?.noteAction(state, resolved.intent);
    // The node a map move chose: the REWARD and REST screens after it carry no map position.
    rememberChosenNode(screenMemory, state, resolved.intent);
    // Surrounded: every targeted action that went through turns us (the per-card fallback's plays too).
    noteFacing(screenMemory, state, resolved.intent);
    // The board is about to change (or should): never reuse an answer across an action.
    answerMemo = null;
    deepseekMemo = null;
    // Remember the one action whose effect the state does not reflect: a skipped card reward stays
    // claimable, so without this the planner claims it again on the next iteration.
    if (resolved.intent.action === "skip_reward_cards") screenMemory.cardRewardSkipped = true;

    // Settle debounce: if the mod says the action has not finished, do not plan the next step against
    // a board that is still animating. Wait for it to move, with a bounded fallback.
    if (actionResult.status !== "completed" || !actionResult.stable) {
      const settled = await waitForStateChange({
        client,
        previous: stateFingerprint,
        timeoutMs: 3_000,
        pollIntervalMs: 150,
      });
      onEvent({
        type: "note",
        message:
          settled === "changed"
            ? `action came back ${actionResult.status}; waited for the board to settle`
            : `action came back ${actionResult.status} and the board still looks unchanged after 3 s; re-reading anyway`,
      });
    }

    const note = noteForAction(state, resolved, decision.label);
    if (note) notes = addNote(brief, note).notes;

    const record: DecisionRecord = {
      ...baseRecord,
      ...replayFields,
      ...routePlan,
      latency_ms: { ...baseRecord.latency_ms, action: Date.now() - actionStarted },
      result: `${actionResult.status}${actionResult.stable ? "" : " (unstable)"}: ${actionResult.message}`,
    };
    log.write(record);
    logRouteChange(record.ts, "route plan changed (no game action)");
    logState(state, stateFingerprint, record.ts);
    onEvent({ type: "decision", record, totals: totals() });
    await sleep(60);
  }

  observedStates.flush();
  stats.elapsedMs = Date.now() - startedAt;
  log.close();
  return stats;
}

/** The per-fight records, dropped out of combat (and when SL reloads a fight: the loop never sees its main menu). */
export function resetFightMemory(screenMemory: ScreenMemory): void {
  screenMemory.hpGuard = undefined;
  screenMemory.potionTurn = undefined;
  screenMemory.facing = undefined;
  screenMemory.facingFight = undefined;
  screenMemory.fightCards = undefined;
  screenMemory.planBeforeSelection = undefined;
  screenMemory.gambleDiscards = undefined;
  screenMemory.potionTake = undefined;
  screenMemory.takeWaitSince = undefined;
  screenMemory.plannedAfter = undefined;
  screenMemory.paelsEyeFight = undefined;
  screenMemory.fightStart = undefined;
  screenMemory.demonTongueTurn = undefined;
  screenMemory.fightPlan = undefined;
  screenMemory.fightPlanFailed = undefined;
}

/**
 * A new screen: the per-screen flags start over and the combat plan is dropped, except across a card choice in
 * the middle of a turn (Headbutt, True Grit+, Armaments): the chosen line is paused on the choice screen and
 * resumed back on the combat screen, same turn (combat-plan.ts checks it against the hand the choice left).
 * 2MK4V7V3Q5BM F8 T2: Jev's "Headbutt, Defend, Defend" was lost at the Headbutt pick and re-asked with no
 * "Defend, Defend" option (11 -> 6 HP); KYC0 re-asked four times after True Grit+ picks.
 */
export function noteScreenChange(screenMemory: ScreenMemory, state: GameState): void {
  if (screenMemory.screen === state.screen) return;
  screenMemory.screen = state.screen;
  screenMemory.shopOpened = false;
  screenMemory.cardRewardSkipped = false;
  const after = screenMemory.plannedAfter;
  screenMemory.planBeforeSelection = !state.in_combat
    ? undefined
    : screenMemory.combatPlan
      ? screenMemory.combatPlan.remaining
      : after && after.turn === state.turn
        ? after.steps
        : undefined;
  const paused = state.in_combat ? (screenMemory.combatPlan ?? screenMemory.pausedCombatPlan) : undefined;
  screenMemory.combatPlan = null;
  screenMemory.pausedCombatPlan = undefined;
  if (!paused || paused.turn !== (state.turn ?? null)) return;
  if (state.screen === "COMBAT") screenMemory.combatPlan = { ...paused, afterSelection: true };
  else screenMemory.pausedCombatPlan = paused;
}

export function describeIntent(intent: JsonValue | undefined): string {
  const obj = asRecord(intent);
  const action = str(obj["action"], "?");
  const details: string[] = [];
  for (const key of ["card_index", "target_index", "option_index", "x", "y", "tool"]) {
    if (obj[key] !== undefined && obj[key] !== null) details.push(`${key}=${String(obj[key])}`);
  }
  return details.length > 0 ? `${action} (${details.join(", ")})` : action;
}

/**
 * Makes sure the current elite/boss fight has DeepSeek's plan in screenMemory.fightPlan (FIGHT_PLAN=v1):
 * restored from the log after a restart, else asked once; re-asked once when a new boss/elite enemy
 * appears. A failed request is not retried in the same fight (the turns are played without a plan).
 */
/** Ascension from which every fight (not only elites/bosses) gets a DeepSeek fight plan. */
const ALL_FIGHT_PLANS_FROM_ASCENSION = 8;
/** …after this floor (act 1's first fights are left to code). */
const ALL_FIGHT_PLANS_FROM_FLOOR = 3;

async function ensureFightPlan(
  env: DecisionEnv,
  deepseek: Pick<Brain, "askJson">,
  journal: RunJournal,
  logFile: string,
  onEvent: (event: LoopEvent) => void,
  count: (tokens: number, via: BrainMeta | undefined) => void,
): Promise<void> {
  const { state, knowledge, screenMemory } = env;
  const combat = asRecord(state.raw["combat"]);
  const alive = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  if (alive.length === 0) return;
  const kind = fightKind(combat, env);
  // From A8 hallway fights kill runs too (棘刺蟾蜍, 地道虫, 啃咬机, 胧光怪, 青蛙骑士): Dai asked for a
  // DeepSeek plan in most fights. The first floors of act 1 stay code-only (starter deck, weak enemies).
  const everyFight = (state.run?.ascension ?? 0) >= ALL_FIGHT_PLANS_FROM_ASCENSION && (state.run?.floor ?? 0) > ALL_FIGHT_PLANS_FROM_FLOOR;
  if (kind !== "elite" && kind !== "boss" && !everyFight) return;
  const fight = fightKey(state);
  const runId = str(state.raw["run_id"]);
  const current = screenMemory.fightPlan;
  if (current && current.fight === fight && current.runId === runId && !needsReplan(current, state, knowledge)) return;
  if (!current || current.fight !== fight || current.runId !== runId) {
    const restored = loadFightPlan(logFile, runId, fight);
    if (restored && !needsReplan(restored, state, knowledge)) {
      screenMemory.fightPlan = restored;
      return;
    }
  }
  if (screenMemory.fightPlanFailed === fight && !(current && current.fight === fight)) return;
  const replans = current && current.fight === fight && current.runId === runId ? current.replans + 1 : 0;
  if (replans > 1) return;
  const memory = journal.render(state, knowledge, screenMemory, { label: "fight-plan" });
  const payload: Record<string, JsonValue> = {
    task: FIGHT_PLAN_TASK,
    fight_state: fightPlanInput(state, knowledge, kind, moveModel()),
    memory: { ...memory },
    ...(screenMemory.runPlan && screenMemory.runPlan.runId === runId
      ? { run_plan: { archetype: screenMemory.runPlan.archetype, boss_prep: screenMemory.runPlan.bossPrep, summary: screenMemory.runPlan.summary } }
      : {}),
    ...(current && current.fight === fight ? { previous_plan: fightPlanJson(current), note: "A new boss/elite enemy appeared: revise the plan for the rest of the fight." } : {}),
  };
  onEvent({ type: "note", message: `asking DeepSeek for the ${kind} fight plan (floor ${state.run?.floor ?? "?"}${replans > 0 ? ", re-plan" : ""})` });
  try {
    // Label outside "combat/": one call per fight is worth the build-question effort (max), not the
    // per-turn combat effort. A reply that is no fight plan (an empty one, a {choice, reason} echo) takes the
    // plan its reasoning drafted, else an empty one is asked once more and anything else fails.
    const { json, meta, recovered, note } = await deepseek.askJson(payload, "fight-plan", isFightPlanReply);
    count(meta.inputTokens + meta.outputTokens, meta.brain);
    const plan = parseFightPlan(json, state, knowledge, { runId, fight, kind, replans });
    screenMemory.fightPlan = plan;
    logFightPlan(logFile, {
      run: runId,
      fight,
      floor: state.run?.floor ?? null,
      turn: state.turn,
      kind,
      enemies: plan.enemyIds,
      plan: toJsonValue(plan),
      raw: toJsonValue(json),
      ...(recovered ? { recovered_from_reasoning: true } : {}),
      ...(note ? { note } : {}),
      latency_ms: meta.latencyMs,
      input_tokens: meta.inputTokens,
      output_tokens: meta.outputTokens,
      cache_hit_tokens: meta.cacheHitTokens ?? 0,
      reasoning_tokens: meta.reasoningTokens ?? 0,
      effort: meta.effort ?? "",
      guide: meta.guideId ?? "",
      handbook: meta.handbookId ?? "",
      memory_chars: memoryChars(memory),
    });
    onEvent({ type: "note", message: `fight plan (${memoryChars(memory)} context chars, ${(meta.latencyMs / 1000).toFixed(0)} s): ${plan.approach}; setup ${plan.setup.join(", ") || "-"}; kill first ${plan.focus ?? "-"}; ${plan.summary}` });
  } catch (error) {
    screenMemory.fightPlanFailed = fight;
    const message = error instanceof Error ? error.message : String(error);
    // An unparseable reply was still paid for: its usage and raw reply are logged with the error.
    if (error instanceof DeepSeekAnswerError) count(error.meta.inputTokens + error.meta.outputTokens, (error.meta as BrainMetaUsage).brain);
    logFightPlan(logFile, { run: runId, fight, floor: state.run?.floor ?? null, kind, error: message.slice(0, 200), ...unparsedFields(error) });
    onEvent({ type: "note", message: `fight plan failed: ${message.slice(0, 160)}` });
  }
}

/**
 * Makes sure the run has a current DeepSeek run plan (RUN_PLAN=v1): restored from the log after a
 * restart, else asked when a checkpoint is due (run start, new act, heavy HP loss, every few floors).
 * A failed request is not retried on the same floor.
 */
async function ensureRunPlan(
  env: DecisionEnv,
  deepseek: Pick<Brain, "askJson">,
  journal: RunJournal,
  logFile: string,
  observedTs: string,
  onEvent: (event: LoopEvent) => void,
  count: (tokens: number, via: BrainMeta | undefined) => void,
): Promise<void> {
  const { state, knowledge, screenMemory } = env;
  const runId = str(state.raw["run_id"]);
  if (!runId) return;
  if (!screenMemory.runPlan || screenMemory.runPlan.runId !== runId) screenMemory.runPlan = loadRunPlan(logFile, runId);
  const trigger = runPlanTrigger(screenMemory.runPlan, state);
  if (!trigger) return;
  const failKey = `${runId}:${state.run?.floor ?? "?"}`;
  if (screenMemory.runPlanFailed === failKey) return;
  // run_state and previous_plan carry the current facts: `now` stays empty.
  const memory = journal.render(state, knowledge, screenMemory, { label: "run-plan", factsCovered: true });
  const shown = fightPlanInput(state, knowledge, "run", {});
  const payload: Record<string, JsonValue> = {
    task: RUN_PLAN_TASK,
    run_state: runPlanInput(state, knowledge, trigger, asArray(shown["deck"]).map(String), asArray(shown["relics"]).map(String), asArray(shown["potions"]).map(String)),
    memory: { ...memory },
    ...(screenMemory.runPlan ? { previous_plan: toJsonValue(screenMemory.runPlan) } : {}),
  };
  onEvent({ type: "note", message: `asking DeepSeek for the run plan (${trigger}, floor ${state.run?.floor ?? "?"})` });
  try {
    // A reply that is no run plan is recovered from the reasoning or fails: the plan in force stays.
    const { json, meta, recovered, note } = await deepseek.askJson(payload, "run-plan", isRunPlanReply);
    count(meta.inputTokens + meta.outputTokens, meta.brain);
    const plan = parseRunPlan(json, state, knowledge, trigger);
    screenMemory.runPlan = plan;
    journal.noteRunPlan(state, trigger, runPlanLine(plan));
    logRunPlan(logFile, {
      run: runId,
      floor: state.run?.floor ?? null,
      trigger,
      // The state the plan was made on (the journal filed it there; journal-replay.ts).
      observed_ts: observedTs,
      plan: toJsonValue(plan),
      raw: toJsonValue(json),
      ...(recovered ? { recovered_from_reasoning: true } : {}),
      ...(note ? { note } : {}),
      latency_ms: meta.latencyMs,
      input_tokens: meta.inputTokens,
      output_tokens: meta.outputTokens,
      cache_hit_tokens: meta.cacheHitTokens ?? 0,
      reasoning_tokens: meta.reasoningTokens ?? 0,
      effort: meta.effort ?? "",
      memory_chars: memoryChars(memory),
    });
    onEvent({ type: "note", message: `run plan (${memoryChars(memory)} context chars, ${(meta.latencyMs / 1000).toFixed(0)} s, ${trigger}): ${plan.archetype}; want ${plan.want.join(", ") || "-"}; elites ${plan.elites}; rest ${plan.rest}` });
  } catch (error) {
    screenMemory.runPlanFailed = failKey;
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof DeepSeekAnswerError) count(error.meta.inputTokens + error.meta.outputTokens, (error.meta as BrainMetaUsage).brain);
    logRunPlan(logFile, { run: runId, floor: state.run?.floor ?? null, trigger, error: message.slice(0, 200), ...unparsedFields(error) });
    onEvent({ type: "note", message: `run plan failed: ${message.slice(0, 160)}` });
  }
}

/** A plan call whose reply did not parse: its usage and the raw reply (cut), for the plan logs. */
function unparsedFields(error: unknown): Record<string, JsonValue> {
  if (!(error instanceof DeepSeekAnswerError)) return {};
  const meta = error.meta;
  return {
    latency_ms: meta.latencyMs,
    input_tokens: meta.inputTokens,
    output_tokens: meta.outputTokens,
    cache_hit_tokens: meta.cacheHitTokens ?? 0,
    reasoning_tokens: meta.reasoningTokens ?? 0,
    effort: meta.effort ?? "",
    raw_reply: error.detail.content.slice(0, 2000),
  };
}

/**
 * The baseline question with DeepSeek's failed answer as context: its reason and reasoning conclusion go
 * into the state Jev is shown (`deepseek_advice`), both the plain view and JEV_CONTEXT's. A copy: the
 * screen's baseline object is left as built.
 */
export function withAdvisorNote(decision: AskDecision, note: Record<string, string>): AskDecision {
  const advice: Record<string, JsonValue> = { note: "DeepSeek (the build advisor) answered this question but its answer could not be used; its own words:", ...note };
  return {
    ...decision,
    state: { ...decision.state, deepseek_advice: advice },
    ...(decision.jevView ? { jevView: { ...decision.jevView, state: { ...decision.jevView.state, deepseek_advice: advice } } } : {}),
  };
}

/** A direct DeepSeek decision's token usage, from its decision record. */
function deepseekUsage(record: Record<string, JsonValue>): { input_tokens: number; output_tokens: number; cache_hit_tokens: number; reasoning_tokens: number } {
  const n = (key: string): number => (typeof record[key] === "number" ? (record[key] as number) : 0);
  return { input_tokens: n("input_tokens"), output_tokens: n("output_tokens"), cache_hit_tokens: n("cache_hit_tokens"), reasoning_tokens: n("reasoning_tokens") };
}

/** A route review's log fields in the decision's row (a change's paths and plan are in its own row). */
function routeReviewLog(review: RouteReviewResult): JsonValue {
  return {
    answer: review.answer,
    outcome: review.outcome,
    ...(review.reason ? { reason: review.reason } : {}),
    ...(review.invalid ? { invalid: review.invalid } : {}),
    ...(review.change ? { plan_ref: review.change.ref, plan_step: review.change.step } : {}),
  };
}

/**
 * The decision loop (PLAN.md §7).
 *
 * One iteration: read state → plan → ask Jev → gate → dispatch → verify → log. Every guard in
 * PLAN.md §8.1 lives here: legality, staleness, one action in flight, budget caps, circuit breaker,
 * and the run boundary.
 */

import { dirname, join } from "node:path";

import { classifyFailure, dispatch } from "./act/dispatch.js";
import { fingerprint, gate } from "./act/gate.js";
import type { AppConfig } from "./config.js";
import type { AnswerSet } from "./jev/answers.js";
import type { JevClient } from "./jev/client.js";
import type { Escalator } from "./llm/file-escalation.js";
import { DeepSeekClient } from "./llm/deepseek.js";
import { moveModel } from "./knowledge/move-model.js";
import { fightKind } from "./screens/combat-plan.js";
import { FIGHT_PLAN_TASK, fightKey, fightPlanInput, fightPlanJson, loadFightPlan, logFightPlan, needsReplan, parseFightPlan } from "./strategy/fight-plan.js";
import { loadRunPlan, logRunPlan, parseRunPlan, RUN_PLAN_TASK, runPlanInput, runPlanLine, runPlanTrigger } from "./strategy/run-plan.js";
import type { Knowledge } from "./knowledge/index.js";
import type { ModClient } from "./mod/client.js";
import type { ActionResult, GameState } from "./mod/schema.js";
import { addNote, buildRunBrief } from "./project/run-brief.js";
import { describeChoice, memoryChars, RunJournal } from "./project/run-journal.js";
import { createScreenMemory, type DecisionEnv, type ResolvedAction, type ScreenMemory } from "./project/types.js";
import { planDecision } from "./screens/index.js";
import { rememberMap } from "./screens/rest.js";
import { createDecisionLog, createStateLog, type DecisionRecord } from "./telemetry/decision-log.js";
import { asArray, asRecord, bool, num, str, toJsonValue, type JsonValue } from "./util/json.js";

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
  const maxDecisions = options.maxDecisions ?? 2_000;
  const maxRuns = options.maxRuns ?? 1;
  const maxMinutes = options.maxMinutes ?? 60;
  const log = createDecisionLog(config.log.decisionLog);
  const stateLog = createStateLog(join(dirname(config.log.decisionLog), "states.jsonl"));
  const logState = (state: GameState, fp: string, ts: string): void =>
    stateLog.write({ ts, fingerprint: fp, screen: state.screen, session: `${state.session.mode}/${state.session.phase}`, state: state.raw });
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
  // Consecutive gate rejections; after a few in combat the loop ends the turn instead of spinning.
  let gateRejections = 0;
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
    if (screenMemory.screen !== state.screen) {
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
      screenMemory.combatPlan = null;
    }
    // Per-fight combat records outlive in-combat screen changes (card choices), not the fight.
    if (!state.in_combat) {
      screenMemory.hpGuard = undefined;
      screenMemory.potionTurn = undefined;
      screenMemory.potionVeto = undefined;
      screenMemory.facing = undefined;
      screenMemory.fightCards = undefined;
      screenMemory.planBeforeSelection = undefined;
      screenMemory.plannedAfter = undefined;
      screenMemory.paelsEyeFight = undefined;
      screenMemory.fightStart = undefined;
      screenMemory.demonTongueTurn = undefined;
      screenMemory.fightPlan = undefined;
      screenMemory.fightPlanFailed = undefined;
    }
    if (state.screen === "SHOP" && bool(asRecord(state.raw["shop"])["is_open"])) {
      screenMemory.shopOpened = true;
    }
    // The REST screen has no map: keep the last one for its "forced elite next" check.
    if (state.screen === "MAP") rememberMap(screenMemory, state);
    journal.observe(state);
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
    };
    // FIGHT_PLAN=v1: DeepSeek plans an elite/boss fight once, before its first decision.
    // RUN_PLAN=v1: DeepSeek's run strategy, renewed at the map screen when a checkpoint is due.
    if (!planned && config.runPlan === "v1" && !state.in_combat && state.screen === "MAP") {
      const deepseek = (options.escalators ?? []).find((escalator): escalator is DeepSeekClient => escalator instanceof DeepSeekClient);
      if (deepseek && stats.deepseekCalls < (config.deepseek?.maxCalls ?? 0)) {
        await ensureRunPlan(env, deepseek, journal, config.runPlanLog, onEvent, (tokens) => {
          stats.deepseekCalls += 1;
          stats.deepseekTokens += tokens;
        });
      }
    }
    if (config.runPlan === "v1") {
      if (screenMemory.runPlan === undefined && str(state.raw["run_id"])) screenMemory.runPlan = loadRunPlan(config.runPlanLog, str(state.raw["run_id"]));
      const line = screenMemory.runPlan && screenMemory.runPlan.runId === str(state.raw["run_id"]) ? runPlanLine(screenMemory.runPlan) : null;
      if (line) env.brief.plan = line;
    }
    if (!planned && config.fightPlan === "v1" && state.in_combat && state.screen === "COMBAT") {
      const deepseek = (options.escalators ?? []).find((escalator): escalator is DeepSeekClient => escalator instanceof DeepSeekClient);
      if (deepseek && stats.deepseekCalls < (config.deepseek?.maxCalls ?? 0)) {
        await ensureFightPlan(env, deepseek, journal, config.fightPlanLog, onEvent, (tokens) => {
          stats.deepseekCalls += 1;
          stats.deepseekTokens += tokens;
        });
      }
    }
    if (!planned) {
      try {
        planned = planDecision(env);
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

    const decision = planned.decision;
    const planStarted = Date.now();
    const stateFingerprint = fingerprint(state);
    let resolved: ResolvedAction;
    let jevLatency = 0;
    let asked: Record<string, JsonValue> | undefined;
    let rawAnswers: JsonValue | undefined;
    let usage = { input_tokens: 0, output_tokens: 0 };
    const requestIds: string[] = [];
    let reasked = false;
    let escalation: JsonValue | undefined;

    let usedJev = false;
    let fromMemo = false;
    if (decision.kind === "act") {
      resolved = { intent: decision.intent, rationale: decision.rationale, confidence: null, fallback: false };
    } else if (!jev) {
      // No-Jev mode: the resolver sees an empty answer set and takes its deterministic path.
      resolved = decision.resolve({});
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
      let firstAnswers: AnswerSet = {};
      try {
        const result = await jev.ask(jevState, jevQuestions);
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
          const memory = journal.render(state, knowledge, screenMemory.lastMap);
          for (const escalator of options.escalators ?? []) {
            const capped =
              escalator.name === "claude"
                ? stats.claudeCalls >= config.escalation.claudeMaxCalls
                : stats.deepseekCalls >= (config.deepseek?.maxCalls ?? 0);
            if (capped) continue;
            try {
              if (escalator.name === "claude") stats.claudeCalls += 1;
              else stats.deepseekCalls += 1;
              if (escalator.name === "claude") onEvent({ type: "note", message: `escalating ${decision.label} to Claude (Jev ${jevAnswer.choice} @${jevAnswer.confidence.toFixed(2)})` });
              const answer = await escalator.choose(
                decision.state,
                question?.instructions ?? "",
                criteria,
                escalator.name === "deepseek" ? { ...context, memory: { ...memory } } : context,
              );
              if (escalator.name === "deepseek") stats.deepseekTokens += answer.inputTokens + answer.outputTokens;
              const override = decision.resolve({
                ...result.answers,
                [esc.question]: { type: "choice", choice: answer.choice, probabilities: { [answer.choice]: 1 }, confidence: 1, raw: { escalated: escalator.name } },
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
              escalation = { by: escalator.name, jev_choice: jevAnswer.choice, jev_confidence: jevAnswer.confidence, deepseek_choice: answer.choice, choice: answer.choice, reason: answer.reason, latency_ms: answer.latencyMs, tokens: answer.inputTokens + answer.outputTokens, input_tokens: answer.inputTokens, output_tokens: answer.outputTokens, cache_hit_tokens: answer.cacheHitTokens ?? 0, guide: answer.guideId ?? "", handbook: answer.handbookId ?? "", reasoning_tokens: answer.reasoningTokens ?? 0, effort: answer.effort ?? "", ...(escalator.name === "deepseek" ? { memory_chars: memoryChars(memory) } : {}) };
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
          const followUp = await jev.ask(jevState, {
            pick: { type: "choice", instructions: spec.instructions, criteria: spec.criteria },
          });
          stats.jevCalls += 1;
          if (followUp.requestId) requestIds.push(followUp.requestId);
          stats.inputTokens += followUp.inputTokens;
          stats.outputTokens += followUp.outputTokens;
          jevLatency += followUp.latencyMs;
          usage = { input_tokens: usage.input_tokens + followUp.inputTokens, output_tokens: usage.output_tokens + followUp.outputTokens };
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

    let gated = gate(state, resolved.intent);
    if (!gated.ok && state.screen === "COMBAT" && gateRejections >= 3 && state.available_actions.includes("end_turn")) {
      // The same illegal play kept coming back (a card whose cost rose above our energy, 2026-09-25:
      // 30 min spinning on "card_index 5 is not playable"): stop re-planning it and end the turn.
      onEvent({ type: "note", message: `gate rejected ${resolved.intent.action} ${gateRejections} times: ending the turn instead` });
      const endTurn = { action: "end_turn" } as const;
      resolved.intent = endTurn;
      resolved.rationale = `fallback after repeated illegal plays: ${resolved.rationale}`;
      gated = gate(state, endTurn);
    }
    if (!gated.ok) {
      stats.waits += 1;
      gateRejections += 1;
      noteStall(state, gated.reason);
      onEvent({ type: "note", message: `gate rejected ${resolved.intent.action}: ${gated.reason}` });
      // Never serve the rejected answer or plan again: the next pass re-plans from the live state.
      answerMemo = null;
      screenMemory.combatPlan = null;
      await sleep(pollIntervalMs);
      continue;
    }
    gateRejections = 0;
    clearStall();

    const baseRecord = {
      ts: new Date().toISOString(),
      mode,
      screen: state.screen,
      session: `${state.session.mode}/${state.session.phase}`,
      floor: state.run?.floor ?? null,
      turn: state.turn,
      label: decision.label,
      decider:
        decision.kind === "act"
          ? ("code" as const)
          : resolved.fallback || (!usedJev && !fromMemo)
            ? ("code-fallback" as const)
            : resolved.decider ?? ("jev" as const),
      fingerprint: stateFingerprint,
      questions: asked,
      answers: rawAnswers,
      chosen: toJsonValue(resolved.intent),
      rationale: resolved.rationale,
      confidence: resolved.confidence,
      fallback: resolved.fallback,
      reasked,
      no_jev: !usedJev && !fromMemo && decision.kind === "ask",
      reused_answer: fromMemo,
      request_ids: requestIds,
      latency_ms: { plan: Date.now() - planStarted - jevLatency, jev: jevLatency, action: 0 },
      usage,
      ...(escalation === undefined ? {} : { escalation }),
      ...(decision.kind === "ask" && decision.jevView ? { jev_context: decision.jevView.context, jev_hints: decision.jevView.hints } : {}),
    } satisfies Omit<DecisionRecord, "result">;
    const journalEntry = {
      label: decision.label,
      by: baseRecord.decider,
      choice: describeChoice(decision, resolved, rawAnswers, escalation),
      reason: str(asRecord(escalation)["reason"]),
      asked: decision.kind === "ask" && (usedJev || fromMemo) && !resolved.fallback,
      intent: resolved.intent,
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
      resolved.apply?.();
      journal.record(state, journalEntry);
      stats.decisions += 1;
      const record: DecisionRecord = { ...baseRecord, result: "shadow (not dispatched)" };
      log.write(record);
      logState(state, stateFingerprint, record.ts);
      onEvent({ type: "decision", record, totals: totals() });
      await sleep(pollIntervalMs);
      continue;
    }

    // Re-read before touching the game: actions are not idempotent (PLAN.md §8.1).
    let fresh: GameState;
    try {
      fresh = await client.state();
    } catch (error) {
      onEvent({ type: "note", message: `pre-dispatch state re-read failed: ${classifyFailure(error).detail}` });
      await sleep(pollIntervalMs);
      continue;
    }
    if (fingerprint(fresh) !== stateFingerprint) {
      onEvent({ type: "note", message: "state changed while deciding; re-planning" });
      continue;
    }

    const actionStarted = Date.now();
    let actionResult: ActionResult;
    try {
      actionResult = await dispatch(client, resolved.intent);
    } catch (error) {
      const failure = classifyFailure(error);
      stats.errors += 1;
      consecutiveFailures += 1;
      onEvent({ type: "note", message: `action ${resolved.intent.action} failed (${failure.kind}): ${failure.detail}` });
      if (failure.kind === "fatal") {
        stop(`action failure: ${failure.detail}`);
        break;
      }
      await sleep(pollIntervalMs);
      continue;
    }

    stats.acts += 1;
    stats.decisions += 1;
    // The resolution's memory effects (combat plan commitment, HP-guard record), once, for the action played.
    resolved.apply?.();
    journal.record(state, journalEntry);
    // The board is about to change (or should): never reuse an answer across an action.
    answerMemo = null;
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
      latency_ms: { ...baseRecord.latency_ms, action: Date.now() - actionStarted },
      result: `${actionResult.status}${actionResult.stable ? "" : " (unstable)"}: ${actionResult.message}`,
    };
    log.write(record);
    logState(state, stateFingerprint, record.ts);
    onEvent({ type: "decision", record, totals: totals() });
    await sleep(60);
  }

  stats.elapsedMs = Date.now() - startedAt;
  log.close();
  return stats;
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
  deepseek: DeepSeekClient,
  journal: RunJournal,
  logFile: string,
  onEvent: (event: LoopEvent) => void,
  count: (tokens: number) => void,
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
  const memory = journal.render(state, knowledge, screenMemory.lastMap);
  const payload: Record<string, JsonValue> = {
    task: FIGHT_PLAN_TASK,
    fight_state: fightPlanInput(state, knowledge, kind, moveModel()),
    memory: { run_journal: memory.run_journal, lookahead: memory.lookahead },
    ...(screenMemory.runPlan && screenMemory.runPlan.runId === runId
      ? { run_plan: { archetype: screenMemory.runPlan.archetype, boss_prep: screenMemory.runPlan.bossPrep, summary: screenMemory.runPlan.summary } }
      : {}),
    ...(current && current.fight === fight ? { previous_plan: fightPlanJson(current), note: "A new boss/elite enemy appeared: revise the plan for the rest of the fight." } : {}),
  };
  onEvent({ type: "note", message: `asking DeepSeek for the ${kind} fight plan (floor ${state.run?.floor ?? "?"}${replans > 0 ? ", re-plan" : ""})` });
  try {
    // Label outside "combat/": one call per fight is worth the build-question effort (max), not the
    // per-turn combat effort.
    const { json, meta } = await deepseek.askJson(payload, "fight-plan");
    count(meta.inputTokens + meta.outputTokens);
    const plan = parseFightPlan(json, state, knowledge, { runId, fight, kind, replans });
    screenMemory.fightPlan = plan;
    journal.noteFightPlan(state, plan.summary || plan.approach);
    logFightPlan(logFile, {
      run: runId,
      fight,
      floor: state.run?.floor ?? null,
      turn: state.turn,
      kind,
      enemies: plan.enemyIds,
      plan: toJsonValue(plan),
      raw: toJsonValue(json),
      latency_ms: meta.latencyMs,
      input_tokens: meta.inputTokens,
      output_tokens: meta.outputTokens,
      cache_hit_tokens: meta.cacheHitTokens ?? 0,
      reasoning_tokens: meta.reasoningTokens ?? 0,
      effort: meta.effort ?? "",
      guide: meta.guideId ?? "",
      handbook: meta.handbookId ?? "",
    });
    onEvent({ type: "note", message: `fight plan (${(meta.latencyMs / 1000).toFixed(0)} s): ${plan.approach}; setup ${plan.setup.join(", ") || "-"}; kill first ${plan.focus ?? "-"}; ${plan.summary}` });
  } catch (error) {
    screenMemory.fightPlanFailed = fight;
    const message = error instanceof Error ? error.message : String(error);
    logFightPlan(logFile, { run: runId, fight, floor: state.run?.floor ?? null, kind, error: message.slice(0, 200) });
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
  deepseek: DeepSeekClient,
  journal: RunJournal,
  logFile: string,
  onEvent: (event: LoopEvent) => void,
  count: (tokens: number) => void,
): Promise<void> {
  const { state, knowledge, screenMemory } = env;
  const runId = str(state.raw["run_id"]);
  if (!runId) return;
  if (!screenMemory.runPlan || screenMemory.runPlan.runId !== runId) screenMemory.runPlan = loadRunPlan(logFile, runId);
  const trigger = runPlanTrigger(screenMemory.runPlan, state);
  if (!trigger) return;
  const failKey = `${runId}:${state.run?.floor ?? "?"}`;
  if (screenMemory.runPlanFailed === failKey) return;
  const memory = journal.render(state, knowledge, screenMemory.lastMap);
  const shown = fightPlanInput(state, knowledge, "run", {});
  const payload: Record<string, JsonValue> = {
    task: RUN_PLAN_TASK,
    run_state: runPlanInput(state, knowledge, trigger, asArray(shown["deck"]).map(String), asArray(shown["relics"]).map(String), asArray(shown["potions"]).map(String)),
    memory: { run_journal: memory.run_journal, lookahead: memory.lookahead },
    ...(screenMemory.runPlan ? { previous_plan: toJsonValue(screenMemory.runPlan) } : {}),
  };
  onEvent({ type: "note", message: `asking DeepSeek for the run plan (${trigger}, floor ${state.run?.floor ?? "?"})` });
  try {
    const { json, meta } = await deepseek.askJson(payload, "run-plan");
    count(meta.inputTokens + meta.outputTokens);
    const plan = parseRunPlan(json, state, knowledge, trigger);
    screenMemory.runPlan = plan;
    logRunPlan(logFile, {
      run: runId,
      floor: state.run?.floor ?? null,
      trigger,
      plan: toJsonValue(plan),
      raw: toJsonValue(json),
      latency_ms: meta.latencyMs,
      input_tokens: meta.inputTokens,
      output_tokens: meta.outputTokens,
      cache_hit_tokens: meta.cacheHitTokens ?? 0,
      reasoning_tokens: meta.reasoningTokens ?? 0,
      effort: meta.effort ?? "",
    });
    onEvent({ type: "note", message: `run plan (${(meta.latencyMs / 1000).toFixed(0)} s, ${trigger}): ${plan.archetype}; want ${plan.want.join(", ") || "-"}; elites ${plan.elites}; rest ${plan.rest}` });
  } catch (error) {
    screenMemory.runPlanFailed = failKey;
    const message = error instanceof Error ? error.message : String(error);
    logRunPlan(logFile, { run: runId, floor: state.run?.floor ?? null, trigger, error: message.slice(0, 200) });
    onEvent({ type: "note", message: `run plan failed: ${message.slice(0, 160)}` });
  }
}

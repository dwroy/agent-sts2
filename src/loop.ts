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
import type { Knowledge } from "./knowledge/index.js";
import type { ModClient } from "./mod/client.js";
import type { ActionResult, GameState } from "./mod/schema.js";
import { addNote, buildRunBrief } from "./project/run-brief.js";
import { createScreenMemory, type DecisionEnv, type ResolvedAction, type ScreenMemory } from "./project/types.js";
import { planDecision } from "./screens/index.js";
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
  knowledge: Knowledge;
  maxRuns?: number;
  maxDecisions?: number;
  maxMinutes?: number;
  pollIntervalMs?: number;
  onEvent?: (event: LoopEvent) => void;
}

export interface LoopStats {
  decisions: number;
  jevCalls: number;
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

  const stats: LoopStats = {
    decisions: 0,
    jevCalls: 0,
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
    if (Date.now() > deadline) return `time cap reached (${maxMinutes} min)`;
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
    }
    if (state.screen === "SHOP" && bool(asRecord(state.raw["shop"])["is_open"])) {
      screenMemory.shopOpened = true;
    }
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
      shopDiscardPotions: config.shop.discardPotions,
    };
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

      asked = toJsonValue(decision.questions) as Record<string, JsonValue>;
      let firstAnswers: AnswerSet = {};
      try {
        const result = await jev.ask(decision.state, decision.questions);
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

        if (!resolved.intent && resolved.reask) {
          reasked = true;
          const spec = resolved.reask;
          const followUp = await jev.ask(decision.state, {
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

    const gated = gate(state, resolved.intent);
    if (!gated.ok) {
      stats.waits += 1;
      noteStall(state, gated.reason);
      onEvent({ type: "note", message: `gate rejected ${resolved.intent.action}: ${gated.reason}` });
      await sleep(pollIntervalMs);
      continue;
    }
    clearStall();

    const baseRecord = {
      ts: new Date().toISOString(),
      mode,
      screen: state.screen,
      session: `${state.session.mode}/${state.session.phase}`,
      floor: state.run?.floor ?? null,
      turn: state.turn,
      label: decision.label,
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
    } satisfies Omit<DecisionRecord, "result">;

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

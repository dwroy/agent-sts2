/**
 * The decision loop (PLAN.md §7).
 *
 * One iteration: read state → plan → ask Jev → gate → dispatch → verify → log. Every guard in
 * PLAN.md §8.1 lives here: legality, staleness, one action in flight, budget caps, circuit breaker,
 * and the run boundary.
 */

import { classifyFailure, dispatch } from "./act/dispatch.js";
import { fingerprint, gate } from "./act/gate.js";
import type { AppConfig } from "./config.js";
import type { JevClient } from "./jev/client.js";
import type { Knowledge } from "./knowledge/index.js";
import type { ModClient } from "./mod/client.js";
import type { ActionResult, GameState } from "./mod/schema.js";
import { addNote, buildRunBrief } from "./project/run-brief.js";
import type { DecisionEnv, ResolvedAction } from "./project/types.js";
import { planDecision } from "./screens/index.js";
import { createDecisionLog, type DecisionRecord } from "./telemetry/decision-log.js";
import { asArray, asRecord, num, str, toJsonValue, type JsonValue } from "./util/json.js";

export type LoopMode = "shadow" | "play";

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
  fallbacks: number;
  acts: number;
  waits: number;
  unsupported: number;
  errors: number;
  inputTokens: number;
  outputTokens: number;
  runsCompleted: number;
  stoppedBecause: string;
  elapsedMs: number;
  logPath: string;
}

export type LoopEvent =
  | { type: "note"; message: string }
  | { type: "wait"; screen: string; reason: string }
  | { type: "decision"; record: DecisionRecord }
  | { type: "stop"; reason: string };

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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
  const onEvent = options.onEvent ?? ((): void => {});
  const startedAt = Date.now();
  const deadline = startedAt + maxMinutes * 60_000;

  const stats: LoopStats = {
    decisions: 0,
    jevCalls: 0,
    fallbacks: 0,
    acts: 0,
    waits: 0,
    unsupported: 0,
    errors: 0,
    inputTokens: 0,
    outputTokens: 0,
    runsCompleted: 0,
    stoppedBecause: "unknown",
    elapsedMs: 0,
    logPath: log.path,
  };

  let notes: string[] = [];
  let hasSeenRun = false;
  let consecutiveFailures = 0;
  let lastShadowFingerprint: string | null = null;
  let unsupportedScreen: string | null = null;
  let unsupportedCount = 0;

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

    if (state.session.phase === "run" || state.run !== null) hasSeenRun = true;
    if (hasSeenRun && state.screen === "MAIN_MENU") {
      stats.runsCompleted += 1;
      hasSeenRun = false;
      notes = [];
      if (stats.runsCompleted >= maxRuns) {
        stop(`completed ${stats.runsCompleted} run(s)`);
        break;
      }
    }

    const brief = buildRunBrief(state, knowledge, notes);
    const env: DecisionEnv = {
      state,
      knowledge,
      brief,
      thresholds: config.thresholds,
      runStart: config.run.start,
      characterPreference: config.run.character,
      allowFtueModals: config.allowFtueModals,
    };
    const planned = planDecision(env);

    if (planned.kind === "wait") {
      stats.waits += 1;
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
    let reasked = false;

    let usedJev = false;
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
      asked = toJsonValue(decision.questions) as Record<string, JsonValue>;
      try {
        const result = await jev.ask(decision.state, decision.questions);
        usedJev = true;
        stats.jevCalls += 1;
        stats.inputTokens += result.inputTokens;
        stats.outputTokens += result.outputTokens;
        jevLatency += result.latencyMs;
        usage = { input_tokens: result.inputTokens, output_tokens: result.outputTokens };
        rawAnswers = toJsonValue(result.answers);
        resolved = decision.resolve(result.answers);

        if (!resolved.intent && resolved.reask) {
          reasked = true;
          const spec = resolved.reask;
          const followUp = await jev.ask(decision.state, {
            pick: { type: "choice", instructions: spec.instructions, criteria: spec.criteria },
          });
          stats.jevCalls += 1;
          stats.inputTokens += followUp.inputTokens;
          stats.outputTokens += followUp.outputTokens;
          jevLatency += followUp.latencyMs;
          usage = { input_tokens: usage.input_tokens + followUp.inputTokens, output_tokens: usage.output_tokens + followUp.outputTokens };
          const answer = followUp.answers["pick"];
          if (answer && answer.type === "choice") {
            const intent = spec.map[answer.choice];
            resolved = intent
              ? {
                  intent,
                  rationale: `shortlist re-ask chose ${answer.choice} (confidence ${answer.confidence.toFixed(2)})`,
                  confidence: answer.confidence,
                  fallback: false,
                }
              : { intent: null, rationale: `shortlist answer "${answer.choice}" was not in the map`, confidence: answer.confidence, fallback: true };
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
    }

    if (resolved.fallback) stats.fallbacks += 1;

    if (!resolved.intent) {
      stats.waits += 1;
      onEvent({ type: "wait", screen: state.screen, reason: resolved.rationale });
      await sleep(pollIntervalMs);
      continue;
    }

    const gated = gate(state, resolved.intent);
    if (!gated.ok) {
      stats.waits += 1;
      onEvent({ type: "note", message: `gate rejected ${resolved.intent.action}: ${gated.reason}` });
      await sleep(pollIntervalMs);
      continue;
    }

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
      no_jev: !usedJev && decision.kind === "ask",
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
      onEvent({ type: "decision", record });
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
    const note = noteForAction(state, resolved, decision.label);
    if (note) notes = addNote(brief, note).notes;

    const record: DecisionRecord = {
      ...baseRecord,
      latency_ms: { ...baseRecord.latency_ms, action: Date.now() - actionStarted },
      result: `${actionResult.status}${actionResult.stable ? "" : " (unstable)"}: ${actionResult.message}`,
    };
    log.write(record);
    onEvent({ type: "decision", record });
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

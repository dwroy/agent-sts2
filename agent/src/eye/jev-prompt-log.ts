/**
 * Jev's prompts as sent (V4 M3, docs/v4-architecture.md §1 "眼": every module's input is logged verbatim): one
 * JSONL row per request to Jev, holding the whole request body, so a question can be read and replayed exactly.
 * Jev takes no system prompt: the body ({model, state, questions}) is the whole prompt. The API key travels in a
 * header and is never part of a row.
 *
 * A row joins decisions.jsonl by `decision_id` (the decision row carries the same id), and also by `request_id`
 * (the decision row's `request_ids`) or by run_id + observed_ts + fingerprint + label. A request that failed has
 * `error` and no answers; a retried request is one row per attempt.
 */

import { mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { appendJsonLine } from "../core/util/jsonl.js";

import type { AnswerSet } from "../reflex/jev/answers.js";
import { classifyJevError, type JevAskResult } from "../reflex/jev/client.js";
import type { QuestionSet } from "../reflex/jev/questions.js";
import { compactJevRequest, isJevContextLimitError, type CompactJevRequest } from "../reflex/jev/compact-request.js";
import { projectSilentCombatDecision, type DecisionProjection } from "../reflex/jev/decision-projection.js";

export interface JevPromptMeta {
  /** The decision this request was made for (the decision row's `decision_id`). */
  decisionId: string;
  runId: string | null;
  floor: number | null;
  turn: number | null;
  /** The fingerprint of the state the question was built on (decision row `fingerprint`). */
  fingerprint: string;
  /** When the loop read that state (decision row `observed_ts`). */
  observedTs: string;
  label: string;
  /** JEV_CONTEXT of the question ("v1": Jev's own view), null for the plain question. */
  jevContext: string | null;
  /** The first question, or the shortlist follow-up asked after it. */
  call: "ask" | "reask";
}

export interface JevPromptRecord {
  ts: string;
  decision_id: string;
  run_id: string | null;
  floor: number | null;
  turn: number | null;
  fingerprint: string;
  observed_ts: string;
  label: string;
  jev_context: string | null;
  call: "ask" | "reask";
  /** The request body as sent to TypeSafe (no key: that is a header). */
  request: { model: string; state: unknown; questions: QuestionSet };
  request_id: string | null;
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  answers?: AnswerSet;
  error?: { kind: string; status: number | null; message: string };
  /** Present only on the bounded, lossless retry of a context-limit rejection. */
  transport_encoding?: CompactJevRequest["encoding"];
  decision_projection?: DecisionProjection["contract"];
  /** Full computed evidence is retained locally and never sent as the projected wire request. */
  decision_evidence?: DecisionProjection["evidence"];
}

export interface JevPromptLog {
  readonly path: string;
  write(record: JevPromptRecord): void;
}

/**
 * Where Jev's prompts go by default: next to the decision log (logs/decisions.jsonl -> logs/jev-prompts.jsonl;
 * any other name x.jsonl -> x.jev-prompts.jsonl), so a test's temporary decision log keeps its prompts with it.
 */
export function jevPromptLogPath(decisionLog: string): string {
  const name = basename(decisionLog);
  return join(dirname(decisionLog), name === "decisions.jsonl" ? "jev-prompts.jsonl" : `${name.replace(/\.jsonl$/, "")}.jev-prompts.jsonl`);
}

/** The prompt log path in force: JEV_PROMPT_LOG (config), else next to the decision log; null when switched off. */
export function resolveJevPromptLog(log: { decisionLog: string; jevPromptLog?: string | null }): string | null {
  return log.jevPromptLog === undefined ? jevPromptLogPath(log.decisionLog) : log.jevPromptLog;
}

export function createJevPromptLog(path: string): JevPromptLog {
  let ready = false;
  return {
    path,
    write(record) {
      try {
        if (!ready) {
          mkdirSync(dirname(path), { recursive: true });
          ready = true;
        }
        appendJsonLine(path, record);
      } catch {
        // Losing a log line must never stop a run (decision-log.ts).
      }
    },
  };
}

/** What askJevLogged needs of the client (JevClient, or a test double). */
export interface JevAsker {
  readonly model: string;
  ask(state: unknown, questions: QuestionSet, timeoutMs?: number): Promise<JevAskResult>;
}

/**
 * Ask Jev and log the request (with its answers, or the error): one row per call, written whatever the outcome;
 * the result or the error is passed on unchanged.
 */
export async function askJevLogged(jev: JevAsker, log: JevPromptLog | null, meta: JevPromptMeta, state: unknown, questions: QuestionSet): Promise<JevAskResult> {
  const started = Date.now();
  const projection = meta.label.startsWith("combat/plan") ? projectSilentCombatDecision(state, questions) : null;
  const wireState = projection?.state ?? state, wireQuestions = projection?.questions ?? questions;
  try {
    return await askOnceLogged(jev, log, meta, wireState, wireQuestions, undefined, projection ?? undefined);
  } catch (error) {
    if (!isJevContextLimitError(error)) throw error;
    const compact = compactJevRequest(wireState, wireQuestions);
    if (!compact) throw error;
    // Keep the first rejection and the actual retry body in separate joined log rows.
    // No recursion: another rejection is returned to the existing failure handling.
    const result = await askOnceLogged(jev, log, meta, compact.state, compact.questions, compact.encoding, projection ?? undefined, false);
    return { ...result, latencyMs: Date.now() - started };
  }
}

async function askOnceLogged(jev: JevAsker, log: JevPromptLog | null, meta: JevPromptMeta, state: unknown, questions: QuestionSet, encoding?: CompactJevRequest["encoding"], projection?: DecisionProjection, includeEvidence = true): Promise<JevAskResult> {
  const started = Date.now();
  const base = {
    ts: new Date(started).toISOString(),
    decision_id: meta.decisionId,
    run_id: meta.runId,
    floor: meta.floor,
    turn: meta.turn,
    fingerprint: meta.fingerprint,
    observed_ts: meta.observedTs,
    label: meta.label,
    jev_context: meta.jevContext,
    call: meta.call,
    request: { model: jev.model, state, questions },
    ...(encoding ? { transport_encoding: encoding } : {}),
    ...(projection ? { decision_projection: projection.contract, ...(includeEvidence ? { decision_evidence: projection.evidence } : {}) } : {}),
  };
  try {
    const result = await jev.ask(state, questions);
    log?.write({ ...base, request_id: result.requestId, latency_ms: result.latencyMs, input_tokens: result.inputTokens, output_tokens: result.outputTokens, answers: result.answers });
    return result;
  } catch (error) {
    const failure = classifyJevError(error);
    log?.write({
      ...base,
      request_id: null,
      latency_ms: Date.now() - started,
      input_tokens: null,
      output_tokens: null,
      error: { kind: failure.kind, status: failure.status, message: failure.message.slice(0, 300) },
    });
    throw error;
  }
}

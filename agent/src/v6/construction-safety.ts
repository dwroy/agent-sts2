import { dirname, join } from "node:path";
import { asRecord, str } from "../core/util/json.js";
import type { Decision, DecisionEnv, ResolvedAction } from "../memory/types.js";
import type { V6ProjectionTable } from "../sim/v6-projection.js";
import { isV6RoomDecision } from "../hand/screens/v6-room.js";
import { v6Config, type V6Config } from "./config.js";
import { V6BuildLog } from "./log.js";

export type ConstructionKind = "card_pick" | "potion" | "shop" | "rest";
export interface ConstructionCoverage {
  total: number;
  known: number;
  ratio: number;
  unknown: string[];
  reason: "insufficient_known_options" | "known_ratio_below_threshold" | null;
}
/** Count actual selectable options, never combination rows or partial/renormalized sums. */
export function constructionCoverage(options: readonly string[], table?: V6ProjectionTable | null, config: V6Config = v6Config()): ConstructionCoverage {
  const ids = [...new Set(options)];
  const unknown = ids.filter(id => !table?.enabled || !table.target_mixtures.some(row => row.option_id === id
    && row.known_mass >= 1 - 1e-9 && row.known_mass <= 1 + 1e-9
    && row.value !== null && Number.isFinite(row.value.value) && row.value.value >= 0 && row.value.value <= 1
    && Number.isFinite(row.value.se) && row.value.se >= 0 && Number.isInteger(row.value.n) && row.value.n >= 2));
  const total = ids.length, known = total - unknown.length, ratio = total ? known / total : 0;
  return { total, known, ratio, unknown,
    reason: known < 2 ? "insufficient_known_options" : ratio < config.min_known_option_ratio ? "known_ratio_below_threshold" : null };
}
export function constructionQuestion(env: DecisionEnv, decision: Decision): { kind: ConstructionKind; coverage: ConstructionCoverage } | null {
  const config = v6Config();
  if (config.mode !== "on" || env.v6BrainFallback || env.state.in_combat || decision.kind !== "ask") return null;
  if (isV6RoomDecision(decision)) return { kind: decision.v6Room.kind,
    coverage: constructionCoverage(decision.v6Room.options.map(o => o.option.key), decision.roomProjection) };
  if (config.deciders.card === "jev" && (decision.v6Card || ["reward/card", "selection/add", "selection/choose"].includes(decision.label))) {
    const question = decision.questions.pick;
    return { kind: "card_pick", coverage: constructionCoverage(question?.type === "choice" ? Object.keys(question.criteria) : [], env.v6ProjectionTable) };
  }
  if (config.deciders.potion === "jev" && (decision.potionJev || decision.label === "map/statue-potion"
    || asRecord(decision.state).v6_potion_decider === "jev"
    || (env.state.screen !== "SHOP" && Object.keys(decision.questions).some(key => key.startsWith("discard_p"))))) {
    // Slot noul scores and holding HP are not weighted projection values. W6 has no slot projection provider yet.
    const questions = decision.potionJev?.questions ?? decision.questions;
    const ids = Object.entries(questions).flatMap(([key, q]) => q.type === "choice" ? Object.keys(q.criteria).map(id => `${key}:${id}`) : [key]);
    return { kind: "potion", coverage: constructionCoverage(ids) };
  }
  return null;
}
/** One auditable T6 event per board handover. Full projection audits remain in their existing log. */
export function recordConstructionHandover(env: DecisionEnv, logFile: string, questionId: string, kind: ConstructionKind,
  coverage: ConstructionCoverage, reason: string, elapsed = 0): void {
  const config = v6Config();
  if (config.mode !== "on") return;
  const run = str(env.state.raw.run_id), character = str(asRecord(env.state.run?.raw).character_id).toLowerCase();
  env.screenMemory.v6BrainFallbackPending = { run, questionId };
  new V6BuildLog(config, join(dirname(logFile), "v6-build.jsonl")).append({ schema: "v6-build-log-v1",
    ts: new Date().toISOString(), run_id: run, character, question_id: questionId, kind, mode: "on", stage: "trigger",
    event: "v6_unknown_to_brain", entries: [], jev_answer: null,
    fallback: `${reason}; known=${coverage.known}/${coverage.total}; threshold=${config.min_known_option_ratio}`.slice(0, 300),
    elapsed_ms: elapsed, cache: { hits: 0, misses: 0 }, degradation: ["v6_unknown_to_brain", reason.slice(0, 200)],
    unknown: { count: coverage.total - coverage.known, total: coverage.total }, triggers: ["T6"], merged_triggers: [], skipped_triggers: [] });
}

/** Keep the legacy scored choice unless it skips an entirely unmeasured reward after both models are unavailable. */
export function unknownCardLastResort(original: Decision, baseline: Decision): ResolvedAction | null {
  if (original.kind !== "ask" || original.label !== "reward/card") return null;
  const current = baseline.kind === "act" ? baseline : baseline.resolve({}, { budgetExpired: true });
  if (current.intent?.action !== "skip_reward_cards") return null;
  const take = original.deepseek?.options?.().find(o => o.intent.action === "choose_reward_card");
  return take ? { intent: take.intent, confidence: null, fallback: true,
    rationale: "V6 projections all unknown and brain unavailable; first legal offered card instead of default skip" } : null;
}

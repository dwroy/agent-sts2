import { dirname, join } from "node:path";
import { asArray, asRecord, bool, numOrNull, str, toJsonValue, type JsonValue } from "../core/util/json.js";
import type { DecisionEnv, AskDecision, ResolvedAction } from "../memory/types.js";
import type { ActionRequest } from "../hand/mod/client.js";
import type { AnswerSet, ChoiceAnswer } from "../reflex/jev/answers.js";
import { choiceQ } from "../reflex/jev/questions.js";
import { v6DeltaTier, type V6ProjectionTable } from "../sim/v6-projection.js";
import { v6ProjectionEntries } from "../sim/v6-projection-entries.js";
import { boundedV6Jev, compactCombo, compactProjection, prioritize, promptBudgetLabels } from "./prompt-summary.js";
import { directionCombos } from "./direction-plan.js";
import { v6Config } from "./config.js";
import { v6Directions } from "./direction-runtime.js";
import { loadV6Knowledge } from "./knowledge.js";
import { KNOWLEDGE_DIR } from "../knowledge/files.js";
import { evaluatePredicate } from "./predicate.js";
import { V6BuildLog } from "./log.js";
import type { ProjectionEntry, Character } from "./formats.js";

export interface V6CardPick {
  decision: AskDecision;
  entries: ProjectionEntry[];
  table?: V6ProjectionTable;
  choices: string[];
  fallback: string;
}
export function v6CardActive(env: DecisionEnv): boolean {
  const c = v6Config();
  return c.mode !== "off" && c.deciders.card === "jev" && !env.state.in_combat
    && env.state.screen === "REWARD" && bool(asRecord(env.state.raw.reward).pending_card_choice);
}

/** Unknown estimates stay unknown; only W3's weighted paired comparisons rank choices. */
export function cardFallback(choices: readonly string[], table?: V6ProjectionTable): string {
  const config = v6Config();
  const mixture = (id: string, kind: "clearance" | "current_gate") => table?.target_mixtures.find(r => r.option_id === id && r.kind === kind)?.paired_delta ?? null;
  const viable = choices.filter(id => v6DeltaTier(mixture(id, "current_gate"), config) !== "much_worse");
  const rank = (id: string) => [mixture(id, "clearance")?.mean ?? -Infinity, mixture(id, "current_gate")?.mean ?? -Infinity];
  return [...viable].sort((a, b) => {
    const x = rank(a), y = rank(b);
    for (let i = 0; i < x.length; i++) { if (x[i] !== y[i]) return x[i]! > y[i]! ? -1 : 1; }
    return Number(b === "skip") - Number(a === "skip") || choices.indexOf(a) - choices.indexOf(b);
  })[0] ?? (choices.includes("skip") ? "skip" : choices[0]!);
}
export function cardAnswer(answers: AnswerSet, choices: readonly string[]): ChoiceAnswer | null {
  const a = answers.pick;
  return a?.type === "choice" && choices.includes(a.choice) && Number.isFinite(a.confidence) && a.confidence >= 0 && a.confidence <= 1
    && !!a.probabilities && typeof a.probabilities === "object" && !Array.isArray(a.probabilities)
    && Object.entries(a.probabilities).every(([id, p]) => choices.includes(id) && Number.isFinite(p) && p >= 0 && p <= 1) ? a : null;
}

/** The early return is also the byte-equivalence boundary for all legacy reward planners. */
export function buildV6CardPick(env: DecisionEnv, table: V6ProjectionTable | undefined = env.v6ProjectionTable, dir = KNOWLEDGE_DIR): V6CardPick | null {
  if (!v6CardActive(env)) return null;
  const summaries = v6Directions(env, dir);
  if (!summaries.length) return null;
  const raw = asRecord(env.state.raw.reward), actions = env.state.available_actions;
  const offers = asArray(raw.card_options).map(asRecord);
  if (!offers.length) return null;
  const intents: Record<string, ActionRequest> = {}, criteria: Record<string, string> = {}, facts: Record<string, JsonValue> = {};
  const plan = env.screenMemory.runPlan?.runId === str(env.state.raw.run_id) ? env.screenMemory.runPlan.v6 : undefined;
  const weights = plan?.direction_weights ?? {};
  const character = str(asRecord(env.state.run?.raw).character_id).toLowerCase();
  const knowledge = loadV6Knowledge(dir, character), ascension = env.state.run?.ascension ?? 0;
  const entries = table?.enabled ? v6ProjectionEntries(table, v6Config()).filter(e => summaries.some(s => s.id === e.direction_id
    && directionCombos(s, toJsonValue(plan)).some(c => c.id === e.combo_id && c.source === e.combo_source))) : [];
  if (actions.includes("choose_reward_card")) for (const [fallbackIndex, card] of offers.entries()) {
    const index = numOrNull(card.index) ?? fallbackIndex;
    if (!Number.isInteger(index) || index < 0 || Object.hasOwn(intents, `card${index}`)) continue;
    const key = `card${index}`, id = str(card.card_id);
    if (!id) continue;
    intents[key] = { action: "choose_reward_card", option_index: index };
    criteria[key] = `Take ${id}${bool(card.upgraded) ? "+" : ""}`;
    const reflex = v6Config().reflex === "on" && knowledge.reflex.status === "loaded" ? knowledge.reflex.value.filter(r =>
      r.applies_to === "card_pick" && r.scope.ascensions.includes(ascension)
      && (!r.directions || r.directions.some(d => (weights[d] ?? 0) > 0))
      && evaluatePredicate(r.predicate, { act: Number(str(asRecord(env.state.run?.raw).act_id, "0")) + 1,
        floor: env.state.run?.floor, player: { hp: env.state.run?.current_hp }, card: { id, tags: [] }, direction_weights: weights }) === true)
      .map(r => ({ id: r.id, label_en: r.label_en, signal: r.signal, confidence: r.confidence, n_support: r.evidence.n_support, n_contradict: r.evidence.n_contradict })) : [];
    facts[key] = toJsonValue({ card: id, upgraded: bool(card.upgraded), projections: entries.filter(e => e.option_id === key), reflex });
  }
  if (actions.includes("skip_reward_cards")) {
    intents.skip = { action: "skip_reward_cards" }; criteria.skip = "Take no card";
    facts.skip = toJsonValue({ projections: entries.filter(e => e.option_id === "skip") });
  }
  const choices = Object.keys(intents); if (!choices.length) return null;
  entries.splice(0, entries.length, ...entries.filter(e => choices.includes(e.option_id)));
  const targetMetadata = table?.targets.length ? table.targets : env.v6DirectionEvaluation?.targets?.length ? env.v6DirectionEvaluation.targets
    : [{ id: "current_boss_unknown", kind: "current", probability: null }, { id: "chain_unknown", kind: "chain", probability: null }];
  const targets = targetMetadata.map(t => t.id);
  for (const option of choices) for (const direction of summaries) for (const combo of directionCombos(direction, toJsonValue(plan))) for (const target of targets) {
    if (entries.some(e => e.option_id === option && e.direction_id === direction.id && e.combo_id === combo.id && e.target_id === target)) continue;
    entries.push({ schema: "projection-entry-v1", option_id: option, direction_id: direction.id, target_id: target,
      combo_id: combo.id, combo_source: combo.source, combo_metrics: combo.metrics, win_complete: null, win_incomplete: null,
      incomplete_source: "unknown", expected_win: null, direction_value: null, win: null, paired_delta: null,
      losing_boss_hp_fraction: null, winning_player_hp_fraction: null, turns: null, joint_win: null, joint_paired_delta: null,
      availability: { take: null, skip: null }, weighted_current_boss_delta: null, weighted_joint_delta: null,
      deck_count_change: null, core_first_cast_turn: null, win_tier: "unknown", delta_tier: "unknown", direction_role: "unknown", trust: "unknown", reflex_ids: [] });
  }
  for (const key of choices) facts[key] = { ...asRecord(facts[key]), projections: toJsonValue(entries.filter(e => e.option_id === key).map(entry => {
    const row = table?.combinations.find(r => r.entry.option_id === entry.option_id && r.entry.direction_id === entry.direction_id
      && r.combination_id === entry.combo_id && r.entry.target_id === entry.target_id);
    return { ...asRecord(compactProjection(entry, row?.unknown_reasons)), ...(row ? { combo_role: row.role, role_labels: row.role_labels,
      formation_se: row.formation_se, formation_n: row.formation_n } : {}) };
  })) };
  const modelLimits = [...new Set(table?.combinations.flatMap(r => r.model_labels) ?? [])];
  const score = (d: string, c: string) => Math.max(-1, ...entries.filter(e => e.direction_id === d && e.combo_id === c).map(e => e.expected_win ?? -1));
  for (const key of choices) {
    const fact = asRecord(facts[key]);
    fact.projections = toJsonValue(prioritize(asArray(fact.projections).map(asRecord), weights, r => str(r.direction_id), r => score(str(r.direction_id), str(r.combo_id))));
  }
  const coreMetrics = prioritize(summaries.flatMap(direction => directionCombos(direction, toJsonValue(plan)).map(combo => ({ direction: direction.id, combo }))), weights, r => r.direction, r => score(r.direction, r.combo.id))
    .map(({ direction, combo }) => ({ direction, ...asRecord(compactCombo(combo, targets,
      entries.find(e => e.direction_id === direction && e.combo_id === combo.id && e.combo_metrics != null)?.combo_metrics ?? combo.metrics)) }));
  const fallback = cardFallback(choices, table);
  const decision: AskDecision = { kind: "ask", label: "reward/card", v6Card: true,
    state: { direction_weights: toJsonValue(weights), availability: toJsonValue(entries.filter(e => e.option_id === "skip").map(e => ({ direction: e.direction_id, combo: e.combo_id, target: e.target_id, probability: e.availability.skip, trust: e.trust }))),
      targets: toJsonValue(targetMetadata), core_metrics: toJsonValue(coreMetrics),
      weighted: toJsonValue(table?.weighted ?? []), target_mixtures: toJsonValue(table?.target_mixtures ?? []),
      limitations: toJsonValue(table?.telemetry.degradation ?? ["projection_provider_unavailable"]),
      ...(modelLimits.length ? { model_limits: toJsonValue(modelLimits) } : {}),
      note: "Probabilities are model estimates, not guarantees. Null means unknown. Paired deltas compare taking with skipping; missing mass is not renormalized. Core observations pool versions and ascensions, separated by first/including-SL attempt; sources describe provenance. Adjusted estimates name their target ascension. These metrics are descriptive, not causal benefits.",
      options: facts, ...(plan?.ideal_overrides ? { temporary_combos: toJsonValue(plan.ideal_overrides) } : {}) },
    questions: { pick: choiceQ("Choose one card reward or skip. Follow direction weights; compare current-boss safety and weighted two-boss-chain deltas, completion probability and trust. Use only the supplied facts.", criteria) },
    resolve(answers): ResolvedAction {
      const answer = cardAnswer(answers, choices), key = answer?.choice ?? fallback;
      return { intent: intents[key]!, rationale: answer ? `V6 Jev chose ${key}` : `V6 card fallback chose ${key}: current-boss gate, weighted chain delta, current-boss delta, then skip`,
        confidence: answer?.confidence ?? null, fallback: !answer };
    } };
  Object.assign(decision, boundedV6Jev(decision.state, decision.questions));
  return { decision, entries, table, choices, fallback };
}

export function recordCardPick(env: DecisionEnv, pick: V6CardPick, logFile: string, questionId: string, answers: AnswerSet, elapsedMs: number, reason: string | null): void {
  const config = v6Config(); if (config.mode === "off") return;
  const a = cardAnswer(answers, pick.choices), telemetry = pick.table?.telemetry;
  new V6BuildLog(config, join(dirname(logFile), "v6-build.jsonl")).append({ schema: "v6-build-log-v1", ts: new Date().toISOString(),
    run_id: str(env.state.raw.run_id), character: str(asRecord(env.state.run?.raw).character_id).toLowerCase() as Character,
    question_id: questionId, kind: "card_pick", mode: config.mode, entries: pick.entries,
    jev_answer: a ? { choice: a.choice, confidence: a.confidence, probabilities: a.probabilities } : null,
    fallback: reason ?? (a ? null : `invalid_or_missing_answer:${pick.fallback}`), elapsed_ms: elapsedMs,
    cache: { hits: telemetry?.cache_hits ?? 0, misses: telemetry?.cache_misses ?? 0 },
    degradation: [...(telemetry?.degradation ?? ["projection_provider_unavailable"]), ...promptBudgetLabels(pick.decision.state)],
    unknown: { count: pick.entries.filter(e => e.win === null).length, total: pick.entries.length },
    triggers: [], merged_triggers: [], skipped_triggers: [] });
}

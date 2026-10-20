import { dirname, join } from "node:path";
import { asArray, asRecord, bool, numOrNull, str, toJsonValue, type JsonValue } from "../core/util/json.js";
import type { DecisionEnv, AskDecision, ResolvedAction } from "../memory/types.js";
import type { ActionRequest } from "../hand/mod/client.js";
import type { AnswerSet, ChoiceAnswer } from "../reflex/jev/answers.js";
import { choiceQ } from "../reflex/jev/questions.js";
import { v6DeltaTier, type V6ProjectionTable } from "../sim/v6-projection.js";
import { promptProjectionEntries } from "./prompt-projection.js";
import { cardResultKnown, type V6CardResults, type CardCombatRow } from "../sim/v6-card-results.js";
import { boundedV6Jev, prioritize, promptBudgetLabels } from "./prompt-summary.js";
import { directionCombos } from "./direction-plan.js";
import { v6Config } from "./config.js";
import { postCombatCardReward } from "./card-reward-scope.js";
import { v6Directions, v6PublishedKnowledge } from "./direction-runtime.js";
import { KNOWLEDGE_DIR } from "../knowledge/files.js";
import { evaluatePredicate } from "./predicate.js";
import { V6BuildLog } from "./log.js";
import type { ProjectionEntry, Character } from "./formats.js";

export interface V6CardPick {
  decision: AskDecision;
  entries: ProjectionEntry[];
  table?: V6ProjectionTable;
  results?: V6CardResults | null;
  choices: string[];
  fallback: string;
}
export function v6CardActive(env: DecisionEnv): boolean {
  const c = v6Config();
  return !env.v6BrainFallback && c.mode !== "off" && c.deciders.card === "jev"
    && postCombatCardReward(env.screenMemory, env.state);
}

/** Unknown estimates stay unknown; only W3's weighted paired comparisons rank choices. */
export function cardFallback(choices: readonly string[], table?: V6ProjectionTable): string {
  const config = v6Config();
  const mixture = (id: string, kind: "clearance" | "current_gate") => table?.target_mixtures.find(r => r.option_id === id && r.kind === kind)?.paired_delta ?? null;
  // Only used after the brain is unavailable. Missing numbers cannot make skip the default.
  if (!choices.some(id => mixture(id, "clearance") || mixture(id, "current_gate"))) return choices.find(id => id !== "skip") ?? choices[0]!;
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
  const knowledge = v6PublishedKnowledge(env, dir), ascension = env.state.run?.ascension ?? 0;
  const entries = table?.enabled ? promptProjectionEntries(table, v6Config()).filter(e => summaries.some(s => s.id === e.direction_id
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
    facts[key] = toJsonValue({ card: id, upgraded: bool(card.upgraded), reflex });
  }
  if (actions.includes("skip_reward_cards")) {
    intents.skip = { action: "skip_reward_cards" }; criteria.skip = "Take no card";
    facts.skip = {};
  }
  const choices = Object.keys(intents); if (!choices.length) return null;
  entries.splice(0, entries.length, ...entries.filter(e => choices.includes(e.option_id)));
  const results = env.v6CardResults;
  const targetMetadata = results?.targets ?? [{ id: "current_boss_unknown", kind: "current", probability: null }];
  const current = targetMetadata.find(t => t.kind === "current");
  const metricOrder = ["hp_loss", "turns", "damage_per_turn", "death_rate", "losing_enemy_hp_fraction"] as const;
  const pack = (metrics: CardCombatRow["metrics"]) => metricOrder.map(k => {
    const m = metrics[k]; return m ? [m.mean, m.se, m.n] : null;
  });
  const view = (row: CardCombatRow) => ({ target: row.target_id, result: pack(row.metrics), vs_skip: pack(row.paired_delta),
    samples: row.samples, requested: row.requested_samples, capped: row.capped, time_up: row.time_up,
    trust: row.trust, unknown_reasons: row.unknown_reasons });
  for (const key of choices) facts[key] = toJsonValue({ ...asRecord(facts[key]), known_current_boss: cardResultKnown(results, key),
    immediate: results?.immediate.filter(row => row.option_id === key).map(view) ?? [{ target: current?.id, metrics: null, unknown_reasons: ["current_deck_results_unavailable"] }],
    advances: results?.progress[key]?.filter(p => p.advanced > 0) ?? [] });
  const coreMetrics = prioritize(summaries.flatMap(direction => directionCombos(direction, toJsonValue(plan)).map(combo => ({ direction: direction.id, combo }))), weights, r => r.direction)
    .map(({ direction, combo }) => ({ direction, id: combo.id, source: combo.source, types: asRecord(combo.details).types ?? [], cards: combo.requirements,
      missing: results?.progress.skip?.find(p => p.direction === direction && p.combo === combo.id)?.missing_before ?? null,
      outcomes: results?.long_term.filter(row => row.direction_id === direction && row.combo_id === combo.id).map(view) ?? [] }));
  const known = choices.filter(key => cardResultKnown(results, key));
  // This resolver is reached only after the ordinary brain is also unavailable.
  const outcome = (key: string) => results?.immediate.find(row => row.option_id === key && row.target_id === current?.id);
  const fallback = [...known].sort((a, b) => {
    const x = outcome(a)!, y = outcome(b)!;
    return x.metrics.death_rate!.mean - y.metrics.death_rate!.mean || x.metrics.hp_loss!.mean - y.metrics.hp_loss!.mean
      || (x.metrics.death_rate!.mean === 1 && y.metrics.death_rate!.mean === 1
        ? (x.metrics.losing_enemy_hp_fraction?.mean ?? Infinity) - (y.metrics.losing_enemy_hp_fraction?.mean ?? Infinity)
          || y.metrics.damage_per_turn!.mean - x.metrics.damage_per_turn!.mean || y.metrics.turns!.mean - x.metrics.turns!.mean
        : y.metrics.damage_per_turn!.mean - x.metrics.damage_per_turn!.mean)
      || Number(b === "skip") - Number(a === "skip") || choices.indexOf(a) - choices.indexOf(b);
  })[0] ?? choices.find(key => key !== "skip") ?? choices[0]!;
  const decision: AskDecision = { kind: "ask", label: "reward/card", v6Card: true,
    state: { card_result_schema: "v6-card-combat-results-v1", direction_weights: toJsonValue(weights),
      result_columns: [...metricOrder], estimate_columns: ["mean", "se", "n"],
      targets: toJsonValue(targetMetadata), core_metrics: toJsonValue(coreMetrics),
      long_term_cache: toJsonValue(results?.telemetry.long_term_cache ?? "miss"),
      opening_note: "A uses current HP and the actual current deck plus this reward, never ideal cards or forecast route survival. B adds only missing core cards, from background cache independently of this reward. Never multiply by formation probability. Null means unknown. Raw simulation, not calibration. Each mean/SE has its own n; capped/interrupted windows and loss margins have separate denominators. Paired deltas use identical seeds. Lower HP loss/death and higher damage/turn are preferable. Fewer turns can mean faster victory OR earlier death: interpret with death, not as always better. If both die, lower remaining enemy HP and longer survival can matter. Losing enemy HP is conditional on losing, divided by opening encounter HP; later phases/spawns can make it exceed 1. Do not rank it alone. Elites are an observed pool, not spawn probabilities. Future entry HP is an assumption, not forecast inventory.",
      options: facts, ...(plan?.ideal_overrides ? { temporary_combos: toJsonValue(plan.ideal_overrides) } : {}) },
    questions: { pick: choiceQ("Choose one card or skip using A immediate current-deck Boss and elite outcomes, paired with skip. B completed-core outcomes describe long-term directions; advances separately names combinations this card progresses and remaining cards. Compare HP loss, turns, damage/turn, death and losing-enemy HP with n, SE and trust. Do not use P*W or treat unknown as zero. Use only supplied facts.", criteria) },
    resolve(answers): ResolvedAction {
      const answer = cardAnswer(answers, choices), key = answer?.choice ?? fallback;
      return { intent: intents[key]!, rationale: answer ? `V6 Jev chose ${key}` : `V6 card fallback chose ${key}: sampled current-Boss death, HP loss and damage outcomes (brain unavailable)`,
        confidence: answer?.confidence ?? null, fallback: !answer };
    } };
  Object.assign(decision, boundedV6Jev(decision.state, decision.questions));
  return { decision, entries, table, results, choices, fallback };
}

export function recordCardPick(env: DecisionEnv, pick: V6CardPick, logFile: string, questionId: string, answers: AnswerSet, elapsedMs: number, reason: string | null): void {
  const config = v6Config(); if (config.mode === "off") return;
  const a = cardAnswer(answers, pick.choices), telemetry = pick.results?.telemetry;
  new V6BuildLog(config, join(dirname(logFile), "v6-build.jsonl")).append({ schema: "v6-build-log-v1", ts: new Date().toISOString(),
    run_id: str(env.state.raw.run_id), character: str(asRecord(env.state.run?.raw).character_id).toLowerCase() as Character,
    question_id: questionId, kind: "card_pick", mode: config.mode, entries: pick.entries,
    jev_answer: a ? { choice: a.choice, confidence: a.confidence, probabilities: a.probabilities } : null,
    fallback: reason ?? (a ? null : `invalid_or_missing_answer:${pick.fallback}`), elapsed_ms: elapsedMs,
    cache: { hits: telemetry?.cache_hits ?? 0, misses: Math.max(0, (pick.results?.immediate.length ?? 0) - (telemetry?.cache_hits ?? 0)) },
    degradation: [...(pick.results?.labels ?? ["current_deck_results_unavailable"]), ...promptBudgetLabels(pick.decision.state)],
    unknown: { count: pick.choices.filter(id => !cardResultKnown(pick.results, id)).length, total: pick.choices.length },
    triggers: [], merged_triggers: [], skipped_triggers: [] });
}

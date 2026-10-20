/** Direction-only prompt views. Simulation and published evidence remain outside this consumer. */
import { asArray, asRecord, toJsonValue, type JsonValue } from "../core/util/json.js";
import type { DirectionSummary } from "./direction-plan.js";
import type { BuildState, CoreTemplate } from "../construction/types.js";
import { missingRequirements } from "../construction/planner.js";
import type { CoreCombatRow } from "../sim/v6-card-results.js";

export const DIRECTION_PROMPT_CHARS = 30_000;
const metricNames = ["hp_loss", "turns", "damage_per_turn", "death_rate", "losing_enemy_hp_fraction"] as const;
/** Exact structural subset of the producer contract, including trust value/labels/details. */
export type DirectionCoreCombatRow = Pick<CoreCombatRow, "direction_id" | "combo_id" | "target_id" | "metrics" | "paired_delta"
  | "samples" | "requested_samples" | "capped" | "time_up" | "missing" | "trust" | "labels" | "unknown_reasons">;
export interface DirectionCoreProgress { direction: string; combo: string; missing_before: number; missing_after: number; advanced: number }
export interface DirectionCompletedSnapshot {
  long_term: readonly DirectionCoreCombatRow[]; progress: readonly DirectionCoreProgress[];
  targets: readonly { id: string }[]; unknown_reasons: readonly string[];
}
const vector = (metrics: DirectionCoreCombatRow["metrics"]): JsonValue => metricNames.map(k => {
  const s = metrics[k]; return s ? [s.mean, s.se, s.n] : null;
});

/** No P, incomplete branch, reward option or stale legacy projection is a completed-core result. */
export const directionResultLabels = (snapshot?: DirectionCompletedSnapshot | null): string[] => [...new Set(snapshot?.long_term.flatMap(r => r.labels) ?? [])];
export function completedDirectionSummaries(summaries: readonly DirectionSummary[], snapshot?: DirectionCompletedSnapshot | null, inventory?: BuildState): JsonValue[] {
  const labels = directionResultLabels(snapshot);
  return summaries.map(d => ({ id: d.id, name: d.name, source: d.source, combos: d.combos.map(c => {
    const progress = snapshot?.progress.find(p => p.direction === d.id && p.combo === c.id);
    const core: CoreTemplate = { id: d.id, name: d.name, character: "", ascensions: [], status: "candidate",
      requirements: c.requirements as unknown as CoreTemplate["requirements"], evidence: { runs: [], source: "published_signature", sha256: "" }, limits: [] };
    const missing = inventory ? missingRequirements(inventory, core).reduce((n, r) => n + r.count, 0) : null;
    const outcomes = snapshot?.long_term.filter(r => r.direction_id === d.id && r.combo_id === c.id) ?? [];
    return { id: c.id, source: c.source, cards: c.requirements, prerequisites: toJsonValue(asRecord(c.details).prerequisites ?? null),
      missing_cards: progress?.missing_before ?? missing,
      completed_results: outcomes.map(r => ({ target_id: r.target_id, metrics: vector(r.metrics), paired_delta: vector(r.paired_delta),
        samples: r.samples, requested_samples: r.requested_samples, capped: r.capped, time_up: r.time_up, missing: r.missing,
        trust: toJsonValue(r.trust), labels: r.labels.map(label => labels.indexOf(label)), unknown_reasons: r.unknown_reasons })),
      unknown_reasons: outcomes.length ? [] : [...(snapshot?.unknown_reasons.length ? snapshot.unknown_reasons : ["completed_core_cache_miss"])],
      omitted_targets: [] };
  }) }));
}

/** Decode the local lossless wire view before tightening a previously bounded ride. */
export function expandDirectionPrompt(input: Record<string, JsonValue>): Record<string, JsonValue> {
  const state = structuredClone(input);
  if (state.compact_columns) {
    const targets = asArray(state.targets), sets = asArray(state.omitted_target_sets), requirements = asArray(state.requirement_sets);
    const reasons = asArray(state.unknown_reason_sets), prerequisites = asArray(state.prerequisite_sets);
    for (const direction of asArray(state.build_cores).map(asRecord)) {
      if (asRecord(state.compact_columns).combos) direction.combos = asArray(direction.combos).map(value => {
        const row = asArray(value);
        return { id: row[0] ?? null, cards: row[1] ?? [], missing_cards: row[2] ?? null,
          prerequisites: row[3] === null ? null : prerequisites[Number(row[3])] ?? null,
          completed_results: row[4] ?? [], omitted_targets: row[5] ?? 0,
          unknown_reasons: reasons[Number(row[6])] ?? [], source: row[7] ?? direction.source ?? null };
      });
      for (const c of asArray(direction.combos).map(asRecord)) {
      c.cards = asArray(c.cards).map(index => { const r = asArray(requirements[Number(index)]); return { count: r[0] ?? null,
        any: asArray(r[1]).map(a => { const component = asArray(a); return { kind: component[0] ?? null, id: component[1] ?? null,
          ...(component[2] === null ? {} : { upgraded: component[2] ?? null }) }; }) }; });
      c.completed_results = asArray(c.completed_results).map(value => { const row = asArray(value), counts = asArray(row[3]); return {
        target_id: targets[Number(row[0])] ?? null, metrics: row[1] ?? null, paired_delta: row[2] ?? null,
        samples: counts[0] ?? null, requested_samples: counts[1] ?? null, capped: counts[2] ?? null, time_up: counts[3] ?? null, missing: counts[4] ?? null,
        trust: row[4] ?? null, labels: row[5] ?? [], unknown_reasons: row[6] ?? [] }; });
      c.omitted_targets = asArray(sets[Number(c.omitted_targets)]).map(index => targets[Number(index)] ?? null);
      c.source ??= direction.source ?? null; c.unknown_reasons ??= [];
      }
    }
    delete state.compact_columns; delete state.omitted_target_sets; delete state.requirement_sets;
    delete state.unknown_reason_sets; delete state.prerequisite_sets;
  }
  return state;
}
/** Protect every direction, combo identity, card signature and answer-validation context. */
export function boundDirectionPrompt(input: Record<string, JsonValue>, limit = DIRECTION_PROMPT_CHARS): Record<string, JsonValue> {
  const state = expandDirectionPrompt(input), before = JSON.stringify(input).length;
  const omitted: Record<string, number> = { ...asRecord(asRecord(input.prompt_budget).omitted) } as Record<string, number>;
  const budget = { limit, unit: "chars", before, after: 0, truncated: false, omitted };
  state.prompt_budget = toJsonValue(budget);
  const update = () => {
    budget.truncated = Object.keys(omitted).length > 0;
    for (let i = 0; i < 4; i++) { state.prompt_budget = toJsonValue(budget); budget.after = JSON.stringify(state).length; }
    state.prompt_budget = toJsonValue(budget);
  };
  update();
  // Remove optional result detail fairly across combos, never a direction or its last measured target.
  const combos = asArray(state.build_cores).flatMap(d => asArray(asRecord(d).combos).map(asRecord));
  while (budget.after > limit) {
    let estimated = budget.after, removed = 0;
    while (estimated > limit - 128) {
      const candidate = combos.filter(c => asArray(c.completed_results).length > 1)
        .sort((a, b) => asArray(b.completed_results).length - asArray(a.completed_results).length)[0];
      if (!candidate) break;
      const rows = candidate.completed_results as JsonValue[], raw = rows.pop()!, row = asRecord(raw);
      (candidate.omitted_targets as JsonValue[]).push(toJsonValue(row.target_id));
      estimated -= JSON.stringify(raw).length - JSON.stringify(row.target_id).length;
      removed++;
    }
    if (!removed) break;
    omitted.completed_target_rows = (omitted.completed_target_rows ?? 0) + removed; update();
  }
  // Previous reasoning is redundant; keep weights, overrides and checkpoint for continuity.
  if (budget.after > limit && state.previous_plan) {
    const previous = asRecord(state.previous_plan);
    state.previous_plan = toJsonValue({ direction_weights: previous.direction_weights, ideal_overrides: previous.ideal_overrides, checkpoint: previous.checkpoint });
    omitted.previous_plan_details = 1; update();
  }
  // Existing V5 run context can leave less than 10k chars. Encode repeated field names,
  // not directions, requirements, errors, denominators or the last measured Boss.
  if (budget.after > limit && combos.length) {
    const targets = [...new Set([...asArray(state.targets).map(String), ...combos.flatMap(c => [
      ...asArray(c.completed_results).map(r => String(asRecord(r).target_id)), ...asArray(c.omitted_targets).map(String)])])];
    state.targets = targets;
    state.compact_columns = { cards: "requirement_sets indices; [count, alternatives[[kind,id,upgraded-or-null]]]; AND requirements, OR alternatives",
      combos: "[id,cards,missing_cards,prerequisite_sets-index-or-null,completed_results,omitted_targets,unknown_reason_sets-index,source-or-null(inherits direction)]",
      completed_results: "[target-index, metrics, paired_delta, [samples,requested_samples,capped,time_up,missing], trust, label-indices, unknown_reasons]",
      omitted_targets: "omitted_target_sets index; values index targets; full rows in audit" };
    const omittedSets: JsonValue[] = [], requirementSets: JsonValue[] = [];
    for (const c of combos) {
      c.cards = asArray(c.cards).map(r => { const requirement = asRecord(r), value = [requirement.count ?? null,
        asArray(requirement.any).map(a => { const component = asRecord(a); return [component.kind ?? null, component.id ?? null, component.upgraded ?? null]; })];
        let index = requirementSets.findIndex(set => JSON.stringify(set) === JSON.stringify(value));
        if (index < 0) { index = requirementSets.length; requirementSets.push(toJsonValue(value)); }
        return index; });
      c.completed_results = asArray(c.completed_results).map(r => { const row = asRecord(r); return [targets.indexOf(String(row.target_id)),
        row.metrics ?? null, row.paired_delta ?? null, [row.samples ?? null, row.requested_samples ?? null, row.capped ?? null, row.time_up ?? null, row.missing ?? null],
        row.trust ?? null, row.labels ?? [], row.unknown_reasons ?? []]; });
      const absent = asArray(c.omitted_targets).map(t => targets.indexOf(String(t)));
      let index = omittedSets.findIndex(set => JSON.stringify(set) === JSON.stringify(absent));
      if (index < 0) { index = omittedSets.length; omittedSets.push(absent); }
      c.omitted_targets = index;
      if (!asArray(c.unknown_reasons).length) delete c.unknown_reasons;
    }
    const reasonSets: JsonValue[] = [], prerequisiteSets: JsonValue[] = [];
    const intern = (set: JsonValue[], value: JsonValue) => {
      let index = set.findIndex(existing => JSON.stringify(existing) === JSON.stringify(value));
      if (index < 0) { index = set.length; set.push(value); } return index;
    };
    for (const direction of asArray(state.build_cores).map(asRecord)) direction.combos = asArray(direction.combos).map(asRecord).map(c => [
      c.id ?? null, c.cards ?? [], c.missing_cards ?? null, c.prerequisites == null ? null : intern(prerequisiteSets, toJsonValue(c.prerequisites)),
      c.completed_results ?? [], c.omitted_targets ?? 0, intern(reasonSets, toJsonValue(c.unknown_reasons ?? [])), c.source === direction.source ? null : c.source ?? null,
    ]);
    state.omitted_target_sets = omittedSets;
    state.requirement_sets = requirementSets;
    state.unknown_reason_sets = reasonSets;
    state.prerequisite_sets = prerequisiteSets;
    omitted.repeated_field_names = 1; update();
  }
  // Never silently damage the four-direction catalog or a route/requirement to make a request fit.
  if (budget.after > limit) throw new Error(`direction_prompt_required_context_exceeds_${limit}_chars`);
  return state;
}
export const DIRECTION_COMBAT_NOTE = "B=current deck plus missing published combo cards vs listed future Boss/chain. Metrics/deltas: hp_loss,turns,damage_per_turn,death_rate,losing_enemy_hp_fraction; each [mean,SE,n] or null. Delta=B-current deck, same target/seeds. Labels index result_labels. Death rate is not win rate for capped/interrupted samples; losing enemy HP is conditional on loss. Trust/denominators remain visible. Missing cache/data=null, not zero. Missing cards counts unmet requirements including upgrades/alternatives. No appearance probabilities. Omitted targets are explicit; full snapshot in audit.";

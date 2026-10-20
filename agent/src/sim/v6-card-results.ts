/** Current-deck outcomes and separately cached completed-core outcomes. No completion probability product. */
import type { BuildState, CoreTemplate } from "../construction/types.js";
import { missingRequirements } from "../construction/planner.js";
import { evaluatePredicate } from "../v6/predicate.js";
import { slimInput, type FightSampleResult } from "./boss-sim.js";
import type { DeckSimRunner } from "./build-sim-pool.js";
import { summarizeSamples } from "./quantitative-stats.js";
import { v6Digest, type V6Combo, type V6Direction, type V6ProjectionOption } from "./v6-completion.js";
import type { V6PreparedProjection, V6ProjectionRequest, V6ProjectionTarget } from "./v6-projection.js";

export interface CombatEstimate { mean: number; se: number | null; n: number }
export type CombatMetric = "hp_loss" | "turns" | "damage_per_turn" | "death_rate" | "losing_enemy_hp_fraction";
export type CombatMetrics = Record<CombatMetric, CombatEstimate | null>;
export interface CardCombatTarget extends Omit<V6ProjectionTarget, "kind"> { kind: V6ProjectionTarget["kind"] | "elite" }
export interface CardCombatRow {
  option_id: string; target_id: string; metrics: CombatMetrics; paired_delta: CombatMetrics;
  samples: number; requested_samples: number; capped: number; time_up: number; missing: number;
  trust: ReturnType<V6ProjectionRequest["trust"]>; labels: string[]; unknown_reasons: string[];
}
export interface CoreCombatRow extends CardCombatRow { direction_id: string; combo_id: string; added_cards: BuildState["cards"] }
export interface CoreProgress { direction: string; combo: string; missing_before: number; missing_after: number; advanced: number }
export interface V6CardResults {
  schema: "v6-card-combat-results-v1"; targets: CardCombatTarget[]; immediate: CardCombatRow[]; long_term: CoreCombatRow[];
  progress: Record<string, CoreProgress[]>;
  telemetry: { elapsed_ms: number; preparation_ms: number; simulation_ms: number; cache_hits: number; simulations: number;
    long_term_cache: "hit" | "miss"; long_term_computed: number; long_term_total: number; pending_work: boolean };
  labels: string[];
}
export interface CardResultsContext {
  /** Stable across offers and direction weights; includes inventory, HP, floor, route and frozen model identity. */
  fingerprint: string;
  eliteTargets?: CardCombatTarget[];
  prepareCurrent?: (target: CardCombatTarget, option: V6ProjectionOption) => V6PreparedProjection | null;
  prepareElite?: (target: CardCombatTarget, option: V6ProjectionOption) => V6PreparedProjection | null;
}
type Indexed = (FightSampleResult | undefined)[];
type Stored = { key: string; outcomes: Indexed; prepared: V6PreparedProjection };
type Job = { id: string; target: CardCombatTarget; option: V6ProjectionOption; prepared: V6PreparedProjection; stored: Stored };
const fields: CombatMetric[] = ["hp_loss", "turns", "damage_per_turn", "death_rate", "losing_enemy_hp_fraction"];
const empty = (): CombatMetrics => Object.fromEntries(fields.map(k => [k, null])) as CombatMetrics;
const estimate = (values: number[]): CombatEstimate | null => {
  const s = summarizeSamples(values); return s.mean === null ? null : { mean: s.mean, se: s.meanSe, n: s.n };
};
function value(sample: FightSampleResult, metric: CombatMetric, prepared: V6PreparedProjection | null, chain: boolean): number | null {
  if (metric === "hp_loss") return Number.isFinite(sample.hpLoss) ? sample.hpLoss : null;
  if (metric === "turns") return Number.isFinite(sample.turns) && sample.turns > 0 ? sample.turns : null;
  if (metric === "damage_per_turn") return Number.isFinite(sample.turns) && sample.turns > 0 && sample.dmgByTurn.every(Number.isFinite)
    ? sample.dmgByTurn.reduce((a, b) => a + b, 0) / sample.turns : null;
  // Capped, interrupted and invalid continuation samples never become survivals or zeroes.
  const terminal = !sample.capped && !sample.timeUp && (sample.won || sample.died)
    && (!chain || !!sample.sequence && sample.sequence.firstCapped === false && sample.sequence.firstTimeUp === false
      && (sample.sequence.firstDied === true || sample.sequence.firstWon && (sample.sequence.secondWon === true || sample.sequence.secondDied === true)));
  if (metric === "death_rate") return terminal ? Number(sample.died) : null;
  // Use the actual sampled second encounter's opening HP, never an average across possible Boss identities.
  const second = chain && sample.sequence?.firstWon ? prepared?.input.continuation?.variants.find(v => v.boss === sample.sequence!.secondBoss) : null;
  const bossHp = chain && sample.sequence?.firstWon ? second?.input.solver.enemies.reduce((n, e) => n + e.hp, 0) : prepared?.bossHp;
  return terminal && !sample.won && Number.isFinite(sample.enemyHpLeft) && bossHp && Number.isFinite(bossHp) && bossHp > 0
    ? sample.enemyHpLeft / bossHp : null;
}
/** Retain failed/capped samples in audit counts; each conditional denominator is explicit. */
export function cardCombatRow(option: string, target: CardCombatTarget, prepared: V6PreparedProjection | null,
  outcomes: Indexed, baseline: Indexed, trust: CardCombatRow["trust"], requested = 100,
  baselinePrepared = prepared): CardCombatRow {
  const present = outcomes.filter((s): s is FightSampleResult => !!s), metrics = empty(), paired = empty();
  for (const metric of fields) {
    const values: number[] = [], differences: number[] = [];
    for (let i = 0; i < outcomes.length; i++) {
      const sample = outcomes[i]; if (!sample) continue;
      const a = value(sample, metric, prepared, target.kind === "chain");
      if (a !== null) values.push(a);
      const b = baseline[i] ? value(baseline[i]!, metric, baselinePrepared, target.kind === "chain") : null;
      if (a !== null && b !== null) differences.push(a - b);
    }
    metrics[metric] = estimate(values); paired[metric] = estimate(differences);
  }
  const reasons = [...(!prepared ? [target.unknown ?? "opening_unavailable"] : []),
    ...(present.length < 2 ? ["insufficient_samples"] : []),
    ...(metrics.death_rate === null && present.length ? ["no_terminal_samples"] : [])];
  return { option_id: option, target_id: target.id, metrics, paired_delta: paired, samples: present.length,
    requested_samples: requested, capped: present.filter(s => s.capped).length, time_up: present.filter(s => s.timeUp).length,
    missing: requested - present.length, trust, labels: [...(prepared?.labels ?? []), ...target.labels,
      "raw_simulation_not_calibrated", "paired_delta_option_minus_skip_same_seed", "losing_enemy_hp_conditional_on_loss",
      "enemy_hp_fraction_denominator_is_sampled_encounter_opening_hp",
      "remaining_enemy_hp_includes_later_phases_and_spawns_not_clamped_to_one",
      ...(present.length < requested ? ["partial_sample_coverage"] : [])], unknown_reasons: reasons };
}
/** Known means a sampled current-Boss result, independent of ideal cards, trust or later targets. */
export function cardResultKnown(results: V6CardResults | null | undefined, option: string): boolean {
  const targets = results?.targets.filter(t => t.kind === "current") ?? [];
  if (targets.length !== 1 || targets[0]!.unknown) return false;
  const row = results?.immediate.find(r => r.option_id === option && r.target_id === targets[0]!.id);
  return !!row && row.samples >= 2 && !!row.metrics.hp_loss && !!row.metrics.turns && !!row.metrics.damage_per_turn
    && !!row.metrics.death_rate && row.paired_delta.death_rate !== null && row.paired_delta.death_rate.n >= 2;
}
function core(direction: V6Direction, combo: V6Combo): CoreTemplate { return { ...direction.core, requirements: combo.requirements }; }
const distance = (state: BuildState, direction: V6Direction, combo: V6Combo) => missingRequirements(state, core(direction, combo)).reduce((n, r) => n + r.count, 0);
/** Inventory-only progress; callers may read it without constructing or simulating a fight. */
export function coreProgress(r: V6ProjectionRequest, option = r.baseline): CoreProgress[] {
  return r.directions.flatMap(d => d.combos.map(c => {
    const before = distance(r.baseline.state, d, c), after = distance(option.state, d, c);
    return { direction: d.id, combo: c.id, missing_before: before, missing_after: after, advanced: before - after };
  }));
}
/** Canonical published alternative order is a construction convention, never a learned card ranking. */
export function completedCore(state: BuildState, direction: V6Direction, combo: V6Combo, act: number): BuildState | null {
  if (combo.prerequisiteResolution === "unknown" || combo.prerequisites && evaluatePredicate(combo.prerequisites, {
    act, floor: state.floor, player: { hp: state.hp, max_hp: state.maxHp, gold: state.gold, relics: state.relics, deck: state.cards },
  }) !== true) return null;
  const completed = structuredClone(state);
  for (const requirement of combo.requirements) {
    const n = missingRequirements(completed, { ...core(direction, combo), requirements: [requirement] })[0]?.count ?? 0;
    for (let i = 0; i < n; i++) {
      const card = requirement.any.find(c => c.kind === "card" && (!requirement.distinct || !completed.cards.some(k => k.id === c.id)));
      if (!card || completed.cap !== null && completed.cards.length >= completed.cap) return null;
      completed.cards.push({ id: card.id, upgraded: card.upgraded ?? false });
    }
  }
  return distance(completed, direction, combo) === 0 ? completed : null;
}

/** One existing pool; foreground never starts completed-core work. Absolute sample IDs survive bounded slices. */
export class V6CardResultsEngine {
  private samples = new Map<string, Stored>();
  private longTerm = new Map<string, CoreCombatRow[]>();
  private openings = new Map<string, V6PreparedProjection | null>();
  private openingErrors = new Map<string, string>();
  private backgroundCursor = new Map<string, number>();
  constructor(private runner: DeckSimRunner, private now: () => number = () => performance.now(), private samplesPerOption = 100) {}
  /** A cache miss never prepares openings, schedules work, or reads foreground reward results. */
  peekCompletedCore(fingerprint: string): CoreCombatRow[] | null {
    const cached = this.longTerm.get(fingerprint);
    return cached ? structuredClone(cached) : null;
  }
  private prepare(r: V6ProjectionRequest, context: CardResultsContext, target: CardCombatTarget, option: V6ProjectionOption,
    resourceOption = option): V6PreparedProjection | null {
    const key = v6Digest([context.fingerprint, target, option.state, option.preparationKey]);
    if (this.openings.has(key)) return this.openings.get(key)!;
    let prepared: V6PreparedProjection | null = null;
    try { prepared = target.kind === "elite" ? context.prepareElite?.(target, option) ?? null
      : target.kind === "current" && context.prepareCurrent ? context.prepareCurrent(target, option)
      : r.prepare(target as V6ProjectionTarget, option.state, resourceOption); }
    catch (error) { this.openingErrors.set(key, `opening_builder_error:${String(error).slice(0, 240)}`); }
    this.openings.set(key, prepared);
    while (this.openings.size > 2048) {
      const oldest = this.openings.keys().next().value!; this.openings.delete(oldest); this.openingErrors.delete(oldest);
    }
    return prepared;
  }
  private job(r: V6ProjectionRequest, context: CardResultsContext, target: CardCombatTarget, option: V6ProjectionOption,
    prepared: V6PreparedProjection | null): Job | null {
    if (!prepared) return null;
    const key = v6Digest([context.fingerprint, r.seed, r.modelVersion, target, option.state, slimInput(prepared.input)]);
    let stored = this.samples.get(key);
    if (!stored) { stored = { key, prepared, outcomes: [] }; this.samples.set(key, stored); }
    // A bounded FIFO protects the active question and a complete 17-combo target grid.
    while (this.samples.size > 2048) this.samples.delete(this.samples.keys().next().value!);
    return { id: option.id, target, option, prepared, stored };
  }
  private async run(jobs: Job[], r: V6ProjectionRequest, deadline: number, signal?: AbortSignal,
    sampleLimit = this.samplesPerOption): Promise<number> {
    let simulations = 0;
    // Sample-major slices give all options paired information before extending the sample count.
    for (let start = 0; start < sampleLimit && this.now() < deadline && !signal?.aborted;) {
      const end = Math.min(sampleLimit, start + (start === 0 ? 2 : 8));
      const active = jobs.filter(j => Array.from({ length: end - start }, (_, i) => start + i).some(i => !j.stored.outcomes[i]));
      if (!active.length) { start = end; continue; }
      const result = await this.runner.run({ base: active[0]!.prepared.input, decks: active.map(j => j.prepared.input),
        orders: [null], samples: this.samplesPerOption, range: { from: start, to: end }, seed: r.seed,
        deadlineMs: Math.max(0, deadline - this.now()), now: this.now });
      active.forEach((j, deck) => {
        result.outcomes[deck]?.[0]?.forEach((sample, i) => { if (sample && !j.stored.outcomes[i]) { j.stored.outcomes[i] = sample; simulations++; } });
      });
      if (result.timedOut) break;
      start = end;
    }
    return simulations;
  }
  async evaluate(r: V6ProjectionRequest, context: CardResultsContext, budgetMs = r.config.budgets.pick_ms): Promise<V6CardResults> {
    const started = this.now(), deadline = started + budgetMs, options = [r.baseline, ...r.options], current = r.targets.filter(t => t.kind === "current");
    const targets: CardCombatTarget[] = [...current, ...(context.eliteTargets ?? [])], immediate: CardCombatRow[] = [];
    let preparation = 0, simulation = 0, simulations = 0, hits = 0;
    const groups = targets.map(target => {
      const at = this.now();
      const prepared = options.map(option => this.now() < deadline ? this.prepare(r, context, target, option) : null);
      const jobs = options.map((option, i) => this.job(r, context, target, option, prepared[i]!));
      hits += jobs.filter(j => j?.stored.outcomes.filter(Boolean).length).length;
      preparation += this.now() - at;
      return { target, prepared, jobs };
    });
    const simStarted = this.now();
    simulations += await this.run(groups.flatMap(g => g.jobs.filter((j): j is Job => !!j)), r, deadline);
    simulation += this.now() - simStarted;
    for (const { target, prepared, jobs } of groups) {
      const baseline = jobs[0]?.stored.outcomes ?? [];
      options.forEach((option, i) => immediate.push(cardCombatRow(option.id, target, prepared[i]!, jobs[i]?.stored.outcomes ?? [], baseline,
        target.kind === "elite" ? { value: "unknown", labels: ["elite_outcome_calibration_unavailable"] } : r.trust(target as V6ProjectionTarget), this.samplesPerOption, prepared[0]!)));
    }
    for (const row of immediate) {
      const target = targets.find(t => t.id === row.target_id)!, option = options.find(o => o.id === row.option_id)!;
      const error = this.openingErrors.get(v6Digest([context.fingerprint, target, option.state, option.preparationKey]));
      if (error) row.unknown_reasons.push(error);
    }
    const progress = Object.fromEntries(options.map(option => [option.id, coreProgress(r, option)]));
    const cached = this.longTerm.get(context.fingerprint), total = r.directions.reduce((n, d) => n + d.combos.length, 0) * r.targets.filter(t => t.kind !== "current").length;
    return { schema: "v6-card-combat-results-v1", targets: [...targets, ...r.targets.filter(t => t.kind !== "current")], immediate,
      long_term: structuredClone(cached ?? []), progress, telemetry: { elapsed_ms: this.now() - started, preparation_ms: preparation,
        simulation_ms: simulation, cache_hits: hits, simulations, long_term_cache: cached ? "hit" : "miss",
        long_term_computed: cached?.filter(r => r.samples >= 2).length ?? 0, long_term_total: total,
        pending_work: immediate.some(row => row.samples < this.samplesPerOption) },
      labels: ["A_current_deck_plus_option_no_ideal_cards", "B_completed_core_background_cache_only", "no_probability_product", "future_inventory_not_predicted"] };
  }
  async precompute(r: V6ProjectionRequest, context: CardResultsContext, budgetMs: number, signal?: AbortSignal): Promise<void> {
    const deadline = this.now() + budgetMs, rows: CoreCombatRow[] = [];
    const targets = r.targets.filter(t => t.kind !== "current"), cursor = this.backgroundCursor.get(context.fingerprint) ?? 0;
    const ordered = [...targets.slice(cursor), ...targets.slice(0, cursor)];
    // Prepare and sample one target at a time. Preparing the entire core grid can consume
    // a cold slice without any simulation. Rotate the next slice and use only two common
    // samples per target before extending counts, so early targets cannot starve later ones.
    outer: for (let limit = Math.min(2, this.samplesPerOption);; limit = Math.min(this.samplesPerOption, limit + 8)) {
      for (const target of ordered) {
        if (this.now() >= deadline || signal?.aborted) break outer;
        const base = this.job(r, context, target, r.baseline, this.prepare(r, context, target, r.baseline));
        const combos = r.directions.flatMap(direction => direction.combos.map(combo => {
          const completed = completedCore(r.baseline.state, direction, combo, r.act);
          const option = { ...r.baseline, id: `${direction.id}:${combo.id}`, state: completed ?? r.baseline.state };
          // Use the original held-resource option identity with the completed cards.
          const prepared = completed && this.now() < deadline && !signal?.aborted
            ? this.prepare(r, context, target, option, r.baseline) : null;
          return { direction, combo, completed, option, prepared, job: this.job(r, context, target, option, prepared) };
        }));
        await this.run([...(base ? [base] : []), ...combos.flatMap(k => k.job ? [k.job] : [])], r, deadline, signal, limit);
        for (const k of combos) {
          const row = cardCombatRow(k.option.id, target, k.prepared, k.job?.stored.outcomes ?? [], base?.stored.outcomes ?? [],
            r.trust(target), this.samplesPerOption, base?.prepared ?? null);
          if (!k.completed) row.unknown_reasons.push("core_prerequisite_or_required_resource_unavailable");
          rows.push({ ...row, direction_id: k.direction.id, combo_id: k.combo.id,
            added_cards: k.completed?.cards.slice(r.baseline.state.cards.length) ?? [] });
        }
        this.backgroundCursor.set(context.fingerprint, (targets.indexOf(target) + 1) % targets.length);
      }
      if (limit === this.samplesPerOption || !targets.length) break;
    }
    const previous = this.longTerm.get(context.fingerprint) ?? [];
    const merged = new Map(previous.map(row => [`${row.direction_id}:${row.combo_id}:${row.target_id}`, row]));
    rows.forEach(row => {
      const key = `${row.direction_id}:${row.combo_id}:${row.target_id}`, previous = merged.get(key);
      if (!previous || row.samples >= previous.samples) merged.set(key, row);
    });
    this.longTerm.set(context.fingerprint, [...merged.values()]);
    while (this.longTerm.size > 8) {
      const oldest = this.longTerm.keys().next().value!; this.longTerm.delete(oldest); this.backgroundCursor.delete(oldest);
    }
  }
}

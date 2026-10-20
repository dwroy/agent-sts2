import { copyV6Table } from "./v6-table-copy.js";
/** Paired combination projections. All incomplete inputs remain explicitly unknown. */
import type { BuildState } from "../construction/types.js";
import type { V6Config } from "../v6/config.js";
import type { ProjectionEntry } from "../v6/formats.js";
import type { RolloutInput } from "../reflex/rollout.js";
import { slimInput, type FightSampleResult } from "./boss-sim.js";
import type { DeckSimRunner } from "./build-sim-pool.js";
import { summarizeSamples } from "./quantitative-stats.js";
import { continuousBossResult, type ContinuousBossResult } from "./continuous-boss-result.js";
import { resolveV6Completion, v6Digest, v6DirectionRole, type V6CompletionSource, type V6Direction,
  type V6ProjectionOption, type V6CompletionCombination } from "./v6-completion.js";
export interface V6ProjectionTarget {
  id: string; boss: string; act: number; floor: number; kind: "current" | "future" | "chain";
  probability: number | null; secondBoss?: string; secondFloor?: number; labels: string[]; unknown?: string;
}
export interface V6PreparedProjection { input: RolloutInput; maxHp: number; bossHp: number; labels: string[] }
export interface V6ProjectionRequest {
  config: V6Config; phase: "pick" | "act"; character: string; ascension: number; act: number;
  baseline: V6ProjectionOption; options: readonly V6ProjectionOption[]; directions: readonly V6Direction[];
  weights: Readonly<Record<string, number>>; targets: readonly V6ProjectionTarget[];
  completionSources: readonly V6CompletionSource[]; idealOverrides?: Readonly<Record<string, readonly string[]>>;
  appearedCards?: readonly string[];
  /** Persist the latest act-start ranking for an engine recreated by a caller. */
  rankings?: Readonly<Record<string, readonly string[]>>;
  /** Foreground picks simulate the current Boss; later fights reuse idle/act cache only. */
  currentBossFirst?: boolean;
  seed: number; modelVersion: string;
  /** Includes held resources, route, frozen history/trust, current run and act identity. */
  contextDigest: string;
  prepare: (target: V6ProjectionTarget, state: BuildState, option?: V6ProjectionOption) => V6PreparedProjection | null;
  /** Read already prepared openings without constructing another optional target. */
  cachedPreparation?: V6ProjectionRequest["prepare"];
  trust: (target: V6ProjectionTarget) => { value: ProjectionEntry["trust"]; labels: string[]; details?: ProjectionEntry["trust_details"] };
}
type Estimate = NonNullable<ProjectionEntry["win"]>;
type Delta = NonNullable<ProjectionEntry["paired_delta"]>;
type Indexed = (FightSampleResult | undefined)[];
type Raw = { first: (number | null)[]; joint: (number | null)[]; ids: string[] };
type ExpectedRaw = Raw;
export interface V6CombinationProjection {
  combination_id: string | null; entry: ProjectionEntry;
  completion_source: V6CompletionCombination["source"] | "unknown";
  general_source: "empirical" | "not_computed"; scope: "combination_expectation";
  completed_win: Estimate | null; general_win: Estimate | null;
  completed_joint_win: Estimate | null; general_joint_win: Estimate | null;
  formation_se: number | null; formation_n: number; summary: V6CompletionCombination["summary"];
  role: "in_combo" | "off_combo" | "conflict" | "unknown"; role_labels: string[];
  completion_sample_ids: string[]; model_labels: string[]; unknown_reasons: string[];
  continuous: ContinuousBossResult | null;
}
export interface V6ActEvaluation {
  direction_id: string; combination_id: string | null; target_id: string;
  win: ProjectionEntry["win"]; joint_win: ProjectionEntry["joint_win"];
  availability: number | null; trust: ProjectionEntry["trust"]; win_tier: ProjectionEntry["win_tier"];
  versus: { direction_id: string; combination_id: string; paired_delta: Delta | null; joint_paired_delta: Delta | null }[];
}
export interface V6WeightedProjection {
  option_id: string; target_id: string; win: Estimate | null; joint_win: Estimate | null;
  paired_delta: Delta | null; joint_paired_delta: Delta | null; known_weight: number;
  known_weighted_value: number; labels: string[];
}
export interface V6PickDirectionComparison {
  option_id: string; direction_id: string; reference_direction_id: string | null;
  targets: { target_id: string; combination_id: string | null; reference_combination_id: string | null;
    joint_paired_delta: Delta | null }[];
  /** Candidate-frequency mixture of same-seed direction-minus-reference differences. */
  joint_paired_delta: Delta | null; known_mass: number; labels: string[];
}
export interface V6ProjectionTable {
  schema: "v6-projection-table-v1"; enabled: boolean; phase: "pick" | "act";
  combinations: V6CombinationProjection[]; act_evaluations: V6ActEvaluation[];
  /** One maximum-combination entry per option/direction/target, suitable for W4. */
  entries: ProjectionEntry[]; weighted: V6WeightedProjection[]; rankings: Record<string, string[]>;
  /** Candidate bosses are alternatives, not sequential independent events. */
  target_mixtures: { option_id: string; kind: "current_gate" | "clearance"; value: Estimate | null; paired_delta: Delta | null;
    known_mass: number; known_value: number; labels: string[] }[];
  pick_direction_comparisons: V6PickDirectionComparison[];
  targets: readonly V6ProjectionTarget[];
  telemetry: { elapsed_ms: number; cache_hits: number; cache_misses: number; simulations: number; timed_out: number;
    degradation: string[]; unknown_entries: number; total_entries: number; unknown_fraction: number; act_cache_hit: boolean;
    /** More bounded slices can finish work; structural unknowns alone do not keep idle work queued. */
    pending_work?: boolean;
    timings_ms?: { formation_lookup: number; preparation: number; completed_single: number; completed_relay: number;
      aggregation_pairing: number; supply_mc: 0; incomplete_case: 0 } };
}
function estimate(values: readonly number[]): Estimate | null {
  const s = summarizeSamples(values); return s.mean === null || s.meanSe === null ? null : { value: s.mean, se: s.meanSe, n: s.n };
}
function fullEstimate(values: readonly (number | null)[]): Estimate | null {
  return values.some(x => x === null) ? null : estimate(values as number[]);
}
/** Lookup probabilities are fixed inputs; reported SE is conditional combat-seed error only. */
function product(k: Raw, p: number | null): ExpectedRaw {
  const field = (f: "first" | "joint") => k[f].map(v => p === null || v === null ? null : p * v);
  return { ids: k.ids, first: field("first"), joint: field("joint") };
}
function uncertainty(raw: ExpectedRaw, f: "first" | "joint"): Estimate | null { return fullEstimate(raw[f]); }
function paired(a: ExpectedRaw, b: ExpectedRaw, f: "first" | "joint"): Delta | null {
  if (a.ids.length !== b.ids.length || a.ids.some((id, i) => id !== b.ids[i]) || a[f].some((v, i) => v === null || b[f][i] === null)) return null;
  const e = estimate(a[f].map((v, i) => v! - b[f][i]!));
  return e ? { mean: e.value, se: e.se, n: e.n } : null;
}
/** Keep common combat-seed covariance across candidate targets; lookup/model error is separate. */
function pairedMixture(rows: { weight: number; a: ExpectedRaw; b: ExpectedRaw }[]): Delta | null {
  if (!rows.length) return null;
  const ids = rows[0]!.a.ids;
  if (rows.some(({ a, b }) => [a, b].some(v => v.ids.length !== ids.length
    || v.ids.some((id, i) => id !== ids[i]) || v.joint.some(x => x === null)))) return null;
  const e = estimate(ids.map((_, i) => rows.reduce((sum, r) => sum + r.weight * (r.a.joint[i]! - r.b.joint[i]!), 0)));
  return e ? { mean: e.value, se: e.se, n: e.n } : null;
}
export function v6WinTier(value: number | null, config: V6Config): ProjectionEntry["win_tier"] {
  const t = config.win; return value === null ? "unknown" : value >= t.certain_win ? "certain_win" : value >= t.favored ? "favored"
    : value > t.even ? "even" : value > t.unfavored ? "unfavored" : "certain_loss";
}
export function v6DeltaTier(value: Delta | null, config: V6Config): ProjectionEntry["delta_tier"] {
  if (!value) return "unknown"; const a = Math.abs(value.mean), t = config.delta;
  if (a > t.much_se * value.se && a >= t.much_min) return value.mean > 0 ? "much_better" : "much_worse";
  if (a > t.better_se * value.se) return value.mean > 0 ? "better" : "worse"; return "same";
}
function rawValues(outcomes: Indexed, chain: boolean, ids: string[]): Raw {
  const result = chain ? continuousBossResult(outcomes.filter((o): o is FightSampleResult => !!o), ids.length, true, true)! : null;
  return { ids, first: ids.map((_, i) => { const o = outcomes[i]; return chain ? result?.first.value == null ? null : o?.sequence ? Number(o.sequence.firstWon) : null
    : o && !o.capped && !o.timeUp && (o.won || o.died) ? Number(o.won) : null; }),
    joint: ids.map((_, i) => chain && result?.joint.value != null && outcomes[i]?.sequence ? Number(outcomes[i]!.sequence!.firstWon && outcomes[i]!.sequence!.secondWon === true) : null) };
}
function emptyEntry(option: string, direction: string, target: string): ProjectionEntry {
  return { schema: "projection-entry-v1", option_id: option, direction_id: direction, target_id: target,
    win: null, paired_delta: null, losing_boss_hp_fraction: null, winning_player_hp_fraction: null, turns: null,
    joint_win: null, joint_paired_delta: null, availability: { take: null, skip: null }, weighted_current_boss_delta: null,
    weighted_joint_delta: null, deck_count_change: null, core_first_cast_turn: null, win_tier: "unknown", delta_tier: "unknown",
    direction_role: "unknown", trust: "unknown", reflex_ids: [] };
}
function period(keys: readonly string[]): number { for (let p = 1; p <= keys.length; p++) if (keys.every((key, i) => key === keys[i % p])) return p; return keys.length; }
export class V6ProjectionEngine {
  private readonly samples = new Map<string, Indexed>(); private readonly acts = new Map<string, V6ProjectionTable>();
  private readonly rankings = new Map<string, Record<string, string[]>>();
  constructor(private readonly runner: DeckSimRunner, private readonly now: () => number = () => performance.now(), private readonly capacity = 256) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) throw new Error("invalid V6 cache capacity");
  }
  clear(): void { this.samples.clear(); this.acts.clear(); this.rankings.clear(); }
  private remember<T>(map: Map<string, T>, key: string, value: T): void {
    map.delete(key); map.set(key, map === this.acts ? copyV6Table(value as V6ProjectionTable) as T : structuredClone(value)); while (map.size > this.capacity) map.delete(map.keys().next().value!);
  }
  async precompute(r: V6ProjectionRequest): Promise<V6ProjectionTable> { return this.evaluate({ ...r, options: [] }); }
  async evaluate(r: V6ProjectionRequest): Promise<V6ProjectionTable> {
    const started = this.now();
    const table: V6ProjectionTable = { schema: "v6-projection-table-v1", enabled: r.config.mode !== "off", phase: r.phase,
      combinations: [], entries: [], act_evaluations: [], weighted: [], rankings: {}, target_mixtures: [], pick_direction_comparisons: [], targets: r.targets,
      telemetry: { elapsed_ms: 0, cache_hits: 0, cache_misses: 0, simulations: 0, timed_out: 0, degradation: [], unknown_entries: 0,
        total_entries: 0, unknown_fraction: 0, act_cache_hit: false } };
    if (!table.enabled) return table;
    const timings = { formation_lookup: 0, preparation: 0, completed_single: 0, completed_relay: 0,
      aggregation_pairing: 0, supply_mc: 0 as const, incomplete_case: 0 as const };
    table.telemetry.timings_ms = timings;
    if (!r.contextDigest || !r.modelVersion || !Number.isSafeInteger(r.seed)) throw new Error("V6 requires frozen context/model signatures and integer seed");
    const options = [r.baseline, ...r.options];
    for (const ids of [options.map(o => o.id), r.directions.map(d => d.id), r.targets.map(t => t.id), r.completionSources.map(s => s.kind)])
      if (new Set(ids).size !== ids.length) throw new Error("duplicate V6 option/direction/target/provider");
    const all = r.directions.filter(d => d.character === r.character && d.ascensions.includes(r.ascension));
    const directions = all.filter(d => r.phase === "act" || (r.weights[d.id] ?? 0) >= r.config.direction_min_weight);
    const weightsValid = all.length > 0 && Object.keys(r.weights).length === all.length && all.every(d => Number.isFinite(r.weights[d.id]) && r.weights[d.id]! >= 0)
      && Math.abs(all.reduce((sum, d) => sum + r.weights[d.id]!, 0) - 1) <= .01;
    const n = r.phase === "act" ? r.config.samples_act : r.config.samples_pick;
    const actKey = r.phase === "act" ? v6Digest({ ...r, directions: all.map(d => [d.id, d.signature]), prepare: undefined, trust: undefined,
      completionSources: r.completionSources.map(s => [s.kind, s.signature]) }) : "";
    if (r.phase === "act" && this.acts.has(actKey)) { const hit = copyV6Table(this.acts.get(actKey)!); hit.telemetry = { ...hit.telemetry,
      cache_hits: 0, cache_misses: 0, simulations: 0, timed_out: 0, degradation: [], timings_ms: timings,
      act_cache_hit: true, elapsed_ms: this.now() - started }; return hit; }
    const available = r.phase === "act" ? r.config.budgets.act_ms : r.config.budgets.pick_ms;
    // Leave time for aggregation/serialization after the last synchronous preparation or worker result.
    const deadline = started + Math.max(0, available - Math.min(500, available / 8));
    const raws = new Map<V6CombinationProjection, ExpectedRaw>();
    const rankingKey = v6Digest([r.character, r.ascension, r.act, r.seed, r.modelVersion, all.map(d => [d.id, d.signature])]);
    const rankings = r.rankings ?? this.rankings.get(rankingKey);
    const targets = [...r.targets].sort((a, b) => Number(!!a.unknown) - Number(!!b.unknown)
      || ({ current: 0, future: 1, chain: 2 }[a.kind] - { current: 0, future: 1, chain: 2 }[b.kind])
      || (b.probability ?? -1) - (a.probability ?? -1) || a.id.localeCompare(b.id));
    // Complete one ranked combination per direction/target before a second one. Act start
    // fully evaluates only its leading two; idle/pick retain the original four-combo cap.
    const jobs = directions.flatMap(direction => targets.flatMap((target, ti) => {
      let rank = rankings?.[direction.id];
      if (!rank?.length) for (const source of r.completionSources) {
        const at = performance.now();
        try { const suggested = source.rank?.({ direction, options, target, samples: 1, seed: r.seed, deadline,
          phase: r.phase, idealOverrides: r.idealOverrides, appearedCards: r.appearedCards });
          if (suggested?.length) { rank = [...suggested]; break; }
        } catch { /* The normal provider path records a bounded failure for this target. */ }
        finally { timings.formation_lookup += performance.now() - at; }
      }
      rank ??= [];
      const ids = direction.combos.map(c => c.id);
      if (r.idealOverrides?.[direction.id]?.length) ids.unshift(`${direction.id}:brain`);
      ids.sort((a, b) => { const ai = rank.indexOf(a), bi = rank.indexOf(b);
        return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi); });
      return ids.slice(0, r.phase === "act" ? 2 : 4).map((combinationId, pass) => ({ direction, target, combinationId, pass, ti }));
    })).sort((a, b) => a.ti - b.ti || a.pass - b.pass || (r.weights[b.direction.id] ?? 0) - (r.weights[a.direction.id] ?? 0));
    let dropped: string | null = null, stage = 0;
    const degrade = (remaining: typeof jobs) => {
      table.telemetry.timed_out++;
      // Exhausting a small fair-share slice is not exhaustion of the whole question.
      // Preserve later jobs until the shared deadline actually requires degradation.
      const fraction = (this.now() - started) / Math.max(1, deadline - started);
      const count = fraction >= 1 ? 3 : fraction >= .85 ? 2 : fraction >= .65 ? 1 : 0;
      while (stage < count) { if (stage === 0) { dropped = [...remaining].sort((a, b) => (r.weights[a.direction.id] ?? 0) - (r.weights[b.direction.id] ?? 0))[0]?.direction.id ?? null;
          table.telemetry.degradation.push("drop_lowest_direction"); }
        else table.telemetry.degradation.push(stage === 1 ? "current_and_chain_targets_only" : "remaining_unknown"); stage++; }
    };
    const preparedCache = new Map<string, V6PreparedProjection | null>();
    // Callers may mutate a prepared object between requests; never retain its digest across requests.
    const preparedDigests = new Map<V6PreparedProjection, string>();
    const resolved = new Set<string>();
    for (const [ji, { direction: d, target: t, combinationId }] of jobs.entries()) {
      // Lookup is deterministic and cheap. A spent combat allowance must never erase known P.
      let reason: string | null = null;
      const budgetReason = stage >= 3 ? "budget_remaining_unknown" : d.id === dropped ? "budget_lowest_direction_dropped"
        : stage >= 2 && t.kind === "future" ? "budget_future_target_dropped" : this.now() >= deadline ? "deadline_exhausted" : null;
      let completion = null;
      const lookupAt = performance.now();
      try { completion = resolveV6Completion({ direction: d, options, target: t, samples: n, seed: r.seed,
        phase: r.phase, deadline, idealOverrides: r.idealOverrides, appearedCards: r.appearedCards, ranking: rankings?.[d.id],
        combinationIds: [combinationId] }, r.completionSources); }
      catch (e) { reason = `completion_provider_failed:${String(e).slice(0, 160)}`; }
      timings.formation_lookup += performance.now() - lookupAt;
      if (!completion?.combinations.length) reason ??= "no_combination_provider_result";
      if (completion && new Set(completion.combinations.map(c => c.id)).size !== completion.combinations.length) reason = "duplicate_combination_id";
      for (const c of (reason ? [null] : completion!.combinations)) {
        const resolvedKey = JSON.stringify([d.id, t.id, c?.id ?? combinationId]);
        if (resolved.has(resolvedKey)) continue;
        resolved.add(resolvedKey);
        const optional = r.currentBossFirst && t.kind !== "current";
        let error = reason ?? t.unknown ?? budgetReason;
        const ids = c?.samples.map(s => s.id) ?? Array.from({ length: n }, (_, i) => `seed:${i}`);
        if (c && (ids.length !== n || new Set(ids).size !== n)) error = "invalid_paired_sample_schedule";
        if (c && options.some(o => { const p = c.availability[o.id]; return p != null && (!Number.isFinite(p) || p < 0 || p > 1); })) error = "invalid_formation_probability";
        const prepared: (V6PreparedProjection | null)[][] = [], outcomes: Indexed[] = [], keys: string[][] = [], rowErrors: string[][] = [];
        const inputKeys = new Map<V6PreparedProjection, string>();
        for (const o of options) {
          const p = c?.availability[o.id], skip = p == null || p < .05;
          const ps: (V6PreparedProjection | null)[] = [], errors: string[] = [];
          for (let i = 0; i < n; i++) {
            const state = c?.samples[i]?.states[o.id];
            if (error || skip || !state) { ps.push(null); continue; }
            const key = v6Digest([t, state, o.preparationKey ?? null]);
            try { if (!preparedCache.has(key)) {
                if (this.now() >= deadline) { ps.push(null); continue; }
                const at = performance.now();
                try { preparedCache.set(key, optional ? r.cachedPreparation?.(t, state, o) ?? null : r.prepare(t, structuredClone(state), o)); }
                finally { timings.preparation += performance.now() - at; }
              }
              const input = preparedCache.get(key) ?? null;
              if (input && (!(input.maxHp > 0) || !(input.bossHp > 0) || !Number.isFinite(input.maxHp) || !Number.isFinite(input.bossHp)
                || t.kind === "chain" && (!t.secondBoss || input.input.continuation?.variants.length !== 1 || input.input.continuation.variants[0]?.boss !== t.secondBoss))) ps.push(null);
              else ps.push(input);
            } catch { ps.push(null); errors.push("target_preparation_failed"); }
          }
          if (skip) errors.push("formation_below_5_percent_or_unknown_not_simulated");
          else if (!skip && ps.some(x => !x)) errors.push(optional ? "optional_target_not_precomputed" : "unknown_opening_entry_hp_or_empirical_sample");
          prepared.push(ps); outcomes.push(Array.from({ length: n })); rowErrors.push(errors);
          // A fight is a pure function of its exact prepared input, model and absolute seed index.
          // Neither a new question nor 100 -> 20 samples changes an already computed fight.
          keys.push(ps.map(p => {
            if (!p) return "";
            let key = inputKeys.get(p);
            if (!key) {
              let input = preparedDigests.get(p);
              if (!input) { input = v6Digest({ input: slimInput(p.input), maxHp: p.maxHp, bossHp: p.bossHp }); preparedDigests.set(p, input); }
              key = v6Digest([input, r.character, r.ascension, r.seed, r.modelVersion]); inputKeys.set(p, key);
            }
            return key;
          }));
        }
        const decks: RolloutInput[] = [], stripes: { at: number; of: number }[] = [], positions: { key: string; deck: number }[] = [];
        const pending = new Map<string, { input: RolloutInput; indices: Set<number> }>();
        for (const [i, inputs] of prepared.entries()) {
          let missing = false;
          for (const [index, input] of inputs.entries()) {
            if (!input) continue;
            const key = keys[i]![index]!, hit = this.samples.get(key)?.[index];
            if (hit) { outcomes[i]![index] = hit; continue; }
            missing = true;
            let item = pending.get(key); if (!item) { item = { input: input.input, indices: new Set() }; pending.set(key, item); }
            item.indices.add(index);
          }
          if (inputs.some(Boolean)) table.telemetry[missing ? "cache_misses" : "cache_hits"]++;
        }
        for (const [key, item] of pending) {
          const mask = Array.from({ length: n }, (_, i) => String(item.indices.has(i))), p = period(mask);
          for (let at = 0; at < p; at++) if (item.indices.has(at)) {
            positions.push({ key, deck: decks.length }); decks.push(item.input); stripes.push({ at, of: p });
          }
        }
        // Eviction limits future reuse, never the paired results of this active batch.
        const fresh = new Map<string, Indexed>();
        let timeout = false;
        const combatAt = performance.now();
        if (decks.length && this.now() < deadline && !(r.currentBossFirst && t.kind !== "current")) try {
          const result = await this.runner.run({ base: decks[0]!, decks, stripes, orders: [null], samples: n, seed: r.seed,
            // Finish eligible paired samples before visiting another job. Dividing by all catalog
            // rows, including P<5% rows, can time out every fight without completing any estimate.
            deadlineMs: Math.max(1, deadline - this.now()), diagnostics: true });
          timeout = result.timedOut;
          for (const { key, deck } of positions) {
            const retained = fresh.get(key) ?? this.samples.get(key)?.slice() ?? [];
            for (let i = 0; i < n; i++) { const o = result.outcomes[deck]?.[0]?.[i];
              if (o) { table.telemetry.simulations++;
                if (!o.capped && !o.timeUp && (o.won || o.died)
                  && (t.kind !== "chain" || o.sequence && (o.sequence.firstWon === false || typeof o.sequence.secondWon === "boolean"))) retained[i] = o;
              }
            }
            // Completed absolute samples survive a bounded idle slice; missing samples stay missing.
            if (retained.some(Boolean)) { fresh.set(key, retained); this.remember(this.samples, key, retained); }
          }
        } catch { error = "simulation_failed"; }
        else if (decks.length && r.currentBossFirst && t.kind !== "current") error ??= "optional_target_not_precomputed";
        else if (decks.length) timeout = true;
        if (decks.length) timings[t.kind === "chain" ? "completed_relay" : "completed_single"] += performance.now() - combatAt;
        for (const [group, groupKeys] of keys.entries()) for (const [i, key] of groupKeys.entries())
          if (key) outcomes[group]![i] ??= fresh.get(key)?.[i] ?? this.samples.get(key)?.[i];
        if (timeout || this.now() >= deadline) degrade(jobs.slice(ji + 1));
        const expectedRows = options.map((o, i) => product(rawValues(outcomes[i]!, t.kind === "chain", ids), c?.availability[o.id] ?? null));
        for (const [oi, o] of options.entries()) {
          const entry = emptyEntry(o.id, d.id, t.id), kr = rawValues(outcomes[oi]!, t.kind === "chain", ids), er = expectedRows[oi]!;
          const p = c?.availability[o.id] ?? null, trust = r.trust(t);
          const inCombo = !!o.card && !!c?.requirements.some(req => req.any.some(x => x.kind === "card" && x.id === o.card!.id));
          const role = !c ? "unknown" : inCombo ? "in_combo" : d.conflict.some(x => x.id === o.card?.id) ? "conflict" : "off_combo";
          const row: V6CombinationProjection = { combination_id: c?.id ?? null, entry, completion_source: c?.source ?? "unknown", general_source: "not_computed", scope: "combination_expectation",
            completed_win: fullEstimate(kr.first), general_win: null, completed_joint_win: t.kind === "chain" ? fullEstimate(kr.joint) : null,
            general_joint_win: null, formation_se: null,
            formation_n: 0, summary: c?.summary ?? null, role, role_labels: o.card ? c?.roles[o.card.id] ?? [] : [], completion_sample_ids: c ? ids : [],
            model_labels: [...new Set([...d.limits, ...completion?.labels ?? [], ...c?.labels ?? [], ...t.labels, ...trust.labels,
              ...prepared[oi]!.flatMap(x => x?.labels ?? []), "raw_simulation_not_calibrated", "partial_model", "future_relics_and_potions_not_predicted", "formation_times_completed", "incomplete_win_not_computed", "se_conditional_on_lookup_probability_excludes_table_and_model_error"])],
            unknown_reasons: [...(error ? [error] : []), ...rowErrors[oi]!,
              ...(c?.unknownReasons?.[o.id] ?? [])], continuous: t.kind === "chain" ? continuousBossResult(outcomes[oi]!.filter((x): x is FightSampleResult => !!x), n, true, true)! : null };
          entry.trust = trust.value; if (trust.details) entry.trust_details = trust.details; entry.direction_role = v6DirectionRole(d, all, o.card); entry.availability = { take: p, skip: c?.availability[r.baseline.id] ?? null };
          // Below threshold reports probability only, including exactly zero; never substitutes a simulated zero win rate.
          entry.win = p !== null && p >= .05 ? uncertainty(er, "first") : null;
          entry.joint_win = p !== null && p >= .05 && t.kind === "chain" ? uncertainty(er, "joint") : null;
          entry.paired_delta = entry.win ? paired(er, expectedRows[0]!, "first") : null;
          entry.joint_paired_delta = entry.joint_win ? paired(er, expectedRows[0]!, "joint") : null;
          if (c) {
            entry.combo_id = c.id; entry.combo_source = c.source === "build_core" ? "build-core-v1" : c.source === "brain" ? "brain" : "construction-transition";
            entry.formula = "formation_times_completed";
            entry.win_complete = t.kind === "chain" ? row.completed_joint_win : row.completed_win;
            entry.win_incomplete = null; entry.incomplete_source = "unknown";
            entry.expected_win = (t.kind === "chain" ? entry.joint_win : entry.win)?.value ?? null;
          }
          if (p !== null && p < .05) {
            entry.expected_win_bound = { lower: 0, upper: p, reason: p === 0 ? "formation_impossible" : "low_probability_not_simulated" };
            row.model_labels.push(p === 0 ? "formation_impossible_known_zero" : "low_probability_not_simulated_expected_at_most_P");
            // An upper bound is useful known information, never an invented conditional W or point estimate.
            row.unknown_reasons = row.unknown_reasons.filter(x => !x.startsWith("budget_") && x !== "deadline_exhausted"
              && x !== "formation_below_5_percent_or_unknown_not_simulated");
          }
          if (p === null) row.unknown_reasons.push("formation_unknown");
          if (!entry.win && !entry.expected_win_bound) row.unknown_reasons.push("expectation_unknown"); if (t.kind === "chain" && !entry.joint_win) row.unknown_reasons.push("continuous_joint_unknown");
          if (timeout) row.unknown_reasons.push("simulation_budget_exceeded");
          const ks = c?.samples.map(s => s.states[o.id]?.cards.length); if (ks?.length && ks.every(x => x !== undefined && x === ks[0])) entry.deck_count_change = ks[0]! - r.baseline.state.cards.length;
          const complete = outcomes[oi]!.filter((x): x is FightSampleResult => !!x);
          if (row.completed_win) {
            entry.turns = estimate(complete.map(x => t.kind === "chain" ? x.sequence!.firstTurns : x.turns));
            if (t.kind !== "chain") {
              entry.losing_boss_hp_fraction = estimate(complete.flatMap((x, i) => !x.won ? [x.enemyHpLeft / prepared[oi]![i]!.bossHp] : []).filter(x => x >= 0 && x <= 1));
              entry.winning_player_hp_fraction = estimate(complete.flatMap((x, i) => x.won && x.resources ? [x.resources.hp / prepared[oi]![i]!.maxHp] : []).filter(x => x >= 0 && x <= 1));
            }
            const core = new Set(c?.requirements.flatMap(req => req.any.filter(x => x.kind === "card").map(x => x.id)) ?? []);
            entry.core_first_cast_turn = estimate(complete.flatMap(x => { if (!x.coreWindow?.complete) return [];
              const times = Object.entries(x.coreWindow.byCard).flatMap(([id, card]) => core.has(id) && card.firstPlay !== null ? [card.firstPlay] : []);
              return times.length ? [times.reduce((a, b) => a + b, 0) / times.length] : []; }));
            row.model_labels.push("continuous_metrics_conditional_on_completed_combo", "core_first_cast_observed_only_nonplays_censored");
          }
          entry.win_tier = v6WinTier(entry.win?.value ?? null, r.config); entry.delta_tier = v6DeltaTier(entry.paired_delta, r.config);
          table.combinations.push(row); raws.set(row, er);
        }
      }
    }
    const aggregateAt = performance.now();
    this.aggregate(r, table, raws, all, options, weightsValid);
    timings.aggregation_pairing = performance.now() - aggregateAt;
    if (r.phase === "act") this.remember(this.rankings, rankingKey, table.rankings);
    table.telemetry.elapsed_ms = this.now() - started; table.telemetry.total_entries = table.combinations.length;
    table.telemetry.unknown_entries = table.combinations.filter(x => !x.entry.expected_win_bound && (!x.entry.win || r.targets.find(t => t.id === x.entry.target_id)?.kind === "chain" && !x.entry.joint_win)).length;
    table.telemetry.unknown_fraction = table.combinations.length ? table.telemetry.unknown_entries / table.combinations.length : 1;
    table.telemetry.pending_work = table.telemetry.timed_out > 0 || table.combinations.some(row => row.unknown_reasons.some(reason =>
      reason === "supply_budget_exhausted" || reason === "unknown_opening_entry_hp_or_empirical_sample" && this.now() >= deadline));
    if (r.phase === "act" && !table.telemetry.timed_out && table.combinations.length && !table.telemetry.unknown_entries) this.remember(this.acts, actKey, table);
    return table;
  }
  private aggregate(r: V6ProjectionRequest, table: V6ProjectionTable, raw: Map<V6CombinationProjection, ExpectedRaw>, all: V6Direction[], options: readonly V6ProjectionOption[], weightsValid: boolean): void {
    const best = new Map<string, V6CombinationProjection>();
    const key = (o: string, d: string, t: string) => JSON.stringify([o, d, t]);
    for (const o of options) for (const d of all) for (const t of r.targets) {
      const rows = table.combinations.filter(x => x.entry.option_id === o.id && x.entry.direction_id === d.id && x.entry.target_id === t.id);
      const field = t.kind === "chain" ? "joint_win" : "win";
      const leader = [...rows].filter(x => x.entry[field]).sort((a, b) => b.entry[field]!.value - a.entry[field]!.value || String(a.combination_id).localeCompare(String(b.combination_id)))[0];
      const entry = leader ? structuredClone(leader.entry) : emptyEntry(o.id, d.id, t.id);
      // Pending competitors must be explicit, but must not erase a completed target.
      // This is the maximum of the computed subset, not a claim about its unseen competitors.
      const evaluated = new Set(rows.filter(x => x.combination_id && (x.entry[field]
        || x.entry.availability.take !== null && x.entry.availability.take < .05)).map(x => x.combination_id)).size;
      const catalog = Math.max(1, d.combos.length + Number(!!r.idealOverrides?.[d.id]?.length),
        new Set(rows.map(x => x.combination_id).filter(Boolean)).size);
      const pending = catalog - evaluated;
      entry.combination_coverage = { selection: !leader ? "unknown" : pending ? "computed_subset_maximum" : "catalog_maximum",
        selected_combination_id: leader?.combination_id ?? null, evaluated_combinations: evaluated,
        catalog_combinations: catalog, pending_combinations: pending };
      if (leader) best.set(key(o.id, d.id, t.id), leader);
      table.entries.push(entry);
    }
    for (const e of table.entries) {
      const a = best.get(key(e.option_id, e.direction_id, e.target_id)), b = best.get(key(r.baseline.id, e.direction_id, e.target_id));
      e.paired_delta = a && b ? paired(raw.get(a)!, raw.get(b)!, "first") : null;
      e.joint_paired_delta = a && b ? paired(raw.get(a)!, raw.get(b)!, "joint") : null;
      e.delta_tier = v6DeltaTier(e.paired_delta, r.config);
    }
    for (const o of options) for (const t of r.targets) {
      const selected = all.map(d => ({ weight: r.weights[d.id] ?? 0, row: best.get(key(o.id, d.id, t.id)), baseline: best.get(key(r.baseline.id, d.id, t.id)) }));
      const known = selected.filter(x => x.row && x.weight > 0), knownWeight = known.reduce((sum, x) => sum + x.weight, 0);
      const weightedRaw = (baseline: boolean): ExpectedRaw | null => {
        if (!weightsValid || selected.some(x => x.weight > 0 && !(baseline ? x.baseline : x.row))) return null;
        const used = selected.filter(x => x.weight > 0).map(x => ({ w: x.weight, v: raw.get((baseline ? x.baseline : x.row)!)! }));
        if (!used.length) return null; const ids = used[0]!.v.ids;
        if (used.some(x => x.v.ids.some((id, i) => id !== ids[i]))) return null;
        const f = (field: "first" | "joint") => ids.map((_, i) => used.some(x => x.v[field][i] === null) ? null : used.reduce((sum, x) => sum + x.w * x.v[field][i]!, 0));
        return { ids, first: f("first"), joint: f("joint") };
      };
      const a = weightedRaw(false), b = weightedRaw(true);
      const value = (field: "first" | "joint"): Estimate | null => a && fullEstimate(a[field]);
      const difference = (field: "first" | "joint"): Delta | null => a && b ? paired(a, b, field) : null;
      const row: V6WeightedProjection = { option_id: o.id, target_id: t.id, win: value("first"), joint_win: t.kind === "chain" ? value("joint") : null,
        paired_delta: difference("first"), joint_paired_delta: t.kind === "chain" ? difference("joint") : null, known_weight: knownWeight,
        known_weighted_value: known.reduce((sum, x) => sum + x.weight * x.row!.entry[t.kind === "chain" ? "joint_win" : "win"]!.value, 0),
        labels: ["max_combination_selection_descriptive_not_unbiased",
          ...(table.entries.some(e => e.option_id === o.id && e.target_id === t.id && e.combination_coverage?.selection === "computed_subset_maximum")
            ? ["computed_subset_maximum_pending_competitors"] : []),
          ...(!weightsValid ? ["invalid_or_incomplete_brain_weights"] : []), ...(knownWeight < .99 ? ["missing_direction_weight_not_renormalized"] : [])] };
      table.weighted.push(row);
      for (const e of table.entries.filter(e => e.option_id === o.id && e.target_id === t.id)) {
        if (t.kind === "current") e.weighted_current_boss_delta = row.paired_delta; if (t.kind === "chain") e.weighted_joint_delta = row.joint_paired_delta;
      }
    }
    for (const o of options) for (const kind of ["current_gate", "clearance"] as const) {
      const targets = r.targets.filter(t => t.kind === (kind === "clearance" ? "chain" : "current"));
      const rows = targets.map(t => ({ p: t.probability, row: table.weighted.find(x => x.option_id === o.id && x.target_id === t.id) }));
      const total = rows.reduce((sum, x) => sum + (x.p ?? 0), 0), probabilities = rows.length > 0 && rows.every(x => x.p !== null && x.p >= 0 && x.p <= 1) && Math.abs(total - 1) < 1e-9;
      const field = kind === "clearance" ? "joint_win" : "win", delta = kind === "clearance" ? "joint_paired_delta" : "paired_delta";
      const known = rows.filter(x => x.p !== null && x.p > 0 && x.row?.[field]);
      const complete = probabilities && rows.every(x => x.p === 0 || x.row?.[field]);
      const e = complete ? { value: known.reduce((sum, x) => sum + x.p! * x.row![field]!.value, 0),
        se: known.reduce((sum, x) => sum + x.p! * x.row![field]!.se, 0), n: Math.min(...known.map(x => x.row![field]!.n)) } : null;
      const paired = e && rows.every(x => x.p === 0 || x.row?.[delta]) ? {
        mean: known.reduce((sum, x) => sum + x.p! * x.row![delta]!.mean, 0),
        se: known.reduce((sum, x) => sum + x.p! * x.row![delta]!.se, 0), n: Math.min(...known.map(x => x.row![delta]!.n)),
      } : null;
      table.target_mixtures.push({ option_id: o.id, kind, value: e, paired_delta: paired,
        known_mass: known.reduce((sum, x) => sum + x.p!, 0), known_value: known.reduce((sum, x) => sum + x.p! * x.row![field]!.value, 0),
        labels: ["observed_candidate_frequency_mixture_not_product", "se_upper_bound_all_cross_target_correlations", "encounter_frequency_estimation_error_not_included",
          ...(!complete ? ["missing_target_mass_not_renormalized"] : [])] });
    }
    if (r.phase === "pick") {
      const reference = weightsValid ? [...all].sort((a, b) => r.weights[b.id]! - r.weights[a.id]! || a.id.localeCompare(b.id))[0] : undefined;
      const targets = r.targets.filter(t => t.kind === "chain");
      const probabilities = targets.length > 0 && targets.every(t => t.probability !== null && t.probability >= 0 && t.probability <= 1)
        && Math.abs(targets.reduce((sum, t) => sum + t.probability!, 0) - 1) < 1e-9;
      for (const o of options) for (const d of all) {
        const selected = targets.map(t => ({ target: t, a: best.get(key(o.id, d.id, t.id)),
          b: reference ? best.get(key(o.id, reference.id, t.id)) : undefined }));
        const deltas = selected.map(({ target, a, b }) => ({ target_id: target.id, combination_id: a?.combination_id ?? null,
          reference_combination_id: b?.combination_id ?? null, joint_paired_delta: a && b ? paired(raw.get(a)!, raw.get(b)!, "joint") : null }));
        const known = selected.filter((x, i) => x.target.probability !== null && x.target.probability > 0 && deltas[i]!.joint_paired_delta);
        const complete = probabilities && selected.every((x, i) => x.target.probability === 0 || deltas[i]!.joint_paired_delta);
        table.pick_direction_comparisons.push({ option_id: o.id, direction_id: d.id, reference_direction_id: reference?.id ?? null,
          targets: deltas, joint_paired_delta: complete ? pairedMixture(known.map(x => ({ weight: x.target.probability!,
            a: raw.get(x.a!)!, b: raw.get(x.b!)! }))) : null,
          known_mass: known.reduce((sum, x) => sum + x.target.probability!, 0),
          labels: ["direction_minus_highest_brain_probability_direction", "same_combat_seeds_lookup_probability_fixed",
            "max_combination_selection_descriptive_not_unbiased", "encounter_frequency_estimation_error_not_included",
            ...(!reference ? ["invalid_or_incomplete_brain_weights"] : []),
            ...(!complete ? ["missing_target_mass_not_renormalized"] : [])] });
      }
    }
    if (r.phase === "act") {
      for (const row of table.combinations.filter(x => x.entry.option_id === r.baseline.id)) {
        const e = row.entry; table.act_evaluations.push({ direction_id: e.direction_id, combination_id: row.combination_id, target_id: e.target_id,
          win: e.win, joint_win: e.joint_win, availability: e.availability.skip, trust: e.trust, win_tier: e.win_tier,
          versus: table.combinations.filter(x => x !== row && x.combination_id && x.entry.option_id === r.baseline.id && x.entry.target_id === e.target_id).map(x => ({ direction_id: x.entry.direction_id,
            combination_id: x.combination_id!, paired_delta: paired(raw.get(row)!, raw.get(x)!, "first"), joint_paired_delta: paired(raw.get(row)!, raw.get(x)!, "joint") })) });
      }
      for (const d of all) {
        const combos = [...new Set([...d.combos.map(c => c.id), ...table.combinations.filter(x => x.entry.direction_id === d.id).map(x => x.combination_id).filter((x): x is string => !!x)])];
        const score = (id: string) => { const rows = table.combinations.filter(x => x.entry.direction_id === d.id && x.combination_id === id && x.entry.option_id === r.baseline.id);
          const chain = rows.filter(x => r.targets.find(t => t.id === x.entry.target_id)?.kind === "chain"), selected = chain.length ? chain : rows;
          const known = selected.filter(x => chain.length ? x.entry.joint_win : x.entry.win);
          if (!known.length) return -Infinity;
          // Rank only observed target values; missing candidate mass is never renormalized.
          return known.reduce((sum, x) => sum + (chain.length ? x.entry.joint_win! : x.entry.win!).value * (r.targets.find(t => t.id === x.entry.target_id)?.probability ?? 0), 0); };
        table.rankings[d.id] = combos.sort((a, b) => score(b) - score(a) || a.localeCompare(b));
      }
    }
  }
}

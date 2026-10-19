/** Paired combination projections. All incomplete inputs remain explicitly unknown. */
import type { BuildState } from "../construction/types.js";
import type { V6Config } from "../v6/config.js";
import type { ProjectionEntry } from "../v6/formats.js";
import type { RolloutInput } from "../reflex/rollout.js";
import type { FightSampleResult } from "./boss-sim.js";
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
  seed: number; modelVersion: string;
  /** Includes held resources, route, frozen history/trust, current run and act identity. */
  contextDigest: string;
  prepare: (target: V6ProjectionTarget, state: BuildState) => V6PreparedProjection | null;
  trust: (target: V6ProjectionTarget) => { value: ProjectionEntry["trust"]; labels: string[] };
}
type Estimate = NonNullable<ProjectionEntry["win"]>;
type Delta = NonNullable<ProjectionEntry["paired_delta"]>;
type Indexed = (FightSampleResult | undefined)[];
type Raw = { first: (number | null)[]; joint: (number | null)[]; ids: string[] };
type ExpectedRaw = Raw & { formation: readonly boolean[] | null; effect: { first: number | null; joint: number | null } };
export interface V6CombinationProjection {
  combination_id: string | null; entry: ProjectionEntry;
  completion_source: V6CompletionCombination["source"] | "unknown";
  general_source: "empirical"; scope: "combination_expectation";
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
export interface V6ProjectionTable {
  schema: "v6-projection-table-v1"; enabled: boolean; phase: "pick" | "act";
  combinations: V6CombinationProjection[]; act_evaluations: V6ActEvaluation[];
  /** One maximum-combination entry per option/direction/target, suitable for W4. */
  entries: ProjectionEntry[]; weighted: V6WeightedProjection[]; rankings: Record<string, string[]>;
  /** Candidate bosses are alternatives, not sequential independent events. */
  target_mixtures: { option_id: string; kind: "current_gate" | "clearance"; value: Estimate | null; paired_delta: Delta | null;
    known_mass: number; known_value: number; labels: string[] }[];
  targets: readonly V6ProjectionTarget[];
  telemetry: { elapsed_ms: number; cache_hits: number; cache_misses: number; simulations: number; timed_out: number;
    degradation: string[]; unknown_entries: number; total_entries: number; unknown_fraction: number; act_cache_hit: boolean };
}
function estimate(values: readonly number[]): Estimate | null {
  const s = summarizeSamples(values); return s.mean === null || s.meanSe === null ? null : { value: s.mean, se: s.meanSe, n: s.n };
}
function fullEstimate(values: readonly (number | null)[]): Estimate | null {
  return values.some(x => x === null) ? null : estimate(values as number[]);
}
function expected(k: Raw, g: Raw, p: number | null, formation: readonly boolean[] | null): ExpectedRaw {
  const effect = { first: null as number | null, joint: null as number | null };
  const field = (f: "first" | "joint") => {
    const a = fullEstimate(k[f]), b = fullEstimate(g[f]); effect[f] = a && b ? a.value - b.value : null;
    return k.ids.map((_, i) => p === null || p > 0 && k[f][i] == null || p < 1 && g[f][i] == null ? null
      : p * (k[f][i] ?? 0) + (1 - p) * (g[f][i] ?? 0));
  };
  return { ids: k.ids, first: field("first"), joint: field("joint"), formation, effect };
}
function uncertainty(raw: ExpectedRaw, f: "first" | "joint"): Estimate | null {
  const e = fullEstimate(raw[f]); if (!e) return null;
  const supply = raw.formation && estimate(raw.formation.map(Number));
  // Finite-supply error is independent of the combat seeds. Unknown effects cannot be fabricated.
  if (supply && supply.se > 0 && raw.effect[f] === null) return null;
  return { ...e, se: Math.hypot(e.se, (supply?.se ?? 0) * (raw.effect[f] ?? 0)) };
}
function paired(a: ExpectedRaw, b: ExpectedRaw, f: "first" | "joint"): Delta | null {
  if (a.ids.length !== b.ids.length || a.ids.some((id, i) => id !== b.ids[i]) || a[f].some((v, i) => v === null || b[f][i] === null)) return null;
  const e = estimate(a[f].map((v, i) => v! - b[f][i]!)); if (!e) return null;
  let se = 0;
  if (a.formation && b.formation && a.formation.length === b.formation.length) {
    const p = a.formation.filter(Boolean).length / a.formation.length, q = b.formation.filter(Boolean).length / b.formation.length;
    if (p > 0 && p < 1 && a.effect[f] === null || q > 0 && q < 1 && b.effect[f] === null) return null;
    const s = estimate(a.formation.map((v, i) => (Number(v) - p) * (a.effect[f] ?? 0) - (Number(b.formation![i]) - q) * (b.effect[f] ?? 0)));
    if (!s) return null; se = s.se;
  } else if (a.formation || b.formation) return null;
  return { mean: e.value, se: Math.hypot(e.se, se), n: e.n };
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
  const result = chain ? continuousBossResult(outcomes.filter((o): o is FightSampleResult => !!o), ids.length, true)! : null;
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
  constructor(private readonly runner: DeckSimRunner, private readonly now: () => number = () => performance.now(), private readonly capacity = 256) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) throw new Error("invalid V6 cache capacity");
  }
  clear(): void { this.samples.clear(); this.acts.clear(); }
  private remember<T>(map: Map<string, T>, key: string, value: T): void {
    map.delete(key); map.set(key, structuredClone(value)); while (map.size > this.capacity) map.delete(map.keys().next().value!);
  }
  async precompute(r: V6ProjectionRequest): Promise<V6ProjectionTable> { return this.evaluate({ ...r, options: [] }); }
  async evaluate(r: V6ProjectionRequest): Promise<V6ProjectionTable> {
    const started = this.now();
    const table: V6ProjectionTable = { schema: "v6-projection-table-v1", enabled: r.config.mode !== "off", phase: r.phase,
      combinations: [], entries: [], act_evaluations: [], weighted: [], rankings: {}, target_mixtures: [], targets: r.targets,
      telemetry: { elapsed_ms: 0, cache_hits: 0, cache_misses: 0, simulations: 0, timed_out: 0, degradation: [], unknown_entries: 0,
        total_entries: 0, unknown_fraction: 0, act_cache_hit: false } };
    if (!table.enabled) return table;
    if (!r.contextDigest || !r.modelVersion || !Number.isSafeInteger(r.seed)) throw new Error("V6 requires frozen context/model signatures and integer seed");
    const options = [r.baseline, ...r.options];
    for (const ids of [options.map(o => o.id), r.directions.map(d => d.id), r.targets.map(t => t.id), r.completionSources.map(s => s.kind)])
      if (new Set(ids).size !== ids.length) throw new Error("duplicate V6 option/direction/target/provider");
    const all = r.directions.filter(d => d.character === r.character && d.ascensions.includes(r.ascension));
    const directions = all.filter(d => r.phase === "act" || (r.weights[d.id] ?? 0) >= r.config.direction_min_weight);
    const weightsValid = all.length > 0 && Object.keys(r.weights).length === all.length && all.every(d => Number.isFinite(r.weights[d.id]) && r.weights[d.id]! >= 0)
      && Math.abs(all.reduce((sum, d) => sum + r.weights[d.id]!, 0) - 1) <= .01;
    const n = r.phase === "act" ? r.config.samples_act : r.config.samples_pick;
    const actKey = v6Digest({ ...r, prepare: undefined, trust: undefined, completionSources: r.completionSources.map(s => [s.kind, s.signature]) });
    if (r.phase === "act" && this.acts.has(actKey)) { const hit = structuredClone(this.acts.get(actKey)!); hit.telemetry = { ...hit.telemetry,
      cache_hits: 0, cache_misses: 0, simulations: 0, timed_out: 0, degradation: [], act_cache_hit: true, elapsed_ms: this.now() - started }; return hit; }
    const available = r.phase === "act" ? r.config.budgets.act_ms : Math.max(0, r.config.budgets.pick_ms - r.config.budgets.jev_ms);
    // Leave time for aggregation/serialization after the last synchronous preparation or worker result.
    const deadline = started + Math.max(0, available - Math.min(500, available / 8));
    const raws = new Map<V6CombinationProjection, ExpectedRaw>();
    const jobs = directions.flatMap(direction => r.targets.map(target => ({ direction, target }))).sort((a, b) =>
      Number(a.target.kind === "future") - Number(b.target.kind === "future") || (r.weights[b.direction.id] ?? 0) - (r.weights[a.direction.id] ?? 0));
    let dropped: string | null = null, stage = 0;
    const degrade = (remaining: typeof jobs) => {
      table.telemetry.timed_out++;
      const count = this.now() >= deadline ? 3 : stage + 1;
      while (stage < count) { if (stage === 0) { dropped = [...remaining].sort((a, b) => (r.weights[a.direction.id] ?? 0) - (r.weights[b.direction.id] ?? 0))[0]?.direction.id ?? null;
          table.telemetry.degradation.push("drop_lowest_direction"); }
        else table.telemetry.degradation.push(stage === 1 ? "current_and_chain_targets_only" : "remaining_unknown"); stage++; }
    };
    const preparedCache = new Map<string, V6PreparedProjection | null>();
    for (const [ji, { direction: d, target: t }] of jobs.entries()) {
      let reason = t.unknown ?? (stage >= 3 ? "budget_remaining_unknown" : d.id === dropped ? "budget_lowest_direction_dropped" : stage >= 2 && t.kind === "future" ? "budget_future_target_dropped" : null);
      if (!reason && this.now() >= deadline) { reason = "deadline_exhausted"; degrade(jobs.slice(ji)); }
      let completion = null;
      if (!reason) try { completion = resolveV6Completion({ direction: d, options: structuredClone(options), target: t, samples: n, seed: r.seed,
        phase: r.phase, deadline, idealOverrides: r.idealOverrides, appearedCards: r.appearedCards, ranking: r.rankings?.[d.id] }, r.completionSources); }
      catch (e) { reason = `completion_provider_failed:${String(e).slice(0, 160)}`; }
      if (!completion?.combinations.length) reason ??= "no_combination_provider_result";
      if (completion && new Set(completion.combinations.map(c => c.id)).size !== completion.combinations.length) reason = "duplicate_combination_id";
      for (const c of (reason ? [null] : completion!.combinations)) {
        let error = reason;
        const ids = c?.samples.map(s => s.id) ?? Array.from({ length: n }, (_, i) => `seed:${i}`);
        if (c && (ids.length !== n || new Set(ids).size !== n || c.general.length !== n || c.general.some((s, i) => s.id !== ids[i]))) error = "invalid_paired_sample_schedule";
        if (c && options.some(o => { const p = c.availability[o.id]; return p != null && (!Number.isFinite(p) || p < 0 || p > 1); })) error = "invalid_formation_probability";
        if (c && options.some(o => { const p = c.availability[o.id], worlds = c.supply[o.id];
          return p != null && (!worlds || worlds.length < 2 || worlds.some(v => typeof v !== "boolean")
            || Math.abs(worlds.filter(Boolean).length / worlds.length - p) > 1e-10); })) error = "inconsistent_formation_worlds";
        const prepared: (V6PreparedProjection | null)[][] = [], outcomes: Indexed[] = [], keys: string[] = [], rowErrors: string[][] = [];
        for (const o of options) for (const branch of ["completed", "general"] as const) {
          const p = c?.availability[o.id], skip = branch === "completed" && (p == null || p < .05) || branch === "general" && (p == null || p < .05 || p === 1);
          const ps: (V6PreparedProjection | null)[] = [], errors: string[] = [];
          for (let i = 0; i < n; i++) {
            const state = (branch === "completed" ? c?.samples : c?.general)?.[i]?.states[o.id];
            if (error || skip || !state || this.now() >= deadline) { ps.push(null); continue; }
            const key = v6Digest([t, state]);
            try { if (!preparedCache.has(key)) preparedCache.set(key, r.prepare(t, structuredClone(state)));
              const input = preparedCache.get(key) ?? null;
              if (input && (!(input.maxHp > 0) || !(input.bossHp > 0) || !Number.isFinite(input.maxHp) || !Number.isFinite(input.bossHp)
                || t.kind === "chain" && (!t.secondBoss || input.input.continuation?.variants.length !== 1 || input.input.continuation.variants[0]?.boss !== t.secondBoss))) ps.push(null);
              else ps.push(input);
            } catch { ps.push(null); errors.push("target_preparation_failed"); }
          }
          if (skip) errors.push(branch === "completed" ? "formation_below_5_percent_or_unknown_not_simulated" : "formation_certain_general_unused");
          else if (ps.some(x => !x)) errors.push("unknown_opening_entry_hp_or_empirical_sample");
          prepared.push(ps); outcomes.push(Array.from({ length: n })); rowErrors.push(errors);
          keys.push(v6Digest({ inputs: ps, ids, target: t, character: r.character, ascension: r.ascension, seed: r.seed, n,
            model: r.modelVersion, context: r.contextDigest }));
        }
        const decks: RolloutInput[] = [], stripes: { at: number; of: number }[] = [], positions: { group: number; deck: number }[] = [];
        const pending = new Map<string, number>(); const aliases = new Map<number, number>();
        for (const [i, inputs] of prepared.entries()) {
          if (inputs.some(x => !x)) continue;
          const hit = this.samples.get(keys[i]!); if (hit) { outcomes[i] = structuredClone(hit); table.telemetry.cache_hits++; continue; }
          const alias = pending.get(keys[i]!); if (alias !== undefined) { aliases.set(i, alias); table.telemetry.cache_hits++; continue; }
          table.telemetry.cache_misses++; pending.set(keys[i]!, i);
          const p = period(inputs.map(v6Digest));
          for (let at = 0; at < p; at++) { positions.push({ group: i, deck: decks.length }); decks.push(inputs[at]!.input); stripes.push({ at, of: p }); }
        }
        let timeout = false;
        if (decks.length && this.now() < deadline) try {
          const result = await this.runner.run({ base: decks[0]!, decks, stripes, orders: [null], samples: n, seed: r.seed,
            deadlineMs: Math.max(1, (deadline - this.now()) / Math.max(1, jobs.length - ji) / Math.max(1, completion?.combinations.length ?? 1)), diagnostics: true });
          timeout = result.timedOut;
          for (const { group, deck } of positions) for (let i = 0; i < n; i++) { const o = result.outcomes[deck]?.[0]?.[i]; if (o) { outcomes[group]![i] = o; table.telemetry.simulations++; } }
        } catch { error = "simulation_failed"; }
        else if (decks.length) timeout = true;
        for (const [alias, original] of aliases) outcomes[alias] = outcomes[original]!;
        for (const i of pending.values()) { const v = rawValues(outcomes[i]!, t.kind === "chain", ids);
          if (!timeout && !error && v.first.every(x => x !== null) && (t.kind !== "chain" || v.joint.every(x => x !== null))) this.remember(this.samples, keys[i]!, outcomes[i]!); }
        if (timeout || this.now() >= deadline) degrade(jobs.slice(ji + 1));
        const expectedRows = options.map((o, i) => expected(rawValues(outcomes[i * 2]!, t.kind === "chain", ids), rawValues(outcomes[i * 2 + 1]!, t.kind === "chain", ids),
          c?.availability[o.id] ?? null, c?.supply[o.id] ?? null));
        for (const [oi, o] of options.entries()) {
          const entry = emptyEntry(o.id, d.id, t.id), kr = rawValues(outcomes[oi * 2]!, t.kind === "chain", ids), gr = rawValues(outcomes[oi * 2 + 1]!, t.kind === "chain", ids), er = expectedRows[oi]!;
          const p = c?.availability[o.id] ?? null, trust = r.trust(t), formation = c?.supply[o.id] ?? null;
          const inCombo = !!o.card && !!c?.requirements.some(req => req.any.some(x => x.kind === "card" && x.id === o.card!.id));
          const role = !c ? "unknown" : inCombo ? "in_combo" : d.conflict.some(x => x.id === o.card?.id) ? "conflict" : "off_combo";
          const row: V6CombinationProjection = { combination_id: c?.id ?? null, entry, completion_source: c?.source ?? "unknown", general_source: "empirical", scope: "combination_expectation",
            completed_win: fullEstimate(kr.first), general_win: fullEstimate(gr.first), completed_joint_win: t.kind === "chain" ? fullEstimate(kr.joint) : null,
            general_joint_win: t.kind === "chain" ? fullEstimate(gr.joint) : null, formation_se: formation ? estimate(formation.map(Number))?.se ?? null : null,
            formation_n: formation?.length ?? 0, summary: c?.summary ?? null, role, role_labels: o.card ? c?.roles[o.card.id] ?? [] : [], completion_sample_ids: c ? ids : [],
            model_labels: [...new Set([...d.limits, ...completion?.labels ?? [], ...c?.labels ?? [], ...t.labels, ...trust.labels,
              ...prepared.slice(oi * 2, oi * 2 + 2).flatMap(ps => ps.flatMap(x => x?.labels ?? [])), "raw_simulation_not_calibrated", "partial_model", "future_relics_and_potions_not_predicted"])],
            unknown_reasons: error ? [error] : [], continuous: t.kind === "chain" ? continuousBossResult(outcomes[oi * 2]!.filter((x): x is FightSampleResult => !!x), n, true)! : null };
          entry.trust = trust.value; entry.direction_role = v6DirectionRole(d, all, o.card); entry.availability = { take: p, skip: c?.availability[r.baseline.id] ?? null };
          // Below threshold reports probability only, including exactly zero; never substitutes a simulated zero win rate.
          entry.win = p !== null && p >= .05 ? uncertainty(er, "first") : null;
          entry.joint_win = p !== null && p >= .05 && t.kind === "chain" ? uncertainty(er, "joint") : null;
          entry.paired_delta = entry.win ? paired(er, expectedRows[0]!, "first") : null;
          entry.joint_paired_delta = entry.joint_win ? paired(er, expectedRows[0]!, "joint") : null;
          if (p === null) row.unknown_reasons.push("formation_unknown"); else if (p < .05) row.unknown_reasons.push("formation_below_5_percent_not_simulated");
          if (!entry.win) row.unknown_reasons.push("expectation_unknown"); if (t.kind === "chain" && !entry.joint_win) row.unknown_reasons.push("continuous_joint_unknown");
          if (timeout) row.unknown_reasons.push("simulation_budget_exceeded");
          const ks = c?.samples.map(s => s.states[o.id]?.cards.length); if (ks?.length && ks.every(x => x !== undefined && x === ks[0])) entry.deck_count_change = ks[0]! - r.baseline.state.cards.length;
          const complete = outcomes[oi * 2]!.filter((x): x is FightSampleResult => !!x);
          if (row.completed_win) {
            entry.turns = estimate(complete.map(x => t.kind === "chain" ? x.sequence!.firstTurns : x.turns));
            if (t.kind !== "chain") {
              entry.losing_boss_hp_fraction = estimate(complete.flatMap((x, i) => !x.won ? [x.enemyHpLeft / prepared[oi * 2]![i]!.bossHp] : []).filter(x => x >= 0 && x <= 1));
              entry.winning_player_hp_fraction = estimate(complete.flatMap((x, i) => x.won && x.resources ? [x.resources.hp / prepared[oi * 2]![i]!.maxHp] : []).filter(x => x >= 0 && x <= 1));
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
    this.aggregate(r, table, raws, all, options, weightsValid);
    table.telemetry.elapsed_ms = this.now() - started; table.telemetry.total_entries = table.combinations.length;
    table.telemetry.unknown_entries = table.combinations.filter(x => !x.entry.win || r.targets.find(t => t.id === x.entry.target_id)?.kind === "chain" && !x.entry.joint_win).length;
    table.telemetry.unknown_fraction = table.combinations.length ? table.telemetry.unknown_entries / table.combinations.length : 1;
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
      // An omitted/unknown combination can still beat the observed maximum; do not call a lower bound the maximum.
      if (leader && rows.some(x => !x.entry[field])) { entry.win = null; entry.joint_win = null; entry.paired_delta = null; entry.joint_paired_delta = null; entry.win_tier = "unknown"; entry.delta_tier = "unknown"; }
      else if (leader) best.set(key(o.id, d.id, t.id), leader);
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
        return { ids, first: f("first"), joint: f("joint"), formation: null, effect: { first: null, joint: null } };
      };
      const a = weightedRaw(false), b = weightedRaw(true);
      // Supply worlds are shared across directions: sum centered formation effects before computing their SE.
      const supplySe = (field: "first" | "joint", difference: boolean): number | null => {
        if (!a || difference && !b) return null;
        const contributions = selected.filter(x => x.weight > 0).flatMap(x => [{ w: x.weight, raw: raw.get(x.row!)! }, ...(difference ? [{ w: -x.weight, raw: raw.get(x.baseline!)! }] : [])]);
        const n = contributions[0]?.raw.formation?.length; if (!n || contributions.some(x => x.raw.formation?.length !== n)) return null;
        const effects = contributions.map(x => { const p = x.raw.formation!.filter(Boolean).length / n; return { ...x, p }; });
        if (effects.some(x => x.p > 0 && x.p < 1 && x.raw.effect[field] === null)) return null;
        return estimate(Array.from({ length: n }, (_, i) => effects.reduce((sum, x) => sum + x.w * (Number(x.raw.formation![i]) - x.p) * (x.raw.effect[field] ?? 0), 0)))?.se ?? null;
      };
      const value = (field: "first" | "joint"): Estimate | null => { const e = a && fullEstimate(a[field]), se = supplySe(field, false); return e && se !== null ? { ...e, se: Math.hypot(e.se, se) } : null; };
      const difference = (field: "first" | "joint"): Delta | null => { const e = a && b && paired(a, b, field), se = supplySe(field, true); return e && se !== null ? { ...e, se: Math.hypot(e.se, se) } : null; };
      const row: V6WeightedProjection = { option_id: o.id, target_id: t.id, win: value("first"), joint_win: t.kind === "chain" ? value("joint") : null,
        paired_delta: difference("first"), joint_paired_delta: t.kind === "chain" ? difference("joint") : null, known_weight: knownWeight,
        known_weighted_value: known.reduce((sum, x) => sum + x.weight * x.row!.entry[t.kind === "chain" ? "joint_win" : "win"]!.value, 0),
        labels: ["max_combination_selection_descriptive_not_unbiased", ...(!weightsValid ? ["invalid_or_incomplete_brain_weights"] : []), ...(knownWeight < .99 ? ["missing_direction_weight_not_renormalized"] : [])] };
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
    if (r.phase === "act") {
      for (const row of table.combinations.filter(x => x.entry.option_id === r.baseline.id)) {
        const e = row.entry; table.act_evaluations.push({ direction_id: e.direction_id, combination_id: row.combination_id, target_id: e.target_id,
          win: e.win, joint_win: e.joint_win, availability: e.availability.skip, trust: e.trust, win_tier: e.win_tier,
          versus: table.combinations.filter(x => x !== row && x.combination_id && x.entry.option_id === r.baseline.id && x.entry.target_id === e.target_id).map(x => ({ direction_id: x.entry.direction_id,
            combination_id: x.combination_id!, paired_delta: paired(raw.get(row)!, raw.get(x)!, "first"), joint_paired_delta: paired(raw.get(row)!, raw.get(x)!, "joint") })) });
      }
      for (const d of all) {
        const combos = [...new Set(table.combinations.filter(x => x.entry.direction_id === d.id).map(x => x.combination_id).filter((x): x is string => !!x))];
        const score = (id: string) => { const rows = table.combinations.filter(x => x.entry.direction_id === d.id && x.combination_id === id && x.entry.option_id === r.baseline.id);
          const chain = rows.filter(x => r.targets.find(t => t.id === x.entry.target_id)?.kind === "chain"), selected = chain.length ? chain : rows;
          if (selected.some(x => !(chain.length ? x.entry.joint_win : x.entry.win))) return -Infinity;
          return selected.reduce((sum, x) => sum + (chain.length ? x.entry.joint_win! : x.entry.win!).value * (r.targets.find(t => t.id === x.entry.target_id)?.probability ?? 0), 0); };
        table.rankings[d.id] = combos.sort((a, b) => score(b) - score(a) || a.localeCompare(b));
      }
    }
  }
}

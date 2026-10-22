import { array, boolean, custom, enumeration, id, literal, nullable, number, object, optional, plain, record, refine, safeKey, text, validate, type Infer, type Result } from "./schema.js";
import type { JsonValue } from "../core/util/json.js";
import { cardPickDeckPredicate, predicateSchema } from "./predicate.js";
import { contrastConfidence } from "./contrast-statistics.js";

const probability = number(0, 1);
const count = number(0, 1_000_000, true);
const positiveCount = number(1, 1_000_000, true);
export const characterSchema = enumeration("ironclad", "silent", "regent", "necrobinder", "defect");
export type Character = Infer<typeof characterSchema>;
export const observationSchema = object({ run_id: id, floor: number(0, 100, true), turn: optional(number(0, 10000, true)) });
const observations = array(observationSchema, 1);
const scope = object({ character: characterSchema, ascensions: array(number(0, 100, true), 1, 101) });
const label = refine(text(150), (v, e) => {
  if (!/^[A-Za-z0-9][A-Za-z0-9 '\-]*$/.test(v) || v.trim().split(/\s+/).length > 12) e.push("label_en: at most 12 English words");
});
const unique = (values: string[], name: string, e: string[]): void => { if (new Set(values).size !== values.length) e.push(`${name}: duplicate ID`); };
const ids = refine(array(id), (v, e) => unique(v, "IDs", e));

export const potionDirectionSchema = object({
  schema: literal("potion-direction-v1"), potion: id, tier: enumeration("must", "prefer", "normal", "avoid"),
  for: optional(enumeration("current_boss", "joint", "elite")), reason: text(),
});
export type PotionDirection = Infer<typeof potionDirectionSchema>;
export const validatePotionDirection = (v: unknown): Result<PotionDirection> => validate(potionDirectionSchema, v);

const directionWeightsSchema = object({
  schema: literal("direction-weights-v1"), direction_weights: record(probability), ideal_overrides: optional(record(array(id, 0, 200))),
  potion_directions: array(potionDirectionSchema, 0, 100), route: text(2000), rest: enumeration("heal", "smith", "auto"),
  checkpoint: number(1, 100, true), reason: text(),
});
export type DirectionWeights = Infer<typeof directionWeightsSchema>;
export interface DirectionContext {
  /** All catalog directions, each with the card IDs in its build core or transition adapter. */
  catalog: Readonly<Record<string, readonly string[]>>;
  appearedCards: ReadonlySet<string>;
  potionIds: ReadonlySet<string>;
  currentFloor: number;
  /** Reuse the current question's existing route validator; a missing validator is not approval. */
  validRoute: (route: string) => boolean;
}
export function validateDirectionWeights(v: unknown, context: DirectionContext): Result<DirectionWeights> {
  return validate(refine(directionWeightsSchema, (answer, e) => {
    const all = Object.keys(context.catalog), given = Object.keys(answer.direction_weights);
    if (!all.length || given.length !== all.length || given.some(k => !Object.hasOwn(context.catalog, k))) e.push("direction_weights: must cover the complete character catalog exactly");
    if (Math.abs(Object.values(answer.direction_weights).reduce((a, b) => a + b, 0) - 1) > .010000000001) e.push("direction_weights: sum must equal 1 ± 0.01");
    for (const [direction, cards] of Object.entries(answer.ideal_overrides ?? {})) {
      if (!Object.hasOwn(context.catalog, direction) || cards.some(c => !context.catalog[direction]!.includes(c) && !context.appearedCards.has(c))) e.push("ideal_overrides: unknown direction or unobserved card");
    }
    for (const entry of answer.potion_directions) if (!context.potionIds.has(entry.potion)) e.push("potion_directions: unknown potion/category");
    unique(answer.potion_directions.map(p => p.potion), "potion_directions", e);
    if (answer.checkpoint <= context.currentFloor) e.push("checkpoint: must be after current floor");
    if (!context.validRoute(answer.route)) e.push("route: rejected by existing route validator");
  }), v);
}

const paired = object({ mean: number(-1, 1), se: number(0, 1), n: positiveCount });
const estimate = object({ value: probability, se: number(0, 1), n: positiveCount });
const turnEstimate = object({ value: number(0, 10000), se: number(0, 10000), n: positiveCount });
// Opaque provider metric snapshots retain sampling strata and evidence without inventing a metric model.
function boundedMetricSnapshot(value: unknown): boolean {
  let nodes = 0;
  const walk = (v: unknown, depth: number): boolean => {
    // Published pooled history snapshots reach 69,372 nodes; retain them for audit.
    if (++nodes > 100000 || depth > 16) return false;
    if (v === null || typeof v === "boolean") return true;
    if (typeof v === "number") return Number.isFinite(v);
    if (typeof v === "string") return v.length <= 4000;
    if (Array.isArray(v)) return v.length <= 1000 && v.every(x => walk(x, depth + 1));
    return plain(v) && Object.keys(v).length <= 1000 && Object.entries(v).every(([k, x]) => safeKey(k) && walk(x, depth + 1));
  };
  return walk(value, 0);
}
const metricSnapshot = custom<JsonValue>((value, path, issues) => {
  if (!boundedMetricSnapshot(value)) issues.push(`${path}: bounded JSON metric snapshot required`);
});
const projectionSchema = (snapshot = metricSnapshot) => object({
  schema: literal("projection-entry-v1"), option_id: id, direction_id: id, target_id: id,
  win: nullable(estimate), paired_delta: nullable(paired), losing_boss_hp_fraction: nullable(estimate),
  winning_player_hp_fraction: nullable(estimate), turns: nullable(turnEstimate), joint_win: nullable(estimate), joint_paired_delta: nullable(paired),
  availability: object({ take: nullable(probability), skip: nullable(probability) }),
  weighted_current_boss_delta: nullable(paired), weighted_joint_delta: nullable(paired),
  deck_count_change: nullable(number(-1000, 1000, true)), core_first_cast_turn: nullable(turnEstimate),
  win_tier: enumeration("certain_win", "favored", "even", "unfavored", "certain_loss", "unknown"),
  delta_tier: enumeration("much_better", "better", "same", "worse", "much_worse", "unknown"),
  direction_role: enumeration("core", "support", "neutral", "conflict", "core_of_other", "unknown"),
  trust: enumeration("trusted", "low_optimistic", "low_pessimistic", "unknown"), reflex_ids: ids,
  // Optional additions keep the original direction-only contract byte-compatible.
  combo_id: optional(id), combo_source: optional(enumeration("build-core-v1", "construction-transition", "brain")),
  win_complete: optional(nullable(estimate)), win_incomplete: optional(nullable(estimate)),
  incomplete_source: optional(enumeration("empirical", "unknown")), expected_win: optional(nullable(probability)),
  formula: optional(literal("formation_times_completed")),
  expected_win_bound: optional(object({ lower: probability, upper: probability,
    reason: enumeration("low_probability_not_simulated", "formation_impossible") })),
  trust_details: optional(object({ n: nullable(count), brier: nullable(number(0)), bias: nullable(number(-1, 1)), passed: nullable(boolean) })),
  direction_value: optional(nullable(probability)), combo_metrics: optional(nullable(snapshot)),
  // A completed target remains readable while other combinations/targets are pending.
  combination_coverage: optional(object({ selection: enumeration("catalog_maximum", "computed_subset_maximum", "unknown"),
    selected_combination_id: nullable(id), evaluated_combinations: number(0, 1000, true),
    catalog_combinations: number(1, 1000, true), pending_combinations: number(0, 1000, true) })),
});
export const projectionEntrySchema = projectionSchema();
export type ProjectionEntry = Infer<typeof projectionEntrySchema>;
const projectionChecks = (entry: ProjectionEntry, e: string[]): void => {
  if (entry.win === null && entry.win_tier !== "unknown") e.push("win_tier: missing estimate must remain unknown");
  if (entry.paired_delta === null && entry.delta_tier !== "unknown") e.push("delta_tier: missing paired estimate must remain unknown");
  if (entry.combo_id === undefined && [entry.combo_source, entry.win_complete, entry.win_incomplete, entry.incomplete_source, entry.expected_win, entry.expected_win_bound, entry.combo_metrics, entry.formula].some(v => v !== undefined)) e.push("combo_id: required for combo measurements");
  if (entry.combo_id !== undefined && entry.combo_source === undefined) e.push("combo_source: required for a combo row");
  if (entry.win_incomplete != null && entry.incomplete_source !== "empirical") e.push("win_incomplete: needs empirical source");
  const p = entry.availability.take;
  if (entry.expected_win != null && (p === null || (p > 0 && entry.win_complete == null) || (!entry.formula && p < 1 && entry.win_incomplete == null))) e.push("expected_win: missing completion or nonzero-weight conditional win estimates");
  if (entry.formula) {
    if (entry.win_incomplete != null) e.push("win_incomplete: omitted by formation_times_completed");
    if (entry.expected_win != null && p !== null && entry.win_complete != null
      && Math.abs(entry.expected_win - p * entry.win_complete.value) > 1e-10) e.push("expected_win: must equal P times completed win");
  }
  const bound = entry.expected_win_bound;
  if (bound && (p === null || p >= .05 || bound.lower !== 0 || bound.upper !== p || entry.expected_win != null
    || (bound.reason === "formation_impossible") !== (p === 0))) e.push("expected_win_bound: exact low-P interval required, never a point estimate");
  const coverage = entry.combination_coverage;
  if (coverage) {
    if (coverage.evaluated_combinations + coverage.pending_combinations !== coverage.catalog_combinations) e.push("combination_coverage: counts must reconcile");
    if ((coverage.selection === "unknown") !== (coverage.selected_combination_id === null)) e.push("combination_coverage: selected combination must match selection");
    if (coverage.selection === "catalog_maximum" && coverage.pending_combinations !== 0
      || coverage.selection === "computed_subset_maximum" && coverage.pending_combinations === 0) e.push("combination_coverage: pending competitors must match selection");
  }
};
const checkedProjectionSchema = refine(projectionEntrySchema, projectionChecks);
export function validateProjectionEntry(v: unknown): Result<ProjectionEntry> {
  return validate(checkedProjectionSchema, v);
}
/** Synchronous batch only: shared audit snapshots are checked once; no cache survives the call. */
export function validateProjectionEntries(values: readonly unknown[]): Result<ProjectionEntry>[] {
  const snapshots = new WeakMap<object, boolean>();
  const snapshot = custom<JsonValue>((value, path, issues) => {
    const object = value !== null && typeof value === "object" ? value : null;
    let valid = object ? snapshots.get(object) : undefined;
    if (valid === undefined) {
      valid = boundedMetricSnapshot(value);
      if (object) snapshots.set(object, valid);
    }
    if (!valid) issues.push(`${path}: bounded JSON metric snapshot required`);
  });
  const schema = refine(projectionSchema(snapshot), projectionChecks);
  return values.map(value => validate(schema, value));
}

const numericSignal = object({ kind: enumeration("hp", "win"), value: number(), se: optional(number(0)), unit: enumeration("hp", "probability") });
const tagSignal = object({ kind: literal("tag"), value: id, unit: literal("label") });
export const contrastSignalSchema = refine(object({
  kind: literal("contrast"), design: literal("observational"), metric: enumeration("hp_loss", "turns", "damage_per_turn"),
  value: number(), se: number(Number.MIN_VALUE), unit: enumeration("hp", "turns", "hp_per_turn"),
  baseline: object({ treatment: literal("take_candidate"), control: literal("same_offer_not_taken"),
    definition: text(1000), outcome_window: text(1000), adjustment: text(1000) }),
  n: object({ take: positiveCount, not_take: positiveCount, clusters: number(2, 1_000_000, true) }),
  uncertainty: object({ method: literal("run_cluster_t"), cluster: literal("run_id"),
    interval: object({ level: number(.95, .99), lower: number(), upper: number() }) }),
  audit: object({ path: text(1000), sha256: refine(text(64, 64), (v, e) => { if (!/^[a-f0-9]{64}$/.test(v)) e.push("audit.sha256: lowercase SHA256 required"); }) }),
}), (s, e) => {
  const expectedUnit = { hp_loss: "hp", turns: "turns", damage_per_turn: "hp_per_turn" }[s.metric];
  if (s.unit !== expectedUnit) e.push("contrast: metric/unit mismatch");
  if (s.n.clusters > s.n.take + s.n.not_take) e.push("contrast: clusters exceed observations");
  const ci = s.uncertainty.interval, radius = (ci.upper - ci.lower) / 2;
  const coverage = contrastConfidence(radius, s.se, s.n.clusters);
  if (!(radius > 0) || Math.abs((ci.lower + ci.upper) / 2 - s.value) > 1e-8 * Math.max(1, Math.abs(s.value))
    || !Number.isFinite(coverage) || Math.abs(coverage - ci.level) > 1e-6) e.push("contrast: interval must match run-cluster t uncertainty");
});
export type ContrastSignal = Infer<typeof contrastSignalSchema>;
const signal = custom<Infer<typeof numericSignal> | Infer<typeof tagSignal> | ContrastSignal>((v, p, e) => {
  if (plain(v) && v["kind"] === "contrast") { contrastSignalSchema.check(v, p, e); return; }
  const tag = v && typeof v === "object" && "kind" in v && v.kind === "tag";
  const schema = tag ? tagSignal : numericSignal;
  schema.check(v, p, e);
  if (tag) return;
  const parsed = validate(numericSignal, v);
  if (parsed.ok) {
    const s = parsed.value;
    if (s.kind === "hp" ? s.unit !== "hp" : s.unit !== "probability" || Math.abs(s.value) > 1 || (s.se ?? 0) > 1) e.push(`${p}: signal unit/range mismatch`);
  }
});
/** Source denominators stay separate: external samples never count as local run evidence. */
export const reflexSourceSchema = refine(object({
  source: text(120), path: text(1000),
  sha256: refine(text(64, 64), (v, e) => { if (!/^[a-f0-9]{64}$/.test(v)) e.push("source.sha256: lowercase SHA256 required"); }),
  game_version: text(100), retrieved_at: text(10, 10),
  sample: object({ runs: count, players: nullable(count), selection: text(2000) }),
  url: optional(text(2000)), license: optional(text(1000)),
}), (v, e) => {
  if (v.source !== "own" && !/^external:[A-Za-z0-9_.-]+$/.test(v.source)) e.push("source: own or external:<name> required");
  if (v.path.startsWith("/") || v.path.includes("\\") || v.path.split("/").some(p => !p || p === ".." || p === ".")) e.push("source.path: repository-relative frozen evidence required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.retrieved_at) || !Number.isFinite(Date.parse(v.retrieved_at))
    || new Date(v.retrieved_at).toISOString().slice(0, 10) !== v.retrieved_at) e.push("source.retrieved_at: valid YYYY-MM-DD required");
  if (v.source !== "own") {
    try { const url = new URL(v.url ?? ""); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw Error(); }
    catch { e.push("external source: public HTTP URL required"); }
  } else if (v.sample.runs < 1) e.push("own source: at least one local run required");
});
export type ReflexSource = Infer<typeof reflexSourceSchema>;
export const reflexEntrySchema = refine(object({
  schema: literal("reflex-entry-v1"), id, version: positiveCount, applies_to: enumeration("combat_line", "card_pick", "potion", "rest", "shop"),
  predicate: predicateSchema, signal, label_en: label,
  evidence: object({ observations: array(observationSchema), n_support: count, n_contradict: count }), confidence: probability, scope,
  directions: optional(ids), cores: optional(ids), combos: optional(ids), source_experience: array(id),
  sources: optional(array(reflexSourceSchema, 1, 30)),
}), (v, e) => {
  const external = v.sources?.some(s => s.source.startsWith("external:")) === true;
  if (!v.evidence.observations.length && !external) e.push("evidence: local observations or attributed external evidence required");
  if (!v.source_experience.length && !external) e.push("source_experience: local experience or attributed external evidence required");
  if (v.sources?.some(s => s.source === "own") && !v.evidence.observations.length) e.push("own source: local observations required");
  if (v.evidence.n_support + v.evidence.n_contradict < 1) e.push("evidence: at least one supporting or contradicting observation");
  unique(v.scope.ascensions.map(String), "scope.ascensions", e);
  unique(v.source_experience, "source_experience", e);
  if (v.cores) unique(v.cores, "cores", e);
  if (v.combos) unique(v.combos, "combos", e);
  if (v.signal.kind === "contrast") {
    if (v.applies_to !== "card_pick") e.push("contrast: card_pick only");
    if (!cardPickDeckPredicate(v.predicate)) e.push("contrast: every branch requires candidate identity and deck/combo condition");
    if (Math.abs(v.confidence - contrastConfidence(v.signal.value, v.signal.se, v.signal.n.clusters)) > 1e-8) e.push("contrast: confidence must be derived from effect, SE and independent run count");
    if (new Set(v.evidence.observations.map(o => o.run_id)).size < 2) e.push("contrast: evidence requires multiple independent runs");
  }
});
export type ReflexEntry = Infer<typeof reflexEntrySchema>;
export const validateReflexEntry = (v: unknown): Result<ReflexEntry> => validate(reflexEntrySchema, v);

export const VOCAB_DIMENSIONS = ["enemy_threat", "card_role", "line_tempo", "resource_cost", "potion_category"] as const;
const members = refine(array(object({ id, label_en: label, evidence: observations })), (v, e) => unique(v.map(m => m.id), "vocab members", e));
export const reflexVocabSchema = object({
  schema: literal("reflex-vocab-v1"), character: characterSchema,
  dimensions: object({ enemy_threat: members, card_role: members, line_tempo: members, resource_cost: members, potion_category: members }),
});
export type ReflexVocab = Infer<typeof reflexVocabSchema>;
export const validateReflexVocab = (v: unknown): Result<ReflexVocab> => validate(reflexVocabSchema, v);

const templateComponent = object({ id, kind: enumeration("card", "relic"), upgraded: optional(boolean) });
const component = object({ kind: enumeration("card", "relic"), id, count: positiveCount, upgraded: optional(boolean) });
const requirement = refine(object({ id, any: array(templateComponent, 1), count: positiveCount, distinct: optional(boolean), evidence: observations }), (v, e) => {
  unique(v.any.map(c => `${c.kind}:${c.id}:${c.upgraded ?? "any"}`), "requirement.any", e);
});
const evidencedComponent = object({ component, evidence: observations });
const ideal = object({
  components: array(object({ component, priority: count })), upgrade_priority: array(id), remove_priority: array(id),
});
const evidencedText = object({ text: text(2000), evidence: observations });
export const directionCardSchema = refine(object({
  schema: literal("direction-card-v1"), id, name: text(100), status: enumeration("candidate", "validated"), scope,
  core: array(requirement, 1), support: array(evidencedComponent), conflict: array(evidencedComponent),
  ideal: object({ act1_end: ideal, act2_end: ideal, pre_f48: ideal }),
  matchups: array(object({ target_id: id, actual: object({ wins: count, losses: count, runs: ids }),
    projection: nullable(object({ win: estimate, trust: enumeration("trusted", "low_optimistic", "low_pessimistic", "unknown") })) })),
  pivot_signals: array(object({ text: text(2000), predicate: optional(predicateSchema), evidence: observations })),
  failure_modes: array(evidencedText), evidence: observations, counterexamples: array(observationSchema), confidence: probability,
}), (v, e) => {
  unique(v.scope.ascensions.map(String), "scope.ascensions", e);
  unique(v.matchups.map(m => m.target_id), "matchups", e);
  for (const m of v.matchups) if (m.actual.wins + m.actual.losses !== m.actual.runs.length) e.push("matchups: wins + losses must equal evidence run count");
  unique(v.core.map(r => r.id), "core", e);
  for (const [name, components] of Object.entries({ support: v.support, conflict: v.conflict })) unique(components.map(c => `${c.component.kind}:${c.component.id}`), name, e);
  for (const checkpoint of Object.values(v.ideal)) {
    unique(checkpoint.components.map(c => `${c.component.kind}:${c.component.id}`), "ideal.components", e);
    unique(checkpoint.upgrade_priority, "upgrade_priority", e); unique(checkpoint.remove_priority, "remove_priority", e);
  }
});
export type DirectionCard = Infer<typeof directionCardSchema>;
export const validateDirectionCard = (v: unknown): Result<DirectionCard> => validate(directionCardSchema, v);

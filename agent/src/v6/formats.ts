import { array, boolean, custom, enumeration, id, literal, nullable, number, object, optional, plain, record, refine, safeKey, text, validate, type Infer, type Result } from "./schema.js";
import type { JsonValue } from "../core/util/json.js";
import { predicateSchema } from "./predicate.js";

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
const metricSnapshot = custom<JsonValue>((value, path, issues) => {
  let nodes = 0;
  const walk = (v: unknown, depth: number): boolean => {
    if (++nodes > 20000 || depth > 16) return false;
    if (v === null || typeof v === "boolean") return true;
    if (typeof v === "number") return Number.isFinite(v);
    if (typeof v === "string") return v.length <= 4000;
    if (Array.isArray(v)) return v.length <= 1000 && v.every(x => walk(x, depth + 1));
    return plain(v) && Object.keys(v).length <= 1000 && Object.entries(v).every(([k, x]) => safeKey(k) && walk(x, depth + 1));
  };
  if (!walk(value, 0)) issues.push(`${path}: bounded JSON metric snapshot required`);
});
export const projectionEntrySchema = object({
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
  direction_value: optional(nullable(probability)), combo_metrics: optional(nullable(metricSnapshot)),
});
export type ProjectionEntry = Infer<typeof projectionEntrySchema>;
export function validateProjectionEntry(v: unknown): Result<ProjectionEntry> {
  return validate(refine(projectionEntrySchema, (entry, e) => {
    if (entry.win === null && entry.win_tier !== "unknown") e.push("win_tier: missing estimate must remain unknown");
    if (entry.paired_delta === null && entry.delta_tier !== "unknown") e.push("delta_tier: missing paired estimate must remain unknown");
    if (entry.combo_id === undefined && [entry.combo_source, entry.win_complete, entry.win_incomplete, entry.incomplete_source, entry.expected_win, entry.combo_metrics].some(v => v !== undefined)) e.push("combo_id: required for combo measurements");
    if (entry.combo_id !== undefined && entry.combo_source === undefined) e.push("combo_source: required for a combo row");
    if (entry.win_incomplete != null && entry.incomplete_source !== "empirical") e.push("win_incomplete: needs empirical source");
    if (entry.expected_win != null && (entry.availability.take === null || entry.win_complete == null || entry.win_incomplete == null)) e.push("expected_win: missing completion or conditional win estimates");
  }), v);
}

const numericSignal = object({ kind: enumeration("hp", "win"), value: number(), se: optional(number(0)), unit: enumeration("hp", "probability") });
const tagSignal = object({ kind: literal("tag"), value: id, unit: literal("label") });
const signal = custom<Infer<typeof numericSignal> | Infer<typeof tagSignal>>((v, p, e) => {
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
export const reflexEntrySchema = refine(object({
  schema: literal("reflex-entry-v1"), id, version: positiveCount, applies_to: enumeration("combat_line", "card_pick", "potion", "rest", "shop"),
  predicate: predicateSchema, signal, label_en: label,
  evidence: object({ observations, n_support: count, n_contradict: count }), confidence: probability, scope,
  directions: optional(ids), cores: optional(ids), combos: optional(ids), source_experience: array(id, 1),
}), (v, e) => {
  if (v.evidence.n_support + v.evidence.n_contradict < 1) e.push("evidence: at least one supporting or contradicting observation");
  unique(v.scope.ascensions.map(String), "scope.ascensions", e);
  unique(v.source_experience, "source_experience", e);
  if (v.cores) unique(v.cores, "cores", e);
  if (v.combos) unique(v.combos, "combos", e);
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

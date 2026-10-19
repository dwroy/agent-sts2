/** Strict, character-scoped build contracts. Contains no game knowledge or inferred defaults. */
import { array, boolean, custom, enumeration, id, literal, nullable, number, object, optional, plain, record, refine, text, validate, type Infer } from "./schema.js";
import { characterSchema, observationSchema } from "./formats.js";
import { predicateSchema } from "./predicate.js";

const ids = refine(array(id), (v, e) => { if (new Set(v).size !== v.length) e.push("duplicate IDs"); });
const evidence = array(observationSchema, 1);
const note = object({ text: text(4000), evidence });
/** n is in the declared sampling unit; zero observations must stay unknown. */
export const buildStatisticSchema = refine(object({
  n: number(0, 1e9, true), unit: text(), method: text(4000), value: nullable(number()),
  p25: optional(nullable(number())), p75: optional(nullable(number())), se: nullable(number(0)),
  distribution: array(object({ label: text(), count: number(0, 1e9, true) })),
  evidence: array(observationSchema), unknown_reason: nullable(text(4000)), small_sample: boolean,
}), (v, e) => {
  if (v.n === 0 && (v.value !== null || !v.unknown_reason || v.evidence.length)) e.push("unobserved statistic must be null with reason and no evidence");
  if (v.value === null && !v.unknown_reason) e.push("unknown statistic needs a reason");
  if (v.n > 0 && !v.evidence.length) e.push("observed statistic needs evidence");
  if (v.p25 != null && v.p75 != null && v.p25 > v.p75) e.push("statistic quartiles reversed");
});
/** Explicit slots prevent silently omitting the measurements required by plan section 6. */
export const buildObservedMetricNames = [
  "dpr_boss", "dpr_elite", "dpr_normal", "dpr_turns_1_3", "dpr_turns_4_6", "dpr_turns_7_plus",
  "peak_turn_damage", "aoe_damage", "block_per_turn", "hp_loss_per_turn", "startup_turn",
  "startup_energy", "startup_draw", "first_completed_floor", "formed_runs", "cleared_runs", "mean_reached_floor",
  "chain_reached", "chain_won", "chain_win_rate", "formation_rate", "deck_size_min", "deck_size_max",
  "deck_size_scaling", "potion_dependency", "sl_dependency", "key_relic_dependency",
] as const;
const observedFields = Object.fromEntries(buildObservedMetricNames.map(k => [k, buildStatisticSchema])) as Record<typeof buildObservedMetricNames[number], typeof buildStatisticSchema>;
const bossHistory = object({ reached: buildStatisticSchema, won: buildStatisticSchema, win_rate: buildStatisticSchema });
const count = number(0, 1e9, true);
const optionalCount = nullable(count);
const bossCounts = object({ reached: count, won: count });
/** Raw independent-run counts, before adjustment or shrinkage. Null means unobserved. */
export const buildRawCountsSchema = refine(object({
  runs: count, formed_runs: optionalCount, cleared_runs: optionalCount,
  chain_reached: optionalCount, chain_won: optionalCount, bosses: record(bossCounts),
}), (v, e) => {
  for (const key of ["formed_runs", "cleared_runs", "chain_reached", "chain_won"] as const)
    if (v[key] !== null && v[key]! > v.runs) e.push(`${key}: count exceeds independent runs`);
  if (v.chain_won !== null && v.chain_reached !== null && v.chain_won > v.chain_reached) e.push("chain wins exceed reached");
  for (const b of Object.values(v.bosses)) if (b.won > b.reached || b.reached > v.runs) e.push("boss counts inconsistent with independent runs");
});
const outcomes = { win_rate: buildStatisticSchema, hp_loss: buildStatisticSchema, completion_turns: buildStatisticSchema };
/** Version and observed ascension are provenance, never grouping keys for estimates. */
export const buildMetricSchema = refine(object({
  attempt: enumeration("first", "including_sl"), target_ascension: number(0, 100, true),
  sources: array(object({ version: nullable(text()), ascension: nullable(number(0, 100, true)),
    run_ids: ids, counts: buildRawCountsSchema })),
  raw_counts: buildRawCountsSchema,
  observed: object(observedFields), bosses: record(bossHistory),
  availability: array(object({ card: id, act: number(1, 10, true), offered_rate: buildStatisticSchema })),
  simulation: array(object({ target: id, entry_hp: nullable(number(1)), ...outcomes, dpr: buildStatisticSchema,
    trust: enumeration("high", "medium", "low", "unknown"), labels: array(text()) })),
  regression: array(object({ target: id, ...outcomes,
    /** One common A-centered slope per outcome across all combo/target intercepts. */
    ascension_offset: object(outcomes), method: text(4000), labels: array(text()) })),
  shrinkage: array(object({ basis: enumeration("observed", "simulation", "regression"), target: nullable(id), metric: id,
    raw: buildStatisticSchema, direction: buildStatisticSchema, estimate: buildStatisticSchema,
    combo_weight: nullable(number(0, 1)), method: text(4000), labels: array(text()) })),
}), (v, e) => {
  const runs = v.sources.flatMap(s => s.run_ids);
  if (new Set(runs).size !== runs.length) e.push("source runs must be disjoint within attempt");
  if (runs.length !== v.raw_counts.runs) e.push("pooled run count does not reconcile sources");
  if (new Set(v.sources.map(s => JSON.stringify([s.version, s.ascension]))).size !== v.sources.length) e.push("duplicate provenance group");
  for (const s of v.sources) if (s.counts.runs !== s.run_ids.length) e.push("source run count does not reconcile run IDs");
  for (const key of ["formed_runs", "cleared_runs", "chain_reached", "chain_won"] as const) {
    const values = v.sources.map(s => s.counts[key]);
    const total = values.some(x => x === null) ? null : values.reduce<number>((a, b) => a + b!, 0);
    if (v.raw_counts[key] !== total) e.push(`${key}: pooled raw count does not reconcile sources`);
  }
  const targets = new Set([...Object.keys(v.raw_counts.bosses), ...v.sources.flatMap(s => Object.keys(s.counts.bosses))]);
  for (const target of targets) for (const key of ["reached", "won"] as const) {
    const total = v.sources.reduce((n, s) => n + (s.counts.bosses[target]?.[key] ?? 0), 0);
    if (v.raw_counts.bosses[target]?.[key] !== total) e.push(`${target}: pooled boss ${key} does not reconcile sources`);
  }
  for (const group of [v.simulation, v.regression]) {
    if (new Set(group.map(s => s.target)).size !== group.length) e.push("duplicate adjusted target");
    for (const s of group) {
      if (s.win_rate.value !== null && (s.win_rate.value < 0 || s.win_rate.value > 1)) e.push("adjusted rate outside 0..1; retain unknown, do not clamp");
      for (const key of ["hp_loss", "completion_turns"] as const)
        if (s[key].value !== null && s[key].value < 0) e.push(`negative adjusted ${key}`);
    }
  }
  for (const s of v.simulation) if (s.entry_hp === null
    && [s.win_rate, s.hp_loss, s.completion_turns, s.dpr].some(x => x.n !== 0 || x.value !== null))
    e.push("missing simulation entry HP requires unknown outcomes with n=0");
  if (new Set(v.shrinkage.map(s => `${s.basis}:${s.target}:${s.metric}`)).size !== v.shrinkage.length) e.push("duplicate shrinkage measurement");
  for (const s of v.shrinkage) {
    if (s.estimate.value !== null && (s.raw.value === null || s.direction.value === null || s.combo_weight === null)) e.push("known shrinkage needs raw, direction and weight");
    if (s.estimate.value !== null && s.combo_weight !== null && s.raw.value !== null && s.direction.value !== null
      && Math.abs(s.estimate.value - (s.combo_weight * s.raw.value + (1 - s.combo_weight) * s.direction.value)) > 1e-8)
      e.push("shrinkage estimate does not reconcile weighted components");
    if ((s.metric === "win_rate" || s.metric.endsWith("_rate")) && [s.raw, s.direction, s.estimate].some(x => x.value !== null && (x.value < 0 || x.value > 1))) e.push("shrinkage rate outside 0..1");
  }
});
export type BuildMetric = Infer<typeof buildMetricSchema>;
const fitNote = object({ text: text(4000), evidence, when: nullable(predicateSchema) });
const concreteCard = object({ id, count: number(1, 100, true), upgraded: boolean });
const alternativeCard = refine(object({ any_of: array(id, 1, 100), count: number(1, 100, true), upgraded: boolean }), (v, e) => {
  if (new Set(v.any_of).size !== v.any_of.length) e.push("duplicate card alternatives");
});
type CardRequirement = Infer<typeof concreteCard> | Infer<typeof alternativeCard>;
export const buildCardRequirementSchema = custom<CardRequirement>((v, p, e) => {
  (plain(v) && Object.hasOwn(v, "any_of") ? alternativeCard : concreteCard).check(v, p, e);
});
const combo = object({ id, types: refine(array(id, 1), (v, e) => { if (new Set(v).size !== v.length) e.push("duplicate combo types"); }),
  boss: nullable(id), cards: array(buildCardRequirementSchema, 1), prerequisites: nullable(predicateSchema), metrics: array(buildMetricSchema, 2, 2),
  fits: object({ bosses_positive: array(fitNote), bosses_negative: array(fitNote), routes: array(fitNote), situations: array(fitNote) }),
  evidence, confidence: enumeration("low", "med", "high"), linked_experience: ids,
});
export const buildCoreSchema = refine(object({ schema: literal("build-core-v1"), direction: id, name: text(),
  status: enumeration("candidate", "validated"), scope: object({ character: characterSchema, ascensions: array(number(0, 100, true), 1) }),
  card_pool: record(object({ roles: array(id, 1), contribution: text(4000), upgraded_matters: boolean, combos: ids, evidence })),
  combos: array(combo, 1), pivot_signals: array(note), failure_modes: array(note), linked_experience: ids, linked_reflex: ids,
}), (v, e) => {
  const combos = new Map(v.combos.map(c => [c.id, c]));
  if (combos.size !== v.combos.length) e.push("duplicate combo IDs");
  if (new Set(v.scope.ascensions).size !== v.scope.ascensions.length) e.push("duplicate ascensions");
  for (const c of v.combos) {
    if (new Set(c.metrics.map(m => m.attempt)).size !== 2) e.push(`${c.id}: require first and including_sl pooled metrics`);
    if (c.metrics.some(m => !v.scope.ascensions.includes(m.target_ascension))) e.push(`${c.id}: target outside applicability scope`);
    if (c.linked_experience.some(x => !v.linked_experience.includes(x))) e.push(`${c.id}: experience outside core links`);
    for (const r of c.cards) for (const card of "id" in r ? [r.id] : r.any_of) {
      if (!Object.hasOwn(v.card_pool, card)) e.push(`${c.id}: card outside pool: ${card}`);
      else if (!v.card_pool[card]!.combos.includes(c.id)) e.push(`${c.id}: missing reverse pool link: ${card}`);
    }
    for (const m of c.metrics) {
      for (const [name, stat] of Object.entries(m.observed)) {
        if (stat.value !== null && name !== "deck_size_scaling" && stat.value < 0) e.push(`${c.id}: negative observation: ${name}`);
        if (name.endsWith("_rate") && stat.value !== null && stat.value > 1) e.push(`${c.id}: rate outside 0..1`);
      }
      for (const b of Object.values(m.bosses)) {
        if (b.reached.value !== null && b.won.value !== null && (b.won.value < 0 || b.won.value > b.reached.value)) e.push(`${c.id}: boss wins outside reached count`);
        if (b.win_rate.value !== null && (b.win_rate.value < 0 || b.win_rate.value > 1)) e.push(`${c.id}: boss rate outside 0..1`);
      }
      const keys = m.availability.map(a => `${a.card}:${a.act}`);
      if (new Set(keys).size !== keys.length) e.push(`${c.id}: duplicate availability stratum`);
      if (m.availability.some(a => !c.cards.some(r => ("id" in r ? [r.id] : r.any_of).includes(a.card)))) e.push(`${c.id}: availability card outside combo`);
      if (m.availability.some(a => a.offered_rate.value !== null && (a.offered_rate.value < 0 || a.offered_rate.value > 1))) e.push(`${c.id}: offered rate outside 0..1`);
      if (new Set(m.simulation.map(s => s.target)).size !== m.simulation.length) e.push(`${c.id}: duplicate simulation target`);
      if (m.simulation.some(s => s.win_rate.value !== null && (s.win_rate.value < 0 || s.win_rate.value > 1))) e.push(`${c.id}: simulated rate outside 0..1`);
    }
  }
  for (const [card, p] of Object.entries(v.card_pool)) for (const c of p.combos) {
    if (!combos.get(c)?.cards.some(r => ("id" in r ? [r.id] : r.any_of).includes(card))) e.push(`${card}: dangling combo link: ${c}`);
  }
});
export type BuildCore = Infer<typeof buildCoreSchema>;
export type BuildCombo = BuildCore["combos"][number];
export const buildCoreFileSchema = refine(object({ schema: literal("build-cores-v1"), character: characterSchema, entries: array(buildCoreSchema) }), (v, e) => {
  if (new Set(v.entries.map(c => c.direction)).size !== v.entries.length) e.push("duplicate directions");
  if (v.entries.some(c => c.scope.character !== v.character)) e.push("cross-character core");
});
export const validateBuildCore = (v: unknown) => validate(buildCoreSchema, v);
export const validateBuildCoreFile = (v: unknown) => validate(buildCoreFileSchema, v);

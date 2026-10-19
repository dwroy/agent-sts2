/** Strict, character-scoped build contracts. Contains no game knowledge or inferred defaults. */
import { array, boolean, custom, enumeration, id, literal, nullable, number, object, optional, plain, record, refine, text, validate, type Infer } from "./schema.js";
import { characterSchema, observationSchema } from "./formats.js";

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
const metrics = object({
  ascension: number(0, 100, true), attempt: enumeration("first", "including_sl"), version: text(),
  observed: object(observedFields), bosses: record(bossHistory),
  availability: array(object({ card: id, act: number(1, 10, true), offered_rate: buildStatisticSchema })),
  simulation: array(object({ target: id, entry_hp: number(1), win_rate: buildStatisticSchema, dpr: buildStatisticSchema,
    trust: enumeration("high", "medium", "low", "unknown"), labels: array(text()) })),
});
const concreteCard = object({ id, count: number(1, 100, true), upgraded: boolean });
const alternativeCard = refine(object({ any_of: array(id, 1, 100), count: number(1, 100, true), upgraded: boolean }), (v, e) => {
  if (new Set(v.any_of).size !== v.any_of.length) e.push("duplicate card alternatives");
});
type CardRequirement = Infer<typeof concreteCard> | Infer<typeof alternativeCard>;
export const buildCardRequirementSchema = custom<CardRequirement>((v, p, e) => {
  (plain(v) && Object.hasOwn(v, "any_of") ? alternativeCard : concreteCard).check(v, p, e);
});
const combo = object({ id, types: refine(array(id, 1), (v, e) => { if (new Set(v).size !== v.length) e.push("duplicate combo types"); }),
  boss: nullable(id), cards: array(buildCardRequirementSchema, 1), metrics: array(metrics, 1),
  fits: object({ bosses_positive: array(note), bosses_negative: array(note), routes: array(note), situations: array(note) }),
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
    const strata = c.metrics.map(m => `${m.ascension}:${m.attempt}:${m.version}`);
    if (new Set(strata).size !== strata.length) e.push(`${c.id}: duplicate metric strata`);
    if (c.metrics.some(m => !v.scope.ascensions.includes(m.ascension))) e.push(`${c.id}: metrics outside ascension scope`);
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

/** Offline, character-local observations. No supply simulation or inferred game constants. */
import { array, enumeration, literal, nullable, number, object, record, refine, text, type Infer } from "./schema.js";
import { characterSchema } from "./formats.js";

const count = number(0, Number.MAX_SAFE_INTEGER, true);
const rate = number(0, 1);
const ts = refine(text(100), (v, e) => {
  if (!Number.isFinite(Date.parse(v)) || new Date(v).toISOString() !== v) e.push("canonical UTC timestamp required");
});
const sha = refine(text(64), (v, e) => { if (!/^[a-f0-9]{64}$/.test(v)) e.push("invalid SHA256"); });
const rawSource = object({ offset: count, bytes: count, sha256: sha });
export const v6AppearanceSourceSchema = enumeration("reward", "shop");
export const v6OpportunityKindSchema = enumeration("reward", "shop", "upgrade", "remove");
const cardSchema = object({ source: v6AppearanceSourceSchema, rarity: text(), card_id: text(),
  n: count, n_runs: count, appearances: count, upgraded_appearances: count,
  probability: nullable(rate), se: nullable(number(0)), wilson95: nullable(array(rate, 2, 2)),
  mean_ascension: nullable(number(0, 100)), probability_a10: nullable(rate), regression_se: nullable(number(0)),
  regression_reason: nullable(text(4000)), unknown_reason: nullable(text(4000)) });
const remainingSchema = object({ from_floor: count, target_floor: count, kind: v6OpportunityKindSchema,
  n: count, median: nullable(number(0)), distribution: array(object({ count, n: number(1, Number.MAX_SAFE_INTEGER, true) }), 0, 10000),
  samples: array(object({ run_id: text(), count }), 0, 100000), censored_run_ids: array(text(), 0, 100000),
  incomplete_run_ids: array(text(), 0, 100000), unknown_reason: nullable(text(4000)) });

export const v6AppearanceSchema = refine(object({ schema: literal("v6-appearance-v1"), character: characterSchema,
  cutoff: ts, design: literal("observational"), attempt: literal("first"),
  interval: literal("from_floor < opportunity.floor < target_floor"),
  runs: array(object({ run_id: text(), ascension: number(0, 100, true), version: nullable(text()), ended: ts, source: rawSource }), 0, 100000),
  evidence: object({ path: text(4000), bytes: count, sha256: sha, records: count }),
  strata: array(object({ source: v6AppearanceSourceSchema, n: count, n_runs: count, run_ids: array(text(), 0, 100000), excluded: count }), 2, 2),
  cards: array(cardSchema, 0, 100000),
  ascension_offsets: array(object({ rarity: text(), offset: nullable(number()), se: nullable(number(0)), n_runs: count,
    unknown_reason: nullable(text(4000)) }), 0, 10000),
  remaining: array(remainingSchema, 0, 100000), excluded: record(count), unknown_rarity_cards: array(text(), 0, 10000),
  labels: array(text(), 0, 100), limitations: array(text(4000), 1, 100),
}), (v, e) => {
  const runs = new Map(v.runs.map(r => [r.run_id, r]));
  const unique = (values: unknown[]) => new Set(values.map(x => JSON.stringify(x))).size === values.length;
  if (runs.size !== v.runs.length || v.runs.some(r => r.ended > v.cutoff)) e.push("appearance run scope mismatch");
  if (!unique(v.strata.map(s => s.source))) e.push("duplicate appearance source");
  for (const s of v.strata) if (s.n_runs !== s.run_ids.length || !unique(s.run_ids) || s.n_runs > s.n
    || s.run_ids.some(id => !runs.has(id))) e.push("invalid appearance denominator provenance");
  if (!unique(v.cards.map(c => [c.source, c.card_id]))) e.push("duplicate appearance card identity");
  for (const c of v.cards) {
    const s = v.strata.find(s => s.source === c.source)!;
    if (c.n !== s.n || c.n_runs !== s.n_runs || c.upgraded_appearances > c.appearances || c.appearances > c.n
      || (c.n === 0 ? c.probability !== null || c.unknown_reason === null || c.mean_ascension !== null
        : c.probability === null || Math.abs(c.probability - c.appearances / c.n) > 1e-12 || c.unknown_reason !== null || c.mean_ascension === null)
      || c.n_runs < 2 && c.se !== null || c.probability_a10 === null && c.regression_se !== null
      || (c.probability_a10 === null) !== (c.regression_reason !== null)
      || c.wilson95 && c.wilson95[0]! > c.wilson95[1]!) e.push("invalid appearance rate/count/unknown");
  }
  if (!unique(v.ascension_offsets.map(r => r.rarity))) e.push("duplicate ascension offset");
  if (v.ascension_offsets.some(r => (r.offset === null) !== (r.unknown_reason !== null) || r.offset === null && r.se !== null)) e.push("invalid ascension unknown");
  if (!unique(v.remaining.map(r => [r.from_floor, r.target_floor, r.kind]))) e.push("duplicate remaining interval");
  for (const r of v.remaining) {
    const ids = [...r.samples.map(s => s.run_id), ...r.censored_run_ids, ...r.incomplete_run_ids];
    const values = r.samples.map(s => s.count).sort((a, b) => a - b);
    const median = values.length ? (values[Math.floor((values.length - 1) / 2)]! + values[Math.floor(values.length / 2)]!) / 2 : null;
    if (r.target_floor <= r.from_floor || !unique(ids) || ids.some(id => !runs.has(id)) || r.n !== r.samples.length
      || r.median !== median || (r.n === 0) !== (r.unknown_reason !== null)
      || !unique(r.distribution.map(d => d.count)) || r.distribution.reduce((n, d) => n + d.n, 0) !== r.n
      || r.distribution.some(d => values.filter(c => c === d.count).length !== d.n)) e.push("invalid remaining distribution/provenance");
  }
});
export type V6Appearance = Infer<typeof v6AppearanceSchema>;
export type V6AppearanceCard = V6Appearance["cards"][number];
export type V6RemainingOpportunity = V6Appearance["remaining"][number];
export type V6AppearanceSource = Infer<typeof v6AppearanceSourceSchema>;
export type V6OpportunityKind = Infer<typeof v6OpportunityKindSchema>;

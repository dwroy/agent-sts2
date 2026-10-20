import { expect, it } from "vitest";
import { contrastConfidence, contrastInterval } from "../src/v6/contrast-statistics.js";
import { validateReflexEntry } from "../src/v6/formats.js";
import { cardPickDeckPredicate, evaluatePredicate, validatePredicate } from "../src/v6/predicate.js";
import { contrastFixture } from "./v6-reflex-contrast-fixture.js";
import { reflex } from "./v6-fixtures.js";
import { vocab } from "./v6-fixtures.js";
import { validateV6Draft } from "../src/v6/draft.js";

it("computes statistical confidence from run count and clustered SE using independent closed-form t distributions", () => {
  for (const t of [.1, .5, 1, 2, 10]) {
    expect(contrastConfidence(t, 1, 2)).toBeCloseTo(2 / Math.PI * Math.atan(t), 11);
    expect(contrastConfidence(t, 1, 3)).toBeCloseTo(t / Math.sqrt(t * t + 2), 11);
    expect(contrastConfidence(-t, 1, 3)).toBe(contrastConfidence(t, 1, 3));
  }
  expect(contrastInterval(0, 1, 10).upper).toBeCloseTo(2.2621571628, 8);
  expect(contrastInterval(0, 1, 20).upper).toBeCloseTo(2.0930240544, 8);
  expect(contrastConfidence(4, 1, 20)).toBeGreaterThan(contrastConfidence(4, 1, 3));
  expect(contrastConfidence(4, 1, 20)).toBeGreaterThan(contrastConfidence(4, 2, 20));
  expect(contrastConfidence(0, 1, 20)).toBe(0);
  for (const args of [[1, 0, 20], [1, 1, 1], [NaN, 1, 20]]) expect(contrastConfidence(...args as [number, number, number])).toBeNaN();
});

it("adds a strict observational contrast without changing legacy reflex contracts", () => {
  const entry = contrastFixture();
  expect(validateReflexEntry(reflex).ok).toBe(true);
  expect(validateReflexEntry(entry)).toEqual({ ok: true, value: entry });
  const s = entry.signal; if (s.kind !== "contrast") throw new Error("fixture");
  for (const change of [
    { confidence: .5 }, { applies_to: "combat_line" }, { predicate: { op: "eq", field: "card.id", value: "TEST_CARD" } },
    { evidence: { ...entry.evidence, observations: [{ run_id: "ONE_RUN", floor: 8 }, { run_id: "ONE_RUN", floor: 9 }] } },
    { signal: { ...s, design: "causal" } }, { signal: { ...s, se: 0 } }, { signal: { ...s, unit: "turns" } },
    { signal: { ...s, n: { ...s.n, clusters: 1 } } }, { signal: { ...s, n: { ...s.n, clusters: 100 } } },
    { signal: { ...s, baseline: { ...s.baseline, control: "all_other_decks" } } },
    { signal: { ...s, uncertainty: { ...s.uncertainty, cluster: "turn" } } },
    { signal: { ...s, uncertainty: { ...s.uncertainty, interval: { ...s.uncertainty.interval, lower: -4 } } } },
    { signal: { ...s, audit: { ...s.audit, sha256: "unknown" } } },
  ]) expect(validateReflexEntry({ ...entry, ...change }).ok, JSON.stringify(change)).toBe(false);
  expect(validateReflexEntry(contrastFixture(.1)).ok).toBe(true); // Stored unknown-sign evidence remains available for audit.
  const overflow = contrastFixture(0);
  if (overflow.signal.kind === "contrast") Object.assign(overflow.signal.uncertainty.interval, { lower: -1e308, upper: 1e308 });
  expect(validateReflexEntry(overflow).ok).toBe(false);
});

it("requires deck context in every branch, keeping quantified deck cards distinct from the offered candidate", () => {
  const entry = contrastFixture(), candidate = { op: "eq", field: "card.id", value: "TEST_CARD" } as const;
  const deck = { op: "any", field: "player.deck", arg: { op: "and", args: [
    { op: "eq", field: "card.id", value: "TEST_ANCHOR" }, { op: "eq", field: "card.upgraded", value: true }] } } as const;
  const parse = (v: unknown) => { const r = validatePredicate(v); if (!r.ok) throw new Error(r.issues.join()); return r.value; };
  expect(cardPickDeckPredicate(parse(deck))).toBe(false);
  expect(cardPickDeckPredicate(parse({ op: "or", args: [entry.predicate, candidate] }))).toBe(false);
  const p = parse({ op: "and", args: [candidate, deck] });
  expect(cardPickDeckPredicate(p)).toBe(true);
  expect(evaluatePredicate(p, { card: { id: "TEST_CARD" }, player: { deck: [{ id: "TEST_ANCHOR", upgraded: true }] } })).toBe(true);
  expect(evaluatePredicate(p, { card: { id: "TEST_CARD" }, player: { deck: [{ id: "TEST_ANCHOR", upgraded: false }, { id: "OTHER", upgraded: true }] } })).toBe(false);
  expect(evaluatePredicate(p, { card: { id: "TEST_CARD" } })).toBe(null);
});

it("reconciles observational draft counts and uncertainty with the published contrast", () => {
  const entry = contrastFixture(), s = entry.signal;
  if (s.kind !== "contrast") throw new Error("fixture");
  const context = { character: "silent" as const, experienceIds: entry.source_experience, directionIds: ["TEST_A"],
    runIds: [...entry.evidence.observations.map(o => o.run_id), "FIXTURE_RUN"] };
  const draft = { schema: "v6-reflex-draft-v1", character: "silent", vocab,
    reflex: { schema: "reflex-file-v1", character: "silent", entries: [entry] },
    coverage: entry.source_experience.map(experience_id => ({ experience_id, status: "converted", reflex_ids: [entry.id], directions: [], reason: "Synthetic contract fixture" })),
    metrics: [{ reflex_id: entry.id, n: s.n.take + s.n.not_take, method: "Synthetic run-cluster fixture", design: "observational",
      effect_size: s.value, se: s.se, frequency: { n: 40, total: 100 }, evidence: entry.evidence.observations }],
    missing_fields: [], limitations: ["Synthetic data only"] };
  expect(validateV6Draft("reflex", draft, context)).toEqual({ ok: true, value: draft });
  for (const changed of [{ n: 1 }, { design: "paired" }, { se: 2 }, { effect_size: 4 }]) {
    const d = structuredClone(draft); Object.assign(d.metrics[0]!, changed);
    expect(validateV6Draft("reflex", d, context).ok).toBe(false);
  }
});

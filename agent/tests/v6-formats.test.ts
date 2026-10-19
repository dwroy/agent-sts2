import { describe, expect, it } from "vitest";
import { validateDirectionCard, validateDirectionWeights, validatePotionDirection, validateProjectionEntry, validateReflexEntry, validateReflexVocab } from "../src/v6/formats.js";
import { evaluatePredicate, matchesPredicate, validatePredicate } from "../src/v6/predicate.js";
import { direction, directionContext, potion, predicate, projection, reflex, vocab, weights } from "./v6-fixtures.js";

describe("V6 strict format contracts", () => {
  const formats = [
    ["direction-weights-v1", (v: unknown) => validateDirectionWeights(v, directionContext), weights],
    ["potion-direction-v1", validatePotionDirection, potion],
    ["projection-entry-v1", validateProjectionEntry, projection],
    ["reflex-entry-v1", validateReflexEntry, reflex],
    ["reflex-vocab-v1", validateReflexVocab, vocab],
    ["direction-card-v1", validateDirectionCard, direction],
  ] as const;
  it.each(formats)("%s accepts a fixed example without mutation; rejects wrong schema, fields and nonobjects", (_name, parse, fixture) => {
    const before = JSON.stringify(fixture);
    expect(parse(fixture).ok).toBe(true);
    expect(parse({ ...fixture, schema: "wrong" }).ok).toBe(false);
    expect(parse({ ...fixture, extra: 1 }).ok).toBe(false);
    expect(parse(null).ok).toBe(false);
    expect(parse([]).ok).toBe(false);
    expect(JSON.stringify(fixture)).toBe(before);
  });
  it("checks complete catalog, sum, observed override IDs, potion IDs, route, rest and future checkpoint", () => {
    for (const change of [
      { direction_weights: { TEST_A: 1 } }, { direction_weights: { TEST_A: .6, WRONG: .4 } },
      { direction_weights: { TEST_A: .8, TEST_B: .4 } }, { direction_weights: { TEST_A: NaN, TEST_B: .4 } },
      { ideal_overrides: { TEST_A: ["UNSEEN"] } }, { ideal_overrides: { WRONG: [] } },
      { potion_directions: [{ ...potion, potion: "UNSEEN" }] }, { potion_directions: [potion, potion] },
      { route: "invalid" }, { rest: "invalid" }, { checkpoint: 8 }, { checkpoint: 8.5 }, { reason: "x".repeat(501) },
    ]) expect(validateDirectionWeights({ ...weights, ...change }, directionContext).ok, JSON.stringify(change)).toBe(false);
    expect(validateDirectionWeights({ ...weights, ideal_overrides: { TEST_B: ["SEEN_CARD"] } }, directionContext).ok).toBe(true);
    expect(validateDirectionWeights(weights, { ...directionContext, catalog: {} }).ok).toBe(false);
    expect(validateDirectionWeights({ ...weights, direction_weights: JSON.parse('{"__proto__":1}') }, directionContext).ok).toBe(false);
  });
  it("rejects potion enums and unknown-as-zero projection inconsistencies", () => {
    expect(validatePotionDirection({ ...potion, tier: "best" }).ok).toBe(false);
    expect(validatePotionDirection({ ...potion, for: "any" }).ok).toBe(false);
    for (const change of [ { win: { value: 1.1, se: .1, n: 20 } }, { win: { value: .5, se: .1, n: 0 } },
      { win: { value: .5, se: -1, n: 20 } }, { win: null }, { paired_delta: null }, { deck_count_change: Infinity }, { trust: "safe" } ]) {
      expect(validateProjectionEntry({ ...projection, ...change }).ok).toBe(false);
    }
    const unknown = { ...projection, win: null, paired_delta: null, win_tier: "unknown", delta_tier: "unknown" };
    const r = validateProjectionEntry(unknown);
    expect(r.ok && r.value.win).toBe(null);
    expect(r.ok && r.value.paired_delta).toBe(null);
  });
  it("enforces evidence, scope, signal units, confidence, English labels and source references", () => {
    for (const change of [ { label_en: Array(13).fill("word").join(" ") }, { label_en: "中文" }, { confidence: 1.1 },
      { evidence: { ...reflex.evidence, observations: [] } }, { evidence: { ...reflex.evidence, n_support: 0 } },
      { evidence: { ...reflex.evidence, n_contradict: -1 } }, { scope: { ...reflex.scope, character: "other" } },
      { scope: { ...reflex.scope, ascensions: [] } }, { source_experience: [] },
      { signal: { kind: "win", value: 50, unit: "probability" } }, { signal: { kind: "hp", value: 1, unit: "probability" } },
      { predicate: { ...predicate, field: "player.secret" } },
    ]) expect(validateReflexEntry({ ...reflex, ...change }).ok, JSON.stringify(change)).toBe(false);
    expect(validateReflexEntry({ ...reflex, signal: { kind: "win", value: -.1, se: .02, unit: "probability" } }).ok).toBe(true);
    expect(validateReflexEntry({ ...reflex, signal: { kind: "tag", value: "TEST_TAG", unit: "label" } }).ok).toBe(true);
  });
  it("requires fixed vocabulary dimensions, unique members and observation evidence", () => {
    expect(validateReflexVocab({ ...vocab, dimensions: { ...vocab.dimensions, extra: [] } }).ok).toBe(false);
    expect(validateReflexVocab({ ...vocab, dimensions: { ...vocab.dimensions, card_role: [{ id: "TAG", label_en: "Tag", evidence: [] }] } }).ok).toBe(false);
    expect(validateReflexVocab({ ...vocab, dimensions: { ...vocab.dimensions, card_role: [...vocab.dimensions.card_role, ...vocab.dimensions.card_role] } }).ok).toBe(false);
  });
  it("requires direction evidence and ideal component counts; preserves actual/projection distinction", () => {
    for (const change of [ { core: [] }, { core: [direction.core[0], direction.core[0]] }, { evidence: [] }, { status: "approved" },
      { matchups: [{ target_id: "TEST_TARGET", actual: { wins: 1, losses: 0, runs: [] }, projection: null }] },
      { ideal: { ...direction.ideal, act1_end: { ...direction.ideal.act1_end, components: [{ component: { kind: "card", id: "TEST_CARD", count: 0 }, priority: 0 }] } } },
    ]) expect(validateDirectionCard({ ...direction, ...change }).ok).toBe(false);
    expect(validateDirectionCard({ ...direction, matchups: [{ target_id: "TEST_TARGET", actual: { wins: 1, losses: 0, runs: ["FIXTURE_RUN"] }, projection: null }] }).ok).toBe(true);
  });
});

describe("predicate whitelist and three-valued evaluation", () => {
  const context = { player: { hp: 10, block: 0, energy: 2, powers: { TEST_POWER: 3 } }, enemy: { intent_type: "TEST_INTENT", hits: 2, total_damage: 6 },
    option: { turn: { damage: 4 } }, card: { tags: ["TEST_TAG"] }, direction_weights: { TEST_A: .6 }, act: 1, floor: 8 };
  it("supports comparisons, AND, OR, NOT, existence, dynamic power/direction IDs and tag membership", () => {
    const predicates = [predicate, { op: "eq", field: "enemy.intent_type", value: "TEST_INTENT" },
      { op: "eq", field: "player.block", value: 0 }, { op: "gt", field: "player.powers.TEST_POWER", value: 2 },
      { op: "gte", field: "direction_weights.TEST_A", value: .6 }, { op: "contains", field: "card.tags", value: "TEST_TAG" },
      { op: "and", args: [predicate, { op: "exists", field: "option.turn.damage" }] },
      { op: "or", args: [{ op: "exists", field: "potion.tags" }, predicate] }, { op: "not", arg: { ...predicate, op: "lt" } } ];
    for (const p of predicates) expect(evaluatePredicate(p, context), JSON.stringify(p)).toBe(true);
    expect(evaluatePredicate({ op: "and", args: [predicate, { ...predicate, op: "lt" }] }, context)).toBe(false);
  });
  it("missing facts stay unknown under negation and never match", () => {
    const missing = { op: "not", arg: { op: "eq", field: "player.hp", value: 0 } };
    expect(evaluatePredicate(missing, {})).toBe(null);
    expect(matchesPredicate(missing, {})).toBe(false);
    expect(evaluatePredicate({ op: "exists", field: "player.hp" }, {})).toBe(false);
    expect(evaluatePredicate(predicate, { player: { hp: "10" } })).toBe(null);
    expect(evaluatePredicate(predicate, { player: { hp: NaN } })).toBe(null);
    expect(evaluatePredicate(predicate, Object.create(context))).toBe(null);
  });
  it("rejects paths/code/operators outside the whitelist, prototype traversal, wrong operand types and oversized trees", () => {
    for (const p of [ { ...predicate, field: "raw.api_key" }, { ...predicate, field: "player.constructor" },
      { ...predicate, field: "player.powers.__proto__" }, { ...predicate, field: "direction_weights.constructor" },
      { ...predicate, field: "player.hp.toString" }, { ...predicate, op: "eval" }, { ...predicate, value: "10" },
      { ...predicate, value: Infinity }, { ...predicate, code: "process.exit()" }, { op: "and", args: [] },
      { op: "and", args: Array(129).fill(predicate) }, { op: "gt", field: "enemy.intent_type", value: "TEST" },
    ]) { expect(validatePredicate(p).ok, JSON.stringify(p)).toBe(false); expect(evaluatePredicate(p, context)).toBe(null); }
    let deep: unknown = predicate;
    for (let i = 0; i < 20; i++) deep = { op: "not", arg: deep };
    expect(validatePredicate(deep).ok).toBe(false);
  });
});

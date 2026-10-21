import { expect, it, vi, afterEach } from "vitest";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { directionEvaluationFromProjection } from "../src/v6/projection-consumer.js";
import { directionSummaries, directionTask } from "../src/v6/direction-plan.js";
import { validateProjectionEntry } from "../src/v6/formats.js";
import { direction, req, state, FixedRunner, request, source } from "./v6-projection-fixture.js";
import { asArray, asRecord } from "../src/core/util/json.js";
import type { DeckRunRequest } from "../src/sim/build-sim-pool.js";
import type { DirectionWeights } from "../src/v6/formats.js";
import { detectReplan, freshReplanState } from "../src/v6/replan-triggers.js";
afterEach(() => vi.unstubAllEnvs());
it("keeps actual W3 target identities but never substitutes P=1 rows for completed-combo outcomes", async () => {
  const r = request(); r.phase = "act"; r.targets[0]!.id = "f17:TEST_BOSS";
  r.completionSources = [source({ skip: 1, take: 1 })];
  const resolve = r.completionSources[0]!.resolve;
  r.completionSources[0]!.resolve = c => { const out = resolve(c)!; out.combinations[0]!.id = "D:minimal"; return out; };
  const table = await new V6ProjectionEngine(new FixedRunner()).evaluate(r);
  const evaluation = directionEvaluationFromProjection(table, r.config, "skip");
  expect(evaluation.targets).toEqual([{ id: "f17:TEST_BOSS", kind: "current" }]);
  expect(evaluation.entries).toHaveLength(1);
  expect(evaluation.entries.every(e => validateProjectionEntry(e).ok)).toBe(true);
  const task = directionTask({ summaries: directionSummaries("silent", 10, [], [r.directions[0]!.core], null),
    entries: evaluation.entries, appearedCards: [], potionIds: [], floor: 5, current: null });
  const combo = asRecord(asArray(asRecord(asArray(task.build_cores)[0]).combos)[0]);
  expect(combo.id).toBe("D:minimal");
  expect(combo.evaluations).toBeUndefined();
  expect(task.targets).toEqual(["f17:TEST_BOSS"]);
  expect(task).not.toHaveProperty("direction_evaluation");
  expect(task).not.toHaveProperty("availability");
  expect(combo).toMatchObject({ completed_results: [], unknown_reasons: ["completed_core_cache_miss"] });
  expect(evaluation.entries[0]).toMatchObject({ combo_id: "D:minimal", target_id: "f17:TEST_BOSS", expected_win: 1, win_incomplete: null });
  expect(directionEvaluationFromProjection(table, { ...r.config, mode: "off" }, "skip")).toEqual({ id: "off", entries: [] });
});
it("reads W3 act and pick paired chain comparisons without marginal-error substitution", async () => {
  const r = request(); r.phase = "act";
  r.directions = [...r.directions, direction("D2")]; r.weights = { D: .9, D2: .1 };
  r.targets = [{ ...r.targets[0]!, id: "f48:B:then:f49:C", kind: "chain", floor: 48,
    secondBoss: "TEST_SECOND", secondFloor: 49 }];
  const resolve = r.completionSources[0]!.resolve;
  r.completionSources[0]!.resolve = c => { const out = resolve(c)!; out.combinations[0]!.id = `${c.direction.id}:minimal`; return out; };
  const prepare = r.prepare;
  r.prepare = (t, s) => { const p = prepare(t, s)!;
    p.input.continuation = { variants: [{ boss: "TEST_SECOND", count: 1, input: structuredClone(p.input) }],
      potions: [], source: "fixture", limitation: "fixed provider contract" }; return p; };
  class PairedRunner extends FixedRunner {
    override async run(input: DeckRunRequest) {
      const result = await super.run(input);
      return { ...result, outcomes: result.outcomes.map(deck => deck.map(samples => samples.map(o => o && ({ ...o,
        sequence: { firstWon: o.won, firstDied: !o.won, firstCapped: false, firstTimeUp: false,
          firstHp: o.won ? 20 : 0, firstPotions: [], secondBoss: "TEST_SECOND", firstTurns: 4,
          secondWon: o.won ? true : null, secondDied: o.won ? false : null,
          firstResources: o.won ? { hp: 20, revives: [], potionSlots: [] } : null,
          secondEntry: o.won ? { hp: 20, revives: [], potionSlots: [] } : null } })))) };
    }
  }
  const engine = new V6ProjectionEngine(new PairedRunner());
  const table = await engine.evaluate(r);
  const plan: DirectionWeights = { schema: "direction-weights-v1", direction_weights: { ...r.weights },
    potion_directions: [], route: "fixture", rest: "auto", checkpoint: 10, reason: "fixture" };
  const evaluation = directionEvaluationFromProjection(table, r.config, "skip", plan);
  const paired = table.act_evaluations.find(e => e.direction_id === "D2")!.versus.find(e => e.direction_id === "D")!.joint_paired_delta!;
  expect(paired).toBeTruthy();
  expect(evaluation.comparisons).toEqual([{ direction: "D2", leader: "D", mean: paired.mean, se: paired.se, n: paired.n }]);
  const pick = await engine.evaluate({ ...r, phase: "pick" });
  expect(pick.act_evaluations).toEqual([]);
  const official = pick.pick_direction_comparisons.filter(row => row.direction_id === "D2" && row.joint_paired_delta);
  expect(official.length).toBeGreaterThan(0);
  expect(directionEvaluationFromProjection(pick, r.config, "skip", plan).comparisons).toEqual(official.map(row => ({
    direction: "D2", leader: "D", ...row.joint_paired_delta!, optionId: row.option_id, labels: row.labels,
    offeredCore: row.option_id !== "skip" && pick.entries.some(e => e.option_id === row.option_id && e.direction_id === "D2" && e.direction_role === "core"),
  })));
  for (const row of pick.pick_direction_comparisons) row.known_mass = .5;
  expect(directionEvaluationFromProjection(pick, r.config, "skip", plan).comparisons).toEqual([]);
});

it("turns official complete pick pairs into one T3 and two independent-evaluation T2 observations", async () => {
  const r = request(); r.directions.push(direction("D2", [req("B")])); r.weights = { D: .9, D2: .1 };
  r.options[0]!.card = { id: "B", upgraded: false };
  r.targets = [{ ...r.targets[0]!, id: "chain", kind: "chain", floor: 48, secondBoss: "TEST_SECOND", secondFloor: 49 }];
  const supply = source({ skip: 1, take: 1 }), resolve = supply.resolve;
  supply.resolve = context => {
    const result = resolve(context)!;
    for (const combo of result.combinations) {
      combo.id = `${context.direction.id}:minimal`; combo.requirements = context.direction.id === "D2" ? [req("B")] : [req("A")];
      for (const sample of combo.samples) for (const option of context.options) sample.states[option.id] = state([context.direction.id === "D2" ? "B" : "A"]);
    }
    return result;
  };
  r.completionSources = [supply];
  const prepare = r.prepare;
  r.prepare = (target, completed) => { const input = prepare(target, completed)!;
    input.input.meta.enc = completed.cards.some(c => c.id === "B") ? "completed" : "general";
    input.input.continuation = { variants: [{ boss: "TEST_SECOND", count: 1, input: structuredClone(input.input) }], potions: [], source: "fixture", limitation: "fixed" }; return input;
  };
  class ChainRunner extends FixedRunner {
    override async run(input: DeckRunRequest) {
      const result = await super.run(input);
      return { ...result, outcomes: result.outcomes.map(deck => deck.map(samples => samples.map(o => o && ({ ...o,
        sequence: { firstWon: o.won, firstDied: !o.won, firstCapped: false, firstTimeUp: false, firstHp: o.won ? 20 : 0,
          firstPotions: [], secondBoss: "TEST_SECOND", firstTurns: 4, secondWon: o.won ? true : null, secondDied: o.won ? false : null,
          firstResources: o.won ? { hp: 20, revives: [], potionSlots: [] } : null, secondEntry: o.won ? { hp: 20, revives: [], potionSlots: [] } : null } })))) };
    }
  }
  const table = await new V6ProjectionEngine(new ChainRunner()).evaluate(r);
  const plan: DirectionWeights = { schema: "direction-weights-v1", direction_weights: r.weights, potion_directions: [], route: "keep", rest: "auto", checkpoint: 99, reason: "fixture" };
  const evaluation = directionEvaluationFromProjection(table, r.config, "skip", plan);
  expect(evaluation.comparisons?.some(c => c.offeredCore && c.mean > .05)).toBe(true);
  const scheduler = freshReplanState("fixture"); scheduler.act = 1;
  const detect = (id: string) => detectReplan(scheduler, { act: 1, floor: 5, turnKey: id, plan, evaluation: { ...evaluation, id }, requirementIds: new Set() }, r.config);
  expect(detect("first").triggers).toContain("T3");
  expect(detect("first").triggers).not.toContain("T2");
  expect(detect("second").triggers).toContain("T2");
  for (const pair of table.pick_direction_comparisons) pair.known_mass = NaN;
  expect(directionEvaluationFromProjection(table, r.config, "skip", plan).comparisons).toEqual([]);
});

it("uses P times completed W without preparing W0 and copies provider diagnostics independently", async () => {
  const r = request(), prepare = r.prepare;
  r.phase = "act";
  r.prepare = vi.fn((target, sample) => sample.cards.some(c => c.id === "G") ? null : prepare(target, sample));
  const table = await new V6ProjectionEngine(new FixedRunner()).evaluate(r);
  const baseline = table.combinations.find(row => row.entry.option_id === "skip")!;
  expect(baseline.entry.availability).toEqual({ take: .5, skip: .5 });
  expect(baseline.completed_win).toEqual({ value: 1, se: 0, n: r.config.samples_act });
  expect(baseline.general_win).toBeNull();
  expect(baseline.general_source).toBe("not_computed");
  expect(vi.mocked(r.prepare).mock.calls.length).toBeGreaterThan(0);
  expect(vi.mocked(r.prepare).mock.calls.every(([, sample]) => sample.cards.every(c => c.id !== "G"))).toBe(true);
  const sampleIds = [...baseline.completion_sample_ids];
  // Inject a diagnostic to check consumer copying separately from the unused W0 branch.
  baseline.unknown_reasons.push("unknown_opening_entry_hp_or_empirical_sample");
  const evaluation = directionEvaluationFromProjection(table, r.config, "skip");
  const task = directionTask({ summaries: directionSummaries("silent", 10, [], [r.directions[0]!.core], null),
    entries: evaluation.entries, projectionReasons: evaluation.projectionReasons,
    appearedCards: [], potionIds: [], floor: 5, current: null });
  expect(task).not.toHaveProperty("direction_evaluation");
  expect(task).not.toHaveProperty("availability");
  expect(asRecord(asArray(asRecord(asArray(task.build_cores)[0]).combos)[0])).toMatchObject({
    completed_results: [], unknown_reasons: ["completed_core_cache_miss"],
  });
  // Lookup projections use P*Wk; W0 stays uncomputed rather than becoming a measured zero.
  expect(evaluation.entries[0]).toMatchObject({ win: { value: .5, se: 0, n: r.config.samples_act },
    win_complete: baseline.completed_win, win_incomplete: null, incomplete_source: "unknown",
    expected_win: .5, formula: "formation_times_completed" });
  expect(JSON.stringify(task)).not.toMatch(/"(?:expected_win|win_incomplete|availability)":/);
  expect(evaluation.projectionReasons![0]!.reasons).toContain("unknown_opening_entry_hp_or_empirical_sample");
  expect(baseline.completion_sample_ids).toEqual(sampleIds);
  expect(baseline.general_win).toBeNull();
  const copiedReasons = [...evaluation.projectionReasons![0]!.reasons];
  baseline.unknown_reasons.push("later_provider_mutation");
  expect(evaluation.projectionReasons![0]!.reasons).toEqual(copiedReasons);
});

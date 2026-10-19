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
it("delivers actual W3 targets and per-combination P=1 rows to the W4 brain task", async () => {
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
  expect(asArray(task.direction_evaluation)).toEqual([expect.objectContaining({
    combo_id: "D:minimal", target_id: "f17:TEST_BOSS", expected_win: 1, win_incomplete: null,
  })]);
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

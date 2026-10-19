import { expect, it, vi, afterEach } from "vitest";
import { V6ProjectionEngine } from "../src/sim/v6-projection.js";
import { directionEvaluationFromProjection } from "../src/v6/projection-consumer.js";
import { directionSummaries, directionTask } from "../src/v6/direction-plan.js";
import { validateProjectionEntry } from "../src/v6/formats.js";
import { direction, FixedRunner, request, source } from "./v6-projection-fixture.js";
import { asArray, asRecord } from "../src/core/util/json.js";
import type { DeckRunRequest } from "../src/sim/build-sim-pool.js";
import type { DirectionWeights } from "../src/v6/formats.js";
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
  expect(asArray(combo.evaluations)).toEqual([expect.objectContaining({ target: "f17:TEST_BOSS", expected_win: 1, win_incomplete: null })]);
  expect(directionEvaluationFromProjection(table, { ...r.config, mode: "off" }, "skip")).toEqual({ id: "off", entries: [] });
});
it("reads W3's act paired chain comparison and leaves missing pick comparisons unknown", async () => {
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
  expect(directionEvaluationFromProjection(pick, r.config, "skip", plan).comparisons).toEqual([]);
});

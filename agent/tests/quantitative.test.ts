import { expect, it } from "vitest";
import { abstractCycleBound, abstractHandAccess, binomialInterval, pairedDifference, summarizeSamples } from "../src/sim/quantitative-stats.js";
import { calibrationSummary, comparePrediction, type QuantitativeObservation, type QuantitativePrediction } from "../src/sim/quantitative-calibration.js";
import { quantitativeFightFacts } from "../src/sim/quantitative-facts.js";
import { compareOptions } from "../src/sim/build-sim.js";
import type { FightSampleResult } from "../src/sim/boss-sim.js";
import { board } from "./boss-sim-fixture.js";

it("reproduces the report's uniform-hand counts without claiming legal plays", () => {
  expect(abstractHandAccess(20, 5, 1, 12).expectedQualifyingHands).toBe(3);
  expect(abstractHandAccess(10, 5, 1, 12).expectedQualifyingHands).toBe(6);
  expect(abstractHandAccess(3, 5, 1, 12).expectedQualifyingHands).toBe(12);
  expect(abstractHandAccess(20, 5, 2, 12).expectedQualifyingHands).toBeCloseTo(12 / 19);
  expect(abstractHandAccess(10, 5, 2, 12).expectedQualifyingHands).toBeCloseTo(8 / 3);
  expect(abstractHandAccess(5, 1, 2, 12).probabilityPerHand).toBe(0);
  expect(() => abstractHandAccess(0, 5, 1, 12)).toThrow();
});

it("treats resource counts as bounds, including free cycles with a finite action cap", () => {
  expect(abstractCycleBound(3, 1, 1, 100, 1)).toEqual({ energyBound: 2, actionBound: 50, combinedBound: 2 });
  expect(abstractCycleBound(0, 1, 0, 100, 1).combinedBound).toBe(0);
  expect(abstractCycleBound(0, 0, 0, 8, 2)).toEqual({ energyBound: null, actionBound: 3, combinedBound: 3 });
  expect(abstractCycleBound(10, 1, 0, 0, 1).combinedBound).toBe(0);
  expect(() => abstractCycleBound(1, -1, 0, 1, 1)).toThrow();
  expect(() => abstractCycleBound(0.3, 0.1, 0, 100, 1)).toThrow();
  expect(abstractCycleBound(Number.MAX_SAFE_INTEGER, 1, 1, Number.MAX_SAFE_INTEGER, 1).combinedBound).toBe(4503599627370496);
});

it("separates outcome dispersion from error of the sample mean, and preserves unknowns", () => {
  const s = summarizeSamples([0, 10, 20]);
  expect(s.mean).toBe(10); expect(s.sd).toBe(10); expect(s.meanSe).toBeCloseTo(10 / Math.sqrt(3));
  expect([s.p10, s.p90]).toEqual([2, 18]);
  expect(summarizeSamples([10]).meanSe).toBeNull();
  expect(summarizeSamples([]).mean).toBeNull();
  expect(() => summarizeSamples([NaN])).toThrow();
  expect(binomialInterval(0, 1)![1]).toBeGreaterThan(0.7);
  expect(binomialInterval(10, 10)![0]).toBeLessThan(0.8);
  expect(binomialInterval(0, 0)).toBeNull();
});

it("pairs by sample identity and exposes missing samples instead of replacing them with zero", () => {
  const result = pairedDifference([{ sample: 1, value: 1 }, { sample: 2, value: 100 }, { sample: 3, value: 9 }],
    [{ sample: 3, value: 12 }, { sample: 1, value: 4 }, { sample: 4, value: 7 }]);
  expect(result).toMatchObject({ difference: { n: 2, mean: 3, sd: 0 }, unmatchedBase: 1, unmatchedOption: 1 });
  expect(() => pairedDifference([{ sample: 1, value: 1 }, { sample: 1, value: 2 }], [])).toThrow();
});

const sample = (change: Partial<FightSampleResult> = {}): FightSampleResult => ({
  won: true, died: false, capped: false, timeUp: false, turns: 2, hpLoss: 10, revived: 0, drunk: [], enemyHpLeft: 0,
  lossByTurn: [5, 5], dmgByTurn: [10, 10], incomingByTurn: [5, 5], enemyLossByTurn: [5, 5], policyTurns: 2, policyNodes: 1, ...change,
});

it("keeps truncated fights visible and counts only wins in conditional turn estimates", () => {
  const samples = [sample(), sample({ won: false, capped: true, turns: 30, hpLoss: 30 })];
  const result = quantitativeFightFacts(samples, samples, [3, 7]);
  expect(result).toMatchObject({ samples: 2, wins: 1, deaths: 0, capped: 1,
    simulated_turns: { mean: 16 }, turns_won_only: { n: 1, mean: 2, meanSe: null },
    paired_hp_loss_difference: { mean: 0 }, complete_combinations: null });
  expect(() => quantitativeFightFacts(samples, samples, [3, 3])).toThrow();
});

it("runs through the actual option comparison using only complete shared samples", async () => {
  const input = board();
  const runner = { run: async () => ({ outcomes: [
    [[sample(), undefined, sample({ hpLoss: 20 })]],
    [[sample({ hpLoss: 7 }), undefined, sample({ hpLoss: 17 })]],
  ], complete: [0, 2], timedOut: true, elapsedMs: 1, workers: 0 }) };
  const options = [{ key: "keep", change: null }, { key: "change", change: { piles: input.piles } }];
  const result = await compareOptions(runner, input, options, { samples: 3, quantitative: true });
  expect(result.options[1]!.quantitative).toMatchObject({ samples: 2, hp_loss: { mean: 12 }, paired_hp_loss_difference: { mean: -3, meanSe: 0 } });
  expect(result.options.map((o) => o.key)).toEqual(["keep", "change"]);
  const legacy = await compareOptions(runner, input, options, { samples: 3 });
  expect(legacy.options[1]).not.toHaveProperty("quantitative");
});

const prediction: QuantitativePrediction = { character: "silent", ascension: 0, run: "fixture", attempt: "0", decision: "d1", fingerprint: "f1",
  option: "p1", metric: "hp_loss", window: "turn1", model: "fixed-model", mean: 10, p10: 2, p90: 18 };
const observation: QuantitativeObservation = { ...prediction, value: 13, evidence: ["fixture-frame"], completed: true, followedPlan: true };

it("matches actual adoption and scope before measuring error, excluding SL/replans and missing frames", () => {
  expect(comparePrediction(prediction, observation)).toMatchObject({ status: "matched", error: -3, insideEmpirical80: true });
  for (const change of [{ attempt: "1" }, { ascension: 1 }, { option: "p2" }, { fingerprint: "f2" }, { followedPlan: false }, { completed: false }, { evidence: [] }, { value: null }]) {
    expect(comparePrediction(prediction, { ...observation, ...change }).status).toBe("unmatched");
  }
  const result = calibrationSummary([{ prediction, observation }, { prediction, observation },
    { prediction: { ...prediction, model: "second" }, observation: { ...observation, model: "second", value: 20 } }]);
  expect(result.groups).toHaveLength(2);
  expect(result.groups[0]).toMatchObject({ n: 1, bias: -3, mae: 3, rmse: 3, empirical80Coverage: 1 });
  expect(result.excluded).toEqual([{ index: 1, reason: "duplicate prediction" }]);
});

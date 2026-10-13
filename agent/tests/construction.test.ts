import { describe, expect, it } from "vitest";
import { applyBuildAction, forecastConstruction, missingRequirements } from "../src/construction/planner.js";
import type { BuildState, CoreTemplate, OpportunityModel } from "../src/construction/types.js";
import { withConstruction } from "../src/construction/adapter.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { baseState, testKnowledge } from "./scenarios.js";
import { compactQuantitativeFight, quantitativeFightFacts } from "../src/sim/quantitative-facts.js";
import type { FightSampleResult } from "../src/sim/boss-sim.js";
import { constructionCombat } from "../src/construction/combat.js";
import { board } from "./boss-sim-fixture.js";

const state: BuildState = { cards: [], relics: [], hp: 20, maxHp: 50, gold: 100, floor: 1, cap: 30 };
const core: CoreTemplate = { id: "AB", name: "fixture", character: "silent", ascensions: [10], status: "candidate",
  requirements: ["A", "B"].map((id) => ({ id, any: [{ id, kind: "card" }], count: 1 })),
  evidence: { runs: ["evidence"], source: "fixture", sha256: "a".repeat(64) }, limits: [] };
const model: OpportunityModel = { schema: "construction-opportunities-v1", character: "silent", generated: "2026-01-01", cutoff: "2026-01-01", digest: "fixture", limitations: [],
  rows: ["A", "B"].map((id) => ({ id, run: `past-${id}`, ts: "2025-01-01", act: 1, ascension: 10, floor: 3, kind: "reward",
    offers: [{ id, upgraded: false, price: 0 }], source: { offset: 0, bytes: 1, sha256: "a".repeat(64) } })) };
const input = { state, core, model, act: 1, ascension: 10, currentRun: "now", asOf: "2026-01-01", samples: 1024,
  steps: [{ floor: 2, kind: "reward" as const }, { floor: 3, kind: "reward" as const }] };

describe("V5 path probabilities", () => {
  it("recovers the two independent opportunity calculation, while completion is not functional victory", () => {
    const result = forecastConstruction(input);
    expect(result.signature.estimate).toBeCloseTo(0.5, 1);
    expect(result.signature.observed).toBe(1024);
    expect(result.aliveAndFunctional.estimate).toBeNull();
    expect(result.terminalWin.estimate).toBeNull();
    expect(forecastConstruction(input)).toEqual(result);
  });
  it("a revealed pair of offers is one choice, not two independent acquisition events", () => {
    const paired = { ...model, rows: [{ ...model.rows[0]!, offers: [...model.rows[0]!.offers, ...model.rows[1]!.offers] }] };
    expect(forecastConstruction({ ...input, model: paired, steps: input.steps.slice(0, 1) }).signature.estimate).toBe(0);
    expect(forecastConstruction({ ...input, model: paired }).signature.estimate).toBe(1);
  });
  it("checks duplicates, distinct types, explicit upgrades and relic alternatives separately", () => {
    const c: CoreTemplate = { ...core, requirements: [
      { id: "two", count: 2, any: [{ kind: "card", id: "A", upgraded: true }] },
      { id: "distinct", count: 2, distinct: true, any: [{ kind: "card", id: "A" }, { kind: "card", id: "B" }] },
      { id: "relic", count: 1, any: [{ kind: "relic", id: "R" }, { kind: "card", id: "C" }] },
    ] };
    expect(missingRequirements({ ...state, cards: [{ id: "A", upgraded: false }, { id: "A", upgraded: true }], relics: ["R"] }, c))
      .toEqual([{ id: "two", count: 1 }, { id: "distinct", count: 1 }]);
  });
  it("spends actual gold and requires removing before adding at the cap", () => {
    const full = { ...state, cap: 1, cards: [{ id: "old", upgraded: false }] };
    const buy = { kind: "add" as const, card: { id: "A", upgraded: false }, price: 60 };
    expect(applyBuildAction(full, buy)).toBeNull();
    const removed = applyBuildAction(full, { kind: "remove", index: 0, price: 50 })!;
    expect(applyBuildAction(removed, buy)).toBeNull();
    expect(applyBuildAction(removed, { ...buy, price: 50 })?.cards).toHaveLength(1);
    expect(full.gold).toBe(100); expect(full.cards).toHaveLength(1);
  });
  it("excludes the current run, future observations, other ascensions and absent opportunity support", () => {
    const rows = model.rows.map((r) => ({ ...r, run: "now" }));
    rows.push({ ...model.rows[0]!, ts: "2027-01-01" }, { ...model.rows[1]!, ascension: 0 });
    const out = forecastConstruction({ ...input, model: { ...model, rows } });
    expect(out.signature.estimate).toBeNull(); expect(out.signature.bounds).toEqual([0, 1]);
  });
  it("death before a reward stops the path and is counted in the joint denominator", () => {
    const out = forecastConstruction({ ...input, steps: [{ floor: 2, kind: "fight" }, ...input.steps],
      evaluateFight: () => ({ hp: 0, gold: 100, won: false, complete: true, functional: false, damage: 10, turns: 2 }), terminalIsRunEnd: true });
    expect(out.signature.estimate).toBe(0); expect(out.aliveAndFunctional.estimate).toBe(0); expect(out.terminalWin.estimate).toBe(0);
    expect(out.meanDamagePerTurn).toBe(5);
  });
  it("transfers remaining HP between fights instead of multiplying independent wins", () => {
    const seen: number[] = [];
    const out = forecastConstruction({ ...input, samples: 1, steps: [{ floor: 2, kind: "fight" }, { floor: 3, kind: "fight" }], terminalIsRunEnd: true,
      evaluateFight: (s) => { seen.push(s.hp); return { hp: s.hp - 12, gold: s.gold, won: s.hp > 12, complete: true, functional: false, damage: 20, turns: 2 }; } });
    expect(seen).toEqual([20, 8]); expect(out.terminalWin.estimate).toBe(0);
  });
  it("does not turn an act win or a censored battle into a full-run victory", () => {
    const won = () => ({ hp: 10, gold: 100, won: true, complete: true, functional: true, damage: 20, turns: 2 });
    expect(forecastConstruction({ ...input, steps: [{ floor: 17, kind: "fight" }], evaluateFight: won }).terminalWin.estimate).toBeNull();
    expect(forecastConstruction({ ...input, steps: [{ floor: 17, kind: "fight" }], terminalIsRunEnd: true,
      evaluateFight: () => ({ ...won(), complete: false }) }).terminalWin.estimate).toBeNull();
  });
  it("unknown events do not become proven zero opportunity or proven completed cores", () => {
    const out = forecastConstruction({ ...input, steps: [...input.steps, { floor: 4, kind: "unknown" }] });
    expect(out.signature.unknown).toBe(1024); expect(out.conditionalSignature.estimate).toBeCloseTo(0.5, 1);
  });
});

it("sends full-window DPR to the consumer, separating deaths and censored trajectories", () => {
  const make = (dmgByTurn: number[], more = {}): FightSampleResult => ({ won: true, died: false, capped: false, timeUp: false,
    turns: dmgByTurn.length, hpLoss: 0, hpLeft: 20, dmgByTurn, drunk: [], ...more } as unknown as FightSampleResult);
  const rows = [make([0, 0, 90]), make([10], { won: false, died: true }), make([999], { won: false, capped: true })];
  const facts = compactQuantitativeFight(quantitativeFightFacts(rows, rows, [1, 2, 3]));
  expect(facts).toMatchObject({ effective_damage_per_turn: { n: 2, mean: 20 }, damage_per_turn_won: { mean: 30 }, damage_per_turn_died: { mean: 10 }, simulated_turns: { n: 3 } });
});

it("reuses the actual fight simulator and returns remaining resources without asserting core qualification", () => {
  const evaluator = constructionCombat({ input: () => board({ bossHp: 1 }), maxTurns: 3 });
  const out = evaluator(state, { floor: 2, kind: "fight" }, 7, core)!;
  expect(out.complete).toBe(true); expect(out.won).toBe(true); expect(out.functional).toBeNull();
  expect(out.combatResources).toBeDefined(); expect(out.turns).toBe(1);
});

it("uses the real question in shadow, supports advisory, and keeps other characters equivalent", () => {
  const raw = baseState("REWARD", { run_id: "now" });
  const run = raw["run"] as Record<string, unknown>;
  Object.assign(run, { character_id: "SILENT", ascension: 10, act_id: "0", floor: 1, deck: [], gold: 100 });
  const state_ = parseGameState(raw);
  const env: DecisionEnv = { state: state_, knowledge: testKnowledge, brief: buildRunBrief(state_, testKnowledge),
    screenMemory: createScreenMemory("REWARD"), thresholds: { act: .6, strong: .8 }, runStart: "auto", characterPreference: "SILENT", allowFtueModals: false, strictJev: true, shopDiscardPotions: [] };
  env.screenMemory.routePlan = { runId: "now", act: 1, floor: 1, hpPct: 1, summary: "fixture", path: [{ row: 2, col: 0, type: "Monster", hpOnArrival: 1 }, { row: 16, col: 0, type: "Boss", hpOnArrival: 1 }] };
  const decision = { kind: "ask", label: "reward/card", state: { facts: {} }, questions: { pick: { type: "choice", instructions: "pick", criteria: { skip: "{}" } } },
    deepseek: { question: "pick", options: () => [{ key: "skip", intent: { action: "skip_reward_cards" }, summary: {} }] } } as unknown as AskDecision;
  const setup = { data: { templates: [core], model, signature: "fixture" }, samples: 8, asOf: "2026-01-01" };
  const shadow = withConstruction(decision, env, { ...setup, mode: "shadow" });
  expect(shadow.decision).toBe(decision); expect(shadow.record?.status).toBe("predicted");
  const advisory = withConstruction(decision, env, { ...setup, mode: "advisory" });
  expect(advisory.decision).not.toBe(decision); expect(advisory.record?.mode).toBe("advisory");
  run["character_id"] = "REGENT";
  expect(withConstruction(decision, env, { ...setup, mode: "advisory" })).toEqual({ decision });
});

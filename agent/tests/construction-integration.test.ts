import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyBuildAction, completionChoice, forecastConstruction, prepareOpportunities } from "../src/construction/planner.js";
import { constructionEvaluation } from "../src/construction/evaluation.js";
import { withConstructionEvaluation } from "../src/construction/consumer.js";
import { constructionAdmission, constructionTemplateDigest, CONSTRUCTION_MODEL, CONSTRUCTION_POLICY } from "../src/construction/admission.js";
import { withConstruction } from "../src/construction/adapter.js";
import { pickSpec, runPlanSpec, stableSchema, withRunPlanField } from "../src/brain/specs.js";
import { loadRunPlan, logRunPlan, parseRunPlan, runPlanTrigger } from "../src/memory/run-plan.js";
import { runPlanTaskState } from "../src/memory/run-plan-merge.js";
import { buildFacts } from "../src/brain/build-facts.js";
import { toJsonValue } from "../src/core/util/json.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { baseState, testKnowledge } from "./scenarios.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { quantitativeFightFacts } from "../src/sim/quantitative-facts.js";
import type { BuildState, CoreTemplate, OpportunityModel } from "../src/construction/types.js";
import type { FightSampleResult } from "../src/sim/boss-sim.js";
import type { JsonValue } from "../src/core/util/json.js";

vi.mock("../src/construction/data.js", () => ({ loadConstructionData: () => ({ templates: [core], model, signature: "fixture" }) }));
const core: CoreTemplate = { id: "AB", name: "fixture only", character: "silent", ascensions: [10], status: "candidate",
  requirements: ["A", "B"].map((id) => ({ id, any: [{ kind: "card", id }], count: 1 })),
  evidence: { runs: ["fixture"], source: "fixture", sha256: "a".repeat(64) }, limits: [] };
const state: BuildState = { cards: [{ id: "A", upgraded: false }], relics: [], hp: 20, maxHp: 30, gold: 20, floor: 1, cap: null };
const model: OpportunityModel = { schema: "construction-opportunities-v1", character: "silent", generated: "2026-01-01", cutoff: "2026-01-01", digest: "fixture", limitations: [],
  rows: ["A", "B"].map((id) => ({ id, run: "past-" + id, ts: "2025-01-01", floor: 3, act: 1, ascension: 10, kind: "reward", offers: [{ id, upgraded: false, price: 0 }], source: { offset: 0, bytes: 1, sha256: "a".repeat(64) } })) };
const context = { model, steps: [{ floor: 3, kind: "reward" as const }], act: 1, ascension: 10, currentRun: "now", asOf: "2026-01-01" };
const binding = { run: "now", floor: 1, label: "reward/card" };
const metric = (mean: number) => ({ n: 300, mean, meanSe: 1, p10: mean - 2, p90: mean + 2 });
const q = (dpr: number) => ({ samples: 300, effective_damage_per_turn: metric(dpr), hp_loss: metric(3),
  paired_hp_loss_difference: metric(-1), paired_effective_damage_per_turn: { difference: metric(dpr - 10), unmatchedBase: 2, unmatchedOption: 3 },
  core_window: { samples: 300, valid: 200, missing: 100, cards: { A: { first_play_when_played: { ...metric(2), n: 150 }, manual: { ...metric(1), n: 200 } } } } });
const sim = { ...binding, minimumShown: 300, record: { samples: 300, requested: 1000, boss: "fixture", quantitative: { base: q(10), options: { upgrade: q(15) } } } };
function environment(character = "SILENT") {
  const raw = baseState("REWARD", { run_id: "now" });
  Object.assign(raw.run as object, { character_id: character, ascension: 10, act_id: "0", floor: 1, deck: [], gold: 20 });
  const parsed = parseGameState(raw);
  const env: DecisionEnv = { state: parsed, knowledge: testKnowledge, brief: buildRunBrief(parsed, testKnowledge),
    screenMemory: createScreenMemory("REWARD"), thresholds: { act: .6, strong: .8 }, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, shopDiscardPotions: [] };
  env.screenMemory.routePlan = { runId: "now", act: 1, floor: 1, hpPct: 1, summary: "fixture", path: [{ row: 2, col: 0, type: "Monster", hpOnArrival: 1 }, { row: 16, col: 0, type: "Boss", hpOnArrival: 1 }] };
  const decision = { kind: "ask", label: "reward/card", state: { facts: {} }, questions: { pick: { type: "choice", instructions: "pick", criteria: { skip: "{}" } } },
    deepseek: { question: "pick", options: () => [{ key: "skip", intent: { action: "skip_reward_cards" }, summary: {} }] } } as unknown as AskDecision;
  return { env, decision };
}
function calibration() {
  return { schema: "construction-calibration-v1", input_sha256: "b".repeat(64),
    publication: { authorized_by: "ops", kind: "prospective-logged-decisions", character: "silent", ascension: 10,
      template_sha256: constructionTemplateDigest([core]), evidence_sha256: "b".repeat(64), accepted_at: "2025-12-31T00:00:00Z" },
    groups: [{ character: "silent", core: "AB", horizon: 17, metric: "conditionalSignature", model: CONSTRUCTION_MODEL, policy: CONSTRUCTION_POLICY,
      ascension: 10, template_sha256: constructionTemplateDigest([core]),
      independent_runs: 10, n: 20, positives: 10, negatives: 10, brier: .1, baseline_brier: .25, bias: .01 }] };
}

describe("construction candidate combat evaluation", () => {
  it("distinguishes an upgrade's combat effect even when the component signature is unchanged", () => {
    const upgraded = applyBuildAction(state, { kind: "upgrade", index: 0, price: 0 })!;
    expect(forecastConstruction({ ...context, state, core, samples: 32 }).conditionalSignature)
      .toEqual(forecastConstruction({ ...context, state: upgraded, core, samples: 32 }).conditionalSignature);
    const result = constructionEvaluation(state, [{ key: "current", state }, { key: "upgrade", state: upgraded }], [core], binding, sim);
    expect(result.options).toMatchObject({ current: { fight: { completeDpr: { mean: 10 } } }, upgrade: {
      inventoryDelta: { cards: 0, upgraded: 1 }, fight: { completeDpr: { mean: 15 }, pairedDpr: { unmatchedBase: 2, unmatchedOption: 3 },
        pairedHpLoss: { mean: -1 }, componentRealization: { AB: { validTraces: 200, unknownTraces: 100,
          cards: { A: { playedSamples: 150, playedFractionOnValidTraces: .75 } }, qualifiedCore: null } } } } });
  });
  it("does not reuse another question or sub-threshold sample values", () => {
    for (const simulation of [{ ...sim, run: "other" }, { ...sim, floor: 2 }, { ...sim, minimumShown: 0 }, { ...sim, record: { ...sim.record, samples: 299 } }]) {
      const result = constructionEvaluation(state, [{ key: "upgrade", state }], [core], binding, simulation);
      expect(result.options).toMatchObject({ upgrade: { fight: null } });
    }
  });
  it("pairs DPR only on complete trajectories shared by sample identity", () => {
    const sample = (damage: number, more = {}) => ({ won: true, died: false, capped: false, timeUp: false, turns: 2,
      hpLoss: 1, dmgByTurn: [0, damage], drunk: [], ...more } as unknown as FightSampleResult);
    const a = [sample(20), sample(100, { capped: true, won: false }), sample(20)];
    const b = [sample(40), sample(80), sample(100, { timeUp: true, won: false })];
    expect(quantitativeFightFacts(b, a, [7, 8, 9])).toMatchObject({ paired_effective_damage_per_turn: {
      difference: { n: 1, mean: 10 }, unmatchedBase: 1, unmatchedOption: 1 } });
  });
});

describe("same-question delivery and structured decisions", () => {
  it("delivers inventory/combat evaluation without leaking shadow probabilities and keeps other roles unchanged", () => {
    const { env, decision } = environment();
    const evaluation = constructionEvaluation(state, [{ key: "current", state }], [core], binding, sim);
    const record = { evaluation, forecasts: { hidden: .99 } } as Record<string, JsonValue>;
    const delivered = withConstructionEvaluation(decision, env, record, true);
    expect(delivered).not.toBe(decision);
    expect(JSON.stringify(delivered)).not.toContain('"hidden"');
    expect(withConstructionEvaluation(decision, env, record, false)).toBe(decision);
    expect(withConstructionEvaluation(decision, environment("IRONCLAD").env, record, true)).toBe(decision);
    expect(withConstructionEvaluation(decision, env, { evaluation: { ...evaluation, run: "other" } }, true)).toBe(decision);
  });
  it("retains the construction schema through stable picks and validates a real future checkpoint", () => {
    const evaluation = constructionEvaluation(state, [{ key: "current", state }], [core], binding, sim);
    const shown = { facts: { construction_evaluation: evaluation }, run_plan_task: {} };
    const spec = pickSpec("reward/card", { skip: "{}" }, shown);
    expect(stableSchema(spec).properties?.run_plan?.properties?.construction).toBeDefined();
    expect(withRunPlanField(spec, shown).schema.properties?.run_plan?.required).toContain("construction");
    const plan = { archetype: "fixture", construction: { primary: "AB", alternatives: [], checkpoint: 3, reason: "fixture evidence", pivot_if: "no component at checkpoint" } };
    expect(runPlanSpec("run-plan", shown).validate(plan)).toEqual([]);
    expect(runPlanSpec("run-plan", shown).validate({ ...plan, construction: { ...plan.construction, checkpoint: 1 } }).join()).toContain("future floor");
    expect(runPlanSpec("run-plan", shown).validate({ ...plan, construction: { ...plan.construction, primary: "invented" } }).join()).toContain("coreCatalog");
    const { env } = environment();
    const parsed = parseRunPlan(plan, env.state, testKnowledge, "start");
    expect(parsed.construction?.primary).toBe("AB");
    const raw = structuredClone(env.state.raw) as Record<string, unknown>; (raw.run as Record<string, unknown>).floor = 3;
    expect(runPlanTrigger(parsed, parseGameState(raw))).toBe("review");
    expect(runPlanTrigger(parsed, env.state)).toBeNull();
    expect(runPlanSpec().schema.properties?.construction).toBeUndefined();
  });
  it("persists the chosen direction and reads it into the next real build question, including a merged plan", () => {
    const { env } = environment();
    const parsed = parseRunPlan({ archetype: "fixture", construction: { primary: "AB", alternatives: [], checkpoint: 3,
      reason: "same-question observed metrics", pivot_if: "review evidence at checkpoint" } }, env.state, testKnowledge, "start");
    const directory = mkdtempSync(join(tmpdir(), "construction-plan-")), file = join(directory, "plans.jsonl");
    try {
      logRunPlan(file, { run: parsed.runId, plan: toJsonValue(parsed) });
      env.screenMemory.runPlan = loadRunPlan(file, parsed.runId);
      const facts = buildFacts(env);
      expect(facts.your_run_plan).toMatchObject({ construction: parsed.construction });
      const task = runPlanTaskState(env.state, testKnowledge, "review", parsed, { facts });
      const spec = runPlanSpec("run-plan", { facts, run_plan_task: task });
      expect(spec.schema.required).toContain("construction");
      expect(spec.validate({ archetype: "missing direction" }).length).toBeGreaterThan(0);
      expect(spec.validate({ archetype: "fixture", construction: parsed.construction })).toEqual([]);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});

describe("opportunity reuse and admission", () => {
  it("reuses pools without changing forecasts and rejects a stale context", () => {
    const input = { ...context, state, core, samples: 64 };
    const prepared = prepareOpportunities(context);
    expect(forecastConstruction({ ...input, prepared })).toEqual(forecastConstruction(input));
    const changed = { ...input, currentRun: "past-B" };
    expect(forecastConstruction({ ...changed, prepared })).toEqual(forecastConstruction(changed));
    expect(completionChoice(state, core, [{ kind: "add", card: { id: "B", upgraded: false }, price: 21 }, { kind: "upgrade", index: 0, price: 0 }])).toEqual({ kind: "skip" });
    expect(state.cards[0]?.upgraded).toBe(false);
  });
  it("requires prospective evidence, independent runs, calibration skill and the exact template/metric", () => {
    const report = calibration();
    expect(constructionAdmission(report, [core], 10, 17, "2026-01-01").admitted).toEqual(["AB"]);
    for (const bad of [null, { passed: true }, { ...report, publication: { ...report.publication, kind: "fixed-test" } },
      { ...report, groups: [{ ...report.groups[0]!, independent_runs: 1, n: 1000 }] },
      { ...report, groups: [{ ...report.groups[0]!, brier: .3 }] },
      { ...report, groups: [{ ...report.groups[0]!, metric: "terminalWin" }] }]) {
      expect(constructionAdmission(bad, [core], 10, 17, "2026-01-01").admitted).toEqual([]);
    }
    const { env, decision } = environment();
    const result = withConstruction(decision, env, { data: { templates: [core], model, signature: "fixture" },
      mode: "advisory", calibration: report, samples: 8, asOf: "2026-01-01" });
    expect(result.decision).not.toBe(decision);
    expect(result.record?.admission).toMatchObject({ admitted: ["AB"] });
  });
});

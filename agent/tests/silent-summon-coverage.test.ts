import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-summon-coverage-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests, summonsAt } from "../src/knowledge/monster-db.js";
import { setMoveModelForTests } from "../src/knowledge/move-model.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { boardRolloutInput, rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import * as coverage from "../src/reflex/silent-summon-coverage.js";
import { solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Silent evidence only"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/knowledge/potion-equivalents.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/potion-equivalents.js")>(), heldPotionWorth: () => ({}),
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const rawAt = (line: number): Raw => structuredClone(evidence.frames.find((f) => f.line === line)!.state);
const knowledge = makeKnowledge({ cards: [], monsters: [] }, "cache");
const oldRollout = rolloutLiveOptions.enabled, oldBoss = bossLinesOptions.enabled;
const oldMcNow = potionMcOptions.now;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  setMoveModelForTests({});
  rolloutLiveOptions.enabled = false; bossLinesOptions.enabled = false;
  potionMcOptions.now = () => 0;
  vi.spyOn(Date, "now").mockReturnValue(1000);
});
afterEach(() => {
  solveTap.onSolve = null;
  setMonsterDbForTests(null); setMoveModelForTests(null);
  rolloutLiveOptions.enabled = oldRollout; bossLinesOptions.enabled = oldBoss;
  potionMcOptions.now = oldMcNow;
  vi.restoreAllMocks();
});
function planned(raw: Raw, context: "off" | "v1" = "off") {
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, jevContext: context,
    screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [] };
  let solver: SolverInput | undefined;
  solveTap.onSolve = (input) => { solver ??= input; };
  try {
    const decision = planCombatTurn(env);
    expect(decision?.kind).toBe("ask");
    return { decision: decision as AskDecision, solver: solver!, state };
  } finally { solveTap.onSolve = null; }
}

it("qualifies the missing same-type reinforcement instead of promising a target order", () => {
  const raw = rawAt(360523), before = structuredClone(raw);
  const result = coverage.silentSummonCoverage(parseGameState(raw)) as any;
  expect(result.unmodelled_summons).toMatchObject({ scope: "current_observed_summon_move", enemies: [
    { index_now: 1, enemy_id: "TWO_TAILED_RAT", move_id: "CALL_FOR_BACKUP_MOVE" },
  ] });
  expect(result.unmodelled_summons.note).toContain("不能据此指定击杀顺序");
  expect(rawAt(360527).combat.enemies.map((e: Raw) => e.current_hp)).toEqual([19, 14, 21]);
  expect(raw).toEqual(before);
});

it("identifies the fabricator across its changing slot without inventing a summon distribution", () => {
  for (const [line, index] of [[360355, 0], [360360, 2]]) {
    const result = coverage.silentSummonCoverage(parseGameState(rawAt(line!))) as any;
    expect(result.unmodelled_summons.enemies).toEqual([
      { index_now: index, enemy_id: "FABRICATOR", name: "组装师", move_id: "FABRICATE_MOVE" },
    ]);
    expect(result.unmodelled_summons.note).toContain("血量、行动顺序和概率未确定");
  }
  expect(rawAt(360365).combat.enemies.map((e: Raw) => [e.enemy_id, e.current_hp]))
    .toEqual([["NOISEBOT", 21], ["NOISEBOT", 24], ["FABRICATOR", 121], ["ZAPBOT", 19]]);
});

it("keeps the winning rat encounter as a counterexample to inevitable defeat", () => {
  expect(coverage.silentSummonCoverage(parseGameState(rawAt(359724)))).toHaveProperty("unmodelled_summons");
  expect(rawAt(359728).combat.enemies.map((e: Raw) => e.current_hp)).toEqual([1, 18]);
  expect(rawAt(359734).screen).toBe("REWARD");
  expect(coverage.silentSummonCoverage(parseGameState(rawAt(359734)))).toEqual({});
});

it.each([360355, 360523])("checks the actual rollout input still lacks this branch at s%i", (line) => {
  const { state, solver } = planned(rawAt(line));
  const db = { NOISEBOT: { hp_by_asc: { "10": { median: 21 } } },
    ZAPBOT: { hp_by_asc: { "10": { median: 19 } } },
    TWO_TAILED_RAT: { hp_by_asc: { "10": { median: 19 } } } };
  const missing = (coverage.silentSummonCoverage(state) as any).unmodelled_summons.enemies;
  const board = boardRolloutInput(state, knowledge, solver, 10, db, {});
  for (const e of missing) {
    expect(summonsAt(e.enemy_id, e.move_id, 10, db)).toBeNull();
    expect(board.summons?.[e.enemy_id]?.[e.move_id]).toBeUndefined();
  }
});

it.each(["off", "v1"] as const)("reaches the real %s Jev question while preserving every option and action", (context) => {
  for (const line of [360355, 360523]) {
    const current = planned(rawAt(line), context).decision;
    const view = context === "v1" ? current.jevView!.state : current.state;
    expect(view.simulation_reference).toHaveProperty("unmodelled_summons.enemies");
    const spy = vi.spyOn(coverage, "silentSummonCoverage").mockReturnValue({});
    const original = planned(rawAt(line), context).decision;
    spy.mockRestore();
    expect(current.questions).toEqual(original.questions);
    const revised = structuredClone(current.state);
    delete (revised.simulation_reference as Raw).unmodelled_summons;
    expect(revised).toEqual(original.state);
    for (const key of Object.keys(current.questions.plan!.criteria!)) {
      const answer = { plan: { type: "choice" as const, choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } };
      const { apply: newApply, ...newAction } = current.resolve(answer);
      const { apply: oldApply, ...oldAction } = original.resolve(answer);
      expect(newAction).toEqual(oldAction);
      expect(typeof newApply).toBe(typeof oldApply);
    }
  }
});

it("does not infer a missing branch from another move, dead enemy, absent intent or unknown HP", () => {
  for (const line of [360365, 360531]) {
    expect(coverage.silentSummonCoverage(parseGameState(rawAt(line)))).toEqual({});
  }
  for (const patch of [{ current_hp: 0 }, { is_alive: false }, { intents: [] }, { current_hp: null },
    { move_id: "FABRICATING_STRIKE_MOVE" }, { enemy_id: "THE_OBSCURA", move_id: "ILLUSION_MOVE" }]) {
    const raw = rawAt(360355);
    Object.assign(raw.combat.enemies[0], patch);
    expect(coverage.silentSummonCoverage(parseGameState(raw))).toEqual({});
  }
});

it("keeps other characters and unobserved ascensions unchanged", () => {
  for (const patch of [{ character_id: "IRONCLAD" }, { character_id: "" }, { ascension: 9 }, { ascension: 11 }, { ascension: null }]) {
    const raw = rawAt(360355);
    Object.assign(raw.run, patch);
    expect(coverage.silentSummonCoverage(parseGameState(raw))).toEqual({});
  }
  const raw = rawAt(360523); raw.run.character_id = "IRONCLAD";
  const actual = planned(raw, "v1").decision;
  vi.spyOn(coverage, "silentSummonCoverage").mockReturnValue({});
  const before = planned(raw, "v1").decision;
  expect(actual.state).toEqual(before.state);
  expect(actual.jevView).toEqual(before.jevView);
  expect(actual.questions).toEqual(before.questions);
});

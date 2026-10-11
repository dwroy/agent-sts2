import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-kin-progress-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import * as kin from "../src/reflex/silent-kin-progress.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";

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
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));
// The Vitest setup imports some loaders before the per-file fs mock. Replace those consumers explicitly.
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/knowledge/potion-equivalents.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/potion-equivalents.js")>(), heldPotionWorth: () => ({}),
}));

type Raw = Record<string, any>;
const rawAt = (line: number): Raw => structuredClone(evidence.frames.find((f) => f.line === line)!.state);
const knowledge = makeKnowledge({ cards: [], monsters: [{ id: "KIN_PRIEST", type: "Boss" }] }, "cache");
const oldRollout = rolloutLiveOptions.enabled, oldBoss = bossLinesOptions.enabled;
const oldMcNow = potionMcOptions.now;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false; bossLinesOptions.enabled = false;
  potionMcOptions.now = () => 0;
});
afterEach(() => {
  solveTap.onSolve = null; setMonsterDbForTests(null);
  rolloutLiveOptions.enabled = oldRollout; bossLinesOptions.enabled = oldBoss;
  potionMcOptions.now = oldMcNow;
  vi.restoreAllMocks();
});
function planned(raw: Raw, v1 = false) {
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], ...(v1 ? { jevContext: "v1" } : {}) };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { return { decision: planCombatTurn(env), get input() { return input!; } }; }
  finally { solveTap.onSolve = null; }
}

it("keeps all 324 observed HP separate from the priest's 199 HP", () => {
  const raw = rawAt(292332), before = structuredClone(raw);
  expect(kin.silentKinBoardFacts(parseGameState(raw))).toMatchObject({ kin_current_board: {
    scope: "observed_current_snapshot", hp_sum: 324, priest_hp: 199, followers_hp_sum: 125, living_count: 3,
  } });
  expect(raw).toEqual(before);
});

it("replays an observed group hit without reporting a removed enemy", () => {
  const raw = rawAt(292357), { input } = planned(raw);
  const card = input.hand.find((c) => c.cardId === "FLICK_FLACK")!;
  const plan = replaySteps(input, [{ cardIndex: card.index, cardId: card.cardId, name: card.name, upgraded: card.upgraded }])!;
  // The pair records the action itself; plan outcomes also include the pending enemy turn.
  expect(rawAt(292358).combat.enemies.map((e: Raw) => e.current_hp)).toEqual([7, 43, 154]);
  expect(kin.silentKinPlanFacts(parseGameState(raw), plan)).toMatchObject({ kin_modelled_progress: {
    complete_enemy_rows: true, hp_sum_after: 204, living_count_after: 3, removed_count: 0,
  } });
});

it("copies temporary strength from the current frame without carrying it into T6", () => {
  const a: any = kin.silentKinBoardFacts(parseGameState(rawAt(292356))).kin_current_board;
  const b: any = kin.silentKinBoardFacts(parseGameState(rawAt(292359))).kin_current_board;
  expect(a.enemies.map((e: any) => [e.strength_now, e.piercing_wail_now])).toEqual([[0, 6], [-3, 6], [-3, 6]]);
  expect(a.temporary_strength_note).toContain("暂减力");
  expect(b.enemies.map((e: any) => [e.strength_now, e.piercing_wail_now])).toEqual([[6, 0], [3, 0], [3, 0]]);
  expect(b).not.toHaveProperty("temporary_strength_note");
});

it("reports reindexed surviving targets without inventing a zero-HP T6 frame", () => {
  const before: any = kin.silentKinBoardFacts(parseGameState(rawAt(292362))).kin_current_board;
  const after: any = kin.silentKinBoardFacts(parseGameState(rawAt(292363))).kin_current_board;
  const last: any = kin.silentKinBoardFacts(parseGameState(rawAt(292376))).kin_current_board;
  expect(before.enemies[0]).toMatchObject({ index_now: 0, hp: 1, max_hp: 62 });
  expect(after).toMatchObject({ living_count: 2, hp_sum: 191, priest_hp: 154, followers_hp_sum: 37 });
  expect(after.enemies[0]).toMatchObject({ index_now: 0, hp: 37, max_hp: 63 });
  expect(last).toMatchObject({ living_count: 1, hp_sum: 116, priest_hp: 116, followers_hp_sum: 0 });
  expect(last.enemies[0]).toMatchObject({ index_now: 0, enemy_id: "KIN_PRIEST" });
  expect(after.note).toContain("不能据同序号推跨帧身份");
});

it.each([false, true])("reaches the actual Jev plan question (v1=%s) while preserving options and their numeric rankings", (v1) => {
  const raw = rawAt(292332), current = planned(raw, v1).decision;
  if (current?.kind !== "ask" || current.questions.plan?.type !== "choice") throw new Error("expected original plan question");
  expect(current.state.kin_current_board).toMatchObject({ hp_sum: 324, living_count: 3 });
  expect(current.state).not.toHaveProperty("experience");
  expect(current.state.potion_context).not.toHaveProperty("potion_worth_in_act_boss");
  if (v1) expect(current.jevView?.state.kin_current_board).toEqual(current.state.kin_current_board);
  vi.spyOn(kin, "silentKinBoardFacts").mockReturnValue({});
  vi.spyOn(kin, "silentKinPlanFacts").mockReturnValue({});
  const previous = planned(raw, v1).decision;
  if (previous?.kind !== "ask" || previous.questions.plan?.type !== "choice") throw new Error("expected baseline question");
  expect(Object.keys(current.questions.plan.criteria)).toEqual(Object.keys(previous.questions.plan.criteria));
  let covered = 0;
  for (const key of Object.keys(current.questions.plan.criteria)) {
    const actual = JSON.parse(current.questions.plan.criteria[key]!);
    const old = JSON.parse(previous.questions.plan.criteria[key]!);
    if (actual.kin_modelled_progress) {
      covered++;
      expect(actual.kin_modelled_progress.scope).toBe("current_turn_model");
      delete actual.kin_modelled_progress;
    }
    expect(actual).toEqual(old);
  }
  expect(covered).toBeGreaterThan(1);
  expect(raw).toEqual(rawAt(292332));
});

it("keeps missing or duplicate forecast rows unknown even if the plan claims a win", () => {
  const raw = rawAt(292357), { input } = planned(raw);
  const plan = replaySteps(input, [])!;
  for (const rows of [[], [...plan.outcome.enemyHpAfter, plan.outcome.enemyHpAfter[0]!]]) {
    const altered = { ...plan, outcome: { ...plan.outcome, enemyHpAfter: rows, winsFight: true } };
    expect(kin.silentKinPlanFacts(parseGameState(raw), altered)).toMatchObject({ kin_modelled_progress: {
      complete_enemy_rows: false, hp_sum_after: null, living_count_after: null, removed_count: null,
    } });
  }
});

it.each([
  ["ironclad", (r: Raw) => { r.run.character_id = "IRONCLAD"; }],
  ["unknown character", (r: Raw) => { r.run.character_id = ""; }],
  ["A9", (r: Raw) => { r.run.ascension = 9; }],
  ["A11", (r: Raw) => { r.run.ascension = 11; }],
  ["another floor", (r: Raw) => { r.run.floor = 18; }],
  ["another enemy", (r: Raw) => { r.combat.enemies[0].enemy_id = "UNOBSERVED"; }],
  ["duplicate index", (r: Raw) => { r.combat.enemies[1].index = 0; }],
  ["missing HP", (r: Raw) => { delete r.combat.enemies[0].current_hp; }],
  ["missing power array", (r: Raw) => { delete r.combat.enemies[0].powers; }],
] as const)("%s preserves the previous consumer", (_label, change) => {
  const raw = rawAt(292332); change(raw);
  expect(kin.silentKinBoardFacts(parseGameState(raw))).toEqual({});
  const current = planned(raw).decision;
  vi.spyOn(kin, "silentKinBoardFacts").mockReturnValue({});
  vi.spyOn(kin, "silentKinPlanFacts").mockReturnValue({});
  expect(JSON.stringify(planned(raw).decision)).toBe(JSON.stringify(current));
});

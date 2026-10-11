/** A5HKP18P4Q0T F8 T6 / silent-0211: fixed raw observations, no LLM or refreshed knowledge. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { resetFightMemory } from "../src/hand/loop.js";
import { replayRun } from "../src/memory/journal-replay.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn, enemySims } from "../src/reflex/combat-plan.js";
import { observeSilentSkittish, carrySilentSkittish } from "../src/reflex/silent-skittish.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";

vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));
const fixture = () => JSON.parse(readFileSync(new URL("./silent-skittish-state.json", import.meta.url), "utf8"));
const knowledge = makeKnowledge({ cards: [
  ...["STRIKE_SILENT", "NEUTRALIZE", "FLICK_FLACK"].map((id) => ({ id, type: "Attack" })),
  { id: "DEFEND_SILENT", type: "Skill" },
], monsters: [{ id: "PHANTASMAL_GARDENER", type: "Monster" }] }, "cache");
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false;
  bossLinesOptions.enabled = false;
});
afterEach(() => {
  solveTap.onSolve = null;
  rolloutLiveOptions.enabled = true;
  bossLinesOptions.enabled = true;
  setMonsterDbForTests(null);
});

it("does not grant the shield again when the actual planner replans after its observed consumption", () => {
  const raw = fixture().states;
  const memory = createScreenMemory("COMBAT");
  observeSilentSkittish(memory, parseGameState(raw[0]));
  observeSilentSkittish(memory, parseGameState(raw[1]));
  const state = parseGameState(raw[2]);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: memory, shopDiscardPotions: [],
    mechRules: false };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  planCombatTurn(env);
  solveTap.onSolve = null;
  expect(input).toBeDefined();
  expect(input!.enemies[2]).toMatchObject({ hp: 8, block: 1, skittish: 0 });
  const step = (cardIndex: number, cardId: string) => ({ cardIndex, cardId, name: cardId, upgraded: false, target: 2 });
  const hit = replaySteps(input!, [step(0, "STRIKE_SILENT")])!;
  expect(hit.outcome.enemyHpAfter.find((enemy) => enemy.index === 2)).toMatchObject({ hp: 3, block: 0 });
  const kill = replaySteps(input!, [step(0, "STRIKE_SILENT"), step(2, "NEUTRALIZE")])!;
  expect(kill.outcome.enemyHpAfter.find((enemy) => enemy.index === 2)?.hp).toBe(0);
  expect(raw[3].combat.enemies[2]).toMatchObject({ current_hp: 3, block: 0 });
  expect(raw[4].combat.enemies).toHaveLength(2);
});

it("keeps the initial trigger and treats a mid-turn attach with no observed grant as unknown", () => {
  for (const raw of [fixture().states[0], fixture().states[2]]) {
    const state = parseGameState(raw);
    const enemies = enemySims(raw.combat, 10);
    carrySilentSkittish(createScreenMemory("COMBAT"), state, enemies);
    expect(enemies.map((enemy) => enemy.skittish)).toEqual([7, 7, 7]);
  }
});

it("does not transfer consumed triggers across turns, rosters, reloads or unsupported scopes", () => {
  const edits = [
    (raw: any) => { raw.turn += 1; },
    (raw: any) => { raw.combat.enemies.shift(); raw.combat.enemies.forEach((enemy: any, i: number) => { enemy.index = i; }); },
    (raw: any) => { raw.combat.player.cards_played_this_turn = 0; },
    (raw: any) => { raw.run_id = "ANOTHER_RUN"; },
    (raw: any) => { raw.run.character_id = "IRONCLAD"; },
    (raw: any) => { raw.run.ascension = 9; },
    (raw: any) => { delete raw.combat.player.cards_played_this_turn; },
  ];
  for (const edit of edits) {
    const raw = fixture().states;
    const memory = createScreenMemory("COMBAT");
    observeSilentSkittish(memory, parseGameState(raw[0]));
    observeSilentSkittish(memory, parseGameState(raw[1]));
    edit(raw[2]);
    const enemies = enemySims(raw[2].combat, raw[2].run.ascension);
    carrySilentSkittish(memory, parseGameState(raw[2]), enemies);
    expect(enemies.every((enemy) => enemy.skittish === 7)).toBe(true);
  }
});

it("reconstructs consumption through journal replay, ignores duplicate reads and clears it on SL reset", () => {
  const raw = fixture().states;
  const memory = createScreenMemory("COMBAT");
  for (const row of raw.slice(0, 4)) {
    const state = parseGameState(row);
    observeSilentSkittish(memory, state);
    expect(observeSilentSkittish(memory, state)).toBe(false);
  }
  const enemies = enemySims(raw[3].combat, 10);
  carrySilentSkittish(memory, parseGameState(raw[3]), enemies);
  expect(enemies.map((enemy) => enemy.skittish)).toEqual([0, 0, 0]);
  const states = raw.slice(0, 4).map((state: any, index: number) => ({
    ts: String(index), observed_ts: String(index), fingerprint: `frame${index}`, state,
  }));
  const restored = replayRun({ runId: "A5HKP18P4Q0T", states, decisions: [], runPlans: [] }, knowledge);
  expect(restored.silentSkittish).toEqual(memory.silentSkittish);
  resetFightMemory(memory);
  expect(memory.silentSkittish).toBeUndefined();
});

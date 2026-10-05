/** 2PVLGRBGUX9S SILENT A7 F48 first attempt T2/T4, ledger silent-0136/0138. Fixed raw-card projection. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { deckDrawPool, pileEntries, planCombatTurn } from "../src/reflex/combat-plan.js";
import { deckModels, rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, defend } from "./boss-sim-fixture.js";
import { combatPayload } from "./scenarios.js";

vi.hoisted(() => vi.resetModules());
// Fixed evidence only: absent reference data remains unknown throughout the production planner.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Expertise test has no generated references"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

const fixture = JSON.parse(readFileSync(new URL("./silent-expertise-card.json", import.meta.url), "utf8"));
const knowledge = makeKnowledge({ cards: [{ id: "MAD_SCIENCE", type: "Power" }] }, "cache");
const science = () => modelHandCard(fixture.card, 3, knowledge, "SILENT");
const step = (index: number, id: string) => ({ cardIndex: index, cardId: id, name: id, upgraded: false });
const originalRollout = rolloutLiveOptions.enabled;
afterEach(() => { solveTap.onSolve = null; rolloutLiveOptions.enabled = originalRollout; });

it("F48 T2 Expertise gives two Strength and Dexterity, without dormant damage or block", () => {
  const input = board().solver;
  input.player.strengthNow = 1;
  input.player.block = 16;
  input.player.afterImage = 1;
  input.hand = [science()];
  const plan = replaySteps(input, [step(3, "MAD_SCIENCE")])!;
  expect(science()).toMatchObject({ strength: 2, dexterity: 2, damage: null, block: 0, draw: 0 });
  expect(plan.outcome.blockGained).toBe(1);
  expect(plan.outcome.damageDealt).toBe(0);
});

it("new Expertise Dexterity applies to later block cards and persists into the next rollout turn", () => {
  const input = board();
  input.solver.player.strengthNow = 1;
  input.solver.hand = [science(), defend(4)];
  const plan = replaySteps(input.solver, [step(3, "MAD_SCIENCE"), step(4, "DEFEND")])!;
  expect(plan.outcome.blockGained).toBe(7);
  input.plans = [plan];
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 12 }, (_, i) => defend(i + 10)), discard: [] };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 21, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const records = simulateFight(input, plan, 2, 1, false).records;
  expect(records[0]!.snap.pw).toMatchObject({ STRENGTH_POWER: 3, DEXTERITY_POWER: 2 });
  expect(records[1]!.snap.pw).toMatchObject({ STRENGTH_POWER: 3, DEXTERITY_POWER: 2 });
  expect(records[1]!.loss).toBe(0);
});

it("the unused Expertise variables do not activate the rider for a different rendered template", () => {
  for (const text of ["能力牌的耗能减少1。", "获得8点格挡。 抽3张牌。", "造成12点伤害。本回合，你每打出一张牌，该敌人失去6点生命。", ""]) {
    const other = modelHandCard({ ...fixture.card, resolved_rules_text: text }, 3, knowledge, "SILENT");
    expect(other.dexterity).toBeUndefined();
    expect(other.strength).toBe(0);
  }
});

it("the Silent observation leaves Ironclad and missing-character inputs unchanged", () => {
  for (const character of ["IRONCLAD", "", "REGENT"]) {
    expect(modelHandCard(fixture.card, 3, knowledge, character)).toMatchObject({ strength: 0, damage: 13, block: 8 });
    expect(modelHandCard(fixture.card, 3, knowledge, character).dexterity).toBeUndefined();
  }
});

it("the production planner, deck, draw fallback and visible piles use the run's character", () => {
  for (const character of ["SILENT", "IRONCLAD"]) {
    const raw = combatPayload();
    const run = raw["run"] as Record<string, unknown>;
    const combat = raw["combat"] as Record<string, unknown>;
    Object.assign(run, { character_id: character, deck: [fixture.card], relics: [], potions: [] });
    combat["hand"] = [fixture.card];
    raw["agent_view"] = { combat: { draw: [{ card_ids: ["MAD_SCIENCE"], line: "疯狂科学 [1费]" }] } };
    const state = parseGameState(raw);
    let input: SolverInput | undefined;
    rolloutLiveOptions.enabled = false;
    solveTap.onSolve = (value) => { input ??= value; };
    planCombatTurn({ state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
      runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
      screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] });
    expect(input).toBeDefined();
    const ctx = { enemyTargets: [0], strength: 0, weak: false };
    const models = [input!.hand[0]!, deckModels(state, knowledge)[0]!,
      deckDrawPool(state, knowledge, ctx, [])[0]!, pileEntries(state, knowledge, "draw", ctx)[0]!.raw];
    for (const model of models) {
      expect(model).toMatchObject(character === "SILENT"
        ? { strength: 2, dexterity: 2, damage: null, block: 0 }
        : { strength: 0, damage: 13, block: 8 });
      if (character === "IRONCLAD") expect(model.dexterity).toBeUndefined();
    }
  }
});

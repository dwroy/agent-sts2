/** CSBR5CRDWQNB F33 attempt 6 T1/T2/T4; ledger silent-0061/0063. Fixed data, no model calls. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { fightStartRelics } from "../src/sim/boss-start.js";
import { board, card, defend, strike } from "./boss-sim-fixture.js";

vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const knowledge = makeKnowledge({ cards: [
  ...["STRIKE_SILENT", "RICOCHET", "SLICE", "ECHOING_SLASH"].map((id) => ({ id, type: "Attack" })),
  { id: "SERPENT_FORM", type: "Power" },
], monsters: [{ id: "CRUSHER", type: "Boss" }, { id: "ROCKET", type: "Boss" }] }, "cache");
const step = (cardIndex: number, cardId: string, target?: number) => ({ cardIndex, cardId, name: cardId, upgraded: false, target });

beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false;
});
afterEach(() => {
  solveTap.onSolve = null;
  rolloutLiveOptions.enabled = true;
  setMonsterDbForTests(null);
});

function observedInput(character = "SILENT", held = true): { input: SolverInput; raw: Raw } {
  const raw = JSON.parse(readFileSync(new URL("./silent-daughter-wind-state.json", import.meta.url), "utf8")).state as Raw;
  raw.run.character_id = character;
  if (!held) raw.run.relics = raw.run.relics.filter((relic: Raw) => relic.relic_id !== "DAUGHTER_OF_THE_WIND");
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: { ...createScreenMemory("COMBAT"), facing: 0 }, shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the observed board was not solved");
  return { input, raw };
}

it("T2 live input: three attack cards give three block, with multi-hit Ricochet counted once", () => {
  const { input, raw } = observedInput();
  const plays = [step(1, "RICOCHET"), step(2, "SLICE", 0), step(4, "ECHOING_SLASH")];
  const plan = replaySteps(input, plays)!;
  expect(plan.outcome.blockGained).toBe(3);
  expect(plan.outcome.hpLoss).toBe(28);
  const { daughterWindBlock: _block, ...player } = input.player;
  const dry = replaySteps({ ...input, player }, plays)!;
  expect(dry.outcome.hpLoss).toBe(31);
  expect(plan.outcome.damageDealt).toBe(dry.outcome.damageDealt); // The other eight-point error has no attribution here.
  expect(fightStartRelics(raw.run, knowledge).unmodelled).not.toContain("风的女儿");
});

it("T4 relic block stays one under Frail, and skills and potions do not trigger it", () => {
  const input = board().solver;
  input.player.daughterWindBlock = observedInput().input.player.daughterWindBlock;
  input.player.weak = true;
  input.hand = [card(0, "NEUTRALIZE", { cost: 0, damage: 5 }), defend(1), defend(2),
    card(-1, "TEST_POTION", { type: "Potion", cost: 0, target: "self", validTargets: [] })];
  // Frail is already reflected in the printed block of the two observed Defends: three each.
  input.hand[1]!.block = 3;
  input.hand[2]!.block = 3;
  const plan = replaySteps(input, [step(-1, "TEST_POTION"), step(0, "NEUTRALIZE", 0), step(1, "DEFEND"), step(2, "DEFEND")])!;
  expect(plan.outcome.blockGained).toBe(7);
});

it("attack block persists into later rollout turns without a counter or repeated credit", () => {
  const input = board({ bossHp: 1000 });
  input.solver.player.daughterWindBlock = observedInput().input.player.daughterWindBlock;
  input.solver.hand = [strike(0)];
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 12 }, (_, i) => strike(i + 10)), discard: [] };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 10, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const plan = replaySteps(input.solver, [step(0, "STRIKE", 0)])!;
  input.plans = [plan];
  expect(simulateFight(input, plan, 3, 1, false).records.map((record) => record.loss)).toEqual([9, 7, 7]);
});

it("Ironclad and a Silent without the relic retain their previous solver inputs", () => {
  for (const [character, held] of [["IRONCLAD", true], ["SILENT", false]] as const) {
    const { input } = observedInput(character, held);
    expect(input.player.daughterWindBlock).toBeUndefined();
    expect(replaySteps(input, [step(1, "RICOCHET"), step(2, "SLICE", 0), step(4, "ECHOING_SLASH")])!.outcome.blockGained).toBe(0);
  }
  const { raw } = observedInput("IRONCLAD");
  expect(fightStartRelics(raw.run, knowledge).unmodelled).toContain("风的女儿");
});

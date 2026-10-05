/** 6EV5V6PJJS9D F39 T3 / T082DRCUHRRD F12 T7, silent-0108/0072. Fixed data only. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { liveSolverFields, passivePiecesOptions } from "../src/reflex/passive-pieces.js";
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
  { id: "STRIKE_SILENT", type: "Attack" }, { id: "POISONED_STAB", type: "Attack" },
  { id: "SURVIVOR", type: "Skill" }, { id: "DEFEND_SILENT", type: "Skill" },
] }, "cache");
const step = (cardIndex: number, cardId: string, target?: number) => ({ cardIndex, cardId, name: cardId, upgraded: false, target });
const originalPassive = passivePiecesOptions.enabled;
const originalRollout = rolloutLiveOptions.enabled;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  passivePiecesOptions.enabled = true;
  rolloutLiveOptions.enabled = false;
});
afterEach(() => {
  solveTap.onSolve = null;
  passivePiecesOptions.enabled = originalPassive;
  rolloutLiveOptions.enabled = originalRollout;
  setMonsterDbForTests(null);
});

function observedInput(frame = 0, character = "SILENT", held = true) {
  const raw = JSON.parse(readFileSync(new URL("./silent-tuning-fork-state.json", import.meta.url), "utf8"))[frame].state as Raw;
  raw.run.character_id = character;
  if (!held) raw.run.relics = raw.run.relics.filter((relic: Raw) => relic.relic_id !== "TUNING_FORK");
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the observed board was not solved");
  return { input, raw };
}

it("F39 T3: the first Skill crosses the persistent count nine and adds seven Block under Frail", () => {
  const { input, raw } = observedInput();
  expect(input.player.tuningFork).toEqual({ every: 10, block: 7, count: 9 });
  const plays = [step(0, "STRIKE_SILENT", 1), step(1, "SURVIVOR"), step(2, "POISONED_STAB", 1), step(3, "DEFEND_SILENT")];
  const plan = replaySteps(input, plays)!;
  expect(plan.outcome.blockGained).toBe(18);
  expect(plan.outcome.hpLoss).toBe(14);
  expect(plan.outcome.tuningForkCount).toBe(1);
  const { tuningFork: _fork, ...player } = input.player;
  const dry = replaySteps({ ...input, player }, plays)!;
  expect(dry.outcome.blockGained).toBe(11);
  expect(dry.outcome.hpLoss).toBe(21);
  expect(plan.outcome.damageDealt).toBe(dry.outcome.damageDealt);
  expect(fightStartRelics(raw.run, knowledge).unmodelled).not.toContain("音叉");
});

it("F39 T3 after discard: count ten does not award another seven on the remaining Defend", () => {
  const { input } = observedInput(1);
  expect(input.player.block).toBe(15);
  expect(input.player.tuningFork?.count).toBe(0);
  const plan = replaySteps(input, [step(0, "POISONED_STAB", 1), step(1, "DEFEND_SILENT")])!;
  expect(plan.outcome.blockGained).toBe(3);
  expect(plan.outcome.hpLoss).toBe(14);
  expect(plan.outcome.tuningForkCount).toBe(1);
});

it("Skills advance independent Fork and Letter Opener counters; attacks, powers and potions do not", () => {
  const input = board().solver;
  input.player.tuningFork = observedInput().input.player.tuningFork;
  input.player.letterOpener = { every: 3, damage: 5, count: 2 };
  input.player.energy = 10;
  input.hand = [strike(0), card(1, "POWER", { type: "Power", target: "self", validTargets: [] }),
    card(-1, "POTION", { type: "Potion", cost: 0, target: "self", validTargets: [] }), defend(2)];
  const prefix = [step(0, "STRIKE", 0), step(1, "POWER"), step(-1, "POTION")];
  expect(replaySteps(input, prefix)!.outcome.tuningForkCount).toBe(9);
  const plan = replaySteps(input, [...prefix, step(2, "DEFEND")])!;
  expect(plan.outcome.blockGained).toBe(12);
  expect(plan.outcome.damageDealt).toBe(11);
  expect(plan.outcome.tuningForkCount).toBe(0);
});

it("later rollout turns carry the persistent Skill counter instead of resetting it", () => {
  const input = board({ bossHp: 1000 });
  input.solver.player.tuningFork = { ...observedInput().input.player.tuningFork!, count: 8 };
  input.solver.hand = [defend(0)];
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 12 }, (_, i) => defend(i + 10)), discard: [] };
  input.options = { handSize: 1 };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 10, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const plan = replaySteps(input.solver, [step(0, "DEFEND")])!;
  input.plans = [plan];
  expect(simulateFight(input, plan, 3, 1, false).records.map((record) => record.loss)).toEqual([5, 0, 5]);
});

it("Ironclad, a Silent without the relic and PASSIVE_PIECES off keep their previous inputs", () => {
  for (const [character, held] of [["IRONCLAD", true], ["SILENT", false]] as const) {
    expect(observedInput(0, character, held).input.player.tuningFork).toBeUndefined();
  }
  const { raw } = observedInput();
  expect(liveSolverFields(raw.run, 0, 0, false).tuningFork).toBeUndefined();
});

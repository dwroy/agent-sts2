/** UACFSW4VDDLD A6 F33 T2/T5 and F48 T9; ledger silent-0099 / silent-0101. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

const knowledge = makeKnowledge({ cards: [
  ...["STRIKE_SILENT", "NEUTRALIZE", "SHIV", "DAGGER_SPRAY", "DASH", "PREDATOR"].map((id) => ({ id, type: "Attack" })),
  ...["BACKFLIP", "DEFEND_SILENT", "DEFLECT", "SURVIVOR", "DEADLY_POISON"].map((id) => ({ id, type: "Skill" })),
  { id: "PHANTOM_BLADES", type: "Power" }, { id: "DOUBT", type: "Curse" },
], monsters: [{ id: "KNOWLEDGE_DEMON", type: "Boss" }, { id: "TEST_SUBJECT", type: "Boss" }] }, "cache");
const step = (cardIndex: number, cardId: string, target?: number) => ({ cardIndex, cardId, name: cardId, upgraded: false, target });
const phantom = (upgraded = false, amount = 9) => modelHandCard({ card_id: "PHANTOM_BLADES", playable: true,
  energy_cost: 1, target_type: "Self", upgraded,
  rules_text: "小刀获得保留。你在每回合打出的第一张小刀额外造成{PhantomBladesPower:diff()}点伤害。",
  dynamic_values: [{ name: "PhantomBladesPower", base_value: amount, current_value: amount }] }, 0, knowledge);
const shiv = (index: number) => card(index, "SHIV", { damage: 5, damageBase: 4, cost: 0, exhausts: true });

beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false;
});
afterEach(() => {
  solveTap.onSolve = null;
  rolloutLiveOptions.enabled = true;
  setMonsterDbForTests(null);
});

function observedInput(frame: number): SolverInput {
  const raw = JSON.parse(readFileSync(new URL("./silent-phantom-blades-state.json", import.meta.url), "utf8"))[frame].state;
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the observed board was not solved");
  return input;
}

it("F33 T2: new Phantom Blades raises the observed Strike, Neutralize and Shiv sequence from 20 to 29", () => {
  const input = observedInput(0);
  const plan = replaySteps(input, [step(0, "PHANTOM_BLADES"), step(1, "STRIKE_SILENT", 0), step(3, "NEUTRALIZE", 0), step(4, "SHIV", 0)])!;
  expect(input.hand[0]!.phantomBlades).toBe(9);
  expect(plan.outcome.damageDealt).toBe(29);
  expect(plan.outcome.enemyHpAfter[0]!.hp).toBe(329); // The separate three Thorns damage is not this plan's damage.
});

it("F33 T5: two shown fourteen-damage Shivs deal fourteen then five, and a fresh plan does not spend the bonus", () => {
  const input = observedInput(1);
  expect(input.hand.filter((entry) => entry.cardId === "SHIV").map((entry) => entry.damage)).toEqual([5, 5]);
  const plan = replaySteps(input, [step(2, "SHIV", 0), step(3, "SHIV", 0)])!;
  expect(plan.outcome.damageDealt).toBe(19);
  expect(plan.outcome.enemyHpAfter[0]!.hp).toBe(203);
  expect(replaySteps(input, [step(3, "SHIV", 0)])!.outcome.damageDealt).toBe(14);
});

it("F33 T5 after the first Shiv: the remaining shown five-damage Shiv never receives another bonus", () => {
  const input = observedInput(2);
  expect(input.player.phantomBladesSpent).toBe(true);
  expect(replaySteps(input, [step(2, "SHIV", 0)])!.outcome.enemyHpAfter[0]!.hp).toBe(203);
});

it("F48 T9: Phantom Blades still passes through the existing enemy Intangible cap", () => {
  const input = observedInput(3);
  const plan = replaySteps(input, [step(0, "SHIV", 0), step(1, "SHIV", 0)])!;
  expect(input.player.phantomBlades).toBe(9);
  expect(plan.outcome.damageDealt).toBe(2);
  expect(plan.outcome.enemyHpAfter[0]!.hp).toBe(298);
});

it("new and observed Phantom Blades carry one first-Shiv bonus into each later rollout turn", () => {
  for (const observed of [false, true]) {
    const input = board({ bossHp: 500 });
    input.solver.hand = observed ? [] : [phantom()];
    input.solver.player.strengthNow = 1;
    if (observed) {
      input.solver.player.phantomBlades = 9;
      input.solver.player.phantomBladesSpent = true;
    }
    input.playerPowers = { STRENGTH_POWER: 1, ...(observed ? { PHANTOM_BLADES_POWER: 9 } : {}) };
    const plan = replaySteps(input.solver, observed ? [] : [step(0, "PHANTOM_BLADES")])!;
    input.plans = [plan];
    input.options = { handSize: 3 };
    // Pile models carry base damage; the observed strength is supplied by withStrength on each draw.
    input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 12 }, (_, i) => ({ ...shiv(10 + i), damage: 4 })), discard: [] };
    input.tables.TEST_BOSS = { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const records = simulateFight(input, plan, 3, 1, false).records;
    expect(records.map((record) => record.dmg)).toEqual([0, 24, 24]);
    expect(records[2]!.snap.pw.PHANTOM_BLADES_POWER).toBe(9);
  }
});

it("unobserved upgrades and amounts remain unmodelled, and a board without Phantom Blades keeps its damage", () => {
  expect(phantom(true).phantomBlades).toBeUndefined();
  expect(phantom(false, 18).phantomBlades).toBeUndefined();
  const input = board().solver;
  input.hand = [shiv(1), shiv(2)];
  expect(replaySteps(input, [step(1, "SHIV", 0), step(2, "SHIV", 0)])!.outcome.damageDealt).toBe(10);
});

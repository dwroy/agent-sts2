/** L704TLETMZBM SILENT A10 F48 final T3/T4, learner ledger silent-0193/0194. Fixed observations only. */
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
import { replaySteps, solveTap, solveTurn, type SolverInput } from "../src/reflex/turn-solver.js";
import { board, card, defend } from "./boss-sim-fixture.js";

vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const knowledge = makeKnowledge({ cards: [
  ...["DAGGER_THROW", "FLECHETTES", "NEUTRALIZE", "ECHOING_SLASH", "THE_HUNT", "POISONED_STAB", "STRIKE_SILENT"].map((id) => ({ id, type: "Attack" })),
  ...["SURVIVOR", "SHADOW_STEP", "ACROBATICS", "CALCULATED_GAMBLE", "LEG_SWEEP", "ADRENALINE", "BACKFLIP", "PIERCING_WAIL", "DEFEND_SILENT"].map((id) => ({ id, type: "Skill" })),
  { id: "ACCELERANT", type: "Power" }, { id: "GREED", type: "Curse" }, { id: "SHAME", type: "Curse" },
] }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false;
});
afterEach(() => {
  solveTap.onSolve = null;
  rolloutLiveOptions.enabled = oldRollout;
  setMonsterDbForTests(null);
});

function observed(frame: number, character = "SILENT", held = true) {
  const raw = JSON.parse(readFileSync(new URL("./silent-tough-bandages-state.json", import.meta.url), "utf8"))[frame].state as Raw;
  raw.run.character_id = character;
  if (!held) raw.run.relics = raw.run.relics.filter((relic: Raw) => relic.relic_id !== "TOUGH_BANDAGES");
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

function step(input: SolverInput, id: string, discards?: string[]) {
  const card = input.hand.find((entry) => entry.cardId === id)!;
  return { cardIndex: card.index, cardId: id, name: card.name, upgraded: card.upgraded,
    target: card.target === "single" ? 0 : null, ...(discards ? { discards } : {}) };
}

it("F48 final T4: Dagger Throw and Survivor discard twice for eighteen Block and six HP loss", () => {
  const { input } = observed(2);
  expect(input.player.toughBandagesBlock).toBe(3);
  input.knownTop = [card(600, "GREED", { type: "Curse", playable: false, target: "self" })];
  const steps = [step(input, "DAGGER_THROW", ["GREED"]), step(input, "SURVIVOR", ["SHADOW_STEP"]),
    step(input, "FLECHETTES"), step(input, "NEUTRALIZE")];
  const plan = replaySteps(input, steps)!;
  expect(plan.outcome).toMatchObject({ blockGained: 18, hpLoss: 6, damageDealt: 23 });
  expect(plan.steps.slice(0, 2).map((entry) => entry.discards)).toEqual([["GREED"], ["SHADOW_STEP"]]);
});

it("F48 final T3: Calculated Gamble discards nine cards for twenty-seven Block before replacement draws", () => {
  const { input } = observed(1);
  const plan = replaySteps(input, [step(input, "CALCULATED_GAMBLE")])!;
  expect(plan.steps[0]!.discards).toHaveLength(9);
  expect(plan.outcome).toMatchObject({ blockGained: 27, cardsDrawn: 9 });
  expect(input.player.block + plan.outcome.blockGained).toBe(33);
});

it("F48 final T3: Burst replays Acrobatics and each actual discard adds three Block", () => {
  const { input } = observed(0);
  expect(input.player.duplicateSkills).toBe(2);
  const plan = replaySteps(input, [step(input, "ACROBATICS", ["SHAME", "GREED"])])!;
  expect(plan.outcome.blockGained).toBe(6);
  expect(plan.steps[0]!.discards).toEqual(["SHAME", "GREED"]);
});

it("continuation frames count only new discards and do not charge the eighteen existing Block again", () => {
  const { input } = observed(3);
  expect(input.player.block).toBe(3);
  expect(replaySteps(input, [step(input, "SURVIVOR", ["SHADOW_STEP"]), step(input, "NEUTRALIZE")])!.outcome)
    .toMatchObject({ blockGained: 15, hpLoss: 6 });
  const end = observed(4).input;
  expect(end.player.block).toBe(18);
  expect(replaySteps(end, [step(end, "NEUTRALIZE")])!.outcome).toMatchObject({ blockGained: 0, hpLoss: 6 });
});

it("empty hands, potions, exhausted cards and ordinary end-turn leftovers award no discard Block", () => {
  const input = board().solver;
  input.player.toughBandagesBlock = 3;
  input.hand = [card(0, "SURVIVOR", { type: "Skill", target: "self", block: 8, discardAfterDraw: true }),
    card(-1, "POTION", { type: "Potion", target: "self", cost: 0 })];
  expect(replaySteps(input, [step(input, "SURVIVOR")])!.outcome.blockGained).toBe(8);
  input.hand = [card(0, "EXHAUST", { type: "Skill", target: "self", exhausts: true }), defend(1)];
  expect(replaySteps(input, [step(input, "EXHAUST")])!.outcome.blockGained).toBe(0);
  expect(replaySteps(input, [])!.outcome.blockGained).toBe(0);
});

it("unseen discard choices stop continuation and leave the live discard choice to Jev", () => {
  const input = board().solver;
  input.player.toughBandagesBlock = 3;
  input.hand = [card(0, "SURVIVOR", { type: "Skill", target: "self", block: 8, discardAfterDraw: true }), defend(1)];
  expect(replaySteps(input, [step(input, "SURVIVOR"), step(input, "DEFEND")])).toBeNull();
  const plans = solveTurn(input).plans.filter((plan) => plan.steps[0]?.cardId === "SURVIVOR");
  expect(plans.some((plan) => plan.outcome.blockGained === 11)).toBe(true);
  expect(plans.every((plan) => plan.steps[0]!.discards === undefined)).toBe(true);
  expect(plans.every((plan) => plan.steps.length === 1)).toBe(true);
});

it("whole-hand discard includes unknown drawn slots and held curses, excluding the played card and potion belt", () => {
  const input = board().solver;
  input.player.toughBandagesBlock = 3;
  input.hand = [card(0, "DRAW", { type: "Skill", target: "self", draw: 2 }),
    card(1, "CALCULATED_GAMBLE", { type: "Skill", target: "self", cost: 0, discardsHand: true, drawDiscardedHand: true }),
    card(2, "GREED", { type: "Curse", playable: false, target: "self" }),
    card(-1, "POTION", { type: "Potion", target: "self", cost: 0 })];
  const plan = replaySteps(input, [step(input, "DRAW"), step(input, "CALCULATED_GAMBLE")])!;
  expect(plan.outcome).toMatchObject({ blockGained: 9, cardsDrawn: 5 });
  expect(plan.steps[1]!.discards).toEqual(["GREED"]);
});

it("later rollout turns keep the observed discard relic instead of losing its solver field", () => {
  const input = board({ bossHp: 1000 });
  input.solver.player.toughBandagesBlock = 3;
  input.solver.enemies[0]!.attacks = [{ damage: 20, hits: 1 }];
  input.solver.hand = [defend(0)];
  const survivor = (index: number) => card(index, "SURVIVOR", { type: "Skill", target: "self", block: 8, discardAfterDraw: true });
  const greed = (index: number) => card(index, "GREED", { type: "Curse", playable: false, target: "self" });
  input.piles = { handBase: input.solver.hand, draw: [survivor(10), greed(11), survivor(12), greed(13)], drawTop: [0, 1, 2, 3], discard: [] };
  input.options = { handSize: 2 };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 20, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const plan = replaySteps(input.solver, [step(input.solver, "DEFEND")])!;
  input.plans = [plan];
  expect(simulateFight(input, plan, 3, 1, false).records.map((record) => record.loss)).toEqual([15, 9, 9]);
});

it("the three observed one-card discard texts are recognized only for Silent", () => {
  for (const id of ["SURVIVOR", "DAGGER_THROW", "ACROBATICS"]) {
    const raw = { card_id: id, energy_cost: 1, playable: true, target_type: "Self", rules_text: "丢弃1张牌。", resolved_rules_text: "丢弃1张牌。", dynamic_values: [] };
    expect(modelHandCard(raw, 0, knowledge, "silent").discardAfterDraw).toBe(true);
    expect(modelHandCard(raw, 0, knowledge, "ironclad").discardAfterDraw).toBeUndefined();
    expect(modelHandCard({ ...raw, upgraded: true }, 0, knowledge, "silent").discardAfterDraw).toBeUndefined();
  }
});

it("Ironclad and Silent without Tough Bandages preserve the previous solver input", () => {
  for (const [character, held] of [["IRONCLAD", true], ["SILENT", false]] as const) {
    expect(observed(2, character, held).input.player.toughBandagesBlock).toBeUndefined();
  }
});

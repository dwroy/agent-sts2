/** 1LMBFGSMCWKU A4 F48 T3/T6; learner ledger silent-0089 / silent-0091. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";
import { bossBoard, state } from "./sl-support.js";

vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));
const knowledge = makeKnowledge({ cards: ["DEFEND_SILENT", "BLUR", "DEFLECT", "BACKFLIP"].map((id) => ({ id, type: "Skill" })),
  monsters: [{ id: "TEST_SUBJECT", type: "Boss" }] }, "cache");
const held = (id: string, base: number, shown: number, index: number) => ({ index, card_id: id, name: id,
  playable: true, energy_cost: id === "DEFLECT" ? 0 : 1, target_type: "Self", resolved_rules_text: `获得${shown}点格挡。`,
  dynamic_values: [{ name: "Block", base_value: base, enchanted_value: base, current_value: shown }] });
const step = (cardIndex: number, cardId: string) => ({ cardIndex, cardId, name: cardId, upgraded: false });
const speed = () => card(0, "POTION:SPEED_POTION", { type: "Potion", cost: 0, target: "self", special: "temp_dex" });

beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = true; });

it("T6 live input reproduces eighteen block after Speed Potion instead of twenty-two", () => {
  const raw = bossBoard({ hp: 49, turn: 6, floor: 48, damage: 25, playerPowers: [
    { power_id: "DEXTERITY_POWER", amount: 3 }, { power_id: "FRAIL_POWER", amount: 96 },
  ] });
  (raw["run"] as Record<string, unknown>)["character_id"] = "SILENT";
  (raw["combat"] as Record<string, unknown>)["hand"] = [held("DEFEND_SILENT", 5, 6, 1), held("BLUR", 5, 6, 2)];
  ((raw["combat"] as Record<string, unknown>)["player"] as Record<string, unknown>)["energy"] = 3;
  const observed = state(raw);
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  planCombatTurn({ state: observed, knowledge, brief: buildRunBrief(observed, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] });
  expect(input).toBeDefined();
  input!.hand.unshift(speed());
  const plan = replaySteps(input!, [step(0, "POTION:SPEED_POTION"), step(1, "DEFEND_SILENT"), step(2, "BLUR")])!;
  expect(plan.outcome.blockGained).toBe(18);
  expect(input!.player).toMatchObject({ frail: true, dexterityNow: 3 });
  expect(input!.hand[1]!.blockBase).toBe(5);
});

it("T3 rounds each card once after Footwork and preserves gains before the power", () => {
  const input = board().solver;
  input.player = { ...input.player, frail: true, dexterityNow: 0, block: 11 };
  input.hand = [card(0, "FOOTWORK", { type: "Power", cost: 1, target: "self", dexterity: 3 }),
    modelHandCard(held("DEFLECT", 7, 5, 1), 1, knowledge), modelHandCard(held("BACKFLIP", 5, 3, 2), 2, knowledge)];
  expect(replaySteps(input, [step(0, "FOOTWORK"), step(1, "DEFLECT"), step(2, "BACKFLIP")])!.outcome.blockGained).toBe(13);
  expect(replaySteps(input, [step(1, "DEFLECT"), step(0, "FOOTWORK"), step(2, "BACKFLIP")])!.outcome.blockGained).toBe(11);
  // Without Frail the existing solver behavior stays the same, including already displayed Dexterity.
  input.player.frail = false;
  input.player.dexterityNow = 3;
  input.hand = [speed(), modelHandCard(held("DEFEND_SILENT", 5, 8, 1), 1, knowledge), modelHandCard(held("BLUR", 5, 8, 2), 2, knowledge)];
  expect(replaySteps(input, [step(0, "POTION:SPEED_POTION"), step(1, "DEFEND_SILENT"), step(2, "BLUR")])!.outcome.blockGained).toBe(26);
  input.player.frail = true;
  input.player.dexterityNow = 8;
  input.hand = [modelHandCard(held("DEFEND_SILENT", 5, 9, 1), 1, knowledge), modelHandCard(held("BLUR", 5, 9, 2), 2, knowledge)];
  expect(replaySteps(input, [step(1, "DEFEND_SILENT"), step(2, "BLUR")])!.outcome.blockGained).toBe(18);
});

it("later rollout solvers carry Frail, existing Dexterity and the unrounded base", () => {
  const input = board({ bossHp: 500 });
  input.solver.hand = [];
  input.playerPowers = { FRAIL_POWER: 99 };
  input.piles = { handBase: [], discard: [], draw: [
    card(0, "FOOTWORK", { type: "Power", cost: 1, target: "self", dexterity: 3 }),
    card(1, "DEFLECT", { type: "Skill", cost: 0, target: "self", block: 7 }),
    card(2, "BACKFLIP", { type: "Skill", target: "self", block: 5 }),
  ] };
  const plan = replaySteps(input.solver, [])!;
  input.plans = [plan];
  const later: SolverInput[] = [];
  solveTap.onSolve = (value) => { later.push(value); };
  simulateFight(input, plan, 2, 1, false);
  expect(later[0]!.player).toMatchObject({ frail: true, dexterityNow: 0 });
  expect(later[0]!.hand.find((entry) => entry.cardId === "DEFLECT")).toMatchObject({ block: 5, blockBase: 7 });
  const plays = ["FOOTWORK", "DEFLECT", "BACKFLIP"].map((id) => step(later[0]!.hand.find((entry) => entry.cardId === id)!.index, id));
  expect(replaySteps(later[0]!, plays)!.outcome.blockGained).toBe(13);
});

import { expect, it } from "vitest";
import evidence from "./silent-abrasive-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { enemySims } from "../src/reflex/combat-plan.js";
import { replaySteps, type SolverInput } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [
  { id: "ABRASIVE", type: "Power" }, { id: "NOXIOUS_FUMES", type: "Power" },
  { id: "DEFEND_SILENT", type: "Skill" },
] }, "cache");
const before = evidence.frames["288760"].state;
const raw = before.combat.hand.find((card) => card.card_id === "ABRASIVE")!;
const abrasive = (character = "silent", ascension: number | null = 10, source: unknown = raw) =>
  modelHandCard(source, 0, knowledge, character, ascension);
const step = { cardIndex: raw.index, cardId: "ABRASIVE", name: "ABRASIVE", upgraded: false, target: null };

it("MTQ F20 T3 exposes the observed permanent Dexterity and Thorns without immediate block", () => {
  expect(abrasive()).toMatchObject({ cost: 3, dexterity: 1, thorns: 4, block: 0, damage: null });
  const after = evidence.frames["288761"].state.combat.player;
  expect(after.powers).toEqual(expect.arrayContaining([
    expect.objectContaining({ power_id: "DEXTERITY_POWER", amount: 1 }),
    expect.objectContaining({ power_id: "THORNS_POWER", amount: 4 }),
  ]));
  expect(after.block).toBe(before.combat.player.block);
});

it("MTQ F20 T3 still loses 19 HP after paying for both powers and records retaliation separately", () => {
  const fumes = before.combat.hand.find((card) => card.card_id === "NOXIOUS_FUMES")!;
  const input: SolverInput = {
    hand: [abrasive(), modelHandCard(fumes, 1, knowledge, "silent", 10)],
    player: { hp: 42, maxHp: 70, energy: 4, block: 0, weak: false, vulnerable: false, intangible: false },
    enemies: enemySims(before.combat, 10, "silent"), fightKind: "monster", turn: 3,
  };
  const plan = replaySteps(input, [step, { cardIndex: fumes.index, cardId: "NOXIOUS_FUMES", name: "NOXIOUS_FUMES", upgraded: false, target: null }])!;
  expect(plan.outcome).toMatchObject({ hpLoss: 19, blockGained: 0, energyLeft: 0,
    damageDealt: 8, retaliated: [{ index: 0, amount: 4 }] });
  expect(evidence.frames["288763"].state.combat.player.current_hp).toBe(23);
});

it("adds Dexterity only to the following block card, without replenishing existing block", () => {
  const defend = before.combat.hand.find((card) => card.card_id === "DEFEND_SILENT")!;
  const input = board().solver;
  input.hand = [abrasive(), modelHandCard(defend, defend.index, knowledge, "silent", 10)];
  input.player.energy = 4;
  input.player.block = 7;
  input.enemies[0]!.attacks = [];
  expect(replaySteps(input, [step])!.outcome.blockGained).toBe(0);
  expect(replaySteps(input, [step, { cardIndex: defend.index, cardId: "DEFEND_SILENT",
    name: "DEFEND_SILENT", upgraded: false, target: null }])!.outcome.blockGained).toBe(6);
});

it("both rollout paths keep the established attributes in later turns", () => {
  const input = board();
  input.solver.hand = [abrasive()];
  input.piles = { handBase: input.solver.hand, draw: [], discard: [] };
  input.meta.asc = 10;
  input.options = { handSize: 0, samples: 1, horizon: 3, k: 1, now: () => 0 };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 10, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  const plan = replaySteps(input.solver, [step])!;
  for (const scripted of [false, true]) {
    const records = simulateFight(input, plan, 3, 1, scripted).records;
    expect(records).toHaveLength(3);
    expect(records.map((record) => record.snap.pw.DEXTERITY_POWER)).toEqual([1, 1, 1]);
    expect(records.map((record) => record.snap.pw.THORNS_POWER)).toEqual([4, 4, 4]);
    expect(records.map((record) => record.hpLeft![0])).toEqual([116, 112, 108]);
  }
});

it("keeps other characters, levels, upgrades and unobserved values on the old model", () => {
  for (const character of ["ironclad", ""]) expect(abrasive(character).dexterity).toBeUndefined();
  for (const level of [null, 0, 9, 11]) expect(abrasive("silent", level).thorns).toBeUndefined();
  for (const changed of [
    { ...raw, upgraded: true }, { ...raw, energy_cost: 2 },
    { ...raw, dynamic_values: raw.dynamic_values.map((value) => ({ ...value, current_value: value.current_value + 1 })) },
  ]) {
    expect(abrasive("silent", 10, changed).dexterity).toBeUndefined();
    expect(abrasive("silent", 10, changed).thorns).toBeUndefined();
  }
});

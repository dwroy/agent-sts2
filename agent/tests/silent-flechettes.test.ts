/** 9YBKCNBFP0X5 F43 T4, HMVJKM56S4Q8 F33 T3, G403VCZ3BH1B F48 T11; silent-0150/0151. */
import { expect, it } from "vitest";
import evidence from "./silent-flechettes-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { board } from "./boss-sim-fixture.js";

// Only card types from these observed hands; no generated knowledge files are loaded.
const skills = new Set(["PURITY", "DEFEND_SILENT", "DEADLY_POISON", "CLOAK_AND_DAGGER", "SURVIVOR", "PIERCING_WAIL"]);
const knowledge = makeKnowledge({ cards: [...new Set(evidence.flatMap((frame) => frame.hand.map((card) => card.card_id)))].map((id) => ({
  id, type: skills.has(id) ? "Skill" : id === "CLUMSY" ? "Curse" : "Attack",
})) }, "cache");

function inputAt(offset: number, character = "silent"): SolverInput {
  const frame = evidence.find((entry) => entry.off === offset)!;
  // Isolate Flechettes' direct hits from poison, damage modifiers and the other unexplained deltas.
  const input = board({ bossHp: 500 }).solver;
  input.hand = frame.hand.map((entry, index) => modelHandCard(entry, index, knowledge, character));
  input.player.energy = 10;
  input.enemies[0]!.attacks = [];
  return input;
}

function steps(input: SolverInput, ids: string[]): Step[] {
  return ids.map((id) => {
    const card = input.hand.find((entry) => entry.cardId === id)!;
    return { cardIndex: card.index, cardId: id, name: card.name, upgraded: card.upgraded,
      ...(card.target === "single" ? { target: 0 } : {}) };
  });
}

function flechettesDamage(input: SolverInput, prefix: string[]): number {
  const before = replaySteps(input, steps(input, prefix))!;
  const after = replaySteps(input, steps(input, [...prefix, "FLECHETTES"]))!;
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  return after.outcome.damageDealt - before.outcome.damageDealt;
}

it("9YBK F43 T4: Defend leaving lowers three shown hits to the observed two hits for six damage", () => {
  const input = inputAt(6671218697);
  expect(flechettesDamage(input, [])).toBe(9);
  expect(flechettesDamage(input, ["DEFEND_SILENT"])).toBe(6);
  expect(flechettesDamage(inputAt(6671320090), [])).toBe(6);
  expect(input.hand.find((card) => card.cardId === "FLECHETTES")!.hits).toBe(3);
  expect(flechettesDamage(input, [])).toBe(9);
});

it("HMV F33 sixth attempt T3: Survivor and Defend leaving lower eighteen shown damage to six", () => {
  const input = inputAt(7289499060);
  expect(flechettesDamage(input, [])).toBe(18);
  expect(flechettesDamage(input, ["SURVIVOR"])).toBe(12);
  expect(flechettesDamage(input, ["SURVIVOR", "DEFEND_SILENT"])).toBe(6);
  expect(flechettesDamage(inputAt(7289628478), [])).toBe(6);
});

it("G403 F48 retry T11: two skills leave and the Chains-locked remaining skill still supplies one hit", () => {
  const input = inputAt(7339051012);
  expect(flechettesDamage(input, [])).toBe(12);
  expect(flechettesDamage(input, ["DEFEND_SILENT"])).toBe(8);
  expect(flechettesDamage(input, ["DEFEND_SILENT", "PIERCING_WAIL", "NEUTRALIZE"])).toBe(4);
  expect(flechettesDamage(inputAt(7339209547), [])).toBe(4);
});

it("an attack leaving keeps the shown hit count and other character contexts keep the prior model", () => {
  const input = inputAt(6671218697);
  expect(flechettesDamage(input, ["STRIKE_SILENT"])).toBe(9);
  for (const character of ["", "ironclad"]) {
    const prior = inputAt(6671218697, character);
    expect(prior.hand.find((card) => card.cardId === "FLECHETTES")!.hitsLoseHandSkills).toBeUndefined();
    expect(flechettesDamage(prior, ["DEFEND_SILENT"])).toBe(9);
  }
  const raw = evidence[0]!.hand.find((card) => card.card_id === "FLECHETTES")!;
  expect(modelHandCard({ ...raw, upgraded: true }, 0, knowledge, "silent").hitsLoseHandSkills).toBeUndefined();
  // Existing model transformations can retain optional fields; the observation stays scoped to its original card.
  for (const change of [{ cardId: "TEST_TRANSFORMED_ATTACK" }, { upgraded: true }]) {
    const transformed = inputAt(6671218697);
    const flechettes = transformed.hand.find((card) => card.cardId === "FLECHETTES")!;
    Object.assign(flechettes, change);
    const prefix = steps(transformed, ["DEFEND_SILENT"]);
    const before = replaySteps(transformed, prefix)!;
    const after = replaySteps(transformed, [...prefix, { cardIndex: flechettes.index, cardId: flechettes.cardId,
      name: flechettes.name, upgraded: flechettes.upgraded, target: 0 }])!;
    expect(after.outcome.damageDealt - before.outcome.damageDealt).toBe(9);
  }
});

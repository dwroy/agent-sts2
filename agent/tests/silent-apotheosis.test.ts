import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-apotheosis-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { applyApotheosisUpgrade, modelHandCard, type CardModel } from "../src/reflex/card-model.js";
import { replaySteps, type SolverInput } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

// Fixed own-character observations only; no builder output or refreshed knowledge can enter these tests.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Apotheosis evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: evidence.deck.map((entry) => ({
  id: entry.card_id, name: entry.name, type: entry.card_type,
})) }, "cache");
const models = (frame: keyof typeof evidence.frames, character = "silent", ascension: number | null = 10) =>
  evidence.frames[frame].hand.map((entry) => modelHandCard(entry, entry.index, knowledge, character, ascension));
const step = (entry: CardModel) => ({ cardIndex: entry.index, cardId: entry.cardId, name: entry.name,
  upgraded: entry.upgraded, ...(entry.target === "single" ? { target: 0 } : {}) });
const input43 = (): SolverInput => ({
  hand: [...models("before43"), card(99, "POTION:FIRE_POTION:0", { type: "Potion", cost: 0, damage: 20 })],
  player: { hp: 90, maxHp: 99, energy: 7, block: 0, weak: false, vulnerable: false,
    intangible: false, strengthNow: 1, endTurnBlock: 4 },
  enemies: [{ index: 0, name: "灵魂枢纽", hp: 254, maxHp: 254, block: 0, weak: 0,
    vulnerable: 0, artifact: 0, intangible: false, attacks: [{ damage: 31, hits: 1 }] }],
  fightKind: "monster", turn: 1,
});

it("replays F43's same full sequence with the observed 51 damage and 13 HP loss", () => {
  const input = input43();
  const before = JSON.stringify(input);
  const sequence = input.hand.filter((entry) => entry.cardId !== "ASCENDERS_BANE").map(step);
  const plan = replaySteps(input, sequence)!;
  expect(plan.outcome.damageDealt).toBe(51);
  expect(plan.outcome.hpLoss).toBe(13);
  expect(plan.outcome.energyLeft).toBe(0);
  expect(plan.outcome.enemyHpAfter[0]?.weak).toBe(2);
  expect(plan.outcome.apotheosisApplied).toBe(true);
  expect(JSON.stringify(input)).toBe(before);
});

it("reproduces both direct hand pairs, including Fasten, Wail, Block base and Tools cost", () => {
  const fields = ["damage", "damageBase", "hits", "block", "blockBase", "cost", "weak",
    "fasten", "enemyTempStrengthLoss", "poisonPerTurn"] as const;
  for (const [before, after] of [["before35", "after35"], ["before43", "after43"]] as const) {
    const observed = models(after);
    for (const plain of models(before).filter((entry) => entry.cardId !== "APOTHEOSIS")) {
      const upgraded = applyApotheosisUpgrade(plain);
      const paired = observed.find((entry) => entry.cardId === plain.cardId)!;
      expect(upgraded.upgraded, plain.cardId).toBe(paired.upgraded);
      for (const field of fields) expect(upgraded[field], `${plain.cardId}.${field}`).toBe(paired[field]);
      expect(applyApotheosisUpgrade(upgraded)).toEqual(upgraded);
    }
  }
});

it("upgrades a concrete later draw before establishing its three-point poison growth", () => {
  const input = input43();
  const fumes = models("plain45").find((entry) => entry.cardId === "NOXIOUS_FUMES")!;
  const observed = models("next43").find((entry) => entry.cardId === "NOXIOUS_FUMES")!;
  expect(applyApotheosisUpgrade(fumes).poisonPerTurn).toBe(observed.poisonPerTurn);
  const drawing = card(88, "FIXED_DRAW", { type: "Skill", target: "self", cost: 0, drawn: [{ ...fumes, index: 600, key: "drawn600" }] });
  input.player.energy = 3;
  input.hand = [input.hand[0]!, drawing];
  const plan = replaySteps(input, [step(input.hand[0]!), step(drawing), step({ ...fumes, index: 600 })])!;
  expect(plan.outcome.apotheosisApplied).toBe(true);
  expect(plan.steps.at(-1)?.upgraded).toBe(true);
});

it("carries upgrades in the draw/discard piles without changing the input deck or snapshots", () => {
  const input = board();
  input.solver = input43();
  const printed = evidence.deck.filter((entry) => ["STRIKE_SILENT", "NOXIOUS_FUMES"].includes(entry.card_id))
    .map((entry, index) => modelHandCard({ ...entry, playable: true, target_type: entry.card_type === "Attack" ? "AnyEnemy" : "Self",
      valid_target_indices: [0] }, index + 10, knowledge, "silent", 10));
  input.piles = { handBase: input.solver.hand, draw: [...printed], discard: [...printed] };
  input.enemies = [{ index: 0, id: "TEST_BOSS", move: "HIT", strength: 0, powers: {} }];
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 31, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  const before = JSON.stringify(input);
  const plan = replaySteps(input.solver, [step(input.solver.hand[0]!)])!;
  const records = simulateFight(input, plan, 2, 1, false).records;
  expect(records).toHaveLength(2);
  expect(records[1]!.snap.pw.NOXIOUS_FUMES_POWER).toBe(3);
  expect(records[1]!.dmg).toBeGreaterThanOrEqual(20);
  expect(JSON.stringify(input)).toBe(before);
});

it("keeps missing or modified upgrades visibly unknown and every unobserved scope unchanged", () => {
  const unknown = models("plain45").find((entry) => entry.cardId === "ACCELERANT")!;
  expect(applyApotheosisUpgrade(unknown)).toMatchObject({ upgraded: false, known: false });
  const plain = evidence.frames.before43.hand.find((entry) => entry.card_id === "FASTEN")!;
  expect(applyApotheosisUpgrade(modelHandCard({ ...plain, energy_cost: 0 }, 0, knowledge, "silent", 10)).known).toBe(false);
  for (const character of ["ironclad", "", "necrobinder"]) {
    expect(models("before43", character)[0]?.apotheosis).toBeUndefined();
    expect(models("before43", character).every((entry) => entry.apotheosisUpgrade === undefined)).toBe(true);
  }
  for (const ascension of [null, 0, 9, 11]) expect(models("before43", "silent", ascension)[0]?.apotheosis).toBeUndefined();
  const raw = evidence.frames.before43.hand[0]!;
  expect(modelHandCard({ ...raw, upgraded: true, energy_cost: 1 }, 0, knowledge, "silent", 10).apotheosis).toBeUndefined();
});

it("does not certify replayed or modifier-dependent Apotheosis", () => {
  const input = input43();
  input.player.weak = true;
  const plan = replaySteps(input, [step(input.hand[0]!)])!;
  expect(plan.outcome.apotheosisApplied).toBeUndefined();
  expect(plan.outcome.unknownCards).toContain("神化（重放、自动出牌或属性组合未验证）");
  input.player.weak = false;
  input.hand[0] = { ...input.hand[0]!, replay: 1 };
  expect(replaySteps(input, [step(input.hand[0]!)])!.outcome.apotheosisApplied).toBeUndefined();
});

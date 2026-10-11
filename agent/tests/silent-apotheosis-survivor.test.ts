import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-apotheosis-survivor-evidence.json";
import apotheosisEvidence from "./silent-apotheosis-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { applyApotheosisUpgrade, modelHandCard, offHandCardModel, type CardModel } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

// VLZ6CCT8AQ0A A10 only; mutable knowledge and network/model calls are not test inputs.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Survivor observations"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [{ id: "SURVIVOR", type: "Skill" }, { id: "APOTHEOSIS", type: "Skill" }] }, "cache");
const plain = () => offHandCardModel(evidence.plain, "SURVIVOR", false, 1, knowledge, null, 0, "silent", 10);
const god = () => modelHandCard(apotheosisEvidence.frames.before43.hand[0], 0, knowledge, "silent", 10);
const step = (entry: CardModel) => ({ cardIndex: entry.index, cardId: entry.cardId, name: entry.name, upgraded: entry.upgraded });

it("matches the observed eight-to-eleven base Block pair without changing cost or discard text", () => {
  const before = plain();
  const saved = JSON.stringify(before);
  const upgraded = applyApotheosisUpgrade(before);
  const observed = modelHandCard(evidence.upgraded, 1, knowledge, "silent", 10);
  expect(upgraded).toMatchObject({ upgraded: true, known: true, block: 11, blockBase: observed.blockBase, cost: 1 });
  expect(upgraded.text).toBe(before.text);
  expect(upgraded.discardAfterDraw).toBe(before.discardAfterDraw);
  expect(upgraded.block + 4).toBe(evidence.after.block);
  // F43 T5's Pounce has made the actual Skill free; this is distinct from its printed one-energy cost.
  expect(evidence.actual_play.energy_cost).toBe(0);
  expect(modelHandCard(evidence.actual_play, 2, knowledge, "silent", 10)).toMatchObject({ block: 15, cost: 0 });
  expect(applyApotheosisUpgrade(upgraded)).toEqual(upgraded);
  expect(JSON.stringify(before)).toBe(saved);
});

it("upgrades a concrete later draw within the same candidate before gaining its Block", () => {
  const input = board().solver;
  input.player.energy = 3;
  input.enemies[0]!.attacks = [];
  const drawn = { ...plain(), index: 600, key: "drawn600" };
  const drawing = card(2, "FIXED_DRAW", { type: "Skill", target: "self", cost: 0, drawn: [drawn] });
  input.hand = [god(), drawing];
  const saved = JSON.stringify(input);
  const plan = replaySteps(input, [step(input.hand[0]!), step(drawing), step(drawn)])!;
  expect(plan.outcome).toMatchObject({ apotheosisApplied: true, blockGained: 11, energyLeft: 0 });
  expect(plan.steps.at(-1)?.upgraded).toBe(true);
  expect(plan.outcome.unknownCards).not.toContain("生存者（神化升级未验证）");
  expect(JSON.stringify(input)).toBe(saved);
});

it("carries the upgraded draw pile across turns and adds existing Dexterity once", () => {
  const input = board();
  input.solver.hand = [god()];
  input.solver.player.energy = 3;
  input.solver.player.dexterityNow = 4;
  input.playerPowers = { DEXTERITY_POWER: 4 };
  input.solver.enemies[0]!.attacks = [];
  input.piles = { handBase: input.solver.hand, draw: [plain()], discard: [] };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 20, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  const saved = JSON.stringify(input);
  const plan = replaySteps(input.solver, [step(input.solver.hand[0]!)])!;
  const records = simulateFight(input, plan, 2, 1, false).records;
  expect(records).toHaveLength(2);
  expect(records[1]!.loss).toBe(5);
  expect(JSON.stringify(input)).toBe(saved);
});

it("preserves the ordinary card, other roles and levels, and unsupported raw modifiers", () => {
  expect(plain()).toMatchObject({ upgraded: false, block: 8, cost: 1 });
  for (const [character, ascension] of [["ironclad", 10], ["silent", 9], ["silent", 11]] as const) {
    expect(modelHandCard(evidence.plain, 1, knowledge, character, ascension).apotheosisUpgrade).toBeUndefined();
  }
  for (const raw of [
    { ...evidence.plain, energy_cost: 0 },
    { ...evidence.plain, enchantment: { id: "UNOBSERVED" } },
    { ...evidence.plain, resolved_rules_text: evidence.plain.resolved_rules_text + " 重放。" },
    { ...evidence.plain, dynamic_values: evidence.plain.dynamic_values.map((v) => ({ ...v, current_value: v.current_value + 1 })) },
  ]) {
    const model = modelHandCard(raw, 1, knowledge, "silent", 10);
    expect(model.apotheosisUpgrade).toBeUndefined();
    expect(applyApotheosisUpgrade(model).known).toBe(false);
  }
});

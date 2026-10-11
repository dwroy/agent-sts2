import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-apotheosis-backflip-evidence.json";
import apotheosisEvidence from "./silent-apotheosis-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { applyApotheosisUpgrade, modelHandCard, offHandCardModel, type CardModel } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

// Only frozen VLZ6CCT8AQ0A observations; no refreshed knowledge or model calls.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Backflip evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [{ id: "BACKFLIP", type: "Skill" }, { id: "APOTHEOSIS", type: "Skill" }] }, "cache");
const plain = () => offHandCardModel(evidence.plain, "BACKFLIP", false, 1, knowledge, null, 0, "silent", 10);
const god = () => modelHandCard(apotheosisEvidence.frames.before43.hand[0], 0, knowledge, "silent", 10);
const step = (entry: CardModel) => ({ cardIndex: entry.index, cardId: entry.cardId, name: entry.name, upgraded: entry.upgraded });

it("matches the observed printed 5-to-8 Block pair while preserving two draws and source bytes", () => {
  const before = plain();
  const saved = JSON.stringify(before);
  const upgraded = applyApotheosisUpgrade(before);
  const observed = modelHandCard(evidence.upgraded, 1, knowledge, "silent", 10);
  expect(upgraded).toMatchObject({ upgraded: true, known: true, block: 8, blockBase: observed.blockBase, draw: 2, cost: 1 });
  expect(upgraded.block + evidence.before.dexterity).toBe(evidence.after.block - evidence.before.block);
  expect(evidence.after.energy).toBe(evidence.before.energy - 1);
  expect(evidence.after.hand).toHaveLength(evidence.before.hand.length + 1);
  expect(applyApotheosisUpgrade(upgraded)).toEqual(upgraded);
  expect(JSON.stringify(before)).toBe(saved);
});

it("propagates the upgrade into a concrete later draw and retains Backflip's two draws", () => {
  const input = board().solver;
  input.player.energy = 3;
  input.enemies[0]!.attacks = [];
  const drawn = { ...plain(), index: 600, key: "drawn600" };
  const drawing = card(2, "FIXED_DRAW", { type: "Skill", target: "self", cost: 0, drawn: [drawn] });
  input.hand = [god(), drawing];
  const saved = JSON.stringify(input);
  const plan = replaySteps(input, [step(input.hand[0]!), step(drawing), step(drawn)])!;
  expect(plan.outcome.apotheosisApplied).toBe(true);
  expect(plan.outcome.blockGained).toBe(8);
  expect(plan.outcome.energyLeft).toBe(0);
  expect(plan.steps.at(-1)?.upgraded).toBe(true);
  expect(plan.outcome.unknownCards).not.toContain("后空翻（神化升级未验证）");
  expect(applyApotheosisUpgrade(drawn).draw).toBe(2);
  expect(JSON.stringify(input)).toBe(saved);
});

it("carries the upgraded draw pile into the next turn and separates its four existing Dexterity", () => {
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
  expect(records[1]!.loss).toBe(8);
  expect(JSON.stringify(input)).toBe(saved);
});

it("keeps ordinary Backflip unchanged and unsupported cards or modifiers unknown", () => {
  expect(plain()).toMatchObject({ upgraded: false, block: 5, draw: 2, cost: 1 });
  for (const [character, ascension] of [["ironclad", 10], ["silent", 9], ["silent", 11]] as const) {
    expect(modelHandCard(evidence.plain, 1, knowledge, character, ascension).apotheosisUpgrade).toBeUndefined();
  }
  for (const raw of [
    evidence.modified_plain,
    { ...evidence.plain, energy_cost: 0 },
    { ...evidence.plain, resolved_rules_text: evidence.plain.resolved_rules_text + " 重放。" },
    { ...evidence.plain, enchantment: { id: "UNKNOWN" } },
    { ...evidence.plain, dynamic_values: evidence.plain.dynamic_values.map((v) => ({ ...v, base_value: v.base_value + 1 })) },
  ]) {
    const model = modelHandCard(raw, 1, knowledge, "silent", 10);
    expect(model.apotheosisUpgrade).toBeUndefined();
    expect(applyApotheosisUpgrade(model).known).toBe(false);
  }
});

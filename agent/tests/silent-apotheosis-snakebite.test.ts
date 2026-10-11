import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-apotheosis-snakebite-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { applyApotheosisUpgrade, modelHandCard, type CardModel } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

// Freeze the observed cards; these regressions cannot read refreshed character knowledge.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Apotheosis Snakebite evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [{ id: "SNAKEBITE", type: "Skill" }, { id: "APOTHEOSIS", type: "Skill" }] }, "cache");
const rawPlain = { ...evidence.plain, index: 1, playable: true, target_type: "AnyEnemy",
  requires_target: true, valid_target_indices: [0] };
const plain = () => modelHandCard(rawPlain, 1, knowledge, "silent", 10);
const god = () => modelHandCard({ ...evidence.apotheosis, index: 0 }, 0, knowledge, "silent", 10);
const step = (entry: CardModel) => ({ cardIndex: entry.index, cardId: entry.cardId, name: entry.name,
  upgraded: entry.upgraded, ...(entry.target === "single" ? { target: 0 } : {}) });

it("matches F43's observed seven-to-ten pair, keeps cost two and upgrades once", () => {
  const before = plain();
  const saved = JSON.stringify(before);
  const observed = modelHandCard(evidence.upgraded, evidence.upgraded.index, knowledge, "silent", 10);
  expect(observed).toMatchObject({ upgraded: true, known: true, poison: 10, cost: 2 });
  const upgraded = applyApotheosisUpgrade(before);
  expect(upgraded).toMatchObject({ upgraded: true, known: true, poison: observed.poison, cost: observed.cost });
  expect(upgraded.text).toBe(observed.text);
  expect(applyApotheosisUpgrade(upgraded)).toEqual(upgraded);
  expect(JSON.stringify(before)).toBe(saved);
});

it("applies the paired poison in a same-line model without pretending F43 actually played Snakebite", () => {
  const input = board().solver;
  input.player.energy = 4;
  input.hand = [god(), plain()];
  input.enemies[0]!.attacks = [];
  const saved = JSON.stringify(input);
  const plan = replaySteps(input, input.hand.map(step))!;
  expect(plan.outcome).toMatchObject({ apotheosisApplied: true, damageDealt: 10, energyLeft: 0,
    enemyHpAfter: [{ hp: 110, poison: 9 }] });
  expect(plan.outcome.unknownCards).not.toContain("蛇咬（神化升级未验证）");
  expect(plan.outcome.unknownCards).toContain("神化（未知后续抽牌升级未验证）");
  expect(JSON.stringify(input)).toBe(saved);
});

it("upgrades an identified later draw before comparing its poison", () => {
  const input = board().solver;
  input.player.energy = 4;
  const drawn = { ...plain(), index: 600, key: "drawn600" };
  const drawing = card(2, "FIXED_DRAW", { type: "Skill", target: "self", cost: 0, drawn: [drawn] });
  input.hand = [god(), drawing];
  input.enemies[0]!.attacks = [];
  const plan = replaySteps(input, [step(input.hand[0]!), step(drawing), step(drawn)])!;
  expect(plan.outcome.damageDealt).toBe(10);
  expect(plan.outcome.energyLeft).toBe(0);
  expect(plan.steps.at(-1)?.upgraded).toBe(true);
  expect(plan.outcome.unknownCards).not.toContain("蛇咬（神化升级未验证）");
});

it("carries the pair from the draw pile into the next turn without modifying the input", () => {
  const input = board();
  input.solver.hand = [god()];
  input.solver.enemies[0]!.attacks = [];
  input.piles = { handBase: input.solver.hand, draw: [plain()], discard: [] };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  const saved = JSON.stringify(input);
  const plan = replaySteps(input.solver, [step(input.solver.hand[0]!)])!;
  expect(simulateFight(input, plan, 2, 1, false).records.map((record) => record.dmg)).toEqual([0, 10]);
  expect(JSON.stringify(input)).toBe(saved);
});

it("preserves ordinary Snakebite, missing upgrade coverage and the existing modifier guards", () => {
  const input = board().solver;
  input.hand = [plain()];
  input.enemies[0]!.attacks = [];
  expect(replaySteps(input, input.hand.map(step))!.outcome.damageDealt).toBe(7);
  for (const raw of [
    { ...rawPlain, energy_cost: 0 },
    { ...rawPlain, energy_cost: 1 },
    { ...rawPlain, costs_x: true },
    { ...rawPlain, enchantment: { id: "UNKNOWN" } },
    { ...rawPlain, rules_text: rawPlain.rules_text + " 未观察效果。" },
    { ...rawPlain, resolved_rules_text: rawPlain.resolved_rules_text + " 未观察效果。" },
    { ...rawPlain, resolved_rules_text: rawPlain.resolved_rules_text + " 重放。" },
    { ...rawPlain, dynamic_values: [{ ...rawPlain.dynamic_values[0]!, current_value: 8 }] },
    { ...rawPlain, dynamic_values: [{ ...rawPlain.dynamic_values[0]!, base_value: 8, current_value: 8, enchanted_value: 8 }] },
  ]) {
    const model = modelHandCard(raw, 1, knowledge, "silent", 10);
    expect(model.apotheosisUpgrade).toBeUndefined();
    expect(applyApotheosisUpgrade(model).known).toBe(false);
  }
  input.hand = [god(), plain()];
  input.player.weak = true;
  expect(replaySteps(input, [step(input.hand[0]!)])!.outcome.apotheosisApplied).toBeUndefined();
});

it("leaves other characters, unobserved levels and modified upgraded cards unchanged", () => {
  for (const [character, ascension] of [["ironclad", 10], ["silent", 9], ["silent", 11], ["silent", null]] as const) {
    expect(modelHandCard(rawPlain, 1, knowledge, character, ascension).apotheosisUpgrade).toBeUndefined();
    expect(modelHandCard(evidence.upgraded, 5, knowledge, character, ascension).poison).toBeUndefined();
  }
  for (const raw of [
    { ...evidence.upgraded, energy_cost: 0 },
    { ...evidence.upgraded, costs_x: true },
    { ...evidence.upgraded, enchantment: { id: "UNKNOWN" } },
    { ...evidence.upgraded, resolved_rules_text: evidence.plain.resolved_rules_text },
    { ...evidence.upgraded, resolved_rules_text: evidence.upgraded.resolved_rules_text + " 未观察效果。" },
    { ...evidence.upgraded, resolved_rules_text: evidence.upgraded.resolved_rules_text + " 重放。" },
    { ...evidence.upgraded, dynamic_values: [{ ...evidence.upgraded.dynamic_values[0]!, current_value: 11 }] },
  ]) expect(modelHandCard(raw, 5, knowledge, "silent", 10).poison).toBeUndefined();
});

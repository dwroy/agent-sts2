import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-apotheosis-deadly-poison-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { applyApotheosisUpgrade, modelHandCard, type CardModel } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

// The observed pair and action effects are fixed; refreshed knowledge must not affect this regression.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Deadly Poison evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [
  { id: "DEADLY_POISON", type: "Skill" }, { id: "APOTHEOSIS", type: "Skill" },
] }, "cache");
const rawPlain = { ...evidence.plain, index: 1, playable: true, target_type: "AnyEnemy", valid_target_indices: [0] };
const plain = () => modelHandCard(rawPlain, 1, knowledge, "silent", 10);
const god = () => modelHandCard(evidence.apotheosis, 0, knowledge, "silent", 10);
const step = (entry: CardModel) => ({ cardIndex: entry.index, cardId: entry.cardId, name: entry.name,
  upgraded: entry.upgraded, ...(entry.target === "single" ? { target: 0 } : {}) });

it("matches the observed five-to-seven Poison pair, including cost and displayed upgraded effect", () => {
  const before = plain();
  const saved = JSON.stringify(before);
  const upgraded = applyApotheosisUpgrade(before);
  const observed = modelHandCard(evidence.upgraded, 1, knowledge, "silent", 10);
  expect(upgraded).toMatchObject({ upgraded: true, known: true, poison: observed.poison, cost: 1, text: observed.text });
  expect(upgraded.poison).toBe(7);
  expect(plain()).toMatchObject({ upgraded: false, poison: 5, text: "给予5层中毒。" });
  expect(applyApotheosisUpgrade(upgraded)).toEqual(upgraded);
  expect(JSON.stringify(before)).toBe(saved);
});

it("matches both recorded casts without treating enemy HP damage as the new Poison amount", () => {
  const poison = (powers: { power_id: string; amount: number }[]) =>
    powers.find((power) => power.power_id === "POISON_POWER")?.amount ?? 0;
  for (const [before, after, target] of [
    [evidence.before36, evidence.after36, "TURRET_OPERATOR"],
    [evidence.before37, evidence.after37, "CUBEX_CONSTRUCT"],
  ] as const) {
    const a = before.enemies.find((enemy) => enemy.enemy_id === target)!;
    const b = after.enemies.find((enemy) => enemy.enemy_id === target)!;
    expect(poison(b.powers) - poison(a.powers)).toBe(applyApotheosisUpgrade(plain()).poison);
    expect(b.current_hp).toBe(a.current_hp);
    expect(before.player.energy - after.player.energy).toBe(1);
  }
});

it("upgrades the remaining hand before the existing end-turn Poison calculation", () => {
  const input = board().solver;
  input.hand = [god(), plain()];
  input.player.energy = 3;
  Object.assign(input.enemies[0]!, { hp: 51, maxHp: 51, poison: 0, attacks: [] });
  const saved = JSON.stringify(input);
  const plan = replaySteps(input, input.hand.map(step))!;
  expect(plan.outcome.apotheosisApplied).toBe(true);
  expect(plan.outcome.damageDealt).toBe(7);
  expect(plan.outcome.enemyHpAfter[0]).toMatchObject({ hp: 44, poison: 6 });
  expect(plan.outcome.energyLeft).toBe(0);
  expect(plan.outcome.unknownCards).not.toContain("致命毒药（神化升级未验证）");
  expect(JSON.stringify(input)).toBe(saved);
});

it("propagates the same pair to an identified later draw", () => {
  const input = board().solver;
  const drawn = { ...plain(), index: 600, key: "drawn600" };
  const drawing = card(2, "FIXED_DRAW", { type: "Skill", target: "self", cost: 0, drawn: [drawn] });
  input.hand = [god(), drawing];
  input.player.energy = 3;
  Object.assign(input.enemies[0]!, { hp: 51, maxHp: 51, poison: 0, attacks: [] });
  const plan = replaySteps(input, [step(input.hand[0]!), step(drawing), step(drawn)])!;
  expect(plan.steps.at(-1)?.upgraded).toBe(true);
  expect(plan.outcome.damageDealt).toBe(7);
  expect(plan.outcome.enemyHpAfter[0]?.poison).toBe(6);
});

it("carries the observed upgrade into the next turn's draw pile without changing the source deck", () => {
  const input = board();
  input.solver.hand = [god()];
  input.solver.player.energy = 3;
  Object.assign(input.solver.enemies[0]!, { hp: 51, maxHp: 51, poison: 0, attacks: [] });
  input.piles = { handBase: input.solver.hand, draw: [plain()], discard: [] };
  input.enemies = [{ index: 0, id: "TEST_BOSS", move: "WAIT", strength: 0, powers: {} }];
  input.tables = { TEST_BOSS: { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } } };
  const saved = JSON.stringify(input);
  const plan = replaySteps(input.solver, [step(input.solver.hand[0]!)])!;
  const result = simulateFight(input, plan, 2, 1, false);
  expect(result.records).toHaveLength(2);
  expect(result.records[1]!.dmg).toBe(7);
  expect(JSON.stringify(input)).toBe(saved);
});

it("keeps other characters, unobserved ascensions and modified previews outside the certified pair", () => {
  for (const [character, ascension] of [["ironclad", 10], ["silent", null], ["silent", 9], ["silent", 11]] as const) {
    const model = modelHandCard(rawPlain, 1, knowledge, character, ascension);
    expect(model.apotheosisUpgrade).toBeUndefined();
    expect(model.poison).toBe(5);
  }
  for (const raw of [
    { ...rawPlain, energy_cost: 0 }, { ...rawPlain, star_cost: 1 }, { ...rawPlain, star_costs_x: true },
    { ...rawPlain, enchantment: {} }, { ...rawPlain, resolved_rules_text: "重放。给予5层中毒。" },
    { ...rawPlain, rules_text: "给予{PoisonPower:diff()}层中毒。抽1张牌。" },
    { ...rawPlain, dynamic_values: rawPlain.dynamic_values.map((value) => ({ ...value, current_value: 6 })) },
  ]) {
    const model = modelHandCard(raw, 1, knowledge, "silent", 10);
    expect(model.apotheosisUpgrade).toBeUndefined();
    expect(applyApotheosisUpgrade(model).known).toBe(false);
  }
});

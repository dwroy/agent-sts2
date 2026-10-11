import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-apotheosis-poisoned-stab-evidence.json";
import godEvidence from "./silent-apotheosis-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { applyApotheosisUpgrade, modelHandCard, type CardModel } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

// Fixed Silent observations only; no refreshed knowledge may enter this regression.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Poisoned Stab evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [{ id: "POISONED_STAB", type: "Attack" }, { id: "APOTHEOSIS", type: "Skill" }] }, "cache");
const rawPlain = { ...evidence.plain, playable: true, target_type: "AnyEnemy", valid_target_indices: [0] };
const plain = () => modelHandCard(rawPlain, 1, knowledge, "silent", 10);
const god = () => modelHandCard(godEvidence.frames.before43.hand[0], 0, knowledge, "silent", 10);
const step = (entry: CardModel) => ({ cardIndex: entry.index, cardId: entry.cardId, name: entry.name,
  upgraded: entry.upgraded, ...(entry.target === "single" ? { target: 0 } : {}) });

it("propagates both observed upgrade components without charging extra energy or changing the input", () => {
  const before = plain();
  const saved = JSON.stringify(before);
  const upgraded = applyApotheosisUpgrade(before);
  const observed = modelHandCard(evidence.upgraded, 1, knowledge, "silent", 10);
  expect(upgraded).toMatchObject({ upgraded: true, known: true, cost: 1, damage: observed.damageBase,
    damageBase: observed.damageBase, poison: observed.poison });
  expect(upgraded.damage).toBe(8);
  expect(upgraded.poison).toBe(4);
  expect(applyApotheosisUpgrade(upgraded)).toEqual(upgraded);
  expect(JSON.stringify(before)).toBe(saved);
});

it("upgrades the remaining hand before its attack and end-turn poison resolve", () => {
  const input = board().solver;
  input.hand = [god(), plain()];
  input.player.energy = 3;
  Object.assign(input.enemies[0]!, { hp: 100, maxHp: 100, poison: 0, attacks: [] });
  const saved = JSON.stringify(input);
  const plan = replaySteps(input, input.hand.map(step))!;
  expect(plan.outcome.apotheosisApplied).toBe(true);
  expect(plan.outcome.damageDealt).toBe(12);
  expect(plan.outcome.enemyHpAfter[0]).toMatchObject({ hp: 88, poison: 3 });
  expect(plan.outcome.energyLeft).toBe(0);
  expect(plan.outcome.unknownCards).not.toContain("带毒刺击（神化升级未验证）");
  expect(JSON.stringify(input)).toBe(saved);
});

it("applies the poison increment to an identified draw in the same line", () => {
  const input = board().solver;
  const drawn = { ...plain(), index: 600, key: "drawn600" };
  const drawing = card(2, "FIXED_DRAW", { type: "Skill", target: "self", cost: 0, drawn: [drawn] });
  input.hand = [god(), drawing];
  Object.assign(input.enemies[0]!, { hp: 100, maxHp: 100, poison: 0, attacks: [] });
  const plan = replaySteps(input, [step(input.hand[0]!), step(drawing), step(drawn)])!;
  expect(plan.steps.at(-1)?.upgraded).toBe(true);
  expect(plan.outcome.damageDealt).toBe(12);
  expect(plan.outcome.enemyHpAfter[0]?.poison).toBe(3);
});

it("carries the certified poison increment into a later turn's pile draw", () => {
  const input = board();
  input.solver.hand = [god()];
  input.solver.player.energy = 3;
  Object.assign(input.solver.enemies[0]!, { hp: 100, maxHp: 100, poison: 0, attacks: [] });
  input.piles = { handBase: input.solver.hand, draw: [plain()], discard: [] };
  input.enemies = [{ index: 0, id: "TEST_BOSS", move: "WAIT", strength: 0, powers: {} }];
  input.tables = { TEST_BOSS: { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } } };
  const saved = JSON.stringify(input);
  const plan = replaySteps(input.solver, [step(input.solver.hand[0]!)])!;
  const result = simulateFight(input, plan, 2, 1, false);
  expect(result.records).toHaveLength(2);
  expect(result.records[1]!.dmg).toBe(12);
  expect(JSON.stringify(input)).toBe(saved);
});

it("matches F43 T5's actual seven direct damage, four new poison and three later triggers", () => {
  const input = board().solver;
  input.hand = [modelHandCard(evidence.upgraded, 3, knowledge, "silent", 10)];
  Object.assign(input.player, { hp: 49, maxHp: 99, energy: 1, block: 15, weak: true, strengthNow: 2,
    poisonExtraTriggers: 2 });
  Object.assign(input.enemies[0]!, { hp: 128, maxHp: 254, poison: 12, attacks: [] });
  const plan = replaySteps(input, input.hand.map(step))!;
  const actualDirect = evidence.before.enemies[0]!.current_hp - evidence.after.enemies[0]!.current_hp;
  const poisonOf = (powers: { power_id: string; amount: number }[]) => powers.find((p) => p.power_id === "POISON_POWER")!.amount;
  expect(actualDirect).toBe(7);
  expect(poisonOf(evidence.after.enemies[0]!.powers) - poisonOf(evidence.before.enemies[0]!.powers)).toBe(4);
  expect(plan.outcome.damageDealt).toBe(actualDirect + 16 + 15 + 14);
  expect(plan.outcome.enemyHpAfter[0]?.hp).toBe(evidence.next.enemies[0]!.current_hp);
  expect(plan.outcome.energyLeft).toBe(evidence.after.player.energy);
});

it("leaves unobserved scopes, modifiers and the ordinary card's effect unchanged", () => {
  expect(plain()).toMatchObject({ damage: 6, poison: 3, upgraded: false });
  for (const character of ["ironclad", "", "necrobinder"]) {
    expect(modelHandCard(rawPlain, 1, knowledge, character, 10).apotheosisUpgrade).toBeUndefined();
  }
  for (const ascension of [null, 0, 9, 11]) {
    expect(modelHandCard(rawPlain, 1, knowledge, "silent", ascension).apotheosisUpgrade).toBeUndefined();
  }
  for (const raw of [{ ...rawPlain, energy_cost: 0 }, { ...rawPlain, enchantment: {} },
    { ...rawPlain, resolved_rules_text: "重放1。造成6点伤害。给予3层中毒。" },
    { ...rawPlain, dynamic_values: rawPlain.dynamic_values.map((value) => ({ ...value, current_value: 4 })) }]) {
    expect(applyApotheosisUpgrade(modelHandCard(raw, 1, knowledge, "silent", 10)).known).toBe(false);
  }
});

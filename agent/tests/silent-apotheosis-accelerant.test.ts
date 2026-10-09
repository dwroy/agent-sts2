import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-apotheosis-accelerant-evidence.json";
import apotheosisEvidence from "./silent-apotheosis-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { applyApotheosisUpgrade, modelHandCard, type CardModel } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

// Freeze own-character observations; refreshed knowledge must not enter the regression.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Accelerant evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [{ id: "ACCELERANT", type: "Power" }, { id: "APOTHEOSIS", type: "Skill" }] }, "cache");
const plain = () => modelHandCard(evidence.plain, 1, knowledge, "silent", 10);
const god = () => modelHandCard(apotheosisEvidence.frames.before43.hand[0], 0, knowledge, "silent", 10);
const step = (entry: CardModel) => ({ cardIndex: entry.index, cardId: entry.cardId, name: entry.name, upgraded: entry.upgraded });

it("matches the observed 1-to-2 pair without establishing poison or changing the source card", () => {
  const before = plain();
  const saved = JSON.stringify(before);
  const upgraded = applyApotheosisUpgrade(before);
  const observed = modelHandCard(evidence.upgraded, 5, knowledge, "silent", 10);
  expect(upgraded).toMatchObject({ upgraded: true, known: true, cost: 1, poisonExtraTriggers: observed.poisonExtraTriggers });
  expect(upgraded.poisonExtraTriggers).toBe(2);
  expect(upgraded.poison).toBeUndefined();
  expect(applyApotheosisUpgrade(upgraded)).toEqual(upgraded);
  expect(JSON.stringify(before)).toBe(saved);
});

it.each(evidence.turns)("same-line upgrade gives $damage from $poison poison, decrementing on each trigger", (turn) => {
  const input = board().solver;
  input.player.energy = 3;
  input.hand = [god(), { ...plain(), index: 1, key: "c1" }];
  Object.assign(input.enemies[0]!, { hp: turn.hp, maxHp: 254, poison: turn.poison, attacks: [] });
  const saved = JSON.stringify(input);
  const plan = replaySteps(input, input.hand.map(step))!;
  expect(plan.outcome.damageDealt).toBe(turn.damage);
  expect(plan.outcome.enemyHpAfter[0]).toMatchObject({ hp: turn.after, poison: turn.poison - 3 });
  expect(plan.outcome.energyLeft).toBe(0);
  expect(plan.outcome.unknownCards).not.toContain("触媒（神化升级未验证）");
  expect(JSON.stringify(input)).toBe(saved);
});

it("upgrades an identified later draw before playing it in the same line", () => {
  const input = board().solver;
  input.player.energy = 3;
  const drawn = { ...plain(), index: 600, key: "drawn600" };
  const drawing = card(2, "FIXED_DRAW", { type: "Skill", target: "self", cost: 0, drawn: [drawn] });
  input.hand = [god(), drawing];
  Object.assign(input.enemies[0]!, { hp: 177, maxHp: 254, poison: 12, attacks: [] });
  const plan = replaySteps(input, [step(input.hand[0]!), step(drawing), step(drawn)])!;
  expect(plan.outcome.damageDealt).toBe(33);
  expect(plan.steps.at(-1)?.upgraded).toBe(true);
});

it("carries the pair from the draw pile into later turns and preserves the input snapshot", () => {
  const input = board();
  input.solver.hand = [god()];
  input.solver.player.energy = 3;
  input.solver.enemies[0]!.attacks = [];
  input.solver.enemies[0]!.poison = 12;
  input.piles = { handBase: input.solver.hand, draw: [plain()], discard: [] };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  const saved = JSON.stringify(input);
  const plan = replaySteps(input.solver, [step(input.solver.hand[0]!)])!;
  const records = simulateFight(input, plan, 3, 1, false).records;
  expect(records).toHaveLength(3);
  expect(records[0]!.snap.pw.ACCELERANT_POWER ?? 0).toBe(0);
  expect(records[1]!.snap.pw.ACCELERANT_POWER).toBe(2);
  expect(records[2]!.snap.pw.ACCELERANT_POWER).toBe(2);
  expect(records.map((record) => record.dmg)).toEqual([12, 30, 21]);
  expect(JSON.stringify(input)).toBe(saved);
});

it("keeps ordinary play and missing poison distinct from the newly observed upgrade", () => {
  const input = board().solver;
  input.hand = [plain()];
  input.enemies[0]!.poison = 12;
  expect(replaySteps(input, input.hand.map(step))!.outcome.damageDealt).toBe(23);
  input.hand = [god(), { ...plain(), index: 1, key: "c1" }];
  input.enemies[0]!.poison = 0;
  expect(replaySteps(input, input.hand.map(step))!.outcome.damageDealt).toBe(0);
});

it("does not infer upgrades for other characters, levels, changed values, costs or replay", () => {
  for (const [character, ascension] of [["ironclad", 10], ["silent", 9], ["silent", 11]] as const) {
    expect(modelHandCard(evidence.plain, 1, knowledge, character, ascension).apotheosisUpgrade).toBeUndefined();
  }
  for (const raw of [
    { ...evidence.plain, energy_cost: 0 },
    { ...evidence.plain, resolved_rules_text: evidence.plain.resolved_rules_text + " 重放。" },
    { ...evidence.plain, dynamic_values: [{ ...evidence.plain.dynamic_values[0]!, current_value: 3 }] },
    { ...evidence.plain, dynamic_values: [{ ...evidence.plain.dynamic_values[0]!, base_value: 3, current_value: 3, enchanted_value: 3 }] },
    { ...evidence.plain, enchantment: { id: "UNKNOWN" } },
  ]) {
    const model = modelHandCard(raw, 1, knowledge, "silent", 10);
    expect(model.apotheosisUpgrade).toBeUndefined();
    expect(applyApotheosisUpgrade(model).known).toBe(false);
  }
});

import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-apotheosis-neutralize-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { applyApotheosisUpgrade, modelHandCard, type CardModel } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

// Only fixed Silent observations enter the regression, including the visible pile text.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Neutralize evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [{ id: "NEUTRALIZE", type: "Attack" }, { id: "APOTHEOSIS", type: "Skill" }] }, "cache");
const plain = () => modelHandCard(evidence.plain, 1, knowledge, "silent", 10);
const god = () => modelHandCard(evidence.apotheosis, 0, knowledge, "silent", 10);
const step = (entry: CardModel) => ({ cardIndex: entry.index, cardId: entry.cardId, name: entry.name,
  upgraded: entry.upgraded, ...(entry.target === "single" ? { target: 0 } : {}) });

it("matches the pile's zero-cost pair and the one-Strength hand without mutating either input", () => {
  expect(evidence.draw_before.line).toBe("中和 [0费]：造成3点伤害。 给予1层虚弱。");
  expect(evidence.draw_after.line).toBe("中和+ [0费]：造成4点伤害。 给予2层虚弱。");
  const original = plain();
  const saved = JSON.stringify(original);
  const upgraded = applyApotheosisUpgrade(original);
  const observed = modelHandCard(evidence.upgraded, 1, knowledge, "silent", 10);
  expect(upgraded).toMatchObject({ cost: 0, known: true, upgraded: true, damage: observed.damage, damageBase: 4, weak: 2 });
  expect(upgraded.damage).toBe(5);
  expect(applyApotheosisUpgrade(upgraded)).toEqual(upgraded);
  expect(JSON.stringify(original)).toBe(saved);
  const printed = modelHandCard(evidence.printed, 1, knowledge, "silent", 10);
  expect(applyApotheosisUpgrade(printed)).toMatchObject({ cost: 0, damage: 4, damageBase: 4, weak: 2, known: true });
});

it("composes the verified upgrade on one line and matches F43 T2's actual damage and Weak gain", () => {
  const input = board().solver;
  input.hand = [god(), plain()];
  input.player.energy = 3;
  input.player.strengthNow = 1;
  Object.assign(input.enemies[0]!, { hp: 203, maxHp: 254, weak: 1, attacks: [] });
  const saved = JSON.stringify(input);
  const plan = replaySteps(input, input.hand.map(step))!;
  const before = evidence.observed_play.before;
  const after = evidence.observed_play.after;
  expect(before.enemies[0]!.current_hp - after.enemies[0]!.current_hp).toBe(5);
  expect(plan.outcome.damageDealt).toBe(5);
  expect(after.enemies[0]!.powers.find((power) => power.power_id === "WEAK_POWER")?.amount).toBe(3);
  expect(plan.outcome.enemyHpAfter[0]).toMatchObject({ hp: 198, weak: 3 });
  expect(plan.outcome.energyLeft).toBe(1);
  expect(plan.outcome.unknownCards).not.toContain("中和（神化升级未验证）");
  expect(plan.steps.at(-1)?.upgraded).toBe(true);
  expect(JSON.stringify(input)).toBe(saved);
});

it("upgrades an identified later draw before using its damage and Weak in the same line", () => {
  const input = board().solver;
  const drawn = { ...plain(), index: 600, key: "drawn600" };
  const drawing = card(2, "FIXED_DRAW", { type: "Skill", target: "self", cost: 0, drawn: [drawn] });
  input.hand = [god(), drawing];
  input.player.strengthNow = 1;
  input.enemies[0]!.attacks = [];
  const plan = replaySteps(input, [step(input.hand[0]!), step(drawing), step(drawn)])!;
  expect(plan.outcome.damageDealt).toBe(5);
  expect(plan.outcome.enemyHpAfter[0]?.weak).toBe(2);
  expect(plan.steps.at(-1)?.upgraded).toBe(true);
});

it("carries the upgrade through the draw pile into the next turn while preserving snapshots", () => {
  const input = board();
  input.solver.hand = [god()];
  input.solver.player.strengthNow = 1;
  input.solver.enemies[0]!.attacks = [];
  // Pile entries contain printed damage; rollout applies the player's current Strength at draw time.
  const printed = modelHandCard(evidence.printed, 1, knowledge, "silent", 10);
  input.piles = { handBase: input.solver.hand, draw: [printed], discard: [] };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  const saved = JSON.stringify(input);
  const plan = replaySteps(input.solver, [step(input.solver.hand[0]!)])!;
  const records = simulateFight(input, plan, 2, 1, false).records;
  expect(records).toHaveLength(2);
  expect(records[1]!.dmg).toBe(5);
  expect(JSON.stringify(input)).toBe(saved);
});

it("keeps ordinary zero-cost play unchanged when Apotheosis was not cast", () => {
  const input = board().solver;
  input.hand = [plain()];
  input.player.strengthNow = 1;
  input.enemies[0]!.attacks = [];
  const plan = replaySteps(input, input.hand.map(step))!;
  expect(plan.outcome.damageDealt).toBe(4);
  expect(plan.outcome.energyLeft).toBe(3);
  expect(plan.steps[0]?.upgraded).toBe(false);
});

it("keeps other scopes, changed cost, extra Strength, enchantment and replay outside coverage", () => {
  for (const [character, ascension] of [["ironclad", 10], ["silent", 9], ["silent", 11]] as const) {
    expect(modelHandCard(evidence.plain, 1, knowledge, character, ascension).apotheosisUpgrade).toBeUndefined();
  }
  for (const raw of [
    { ...evidence.plain, energy_cost: 1 },
    { ...evidence.plain, energy_cost: undefined },
    { ...evidence.plain, costs_x: true },
    { ...evidence.plain, resolved_rules_text: evidence.plain.resolved_rules_text + " 重放。" },
    { ...evidence.plain, enchantment: { id: "UNKNOWN" } },
    { ...evidence.plain, dynamic_values: evidence.plain.dynamic_values.map((value) => value.name === "Damage" ? { ...value, current_value: 5 } : value) },
  ]) {
    const model = modelHandCard(raw, 1, knowledge, "silent", 10);
    expect(model.apotheosisUpgrade).toBeUndefined();
    expect(applyApotheosisUpgrade(model).known).toBe(false);
  }
});

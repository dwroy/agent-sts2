import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-apotheosis-footwork-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { applyApotheosisUpgrade, modelHandCard, type CardModel } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

// Freeze own-character observations; builder data must not enter the regression.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Footwork evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [
  { id: "FOOTWORK", type: "Power" }, { id: "APOTHEOSIS", type: "Skill" }, { id: "DEFEND_SILENT", type: "Skill" },
] }, "cache");
const model = (raw: unknown, index: number) => ({ ...modelHandCard(raw, index, knowledge, "silent", 10), index, key: `c${index}` });
const god = () => model(evidence.apotheosis, 0);
const plain = () => model(evidence.plain, 1);
const defend = () => model(evidence.defend, 2);
const step = (entry: CardModel) => ({ cardIndex: entry.index, cardId: entry.cardId, name: entry.name, upgraded: entry.upgraded });

it("matches the observed 2-to-3 pair without granting Dexterity just for holding it", () => {
  const before = plain();
  const saved = JSON.stringify(before);
  const upgraded = applyApotheosisUpgrade(before);
  expect(upgraded).toMatchObject({ upgraded: true, known: true, cost: 1, dexterity: 3 });
  expect(upgraded.dexterity).toBe(model(evidence.upgraded, 1).dexterity);
  expect(evidence.dexterity_transitions).toEqual({ F35T3: [0, 3], F43T3: [1, 4], F45T3_to_T5: [1, 3] });
  expect(applyApotheosisUpgrade(upgraded)).toEqual(upgraded);
  expect(JSON.stringify(before)).toBe(saved);
  expect(evidence.plain_pile.upgraded).toBe(false);
});

it("uses the upgraded three Dexterity on a later Block card in the same model line", () => {
  // This is a composed regression from observed effects, not an unplayed historical victory line.
  const input = board().solver;
  input.player.energy = 4;
  input.hand = [god(), plain(), defend()];
  const saved = JSON.stringify(input);
  const plan = replaySteps(input, input.hand.map(step))!;
  expect(plan.outcome.blockGained).toBe(11);
  expect(plan.outcome.energyLeft).toBe(0);
  expect(plan.outcome.unknownCards).not.toContain("灵动步法（神化升级未验证）");
  expect(JSON.stringify(input)).toBe(saved);
});

it("upgrades an identified later draw before its Dexterity affects the continuation", () => {
  const input = board().solver;
  input.player.energy = 4;
  const drawn = { ...plain(), index: 600, key: "drawn600" };
  const drawing = card(3, "FIXED_DRAW", { type: "Skill", target: "self", cost: 0, drawn: [drawn] });
  input.hand = [god(), drawing, defend()];
  const plan = replaySteps(input, [step(input.hand[0]!), step(drawing), step(drawn), step(input.hand[2]!)])!;
  expect(plan.steps[2]?.upgraded).toBe(true);
  expect(plan.outcome.blockGained).toBe(11);
});

it("propagates the printed pile card into later turns without upgrading the permanent deck", () => {
  const input = board();
  input.meta.asc = 10;
  input.solver.hand = [god()];
  input.solver.enemies[0]!.attacks = [];
  input.piles = { handBase: input.solver.hand, draw: [model({ ...evidence.plain_pile, playable: true, target_type: "Self" }, 1)], discard: [] };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  const saved = JSON.stringify(input);
  const plan = replaySteps(input.solver, [step(input.solver.hand[0]!)])!;
  const records = simulateFight(input, plan, 3, 1, false).records;
  expect(records).toHaveLength(3);
  expect(records[0]!.snap.pw.DEXTERITY_POWER ?? 0).toBe(0);
  expect(records[1]!.snap.pw.DEXTERITY_POWER).toBe(3);
  expect(records[2]!.snap.pw.DEXTERITY_POWER).toBe(3);
  expect(JSON.stringify(input)).toBe(saved);
});

it("preserves the ordinary two-Dexterity play and unobserved character or ascension paths", () => {
  const input = board().solver;
  input.hand = [plain(), defend()];
  expect(replaySteps(input, input.hand.map(step))!.outcome.blockGained).toBe(7);
  for (const [character, ascension] of [["ironclad", 10], ["silent", 9], ["silent", 11], ["", null]] as const) {
    const ordinary = modelHandCard(evidence.plain, 1, knowledge, character, ascension);
    expect(ordinary.dexterity).toBe(2);
    expect(ordinary.apotheosisUpgrade).toBeUndefined();
  }
});

it("keeps changed costs, values, enchantments and replay visibly unverified", () => {
  for (const raw of [
    { ...evidence.plain, energy_cost: 0 },
    { ...evidence.plain, resolved_rules_text: evidence.plain.resolved_rules_text + " 重放。" },
    { ...evidence.plain, dynamic_values: [{ ...evidence.plain.dynamic_values[0]!, current_value: 4 }] },
    { ...evidence.plain, dynamic_values: [{ ...evidence.plain.dynamic_values[0]!, base_value: 4, current_value: 4, enchanted_value: 4 }] },
    { ...evidence.plain, enchantment: { id: "UNKNOWN" } },
  ]) {
    const ordinary = model(raw, 1);
    expect(ordinary.apotheosisUpgrade).toBeUndefined();
    expect(applyApotheosisUpgrade(ordinary).known).toBe(false);
  }
});

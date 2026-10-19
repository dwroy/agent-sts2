import { expect, it, vi } from "vitest";
import evidence from "./silent-apotheosis-upgraded-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { applyApotheosisUpgrade, modelHandCard, type CardModel } from "../src/reflex/card-model.js";
import { replaySteps, type SolverInput } from "../src/reflex/turn-solver.js";

// PBUBM0LRTEDD A10 F49 attempt 6 T1; no refreshed knowledge or model calls.
vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__fixed_upgraded_apotheosis__/${name}`,
}));
const before = evidence.frames["311342"].combat;
const after = evidence.frames["311343"].combat;
const knowledge = makeKnowledge({ cards: before.hand.map((c) => ({ id: c.card_id, name: c.name,
  type: c.card_id === "FOOTWORK" ? "Power" : "Skill" })) }, "cache");
const models = () => before.hand.map((c) => modelHandCard(c, c.index, knowledge, "silent", 10));
const step = (c: CardModel) => ({ cardIndex: c.index, cardId: c.cardId, name: c.name, upgraded: c.upgraded });
const input = (): SolverInput => ({
  hand: models(), player: { hp: 22, maxHp: 114, block: 0, energy: 4, weak: false,
    vulnerable: false, intangible: false, strengthNow: 0 },
  enemies: [{ index: 0, name: "实验体 #C68", hp: 111, maxHp: 111, block: 0, weak: 1,
    vulnerable: 0, artifact: 0, intangible: false, enrage: 3, attacks: [{ damage: 16, hits: 1 }] }],
  fightKind: "boss", turn: 1,
});

it("upgrades the exact hand once, including Shadowmeld's observed one-to-zero cost", () => {
  expect(models()[0]).toMatchObject({ apotheosis: true, cost: 1, exhausts: true });
  for (const plain of models().slice(1)) {
    const raw = after.hand.find((c) => c.card_id === plain.cardId)!;
    const observed = modelHandCard(raw, raw.index, knowledge, "silent", 10);
    const upgraded = applyApotheosisUpgrade(plain);
    for (const field of ["cost", "block", "blockBase", "dexterity", "enemyTempStrengthLoss", "shadowmeld"] as const) {
      expect(upgraded[field], `${plain.cardId}.${field}`).toBe(observed[field]);
    }
    expect(upgraded.upgraded).toBe(true);
    expect(applyApotheosisUpgrade(upgraded)).toEqual(upgraded);
  }
});

it("replays the executed four-card prefix with 22 Block and the three Skill enrage costs", () => {
  const board = input();
  const saved = JSON.stringify(board);
  const plan = replaySteps(board, board.hand.slice(0, 4).map(step))!;
  expect(plan).not.toBeNull();
  expect(plan.outcome).toMatchObject({ apotheosisApplied: true, blockGained: 22, energyLeft: 1, damageDealt: 0 });
  expect(plan.outcome.enemyHpAfter[0]?.strengthGained).toBe(9);
  expect(plan.steps.map((c) => c.cardId)).toEqual(["APOTHEOSIS", "SHADOWMELD", "FOOTWORK", "BACKFLIP"]);
  expect(plan.outcome.unknownCards).not.toContain("融入暗影（神化升级未验证）");
  expect(plan.outcome.unknownCards).toContain("神化（未知后续抽牌升级未验证）");
  expect(JSON.stringify(board)).toBe(saved);
  expect(evidence.frames["311346"].combat.player.block).toBe(22);
  expect(evidence.frames["311347"].combat.player.current_hp).toBe(21);
  // The incoming-attack budget remains a separate model limitation; do not fit it to the observed HP loss.
});

it("keeps unobserved entry scopes and modified Shadowmeld pairs outside certification", () => {
  const raw = before.hand[0]!;
  for (const character of ["ironclad", "regent", ""]) {
    expect(modelHandCard(raw, 0, knowledge, character, 10).apotheosis).toBeUndefined();
  }
  for (const asc of [null, 0, 9, 11]) expect(modelHandCard(raw, 0, knowledge, "silent", asc).apotheosis).toBeUndefined();
  for (const change of [{ energy_cost: 0 }, { costs_x: true }, { star_cost: 1 },
    { enchantment: { id: "UNKNOWN" } }, { resolved_rules_text: raw.resolved_rules_text + " 重放。" }]) {
    expect(modelHandCard({ ...raw, ...change }, 0, knowledge, "silent", 10).apotheosis).toBeUndefined();
  }
  const shadow = before.hand[1]!;
  for (const change of [{ energy_cost: 0 }, { star_cost: 1 }, { enchantment: { id: "UNKNOWN" } },
    { resolved_rules_text: shadow.resolved_rules_text + " 未观察效果。" },
    { dynamic_values: [{ ...shadow.dynamic_values[0], current_value: 2 }] }]) {
    expect(modelHandCard({ ...shadow, ...change }, 1, knowledge, "silent", 10).apotheosisUpgrade).toBeUndefined();
  }
});

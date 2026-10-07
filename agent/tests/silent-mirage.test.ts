/** DUZUBAJ3A8GP A10 F30 T5, silent-0010; proposal 329a2629d5f1bf1e. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-mirage-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { enemySims } from "../src/reflex/combat-plan.js";
import { replaySteps, type SolverInput } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Mirage evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [
  ...["MIRAGE", "PIERCING_WAIL"].map((id) => ({ id, type: "Skill", keywords: ["Exhaust"] })),
  ...["DEFEND_SILENT", "DEADLY_POISON", "BURST"].map((id) => ({ id, type: "Skill" })),
  { id: "ECHOING_SLASH", type: "Attack" },
] }, "cache");
const frame = (index: number) => evidence.frames.find((f) => f.index === index)!;
function inputAt(index: number): SolverInput {
  const f = frame(index);
  return {
    hand: f.hand.map((h) => modelHandCard(h, h.index, knowledge, "silent", 10)),
    player: { hp: f.player.current_hp, maxHp: f.player.max_hp, energy: f.player.energy,
      block: f.player.block, weak: false, vulnerable: false, intangible: false,
      retaliate: 3, dexterityNow: 0 },
    enemies: enemySims({ enemies: f.enemies }), fightKind: "monster", turn: 5,
  };
}
const step = (input: SolverInput, index: number, target: number | null = null) => {
  const c = input.hand.find((h) => h.index === index)!;
  return { cardIndex: c.index, cardId: c.cardId, name: c.name, upgraded: c.upgraded, target, targetName: null };
};

it.each([528, 612])("frame %i: the complete played prefix gains 22 Block rather than the entry's 17", (index) => {
  const input = inputAt(index);
  expect(input.hand[3]!.block).toBe(8);
  const plan = replaySteps(input, [step(input, 0), step(input, 1, 1), step(input, 2), step(input, 3)])!;
  expect(plan.outcome.blockGained).toBe(22);
  expect(plan.outcome.hpLoss).toBe(0);
  expect(plan.outcome.enemyHpAfter.find((e) => e.index === 1)!.poison).toBe(8);
});

it("the same total poison on the other target gives the same Block", () => {
  const input = inputAt(528);
  const plan = replaySteps(input, [step(input, 0), step(input, 1, 0), step(input, 2), step(input, 3)])!;
  expect(plan.outcome.blockGained).toBe(22);
});

it("a fresh frame displaying thirteen does not add that poison a second time", () => {
  const input = inputAt(615);
  const plan = replaySteps(input, [step(input, 0)])!;
  expect(plan.outcome.blockGained).toBe(13);
  expect(plan.outcome.enemyHpAfter.find((e) => e.index === 1)!.poison).toBe(8);
});

it("Mirage before a later poison play cannot receive the later five Block", () => {
  const input = inputAt(528);
  const plan = replaySteps(input, [step(input, 3), step(input, 1, 1)])!;
  expect(plan.outcome.blockGained).toBe(8);
  const lone = inputAt(556);
  expect(replaySteps(lone, [step(lone, 1)])!.outcome.blockGained).toBe(1);
});

it("zero displayed Block can become five within the same line, without consuming poison", () => {
  const input = inputAt(528);
  input.hand = input.hand.map((c) => c.cardId === "MIRAGE" ? { ...c, block: 0 } : c);
  input.enemies.forEach((e) => { e.poison = 0; });
  const before = replaySteps(input, [step(input, 3), step(input, 1, 1)])!;
  const after = replaySteps(input, [step(input, 1, 1), step(input, 3)])!;
  expect(before.outcome.blockGained).toBe(0);
  expect(after.outcome.blockGained).toBe(5);
  expect(after.outcome.enemyHpAfter.find((e) => e.index === 1)!.poison).toBe(4);
});

it("a later rollout turn reads current poison even when the pile's shown Block is stale", () => {
  const input = board();
  const original = inputAt(528).hand;
  input.solver.hand = [];
  input.solver.enemies[0]!.poison = 4;
  input.enemies[0]!.powers = { POISON_POWER: 4 };
  input.solver.player.energy = 0;
  input.piles = { handBase: [], draw: [original[1]!, inputAt(615).hand[0]!], discard: [] };
  input.options = { horizon: 2, samples: 1, handSize: 2, now: () => 0 };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 10, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const plan = replaySteps(input.solver, [])!;
  for (const fullFight of [false, true]) {
    const records = simulateFight(input, plan, 2, 1, fullFight).records;
    expect(records[1]!.snap.blk).toBe(8);
    expect(records[1]!.snap.E[0]![9].POISON_POWER).toBe(7);
  }
});

it("unobserved modifiers retain the prior displayed-Block behavior", () => {
  for (const patch of [{ frail: true }, { dexterityNow: 2 }, { unmovableArmed: true }, { shadowmeldActive: true }]) {
    const current = inputAt(528);
    Object.assign(current.player, patch);
    const prior = { ...current, hand: current.hand.map(({ blockFromPoison: _flag, ...c }) => c) };
    const sequence = [step(current, 1, 1), step(current, 3)];
    expect(replaySteps(current, sequence)).toEqual(replaySteps(prior, sequence));
  }
});

it("other characters, levels, upgrades and unexplained calculation values keep their previous model", () => {
  const raw = frame(528).hand.find((h) => h.card_id === "MIRAGE")!;
  for (const [character, ascension] of [["ironclad", 10], ["silent", 9], ["silent", null], ["", 10]] as const) {
    expect(modelHandCard(raw, 0, knowledge, character, ascension).blockFromPoison).toBeUndefined();
  }
  expect(modelHandCard({ ...raw, upgraded: true }, 0, knowledge, "silent", 10).blockFromPoison).toBeUndefined();
  const extra = raw.dynamic_values.map((v) => v.name === "CalculationExtra" ? { ...v, current_value: 2 } : v);
  expect(modelHandCard({ ...raw, dynamic_values: extra }, 0, knowledge, "silent", 10).blockFromPoison).toBeUndefined();
});

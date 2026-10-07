/** ULP4TN1GNHMK A10 F17 first T4 and third T3; ledger silent-0226, first evidence 2SU6XN2AEJRD A6 F17 T1. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-slippery-poison-evidence.json";
import { enemySims } from "../src/reflex/combat-plan.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { replaySteps, solveTurn, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { card } from "./boss-sim-fixture.js";

// All reference reads are isolated from the background knowledge refresh.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed slippery/poison references"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [
  { id: "DEADLY_POISON", type: "Skill" }, { id: "POISONED_STAB", type: "Attack" },
], monsters: [{ id: "VANTOM", type: "Monster" }] }, "cache");

function inputAt(key: keyof typeof evidence): SolverInput {
  const frame = structuredClone(evidence[key]);
  const player = frame.combat.player;
  return { hand: [], turn: frame.turn, fightKind: "boss",
    player: { hp: player.current_hp, maxHp: player.max_hp, block: player.block,
      energy: player.energy, weak: false, vulnerable: false, intangible: false },
    // Without asc only the frozen intents are used, never the monster database.
    enemies: enemySims(frame.combat) };
}

function plays(input: SolverInput): Step[] {
  return input.hand.map((hand) => ({ cardIndex: hand.index, cardId: hand.cardId, name: hand.name,
    upgraded: hand.upgraded, target: 0, targetName: input.enemies[0]!.name }));
}

it.each([
  ["first-end", "first-next", 15, 1, 174, 0, 14],
  ["third-end", "third-next", 7, 3, 176, 2, 6],
] as const)("%s: poison loses one HP and consumes exactly one Slippery layer", (before, after, poison, slippery, hp, left, poisonLeft) => {
  const input = inputAt(before);
  expect(input.enemies[0]).toMatchObject({ poison, slippery });
  const outcome = replaySteps(input, [])!.outcome;
  expect(outcome.damageDealt).toBe(1);
  expect(outcome.enemyHpAfter[0]).toMatchObject({ hp, slippery: left, poison: poisonLeft });
  expect(evidence[after].combat.enemies[0]!.current_hp).toBe(hp);
  const actualSlippery = evidence[after].combat.enemies[0]!.powers.find((power) => power.power_id === "SLIPPERY_POWER")?.amount ?? 0;
  expect(actualSlippery).toBe(left);
  expect(solveTurn(input).plans[0]!.outcome.damageDealt).toBe(1);
});

it("first T4: two stabs and fifteen poison consume three layers for three total HP", () => {
  const input = inputAt("full-turn");
  input.hand = evidence["full-turn"].combat.hand.map((hand) => modelHandCard(hand, hand.index, knowledge));
  const outcome = replaySteps(input, plays(input))!.outcome;
  expect(outcome).toMatchObject({ damageDealt: 3, hpLoss: 0, winsFight: false });
  expect(outcome.enemyHpAfter[0]).toMatchObject({ hp: 174, slippery: 0, poison: 14 });
});

it("an attack consumes the last layer so the following poison is uncapped", () => {
  const input = inputAt("first-end");
  input.player.energy = 1;
  input.hand = [card(0, "FIXED_ATTACK", { damage: 6 })];
  const outcome = replaySteps(input, plays(input))!.outcome;
  expect(outcome.damageDealt).toBe(16);
  expect(outcome.enemyHpAfter[0]).toMatchObject({ hp: 159, slippery: 0, poison: 14 });
});

it("a fully blocked attack preserves the layer for poison, which bypasses block", () => {
  const input = inputAt("first-end");
  input.player.energy = 1;
  input.enemies[0]!.block = 10;
  input.hand = [card(0, "FIXED_ATTACK", { damage: 6 })];
  const outcome = replaySteps(input, plays(input))!.outcome;
  expect(outcome.damageDealt).toBe(1);
  expect(outcome.enemyHpAfter[0]).toMatchObject({ hp: 174, block: 4, slippery: 0, poison: 14 });
});

it("the shared immediate poison entry consumes one layer before the enemy-turn trigger", () => {
  const input = inputAt("first-end");
  input.player.energy = 1;
  input.hand = [card(0, "FIXED_POISON_TRIGGER", { type: "Skill", poisonNow: true })];
  const outcome = replaySteps(input, plays(input))!.outcome;
  expect(outcome.damageDealt).toBe(15);
  expect(outcome.enemyHpAfter[0]).toMatchObject({ hp: 160, slippery: 0, poison: 13 });
});

it("keeps poison-free Slippery and uncapped poison outcomes unchanged", () => {
  const noPoison = inputAt("first-end");
  noPoison.enemies[0]!.poison = 0;
  const poisonFree = replaySteps(noPoison, [])!.outcome.enemyHpAfter[0]!;
  expect(poisonFree).toMatchObject({ hp: 175, slippery: 1 });
  expect(poisonFree.poison ?? 0).toBe(0);
  const noSlippery = inputAt("first-end");
  noSlippery.enemies[0]!.slippery = 0;
  expect(replaySteps(noSlippery, [])!.outcome.enemyHpAfter[0]).toMatchObject({ hp: 160, slippery: 0, poison: 14 });
});

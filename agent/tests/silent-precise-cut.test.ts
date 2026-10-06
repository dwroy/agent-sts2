/** JQPT83P8KDSZ SILENT A10 F25 attempt 2 T3; silent-0166/0169. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-precise-cut-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

// Keep every reference fixed, including optional upgrade lookups.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Precise Cut references"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const skills = new Set(["BACKFLIP", "DEADLY_POISON", "DEFEND_SILENT"]);
const knowledge = makeKnowledge({ cards: [...new Set(evidence.flatMap((frame) => frame.hand.map((entry) => entry.card_id)))].map((id) => ({
  id, type: skills.has(id) ? "Skill" : "Attack",
})) }, "cache");

function inputAt(index: number, character = "silent"): SolverInput {
  const frame = evidence[index]!;
  const input = board({ bossHp: frame.enemy.hp, playerHp: frame.player.current_hp }).solver;
  input.hand = frame.hand.map((entry, i) => modelHandCard(entry, i, knowledge, character));
  input.player.energy = frame.player.energy;
  input.player.block = frame.player.block;
  input.enemies[0]!.block = frame.enemy.block;
  input.enemies[0]!.attacks = [];
  // Isolate the observed direct attack from poison and the unassigned full-line differences.
  return input;
}

function plan(input: SolverInput, indices: number[]) {
  const steps: Step[] = indices.map((index) => {
    const entry = input.hand[index]!;
    return { cardIndex: entry.index, cardId: entry.cardId, name: entry.name, upgraded: entry.upgraded,
      ...(entry.target === "single" ? { target: 0 } : {}) };
  });
  const result = replaySteps(input, steps);
  expect(result).not.toBeNull();
  return result!;
}

it("F25 retry T3: Strike leaving changes six-card Precise Cut from three to five, piercing four Block for one HP", () => {
  const input = inputAt(1);
  expect(plan(input, [0]).outcome.damageDealt).toBe(0);
  const result = plan(input, [0, 1]);
  expect(result.outcome.damageDealt).toBe(1);
  expect(result.outcome.enemyHpAfter[0]!.hp).toBe(evidence[3]!.enemy.hp);
  expect(plan(inputAt(2), [0]).outcome.damageDealt).toBe(1);
  expect(input.hand[1]!.damage).toBe(3);
  expect(result.outcome.unknownCards).toEqual([]);
});

it("Backflip changes the observed five-card hand to six before Precise Cut, reducing five damage to three", () => {
  const input = inputAt(0);
  input.enemies[0]!.block = 0;
  expect(plan(input, [2]).outcome.damageDealt).toBe(5);
  expect(plan(input, [0, 2]).outcome.damageDealt).toBe(3);
  const six = inputAt(1);
  six.enemies[0]!.block = 0;
  expect(plan(six, [1]).outcome.damageDealt).toBe(3);
});

it("held and Chains-locked cards stay in the counted hand", () => {
  for (const locked of [false, true]) {
    const input = inputAt(1);
    if (locked) {
      input.hand[0]!.soulbound = true;
      input.hand[2]!.soulbound = true;
    } else input.hand[2]!.playable = false;
    expect(plan(input, [0, 1]).outcome.damageDealt).toBe(1);
  }
});

it("a belt potion stays an available zero-cost action and never changes the hand count", () => {
  const input = inputAt(1);
  input.hand.push(card(6, "FIXED_POTION", { type: "Potion", cost: 0, target: "self", validTargets: [], block: 0 }));
  expect(plan(input, [6, 0, 1]).outcome.damageDealt).toBe(1);
});

it("unobserved hand counts and damage modifiers are flagged without inventing a formula", () => {
  const short = inputAt(1);
  short.hand[0]!.damage = 0;
  short.hand[3]!.damage = 0;
  short.enemies[0]!.block = 0;
  const result = plan(short, [0, 3, 1]);
  expect(result.outcome.damageDealt).toBe(3);
  expect(result.outcome.unknownCards).toContain("精确切击（此手牌数或伤害修正未验证）");
  const modified = inputAt(1);
  modified.player.weak = true;
  expect(plan(modified, [0, 1]).outcome.unknownCards).toContain("精确切击（此手牌数或伤害修正未验证）");
});

it("Ironclad, missing character context, upgrades and transformed cards keep the prior calculation", () => {
  for (const character of ["ironclad", ""]) {
    const input = inputAt(1, character);
    expect(input.hand[1]!.preciseCutHandDamage).toBeUndefined();
    expect(plan(input, [0, 1]).outcome.damageDealt).toBe(0);
  }
  const raw = evidence[1]!.hand[1]!;
  expect(modelHandCard({ ...raw, upgraded: true }, 1, knowledge, "silent").preciseCutHandDamage).toBeUndefined();
  for (const change of [{ upgraded: true }, { cardId: "TRANSFORMED_ATTACK" }]) {
    const input = inputAt(1);
    Object.assign(input.hand[1]!, change);
    expect(plan(input, [0, 1]).outcome.damageDealt).toBe(0);
  }
});

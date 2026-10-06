/** PJ2LL9KU7FHD SILENT A10 F17 T15/T5; silent-0166/0169, observed hand/Strength pairs only. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-precise-cut-strength-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { card } from "./boss-sim-fixture.js";

// Optional lookups must not read the refreshing character data.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Precise Cut Strength references"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [{ id: "PRECISE_CUT", type: "Attack" }] }, "cache");
type EvidenceKey = keyof typeof evidence;

function inputAt(key: EvidenceKey, character = "silent"): SolverInput {
  const frame = evidence[key];
  return {
    hand: [modelHandCard({ ...frame.cut, index: 0 }, 0, knowledge, character), ...Array.from({ length: frame.handCount - 1 }, (_, i) =>
      card(i + 1, `FIXED_LEAVE_${i}`, { type: "Skill", cost: 0, target: "self", validTargets: [] }))],
    player: { hp: 57, maxHp: 70, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: frame.strength },
    enemies: [{ index: 0, name: "FIXED_TARGET", hp: 120, maxHp: 120, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] }],
    fightKind: "boss", turn: frame.turn,
  };
}

function play(input: SolverInput, indices: number[]) {
  const steps: Step[] = indices.map((index) => {
    const entry = input.hand[index]!;
    return { cardIndex: entry.index, cardId: entry.cardId, name: entry.name, upgraded: entry.upgraded,
      ...(entry.target === "single" ? { target: 0 } : {}) };
  });
  const result = replaySteps(input, steps);
  expect(result).not.toBeNull();
  return result!;
}

it.each([
  ["-2/5", [1, 0], 3, 5],
  ["2/5", [1, 2, 0], 7, 11],
] as const)("F17 %s: departures update only the recorded Precise Cut pair", (key, steps, before, after) => {
  const input = inputAt(key);
  expect(play(input, [0]).outcome.damageDealt).toBe(before);
  const result = play(input, [...steps]);
  expect(result.outcome.damageDealt).toBe(after);
  expect(result.outcome.unknownCards).toEqual([]);
});

it.each([["-2/4", 5], ["2/3", 11]] as const)("accepts the recorded post-departure %s state", (key, damage) => {
  const input = inputAt(key);
  expect(input.hand[0]!.preciseCutHandDamage).toBe(true);
  const result = play(input, [0]);
  expect(result.outcome.damageDealt).toBe(damage);
  expect(result.outcome.unknownCards).toEqual([]);
});

it("leaves unobserved Strength/hand pairs and Weak unknown", () => {
  for (const [key, steps] of [["-2/5", [1, 2, 0]], ["2/5", [1, 0]]] as const) {
    expect(play(inputAt(key), [...steps]).outcome.unknownCards).toContain("精确切击（此手牌数或伤害修正未验证）");
  }
  const weak = inputAt("2/5");
  weak.player.weak = true;
  expect(play(weak, [1, 2, 0]).outcome.unknownCards).toContain("精确切击（此手牌数或伤害修正未验证）");
});

it("does not enable the new evidence for Ironclad, absent character context or upgrades", () => {
  for (const character of ["ironclad", ""]) {
    const input = inputAt("2/5", character);
    expect(input.hand[0]!.preciseCutHandDamage).toBeUndefined();
    expect(play(input, [1, 2, 0]).outcome.damageDealt).toBe(7);
  }
  expect(modelHandCard({ ...evidence["2/5"].cut, upgraded: true }, 0, knowledge, "silent").preciseCutHandDamage).toBeUndefined();
});

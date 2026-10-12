/** NHA2KW0RB7VP SILENT A10 F17 T1, states 283142-283148; silent-0166/0169. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-precise-cut-seven-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps, type SolverInput } from "../src/reflex/turn-solver.js";
import { board } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed seven-card evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [
  { id: "SLICE", type: "Attack" }, { id: "STRIKE_SILENT", type: "Attack" },
  { id: "PRECISE_CUT", type: "Attack" }, { id: "POUNCE", type: "Attack" },
  { id: "DEFEND_SILENT", type: "Skill" }, { id: "DEADLY_POISON", type: "Skill" },
  { id: "NOXIOUS_FUMES", type: "Power" },
] }, "cache");

function inputAt(frameIndex = 0, character = "silent", ascension: number | null = 10): SolverInput {
  const frame = evidence[frameIndex]!;
  const input = board({ bossHp: frame.enemy.current_hp, playerHp: frame.player.current_hp }).solver;
  input.hand = frame.hand.map((entry, i) => modelHandCard(entry, i, knowledge, character, ascension));
  input.player.energy = frame.player.energy;
  input.player.block = frame.player.block;
  input.enemies[0]!.attacks = [];
  return input;
}

function play(input: SolverInput, ids: string[]) {
  const steps = ids.map((id) => {
    const entry = input.hand.find((card) => card.cardId === id)!;
    return { cardIndex: entry.index, cardId: id, name: entry.name, upgraded: entry.upgraded, target: 0 };
  });
  return replaySteps(input, steps)!.outcome;
}

it("the recorded seven/six/five-card states give one/three/five direct damage", () => {
  expect([0, 1, 2].map((index) => play(inputAt(index), ["PRECISE_CUT"]).damageDealt)).toEqual([1, 3, 5]);
});

it("the same four attacks deal 31 rather than 27, with the later ten poison kept separate", () => {
  const result = play(inputAt(), ["SLICE", "STRIKE_SILENT", "PRECISE_CUT", "POUNCE"]);
  expect(result).toMatchObject({ damageDealt: 31, hpLoss: 0, hpAfter: 80 });
  expect(result.enemyHpAfter[0]!.hp).toBe(evidence[4]!.enemy.current_hp);
  expect(result.unknownCards).toEqual([]);
  expect(evidence[4]!.enemy.current_hp - evidence[6]!.enemy.current_hp).toBe(10);
});

it("each departure updates the observed starting one to three and then five", () => {
  expect(play(inputAt(), ["SLICE", "PRECISE_CUT"]).damageDealt).toBe(9);
  expect(play(inputAt(), ["SLICE", "STRIKE_SILENT", "PRECISE_CUT"]).damageDealt).toBe(17);
});

it("unobserved hand counts and damage modifiers remain unknown", () => {
  const short = inputAt();
  short.hand = short.hand.filter((entry) => !["NOXIOUS_FUMES", "DEADLY_POISON", "DEFEND_SILENT"].includes(entry.cardId));
  expect(play(short, ["PRECISE_CUT"]).unknownCards).toContain("精确切击（此手牌数或伤害修正未验证）");
  for (const change of [{ weak: true }, { strengthNow: -2 }, { strengthNow: 2 }]) {
    const input = inputAt();
    Object.assign(input.player, change);
    expect(play(input, ["SLICE", "STRIKE_SILENT", "PRECISE_CUT"]).unknownCards)
      .toContain("精确切击（此手牌数或伤害修正未验证）");
  }
});

it("other characters, unobserved ascensions and upgrades keep the starting-one calculation", () => {
  for (const [character, ascension] of [["ironclad", 10], ["", 10], ["silent", 0], ["silent", null]] as const) {
    expect(play(inputAt(0, character, ascension), ["SLICE", "STRIKE_SILENT", "PRECISE_CUT", "POUNCE"]).damageDealt).toBe(27);
  }
  const input = inputAt();
  const cut = evidence[0]!.hand.find((entry) => entry.card_id === "PRECISE_CUT")!;
  input.hand[4] = modelHandCard({ ...cut, upgraded: true }, 4, knowledge, "silent", 10);
  expect(play(input, ["SLICE", "STRIKE_SILENT", "PRECISE_CUT", "POUNCE"]).damageDealt).toBe(27);
});

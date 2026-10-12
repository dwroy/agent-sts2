/** KAY522KT5NXR F14 T1; KQQELQSZ382Z F17 attempt 6 T7; ledger silent-0219. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-snakebite-evidence.json";
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
      throw Object.assign(new Error("ENOENT: fixed Snakebite references"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [{ id: "SNAKEBITE", type: "Skill" }] }, "cache");
const raw = evidence.hand[0]!;
const snakebite = () => modelHandCard(raw, 0, knowledge, "silent");
const step = { cardIndex: 0, cardId: "SNAKEBITE", name: "蛇咬", upgraded: false, target: 0 };

it("KQQ F17 T7: Snakebite adds seven to the existing nine poison and settles sixteen", () => {
  const input: SolverInput = { hand: [snakebite()],
    player: { hp: evidence.player.current_hp, maxHp: evidence.player.max_hp,
      energy: evidence.player.energy, block: evidence.player.block, weak: false, vulnerable: false, intangible: false },
    enemies: enemySims({ enemies: evidence.enemies }), fightKind: "boss", turn: 7 };
  expect(input.hand[0]).toMatchObject({ poison: 7, known: true, flatValue: 0, cost: 2 });
  expect(replaySteps(input, [step])!.outcome).toMatchObject({ damageDealt: 16,
    enemyHpAfter: [{ hp: input.enemies[0]!.hp - 16, poison: 15 }], unknownCards: [] });
});

it("KAY F14 T1: the observed free Snakebite establishes seven poison on an unpoisoned target", () => {
  const input = board().solver;
  input.enemies[0]!.hp = 25;
  input.hand = [modelHandCard({ ...raw, energy_cost: 0 }, 0, knowledge, "silent")];
  expect(replaySteps(input, [step])!.outcome).toMatchObject({ damageDealt: 7,
    enemyHpAfter: [{ hp: 18, poison: 6 }], energyLeft: 3 });
});

it("the new application uses the existing Artifact path instead of bypassing it", () => {
  const input = board().solver;
  input.enemies[0]!.artifact = 1;
  input.hand = [snakebite()];
  expect(replaySteps(input, [step])!.outcome.enemyHpAfter[0]).toMatchObject({ hp: 120, artifact: 0 });
});

it("the added poison persists through later rollout settlements", () => {
  const input = board();
  input.solver.enemies[0]!.poison = 9;
  input.solver.enemies[0]!.attacks = [];
  input.solver.hand = [snakebite()];
  input.options = { handSize: 0 };
  input.piles = { handBase: input.solver.hand, draw: [], discard: [] };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  const plan = replaySteps(input.solver, [step])!;
  expect(simulateFight(input, plan, 3, 1, false).records.map((record) => record.dmg)).toEqual([16, 15, 14]);
});

it("unobserved upgrades and other characters keep their existing model", () => {
  expect(modelHandCard({ ...raw, upgraded: true }, 0, knowledge, "silent").poison).toBeUndefined();
  expect(modelHandCard(raw, 0, knowledge, "ironclad").poison).toBeUndefined();
});

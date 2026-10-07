/** DUZUBAJ3A8GP A10 F6 T1 / F27 T4-T5; ledger silent-0234. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-haze-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Haze references"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [{ id: "HAZE", type: "Skill" }] }, "cache");
const step = { cardIndex: 0, cardId: "HAZE", name: "迷雾", upgraded: true, target: null, targetName: null };
const upgraded = evidence.cards.True;
const plain = evidence.cards.False;
const haze = (raw = upgraded, character = "silent") => modelHandCard({ ...raw, index: 0 }, 0, knowledge, character);

it.each([[4, 2, 8, 7], [5, 7, 13, 12]])("F27 T%i: adds six poison and settles it once", (turn, before, damage, after) => {
  const input = board().solver;
  input.enemies[0]!.poison = before;
  input.hand = [haze()]; input.turn = turn;
  expect(input.hand[0]).toMatchObject({ target: "all", poison: 6, weak: 2, known: true });
  const plan = replaySteps(input, [step])!;
  expect(plan.outcome).toMatchObject({ damageDealt: damage, enemyHpAfter: [{ hp: 120 - damage, poison: after }] });
});

it("F6 T1: plain Haze applies four poison independently to both enemies", () => {
  const input = board().solver;
  input.enemies.push({ ...input.enemies[0]!, index: 1, poison: 3 });
  input.hand = [haze(plain)];
  const plan = replaySteps(input, [{ ...step, upgraded: false }])!;
  expect(plan.outcome.damageDealt).toBe(11);
  expect(plan.outcome.enemyHpAfter.map((enemy) => [enemy.hp, enemy.poison])).toEqual([[116, 3], [113, 6]]);
});

it("retains each target's existing Artifact check", () => {
  const input = board().solver;
  input.enemies.push({ ...input.enemies[0]!, index: 1 });
  input.enemies[0]!.artifact = 2; input.hand = [haze()];
  const plan = replaySteps(input, [step])!;
  expect(plan.outcome.enemyHpAfter[0]).toMatchObject({ hp: 120, artifact: 0 });
  expect(plan.outcome.enemyHpAfter[1]).toMatchObject({ hp: 114, poison: 5 });
});

it("carries the new poison through later rollout turns without another application", () => {
  const input = board();
  input.solver.enemies[0]!.poison = 2; input.solver.enemies[0]!.attacks = [];
  input.solver.hand = [haze()]; input.options = { handSize: 0 };
  input.piles = { handBase: input.solver.hand, draw: [], discard: [] };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  const plan = replaySteps(input.solver, [step])!;
  expect(simulateFight(input, plan, 3, 1, false).records.map((record) => record.dmg)).toEqual([8, 7, 6]);
});

it("keeps other characters and unobserved poison values equivalent", () => {
  expect(haze(upgraded, "ironclad").poison).toBeUndefined();
  const raw = { ...upgraded, dynamic_values: [{ name: "PoisonPower", base_value: 9, current_value: 9 }] };
  expect(modelHandCard(raw, 0, knowledge, "silent").poison).toBeUndefined();
});

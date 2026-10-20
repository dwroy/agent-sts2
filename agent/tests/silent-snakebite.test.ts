/** KAY522KT5NXR F14 T1; KQQELQSZ382Z F17 attempt 6 T7; ledger silent-0219. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-snakebite-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { enemySims } from "../src/reflex/combat-plan.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card, defend } from "./boss-sim-fixture.js";

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
  expect(modelHandCard(raw, 0, knowledge, "ironclad").retain).toBeUndefined();
  expect(modelHandCard({ ...raw, upgraded: true }, 0, knowledge, "silent").retain).toBeUndefined();
  expect(modelHandCard({ ...raw, resolved_rules_text: "给予7层中毒。" }, 0, knowledge, "silent").retain).toBeUndefined();
});

it.each(["unplayed", "played", "discarded", "one_of_two_discarded", "exhausted", "ethereal"])(
  "published Retain reaches the next hand only when eligible: %s", (mode) => {
    const input = board();
    const snake = snakebite();
    expect(snake.retain).toBe(true);
    input.solver.hand = [snake];
    input.solver.enemies[0]!.attacks = [];
    input.tables = { TEST_BOSS: { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
    const survivor = card(2, "SURVIVOR", { type: "Skill", target: "self", validTargets: [], block: 8, survivorDiscard: true });
    if (mode.includes("discarded")) input.solver.hand.push(survivor);
    if (mode === "one_of_two_discarded") input.solver.hand.push({ ...snake, index: 3, key: "other-snake" });
    if (mode === "ethereal") input.solver.hand[0] = { ...snake, ethereal: true };
    input.piles = { handBase: input.solver.hand, draw: [defend(10)], discard: [] };
    input.options = { handSize: 1 };
    const plan = replaySteps(input.solver, mode === "played" ? [step] : mode.includes("discarded") ? [{
      cardIndex: 2, cardId: "SURVIVOR", name: "生存者", upgraded: false, target: null,
    }] : [])!;
    // With multiple candidates the solver waits for a selection; supply the fixed resolved discard here.
    if (mode === "one_of_two_discarded") plan.steps[0]!.discards = ["SNAKEBITE"];
    if (mode.includes("discarded")) expect(plan.steps[0]!.discards).toEqual(["SNAKEBITE"]);
    if (mode === "exhausted") plan.outcome.exhausted = [snake.index];
    let next: SolverInput | undefined;
    solveTap.onSolve = (si) => { next = si; };
    try { simulateFight(input, plan, 2, 1, false); } finally { solveTap.onSolve = null; }
    expect(next).toBeDefined();
    expect(next!.hand.filter((c) => c.cardId === "SNAKEBITE")).toHaveLength(
      mode === "unplayed" || mode === "one_of_two_discarded" ? 1 : 0);
    expect(next!.hand.filter((c) => c.cardId === "DEFEND")).toHaveLength(1);
  },
);

/** K3676LU8B0UH A1 F17 T2; T3FW7R2R2306 A10 F8 T3-T5; ledger silent-0216. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-poison-coverage-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { enemySims, unmodelledEnemyPowers } from "../src/reflex/combat-plan.js";
import { replaySteps, type SolverInput } from "../src/reflex/turn-solver.js";

// Optional references stay empty even while background builders refresh their files.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed poison coverage references"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: ["STRIKE_SILENT", "DAGGER_THROW", "NEUTRALIZE", "DAGGER_SPRAY"]
  .map((id) => ({ id, type: "Attack" })) }, "cache");

function input(frame: typeof evidence[number]): SolverInput {
  return {
    hand: frame.attacks.map((card, index) => modelHandCard(card, index, knowledge)),
    player: { hp: 70, maxHp: 70, energy: 3, block: 0, weak: false, vulnerable: false, intangible: false },
    enemies: enemySims({ enemies: [structuredClone(frame.enemy)] }),
    fightKind: "monster", turn: frame.turn,
  };
}

function outcome(board: SolverInput) {
  const steps = board.hand.map((card) => ({ cardIndex: card.index, cardId: card.cardId,
    name: card.name, upgraded: card.upgraded, target: 0 }));
  const plan = replaySteps(board, steps);
  expect(plan).not.toBeNull();
  return plan!.outcome;
}

it.each(evidence)("$run F$floor T$turn: attacks plus poison match the observed enemy HP", (frame) => {
  const result = outcome(input(frame));
  expect(result.damageDealt).toBe(frame.enemy.current_hp - frame.observedHpAfterPoison);
  expect(result.enemyHpAfter[0]?.hp).toBe(frame.observedHpAfterPoison);
});

it("the enemy adapter and coverage report agree about the already modelled poison", () => {
  const enemy = evidence[0]!.enemy;
  expect(unmodelledEnemyPowers(enemy)).toEqual([]);
  expect(input(evidence[0]!).enemies[0]).toMatchObject({ poison: 11, unmodelled: false });
});

it("an unrelated unknown power still discounts attacks and leaves poison settlement unchanged", () => {
  const frame = structuredClone(evidence[0]!);
  frame.enemy.powers.push({ index: 1, power_id: "UNKNOWN_TEST_POWER", name: "未知测试增益", amount: 1, is_debuff: false });
  expect(unmodelledEnemyPowers(frame.enemy)).toEqual(["UNKNOWN_TEST_POWER"]);
  const result = outcome(input(frame));
  expect(result.damageDealt).toBe(19); // Two six-damage hits discounted to four, plus eleven poison.
  expect(result.enemyHpAfter[0]).toMatchObject({ hp: 191, poison: 10 });
});

it("a poison-free board keeps its existing attack damage", () => {
  const frame = structuredClone(evidence[0]!);
  frame.enemy.powers = [];
  expect(outcome(input(frame)).damageDealt).toBe(12);
});

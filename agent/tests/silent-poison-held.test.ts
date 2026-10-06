/** TKXQ6L4N9A6U SILENT A10 F22 T6; ledger silent-0213, mechanism silent-0214/0059. */
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import evidence from "./silent-poison-held-evidence.json";
import { card } from "./boss-sim-fixture.js";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { enemySims, planCombatTurn } from "../src/reflex/combat-plan.js";
import { replaySteps, type SolverInput } from "../src/reflex/turn-solver.js";

// Every optional reference remains empty, independent of background knowledge refreshes.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed poison/held references"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [
  { id: "TOXIC", type: "Status" }, { id: "STRIKE_SILENT", type: "Attack" },
  { id: "DEFEND_SILENT", type: "Skill" }, { id: "DASH", type: "Attack" },
  { id: "SUCKER_PUNCH", type: "Attack" }, { id: "SERPENT_FORM", type: "Power" },
], monsters: [{ id: "MYTE", type: "Monster" }] }, "cache");

function input(): SolverInput {
  const raw = structuredClone(evidence["before-end"]);
  const player = raw.combat.player;
  return { hand: raw.combat.hand.map((card, index) => modelHandCard(card, index, knowledge)),
    player: { hp: player.current_hp, maxHp: player.max_hp, energy: player.energy, block: player.block,
      weak: false, vulnerable: false, intangible: false },
    enemies: enemySims(raw.combat), fightKind: "monster", turn: raw.turn };
}

afterEach(() => { setMonsterDbForTests(null); vi.restoreAllMocks(); });

it("F22 T6: two held Toxic cards kill the player before either poison or enemy attack", () => {
  const result = replaySteps(input(), [])!.outcome;
  expect(result).toMatchObject({ winsFight: false, dies: true, diesOwnTurn: true,
    hpLoss: 10, hpAfter: -3, damageDealt: 0, incomingAfterBlock: 10, kills: [] });
  expect(result.enemyHpAfter.map((enemy) => [enemy.hp, enemy.poison])).toEqual([[6, 11], [1, 14]]);
  expect(evidence["after-end"].combat.player.current_hp).toBe(0);
  expect(evidence["after-end"].combat.enemies.map((enemy) => enemy.current_hp)).toEqual([6, 1]);
});

it.each([11, 25])("a safe poison finish at %i HP still pays ten held damage and cancels attacks", (hp) => {
  const board = input();
  board.player.hp = hp;
  expect(replaySteps(board, [])!.outcome).toMatchObject({ winsFight: true, dies: false,
    hpLoss: 10, hpAfter: hp - 10, damageDealt: 7, incomingAfterBlock: 10 });
});

it.each([3, 10])("held damage absorbed by %i block is paid before a poison finish", (block) => {
  const board = input();
  board.player.block = block;
  const loss = Math.max(0, 10 - block);
  expect(replaySteps(board, [])!.outcome).toMatchObject({ winsFight: loss < 7, dies: loss >= 7,
    hpLoss: loss, hpAfter: 7 - loss, damageDealt: loss < 7 ? 7 : 0 });
});

it("playing Toxic removes its held damage without bypassing the other copy", () => {
  const board = input();
  const card = board.hand[0]!;
  const step = { cardIndex: card.index, cardId: card.cardId, name: card.name, upgraded: false };
  expect(replaySteps(board, [step])!.outcome).toMatchObject({ winsFight: true, dies: false,
    hpLoss: 5, hpAfter: 2, damageDealt: 7 });
});

it("healing already gained this turn remains available to pay held damage before poison", () => {
  const board = input();
  const potion = card(6, "BLOOD_POTION", { type: "Potion", cost: 0, special: "heal", target: "self", validTargets: [] });
  board.hand.push(potion);
  expect(replaySteps(board, [{ cardIndex: potion.index, cardId: potion.cardId, name: potion.name,
    upgraded: false }])!.outcome).toMatchObject({ winsFight: true, dies: false,
    hpLoss: -6, hpAfter: 13, damageDealt: 7 });
});

it("an immediate attack win skips held damage, and a poison-free turn keeps its existing losses", () => {
  const board = input();
  board.enemies = [board.enemies[0]!];
  board.enemies[0]!.poison = 0;
  const attack = board.hand.find((card) => card.cardId === "SUCKER_PUNCH")!;
  expect(replaySteps(board, [{ cardIndex: attack.index, cardId: attack.cardId, name: attack.name,
    upgraded: false, target: 0 }])!.outcome).toMatchObject({ winsFight: true, dies: false, hpLoss: 0 });
  board.hand = board.hand.filter((card) => card.cardId === "TOXIC");
  board.enemies[0]!.hp = 64;
  expect(replaySteps(board, [])!.outcome).toMatchObject({ winsFight: false, hpLoss: 19 });
});

it("the combat planner pays or blocks held damage instead of auto-ending the poisoned board", () => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  const frame = structuredClone(evidence["before-end"]);
  const state = parseGameState({ ...frame, state_version: 1, run_id: "TKXQ6L4N9A6U",
    screen: "COMBAT", in_combat: true, available_actions: ["play_card", "end_turn"],
    session: { mode: "singleplayer", phase: "run" },
    run: { ...frame.run, relics: [], potions: [], deck: [] } });
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  expect(planCombatTurn(env)).toMatchObject({ kind: "act", label: "combat/lethal", intent: { action: "play_card" } });
});

/** XTSV1U9JD34T F48 T8, silent-0271/0228: fixed observed poison finish before F49. */
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import evidence from "./silent-poison-win-search-evidence.json" with { type: "json" };
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { modelPotion } from "../src/reflex/card-model.js";
import { replaySteps, solveTap, solveTurn, type SolverInput } from "../src/reflex/turn-solver.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed poison-win evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

// Keep the production scope guard, but freeze its reference data and avoid fitted weights.
vi.mock("../src/knowledge/double-boss.js", async (original) => {
  const mod = await original<typeof import("../src/knowledge/double-boss.js")>();
  const model: import("../src/knowledge/double-boss.js").DoubleBossModel = {
    character: "silent", ascension: 10, act: 3, firstFloor: 48, secondFloor: 49, effect: "LEVEL_10",
    evidence: [{ run: "XTSV1U9JD34T", floor: 48, turn: 8 }],
    value: { hp: [[0, 0], [97, 0]], source: "fixed scope, no additional HP weight" },
    potionHp: {}, poisonPotionAmount: 6, secondBosses: [{ boss: "QUEEN", count: 1 }],
    limitation: "No counterfactual second-boss win observed",
  };
  return { ...mod, firstDoubleBoss: (state: Parameters<typeof mod.firstDoubleBoss>[0]) => mod.firstDoubleBoss(state, model),
    doubleBossFor: (state: Parameters<typeof mod.doubleBossFor>[0]) => mod.doubleBossFor(state, model) };
});

const knowledge = makeKnowledge({ cards: [
  ...evidence.state.run.deck.map((card) => ({ id: card.card_id, type: card.card_type })),
  { id: "WITHER", type: "Status" },
], monsters: [{ id: "AEONGLASS", type: "Boss" }] }, "cache");

function captured(character = "SILENT", ascension = 10, floor = 48) {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  const raw = structuredClone(evidence.state);
  Object.assign(raw.run, { character_id: character, ascension, floor });
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (solver) => { input = solver; };
  try {
    const decision = planCombatTurn(env);
    expect(input).toBeDefined();
    return { input: input!, decision };
  } finally { solveTap.onSolve = null; }
}

afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); });

it("preserves the observed 32→23 end-turn loss while finding legal dry wins with 32 HP", () => {
  const { input, decision } = captured();
  const ended = replaySteps(input, [])!;
  expect(ended.outcome).toMatchObject({ winsFight: true, winsAfterPoison: true, hpLoss: 9, hpAfter: 23, damageDealt: 132 });
  expect(evidence.provenance.actual_hp_after).toBe(23);
  const solved = solveTurn(input);
  expect(solved.truncated).toBe(false);
  expect(solved.plans[0]!.outcome).toMatchObject({ winsFight: true, hpLoss: 0, hpAfter: 32 });
  expect(solved.plans[0]!.steps.length).toBeGreaterThan(0);
  expect(solved.plans[0]!.steps.every((step) => !step.cardId.startsWith("POTION:"))).toBe(true);
  expect(decision).toMatchObject({ kind: "act", label: "combat/lethal", intent: { action: "play_card" } });
  // The original terminal pruning only emits the empty plan, despite the playable blocks.
  const original = solveTurn({ ...input, preservePoisonWinHp: undefined });
  expect(original.nodes).toBe(1);
  expect(original.plans).toHaveLength(1);
  expect(original.plans[0]!.outcome.hpAfter).toBe(23);
});

it("still counts a new Wither at the observed six-card threshold", () => {
  const { input } = captured();
  expect(input.wither).toBeDefined();
  const board = { ...input, wither: { ...input.wither!, played: 5 } };
  const defend = board.hand.find((card) => card.cardId === "DEFEND_SILENT")!;
  const line = replaySteps(board, [{ cardIndex: defend.index, cardId: defend.cardId, name: defend.name,
    upgraded: defend.upgraded, target: null, targetName: null }])!;
  // 9 held + 9 newly generated, less the observed 8 Block: playing more can lose more.
  expect(line.outcome).toMatchObject({ winsFight: true, hpLoss: 10, hpAfter: 22 });
});

it("does not extend a poison win to drink, nor expand a win once no HP is lost", () => {
  const { input } = captured();
  const potion = modelPotion("BLOCK_POTION", "fixed block potion", 0, [])!;
  const board = { ...input, hand: [...input.hand, potion] };
  expect(solveTurn(board).plans.every((plan) => plan.steps.every((step) => !step.cardId.startsWith("POTION:")))).toBe(true);
  const safe = solveTurn({ ...input, player: { ...input.player, block: 9 } });
  expect(safe.nodes).toBe(1);
  expect(safe.plans[0]!.outcome.hpAfter).toBe(32);
});

it("keeps the node bound while extending terminal nodes", () => {
  const { input } = captured();
  expect(solveTurn({ ...input, maxNodes: 1 })).toMatchObject({ nodes: 1, truncated: true });
  const limited = solveTurn({ ...input, maxNodes: 2 });
  expect(limited.nodes).toBe(2);
  expect(limited.truncated).toBe(true);
});

it("does not declare poison victory when held damage kills the player first", () => {
  const { input } = captured();
  const board = { ...input, player: { ...input.player, hp: 9 } };
  expect(replaySteps(board, [])!.outcome).toMatchObject({ winsFight: false, dies: true, diesOwnTurn: true, damageDealt: 0 });
  expect(replaySteps(board, [])!.outcome.winsAfterPoison).toBeUndefined();
});

it.each([["IRONCLAD", 10, 48], ["SILENT", 9, 48], ["SILENT", 11, 48], ["SILENT", 10, 49]])(
  "%s A%i F%i retains the previous terminal search", (character, ascension, floor) => {
    const { input } = captured(character as string, ascension as number, floor as number);
    expect(input.preservePoisonWinHp).toBeUndefined();
    const result = solveTurn(input);
    expect(result.nodes).toBe(1);
    expect(result.plans[0]!.outcome.hpAfter).toBe(23);
  },
);

it("does not alter direct kills or the no-poison search", () => {
  const { input } = captured();
  const attack = { ...input.hand.find((card) => card.cardId === "DEFEND_SILENT")!, type: "Attack" as const,
    target: "single" as const, validTargets: [0], block: 0, damage: 200, hits: 1, cost: 0 };
  const board = { ...input, hand: [attack], enemies: input.enemies.map((enemy) => ({ ...enemy, poison: 0 })) };
  const enabled = solveTurn(board);
  const disabled = solveTurn({ ...board, preservePoisonWinHp: undefined });
  expect(enabled).toEqual(disabled);
  expect(enabled.plans[0]!.outcome).toMatchObject({ winsFight: true, hpLoss: 0 });
});

/** TCFAHJ9K19VY A10 F17 attempt 1 T2, silent-0192: fixed projections of the observed Vambrace/Frail line. */
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn, vambraceArmed } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import evidence from "./silent-vambrace-frail-evidence.json";

vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Vambrace evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [
  { id: "EXPOSE", type: "Skill" }, { id: "DEFEND_SILENT", type: "Skill" }, { id: "SURVIVOR", type: "Skill" },
] }, "cache");
const originalRollout = rolloutLiveOptions.enabled;
beforeEach(() => { rolloutLiveOptions.enabled = false; });
afterEach(() => { rolloutLiveOptions.enabled = originalRollout; solveTap.onSolve = null; });

function observedInput(key: keyof typeof evidence): SolverInput {
  const state = parseGameState(structuredClone(evidence[key].state));
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the observed board was not solved");
  return input;
}

function replay(input: SolverInput, indices: number[]) {
  const steps = indices.map((index) => {
    const card = input.hand.find((entry) => entry.index === index)!;
    return { cardIndex: index, cardId: card.cardId, name: card.name, upgraded: card.upgraded,
      ...(card.target === "single" ? { target: 0 } : {}) };
  });
  return replaySteps(input, steps)!.outcome;
}

it.each([1, 2])("recognizes the unspent doubled Frail preview for hand card %i", (index) => {
  const hand = evidence.before.state.combat.hand;
  expect(vambraceArmed(["VAMBRACE"], [hand[index]], 0, true)).toBe(true);
});

it("F17 T2: Expose, Defend, Survivor, Defend gains sixteen Block and loses five HP", () => {
  const input = observedInput("before");
  const firstBlock = evidence["after-first"].state.combat.player.block;
  const survivorBlock = evidence["after-survivor"].state.combat.player.block - firstBlock;
  const lastBlock = evidence.end.state.combat.player.block - firstBlock - survivorBlock;
  expect([firstBlock, survivorBlock, lastBlock]).toEqual([7, 6, 3]);
  expect(replay(input, [0, 1, 2, 3])).toMatchObject({ blockGained: firstBlock + survivorBlock + lastBlock, hpLoss: 5, hpAfter: 46 });
  expect(input.player.unmovableArmed).toBe(true);
});

it("re-planning after the first Block keeps the plain six and three previews", () => {
  const input = observedInput("after-first");
  expect(input.player.unmovableArmed).toBe(false);
  expect(replay(input, [0, 1])).toMatchObject({ blockGained: 9, hpLoss: 5, hpAfter: 46 });
});

it("plain Frail previews and a missing relic do not arm a second doubling", () => {
  const hand = evidence["after-first"].state.combat.hand;
  expect(vambraceArmed(["VAMBRACE"], hand, 0, true)).toBe(false);
  expect(vambraceArmed([], evidence.before.state.combat.hand, 0, true)).toBe(false);
});

it("unaffected previews retain the existing base-plus-Dexterity detection", () => {
  // Fixed arithmetic boundary; no generated character knowledge is loaded.
  const block = (shown: number) => [{ dynamic_values: [{ name: "Block", base_value: 5, current_value: shown }] }];
  expect(vambraceArmed(["VAMBRACE"], block(12), 1)).toBe(true);
  expect(vambraceArmed(["VAMBRACE"], block(6), 1)).toBe(false);
  expect(vambraceArmed(["VAMBRACE"], block(7), 0)).toBe(false);
});

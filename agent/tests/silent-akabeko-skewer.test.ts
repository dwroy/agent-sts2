/** J2VR2DFJG8K4 Silent A10 F22 attempts 2/3 T1; silent-0504/0505. */
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import evidence from "./silent-akabeko-skewer-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Akabeko evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const rawAt = (line: number): Raw => structuredClone(evidence.frames.find((entry) => entry.line === line)!.state);
const knowledge = makeKnowledge({ cards: rawAt(436637).run.deck.map((entry: Raw) =>
  ({ id: entry.card_id, type: entry.card_type })) }, "cache");
const oldRollout = rolloutLiveOptions.enabled, oldBoss = bossLinesOptions.enabled;
afterEach(() => {
  solveTap.onSolve = null;
  setMonsterDbForTests(null);
  rolloutLiveOptions.enabled = oldRollout;
  bossLinesOptions.enabled = oldBoss;
});

function inputAt(line: number, change?: (raw: Raw) => void): SolverInput {
  const raw = rawAt(line); change?.(raw);
  const state = parseGameState(raw);
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false; bossLinesOptions.enabled = false;
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try {
    planCombatTurn({ state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
      runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
      screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [] });
  } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the frozen board did not reach the solver");
  return input;
}

function step(input: SolverInput, id: string, target: number | null = null): Step {
  const c = input.hand.find((entry) => entry.cardId === id)!;
  return { cardIndex: c.index, cardId: c.cardId, name: c.name, upgraded: c.upgraded, target };
}

it.each([[436637, 436639, 2], [436651, 436653, 0]])(
  "F22 initial state %i: Defend then Skewer matches the adjacent real damage and remaining HP",
  (before, after, target) => {
    const input = inputAt(before);
    const order = [step(input, "DEFEND_SILENT"), step(input, "SKEWER", target)];
    const plan = replaySteps(input, order)!;
    const actual = rawAt(after).combat.enemies.find((entry: Raw) => entry.index === target);
    expect(plan.outcome.damageDealt).toBe(38);
    expect(plan.outcome.enemyHpAfter.find((entry) => entry.index === target)!.hp).toBe(actual.current_hp);
    expect(plan.outcome.blockGained).toBe(5);
    expect(plan.outcome.energyLeft).toBe(0);
    // This is one run with two SL attempts, not two independent statistical samples.
    expect(input.hand.find((entry) => entry.cardId === "SKEWER")!.damage).toBe(11);
  },
);

it.each([[436638, 2, 5], [436652, 0, 10]])(
  "F22 continuation %i: a fresh planner consumes the normalized nineteen-point preview only once",
  (line, target, hp) => {
    const input = inputAt(line);
    const plan = replaySteps(input, [step(input, "SKEWER", target)])!;
    expect(plan.outcome.damageDealt).toBe(38);
    expect(plan.outcome.enemyHpAfter.find((entry) => entry.index === target)!.hp).toBe(hp);
  },
);

it("an earlier Attack spends Vigor before Skewer, and a later Attack cannot receive it again", () => {
  const input = inputAt(436638);
  const strike = input.hand.find((entry) => entry.cardId === "STRIKE_SILENT")!;
  strike.cost = 0; // Abstract resource control; this order is not an observed alternative fight.
  expect(replaySteps(input, [step(input, "SKEWER", 0), step(input, "STRIKE_SILENT", 2)])!.outcome.damageDealt).toBe(44);
  expect(replaySteps(input, [step(input, "STRIKE_SILENT", 2), step(input, "SKEWER", 0)])!.outcome.damageDealt).toBe(36);
});

it.each([
  ["Ironclad", (r: Raw) => { r.run.character_id = "IRONCLAD"; }],
  ["unobserved ascension", (r: Raw) => { r.run.ascension = 9; }],
  ["missing ascension", (r: Raw) => { delete r.run.ascension; }],
  ["missing relic", (r: Raw) => { r.run.relics = []; }],
  ["melted relic", (r: Raw) => { r.run.relics.find((x: Raw) => x.relic_id === "AKABEKO").is_melted = true; }],
  ["plain Skewer", (r: Raw) => { r.combat.hand.find((x: Raw) => x.card_id === "SKEWER").upgraded = false; }],
] as const)("%s keeps the old thirty-point two-hit calculation", (_name, change) => {
  const input = inputAt(436638, change);
  expect(replaySteps(input, [step(input, "SKEWER", 2)])!.outcome.damageDealt).toBe(30);
});

it("unobserved X payments and damage modifiers retain their previous solver results", () => {
  const base = inputAt(436638);
  for (const change of [
    (x: SolverInput) => { x.player.energy = 1; },
    (x: SolverInput) => { x.player.energy = 3; },
    (x: SolverInput) => { x.player.weak = true; },
    (x: SolverInput) => { x.player.shrunk = true; },
    (x: SolverInput) => { x.player.strengthNow = 1; },
    (x: SolverInput) => { x.enemies[2]!.vulnerable = 1; },
    (x: SolverInput) => { x.enemies[2]!.block = 1; },
    (x: SolverInput) => { x.hand.find((c) => c.cardId === "SKEWER")!.replay = 1; },
  ]) {
    const input = structuredClone(base); change(input);
    const legacy = structuredClone(input); delete legacy.player.akabekoSkewer;
    const order = [step(input, "SKEWER", 2)];
    expect(replaySteps(input, order)).toEqual(replaySteps(legacy, order));
  }
});

/** 3UPY3BP2LVS7 A10 F17 first attempt T3; silent-0349. Frozen original frames only. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { describePlan, planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps, solveTap, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const read = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Shackling evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync: read, default: { ...fs, readFileSync: read } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const frames = JSON.parse(readFileSync(new URL("./silent-shackling-weak-state.json", import.meta.url), "utf8")) as Raw[];
const frame = (line: number): Raw => structuredClone(frames.find((entry) => entry.line === line)!.row.state);
const knowledge = makeKnowledge({ cards: [
  { id: "STRIKE_SILENT", type: "Attack" }, { id: "DEFEND_SILENT", type: "Skill" },
  { id: "BACKFLIP", type: "Skill" }, { id: "ASCENDERS_BANE", type: "Curse" },
  { id: "TORIC_TOUGHNESS", type: "Skill" },
] }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });

function inputFor(raw: Raw): SolverInput {
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the observed board was not solved");
  return input;
}

function step(input: SolverInput, id: string): Step {
  const entry = input.hand.find((card) => (card.cardId === id || card.cardId.startsWith(`POTION:${id}:`)));
  if (!entry) throw new Error(`missing ${id}`);
  return { cardIndex: entry.index, cardId: entry.cardId, name: entry.name, upgraded: entry.upgraded,
    target: entry.target === "single" ? 0 : null, targetName: null };
}
const drink = (input: SolverInput) => replaySteps(input, [step(input, "SHACKLING_POTION")])!;

it("the observed potion-only line predicts the actual one HP loss before drinking", () => {
  const input = inputFor(frame(362461));
  const observedLoss = frame(362461).combat.player.current_hp - frame(362463).combat.player.current_hp;
  expect(frame(362462).combat.enemies[0].intents[0].damage).toBe(11);
  expect(observedLoss).toBe(1);
  const plan = drink(input);
  expect(plan.outcome).toMatchObject({ hpLoss: observedLoss, hpAfter: 52, damageDealt: 0 });
  expect(describePlan(plan, 53).hp_lost).toBe(1);
});

it("the complete observed Strike/Defend/Backflip/potion prefix keeps seven damage and predicts one loss", () => {
  const input = inputFor(frame(362458));
  const steps = ["STRIKE_SILENT", "DEFEND_SILENT", "BACKFLIP", "SHACKLING_POTION"].map((id) => step(input, id));
  expect(replaySteps(input, steps)!.outcome).toMatchObject({ hpLoss: 1, hpAfter: 52, damageDealt: 7 });
});

it("the observed no-drink and post-drink reread keep the shown intent without double reduction", () => {
  expect(replaySteps(inputFor(frame(362461)), [])!.outcome.hpLoss).toBe(6);
  expect(replaySteps(inputFor(frame(362462)), [])!.outcome.hpLoss).toBe(1);
});

it("does not carry the observed move's scope into later simulated turns", () => {
  const observed = inputFor(frame(362461));
  const simulation = board();
  simulation.solver = observed;
  simulation.meta = { ...simulation.meta, asc: 10, t: 3 };
  simulation.enemies = [{ index: 0, id: "CEREMONIAL_BEAST", move: "PLOW_MOVE", strength: 2,
    powers: { WEAK_POWER: 1, STRENGTH_POWER: 2 } }];
  simulation.tables = { CEREMONIAL_BEAST: { moves: { PLOW_MOVE: { damage: 20, hits: 1, strength: 0, block: 0 } },
    next: { PLOW_MOVE: { PLOW_MOVE: 1 } } } };
  simulation.piles = { handBase: observed.hand, draw: Array.from({ length: 10 }, (_, i) =>
    card(200 + i, "FIXED_JUNK", { type: "Status", playable: false })), discard: [] };
  const later: SolverInput[] = [];
  solveTap.onSolve = (input) => { later.push(input); };
  const records = simulateFight(simulation, drink(observed), 2, 1, false).records;
  expect(records).toHaveLength(2);
  expect(records[0]!.loss).toBe(1);
  expect(later.length).toBeGreaterThan(0);
  expect(later.every((input) => input.enemies.every((enemy) => enemy.weakShackling === undefined))).toBe(true);
});

it.each([["IRONCLAD", 10], ["SILENT", 9], ["SILENT", 11], ["", 10]])(
  "keeps the existing path for character %s / A%i", (character, ascension) => {
    const raw = frame(362461);
    raw.run.character_id = character;
    raw.run.ascension = ascension;
    expect(drink(inputFor(raw)).outcome.hpLoss).toBe(0);
  },
);

it("keeps other enemies, moves and unknown powers outside the observed scope", () => {
  for (const change of [
    (raw: Raw) => { raw.combat.enemies[0].enemy_id = "UNOBSERVED"; },
    (raw: Raw) => { raw.combat.enemies[0].move_id = "UNOBSERVED"; },
    (raw: Raw) => { raw.combat.enemies[0].powers.push({ power_id: "UNOBSERVED", amount: 1 }); },
  ]) {
    const raw = frame(362461); change(raw);
    expect(drink(inputFor(raw)).outcome.hpLoss).toBe(0);
  }
});

it("keeps ambiguous inversion and unobserved modifiers or loss amounts on their existing path", () => {
  const input = inputFor(frame(362461));
  for (const change of [
    (value: SolverInput) => { value.enemies[0]!.attacks[0]!.damage = 12; },
    (value: SolverInput) => { value.enemies[0]!.attacks[0]!.hits = 2; },
    (value: SolverInput) => { value.player.vulnerable = true; },
    (value: SolverInput) => { value.player.facing = 0; },
    (value: SolverInput) => { value.player.surrounded = true; },
    (value: SolverInput) => { value.player.colossus = true; },
    (value: SolverInput) => { value.enemies[0]!.shrink = 1; },
    (value: SolverInput) => { value.hand.find((c) => c.cardId.startsWith("POTION:SHACKLING_POTION:"))!.enemyTempStrengthLoss = 14; },
  ]) {
    const variant = structuredClone(input); change(variant);
    const legacy = structuredClone(variant); delete legacy.enemies[0]!.weakShackling;
    expect(drink(variant)).toEqual(drink(legacy));
  }
});

/** 53FLQ68CETW0 F48 attempt 5 T12 / attempt 6 T3, silent-0114/0115. Fixed data only. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, solveTurn, type SolverInput } from "../src/reflex/turn-solver.js";
import { board, card, defend } from "./boss-sim-fixture.js";

vi.hoisted(() => vi.resetModules());
// Any absent reference is unknown; only the committed observed frames supply game facts.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Burst test has no generated reference data"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const knowledge = makeKnowledge({ cards: [
  { id: "BURST", type: "Skill" }, { id: "DEFEND_SILENT", type: "Skill" }, { id: "WITHER", type: "Status" },
  { id: "ULTIMATE_DEFEND", type: "Skill" }, { id: "SNAKEBITE", type: "Skill" },
] }, "cache");
const step = (cardIndex: number, cardId: string, target?: number) => ({ cardIndex, cardId, name: cardId, upgraded: false, target });
const originalRollout = rolloutLiveOptions.enabled;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false;
});
afterEach(() => {
  solveTap.onSolve = null;
  rolloutLiveOptions.enabled = originalRollout;
  setMonsterDbForTests(null);
});

function observedInput(frame: number, fixture = "./silent-burst-state.json") {
  const raw = JSON.parse(readFileSync(new URL(fixture, import.meta.url), "utf8"))[frame].state as Raw;
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the observed board was not solved");
  return { input, raw };
}

it("F48 attempt 5 T12: active Burst reproduces 44 Block and keeps five HP instead of all lines dying", () => {
  const { input } = observedInput(1);
  expect(input.player.duplicateSkills).toBe(1);
  const plays = [step(1, "DEFEND_SILENT"), step(3, "DEFEND_SILENT")];
  const prefix = replaySteps(input, plays.slice(0, 1))!;
  expect(input.player.block + prefix.outcome.blockGained).toBe(30);
  const plan = replaySteps(input, plays)!;
  expect(input.player.block + plan.outcome.blockGained).toBe(44);
  expect(plan.outcome).toMatchObject({ hpLoss: 0, energyLeft: 1 });
  expect(solveTurn(input).plans.some((line) => line.outcome.hpLoss < input.player.hp)).toBe(true);
  const { duplicateSkills: _burst, ...player } = input.player;
  const dry = replaySteps({ ...input, player }, plays)!;
  expect(input.player.block + dry.outcome.blockGained).toBe(30);
  expect(dry.outcome.hpLoss).toBe(6);
});

it("F48 attempt 5 T12: playing ordinary Burst arms the next Skill in the same plan without flat value", () => {
  const { input } = observedInput(0);
  expect(input.hand.find((entry) => entry.cardId === "BURST")).toMatchObject({ burst: true, known: true, flatValue: 0 });
  const plays = [step(1, "BURST"), step(2, "DEFEND_SILENT"), step(4, "DEFEND_SILENT")];
  const own = replaySteps(input, plays.slice(0, 1))!;
  expect(own.outcome.blockGained).toBe(2);
  const plan = replaySteps(input, plays)!;
  expect(plan.outcome).toMatchObject({ blockGained: 44, hpLoss: 0, energyLeft: 1 });
});

it("F48 T12 after the first Defend: the consumed Burst grants no second replay on replanning", () => {
  const { input } = observedInput(2);
  expect(input.player.duplicateSkills).toBeUndefined();
  const plan = replaySteps(input, [step(2, "DEFEND_SILENT")])!;
  expect(input.player.block + plan.outcome.blockGained).toBe(44);
  expect(plan.outcome.hpLoss).toBe(0);
});

it("the pending Skill replay survives an Attack, a Power and a zero-cost potion", () => {
  const input = board().solver;
  input.player = { ...input.player, duplicateSkills: 1, energy: 4, afterImage: 2 };
  input.hand = [card(0, "ATTACK", { damage: 6 }), card(1, "POWER", { type: "Power", target: "self" }),
    card(-1, "POTION", { type: "Potion", target: "self", cost: 0 }), defend(2), defend(3)];
  const prefix = [step(0, "ATTACK", 0), step(1, "POWER"), step(-1, "POTION")];
  const plan = replaySteps(input, [...prefix, step(2, "DEFEND"), step(3, "DEFEND")])!;
  expect(plan.outcome).toMatchObject({ blockGained: 25, damageDealt: 6, energyLeft: 0 });
});

it.each([1, 2])("unused Burst %i expires before the next rollout turn", (count) => {
  const input = board();
  input.solver.player.duplicateSkills = count;
  input.solver.hand = [];
  input.piles = { handBase: [], draw: Array.from({ length: 12 }, (_, i) => defend(10 + i)), discard: [] };
  input.options = { handSize: 1 };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 10, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const plan = replaySteps(input.solver, [])!;
  expect(simulateFight(input, plan, 3, 1, false).records.map((record) => record.loss)).toEqual([10, 5, 5]);
});

it("does not infer unobserved Burst upgrades or Skill counts", () => {
  for (const [upgraded, count] of [[true, 3], [false, 2], [false, null]] as const) {
    const model = modelHandCard({ card_id: "BURST", upgraded, playable: true, energy_cost: 1, target_type: "Self",
      dynamic_values: count === null ? [] : [{ name: "Skills", base_value: count, current_value: count }] }, 0, knowledge);
    expect(model.burst).toBeUndefined();
    expect(model.known).toBe(false);
  }
});

it("VN7 F27 T6: upgraded Burst arms two Skills and repeats Ultimate Defend once for 30 Block", () => {
  const { input } = observedInput(0, "./silent-burst-upgraded-state.json");
  const burst = input.hand.find((entry) => entry.cardId === "BURST")!;
  const ultimate = input.hand.find((entry) => entry.cardId === "ULTIMATE_DEFEND")!;
  expect(burst).toMatchObject({ upgraded: true, burst: true, burstSkills: 2, known: true, flatValue: 0 });
  const plays = [step(burst.index, "BURST"), step(ultimate.index, "ULTIMATE_DEFEND")];
  expect(replaySteps(input, plays)!.outcome.blockGained).toBe(30);
});

it("VN7 F27 T6: active two-stack Burst reproduces 5 to 35 Block and the observed one-stack remainder", () => {
  const { input } = observedInput(1, "./silent-burst-upgraded-state.json");
  expect(input.player.duplicateSkills).toBe(2);
  const ultimate = input.hand.find((entry) => entry.cardId === "ULTIMATE_DEFEND")!;
  const plan = replaySteps(input, [step(ultimate.index, "ULTIMATE_DEFEND")])!;
  expect(input.player.block + plan.outcome.blockGained).toBe(35);
  const after = JSON.parse(readFileSync(new URL("./silent-burst-upgraded-state.json", import.meta.url), "utf8"))[2].state as Raw;
  expect(after.combat.player.block).toBe(35);
  expect(after.combat.player.powers.find((p: Raw) => p.power_id === "BURST_POWER").amount).toBe(1);
});

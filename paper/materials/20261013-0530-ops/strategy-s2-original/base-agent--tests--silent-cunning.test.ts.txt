/** WQZVENQ7DTRP A10 F33 T9/T11, silent-0256/0257/0258; fixed observed transitions. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-cunning-evidence.json";
import liveState from "./silent-cunning-state.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { loadConfig } from "../src/core/config.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { modelPotion, type CardModel } from "../src/reflex/card-model.js";
import { replaySteps, solveTap, solveTurn, type Step } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Cunning test has no generated reference data"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const potion = (slot: number, strength = 0, weak = false) => modelPotion("CUNNING_POTION", "狡诈药水", slot, [],
  { character: "SILENT", ascension: 10, enemyTargets: [0], strength, weak })!;
const step = (entry: CardModel): Step => ({ cardIndex: entry.index, cardId: entry.cardId, name: entry.name,
  upgraded: entry.upgraded, ...(entry.target === "single" ? { target: 0 } : {}) });
function inputAt(n: number, slots = [0]) {
  const input = board({ bossHp: 500 }).solver;
  input.enemies[0]!.attacks = [];
  input.hand = [...Array.from({ length: n }, (_, i) => card(i, "FIXED_HELD", { playable: false })), ...slots.map((s) => potion(s))];
  return input;
}

it("the actual planner supplies character evidence and builds all three deterministic potion slots", () => {
  const state = parseGameState(liveState);
  const knowledge = makeKnowledge({ cards: liveState.combat.hand.map((c) => ({ id: c.card_id, name: c.name,
    type: c.card_type, cost: c.energy_cost, description: c.resolved_rules_text, description_raw: c.rules_text,
    vars: c.dynamic_values })) }, "cache");
  const enabled = rolloutLiveOptions.enabled;
  const inputs: ReturnType<typeof inputAt>[] = [];
  solveTap.onSolve = (input) => { inputs.push(input); };
  rolloutLiveOptions.enabled = false;
  try {
    planCombatTurn({ state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
      runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
      screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] });
  } finally { solveTap.onSolve = null; rolloutLiveOptions.enabled = enabled; }
  const drinks = inputs[0]!.hand.filter((c) => c.cardId.startsWith("POTION:CUNNING_POTION:"));
  expect(drinks).toHaveLength(3);
  expect(drinks.map((c) => c.adds!.length)).toEqual([3, 3, 3]);
});

it("replays all eighteen logged drinks without counting potion slots as hand cards", () => {
  for (const row of evidence) {
    const input = inputAt(row.before, [row.slot]);
    const drink = input.hand.at(-1)!;
    const plan = replaySteps(input, [step(drink)])!;
    expect(plan.outcome.cunningShivsLeft).toHaveLength(row.added);
    expect(plan.outcome).toMatchObject({ cardsDrawn: 0, damageDealt: 0, hpLoss: 0 });
    const shivs = drink.adds!.slice(0, row.added);
    expect(shivs.map((c) => c.upgraded)).toEqual(row.upgraded);
    expect(shivs.map((c) => c.damageBase)).toEqual(row.damageBase);
    expect(replaySteps(input, [step(drink), ...shivs.map(step)])!.outcome.damageDealt).toBe(6 * row.added);
    if (row.added < 3) expect(replaySteps(input, [step(drink), step(drink.adds![row.added]!)])).toBeNull();
  }
});

it("matches the observed 2/0/0 and 3/2/0 sequences and offers freeing space between drinks", () => {
  for (const [n, counts, damage] of [[8, [2, 0, 0], 12], [5, [3, 2, 0], 30]] as const) {
    const input = inputAt(n, [0, 1, 2]);
    const drinks = input.hand.filter((c) => c.type === "Potion");
    const steps = drinks.map(step);
    expect(drinks.map((_p, i) => replaySteps(input, steps.slice(0, i + 1))!.outcome.cunningShivsLeft!.length))
      .toEqual(counts.map((_c, i) => counts.slice(0, i + 1).reduce((a, b) => a + b, 0)));
    const shivs = drinks.flatMap((p, i) => p.adds!.slice(0, counts[i]));
    expect(replaySteps(input, [...steps, ...shivs.map(step)])!.outcome.damageDealt).toBe(damage);
    const interleaved: Step[] = [];
    for (const p of drinks) interleaved.push(step(p), ...p.adds!.slice(0, Math.min(3, 10 - n)).map(step));
    expect(replaySteps(input, interleaved)!.outcome.damageDealt).toBe(n === 8 ? 36 : 54);
  }
  const input = inputAt(8, [0, 1]);
  const plans = solveTurn({ ...input, maxNodes: 6000 }).plans;
  expect(plans.some((p) => p.steps.filter((s) => s.cardId === "SHIV").length === 4)).toBe(true);
  for (const p of plans) expect(replaySteps(input, p.steps)?.outcome).toEqual(p.outcome);
});

it("preserves unplayed generated Shivs for later turns and exhausts played ones", () => {
  for (const played of [false, true]) {
    const input = board({ bossHp: 500 });
    input.solver = inputAt(8);
    input.piles = { draw: [], discard: [], handBase: input.solver.hand };
    input.options = { handSize: 10 };
    const p = input.solver.hand.at(-1)!;
    const plan = replaySteps(input.solver, [step(p), ...(played ? p.adds!.slice(0, 2).map(step) : [])])!;
    const later: typeof input.solver[] = [];
    solveTap.onSolve = (value) => { later.push(value); };
    try { simulateFight(input, plan, 2, 1, false); } finally { solveTap.onSolve = null; }
    expect(later[0]!.hand.filter((c) => c.cardId === "SHIV")).toHaveLength(played ? 0 : 2);
  }
});

it("keeps other characters and unobserved levels unmodelled and applies current Strength and Weak", () => {
  for (const [character, ascension] of [["IRONCLAD", 10], ["SILENT", 8], ["SILENT", 11]] as const) {
    expect(modelPotion("CUNNING_POTION", "狡诈", 0, [], { character, ascension, enemyTargets: [0], strength: 0, weak: false })).toBeNull();
  }
  expect(modelPotion("CUNNING_POTION", "狡诈", 0, [])).toBeNull();
  expect(potion(0, 2).adds!.map((c) => c.damage)).toEqual([8, 8, 8]);
  expect(potion(0, 0, true).adds!.map((c) => c.damage)).toEqual([4, 4, 4]);
  const input = inputAt(10);
  input.hand[0] = card(0, "SHIV", { cost: 0, damage: 6, exhausts: true });
  const p = input.hand.at(-1)!;
  expect(replaySteps(input, [step(input.hand[0]!), step(p), step(p.adds![0]!)])!.outcome.damageDealt).toBe(12);
});

/** YBRA3EJ94GBR A10 F30 T3 / F33 final T10; ledger silent-0324. */
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-blade-dance-evidence.json" with { type: "json" };
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { applyUpgrade, modelHandCard } from "../src/reflex/card-model.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, solveTurn, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { card } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Blade Dance evidence only"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: evidence.cards.map((entry) => ({
  id: entry.card_id, type: entry.card_type, name: entry.name, cost: entry.energy_cost,
  description: entry.resolved_rules_text, description_raw: entry.rules_text,
  vars: entry.dynamic_values, keywords: /消耗/.test(entry.resolved_rules_text) ? ["Exhaust"] : [],
})), monsters: [{ id: "KNOWLEDGE_DEMON", type: "Boss" }, { id: "HUNTER_KILLER", type: "Monster" }] }, "cache");
const rawDance = evidence.cards.find((entry) => entry.card_id === "BLADE_DANCE")!;
const step = (cardIndex: number, cardId: string, target: number | null = null): Step => ({
  cardIndex, cardId, name: cardId, upgraded: false, target, targetName: null,
});
const shivs = [0, 1, 2].map((i) => step(3_000_000 + i, "SHIV", 0));

beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false;
});
afterEach(() => {
  solveTap.onSolve = null;
  rolloutLiveOptions.enabled = true;
  setMonsterDbForTests(null);
});

function envAt(line: number): DecisionEnv {
  const state = parseGameState(evidence.frames.find((frame) => frame.line === line)!.state);
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
}

function inputAt(line: number): SolverInput {
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(envAt(line)); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error(`no solver input for s${line}`);
  return input;
}

it("models the observed three made Shivs without drawing or discarding the old hand", () => {
  const input = inputAt(362200);
  const dance = input.hand.find((entry) => entry.cardId === "BLADE_DANCE")!;
  expect(dance).toMatchObject({ draw: 0, cost: 1, known: true, exhausts: true });
  expect(dance.discardCount).toBeUndefined();
  expect(dance.adds?.map((entry) => [entry.cardId, entry.cost, entry.damageBase, entry.exhausts]))
    .toEqual([["SHIV", 0, 4, true], ["SHIV", 0, 4, true], ["SHIV", 0, 4, true]]);
  const made = evidence.frames.find((frame) => frame.line === 362201)!.state.combat.hand;
  expect(input.hand.filter((entry) => entry !== dance).map((entry) => entry.cardId).concat(dance.adds!.map((entry) => entry.cardId)).sort())
    .toEqual(made.map((entry) => entry.card_id).sort());
  expect(replaySteps(input, [step(2, "BLADE_DANCE")])!.outcome.cardsDrawn).toBe(0);
});

it("F30 T3 reproduces three zero-damage attacks, seven new block and five HP loss", () => {
  const input = inputAt(361786);
  const plan = replaySteps(input, [step(0, "BLADE_DANCE"), ...shivs])!;
  expect(plan).not.toBeNull();
  expect(plan.outcome).toMatchObject({ cardsDrawn: 0, blockGained: 7, hpLoss: 5 });
  // End-turn poison contributes five to damageDealt in both lines; the Shivs add no direct damage.
  expect(plan.outcome.damageDealt).toBe(replaySteps(input, [step(0, "BLADE_DANCE")])!.outcome.damageDealt);
  const withoutPoison = { ...input, enemies: input.enemies.map((enemy) => ({ ...enemy, poison: 0 })) };
  expect(replaySteps(withoutPoison, [step(0, "BLADE_DANCE"), ...shivs])!.outcome.damageDealt).toBe(0);
  expect(input.player.block + plan.outcome.blockGained).toBe(13);
  expect(replaySteps(input, [step(0, "BLADE_DANCE"), shivs[0]!, shivs[0]!])).toBeNull();
  const plans = solveTurn(input).plans;
  expect(plans.some((entry) => entry.steps.filter((s) => s.cardId === "SHIV").length === 3)).toBe(true);
  for (const entry of plans) expect(replaySteps(input, entry.steps)?.outcome).toEqual(entry.outcome);
});

it("F33 T10 uses the observed Sloth slots and cannot spend a fourth card on a made Shiv", () => {
  const input = inputAt(362200);
  const prefix = [step(2, "BLADE_DANCE"), step(0, "ECHOING_SLASH"), step(1, "DEFEND_SILENT")];
  expect(replaySteps(input, prefix)!.outcome).toMatchObject({ cardsDrawn: 0, blockGained: 9 });
  expect(replaySteps(input, [...prefix, shivs[0]!])).toBeNull();
  for (const plan of solveTurn(input).plans) {
    expect(plan.steps.length).toBeLessThanOrEqual(3);
    expect(plan.outcome.cardsDrawn).toBe(0);
  }
});

it("generation obeys the existing hand capacity and does not consume a known draw", () => {
  const input = inputAt(361786);
  input.hand = [input.hand[0]!, ...Array.from({ length: 8 }, (_, i) => card(20 + i, `HELD${i}`, { playable: false, type: "Curse" }))];
  input.player.handLimit = 10;
  input.player.noDraw = true;
  input.knownTop = [card(40, "SENTINEL", { damage: 99 })];
  expect(replaySteps(input, [step(0, "BLADE_DANCE"), ...shivs.slice(0, 2)])!.outcome.cardsDrawn).toBe(0);
  expect(replaySteps(input, [step(0, "BLADE_DANCE"), ...shivs])).toBeNull();
  expect(replaySteps(input, [step(0, "BLADE_DANCE"), step(40, "SENTINEL", 0)])).toBeNull();
});

it("missing Shiv data and unobserved repeat generation cannot certify a continuation", () => {
  const missing = makeKnowledge({ cards: [{ id: "BLADE_DANCE", type: "Skill" }] }, "cache");
  expect(modelHandCard(rawDance, 0, missing, "silent", 10)).toMatchObject({ draw: 0, known: false });
  const input = inputAt(361786);
  input.player.duplicateSkills = 1;
  const plan = replaySteps(input, [step(0, "BLADE_DANCE")])!;
  expect(plan.outcome.unknownCards.join(" ")).toContain("生成");
  expect(replaySteps(input, [step(0, "BLADE_DANCE"), shivs[0]!])).toBeNull();
});

it("other characters, unobserved ascensions, upgrades and templates keep the previous model", () => {
  for (const [character, ascension, raw] of [
    ["ironclad", 10, rawDance], ["", 10, rawDance], ["silent", null, rawDance], ["silent", 11, rawDance],
    ["silent", 10, { ...rawDance, upgraded: true }],
    ["silent", 10, { ...rawDance, rules_text: "UNOBSERVED" }],
  ] as const) {
    const model = modelHandCard(raw, 0, knowledge, character, ascension);
    expect(model.draw).toBe(3);
    expect(model.adds).toBeUndefined();
  }
});

it("an in-line upgrade cannot inherit the certified three-Shiv continuation", () => {
  const input = inputAt(361786);
  input.hand[0] = applyUpgrade(input.hand[0]!, { draw: 1 });
  const first = { ...step(0, "BLADE_DANCE"), upgraded: true };
  const plan = replaySteps(input, [first])!;
  expect(plan.outcome.cardsDrawn).toBe(0);
  expect(plan.outcome.unknownCards.join(" ")).toContain("升级");
  expect(replaySteps(input, [first, shivs[0]!])).toBeNull();
});

it("continuing into Blade Dance clears the memo before actual generated hand indices are read", () => {
  const env = envAt(361786);
  env.screenMemory.combatPlan = { turn: 3, via: "jev", handLen: 2,
    expectedHand: "ASCENDERS_BANE,BLADE_DANCE", remaining: [step(0, "BLADE_DANCE"), ...shivs] };
  expect(planCombatTurn(env)).toMatchObject({ kind: "act", label: "combat/plan-continue",
    intent: { action: "play_card", card_index: 0 } });
  expect(env.screenMemory.combatPlan).toBeNull();
});

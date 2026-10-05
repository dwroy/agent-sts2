/** 10GPK5XGHCK3 F9 T5 / MGA0CZDDKC0P F17 T2 and sixth attempt T3; silent-0153/0154. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-hidden-daggers-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps, solveTurn, type Step } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Hidden Daggers test has no generated reference data"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const observed = [...new Map(evidence.flatMap((frame) => frame.hand).map((entry) => [entry.card_id, entry])).values()];
// Types and Shiv damage come from the fixed observed hands, never a refreshed knowledge file.
const knowledge = makeKnowledge({ cards: observed.map((entry) => ({
  id: entry.card_id, type: entry.card_id === "SHIV" ? "Attack" : entry.card_type, name: entry.name, cost: entry.energy_cost,
  description: entry.resolved_rules_text, description_raw: entry.rules_text,
  vars: entry.dynamic_values, keywords: entry.card_id === "SHIV" ? ["Exhaust"] : [],
})) }, "cache");

function frameAt(run: string, turn: number, phase = "before") {
  return evidence.find((frame) => frame.run === run && frame.turn === turn && frame.phase === phase)!;
}

function inputAt(run: string, turn: number) {
  // Isolate the observed hand change and direct Shiv hits from the other, unassigned combat deltas.
  const input = board({ bossHp: 500 }).solver;
  input.hand = frameAt(run, turn).hand.map((entry, index) => modelHandCard(entry, index, knowledge, "silent"));
  input.enemies[0]!.attacks = [];
  return input;
}

function step(input: ReturnType<typeof inputAt>, id: string, discards?: string[]): Step {
  const entry = input.hand.find((card) => card.cardId === id)!;
  return { cardIndex: entry.index, cardId: id, name: entry.name, upgraded: entry.upgraded,
    target: entry.target === "single" ? 0 : null, ...(discards ? { discards } : {}) };
}

it("observed Hidden Daggers discards two old cards before making two playable Shivs without drawing", () => {
  for (const [run, turn, discarded] of [
    ["10GPK5XGHCK3", 5, ["SURVIVOR", "RICOCHET"]],
    ["MGA0CZDDKC0P", 2, ["SNAKEBITE", "STRIKE_SILENT"]],
    ["MGA0CZDDKC0P", 3, ["STRIKE_SILENT", "DEFEND_SILENT"]],
  ] as const) {
    const input = inputAt(run, turn);
    const hidden = input.hand.find((card) => card.cardId === "HIDDEN_DAGGERS")!;
    expect(hidden).toMatchObject({ draw: 0, discardCount: 2, known: true, flatValue: 0 });
    expect(hidden.adds).toHaveLength(2);
    expect(hidden.adds!.map((card) => [card.cardId, card.cost, card.damage, card.exhausts])).toEqual([
      ["SHIV", 0, 4, true], ["SHIV", 0, 4, true],
    ]);
    const first = step(input, "HIDDEN_DAGGERS", [...discarded]);
    const plan = replaySteps(input, [first])!;
    expect(plan.outcome).toMatchObject({ cardsDrawn: 0, blockGained: 0, damageDealt: 0 });
    expect(plan.steps[0]!.discards!.sort()).toEqual([...discarded].sort());
    for (const id of discarded) expect(replaySteps(input, [first, step(input, id)])).toBeNull();
    const after = frameAt(run, turn, "after").hand.map((card) => card.card_id);
    expect(input.hand.filter((card) => card !== hidden && !new Set<string>(discarded).has(card.cardId)).map((card) => card.cardId)
      .concat(["SHIV", "SHIV"]).sort()).toEqual([...after].sort());
    const shivs = [0, 1].map((i) => ({ cardIndex: 2_000_000 + i, cardId: "SHIV", name: "小刀", upgraded: false, target: 0 }));
    expect(replaySteps(input, [first, ...shivs])!.outcome).toMatchObject({ damageDealt: 8, cardsDrawn: 0, blockGained: 0 });
    expect(replaySteps(input, [first, shivs[0]!, shivs[0]!])).toBeNull();
  }
});

it("the solver offers discard pairs and replay reproduces its generated-card reference outcomes", () => {
  const input = inputAt("MGA0CZDDKC0P", 3);
  input.firstKey = input.hand.find((card) => card.cardId === "HIDDEN_DAGGERS")!.key;
  const result = solveTurn(input);
  const plans = result.plans.filter((plan) => plan.steps[0]?.cardId === "HIDDEN_DAGGERS");
  expect(plans.length).toBeGreaterThan(1);
  expect(plans.some((plan) => plan.steps.filter((step) => step.cardId === "SHIV").length === 2)).toBe(true);
  for (const plan of plans) {
    expect(plan.steps[0]!.discards).toHaveLength(2);
    expect(plan.outcome.cardsDrawn).toBe(0);
    expect(replaySteps(input, plan.steps)?.outcome).toEqual(plan.outcome);
  }
});

it("held and locked cards can be discarded; potions stay outside the two-card selection", () => {
  const input = inputAt("MGA0CZDDKC0P", 3);
  input.hand = [input.hand.find((card) => card.cardId === "HIDDEN_DAGGERS")!,
    card(10, "HELD", { type: "Curse", playable: false, heldHpLoss: 9 }),
    card(11, "LOCKED", { type: "Skill", soulbound: true }),
    card(12, "LOCKER", { type: "Skill", target: "self", soulbound: true }),
    card(-1, "POTION:TEST:0", { type: "Potion", target: "self", cost: 0, block: 7 })];
  const first = step(input, "LOCKER");
  const hidden = step(input, "HIDDEN_DAGGERS", ["HELD", "LOCKED"]);
  const outcome = replaySteps(input, [first, hidden, step(input, "POTION:TEST:0")])!.outcome;
  expect(outcome).toMatchObject({ cardsDrawn: 0, blockGained: 7 });
  expect(outcome.heldHpLoss ?? 0).toBe(0);
  expect(replaySteps(input, [first, hidden, step(input, "LOCKED")])).toBeNull();
});

it("short hands and repeated plays stay offered as unknown selections without inventing a continuation", () => {
  const input = inputAt("MGA0CZDDKC0P", 3);
  input.hand = input.hand.filter((card) => ["HIDDEN_DAGGERS", "DEFEND_SILENT"].includes(card.cardId));
  input.firstKey = input.hand.find((card) => card.cardId === "HIDDEN_DAGGERS")!.key;
  const plans = solveTurn(input).plans.filter((plan) => plan.steps[0]?.cardId === "HIDDEN_DAGGERS");
  expect(plans.length).toBeGreaterThan(0);
  expect(plans.every((plan) => plan.steps.length === 1 && plan.outcome.unknownCards.length > 0 && plan.outcome.cardsDrawn === 0)).toBe(true);
  expect(replaySteps(input, [step(input, "HIDDEN_DAGGERS"), step(input, "DEFEND_SILENT")])).toBeNull();
  const repeated = inputAt("MGA0CZDDKC0P", 3);
  repeated.player.duplicateSkills = 1;
  const first = step(repeated, "HIDDEN_DAGGERS", ["STRIKE_SILENT", "DEFEND_SILENT"]);
  expect(replaySteps(repeated, [first])!.outcome.unknownCards.join(" ")).toContain("重放弃牌未验证");
  expect(replaySteps(repeated, [first, step(repeated, "DAGGER_THROW")])).toBeNull();
});

it("the observation is scoped to plain Silent cards and missing Shiv metadata stays unknown", () => {
  const raw = frameAt("MGA0CZDDKC0P", 3).hand.find((card) => card.card_id === "HIDDEN_DAGGERS")!;
  for (const character of ["ironclad", ""]) {
    expect(modelHandCard(raw, 0, knowledge, character)).toMatchObject({ draw: 2 });
    expect(modelHandCard(raw, 0, knowledge, character).discardCount).toBeUndefined();
  }
  expect(modelHandCard({ ...raw, upgraded: true }, 0, knowledge, "silent").discardCount).toBeUndefined();
  for (const change of [{ cardId: "TEST_TRANSFORMED_SKILL" }, { upgraded: true }]) {
    const input = inputAt("MGA0CZDDKC0P", 3);
    const hidden = input.hand.find((card) => card.cardId === "HIDDEN_DAGGERS")!;
    Object.assign(hidden, change);
    expect(replaySteps(input, [step(input, hidden.cardId),
      { cardIndex: 2_000_000, cardId: "SHIV", name: "小刀", upgraded: false, target: 0 }])).toBeNull();
  }
  const missing = makeKnowledge({ cards: [{ id: "HIDDEN_DAGGERS", type: "Skill" }] }, "cache");
  expect(modelHandCard(raw, 0, missing, "silent")).toMatchObject({ draw: 0, known: false });
});

it("continuing into Hidden Daggers clears the old-hand memo before Jev's discard selection", () => {
  const input = inputAt("MGA0CZDDKC0P", 3);
  const raw = { state_version: 1, screen: "COMBAT", session: { mode: "singleplayer", phase: "run" }, turn: 3, in_combat: true,
    available_actions: ["play_card", "end_turn"], run_id: "MGA0CZDDKC0P",
    run: { character_id: "SILENT", floor: 17, current_hp: 14, max_hp: 70, max_energy: 3, deck: [], relics: [], potions: [] },
    combat: { player: { current_hp: 14, max_hp: 70, energy: 3, block: 0, powers: [] },
      enemies: [{ index: 0, monster_id: "CEREMONIAL_BEAST", name: "仪式兽", current_hp: 209, max_hp: 262, block: 0, is_alive: true, powers: [] }],
      hand: frameAt("MGA0CZDDKC0P", 3).hand } };
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  env.screenMemory.combatPlan = { turn: 3, via: "jev", handLen: input.hand.length,
    expectedHand: input.hand.map((card) => card.cardId + (card.upgraded ? "+" : "")).sort().join(","),
    remaining: [step(input, "HIDDEN_DAGGERS", ["STRIKE_SILENT", "DEFEND_SILENT"]), step(input, "DEFEND_SILENT")] };
  expect(planCombatTurn(env)).toMatchObject({ kind: "act", label: "combat/plan-continue",
    intent: { action: "play_card", card_index: 4 } });
  expect(env.screenMemory.combatPlan).toBeNull();
});

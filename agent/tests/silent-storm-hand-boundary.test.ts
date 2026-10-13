/** 32VSST9UX7MN A10 F29/F30 T1, silent-0455: fixed before/after replacement frames. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, solveTurn, traceSteps, type SolverInput, type Step } from "../src/reflex/turn-solver.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__fixed_storm_hand_boundary__/${name}`,
}));
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

const frames = JSON.parse(readFileSync(new URL("./silent-storm-hand-boundary-evidence.json", import.meta.url), "utf8"));
// Types come from these frozen Silent frames, never the refreshing knowledge files.
const knowledge = makeKnowledge({ cards: [
  ...frames[0].state.run.deck.map((card: { card_id: string; card_type: string }) => ({ id: card.card_id, type: card.card_type })),
  { id: "SHIV", type: "Attack" },
] }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });

function raw(line: number) {
  return structuredClone(frames.find((frame: { line: number }) => frame.line === line)!.state);
}
function observed(line: number) {
  const state = parseGameState(raw(line));
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("fixed frame was not solved by the production planner");
  input = { ...input, maxNodes: 5_000 };
  const step = (id: string, target: number | null = null, index?: number): Step => {
    const card = input!.hand.find((entry) => entry.cardId === id && (index === undefined || entry.index === index))!;
    return { cardIndex: card.index, cardId: card.cardId, name: card.name, upgraded: card.upgraded, target, targetName: null };
  };
  return { input, step, env };
}

it("rejects F29's recorded continuation through three discarded cards", () => {
  const { input, step } = observed(390550);
  expect(replaySteps(input, [step("STORM_OF_STEEL"), step("DODGE_AND_ROLL"), step("FOOTWORK"), step("NEUTRALIZE", 1)])).toBeNull();
});

it("rejects the F30 third-attempt SL continuation through the discarded Dagger Spray", () => {
  const { input, step } = observed(390614);
  expect(replaySteps(input, [step("STORM_OF_STEEL"), step("DAGGER_SPRAY")])).toBeNull();
});

it.each([390550, 390614])("ends the %i prefix at an explicitly unknown replacement boundary", (line) => {
  const { input, step } = observed(line);
  const trace = traceSteps(input, [step("STORM_OF_STEEL")]);
  expect(trace.complete).toBe(true);
  expect(trace.transitions[0]!.after).toMatchObject({ hand: [], pendingSelection: true, damage: 0, drawn: 0 });
  expect(trace.transitions[0]!.after.energy).toBe(input.player.energy - 1);
  expect(trace.plan!.steps[0]!.discards).toHaveLength(6);
  expect(trace.plan!.outcome.unknownCards).toContain("钢铁风暴+（生成与自动弃牌效果待实际手牌刷新）");
  // The combined F30 frame gains six automatic Block; the unresolved prefix must not invent it.
  expect(trace.transitions[0]!.after.block).toBe(raw(line).combat.player.block);
  const plans = solveTurn(input).plans.filter((plan) => plan.steps.some((entry) => entry.cardId === "STORM_OF_STEEL"));
  expect(plans.length).toBeGreaterThan(0);
  for (const plan of plans) expect(plan.steps.at(-1)!.cardId).toBe("STORM_OF_STEEL");
});

it("reads the real post-cast six Shivs and automatic Block without predicting their creation", () => {
  const { input, step } = observed(390615);
  expect(raw(390615).combat.player.block).toBe(11);
  expect(input.hand.filter((card) => card.cardId === "SHIV")).toHaveLength(6);
  const shivs = input.hand.filter((card) => card.cardId === "SHIV");
  const plan = replaySteps(input, shivs.map((card) => step("SHIV", 0, card.index)))!;
  expect(plan.outcome.damageDealt).toBe(36);
  expect(plan.outcome.enemyHpAfter[0]!.hp).toBe(90);
  expect(plan.outcome.unknownCards).not.toContain("钢铁风暴+（生成与自动弃牌效果待实际手牌刷新）");
});

it("keeps unobserved discard relic effects unknown instead of crediting their Block", () => {
  const { input, step } = observed(390550);
  input.player = { ...input.player, toughBandagesBlock: 2 };
  const trace = traceSteps(input, [step("STORM_OF_STEEL")]);
  expect(trace.transitions[0]!.after.blockGained).toBe(0);
  expect(trace.transitions[0]!.after.pendingSelection).toBe(true);
});

it("clears a continuing Jev memo when its final step replaces the hand", () => {
  const { step, env } = observed(390550);
  const hand = raw(390550).combat.hand as { card_id: string; upgraded: boolean }[];
  env.screenMemory.combatPlan = {
    turn: env.state.turn, lethal: false, remaining: [step("STORM_OF_STEEL")], via: "jev",
    handLen: hand.length,
    expectedHand: hand.map((card) => `${card.card_id}${card.upgraded ? "+" : ""}`).sort().join(","),
  };
  const decision = planCombatTurn(env);
  expect(decision).toMatchObject({ kind: "act", label: "combat/plan-continue" });
  expect(env.screenMemory.combatPlan).toBeNull();
});

it.each([["ironclad", 10], ["regent", 10], ["silent", 9], ["silent", 11], ["silent", null]] as const)(
  "preserves %s / %s outside the observed character and ascension", (character, ascension) => {
    const card = raw(390550).combat.hand[0];
    const model = modelHandCard(card, 0, knowledge, character, ascension);
    expect(model.handReplacement).toBeUndefined();
    expect(model.discardsHand).toBeUndefined();
  },
);

it.each(["plain", "cost", "x", "enchantment", "text", "template", "variables", "missingVariables", "target"])(
  "keeps the previous model for an unobserved %s cast", (field) => {
    const card = raw(390550).combat.hand[0];
    if (field === "plain") card.upgraded = false;
    if (field === "cost") card.energy_cost = 0;
    if (field === "x") card.costs_x = true;
    if (field === "enchantment") card.enchantment = { id: "UNOBSERVED" };
    if (field === "text") card.resolved_rules_text += " 重放。";
    if (field === "template") card.rules_text = "changed";
    if (field === "variables") card.dynamic_values = [{ name: "Unobserved", current_value: 1 }];
    if (field === "missingVariables") delete card.dynamic_values;
    if (field === "target") card.target_type = "AnyEnemy";
    const model = modelHandCard(card, 0, knowledge, "silent", 10);
    expect(model.handReplacement).toBeUndefined();
    expect(model.discardsHand).toBeUndefined();
  },
);

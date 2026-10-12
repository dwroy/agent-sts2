import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-apotheosis-reference-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { setMoveModelForTests } from "../src/knowledge/move-model.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import * as reference from "../src/reflex/silent-apotheosis-reference.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";

// Only frozen VLZ observations may enter these consumers.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Apotheosis reference"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const rawAt = (line: number): Raw => structuredClone(evidence.frames.find((frame) => frame.line === line)!.state);
const oldRollout = rolloutLiveOptions.enabled, oldBoss = bossLinesOptions.enabled, oldMcNow = potionMcOptions.now;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); setMoveModelForTests({});
  rolloutLiveOptions.enabled = false; bossLinesOptions.enabled = false;
  potionMcOptions.now = () => 0;
  vi.spyOn(Date, "now").mockReturnValue(1000);
});
afterEach(() => {
  solveTap.onSolve = null; setMonsterDbForTests(null); setMoveModelForTests(null);
  rolloutLiveOptions.enabled = oldRollout; bossLinesOptions.enabled = oldBoss; potionMcOptions.now = oldMcNow;
  vi.restoreAllMocks();
});
function planned(raw: Raw, context: "off" | "v1" = "off") {
  const state = parseGameState(raw);
  const knowledge = makeKnowledge({ cards: raw.run.deck.map((c: Raw) => ({ id: c.card_id, type: c.card_type })) }, "cache");
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, jevContext: context,
    screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [] };
  let solver: SolverInput | undefined;
  solveTap.onSolve = (input) => { solver ??= input; };
  try {
    const decision = planCombatTurn(env);
    expect(decision?.kind).toBe("ask");
    return { decision: decision as AskDecision, solver: solver!, state };
  } finally { solveTap.onSolve = null; }
}

it("separates F43's held card, simulated upgrade and unknown actual cast without changing the board", () => {
  const raw = rawAt(275679), before = structuredClone(raw);
  const { solver, state } = planned(raw);
  const god = solver.hand.find((card) => card.cardId === "APOTHEOSIS")!;
  const plan = replaySteps(solver, [{ cardIndex: god.index, cardId: god.cardId, name: god.name, upgraded: false }])!;
  expect(reference.silentApotheosisReference(state, plan)).toMatchObject({ apotheosis_reference: {
    deck_copies: 1, hand_copies: 1, planned_plays: 1, simulated_upgrade_applied: true,
    actual_cast_this_fight: null, candidate_unmodelled_cards: plan.outcome.unknownCards,
  } });
  expect(reference.silentApotheosisReference(parseGameState(rawAt(275680)), null)).toMatchObject({ apotheosis_reference: {
    deck_copies: 1, hand_copies: 0, planned_plays: null, simulated_upgrade_applied: null, actual_cast_this_fight: null,
  } });
  expect(raw).toEqual(before);
});

it.each(["off", "v1"] as const)("reaches the real %s Jev criteria and preserves all choices and resolved actions", (context) => {
  const current = planned(rawAt(275679), context).decision;
  const spy = vi.spyOn(reference, "silentApotheosisReference").mockReturnValue({});
  const original = planned(rawAt(275679), context).decision;
  spy.mockRestore();
  const actual = current.questions.plan!;
  const previous = original.questions.plan!;
  expect(Object.keys(actual.criteria!)).toEqual(Object.keys(previous.criteria!));
  for (const key of Object.keys(actual.criteria!)) {
    const facts = JSON.parse(actual.criteria![key]!);
    expect(facts.apotheosis_reference).toMatchObject({ deck_copies: 1, hand_copies: 1, actual_cast_this_fight: null });
    delete facts.apotheosis_reference;
    expect(facts).toEqual(JSON.parse(previous.criteria![key]!));
    const answer = { plan: { type: "choice" as const, choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } };
    const { apply: newApply, ...newAction } = current.resolve(answer);
    const { apply: oldApply, ...oldAction } = original.resolve(answer);
    expect(newAction).toEqual(oldAction); expect(typeof newApply).toBe(typeof oldApply);
  }
  expect(current.state).toEqual(original.state);
  if (context === "v1") {
    const visible = current.jevView!.questions.plan!.criteria!;
    const prior = original.jevView!.questions.plan!.criteria!;
    expect(Object.keys(visible)).toEqual(Object.keys(prior));
    for (const key of Object.keys(visible)) {
      const facts = JSON.parse(visible[key]!);
      expect(facts.apotheosis_reference).toEqual(JSON.parse(actual.criteria![key]!).apotheosis_reference);
      delete facts.apotheosis_reference;
      expect(facts).toEqual(JSON.parse(prior[key]!));
    }
  }
});

it("labels random potion forecasts and unsimulated potions separately in F45's real question", () => {
  const spy = vi.spyOn(reference, "silentApotheosisReference");
  const { decision } = planned(rawAt(275722));
  const facts = Object.values(decision.questions.plan!.criteria!).map((value) => JSON.parse(value!));
  expect(facts.some((fact) => fact.apotheosis_reference?.forecast_basis === "potion_median")).toBe(true);
  expect(spy.mock.calls.some((call) => call[2] === "potion_median")).toBe(true);
  const state = parseGameState(rawAt(275722));
  expect(reference.silentApotheosisReference(state, null, "unsimulated")).toMatchObject({ apotheosis_reference: {
    planned_plays: null, simulated_upgrade_applied: null, candidate_unmodelled_cards: null,
    forecast_basis: "unsimulated", actual_cast_this_fight: null,
  } });
});

it("keeps missing lists unknown, missing ownership irrelevant, and other scopes unchanged", () => {
  const raw = rawAt(275679); delete raw.run.deck;
  expect(reference.silentApotheosisReference(parseGameState(raw), null)).toMatchObject({ apotheosis_reference: { deck_copies: null, hand_copies: 1 } });
  for (const patch of [{ character_id: "IRONCLAD" }, { ascension: 9 }, { ascension: 11 }, { ascension: null }]) {
    const source = rawAt(275679); Object.assign(source.run, patch);
    expect(reference.silentApotheosisReference(parseGameState(source), null)).toEqual({});
  }
  const source = rawAt(275679);
  source.run.deck = source.run.deck.filter((c: Raw) => c.card_id !== "APOTHEOSIS");
  source.combat.hand = source.combat.hand.filter((c: Raw) => c.card_id !== "APOTHEOSIS");
  expect(reference.silentApotheosisReference(parseGameState(source), null)).toEqual({});
});

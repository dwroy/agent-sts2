/** silent-0197: Y6GM2CHWJBEY F17 attempt 2 T1 / VPW8YH7A4QFM F39 T1. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-finale-selection-evidence.json";
import { baseState, runPayload } from "./scenarios.js";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { planSelection, thisTurnBoard } from "../src/hand/screens/selection.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard, thisTurnDamage, thisTurnScore } from "../src/reflex/card-model.js";

// Every number comes from the fixed logged projections; generated reference data is unavailable.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Finale selection test has no generated data"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

type Raw = Record<string, any>;
const cards = [...new Map(evidence.flatMap((frame) => frame.selection.cards).map((card) => [card.card_id, card])).values()];
const knowledge = makeKnowledge({ cards: cards.map((card) => ({
  id: card.card_id, name: card.name, type: card.card_type, cost: card.energy_cost,
  description: card.resolved_rules_text, description_raw: card.rules_text, vars: card.dynamic_values,
})) }, "cache");

function board(run = "VPW8YH7A4QFM", character = "SILENT"): Raw {
  const frame = structuredClone(evidence.find((entry) => entry.run === run)!);
  return baseState("CARD_SELECTION", {
    run_id: run, in_combat: true, turn: frame.turn, available_actions: ["select_deck_card"],
    run: runPayload({ floor: frame.floor, character_id: character, deck: [], relics: [], potions: [] }),
    combat: { player: frame.player, enemies: frame.enemies, hand: [] },
    selection: frame.selection, agent_view: { combat: { draw: frame.draw, discard: frame.discard,
      action_readiness: { running_action_type: "UsePotionAction" } } },
  });
}

function model(raw: Raw, id = "GRAND_FINALE") {
  return modelHandCard(raw.selection.cards.find((entry: Raw) => entry.card_id === id), 0, knowledge, raw.run.character_id);
}

function selection(raw: Raw, planner?: "card") {
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, combatPlanner: planner,
    screenMemory: createScreenMemory("CARD_SELECTION"), shopDiscardPotions: [] };
  return planSelection(env);
}

it.each(evidence)("$run F$floor T$turn: an observed nonempty draw pile gives Finale zero immediate damage", (frame) => {
  const raw = board(frame.run);
  const context = thisTurnBoard(raw, knowledge);
  expect(context.drawPileEmpty).toBe(false);
  expect(frame.after.finale).toMatchObject({ playable: false, unplayable_reason: "unplayable" });
  expect(thisTurnDamage(model(raw), context)).toBe(0);
  expect(thisTurnScore(model(raw), 0, frame.enemies.length, context)).toBe(0);
});

it.each(evidence)("$run: the selection entry keeps Finale available to Jev with its corrected reference score", (frame) => {
  const decision = selection(board(frame.run), "card");
  expect(decision?.kind).toBe("ask");
  if (decision?.kind !== "ask") throw new Error("expected all selection options");
  const question = decision.questions.pick;
  if (question?.type !== "choice") throw new Error("expected card choice");
  expect(Object.keys(question.criteria)).toEqual(["card0", "card1", "card2"]);
  expect(decision.resolve({ pick: { type: "choice", choice: "card2", probabilities: { card2: 1 }, confidence: 1, raw: {} } }).intent)
    .toEqual({ action: "select_deck_card", option_index: 2 });
});

it("VPW F39 T1: the generated-card pick no longer auto-selects the unusable 60-damage offer", () => {
  const decision = selection(board());
  expect(decision?.kind).toBe("ask");
  if (decision?.kind !== "ask") throw new Error("expected Jev to compare the close remaining scores");
  const raw = board();
  expect(thisTurnScore({ ...model(raw, "PREDATOR"), cost: 0 }, 0, 1, thisTurnBoard(raw, knowledge))).toBe(15);
  expect(thisTurnScore(model(raw), 0, 1, thisTurnBoard(raw, knowledge))).toBe(0);
});

it("an explicitly empty draw pile retains Finale damage even with a nonempty discard pile", () => {
  const raw = board();
  raw.agent_view.combat.discard = raw.agent_view.combat.draw;
  raw.agent_view.combat.draw = [];
  expect(raw.agent_view.combat.discard.length).toBeGreaterThan(0);
  const context = thisTurnBoard(raw, knowledge);
  expect(context.drawPileEmpty).toBe(true);
  expect(thisTurnDamage(model(raw), context)).toBe(60);
  const decision = selection(raw);
  expect(decision?.kind === "act" && decision.intent).toEqual({ action: "select_deck_card", option_index: 2 });
});

it.each([undefined, null])("missing or invalid draw data (%s) stays unknown instead of implying an empty pile", (draw) => {
  const raw = board();
  raw.agent_view.combat.draw = draw;
  const context = thisTurnBoard(raw, knowledge);
  expect(context.drawPileEmpty).toBeUndefined();
  expect(thisTurnDamage(model(raw), context)).toBe(60);
  expect(thisTurnDamage(model(raw))).toBe(60);
});

it("Ironclad and ordinary attacks keep their previous scores", () => {
  const raw = board("VPW8YH7A4QFM", "IRONCLAD");
  const context = thisTurnBoard(raw, knowledge);
  expect(context.drawPileEmpty).toBeUndefined();
  expect(thisTurnDamage(model(raw), context)).toBe(60);
  const silent = board();
  const predator = model(silent, "PREDATOR");
  expect(thisTurnScore(predator, 0, 1, thisTurnBoard(silent, knowledge))).toBe(thisTurnScore(predator, 0, 1));
});

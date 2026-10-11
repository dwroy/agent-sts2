/** Fixed 6D0M76419BU7 F12 T3 selection and its independently logged successor. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-smoggy-selection-evidence.json";
import { baseState, runPayload } from "./scenarios.js";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { planSelection } from "../src/hand/screens/selection.js";
import { survivorSmoggyFacts } from "../src/hand/screens/silent-smoggy-selection.js";
import * as smoggyModule from "../src/hand/screens/silent-smoggy-selection.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { facingFightOf } from "../src/reflex/combat-plan.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Silent evidence only"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

type Raw = Record<string, any>;
const knowledge = makeKnowledge({ cards: evidence.selection.cards.map((card) => ({
  id: card.card_id, name: card.name, type: card.card_type, cost: card.energy_cost,
  description: card.resolved_rules_text, description_raw: card.rules_text, vars: card.dynamic_values,
})) }, "cache");

function raw(): Raw {
  return baseState("CARD_SELECTION", {
    run_id: evidence.run, in_combat: true, turn: evidence.turn, available_actions: ["select_deck_card"],
    run: runPayload({ floor: evidence.floor, ascension: evidence.ascension, character_id: "SILENT", deck: [], relics: [], potions: [] }),
    combat: structuredClone(evidence.combat), selection: structuredClone(evidence.selection),
  });
}

function env(input: Raw): DecisionEnv {
  const state = parseGameState(input);
  const memory = createScreenMemory("CARD_SELECTION");
  memory.cardSource = { action: "play_card", id: "SURVIVOR", fight: facingFightOf(state), turn: state.turn };
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: memory, shopDiscardPotions: [], buildDecider: "deepseek" };
}

function facts(input = raw()): Map<number, Raw> {
  const result = survivorSmoggyFacts(parseGameState(input), true);
  expect(result).not.toBeNull();
  return result as Map<number, Raw>;
}

function expectQuestionUnchangedWithoutSmoggyFacts(context: DecisionEnv): void {
  const before = JSON.stringify(planSelection(context));
  // Keep the shared action provenance for independent discard facts and routing.
  const disabled = vi.spyOn(smoggyModule, "survivorSmoggyFacts").mockReturnValue(null);
  try {
    expect(JSON.stringify(planSelection(context))).toBe(before);
  } finally {
    disabled.mockRestore();
  }
}

it("F12 T3: the warning matches the actual post-discard blockers, despite both modal flags being true", () => {
  const result = facts().get(0)!;
  const actual = evidence.after.hand.filter((card) => card.unplayable_preventer_id === "SMOGGY_POWER");
  expect(result.retained_restricted_cards.map((card: Raw) => card.card_id)).toEqual(actual.map((card) => card.card_id));
  expect(result.retained_restricted_cards.map((card: Raw) => card.observed_restriction_after_survivor))
    .toEqual(actual.map((card) => card.unplayable_preventer_id));
  expect(result.retained_restricted_cards.map((card: Raw) => card.mod_playable_during_selection)).toEqual([true, true]);
  expect(result.retained_restricted_cards.map((card: Raw) => card.energy_sufficient_for_this_card_alone)).toEqual([true, true]);
  expect(result.energy_now).toBe(evidence.after.player.energy);
  expect(evidence.after.player.current_hp - evidence.next_hp).toBe(10);
  expect(result).not.toHaveProperty("hp_after");
  expect(result).not.toHaveProperty("wins_fight");
});

it("each hypothetical discard removes only its own restricted copy; attacks and Powers are not declared blocked", () => {
  const result = facts();
  expect(result.get(1)!.retained_restricted_cards.map((card: Raw) => card.card_id)).toEqual(["DEFLECT", "DEFEND_SILENT"]);
  expect(result.get(2)!.retained_restricted_cards.map((card: Raw) => card.card_id)).toEqual(["DEFEND_SILENT"]);
  expect(result.get(3)!.retained_restricted_cards.map((card: Raw) => card.card_id)).toEqual(["DEFLECT"]);
});

it("the production selection question carries the warning and still accepts all four choices through Jev", () => {
  const decision = planSelection(env(raw()));
  expect(decision?.kind).toBe("ask");
  if (decision?.kind !== "ask") throw new Error("expected Jev selection");
  expect(decision.deepseek).toBeUndefined();
  const question = decision.questions.pick;
  if (question?.type !== "choice") throw new Error("expected card choice");
  expect(Object.keys(question.criteria).sort()).toEqual(["card0", "card1", "card2", "card3"]);
  for (let index = 0; index < 4; index++) {
    const key = `card${index}`;
    expect(JSON.parse(question.criteria[key]!).smoggy_after_discard).toEqual(facts().get(index));
    expect(decision.resolve({ pick: { type: "choice", choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } }).intent)
      .toEqual({ action: "select_deck_card", option_index: index });
  }
});

it("does not mutate the snapshot or infer unknown costs, upgrades, or other skills", () => {
  const input = raw();
  for (const collection of [input.combat.hand, input.selection.cards]) collection[2].energy_cost = null;
  const before = structuredClone(input);
  expect(facts(input).get(0)!.retained_restricted_cards[0].energy_sufficient_for_this_card_alone).toBeNull();
  expect(input).toEqual(before);
  for (const collection of [input.combat.hand, input.selection.cards]) {
    collection[2].upgraded = true;
    collection[3].card_id = "UNOBSERVED_SKILL";
  }
  expect(survivorSmoggyFacts(parseGameState(input), true)).toBeNull();
});

it.each([
  ["different ascension", (x: Raw) => { x.run.ascension = 11; }],
  ["outside combat", (x: Raw) => { x.in_combat = false; }],
  ["missing count", (x: Raw) => { delete x.combat.player.skills_played_this_turn; }],
  ["unspent skill", (x: Raw) => { x.combat.player.skills_played_this_turn = 0; }],
  ["other smog amount", (x: Raw) => { x.combat.player.powers.find((p: Raw) => p.power_id === "SMOGGY_POWER").amount = 2; }],
  ["no smog", (x: Raw) => { x.combat.player.powers = []; }],
  ["multiple discards", (x: Raw) => { x.selection.max_select = 2; }],
  ["potion action", (x: Raw) => { x.combat.action_readiness.running_action_type = "UsePotionAction"; }],
  ["different hand copy", (x: Raw) => { x.combat.hand[2].card_id = "OTHER"; }],
  ["ambiguous index", (x: Raw) => { x.selection.cards[2].index = 0; }],
] as const)("%s leaves the old question unchanged", (_name, change) => {
  const input = raw(); change(input);
  expect(survivorSmoggyFacts(parseGameState(input), true)).toBeNull();
  const context = env(input);
  expectQuestionUnchangedWithoutSmoggyFacts(context);
});

it.each(["IRONCLAD", "NECROBINDER"])("%s questions remain byte-equivalent without reading that character's knowledge", (character) => {
  const input = raw(); input.run.character_id = character;
  const context = env(input);
  expectQuestionUnchangedWithoutSmoggyFacts(context);
  expect(survivorSmoggyFacts(context.state, true)).toBeNull();
});

it.each(["missing", "old turn", "old fight", "other card"])("%s source cannot enable the learned restriction", (change) => {
  const context = env(raw());
  if (change === "missing") context.screenMemory.cardSource = undefined;
  else if (change === "old turn") context.screenMemory.cardSource!.turn = 2;
  else if (change === "old fight") context.screenMemory.cardSource!.fight = "old";
  else context.screenMemory.cardSource!.id = "OTHER";
  expectQuestionUnchangedWithoutSmoggyFacts(context);
});

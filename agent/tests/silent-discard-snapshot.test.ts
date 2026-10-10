/** silent-0205: fixed raw A5HKP18P4Q0T F14 T5 and N3YHJMV1ATFR F42 T4. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-discard-snapshot-evidence.json";
import { baseState, runPayload } from "./scenarios.js";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { planSelection } from "../src/hand/screens/selection.js";
import { survivorDiscardFacts } from "../src/hand/screens/silent-discard-facts.js";
import { facingFightOf } from "../src/reflex/combat-plan.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";

// No refreshed knowledge or network can provide expected answers.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed discard evidence only"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

type Raw = Record<string, any>;
const cards = [...new Map(evidence.flatMap((f) => f.selection.cards).map((c) => [c.card_id, c])).values()];
const knowledge = makeKnowledge({ cards: cards.map((card) => ({
  id: card.card_id, name: card.name, type: card.card_type, cost: card.energy_cost,
  description: card.resolved_rules_text, description_raw: card.rules_text, vars: card.dynamic_values,
})) }, "cache");

function raw(index = 0): Raw {
  const frame = structuredClone(evidence[index]!);
  return baseState("CARD_SELECTION", {
    run_id: frame.run, in_combat: true, turn: frame.turn, available_actions: ["select_deck_card"],
    run: runPayload({ floor: frame.floor, ascension: 10, character_id: "SILENT", deck: [], relics: [], potions: [] }),
    combat: { player: frame.player, hand: frame.hand, enemies: frame.enemies, action_readiness: frame.action_readiness }, selection: frame.selection,
  });
}

function env(input: Raw): DecisionEnv {
  const state = parseGameState(input);
  const memory = createScreenMemory("CARD_SELECTION");
  memory.cardSource = { action: "play_card", id: "SURVIVOR", turn: state.turn, fight: facingFightOf(state) };
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: memory, shopDiscardPotions: [] };
}

function facts(input: Raw): Map<number, Raw> {
  const result = survivorDiscardFacts(parseGameState(input), true);
  expect(result).not.toBeNull();
  return result as Map<number, Raw>;
}

it.each([0, 1])("case %i: retained copies and resources match the independently logged post-discard state", (index) => {
  const frame = evidence[index]!;
  const result = facts(raw(index)).get(2)!;
  const identity = (c: Raw) => [c.card_id, c.upgraded];
  expect(result.retained_cards.map(identity)).toEqual(frame.after.hand.map(identity));
  expect(result.current_resources).toEqual({ hp: frame.after.player.current_hp, block: frame.after.player.block, energy: frame.after.player.energy });
  expect(result.discarded.card_id).toBe(index === 0 ? "BACKFLIP" : "OUTBREAK");
});

it("A5 F14 T5: retaining Backflip leaves one payable 8-block/draw-2 card, without refunding Survivor's energy", () => {
  const result = facts(raw());
  for (const index of [0, 1]) {
    expect(result.get(index)!.current_resources).toEqual({ hp: 35, block: 8, energy: 1 });
    expect(result.get(index)!.retained_cards.find((c: Raw) => c.card_id === "BACKFLIP")).toMatchObject({
      energy_cost_now: 1, energy_after_this_card_alone: 0, text_now: "获得8点格挡。 抽2张牌。",
    });
  }
  const discarded = result.get(2)!;
  expect(discarded.retained_cards.map((c: Raw) => c.card_id)).toEqual(["SPOILS_MAP", "STRIKE_SILENT"]);
  expect(discarded.retained_cards[0]).toMatchObject({ playable_before_discard: false, energy_after_this_card_alone: null });
  expect(discarded.retained_cards[1]).toMatchObject({ energy_cost_now: 1, energy_after_this_card_alone: 0 });
  expect(discarded).not.toHaveProperty("hp_after");
  expect(discarded).not.toHaveProperty("block_after");
});

it("N3 F42 T4: each other discard retains the 3-cost Outbreak; discarding it removes it", () => {
  const result = facts(raw(1));
  for (const index of [0, 1, 3]) {
    expect(result.get(index)!.retained_cards.find((c: Raw) => c.card_id === "OUTBREAK")).toMatchObject({
      energy_cost_now: 3, energy_sufficient_for_this_card_alone: true, energy_after_this_card_alone: 0,
    });
  }
  expect(result.get(2)!.retained_cards.some((c: Raw) => c.card_id === "OUTBREAK")).toBe(false);
  // These are independent single-card costs, not a promise that all retained cards can be played.
  expect(result.get(3)!.retained_cards.map((c: Raw) => c.energy_after_this_card_alone)).toEqual([2, 1, 0]);
  expect(result.get(3)!.basis).toContain("不能相加成整线");
});

it.each([0, 1])("case %i: the production selection entry presents facts and still accepts every legal candidate", (index) => {
  const input = raw(index);
  const decision = planSelection(env(input));
  expect(decision?.kind).toBe("ask");
  if (decision?.kind !== "ask") throw new Error("expected Jev selection");
  const question = decision.questions.pick;
  if (question?.type !== "choice") throw new Error("expected choice");
  expect(Object.keys(question.criteria)).toHaveLength(input.selection.cards.length);
  for (const card of input.selection.cards) {
    const key = `card${card.index}`;
    expect(JSON.parse(question.criteria[key]!).discard_snapshot.discarded.card_id).toBe(card.card_id);
    expect(decision.resolve({ pick: { type: "choice", choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } }).intent)
      .toEqual({ action: "select_deck_card", option_index: card.index });
  }
});

it("does not mutate the state, does not spend energy twice, and keeps uncertain costs unknown", () => {
  const input = raw(1);
  input.combat.player.energy = 2;
  const before = structuredClone(input);
  const outbreak = facts(input).get(0)!.retained_cards.find((c: Raw) => c.card_id === "OUTBREAK");
  expect(outbreak).toMatchObject({ energy_sufficient_for_this_card_alone: false, energy_after_this_card_alone: null });
  expect(input).toEqual(before);
  for (const collection of [input.combat.hand, input.selection.cards]) collection[2].costs_x = true;
  expect(facts(input).get(0)!.retained_cards.find((c: Raw) => c.card_id === "OUTBREAK"))
    .toMatchObject({ energy_sufficient_for_this_card_alone: null, energy_after_this_card_alone: null });
});

it.each(["IRONCLAD", "NECROBINDER"])("%s receives byte-equivalent selection questions with or without Survivor memory", (character) => {
  const input = raw(); input.run.character_id = character;
  const context = env(input);
  const before = planSelection(context);
  context.screenMemory.cardSource = undefined;
  expect(JSON.stringify(planSelection(context))).toEqual(JSON.stringify(before));
  expect(survivorDiscardFacts(context.state, true)).toBeNull();
});

it.each([9, 11])("unobserved ascension %i is unchanged", (ascension) => {
  const input = raw(); input.run.ascension = ascension;
  expect(survivorDiscardFacts(parseGameState(input), true)).toBeNull();
});

it.each(["turn", "fight", "source"])("stale or different %s memory does not add a projection", (field) => {
  const context = env(raw());
  if (field === "turn") context.screenMemory.cardSource!.turn = 0;
  else if (field === "fight") context.screenMemory.cardSource!.fight = "old-fight";
  else context.screenMemory.cardSource!.id = "OTHER";
  expect(JSON.stringify(planSelection(context))).not.toContain("discard_snapshot");
});

it.each(["multi", "selected", "energy", "copy", "slot", "text", "action"])("incomplete or out-of-scope %s input falls back without guessing", (field) => {
  const input = raw();
  if (field === "multi") input.selection.max_select = 2;
  if (field === "selected") input.selection.selected_count = 1;
  if (field === "energy") delete input.combat.player.energy;
  if (field === "copy") input.selection.cards[1].upgraded = true;
  if (field === "slot") input.selection.cards[1].index = 0;
  if (field === "text") input.combat.hand[1].resolved_rules_text = "changed";
  if (field === "action") input.combat.action_readiness.running_action_type = "GenericHookGameAction";
  expect(survivorDiscardFacts(parseGameState(input), true)).toBeNull();
});

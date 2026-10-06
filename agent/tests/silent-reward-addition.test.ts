/** Fixed PU80 card rewards, verified against their actual two-card additions and HP transitions. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { planReward } from "../src/hand/screens/reward.js";
import { silentRewardAdditionFacts } from "../src/hand/screens/silent-reward-addition.js";
import type { PickOption } from "../src/hand/screens/pick.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__silent_reward_addition_fixed__/${name}`,
}));
vi.mock("../src/knowledge/monster-db.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/monster-db.js")>(),
  readMonsterDbJson: () => ({ monsters: {}, bosses: {}, encounters: {} }),
}));

const fixture = JSON.parse(readFileSync(new URL("./silent-reward-addition-evidence.json", import.meta.url), "utf8"));
beforeEach(() => vi.stubEnv("CHARACTER", "silent"));
afterEach(() => vi.unstubAllEnvs());
function board(floor = 31) { return structuredClone(fixture.states[`f${floor}`]); }
function book(raw: ReturnType<typeof board>) { return raw.run.relics.find((r: any) => r.relic_id === "BOOK_OF_FIVE_RINGS"); }
function envOf(raw: ReturnType<typeof board>, buildDecider: "deepseek" | "jev" = "deepseek"): DecisionEnv {
  const state = parseGameState(raw);
  const knowledge = makeKnowledge({}, "cache");
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    combatPlanner: "card", buildDecider, screenMemory: createScreenMemory("REWARD"), shopDiscardPotions: [] };
}
function question(raw = board()) {
  const decision = planReward(envOf(raw)) as AskDecision;
  expect(decision.kind).toBe("ask");
  return { decision, facts: decision.state as Record<string, any>,
    addition: (decision.state as Record<string, any>).facts.reward_card_addition,
    options: decision.questions.pick!.criteria! };
}

it.each([28, 30, 31])("matches the observed F%s card reward on the actual production question", (floor) => {
  const raw = board(floor);
  const before = JSON.stringify(raw);
  const { decision, addition, options } = question(raw);
  const observed = fixture.observations.filter((r: any) => r.floor === floor);
  const start = observed[0], end = floor === 31 ? fixture.observations.at(-1) : observed[1];
  expect(addition.current_deck_size).toBe(start.deck_size);
  expect(addition.current_hp).toBe(start.hp);
  expect(addition.current_five_rings_count).toBe(start.book_count);
  for (const key of ["card0", "card1", "card2"]) {
    expect(addition.options.find((r: any) => r.key === key)).toEqual({ key,
      cards_added_reference: end.deck_size - start.deck_size, deck_size_after_reference: end.deck_size,
      five_rings_count_after_reference: end.book_count, hp_gain_reference: end.hp - start.hp, hp_after_reference: end.hp });
    expect(decision.resolve({ pick: { type: "choice", choice: key, reason: "固定验证", confidence: 1 } }).intent)
      .toEqual({ action: "choose_reward_card", option_index: Number(key.slice(4)) });
  }
  expect(addition.options.at(-1)).toEqual({ key: "skip", cards_added_reference: 0,
    deck_size_after_reference: start.deck_size, five_rings_count_after_reference: start.book_count,
    hp_gain_reference: 0, hp_after_reference: start.hp });
  expect(Object.keys(options)).toEqual(["card0", "card1", "card2", "skip"]);
  expect(decision.resolve({ pick: { type: "choice", choice: "skip", reason: "固定验证", confidence: 1 } }).intent)
    .toEqual({ action: "skip_reward_cards" });
  expect(addition.addition_reference_tied_option_groups).toEqual([["card0", "card1", "card2"]]);
  expect(addition.tie_note).toContain("不同牌的构筑价值");
  expect(addition.source).toContain("silent-0190/0187/0188");
  expect(addition.simulation_scope).toContain("按单张加牌");
  expect(addition.simulation_scope).toContain("未模拟宾邦复制和五轮书加牌回血");
  expect(JSON.stringify(raw)).toBe(before);
});

it("preserves every original option and HP fact while adding the conditional table", () => {
  const raw = board();
  const present = question(raw);
  book(raw).is_melted = true;
  const absent = question(raw);
  expect(present.options).toEqual(absent.options);
  const { reward_card_addition, ...original } = present.facts.facts;
  // Relic text itself is unchanged by is_melted in the existing buildFacts contract.
  expect(original).toEqual(absent.facts.facts);
  expect(reward_card_addition).toBeDefined();
});

it("leaves invalid and unobserved pre-choice counters unknown, including transient five", () => {
  for (const stack of [null, undefined, -1, 1.5, "3", NaN, 0, 4, 5, 6]) {
    const raw = board(); book(raw).stack = stack;
    const { addition } = question(raw);
    for (const ref of addition.options.slice(0, 3)) {
      expect(ref.cards_added_reference).toBe(2);
      expect(ref.five_rings_count_after_reference).toBeNull();
      expect(ref.hp_gain_reference).toBeNull();
      expect(ref.hp_after_reference).toBeNull();
    }
    expect(addition.addition_reference_tied_option_groups).toEqual([]);
    if (stack === 5) expect(addition.options.at(-1).five_rings_count_after_reference).toBeNull();
  }
  expect(fixture.observations.find((r: any) => r.floor === 31 && r.deck_size === 35).book_count).toBe(5);
  expect(fixture.observations.at(-1).book_count).toBe(0);
});

it("does not invent capped healing at a nearly full board", () => {
  const raw = board(); raw.run.current_hp = 80;
  const { addition } = question(raw);
  expect(addition.options[0].five_rings_count_after_reference).toBe(0);
  expect(addition.options[0].hp_gain_reference).toBeNull();
  expect(addition.options[0].hp_after_reference).toBeNull();
  expect(addition.options.at(-1).hp_after_reference).toBe(80);
});

it("requires this character and all three active relics in the observed combination", () => {
  for (const id of ["BING_BONG", "BOOK_OF_FIVE_RINGS", "PAELS_TOOTH"]) {
    for (const remove of [true, false]) {
      const raw = board();
      if (remove) raw.run.relics = raw.run.relics.filter((r: any) => r.relic_id !== id);
      else raw.run.relics.find((r: any) => r.relic_id === id).is_melted = true;
      expect(question(raw).addition).toBeUndefined();
    }
  }
  const raw = board(); raw.run.character_id = "IRONCLAD";
  const present = question(raw);
  book(raw).is_melted = true;
  const absent = question(raw);
  expect(present.addition).toBeUndefined();
  expect(present.options).toEqual(absent.options);
  expect(present.facts).toEqual(absent.facts);
});

it("does not change the existing Jev card question or its resolver", () => {
  const raw = board();
  const present = planReward(envOf(raw, "jev")) as AskDecision;
  book(raw).is_melted = true;
  const absent = planReward(envOf(raw, "jev")) as AskDecision;
  expect(present.state).toEqual(absent.state);
  expect(present.questions).toEqual(absent.questions);
  const answers = { pick: { type: "choice" as const, choice: "card0", reason: "固定验证", confidence: 1 } };
  expect(present.resolve(answers)).toEqual(absent.resolve(answers));
});

it("follows current sparse option indices and keeps an additional unknown action", () => {
  const raw = board();
  raw.reward.card_options.forEach((card: any, i: number) => { card.index = 4 + i * 2; });
  const { addition, options } = question(raw);
  expect(Object.keys(options)).toEqual(["card4", "card6", "card8", "skip"]);
  expect(addition.addition_reference_tied_option_groups).toEqual([["card4", "card6", "card8"]]);
  const picks = Object.keys(options).map((key): PickOption => ({ key, summary: {}, score: 0,
    intent: key === "skip" ? { action: "skip_reward_cards" } : { action: "choose_reward_card", option_index: Number(key.slice(4)) } }));
  picks.push({ key: "extra", intent: { action: "proceed" }, summary: {}, score: 0 });
  const facts = silentRewardAdditionFacts(envOf(raw).state, picks) as Record<string, any>;
  expect(facts.reward_card_addition.options.at(-1)).toEqual({ key: "extra", cards_added_reference: null,
    deck_size_after_reference: null, five_rings_count_after_reference: null, hp_gain_reference: null, hp_after_reference: null });
});

it("keeps unsupported scenes and invalid card indices outside the observed reference", () => {
  const picks: PickOption[] = [{ key: "bad", intent: { action: "choose_reward_card", option_index: -1 }, summary: {}, score: 0 }];
  const raw = board();
  const invalid = silentRewardAdditionFacts(envOf(raw).state, picks) as Record<string, any>;
  expect(invalid.reward_card_addition.options[0].cards_added_reference).toBeNull();
  for (const change of [
    (s: any) => { s.reward.pending_card_choice = false; },
    (s: any) => { s.screen = "SHOP"; },
    (s: any) => { s.in_combat = true; },
  ]) {
    const state = envOf(board()).state; change(state.raw);
    // Parsed screen/in_combat fields must agree with raw state, as they do in real input.
    state.screen = String(state.raw.screen); state.in_combat = Boolean(state.raw.in_combat);
    expect(silentRewardAdditionFacts(state, picks)).toEqual({});
  }
});

/**
 * V4 M2 audit (docs/v4-build-facts.md): every kind of build question the brain decides, rendered from fixed boards with
 * fixed outcome statistics, carries facts and no code-made score: no code_value, code_rank or scoring why, no card-value
 * tier or card-role counts, no potion/relic worth estimate, no boss-clock bonus, no skip bar. Every legal option is
 * listed (skip, leave, not buying included), and each card, relic, event option and rest action carries its outcome
 * statistics or 「无数据」, with the basis note in the facts.
 *
 * The route blocks some of these questions carry (route_review, act_route: the whole map, the plan and its facts; V4 M2
 * route work) are audited with them: they carry facts only too. The route questions themselves (map/*) are checked in
 * tests/build-decider.test.ts and tests/route-projection.test.ts.
 *
 * The last test locks the new card-reward question: its options exactly as the brain sees them.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { setExperienceForTests, type OutcomeStats } from "../src/knowledge/experience.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { NO_DATA, OUTCOME_BASIS_KEY } from "../src/knowledge/outcome-facts.js";
import { parseGameState } from "../src/mod/schema.js";
import { createScreenMemory, type Decision, type DecisionEnv, type ScreenMemory } from "../src/project/types.js";
import { DEEPSEEK_DECIDES_NOTE } from "../src/screens/pick.js";
import { withBossSim } from "../src/sim/build-sim-facts.js";
import { SerialDeckRunner } from "../src/sim/build-sim-pool.js";
import { rememberMap } from "../src/screens/rest.js";
import type { JsonValue } from "../src/util/json.js";
import { ask, board, decide, env, setupOneshotTests, type Raw } from "./oneshot-support.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { baseState, chestPayload } from "./scenarios.js";

setupOneshotTests();

/** Fixed outcome statistics (not the file every run refreshes). */
const STATS: OutcomeStats = {
  ascension: 8,
  generated: "2026-09-29T21:23:10",
  baseline: { runs: 150, mean_floor: 27.2, boss_pass_by_act: { "1": { n: 150, boss_pass: 0.69 }, "2": { n: 103, boss_pass: 0.19 }, "3": { n: 20, boss_pass: 0.05 } } },
  cards: {
    MOLTEN_FIST: { name: "熔融之拳", by_act: { "1": { picked: { n: 47, mean_floor: 26.6, boss_pass: 0.6 }, offered_not_picked: { n: 42, mean_floor: 27.6, boss_pass: 0.74 } } } },
    RUPTURE: { name: "撕裂", by_act: { "1": { picked: { n: 16, mean_floor: 27.1, boss_pass: 0.81 } }, "2": { offered_not_picked: { n: 3, mean_floor: 36.3, boss_pass: 0.33, low_n: true } } } },
    FLAME_BARRIER: { name: "火焰屏障", by_act: { "2": { picked: { n: 20, mean_floor: 35, boss_pass: 0.3 } } } },
    STRIKE_IRONCLAD: { name: "打击", by_act: { "1": { picked: { n: 4, mean_floor: 22, boss_pass: 0.5, low_n: true } } } },
  },
  relics: {
    PLANISPHERE: { name: "活动星图", by_act: { "1": { n: 5, mean_floor: 28.8, boss_pass: 0.8 } } },
    VAJRA: { name: "金刚杵", by_act: { "1": { n: 7, mean_floor: 30, boss_pass: 0.71 } } },
  },
  events: {
    FIELD_OF_MAN_SIZED_HOLES: { name: "人形洞穴之地", options: { ENTER_YOUR_HOLE: { title: "进入你的洞", n: 10, mean_floor: 32.4, boss_pass: 0.2, hp_change: -3, max_hp_change: 0, gold_change: 0 } } },
  },
  rest: { HEAL: { "60-80%": { n: 134, mean_floor: 32.1, boss_pass: 0.58 } }, SMITH: { "60-80%": { n: 76, mean_floor: 30.7, boss_pass: 0.61 } } },
};

beforeAll(() => setExperienceForTests([], STATS));
afterAll(() => setExperienceForTests(null, null));

/** Keys that are code's scores, ranks, reasons for a score, or hand-made card roles: never in a build question. */
const BANNED_KEYS = new Set([
  "code_value", "code_rank", "why", "score", "value", "rank", "tier", "target_why", "code_removal_order",
  "expected_hp_saved_in_boss", "deck_needs", "aoe_cards", "draw_cards", "scaling_cards", "damage_cards", "block_cards",
]);
/** Text that names code's scores: never in a build question's options, state or instructions. */
const BANNED_TEXT: RegExp[] = [
  /code_value|code_rank/, /code(?:'s)? value/i, /heuristic/i, /removal order/i, /upgrade priority/i, /card value/i,
  /skip (?:bar|line)/i, /\bthe bar\b/i, /\bscor(?:e|es|ed|ing)\b/i, /\[code /, /expected_hp_saved/,
  /\| (?:AOE|格挡牌|过牌|成长|伤害牌) \d/,
];

type Audit = { label: string; options: Record<string, Record<string, JsonValue>>; state: Record<string, JsonValue>; facts: Record<string, JsonValue>; instructions: string };

function audit(decision: Decision): Audit {
  const question = ask(decision);
  const pick = question.questions[question.deepseek.question];
  if (pick?.type !== "choice") throw new Error("expected a choice question");
  const options = Object.fromEntries(Object.entries(pick.criteria).map(([key, value]) => [key, JSON.parse(value ?? "{}") as Record<string, JsonValue>]));
  const state = question.state;
  return { label: question.label, options, state, facts: question.state["facts"] as Record<string, JsonValue>, instructions: pick.instructions };
}

/** Every key and string in a value, depth first. */
function walk(value: JsonValue | undefined, keys: string[], strings: string[]): void {
  if (typeof value === "string") strings.push(value);
  else if (Array.isArray(value)) for (const item of value) walk(item, keys, strings);
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.push(key);
      walk(child, keys, strings);
    }
  }
}

function expectNoScores(view: Audit): void {
  const keys: string[] = [];
  const strings: string[] = [];
  walk(view.options as unknown as JsonValue, keys, strings);
  walk(view.state as unknown as JsonValue, keys, strings);
  for (const key of keys) expect(BANNED_KEYS.has(key), `${view.label}: key ${key}`).toBe(false);
  for (const text of strings) for (const pattern of BANNED_TEXT) expect(pattern.test(text), `${view.label}: ${pattern} in ${text.slice(0, 120)}`).toBe(false);
  // The instructions: the shared note (which says code does not score the options), and the question's own text and
  // notes, a route block's note included.
  expect(view.instructions).toContain(DEEPSEEK_DECIDES_NOTE);
  const instructions = view.instructions.replace(DEEPSEEK_DECIDES_NOTE, "");
  for (const pattern of BANNED_TEXT) expect(pattern.test(instructions), `${view.label} instructions: ${pattern} in ${instructions.slice(0, 200)}`).toBe(false);
  // The deck line: counts by the game's card types, no code-made roles.
  expect(String(view.facts["deck_profile"])).toMatch(/^\d+ 张 \(攻击 \d+\/技能 \d+\/能力 \d+(?:\/诅咒或状态 \d+)?\) \| 升级 \d+ \| (?:平均费用 [\d.]+ \| )?力量来源 [^|]+$/);
}

function expectBasis(view: Audit): void {
  expect(String(view.facts[OUTCOME_BASIS_KEY]), view.label).toMatch(/^outcome_stats .*= A8 数据（本局 A\d+，统计只有 A8 的）：src\/knowledge\/outcome-stats\.json/);
  expect(String(view.facts[OUTCOME_BASIS_KEY])).toContain("基线（A8 全部 150 局）：到达第1幕的局过第1幕boss 69% (n=150)");
}

const statsLine = /^(?:A8 .+|无数据)$/;

/** The memory after the MAP screen before a room (the loop remembers every MAP screen's map). */
function afterMap(file: string): ScreenMemory {
  const memory = createScreenMemory("MAP");
  rememberMap(memory, parseGameState(board(file, "map_before")));
  return memory;
}

const off: Partial<DecisionEnv> = { oneshot: "off" };

describe("V4 M2 audit: build questions carry facts, not code's scores", () => {
  it("reward/card: every offer and the skip; each card with its copies in the deck and outcome statistics", () => {
    const view = audit(decide(env(board("xljq-f5-reward", "reward"))));
    expect(view.label).toBe("reward/card");
    expect(Object.keys(view.options)).toEqual(["card0", "card1", "card2", "skip"]);
    for (const key of ["card0", "card1", "card2"]) expect(view.options[key]).toMatchObject({ in_deck: expect.any(Number), outcome_stats: expect.stringMatching(statsLine) });
    expectNoScores(view);
    expectBasis(view);
  });

  it.each([
    ["shop/plan", {}],
    ["shop/buy", off],
  ] as const)("%s: every item, the removal and leaving; cards and relics with outcome statistics, potions with the belt fact", (label, over) => {
    const view = audit(decide(env(board("u6ru-f22-shop", "open"), undefined, over)));
    expect(view.label).toBe(label);
    expect(Object.keys(view.options)).toEqual(expect.arrayContaining(["remove", "leave"]));
    for (const [key, option] of Object.entries(view.options)) {
      if (key.startsWith("buy_card")) expect(option).toMatchObject({ in_deck: expect.any(Number), outcome_stats: expect.stringMatching(statsLine) });
      if (key.startsWith("buy_relic")) expect(option).toMatchObject({ text: expect.any(String), outcome_stats: expect.stringMatching(statsLine) });
      if (key.startsWith("buy_potion")) expect(option["potion_slots"]).toEqual(expect.any(String));
    }
    if (label === "shop/plan") {
      // Every stocked item, affordable or not.
      expect(Object.keys(view.options).filter((key) => key.startsWith("buy_"))).toHaveLength(13);
      expect(Object.values(view.state["your_cards_outcome_stats"] as Record<string, string>).every((line) => statsLine.test(line))).toBe(true);
    }
    expectNoScores(view);
    expectBasis(view);
  });

  it.each([
    ["rest/plan", {}],
    ["rest/choose", off],
  ] as const)("%s: heal, smith (each card with what the upgrade changes); the rest actions' outcome statistics by HP band", (label, over) => {
    const view = audit(decide(env(board("7b0d-f8-rest", "rest"), undefined, over)));
    expect(view.label).toBe(label);
    const rest = view.facts["rest_site"] as Record<string, JsonValue>;
    expect(rest["hp_band_now"]).toBe("60-80%");
    expect(rest["option_outcome_stats"]).toEqual({ HEAL: "A8 HP60-80% n=134 过本幕boss 58% 均终层32.1", SMITH: "A8 HP60-80% n=76 过本幕boss 61% 均终层30.7" });
    if (label === "rest/plan") {
      const smith = Object.entries(view.options).filter(([key]) => key.startsWith("o1:"));
      expect(smith.length).toBe(8);
      for (const [, option] of smith) expect(option).toMatchObject({ upgrade: expect.stringContaining(" -> "), card_outcome_stats: expect.stringMatching(statsLine) });
    }
    expectNoScores(view);
    expectBasis(view);
  });

  it.each([
    ["event/plan", {}],
    ["event/choose", off],
  ] as const)("%s: every unlocked option with its outcome statistics by option key", (label, over) => {
    const view = audit(decide(env(board("yql8-f22-holes", "event"), undefined, over)));
    expect(view.label).toBe(label);
    const event = view.facts["event"] as Record<string, JsonValue>;
    expect(event["option_outcome_stats"]).toEqual({ o0: NO_DATA, o1: "A8 选这个选项 n=10 过本幕boss 20% 均终层32.4，到下一层平均 HP-3" });
    expectNoScores(view);
    expectBasis(view);
  });

  it("event/act-plan: the Ancient's options and the act's whole map (act_route)", () => {
    const view = audit(decide(env(board("u6ru-f18-ancient", "event"), afterMap("u6ru-f18-ancient"))));
    expect(view.label).toBe("event/act-plan");
    expect(Object.keys(view.options)).toEqual(["o0", "o1", "o2"]);
    expect((view.state["act_route"] as Record<string, JsonValue>)["map"]).toEqual(expect.any(Array));
    expect(Object.keys((view.facts["event"] as Record<string, JsonValue>)["option_outcome_stats"] as Record<string, JsonValue>)).toEqual(["o0", "o1", "o2"]);
    expectNoScores(view);
  });

  it.each([
    ["selection/upgrade", "7b0d-f8-rest", "upgrade_select", (raw: Raw) => raw],
    ["selection/remove", "qug1-f22-shop-remove", "remove_select", (raw: Raw) => raw],
    ["selection/enchant", "8v0h-f22-selfhelp", "enchant_select", (raw: Raw) => raw],
    ["selection/transform", "qug1-f22-shop-remove", "remove_select", (raw: Raw) => {
      const selection = raw["selection"] as Raw;
      selection["kind"] = "deck_transform_select";
      selection["prompt"] = "选择1张牌进行变化。";
      return raw;
    }],
    ["selection/add", "qug1-f22-shop-remove", "remove_select", (raw: Raw) => {
      const selection = raw["selection"] as Raw;
      selection["prompt"] = "选择1张牌加入你的牌组。";
      selection["cards"] = (selection["cards"] as Raw[]).slice(0, 3).map((card, index) => ({ ...card, index, card_id: ["MOLTEN_FIST", "RUPTURE", "FLAME_BARRIER"][index], selected: false }));
      return raw;
    }],
  ] as const)("%s: every card offered, with its facts and outcome statistics", (label, file, key, edit) => {
    const view = audit(decide(env(edit(board(file, key)))));
    expect(view.label).toBe(label);
    for (const option of Object.values(view.options)) {
      expect(option["outcome_stats"]).toMatch(statsLine);
      if (label === "selection/upgrade") expect(option["upgrade"]).toContain(" -> ");
      if (label === "selection/add") expect(option["in_deck"]).toEqual(expect.any(Number));
    }
    expectNoScores(view);
    expectBasis(view);
  });

  it("chest/relic: each relic's text and outcome statistics", () => {
    const view = audit(decide(env(chestPayload(true))));
    expect(view.label).toBe("chest/relic");
    expect(view.options["r0"]).toMatchObject({ relic: "Vajra", outcome_stats: "A8 第1幕获得 n=7 过本幕boss 71% 均终层30" });
    expect(view.options["r1"]).toMatchObject({ outcome_stats: NO_DATA });
    expectNoScores(view);
    expectBasis(view);
  });

  it("bundle/choose and capstone/choose: every option; a bundle's cards with their outcome statistics", () => {
    const bundle = baseState("BUNDLE_SELECTION", {
      available_actions: ["choose_bundle"],
      bundles: [
        { index: 0, title: "A", cards: [{ card_id: "MOLTEN_FIST", name: "熔融之拳" }, { card_id: "RUPTURE", name: "撕裂" }] },
        { index: 1, title: "B", cards: [{ card_id: "FLAME_BARRIER", name: "火焰屏障" }] },
      ],
    });
    const bundles = audit(decide(env(bundle)));
    expect(bundles.label).toBe("bundle/choose");
    expect(bundles.options["b0"]!["card_outcome_stats"]).toEqual({ 熔融之拳: "A8 第1幕 拿了 n=47 过本幕boss 60% 均终层26.6 / 给了没拿 n=42 过本幕boss 74% 均终层27.6", 撕裂: "A8 第1幕 拿了 n=16 过本幕boss 81% 均终层27.1 / 给了没拿 无数据；第2幕 拿了 无数据 / 给了没拿 n=3(少) 过本幕boss 33% 均终层36.3" });
    expectNoScores(bundles);
    expectBasis(bundles);
    const capstone = baseState("CAPSTONE_SELECTION", {
      available_actions: ["choose_capstone_option"],
      capstone: { options: [{ index: 0, title: "X", description: "gain 10 max HP" }, { index: 1, title: "Y", description: "upgrade 2 cards" }] },
    });
    const capstones = audit(decide(env(capstone)));
    expect(Object.keys(capstones.options)).toEqual(["c0", "c1"]);
    expectNoScores(capstones);
  });

  // B3 (BOSS_SIM_BUILD=on): the act boss simulated for each option is a fact too: the same audit on the questions with
  // it (a fixed monster DB and move model, a few samples; tests/boss-sim-build.test.ts has the rest).
  it.each([
    ["reward/card", "xljq-f5-reward", "reward"],
    ["shop/plan", "u6ru-f22-shop", "open"],
    ["rest/plan", "7b0d-f8-rest", "rest"],
    ["selection/remove", "qug1-f22-shop-remove", "remove_select"],
  ] as const)("%s with the boss simulation: facts, not scores; every option still listed", async (label, file, key) => {
    setMonsterDbForTests(FIXTURE_DB);
    try {
      const e = env(board(file, key));
      const before = decide(e);
      const { decision } = await withBossSim(before, e, { runner: new SerialDeckRunner(), samples: 4, deadlineMs: 60_000, db: FIXTURE_DB, mm: FIXTURE_MM });
      const view = audit(decision);
      expect(view.label).toBe(label);
      expect(Object.keys(view.options)).toEqual(Object.keys(audit(before).options));
      for (const option of Object.values(view.options)) expect(String(option["boss_sim"])).toMatch(/^打本幕 boss（/);
      expect(view.facts["act_boss_sim"]).toEqual(expect.objectContaining({ current_deck: expect.stringMatching(/^胜率 \d+%/) }));
      expect(view.facts["act_boss_clock"]).toBeUndefined();
      expectNoScores(view);
      expectBasis(view);
    } finally {
      setMonsterDbForTests(null);
    }
  }, 60_000);

  it("the card reward as the brain sees it, locked (V4 M2 changes the question: no code_value / code_rank / why, no skip bar)", () => {
    const question = ask(decide(env(board("xljq-f5-reward", "reward"))));
    const pick = question.questions["pick"];
    if (pick?.type !== "choice") throw new Error("expected a choice question");
    expect(pick.criteria).toEqual({
      card0: JSON.stringify({ card: "武装", type: "Skill", rarity: "Common", cost: 1, text: "获得5点格挡。 升级你手牌中的一张牌。", in_deck: 0, outcome_stats: NO_DATA }),
      card1: JSON.stringify({ card: "熔融之拳", type: "Attack", rarity: "Common", cost: 1, text: "造成10点伤害。 将该敌人身上的易伤层数翻倍。 消耗。", in_deck: 0, outcome_stats: "A8 第1幕 拿了 n=47 过本幕boss 60% 均终层26.6 / 给了没拿 n=42 过本幕boss 74% 均终层27.6" }),
      card2: JSON.stringify({ card: "撕裂", type: "Power", rarity: "Uncommon", cost: 1, text: "每当你在你的回合失去生命值时, 获得1点力量。", in_deck: 0, outcome_stats: "A8 第1幕 拿了 n=16 过本幕boss 81% 均终层27.1 / 给了没拿 无数据；第2幕 拿了 无数据 / 给了没拿 n=3(少) 过本幕boss 33% 均终层36.3" }),
      skip: JSON.stringify({ card: "skip", note: "take no card" }),
    });
    expect(pick.instructions).toBe(`Which of these card rewards should I take, if any? ${DEEPSEEK_DECIDES_NOTE} in_deck: copies of that card already in your deck.`);
    expect(Object.keys(question.state)).toEqual(["run_brief", "deck_stats", "deck", "facts"]);
  });
});

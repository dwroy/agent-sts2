/**
 * One-shot build decisions (BUILD_DECIDER=deepseek, BUILD_ONESHOT; Dai 2026-09-29): the shared pieces (which
 * deck selection an option leads to, the deck as distinct cards, the upgrade preview) and the shop: one
 * question per visit for an ordered shopping list, played by code step by step, re-asked only when the shop
 * changes under the plan, the step-by-step questions when the answer is unusable.
 *
 * Boards are logged A9 states (tests/logged-states/oneshot/*.json).
 */

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import { createScreenMemory, type ScreenMemory } from "../src/project/types.js";
import { deckCards, deckFollowUp, selectionTask, upgradePreview } from "../src/screens/oneshot.js";
import { parseShopPlan } from "../src/screens/shop.js";
import type { JsonValue } from "../src/util/json.js";
import { loggedKnowledge } from "./logged.js";
import { act, ask, board, decide, env, FakeDeepSeek, keyOf, optionsOf, planned, play, played, setupOneshotTests, type Raw } from "./oneshot-support.js";
import { mainMenuPayload } from "./scenarios.js";

setupOneshotTests();

/* ---- shared pieces ------------------------------------------------------------------------------ */

describe("which deck selection an option leads to (the game's text)", () => {
  const cases: [string, ReturnType<typeof deckFollowUp>][] = [
    ["从你的[gold]牌组[/gold]中选择[blue]1[/blue]张牌[gold]移除[/gold]。", { task: "remove", count: 1, upTo: false, text: expect.any(String) as never }],
    ["从你的[gold]牌组[/gold]中移除[blue]2[/blue]张牌。将一张[red]凡庸[/red]添加到你的[gold]牌组[/gold]中。", { task: "remove", count: 2, upTo: false, text: expect.any(String) as never }],
    ["选择一张攻击牌[gold]附魔[/gold]：[purple]锋利[/purple][blue]2[/blue]。", { task: "enchant", count: 1, upTo: false, only: { type: "Attack" }, text: expect.any(String) as never }],
    ["为一张基础“打击”或“防御”附魔：涡旋。", { task: "enchant", count: 1, upTo: false, only: { basic: true, ids: ["STRIKE_", "DEFEND_"] }, text: expect.any(String) as never }],
    ["从你的牌组中选择3张攻击牌。为这些牌附魔：本能。", { task: "enchant", count: 3, upTo: false, only: { type: "Attack" }, text: expect.any(String) as never }],
    ["失去所有金币。变化2张牌。", { task: "transform", count: 2, upTo: false, text: expect.any(String) as never }],
    ["将至多6张牌变化为撕咬", { task: "transform", count: 6, upTo: true, text: expect.any(String) as never }],
    ["选择1张初始牌变化为坚韧之环。", { task: "transform", count: 1, upTo: false, only: { basic: true }, text: expect.any(String) as never }],
    ["回复9生命。升级你牌组中的一张牌。", { task: "upgrade", count: 1, upTo: false, text: expect.any(String) as never }],
    ["升级4张牌。", { task: "upgrade", count: 4, upTo: false, text: expect.any(String) as never }],
    ["移除2张打击。并将一张究极打击添加至你的牌组。", { task: "remove", count: 2, upTo: false, only: { ids: ["STRIKE_"] }, text: expect.any(String) as never }],
    ["支付125金币。从你的牌组中移除1张牌。", { task: "remove", count: 1, upTo: false, text: expect.any(String) as never }],
    // No choice: random, all, whole deck, a named card, added cards, the next combat.
    ["随机升级2张牌。", null],
    ["失去15点生命，然后随机升级2张牌。", null],
    ["为你牌组中的所有“打击”附魔：特兹卡塔拉的余烬", null],
    ["为你牌组中的随机4张牌附魔：迅捷2。", null],
    ["复制你的整个牌组。获得霉运。", null],
    ["烙印+将从你的牌组中被移除。", null],
    ["从5张随机牌中选择1张加入你的牌组。", null],
    ["升级你的1张打击和1张防御。", null],
    ["在你接下来的1场战斗开始时，升级你的初始手牌。", null],
    ["失去速度药水。获得一张升级过的普通技能牌。", null],
    ["将所有带有[gold]克隆[/gold]附魔的牌复制一次。", null],
    ["回复最大生命值的30%（26）。", null],
  ];
  it.each(cases)("%s", (text, expected) => {
    expect(deckFollowUp(text)).toEqual(expected);
  });

  it("the selection screen's task from its kind and prompt (logged prompts)", () => {
    expect(selectionTask("deck_card_select", "选择[blue]1[/blue]张牌来[gold]移除[/gold]。")).toBe("remove");
    expect(selectionTask("deck_card_select", "选择[blue]1[/blue]张牌来[gold]变化[/gold]。")).toBe("transform");
    expect(selectionTask("deck_upgrade_select", "选择[blue]1[/blue]张牌来[gold]升级[/gold]。")).toBe("upgrade");
    expect(selectionTask("deck_enchant_select", "[center]选择[blue]1[/blue]张牌来[purple]附魔[/purple]。[/center]")).toBe("enchant");
    expect(selectionTask("deck_card_select", "选择[blue]2[/blue]张普通牌加入到你的[gold]牌组[/gold]。")).toBeNull();
    expect(selectionTask("choose_card_select", "选择一张牌")).toBeNull();
  });

  it("the deck as distinct cards: copies grouped, enchanted copies apart, Eternal marked", () => {
    const raw = board("u6ru-f22-shop", "open");
    const cards = deckCards(parseGameState(raw), loggedKnowledge);
    const strikes = cards.filter((card) => card.identity.card_id === "STRIKE_IRONCLAD");
    expect(strikes).toHaveLength(1);
    expect(strikes[0]).toMatchObject({ key: "c0", count: 5, eternal: true });
    expect(cards.find((card) => card.identity.card_id === "ASCENDERS_BANE")?.eternal).toBe(true);
    expect(cards.find((card) => card.identity.card_id === "DEFEND_IRONCLAD")).toMatchObject({ count: 5, eternal: false });
    expect(cards.reduce((sum, card) => sum + card.count, 0)).toBe((raw["run"] as Raw)["deck"] instanceof Array ? ((raw["run"] as Raw)["deck"] as unknown[]).length : 0);
  });

  it("the upgrade preview: the card's text now -> upgraded (logged upgrade numbers; text-only upgrades; cost)", () => {
    const card = (cardId: string, rules: string, resolved: string, values: [string, number][], cost = 1): Raw => ({
      card_id: cardId,
      upgraded: false,
      energy_cost: cost,
      rules_text: rules,
      resolved_rules_text: resolved,
      dynamic_values: values.map(([name, value]) => ({ name, base_value: value, current_value: value })),
    });
    expect(upgradePreview(card("BASH", "造成{Damage:diff()}点伤害。 给予{VulnerablePower:diff()}层易伤。", "造成8点伤害。 给予2层易伤。", [["Damage", 8], ["VulnerablePower", 2]], 2), loggedKnowledge)).toBe(
      "造成8点伤害。 给予2层易伤。 -> 造成10点伤害。 给予3层易伤。",
    );
    expect(upgradePreview(card("TRUE_GRIT", "获得{Block:diff()}点格挡。 {IfUpgraded:show:| 随机}消耗1张牌。", "获得7点格挡。 随机消耗1张牌。", [["Block", 7]]), loggedKnowledge)).toBe("获得7点格挡。 随机消耗1张牌。 -> 获得9点格挡。 消耗1张牌。");
    expect(upgradePreview(card("PYRE", "在回合开始时，获得{Energy:energyIcons()}。", "在回合开始时，获得res://images/packed/sprite_fonts/ironclad_energy_icon.png。", [["Energy", 1]], 2), loggedKnowledge)).toBe("在回合开始时，获得1点能量。 -> cost 2->1");
    expect(upgradePreview(card("SOMETHING_NEW", "", "Does a thing.", []), loggedKnowledge)).toMatch(/not in code's data/);
  });
});


/* ---- shop ---------------------------------------------------------------------------------------- */

const SHOP = "u6ru-f22-shop";

describe("shop: one question for the whole visit", () => {
  it("asks once with every stocked item (affordable or not), the removal, potion discards and leaving; card keys in state", () => {
    const raw = board(SHOP, "open");
    // One item out of reach: it is still listed, as a fact.
    ((raw["shop"] as Raw)["relics"] as Raw[])[1]!["price"] = 400;
    ((raw["shop"] as Raw)["relics"] as Raw[])[1]!["enough_gold"] = false;
    const decision = decide(env(raw));
    expect(decision.label).toBe("shop/plan");
    const options = optionsOf(decision);
    expect(Object.keys(options).sort()).toEqual(
      ["buy_card0", "buy_card1", "buy_card2", "buy_card3", "buy_card4", "buy_card5", "buy_card6", "buy_potion0", "buy_potion1", "buy_potion2", "buy_relic0", "buy_relic1", "buy_relic2", "discard_potion0", "leave", "remove"].sort(),
    );
    expect(options["buy_relic1"]).toMatchObject({ price: 400, affordable_now: false, code_value: expect.any(Number), code_rank: expect.any(Number), why: expect.any(String) });
    expect(options["buy_card3"]).toMatchObject({ buy: "火焰屏障", price: 74, affordable_now: true });
    expect(options["remove"]).toMatchObject({ price: 100, affordable_now: true, why: expect.stringMatching(/basic Strikes/) });
    const question = ask(decision);
    expect(question.deepseek.plan).toBeDefined();
    expect(question.deepseek.oneshot).toBeDefined();
    expect(String(question.questions["pick"]?.instructions)).toMatch(/\{"plan": \[/);
    expect(question.state["your_cards"]).toMatchObject({ c0: expect.stringMatching(/Eternal/), c4: expect.stringMatching(/×5/) });
    expect(question.state["note"]).toBeUndefined();
    const facts = question.state["facts"] as Record<string, JsonValue>;
    expect(facts["shop_stock"]).toBeDefined();
    expect(facts["card_removal"]).toEqual({ price: 100, affordable_now: true });
    // Without DeepSeek the shop is today's Jev/code question.
    expect(question.deepseek.baseline.label).toBe("shop/buy");
    // Removal candidates count as offered for the knowledge slice (Eternal cards cannot be removed).
    expect(question.deepseek.offeredCards).toContain("DEFEND_IRONCLAD");
    expect(question.deepseek.offeredCards).not.toContain("ASCENDERS_BANE");
  });

  it("parses the list: steps in order with leaving appended; invalid lists say why", () => {
    const e = env(board(SHOP, "open"));
    const ok = parseShopPlan({ plan: ["buy_card3", "discard_potion0", "buy_potion2", "remove:c4"], reason: "block" }, e);
    if ("invalid" in ok) throw new Error(ok.invalid);
    expect(ok.steps.map((step) => step.key)).toEqual(["buy_card3", "discard_potion0", "buy_potion2", "remove:c4", "leave"]);
    expect(ok.steps[3]).toMatchObject({ kind: "remove", price: 100, card: { card_id: "DEFEND_IRONCLAD" } });
    expect(parseShopPlan({ plan: [] }, e)).toMatchObject({ steps: [{ kind: "leave" }] });
    // Named instead of keyed: an item by its unique name, the removal's card by its unique name.
    expect(parseShopPlan({ plan: ["火焰屏障", "remove 防御"] }, e)).toMatchObject({ steps: [{ key: "buy_card3" }, { kind: "remove", card: { card_id: "DEFEND_IRONCLAD" } }, { kind: "leave" }] });
    expect(parseShopPlan({ plan: ["buy_card3", "leave", "buy_card4"] }, e)).toMatchObject({ steps: [{ key: "buy_card3" }, { kind: "leave" }] });
    const invalid = (plan: unknown): string => {
      const out = parseShopPlan({ plan }, e);
      return "invalid" in out ? out.invalid : "valid";
    };
    expect(invalid("buy_card3")).toMatch(/no "plan" list/);
    expect(invalid(["buy_card9"])).toMatch(/unknown step/);
    expect(invalid(["remove"])).toMatch(/removal without a card/);
    expect(invalid(["remove:c99"])).toMatch(/no such card key/);
    expect(invalid(["remove:c4", "remove:c8"])).toMatch(/more than one removal/);
    expect(invalid(["buy_card3", "buy_card3"])).toMatch(/repeated/);
    expect(invalid(["buy_card3", "火焰屏障"])).toMatch(/repeated/);
    expect(invalid(["discard_potion1"])).toMatch(/slot is empty/);
    const poor = board(SHOP, "open");
    ((poor["shop"] as Raw)["cards"] as Raw[])[6]!["enough_gold"] = false;
    expect(invalid.call(null, ["buy_card6"])).toBe("valid");
    const poorEnv = env(poor);
    const out = parseShopPlan({ plan: ["buy_card6"] }, poorEnv);
    expect("invalid" in out && out.invalid).toMatch(/first step buy_card6: .*not affordable/);
  });

  it("plays the list in order, each step a plan step of the plan's reference, leaving last (the logged F22 visit, 1 question instead of 5)", () => {
    const memory = createScreenMemory("SHOP");
    const first = decide(env(board(SHOP, "open"), memory));
    const resolved = played(planned(first, ["buy_card3", "buy_potion2", "buy_card4", "buy_card0", "buy_card2"]));
    expect(resolved.intent).toEqual({ action: "buy_card", option_index: 3 });
    expect(resolved.plan).toEqual({ id: "U6RUE7LBUFJF:F22:shop#1", steps: ["buy_card3", "buy_potion2", "buy_card4", "buy_card0", "buy_card2", "leave"] });
    expect(resolved.journal).toMatch(/^shop plan: buy 火焰屏障 \(74g\), buy 敏捷药水/);
    const expected: [string, Raw][] = [
      ["after_card3", { action: "buy_potion", option_index: 2 }],
      ["after_potion2", { action: "buy_card", option_index: 4 }],
      ["after_card4", { action: "buy_card", option_index: 0 }],
      ["after_card0", { action: "buy_card", option_index: 2 }],
      ["after_card2", { action: "close_shop_inventory" }],
    ];
    expected.forEach(([key, intent], index) => {
      const step = act(decide(env(board(SHOP, key), memory)));
      expect(step.intent).toEqual(intent);
      expect(step.plan).toMatchObject({ ref: "U6RUE7LBUFJF:F22:shop#1", step: index + 2 });
      expect(step.label).toBe("shop/buy");
    });
    expect(memory.shopPlan?.done).toEqual(["buy 火焰屏障 (74g)", "buy 敏捷药水 (49g)", "buy 岩石铠甲 (36g)", "buy 剑柄打击 (52g)", "buy 燃烧契约 (78g)"]);
    // Inventory closed: leave the shop as before (the loop marks the inventory as opened on this visit).
    memory.shopOpened = true;
    expect(decide(env(board(SHOP, "closed"), memory))).toMatchObject({ kind: "act", intent: { action: "proceed" } });
  });

  /** Plays the plan's first step on the open shop and returns the memory (next: buy_card4 on after_card3). */
  const afterFirst = (plan: string[] = ["buy_card3", "buy_card4"]): ScreenMemory => {
    const memory = createScreenMemory("SHOP");
    played(planned(decide(env(board(SHOP, "open"), memory)), plan));
    return memory;
  };

  it.each([
    ["a price changed (membership card)", (raw: Raw) => ((((raw["shop"] as Raw)["cards"] as Raw[])[4]!["price"] = 18), raw), /price changed \(36 -> 18g\)/],
    ["the bought item was restocked (courier)", (raw: Raw) => (Object.assign(((raw["shop"] as Raw)["cards"] as Raw[])[3]!, { card_id: "INFLAME", name: "燃烧", price: 90, is_stocked: true, enough_gold: true }), raw), /buy_card3 was restocked with 燃烧/],
    ["an item became unaffordable", (raw: Raw) => ((((raw["shop"] as Raw)["cards"] as Raw[])[4]!["enough_gold"] = false), raw), /not affordable/],
    ["an item is gone", (raw: Raw) => (Object.assign(((raw["shop"] as Raw)["cards"] as Raw[])[5]!, { card_id: null, is_stocked: false }), raw), /buy_card5 \(PRODUCTION\) is gone/],
  ])("re-asks with what was bought when the shop changes under the plan: %s", (_name, edit, why) => {
    const memory = afterFirst();
    const again = decide(env(edit(board(SHOP, "after_card3")), memory));
    expect(again.label).toBe("shop/plan");
    const state = ask(again).state;
    expect(String(state["replan_reason"])).toMatch(why);
    expect(state["already_done_this_visit"]).toEqual(["buy 火焰屏障 (74g)"]);
    // The re-ask is a new plan with its own reference once played.
    const resolved = played(planned(again, ["buy_card0"]));
    expect(resolved.plan?.id).toBe("U6RUE7LBUFJF:F22:shop#2");
    expect(memory.shopPlan?.done).toEqual(["buy 火焰屏障 (74g)", "buy 剑柄打击 (52g)"]);
  });

  it("an unchanged shop is not re-asked: the next step is played", () => {
    const memory = afterFirst();
    expect(act(decide(env(board(SHOP, "after_card3"), memory))).intent).toEqual({ action: "buy_card", option_index: 4 });
  });

  it("a stalled plan with nothing else affordable leaves without asking", () => {
    const memory = afterFirst(["buy_card3", "buy_card6"]);
    const broke = board(SHOP, "after_card2");
    const decision = decide(env(broke, memory));
    expect(decision).toMatchObject({ kind: "act", intent: { action: "close_shop_inventory" } });
    expect(decision.kind === "act" && decision.rationale).toMatch(/cannot go on/);
  });

  it("the removal: pays, then the card-select screen takes the named card as the next plan step", () => {
    const memory = createScreenMemory("SHOP");
    const open = board("qug1-f22-shop-remove", "open");
    const target = keyOf(open, "STRIKE_IRONCLAD");
    const resolved = played(planned(decide(env(open, memory)), [`remove:${target}`]));
    expect(resolved.intent).toEqual({ action: "remove_card_at_shop" });
    expect(memory.pendingPick).toMatchObject({ source: "shop", task: "remove", step: 2, cards: [{ card_id: "STRIKE_IRONCLAD" }] });
    const select = board("qug1-f22-shop-remove", "remove_select");
    const pick = act(decide(env(select, memory)));
    const offered = ((select["selection"] as Raw)["cards"] as Raw[]).find((card) => card["card_id"] === "STRIKE_IRONCLAD")!;
    expect(pick).toMatchObject({ label: "selection/remove", intent: { action: "select_deck_card", option_index: offered["index"] }, plan: { step: 2, ref: resolved.plan?.id } });
    expect(memory.pendingPick).toBeUndefined();
    expect(memory.shopPlan?.actions).toBe(2);
  });

  it("the named card is not on the card-select screen: that screen is asked as before", () => {
    const memory = createScreenMemory("SHOP");
    const open = board("qug1-f22-shop-remove", "open");
    played(planned(decide(env(open, memory)), [`remove:${keyOf(open, "STRIKE_IRONCLAD")}`]));
    const select = board("qug1-f22-shop-remove", "remove_select");
    const selection = select["selection"] as Raw;
    selection["cards"] = (selection["cards"] as Raw[]).filter((card) => card["card_id"] !== "STRIKE_IRONCLAD");
    const decision = decide(env(select, memory));
    expect(decision.label).toBe("selection/remove");
    expect(decision.kind === "ask" && decision.deepseek).toBeTruthy();
    expect(memory.pendingPick).toBeUndefined();
  });

  it("the removal's card left the deck before its step: re-asked", () => {
    const memory = createScreenMemory("SHOP");
    const open = board(SHOP, "open");
    played(planned(decide(env(open, memory)), ["buy_card3", "remove:c4"]));
    const after = board(SHOP, "after_card3");
    const run = after["run"] as Raw;
    run["deck"] = (run["deck"] as Raw[]).filter((card) => card["card_id"] !== "DEFEND_IRONCLAD");
    const again = decide(env(after, memory));
    expect(again.label).toBe("shop/plan");
    expect(String(ask(again).state["replan_reason"])).toMatch(/防御 is not in the deck/);
  });

  it("an unusable plan falls back to the step-by-step questions for the rest of the visit", () => {
    const memory = createScreenMemory("SHOP");
    const e = env(board(SHOP, "open"), memory);
    const decision = decide(e);
    expect(planned(decision, ["buy_card3", "buy_card3"])).toMatchObject({ invalid: expect.stringMatching(/repeated/) });
    ask(decision).deepseek.oneshot?.fallback();
    const next = decide(env(board(SHOP, "open"), memory));
    expect(next.label).toBe("shop/buy");
    expect(ask(next).deepseek.plan).toBeUndefined();
    expect(String(ask(next).questions["pick"]?.instructions)).toMatch(/One purchase per question/);
  });

  it("BUILD_ONESHOT=off and Jev/code keep the old questions", () => {
    expect(decide(env(board(SHOP, "open"), undefined, { oneshot: "off" })).label).toBe("shop/buy");
    const jev = decide(env(board(SHOP, "open"), undefined, { buildDecider: "jev" }));
    expect(jev.label).toBe("shop/buy");
    expect(jev.kind === "ask" ? jev.deepseek : undefined).toBeUndefined();
  });
});


/* ---- the loop ------------------------------------------------------------------------------------ */

describe("shop plans in the loop", () => {
  it("shop: one DeepSeek call; the plan row plays step 1 with the call's tokens, each later step is its own reused row", async () => {
    const deepseek = new FakeDeepSeek(() => "leave", () => ({ plan: ["buy_card3", "buy_potion2", "buy_card4", "buy_card0", "buy_card2"], reason: "block and draw for the crab" }));
    const sequence = ["open", "after_card3", "after_potion2", "after_card4", "after_card0", "after_card2", "closed"].map((key) => board(SHOP, key));
    const { stats, actions, records } = await play([...sequence, mainMenuPayload()], deepseek);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["shop/plan"]);
    expect(stats.deepseekCalls).toBe(1);
    expect(actions).toEqual([
      { action: "buy_card", option_index: 3 },
      { action: "buy_potion", option_index: 2 },
      { action: "buy_card", option_index: 4 },
      { action: "buy_card", option_index: 0 },
      { action: "buy_card", option_index: 2 },
      { action: "close_shop_inventory" },
      { action: "proceed" },
    ]);
    const shopRows = records.filter((row) => String(row["label"]).startsWith("shop/") && row["label"] !== "shop/leave");
    expect(shopRows[0]).toMatchObject({
      label: "shop/plan",
      decider: "deepseek",
      deepseek: { by: "deepseek", direct: true, plan_id: "U6RUE7LBUFJF:F22:shop#1", plan_step: 1, plan: ["buy_card3", "buy_potion2", "buy_card4", "buy_card0", "buy_card2", "leave"], reason: "block and draw for the crab", input_tokens: 20 },
      usage: { input_tokens: 20, output_tokens: 4, cache_hit_tokens: 9, reasoning_tokens: 2 },
    });
    expect(shopRows[0]?.["deepseek"]).not.toHaveProperty("reused");
    expect(shopRows.slice(1).map((row) => row["deepseek"])).toEqual([2, 3, 4, 5, 6].map((step) => ({ by: "deepseek", direct: true, reused: true, plan_ref: "U6RUE7LBUFJF:F22:shop#1", plan_step: step, choice: expect.any(String) })));
    for (const row of shopRows.slice(1)) {
      expect(row).toMatchObject({ label: "shop/buy", decider: "deepseek", usage: { input_tokens: 0, output_tokens: 0 } });
    }
    // What ops/stats.py counts as calls: DeepSeek records that are not reused.
    expect(records.filter((row) => row["deepseek"] && !(row["deepseek"] as Raw)["reused"])).toHaveLength(1);
  });

  it("shop: a price change under the plan re-asks once, with what was bought", async () => {
    const deepseek = new FakeDeepSeek(() => "leave", (_label, n) => (n === 1 ? { plan: ["buy_card3", "buy_card4"], reason: "first" } : { plan: ["buy_card4"], reason: "cheaper now" }));
    // A discount on every price from the second state on (the membership card's effect).
    const halved = (raw: Raw): Raw => {
      for (const list of ["cards", "relics", "potions"]) {
        for (const item of (raw["shop"] as Raw)[list] as Raw[]) if (typeof item["price"] === "number" && item["price"] > 0) item["price"] = Math.round((item["price"] as number) / 2);
      }
      return raw;
    };
    const second = halved(board(SHOP, "after_card3"));
    // After Stone Armor at its discounted 18g.
    const third = JSON.parse(JSON.stringify(second)) as Raw;
    Object.assign(((third["shop"] as Raw)["cards"] as Raw[])[4]!, { card_id: "", name: "", price: 0, is_stocked: false, enough_gold: false });
    (third["run"] as Raw)["gold"] = 200;
    const { stats, actions, records } = await play([board(SHOP, "open"), second, third, board(SHOP, "closed"), mainMenuPayload()], deepseek);
    expect(stats.deepseekCalls).toBe(2);
    expect(String(deepseek.calls[1]?.state["replan_reason"])).toMatch(/price changed/);
    expect(deepseek.calls[1]?.state["already_done_this_visit"]).toEqual(["buy 火焰屏障 (74g)"]);
    expect(actions.slice(0, 3)).toEqual([{ action: "buy_card", option_index: 3 }, { action: "buy_card", option_index: 4 }, { action: "close_shop_inventory" }]);
    const plans = records.filter((row) => row["label"] === "shop/plan");
    expect(plans.map((row) => (row["deepseek"] as Raw)["plan_id"])).toEqual(["U6RUE7LBUFJF:F22:shop#1", "U6RUE7LBUFJF:F22:shop#2"]);
  });

  it("shop: an invalid plan is logged (paid, not dispatched) and the visit goes step by step", async () => {
    const deepseek = new FakeDeepSeek((criteria) => ("buy_card3" in criteria ? "buy_card3" : "leave"), () => ({ plan: ["buy_everything"], reason: "?" }));
    const { stats, actions, records } = await play([board(SHOP, "open"), board(SHOP, "after_card3"), mainMenuPayload()], deepseek);
    expect(deepseek.calls.map((call) => `${call.label}${call.plan ? " (plan)" : ""}`)).toEqual(["shop/plan (plan)", "shop/buy", "shop/buy"]);
    expect(stats.deepseekCalls).toBe(3);
    expect(actions[0]).toEqual({ action: "buy_card", option_index: 3 });
    const failed = records.find((row) => row["label"] === "shop/plan")!;
    expect(failed).toMatchObject({ result: "not dispatched: one-shot answer unusable, re-planned step by step", deepseek: { invalid: expect.stringMatching(/unknown step buy_everything/), input_tokens: 20 }, usage: { input_tokens: 20 } });
    expect(String(failed["deepseek_fallback"])).toMatch(/one-shot answer unusable/);
  });
});

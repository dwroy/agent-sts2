/**
 * DeepSeek's prompt layout for its prefix cache (Dai 2026-09-28): the history of one question is a byte
 * prefix of the next one's; the state sent to DeepSeek holds one copy of each fact; and the display bugs
 * seen in the F24 card-reward prompt (energy icon paths, relic placeholders, "痛击++", merged Twin Strikes).
 */

import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { choiceMessage, deepseekState } from "../src/llm/deepseek-message.js";
import { fillRelicText } from "../src/knowledge/relic-values.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { deckEntries, describeDeck, describeRunRelicEffects } from "../src/project/deck.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { RunJournal, type JournalEntry } from "../src/project/run-journal.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/project/types.js";
import { planReward } from "../src/screens/reward.js";
import { fightPlanInput } from "../src/strategy/fight-plan.js";
import { iconsToText, stripMarkup, type JsonValue } from "../src/util/json.js";
import { baseState, combatPayload, rewardCardPayload, runPayload, testKnowledge } from "./scenarios.js";

type Raw = Record<string, unknown>;

const entry = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({ label: "reward/card", by: "deepseek", choice: "took Inflame", reason: "fits", asked: true, intent: null, ...overrides });
const act0 = (floor: number): string => String(floor <= 17 ? 0 : floor <= 33 ? 1 : 2);
const at = (screen: string, floor: number, run: Raw = {}): GameState =>
  parseGameState(baseState(screen, { run: runPayload({ floor, act_id: act0(floor), ascension: 8, boss_id: "VANTOM_BOSS", ...run }) }));
function fight(floor: number, turn: number, hp: number): GameState {
  const raw = combatPayload({ enemyHp: 30 });
  raw["turn"] = turn;
  raw["run"] = runPayload({ floor, act_id: act0(floor), ascension: 8, boss_id: "VANTOM_BOSS", current_hp: hp });
  ((raw["combat"] as Raw)["player"] as Raw)["current_hp"] = hp;
  return parseGameState(raw);
}

/** A few floors of a run: a fight and a DeepSeek pick on each. */
function playFloors(journal: RunJournal, from: number, to: number): void {
  for (let floor = from; floor <= to; floor += 1) {
    journal.observe(fight(floor, 1, 60), { knowledge: testKnowledge });
    journal.observe(fight(floor, 2, 54), { knowledge: testKnowledge });
    const reward = at("REWARD", floor, { current_hp: 54 });
    journal.observe(reward);
    journal.record(reward, entry({ choice: `card-${floor}`, reason: `reason ${floor}` }));
  }
}

/** The message's bytes up to the end of the history's text (inside its JSON string). */
function historyPrefix(message: string, history: string): string {
  const quoted = JSON.stringify(history).slice(0, -1);
  const start = message.indexOf(quoted);
  expect(start).toBeGreaterThan(0);
  return message.slice(0, start + quoted.length);
}

describe("DeepSeek prompt: cache-friendly layout", () => {
  const question = "Which card?";
  const options = { card0: '{"card":"A"}', skip: '{"card":"skip"}' };

  it("the next decision's message starts with the previous one's whole history block, byte for byte", () => {
    const journal = new RunJournal();
    playFloors(journal, 1, 4);
    const state5 = at("REWARD", 5, { current_hp: 54 });
    journal.observe(state5);
    const first = journal.render(state5, testKnowledge, {}, { label: "reward/card", criteria: options, factsCovered: true });
    const message1 = choiceMessage({ facts: { deck: [], hp: "54/80" } }, question, options, { ...first } as unknown as JsonValue);
    expect(first.history).toContain("F4 ");

    // Between the two questions: the F5 pick is played, a fight is fought on F6.
    journal.record(state5, entry({ choice: "card-5" }));
    journal.observe(fight(6, 1, 54), { knowledge: testKnowledge });
    journal.observe(fight(6, 3, 40), { knowledge: testKnowledge });
    const state6 = at("REWARD", 6, { current_hp: 40, gold: 250 });
    journal.observe(state6);
    const second = journal.render(state6, testKnowledge, {}, { label: "reward/card", criteria: options, factsCovered: true });
    const message2 = choiceMessage({ facts: { deck: [], hp: "40/80" } }, question, options, { ...second } as unknown as JsonValue);

    expect(second.history.startsWith(first.history)).toBe(true);
    expect(second.history.length).toBeGreaterThan(first.history.length);
    expect(second.history.slice(first.history.length)).toContain(" reward/card [DS]: card-5");
    // The act block and the whole history of the first message are the second message's prefix.
    const prefix = historyPrefix(message1, first.history);
    expect(message2.startsWith(prefix)).toBe(true);
    expect(prefix.indexOf('"act":')).toBeLessThan(prefix.indexOf('"history":'));
    // The volatile parts come after it: the F6 fight is this floor's, the state and options come last.
    expect(second.this_floor).toContain(" 战斗 JAW_WORM+CULTIST: 54→");
    expect(message2.indexOf('"this_floor"')).toBeGreaterThan(message2.indexOf('"history"'));
    expect(message2.indexOf('"state"')).toBeGreaterThan(message2.indexOf('"knowledge"') === -1 ? message2.indexOf('"history"') : message2.indexOf('"knowledge"'));
  });

  it("two questions on the same floor share the act block and the whole history too", () => {
    const journal = new RunJournal();
    playFloors(journal, 1, 3);
    const shop = at("SHOP", 4);
    journal.observe(shop);
    const one = journal.render(shop, testKnowledge, {}, { label: "shop/buy", factsCovered: true });
    journal.record(shop, entry({ label: "shop/buy", choice: "bought Anger" }));
    const two = journal.render(shop, testKnowledge, {}, { label: "shop/buy", factsCovered: true });
    expect(two.act).toBe(one.act);
    expect(two.history).toBe(one.history);
    expect(two.this_floor).toContain(" shop/buy [DS]: bought Anger");
  });

  it("a stale state of a floor already left does not rewrite the history", () => {
    const journal = new RunJournal();
    playFloors(journal, 1, 3);
    const now = at("MAP", 4);
    journal.observe(now);
    const before = journal.render(now, testKnowledge, {}).history;
    journal.observe(at("REWARD", 2, { current_hp: 11, gold: 1 }));
    journal.record(at("REWARD", 2), entry({ choice: "late" }));
    const after = journal.render(now, testKnowledge, {});
    expect(after.history).toBe(before);
    expect(after.this_floor).toContain("(F2) reward/card [DS]: late");
  });
});

function rewardEnv(): DecisionEnv {
  const config = loadConfig({} as NodeJS.ProcessEnv);
  const raw = rewardCardPayload();
  const state = parseGameState(raw);
  return {
    state, knowledge: testKnowledge, brief: buildRunBrief(state, testKnowledge), screenMemory: createScreenMemory("REWARD"),
    thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], buildDecider: "deepseek",
  };
}

describe("DeepSeek prompt: one copy of each fact", () => {
  it("a card reward's state keeps facts and drops run_brief / deck_stats / deck text / deck_needs copies", () => {
    const decision = planReward(rewardEnv()) as AskDecision;
    expect(decision.kind).toBe("ask");
    const raw = decision.state;
    // The Jev-era copies are there before… (V4 M2: deck_needs, code's card-role counts, and the skip advice are not
    // in DeepSeek's question at all.)
    expect(Object.keys(raw)).toEqual(expect.arrayContaining(["run_brief", "deck_stats", "deck", "facts"]));
    expect(raw["deck_needs"]).toBeUndefined();
    expect(raw["note"]).toBeUndefined();
    const view = deepseekState(raw);
    // …and gone from DeepSeek's view; what facts does not hold stays.
    expect(view["deck"]).toBeUndefined();
    expect(view["deck_stats"]).toBeUndefined();
    expect(view["deck_needs"]).toBeUndefined();
    expect(view["run_brief"]).toEqual({ character: "Ironclad" });
    const facts = view["facts"] as Record<string, JsonValue>;
    expect(facts["deck_needs"]).toBeUndefined();
    expect(facts["act_boss"]).toBe("SLIME_BOSS");
    expect(String(facts["deck_profile"])).toMatch(/^5 张 \(攻击 3\/技能 1\/能力 1\) \| 升级 1 \| 平均费用 1\.2 \| 力量来源 [^|]*（牌面或遗物文字写明获得持续的力量）$/);
    expect(facts["hp"]).toBe("55/80 (69%)");
    // Every card, relic and potion appears once in the whole message.
    const message = choiceMessage(raw, "Which?", {}, undefined);
    expect(message.split("Gain 2 Strength").length - 1).toBe(1);
    expect(message.split("Deal 6 damage").length - 1).toBe(1);
    expect(message.split("Fire Potion").length - 1).toBe(1);
    expect(message.split("Burning Blood").length - 1).toBe(1);
  });

  it("situation, shop stock and event title repeated by facts are dropped; what differs stays", () => {
    const state = {
      situation: { screen: "REST", hp: "10/80 (13%)", hp_percent: 13, gold: 88, next_nodes: ["Monster"], upgradable_cards: 5 },
      stock: [{ item: "Anger", price: 40 }],
      event: { title: "T", text: "event text" },
      replan_because: "HP fell",
      facts: { deck: [], hp: "10/80 (13%)", gold: 88, shop_stock: [{ item: "Anger", price: 40 }], rest_site: { next_nodes: ["Monster"], upgradable_cards: ["Bash"] }, event: { id: "E", title: "T" }, replan_because: "HP fell" },
    } as Record<string, JsonValue>;
    const view = deepseekState(state);
    expect(view["situation"]).toEqual({ screen: "REST", upgradable_cards: 5 });
    expect(view["stock"]).toBeUndefined();
    expect(view["event"]).toEqual({ text: "event text" });
    expect(view["replan_because"]).toBeUndefined();
    expect(view["facts"]).toEqual(state["facts"]);
  });

  it("a state without facts (combat escalation) is sent unchanged", () => {
    const state = { run_brief: { hp: "1/2", deck: "x" }, deck: "a" } as Record<string, JsonValue>;
    expect(deepseekState(state)).toBe(state);
  });
});

describe("display fixes seen in the F24 prompt", () => {
  const icon = "res://images/packed/sprite_fonts/ironclad_energy_icon.png";

  it("energy icons render as N点能量 (stars as N颗星), in deck text too", () => {
    expect(iconsToText(`失去3点生命。 获得${icon}${icon}。`)).toBe("失去3点生命。 获得2点能量。");
    expect(iconsToText(`获得[img]${icon}[/img]。`)).toBe("获得1点能量。");
    expect(iconsToText("获得res://images/packed/sprite_fonts/star_icon.pngres://images/packed/sprite_fonts/star_icon.png。")).toBe("获得2颗星。");
    const deck = [{ index: 0, card_id: "BLOODLETTING", name: "放血", upgraded: false, card_type: "Skill", energy_cost: 0, resolved_rules_text: `失去3点生命。 获得${icon}${icon}。` }];
    const state = at("REWARD", 5, { deck });
    const [card] = deckEntries(state, testKnowledge);
    expect(card!.description).toBe("失去3点生命。 获得2点能量。");
    expect(describeDeck(deckEntries(state, testKnowledge))).not.toContain("res://");
  });

  it("a number before a single icon is the amount (VSRG F18: Very Hot Cocoa read as 41点能量)", () => {
    const star = "res://images/packed/sprite_fonts/star_icon.png";
    expect(iconsToText(`在每场战斗的第一回合额外获得[blue]4[img]${icon}[/img][/blue]。`)).toBe("在每场战斗的第一回合额外获得[blue]4点能量[/blue]。");
    expect(stripMarkup(`在每场战斗的第一回合额外获得[blue]4[img]${icon}[/img][/blue]。`)).toBe("在每场战斗的第一回合额外获得4点能量。");
    expect(iconsToText(`获得[blue]4[/blue][img]${icon}[/img]。`)).toBe("获得[blue]4[/blue]点能量。");
    expect(iconsToText(`获得4${icon}。 消耗。`)).toBe("获得4点能量。 消耗。");
    expect(iconsToText(`你的下一张攻击牌耗能变为0${icon}。`)).toBe("你的下一张攻击牌耗能变为0点能量。");
    expect(iconsToText(`随机一张攻击牌，其耗能减少1${icon}。`)).toBe("随机一张攻击牌，其耗能减少1点能量。");
    expect(iconsToText(`每回合失去1点${icon}。`)).toBe("每回合失去1点能量。");
    expect(iconsToText(`获得3${star}。`)).toBe("获得3颗星。");
    expect(iconsToText(`每当你花费一点${star}，`)).toBe("每当你花费一颗星，");
    // A number that is not next to the icon is left alone; runs still count.
    expect(iconsToText(`抽[blue]2[/blue]张牌并获得[img]${icon}[/img][img]${icon}[/img]。`)).toBe("抽[blue]2[/blue]张牌并获得2点能量。");
  });

  it("relic placeholders are filled where the value is known, marked unknown otherwise", () => {
    expect(fillRelicText("LANTERN", "在每场战斗的第一回合获得{Energy:energyIcons()}。")).toBe("在每场战斗的第一回合获得1点能量。");
    expect(fillRelicText("PAELS_FLESH", "从你的第[blue]3[/blue]回合开始，在回合开始时额外获得{Energy:energyIcons()}。")).toBe("从你的第3回合开始，在回合开始时额外获得1点能量。");
    expect(fillRelicText("PARRYING_SHIELD", "如果你在回合结束时拥有至少[blue]{Block}[/blue]点[gold]格挡[/gold]，则对随机敌人造成[blue]{Damage}[/blue]点伤害。")).toBe(
      "如果你在回合结束时拥有至少10点格挡，则对随机敌人造成6点伤害。",
    );
    expect(fillRelicText("NOT_MEASURED", "获得{Block}点格挡。")).toBe("获得?(数值未知)点格挡。");
    // run_brief's relic effects (Jev's view too) no longer carry raw templates.
    const relics = [{ index: 0, relic_id: "BURNING_BLOOD", name: "燃烧之血", description: "在战斗结束时，回复{Heal}点生命。" }];
    const effects = describeRunRelicEffects(at("MAP", 3, { relics }), testKnowledge);
    expect(effects.join(" ")).not.toMatch(/\{[A-Za-z]+/);
    expect(effects[0]).toContain("heal 6 HP");
  });

  it("an upgraded card whose game name ends in + is shown with one + in the deck text", () => {
    const deck = [{ index: 0, card_id: "BASH", name: "痛击+", upgraded: true, card_type: "Attack", energy_cost: 2, resolved_rules_text: "造成10点伤害。 给予3层易伤。" }];
    const text = describeDeck(deckEntries(at("REWARD", 5, { deck }), testKnowledge));
    expect(text).toContain("痛击+ (Attack, 2E)");
    expect(text).not.toContain("++");
    const plain = [{ ...deck[0]!, name: "痛击" }];
    expect(describeDeck(deckEntries(at("REWARD", 5, { deck: plain }), testKnowledge))).toContain("痛击+ (Attack, 2E)");
  });

  it("copies of one card are grouped only when their text is byte-identical", () => {
    const twin = (index: number, text: string) => ({ index, card_id: "TWIN_STRIKE", name: "双重打击", upgraded: false, card_type: "Attack", energy_cost: 1, resolved_rules_text: text });
    const deck = [twin(0, "造成5点伤害两次。"), twin(1, "造成7点伤害两次。"), twin(2, "造成5点伤害两次。"), twin(3, "造成5点伤害两次。")];
    const lines = fightPlanInput(at("REWARD", 5, { deck }), testKnowledge, "run", {})["deck"] as string[];
    expect(lines).toEqual([
      "3x TWIN_STRIKE 双重打击 (Attack, 1 energy): 造成5点伤害两次。",
      "TWIN_STRIKE 双重打击 (Attack, 1 energy): 造成7点伤害两次。",
    ]);
  });
});

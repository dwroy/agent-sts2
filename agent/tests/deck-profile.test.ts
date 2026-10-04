/**
 * The deck profile line's Strength sources come from the game data, not a hand list (RBJ402TKQZ6F: the
 * deck had Fight Me! and the line read 「力量来源 无」 the whole run; the text is Chinese).
 */

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import { deckProfileLine } from "../src/project/deck-profile.js";
import { givesLastingStrength } from "../src/strategy/card-model.js";
import { loggedKnowledge } from "./logged.js";
import { baseState, runPayload } from "./scenarios.js";

type Raw = Record<string, unknown>;
const card = (index: number, id: string, name: string, type: string, text: string, upgraded = false): Raw => ({
  index, card_id: id, name, upgraded, card_type: type, rarity: "Common", costs_x: false, star_costs_x: false,
  energy_cost: 1, star_cost: 0, rules_text: "", resolved_rules_text: text, dynamic_values: [],
});
const relic = (index: number, id: string, name: string, description: string, stack: number | null = null): Raw => ({ index, relic_id: id, name, description, stack, is_melted: false });

describe("deck profile Strength sources", () => {
  it("reads lasting Strength from card and relic text, not this-turn or enemy Strength", () => {
    expect(givesLastingStrength("造成{Damage:diff()}点伤害两次。 获得{StrengthPower:diff()}点力量。 该敌人获得{EnemyStrength:diff()}点力量。")).toBe(true);
    expect(givesLastingStrength("造成5点伤害两次。 获得4点力量。 该敌人获得1点力量。")).toBe(true);
    expect(givesLastingStrength("Gain 2 Strength.")).toBe(true);
    expect(givesLastingStrength("造成{Damage:diff()}点伤害。 在本回合内获得{StrengthPower:diff()}点力量。")).toBe(false);
    expect(givesLastingStrength("给予另一名玩家{StrengthPower:diff()}点力量。")).toBe(false);
    expect(givesLastingStrength("在每回合开始时获得{Energy:energyIcons()}。所有敌人初始获得[blue]{StrengthPower}[/blue]点[gold]力量[/gold]。")).toBe(false);
    expect(givesLastingStrength("你现在能在[gold]休息处[/gold]获得[gold]力量[/gold]。（最多[blue]3[/blue]次）")).toBe(true);
    expect(givesLastingStrength("在每场战斗开始时，获得[blue]{StrengthPower}[/blue]点[gold]力量[/gold]。")).toBe(true);
    expect(givesLastingStrength("你在每场战斗中第一次获得的[gold]力量[/gold]值翻倍。")).toBe(false);
  });

  it("names Fight Me! and the Strength relics (Girya with its lifts) in the line (RBJ402TKQZ6F)", () => {
    const deck = [
      card(0, "STRIKE_IRONCLAD", "打击", "Attack", "造成6点伤害。"),
      card(1, "FIGHT_ME", "与我一战！", "Attack", "造成5点伤害两次。 获得4点力量。 该敌人获得1点力量。", true),
      card(2, "SETUP_STRIKE", "预备打击", "Attack", "造成7点伤害。 在本回合内获得2点力量。"),
    ];
    const relics = [
      relic(0, "BURNING_BLOOD", "燃烧之血", "在战斗结束时，回复[green]{Heal}[/green]点生命。"),
      relic(1, "GIRYA", "壶铃", "你现在能在[gold]休息处[/gold]获得[gold]力量[/gold]。（最多[blue]3[/blue]次）", 3),
      relic(2, "VAJRA", "金刚杵", "在每场战斗开始时，获得[blue]{StrengthPower}[/blue]点[gold]力量[/gold]。"),
    ];
    const state = parseGameState(baseState("MAP", { run: runPayload({ deck, relics }) }));
    expect(deckProfileLine(state, loggedKnowledge)).toContain("力量来源 与我一战！+、壶铃(锻炼 3 次)、金刚杵（");
  });

  it("carries no code-made card roles (V4 M2): counts by the game's card types, upgrades, cost and the Strength sources only", () => {
    const deck = [card(0, "STRIKE_IRONCLAD", "打击", "Attack", "造成6点伤害。"), card(1, "THUNDERCLAP", "雷霆一击", "Attack", "对所有敌人造成4点伤害。"), card(2, "SHRUG_IT_OFF", "耸肩无视", "Skill", "获得8点格挡。 抽1张牌。")];
    const line = deckProfileLine(parseGameState(baseState("MAP", { run: runPayload({ deck, relics: [] }) })), loggedKnowledge);
    expect(line).toBe("3 张 (攻击 2/技能 1/能力 0) | 升级 0 | 平均费用 1 | 力量来源 无（牌面或遗物文字写明获得持续的力量）");
    for (const role of ["AOE", "格挡牌", "过牌", "成长", "伤害牌"]) expect(line).not.toContain(role);
  });
});

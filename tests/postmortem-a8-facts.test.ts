/**
 * Fact-layer and mechanics fixes from the post-mortems of 94FP, 62PM, RUUB and W8JD (notes/lessons.md, A8,
 * 09-28): wrong or missing facts mislead Jev directly, so each is replayed on the logged board of the
 * cited turn (tests/logged-states) where one exists.
 */

import { describe, expect, it } from "vitest";

import { fillPotionText, UNKNOWN_VALUE } from "../src/knowledge/potion-values.js";
import { planCombat } from "../src/screens/combat.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { planSelection } from "../src/screens/selection.js";
import { planShop } from "../src/screens/shop.js";
import { modelPotion } from "../src/strategy/card-model.js";
import { logged, loggedEnv, loggedKnowledge, questionOf, referencePick } from "./logged.js";

const text = (value: unknown): string => JSON.stringify(value);

describe("potion text placeholders are filled (W8JD F29-F31: 「伤害减少{DamageDecrease}%」, Liquid Bronze, Speed Potion)", () => {
  it("fills the measured values and marks the rest unknown", () => {
    expect(fillPotionText("BEETLE_JUICE", "敌人的攻击在下[blue]{Repeat}[/blue]个回合中造成的伤害减少[blue]{DamageDecrease}%[/blue]。")).toBe("敌人的攻击在下4个回合中造成的伤害减少30%。");
    expect(fillPotionText("LIQUID_BRONZE", "获得[blue]{ThornsPower}[/blue]点[gold]荆棘[/gold]。")).toBe("获得3点荆棘。");
    expect(fillPotionText("RADIANT_TINCTURE", "获得{Energy:energyIcons()}。在你的下[blue]{RadiancePower}[/blue]个回合开始时，额外获得{energyPrefix:energyIcons(1)}。")).toBe("获得1点能量。在你的下3个回合开始时，额外获得1点能量。");
    expect(fillPotionText("AMBERGRIS", "回复你最大生命值的{HealPercent}%。")).toBe(`回复你最大生命值的${UNKNOWN_VALUE}%。`);
    // The game data's own text is filled too (every screen that reads it).
    expect(loggedKnowledge.potion("SPEED_POTION")?.description).not.toMatch(/\{/);
  });

  it("the W8JD F31 T3 combat question shows Beetle Juice's numbers and has no placeholder left", () => {
    const decision = planCombatTurn(loggedEnv(logged("w8jd-f31-t3")));
    expect(decision?.kind).toBe("ask");
    const shown = text(decision?.kind === "ask" ? [decision.state, decision.questions, decision.jevView ?? null] : null);
    expect(shown).not.toMatch(/\{(Repeat|DamageDecrease|ThornsPower|DexterityPower|Damage)\}/);
  });

  it("the EHJZ F31 shop shows Speed Potion's and Explosive Ampoule's numbers", () => {
    const decision = planShop(loggedEnv(logged("ehjz-shop-f31")));
    const shown = text(decision?.kind === "ask" ? decision.questions : decision);
    expect(shown).not.toMatch(/\{DexterityPower\}|\{Damage\}|\{PlatingPower\}/);
    expect(shown).toMatch(/5点敏捷|10点伤害|7层/);
  });
});

describe("Beetle Juice is modelled (W8JD F31: 'its effect is in no line's numbers' until the 1-HP turn)", () => {
  it("Shrink 4 on its target: that enemy's attack this turn is 30% less, and the line says so in its HP", () => {
    expect(modelPotion("BEETLE_JUICE", "甲虫汁", 0, [3], 0)?.shrink).toBe(4);
    // T3's end of turn (14 HP, the Ovicopter's 16 coming): drinking it loses less than ending the turn.
    const decision = planCombatTurn(loggedEnv(logged("w8jd-f31-t3-end")));
    expect(decision?.kind).toBe("ask");
    if (decision?.kind !== "ask") return;
    const question = decision.questions["plan"]!;
    if (question.type !== "choice") throw new Error("not a choice");
    const lines = Object.values(question.criteria).map((value) => JSON.parse(value!) as Record<string, unknown>);
    const drink = lines.find((line) => /甲虫汁/.test(String(line["plays"])));
    const idle = lines.find((line) => /nothing/.test(String(line["plays"])));
    expect(drink).toBeDefined();
    expect(idle).toBeDefined();
    expect(Number(drink!["hp_lost"])).toBeLessThan(Number(idle!["hp_lost"]));
  });
});

describe("a card potion's card is free and scored by what it does now (W8JD F31 T2: Battle Trance at 0 energy over Evil Eye)", () => {
  it("the logged board (0 energy, Skill Potion drunk last in Jev's line): plan_card marks Evil Eye, and the offers say they are free", () => {
    const fx = logged("w8jd-f31-t2-skill-potion");
    const env = loggedEnv(fx);
    // The loop hands the committed line's remaining step, the potion's card, to the selection screen.
    env.screenMemory.planBeforeSelection = [{ cardIndex: 201, cardId: "GEN:SKILL_POTION:1", upgraded: false, name: "card from 技能药水", target: null, targetName: null }];
    const decision = planSelection(env);
    expect(decision?.kind).toBe("ask");
    if (decision?.kind !== "ask") return;
    const question = decision.questions["pick"]!;
    if (question.type !== "choice") throw new Error("not a choice");
    const offers = Object.values(question.criteria).map((value) => JSON.parse(value!) as Record<string, unknown>);
    const marked = offers.filter((offer) => offer["plan_card"] !== undefined);
    expect(marked.map((offer) => offer["card"])).toEqual(["邪眼"]);
    expect(offers.every((offer) => /free this turn/.test(String(offer["cost_now"])))).toBe(true);
  });
});

describe("every line dies with an unmodelled potion in the belt (94FP F33 T10: 1 HP, the demon at 63, Stable Serum)", () => {
  it("the least-loss line (Pommel Strike first, for the draw) is code's reference; the potion is an option beside it", () => {
    const decision = planCombatTurn(loggedEnv(logged("94fp-f33-t10")));
    expect(decision?.kind).toBe("ask");
    expect(decision?.label).toBe("combat/least-loss+potion");
    const { options } = questionOf(decision);
    const lines = Object.entries(options).filter(([key]) => key.startsWith("plan"));
    expect(lines.length).toBe(1);
    expect(String(lines[0]![1]["every_line_dies"])).toMatch(/draw first/);
    const potion = Object.entries(options).find(([key]) => /^p\d/.test(key));
    expect(String(potion?.[1]["plays"])).toMatch(/稳定血清/);
    expect(String(potion?.[1]["without_it"])).toMatch(/every simulated line dies/);
    // Logged: card by card, Colossus first. The reference plays a Pommel Strike (剑柄打击) first.
    const pick = referencePick(decision);
    const hand = ((logged("94fp-f33-t10").state["combat"] as Record<string, unknown>)["hand"] as Record<string, unknown>[]);
    const first = hand.find((card) => card["index"] === pick.intent?.card_index);
    expect(pick.intent?.action).toBe("play_card");
    expect(first?.["card_id"]).toBe("POMMEL_STRIKE");
  });
});

describe("per-card incoming counts end-of-turn damage (94FP F33 T10: Colossus read 'incoming_damage_after_this 0' under Disintegration 15)", () => {
  it("every option's incoming includes Disintegration, which meets block first", () => {
    const decision = planCombat(loggedEnv(logged("94fp-f33-t10")));
    expect(decision?.kind).toBe("ask");
    if (decision?.kind !== "ask") return;
    const question = decision.questions["play"]!;
    if (question.type !== "choice") throw new Error("not a choice");
    const options = Object.fromEntries(Object.entries(question.criteria).map(([key, value]) => [key, JSON.parse(value!) as Record<string, unknown>]));
    const colossus = Object.values(options).find((option) => /巨像/.test(String(option["action"])))!;
    // 1 HP: 10 block + Colossus 7 against Disintegration 15, then the Slap: the turn still kills.
    expect(Number(colossus["incoming_damage_after_this"])).toBeGreaterThanOrEqual(1);
    const end = options["end_turn"]!;
    expect(end["lethal"]).toBe(true);
    expect(Number(end["incoming_damage"])).toBeGreaterThanOrEqual(15);
  });
});

describe("Knowledge Demon curse: the HP check comes before Rupture (94FP F33 T5: 36 HP, Disintegration taken over Sloth)", () => {
  it("the logged T5 pick is Sloth (懒惰), not Disintegration (瓦解)", () => {
    const decision = planSelection(loggedEnv(logged("94fp-f33-t5-curse")));
    expect(decision?.kind).toBe("act");
    expect(decision?.kind === "act" ? decision.rationale : "").toMatch(/-> 懒惰/);
  });

  it("with HP to spare Rupture still makes Disintegration the pick", async () => {
    const { curseRank } = await import("../src/screens/selection.js");
    const combat = (hp: number) => ({
      player: { current_hp: hp, powers: [{ power_id: "RUPTURE_POWER", amount: 1 }] },
      enemies: [{ current_hp: 100, max_hp: 399, is_alive: true }],
    });
    // 299 dealt over 4 turns: ~75 a turn, 2 turns left; 7 x 2 + 20 = 34.
    expect(curseRank(combat(60), 7, 5)("DISINTEGRATION")).toBe(0);
    expect(curseRank(combat(30), 7, 5)("DISINTEGRATION")).toBeGreaterThan(curseRank(combat(30), 7, 5)("WASTE_AWAY"));
  });
});

/**
 * Fact-layer and mechanics fixes from the post-mortems of 94FP, 62PM, RUUB and W8JD (notes/lessons.md, A8,
 * 09-28): wrong or missing facts mislead Jev directly, so each is replayed on the logged board of the
 * cited turn (tests/logged-states) where one exists.
 */

import { describe, expect, it } from "vitest";

import { fillPotionText, UNKNOWN_VALUE } from "../src/knowledge/potion-values.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { planShop } from "../src/screens/shop.js";
import { modelPotion } from "../src/strategy/card-model.js";
import { logged, loggedEnv, loggedKnowledge } from "./logged.js";

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

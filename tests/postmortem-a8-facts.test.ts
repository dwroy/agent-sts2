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
import { planReward } from "../src/screens/reward.js";
import { BOSS_NEEDS, bossClockJson } from "../src/strategy/boss-clock.js";
import { fightPlanInput } from "../src/strategy/fight-plan.js";
import { modelPotion } from "../src/strategy/card-model.js";
import { parseGameState } from "../src/mod/schema.js";
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

describe("the boss clock's Knowledge Demon HP (94FP F17-F32: '459HP, needs ~80/turn'; the fight's max_hp was 399)", () => {
  it("the F32 rest board: the clock counts 399", () => {
    const clock = bossClockJson(parseGameState(logged("94fp-rest-f32").state), loggedKnowledge)!;
    expect(clock["boss"]).toBe("KNOWLEDGE_DEMON");
    expect(clock["boss_hp"]).toBe(399);
    expect(String(clock["boss_note"])).toMatch(/Ponder heals/);
  });
});

describe("the clock's card bonus says which gap it is for (62PM F14: Taunt took a damage card's +10 as 'block')", () => {
  it("the logged F14 reward: Taunt's value is survivability, smaller than the damage gap's bonus", () => {
    const decision = planReward(loggedEnv(logged("62pm-reward-f14")));
    const { options } = questionOf(decision);
    const taunt = Object.values(options).find((option) => option["card"] === "挑衅")!;
    expect(String(taunt["why"])).toMatch(/survivability, not damage: .*6 block is ~0\.\d+ of the boss's ~\d+ a turn/);
    const bonus = Number(/block \+(\d+)/.exec(String(taunt["why"]))?.[1]);
    // Logged: "... for WATERFALL_GIANT: block +10", the damage gap's own bonus.
    expect(bonus).toBeLessThan(10);
  });
});

describe("the clock's estimate_note names what this deck's estimate counted (62PM F15-F16: a fixed Toasty Mittens / Rupture+Crimson Mantle note)", () => {
  it("62PM (neither in the deck or relics): the note names neither", () => {
    const note = String(bossClockJson(parseGameState(logged("62pm-reward-f14").state), loggedKnowledge)!["estimate_note"]);
    expect(note).not.toMatch(/Toasty Mittens|Crimson Mantle|Rupture|绯红披风|撕裂/);
  });

  it("94FP F32 (Rupture, Crimson Mantle and Inferno in the deck, Toasty Mittens held): the note names them", () => {
    const note = String(bossClockJson(parseGameState(logged("94fp-rest-f32").state), loggedKnowledge)!["estimate_note"]);
    expect(note).toMatch(/Rupture fed by/);
    expect(note).toMatch(/Toasty Mittens/);
    expect(note).toMatch(/Inferno x1/);
  });
});

describe("the boss fight plan sees the clock at the HP we have (RUUB F33: scale_then_kill from the dossier's full-HP 7-9 turns; 50 HP lasted 4)", () => {
  it("the logged F33 T1 board (50/80, Kaiser Crab): the fight plan input carries the turns 50 HP lasts, below the table's", () => {
    const state = parseGameState(logged("ruub-f33-t1").state);
    const clock = fightPlanInput(state, loggedKnowledge, "boss", {})["boss_clock"] as Record<string, unknown>;
    expect(clock).toBeDefined();
    expect(clock["boss"]).toBe("KAISER_CRAB");
    const survivable = Number(clock["survivable_turns"]);
    expect(survivable).toBeGreaterThan(0);
    expect(survivable).toBeLessThan(BOSS_NEEDS["KAISER_CRAB"]!.turns);
    expect(String(clock["survivable_note"])).toMatch(/^turns 50 HP lasts/);
    // The damage a turn needed follows the capped turns.
    expect(Number(clock["need_damage_per_turn"])).toBeGreaterThan(Math.round(428 / BOSS_NEEDS["KAISER_CRAB"]!.turns));
    // Not in hallway fights.
    expect(fightPlanInput(state, loggedKnowledge, "elite", {})["boss_clock"]).toBeUndefined();
  });
});

describe("start-of-turn AoE kills are named by source (W8JD F31 T3: 'mercury_hourglass_kills_next_turn' with no Hourglass; Inferno killed the larvae)", () => {
  const lines = (name: string) => {
    const decision = planCombatTurn(loggedEnv(logged(name)));
    return Object.values(questionOf(decision).options);
  };

  it("T3: the lines that play Inferno say Inferno played this turn; no line names the Hourglass", () => {
    const all = lines("w8jd-f31-t3");
    expect(all.some((line) => "mercury_hourglass_kills_next_turn" in line)).toBe(false);
    const killing = all.filter((line) => line["start_of_turn_aoe_kills"] !== undefined);
    expect(killing.length).toBeGreaterThan(0);
    for (const line of killing) {
      expect(String(line["start_of_turn_aoe_kills"])).toMatch(/by Inferno \d+ \(played this turn\)/);
      expect(String(line["plays"])).toMatch(/狱火/);
    }
  });

  it("T3's end (Inferno up): the source is the Inferno already up", () => {
    const killing = lines("w8jd-f31-t3-end").filter((line) => line["start_of_turn_aoe_kills"] !== undefined);
    expect(killing.length).toBeGreaterThan(0);
    for (const line of killing) expect(String(line["start_of_turn_aoe_kills"])).toMatch(/by Inferno \d+\)$/);
  });
});

describe("no 'calc mismatch' when Plating explains the mod's lethal flag (W8JD F31 T3: Plating 4, the solver right)", () => {
  it("the logged T3 end: the mod says lethal, the solver's end-turn line survives on Plating; no mismatch in any resolution", () => {
    const fx = logged("w8jd-f31-t3-end");
    expect((fx.state["combat"] as Record<string, unknown>)["end_turn_will_kill_player"]).toBe(true);
    expect(fx.decision.rationale).toMatch(/calc mismatch/);
    const decision = planCombatTurn(loggedEnv(fx));
    const { name, options } = questionOf(decision);
    expect(decision?.kind).toBe("ask");
    if (decision?.kind !== "ask") return;
    for (const key of Object.keys(options)) {
      const resolved = decision.resolve({ [name]: { type: "choice", choice: key, confidence: 0.9, probabilities: {}, raw: {} } });
      expect(resolved.rationale).not.toMatch(/calc mismatch/);
    }
    // Ending the turn is still offered (the mod's flag no longer forces a play).
    expect(Object.values(options).some((option) => /nothing/.test(String(option["plays"])))).toBe(true);
  });
});

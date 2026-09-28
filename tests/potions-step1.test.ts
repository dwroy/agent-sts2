/**
 * Stage 1 of the step-by-step upgrade (from the 910671b baseline): potion facts and effects the code
 * lacked, ported from the redesign branch. The potion text's template numbers are filled so Jev and
 * DeepSeek read numbers (7c00476), and potions the solver did not model are solver lines with their
 * effect (8490be6, 06ee142, eb6a670, 8a4d0bf, e34dd24, ff428e0, 7c00476). The checks are on what a line
 * computes (HP, damage, block, cards), on the logged board of the run that carried the potion unmodelled,
 * not on when strategy drinks it.
 */

import { describe, expect, it } from "vitest";

import { fillPotionText, UNKNOWN_VALUE } from "../src/knowledge/potion-values.js";
import { parseGameState } from "../src/mod/schema.js";
import { potionViews } from "../src/project/narrow.js";
import { drawablePileSize, enemySims, pileCardModels } from "../src/screens/combat-plan.js";
import { planSelection } from "../src/screens/selection.js";
import { expectedDraw, modelHandCard, modelPotion, pileCardPick, type CardModel } from "../src/strategy/card-model.js";
import { solveTurn, type EnemySim, type Plan, type SolverInput } from "../src/strategy/turn-solver.js";
import { combatOf, logged, loggedEnv, loggedKnowledge, type Logged } from "./logged.js";

type Raw = Record<string, unknown>;

/** The logged board with its belt as solver lines (no drinking cost), priced as combat-plan prices them. */
function withPotions(fx: Logged): SolverInput {
  const state = parseGameState(fx.state);
  const combat = combatOf(fx);
  const p = combat["player"] as Raw;
  const hand = (combat["hand"] as Raw[]).map((entry, index) => modelHandCard(entry, index, loggedKnowledge));
  const enemies = enemySims(combat);
  const ctx0 = { enemyTargets: enemies.map((enemy) => enemy.index), strength: 0, weak: false };
  const draw = pileCardModels(state, loggedKnowledge, "draw", ctx0);
  const discard = pileCardModels(state, loggedKnowledge, "discard", ctx0);
  const ctx = {
    ...ctx0,
    discardPick: pileCardPick(discard, 10, enemies.length, true),
    drawPick: pileCardPick(draw, 10, enemies.length, false),
    expectedDraw: expectedDraw(draw.length > 0 ? draw : discard, 0),
  };
  const potions = potionViews({ raw: fx.state["run"] as Raw }, loggedKnowledge)
    .map((potion) => modelPotion(potion.potion_id, potion.name, potion.slot, potion.valid_targets, 0, ctx))
    .filter((card): card is CardModel => card !== null);
  const drawable = drawablePileSize(fx.state);
  return {
    hand: [...hand, ...potions],
    enemies,
    fightKind: "elite",
    player: { hp: Number(p["current_hp"]), maxHp: Number(p["max_hp"]), block: Number(p["block"]), energy: Number(p["energy"]), weak: false, vulnerable: false, intangible: false, ...(drawable !== undefined ? { drawable } : {}) },
  };
}
const only = (plans: Plan[], prefix: string) => plans.find((plan) => plan.steps.length === 1 && plan.steps[0]!.cardId.startsWith(prefix));
const endTurn = (plans: Plan[]) => plans.find((plan) => plan.steps.length === 0)!;

describe("potion text: the template numbers filled (7c00476)", () => {
  it("known values are filled, an unknown one reads as unknown, never a raw {Name}", () => {
    expect(fillPotionText("BEETLE_JUICE", "敌人的攻击在下{Repeat}个回合中造成的伤害减少{DamageDecrease}%。")).toBe("敌人的攻击在下4个回合中造成的伤害减少30%。");
    expect(fillPotionText("ENERGY_POTION", "获得{Energy:energyIcons()}。")).toBe("获得2点能量。");
    expect(fillPotionText("NO_SUCH_POTION", "获得{Block}点格挡。")).toBe(`获得${UNKNOWN_VALUE}点格挡。`);
  });

  it("the belt a model reads carries numbers (W8JD F31 T3: Beetle Juice read '减少{DamageDecrease}%')", () => {
    const belt = potionViews({ raw: logged("w8jd-f31-t3").state["run"] as Raw }, loggedKnowledge);
    for (const potion of belt) expect(potion.text).not.toMatch(/\{/);
    expect(belt.find((potion) => potion.potion_id === "BEETLE_JUICE")?.text).toMatch(/30%/);
  });
});

describe("potion effects the solver lacked are lines with their numbers", () => {
  it("Potion-Shaped Rock deals 15 (measured), not 10", () => {
    expect(modelPotion("POTION_SHAPED_ROCK", "rock", 0, [0], 0)?.damage).toBe(15);
  });

  it("Heart of Iron: Plating 7 blocks at this turn's end (KGR6 F23 T4, 14/80, 8x2 coming)", () => {
    const plans = solveTurn(withPotions(logged("kgr6-f23-t4"))).plans;
    expect(endTurn(plans).outcome.hpLoss - only(plans, "POTION:HEART_OF_IRON")!.outcome.hpLoss).toBe(7);
    expect(only(plans, "POTION:HEART_OF_IRON")!.outcome.lasting).toBeGreaterThan(0);
  });

  it("Mazaleth's Gift (Ritual 1) is lasting value only (KGR6 F23 T4)", () => {
    const plans = solveTurn(withPotions(logged("kgr6-f23-t4"))).plans;
    const gift = only(plans, "POTION:MAZALETHS_GIFT")!;
    expect(gift.outcome.hpLoss).toBe(endTurn(plans).outcome.hpLoss);
    expect(gift.outcome.lasting).toBeGreaterThan(0);
  });

  it("Regen Potion: Regen 5 heals at this turn's end, before the attack (PKB0 F17 T4, 35/80)", () => {
    const plans = solveTurn(withPotions(logged("pkb0-f17-t4a"))).plans;
    expect(endTurn(plans).outcome.hpLoss - only(plans, "POTION:REGEN_POTION")!.outcome.hpLoss).toBe(5);
  });

  it("Blood Potion heals 20% of max HP at once (EN55 F8 T9, 7/80: +16)", () => {
    const plans = solveTurn(withPotions(logged("en55-f8-t9"))).plans;
    expect(endTurn(plans).outcome.hpLoss - only(plans, "POTION:BLOOD_POTION")!.outcome.hpLoss).toBe(16);
  });

  it("Beetle Juice: Shrink on its target, that enemy's attack this turn 30% less (W8JD F31 T3)", () => {
    const input = withPotions(logged("w8jd-f31-t3"));
    const flier = input.enemies.reduce((a, b) => (b.attacks[0]!.damage > a.attacks[0]!.damage ? b : a));
    const plans = solveTurn(input).plans;
    const juice = plans.find((plan) => plan.steps.length === 1 && plan.steps[0]!.cardId.startsWith("POTION:BEETLE_JUICE") && plan.steps[0]!.target === flier.index)!;
    const hit = flier.attacks[0]!.damage;
    expect(endTurn(plans).outcome.hpLoss - juice.outcome.hpLoss).toBe(hit - Math.floor(hit * 0.7));
  });

  it("Shackling Potion: every enemy hits 7 less per hit this turn (VQKX: carried unmodelled F11-F28)", () => {
    const shackle = modelPotion("SHACKLING_POTION", "Shackling Potion", 0, [], 0)!;
    expect(shackle.target).toBe("all");
    expect(shackle.enemyTempStrengthLoss).toBe(7);
    const enemies: EnemySim[] = [
      { index: 0, name: "A", hp: 50, maxHp: 50, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 12, hits: 2 }] },
      { index: 1, name: "B", hp: 50, maxHp: 50, block: 0, vulnerable: 0, weak: 0, artifact: 1, intangible: false, attacks: [{ damage: 10, hits: 1 }] },
    ];
    const plans = solveTurn({ hand: [shackle], player: { hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false }, enemies, fightKind: "elite" }).plans;
    // A: 2 hits of 12 -> 5 (-14); B's Artifact takes the loss.
    expect(endTurn(plans).outcome.hpLoss - only(plans, "POTION:SHACKLING_POTION")!.outcome.hpLoss).toBe(14);
  });

  it("Snecko Oil draws and makes the hand's costs their expected 1.5 (K8TC F17 T5: Bash at 2 is then playable after two 1-cost cards)", () => {
    const snecko = modelPotion("SNECKO_OIL", "Snecko Oil", 1, [], 0)!;
    expect(snecko.draw).toBe(7);
    const bash = { ...modelHandCard((combatOf(logged("k8tc-f17-t5"))["hand"] as Raw[]).find((entry) => entry["card_id"] === "BASH")!, 4, loggedKnowledge) };
    const plans = solveTurn({ hand: [bash, snecko], player: { hp: 20, maxHp: 80, block: 0, energy: 1.5, weak: false, vulnerable: false, intangible: false }, enemies: withPotions(logged("k8tc-f17-t5")).enemies, fightKind: "elite" }).plans;
    expect(plans.some((plan) => plan.steps.map((step) => step.cardId).join(",") === `${snecko.cardId},BASH`)).toBe(true);
    expect(plans.some((plan) => plan.steps.map((step) => step.cardId).join(",") === "BASH")).toBe(false);
  });

  it("Clarity draws 1 now, the three later draws are lasting value (K7G9 F45 T1)", () => {
    const plans = solveTurn(withPotions(logged("k7g9-f45-t1"))).plans;
    const clarity = only(plans, "POTION:CLARITY")!;
    expect(clarity.outcome.cardsDrawn).toBe(1);
    expect(clarity.outcome.lasting).toBeGreaterThan(0);
  });

  it("Distilled Chaos plays the draw pile's expected top cards for free (YG3H F33 T1: no attack in hand)", () => {
    const plans = solveTurn(withPotions(logged("yg3h-f33-t1"))).plans;
    expect(only(plans, "POTION:DISTILLED_CHAOS")!.outcome.damageDealt).toBeGreaterThan(0);
    expect(modelPotion("DISTILLED_CHAOS", "Distilled Chaos", 0, [], 0)).toBeNull();
  });

  it("Liquid Memories takes the discard pile's best card for this turn, free (PWSD F23 T3, 9/80)", () => {
    const fx = logged("pwsd-f23-t3");
    const state = parseGameState(fx.state);
    const ctx = { enemyTargets: [0, 1, 2], strength: 0, weak: false };
    const discard = pileCardModels(state, loggedKnowledge, "discard", ctx);
    expect(discard.length).toBeGreaterThan(5);
    const pick = pileCardPick(discard, 20, 3, true)!;
    expect(discard.map((card) => card.cardId)).toContain(pick.cardId);
    const memories = modelPotion("LIQUID_MEMORIES", "Liquid Memories", 2, [], 0, { ...ctx, discardPick: pick })!;
    expect(memories.generates?.cost).toBe(0);
    const plans = solveTurn(withPotions(fx)).plans;
    expect(plans.some((plan) => plan.steps.some((step) => step.cardId === "GEN:LIQUID_MEMORIES:2"))).toBe(true);
    // Nothing to take: not a line (and so still offered as before, unmodelled).
    expect(modelPotion("LIQUID_MEMORIES", "Liquid Memories", 2, [], 0, { ...ctx, discardPick: null })).toBeNull();
  });

  it("Attack Potion: a free attack card of a best-of-three value (X8R8 F17 T8)", () => {
    const plans = solveTurn(withPotions(logged("x8r8-f17-t8"))).plans;
    const line = plans.find((plan) => plan.steps.map((step) => step.cardId).join(",") === "POTION:ATTACK_POTION:0,GEN:ATTACK_POTION:0")!;
    expect(line.outcome.damageDealt).toBeGreaterThanOrEqual(14);
  });

  it("Gambler's Brew: each way discards a set of hand cards for as many expected draws, and the step says which (77UJ F33 T5, 9 HP vs 14)", () => {
    const plans = solveTurn(withPotions(logged("77uj-f33-t5"))).plans;
    const brews = plans.filter((plan) => plan.steps.some((step) => step.cardId.startsWith("POTION:GAMBLERS_BREW")));
    expect(brews.length).toBeGreaterThan(0);
    for (const plan of brews) expect(plan.steps.find((step) => step.cardId.startsWith("POTION:GAMBLERS_BREW"))!.discards!.length).toBeGreaterThan(0);
    // Logged: every line read "dies", the Brew was not in them; a Brew line lives.
    expect(brews.some((plan) => !plan.outcome.dies)).toBe(true);
  });

  it("Gambler's Brew's discard screen follows the plan's discards, then confirms", () => {
    const fx = logged("77uj-f33-t5");
    const hand = combatOf(fx)["hand"] as Raw[];
    const raw: Raw = {
      ...fx.state,
      screen: "CARD_SELECTION",
      available_actions: ["select_deck_card", "confirm_selection"],
      selection: { kind: "combat_hand_select", prompt: "丢弃任意张牌", min_select: 0, max_select: 5, selected_count: 0, can_confirm: true, cards: hand.map((card) => ({ ...card, selected: false })) },
    };
    const env = loggedEnv({ ...fx, state: raw });
    env.screenMemory.gambleDiscards = { turn: env.state.turn, cardIds: ["HELLRAISER"] };
    const first = planSelection(env);
    expect(first?.kind === "act" && first.intent).toEqual({ action: "select_deck_card", option_index: hand.findIndex((card) => card["card_id"] === "HELLRAISER") });
    const selected: Raw = { ...raw, selection: { ...(raw["selection"] as Raw), selected_count: 1, cards: hand.map((card) => ({ ...card, selected: card["card_id"] === "HELLRAISER" })) } };
    const env2 = loggedEnv({ ...fx, state: selected });
    env2.screenMemory.gambleDiscards = env.screenMemory.gambleDiscards;
    const second = planSelection(env2);
    expect(second?.kind === "act" && second.intent).toEqual({ action: "confirm_selection" });
  });
});

describe("Glowwater: the hand exhausted, a new hand drawn (logged: 5 -> 10, 3 -> 10)", () => {
  const card = (index: number, cardId: string, over: Partial<CardModel> = {}): CardModel => ({
    index, key: `c${index}`, cardId, name: cardId, type: "Skill", upgraded: false, cost: 1, xCost: false, playable: true, target: "self", validTargets: [],
    damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0,
    draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...over,
  });
  const worm: EnemySim = { index: 0, name: "Worm", hp: 20, maxHp: 40, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 4, hits: 1 }] };
  const draw = card(90, "EXPECTED", { type: "Attack", target: "single", validTargets: [0], damage: 6 });

  it("is modelled only with a known pile to draw from", () => {
    expect(modelPotion("GLOWWATER_POTION", "Glowwater", 0, [], 0)).toBeNull();
    expect(modelPotion("GLOWWATER_POTION", "Glowwater", 0, [], 0, { enemyTargets: [0], strength: 0, weak: false, expectedDraw: draw })?.special).toBe("glowwater");
  });

  it("a line drinks it, exhausts the hand and plays the drawn cards", () => {
    const potion = modelPotion("GLOWWATER_POTION", "Glowwater", 0, [], 0, { enemyTargets: [0], strength: 0, weak: false, expectedDraw: draw })!;
    const plans = solveTurn({
      hand: [card(0, "DEFEND", { block: 5, cost: 2 }), potion],
      player: { hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, drawable: 12 },
      enemies: [worm],
      fightKind: "monster",
    }).plans;
    const glow = plans.find((plan) => plan.steps[0]?.cardId.startsWith("POTION:GLOWWATER_POTION"));
    expect(glow).toBeDefined();
    expect(glow!.outcome.cardsDrawn).toBe(10);
    expect(glow!.outcome.damageDealt).toBe(18);
  });
});

describe("X-cost multi-hit cards", () => {
  it("Volley hits X times (0 at X=0), like Whirlwind (LXB3 F33 T3)", () => {
    const base = (combatOf(logged("k8tc-f17-t5"))["hand"] as Raw[])[0]!;
    const volley = modelHandCard({ ...base, card_id: "VOLLEY", name: "连射", cost: 0, dynamic_vars: { Damage: 10 } }, 0, loggedKnowledge);
    expect(volley.special).toBe("whirlwind");
    expect(volley.hits).toBe(0);
  });
});


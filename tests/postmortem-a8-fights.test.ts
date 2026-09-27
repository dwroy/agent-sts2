/**
 * Fight-level fixes from the A8 post-mortems of XMY2, K7G9, N7KR, NJSZ and HCBJ (notes/lessons.md),
 * each replayed on the logged board of the cited turn (tests/logged-states).
 */

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import type { AskDecision, Decision } from "../src/project/types.js";
import { foesOf, incomingUntil, lossUntilKill, planCombatTurn, potionsFirst, pressedAt } from "../src/screens/combat-plan.js";
import { awakeDamagePerTurn } from "../src/knowledge/move-model.js";
import { planMap } from "../src/screens/map.js";
import { planShop } from "../src/screens/shop.js";
import { drinkFirstSafe, isModelledPotion, modelPotion } from "../src/strategy/card-model.js";
import { expectedLossPerTurn, fightPlanInput, parseFightPlan } from "../src/strategy/fight-plan.js";
import { moveModel } from "../src/knowledge/move-model.js";
import { grindOutlasts, isReserved, objectiveInForce, potionRole } from "../src/strategy/intent.js";
import type { Plan } from "../src/strategy/turn-solver.js";
import { logged, loggedEnv, loggedKnowledge } from "./logged.js";

type Raw = Record<string, unknown>;
/** The options of a question: key -> parsed criteria. */
function optionsOf(decision: Decision | null): Record<string, Raw> {
  expect(decision?.kind).toBe("ask");
  const question = Object.values((decision as AskDecision).questions)[0]!;
  if (question.type !== "choice") throw new Error("not a choice");
  return Object.fromEntries(Object.entries(question.criteria).map(([key, value]) => [key, JSON.parse(value!) as Raw]));
}

const strategyOf = (decision: Decision | null): string[] => ((decision as AskDecision).state["strategy"] as string[]) ?? [];

describe("a preserve_hp grind the enemy outlasts is logged and played as kill_fast (XMY2 F24, K7G9 F45)", () => {
  it("the rule: turns to kill x HP lost a turn against HP now", () => {
    expect(grindOutlasts({ turnsToKill: 6, lossPerTurn: 13, hp: 19 })).toMatch(/grind outlasts our HP/);
    expect(grindOutlasts({ turnsToKill: 2, lossPerTurn: 5, hp: 19 })).toBeNull();
    expect(objectiveInForce("preserve_hp", { turnsLeft: 6, laterPhase: false, setupLeft: false, grind: { turnsToKill: 6, lossPerTurn: 13, hp: 19 } }).objective).toBe("kill_fast");
    expect(objectiveInForce("preserve_hp", { turnsLeft: 2, laterPhase: false, setupLeft: false, grind: { turnsToKill: 2, lossPerTurn: 5, hp: 19 } }).objective).toBe("preserve_hp");
  });

  for (const [name, why] of [
    ["xmy2-f24-t1", "Hunter Killer 126 HP at 19/80"],
    ["k7g9-f45-t1", "Mecha Knight 320 HP at 20/72"],
  ] as const) {
    it(`the validator logs it as a disagreement and keeps the objective (${why})`, () => {
      const fx = logged(name);
      const state = parseGameState(fx.state);
      expect(expectedLossPerTurn(state, loggedKnowledge)).toBeGreaterThan(0);
      const plan = parseFightPlan({ objective: "preserve_hp", kill_priority: [], reason: ["low_hp"] }, state, loggedKnowledge, { runId: "x", fight: fx.fightPlan!.fight, kind: fx.fightPlan!.kind, replans: 0 }, fx.runPlan);
      expect(plan.objective).toBe("preserve_hp");
      expect(plan.disagreements?.join(" ")).toMatch(/preserve_hp: the grind outlasts our HP .*code plays the fight as kill_fast/);
    });
  }

  it("XMY2 F24 T2 (the logged preserve_hp plan): Jev is told the fight is played as kill_fast, under balanced weights", () => {
    const decision = planCombatTurn(loggedEnv(logged("xmy2-f24-t2")));
    const lines = strategyOf(decision).join("\n");
    expect(lines).toMatch(/in force now: objective kill_fast \(preserve_hp: the grind outlasts our HP/);
    expect(lines).toMatch(/in force now: hp_policy balanced \(damage first/);
  });
});

describe("potions: a release holds for the turn, drinks come before the energy runs out (N7KR F8)", () => {
  it("T1: the Dexterity Potion released for the chosen line stays released after the Skill Potion's card (logged: re-plan 'only distinct line: Taunt; hp -9')", () => {
    const first = loggedEnv(logged("n7kr-f8-t1"));
    planCombatTurn(first);
    expect(first.screenMemory.reserveRelease?.note).toMatch(/safest line without it leaves 22 HP/);
    const replan = loggedEnv(logged("n7kr-f8-t1-replan"));
    replan.screenMemory.reserveRelease = first.screenMemory.reserveRelease;
    const options = optionsOf(planCombatTurn(replan));
    expect(String(options["plan1"]!["plays"])).toMatch(/^potion 敏捷药水, then 挑衅/);
    expect(Number(options["plan1"]!["hp_lost"])).toBeLessThanOrEqual(7);
    // Without the memory the re-plan filters it out again.
    const fresh = planCombatTurn(loggedEnv(logged("n7kr-f8-t1-replan")));
    expect(fresh?.kind === "act" ? fresh.rationale : "").toMatch(/only distinct line\): 挑衅 -> 花园幽灵鳗; hp -9/);
  });

  it("T1/T2: order-free potions are shown and played first, so a kill mid-line cannot strand them at 0 energy", () => {
    for (const name of ["n7kr-f8-t1", "n7kr-f8-t2"]) {
      const plays = Object.values(optionsOf(planCombatTurn(loggedEnv(logged(name))))).map((option) => String(option["plays"] ?? ""));
      for (const line of plays.filter((text) => text.includes("敏捷药水"))) expect(line).toMatch(/^potion 敏捷药水/);
    }
  });

  it("potionsFirst moves only order-free drinks (Strength, Dexterity, Block, Energy, Clarity), not targeted, card or draw potions", () => {
    const step = (cardId: string, name = cardId) => ({ cardIndex: 0, cardId, upgraded: false, name, target: null, targetName: null });
    const plan = { steps: [step("HEAVY_BLADE"), step("POTION:DEXTERITY_POTION:1"), step("POTION:FIRE_POTION:0"), step("POTION:SKILL_POTION:2")], outcome: {} as never, score: 0 } as Plan;
    expect(potionsFirst(plan).steps.map((entry) => entry.cardId)).toEqual(["POTION:DEXTERITY_POTION:1", "HEAVY_BLADE", "POTION:FIRE_POTION:0", "POTION:SKILL_POTION:2"]);
    expect(drinkFirstSafe("STRENGTH_POTION")).toBe(true);
    expect(drinkFirstSafe("CLARITY")).toBe(true);
    for (const id of ["FORTIFIER", "SWIFT_POTION", "ATTACK_POTION", "DUPLICATOR", "WEAK_POTION"]) expect(drinkFirstSafe(id)).toBe(false);
  });
});

describe("potions: released at low HP means pressed (XMY2 F24: 19/80 against one Hunter Killer)", () => {
  it("below 25% any non-boss fight is pressed, whatever the attackers", () => {
    expect(pressedAt(19, 80, "monster", 1)).toBe(true);
    expect(pressedAt(30, 80, "monster", 1)).toBe(false);
    expect(pressedAt(30, 80, "monster", 2)).toBe(true);
    expect(pressedAt(19, 80, "boss", 1)).toBe(false);
  });
});

describe("potions: Clarity and Mazaleth's Gift are modelled (K7G9 carried Clarity 35 floors; XMY2 F17 drank the Gift on T9)", () => {
  it("Clarity draws a card now and is a reserve 'damage' potion like Swift", () => {
    expect(isModelledPotion("CLARITY")).toBe(true);
    expect(modelPotion("CLARITY", "Clarity", 0, [], 0)?.draw).toBe(1);
    expect(potionRole("CLARITY", "")).toBe("damage");
  });

  it("K7G9 F45 T1: Clarity is in code's lines, drunk first", () => {
    const options = optionsOf(planCombatTurn(loggedEnv(logged("k7g9-f45-t1"))));
    expect(String(options["plan1"]!["plays"])).toMatch(/^potion 明晰提取物/);
  });

  it("XMY2 F17 T1: the act-1 boss's rank 1 drinks Mazaleth's Gift (Ritual 1) first", () => {
    expect(potionRole("MAZALETHS_GIFT", "")).toBe("strength");
    const options = optionsOf(planCombatTurn(loggedEnv(logged("xmy2-f17-t1"))));
    expect(String(options["plan1"]!["plays"])).toMatch(/^potion 马萨雷斯的赠礼/);
  });
});

describe("potions: Beetle Juice is a block potion and a reserved potion is not dropped for a new one (HCBJ F11)", () => {
  it("damage reduction and Thorns read as block, before 'damage'", () => {
    const juice = loggedKnowledge.potion("BEETLE_JUICE")!.description;
    expect(potionRole("BEETLE_JUICE", juice)).toBe("block");
    expect(potionRole("SOME_POTION", "敌人的攻击造成的伤害减少25%")).toBe("block");
    expect(isReserved(["damage", "strength"], "BEETLE_JUICE", juice)).toBe(false);
  });

  it("the logged board: Liquid Bronze goes for the Tiny Mailbox's potion, not Beetle Juice (logged: 'discarding 甲虫汁 (rank 5)')", () => {
    const decision = planMap(loggedEnv(logged("hcbj-map-f11-discard")));
    expect(decision?.kind === "act" ? decision.label : "").toBe("map/discard-potion");
    expect(decision?.kind === "act" ? decision.rationale : "").toMatch(/流动铜液/);
  });

  it("a potion the run plan reserves is kept while an unreserved one can go", () => {
    const fx = logged("hcbj-map-f11-discard");
    const decision = planMap(loggedEnv(fx, { runPlan: { ...fx.runPlan!, reserve: ["block"] } }));
    // Both are block potions now: with every one reserved the weakest of all goes.
    expect(decision?.kind === "act" ? decision.rationale : "").toMatch(/流动铜液/);
  });
});

describe("shop: a full belt swaps an unreserved potion for one the run plan reserves (RVR6 F37: 15/80, 376 gold)", () => {
  it("offers 'discard Ashwater to buy Block Potion' above the card removal (logged: removal 30 vs Blood Vial 13.9; the Block Potion was never offered)", () => {
    const options = optionsOf(planShop(loggedEnv(logged("rvr6-shop-f37"), { combatPlanner: "card" })));
    expect(options["swap_potion"]!["buy"]).toMatch(/格挡药水 \(after discarding 灰水\)/);
    const decision = planShop(loggedEnv(logged("rvr6-shop-f37"), { combatPlanner: "card" })) as AskDecision;
    const resolved = decision.resolve({ pick: { type: "choice", choice: "swap_potion", confidence: 0.5, probabilities: {}, raw: {} } } as never);
    expect(resolved.intent).toEqual({ action: "discard_potion", option_index: 0 });
  });
});

describe("a later kill is priced with the sleepers' hits once they wake (NJSZ F25 T2: Slumbering Beetle + two bowlbugs)", () => {
  const board = () => {
    const fx = logged("njsz-f25-t2");
    return foesOf(((fx.state["combat"] as Raw)["enemies"] as Raw[]).filter((enemy) => enemy["is_alive"] !== false));
  };

  it("the beetle sleeps as SNORE and rolls out at ~18.6 a turn once awake", () => {
    const beetle = awakeDamagePerTurn("SLUMBERING_BEETLE")!;
    expect(beetle.perTurn).toBeCloseTo(18.6, 1);
    expect(beetle.sleepTurns).toBeGreaterThan(1);
  });

  it("next turn it is still asleep (Slumber 2); from T4 its hits count in the average until the kill", () => {
    const foes = board();
    const beetle = foes.find((foe) => foe.sleepLeft === 2)!;
    expect(beetle.hit).toBeCloseTo(18.6, 1);
    const bugs = foes.filter((foe) => foe !== beetle).reduce((sum, foe) => sum + foe.hit, 0);
    expect(incomingUntil(foes, 1)).toBeCloseTo(bugs);
    expect(incomingUntil(foes, 4)).toBeCloseTo(bugs + (3 / 4) * beetle.hit);
  });

  it("a bowlbug left alive longer costs its hits and the beetle's, turn by turn until the kill", () => {
    const foes = board();
    const [rock, silk, beetle] = [0, 1, 2].map((index) => foes.find((foe) => foe.index === index)!);
    // Rock at 11 vs 21 after this turn (the logged rank 1 vs the guard's pick), 20 damage a turn.
    const sooner = lossUntilKill(foes, [{ index: 0, hp: 11 }, { index: 1, hp: 26 }, { index: 2, hp: 89 }], 20, 0, 0);
    const later = lossUntilKill(foes, [{ index: 0, hp: 21 }, { index: 1, hp: 26 }, { index: 2, hp: 89 }], 20, 0, 0);
    expect(later).toBeGreaterThan(sooner);
    expect(later - sooner).toBeGreaterThanOrEqual(Math.min(rock!.hit, silk!.hit));
    expect(beetle!.sleepLeft).toBe(2);
  });
});

describe("fight-plan input: enemy powers carry the game's text (HCBJ F14: SUCK_POWER went as an id, 'effect is unknown')", () => {
  it("the Fossil Stalker's Suck reads +Strength per unblocked hit", () => {
    const state = parseGameState(logged("hcbj-f14-t1").state);
    const enemies = fightPlanInput(state, loggedKnowledge, "monster", moveModel())["enemies"] as Raw[];
    const powers = (enemies.find((enemy) => enemy["enemy_id"] === "FOSSIL_STALKER")!["powers"] as string[]).join(" ");
    expect(powers).toMatch(/^SUCK_POWER 3: 这个生物每次造成未被格挡的伤害时，都会获得1点力量/);
    expect(powers).not.toMatch(/\[gold\]|\[blue\]/);
  });
});

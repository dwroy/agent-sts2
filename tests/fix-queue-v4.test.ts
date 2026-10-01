/**
 * The V4.1 A8 window's code bugs (notes/fix-queue-v4.md). One describe per fix; the boards are synthetic or the logged
 * numbers of the question written into the test, never the refreshing knowledge files; no LLM, nothing written to logs/.
 */

import { afterEach, describe, expect, it } from "vitest";

import { hpGuardNote, hpGuardReplacement, hpGuardSlack } from "../src/screens/combat-plan.js";
import { createScreenMemory } from "../src/project/types.js";
import { ask, board, decide, env as oneshotEnv, optionsOf, setupOneshotTests, type Raw } from "./oneshot-support.js";
import { potionEffect, potionShell, type CardModel } from "../src/strategy/card-model.js";
import { beatsDryLine, MC_BUDGET_MS, MC_SAMPLES, potionMcCriteria, potionMcOptions, runPotionMc, type PotionMcSource } from "../src/strategy/potion-mc.js";
import type { LineEstimate } from "../src/strategy/rollout.js";
import { pickRolloutBest, rolloutTies } from "../src/strategy/rollout-live.js";
import { distinctPlans, dominates, solveTurn, type EnemySim, type Plan, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";

const player = (over: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0, ...over });
const enemy = (over: Partial<EnemySim> = {}): EnemySim => ({ index: 0, name: "Dummy", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...over });

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index,
    key: `c${index}`,
    cardId,
    name: cardId,
    type: "Attack",
    upgraded: false,
    cost: 1,
    xCost: false,
    playable: true,
    target: "single",
    validTargets: [0],
    damage: null,
    hits: 1,
    block: 0,
    vulnerable: 0,
    weak: 0,
    strength: 0,
    tempStrength: 0,
    enemyStrength: 0,
    enemyTempStrengthLoss: 0,
    hpLoss: 0,
    energyGain: 0,
    draw: 0,
    exhausts: false,
    special: null,
    known: true,
    flatValue: 0,
    heldPenalty: 0,
    text: "",
    ...overrides,
  };
}

/** A rollout line as the saturated ranking reads it: this turn's exact loss, deaths, enemy HP left, turns alive. */
function rolled(name: string, turnLoss: number, over: Partial<LineEstimate> & { hpLoss: number }): LineEstimate {
  return {
    plan: { steps: [], name, outcome: { hpLoss: turnLoss } } as unknown as Plan,
    value: -over.hpLoss - 40,
    wins: 0,
    deaths: 8,
    samples: 8,
    enemyHpLeft: 100,
    turnsSurvived: 3,
    leaderHpLeft: null,
    ...over,
  } as LineEstimate;
}

describe("1. A saturated board ranks by the fight's progress, not this turn's HP loss (fix-queue-v4 rollout-live:488-494)", () => {
  it("CDR0Q6929CKR F33 T5 (the Insatiable, 40 HP, every line dead 8/8): -16 leaving ~66 over the turtle -9 leaving ~116", () => {
    // The logged question's numbers (decisions.jsonl): this turn's loss, enemy HP left, turns alive; further loss 40 = our HP.
    const logged: [string, number, number, number][] = [
      ["plan1", 17, 89, 2.6],
      ["plan2", 16, 66, 3],
      ["plan3", 16, 102, 2.6],
      ["plan4", 10, 90, 3],
      ["plan5", 15, 123, 2.6],
      ["plan6", 9, 116, 3],
      ["plan7", 16, 120, 3],
      ["p1", 17, 70, 2.6],
    ];
    const lines = logged.map(([name, loss, left, alive]) => rolled(name, loss, { hpLoss: 40, enemyHpLeft: left, turnsSurvived: alive }));
    const picked = pickRolloutBest(lines, 40);
    expect(picked.saturated).toBe(true);
    // Was plan6 ("防御, 坚毅": 0 damage, the least HP lost this turn).
    expect((picked.best!.plan as unknown as { name: string }).name).toBe("plan2");
    expect(rolloutTies(picked, lines, lines.map((line) => line.plan)).best).toBe(picked.best);
  });

  it("HME0FA7VA0J6 F33 T3 (Kaiser Crab, 4 samples, every line dead 4/4): the turtle line leaving 198 is not the best", () => {
    const logged: [string, number, number, number][] = [
      ["plan1 Whirlwind+", 18, 165, 4],
      ["plan2 Inferno+, Whirlwind+", 19, 146, 4],
      ["plan3", 12, 192, 4],
      ["plan5 Demon Form+", 18, 175, 4],
      ["plan6 Defend, Strike, Whirlwind+", 7, 198, 4.3],
      ["plan7", 8, 150, 4.3],
    ];
    const lines = logged.map(([name, loss, left, alive]) => rolled(name, loss, { hpLoss: 80, samples: 4, deaths: 4, enemyHpLeft: left, turnsSurvived: alive }));
    const picked = pickRolloutBest(lines, 80);
    expect(picked.saturated).toBe(true);
    expect((picked.best!.plan as unknown as { name: string }).name).toBe("plan2 Inferno+, Whirlwind+");
  });

  it("deaths still come first; the same progress and turns alive: this turn's loss; equal on every key: tied", () => {
    const lives = rolled("lives once", 12, { hpLoss: 40, deaths: 7, enemyHpLeft: 150 });
    const races = rolled("races", 20, { hpLoss: 40, deaths: 8, enemyHpLeft: 60 });
    expect(pickRolloutBest([races, lives], 40).best).toBe(lives);
    const a = rolled("a", 14, { hpLoss: 40, enemyHpLeft: 80, turnsSurvived: 3 });
    const b = rolled("b", 9, { hpLoss: 40, enemyHpLeft: 80.5, turnsSurvived: 3.05 });
    expect(pickRolloutBest([a, b], 40).best).toBe(b);
    const longer = rolled("longer", 20, { hpLoss: 40, enemyHpLeft: 80.5, turnsSurvived: 3.5 });
    expect(pickRolloutBest([a, b, longer], 40).best).toBe(longer);
    const c = rolled("c", 9, { hpLoss: 40, enemyHpLeft: 80, turnsSurvived: 3 });
    expect(pickRolloutBest([b, c], 40)).toEqual({ best: null, saturated: true, tied: [b, c] });
  });
});

describe("2. One sample never saturates; a healing drink is not taken off this turn's loss (fix-queue-v4 rollout-live:479/458/493)", () => {
  it("F4K88F267RCX F48 T1 (\"3-turn rollout (1 sample)\", every line capped at our 63 HP): not saturated", () => {
    const one = (name: string, loss: number, left: number) => rolled(name, loss, { hpLoss: 63, samples: 1, deaths: 0, enemyHpLeft: left, turnsSurvived: 3 });
    const lines = [one("plan1", 17, 497), one("plan3", 6, 487), one("plan4", 7, 531)];
    const picked = pickRolloutBest(lines, 63);
    expect(picked.saturated).toBe(false);
    // Two samples or more, the same numbers: saturated as before.
    expect(pickRolloutBest(lines.map((line) => ({ ...line, samples: 2 })), 63).saturated).toBe(true);
  });

  it("W80JV2YVC8UZ F48 T1: Blood Potion at 84/88 heals 4; the line counts what the turn takes, not net of the heal", () => {
    const blood = { ...potionShell("BLOOD_POTION", "Blood Potion", 0, []), ...potionEffect("BLOOD_POTION")! };
    const solved = solveTurn({ hand: [blood], player: player({ hp: 84, maxHp: 88, energy: 0 }), enemies: [enemy({ attacks: [{ damage: 10, hits: 1 }] })], fightKind: "boss", turn: 1 });
    const drink = solved.plans.find((plan) => plan.steps.length === 1)!;
    expect(drink.outcome.hpLoss).toBe(6);
    expect(drink.outcome.potionHeal).toBe(4);
    expect(solved.plans.find((plan) => plan.steps.length === 0)!.outcome.potionHeal).toBeUndefined();
    // Saturated, the same progress and turns alive: the drink line nets 2 (6 taken, 4 healed), the dry one loses 5.
    const drinks = rolled("drinks", 2, { hpLoss: 84, enemyHpLeft: 300 });
    (drinks.plan.outcome as { potionHeal?: number }).potionHeal = 4;
    const dry = rolled("dry", 5, { hpLoss: 84, enemyHpLeft: 300 });
    expect(pickRolloutBest([drinks, dry], 84)).toMatchObject({ best: dry, saturated: true });
  });
});

describe("3. The elite/boss HP guard compares HP lost, not the potions' held value (fix-queue-v4 combat-plan:478-480)", () => {
  const line = (name: string, hpLoss: number, potionCost = 0): Plan =>
    ({
      steps: potionCost > 0 ? [{ cardId: "POTION:FYSH_OIL:0", name: "potion Fysh Oil", cardIndex: 100, target: null, upgraded: false, targetName: null }] : [{ cardId: "STRIKE_IRONCLAD", name, cardIndex: 0, target: 0, upgraded: false, targetName: "Eel" }],
      score: 0,
      outcome: { hpLoss, winsFight: false, dies: false, damageDealt: 12, ...(potionCost > 0 ? { potionCost } : {}) },
    }) as unknown as Plan;

  it("G3MU2NADPEDU F9 (Terror Eel, 50 HP): Fysh Oil (held value 9.1) at the same HP loss as the dry line is not vetoed", () => {
    const slack = hpGuardSlack(50, "elite");
    expect(slack).toBe(8);
    const oil = line("oil", 6, 9.1);
    const dry = line("dry", 6);
    expect(hpGuardReplacement(oil, [dry, oil], 50, slack)).toBeNull();
    // More HP lost than the slack allows still trips it, whatever the cost.
    const dearOil = line("oil, no block", 16, 9.1);
    expect(hpGuardReplacement(dearOil, [dry, dearOil], 50, slack)).toBe(dry);
    expect(hpGuardNote(2, dearOil, slack, 1, dry)).not.toMatch(/potions/);
  });

  it("a boss fight: potions cost 0 there, the guard reads the same either way", () => {
    const drink = line("drink", 10, 0);
    const dry = line("dry", 4);
    expect(hpGuardReplacement(drink, [dry, drink], 80, hpGuardSlack(80, "boss"))).toBeNull();
  });
});

describe("4. A random potion's Power counts past this turn (fix-queue-v4 potion-mc:49-57 beatsDryLine)", () => {
  // 9FVEQKJ0Y1YQ F33 (the Insatiable): the Power Potion bought for the boss read "beats 0/12", never drunk.
  const strike = card(0, "STRIKE_IRONCLAD", { name: "Strike", damage: 6 });
  const inflame = card(0, "INFLAME", { name: "Inflame", type: "Power", cost: 0, target: "self", validTargets: [], strength: 2 });
  const input = (fightKind: SolverInput["fightKind"]): SolverInput => ({
    hand: [strike],
    player: player({ hp: 60, maxHp: 80, energy: 1 }),
    enemies: [enemy({ hp: 341, maxHp: 341, attacks: [{ damage: 10, hits: 1 }] })],
    fightKind,
    turn: 1,
  });
  const source: PotionMcSource = { potionId: "POWER_POTION", name: "Power Potion", slot: 0, text: "", kind: "choice", pools: { Power: [inflame] }, poolName: "ironclad" };

  it("boss T1: Inflame's 2 Strength for the fight beats the dry Strike, though this turn gains only 2 damage", () => {
    const dry = solveTurn(input("boss")).plans[0]!;
    expect(dry.outcome.damageDealt).toBe(6);
    const mc = runPotionMc(input("boss"), source, dry, 7, 1e9, 4);
    expect(mc.samples).toBe(4);
    // This turn alone: 2 more damage (0.8 HP's worth), under the 2-HP margin.
    expect(mc.vsDry!.damageGained).toBe(2);
    expect(mc.beats).toBe(4);
    // Strength 2 at the solver's 5 a point, x 1.8 (a boss fight, T1), over HP weight 1.0: 18 HP.
    expect(mc.vsDry!.lastingGained).toBeCloseTo(18, 5);
    expect(String(potionMcCriteria(mc, dry, () => "", false)["vs_best_potion_free_line"])).toMatch(/mean lasting value \+18 HP/);
  });

  it("a line that wins the fight now sets nothing up for later; a hallway fight weighs it less", () => {
    const dry = solveTurn(input("monster")).plans[0]!;
    const mc = runPotionMc(input("monster"), source, dry, 7, 1e9, 4);
    expect(mc.vsDry!.lastingGained).toBeCloseTo(8, 5);
    const won = { ...mc.median!, outcome: { ...mc.median!.outcome, winsFight: true } } as Plan;
    expect(beatsDryLine(won, dry, 1)).toBe(true);
  });
});

describe("5. The random potions' Monte Carlo keeps its budget before the minimum samples too (fix-queue-v4 potion-mc:219)", () => {
  afterEach(() => {
    potionMcOptions.now = null;
  });
  const strike = card(0, "STRIKE_IRONCLAD", { name: "Strike", damage: 6 });
  const input: SolverInput = { hand: [strike], player: player({ energy: 1 }), enemies: [enemy({ attacks: [{ damage: 10, hits: 1 }] })], fightKind: "elite", turn: 1 };
  const source: PotionMcSource = { potionId: "ATTACK_POTION", name: "Attack Potion", slot: 0, text: "", kind: "choice", pools: { Attack: [card(0, "CLEAVE", { name: "Cleave", cost: 0, damage: 8 })] }, poolName: "ironclad" };

  it("DT1H1URTUAD8 F42 T1: samples slower than the whole budget stop after the first, not after four", () => {
    let t = 0;
    potionMcOptions.now = () => (t += 250);
    const mc = runPotionMc(input, source, null, 3, MC_BUDGET_MS);
    expect(mc.samples).toBe(1);
    expect(mc.degraded).toBe(true);
    expect(mc.median).not.toBeNull();
  });

  it("fast samples: all of them, within the budget", () => {
    let t = 0;
    potionMcOptions.now = () => (t += 5);
    const mc = runPotionMc(input, source, null, 3, MC_BUDGET_MS);
    expect(mc.samples).toBe(MC_SAMPLES);
    expect(mc.ms).toBeLessThanOrEqual(MC_BUDGET_MS);
  });
});

describe("6. A line that gives the enemy Strength never dominates one that does not (fix-queue-v4 turn-solver:2748 vector)", () => {
  it("9FVEQKJ0Y1YQ F33 T6 (the Insatiable, bite 28 + Strength): Fight Me! does not make \"Blood Wall, Defend\" disappear", () => {
    // The logged hand: Blood Wall at 0 this fight, Blood Wall, Fight Me!, Defend; 3 energy, 28 HP, the enemy at 20 incoming.
    const hand = [
      card(0, "BLOOD_WALL", { name: "Blood Wall", type: "Skill", cost: 0, target: "self", validTargets: [], block: 16, hpLoss: 2 }),
      card(1, "BLOOD_WALL", { name: "Blood Wall", type: "Skill", cost: 2, target: "self", validTargets: [], block: 16, hpLoss: 2 }),
      card(2, "FIGHT_ME", { name: "Fight Me!", cost: 2, damage: 5, hits: 2, strength: 2, enemyStrength: 1 }),
      card(3, "DEFEND_IRONCLAD", { name: "Defend", type: "Skill", target: "self", validTargets: [], block: 5 }),
    ];
    const solved = solveTurn({ hand, player: player({ hp: 28, maxHp: 92, energy: 3 }), enemies: [enemy({ name: "Insatiable", hp: 160, maxHp: 341, attacks: [{ damage: 20, hits: 1 }] })], fightKind: "boss", turn: 6 });
    const ids = (plan: Plan) => plan.steps.map((step) => step.cardId).sort().join(",");
    const fightMe = solved.plans.find((plan) => ids(plan) === "BLOOD_WALL,DEFEND_IRONCLAD,FIGHT_ME")!;
    const quiet = solved.plans.find((plan) => ids(plan) === "BLOOD_WALL,DEFEND_IRONCLAD")!;
    expect(fightMe.outcome.hpLoss).toBe(quiet.outcome.hpLoss);
    expect(fightMe.outcome.damageDealt).toBeGreaterThan(quiet.outcome.damageDealt);
    expect(fightMe.outcome.enemyHpAfter[0]!.strengthGained).toBe(1);
    expect(dominates(fightMe, quiet)).toBe(false);
    // Code's options keep a line that leaves the enemy as it was.
    const shown = distinctPlans(solved.plans, 10);
    expect(shown.some((plan) => (plan.outcome.enemyHpAfter[0]!.strengthGained ?? 0) === 0)).toBe(true);
    expect(shown.length).toBeGreaterThanOrEqual(2);
  });
});

describe("7. Smith and removal name only the cards the selection screen lists, the first 25 (fix-queue-v4 oneshot:328, selection:351)", () => {
  setupOneshotTests();
  const REST = "7b0d-f8-rest";
  const EXTRA = ["TWIN_STRIKE", "INFLAME", "CLOTHESLINE", "HEADBUTT", "IRON_WAVE", "CLEAVE", "THUNDERCLAP", "BODY_SLAM", "HAVOC", "WARCRY", "SWORD_BOOMERANG", "WILD_STRIKE"];
  /** The logged rest site's deck (16 upgradable copies) and 12 more upgradable cards: 28, as 0U96U4D9Z3PP F47's 33. */
  const bigDeck = (raw: Raw): Raw => {
    const run = raw["run"] as Raw;
    const deck = run["deck"] as Raw[];
    const model = deck.find((card) => card["card_id"] === "POMMEL_STRIKE")!;
    run["deck"] = [...deck, ...EXTRA.map((id, i) => ({ ...model, index: deck.length + i, card_id: id, name: id, rules_text: id, resolved_rules_text: id }))];
    return raw;
  };

  it("0U96U4D9Z3PP F47: no smith option for a card past the 25th upgradable copy; the question says which and why", () => {
    const options = optionsOf(decide(oneshotEnv(bigDeck(board(REST, "rest")))));
    const smithCards = Object.values(options).map((option) => option["card"]).filter((name): name is string => typeof name === "string");
    expect(smithCards).toContain("HAVOC");
    for (const late of ["WARCRY", "SWORD_BOOMERANG", "WILD_STRIKE"]) expect(smithCards).not.toContain(late);
    const notes = Object.values(options).map((option) => option["not_on_selection_screen"]).filter((note) => note !== undefined);
    expect(notes).toHaveLength(1);
    expect(String(notes[0])).toMatch(/first 25 eligible cards in deck order; these cannot be picked there: WARCRY, SWORD_BOOMERANG, WILD_STRIKE$/);
  });

  it("a named card the screen does not list: the question asked instead names it and says why (not a silent drop)", () => {
    const memory = createScreenMemory("CARD_SELECTION");
    memory.pendingPick = { ref: "7B0D6XKP0BAZ:F8:rest#1", runId: "7B0D6XKP0BAZ", floor: 8, source: "rest", task: "upgrade", cards: [{ card_id: "INFERNO", upgraded: false, text: "", cost: 1 } as never], names: ["Inferno"], step: 2 };
    const decision = decide(oneshotEnv(board(REST, "upgrade_select"), memory));
    expect(decision.kind).toBe("ask");
    expect(memory.pendingPick).toBeUndefined();
    const situation = ask(decision).state["situation"] as Record<string, unknown>;
    expect(String(situation["named_card_not_offered"])).toMatch(/^Inferno, named for this upgrade with the choice before, is not on this screen/);
  });
});

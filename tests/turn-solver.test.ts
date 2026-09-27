import { describe, expect, it } from "vitest";

import { modelHandCard, modelPotion, type CardModel } from "../src/strategy/card-model.js";
import { testKnowledge } from "./scenarios.js";
import {
  backAttack,
  BOMB_SURE,
  CRAB_RAGE_STRENGTH,
  distinctPlans,
  DRAW_VALUE,
  drawFirst,
  drawScoreAt,
  exhaustPick,
  ENRAGE_FUTURE_HITS,
  ERUPTION_RACE_DAMAGE,
  NEXT_PHASE_HP,
  pileValue,
  QUIET_SELF_DAMAGE_WEIGHT,
  solveTurn,
  weightsFor,
  WOUND_COST,
  type EnemySim,
  type PlayerSim,
} from "../src/strategy/turn-solver.js";
import { hardRuleLines } from "../src/screens/combat-plan.js";

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

const strike = (index: number): CardModel => card(index, "STRIKE_IRONCLAD", { damage: 6 });
const defend = (index: number): CardModel => card(index, "DEFEND_IRONCLAD", { type: "Skill", target: "self", validTargets: [], block: 5 });
const inflame = (index: number): CardModel =>
  card(index, "INFLAME", { type: "Power", target: "self", validTargets: [], strength: 2, flatValue: 4 });

function enemy(overrides: Partial<EnemySim> = {}): EnemySim {
  return { index: 0, name: "Byrdonis", hp: 10, maxHp: 91, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...overrides };
}

function player(overrides: Partial<PlayerSim> = {}): PlayerSim {
  return { hp: 10, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, ...overrides };
}

describe("solveTurn", () => {
  it("finds the two-card lethal the single-card lookahead missed (floor 7, live run)", () => {
    const result = solveTurn({
      hand: [inflame(0), defend(1), defend(2), strike(3), strike(4)],
      player: player(),
      enemies: [enemy({ vulnerable: 2, attacks: [{ damage: 24, hits: 1 }] })],
      fightKind: "elite",
    });
    const best = result.plans[0]!;
    expect(best.outcome.winsFight).toBe(true);
    expect(best.outcome.dies).toBe(false);
  });

  it("blocks when it cannot kill and the hit is big", () => {
    const result = solveTurn({
      hand: [strike(0), strike(1), defend(2), defend(3), defend(4)],
      player: player({ hp: 20 }),
      enemies: [enemy({ hp: 60, attacks: [{ damage: 18, hits: 1 }] })],
      fightKind: "monster",
    });
    const best = result.plans[0]!;
    expect(best.outcome.dies).toBe(false);
    expect(best.outcome.blockGained).toBeGreaterThanOrEqual(15);
  });

  it("plays Bash before Strikes so the Strikes are Vulnerable", () => {
    const bash = card(0, "BASH", { cost: 2, damage: 8, vulnerable: 2 });
    const result = solveTurn({
      hand: [bash, strike(1)],
      player: player({ hp: 80 }),
      enemies: [enemy({ hp: 40, attacks: [] })],
      fightKind: "monster",
    });
    const best = result.plans[0]!;
    expect(best.steps.map((step) => step.cardId)).toEqual(["BASH", "STRIKE_IRONCLAD"]);
    expect(best.outcome.damageDealt).toBe(8 + 9);
  });

  it("plays Strength before attacks", () => {
    const result = solveTurn({
      hand: [strike(0), inflame(1), strike(2)],
      player: player({ hp: 80 }),
      enemies: [enemy({ hp: 50, attacks: [] })],
      fightKind: "monster",
    });
    const best = result.plans[0]!;
    expect(best.steps[0]!.cardId).toBe("INFLAME");
    expect(best.outcome.damageDealt).toBe(16);
  });

  it("kills the attacker that matters when two enemies are up", () => {
    const result = solveTurn({
      hand: [strike(0, ), strike(1)].map((entry) => ({ ...entry, validTargets: [0, 1] })),
      player: player({ hp: 30 }),
      enemies: [
        enemy({ index: 0, name: "Big", hp: 50, attacks: [{ damage: 5, hits: 1 }] }),
        enemy({ index: 1, name: "Small", hp: 12, attacks: [{ damage: 12, hits: 1 }] }),
      ],
      fightKind: "monster",
    });
    const best = result.plans[0]!;
    expect(best.outcome.kills).toEqual(["Small"]);
  });

  it("returns distinct strategies for the model to choose between", () => {
    const result = solveTurn({
      hand: [strike(0), strike(1), defend(2), defend(3), inflame(4)],
      player: player({ hp: 50 }),
      enemies: [enemy({ hp: 45, attacks: [{ damage: 11, hits: 1 }] })],
      fightKind: "monster",
    });
    const picks = distinctPlans(result.plans, 4);
    expect(picks.length).toBeGreaterThanOrEqual(2);
    expect(result.truncated).toBe(false);
  });
});

describe("enemy powers", () => {
  it("Slippery turns each HP loss into 1, so cheap hits strip it first", () => {
    const result = solveTurn({
      hand: [strike(0), strike(1)],
      player: player({ hp: 80 }),
      enemies: [enemy({ hp: 170, slippery: 1, attacks: [] })],
      fightKind: "boss",
    });
    expect(result.plans[0]!.outcome.damageDealt).toBe(1 + 6);
  });

  it("Hardened Shell caps the HP lost in a turn", () => {
    const result = solveTurn({
      hand: [strike(0), strike(1), strike(2)],
      player: player({ hp: 80 }),
      enemies: [enemy({ hp: 100, hpLossCap: 10, attacks: [] })],
      fightKind: "elite",
    });
    expect(result.plans[0]!.outcome.damageDealt).toBe(10);
  });
});

describe("potions", () => {
  it("uses a damage potion when it completes a lethal, and not otherwise in a hallway fight", async () => {
    const { modelPotion } = await import("../src/strategy/card-model.js");
    const rock = modelPotion("POTION_SHAPED_ROCK", "rock", 1, [0], 15)!;
    const lethal = solveTurn({
      hand: [strike(0), rock],
      player: player({ hp: 10, energy: 1 }),
      enemies: [enemy({ hp: 16, attacks: [{ damage: 30, hits: 1 }] })],
      fightKind: "monster",
    });
    expect(lethal.plans[0]!.outcome.winsFight).toBe(true);
    expect(lethal.plans[0]!.steps.some((step) => step.cardId.startsWith("POTION:"))).toBe(true);

    const idle = solveTurn({
      hand: [strike(0), rock],
      player: player({ hp: 80, energy: 1 }),
      enemies: [enemy({ hp: 60, attacks: [{ damage: 5, hits: 1 }] })],
      fightKind: "monster",
    });
    expect(idle.plans[0]!.steps.some((step) => step.cardId.startsWith("POTION:"))).toBe(false);
  });

  it("Dexterity Potion is worth the block cards in hand, nothing without one (KFP1 F17 T3: drunk with only Attacks)", () => {
    const dex = modelPotion("DEXTERITY_POTION", "Dexterity Potion", 0, [], 4)!;
    const boss = enemy({ name: "Lagavulin Matriarch", hp: 200, maxHp: 222, attacks: [{ damage: 20, hits: 1 }] });
    const drinks = (hand: CardModel[]) => solveTurn({ hand: [...hand, dex], player: player({ hp: 60, energy: 2 }), enemies: [boss], fightKind: "boss", turn: 3 }).plans[0]!.steps.some((step) => step.cardId.startsWith("POTION:"));
    expect(drinks([strike(0), strike(1)])).toBe(false);
    expect(drinks([defend(0), defend(1)])).toBe(true);
    // Drunk first, both Defends get +2.
    const best = solveTurn({ hand: [defend(0), defend(1), dex], player: player({ hp: 60, energy: 2 }), enemies: [boss], fightKind: "boss", turn: 3 }).plans[0]!;
    expect(best.outcome.blockGained).toBe(14);
  });
});

describe("buff potions in a hallway fight (5FMU F15 T1: all four options drank the Strength Potion)", () => {
  const hand = (): CardModel[] => [
    card(0, "IRON_WAVE", { damage: 5, block: 5 }),
    card(1, "SHRUG_IT_OFF", { type: "Skill", target: "self", validTargets: [], block: 8, draw: 1 }),
    card(2, "SWORD_BOOMERANG", { target: "random", validTargets: [], damage: 3, hits: 3 }),
    card(3, "UPPERCUT", { cost: 2, damage: 13, weak: 1, vulnerable: 1, validTargets: [0, 1] }),
    defend(4),
    card(5, "WHIRLWIND", { cost: 0, xCost: true, target: "all", validTargets: [], damage: 5, hits: 0, special: "whirlwind" }),
    card(6, "BREAKTHROUGH", { target: "all", validTargets: [], damage: 9, hpLoss: 1 }),
    modelPotion("STRENGTH_POTION", "Strength Potion", 1, [], 15)!,
  ];
  const enemies = (): EnemySim[] => [
    enemy({ index: 0, name: "Calcified Cultist", hp: 39, maxHp: 39 }),
    enemy({ index: 1, name: "Seapunk", hp: 46, maxHp: 46, attacks: [{ damage: 11, hits: 1 }] }),
  ];
  const drinks = (plan: { steps: { cardId: string }[] }) => plan.steps.some((step) => step.cardId.startsWith("POTION:"));
  const solve = (fightKind: "monster" | "boss") =>
    solveTurn({ hand: hand(), player: player({ hp: 61, maxHp: 83, energy: 4 }), enemies: enemies(), fightKind, turn: 1 });

  it("a potion's lasting value is small in a hallway fight, full in a boss fight", () => {
    const hallway = solve("monster").plans.find(drinks)!;
    const boss = solve("boss").plans.find(drinks)!;
    expect(boss.outcome.lasting).toBeCloseTo(10);
    expect(hallway.outcome.lasting).toBeLessThan(5);
  });

  it("the hallway's best line keeps the potion, and the options always include a line without it", () => {
    const result = solve("monster");
    const surviving = result.plans.filter((plan) => !plan.outcome.dies);
    expect(drinks(surviving[0]!)).toBe(false);
    expect(distinctPlans(surviving, 4).some((plan) => !drinks(plan))).toBe(true);
    // Even when every higher-scored pick drinks (a boss fight), a potion-free line is offered.
    const boss = solve("boss").plans.filter((plan) => !plan.outcome.dies);
    const picks = distinctPlans(boss, 4);
    expect(picks.some((plan) => !drinks(plan))).toBe(true);
    const onlyDrinking = distinctPlans(boss.filter(drinks).concat(boss.filter((plan) => !drinks(plan)).slice(-1)), 4);
    expect(onlyDrinking.some((plan) => !drinks(plan))).toBe(true);
  });
});

describe("more enemy powers", () => {
  it("Flutter halves attack damage, so a big hit is not a lethal", () => {
    const bludgeon = card(0, "BLUDGEON", { cost: 3, damage: 32 });
    const result = solveTurn({
      hand: [bludgeon],
      player: player({ hp: 80 }),
      enemies: [enemy({ hp: 51, vulnerable: 1, flutter: 5, attacks: [{ damage: 21, hits: 1 }] })],
      fightKind: "monster",
    });
    expect(result.plans.some((plan) => plan.outcome.winsFight)).toBe(false);
  });

  it("minions leave when the leader dies", () => {
    const result = solveTurn({
      hand: [strike(0)].map((entry) => ({ ...entry, validTargets: [0, 1] })),
      player: player({ hp: 80 }),
      enemies: [
        enemy({ index: 0, name: "Leader", hp: 6, attacks: [{ damage: 10, hits: 1 }] }),
        enemy({ index: 1, name: "Minion", hp: 30, minion: true, attacks: [{ damage: 5, hits: 1 }] }),
      ],
      fightKind: "monster",
    });
    expect(result.plans[0]!.outcome.winsFight).toBe(true);
  });

  it("chips the summoner, not a minion it cannot kill (QE4K F21 T6: 34 damage into Larvae, Ovicopter left at 36)", () => {
    const result = solveTurn({
      hand: [strike(0), strike(1)].map((entry) => ({ ...entry, validTargets: [0, 1] })),
      player: player({ hp: 40 }),
      enemies: [
        enemy({ index: 0, name: "Larva", hp: 22, minion: true, attacks: [{ damage: 5, hits: 1 }] }),
        enemy({ index: 1, name: "Ovicopter", hp: 36, attacks: [] }),
      ],
      fightKind: "monster",
    });
    expect(result.plans[0]!.steps.map((step) => step.target)).toEqual([1, 1]);
  });

  it("Unmovable doubles only the first Block card of the turn (92MW F33 T2)", () => {
    // Shown values are doubled (Defend 5 -> 10) until the first Block card is played.
    const input = {
      hand: [{ ...defend(0), block: 10 }, { ...defend(1), block: 10 }],
      player: player({ hp: 40, energy: 2, unmovableArmed: true }),
      enemies: [enemy({ index: 0, hp: 50, attacks: [{ damage: 30, hits: 1 }] })],
      fightKind: "monster" as const,
    };
    const both = solveTurn(input).plans.find((plan) => plan.steps.length === 2)!;
    expect(both.outcome.blockGained).toBe(15);
  });

  it("Second Wind exhausts every non-Attack in hand for its Block each (LQLZ F21 T4)", () => {
    const secondWind = card(0, "SECOND_WIND", { type: "Skill", target: "self", validTargets: [], block: 5, special: "second_wind" });
    const result = solveTurn({
      hand: [secondWind, defend(1), defend(2), strike(3)],
      player: player({ hp: 40, energy: 1 }),
      enemies: [enemy({ index: 0, hp: 50, attacks: [{ damage: 20, hits: 1 }] })],
      fightKind: "monster",
    });
    const wind = result.plans.find((plan) => plan.steps.length === 1 && plan.steps[0]!.cardId === "SECOND_WIND")!;
    expect(wind.outcome.blockGained).toBe(10);
    expect(wind.outcome.hpLoss).toBe(10);
  });

  it("concentrates damage on one of several enemies when the total is the same (GMT2 F39 T1)", () => {
    const result = solveTurn({
      hand: [strike(0), strike(1)].map((entry) => ({ ...entry, validTargets: [0, 1] })),
      player: player({ hp: 60 }),
      enemies: [
        enemy({ index: 0, name: "Cubex", hp: 40, attacks: [] }),
        enemy({ index: 1, name: "Cubex", hp: 40, attacks: [] }),
      ],
      fightKind: "monster",
    });
    const targets = result.plans[0]!.steps.map((step) => step.target);
    expect(new Set(targets).size).toBe(1);
  });

  it("Stomp costs 1 less per Attack played before it this turn (8XQM F48 T8)", () => {
    const stomp = card(0, "STOMP", { cost: 3, damage: 12, target: "all", validTargets: [], special: "stomp" });
    const result = solveTurn({
      hand: [stomp, strike(1), strike(2)],
      player: player({ hp: 40, energy: 3 }),
      enemies: [enemy({ index: 0, name: "Aeonglass", hp: 29, attacks: [{ damage: 30, hits: 1 }] })],
      fightKind: "boss",
    });
    // Strike, Strike, then Stomp at cost 1: all three fit in 3 energy.
    const all = result.plans.find((plan) => plan.steps.length === 3);
    expect(all).toBeDefined();
    expect(all!.steps.at(-1)!.cardId).toBe("STOMP");
  });

  it("Ashwater exhausts Howl, which hits every enemy at the end of the turn (H14T F39 T4)", async () => {
    const { modelPotion } = await import("../src/strategy/card-model.js");
    const ashwater = modelPotion("ASHWATER", "Ashwater", 0, [], 0)!;
    const howl = card(3, "HOWL_FROM_BEYOND", { cost: 3, damage: 30, target: "all", validTargets: [] });
    const result = solveTurn({
      hand: [howl, ashwater, { ...strike(1), validTargets: [0, 1] }, { ...strike(2), validTargets: [0, 1] }],
      player: player({ hp: 2, energy: 3 }),
      enemies: [
        enemy({ index: 0, name: "Punch Construct", hp: 35, attacks: [{ damage: 20, hits: 1 }] }),
        enemy({ index: 1, name: "Cubex", hp: 35, attacks: [{ damage: 12, hits: 1 }] }),
      ],
      fightKind: "monster",
    });
    expect(result.plans[0]!.outcome.winsFight).toBe(true);
    expect(result.plans[0]!.steps[0]!.cardId).toContain("ASHWATER");
    // With nothing to exhaust, Ashwater is not a line.
    const empty = solveTurn({ hand: [strike(0), ashwater], player: player({ hp: 40 }), enemies: [enemy({ index: 0, hp: 50, attacks: [] })], fightKind: "monster" });
    expect(empty.plans.some((plan) => plan.steps.some((step) => step.cardId.includes("ASHWATER")))).toBe(false);
  });

  it("an exhaust takes Howl from Beyond first: it plays itself once from the exhaust pile and is not lost (SVN2 F17, N1V2 F48)", async () => {
    const { exhaustPick } = await import("../src/strategy/turn-solver.js");
    const howl = card(3, "HOWL_FROM_BEYOND", { cost: 3, damage: 18, target: "all", validTargets: [] });
    const wound = card(4, "WOUND", { type: "Status", playable: false, heldPenalty: 0, validTargets: [] });
    expect(exhaustPick([strike(1), defend(2), howl, wound])?.cardId).toBe("HOWL_FROM_BEYOND");
  });

  it("rounds Weak damage once: 9 x 0.75 x 1.5 = 10, not floor(6.75) x 1.5 = 9 (P4ZD F37 T2/T9)", () => {
    const pommel = card(0, "POMMEL_STRIKE", { damage: 6, damageBase: 9 });
    const input = {
      hand: [pommel],
      player: player({ hp: 40, weak: true }),
      enemies: [enemy({ index: 0, name: "Axebot", hp: 50, vulnerable: 2, attacks: [] })],
      fightKind: "monster" as const,
    };
    const hit = solveTurn(input).plans.find((plan) => plan.steps.length === 1)!;
    expect(hit.outcome.damageDealt).toBe(10);
    // Without a base that reproduces the shown number, the shown number is used as before.
    const odd = solveTurn({ ...input, hand: [card(0, "POMMEL_STRIKE", { damage: 6, damageBase: 12 })] }).plans.find((plan) => plan.steps.length === 1)!;
    expect(odd.outcome.damageDealt).toBe(9);
  });

  it("Fiend Fire hits once per card it exhausts, and Feel No Pain blocks per exhausted card (QBRN F48 T7)", () => {
    const fiendFire = card(0, "FIEND_FIRE", { cost: 2, damage: 7, special: "fiend_fire", exhausts: true, validTargets: [0] });
    const wither = card(4, "WITHER", { type: "Status", playable: false, heldPenalty: 9, validTargets: [] });
    const result = solveTurn({
      hand: [fiendFire, strike(1), defend(2), strike(3), wither],
      player: player({ hp: 52, energy: 2, feelNoPain: 3 }),
      enemies: [enemy({ index: 0, name: "Aeonglass", hp: 400, attacks: [{ damage: 29, hits: 1 }] })],
      fightKind: "boss",
    });
    const fire = result.plans.find((plan) => plan.steps.length === 1 && plan.steps[0]!.cardId === "FIEND_FIRE");
    expect(fire).toBeDefined();
    // 4 cards burned (Strike, Defend, Strike, Wither): 28 damage; 4 + Fiend Fire itself = 15 block.
    expect(fire!.outcome.damageDealt).toBe(28);
    expect(fire!.outcome.blockGained).toBe(15);
    expect(fire!.outcome.hpLoss).toBe(14);
  });

  it("Dominate gains Strength per Vulnerable on the target, its own included (VQSA F33 T3)", () => {
    const dominate = card(0, "DOMINATE", { type: "Skill", vulnerable: 1, special: "dominate", strengthPerVulnerable: 1 });
    const result = solveTurn({
      hand: [dominate, strike(1)],
      player: player({ hp: 60, energy: 2 }),
      enemies: [enemy({ index: 0, name: "Knowledge Demon", hp: 300, vulnerable: 2, attacks: [] })],
      fightKind: "boss",
    });
    const both = result.plans.find((plan) => plan.steps.map((step) => step.cardId).join(",") === "DOMINATE,STRIKE_IRONCLAD");
    expect(both).toBeDefined();
    expect(both!.outcome.strengthGained).toBe(3);
    // Strike 6 + 3 Strength, x1.5 Vulnerable.
    expect(both!.outcome.damageDealt).toBe(13);
  });

  it("caps a turn's HP loss with Beating Remnant, so damage lines are not scored as deaths (CCPR F48 T7)", () => {
    const input = {
      hand: [strike(0), strike(1), defend(2)],
      player: player({ hp: 25 }),
      enemies: [enemy({ index: 0, name: "Test Subject", hp: 60, attacks: [{ damage: 10, hits: 6 }] })],
      fightKind: "boss" as const,
    };
    expect(solveTurn(input).plans.every((plan) => plan.outcome.dies)).toBe(true);
    const capped = solveTurn({ ...input, player: player({ hp: 25, hpLossCap: 20 }) });
    expect(capped.plans[0]!.outcome.dies).toBe(false);
    expect(capped.plans[0]!.outcome.hpLoss).toBe(20);
    expect(capped.plans[0]!.steps.map((step) => step.cardId)).toEqual(["STRIKE_IRONCLAD", "STRIKE_IRONCLAD"]);
  });

  it("puts damage into the fight plan's kill-first enemy even when it is a minion (CAYK F48 T1-T3)", () => {
    const input = {
      hand: [strike(0), strike(1)].map((entry) => ({ ...entry, validTargets: [0, 1] })),
      player: player({ hp: 60 }),
      enemies: [
        enemy({ index: 0, name: "Torch Head Amalgam", hp: 199, minion: true, attacks: [{ damage: 12, hits: 1 }] }),
        enemy({ index: 1, name: "Queen", hp: 400, attacks: [] }),
      ],
      fightKind: "boss" as const,
    };
    expect(solveTurn(input).plans[0]!.steps.map((step) => step.target)).toEqual([1, 1]);
    expect(solveTurn({ ...input, focusIndex: 0 }).plans[0]!.steps.map((step) => step.target)).toEqual([0, 0]);
  });

  it("still kills a minion for the attack it prevents", () => {
    const result = solveTurn({
      hand: [strike(0)].map((entry) => ({ ...entry, validTargets: [0, 1] })),
      player: player({ hp: 40 }),
      enemies: [
        enemy({ index: 0, name: "Larva", hp: 5, minion: true, attacks: [{ damage: 6, hits: 1 }] }),
        enemy({ index: 1, name: "Ovicopter", hp: 36, attacks: [] }),
      ],
      fightKind: "monster",
    });
    expect(result.plans[0]!.steps.map((step) => step.target)).toEqual([0]);
  });
});

describe("Fortifier", () => {
  it("plays Defend before tripling the block (boss floor 17, live run)", async () => {
    const { modelPotion } = await import("../src/strategy/card-model.js");
    const fortifier = modelPotion("FORTIFIER", "fortifier", 0, [], 0)!;
    const result = solveTurn({
      hand: [defend(0), fortifier],
      player: player({ hp: 19, energy: 1 }),
      enemies: [enemy({ hp: 62, attacks: [{ damage: 12, hits: 1 }] })],
      fightKind: "boss",
    });
    const best = result.plans[0]!;
    expect(best.steps.map((step) => step.cardId.split(":")[0])).toEqual(["DEFEND_IRONCLAD", "POTION"]);
    expect(best.outcome.hpLoss).toBe(0);
  });
});

describe("status cards in hand", () => {
  it("plays Toxic to exhaust it instead of eating 5 damage each (floor 22, live run)", () => {
    const toxic = (index: number): CardModel => card(index, "TOXIC", { type: "Status", target: "none", validTargets: [], heldPenalty: 5, exhausts: true });
    const result = solveTurn({
      hand: [toxic(0), toxic(1)],
      player: player({ hp: 33, energy: 3 }),
      enemies: [enemy({ hp: 45, attacks: [{ damage: 15, hits: 1 }] })],
      fightKind: "monster",
    });
    const best = result.plans[0]!;
    expect(best.steps.length).toBe(2);
    expect(best.outcome.hpLoss).toBe(15);
  });

  it("plays Beckon rather than blocking its HP loss (BG4W F17 T6: died at 8 HP holding two)", () => {
    const beckon = (index: number): CardModel =>
      card(index, "BECKON", { type: "Status", target: "none", validTargets: [], cost: 1, heldPenalty: 6, heldHpLoss: 6 });
    const result = solveTurn({
      hand: [beckon(0), beckon(1), defend(2), defend(3)],
      player: player({ hp: 8, energy: 2 }),
      enemies: [enemy({ hp: 60, attacks: [] })],
      fightKind: "boss",
    });
    const best = result.plans[0]!;
    expect(best.steps.map((step) => step.cardId)).toEqual(["BECKON", "BECKON"]);
    expect(best.outcome.hpLoss).toBe(0);
  });
});

describe("Duplication potion", () => {
  it("plays the next card twice (floor 12 elite, live run)", async () => {
    const { modelPotion } = await import("../src/strategy/card-model.js");
    const dup = modelPotion("DUPLICATOR", "dup", 2, [], 5)!;
    const setup = card(0, "SETUP_STRIKE", { damage: 7, tempStrength: 3 });
    const result = solveTurn({
      hand: [dup, setup, strike(1), card(2, "TWIN_STRIKE", { damage: 5, hits: 2 })],
      player: player({ hp: 67, maxHp: 92, energy: 3 }),
      enemies: [enemy({ hp: 42, attacks: [{ damage: 4, hits: 4 }] })],
      fightKind: "elite",
    });
    const best = result.plans[0]!;
    expect(best.outcome.winsFight).toBe(true);
    expect(best.steps[0]!.cardId.startsWith("POTION:DUPLICATOR")).toBe(true);
  });
});

describe("mechanics from the 4-run review", () => {
  it("Disintegration hits block first (DG1 T5: block 8 -> 2, HP unchanged)", () => {
    const result = solveTurn({
      hand: [defend(0)],
      player: player({ hp: 30, block: 3, endTurnHpLoss: 6 }),
      enemies: [enemy({ hp: 60, attacks: [{ damage: 5, hits: 1 }] })],
      fightKind: "boss",
    });
    const blocked = result.plans.find((plan) => plan.steps.length === 1)!;
    // 8 block: 6 to Disintegration, 2 left against the 5 hit.
    expect(blocked.outcome.hpLoss).toBe(3);
    const nothing = result.plans.find((plan) => plan.steps.length === 0)!;
    // 3 block: all to Disintegration (3 through), then the full 5.
    expect(nothing.outcome.hpLoss).toBe(8);
  });

  it("a Decimillipede segment kill is not a kill while another segment lives (0NG F29)", () => {
    const segment = (index: number, hp: number): EnemySim =>
      enemy({ index, name: `seg${index}`, hp, maxHp: 25, reattach: true, attacks: [{ damage: 8, hits: 1 }] });
    const hand = [card(0, "STRIKE_IRONCLAD", { damage: 6, validTargets: [0, 1] })];
    const result = solveTurn({ hand, player: player({ hp: 60 }), enemies: [segment(0, 5), segment(1, 25)], fightKind: "elite" });
    const kill = result.plans.find((plan) => plan.steps[0]?.target === 0)!;
    expect(kill.outcome.kills).toEqual([]);
    const allDead = solveTurn({ hand, player: player({ hp: 60 }), enemies: [segment(0, 5)], fightKind: "elite" });
    expect(allDead.plans[0]!.outcome.winsFight).toBe(true);
  });

  it("damage into a segment that dies alone and reattaches is worth nothing (0NG F29)", () => {
    const segment = (index: number, hp: number): EnemySim =>
      enemy({ index, name: `seg${index}`, hp, maxHp: 46, reattach: true, reattachHp: 25, attacks: [{ damage: 8, hits: 1 }] });
    const hand = [card(0, "HEAVY", { damage: 18, validTargets: [0, 1] })];
    const result = solveTurn({ hand, player: player({ hp: 60 }), enemies: [segment(0, 18), segment(1, 40)], fightKind: "elite" });
    const killAlone = result.plans.find((plan) => plan.steps[0]?.target === 0)!;
    const chip = result.plans.find((plan) => plan.steps[0]?.target === 1)!;
    // The lone kill only saves seg0's 8 this turn; the chip keeps all 18 damage (elite weight 0.7).
    expect(chip.score - killAlone.score).toBeCloseTo(0.7 * 18 - 8, 5);
    expect(result.plans[0]!.steps[0]?.target).toBe(1);
  });

  it("damage into an illusion that survives the turn is worth nothing (VKPX F22)", () => {
    const hand = [strike(0)];
    hand[0]!.validTargets = [0, 1];
    const result = solveTurn({
      hand,
      player: player({ hp: 60 }),
      enemies: [
        enemy({ index: 0, name: "Obscura", hp: 68, maxHp: 90 }),
        enemy({ index: 1, name: "Parafright", hp: 21, maxHp: 21, illusion: true, minion: true }),
      ],
      fightKind: "monster",
    });
    expect(result.plans[0]!.steps[0]?.target).toBe(0);
    const intoIllusion = result.plans.find((plan) => plan.steps[0]?.target === 1)!;
    expect(result.plans[0]!.score - intoIllusion.score).toBeCloseTo(0.45 * 6, 5);
  });

  it("plan steps carry the upgrade level", () => {
    const result = solveTurn({
      hand: [defend(0), card(1, "DEFEND_IRONCLAD", { type: "Skill", target: "self", validTargets: [], block: 8, upgraded: true })],
      player: player({ hp: 30, energy: 1 }),
      enemies: [enemy({ hp: 60, attacks: [{ damage: 20, hits: 1 }] })],
      fightKind: "monster",
    });
    expect(result.plans[0]!.steps).toMatchObject([{ cardId: "DEFEND_IRONCLAD", upgraded: true }]);
  });

  it("Waterfall Giant: blocks instead of racing when HP would fall under the explosion (WQTRX T5)", () => {
    const hand = [strike(0), strike(1), defend(2), defend(3)];
    const giant = (eruption: number): EnemySim =>
      enemy({ name: "Waterfall Giant", hp: 150, maxHp: 240, vulnerable: 2, eruption, attacks: [{ damage: 20, hits: 1 }] });
    const pick = (eruption: number) =>
      solveTurn({ hand, player: player({ hp: 40, maxHp: 80, energy: 2 }), enemies: [giant(eruption)], fightKind: "boss" }).plans[0]!;
    // No eruption to fear: two Vulnerable Strikes (18 damage) over 10 block.
    expect(pick(0).outcome.damageDealt).toBe(18);
    // 36 stacks: 40 - 20 = 20 HP left is under the ~27 the explosion needs, so HP counts double.
    expect(pick(36).outcome.blockGained).toBe(10);
  });

  it("Waterfall Giant too slow to kill (1ZQJ): raceEruption weighs damage up and drops the HP doubling", () => {
    const hand = [strike(0), strike(1), defend(2), defend(3)];
    const giant = enemy({ name: "Waterfall Giant", hp: 150, maxHp: 240, vulnerable: 2, eruption: 36, attacks: [{ damage: 20, hits: 1 }] });
    const input = { hand, player: player({ hp: 40, maxHp: 80, energy: 2 }), enemies: [giant], fightKind: "boss" as const };
    expect(solveTurn(input).plans[0]!.outcome.blockGained).toBe(10);
    expect(solveTurn({ ...input, raceEruption: true }).plans[0]!.outcome.damageDealt).toBe(18);
    expect(weightsFor({ ...input, raceEruption: true }).damage).toBeCloseTo(weightsFor(input).damage * ERUPTION_RACE_DAMAGE);
  });
});

describe("The Insatiable's Sandpit", () => {
  const escape = (index: number): CardModel =>
    card(index, "FRANTIC_ESCAPE", { type: "Skill", target: "self", validTargets: [], special: "frantic_escape" });
  const sandworm = (overrides: Partial<EnemySim> = {}): EnemySim =>
    enemy({ name: "The Insatiable", hp: 186, maxHp: 321, sandpit: 1, attacks: [{ damage: 10, hits: 2 }], ...overrides });

  it("plays Frantic Escape when the Sandpit would reach 0 (TTVY T6: eaten at 33 HP with 20 block)", () => {
    const shrug = card(0, "SHRUG_IT_OFF", { type: "Skill", target: "self", validTargets: [], block: 8, draw: 1 });
    const defendPlus = card(1, "DEFEND_IRONCLAD", { type: "Skill", target: "self", validTargets: [], block: 8, upgraded: true });
    const thrash = card(3, "THRASH", { upgraded: true, damage: 6, hits: 2 });
    const result = solveTurn({
      hand: [shrug, defendPlus, strike(2), thrash, escape(4)],
      player: player({ hp: 33, block: 4 }),
      enemies: [sandworm()],
      fightKind: "boss",
      turn: 6,
    });
    const best = result.plans[0]!;
    expect(best.outcome.dies).toBe(false);
    expect(best.steps.map((step) => step.cardId)).toContain("FRANTIC_ESCAPE");
    expect(best.outcome.sandpitAfter).toBe(1);
    // Every line without the Escape is a death, even at full block.
    for (const plan of result.plans) {
      if (!plan.steps.some((step) => step.cardId === "FRANTIC_ESCAPE")) expect(plan.outcome.dies).toBe(true);
    }
  });

  it("plays a 1-cost Escape at Sandpit 3 over a lasting power of the same energy (Y08T F33 T3: Pyre won)", () => {
    const power = card(0, "INFLAME", { type: "Power", target: "self", validTargets: [], strength: 1 });
    const result = solveTurn({
      hand: [power, escape(1)],
      player: player({ hp: 60, energy: 1 }),
      enemies: [sandworm({ hp: 280, sandpit: 3, attacks: [{ damage: 8, hits: 1 }] })],
      fightKind: "boss",
      turn: 3,
    });
    expect(result.plans[0]!.steps.map((step) => step.cardId)).toEqual(["FRANTIC_ESCAPE"]);
  });

  it("hard rule: Sandpit-1 lines are not offered while a line keeps it at 2 (THMG F33 T5)", () => {
    // T5: Sandpit 1, 3 energy, three Frantic Escapes; Jev took "Escape, Strike, Shrug" (Sandpit 1).
    const shrug = card(3, "SHRUG_IT_OFF", { type: "Skill", target: "self", validTargets: [], block: 8 });
    const worm = sandworm({ attacks: [{ damage: 14, hits: 1 }] });
    const result = solveTurn({ hand: [escape(0), escape(1), escape(2), shrug, strike(4)], player: player({ hp: 40 }), enemies: [worm], fightKind: "boss", turn: 5 });
    const surviving = result.plans.filter((plan) => !plan.outcome.dies);
    expect(surviving.some((plan) => plan.outcome.sandpitAfter === 1)).toBe(true);
    const kept = hardRuleLines(surviving, [worm]);
    expect(kept.length).toBeGreaterThan(0);
    for (const plan of kept) expect(plan.outcome.sandpitAfter).toBeGreaterThanOrEqual(2);
    for (const plan of distinctPlans(kept, 4)) expect(plan.outcome.sandpitAfter).toBeGreaterThanOrEqual(2);
  });

  it("hard rule: Sandpit-1 lines stay when no line reaches 2", () => {
    const worm = sandworm({ attacks: [{ damage: 10, hits: 1 }] });
    const result = solveTurn({ hand: [escape(0), defend(1), strike(2)], player: player({ hp: 40 }), enemies: [worm], fightKind: "boss", turn: 6 });
    const surviving = result.plans.filter((plan) => !plan.outcome.dies);
    expect(surviving.length).toBeGreaterThan(0);
    expect(hardRuleLines(surviving, [worm])).toEqual(surviving);
  });

  it("an exhaust pick never takes Frantic Escape while the Sandpit is up (THMG F33 T4)", () => {
    const status = card(0, "FRANTIC_ESCAPE", { type: "Status", target: "self", validTargets: [], special: "frantic_escape" });
    expect(exhaustPick([status, strike(1), defend(2)])).toBe(status);
    expect(exhaustPick([status, strike(1), defend(2)], true)!.cardId).toBe("DEFEND_IRONCLAD");
    // Forced when it is the only card left.
    expect(exhaustPick([status], true)).toBe(status);
    const pact = card(3, "BURNING_PACT", { type: "Skill", target: "self", validTargets: [] });
    const result = solveTurn({ hand: [pact, status, strike(1), defend(2)], player: player({ hp: 50 }), enemies: [sandworm({ sandpit: 3 })], fightKind: "boss", turn: 4 });
    for (const plan of result.plans) {
      if (plan.steps[0]?.cardId === "BURNING_PACT") expect(plan.steps.slice(1).some((step) => step.cardId === "DEFEND_IRONCLAD")).toBe(false);
    }
  });

  it("prefers keeping the count at 2 over a Strike when the HP cost is the same", () => {
    const result = solveTurn({
      hand: [defend(0), defend(1), strike(2), escape(3)],
      player: player({ hp: 50 }),
      enemies: [sandworm({ sandpit: 2, attacks: [{ damage: 10, hits: 1 }] })],
      fightKind: "boss",
    });
    const best = result.plans[0]!;
    expect(best.steps.map((step) => step.cardId).sort()).toEqual(["DEFEND_IRONCLAD", "DEFEND_IRONCLAD", "FRANTIC_ESCAPE"]);
    expect(best.outcome.sandpitAfter).toBe(2);
  });

  it("ignores the countdown on the turn the boss dies", () => {
    const result = solveTurn({
      hand: [strike(0), escape(1)],
      player: player({ hp: 50, energy: 1 }),
      enemies: [sandworm({ hp: 5 })],
      fightKind: "boss",
    });
    expect(result.plans[0]!.outcome.winsFight).toBe(true);
    expect(result.plans[0]!.outcome.dies).toBe(false);
  });
});

describe("Kaiser Crab's Crab Rage", () => {
  const crusher = (overrides: Partial<EnemySim> = {}): EnemySim =>
    enemy({ index: 0, name: "Crusher", hp: 58, maxHp: 209, crabRage: true, attacks: [{ damage: 15, hits: 1 }], ...overrides });
  const rocket = (overrides: Partial<EnemySim> = {}): EnemySim =>
    enemy({ index: 1, name: "Rocket", hp: 14, maxHp: 199, crabRage: true, attacks: [{ damage: 16, hits: 1 }], ...overrides });

  it("a Whirlwind that kills Rocket first is no lethal: Crusher's 99 Block eats the rest (7Q5G F33)", () => {
    const whirlwind = card(0, "WHIRLWIND", { cost: 0, xCost: true, target: "all", validTargets: [], damage: 20, special: "whirlwind" });
    const result = solveTurn({ hand: [whirlwind], player: player({ hp: 80 }), enemies: [crusher(), rocket()], fightKind: "boss" });
    const swing = result.plans.find((plan) => plan.steps.length === 1)!;
    expect(swing.outcome.winsFight).toBe(false);
    expect(swing.outcome.kills).toEqual([]);
    // Hit 1 takes Crusher to 38 and kills Rocket; hits 2 and 3 land on 99 Block.
    expect(swing.outcome.enemyHpAfter.find((entry) => entry.name === "Crusher")!.hp).toBe(38);
    // The enraged Crusher hits for 15 + 6.
    expect(swing.outcome.hpLoss).toBe(21);
  });

  it("killing one part alone is no kill bonus and scores below hitting the other", () => {
    const blow = card(0, "STRIKE", { damage: 14, validTargets: [0, 1] });
    const result = solveTurn({ hand: [blow], player: player({ hp: 80 }), enemies: [crusher(), rocket()], fightKind: "boss" });
    const killRocket = result.plans.find((plan) => plan.steps[0]?.target === 1)!;
    const hitCrusher = result.plans.find((plan) => plan.steps[0]?.target === 0)!;
    expect(killRocket.outcome.kills).toEqual([]);
    expect(hitCrusher.score).toBeGreaterThan(killRocket.score);
  });

  it("killing both in the same turn wins the fight", () => {
    const blow = card(0, "STRIKE", { cost: 0, damage: 14, validTargets: [0, 1] });
    const result = solveTurn({ hand: [blow, { ...blow, index: 1, key: "c1" }], player: player({ hp: 80 }), enemies: [crusher({ hp: 10 }), rocket()], fightKind: "boss" });
    // Crusher first: Rocket then has 99 Block. Rocket first: Crusher then has 99 Block. Neither wins.
    expect(result.plans.some((plan) => plan.outcome.winsFight)).toBe(false);
    const aoe = card(0, "CLEAVE", { target: "all", validTargets: [], damage: 14 });
    const both = solveTurn({ hand: [aoe], player: player({ hp: 80 }), enemies: [crusher({ hp: 10 }), rocket()], fightKind: "boss" });
    expect(both.plans[0]!.outcome.winsFight).toBe(true);
  });
});

describe("Crimson Mantle's start-of-turn HP cost", () => {
  const mantle = (index: number): CardModel =>
    card(index, "CRIMSON_MANTLE", { type: "Power", target: "self", validTargets: [], flatValue: 16, special: "crimson_mantle" });

  it("playing it into 1 HP is death next turn (YP9 T3/T5)", () => {
    const result = solveTurn({ hand: [mantle(0), defend(1)], player: player({ hp: 12, energy: 1 }), enemies: [enemy({ hp: 100, attacks: [{ damage: 11, hits: 1 }] })], fightKind: "boss" });
    const mantlePlan = result.plans.find((plan) => plan.steps.some((step) => step.cardId === "CRIMSON_MANTLE"))!;
    // 1 HP after the hit, and the Mantle takes it at the start of the next turn.
    expect(mantlePlan.outcome.hpLoss).toBe(12);
    expect(mantlePlan.outcome.hpAfter).toBe(0);
    expect(mantlePlan.outcome.dies).toBe(true);
    expect(result.plans[0]!.steps[0]!.cardId).toBe("DEFEND_IRONCLAD");
  });

  it("a Mantle already in play kills at 1 HP after the turn", () => {
    const result = solveTurn({ hand: [strike(0)], player: player({ hp: 7, startTurnHpLoss: 1 }), enemies: [enemy({ hp: 100, attacks: [{ damage: 6, hits: 1 }] })], fightKind: "boss" });
    expect(result.plans.every((plan) => plan.outcome.dies)).toBe(true);
  });

  it("a Mantle already in play counts in the turn's HP loss", () => {
    const result = solveTurn({ hand: [defend(0)], player: player({ hp: 40, startTurnHpLoss: 2 }), enemies: [enemy({ hp: 100, attacks: [{ damage: 8, hits: 1 }] })], fightKind: "boss" });
    const blocked = result.plans.find((plan) => plan.steps.length === 1)!;
    expect(blocked.outcome.hpLoss).toBe(3 + 2);
    expect(blocked.outcome.hpAfter).toBe(35);
  });

  it("at low HP a Mantle loses to Defend even when it survives", () => {
    const result = solveTurn({ hand: [mantle(0), defend(1)], player: player({ hp: 20, energy: 1 }), enemies: [enemy({ hp: 100, attacks: [{ damage: 10, hits: 1 }] })], fightKind: "boss" });
    expect(result.plans[0]!.steps.map((step) => step.cardId)).toEqual(["DEFEND_IRONCLAD"]);
  });
});

describe("boss potion cap (1R3C F17 T1: three potions on a 7-damage turn)", () => {
  it("drinks at most one potion a turn unless it wins the fight or the turn ends below 30% HP", async () => {
    const { modelPotion } = await import("../src/strategy/card-model.js");
    const potions = () => [
      modelPotion("BLOCK_POTION", "block", 0, [], 4)!,
      modelPotion("STRENGTH_POTION", "strength", 1, [], 4)!,
      modelPotion("WEAK_POTION", "weak", 2, [0], 4)!,
    ];
    const potionSteps = (steps: { cardId: string }[]) => steps.filter((step) => step.cardId.startsWith("POTION:")).length;
    const input = {
      hand: [strike(0), defend(1), inflame(2), ...potions()],
      player: player({ hp: 59, maxHp: 68 }),
      enemies: [enemy({ hp: 173, maxHp: 173, attacks: [{ damage: 7, hits: 1 }] })],
      fightKind: "boss" as const,
      turn: 1,
    };
    const capped = solveTurn({ ...input, potionLimit: 1 });
    expect(capped.plans.every((plan) => potionSteps(plan.steps) <= 1)).toBe(true);
    expect(solveTurn({ ...input, potionLimit: 0 }).plans.every((plan) => potionSteps(plan.steps) === 0)).toBe(true);
    // Uncapped (the old free boss potions) the solver happily stacks them.
    const free = solveTurn({ ...input, hand: [strike(0), defend(1), inflame(2), ...potions().map((p) => ({ ...p, flatValue: 0 }))] });
    expect(potionSteps(free.plans[0]!.steps)).toBeGreaterThan(1);
    // Low HP: the cap does not apply to a turn that ends below 30% max HP.
    const low = solveTurn({ ...input, player: player({ hp: 20, maxHp: 68 }), enemies: [enemy({ hp: 173, maxHp: 173, attacks: [{ damage: 30, hits: 1 }] })], potionLimit: 0 });
    expect(low.plans.some((plan) => potionSteps(plan.steps) > 0)).toBe(true);
  });
});

describe("sleeping enemies (Z2H3 F17 T1: Bash broke the Matriarch's Plating and woke it)", () => {
  const bash = (index: number): CardModel => card(index, "BASH", { cost: 2, damage: 8, vulnerable: 2 });
  const matriarch = (overrides: Partial<EnemySim> = {}): EnemySim =>
    enemy({ name: "Lagavulin Matriarch", hp: 222, maxHp: 222, block: 12, asleep: 3, attacks: [], ...overrides });

  it("does not chip an Asleep enemy's HP: set up or hit only its block", () => {
    const hand = [strike(0), strike(1), strike(2), inflame(3)];
    const result = solveTurn({ hand, player: player({ hp: 70 }), enemies: [matriarch()], fightKind: "boss", turn: 1 });
    const best = result.plans[0]!;
    expect(best.outcome.enemyHpAfter[0]!.hp).toBe(222);
    expect(best.steps.map((step) => step.cardId)).toContain("INFLAME");
    // The same board without the sleep: the solver does chip it.
    const awake = solveTurn({ hand, player: player({ hp: 70 }), enemies: [matriarch({ asleep: 0 })], fightKind: "boss", turn: 1 });
    expect(awake.plans[0]!.outcome.enemyHpAfter[0]!.hp).toBeLessThan(222);
  });

  it("wakes it anyway for a big hit (>= 25% of its HP)", () => {
    const result = solveTurn({ hand: [bash(0), strike(1), strike(2)], player: player({ hp: 70, energy: 4 }), enemies: [matriarch({ hp: 40, block: 0 })], fightKind: "boss", turn: 1 });
    expect(result.plans[0]!.outcome.enemyHpAfter[0]!.hp).toBeLessThanOrEqual(30);
  });

  it("hard rule: lines that wake it are not offered while a line leaves it asleep (PYTG F17 T2)", () => {
    const sleeper = matriarch();
    const result = solveTurn({ hand: [bash(0), strike(1), strike(2), defend(3)], player: player({ hp: 70, energy: 3 }), enemies: [sleeper], fightKind: "boss", turn: 2 });
    const surviving = result.plans.filter((plan) => !plan.outcome.dies);
    expect(surviving.some((plan) => plan.outcome.sleepCost > 0)).toBe(true);
    const kept = hardRuleLines(surviving, [sleeper]);
    expect(kept.length).toBeGreaterThan(0);
    for (const plan of kept) expect(plan.outcome.sleepCost).toBe(0);
    // Slumber is only a score penalty, not a filter (RC9A F27 T1: every AoE line was removed); an awake
    // enemy is left alone.
    expect(hardRuleLines(surviving, [{ ...sleeper, asleep: 0, slumber: 2 }])).toEqual(surviving);
    expect(hardRuleLines(surviving, [{ ...sleeper, asleep: 0 }])).toEqual(surviving);
  });

  it("its last sleep turn (Asleep 1) costs nothing to wake: attack with the full 3 energy (5FMU F17 T3)", () => {
    // 5FMU F17: Asleep 3/2/1 on T1–T3, first attack (19) on T4. Woken on T3 it is stunned on T3's
    // enemy turn and attacks on T4 all the same, so no free turn is lost.
    const breakthrough = (index: number): CardModel => card(index, "BREAKTHROUGH", { target: "all", validTargets: [], damage: 9, hpLoss: 1 });
    const armaments = (index: number): CardModel => card(index, "ARMAMENTS", { type: "Skill", target: "self", validTargets: [], block: 5 });
    const sleeper = matriarch({ asleep: 1, block: 11, vulnerable: 1 });
    const hand = [strike(0), breakthrough(1), defend(2), armaments(3), breakthrough(4)];
    const result = solveTurn({ hand, player: player({ hp: 86, maxHp: 86, energy: 3 }), enemies: [sleeper], fightKind: "boss", turn: 3 });
    const surviving = result.plans.filter((plan) => !plan.outcome.dies);
    for (const plan of surviving) expect(plan.outcome.sleepCost).toBe(0);
    const kept = hardRuleLines(surviving, [sleeper]);
    expect(kept).toEqual(surviving);
    const best = kept[0]!;
    expect(best.outcome.enemyHpAfter[0]!.hp).toBeLessThan(222);
    expect(best.steps.filter((step) => step.cardId === "BREAKTHROUGH" || step.cardId === "STRIKE_IRONCLAD")).toHaveLength(3);
    // Asleep 2 still costs a free turn.
    const earlier = solveTurn({ hand, player: player({ hp: 86, maxHp: 86, energy: 3 }), enemies: [{ ...sleeper, asleep: 2 }], fightKind: "boss", turn: 2 });
    expect(earlier.plans.some((plan) => plan.outcome.sleepCost > 0)).toBe(true);
  });

  it("an awake (attacking) enemy is hit as usual", () => {
    const result = solveTurn({ hand: [bash(0), strike(1), strike(2), inflame(3)], player: player({ hp: 70 }), enemies: [matriarch({ asleep: 0, block: 0, attacks: [{ damage: 5, hits: 1 }] })], fightKind: "boss", turn: 1 });
    expect(result.plans[0]!.outcome.enemyHpAfter[0]!.hp).toBeLessThan(222);
  });
});

describe("Colossus (2WUM T7: halved twice, ended the turn at 10 HP with 3 Defends and 1 energy)", () => {
  const colossus = (index: number): CardModel =>
    card(index, "COLOSSUS", { type: "Skill", target: "self", validTargets: [], block: 4, special: "colossus" });
  const clawing = (overrides: Partial<EnemySim> = {}): EnemySim =>
    enemy({ name: "Test Subject", hp: 34, maxHp: 200, vulnerable: 2, attacks: [{ damage: 5, hits: 7 }], ...overrides });

  it("an intent shown with Colossus up is already halved: not halved again", () => {
    const result = solveTurn({
      hand: [defend(0), defend(1), defend(2)],
      player: player({ hp: 10, maxHp: 80, block: 19, energy: 1, colossus: true }),
      enemies: [clawing()],
      fightKind: "boss",
    });
    const endNow = result.plans.find((plan) => plan.steps.length === 0)!;
    expect(endNow.outcome.incomingAfterBlock).toBe(35 - 19);
    expect(endNow.outcome.dies).toBe(true);
    // Every line dies, but the one that keeps the most HP plays the Defend.
    const leastLoss = result.plans.reduce((a, b) => (b.outcome.hpAfter > a.outcome.hpAfter ? b : a));
    expect(leastLoss.steps.map((step) => step.cardId)).toEqual(["DEFEND_IRONCLAD"]);
  });

  it("Colossus played this turn halves a Vulnerable attacker's intent", () => {
    const result = solveTurn({ hand: [colossus(0)], player: player({ hp: 50, energy: 1 }), enemies: [clawing({ attacks: [{ damage: 10, hits: 7 }] })], fightKind: "boss" });
    const played = result.plans.find((plan) => plan.steps.length === 1)!;
    expect(played.outcome.incomingAfterBlock).toBe(35 - 4);
  });

  it("Colossus already up: an enemy made Vulnerable this turn is halved (its intent was not)", () => {
    const bash = card(0, "BASH", { cost: 2, damage: 8, vulnerable: 2 });
    const result = solveTurn({
      hand: [bash],
      player: player({ hp: 50, energy: 2, colossus: true }),
      enemies: [clawing({ hp: 100, vulnerable: 0, attacks: [{ damage: 10, hits: 2 }] })],
      fightKind: "boss",
    });
    const played = result.plans.find((plan) => plan.steps.length === 1)!;
    expect(played.outcome.incomingAfterBlock).toBe(10);
    expect(result.plans.find((plan) => plan.steps.length === 0)!.outcome.incomingAfterBlock).toBe(20);
  });
});

describe("retaliation stops a multi-hit attacker it kills (2WUM T8: 10x8 into a 29 HP boss, Flame Barrier 6)", () => {
  const flameBarrier = (index: number): CardModel =>
    card(index, "FLAME_BARRIER", { type: "Skill", target: "self", validTargets: [], cost: 2, block: 16, retaliate: 6 });

  it("Flame Barrier already up: the boss dies on the 5th hit, 50 lands on 30 block", () => {
    const result = solveTurn({
      hand: [],
      player: player({ hp: 30, block: 30, energy: 0, retaliate: 6 }),
      enemies: [enemy({ name: "Test Subject", hp: 29, maxHp: 200, attacks: [{ damage: 10, hits: 8 }] })],
      fightKind: "boss",
    });
    const endNow = result.plans[0]!;
    expect(endNow.outcome.hpLoss).toBe(20);
    expect(endNow.outcome.dies).toBe(false);
  });

  it("Flame Barrier played this turn is counted the same way", () => {
    const result = solveTurn({
      hand: [flameBarrier(0)],
      player: player({ hp: 30, block: 14, energy: 2 }),
      enemies: [enemy({ name: "Test Subject", hp: 29, maxHp: 200, attacks: [{ damage: 10, hits: 8 }] })],
      fightKind: "boss",
    });
    const best = result.plans[0]!;
    expect(best.steps.map((step) => step.cardId)).toEqual(["FLAME_BARRIER"]);
    expect(best.outcome.hpLoss).toBe(50 - 30);
    // Without the cut-off all 8 hits would land: 80 - 30 = 50, dead.
    expect(best.outcome.dies).toBe(false);
  });

  it("no retaliation: every hit lands", () => {
    const result = solveTurn({ hand: [], player: player({ hp: 100, block: 30, energy: 0 }), enemies: [enemy({ hp: 29, attacks: [{ damage: 10, hits: 8 }] })], fightKind: "boss" });
    expect(result.plans[0]!.outcome.hpLoss).toBe(50);
  });
});

describe("a free draw goes first (2WUM F48 T6: Twin Strike, then Battle Trance drew three cards with no energy left)", () => {
  const trance = (index: number): CardModel => card(index, "BATTLE_TRANCE", { type: "Skill", target: "self", validTargets: [], cost: 0, draw: 3 });
  const twin = (index: number): CardModel => card(index, "TWIN_STRIKE", { damage: 5, hits: 2 });
  const boss = enemy({ name: "Test Subject", hp: 150, maxHp: 200, attacks: [{ damage: 10, hits: 3 }] });

  it("Battle Trance is played before the attack when the plan comes out the same", () => {
    const best = solveTurn({ hand: [twin(0), trance(1)], player: player({ hp: 42, energy: 1 }), enemies: [boss], fightKind: "boss" }).plans[0]!;
    expect(best.steps.map((step) => step.cardId)).toEqual(["BATTLE_TRANCE", "TWIN_STRIKE"]);
  });

  it("not ahead of another draw (Battle Trance stops later draws), nor when the order changes the outcome (Slow)", () => {
    const pommel = card(0, "POMMEL_STRIKE", { damage: 9, draw: 1 });
    const input = { hand: [pommel, trance(1)], player: player({ hp: 42, energy: 1 }), enemies: [boss], fightKind: "boss" as const };
    const both = solveTurn(input).plans.find((plan) => plan.steps.length === 2)!;
    const pommelFirst = { ...both, steps: [both.steps.find((step) => step.cardId === "POMMEL_STRIKE")!, both.steps.find((step) => step.cardId === "BATTLE_TRANCE")!] };
    expect(drawFirst(pommelFirst, input)).toBe(pommelFirst);
    // Under Slow the Trance before the attack is +10% on it (11 x 2, not 10 x 2): a different plan.
    const bigTwin = card(0, "TWIN_STRIKE", { damage: 10, hits: 2 });
    const slow = { hand: [bigTwin, trance(1)], player: player({ hp: 42, energy: 1 }), enemies: [enemy({ ...boss, slow: true })], fightKind: "boss" as const };
    const order = (plan: { steps: { cardId: string }[] }) => plan.steps.map((step) => step.cardId).join(",");
    const attackFirst = solveTurn(slow).plans.find((plan) => order(plan) === "TWIN_STRIKE,BATTLE_TRANCE")!;
    expect(attackFirst.outcome.damageDealt).toBe(20);
    expect(drawFirst(attackFirst, slow)).toBe(attackFirst);
  });
});

describe("Test Subject (2WUM F48)", () => {
  const skill = (index: number, block: number): CardModel => card(index, "DEFEND_IRONCLAD", { type: "Skill", target: "self", validTargets: [], block });

  it("Enrage: every Skill played adds Strength to this turn's attack", () => {
    const phase1 = enemy({ name: "Test Subject", hp: 100, maxHp: 100, enrage: 2, revives: true, attacks: [{ damage: 20, hits: 1 }] });
    const result = solveTurn({ hand: [skill(0, 5), skill(1, 5)], player: player({ hp: 80, energy: 2 }), enemies: [phase1], fightKind: "boss" });
    const both = result.plans.find((plan) => plan.steps.length === 2)!;
    expect(both.outcome.hpLoss).toBe(24 - 10);
    // Attacks do not enrage it.
    const hit = solveTurn({ hand: [strike(0)], player: player({ hp: 80, energy: 1 }), enemies: [phase1], fightKind: "boss" });
    expect(hit.plans.find((plan) => plan.steps.length === 1)!.outcome.hpLoss).toBe(20);
  });

  it("Enrage: a Skill's Strength is lasting, weighed by the attacks it raises (VP5F F48 T1: two Skills, Bite 36 on T3)", () => {
    const phase1 = enemy({ name: "Test Subject", hp: 100, maxHp: 100, enrage: 2, revives: true, attacks: [{ damage: 10, hits: 1 }] });
    const input = { player: player({ hp: 20, energy: 1 }), enemies: [phase1], fightKind: "boss" as const };
    const plans = solveTurn({ ...input, hand: [skill(0, 5)] }).plans;
    const blocked = plans.find((plan) => plan.steps.length === 1)!;
    const ended = plans.find((plan) => plan.steps.length === 0)!;
    const w = weightsFor({ ...input, hand: [] });
    // Defend saves 5 - 2 this turn, and the +2 Strength costs 2 x ENRAGE_FUTURE_HITS later.
    expect(ended.score - blocked.score).toBeCloseTo(-3 * w.hp + 2 * w.hp * ENRAGE_FUTURE_HITS);
    // At 20 HP that is a loss: the flat 3 per Strength point it used to cost made Defend the pick.
    expect(plans[0]!.steps).toEqual([]);
    expect(blocked.outcome.lasting).toBeLessThan(ended.outcome.lasting);
  });

  it("No Block (Panic Button, VP5F F48 T2): cards give no Block while it is up, and none after Panic Button", () => {
    const biting = enemy({ name: "Test Subject", hp: 100, maxHp: 100, attacks: [{ damage: 15, hits: 1 }] });
    const locked = solveTurn({ hand: [defend(0)], player: player({ hp: 80, energy: 1, noBlock: true }), enemies: [biting], fightKind: "boss" }).plans;
    // Defend adds nothing, so it is the same outcome as ending the turn.
    expect(locked.every((plan) => plan.outcome.hpLoss === 15 && plan.outcome.blockGained === 0)).toBe(true);
    // A block potion is not a card.
    const potion = modelPotion("BLOCK_POTION", "Block Potion", 0, [], 0)!;
    const drunk = solveTurn({ hand: [potion], player: player({ hp: 80, energy: 0, noBlock: true }), enemies: [biting], fightKind: "boss" }).plans;
    expect(drunk.find((plan) => plan.steps.length === 1)!.outcome.hpLoss).toBe(3);
    const panic = card(1, "PANIC_BUTTON", { type: "Skill", target: "self", validTargets: [], cost: 0, block: 10 });
    const after = solveTurn({ hand: [panic, defend(0)], player: player({ hp: 80, energy: 1 }), enemies: [biting], fightKind: "boss" }).plans;
    // Defend first, then Panic Button: 15. Panic Button first locks the Defend out.
    expect(after[0]!.steps.map((step) => step.cardId)).toEqual(["DEFEND_IRONCLAD", "PANIC_BUTTON"]);
    expect(after[0]!.outcome.blockGained).toBe(15);
    expect(after.filter((plan) => plan.steps[0]?.cardId === "PANIC_BUTTON").every((plan) => plan.outcome.blockGained === 10)).toBe(true);
  });

  it("Adaptable: killing a phase is not a fight win, but the revive turn has no attack", () => {
    const phase = enemy({ name: "Test Subject", hp: 6, maxHp: 100, revives: true, attacks: [{ damage: 20, hits: 1 }] });
    const best = solveTurn({ hand: [strike(0), defend(1)], player: player({ hp: 80, energy: 1 }), enemies: [phase], fightKind: "boss" }).plans[0]!;
    expect(best.steps.map((step) => step.cardId)).toEqual(["STRIKE_IRONCLAD"]);
    expect(best.outcome.winsFight).toBe(false);
    expect(best.outcome.kills).toEqual(["Test Subject"]);
    expect(best.outcome.hpLoss).toBe(0);
    expect(best.score).toBeLessThan(10_000);
  });

  it("Stock (Axebot, U6W7 F39): a kill with Stock left revives it, so it is no kill and no fight win", () => {
    const axebot = (stock: number): EnemySim => enemy({ name: "Axebot", hp: 6, maxHp: 76, stock, attacks: [{ damage: 14, hits: 1 }] });
    const stocked = solveTurn({ hand: [strike(0), defend(1)], player: player({ hp: 80, energy: 1 }), enemies: [axebot(2)], fightKind: "monster" }).plans;
    const kill = stocked.find((plan) => plan.steps.some((step) => step.cardId === "STRIKE_IRONCLAD"))!;
    expect(kill.outcome.winsFight).toBe(false);
    expect(kill.outcome.kills).toEqual([]);
    expect(kill.outcome.restocked).toEqual(["Axebot"]);
    // The revive turn is Boot Up (no attack).
    expect(kill.outcome.hpLoss).toBe(0);
    expect(kill.score).toBeLessThan(10_000);
    // Stock 0: the last kill is a real one.
    const last = solveTurn({ hand: [strike(0), defend(1)], player: player({ hp: 80, energy: 1 }), enemies: [axebot(0)], fightKind: "monster" }).plans[0]!;
    expect(last.outcome.winsFight).toBe(true);
    expect(last.outcome.kills).toEqual(["Axebot"]);
    expect(last.score).toBeGreaterThan(kill.score);
    expect(weightsFor({ hand: [], player: player({ hp: 80 }), fightKind: "monster", enemies: [axebot(1)] }).hp).toBeCloseTo(
      weightsFor({ hand: [], player: player({ hp: 80 }), fightKind: "monster", enemies: [axebot(0)] }).hp * NEXT_PHASE_HP,
    );
  });

  it("a phase boss weighs HP more (the next phase starts at full HP)", () => {
    const base = { hand: [], player: player({ hp: 80 }), fightKind: "boss" as const };
    const plain = weightsFor({ ...base, enemies: [enemy()] }).hp;
    expect(weightsFor({ ...base, enemies: [enemy({ revives: true })] }).hp).toBeCloseTo(plain * NEXT_PHASE_HP);
  });

  it("Painful Stabs: each unblocked hit costs a Wound", () => {
    const clawing = (woundsPerHit: number): EnemySim => enemy({ name: "Test Subject", hp: 200, maxHp: 200, woundsPerHit, attacks: [{ damage: 10, hits: 4 }] });
    const endScore = (woundsPerHit: number, block: number): number =>
      solveTurn({ hand: [], player: player({ hp: 80, block }), enemies: [clawing(woundsPerHit)], fightKind: "boss" }).plans[0]!.score;
    // 15 block: the 2nd hit is partly through, the 3rd and 4th fully: 3 Wounds.
    expect(endScore(0, 15) - endScore(1, 15)).toBeCloseTo(3 * WOUND_COST);
    expect(endScore(0, 40) - endScore(1, 40)).toBeCloseTo(0);
  });

  it("Personal Hive: each hit on the Entomancer adds a Dazed, and full damage lands (M812 F28)", async () => {
    const { DAZED_COST } = await import("../src/strategy/turn-solver.js");
    const hive = (dazedPerHit: number): EnemySim => enemy({ name: "Entomancer", hp: 145, maxHp: 145, dazedPerHit, attacks: [] });
    const twinScore = (dazedPerHit: number) => solveTurn({ hand: [card(0, "TWIN_STRIKE", { damage: 5, hits: 2 })], player: player({ hp: 80 }), enemies: [hive(dazedPerHit)], fightKind: "elite" }).plans.find((plan) => plan.steps.length > 0)!;
    expect(twinScore(0).score - twinScore(1).score).toBeCloseTo(2 * DAZED_COST);
    expect(twinScore(1).outcome.damageDealt).toBe(10);
  });
});

describe("Kusarigama (MX8K F33 T9)", () => {
  it("the 3rd attack's random 6 counts against the lowest-HP enemy", () => {
    const hand = [0, 1, 2].map((i) => ({ ...strike(i), damage: 1, validTargets: [0, 1] }));
    const enemies = [enemy({ index: 0, hp: 4, attacks: [] }), enemy({ index: 1, hp: 50, attacks: [] })];
    const withRelic = solveTurn({ hand, player: player({ hp: 60, energy: 3, kusarigama: { every: 3, damage: 6, count: 0 } }), enemies, fightKind: "monster" }).plans[0]!;
    expect(withRelic.outcome.damageDealt).toBeGreaterThanOrEqual(7);
  });
});

describe("plain True Grit (VL2D F17 T16)", () => {
  it("the cards left unplayed still pay their held penalty", () => {
    const grit = card(0, "TRUE_GRIT", { type: "Skill", target: "self", validTargets: [], cost: 1, block: 7, randomExhaust: true });
    const beckon = card(1, "BECKON", { type: "Status", target: "self", validTargets: [], cost: 2, heldPenalty: 6, heldHpLoss: 6 });
    const result = solveTurn({ hand: [grit, beckon], player: player({ hp: 15, energy: 1 }), enemies: [enemy({ index: 0, hp: 100, attacks: [] })], fightKind: "boss" });
    const played = result.plans.find((plan) => plan.steps.some((step) => step.cardId === "TRUE_GRIT"));
    expect(played === undefined || played.outcome.hpLoss > 0).toBe(true);
    // Never a "free" line that hides the held Beckon.
    expect(result.plans.every((plan) => plan.outcome.hpLoss > 0)).toBe(true);
  });
});

describe("Stone Armor (SCBC F21 T2)", () => {
  it("its plating blocks at the end of the turn it is played", () => {
    const armor = card(0, "STONE_ARMOR", { type: "Power", target: "self", validTargets: [], cost: 1, plating: 4 });
    const result = solveTurn({ hand: [armor], player: player({ hp: 30, energy: 1 }), enemies: [enemy({ index: 0, hp: 100, attacks: [{ damage: 18, hits: 1 }] })], fightKind: "monster" });
    const played = result.plans.find((plan) => plan.steps.some((step) => step.cardId === "STONE_ARMOR"))!;
    expect(played.outcome.hpLoss).toBe(14);
  });
});

describe("The Gambit (P78Z F17 T11)", () => {
  it("is played only when every other line dies", () => {
    const gambit = card(0, "THE_GAMBIT", { type: "Skill", target: "self", validTargets: [], cost: 0, block: 50 });
    const defend = card(1, "DEFEND_IRONCLAD", { type: "Skill", target: "self", validTargets: [], cost: 1, block: 5 });
    const beam = (hp: number) => solveTurn({ hand: [gambit, defend], player: player({ hp, energy: 1 }), enemies: [enemy({ index: 0, hp: 38, attacks: [{ damage: 7, hits: 3 }] })], fightKind: "boss" }).plans[0]!;
    expect(beam(3).steps.map((step) => step.cardId)).toContain("THE_GAMBIT");
    expect(beam(3).outcome.dies).toBe(false);
    expect(beam(40).steps.map((step) => step.cardId)).not.toContain("THE_GAMBIT");
  });
});

describe("Tunneler burrow (HV0D F21 T8)", () => {
  it("breaking the burrow block cancels this turn's attack", () => {
    const bash = card(0, "BASH", { cost: 2, damage: 10 });
    const pommel = card(1, "POMMEL_STRIKE", { cost: 1, damage: 16 });
    const defend = card(2, "DEFEND_IRONCLAD", { type: "Skill", target: "self", validTargets: [], cost: 1, block: 5 });
    const tunneler = enemy({ index: 0, name: "Tunneler", hp: 56, block: 22, burrowed: true, attacks: [{ damage: 23, hits: 1 }] });
    const best = solveTurn({ hand: [bash, pommel, defend], player: player({ hp: 20, energy: 3 }), enemies: [tunneler], fightKind: "monster" }).plans[0]!;
    expect(best.outcome.hpLoss).toBe(0);
    expect(best.steps.map((step) => step.cardId).sort()).toEqual(["BASH", "POMMEL_STRIKE"]);
  });
});

describe("Free Attack (NEVM F23 T2)", () => {
  it("only the next attack is free after Unrelenting", () => {
    const uppercut = card(0, "UPPERCUT", { cost: 2, damage: 13 });
    const bludgeon = card(1, "BLUDGEON", { cost: 3, damage: 32 });
    const result = solveTurn({ hand: [uppercut, bludgeon], player: player({ hp: 60, energy: 2, freeAttacks: 1 }), enemies: [enemy({ index: 0, hp: 200, attacks: [] })], fightKind: "monster" });
    // Bludgeon free, Uppercut paid with the 2 energy: both fit; a third attack would not.
    expect(result.plans[0]!.outcome.damageDealt).toBe(45);
    const none = solveTurn({ hand: [uppercut, bludgeon], player: player({ hp: 60, energy: 2 }), enemies: [enemy({ index: 0, hp: 200, attacks: [] })], fightKind: "monster" });
    expect(none.plans[0]!.outcome.damageDealt).toBe(13);
  });
});

describe("Apparition (1LJF F42 T6)", () => {
  it("makes every enemy hit this turn deal 1", () => {
    const apparition = card(0, "APPARITION", { type: "Skill", target: "self", validTargets: [], cost: 1, special: "intangible" });
    const result = solveTurn({ hand: [apparition, strike(1)], player: player({ hp: 40, energy: 1 }), enemies: [enemy({ index: 0, hp: 300, attacks: [{ damage: 45, hits: 1 }] })], fightKind: "elite" });
    expect(result.plans[0]!.steps[0]!.cardId).toBe("APPARITION");
    expect(result.plans[0]!.outcome.hpLoss).toBe(1);
  });
});

describe("least-loss fallback (2VW5 F28 T7)", () => {
  it("does not play a drawing card first whose HP cost kills us", async () => {
    const { leastLossPlan } = await import("../src/screens/combat-plan.js");
    const offering = card(0, "OFFERING", { type: "Skill", target: "self", validTargets: [], cost: 0, draw: 3, hpLoss: 6 });
    const base = solveTurn({ hand: [strike(1)], player: player({ hp: 5 }), enemies: [enemy({ index: 0, hp: 50, attacks: [{ damage: 37, hits: 1 }] })], fightKind: "monster" }).plans[0]!;
    const plan = { ...base, steps: [{ cardIndex: 1, cardId: "STRIKE_IRONCLAD", upgraded: false, name: "Strike", target: 0, targetName: null }, { cardIndex: 0, cardId: "OFFERING", upgraded: false, name: "Offering", target: null, targetName: null }] };
    expect(leastLossPlan([plan], [offering, strike(1)], 5).steps[0]!.cardId).toBe("STRIKE_IRONCLAD");
    expect(leastLossPlan([plan], [offering, strike(1)], 40).steps[0]!.cardId).toBe("OFFERING");
  });
});

describe("Kaiser Crab focus (GGF8 F33)", () => {
  it("a planned kill-first claw gets no focus bonus: the claws stay level", () => {
    const claws = [
      enemy({ index: 0, name: "Crusher", hp: 150, maxHp: 209, crabRage: true, attacks: [] }),
      enemy({ index: 1, name: "Rocket", hp: 120, maxHp: 199, crabRage: true, attacks: [] }),
    ];
    const hand = [{ ...strike(0), validTargets: [0, 1] }];
    const plain = solveTurn({ hand, player: player({ hp: 60 }), enemies: claws, fightKind: "boss" }).plans[0]!;
    const focused = solveTurn({ hand, player: player({ hp: 60 }), enemies: claws, fightKind: "boss", focusIndex: 1 }).plans[0]!;
    expect(focused.steps[0]!.target).toBe(plain.steps[0]!.target);
    expect(focused.score).toBeCloseTo(plain.score);
  });
});

describe("Pact's End (H1FA F17 T9)", () => {
  it("deals damage only with 3+ cards in the exhaust pile", () => {
    const pact = card(0, "PACTS_END", { cost: 0, damage: 18, target: "all", validTargets: [] });
    const dealt = (exhaustPile: number) =>
      solveTurn({ hand: [pact], player: player({ hp: 60, exhaustPile }), enemies: [enemy({ index: 0, hp: 100, attacks: [] })], fightKind: "boss" })
        .plans.find((plan) => plan.steps.length > 0)?.outcome.damageDealt ?? 0;
    expect(dealt(0)).toBe(0);
    expect(dealt(3)).toBe(18);
  });
});

describe("dominated lines (Q4JV F17 T3)", () => {
  it("cards drawn with no energy left do not keep a weaker line alive", async () => {
    const { dominates } = await import("../src/strategy/turn-solver.js");
    const base = solveTurn({ hand: [strike(0)], player: player({ hp: 60 }), enemies: [enemy({ index: 0, hp: 200, attacks: [] })], fightKind: "boss" }).plans[0]!;
    const hits = { ...base, outcome: { ...base.outcome, damageDealt: 23, cardsDrawn: 0, energyLeft: 0 } };
    const trance = (energyLeft: number) => ({ ...base, outcome: { ...base.outcome, damageDealt: 8, cardsDrawn: 3, energyLeft } });
    expect(dominates(hits, trance(0))).toBe(true);
    expect(dominates(hits, trance(1))).toBe(false);
  });
});

describe("The Bomb (1ZQJ: 40 to every enemy after 3 turns, scored 0 as unmodelled)", () => {
  const bomb = (index: number): CardModel =>
    card(index, "THE_BOMB", { type: "Skill", target: "self", validTargets: [], cost: 2, delayedDamage: 40 });

  it("is worth its delayed damage (capped by enemy HP) in a boss fight", () => {
    const giant = enemy({ name: "Waterfall Giant", hp: 138, maxHp: 240, attacks: [] });
    const result = solveTurn({ hand: [bomb(0), strike(1)], player: player({ hp: 60, energy: 2 }), enemies: [giant], fightKind: "boss" });
    const best = result.plans[0]!;
    expect(best.steps.map((step) => step.cardId)).toEqual(["THE_BOMB"]);
    const nothing = result.plans.find((plan) => plan.steps.length === 0)!;
    expect(best.score - nothing.score).toBeCloseTo(weightsFor({ hand: [], player: player({ hp: 60 }), enemies: [giant], fightKind: "boss" }).damage * 40 * BOMB_SURE);
  });

  it("card model reads BombDamage", async () => {
    const { modelHandCard } = await import("../src/strategy/card-model.js");
    const { testKnowledge } = await import("./scenarios.js");
    const model = modelHandCard(
      { index: 0, card_id: "THE_BOMB", energy_cost: 2, target_type: "Self", playable: true, dynamic_values: [{ name: "BombDamage", base_value: 40, current_value: 40 }, { name: "Turns", base_value: 3, current_value: 3 }] },
      0,
      testKnowledge,
    );
    expect(model.delayedDamage).toBe(40);
    expect(model.known).toBe(true);
  });
});

describe("solveTurn: Slow and Skittish", () => {
  const thrash = (index: number): CardModel => card(index, "THRASH", { damage: 4, hits: 2 });

  it("Slow counts the cards played before this one (4LGQ T9: Strike then Thrash kills, Defend x2 then Thrash is 1 short)", () => {
    // The first card of the turn gets no bonus: 10, not 11.
    const single = solveTurn({ hand: [strike(0)], player: player({ hp: 50, energy: 1 }), enemies: [enemy({ hp: 50, slow: true })], fightKind: "elite" });
    const struck = single.plans.find((plan) => plan.steps.length === 1)!;
    expect(struck.outcome.damageDealt).toBe(6);
    const big = solveTurn({ hand: [card(0, "BIG", { damage: 10 })], player: player({ hp: 50, energy: 1 }), enemies: [enemy({ hp: 50, slow: true })], fightKind: "elite" });
    expect(big.plans.find((plan) => plan.steps.length === 1)!.outcome.damageDealt).toBe(10);

    // Defend, Defend, Thrash: 4 x 1.2 -> 4, x2 = 8 < 9 (the old count said 4 x 1.3 -> 5, x2 = 10, a kill).
    const blocked = solveTurn({
      hand: [defend(0), defend(1), thrash(2)],
      player: player({ hp: 1, energy: 3 }),
      enemies: [enemy({ hp: 9, slow: true, attacks: [{ damage: 23, hits: 1 }] })],
      fightKind: "elite",
    });
    const all = blocked.plans.find((plan) => plan.steps.length === 3);
    if (all) expect(all.outcome.winsFight).toBe(false);
    // Strike (6), Thrash (4 x 1.1 -> 4, x2 = 8): 14 >= 9.
    const result = solveTurn({
      hand: [defend(0), defend(1), thrash(2), strike(3)],
      player: player({ hp: 1, energy: 3 }),
      enemies: [enemy({ hp: 9, slow: true, attacks: [{ damage: 23, hits: 1 }] })],
      fightKind: "elite",
    });
    const best = result.plans[0]!;
    expect(best.outcome.winsFight).toBe(true);
    expect(best.steps.map((step) => step.cardId)).toContain("STRIKE_IRONCLAD");
  });

  it("Skittish block comes after the first card that hits it (a lone Strike deals its damage)", () => {
    const single = solveTurn({ hand: [strike(0)], player: player({ hp: 50, energy: 1 }), enemies: [enemy({ hp: 30, skittish: 6 })], fightKind: "monster" });
    expect(single.plans.find((plan) => plan.steps.length === 1)!.outcome.damageDealt).toBe(6);
    // The second Strike meets the 6 block.
    const two = solveTurn({ hand: [strike(0), strike(1)], player: player({ hp: 50, energy: 2 }), enemies: [enemy({ hp: 30, skittish: 6 })], fightKind: "monster" });
    expect(Math.max(...two.plans.map((plan) => plan.outcome.damageDealt))).toBe(6);
    // Both hits of a multi-hit first card land in full.
    const multi = solveTurn({ hand: [thrash(0)], player: player({ hp: 50, energy: 1 }), enemies: [enemy({ hp: 30, skittish: 6 })], fightKind: "monster" });
    expect(multi.plans.find((plan) => plan.steps.length === 1)!.outcome.damageDealt).toBe(8);
  });
});

describe("Surrounded back attack (PLC F33: the intents already include the x1.5)", () => {
  // T4: facing Crusher, Rocket's Laser behind us shown as 49 (33 once we attacked Rocket).
  const crusher = enemy({ index: 0, name: "Crusher", hp: 143, maxHp: 209, attacks: [] });
  const rocket = enemy({ index: 1, name: "Rocket", hp: 135, maxHp: 199, attacks: [{ damage: 49, hits: 1 }] });
  const hit = (index: number): CardModel => card(index, "STRIKE", { damage: 6, validTargets: [0, 1] });

  it("takes the shown number as it is, and takes the 1.5 off when we turn to the attacker", () => {
    const result = solveTurn({
      hand: [hit(0), defend(1)],
      player: player({ hp: 90, energy: 1, surrounded: true, facing: 0 }),
      enemies: [crusher, rocket],
      fightKind: "boss",
    });
    const blocked = result.plans.find((plan) => plan.steps.length === 1 && plan.steps[0]!.cardId === "DEFEND_IRONCLAD")!;
    expect(blocked.outcome.hpLoss).toBe(44); // 49 - 5, not 73 - 5
    const turned = result.plans.find((plan) => plan.steps[0]?.target === 1)!;
    expect(turned.outcome.hpLoss).toBe(33);
    const stayed = result.plans.find((plan) => plan.steps[0]?.target === 0)!;
    expect(stayed.outcome.hpLoss).toBe(49);
  });

  it("puts the 1.5 on the enemy we turn away from", () => {
    const facedCrusher = enemy({ index: 0, name: "Crusher", hp: 143, maxHp: 209, attacks: [{ damage: 12, hits: 1 }] });
    const quietRocket = enemy({ index: 1, name: "Rocket", hp: 135, maxHp: 199, attacks: [] });
    const result = solveTurn({
      hand: [hit(0)],
      player: player({ hp: 90, energy: 1, surrounded: true, facing: 0 }),
      enemies: [facedCrusher, quietRocket],
      fightKind: "boss",
    });
    expect(result.plans.find((plan) => plan.steps[0]?.target === 1)!.outcome.hpLoss).toBe(18);
    expect(result.plans.find((plan) => plan.steps.length === 0)!.outcome.hpLoss).toBe(12);
  });

  it("unknown starting facing keeps the shown numbers", () => {
    expect(backAttack(49, 1, null, 1)).toBe(49);
    expect(backAttack(12, 0, null, 1)).toBe(12);
    expect(backAttack(49, 1, 0, 1)).toBe(33);
    expect(backAttack(12, 0, 0, 1)).toBe(18);
    expect(backAttack(12, 0, 0, null)).toBe(12);
  });
});

describe("debuffs into Artifact (TQX5 T1: Powdered Demise into Artifact 3 did nothing)", () => {
  const demise = () => modelPotion("POWDERED_DEMISE", "Demise", 0, [0], 4)!;

  it("a debuff potion blocked by Artifact is worth nothing, so it is not drunk", () => {
    const boss = (artifact: number) => enemy({ name: "Aeonglass", hp: 512, maxHp: 512, artifact, attacks: [{ damage: 22, hits: 1 }] });
    const blocked = solveTurn({ hand: [demise()], player: player({ hp: 69 }), enemies: [boss(3)], fightKind: "boss" });
    expect(blocked.plans[0]!.steps).toEqual([]);
    const open = solveTurn({ hand: [demise()], player: player({ hp: 69 }), enemies: [boss(0)], fightKind: "boss" });
    expect(open.plans[0]!.steps.map((step) => step.cardId)).toEqual(["POTION:POWDERED_DEMISE:0"]);
  });

  it("each debuff application takes one stack: Bash strips the last one, then Demise lands", () => {
    const bash = card(1, "BASH", { cost: 2, damage: 8, vulnerable: 2 });
    const result = solveTurn({
      hand: [bash, demise()],
      player: player({ hp: 69, energy: 2 }),
      enemies: [enemy({ hp: 300, maxHp: 512, artifact: 1, attacks: [] })],
      fightKind: "boss",
    });
    const both = result.plans.find((plan) => plan.steps.length === 2 && plan.steps[0]!.cardId === "BASH")!;
    expect(both.outcome.enemyHpAfter[0]!.vulnerable).toBe(0);
    expect(both.outcome.vulnerableApplied).toBe(0);
    expect(result.plans[0]!.steps.map((step) => step.cardId)).toEqual(["BASH", "POTION:POWDERED_DEMISE:0"]);
  });

  it("a temporary Strength loss is a debuff too", () => {
    const mangle = card(0, "MANGLE", { damage: 5, enemyTempStrengthLoss: 5 });
    const result = solveTurn({
      hand: [mangle],
      player: player({ hp: 69 }),
      enemies: [enemy({ hp: 300, artifact: 1, attacks: [{ damage: 20, hits: 1 }] })],
      fightKind: "boss",
    });
    expect(result.plans.find((plan) => plan.steps.length === 1)!.outcome.hpLoss).toBe(20);
  });

  it("debuffs land in card-text order: Uppercut's Weak meets Artifact 1, the Vulnerable lands (UJS25 F28)", async () => {
    const { modelHandCard } = await import("../src/strategy/card-model.js");
    const knowledge = { card: () => undefined } as unknown as Parameters<typeof modelHandCard>[2];
    const uppercut = modelHandCard(
      {
        index: 0,
        card_id: "UPPERCUT",
        energy_cost: 2,
        playable: true,
        requires_target: true,
        target_type: "AnyEnemy",
        valid_target_indices: [0],
        rules_text: "造成{Damage:diff()}点伤害。 给予{Power:diff()}层虚弱。 给予{Power:diff()}层易伤。",
        resolved_rules_text: "造成13点伤害。 给予1层虚弱。 给予1层易伤。",
        dynamic_values: [{ name: "Damage", base_value: 13, current_value: 13 }, { name: "Power", base_value: 1, current_value: 1 }],
      },
      0,
      knowledge,
    );
    expect(uppercut.weakFirst).toBe(true);
    const result = solveTurn({
      hand: [uppercut],
      player: player({ hp: 60, energy: 2 }),
      enemies: [enemy({ name: "Chomper", hp: 61, maxHp: 61, artifact: 1, attacks: [{ damage: 8, hits: 2 }] })],
      fightKind: "monster",
    });
    const played = result.plans.find((plan) => plan.steps.length === 1)!;
    expect(played.outcome.enemyHpAfter[0]!.weak).toBe(0);
    expect(played.outcome.enemyHpAfter[0]!.vulnerable).toBe(1);
    expect(played.outcome.weakApplied).toBe(0);
    expect(played.outcome.vulnerableApplied).toBe(1);
    expect(played.outcome.hpLoss).toBe(16);
  });

  it("a Vulnerable-first card still has Artifact eat the Vulnerable", () => {
    const both = card(0, "SHOCKWAVE_LIKE", { damage: 5, vulnerable: 1, weak: 1 });
    const result = solveTurn({
      hand: [both],
      player: player({ hp: 60 }),
      enemies: [enemy({ hp: 300, artifact: 1, attacks: [{ damage: 8, hits: 2 }] })],
      fightKind: "monster",
    });
    const played = result.plans.find((plan) => plan.steps.length === 1)!;
    expect(played.outcome.enemyHpAfter[0]!.vulnerable).toBe(0);
    expect(played.outcome.enemyHpAfter[0]!.weak).toBe(1);
  });
});

describe("Gigantification potion (PLC F33: kept from T1 to death)", () => {
  it("triples the next Attack only", () => {
    const giant = modelPotion("GIGANTIFICATION_POTION", "Gigantification", 1, [], 4)!;
    const bludgeon = card(0, "BLUDGEON", { cost: 3, damage: 32 });
    const result = solveTurn({ hand: [giant, bludgeon], player: player({ hp: 80, energy: 3 }), enemies: [enemy({ hp: 400, maxHp: 408 })], fightKind: "boss" });
    const tripled = result.plans.find((plan) => plan.steps.map((step) => step.cardId).join() === "POTION:GIGANTIFICATION_POTION:1,BLUDGEON")!;
    expect(tripled.outcome.damageDealt).toBe(96);
    expect(result.plans[0]).toBe(tripled);
    const late = result.plans.find((plan) => plan.steps[0]?.cardId === "BLUDGEON" && plan.steps.length === 2);
    if (late) expect(late.outcome.damageDealt).toBe(32);
  });
});

describe("Mercury Hourglass (PLC F33 T9: Crusher left at 2 HP died at our turn start, Rocket enraged)", () => {
  const crusher = enemy({ index: 0, name: "Crusher", hp: 24, maxHp: 209, crabRage: true, attacks: [{ damage: 8, hits: 2 }] });
  const rocket = enemy({ index: 1, name: "Rocket", hp: 108, maxHp: 199, crabRage: true, attacks: [] });
  const twin = card(0, "TWIN_STRIKE", { damage: 11, hits: 2, validTargets: [0, 1] });

  it("an enemy left at or below the start-of-turn damage counts as killed then, and a lone crab kill is punished", () => {
    const withGlass = solveTurn({ hand: [twin], player: player({ hp: 25, energy: 1, turnStartAoe: 3 }), enemies: [crusher, rocket], fightKind: "boss" });
    const onCrusher = withGlass.plans.find((plan) => plan.steps[0]?.target === 0)!;
    const onRocket = withGlass.plans.find((plan) => plan.steps[0]?.target === 1)!;
    expect(onCrusher.outcome.startTurnKills).toEqual(["Crusher"]);
    expect(onRocket.outcome.startTurnKills).toEqual([]);
    expect(onRocket.score).toBeGreaterThan(onCrusher.score);

    // Without the Hourglass a 2 HP crab next to a 108 HP one still costs the same (crab balance: it dies
    // alone to any chip). With the partner at 50 that balance penalty is off, and the difference is the
    // start-of-turn rage alone.
    const without = solveTurn({ hand: [twin], player: player({ hp: 25, energy: 1 }), enemies: [crusher, rocket], fightKind: "boss" });
    expect(without.plans.find((plan) => plan.steps[0]?.target === 0)!.score).toBeCloseTo(onCrusher.score);
    const lowRocket = { ...rocket, hp: 50 };
    const glass50 = solveTurn({ hand: [twin], player: player({ hp: 25, energy: 1, turnStartAoe: 3 }), enemies: [crusher, lowRocket], fightKind: "boss" });
    const plain50 = solveTurn({ hand: [twin], player: player({ hp: 25, energy: 1 }), enemies: [crusher, lowRocket], fightKind: "boss" });
    const killed = glass50.plans.find((plan) => plan.steps[0]?.target === 0)!;
    const plain = plain50.plans.find((plan) => plan.steps[0]?.target === 0)!;
    expect(plain.outcome.startTurnKills).toEqual([]);
    expect(plain.score - killed.score).toBeCloseTo(weightsFor({ hand: [], player: player({ hp: 25 }), enemies: [], fightKind: "boss" }).hp * CRAB_RAGE_STRENGTH * 2);
  });
});

describe("Inferno (9XZX F33: Crusher left at 3 HP died to Inferno's 6 at the start of T7, Rocket enraged)", () => {
  const crusher = enemy({ index: 0, name: "Crusher", hp: 21, maxHp: 209, crabRage: true, attacks: [{ damage: 8, hits: 1 }] });
  const rocket = enemy({ index: 1, name: "Rocket", hp: 140, maxHp: 199, crabRage: true, attacks: [] });
  const fist = card(0, "MOLTEN_FIST", { damage: 18, validTargets: [0, 1] });

  it("Inferno's power counts as start-of-turn AoE: a crab left at or below it is a lone kill", () => {
    const result = solveTurn({ hand: [fist], player: player({ hp: 50, energy: 1, turnStartAoe: 6, inferno: 6, startTurnHpLoss: 1 }), enemies: [crusher, rocket], fightKind: "boss" });
    const onCrusher = result.plans.find((plan) => plan.steps[0]?.target === 0)!;
    const onRocket = result.plans.find((plan) => plan.steps[0]?.target === 1)!;
    expect(onCrusher.outcome.startTurnKills).toEqual(["Crusher"]);
    expect(onRocket.outcome.startTurnKills).toEqual([]);
    expect(result.plans[0]!.steps[0]!.target).toBe(1);
  });

  it("an Inferno played this turn adds its damage to the next turn start and its 1 HP to the loss", () => {
    const inferno = card(1, "INFERNO", { type: "Power", target: "self", validTargets: [], inferno: 6, flatValue: 10 });
    const result = solveTurn({ hand: [inferno], player: player({ hp: 50, energy: 1 }), enemies: [{ ...crusher, hp: 5 }, rocket], fightKind: "boss" });
    const played = result.plans.find((plan) => plan.steps.some((step) => step.cardId === "INFERNO"))!;
    expect(played.outcome.startTurnKills).toEqual(["Crusher"]);
    expect(played.outcome.hpLoss).toBe(8 + 1);
  });

  it("HP lost on our turn with Inferno up hits every enemy", () => {
    const bloodletting = card(2, "BLOODLETTING", { type: "Skill", cost: 0, target: "self", validTargets: [], hpLoss: 3, energyGain: 2 });
    const result = solveTurn({ hand: [bloodletting], player: player({ hp: 50, energy: 0, inferno: 6 }), enemies: [crusher, rocket], fightKind: "boss" });
    const played = result.plans.find((plan) => plan.steps.length === 1)!;
    expect(played.outcome.enemyHpAfter.map((entry) => entry.hp)).toEqual([15, 134]);
  });
});

describe("Crab balance (9XZX: Crusher 155 -> 3 while Rocket stayed at 140; W6F4 won keeping them level)", () => {
  const blow = card(0, "HEAVY_BLADE", { damage: 20, validTargets: [0, 1] });

  it("hits the higher part when the gap is already wide", () => {
    const crusher = enemy({ index: 0, name: "Crusher", hp: 60, maxHp: 209, crabRage: true, attacks: [{ damage: 8, hits: 1 }] });
    const rocket = enemy({ index: 1, name: "Rocket", hp: 140, maxHp: 199, crabRage: true, attacks: [{ damage: 8, hits: 1 }] });
    const result = solveTurn({ hand: [blow], player: player({ hp: 60, energy: 1 }), enemies: [crusher, rocket], fightKind: "boss" });
    expect(result.plans[0]!.steps[0]!.target).toBe(1);
  });

  it("does not care while the two are close", () => {
    const crusher = enemy({ index: 0, name: "Crusher", hp: 120, maxHp: 209, crabRage: true, attacks: [] });
    const rocket = enemy({ index: 1, name: "Rocket", hp: 130, maxHp: 199, crabRage: true, attacks: [] });
    const result = solveTurn({ hand: [blow], player: player({ hp: 60, energy: 1 }), enemies: [crusher, rocket], fightKind: "boss" });
    const on = (target: number) => result.plans.find((plan) => plan.steps[0]?.target === target)!.score;
    expect(on(0)).toBeCloseTo(on(1));
  });

  it("strongly penalises leaving one part within reach of the next turn-start AoE while the other is high", () => {
    const crusher = enemy({ index: 0, name: "Crusher", hp: 34, maxHp: 209, crabRage: true, attacks: [] });
    const rocket = enemy({ index: 1, name: "Rocket", hp: 140, maxHp: 199, crabRage: true, attacks: [] });
    const input = { hand: [blow], player: player({ hp: 60, energy: 1, turnStartAoe: 6 }), enemies: [crusher, rocket], fightKind: "boss" as const };
    const result = solveTurn(input);
    const on = (target: number) => result.plans.find((plan) => plan.steps[0]?.target === target)!.score;
    // Crusher 34 -> 14 (<= 6 + 10) is not killed at the turn start but costs a full rage penalty.
    const weights = weightsFor(input);
    expect(on(1) - on(0)).toBeGreaterThan(weights.hp * CRAB_RAGE_STRENGTH * 2);
  });

  it("no balance penalty when the plan kills both", () => {
    const aoe = card(0, "CLEAVE", { target: "all", validTargets: [], damage: 20 });
    const crusher = enemy({ index: 0, name: "Crusher", hp: 5, maxHp: 209, crabRage: true, attacks: [] });
    const rocket = enemy({ index: 1, name: "Rocket", hp: 18, maxHp: 199, crabRage: true, attacks: [] });
    const result = solveTurn({ hand: [aoe], player: player({ hp: 60, energy: 1 }), enemies: [crusher, rocket], fightKind: "boss" });
    expect(result.plans[0]!.outcome.winsFight).toBe(true);
  });
});

describe("Demon Tongue (TQX5 T1: Offering+ called a -9 end turn)", () => {
  const offering = card(0, "OFFERING", { type: "Skill", cost: 0, target: "self", validTargets: [], hpLoss: 6, energyGain: 2 });
  const block = card(1, "DEFEND_IRONCLAD", { type: "Skill", target: "self", validTargets: [], block: 5 });

  it("heals the first HP lost on our turn", () => {
    const result = solveTurn({
      hand: [offering, block],
      player: player({ hp: 20, energy: 0, demonTongue: true }),
      enemies: [enemy({ hp: 300, attacks: [{ damage: 9, hits: 1 }] })],
      fightKind: "boss",
    });
    expect(result.plans[0]!.steps.map((step) => step.cardId)).toEqual(["OFFERING", "DEFEND_IRONCLAD"]);
    expect(result.plans[0]!.outcome.hpLoss).toBe(4);
    const spent = solveTurn({
      hand: [offering, block],
      player: player({ hp: 20, energy: 0 }),
      enemies: [enemy({ hp: 300, attacks: [{ damage: 9, hits: 1 }] })],
      fightKind: "boss",
    });
    expect(spent.plans.find((plan) => plan.steps.length === 2)!.outcome.hpLoss).toBe(10);
  });
});

describe("Withering Presence (TQX5: the 6th card of the count adds a Wither)", () => {
  it("counts this turn's cards toward the next Wither and adds its end-of-turn damage", () => {
    const result = solveTurn({
      hand: [strike(0), defend(1)],
      player: player({ hp: 47, energy: 2 }),
      enemies: [enemy({ hp: 376, maxHp: 512, attacks: [] })],
      fightKind: "boss",
      cardsPlayedThisTurn: 0,
      wither: { every: 6, played: 17, damage: 6 },
    });
    const one = result.plans.find((plan) => plan.steps.length === 1 && plan.steps[0]!.cardId === "STRIKE_IRONCLAD")!;
    expect(one.outcome.withersAdded).toBe(1);
    expect(one.outcome.hpLoss).toBe(6);
    const both = result.plans.find((plan) => plan.steps.length === 2)!;
    expect(both.outcome.withersAdded).toBe(1);
    expect(both.outcome.hpLoss).toBe(1);
    expect(result.plans.find((plan) => plan.steps.length === 0)!.outcome.hpLoss).toBe(0);
  });
});

describe("player Vulnerable", () => {
  it("takes the shown intent as is: the game already applied our Vulnerable (MAWLER 14 -> 21)", () => {
    const result = solveTurn({
      hand: [],
      player: player({ hp: 50, energy: 3, vulnerable: true }),
      enemies: [enemy({ hp: 40, attacks: [{ damage: 21, hits: 1 }] })],
      fightKind: "monster",
    });
    expect(result.plans[0]!.outcome.hpLoss).toBe(21);
  });
});

describe("player Weak", () => {
  it("takes the card's shown damage as is: it already includes our Weak (Strike 6 -> 4)", () => {
    const result = solveTurn({
      hand: [card(0, "STRIKE_IRONCLAD", { damage: 4 })],
      player: player({ hp: 50, energy: 1, weak: true }),
      enemies: [enemy({ hp: 4, attacks: [{ damage: 10, hits: 1 }] })],
      fightKind: "monster",
    });
    expect(result.plans[0]!.outcome.hpLoss).toBe(0);
  });
});

describe("Chains of Binding (88HN: after one Soulbound card the others are locked)", () => {
  it("never plans two Soulbound cards in one turn", () => {
    // 88HN T5: Bash+ then Flame Barrier planned together; the Barrier was locked, 7 block against 24.
    const bash = card(0, "BASH", { cost: 2, damage: 10, vulnerable: 3, soulbound: true });
    const barrier = card(1, "FLAME_BARRIER", { type: "Skill", target: "self", validTargets: [], cost: 2, block: 12, retaliate: 4, soulbound: true });
    const result = solveTurn({
      hand: [bash, barrier, strike(2), card(3, "BULLY", { cost: 0, damage: 4 })],
      player: player({ hp: 40, energy: 3 }),
      enemies: [enemy({ hp: 199, maxHp: 199, attacks: [{ damage: 24, hits: 1 }] })],
      fightKind: "boss",
    });
    for (const plan of result.plans) {
      expect(plan.steps.filter((step) => step.cardId === "BASH" || step.cardId === "FLAME_BARRIER").length).toBeLessThanOrEqual(1);
    }
    // Bash+ first leaves no block at all: the line that blocks is the Barrier one.
    const bashLine = result.plans.find((plan) => plan.steps[0]?.cardId === "BASH")!;
    expect(bashLine.outcome.blockGained).toBe(0);
    expect(result.plans.some((plan) => plan.steps.some((step) => step.cardId === "FLAME_BARRIER") && plan.outcome.hpLoss === 12)).toBe(true);
  });

  it("card model reads the Soulbound keyword from the rendered text", async () => {
    const { modelHandCard } = await import("../src/strategy/card-model.js");
    const knowledge = { card: () => undefined } as unknown as Parameters<typeof modelHandCard>[2];
    const bound = modelHandCard({ index: 0, card_id: "DEFEND_IRONCLAD", energy_cost: 1, playable: true, resolved_rules_text: "获得9点格挡。 魂缚", dynamic_values: [] }, 0, knowledge);
    const exhausting = modelHandCard({ index: 1, card_id: "DEMONIC_FLAME", energy_cost: 1, playable: true, resolved_rules_text: "造成7点伤害。 魂缚 消耗。", dynamic_values: [] }, 1, knowledge);
    const free = modelHandCard({ index: 2, card_id: "DEFEND_IRONCLAD", energy_cost: 1, playable: true, resolved_rules_text: "获得9点格挡。", dynamic_values: [] }, 2, knowledge);
    expect([bound.soulbound, exhausting.soulbound, free.soulbound]).toEqual([true, true, false]);
  });
});

describe("Touch of Insanity (G8AQ T3: free Bludgeon+ was lethal, the potion went to Twin Strike)", () => {
  const hand = (): CardModel[] => [
    card(0, "POMMEL_STRIKE", { damage: 11 }),
    card(1, "HEADBUTT", { damage: 11 }),
    card(2, "MOLTEN_FIST", { damage: 12 }),
    card(3, "PYRE", { type: "Power", target: "self", validTargets: [], cost: 2, flatValue: 16 }),
    card(4, "BLUDGEON", { upgraded: true, cost: 3, damage: 44 }),
  ];
  const touch = (): CardModel => modelPotion("TOUCH_OF_INSANITY", "Touch of Insanity", 0, [], 5)!;

  it("drinks it on the most expensive card and finds the lethal", () => {
    const result = solveTurn({
      hand: [...hand(), touch()],
      player: player({ hp: 30, energy: 3 }),
      enemies: [enemy({ name: "Entomancer", hp: 74, maxHp: 145 })],
      fightKind: "elite",
    });
    const best = result.plans[0]!;
    expect(best.outcome.winsFight).toBe(true);
    expect(best.steps.map((step) => step.cardId)).toContain("POTION:TOUCH_OF_INSANITY:0");
    expect(best.steps.map((step) => step.cardId)).toContain("BLUDGEON");
  });

  it("is not drunk with no card of 2+ energy in hand (YP9 T1: a Defend made free)", () => {
    const result = solveTurn({
      hand: [strike(0), defend(1), touch()],
      player: player({ hp: 30, energy: 3 }),
      enemies: [enemy({ hp: 74, maxHp: 145, attacks: [{ damage: 10, hits: 1 }] })],
      fightKind: "elite",
    });
    for (const plan of result.plans) expect(plan.steps.some((step) => step.cardId.startsWith("POTION:"))).toBe(false);
  });

  it("the solver and the selection screen agree on the card", async () => {
    const { freeCardPick } = await import("../src/strategy/card-model.js");
    expect(freeCardPick(hand())?.cardId).toBe("BLUDGEON");
    expect(freeCardPick([strike(0), defend(1)])).toBeNull();
  });
});

describe("prediction biases (PU21 预测校验)", () => {
  it("Intimidating Helmet: 4 block per card that costs 2+ as paid", () => {
    const bash = card(0, "BASH", { cost: 2, damage: 8, vulnerable: 2 });
    const run = (helmetBlock: number) =>
      solveTurn({ hand: [bash], player: player({ hp: 50, energy: 3, helmetBlock }), enemies: [enemy({ hp: 80, maxHp: 80, attacks: [{ damage: 10, hits: 1 }] })], fightKind: "monster" })
        .plans.find((plan) => plan.steps.length === 1)!;
    expect(run(4).outcome.hpLoss).toBe(6);
    expect(run(0).outcome.hpLoss).toBe(10);
    // A 1-cost card does not trigger it.
    const cheap = solveTurn({ hand: [strike(0)], player: player({ hp: 50, energy: 3, helmetBlock: 4 }), enemies: [enemy({ hp: 80, maxHp: 80, attacks: [{ damage: 10, hits: 1 }] })], fightKind: "monster" });
    expect(cheap.plans.find((plan) => plan.steps.length === 1)!.outcome.blockGained).toBe(0);
  });

  it("True Grit's random exhaust ends the plan: no card is planned after it", () => {
    // PU21 F30 T2: Setup Strike, Strike, True Grit, Anger planned 24 damage; Anger was exhausted, 16 dealt.
    const grit = card(0, "TRUE_GRIT", { type: "Skill", target: "self", validTargets: [], block: 7, randomExhaust: true });
    const anger = card(1, "ANGER", { cost: 0, damage: 6 });
    const result = solveTurn({
      hand: [grit, anger, strike(2)],
      player: player({ hp: 50, energy: 2 }),
      enemies: [enemy({ hp: 80, maxHp: 80, attacks: [{ damage: 10, hits: 1 }] })],
      fightKind: "monster",
    });
    for (const plan of result.plans) {
      const at = plan.steps.findIndex((step) => step.cardId === "TRUE_GRIT");
      if (at >= 0) expect(at).toBe(plan.steps.length - 1);
    }
    expect(result.plans.some((plan) => plan.steps.map((step) => step.cardId).join(",") === "ANGER,STRIKE_IRONCLAD,TRUE_GRIT")).toBe(true);
  });

  it("Terror Eel Shriek: taken to the threshold this turn, its attack is cancelled (PU21 F7 T3: 82 -> 69, predicted -22, took 0)", () => {
    const result = solveTurn({
      hand: [card(0, "STRIKE_IRONCLAD", { damage: 13 })],
      player: player({ hp: 50, energy: 1 }),
      enemies: [enemy({ name: "Terror Eel", hp: 82, maxHp: 140, shriek: 70, attacks: [{ damage: 22, hits: 1 }] })],
      fightKind: "elite",
    });
    expect(result.plans.find((plan) => plan.steps.length === 1)!.outcome.hpLoss).toBe(0);
    expect(result.plans.find((plan) => plan.steps.length === 0)!.outcome.hpLoss).toBe(22);
  });
});

describe("Parafright (XJWF F22: killed seven turns running, the Obscura barely touched)", () => {
  it("damage into an illusion is worth nothing even when it dies: hit the Obscura", () => {
    const parafright = enemy({ index: 0, name: "Parafright", hp: 21, maxHp: 21, illusion: true, minion: true, attacks: [{ damage: 16, hits: 1 }] });
    const obscura = enemy({ index: 1, name: "The Obscura", hp: 96, maxHp: 123, scaling: true, attacks: [{ damage: 6, hits: 1 }] });
    const hit = (index: number): CardModel => card(index, "STRIKE_IRONCLAD", { damage: 8, validTargets: [0, 1] });
    const result = solveTurn({ hand: [hit(0), hit(1), hit(2)], player: player({ hp: 92, maxHp: 92, energy: 3 }), enemies: [parafright, obscura], fightKind: "monster" });
    const best = result.plans[0]!;
    expect(best.steps.every((step) => step.target === 1)).toBe(true);
    const kill = result.plans.find((plan) => plan.outcome.enemyHpAfter.find((entry) => entry.index === 0)!.hp === 0)!;
    expect(kill.outcome.kills).toEqual([]);
  });
});

describe("draws from a known pile (XPA4 T8/T10: Battle Trance at 1 energy drew 2 Beckons, -12 on a '-0' plan)", () => {
  const pommel = (index: number): CardModel => card(index, "POMMEL_STRIKE", { damage: 9, draw: 1 });
  const heavy = (index: number): CardModel => card(index, "HEAVY", { damage: 9 });
  const beckon = { playable: true, heldPenalty: 6 };
  const plain = { playable: true, heldPenalty: 0 };
  const input = (drawPile?: { playable: boolean; heldPenalty: number }[]) => ({
    hand: [pommel(0), heavy(1)],
    player: player({ hp: 60, energy: 1 }),
    enemies: [enemy({ hp: 80, maxHp: 80, attacks: [] })],
    fightKind: "monster" as const,
    drawPile,
  });
  const scoreOf = (result: ReturnType<typeof solveTurn>, cardId: string): number =>
    result.plans.find((plan) => plan.steps.length === 1 && plan.steps[0]!.cardId === cardId)!.score;

  it("2 Beckons in a 4-card pile with 0 energy left: the draw is valued negative", () => {
    const value = pileValue([beckon, beckon, plain, plain], 1)!;
    expect(value.withoutEnergy).toBeLessThan(0);
    expect(value.withEnergy).toBeLessThan(DRAW_VALUE);
    const result = solveTurn(input([beckon, beckon, plain, plain]));
    // Pommel Strike (9 + draw) now scores below the same 9 damage without a draw.
    expect(scoreOf(result, "POMMEL_STRIKE")).toBeLessThan(scoreOf(result, "HEAVY"));
    expect(result.plans[0]!.steps.map((step) => step.cardId)).toEqual(["HEAVY"]);
  });

  it("a clean pile (or an unknown one) still makes the draw worth something", () => {
    const clean = solveTurn(input([plain, plain, plain]));
    expect(scoreOf(clean, "POMMEL_STRIKE")).toBeGreaterThanOrEqual(scoreOf(clean, "HEAVY"));
    const unknown = solveTurn(input());
    expect(scoreOf(unknown, "POMMEL_STRIKE")).toBeGreaterThan(scoreOf(unknown, "HEAVY"));
  });

  it("one spare energy clears one drawn Beckon, not three", () => {
    const trance = card(0, "BATTLE_TRANCE", { type: "Skill", target: "self", validTargets: [], cost: 0, draw: 3 });
    const pile = [beckon, beckon, beckon, plain, plain, plain];
    const result = solveTurn({ ...input(pile), hand: [trance] });
    const played = result.plans.find((plan) => plan.steps.length === 1)!;
    const idle = result.plans.find((plan) => plan.steps.length === 0)!;
    expect(played.score).toBeLessThan(idle.score);
  });
});

describe("Headbutt then a draw (XPA4 T11: the card put on top was drawn back the same turn)", () => {
  const headbutt = (index: number): CardModel => card(index, "HEADBUTT", { damage: 9, putsOnTop: true });
  const pommel = (index: number): CardModel => card(index, "POMMEL_STRIKE", { damage: 9, draw: 1 });
  const pillage = (index: number): CardModel => card(index, "PILLAGE", { damage: 6, drawsUntil: true });

  it("no plan draws after a put-on-top; drawing first, then Headbutt, is allowed", () => {
    const result = solveTurn({ hand: [headbutt(0), pommel(1), pillage(2)], player: player({ hp: 60 }), enemies: [enemy({ hp: 200, maxHp: 200, attacks: [] })], fightKind: "boss" });
    for (const plan of result.plans) {
      const ids = plan.steps.map((step) => step.cardId);
      const top = ids.indexOf("HEADBUTT");
      if (top < 0) continue;
      expect(ids.slice(top + 1).some((id) => id === "POMMEL_STRIKE" || id === "PILLAGE")).toBe(false);
    }
    expect(result.plans.some((plan) => plan.steps.map((step) => step.cardId).join(",") === "POMMEL_STRIKE,HEADBUTT")).toBe(true);
  });
});

describe("draws need energy left at the end, and exhausting costs the card (6A36 F3: Burning Pact over Strike)", () => {
  const pact = (index: number): CardModel => card(index, "BURNING_PACT", { type: "Skill", target: "self", validTargets: [], draw: 2 });
  const drawTwo = (index: number): CardModel => card(index, "DRAW_TWO", { type: "Skill", target: "self", validTargets: [], draw: 2 });
  const ids = (plan: { steps: { cardId: string }[] }): string => plan.steps.map((step) => step.cardId).sort().join(",");
  const board = { player: player({ hp: 60, energy: 3 }), enemies: [enemy({ hp: 38, maxHp: 38, attacks: [{ damage: 8, hits: 1 }] })], fightKind: "monster" as const };

  it("two draws with no energy left do not beat a Strike at equal HP loss", () => {
    expect(drawScoreAt([{ withEnergy: DRAW_VALUE, withoutEnergy: 1 }, { withEnergy: DRAW_VALUE, withoutEnergy: 1 }], 0)).toBe(2);
    expect(drawScoreAt([{ withEnergy: DRAW_VALUE, withoutEnergy: 1 }, { withEnergy: DRAW_VALUE, withoutEnergy: 1 }], 1)).toBe(DRAW_VALUE + 1);
    const result = solveTurn({ ...board, hand: [strike(0), drawTwo(1), defend(2), defend(3)] });
    const draws = result.plans.find((plan) => ids(plan) === "DEFEND_IRONCLAD,DEFEND_IRONCLAD,DRAW_TWO")!;
    const hits = result.plans.find((plan) => ids(plan) === "DEFEND_IRONCLAD,DEFEND_IRONCLAD,STRIKE_IRONCLAD")!;
    expect(draws.outcome.hpLoss).toBe(hits.outcome.hpLoss);
    expect(hits.score).toBeGreaterThan(draws.score);
  });

  it("3 energy, Strike x2, Burning Pact, Defend x2 into 8: the best plan plays a Strike", () => {
    const result = solveTurn({ ...board, hand: [strike(0), strike(1), pact(2), defend(3), defend(4)] });
    expect(result.plans[0]!.steps.some((step) => step.cardId === "STRIKE_IRONCLAD")).toBe(true);
    const pactLine = result.plans.find((plan) => ids(plan) === "BURNING_PACT,DEFEND_IRONCLAD,DEFEND_IRONCLAD");
    const strikeLine = result.plans.find((plan) => ids(plan) === "DEFEND_IRONCLAD,DEFEND_IRONCLAD,STRIKE_IRONCLAD")!;
    if (pactLine) expect(pactLine.score).toBeLessThan(strikeLine.score);
  });

  it("Burning Pact takes a Wound first (free, and its held penalty goes with it)", () => {
    const wound = card(5, "BURN", { type: "Status", target: "self", validTargets: [], playable: false, heldPenalty: 2 });
    const hand = [strike(0), pact(1), defend(2)];
    expect(exhaustPick([strike(0), defend(2), wound])).toBe(wound);
    expect(exhaustPick([strike(0), defend(2)])!.cardId).toBe("DEFEND_IRONCLAD");
    const withWound = solveTurn({ ...board, hand: [...hand, wound] }).plans.find((plan) => plan.steps.length === 1 && plan.steps[0]!.cardId === "BURNING_PACT")!;
    const without = solveTurn({ ...board, hand }).plans.find((plan) => plan.steps.length === 1 && plan.steps[0]!.cardId === "BURNING_PACT")!;
    expect(withWound.score).toBeGreaterThan(without.score);
  });
});

describe("card model reads costs from the rendered text (VC4L)", () => {
  const raw = (cardId: string, extra: Record<string, unknown>) => ({
    index: 0,
    card_id: cardId,
    name: cardId,
    energy_cost: 2,
    playable: true,
    target_type: "AnyEnemy",
    requires_target: true,
    ...extra,
  });

  it("a Corrupted Bash loses 2 HP per play though it has no HpLoss var (F23 T2: planned 2 HP left, had 0)", () => {
    const bash = modelHandCard(
      raw("BASH", {
        rules_text: "造成{Damage:diff()}点伤害。 给予{VulnerablePower:diff()}层易伤。",
        resolved_rules_text: "造成12点伤害。 给予2层易伤。 失去2点生命。",
        dynamic_values: [
          { name: "Damage", current_value: 12 },
          { name: "VulnerablePower", current_value: 2 },
        ],
      }),
      0,
      testKnowledge,
    );
    expect(bash.hpLoss).toBe(2);
    expect(bash.damage).toBe(12);
  });

  it("a held-penalty status (Beckon) is not charged on play", () => {
    const beckon = modelHandCard(
      raw("BECKON", { resolved_rules_text: "在你的回合结束时，如果这张牌在你的手牌中， 你失去6点生命。", dynamic_values: [] }),
      0,
      testKnowledge,
    );
    expect(beckon.hpLoss).toBe(0);
    expect(beckon.heldPenalty).toBe(6);
  });

  it("Drum of Battle's Energy comes when exhausted, not on play (F21 T4: 5 cards planned on 3 energy)", () => {
    const drum = modelHandCard(
      raw("DRUM_OF_BATTLE", {
        energy_cost: 1,
        target_type: "Self",
        requires_target: false,
        rules_text: "抽{Cards:diff()}张牌。 这张牌被消耗时，获得{Energy:energyIcons()}。",
        resolved_rules_text: "抽2张牌。 这张牌被消耗时，获得2点能量。",
        dynamic_values: [
          { name: "Cards", current_value: 2 },
          { name: "Energy", current_value: 2 },
        ],
      }),
      0,
      testKnowledge,
    );
    expect(drum.energyGain).toBe(0);
    expect(drum.draw).toBe(2);
    const onPlay = modelHandCard(
      raw("BLOODLETTING", {
        energy_cost: 0,
        rules_text: "失去{HpLoss:diff()}点生命。 获得{Energy:energyIcons()}。",
        resolved_rules_text: "失去3点生命。 获得2点能量。",
        dynamic_values: [
          { name: "HpLoss", current_value: 3 },
          { name: "Energy", current_value: 2 },
        ],
      }),
      0,
      testKnowledge,
    );
    expect(onPlay.energyGain).toBe(2);
    expect(onPlay.hpLoss).toBe(3);
  });
});

describe("next turn's hit on a quiet turn (JGJS F24 T1: Offering on the Spiny Toad's buff turn, 23 -> 16 into 23)", () => {
  const pommel = (index: number): CardModel => card(index, "POMMEL_STRIKE", { damage: 9, draw: 1 });
  const offering = card(2, "OFFERING", { type: "Skill", cost: 0, target: "self", validTargets: [], hpLoss: 6, energyGain: 2, draw: 3, exhausts: true });
  const inferno = card(3, "INFERNO", { type: "Power", target: "self", validTargets: [], inferno: 6, flatValue: 10 });
  const defendCard = { playable: true, heldPenalty: 0, block: true };
  const attackCard = { playable: true, heldPenalty: 0 };
  const input = (nextIncoming?: number) => ({
    hand: [pommel(0), pommel(1), offering, inferno],
    player: player({ hp: 23, maxHp: 91, energy: 7 }),
    enemies: [enemy({ name: "Spiny Toad", hp: 118, maxHp: 118, attacks: [] })],
    fightKind: "monster" as const,
    drawPile: [defendCard, defendCard, defendCard, defendCard, attackCard, attackCard, attackCard],
    ...(nextIncoming === undefined ? {} : { nextIncoming }),
  });
  const hasOffering = (plan: { steps: { cardId: string }[] }): boolean => plan.steps.some((step) => step.cardId === "OFFERING");

  it("self-damage weighs x3 when the plan ends within 5 of next turn's hit, and drawn Defends are worth nothing", () => {
    const result = solveTurn(input(22));
    expect(hasOffering(result.plans[0]!)).toBe(false);
    const withOffering = result.plans.find(hasOffering)!;
    const without = result.plans.find((plan) => !hasOffering(plan) && plan.steps.length === 3)!;
    expect(without.score).toBeGreaterThan(withOffering.score);
    expect(QUIET_SELF_DAMAGE_WEIGHT).toBe(3);
    // Before: an unknown pile and no next hit, Offering was code's pick (the JGJS repro).
    const unknownPile = { ...input(), drawPile: undefined };
    expect(hasOffering(solveTurn(unknownPile).plans[0]!)).toBe(true);
    // The next hit alone (pile unknown) now keeps it out: self-damage x3.
    expect(hasOffering(solveTurn({ ...unknownPile, nextIncoming: 22 }).plans[0]!)).toBe(false);
    // Far above the next hit the rule is off.
    const healthy = { ...unknownPile, player: player({ hp: 80, maxHp: 91, energy: 7 }), nextIncoming: 22 };
    const healthyNoNext = { ...healthy, nextIncoming: undefined };
    const pick = (x: typeof healthy) => solveTurn(x).plans[0]!.steps.map((step) => step.cardId).join();
    expect(pick(healthy)).toBe(pick(healthyNoNext));
  });

  it("a drawn block card has no draw value on a turn with nothing incoming", () => {
    const blocks = pileValue([defendCard, defendCard], 1, true)!;
    expect(blocks.withEnergy).toBe(0);
    expect(pileValue([defendCard, defendCard], 1, false)!.withEnergy).toBe(DRAW_VALUE);
  });

  it("with an attack coming this turn the self-damage rule is off", () => {
    const attacked = { ...input(22), enemies: [enemy({ hp: 118, maxHp: 118, attacks: [{ damage: 5, hits: 1 }] })] };
    const plain = { ...attacked, nextIncoming: undefined };
    const a = solveTurn(attacked).plans.find(hasOffering)!;
    const b = solveTurn(plain).plans.find((plan) => plan.steps.map((step) => step.cardId).join() === a.steps.map((step) => step.cardId).join())!;
    expect(a.score).toBeCloseTo(b.score);
  });
});

describe("Tender on the player (LSWU F21 T5, Hunter Killer)", () => {
  it("each card played lowers this turn's Strength and Dexterity for the cards after it", () => {
    // Three Strikes into 18 HP: a lethal at full Strength, 6 + 5 + 4 = 15 with Tender 1.
    const hand = [strike(0), strike(1), strike(2)];
    const target = enemy({ hp: 18, attacks: [{ damage: 5, hits: 1 }] });
    const plain = solveTurn({ hand, player: player({ hp: 40 }), enemies: [target], fightKind: "monster" });
    expect(plain.plans[0]!.outcome.winsFight).toBe(true);
    const tender = solveTurn({ hand, player: player({ hp: 40, tender: 1 }), enemies: [target], fightKind: "monster" });
    expect(tender.plans.some((plan) => plan.outcome.winsFight)).toBe(false);
    expect(Math.max(...tender.plans.map((plan) => plan.outcome.damageDealt))).toBe(15);
    // Block too: Strike then two Defends gives 4 + 3.
    const blocks = solveTurn({ hand: [strike(0), defend(1), defend(2)], player: player({ hp: 40, tender: 1 }), enemies: [enemy({ hp: 50, attacks: [{ damage: 30, hits: 1 }] })], fightKind: "monster" });
    expect(Math.max(...blocks.plans.map((plan) => plan.outcome.blockGained))).toBeLessThanOrEqual(9);
  });
});

describe("Slumber is a score penalty, not a filter (RC9A F27 T1)", () => {
  it("keeps the AoE line that chips the slumbering beetle through its Plating", () => {
    const howl = card(0, "HOWL_FROM_BEYOND", { cost: 3, target: "all", validTargets: [], damage: 24 });
    const beetle = enemy({ index: 0, name: "Beetle", hp: 89, maxHp: 89, block: 18, slumber: 3 });
    const rock = enemy({ index: 1, name: "Rock", hp: 46, maxHp: 46, attacks: [{ damage: 8, hits: 1 }] });
    const silk = enemy({ index: 2, name: "Silk", hp: 43, maxHp: 43, attacks: [{ damage: 5, hits: 1 }] });
    const result = solveTurn({ hand: [howl, strike(1), defend(2), strike(3)], player: player({ hp: 48, maxHp: 90 }), enemies: [beetle, rock, silk], fightKind: "monster", turn: 1 });
    const surviving = result.plans.filter((plan) => !plan.outcome.dies);
    const kept = hardRuleLines(surviving, [beetle, rock, silk]);
    expect(kept.some((plan) => plan.steps.some((step) => step.cardId === "HOWL_FROM_BEYOND"))).toBe(true);
  });
});

describe("random hits are not counted as kills (S6AG F25 T6, H8LC F23 T5)", () => {
  // S6AG: Juggernaut+ 8. The code's rank 1 "Stomp+, Shrug It Off" was predicted -2 because Shrug's 8
  // was counted on the 6-HP Parafright; it hit the Obscura and 8 block met 16 + 10. The all-block line
  // (Defend, Shrug It Off, True Grit: 20 block) survives whether or not the Parafright dies.
  const enemies = (): EnemySim[] => [
    enemy({ index: 0, name: "The Obscura", hp: 46, maxHp: 129, attacks: [{ damage: 10, hits: 1 }] }),
    enemy({ index: 1, name: "Parafright", hp: 12, maxHp: 21, attacks: [{ damage: 16, hits: 1 }] }),
  ];
  const hand = (): CardModel[] => [
    card(0, "STOMP", { damage: 6, validTargets: [0, 1] }),
    card(1, "SHRUG_IT_OFF", { type: "Skill", target: "self", validTargets: [], block: 8 }),
    defend(2),
    card(3, "TRUE_GRIT", { type: "Skill", target: "self", validTargets: [], block: 7 }),
  ];
  const ids = (plan: { steps: { cardId: string }[] }) => plan.steps.map((step) => step.cardId).sort().join(",");

  it("Juggernaut's hit is not assumed to finish the Parafright; the 20-block line ranks first", () => {
    const result = solveTurn({ hand: hand(), player: player({ hp: 13, maxHp: 86, energy: 3, juggernaut: 8 }), enemies: enemies(), fightKind: "monster", turn: 6 });
    const gamble = result.plans.find((plan) => ids(plan) === "SHRUG_IT_OFF,STOMP");
    if (gamble) expect(gamble.outcome.hpLoss).toBe(18);
    expect(result.plans[0]!.outcome.hpLoss).toBeLessThanOrEqual(6);
    expect(result.plans[0]!.outcome.dies).toBeFalsy();
  });

  it("a random multi-hit goes where it kills least; a kill every split gives still counts", () => {
    const boomerang = card(0, "SWORD_BOOMERANG", { target: "random", validTargets: [], damage: 7, hits: 3 });
    const solve = (hps: number[]) =>
      solveTurn({ hand: [boomerang], player: player({ hp: 60, energy: 1 }), enemies: hps.map((hp, index) => enemy({ index, hp, maxHp: 50, attacks: [{ damage: 5, hits: 1 }] })), fightKind: "monster" })
        .plans.find((plan) => plan.steps.length > 0)!;
    // 40 + 6: all three hits could land on the 40, so the 6-HP attacker still hits us.
    expect(solve([40, 6]).outcome.hpLoss).toBe(10);
    // 10 + 10: whatever the split, one enemy takes two hits (14) and dies.
    expect(solve([10, 10]).outcome.hpLoss).toBe(5);
  });
});

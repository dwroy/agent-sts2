import { describe, expect, it } from "vitest";

import type { CardModel } from "../src/strategy/card-model.js";
import { distinctPlans, solveTurn, type EnemySim, type PlayerSim } from "../src/strategy/turn-solver.js";

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
    expect(mantlePlan.outcome.hpAfter).toBe(1);
    expect(mantlePlan.outcome.dies).toBe(true);
    expect(result.plans[0]!.steps[0]!.cardId).toBe("DEFEND_IRONCLAD");
  });

  it("a Mantle already in play kills at 1 HP after the turn", () => {
    const result = solveTurn({ hand: [strike(0)], player: player({ hp: 7, startTurnHpLoss: 1 }), enemies: [enemy({ hp: 100, attacks: [{ damage: 6, hits: 1 }] })], fightKind: "boss" });
    expect(result.plans.every((plan) => plan.outcome.dies)).toBe(true);
  });

  it("at low HP a Mantle loses to Defend even when it survives", () => {
    const result = solveTurn({ hand: [mantle(0), defend(1)], player: player({ hp: 20, energy: 1 }), enemies: [enemy({ hp: 100, attacks: [{ damage: 10, hits: 1 }] })], fightKind: "boss" });
    expect(result.plans[0]!.steps.map((step) => step.cardId)).toEqual(["DEFEND_IRONCLAD"]);
  });
});

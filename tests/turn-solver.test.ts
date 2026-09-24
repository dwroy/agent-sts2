import { describe, expect, it } from "vitest";

import { modelPotion, type CardModel } from "../src/strategy/card-model.js";
import {
  backAttack,
  BOMB_SURE,
  CRAB_RAGE_STRENGTH,
  distinctPlans,
  ERUPTION_RACE_DAMAGE,
  NEXT_PHASE_HP,
  solveTurn,
  weightsFor,
  WOUND_COST,
  type EnemySim,
  type PlayerSim,
} from "../src/strategy/turn-solver.js";

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

  it("Adaptable: killing a phase is not a fight win, but the revive turn has no attack", () => {
    const phase = enemy({ name: "Test Subject", hp: 6, maxHp: 100, revives: true, attacks: [{ damage: 20, hits: 1 }] });
    const best = solveTurn({ hand: [strike(0), defend(1)], player: player({ hp: 80, energy: 1 }), enemies: [phase], fightKind: "boss" }).plans[0]!;
    expect(best.steps.map((step) => step.cardId)).toEqual(["STRIKE_IRONCLAD"]);
    expect(best.outcome.winsFight).toBe(false);
    expect(best.outcome.kills).toEqual(["Test Subject"]);
    expect(best.outcome.hpLoss).toBe(0);
    expect(best.score).toBeLessThan(10_000);
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
    const withGlass = solveTurn({ hand: [twin], player: player({ hp: 25, energy: 1, startTurnDamage: 3 }), enemies: [crusher, rocket], fightKind: "boss" });
    const onCrusher = withGlass.plans.find((plan) => plan.steps[0]?.target === 0)!;
    const onRocket = withGlass.plans.find((plan) => plan.steps[0]?.target === 1)!;
    expect(onCrusher.outcome.startTurnKills).toEqual(["Crusher"]);
    expect(onRocket.outcome.startTurnKills).toEqual([]);
    expect(onRocket.score).toBeGreaterThan(onCrusher.score);

    const without = solveTurn({ hand: [twin], player: player({ hp: 25, energy: 1 }), enemies: [crusher, rocket], fightKind: "boss" });
    const plain = without.plans.find((plan) => plan.steps[0]?.target === 0)!;
    expect(plain.outcome.startTurnKills).toEqual([]);
    expect(plain.score - onCrusher.score).toBeCloseTo(weightsFor({ hand: [], player: player({ hp: 25 }), enemies: [], fightKind: "boss" }).hp * CRAB_RAGE_STRENGTH * 2);
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

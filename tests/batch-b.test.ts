/**
 * Fix batch B (notes/review-2026-09-29-consistency.md, review-2026-09-29-coverage.md): the turn solver, the
 * facts shown to Jev and route scoring. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states), never the refreshing knowledge files.
 */

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import { createScreenMemory, type AskDecision, type Decision } from "../src/project/types.js";
import { describePlan, planCombatTurn, revivesOf, trackLizardTail } from "../src/screens/combat-plan.js";
import type { CardModel } from "../src/strategy/card-model.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutDecision, type EnemyTable, type FightMeta, type RolloutInput } from "../src/strategy/rollout.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { reviveThrough, solveTap, solveTurn, type EnemySim, type PlayerSim, type Revive } from "../src/strategy/turn-solver.js";
import { logged, loggedEnv } from "./logged.js";

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

function enemy(overrides: Partial<EnemySim> = {}): EnemySim {
  return { index: 0, name: "Jaw Worm", hp: 40, maxHp: 44, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...overrides };
}

function player(overrides: Partial<PlayerSim> = {}): PlayerSim {
  return { hp: 10, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, ...overrides };
}

const FAIRY: Revive = { source: "FAIRY_IN_A_BOTTLE", name: "瓶中精灵", hp: 24 };
const TAIL: Revive = { source: "LIZARD_TAIL", name: "蜥蜴尾巴", hp: 40 };

type Raw = Record<string, unknown>;

describe("1. Fairy in a Bottle and Lizard Tail are revives (JR66CJ9T8H7W F48, YQL8D59999AX F31)", () => {
  it("reviveThrough: the loss that reaches 0 is caught (its overflow lost), the later ones land on the revive's HP", () => {
    expect(reviveThrough(10, [12, 12], [FAIRY])).toEqual({ hp: 12, used: [FAIRY] });
    expect(reviveThrough(10, [5, 4], [FAIRY])).toEqual({ hp: 1, used: [] });
    // Two revives in order; one short of the second death is still death.
    expect(reviveThrough(10, [30, 30, 30], [FAIRY, TAIL])).toEqual({ hp: 10, used: [FAIRY, TAIL] });
    expect(reviveThrough(10, [30, 30, 50], [FAIRY, TAIL]).hp).toBeLessThanOrEqual(0);
  });

  it("the solver: a line that reaches 0 with a Fairy held goes on at its HP; its hpLoss counts the revive as lost", () => {
    const input = (revives?: Revive[]) => ({
      hand: [strike(0), defend(1)],
      player: player({ energy: 1, ...(revives ? { revives } : {}) }),
      enemies: [enemy({ attacks: [{ damage: 12, hits: 2 }] })],
      fightKind: "monster" as const,
    });
    // Without a revive every line dies (the logged "every simulated line dies").
    expect(solveTurn(input()).plans.every((plan) => plan.outcome.dies)).toBe(true);
    const plans = solveTurn(input([FAIRY])).plans;
    expect(plans.every((plan) => !plan.outcome.dies)).toBe(true);
    const lineOf = (id: string | null) => plans.find((plan) => (id === null ? plan.steps.length === 0 : plan.steps[0]?.cardId === id))!;
    // Defend: 12 - 5 = 7 of 10, then 12 takes it to 0: the Fairy brings us to 24; nothing after it.
    expect(lineOf("DEFEND_IRONCLAD").outcome.revived).toMatchObject({ names: ["瓶中精灵"], reviveHp: 24, hp: 24 });
    expect(lineOf("DEFEND_IRONCLAD").outcome.hpLoss).toBe(10);
    // Strike: the first 12 takes it to 0, the second lands on the 24.
    expect(lineOf("STRIKE_IRONCLAD").outcome.revived).toMatchObject({ hp: 12 });
    expect(lineOf("STRIKE_IRONCLAD").outcome.hpLoss).toBe(22);
    expect(lineOf("STRIKE_IRONCLAD").outcome.hpAfter).toBe(-12);
    // A line that lives without spending it is never beaten by one that spends it.
    const safe = solveTurn({ ...input([FAIRY]), enemies: [enemy({ attacks: [{ damage: 12, hits: 1 }] })] }).plans;
    expect(safe[0]!.outcome.revived).toBeUndefined();
    expect(safe[0]!.steps.map((step) => step.cardId)).toEqual(["DEFEND_IRONCLAD"]);
  });

  it("the rollout: a sample that reaches 0 in a later turn goes on at the revive's HP, not dead", () => {
    const table: EnemyTable = { moves: { CHOMP: { damage: 11, hits: 1, strength: 0, block: 0 } }, next: { CHOMP: { CHOMP: 1 } } };
    const meta: FightMeta = { act: 1, t: 1, asc: 8, kind: "hallway", enc: "JAW_WORM", deck: { n: 10, atk: 5, skl: 5, pow: 0, junk: 0, dmg: 30, blk: 25, up: 0 }, relics: 1, max_en: 3 };
    const scenario = (revives?: Revive[]): RolloutInput => {
      const hand = [strike(0), strike(1), strike(2)];
      const solver = { hand, player: player({ hp: 14, ...(revives ? { revives } : {}) }), enemies: [enemy({ hp: 44, attacks: [{ damage: 11, hits: 1 }] })], fightKind: "monster" as const, turn: 1 };
      return {
        solver,
        plans: solveTurn(solver).plans,
        enemies: [{ index: 0, id: "JAW_WORM", move: "CHOMP", strength: 0, powers: {} }],
        tables: { JAW_WORM: table },
        piles: { draw: Array.from({ length: 10 }, (_, i) => strike(10 + i)), discard: [], handBase: hand },
        meta,
        playerPowers: {},
        potions: revives ? 1 : 0,
        mm: {},
        model: null,
        gates: null,
        options: { budgetMs: 1e9, seed: 3, now: () => 0 },
      };
    };
    const without = rolloutDecision(scenario()).lines[0]!;
    const withFairy = rolloutDecision(scenario([FAIRY])).lines.find((line) => line.plan.steps.length === without.plan.steps.length)!;
    expect(without.deaths).toBeGreaterThan(0);
    expect(withFairy.deaths).toBeLessThan(without.deaths);
    expect(withFairy.revived).toBeGreaterThan(0);
    // Its HP is not ours: the loss is all 14 HP we have (then only what comes after it), not 14 - 24.
    expect(withFairy.hpLoss).toBe(14);
    expect(withFairy.wins).toBeGreaterThan(without.wins);
  });

  it("revivesOf: every Fairy in the belt, then Lizard Tail until it was seen to trigger", () => {
    const fx = logged("en55-f8-t9");
    const run = fx.state["run"] as Raw;
    run["potions"] = [{ index: 0, potion_id: "FAIRY_IN_A_BOTTLE", name: "瓶中精灵", occupied: true, can_use: false }, { index: 1, occupied: false }];
    run["relics"] = [...((run["relics"] as Raw[]) ?? []), { index: 9, relic_id: "LIZARD_TAIL", name: "蜥蜴尾巴", stack: null }];
    const state = parseGameState(fx.state);
    const memory = createScreenMemory("COMBAT");
    expect(revivesOf(state, memory, 80)).toEqual([
      { source: "FAIRY_IN_A_BOTTLE", name: "瓶中精灵", hp: 24 },
      { source: "LIZARD_TAIL", name: "蜥蜴尾巴", hp: 40 },
    ]);
    memory.lizardTail = { runId: String(fx.state["run_id"]), used: true };
    expect(revivesOf(state, memory, 80).map((revive) => revive.source)).toEqual(["FAIRY_IN_A_BOTTLE"]);
  });

  it("trackLizardTail: a turn that began at 50% of max HP right after a lethal turn spends it (0NG27W8QBNYX F24: 17 -> 35 of 71)", () => {
    const board = (turn: number, hp: number, intent: number): ReturnType<typeof parseGameState> => {
      const fx = logged("en55-f8-t9");
      const run = fx.state["run"] as Raw;
      run["relics"] = [{ index: 0, relic_id: "LIZARD_TAIL", name: "蜥蜴尾巴", stack: null }];
      fx.state["turn"] = turn;
      const combat = fx.state["combat"] as Raw;
      combat["end_turn_will_kill_player"] = false;
      (combat["player"] as Raw)["current_hp"] = hp;
      (combat["player"] as Raw)["max_hp"] = 71;
      ((combat["enemies"] as Raw[])[0]!["intents"] as Raw[])[0]!["damage"] = intent;
      return parseGameState(fx.state);
    };
    const memory = createScreenMemory("COMBAT");
    // A turn that ends at 17 HP against 10: no trigger at 35 next turn (a heal, not the tail).
    trackLizardTail(memory, board(2, 17, 10));
    trackLizardTail(memory, board(3, 35, 10));
    expect(memory.lizardTail?.used).toBe(false);
    // 17 HP against 33: lethal; the next turn opens at 35 = 50% of 71.
    trackLizardTail(memory, board(3, 17, 33));
    trackLizardTail(memory, board(4, 35, 33));
    expect(memory.lizardTail?.used).toBe(true);
  });

  it("the planner: with a Fairy in the belt the all-dying board is no least-loss auto-play; the lines say the revive is spent", () => {
    potionMcOptions.now = () => 0;
    rolloutLiveOptions.enabled = false;
    try {
      const board = (fairy: boolean): Decision | null => {
        const fx = logged("en55-f8-t9");
        const run = fx.state["run"] as Raw;
        run["potions"] = fairy ? [{ index: 0, potion_id: "FAIRY_IN_A_BOTTLE", name: "瓶中精灵", occupied: true, can_use: false, can_discard: false, usage: "Automatic" }] : [];
        return planCombatTurn(loggedEnv(fx));
      };
      // 7 HP against the Eel's 33: every line dies without it (the logged least-loss auto-play).
      expect(board(false)?.label).toBe("combat/least-loss");
      const decision = board(true)!;
      expect(decision.label).not.toBe("combat/least-loss");
      const texts = decision.kind === "ask" ? Object.values((decision as AskDecision).questions["plan"]!.criteria!).map(String) : [decision.rationale];
      expect(texts.some((text) => /瓶中精灵/.test(text))).toBe(true);
    } finally {
      potionMcOptions.now = null;
      rolloutLiveOptions.enabled = true;
    }
  });
});

describe("2. Thrash takes an Attack from the hand and adds its damage (D4JGCNEL40VL F46 T3: 48 dealt, 32 counted)", () => {
  const thrashRaw = (index: number) => ({
    index,
    card_id: "THRASH",
    name: "痛殴",
    energy_cost: 1,
    playable: true,
    target_type: "AnyEnemy",
    requires_target: true,
    valid_target_indices: [0],
    dynamic_values: [{ name: "Damage", base_value: 4, current_value: 16 }],
    rules_text: "造成{Damage:diff()}点伤害两次。 消耗你的手牌中随机一张攻击牌，并将它的伤害添加给这张牌。",
    resolved_rules_text: "造成16点伤害两次。 消耗你的手牌中随机一张攻击牌，并将它的伤害添加给这张牌。",
  });

  it("the card model: Thrash is its own effect, not a random exhaust of any card", async () => {
    const { modelHandCard } = await import("../src/strategy/card-model.js");
    const { loggedKnowledge } = await import("./logged.js");
    const thrash = modelHandCard(thrashRaw(0), 0, loggedKnowledge);
    expect(thrash).toMatchObject({ special: "thrash", damage: 16, hits: 2 });
    expect(thrash.randomExhaust).toBeFalsy();
  });

  it("one Attack in hand: it is exhausted and its damage lands on both hits; a Skill is still planned after", async () => {
    const { modelHandCard } = await import("../src/strategy/card-model.js");
    const { loggedKnowledge } = await import("./logged.js");
    const thrash = modelHandCard(thrashRaw(0), 0, loggedKnowledge);
    const dismantle = card(1, "DISMANTLE", { damage: 8, damageBase: 8, special: "dismantle" });
    const plans = solveTurn({ hand: [thrash, dismantle, defend(2)], player: player({ hp: 60, energy: 2 }), enemies: [enemy({ hp: 100, maxHp: 100, attacks: [{ damage: 10, hits: 1 }] })], fightKind: "monster" }).plans;
    const alone = plans.find((plan) => plan.steps.map((step) => step.cardId).join(",") === "THRASH")!;
    expect(alone.outcome.damageDealt).toBe(48);
    expect(alone.outcome.exhausted).toEqual([1]);
    // With the Defend, in either order (one outcome, one line): the Defend is not the one it takes.
    const withDefend = plans.find((plan) => plan.steps.map((step) => step.cardId).sort().join(",") === "DEFEND_IRONCLAD,THRASH");
    expect(withDefend?.outcome).toMatchObject({ damageDealt: 48, blockGained: 5 });
    // Dismantle absorbed cannot be played after it.
    expect(plans.some((plan) => plan.steps.map((step) => step.cardId).join(",") === "THRASH,DISMANTLE")).toBe(false);
  });

  it("several Attacks: the least damage counts (the pick is random) and no Attack is planned after it", async () => {
    const { modelHandCard } = await import("../src/strategy/card-model.js");
    const { loggedKnowledge } = await import("./logged.js");
    const thrash = modelHandCard(thrashRaw(0), 0, loggedKnowledge);
    const plans = solveTurn({ hand: [thrash, card(1, "BLUDGEON", { cost: 3, damage: 32, damageBase: 32 }), strike(2), defend(3)], player: player({ hp: 60, energy: 2 }), enemies: [enemy({ hp: 100, maxHp: 100, attacks: [{ damage: 10, hits: 1 }] })], fightKind: "monster" }).plans;
    const alone = plans.find((plan) => plan.steps.map((step) => step.cardId).join(",") === "THRASH")!;
    expect(alone.outcome.damageDealt).toBe(2 * (16 + 6));
    expect(alone.outcome.randomExhausts).toBe(1);
    expect(plans.some((plan) => plan.steps.map((step) => step.cardId).join(",") === "THRASH,STRIKE_IRONCLAD")).toBe(false);
    expect(plans.some((plan) => plan.steps.map((step) => step.cardId).sort().join(",") === "DEFEND_IRONCLAD,THRASH" && plan.outcome.damageDealt === 44)).toBe(true);
  });
});

describe("3. Hardened Shell's 20 a turn is carried across re-plans in the turn (3RWJX25LB2CD F14 T3)", () => {
  const colony = (hp: number, turn: number): Record<string, unknown> => {
    const fx = logged("en55-f8-t9");
    fx.state["turn"] = turn;
    const combat = fx.state["combat"] as Raw;
    const player = combat["player"] as Raw;
    player["current_hp"] = 60;
    const eel = (combat["enemies"] as Raw[])[0]!;
    eel["current_hp"] = hp;
    eel["powers"] = [{ power_id: "HARDENED_SHELL_POWER", name: "硬壳", amount: 20 }];
    return fx.state;
  };
  const capsOn = (memory: ReturnType<typeof createScreenMemory>, raw: Record<string, unknown>) => {
    let caps: (number | null | undefined)[] = [];
    const tap = solveTap;
    tap.onSolve = (input) => {
      if (caps.length === 0) caps = input.enemies.map((e) => e.hpLossCap);
    };
    try {
      planCombatTurn({ ...loggedEnv({ source: "", decision: { label: "", decider: "", chosen: null, rationale: "" }, state: raw }), screenMemory: memory });
    } finally {
      tap.onSolve = null;
    }
    return caps;
  };

  it("the first decision of the turn has the whole cap; after 20 lost this turn, none; a new turn, the whole cap again", () => {
    rolloutLiveOptions.enabled = false;
    potionMcOptions.now = () => 0;
    try {
      const memory = createScreenMemory("COMBAT");
      expect(capsOn(memory, colony(45, 3))).toEqual([20]);
      // Re-planned after a Twin Strike took 20 (the logged "Twin Strike -> colony, dmg 14" was really 0).
      expect(capsOn(memory, colony(25, 3))).toEqual([0]);
      expect(capsOn(memory, colony(38, 3))).toEqual([13]);
      expect(capsOn(memory, colony(25, 4))).toEqual([20]);
    } finally {
      rolloutLiveOptions.enabled = true;
      potionMcOptions.now = null;
    }
  });

  it("the rollout's later turns get the whole cap again", () => {
    const table: EnemyTable = { moves: { HIT: { damage: 5, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const meta: FightMeta = { act: 2, t: 3, asc: 8, kind: "hallway", enc: "SKULKING_COLONY", deck: { n: 10, atk: 8, skl: 2, pow: 0, junk: 0, dmg: 60, blk: 10, up: 0 }, relics: 1, max_en: 3 };
    const hand = [strike(0), strike(1), strike(2)];
    const solver = { hand, player: player({ hp: 60 }), enemies: [enemy({ hp: 25, maxHp: 79, hpLossCap: 0, attacks: [{ damage: 5, hits: 1 }] })], fightKind: "monster" as const, turn: 3 };
    const r = rolloutDecision({
      solver,
      plans: solveTurn(solver).plans,
      enemies: [{ index: 0, id: "SKULKING_COLONY", move: "HIT", strength: 0, powers: { HARDENED_SHELL_POWER: 20 } }],
      tables: { SKULKING_COLONY: table },
      piles: { draw: Array.from({ length: 10 }, (_, i) => strike(10 + i)), discard: [], handBase: hand },
      meta,
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 5, now: () => 0 },
    });
    const line = r.lines[0]!;
    expect(line.plan.outcome.damageDealt).toBe(0);
    // Turn 2: 3 Strikes = 18 of a fresh 20; turn 3 the last 7.
    expect(line.perTurn[0]!.dmg.mean).toBe(18);
    expect(line.wins).toBe(8);
  });
});

describe("4. The 0.8 cut only for powers still unmodelled; Corpse Slug's Ravenous modelled (coverage #3, #8)", () => {
  it("a kill next to a Ravenous slug stuns it (its hit this turn is gone) and gives it the Strength", () => {
    const slug = (index: number, hp: number): EnemySim => enemy({ index, name: `Slug ${index}`, hp, maxHp: 27, ravenous: 4, attacks: [{ damage: 8, hits: 1 }] });
    const plans = solveTurn({ hand: [card(0, "STRIKE_IRONCLAD", { damage: 6, validTargets: [0, 1] })], player: player({ hp: 50, energy: 1 }), enemies: [slug(0, 6), slug(1, 25)], fightKind: "monster" }).plans;
    const kill = plans.find((plan) => plan.steps[0]?.target === 0)!;
    expect(kill.outcome.kills).toEqual(["Slug 0"]);
    // Only the dead one's hit would have gone: the other is stunned too.
    expect(kill.outcome.hpLoss).toBe(0);
    expect(kill.outcome.enemyHpAfter.find((e) => e.index === 1)).toMatchObject({ strengthGained: 4, stunned: true });
    const chip = plans.find((plan) => plan.steps[0]?.target === 1)!;
    expect(chip.outcome.hpLoss).toBe(16);
  });

  it("the enemy sims: Ravenous, the gold and stolen-stat powers and our temporary Strength loss take no cut; the rest does, named for Jev", async () => {
    const { enemySims, unmodelledEnemyPowers } = await import("../src/screens/combat-plan.js");
    const withPowers = (...ids: string[]) => ({ enemies: [{ index: 0, enemy_id: "X", name: "X", current_hp: 30, max_hp: 30, block: 0, intents: [], powers: ids.map((id) => ({ power_id: id, amount: 1 })) }] });
    for (const id of ["RAVENOUS_POWER", "THIEVERY_POWER", "HEIST_POWER", "HATCH_POWER", "POSSESS_SPEED_POWER", "POSSESS_STRENGTH_POWER", "DEXTERITY_POWER", "GALVANIC_POWER", "MANGLE_POWER", "DARK_SHACKLES_POWER", "SHACKLING_POTION_POWER", "PIERCING_WAIL_POWER", "HIGH_VOLTAGE_POWER"]) {
      expect(enemySims(withPowers(id))[0]!.unmodelled, id).toBe(false);
    }
    expect(enemySims(withPowers("RAVENOUS_POWER"))[0]!.ravenous).toBe(1);
    expect(enemySims(withPowers("HIGH_VOLTAGE_POWER"))[0]!.scaling).toBe(true);
    expect(enemySims(withPowers("SOME_NEW_POWER"))[0]!.unmodelled).toBe(true);
    expect(unmodelledEnemyPowers(withPowers("RAVENOUS_POWER", "SOME_NEW_POWER").enemies[0]!)).toEqual(["SOME_NEW_POWER"]);
  });

  it("the question names an unmodelled power on the enemy it cuts", () => {
    potionMcOptions.now = () => 0;
    rolloutLiveOptions.enabled = false;
    try {
      const fx = logged("g8yy-f30-t3");
      const enemies = (fx.state["combat"] as Raw)["enemies"] as Raw[];
      (enemies[2]!["powers"] as Raw[]).push({ index: 0, power_id: "SOME_NEW_POWER", name: "新能力", amount: 2, is_debuff: false });
      const decision = planCombatTurn(loggedEnv(fx)) as AskDecision;
      expect(decision.kind).toBe("ask");
      const shown = decision.state["enemies"] as Raw[];
      expect(shown[2]!["not_modelled"]).toBe("SOME_NEW_POWER: not simulated, so the options count damage into this enemy at 80%");
      expect(shown[0]!["not_modelled"]).toBeUndefined();
    } finally {
      potionMcOptions.now = null;
      rolloutLiveOptions.enabled = true;
    }
  });

  it("Dark Shackles is a modelled card (its temporary Strength loss is applied), not 'unmodelled'", async () => {
    const { modelHandCard } = await import("../src/strategy/card-model.js");
    const { loggedKnowledge } = await import("./logged.js");
    const shackles = modelHandCard({ index: 0, card_id: "DARK_SHACKLES", name: "黑暗镣铐", energy_cost: 0, playable: true, target_type: "AnyEnemy", requires_target: true, valid_target_indices: [0], dynamic_values: [{ name: "StrengthLoss", base_value: 9, current_value: 9 }], resolved_rules_text: "使一名敌人在本回合失去9点力量。 消耗。" }, 0, loggedKnowledge);
    expect(shackles).toMatchObject({ enemyTempStrengthLoss: 9, known: true });
    const plans = solveTurn({ hand: [shackles], player: player({ hp: 50 }), enemies: [enemy({ attacks: [{ damage: 12, hits: 1 }] })], fightKind: "monster" }).plans;
    const played = plans.find((plan) => plan.steps.length === 1)!;
    expect(played.outcome.unknownCards).toEqual([]);
    expect(played.outcome.hpLoss).toBe(3);
  });

  it("the rollout: a slug stunned by the line loses its move on that enemy turn (no Strength from it), keeps the Strength it ate", () => {
    // Slug 1 shows Grow (+3 Strength, no attack); stunned by the kill it does not grow, and bites next turn
    // with the 4 it ate: 12, not 15.
    const table: EnemyTable = { moves: { BITE: { damage: 8, hits: 1, strength: 0, block: 0 }, GROW: { damage: 0, hits: 1, strength: 3, block: 0 } }, next: { GROW: { BITE: 1 }, BITE: { BITE: 1 }, STUNNED: { BITE: 1 } } };
    const meta: FightMeta = { act: 1, t: 1, asc: 8, kind: "hallway", enc: "CORPSE_SLUG+CORPSE_SLUG", deck: { n: 10, atk: 10, skl: 0, pow: 0, junk: 0, dmg: 60, blk: 0, up: 0 }, relics: 1, max_en: 3 };
    const hand = [strike(0)];
    const slug = (index: number, hp: number, attacks: EnemySim["attacks"]): EnemySim => enemy({ index, name: `Slug ${index}`, hp, maxHp: 40, ravenous: 4, attacks });
    const solver = { hand, player: player({ hp: 50, energy: 1 }), enemies: [slug(0, 6, [{ damage: 8, hits: 1 }]), slug(1, 40, [])], fightKind: "monster" as const, turn: 1 };
    const kill = solveTurn(solver).plans.find((plan) => plan.steps[0]?.target === 0)!;
    expect(kill.outcome.enemyHpAfter.find((e) => e.index === 1)).toMatchObject({ stunned: true, strengthGained: 4 });
    const r = rolloutDecision({
      solver,
      plans: [kill],
      enemies: [{ index: 0, id: "CORPSE_SLUG", move: "BITE", strength: 0, powers: { RAVENOUS_POWER: 4 } }, { index: 1, id: "CORPSE_SLUG", move: "GROW", strength: 0, powers: { RAVENOUS_POWER: 4 } }],
      tables: { CORPSE_SLUG: table },
      piles: { draw: Array.from({ length: 10 }, (_, i) => card(10 + i, "STRIKE_IRONCLAD", { damage: 6, validTargets: [1] })), discard: [], handBase: hand },
      meta,
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 5, now: () => 0, samples: 8, horizon: 3 },
    });
    expect(r.lines[0]!.perTurn[0]!.loss).toEqual({ mean: 12, min: 12, max: 12 });
  });
});

describe("5. Enemy powers reach Jev with their name and game description, not a bare id (46 of 62)", () => {
  it("id and amount, name, [debuff], the game's text, then code's note", () => {
    potionMcOptions.now = () => 0;
    rolloutLiveOptions.enabled = false;
    try {
      const fx = logged("g8yy-f30-t3");
      const enemies = (fx.state["combat"] as Raw)["enemies"] as Raw[];
      (enemies[1]!["powers"] as Raw[]).push({ index: 1, power_id: "SANDPIT_POWER", name: "沙坑", amount: 3, is_debuff: false });
      const decision = planCombatTurn(loggedEnv(fx, { jevContext: "v1" })) as AskDecision;
      for (const state of [decision.state, decision.jevView!.state]) {
        const shown = state["enemies"] as Raw[];
        expect(shown[0]!["powers"]).toEqual(["IMBALANCED_POWER 1 = 失衡 [debuff]: 如果这个生物的攻击被任意玩家完全格挡，则它将被击晕。", "VULNERABLE_POWER 1 = 易伤 [debuff]: 易伤的生物从攻击中受到的伤害增加50%。"]);
        expect(shown[1]!["powers"]).toEqual(["STRENGTH_POWER 15 = 力量: 力量会增加攻击牌造成的伤害。", expect.stringMatching(/^SANDPIT_POWER 3 = 沙坑: .* \(countdown: -1 every enemy turn; at 0 I die/)]);
      }
    } finally {
      potionMcOptions.now = null;
      rolloutLiveOptions.enabled = true;
    }
  });
});

describe("6. On-death spawns are a kill, not a win (Phrog Parasite, Gremlin Merc; coverage #7)", () => {
  const FIXTURE_DB = {
    bosses: {},
    encounters: {},
    monsters: {
      WRIGGLER: { name: { zh: "蠕虫" }, hp_by_asc: { "8": { median: 20, n: 84 }, "0": { median: 19, n: 40 } }, moves: { SPAWNED_MOVE: {}, NASTY_BITE_MOVE: {}, WRIGGLE_MOVE: {} } },
      FAT_GREMLIN: { name: { zh: "胖地精" }, hp_by_asc: { "8": { median: 15, n: 30 } }, moves: { SPAWNED_MOVE: {}, FLEE_MOVE: {} } },
    },
  };

  it("spawnsAt: the logged spawns with their HP at the ascension and SPAWNED_MOVE first", async () => {
    const { spawnsAt, setMonsterDbForTests } = await import("../src/knowledge/monster-db.js");
    setMonsterDbForTests(FIXTURE_DB as never);
    try {
      expect(spawnsAt("PHROG_PARASITE", 8)).toEqual([{ id: "WRIGGLER", name: "蠕虫", hp: 20, count: 4, move: "SPAWNED_MOVE" }]);
      expect(spawnsAt("GREMLIN_MERC", 9)).toEqual([
        { id: "FAT_GREMLIN", name: "胖地精", hp: 15, count: 1, move: "SPAWNED_MOVE" },
        { id: "SNEAKY_GREMLIN", name: "SNEAKY_GREMLIN", hp: 15, count: 1, move: null },
      ]);
      expect(spawnsAt("JAW_WORM", 8)).toBeNull();
    } finally {
      setMonsterDbForTests(null);
    }
  });

  it("the solver: killing it is a kill, not the fight won", () => {
    const phrog = enemy({ name: "Phrog Parasite", hp: 5, maxHp: 66, spawnsOnDeath: "4 x 蠕虫 (~20 HP each)", attacks: [{ damage: 10, hits: 1 }] });
    const plans = solveTurn({ hand: [strike(0)], player: player({ hp: 50, energy: 1 }), enemies: [phrog], fightKind: "elite" }).plans;
    const kill = plans.find((plan) => plan.steps.length === 1)!;
    expect(kill.outcome).toMatchObject({ winsFight: false, kills: ["Phrog Parasite"], spawns: ["Phrog Parasite: 4 x 蠕虫 (~20 HP each)"], hpLoss: 0 });
    expect(describePlan(kill, 80)).toMatchObject({ result: "survives with 50/80 HP before healing", spawns_on_death: "Phrog Parasite: 4 x 蠕虫 (~20 HP each): they arrive as it dies, the fight is NOT over" });
  });

  it("the planner: no 'lethal' auto-play; the option says the fight goes on", async () => {
    const { setMonsterDbForTests } = await import("../src/knowledge/monster-db.js");
    setMonsterDbForTests(FIXTURE_DB as never);
    potionMcOptions.now = () => 0;
    rolloutLiveOptions.enabled = false;
    try {
      const board = (infested: boolean) => {
        const fx = logged("en55-f8-t9");
        const combat = fx.state["combat"] as Raw;
        (combat["player"] as Raw)["current_hp"] = 60;
        combat["end_turn_will_kill_player"] = false;
        (fx.state["run"] as Raw)["potions"] = [];
        const eel = (combat["enemies"] as Raw[])[0]!;
        eel["enemy_id"] = "PHROG_PARASITE";
        eel["current_hp"] = 5;
        eel["powers"] = infested ? [{ index: 0, power_id: "INFESTED_POWER", name: "寄生", amount: 1, is_debuff: false }] : [];
        return planCombatTurn(loggedEnv(fx, { jevContext: "v1" }))!;
      };
      expect(board(false).label).toBe("combat/lethal");
      const decision = board(true);
      expect(decision.label).not.toBe("combat/lethal");
      const texts = decision.kind === "ask" ? Object.values((decision as AskDecision).questions["plan"]!.criteria!).join(" ") : decision.rationale;
      expect(texts).not.toMatch(/^lethal/);
    } finally {
      setMonsterDbForTests(null);
      potionMcOptions.now = null;
      rolloutLiveOptions.enabled = true;
    }
  });

  it("the rollout: the spawns join the fight when it dies (the logged forecast called the Phrog's death a win)", () => {
    const table: EnemyTable = { moves: { LASH: { damage: 10, hits: 1, strength: 0, block: 0 } }, next: { LASH: { LASH: 1 } } };
    const wriggler: EnemyTable = { moves: { SPAWNED_MOVE: { damage: 0, hits: 1, strength: 0, block: 0 }, NASTY_BITE_MOVE: { damage: 6, hits: 1, strength: 0, block: 0 } }, next: { SPAWNED_MOVE: { NASTY_BITE_MOVE: 1 }, NASTY_BITE_MOVE: { NASTY_BITE_MOVE: 1 } } };
    const meta: FightMeta = { act: 1, t: 1, asc: 8, kind: "elite", enc: "PHROG_PARASITE", deck: { n: 10, atk: 5, skl: 5, pow: 0, junk: 0, dmg: 30, blk: 25, up: 0 }, relics: 1, max_en: 3 };
    const hand = [strike(0)];
    const scenario = (spawns: boolean): RolloutInput => {
      const solver = { hand, player: player({ hp: 50, energy: 1 }), enemies: [enemy({ name: "Phrog", hp: 5, maxHp: 66, ...(spawns ? { spawnsOnDeath: "4 x Wriggler" } : {}), attacks: [{ damage: 10, hits: 1 }] })], fightKind: "elite" as const, turn: 1 };
      return {
        solver,
        plans: solveTurn(solver).plans.filter((plan) => plan.steps.length === 1),
        enemies: [{ index: 0, id: "PHROG_PARASITE", move: "LASH", strength: 0, powers: spawns ? { INFESTED_POWER: 1 } : {} }],
        tables: { PHROG_PARASITE: table, WRIGGLER: wriggler },
        piles: { draw: Array.from({ length: 10 }, (_, i) => card(10 + i, "STRIKE_IRONCLAD", { damage: 6, validTargets: [1, 2, 3, 4] })), discard: [], handBase: hand },
        meta,
        playerPowers: {},
        potions: 0,
        mm: {},
        model: null,
        gates: null,
        ...(spawns ? { spawns: { PHROG_PARASITE: [{ id: "WRIGGLER", name: "蠕虫", hp: 20, count: 4, move: "SPAWNED_MOVE" }] } } : {}),
        options: { budgetMs: 1e9, seed: 5, now: () => 0 },
      };
    };
    const before = rolloutDecision(scenario(false)).lines[0]!;
    expect(before.wins).toBe(8);
    expect(before.hpLoss).toBe(0);
    const after = rolloutDecision(scenario(true)).lines[0]!;
    expect(after.plan.outcome.winsFight).toBe(false);
    // T2: the Wrigglers arrived (no attack on SPAWNED_MOVE), T3 they bite.
    expect(after.perTurn[0]!.fighting).toBe(8);
    expect(after.hpLoss).toBeGreaterThan(0);
  });
});

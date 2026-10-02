/**
 * The learner's mechanics audit (notes/mechanics-proposals.md, 2026-10-02): the residual tool's measurement fixes and the
 * solver bugs it found. One describe per fix, on the logged board of its evidence (tests/logged-states/fix3/, states.jsonl
 * lines as the mod sent them) or the logged numbers written into the test; the knowledge is the fixed test data
 * (tests/logged-states/game-data.json), never the refreshing files; no model call, nothing written under logs/.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { planCombatTurn } from "../src/screens/combat-plan.js";
import { modelHandCard, playSelfDamageOf, type CardModel } from "../src/strategy/card-model.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { solveTap, solveTurn, type EnemySim, type Plan, type PlayerSim, type SolveResult, type SolverInput } from "../src/strategy/turn-solver.js";
import { alignEnemies, enemyIndexMaps, type FrameEnemy } from "../tools/mechanics-align.js";
import { loggedEnv, loggedKnowledge } from "./logged.js";

type Raw = Record<string, unknown>;
const DIR = join(dirname(fileURLToPath(import.meta.url)), "logged-states", "fix3");
/** A fresh copy of one logged state of a fixture file ({ source, states }). */
const fixture = (file: string, key: string): Raw => {
  const raw = JSON.parse(readFileSync(join(DIR, `${file}.json`), "utf8")) as { states: Record<string, Raw> };
  const state = raw.states[key];
  if (!state) throw new Error(`${file} has no state ${key}`);
  return state;
};

afterEach(() => {
  rolloutLiveOptions.enabled = true;
  solveTap.onSolve = null;
});

/** The solver's input and result for a logged combat board (the live planner, its rollout off). */
function solvedBoard(raw: Raw): { input: SolverInput; result: SolveResult } {
  let captured: { input: SolverInput; result: SolveResult } | null = null;
  solveTap.onSolve = (input, result) => {
    captured ??= { input, result };
  };
  rolloutLiveOptions.enabled = false;
  planCombatTurn(loggedEnv({ source: "", decision: { label: "", decider: "", chosen: null, rationale: "" }, state: raw }));
  if (!captured) throw new Error("the planner did not solve the board");
  return captured;
}

/** A plan's plays as "CARD>target,…" (no target: the card alone). */
const steps = (plan: { steps: { cardId: string; target: number | null }[] }) => plan.steps.map((step) => `${step.cardId}${step.target !== null ? `>${step.target}` : ""}`).join(",");
/** The solved line with exactly these plays. */
const line = (result: SolveResult, key: string): Plan => {
  const found = result.plans.find((plan) => steps(plan) === key);
  if (!found) throw new Error(`no line ${key}`);
  return found;
};
/** A logged hand card as the planner models it. */
const handCard = (raw: Raw, cardId: string): CardModel => {
  const entry = ((raw["combat"] as Raw)["hand"] as Raw[]).find((card) => card["card_id"] === cardId);
  if (!entry) throw new Error(`no ${cardId} in hand`);
  return modelHandCard(entry, 0, loggedKnowledge);
};
const player = (over: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0, ...over });
const dummy = (over: Partial<EnemySim> = {}): EnemySim => ({ index: 0, name: "Dummy", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...over });

const enemy = (idx: number, id: string, hp: number, maxHp: number): FrameEnemy => ({ idx, id, hp, max_hp: maxHp });

describe("1. residual tool: a play's target mapped back to the decision's index after a death compacts the list (proposal §2)", () => {
  it("H7W047ZCEBSA F29 T5: Fight Me killed egg [1], so the next frame's [2] is the Ovicopter, the decision's [3]", () => {
    // trace: [0] egg 11/20 [1] egg 21/21 [2] egg 21/21 [3] Ovicopter 20/129 -> [0] egg 11/20 [1] egg 21/21 [2] Ovicopter.
    const start = [enemy(0, "TOUGH_EGG", 20, 20), enemy(1, "TOUGH_EGG", 21, 21), enemy(2, "TOUGH_EGG", 21, 21), enemy(3, "OVICOPTER", 20, 129)];
    const afterSetup = [enemy(0, "TOUGH_EGG", 11, 20), enemy(1, "TOUGH_EGG", 21, 21), enemy(2, "TOUGH_EGG", 21, 21), enemy(3, "OVICOPTER", 20, 129)];
    const afterKill = [enemy(0, "TOUGH_EGG", 11, 20), enemy(1, "TOUGH_EGG", 21, 21), enemy(2, "OVICOPTER", 20, 129)];
    // The plays: Setup Strike > 0, Fight Me > 1 (the kill), Strike > 2.
    const maps = enemyIndexMaps([start, afterSetup, afterKill], [0, 1, 2]);
    expect(maps[2]!.get(2)).toBe(3);
    // The surviving egg is the one the kill did not target: the decision's [2], not [1].
    expect(maps[2]!.get(1)).toBe(2);
    expect(maps[2]!.get(0)).toBe(0);
    // Before the kill every index is its own.
    expect([...maps[1]!.entries()]).toEqual([[0, 0], [1, 1], [2, 2], [3, 3]]);
  });

  it("NX48MBG3SPRJ F30 T3: Sword Boomerang's random hits killed egg [0] (4 HP) and chipped the others: HP and max HP pair them", () => {
    const before = [enemy(0, "TOUGH_EGG", 4, 22), enemy(1, "TOUGH_EGG", 22, 22), enemy(2, "TOUGH_EGG", 20, 20), enemy(3, "OVICOPTER", 44, 126)];
    const after = [enemy(0, "TOUGH_EGG", 16, 22), enemy(1, "TOUGH_EGG", 14, 20), enemy(2, "OVICOPTER", 44, 126)];
    expect(alignEnemies(before, after, null)).toEqual([1, 2, 3]);
  });

  it("an enemy that was not there (a spawn) maps to nothing; no death keeps every index", () => {
    expect(alignEnemies([enemy(0, "A", 10, 10)], [enemy(0, "A", 8, 10), enemy(1, "B", 30, 30)], null)).toEqual([0, null]);
    expect(alignEnemies([enemy(0, "A", 10, 10), enemy(1, "A", 10, 10)], [enemy(0, "A", 4, 10), enemy(1, "A", 10, 10)], 0)).toEqual([0, 1]);
  });
});

describe("2. Galvanic (Globe Head): a Power's 「受到6点伤害」 is damage to us, through block (proposal §4)", () => {
  it("reads a standalone 「受到N点伤害」 sentence, never a held card's, Disintegration's or an enemy's", () => {
    expect(playSelfDamageOf("获得3点力量。 受到6点伤害。")).toBe(6);
    expect(playSelfDamageOf("在你的回合开始时，失去1点生命。 每当你在你的回合内失去生命时，对所有敌人造成9点伤害。 受到6点伤害。")).toBe(6);
    expect(playSelfDamageOf("Gain 3 Strength. Take 6 damage.")).toBe(6);
    // Burn, Decay (held at the end of the turn), Disintegration (end of turn), an enemy taking it, Flame Barrier, Inferno.
    expect(playSelfDamageOf("不能被打出。 在你的回合结束时，如果这张牌在你的手牌中，你受到2点伤害。")).toBe(0);
    expect(playSelfDamageOf("不能被打出。 在你的回合结束时，如果这张牌在你的手牌中, 你受到2点伤害。")).toBe(0);
    expect(playSelfDamageOf("在你的回合结束时，受到6点伤害。")).toBe(0);
    expect(playSelfDamageOf("每当你给予一个敌人负面状态时，使其受到9点伤害。")).toBe(0);
    expect(playSelfDamageOf("造成10点伤害。 该敌人在本回合受到的来自其他玩家的伤害变为两倍。")).toBe(0);
    expect(playSelfDamageOf("获得12点格挡。 你在这个回合每受到一次攻击，都会对攻击者造成4点伤害。")).toBe(0);
    expect(playSelfDamageOf("在你的回合开始时，失去1点生命。 每当你在你的回合内失去生命时，对所有敌人造成6点伤害。")).toBe(0);
    expect(playSelfDamageOf("Unplayable. At the end of your turn, if this is in your hand, take 2 damage.")).toBe(0);
  });

  it("DT1H1URTUAD8 F37 T1 (block 7): Inflame's 6 comes off the block (logged 7 -> 1, HP 87 -> 87), so Uppercut's 9 after Weak lands 8, not 2", () => {
    const raw = fixture("dt1h-f37-t1-galvanic-block", "t1");
    expect(handCard(raw, "INFLAME").selfDamage).toBe(6);
    expect(handCard(raw, "MAYHEM").selfDamage).toBe(6);
    expect(handCard(raw, "UPPERCUT").selfDamage).toBeUndefined();
    // Breakthrough's own 「失去1点生命」 stays an HP loss, not damage.
    expect(handCard(raw, "BREAKTHROUGH")).toMatchObject({ hpLoss: 1 });
    expect(handCard(raw, "BREAKTHROUGH").selfDamage).toBeUndefined();
    const { input, result } = solvedBoard(raw);
    expect(input.player).toMatchObject({ hp: 87, block: 7 });
    // The Globe Head's 13 with Uppercut's Weak is 9: 9 - 7 = 2 without Inflame, 9 - (7 - 6) = 8 with it.
    expect(line(result, "UPPERCUT>0,STRIKE_IRONCLAD>0").outcome).toMatchObject({ hpLoss: 2, incomingAfterBlock: 2 });
    expect(line(result, "INFLAME,UPPERCUT>0").outcome).toMatchObject({ hpLoss: 8, incomingAfterBlock: 8, strengthGained: 2 });
  });

  it("FSPKJAYY3ET6 F39 T1 without Throwing Axe (block 0): Inflame then Bash loses 6 + the 14 attack", () => {
    const raw = fixture("fspk-f39-t1-galvanic-axe", "t1");
    const run = raw["run"] as Raw;
    run["relics"] = (run["relics"] as Raw[]).filter((relic) => relic["relic_id"] !== "THROWING_AXE");
    const { result } = solvedBoard(raw);
    expect(line(result, "BASH>0").outcome.hpLoss).toBe(14);
    expect(line(result, "INFLAME,BASH>0").outcome).toMatchObject({ hpLoss: 20, incomingAfterBlock: 14, strengthGained: 3 });
  });

  it("in the solver: block takes it first, Intangible caps it at 1, the rest is HP lost", () => {
    const inflame = handCard(fixture("dt1h-f37-t1-galvanic-block", "t1"), "INFLAME");
    const solve = (over: Partial<PlayerSim>) => line(solveTurn({ hand: [inflame], enemies: [dummy()], fightKind: "monster", player: player(over) }), "INFLAME").outcome.hpLoss;
    expect(solve({ block: 10 })).toBe(0);
    expect(solve({ block: 4 })).toBe(2);
    expect(solve({ block: 0 })).toBe(6);
    expect(solve({ block: 0, intangible: true })).toBe(1);
  });
});

describe("3. Thorns through block; Rupture on every HP loss of our turn (proposal §1)", () => {
  it("24HMNKB4N32V F25 T2 (block 5, the Toad's Thorns 5): Strike's Thorns takes the block (logged 5 -> 0, HP 91 -> 91), not HP", () => {
    const { input, result } = solvedBoard(fixture("24hm-f25-t2-thorns-block", "t2_after_defend"));
    expect(input.player).toMatchObject({ hp: 91, block: 5 });
    expect(input.enemies[0]).toMatchObject({ thorns: 5 });
    // The Toad's 23 against Plating 3 and no block left: 20, all of it in the enemy turn (was 5 off HP now, 15 after).
    expect(line(result, "STRIKE_IRONCLAD>0").outcome).toMatchObject({ hpLoss: 20, incomingAfterBlock: 20 });
    expect(line(result, "STRIKE_IRONCLAD>0,TRUE_GRIT").outcome).toMatchObject({ hpLoss: 13, incomingAfterBlock: 13 });
  });

  it("R6V3T4KSDABE F31 T2 (Rupture 1, block 0): Breakthrough's 1 and each Thorns hit past block is a Strength (logged 0 -> 2 -> 3 -> 4)", () => {
    const { input, result } = solvedBoard(fixture("r6v3-f31-t2-thorns-rupture", "t2"));
    expect(input.player).toMatchObject({ block: 0, rupture: 1 });
    expect(line(result, "BREAKTHROUGH").outcome.strengthGained).toBe(2);
    expect(line(result, "BREAKTHROUGH,STRIKE_IRONCLAD>0,UNRELENTING>0").outcome.strengthGained).toBe(4);
  });

  it("8L29N792FA45 F37 T2 (Rupture+ under Galvanic): played at block 0 its own 6 gives +2 (logged 1 -> 3); after Shrug It Off's block, nothing", () => {
    const raw = fixture("8l29-f37-t2-galvanic-rupture", "t2");
    expect(handCard(raw, "RUPTURE")).toMatchObject({ selfDamage: 6, powerAmount: 2 });
    const { result } = solvedBoard(raw);
    expect(line(result, "RUPTURE").outcome.strengthGained).toBe(2);
    expect(line(result, "SHRUG_IT_OFF,RUPTURE").outcome.strengthGained).toBe(0);
  });

  it("in the solver: blocked Thorns is no HP loss and sets off nothing (Inferno, Rupture); Intangible caps it at 1", () => {
    const strike: CardModel = { index: 0, key: "c0", cardId: "STRIKE_IRONCLAD", name: "Strike", type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0], damage: 6, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0, draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "" };
    const solve = (over: Partial<PlayerSim>) => line(solveTurn({ hand: [strike], enemies: [dummy({ hp: 50, maxHp: 50, thorns: 5 })], fightKind: "monster", player: player({ inferno: 6, rupture: 1, ...over }) }), "STRIKE_IRONCLAD>0").outcome;
    // Blocked: no HP lost, the Toad takes the Strike's 6 only (Inferno did not fire: JR66CJ9T8H7W F29 T2), no Strength.
    expect(solve({ block: 10 })).toMatchObject({ hpLoss: 0, strengthGained: 0 });
    expect(solve({ block: 10 }).enemyHpAfter[0]!.hp).toBe(44);
    // Past block: 5 off HP, Inferno's 6 into the Toad, Rupture's Strength.
    expect(solve({ block: 0 })).toMatchObject({ hpLoss: 5, strengthGained: 1 });
    expect(solve({ block: 0 }).enemyHpAfter[0]!.hp).toBe(38);
    expect(solve({ block: 3 })).toMatchObject({ hpLoss: 2, strengthGained: 1 });
    expect(solve({ block: 0, intangible: true }).hpLoss).toBe(1);
  });
});

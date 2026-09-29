/**
 * Fix batch E (notes/fix-queue.md): pure bugs. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states), never the refreshing knowledge files.
 */

import { afterEach, describe, expect, it } from "vitest";

import { planCombatTurn, enemySims } from "../src/screens/combat-plan.js";
import { modelHandCard, type CardModel } from "../src/strategy/card-model.js";
import { rolloutDecision, type EnemyTable, type FightMeta } from "../src/strategy/rollout.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { solveTurn, type EnemySim, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";
import { combatOf, logged, loggedEnv, loggedKnowledge } from "./logged.js";

type Raw = Record<string, unknown>;

afterEach(() => {
  rolloutLiveOptions.enabled = true;
});

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

const META: FightMeta = {
  act: 1,
  t: 1,
  asc: 8,
  kind: "hallway",
  enc: "TEST_DUMMY",
  deck: { n: 2, atk: 2, skl: 0, pow: 0, junk: 0, dmg: 10, blk: 0, up: 0 },
  relics: 0,
  max_en: 3,
};

describe("1. Thrash hits for its printed number; the absorbed damage is for its later plays (3SBPKG9603WD)", () => {
  it("3SBP F12 T2: Bash+, Thrash(4) with a Strike in hand is no lethal on Byrdonis at 39 (it lived at 17)", () => {
    const fx = logged("3sbp-f12-t2-thrash");
    const combat = combatOf(fx);
    const hand = (combat["hand"] as Raw[]).map((raw, i) => modelHandCard(raw, i, loggedKnowledge));
    const raw = combat["player"] as Raw;
    const player: PlayerSim = { hp: Number(raw["current_hp"]), maxHp: Number(raw["max_hp"]), block: 0, energy: Number(raw["energy"]), weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
    const enemies = enemySims(combat);
    const solved = solveTurn({ hand, player, enemies, fightKind: "elite" });
    const line = solved.plans.find((plan) => plan.steps.map((step) => step.cardId).join(",") === "BASH,THRASH");
    // Logged: 39 -> 29 (Bash+ 10) -> 17 (Thrash 2 x 4, x1.5 into Vulnerable).
    expect(line?.outcome.damageDealt).toBe(22);
    expect(line?.outcome.winsFight).toBe(false);
    expect(line?.outcome.thrashGrowth).toEqual([{ index: hand.find((c) => c.cardId === "THRASH")!.index, amount: 6 }]);
    expect(solved.plans.some((plan) => plan.outcome.winsFight)).toBe(false);
    rolloutLiveOptions.enabled = false;
    expect(planCombatTurn(loggedEnv(fx))?.label).not.toBe("combat/lethal");
  });

  it("the rollout carries the growth: the Thrash back from the discard pile hits for 4 + 6", () => {
    const thrash = card(0, "THRASH", { damage: 4, damageBase: 4, hits: 2, special: "thrash" });
    const strike = card(1, "STRIKE_IRONCLAD", { damage: 6, damageBase: 6 });
    const player: PlayerSim = { hp: 60, maxHp: 80, block: 0, energy: 1, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
    // 28 HP: Thrash 8 now, then 2 x 10 next turn is the kill; at a flat 4 it takes four turns.
    const dummy: EnemySim = { index: 0, name: "Dummy", hp: 28, maxHp: 28, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] };
    const solver: SolverInput = { hand: [thrash, strike], player, enemies: [dummy], fightKind: "monster", turn: 1 };
    const plans = solveTurn(solver).plans;
    const table: EnemyTable = { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } };
    const result = rolloutDecision({
      solver,
      plans,
      enemies: [{ index: 0, id: "TEST_DUMMY", move: "WAIT", strength: 0, powers: {} }],
      tables: { TEST_DUMMY: table },
      piles: { draw: [], discard: [], handBase: [thrash, strike] },
      meta: META,
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 3, now: (() => { let t = 0; return () => (t += 0.01); })() },
    });
    const line = result.lines.find((entry) => entry.plan.steps.map((step) => step.cardId).join(",") === "THRASH");
    expect(line?.winProb).toBe(1);
    expect(line?.turnsToWin).toBe(2);
  });
});

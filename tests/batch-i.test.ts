/**
 * Fix batch I (notes/fix-queue.md): pure bugs. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states/batch-i, out of the rollout-live / potion-mc sweeps), never the refreshing knowledge files.
 */

import { afterEach, describe, expect, it } from "vitest";

import { planCombatTurn } from "../src/screens/combat-plan.js";
import { modelPotion, type CardModel } from "../src/strategy/card-model.js";
import { ROLLOUT_BUDGET_MS, rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { solveTurn, turnOnlyDrink, type EnemySim, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";
import { rolloutDecision, type EnemyTable, type FightMeta } from "../src/strategy/rollout.js";
import { logged, loggedEnv } from "./logged.js";

type Raw = Record<string, unknown>;

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
const player = (over: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0, ...over });
const enemy = (over: Partial<EnemySim> = {}): EnemySim => ({ index: 0, name: "Dummy", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...over });
const META: FightMeta = { act: 1, t: 1, asc: 9, kind: "hallway", enc: "X", deck: { n: 10, atk: 0, skl: 10, pow: 0, junk: 0, dmg: 0, blk: 50, up: 0 }, relics: 1, max_en: 3 };

describe("1. Liquid Bronze: Thorns 3 for the rest of the fight, in the solver and the rollout (VTREB5A9XWS7 F19-F33, V6TW9MJ385P2: \"effect not simulated\")", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  it("modelled: Thorns 3, a lasting drink (never \"no effect\")", () => {
    const bronze = modelPotion("LIQUID_BRONZE", "流动铜液", 0, [], 0);
    expect(bronze).not.toBeNull();
    expect(bronze!.thorns).toBe(3);
    expect(turnOnlyDrink(bronze!)).toBe(false);
  });

  it("solver: the drink deals 3 back per enemy hit this turn (the outcome says to whom)", () => {
    const bronze = modelPotion("LIQUID_BRONZE", "流动铜液", 0, [], 0)!;
    const input: SolverInput = { hand: [bronze], player: player({ energy: 0 }), enemies: [enemy({ hp: 50, maxHp: 50, attacks: [{ damage: 4, hits: 3 }] })], fightKind: "monster", turn: 1 };
    const plans = solveTurn(input).plans;
    const drink = plans.find((plan) => plan.steps.length === 1)!;
    const dry = plans.find((plan) => plan.steps.length === 0)!;
    expect(drink.outcome.retaliated).toEqual([{ index: 0, amount: 9 }]);
    expect(dry.outcome.retaliated).toBeUndefined();
    expect(drink.score).toBeGreaterThan(dry.score);
  });

  it("rollout: the Thorns stay up on the later turns and wear the attacker down (3 hits of 4 a turn into 30 HP)", () => {
    const HIT: EnemyTable = { moves: { HIT: { damage: 4, hits: 3, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const defend = (i: number) => card(i, "DEFEND", { type: "Skill", target: "self", validTargets: [], block: 12, damage: null });
    const bronze = modelPotion("LIQUID_BRONZE", "流动铜液", 0, [], 0)!;
    const solver: SolverInput = { hand: [bronze], player: player({ energy: 0, hp: 80 }), enemies: [enemy({ hp: 30, maxHp: 30, attacks: [{ damage: 4, hits: 3 }] })], fightKind: "monster", turn: 1 };
    const plans = solveTurn(solver).plans;
    const drink = plans.find((plan) => plan.steps.length === 1)!;
    const dry = plans.find((plan) => plan.steps.length === 0)!;
    let t = 0;
    const result = rolloutDecision({
      solver,
      plans: [drink, dry],
      enemies: [{ index: 0, id: "X", move: "HIT", strength: 0, powers: {} }],
      tables: { X: HIT },
      piles: { draw: Array.from({ length: 10 }, (_, i) => defend(10 + i)), discard: [], handBase: [null] },
      meta: META,
      playerPowers: {},
      potions: 1,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 1, horizon: 4, samples: 4, now: () => (t += 0.01) },
    });
    const withThorns = result.lines.find((line) => line.plan === drink)!;
    const without = result.lines.find((line) => line.plan === dry)!;
    // 9 back a turn: 30 HP gone on the 4th enemy turn (turns 1-4), with only Defends in the deck.
    expect(withThorns.wins).toBe(4);
    expect(without.wins).toBe(0);
  });

  it("the logged F19 T1 board (VTRE, Thieving Hopper 19 x1): the drink is a simulated line, not \"effect not simulated\"", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const decision = planCombatTurn(loggedEnv(logged("batch-i/vtre-f19-t1-bronze")));
    if (decision?.kind !== "ask") throw new Error(`expected an ask, got ${decision?.kind}`);
    const question = decision.questions["plan"]!;
    const lines = Object.values(question.type === "choice" ? question.criteria : {}).map((text) => JSON.parse(String(text)) as Raw);
    expect(lines.some((line) => /not simulated/.test(String(line["plays"])) && /流动铜液/.test(String(line["plays"])))).toBe(false);
    expect(lines.some((line) => /流动铜液/.test(String(line["plays"])) && line["simulated"] === undefined)).toBe(true);
  });
});

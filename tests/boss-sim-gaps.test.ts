/**
 * B2's simulator gaps (docs/boss-sim.md §11.1), on the synthetic boards of tests/boss-sim-fixture.ts (no knowledge
 * data, no model call): the turn relics (Orichalcum, Ripple Basin, Sturdy Clamp, Pendulum, Ice Cream), the Kaiser
 * Crab's facing, the random potions sampled each turn, and the per-turn plays a sample records for the fight plan.
 * All of it is whole-fight only: the live solver without the new fields and the 5-turn rollout are unchanged
 * (tests/boss-sim.test.ts pins their numbers).
 */

import { afterEach, describe, expect, it } from "vitest";

import { fightSample, slimInput } from "../src/sim/boss-sim.js";
import type { CardModel } from "../src/strategy/card-model.js";
import type { PotionMcSource } from "../src/strategy/potion-mc.js";
import { simulateFight, type RolloutInput } from "../src/strategy/rollout.js";
import { fightRelicsOf, ORICHALCUM_BLOCK, PENDULUM_DRAW, RIPPLE_BASIN_BLOCK, STURDY_CLAMP_BLOCK } from "../src/strategy/rollout-live.js";
import { solveTap, solveTurn, type EnemySim, type SolverInput } from "../src/strategy/turn-solver.js";
import { board, card, defend, strike } from "./boss-sim-fixture.js";

/** The policy's solver inputs of one whole-fight sample, turn by turn. */
function solves(input: RolloutInput, plan: Parameters<typeof simulateFight>[1], maxTurns: number, seed = 5): SolverInput[] {
  const seen: SolverInput[] = [];
  solveTap.onSolve = (solver) => seen.push(solver);
  try {
    simulateFight(input, plan, maxTurns, seed);
  } finally {
    solveTap.onSolve = null;
  }
  return seen;
}

const POKE = { moves: { POKE: { damage: 2, hits: 1, strength: 0, block: 0 } }, next: { POKE: { POKE: 1 } } };

afterEach(() => {
  solveTap.onSolve = null;
});

describe("B2 turn relics", () => {
  it("fightRelicsOf: Orichalcum, Ripple Basin, Sturdy Clamp, Ice Cream and Pendulum's turns from its counter", () => {
    const relics = (ids: [string, number | null][]) => ({ relics: ids.map(([relic_id, stack]) => ({ relic_id, stack })) });
    expect(fightRelicsOf(relics([]), 3)).toEqual({ energy: [], block: [] });
    const got = fightRelicsOf(relics([["ORICHALCUM", null], ["RIPPLE_BASIN", null], ["STURDY_CLAMP", null], ["ICE_CREAM", null], ["PENDULUM", 2]]), 3, 12);
    expect(got.orichalcum).toBe(ORICHALCUM_BLOCK);
    expect(got.rippleBasin).toBe(RIPPLE_BASIN_BLOCK);
    expect(got.blockKeep).toBe(STURDY_CLAMP_BLOCK);
    expect(got.iceCream).toBe(true);
    // Counter 2 at turn 3: it draws on turn 4, then every 3rd turn (logged: counter 0 on the turn it drew).
    expect(got.draws).toEqual([4, 7, 10].map((turn) => ({ amount: PENDULUM_DRAW, turn })));
  });

  it("the solver's Orichalcum and Ripple Basin (whole fights only): end-of-turn block when the turn left none / played no Attack", () => {
    const base = board().solver;
    const hand = [strike(0), strike(1), defend(2)];
    const loss = (player: Partial<SolverInput["player"]>, ids: string[]) => {
      const plans = solveTurn({ ...base, hand, player: { ...base.player, ...player } }).plans;
      return plans.find((p) => p.steps.map((s) => s.cardId).join(",") === ids.join(","))!.outcome.hpLoss;
    };
    // Two Strikes, no block: the boss's 10 hits for 10, 4 with Orichalcum 6.
    expect(loss({}, ["STRIKE", "STRIKE"])).toBe(10);
    expect(loss({ orichalcum: 6 }, ["STRIKE", "STRIKE"])).toBe(4);
    // A Defend leaves block: no Orichalcum.
    expect(loss({ orichalcum: 6 }, ["DEFEND"])).toBe(loss({}, ["DEFEND"]));
    // Ripple Basin only without an Attack.
    expect(loss({ rippleBasin: 4 }, ["DEFEND"])).toBe(loss({}, ["DEFEND"]) - 4);
    expect(loss({ rippleBasin: 4 }, ["STRIKE", "STRIKE"])).toBe(10);
  });

  it("whole fights: the later turns' solver gets Orichalcum, Pendulum's card, Ice Cream's energy", () => {
    const input = board();
    const plain = solves(input, input.plans[0]!, 3);
    const relics = solves({ ...input, fightRelics: { energy: [], block: [], orichalcum: 6, draws: [{ amount: 1, turn: 2 }], iceCream: true } }, input.plans[0]!, 3);
    // Turn 2 (the first policy turn): one card more, and the start turn's unspent energy on top of 3.
    const cards = (s: SolverInput) => s.hand.filter((c) => c.type !== "Potion").length;
    expect(cards(relics[0]!)).toBe(cards(plain[0]!) + 1);
    expect(relics[0]!.player.energy).toBe(3 + Math.floor(input.plans[0]!.outcome.energyLeft));
    expect(relics[0]!.player.orichalcum).toBe(6);
    expect(plain[0]!.player.orichalcum).toBeUndefined();
    // Turn 3: no Pendulum draw.
    expect(cards(relics[1]!)).toBe(cards(plain[1]!));
  });

  it("Sturdy Clamp: up to 10 of the block left after the enemy turn starts the next turn", () => {
    const input = board({ tables: { TEST_BOSS: POKE } });
    input.enemies[0]!.move = "POKE";
    input.solver.enemies[0]!.attacks = [{ damage: 2, hits: 1 }];
    const hand = [defend(0), defend(1), defend(2)];
    const solver = { ...input.solver, hand };
    // The line with the most block: a Defend's 5 against the 2, so 3 is left after the enemy turn.
    const plan = solveTurn(solver).plans.reduce((a, b) => (b.outcome.blockGained > a.outcome.blockGained ? b : a));
    expect(plan.outcome.blockWasted).toBe(3);
    const start2 = (keep: number) => {
      const r = simulateFight({ ...input, solver, piles: { ...input.piles, handBase: hand }, fightRelics: { energy: [], block: [], ...(keep ? { blockKeep: keep } : {}) } }, plan, 2, 3).records[1]!;
      return r.snap.blk - (r.blockGained ?? 0);
    };
    expect(start2(0)).toBe(0);
    expect(start2(10)).toBe(3);
    // Kept up to the clamp's amount.
    expect(start2(2)).toBe(2);
  });
});

describe("B2 Kaiser Crab facing", () => {
  it("Surrounded: a later turn's enemy we turned away from hits for +50%, the one we face as the move model says", () => {
    const both = (c: CardModel) => ({ ...c, validTargets: [0, 1] });
    const base = board();
    const input = { ...base, solver: { ...base.solver, hand: base.solver.hand.map((c) => (c.target === "single" ? both(c) : c)) } };
    const claw = (index: number): EnemySim => ({ index, name: `Claw${index}`, hp: 90, maxHp: 90, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 10, hits: 1 }] });
    const solver: SolverInput = { ...input.solver, enemies: [claw(0), claw(1)], player: { ...input.solver.player, surrounded: true, facing: 0 } };
    const two: RolloutInput = {
      ...input,
      solver,
      enemies: [0, 1].map((index) => ({ index, id: "TEST_BOSS", move: "HIT", strength: 0, powers: {} })),
      tables: { TEST_BOSS: { moves: { HIT: { damage: 10, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } },
    };
    // The start turn strikes claw 1: we face it from then on.
    const plan = solveTurn(solver).plans.find((p) => p.steps.some((s) => s.target === 1) && p.steps.every((s) => s.target === undefined || s.target === 1))!;
    const turn2 = solves(two, plan, 2)[0]!;
    expect(turn2.player.facing).toBe(1);
    expect(turn2.enemies.find((e) => e.index === 0)!.attacks[0]!.damage).toBe(15);
    expect(turn2.enemies.find((e) => e.index === 1)!.attacks[0]!.damage).toBe(10);
    // Not Surrounded: both as the move model says.
    const flat = solves({ ...two, solver: { ...solver, player: { ...solver.player, surrounded: false } } }, plan, 2)[0]!;
    expect(flat.enemies.map((e) => e.attacks[0]!.damage)).toEqual([10, 10]);
  });
});

describe("B2 random potions", () => {
  const potion = (id: string, slot: number, over: Partial<CardModel> = {}): CardModel =>
    card(100 + slot, `POTION:${id}:${slot}`, { type: "Potion", cost: 0, target: "self", validTargets: [], exhausts: true, ...over });
  const pool = [card(40, "CLEAVE", { damage: 8 }), card(41, "HEADBUTT", { damage: 9 }), card(42, "POMMEL", { damage: 9, draw: 1 }), card(43, "TWIN", { damage: 5, hits: 2 }), card(44, "UPPERCUT", { cost: 2, damage: 13 })];
  const attackSource: PotionMcSource = { potionId: "ATTACK_POTION", name: "Attack Potion", slot: 0, text: "", kind: "choice", pools: { Attack: pool.map((c) => ({ ...c, cost: 0 })) }, poolName: "ironclad Attack" };

  it("a card-choice potion held: each later turn a new offer of 3 from its pool, the same for every line of a sample", () => {
    const input = board();
    const withPotion: RolloutInput = { ...input, solver: { ...input.solver, hand: [...input.solver.hand, potion("ATTACK_POTION", 0, { generates: pool[0]! })] }, randomPotions: [attackSource] };
    // Keep it held: the policy pays a big cost to drink it.
    const slim = slimInput(withPotion, 1500, 0.5, 1, 0, 1, () => 1000);
    const offers = (planIndex: number) => solves(slim, input.plans[planIndex]!, 3).map((s) => s.hand.find((c) => c.type === "Potion")?.choices?.map((c) => c.cardId).join(","));
    const a = offers(0);
    const b = offers(1);
    expect(a[0]!.split(",")).toHaveLength(3);
    expect(a[0]).toBe(b[0]);
    // Without the source: the hand's expected-value card, no offer.
    const ev = solves(slimInput({ ...withPotion, randomPotions: [] }, 1500, 0.5, 1, 0, 1, () => 1000), input.plans[0]!, 2)[0]!;
    expect(ev.hand.find((c) => c.type === "Potion")!.choices).toBeUndefined();
  });

  it("a plain draw potion held: its cards are the next ones on this sample's draw pile, playable (known draws)", () => {
    const input = board();
    const swift = potion("SWIFT_POTION", 1, { draw: 3 });
    const source: PotionMcSource = { potionId: "SWIFT_POTION", name: "Swift Potion", slot: 1, text: "", kind: "draw", piles: { draw: [], discard: [] } };
    const s2 = solves({ ...input, solver: { ...input.solver, hand: [...input.solver.hand, swift] }, randomPotions: [source] }, input.plans[0]!, 2)[0]!;
    const held = s2.hand.find((c) => c.type === "Potion")!;
    expect(held.drawn?.length).toBe(2);
    expect(held.draw).toBe(1);
  });

  it("a sample records its drinks, Powers, block and kills by turn (the fight plan's input)", () => {
    const input = board({ bossHp: 30 });
    const inflame = card(9, "INFLAME", { type: "Power", target: "self", validTargets: [], strength: 2 });
    const solver = { ...input.solver, hand: [inflame, strike(1), strike(2), defend(3)] };
    const plan = solveTurn(solver).plans.find((p) => p.steps[0]?.cardId === "INFLAME")!;
    const s = fightSample(slimInput({ ...input, solver, piles: { ...input.piles, handBase: solver.hand } }, 1500, 0.5, 1, 0, 0), plan, 11);
    expect(s.powers?.[0]).toEqual([1, "INFLAME"]);
    expect(s.blockByTurn).toHaveLength(s.turns);
    if (s.won) expect(s.kills).toEqual([[s.turns, "TEST_BOSS", 0]]);
  });
});

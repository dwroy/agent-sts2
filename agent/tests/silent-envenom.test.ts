/** F9PP859XZ3RJ A4 F37 T1/T2/T5, learner ledger silent-0082 / silent-0084. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card, strike } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [{ id: "ENVENOM", type: "Power", cost: 2 }] }, "cache");
const envenom = (upgraded = false) => modelHandCard({ card_id: "ENVENOM", playable: true, energy_cost: 2,
  target_type: "Self", upgraded, rules_text: "每有一次攻击造成未被格挡的伤害，就给予{EnvenomPower:diff()}层中毒。",
  dynamic_values: [{ name: "EnvenomPower", base_value: 1, current_value: 1 }] }, 0, knowledge);
const step = (cardIndex: number, cardId: string, target?: number) => ({ cardIndex, cardId, name: cardId, upgraded: false, target });

it("observed Envenom adds two poison to the Stab and Predator sequence, alongside three direct poison", () => {
  const input = board().solver;
  input.player.envenom = 1;
  input.hand = [card(1, "POISONED_STAB", { damage: 6, poison: 3 }), card(2, "PREDATOR", { damage: 15, cost: 2 })];
  const plan = replaySteps(input, [step(1, "POISONED_STAB", 0), step(2, "PREDATOR", 0)])!;
  expect(plan.outcome.damageDealt).toBe(26); // Twenty-one direct damage plus five poison at turn end.
  expect(plan.outcome.enemyHpAfter[0]!.poison).toBe(4);
});

it("only unblocked attack HP damage triggers Envenom, once per hit through the existing debuff path", () => {
  const input = board().solver;
  input.player.envenom = 1;
  input.hand = [card(1, "TEST_TWO_HITS", { damage: 6, hits: 2 })];
  input.enemies[0]!.block = 6;
  expect(replaySteps(input, [step(1, "TEST_TWO_HITS", 0)])!.outcome.damageDealt).toBe(7);
  input.enemies[0]!.block = 12;
  expect(replaySteps(input, [step(1, "TEST_TWO_HITS", 0)])!.outcome.damageDealt).toBe(0);
  input.enemies[0]!.block = 0;
  input.enemies[0]!.artifact = 1;
  const after = replaySteps(input, [step(1, "TEST_TWO_HITS", 0)])!.outcome.enemyHpAfter[0]!;
  expect(after).toMatchObject({ hp: 107, artifact: 0 });
  expect(after.poison ?? 0).toBe(0);
  input.enemies[0]!.artifact = 0;
  for (const type of ["Skill", "Potion"]) {
    input.hand = [card(1, "TEST_NON_ATTACK", { type, damage: 6, cost: 0 })];
    expect(replaySteps(input, [step(1, "TEST_NON_ATTACK", 0)])!.outcome.damageDealt).toBe(6);
  }
});

it("new Envenom applies to later attacks only, without guessing the unobserved upgrade", () => {
  const input = board().solver;
  input.player.energy = 4;
  input.hand = [envenom(), strike(1), strike(2)];
  expect(input.hand[0]!.envenom).toBe(1);
  expect(envenom(true).envenom).toBeUndefined();
  expect(replaySteps(input, [step(1, "STRIKE", 0), step(0, "ENVENOM"), step(2, "STRIKE", 0)])!
    .outcome.damageDealt).toBe(13);
});

it("new and already observed Envenom persist in later rollout turns without double counting", () => {
  for (const observed of [false, true]) {
    const input = board({ bossHp: 500 });
    input.solver.player.envenom = observed ? 1 : 0;
    input.solver.hand = observed ? [] : [envenom()];
    const plan = replaySteps(input.solver, observed ? [] : [step(0, "ENVENOM")])!;
    input.plans = [plan];
    input.playerPowers = observed ? { ENVENOM_POWER: 1 } : {};
    input.options = { handSize: 3 };
    input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 12 }, (_, i) => strike(10 + i)), discard: [] };
    input.tables.TEST_BOSS = { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const records = simulateFight(input, plan, 3, 1, false).records;
    expect(records.map((r) => r.dmg)).toEqual([0, 21, 23]);
    expect(records[2]!.snap.pw.ENVENOM_POWER).toBe(1);
  }
});

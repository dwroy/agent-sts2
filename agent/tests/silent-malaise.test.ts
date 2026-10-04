/** KAY522KT5NXR F9/F12 T3, XYYQYBRM2A01 F30 T1 / F33 T3; silent-0051/0053. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card, strike } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [{ id: "MALAISE", type: "Skill", keywords: ["Exhaust"] }] }, "cache");
const malaise = (upgraded = false) => modelHandCard({ index: 0, card_id: "MALAISE", name: "萎靡", upgraded,
  costs_x: true, energy_cost: 0, playable: true, target_type: "AnyEnemy", requires_target: true,
  valid_target_indices: [0], dynamic_values: [],
  rules_text: "敌人失去X{IfUpgraded:show:+1}点力量。给予X{IfUpgraded:show:+1}层虚弱。",
  resolved_rules_text: "敌人失去X点力量。给予X层虚弱。 消耗。" }, 0, knowledge);
const step = (cardIndex: number, cardId = "MALAISE") => ({ cardIndex, cardId, name: cardId, upgraded: false, target: 0 });

it("zero X has no debuff, Artifact loss or unknown flat value, while Letter Opener still triggers", () => {
  const input = board().solver;
  input.hand = [malaise()];
  input.player.energy = 0;
  input.enemies[0]!.artifact = 1;
  const dry = replaySteps(input, [])!;
  const zero = replaySteps(input, [step(0)])!;
  expect(input.hand[0]).toMatchObject({ known: true, flatValue: 0, special: "malaise" });
  expect(zero.outcome.enemyHpAfter[0]).toMatchObject({ artifact: 1, weak: 0, strengthGained: 0 });
  expect(zero.outcome.hpLoss).toBe(dry.outcome.hpLoss);
  expect(zero.score).toBe(dry.score);
  input.player.letterOpener = { every: 3, damage: 5, count: 2 };
  expect(replaySteps(input, [step(0)])!.outcome.damageDealt).toBe(5);
});

it("uses remaining energy at play time for the observed one and three X debuffs", () => {
  for (const x of [1, 3]) {
    const input = board().solver;
    input.hand = [malaise(), strike(1)];
    input.player.energy = x + 1;
    const plan = replaySteps(input, [step(1, "STRIKE"), step(0)])!;
    expect(plan.outcome.energyLeft).toBe(0);
    expect(plan.outcome.enemyHpAfter[0]).toMatchObject({ weak: x, strengthGained: -x });
    expect(plan.outcome.hpLoss).toBe(Math.floor((10 - x) * 0.75));
  }
});

it("three X remains permanent after the existing temporary six Strength loss expires", () => {
  const input = board();
  input.solver.hand = [malaise()];
  input.solver.enemies[0]!.weak = 1;
  input.solver.enemies[0]!.attacks = [{ damage: 6, hits: 1 }];
  input.enemies[0]!.strength = -6;
  input.enemies[0]!.powers = { STRENGTH_POWER: -6, PIERCING_WAIL_POWER: 6, WEAK_POWER: 1 };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 14, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 10 }, (_, i) => card(i + 10, "TEST_JUNK", { type: "Status", playable: false })), discard: [] };
  const plan = replaySteps(input.solver, [step(0)])!;
  input.plans = [plan];
  const records = simulateFight(input, plan, 3, 1, false).records;
  expect(records).toHaveLength(3);
  expect(records[1]!.snap.E[0]![9].STRENGTH_POWER).toBe(-3);
  expect(records[2]!.snap.E[0]![9].STRENGTH_POWER).toBe(-3);
  expect(records[1]!.loss).toBe(8);
  expect(records[2]!.loss).toBe(8);
});

it("keeps the unobserved upgrade outside the new model and leaves other skills unchanged", () => {
  expect(malaise(true)).toMatchObject({ special: null, known: false, flatValue: 3 });
  expect(modelHandCard({ card_id: "TEST_UNKNOWN", energy_cost: 0 }, 0,
    makeKnowledge({ cards: [{ id: "TEST_UNKNOWN", type: "Skill" }] }, "cache"))).toMatchObject({ known: false, flatValue: 3 });
});

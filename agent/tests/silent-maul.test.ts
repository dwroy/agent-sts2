/** K3676LU8B0UH F48 attempt 2 T1/T9/T12, ledger silent-0056/0058; fixed dynamic values only. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [{ id: "MAUL", type: "Attack" }] }, "cache");
const maul = (index: number, damage: number, increase = 2, upgraded = false) => modelHandCard({ index,
  card_id: "MAUL", name: "撕咬", upgraded, energy_cost: 1, playable: true,
  requires_target: true, target_type: "AnyEnemy", valid_target_indices: [0],
  rules_text: "造成{Damage:diff()}点伤害两次。在这场战斗中，将所有“撕咬”牌的伤害增加{Increase:diff()}。",
  dynamic_values: [{ name: "Damage", base_value: damage, current_value: damage }, { name: "Increase", base_value: increase, current_value: increase }] }, index, knowledge);
const step = (cardIndex: number, upgraded = false) => ({ cardIndex, cardId: "MAUL", name: "撕咬", upgraded, target: 0 });

it("T9: the first 13x2 Maul raises the second one to 15x2 within the same plan", () => {
  const input = board().solver;
  input.hand = [maul(0, 13), maul(1, 13)];
  const plan = replaySteps(input, [step(0), step(1)])!;
  expect(plan.outcome.damageDealt).toBe(26 + 30);
  // Exploring a plan does not change the observed board or a fresh plan's first play.
  expect(input.hand.map((card) => card.damage)).toEqual([13, 13]);
  expect(replaySteps(input, [step(1)])!.outcome.damageDealt).toBe(26);
});

it("T12: shared growth happens before the second Maul's Pen Nib double on both hits", () => {
  const input = board({ bossHp: 124 }).solver;
  input.hand = [maul(0, 17), maul(1, 17)];
  input.player.penNib = 8;
  const plan = replaySteps(input, [step(0), step(1)])!;
  expect(plan.outcome.damageDealt).toBe(34 + 76);
  expect(plan.outcome.enemyHpAfter[0]!.hp).toBe(14);
});

it("T1: the observed upgraded Increase 3 raises the other plain Maul from five to eight per hit", () => {
  const input = board().solver;
  input.hand = [maul(0, 6, 3, true), maul(1, 5)];
  expect(replaySteps(input, [step(0, true), step(1)])!.outcome.damageDealt).toBe(12 + 16);
});

it("shared growth carries to drawn and reshuffled copies in subsequent rollout turns exactly once", () => {
  const input = board({ bossHp: 1000 });
  input.solver.hand = [maul(0, 13)];
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 5 }, (_, i) => maul(i + 10, 13)), discard: [] };
  input.solver.enemies[0]!.attacks = [];
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const plan = replaySteps(input.solver, [step(0)])!;
  input.plans = [plan];
  expect(simulateFight(input, plan, 3, 1, false).records.map((record) => record.dmg)).toEqual([26, 102, 138]);
  expect(input.piles.draw.map((card) => card.damage)).toEqual([13, 13, 13, 13, 13]);
});

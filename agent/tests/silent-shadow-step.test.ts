/** R0HEV5E3QT6G F29 T2 / F48 attempt 1 T4-T5, ledger silent-0033 / silent-0035. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card, strike } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [{ id: "SHADOW_STEP", type: "Skill", cost: 1 }] }, "cache");
const shadow = () => modelHandCard({ card_id: "SHADOW_STEP", playable: true, energy_cost: 1, target_type: "Self", upgraded: false,
  rules_text: "丢弃所有手牌。 在下个回合，你所有的攻击伤害翻倍。",
  resolved_rules_text: "丢弃所有手牌。 在下个回合，你所有的攻击伤害翻倍。",
  dynamic_values: [{ name: "Cards", base_value: 3, current_value: 3 }] }, 0, knowledge);
const step = (cardIndex: number, cardId: string) => ({ cardIndex, cardId, name: cardId, upgraded: false });

it("unupgraded Shadow Step draws nothing and leaves no discarded attack or block card playable", () => {
  const input = board().solver;
  input.hand = [shadow(), card(1, "DEFLECT", { type: "Skill", target: "self", cost: 0, block: 7 }), strike(2)];
  const plan = replaySteps(input, [step(0, "SHADOW_STEP")])!;
  expect(shadow().draw).toBe(0);
  expect(plan.outcome).toMatchObject({ cardsDrawn: 0, damageDealt: 0, blockGained: 0 });
  expect(replaySteps(input, [step(0, "SHADOW_STEP"), step(1, "DEFLECT")])).toBeNull();
});

it("discarded held curses stop costing HP, while potion slots remain usable", () => {
  const input = board().solver;
  input.enemies[0]!.attacks = [];
  input.hand = [shadow(), card(1, "REGRET", { type: "Curse", playable: false, heldHpLossPerCard: 1 }),
    card(-1, "TEST_POTION", { type: "Potion", target: "self", cost: 0, block: 5 })];
  const plan = replaySteps(input, [step(0, "SHADOW_STEP"), step(-1, "TEST_POTION")])!;
  expect(plan.outcome).toMatchObject({ hpLoss: 0, blockGained: 5 });
});

it("the delayed bonus doubles the next turn's attacks and then expires", () => {
  const input = board({ bossHp: 500 });
  input.solver.player.strengthNow = 1;
  input.playerPowers = { STRENGTH_POWER: 1 };
  input.solver.hand = [shadow()];
  const plan = replaySteps(input.solver, [step(0, "SHADOW_STEP")])!;
  input.plans = [plan];
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 12 }, (_, i) => strike(10 + i)), discard: [] };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const records = simulateFight(input, plan, 3, 1, false).records;
  expect(records[1]!.dmg).toBe(42); // Three attacks of (6 + 1) x 2.
  expect(records[2]!.dmg).toBe(21);
});

/** 10GPK5XGHCK3 F37 T8 / F48 T6/T12; ledger silent-0074/0076. Fixed data only. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [{ id: "CORROSIVE_WAVE", type: "Skill" }] }, "cache");
const wave = (upgraded = false) => modelHandCard({ card_id: "CORROSIVE_WAVE", playable: true, upgraded,
  energy_cost: 1, target_type: "Self", rules_text: "打出此牌后，你在本回合每抽到一张牌，就给予所有敌人{CorrosiveWave:diff()}层中毒。",
  dynamic_values: [{ name: "CorrosiveWave", base_value: 2, current_value: 2 }] }, 0, knowledge);
const draw = (count: number) => card(1, "BACKFLIP", { type: "Skill", target: "self", draw: count });
const step = (cardIndex: number, cardId: string) => ({ cardIndex, cardId, name: cardId, upgraded: false });

it("Wave adds the observed two and four poison after one and two draws, without unknown flat value", () => {
  for (const [initial, count] of [[7, 1], [4, 2]]) {
    const input = board().solver;
    input.enemies[0]!.poison = initial;
    input.player.drawable = 6;
    input.hand = [wave(), draw(count!)];
    const plan = replaySteps(input, [step(0, "CORROSIVE_WAVE"), step(1, "BACKFLIP")])!;
    expect(input.hand[0]).toMatchObject({ known: true, flatValue: 0 });
    expect(plan.outcome.damageDealt).toBe(initial! + 2 * count!);
    expect(plan.outcome.enemyHpAfter[0]!.poison).toBe(initial! + 2 * count! - 1);
  }
});

it("earlier draws, generated cards and an empty pile do not add Wave poison", () => {
  const input = board().solver;
  input.hand = [wave(), draw(2)];
  input.player.drawable = 6;
  expect(replaySteps(input, [step(1, "BACKFLIP"), step(0, "CORROSIVE_WAVE")])!.outcome.damageDealt).toBe(0);
  input.player.drawable = 0;
  expect(replaySteps(input, [step(0, "CORROSIVE_WAVE"), step(1, "BACKFLIP")])!.outcome.damageDealt).toBe(0);
  input.hand = [wave(), card(1, "TEST_ADD", { type: "Skill", target: "self", adds: [card(10, "TEST_NEW")] })];
  expect(replaySteps(input, [step(0, "CORROSIVE_WAVE"), step(1, "TEST_ADD")])!.outcome.damageDealt).toBe(0);
  expect(wave(true)).toMatchObject({ known: false, flatValue: 5 });
});

it("existing Wave and known sampled draws apply poison once per actual card", () => {
  const input = board().solver;
  input.player.corrosiveWave = 2;
  input.player.drawable = 1;
  input.hand = [{ ...draw(2), drawn: [card(10, "TEST_A")], draw: 1 }];
  const plan = replaySteps(input, [step(1, "BACKFLIP")])!;
  expect(plan.outcome.damageDealt).toBe(2);
  expect(plan.outcome.enemyHpAfter[0]!.poison).toBe(1);
});

it("the decision turn's Wave expires before later rollout draws", () => {
  const input = board();
  input.solver.player.corrosiveWave = 2;
  input.solver.enemies[0]!.attacks = [];
  input.solver.hand = [draw(2)];
  const plan = replaySteps(input.solver, [step(1, "BACKFLIP")])!;
  input.plans = [plan];
  input.options = { handSize: 1 };
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 12 }, (_, i) =>
    card(20 + i, "TEST_DRAW", { type: "Skill", target: "self", draw: 1 })), discard: [] };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  expect(simulateFight(input, plan, 2, 1, false).records.map((r) => r.dmg)).toEqual([4, 3]);
});

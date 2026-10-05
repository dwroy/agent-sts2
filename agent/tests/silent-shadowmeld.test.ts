/** 10GPK5XGHCK3 F42 T2/T7, 1HC609GTLGN3 F17 T8; upgraded: 2L1BNN9ZJEFU F48 T8, silent-0112. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card, defend } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [{ id: "SHADOWMELD", type: "Skill" }] }, "cache");
const meld = (upgraded = false) => modelHandCard({ card_id: "SHADOWMELD", playable: true, upgraded,
  energy_cost: upgraded ? 0 : 1, target_type: "Self", rules_text: "本回合你获得的格挡值翻倍。",
  dynamic_values: [{ name: "Power", base_value: 1, current_value: 1 }] }, 0, knowledge);
const step = (cardIndex: number, cardId: string) => ({ cardIndex, cardId, name: cardId, upgraded: false });

it("Shadowmeld doubles the observed later eight and thirteen Block gains without unknown flat value", () => {
  for (const block of [8, 13]) {
    const input = board().solver;
    input.player.block = 7;
    input.hand = [meld(), card(1, "SURVIVOR", { type: "Skill", target: "self", block })];
    const plan = replaySteps(input, [step(0, "SHADOWMELD"), step(1, "SURVIVOR")])!;
    expect(input.hand[0]).toMatchObject({ known: true, flatValue: 0 });
    expect(plan.outcome.blockGained).toBe(2 * block);
    expect(replaySteps(input, [step(1, "SURVIVOR"), step(0, "SHADOWMELD")])!.outcome.blockGained).toBe(block);
  }
});

it("does not double already printed Block again or gain Block without a later block card", () => {
  const input = board().solver;
  input.player.shadowmeldActive = true;
  input.hand = [meld(), card(1, "SURVIVOR", { type: "Skill", target: "self", block: 26 })];
  expect(replaySteps(input, [step(1, "SURVIVOR")])!.outcome.blockGained).toBe(26);
  expect(replaySteps(input, [step(0, "SHADOWMELD"), step(1, "SURVIVOR")])!.outcome.blockGained).toBe(26);
  expect(replaySteps(input, [step(0, "SHADOWMELD")])!.outcome.blockGained).toBe(0);
  expect(meld(true)).toMatchObject({ known: true, flatValue: 0, cost: 0, shadowmeld: true });
});

it("upgraded Shadowmeld reproduces 38 Block and four HP lost at 2L1BNN9ZJEFU F48 attempt 6 T8", () => {
  const input = board({ playerHp: 11 }).solver;
  input.enemies[0]!.attacks = [{ damage: 7, hits: 6 }];
  input.hand = [meld(true), card(1, "HAND_TRICK", { type: "Skill", target: "self", block: 12 }),
    card(2, "SURVIVOR", { type: "Skill", target: "self", block: 13 })];
  const plan = replaySteps(input, [step(1, "HAND_TRICK"), { ...step(0, "SHADOWMELD"), upgraded: true }, step(2, "SURVIVOR")])!;
  expect(plan.outcome).toMatchObject({ blockGained: 38, hpLoss: 4 });
  // Earlier Block stays unchanged; playing the buff after both cards creates no additional Block.
  expect(replaySteps(input, [step(1, "HAND_TRICK"), step(2, "SURVIVOR"), { ...step(0, "SHADOWMELD"), upgraded: true }])!
    .outcome.blockGained).toBe(25);
});

it("does not infer upgraded Shadowmeld from a missing or unobserved Power value", () => {
  for (const dynamic_values of [[], [{ name: "Power", base_value: 2, current_value: 2 }]]) {
    const model = modelHandCard({ card_id: "SHADOWMELD", upgraded: true, playable: true, energy_cost: 0,
      target_type: "Self", dynamic_values }, 0, knowledge);
    expect(model.shadowmeld).toBeUndefined();
    expect(model.known).toBe(false);
  }
});

it("the newly played buff expires before the next rollout turn", () => {
  const input = board();
  input.solver.enemies[0]!.attacks = [{ damage: 30, hits: 1 }];
  input.solver.hand = [meld(), card(1, "SURVIVOR", { type: "Skill", target: "self", block: 13 })];
  const plan = replaySteps(input.solver, [step(0, "SHADOWMELD"), step(1, "SURVIVOR")])!;
  input.plans = [plan];
  input.options = { handSize: 1 };
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 12 }, (_, i) => defend(10 + i)), discard: [] };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 30, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  expect(simulateFight(input, plan, 2, 1, false).records.map((r) => r.loss)).toEqual([4, 25]);
});

it("an already active decision buff does not suppress a fresh Shadowmeld next turn", () => {
  const input = board();
  input.solver.player.shadowmeldActive = true;
  input.solver.enemies[0]!.attacks = [{ damage: 30, hits: 1 }];
  input.solver.hand = [card(0, "SURVIVOR", { type: "Skill", target: "self", block: 26 })];
  const plan = replaySteps(input.solver, [step(0, "SURVIVOR")])!;
  input.plans = [plan];
  input.options = { handSize: 2 };
  input.piles = { handBase: input.solver.hand, draw: [{ ...meld(), index: 10, key: "c10" },
    card(11, "SURVIVOR", { type: "Skill", target: "self", block: 13 })], discard: [] };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 30, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  expect(simulateFight(input, plan, 2, 1, false).records.map((r) => r.loss)).toEqual([4, 4]);
});

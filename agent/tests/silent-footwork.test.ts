/** C48LLXBGKXQ9 F12 T2 / T082DRCUHRRD F23 T3, ledger silent-0026. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, defend } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [{ id: "FOOTWORK", type: "Power", cost: 1 }] }, "cache");
const footwork = (amount: number) => modelHandCard({ card_id: "FOOTWORK", playable: true, energy_cost: 1,
  target_type: "Self", upgraded: amount === 3,
  dynamic_values: [{ name: "DexterityPower", base_value: amount, current_value: amount }] }, 0, knowledge);
const step = (cardIndex: number, cardId: string) => ({ cardIndex, cardId, name: cardId, upgraded: false });

it("new Dexterity only raises block cards played after Footwork, for both observed amounts", () => {
  for (const amount of [2, 3]) {
    const input = board().solver;
    input.hand = [footwork(amount), defend(1), defend(2)];
    const plan = replaySteps(input, [step(1, "DEFEND"), step(0, "FOOTWORK"), step(2, "DEFEND")])!;
    expect(plan.outcome.blockGained).toBe(10 + amount);
  }
});

it("new Dexterity persists into later rollout turns and is not added twice to existing Dexterity", () => {
  const input = board();
  input.solver.hand = [footwork(2), defend(1)];
  const plan = replaySteps(input.solver, [step(0, "FOOTWORK"), step(1, "DEFEND")])!;
  input.plans = [plan];
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 12 }, (_, i) => defend(10 + i)), discard: [] };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 21, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const records = simulateFight(input, plan, 3, 1, false).records;
  expect(records[0]!.snap.pw.DEXTERITY_POWER).toBe(2);
  expect(records[1]!.loss).toBe(0); // Three Defends each give seven block.
  expect(records[2]!.loss).toBe(0);

  input.playerPowers = { DEXTERITY_POWER: 2 };
  input.solver.hand = [defend(0)];
  input.plans = [replaySteps(input.solver, [])!];
  input.piles.handBase = input.solver.hand;
  const existing = simulateFight(input, input.plans[0]!, 2, 1, false).records;
  expect(existing[1]!.loss).toBe(0);
  expect(existing[1]!.snap.pw.DEXTERITY_POWER).toBe(2);
});

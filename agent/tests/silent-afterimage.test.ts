/** LRN0HPZ0FZS1 F48 T1/T2/T3, ledger silent-0022 / silent-0023. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card, defend } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [{ id: "AFTERIMAGE", type: "Power", cost: 1 }] }, "cache");
const image = () => modelHandCard({ card_id: "AFTERIMAGE", playable: true, energy_cost: 1, target_type: "Self",
  dynamic_values: [{ name: "AfterimagePower", base_value: 1, current_value: 1 }] }, 0, knowledge);
const step = (cardIndex: number, cardId: string, target?: number) => ({ cardIndex, cardId, name: cardId, upgraded: false, target });

it("Afterimage does not trigger itself, then grants block for skills and every replayed attack", () => {
  const input = board().solver;
  input.hand = [image(), defend(1), card(2, "FLICK_FLACK", { replay: 1 })];
  const own = replaySteps(input, [step(0, "AFTERIMAGE")])!;
  expect(own.outcome.blockGained).toBe(0);
  const line = replaySteps(input, [step(0, "AFTERIMAGE"), step(1, "DEFEND"), step(2, "FLICK_FLACK", 0)])!;
  expect(line.outcome.blockGained).toBe(8); // Five printed block, three triggers.
});

it("an already active Afterimage grants one block per card but no block for a potion", () => {
  const input = board().solver;
  input.player.afterImage = 1;
  input.hand = [card(-1, "TEST_POTION", { type: "Potion", target: "self", cost: 0 }), defend(1)];
  expect(replaySteps(input, [step(-1, "TEST_POTION"), step(1, "DEFEND")])!.outcome.blockGained).toBe(6);
});

it("Afterimage persists into later turns in the rollout", () => {
  const input = board();
  input.solver.hand = [image()];
  const plan = replaySteps(input.solver, [step(0, "AFTERIMAGE")])!;
  input.plans = [plan];
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 12 }, (_, i) => defend(10 + i)), discard: [] };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 18, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const records = simulateFight(input, plan, 3, 1, false).records;
  expect(records[0]!.snap.pw.AFTERIMAGE_POWER).toBe(1);
  expect(records[1]!.loss).toBe(0);
  expect(records[2]!.loss).toBe(0);
});

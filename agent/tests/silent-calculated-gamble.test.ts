/** T082DRCUHRRD F27 T1 / F9PP859XZ3RJ A4 F37 T2, learner ledger silent-0081. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { board, card, defend, strike } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [{ id: "CALCULATED_GAMBLE", type: "Skill", cost: 0, keywords: ["Exhaust"] }] }, "cache");
const gamble = () => modelHandCard({ card_id: "CALCULATED_GAMBLE", playable: true, energy_cost: 0, target_type: "Self",
  upgraded: false, rules_text: "丢弃你的所有手牌, 然后抽相同数量的牌。", dynamic_values: [] }, 0, knowledge);
const step = (cardIndex: number, cardId: string, target?: number) => ({ cardIndex, cardId, name: cardId, upgraded: false, target });

it("Calculated Gamble removes the old hand before drawing its actual size, excluding potion slots", () => {
  const input = board().solver;
  input.hand = [gamble(), defend(1), card(2, "NOXIOUS_FUMES", { type: "Power", target: "self", poisonPerTurn: 3 }),
    card(-1, "TEST_POTION", { type: "Potion", target: "self", cost: 0, block: 7 })];
  expect(input.hand[0]).toMatchObject({ known: true, flatValue: 0, discardsHand: true, drawDiscardedHand: true });
  expect(replaySteps(input, [step(0, "CALCULATED_GAMBLE"), step(1, "DEFEND")])).toBeNull();
  expect(replaySteps(input, [step(0, "CALCULATED_GAMBLE"), step(2, "NOXIOUS_FUMES")])).toBeNull();
  const plan = replaySteps(input, [step(0, "CALCULATED_GAMBLE"), step(-1, "TEST_POTION")])!;
  expect(plan.outcome).toMatchObject({ cardsDrawn: 2, blockGained: 7 });
  expect(plan.steps[0]!.discards).toEqual(["DEFEND", "NOXIOUS_FUMES"]);
  input.knownTop = [strike(600), defend(601)];
  expect(replaySteps(input, [step(0, "CALCULATED_GAMBLE"), step(600, "STRIKE", 0)])!.outcome)
    .toMatchObject({ cardsDrawn: 2, damageDealt: 6, blockGained: 0 });
});

it("replacement draws count the remaining hand at play time, including unplayable held cards", () => {
  const input = board().solver;
  input.hand = [gamble(), defend(1), card(2, "REGRET", { type: "Curse", playable: false, heldHpLossPerCard: 1 })];
  const plan = replaySteps(input, [step(1, "DEFEND"), step(0, "CALCULATED_GAMBLE")])!;
  expect(plan.outcome).toMatchObject({ cardsDrawn: 1, blockGained: 5, hpLoss: 5 });
  expect(plan.steps[1]!.discards).toEqual(["REGRET"]);
});

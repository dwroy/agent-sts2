/** C48LLXBGKXQ9 F24 T1 / HUVEPWQAHWFU F35 T2; ledger silent-0202, independent mechanic silent-0203. */
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { board, strike } from "./boss-sim-fixture.js";

const rows = JSON.parse(readFileSync(new URL("./silent-metamorphosis-state.json", import.meta.url), "utf8")) as
  { run: string; card: Record<string, unknown> }[];
const knowledge = makeKnowledge({ cards: [{ id: "METAMORPHOSIS", type: "Skill", cost: 2 }] }, "cache");
const step = { cardIndex: 0, cardId: "METAMORPHOSIS", name: "羽化", upgraded: false };

it.each(rows)("$run: generated attacks are not three immediate draws", ({ card }) => {
  const model = modelHandCard({ ...card, index: 0 }, 0, knowledge, "silent");
  const input = board().solver;
  input.hand = [model];
  const plan = replaySteps(input, [step])!;
  expect(model).toMatchObject({ draw: 0, known: false });
  expect(model.adds).toBeUndefined();
  expect(plan.outcome).toMatchObject({ cardsDrawn: 0, damageDealt: 0, blockGained: 0 });
});

it("rollout does not play the existing draw pile as if Metamorphosis drew it", () => {
  const input = board({ bossHp: 500 });
  input.solver.hand = [modelHandCard({ ...rows[1]!.card, index: 0 }, 0, knowledge, "silent")];
  const plan = replaySteps(input.solver, [step])!;
  input.plans = [plan];
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 12 }, (_, i) => strike(10 + i)), discard: [] };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  expect(simulateFight(input, plan, 2, 1, false).records[0]!.dmg).toBe(0);
});

it("preserves the Ironclad model and unrelated immediate draw cards", () => {
  expect(modelHandCard(rows[1]!.card, 0, knowledge, "ironclad").draw).toBe(3);
  const drawKnowledge = makeKnowledge({ cards: [{ id: "ACROBATICS", type: "Skill", cost: 1 }] }, "cache");
  expect(modelHandCard({ card_id: "ACROBATICS", playable: true, energy_cost: 1,
    rules_text: "抽{Cards}张牌。", dynamic_values: [{ name: "Cards", base_value: 3, current_value: 3 }] },
  0, drawKnowledge, "silent").draw).toBe(3);
});

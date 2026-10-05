/** ZZMYZ5UBCG72 F48 T2 and Y6GM2CHWJBEY F5 T2; ledger silent-0066. Fixed data only. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [{ id: "EXPOSE", type: "Skill", keywords: ["Exhaust"] }] }, "cache");
const expose = (upgraded = false, power: number | null = 2) => modelHandCard({
  index: 0, card_id: "EXPOSE", name: "暴露", upgraded, energy_cost: 0, playable: true,
  target_type: "AnyEnemy", requires_target: true, valid_target_indices: [0],
  rules_text: "去除敌人身上的所有格挡值和人工制品。 并给予{Power:diff()}层易伤。",
  resolved_rules_text: "去除敌人身上的所有格挡值和人工制品。 并给予2层易伤。 消耗。",
  dynamic_values: power === null ? [] : [{ name: "Power", base_value: power, current_value: power }],
}, 0, knowledge);
const step = (cardIndex: number, cardId: string) => ({ cardIndex, cardId, name: cardId, upgraded: false, target: 0 });

it("observed Expose Power adds two Vulnerable before Neutralize and removes unknown flat value", () => {
  const input = board({ bossHp: 155 }).solver;
  input.hand = [expose(), card(1, "NEUTRALIZE", { cost: 0, damage: 4, weak: 2, upgraded: true })];
  const exposed = replaySteps(input, [step(0, "EXPOSE"), step(1, "NEUTRALIZE")])!;
  expect(input.hand[0]).toMatchObject({ vulnerable: 2, known: true, flatValue: 0 });
  expect(exposed.outcome.damageDealt).toBe(6);
  expect(exposed.outcome.enemyHpAfter[0]!.hp).toBe(149);
  // The bonus belongs to attacks after the application, not attacks earlier in the sequence.
  expect(replaySteps(input, [step(1, "NEUTRALIZE"), step(0, "EXPOSE")])!.outcome.damageDealt).toBe(4);
});

it("does not infer an upgrade, a missing Power or another skill's ambiguous Power", () => {
  for (const entry of [expose(true), expose(false, null)]) {
    expect(entry).toMatchObject({ vulnerable: 0, known: false, flatValue: 3 });
  }
  expect(modelHandCard({ card_id: "TEST_UNKNOWN", energy_cost: 0,
    dynamic_values: [{ name: "Power", current_value: 2 }] }, 0,
  makeKnowledge({ cards: [{ id: "TEST_UNKNOWN", type: "Skill" }] }, "cache")))
    .toMatchObject({ vulnerable: 0, known: false, flatValue: 3 });
});

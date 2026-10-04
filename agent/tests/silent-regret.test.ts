/** R0HEV5E3QT6G F48 attempt 3 T3, ledger silent-0032 / silent-0034. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps, solveTurn } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [{ id: "REGRET", type: "Curse", cost: -1 }] }, "cache");
const regret = () => modelHandCard({ card_id: "REGRET", playable: false, energy_cost: -1,
  resolved_rules_text: "在你的回合结束时，如果这张牌在你的手牌中，失去相当于手牌数量的生命。" }, 0, knowledge);

it("five held cards cost five HP before the 36 attack and make ending at 41 HP lethal", () => {
  const input = board().solver;
  input.player.hp = 41;
  input.player.block = 0;
  input.enemies[0]!.attacks = [{ damage: 36, hits: 1 }];
  input.hand = [regret(), ...Array.from({ length: 4 }, (_, i) => card(i + 1, "DEFEND", { type: "Skill", target: "self", block: 5 }))];
  const end = replaySteps(input, [])!;
  expect(end.outcome).toMatchObject({ hpLoss: 41, hpAfter: 0, dies: true });
  const played = replaySteps(input, [{ cardIndex: 1, cardId: "DEFEND", name: "DEFEND", upgraded: false }])!;
  expect(played.outcome.hpLoss).toBe(35); // Four cards held and five block.
});

it("held potion slots do not count, block cannot stop Regret, and a won fight has no held loss", () => {
  const input = board().solver;
  input.player.block = 100;
  input.hand = [regret(), card(-1, "TEST_POTION", { type: "Potion", playable: false }), card(1, "STRIKE", { damage: 100 })];
  expect(replaySteps(input, [])!.outcome.hpLoss).toBe(2);
  input.enemies[0]!.hp = 1;
  const win = solveTurn(input).plans.find((p) => p.outcome.winsFight)!;
  expect(win.outcome.hpLoss).toBe(0);
});

/** 1NZ8FE5F34R9 A4 F29 T2/T3, learner ledger silent-0078 / silent-0080. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, defend } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [{ id: "ANTICIPATE", type: "Skill", cost: 0 }] }, "cache");
const anticipate = () => modelHandCard({ card_id: "ANTICIPATE", name: "预判", playable: true, energy_cost: 0,
  target_type: "Self", upgraded: false, resolved_rules_text: "在本回合获得2点敏捷。",
  dynamic_values: [{ name: "DexterityPower", base_value: 2, current_value: 2 }] }, 0, knowledge);
const step = (cardIndex: number, cardId: string) => ({ cardIndex, cardId, name: cardId, upgraded: false });

it("Anticipate raises only later card block by two, with no unknown-skill bonus or change to held block", () => {
  const input = board().solver;
  input.player.block = 11;
  input.hand = [anticipate(), defend(1), defend(2)];
  expect(input.hand[0]).toMatchObject({ known: true, flatValue: 0, temporaryDexterity: 2 });
  expect(input.hand[0]!.dexterity).toBeUndefined();
  const plan = replaySteps(input, [step(1, "DEFEND"), step(0, "ANTICIPATE"), step(2, "DEFEND")])!;
  expect(plan.outcome.blockGained).toBe(12); // Five before, seven after; eleven already held is unchanged.
});

it("new and already observed Anticipate both expire before the next rollout turn", () => {
  for (const observed of [false, true]) {
    const input = board();
    input.solver.hand = observed ? [{ ...defend(1), block: 7 }] : [anticipate(), defend(1)];
    const plan = replaySteps(input.solver, observed ? [step(1, "DEFEND")] : [step(0, "ANTICIPATE"), step(1, "DEFEND")])!;
    input.plans = [plan];
    input.playerPowers = observed ? { DEXTERITY_POWER: 2, ANTICIPATE_POWER: 2 } : {};
    input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 12 }, (_, i) => defend(10 + i)), discard: [] };
    input.tables.TEST_BOSS = { moves: { HIT: { damage: 21, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const records = simulateFight(input, plan, 3, 1, false).records;
    expect(records[0]!.snap.pw.DEXTERITY_POWER).toBe(2);
    expect(records[1]!.loss).toBe(6); // Three Defends give fifteen, not twenty-one, after expiry.
    expect(records[1]!.snap.pw.DEXTERITY_POWER).toBeUndefined();
    expect(records[1]!.snap.pw.ANTICIPATE_POWER).toBeUndefined();
    expect(records[2]!.loss).toBe(6);
  }
});

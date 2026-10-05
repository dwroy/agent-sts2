/** 1NZ8FE5F34R9 F29 T2/T3; upgraded: 75X1BARMNZ03 F17 T2 / 2L1BNN9ZJEFU F48 T5, silent-0113. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card, defend } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [{ id: "ANTICIPATE", type: "Skill", cost: 0 }] }, "cache");
const anticipate = (upgraded = false) => modelHandCard({ card_id: "ANTICIPATE", name: upgraded ? "预判+" : "预判", playable: true, energy_cost: 0,
  target_type: "Self", upgraded, resolved_rules_text: `在本回合获得${upgraded ? 4 : 2}点敏捷。`,
  dynamic_values: [{ name: "DexterityPower", base_value: upgraded ? 4 : 2, current_value: upgraded ? 4 : 2 }] }, 0, knowledge);
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
  for (const upgraded of [false, true]) for (const observed of [false, true]) {
    const dexterity = upgraded ? 4 : 2;
    const input = board();
    input.solver.hand = observed ? [{ ...defend(1), block: 5 + dexterity }] : [anticipate(upgraded), defend(1)];
    const plan = replaySteps(input.solver, observed ? [step(1, "DEFEND")] : [step(0, "ANTICIPATE"), step(1, "DEFEND")])!;
    input.plans = [plan];
    input.playerPowers = observed ? { DEXTERITY_POWER: dexterity, ANTICIPATE_POWER: dexterity } : {};
    input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 12 }, (_, i) => defend(10 + i)), discard: [] };
    input.tables.TEST_BOSS = { moves: { HIT: { damage: 21, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const records = simulateFight(input, plan, 3, 1, false).records;
    expect(records[0]!.snap.pw.DEXTERITY_POWER).toBe(dexterity);
    expect(records[1]!.loss).toBe(6); // Three Defends give fifteen, not twenty-one, after expiry.
    expect(records[1]!.snap.pw.DEXTERITY_POWER).toBeUndefined();
    expect(records[1]!.snap.pw.ANTICIPATE_POWER).toBeUndefined();
    expect(records[2]!.loss).toBe(6);
  }
});

it("upgraded Anticipate reproduces 21 Block instead of thirteen at 75X1BARMNZ03 F17 T2", () => {
  const input = board({ playerHp: 68 }).solver;
  input.player.energy = 4;
  input.enemies[0]!.attacks = [{ damage: 18, hits: 1 }];
  input.hand = [anticipate(true), defend(1), card(2, "POISONED_STAB", { damage: 6, poison: 3 }),
    card(3, "STRIKE_SILENT", { damage: 6 }), card(4, "SURVIVOR", { type: "Skill", target: "self", block: 8 })];
  const plan = replaySteps(input, [{ ...step(0, "ANTICIPATE"), upgraded: true }, step(1, "DEFEND"),
    { ...step(2, "POISONED_STAB"), target: 0 }, { ...step(3, "STRIKE_SILENT"), target: 0 }, step(4, "SURVIVOR")])!;
  expect(plan.outcome).toMatchObject({ blockGained: 21, hpLoss: 0 });
  expect(input.hand[0]).toMatchObject({ known: true, flatValue: 0, temporaryDexterity: 4 });
  expect(input.hand[0]!.dexterity).toBeUndefined();
});

it("upgraded Anticipate after both Defends preserves fourteen Block at 2L1BNN9ZJEFU F48 attempt 6 T5", () => {
  const input = board().solver;
  input.player.dexterityNow = 2;
  input.hand = [anticipate(true), { ...defend(1), block: 7 }, { ...defend(2), block: 7 }];
  expect(replaySteps(input, [step(1, "DEFEND"), step(2, "DEFEND"), { ...step(0, "ANTICIPATE"), upgraded: true }])!
    .outcome.blockGained).toBe(14);
});

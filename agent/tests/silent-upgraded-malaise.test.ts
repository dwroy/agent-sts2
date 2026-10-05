/** LLYSRQQ35AVW SILENT A8 F33 T3 / F38 T1 / F48 T2, ledger silent-0144. Fixed raw projections. */
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card, strike } from "./boss-sim-fixture.js";

const frames = JSON.parse(readFileSync(new URL("./silent-upgraded-malaise-cards.json", import.meta.url), "utf8"));
const knowledge = makeKnowledge({ cards: [{ id: "MALAISE", type: "Skill", keywords: ["Exhaust"] }] }, "cache");
const malaise = (frame = 0) => modelHandCard(frames[frame].card, 0, knowledge, "SILENT");
const step = (cardIndex: number) => ({ cardIndex, cardId: "MALAISE", name: "萎靡+", upgraded: true, target: 0 });
const power = (enemy: { powers: { power_id: string; amount: number }[] }, id: string) =>
  enemy.powers.find((p) => p.power_id === id)?.amount ?? 0;

it("the observed zero, two and three energy casts apply one, three and four lasting debuffs", () => {
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const input = board().solver;
    input.hand = [malaise(i)];
    input.player.energy = frame.energy;
    input.enemies[0]!.weak = power(frame.beforeEnemy, "WEAK_POWER");
    const plan = replaySteps(input, [step(input.hand[0]!.index)])!;
    expect(input.hand[0]).toMatchObject({ special: "malaise", known: true, flatValue: 0, malaiseBonus: 1 });
    expect(plan.outcome.energyLeft).toBe(0);
    expect(plan.outcome.enemyHpAfter[0]).toMatchObject({
      weak: power(frame.afterEnemy, "WEAK_POWER"),
      strengthGained: power(frame.afterEnemy, "STRENGTH_POWER") - power(frame.beforeEnemy, "STRENGTH_POWER"),
    });
  }
});

it("the bonus uses energy remaining when the upgraded card is played", () => {
  const input = board({ bossHp: 10_000 }).solver;
  input.hand = [malaise(1), strike(2)];
  input.player.energy = 3;
  const plan = replaySteps(input, [{ cardIndex: 2, cardId: "STRIKE", name: "STRIKE", upgraded: false, target: 0 }, step(input.hand[0]!.index)])!;
  expect(plan.outcome.energyLeft).toBe(0);
  expect(plan.outcome.enemyHpAfter[0]).toMatchObject({ weak: 3, strengthGained: -3 });
});

it("the upgraded zero-energy debuff persists into later rollout turns", () => {
  const input = board({ bossHp: 10_000 });
  input.solver.hand = [malaise()];
  input.solver.player.energy = 0;
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 10, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const plan = replaySteps(input.solver, [step(input.solver.hand[0]!.index)])!;
  input.plans = [plan];
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 12 }, (_, i) => card(10 + i, "TEST_JUNK", { type: "Status", playable: false })), discard: [] };
  const records = simulateFight(input, plan, 3, 1, false).records;
  expect(records).toHaveLength(3);
  for (const record of records) expect(record.snap.E[0]![9].STRENGTH_POWER).toBe(-1);
});

it("keeps Ironclad, missing context and unobserved upgrade text unchanged", () => {
  for (const character of ["IRONCLAD", ""]) {
    expect(modelHandCard(frames[0].card, 0, knowledge, character)).toMatchObject({ special: null, known: false, flatValue: 3 });
  }
  expect(modelHandCard({ ...frames[0].card, resolved_rules_text: "敌人失去X+2点力量。给予X+2层虚弱。" }, 0, knowledge, "SILENT"))
    .toMatchObject({ special: null, known: false, flatValue: 3 });
});

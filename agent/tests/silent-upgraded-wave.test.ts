/** 2PVLGRBGUX9S SILENT A7 F48 first attempt T11, ledger silent-0076/0137. Fixed raw-card projections. */
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

const fixture = JSON.parse(readFileSync(new URL("./silent-upgraded-wave-card.json", import.meta.url), "utf8"));
const knowledge = makeKnowledge({ cards: [{ id: "CORROSIVE_WAVE", type: "Skill" }, { id: "BACKFLIP", type: "Skill" }] }, "cache");
const wave = () => modelHandCard(fixture.card, 1, knowledge);
const backflip = () => modelHandCard(fixture.backflip, 3, knowledge);
const step = (index: number, id: string) => ({ cardIndex: index, cardId: id, name: id, upgraded: id === "CORROSIVE_WAVE" });

it("F48 T11 upgraded Wave and two draws produce 42 poison damage from the observed 36", () => {
  const input = board({ bossHp: 212 }).solver;
  input.enemies[0]!.poison = 36;
  input.enemies[0]!.attacks = [];
  input.player.drawable = 2;
  input.hand = [wave(), backflip()];
  const plan = replaySteps(input, [step(1, "CORROSIVE_WAVE"), step(3, "BACKFLIP")])!;
  expect(wave()).toMatchObject({ known: true, flatValue: 0, corrosiveWave: 3 });
  expect(plan.outcome.damageDealt).toBe(42);
  expect(plan.outcome.enemyHpAfter[0]).toMatchObject({ hp: 170, poison: 41 });
});

it("the upgrade adds no poison for earlier draws, no draws, or generated cards", () => {
  const input = board().solver;
  input.player.drawable = 2;
  input.hand = [wave(), backflip()];
  expect(replaySteps(input, [step(3, "BACKFLIP"), step(1, "CORROSIVE_WAVE")])!.outcome.damageDealt).toBe(0);
  input.player.drawable = 0;
  expect(replaySteps(input, [step(1, "CORROSIVE_WAVE"), step(3, "BACKFLIP")])!.outcome.damageDealt).toBe(0);
  input.hand = [wave(), card(3, "TEST_GENERATE", { type: "Skill", target: "self", adds: [card(10, "TEST_NEW")] })];
  expect(replaySteps(input, [step(1, "CORROSIVE_WAVE"), step(3, "TEST_GENERATE")])!.outcome.damageDealt).toBe(0);
});

it("three-layer Wave expires before later rollout draws and does not create permanent poison per draw", () => {
  const input = board({ bossHp: 212 });
  input.solver.enemies[0]!.poison = 36;
  input.solver.enemies[0]!.attacks = [];
  input.solver.player.drawable = 2;
  input.solver.hand = [wave(), backflip()];
  const plan = replaySteps(input.solver, [step(1, "CORROSIVE_WAVE"), step(3, "BACKFLIP")])!;
  input.plans = [plan];
  input.piles = { handBase: input.solver.hand, draw: Array.from({ length: 10 }, (_, i) =>
    card(10 + i, "TEST_DRAW", { type: "Skill", target: "self", draw: 1 })), discard: [] };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  input.options = { handSize: 1 };
  expect(simulateFight(input, plan, 2, 1, false).records.map((record) => record.dmg)).toEqual([42, 41]);
});

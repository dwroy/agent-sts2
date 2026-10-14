import { expect, it } from "vitest";
import { board } from "./boss-sim-fixture.js";
import { fightSample, slimInput } from "../src/sim/boss-sim.js";
import { marginOf } from "../src/sim/boss-margin.js";

function passive(hp: number, retaliation: number, startDamage: number) {
  const input = board({ bossHp: hp, playerHp: 56 });
  input.solver.hand = [];
  input.piles = { draw: [], discard: [], handBase: [] };
  input.solver.player.retaliate = retaliation;
  input.solver.player.turnStartAoe = startDamage;
  input.playerPowers.THORNS_POWER = retaliation;
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 1, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  return input;
}

it("counts actual retaliation HP removal in S, without changing legacy outcomes or action statistics", () => {
  const input = passive(3, 3, 0);
  const old = fightSample(slimInput(input), null, 7);
  const measured = fightSample(slimInput({ ...input, captureBossMargin: true }), null, 7);
  const { bossMargin, ...unchanged } = measured;
  expect(unchanged).toEqual(old);
  expect(measured.won).toBe(true);
  expect(bossMargin?.outgoingHp).toBe(3);
  expect(marginOf(measured)).toBeGreaterThan(0);
  // The old action-only metric is deliberately not repurposed for a new ranking.
  expect(measured.dmgByTurn).toEqual([0]);
});

it("caps retaliation at applied HP loss instead of counting the uncapped requested effect", () => {
  const measured = fightSample(slimInput({ ...passive(2, 9, 0), captureBossMargin: true }), null, 7);
  expect(measured.won).toBe(true);
  expect(measured.bossMargin?.outgoingHp).toBe(2);
});

it.each([3, 9])("counts a terminal start-of-turn carry once, including a multi-turn window (HP %i)", (hp) => {
  const input = passive(hp, 0, 3);
  const old = fightSample(slimInput(input), null, 7);
  const measured = fightSample(slimInput({ ...input, captureBossMargin: true }), null, 7);
  const { bossMargin, ...unchanged } = measured;
  expect(unchanged).toEqual(old);
  expect(measured.won).toBe(true);
  expect(bossMargin?.outgoingHp).toBe(hp);
  expect(marginOf(measured)).toBeGreaterThan(0);
  expect(measured.dmgByTurn.reduce((a, b) => a + b, 0)).toBe(hp - 3);
});

it("retains unknown target attribution instead of using extra accounted damage to bypass the gate", () => {
  const input = passive(3, 3, 0);
  input.enemies[0]!.powers = { MINION_POWER: 1 };
  const measured = fightSample(slimInput({ ...input, captureBossMargin: true }), null, 7);
  expect(measured.bossMargin?.reference.unknown).toContain("damage_to_minions_not_separately_attributed");
  expect(marginOf(measured)).toBeNull();
});

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { rolloutDecision, simulateFight, type RolloutInput } from "../src/reflex/rollout.js";
import { boardRolloutInput } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, solveTurn, type SolverInput } from "../src/reflex/turn-solver.js";
import { slimInput } from "../src/sim/boss-sim.js";
import type { GameState } from "../src/hand/mod/schema.js";
import type { Knowledge } from "../src/knowledge/index.js";

// Own first-tune 9TG1RP5LFAAK F33 T7 final settled frame; source offset/SHA live in the fixture.
const fixture = JSON.parse(readFileSync(new URL("./fixtures/silent-crab-poison-rage-tune.json", import.meta.url), "utf8"));
const input = () => structuredClone(fixture.input) as RolloutInput;
afterEach(() => { solveTap.onSolve = null; });

function nextBoard(value: RolloutInput, mode: "whole" | "five") {
  const empty = replaySteps(value.solver, [])!;
  expect(empty).not.toBeNull();
  const captured: SolverInput[] = [];
  solveTap.onSolve = solver => { if (solver.turn === (value.solver.turn ?? 1) + 1) { const { deadlineNow: _clock, ...snapshot } = solver; captured.push(structuredClone(snapshot)); } };
  try {
    if (mode === "whole") simulateFight(slimInput(value), empty, 2, 1);
    else rolloutDecision({ ...value, plans: [empty], options: { horizon: 2, samples: 1, k: 1, seed: 1, budgetMs: 1e9 } });
  } finally { solveTap.onSolve = null; }
  expect(captured.length).toBeGreaterThan(0);
  return captured;
}

describe.each(["whole", "five"] as const)("Silent A10 poison Rage carry in %s", mode => {
  it("retains the observed new 99 Block after the enemy-turn poison kill", () => {
    const value = input();
    expect(value.observedSilentCrabPoisonRageCarry).toBe(true);
    const before = JSON.stringify(value);
    for (const next of nextBoard(value, mode)) {
      expect(next.enemies).toHaveLength(1);
      expect(next.enemies[0]).toMatchObject({ index: 0, hp: 103, block: 99 });
    }
    expect(JSON.stringify(value)).toBe(before);
  });

  it.each(["disabled", "A9", "wrong-act", "wrong-hp", "no-rage", "other-move", "no-poison"])(
    "preserves the old transition outside the observed signature: %s", reason => {
      const value = input();
      if (reason === "disabled") delete value.observedSilentCrabPoisonRageCarry;
      if (reason === "A9") value.meta.asc = 9;
      if (reason === "wrong-act") value.meta.act = 3;
      if (reason === "wrong-hp") value.solver.enemies[1]!.maxHp = 208;
      if (reason === "no-rage") value.enemies[0]!.powers["CRAB_RAGE_POWER"] = 0;
      if (reason === "other-move") value.enemies[0]!.move = "THRASH_MOVE";
      if (reason === "no-poison") value.solver.enemies[1]!.poison = 0;
      for (const next of nextBoard(value, mode)) expect(next.enemies.find(e => e.index === 0)?.block).toBe(0);
    });
});

it.each(["whole", "five"] as const)("does not carry earlier player-card Rage across the reset in %s", mode => {
  const value = input();
  const strike = { ...value.solver.hand[0]!, index: 0, key: "test-direct-kill", cardId: "TEST_CRAB_DIRECT_KILL", name: "Test",
    cost: 0, xCost: false, type: "Attack" as const, damage: 100, hits: 1, block: 0, poison: 0, weak: 0, vulnerable: 0,
    draw: 0, special: null, target: "single" as const, validTargets: [1], playable: true, known: true };
  value.solver.hand = [strike]; value.solver.player.energy = 3; value.piles.handBase = [strike];
  const plan = solveTurn(value.solver).plans.find(p => p.steps.some(s => s.cardId === "TEST_CRAB_DIRECT_KILL"))!;
  expect(plan).toBeDefined();
  const captured: SolverInput[] = [];
  solveTap.onSolve = solver => { if (solver.turn === 8) { const { deadlineNow: _clock, ...snapshot } = solver; captured.push(structuredClone(snapshot)); } };
  try {
    if (mode === "whole") simulateFight(slimInput(value), plan, 2, 1);
    else rolloutDecision({ ...value, plans: [plan], options: { horizon: 2, samples: 1, k: 1, seed: 1, budgetMs: 1e9 } });
  } finally { solveTap.onSolve = null; }
  expect(captured[0]?.enemies[0]?.block).toBe(0);
});

it.each(["whole", "five"] as const)("expires carried block normally on the following enemy turn in %s", mode => {
  const value = input(), following = nextBoard(value, "whole")[0]!;
  value.solver = following;
  value.enemies = [{ ...value.enemies[0]!, move: "BUG_STING_MOVE", strength: 9,
    powers: { ...value.enemies[0]!.powers, CRAB_RAGE_POWER: 0 } }];
  expect(nextBoard(value, mode)[0]!.enemies[0]!.block).toBe(0);
});

it.each(["SILENT", "IRONCLAD"])("certifies only the observed character in board construction: %s", character => {
  const value = input();
  const enemies = ["CRUSHER", "ROCKET"].map((id, i) => ({ index: i, enemy_id: id, move_id: i ? "PRECISION_BEAM_MOVE" : "ENLARGING_STRIKE_MOVE",
    max_hp: i ? 209 : 219, current_hp: i ? 26 : 125, is_alive: true, powers: [{ power_id: "CRAB_RAGE_POWER", amount: 1 }] }));
  const state = { raw: { combat: { enemies, player: { powers: [] } } },
    run: { raw: { character_id: character, relics: [], deck: [], potions: [] } } } as unknown as GameState;
  const knowledge = { card: () => null } as unknown as Knowledge;
  expect(boardRolloutInput(state, knowledge, value.solver, 10, {}, {}).observedSilentCrabPoisonRageCarry === true)
    .toBe(character === "SILENT");
});

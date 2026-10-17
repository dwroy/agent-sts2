import { describe, expect, it } from "vitest";
import { simulateFight, type RolloutInput } from "../src/reflex/rollout.js";
import { solveTurn } from "../src/reflex/turn-solver.js";
import { board } from "./boss-sim-fixture.js";

// Command-fingerprint windows: 25226ZFLNR1J T3/T6, UMVLWER4CD98 T9,
// RMNXHZKV716Y T12; original offsets and SHA in H0/r3 intensity-evidence.json.
// Empty piles isolate the enemy buff; they are synthetic test controls.
function transition(turn: number, enabled = true, asc = 10, scripts = true, strength = 4, id = "AEONGLASS") {
  const input = board({ playerHp: 500, bossHp: 535, tables: {
    [id]: {
      moves: { INCREASING_INTENSITY_MOVE: { damage: 0, hits: 0, strength, block: 0 },
        EBB_MOVE: { damage: 26, hits: 1, strength: 0, block: 0 } },
      next: { INCREASING_INTENSITY_MOVE: { EBB_MOVE: 1 }, EBB_MOVE: { EBB_MOVE: 1 } },
    },
  } });
  input.meta = { ...input.meta, t: turn, asc, enc: id };
  (input as RolloutInput & { observedSilentAeonglassIntensity?: boolean }).observedSilentAeonglassIntensity = enabled;
  input.solver = { ...input.solver, turn, hand: [],
    player: { ...input.solver.player, hp: 500, maxHp: 500 },
    enemies: [{ ...input.solver.enemies[0]!, attacks: [], hp: 535, maxHp: 535 }] };
  input.enemies = [{ index: 0, id, move: "INCREASING_INTENSITY_MOVE", strength: 4,
    powers: { WITHERING_PRESENCE_POWER: 6 } }];
  input.piles = { draw: [], discard: [], handBase: [] };
  const noAction = solveTurn(input.solver).plans.find(plan => plan.steps.length === 0)!;
  return simulateFight(input, noAction, 2, 7, scripts).records;
}

describe("observed Silent A10 Aeonglass Intensity", () => {
  it("carries each measured buff into the next turn's attack", () => {
    for (const [turn, gain] of [[3, 4], [6, 5], [9, 6], [12, 7]]) {
      const next = transition(turn!).at(-1)!;
      expect(next.snap.E[0]![9]["STRENGTH_POWER"]).toBe(4 + gain!);
      expect(next.enemyPart).toBe(26 + 4 + gain!);
    }
  });

  it("keeps the observed scope separate from short rollouts and other ascensions", () => {
    for (const asc of [0, 2, 9]) expect(transition(6, true, asc)).toEqual(transition(6, false, asc));
    expect(transition(6, true, 10, false)).toEqual(transition(6, false, 10, false));
    expect(transition(6, true, 10, true, 5)).toEqual(transition(6, false, 10, true, 5));
    expect(transition(6, true, 10, true, 4, "OTHER")).toEqual(transition(6, false, 10, true, 4, "OTHER"));
  });

  it("does not extrapolate into unobserved buff turns", () => {
    for (const turn of [2, 5, 15, 18]) expect(transition(turn)).toEqual(transition(turn, false));
  });
});

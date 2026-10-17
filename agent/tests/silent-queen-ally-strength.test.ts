import { describe, expect, it } from "vitest";
import { simulateFight } from "../src/reflex/rollout.js";
import { solveTurn } from "../src/reflex/turn-solver.js";
import { board } from "./boss-sim-fixture.js";

// ZVYUL2YP3518 F48 T4-T8, 5X2GHKJ89PN1 T3-T5: restore temporary loss separately.
// Empty piles and fixed attacks isolate the carried buff; these are synthetic controls.
function transition(enabled = true, fullFight = true, asc = 10, move = "BURN_BRIGHT_FOR_ME_MOVE", hp = 211, minion = 1) {
  const input = board({ playerHp: 500, bossHp: 419, tables: {
    QUEEN: { moves: {
      BURN_BRIGHT_FOR_ME_MOVE: { damage: 0, hits: 0, strength: 0, block: 0 },
      PUPPET_STRINGS_MOVE: { damage: 0, hits: 0, strength: 0, block: 0 },
    }, next: { BURN_BRIGHT_FOR_ME_MOVE: { BURN_BRIGHT_FOR_ME_MOVE: 1 }, PUPPET_STRINGS_MOVE: { PUPPET_STRINGS_MOVE: 1 } } },
    TORCH_HEAD_AMALGAM: { moves: { ATTACK: { damage: 10, hits: 1, strength: 0, block: 0 } }, next: { ATTACK: { ATTACK: 1 } } },
  } });
  input.observedSilentQueenAllyStrength = enabled;
  input.meta = { ...input.meta, t: 4, asc, enc: "QUEEN" };
  const base = input.solver.enemies[0]!;
  input.solver = { ...input.solver, turn: 4, hand: [], player: { ...input.solver.player, hp: 500, maxHp: 500 },
    enemies: [{ ...base, index: 0, hp, maxHp: 211, minion: true, attacks: [{ damage: 6, hits: 1 }] },
      { ...base, index: 1, hp: 419, maxHp: 419, attacks: [] }] };
  input.enemies = [{ index: 0, id: "TORCH_HEAD_AMALGAM", move: "ATTACK", strength: -4,
    powers: { MINION_POWER: minion, PIERCING_WAIL_POWER: 6 } },
  { index: 1, id: "QUEEN", move, strength: 0, powers: {} }];
  input.piles = { draw: [], discard: [], handBase: [] };
  const noAction = solveTurn(input.solver).plans.find(p => p.steps.length === 0)!;
  return simulateFight(input, noAction, 2, 7, fullFight).records;
}

describe("observed Silent A10 Queen ally Strength", () => {
  it("carries Burn Bright to the ally's next attack, separately from Wail restoration", () => {
    const after = transition().at(-1)!;
    expect(after.snap.E.find(e => e[1] === "TORCH_HEAD_AMALGAM")![9]["STRENGTH_POWER"]).toBe(3);
    expect(after.snap.E.find(e => e[1] === "QUEEN")![9]["STRENGTH_POWER"] ?? 0).toBe(0);
    expect(after.enemyPart).toBe(13);
    expect(transition(false).at(-1)!.enemyPart).toBe(12);
  });

  it("preserves short rollout, unobserved ascension and move behavior", () => {
    expect(transition(true, false)).toEqual(transition(false, false));
    for (const asc of [0, 2, 4, 7, 8, 9]) expect(transition(true, true, asc)).toEqual(transition(false, true, asc));
    expect(transition(true, true, 10, "PUPPET_STRINGS_MOVE")).toEqual(transition(false, true, 10, "PUPPET_STRINGS_MOVE"));
    expect(transition(true, true, 10, undefined, 211, 0)).toEqual(transition(false, true, 10, undefined, 211, 0));
  });

  it("does not buff a dead ally", () => {
    expect(transition(true, true, 10, undefined, 0)).toEqual(transition(false, true, 10, undefined, 0));
  });
});

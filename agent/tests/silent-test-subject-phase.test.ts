import { describe, expect, it } from "vitest";
import { simulateFight, type EnemyTable } from "../src/reflex/rollout.js";
import { solveTurn } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

// Phase/power signatures: JMH5C51RLN4E F48 a5 T4->T5 / T7->T8,
// UJ0K3G10609Y a6 T5->T6 and YZWV37N2MU6N a1 T5->T6 / T8->T9.
// The forced poison kill and Skill utility isolate the transition; they are synthetic test controls.
const table: EnemyTable = {
  moves: {
    BITE_MOVE: { damage: 20, hits: 1, strength: 0, block: 0 },
    SKULL_BASH_MOVE: { damage: 12, hits: 1, strength: 0, block: 0 },
    MULTI_CLAW_MOVE: { damage: 11, hits: 3, strength: 0, block: 0 },
    PHASE3_LACERATE_MOVE: { damage: 12, hits: 3, strength: 0, block: 0 },
    BIG_POUNCE: { damage: 44, hits: 1, strength: 0, block: 0 },
    BURNING_GROWL_MOVE: { damage: 0, hits: 1, strength: 3, block: 0 },
  },
  next: { BITE_MOVE: { SKULL_BASH_MOVE: 1 }, SKULL_BASH_MOVE: { BITE_MOVE: 1 },
    MULTI_CLAW_MOVE: { MULTI_CLAW_MOVE: 1 }, PHASE3_LACERATE_MOVE: { BIG_POUNCE: 1 },
    BIG_POUNCE: { BURNING_GROWL_MOVE: 1 }, BURNING_GROWL_MOVE: { PHASE3_LACERATE_MOVE: 1 } },
};

function transition(phase: 1 | 2, observed: boolean, asc = 10, scripts = true, enrageOverride?: number) {
  const input = board({ tables: { TEST_SUBJECT: table } });
  const enrage = enrageOverride ?? (phase === 1 ? 3 : 0);
  const maxHp = phase === 1 ? 111 : 212;
  const powers = phase === 1 ? { ADAPTABLE_POWER: 1, ENRAGE_POWER: enrage } : { ADAPTABLE_POWER: 1, PAINFUL_STABS_POWER: 1 };
  input.meta = { ...input.meta, asc, act: 3, enc: "TEST_SUBJECT" };
  input.observedSilentTestSubjectPhasePowers = observed;
  input.solver = { ...input.solver, hand: [], player: { ...input.solver.player, hp: 200, maxHp: 200 },
    enemies: [{ ...input.solver.enemies[0]!, hp: 1, maxHp, poison: 1, revives: true,
      attacks: [], enrage, woundsPerHit: phase === 1 ? 0 : 1 }] };
  input.enemies = [{ index: 0, id: "TEST_SUBJECT", move: phase === 1 ? "BITE_MOVE" : "MULTI_CLAW_MOVE", strength: 0, powers }];
  input.piles = { draw: [card(10, "CONTROL_BLOCK", { type: "Skill", cost: 0, target: "self", validTargets: [], block: 100, flatValue: 1000 })], discard: [], handBase: [] };
  const noAction = solveTurn(input.solver).plans.find((plan) => plan.steps.length === 0)!;
  const records = simulateFight(input, noAction, 2, 7, scripts).records;
  expect(records).toHaveLength(2);
  return records;
}

describe("H0 observed Silent A10 Test Subject phase powers", () => {
  it("phase 2 drops Enrage, so a later Skill does not create phase-1 Strength", () => {
    const old = transition(1, false).at(-1)!.snap.E[0]!;
    const fixed = transition(1, true).at(-1)!.snap.E[0]!;
    expect(old[3]).toBe(212);
    expect(old[9]["ENRAGE_POWER"]).toBe(3);
    expect(old[9]["STRENGTH_POWER"]).toBe(3);
    expect(fixed[3]).toBe(212);
    expect(fixed[9]["ENRAGE_POWER"]).toBeUndefined();
    expect(fixed[9]["STRENGTH_POWER"] ?? 0).toBe(0);
    expect(fixed[9]["PAINFUL_STABS_POWER"]).toBe(1);
  });

  it("phase 3 drops Painful Stabs while retaining the existing Nemesis transition", () => {
    const old = transition(2, false).at(-1)!.snap.E[0]!;
    const fixed = transition(2, true).at(-1)!.snap.E[0]!;
    expect(old[9]["PAINFUL_STABS_POWER"]).toBe(1);
    expect(fixed[3]).toBe(313);
    expect(fixed[9]["PAINFUL_STABS_POWER"]).toBeUndefined();
    expect(fixed[9]["NEMESIS_POWER"]).toBe(1);
    expect(fixed[9]["ADAPTABLE_POWER"]).toBeUndefined();
  });

  it("preserves unobserved ascensions, missing activation, short rollout and unseen Enrage", () => {
    expect(transition(1, true, 9)).toEqual(transition(1, false, 9));
    expect(transition(2, true, 9)).toEqual(transition(2, false, 9));
    expect(transition(1, true, 10, false)).toEqual(transition(1, false, 10, false));
    expect(transition(1, true, 10, true, 4)).toEqual(transition(1, false, 10, true, 4));
  });
});

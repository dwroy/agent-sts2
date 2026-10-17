import { describe, expect, it } from "vitest";
import { withObservedSilentBossWeak } from "../src/reflex/rollout-live.js";
import { simulateFight, type EnemyTable } from "../src/reflex/rollout.js";
import { solveTurn } from "../src/reflex/turn-solver.js";
import { board } from "./boss-sim-fixture.js";

const moves: EnemyTable = {
  moves: {
    TACKLE_2_MOVE: { damage: 18, hits: 1, strength: 0, block: 0 },
    BEAM_MOVE: { damage: 8, hits: 3, strength: 0, block: 0 },
    TACKLE_3_MOVE: { damage: 14, hits: 1, strength: 0, block: 0 },
    TACKLE_4_MOVE: { damage: 14, hits: 1, strength: 0, block: 0 },
  },
  next: { TACKLE_2_MOVE: { BEAM_MOVE: 1 }, BEAM_MOVE: { TACKLE_3_MOVE: 1 }, TACKLE_3_MOVE: { TACKLE_4_MOVE: 1 }, TACKLE_4_MOVE: { BEAM_MOVE: 1 } },
};
const context = { character: "SILENT", asc: 2, relics: [{ relic_id: "PAPER_KRANE", is_melted: false }] };

// The second turn has no player actions: its incoming hit exposes the persisted enemy Weak model.
function secondTurn(table: EnemyTable, move: string, strength: number, vulnerable: boolean) {
  const input = board({ tables: { TORCH_HEAD_AMALGAM: table } });
  const first = table.moves[move]!;
  input.solver = { ...input.solver, hand: [], player: { ...input.solver.player, hp: 200, maxHp: 200, vulnerable },
    enemies: [{ ...input.solver.enemies[0]!, hp: 200, maxHp: 200, weak: 2, attacks: [] }] };
  input.enemies = [{ index: 0, id: "TORCH_HEAD_AMALGAM", move: "WAIT", strength, powers: {} }];
  input.tables = { TORCH_HEAD_AMALGAM: { ...table, moves: { ...table.moves, WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { ...table.next, WAIT: { [move]: 1 } } } };
  input.piles = { draw: [], discard: [], handBase: [] };
  input.meta = { ...input.meta, asc: 2 };
  input.playerPowers = vulnerable ? { VULNERABLE_POWER: 99 } : {};
  const noAction = solveTurn(input.solver).plans.find((plan) => plan.steps.length === 0)!;
  const records = simulateFight(input, noAction, 2, 7).records;
  expect(records).toHaveLength(2);
  expect(first).toBeDefined();
  return records[1]!.snap.E[0]![7];
}

describe("H0 ZZMYZ5UBCG72 A2 F48: Paper Krane with Weak already active", () => {
  it.each([
    ["TACKLE_2_MOVE", 0, false, 10],
    ["BEAM_MOVE", 0, true, 21],
    ["BEAM_MOVE", -3, true, 12],
    ["TACKLE_3_MOVE", 1, true, 13],
    ["TACKLE_3_MOVE", 4, true, 16],
    ["TACKLE_4_MOVE", 2, true, 14],
  ] as const)("reproduces the observed %s / Strength %s / Vulnerable %s hit", (move, strength, vulnerable, actual) => {
    const repaired = withObservedSilentBossWeak(moves, "TORCH_HEAD_AMALGAM", context);
    expect(secondTurn(repaired, move, strength, vulnerable)).toBe(actual);
    expect(secondTurn(moves, move, strength, vulnerable)).not.toBe(actual);
  });

  it("keeps other characters, ascensions, monsters and absent/melted/unknown relics identical", () => {
    for (const ctx of [
      { ...context, character: "IRONCLAD" }, { ...context, character: "REGENT" },
      { ...context, asc: 0 }, { ...context, asc: 10 }, { ...context, relics: [] },
      { ...context, relics: [{ relic_id: "PAPER_KRANE", is_melted: true }] },
      { ...context, relics: [{ relic_id: "PAPER_KRANE" }] },
    ]) expect(withObservedSilentBossWeak(moves, "TORCH_HEAD_AMALGAM", ctx)).toBe(moves);
    expect(withObservedSilentBossWeak(moves, "TEST_SUBJECT", context)).toBe(moves);
  });

  it("leaves unseen Strength contexts and refreshed base damage on the existing model", () => {
    const repaired = withObservedSilentBossWeak(moves, "TORCH_HEAD_AMALGAM", context);
    expect(secondTurn(repaired, "BEAM_MOVE", 5, true)).toBe(secondTurn(moves, "BEAM_MOVE", 5, true));
    const changed = { ...moves, moves: { ...moves.moves, BEAM_MOVE: { ...moves.moves.BEAM_MOVE!, damage: 9 } } };
    expect(withObservedSilentBossWeak(changed, "TORCH_HEAD_AMALGAM", context).moves.BEAM_MOVE).toBe(changed.moves.BEAM_MOVE);
    expect(moves.moves.BEAM_MOVE!.observedWeak).toBeUndefined();
  });
});

/** fix-queue-v4 2026-10-06 02:40: deterministic cutoff regressions, no live knowledge or wall-clock load. */
import { afterEach, expect, it, vi } from "vitest";
import { rolloutDecision } from "../src/reflex/rollout.js";
import { solveTap, solveTurn } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

const originalTap = solveTap.onSolve;
afterEach(() => { vi.restoreAllMocks(); solveTap.onSolve = originalTap; });

it("cuts off the search with the caller's monotonic clock while the wall clock is frozen", () => {
  const input = board().solver;
  input.hand = Array.from({ length: 9 }, (_, i) => card(i, `TEST_${i}`, { cost: 0, damage: i + 1 }));
  input.enemies[0]!.hp = input.enemies[0]!.maxHp = 10_000;
  vi.spyOn(Date, "now").mockReturnValue(0);
  const result = solveTurn({ ...input, maxNodes: 1500, deadline: 1500, deadlineNow: () => 1501 });
  expect(result.timedOut).toBe(true);
  expect(result.truncated).toBe(true);
  expect(result.nodes).toBe(64);
});

it("abandons an incomplete last policy turn rather than keeping it as a finished rollout", () => {
  const input = board({ bossHp: 10_000 });
  input.solver.hand = [card(0, "TEST_ATTACK", { damage: 1 })];
  input.plans = solveTurn(input.solver).plans;
  input.piles.handBase = input.solver.hand;
  input.piles.draw = Array.from({ length: 10 }, (_, i) => card(i + 10, `TEST_DRAW_${i}`, { cost: 0, damage: 1 }));
  let elapsed = 0;
  // Model a policy solve finishing at the deadline, independently of the number of clock checks.
  solveTap.onSolve = () => { elapsed = 1500; };
  input.options = { horizon: 2, samples: 1, k: 1, budgetMs: 1500, now: () => elapsed };
  vi.spyOn(Date, "now").mockReturnValue(0);
  const result = rolloutDecision(input);
  expect(result.horizon).toBe(1);
  expect(result.degraded).toContain("1-turn");
  expect(result.samples).toBe(1);
  expect(result.lines).not.toHaveLength(0);
});

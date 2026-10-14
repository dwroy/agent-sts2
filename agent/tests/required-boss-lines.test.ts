import { afterEach, expect, it, vi } from "vitest";
import { board } from "./boss-sim-fixture.js";
import { bossLineSim, bossLinesOptions, type BossLineSimArgs } from "../src/sim/boss-lines.js";
import { solveTurn } from "../src/reflex/turn-solver.js";
import { createScreenMemory } from "../src/memory/types.js";

// Fix only the board adapter: the whole-fight runner, samples and formula remain real.
vi.mock("../src/reflex/rollout-live.js", async (original) => ({
  ...await original<typeof import("../src/reflex/rollout-live.js")>(),
  boardRolloutInput: () => ({ ...board({ bossHp: 12 }), handBase: [] }),
  fightMetaOf: () => board({ bossHp: 12 }).meta,
  fightRelicsOf: () => ({}),
}));
const original = { ...bossLinesOptions };
afterEach(() => Object.assign(bossLinesOptions, original));

it("live Silent completes every Boss line beyond the budget while historical and other-role budgets stay intact", () => {
  Object.assign(bossLinesOptions, { serial: true, deadlineMs: 0, turnBudgetMs: 0 });
  const input = board({ bossHp: 12 });
  const solver = { ...input.solver, captureBossMargin: true };
  const state = { raw: { run_id: "fixed-required-lines" }, run: { floor: 1, ascension: 10, raw: { character_id: "SILENT" } } };
  const args = { state, knowledge: {}, memory: createScreenMemory("COMBAT"), solver,
    piles: input.piles, randomPotions: [], lines: solveTurn(solver).plans.slice(0, 2), turn: 1,
    drinks: () => false, samples: 4 } as unknown as BossLineSimArgs;
  expect(bossLineSim(args).available).toBe(false);
  const result = bossLineSim({ ...args, requiredComplete: true });
  expect(result.available).toBe(true);
  if (!result.available) throw new Error(result.reason);
  expect(result.run).toMatchObject({ samples: 4, requested: 4, timedOut: false });
  expect(result.byPlan.size).toBe(args.lines.length);
  for (const line of result.byPlan.values()) {
    expect(line.result.outcomes).toHaveLength(4);
    expect(line.bossMargin).toMatchObject({ samples: 4, valid: 4, missing: 0, enemyDpr: { n: 4 }, myDpr: { n: 4 } });
  }
  const other = { ...state, run: { ...state.run, raw: { character_id: "IRONCLAD" } } };
  expect(bossLineSim({ ...args, state: other as unknown as BossLineSimArgs["state"], requiredComplete: true }).available).toBe(false);
});

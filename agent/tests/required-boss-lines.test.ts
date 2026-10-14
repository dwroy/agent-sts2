import { afterEach, expect, it, vi } from "vitest";
import { board } from "./boss-sim-fixture.js";
import { bossLineSim, bossLinesOptions, BossLinesPool, releaseBossLinesPool, runPairsSerial, simLog, type BossLineSimArgs } from "../src/sim/boss-lines.js";
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
afterEach(() => { Object.assign(bossLinesOptions, original); vi.restoreAllMocks(); vi.unstubAllEnvs(); releaseBossLinesPool(); });

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


it.each([0, 250, 320, "throw"] as const)("B2 failures retain pending evidence then use 25 seconds on attempt three (%s)", (third) => {
  Object.assign(bossLinesOptions, { serial: false });
  const input = board({ bossHp: 12 });
  const solver = { ...input.solver, captureBossMargin: true };
  const args = { state: { raw: { run_id: "fixed-C1-B2" }, turn: 1, run: { floor: 1, ascension: 10, raw: { character_id: "SILENT" } } },
    knowledge: {}, memory: createScreenMemory("COMBAT"), solver, piles: input.piles, randomPotions: [],
    lines: solveTurn(solver).plans.slice(0, 1), turn: 1, drinks: () => false, samples: 600, requiredComplete: true } as unknown as BossLineSimArgs;
  let count = 0;
  const deadlines: number[] = [];
  vi.spyOn(BossLinesPool.prototype, "run").mockImplementation((base, pairs, samples, seed, deadline) => {
    count++;
    deadlines.push(deadline);
    if (count <= 2 || third === "throw") throw new Error("fixed B2 worker failure");
    const single = runPairsSerial(base, pairs, 1, seed);
    return { ...single, outcomes: single.outcomes.map((line) => Array.from({ length: samples }, (_, i) => i < third ? line[0] : undefined)),
      complete: Array.from({ length: third }, (_, i) => i), timedOut: true };
  });
  for (let i = 1; i <= 2; i++) expect(bossLineSim(args)).toMatchObject({ available: false, completion: { status: "pending", attempts: i } });
  const result = bossLineSim(args);
  expect(deadlines).toEqual([Infinity, Infinity, 25_000]);
  expect(result).toMatchObject({ available: third === 320, completion: { status: "degraded", attempts: 3 } });
  expect(simLog(result, () => "plan1")).toHaveProperty("completion.status", "degraded");
  if (result.available) for (const line of result.byPlan.values()) expect(line.text).toContain("不完整（故障降级，n=320）");
});

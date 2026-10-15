import { expect, it } from "vitest";
import { sampleSchedule } from "../src/sim/sample-range.js";
import { BuildSimPool, SerialDeckRunner, taskChunks, type DeckRunRequest } from "../src/sim/build-sim-pool.js";
import { BossLinesPool, linesInput, runPairsSerial, runLines, bossLinesPool } from "../src/sim/boss-lines.js";
import { sampleSeed } from "../src/sim/boss-sim.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { board } from "./boss-sim-fixture.js";

it("validates absolute intervals and active indices without renumbering seeds or mixture stripes", () => {
  const base = board({ bossHp: 12 });
  const req: DeckRunRequest = { base, decks: [{}, {}, {}], orders: [null], samples: 20, seed: 7,
    range: { from: 5, to: 12 }, activeDecks: [2], stripes: [null, null, { at: 1, of: 2 }] };
  const tasks = taskChunks(req).flat();
  expect(tasks.map(([deck, order, index]) => [deck, order, index])).toEqual([[2, 0, 5], [2, 0, 7], [2, 0, 9], [2, 0, 11]]);
  for (const [, , index, seed] of tasks) expect(seed).toBe(sampleSeed(7, index));
  expect(() => sampleSchedule(20, 3, { from: 12, to: 21 })).toThrow("range");
  expect(() => sampleSchedule(20, 3, undefined, [1, 1])).toThrow("indices");
});

it("B3 ranges reproduce full-run samples exactly and reuse the same live pool", async () => {
  const base = board({ bossHp: 12 }), pool = new BuildSimPool(2);
  const req: DeckRunRequest = { base, decks: [{}, {}], orders: [null], samples: 12, seed: 7, diagnostics: true };
  try {
    const full = await new SerialDeckRunner().run(req);
    const first = await pool.run({ ...req, range: { from: 0, to: 5 } });
    expect(first.diagnostics?.coldStart).toBe(true);
    expect(first.complete).toEqual([0, 1, 2, 3, 4]);
    const next = await pool.run({ ...req, range: { from: 5, to: 12 }, activeDecks: [1] });
    expect(next.diagnostics?.coldStart).toBe(false);
    expect(pool.live).toBe(2);
    expect(next.complete).toEqual([5, 6, 7, 8, 9, 10, 11]);
    for (const index of first.complete) for (const deck of [0, 1]) expect(first.outcomes[deck]![0]![index]).toEqual(full.outcomes[deck]![0]![index]);
    for (const index of next.complete) expect(next.outcomes[1]![0]![index]).toEqual(full.outcomes[1]![0]![index]);
    expect(next.outcomes[0]![0]!.every((value) => value === undefined)).toBe(true);
  } finally { await pool.close(); }
}, 30_000);

it("B2 actual adaptive results retain every candidate and exactly their full-run prefixes", async () => {
  const input = board({ bossHp: 12, playerHp: 1 });
  const winning = input.plans.find((plan) => plan.outcome.damageDealt >= 12)!;
  const plans = [winning, replaySteps(input.solver, [])!];
  const full = runLines(input, plans, { samples: 600, seed: 7, deadlineMs: Infinity, serial: true });
  const actual = runLines(input, plans, { samples: 600, seed: 7, deadlineMs: Infinity, serial: true,
    adaptive: { mode: "on", allowS: false } });
  expect(actual.lines).toHaveLength(plans.length);
  expect(actual.adaptive).toMatchObject({ mode: "on", status: "complete_adaptive" });
  expect(actual.done).toBeLessThan(full.done);
  for (const [index, line] of actual.lines.entries()) {
    expect(line.samples).toBeGreaterThanOrEqual(200);
    // This fixture has one enemy, hence one stable order. Seed identities remain absolute.
    expect(line.outcomes).toEqual(full.lines[index]!.outcomes.slice(0, line.samples));
  }
  try {
    const pooled = runLines(input, plans, { samples: 600, seed: 7, deadlineMs: Infinity,
      adaptive: { mode: "on", allowS: false } });
    expect(pooled.lines).toEqual(actual.lines);
    expect(pooled.done).toBe(actual.done);
  } finally { await bossLinesPool().close(); }
}, 30_000);

it("B2 ranges retain pair and sample identity in serial and persistent workers", async () => {
  const base = board({ bossHp: 12 }), input = linesInput(base, () => null);
  const pairs = base.plans.slice(0, 2).map((plan) => ({ plan, order: null }));
  const pool = new BossLinesPool(2);
  try {
    const full = runPairsSerial(input, pairs, 12, 7);
    const first = pool.run(input, pairs, 12, 7, Infinity, undefined, undefined, { range: { from: 0, to: 5 } });
    const next = pool.run(input, pairs, 12, 7, Infinity, undefined, undefined, { range: { from: 5, to: 12 }, activePairs: [1] });
    expect(pool.live).toBe(2);
    expect(first.done).toBe(10);
    expect(next.done).toBe(7);
    expect(next.complete).toEqual([5, 6, 7, 8, 9, 10, 11]);
    const serial = runPairsSerial(input, pairs, 12, 7, Infinity, undefined, undefined, { range: { from: 5, to: 12 }, activePairs: [1] });
    expect(next.outcomes).toEqual(serial.outcomes);
    for (const index of first.complete) for (const pair of [0, 1]) expect(first.outcomes[pair]![index]).toEqual(full.outcomes[pair]![index]);
    for (const index of next.complete) expect(next.outcomes[1]![index]).toEqual(full.outcomes[1]![index]);
    expect(pool.run(input, pairs, 12, 7, Infinity, undefined, undefined, { activePairs: [] }).complete).toEqual([]);
  } finally { await pool.close(); }
}, 30_000);

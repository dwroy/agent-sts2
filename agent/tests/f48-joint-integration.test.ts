import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as shadow from "../src/sim/f48-joint-shadow.js";
import { bossLineSim, bossLinesOptions, BossLinesPool, releaseBossLinesPool, simLog, type BossLineSimArgs } from "../src/sim/boss-lines.js";
import { compareOptions } from "../src/sim/build-sim.js";
import { withBossSim } from "../src/sim/build-sim-facts.js";
import { createScreenMemory } from "../src/memory/types.js";
import { captureContinuationFailure, ContinuationSampleError } from "../src/sim/continuation-failure.js";
import { sampleSeed } from "../src/sim/boss-sim.js";
import type { DeckSimRunner } from "../src/sim/build-sim-pool.js";
import { board as simBoard } from "./boss-sim-fixture.js";
import { board, decide, env, setupOneshotTests } from "./oneshot-support.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { jointInput, sample, scope } from "./f48-joint-fixture.js";
import * as doubleBoss from "../src/knowledge/double-boss.js";

// Freeze board adapters and the absent observed continuation model. No runtime knowledge or simulation is consulted.
vi.mock("../src/reflex/rollout-live.js", async (original) => ({
  ...await original<typeof import("../src/reflex/rollout-live.js")>(),
  boardRolloutInput: () => ({ ...simBoard({ bossHp: 12 }), handBase: [] }),
  fightMetaOf: () => simBoard({ bossHp: 12 }).meta, fightRelicsOf: () => ({}),
}));
vi.mock("../src/knowledge/double-boss.js", async (original) => ({ ...await original<object>(),
  firstDoubleBoss: () => null, doubleBossFor: () => null }));
vi.mock("../src/sim/double-boss-start.js", async (original) => ({ ...await original<object>(),
  withDoubleBossStart: (_state: unknown, _knowledge: unknown, input: ReturnType<typeof jointInput>) =>
    ({ ...input, continuation: jointInput().continuation }) }));
vi.mock("../src/sim/boss-trust.js", async (original) => ({ ...await original<object>(), bossTrustReason: () => null }));
vi.mock("node:crypto", async (original) => ({ ...await original<object>(), randomUUID: () => "00000000-0000-4000-8000-000000000000" }));
vi.mock("node:os", async (original) => ({ ...await original<object>(), loadavg: () => [1, 1, 1] }));
setupOneshotTests();
const original = { ...bossLinesOptions };
const fixedNow = () => 0;
beforeEach(() => {
  vi.spyOn(performance, "now").mockReturnValue(0);
  vi.stubEnv("GLOBAL_BUILD_EVAL", "off"); vi.stubEnv("SIM_ADAPTIVE", "off");
  Object.assign(bossLinesOptions, { serial: false, now: () => 0 });
});
afterEach(() => { Object.assign(bossLinesOptions, original); vi.restoreAllMocks(); vi.unstubAllEnvs(); releaseBossLinesPool(); });

function runner(): DeckSimRunner {
  return { run: vi.fn(async (req) => ({
    outcomes: req.decks.map(() => req.orders.map(() => Array.from({ length: req.samples }, (_, i) => sample(sampleSeed(req.seed, i), 8 + i, i % 2 === 0)))),
    complete: Array.from({ length: req.samples }, (_, i) => i), timedOut: false, elapsedMs: 0, workers: 0,
  })) };
}

it("B3 aggregates existing returned outcomes and reuses its original memo with no extra worker call", async () => {
  const worker = runner(), input = jointInput();
  const options = [{ key: "skip", change: null }];
  const first = await compareOptions(worker, input, options, { samples: 2, requireComplete: true, f48JointScope: scope });
  const second = await compareOptions(worker, input, options, { samples: 2, requireComplete: true, f48JointScope: scope });
  expect(first.f48JointShadow).toMatchObject({ schema: "f48-joint-shadow-v1", status: "produced" });
  expect(second.f48JointShadow).toEqual(first.f48JointShadow);
  expect(second.completion?.memoHit).toBe(true); expect(worker.run).toHaveBeenCalledTimes(1);
  const without = await compareOptions(worker, input, options, { samples: 2, requireComplete: true });
  expect(without).not.toHaveProperty("f48JointShadow"); expect(worker.run).toHaveBeenCalledTimes(1);
});

it("does not invalidate a preexisting memo to fill shadow coverage", async () => {
  const worker = runner(), input = jointInput();
  await compareOptions(worker, input, [], { samples: 2, requireComplete: true });
  const next = await compareOptions(worker, input, [], { samples: 2, requireComplete: true, f48JointScope: scope });
  expect(next.f48JointShadow).toMatchObject({ status: "unknown", reason: "memo_predates_joint_shadow; no_extra_computation" });
  expect(worker.run).toHaveBeenCalledTimes(1);
});

it("preserves the actual C2 stop schedule and leaves its unmatched joint coverage unknown", async () => {
  const input = jointInput();
  const edit = (hp: number, block = 0) => ({ solver: { ...input.solver, player: { ...input.solver.player, hp, block } } });
  const options = [{ key: "bad", change: edit(10) }, { key: "good", change: edit(80) }, { key: "good_tie", change: edit(80, 1) }];
  const workers = () => ({ run: vi.fn(async (req: Parameters<DeckSimRunner["run"]>[0]) => {
    const from = req.range?.from ?? 0, to = req.range?.to ?? req.samples;
    return { outcomes: req.decks.map((deck) => req.orders.map(() => Array.from({ length: req.samples }, (_, i) =>
      i < from || i >= to ? undefined : sample(sampleSeed(req.seed, i), 8, i % 100 < (deck.solver?.player.hp ?? (i < 300 ? 40 : 60)))))),
      complete: Array.from({ length: to - from }, (_, i) => from + i), timedOut: false, elapsedMs: 0, workers: 0 };
  }) });
  const oldWorker = workers(), newWorker = workers();
  const settings = { samples: 1000, requireComplete: true, adaptive: { mode: "on" as const, allowS: false } };
  const before = await compareOptions(oldWorker, input, options, settings);
  const after = await compareOptions(newWorker, input, options, { ...settings, f48JointScope: scope });
  expect(JSON.stringify(newWorker.run.mock.calls)).toBe(JSON.stringify(oldWorker.run.mock.calls));
  const { f48JointShadow: joint, ...rest } = after; expect(rest).toEqual(before);
  expect(after.options.map((o) => o.samples)).toEqual([300, 1000, 1000]);
  const bad = (joint!.candidates as any[]).find((c) => c.candidate_key === "bad");
  expect(bad.paired_comparison).toMatchObject({ complete_pairs: 300, missing_pairs: 700, status: "unknown", delta_joint_raw: null });
});

it.each(["SILENT", "IRONCLAD", "REGENT", "DEFECT", "NECROBINDER"])("keeps the actual %s F48 B3 question and runner requests equivalent", async (character) => {
  const raw = board("xljq-f5-reward", "reward"), before = decide(env(raw));
  Object.assign(raw.run as object, { character_id: character, floor: 48, act_id: "0", boss_id: "SOUL_FYSH_BOSS" });
  const question = async () => {
    const worker = runner();
    const outcome = await withBossSim(before, { ...env(structuredClone(raw)), requiredBossEvaluation: character === "SILENT" },
      { runner: worker, samples: 2, db: FIXTURE_DB, mm: FIXTURE_MM, now: fixedNow });
    return { ...outcome, calls: vi.mocked(worker.run).mock.calls };
  };
  const disabled = vi.spyOn(shadow, "f48JointScope").mockReturnValue(undefined);
  const baseline = await question(); disabled.mockRestore();
  const actual = await question();
  expect(actual.record).not.toHaveProperty("error");
  expect(JSON.stringify(actual.decision)).toBe(JSON.stringify(baseline.decision)); expect(actual.calls).toEqual(baseline.calls);
  const { f48_joint_shadow: joint, ...record } = actual.record!;
  expect(record).toEqual(baseline.record);
  if (character === "SILENT") expect(joint).toMatchObject({ schema: "f48-joint-shadow-v1", status: "unknown", delivered: false });
  else expect(joint).toBeUndefined();
  expect(JSON.stringify(actual.decision)).not.toContain("f48-joint-shadow");
});

function b2Args(character: string): BossLineSimArgs {
  const input = simBoard({ bossHp: 12 });
  return { state: { raw: { run_id: "fixed-F48-shadow" }, turn: 1, run: { floor: 48, ascension: 10, raw: { character_id: character } } },
    knowledge: {}, memory: createScreenMemory("COMBAT"), solver: input.solver, piles: input.piles, randomPotions: [],
    lines: input.plans.slice(0, 2), turn: 1, drinks: () => false, samples: 2 } as unknown as BossLineSimArgs;
}
it.each(["SILENT", "IRONCLAD", "REGENT"])("keeps %s F48 B2 text, order and pool requests identical while logging only the eligible role", (character) => {
  const pool = vi.spyOn(BossLinesPool.prototype, "run").mockImplementation((input, pairs, count, seed) => ({
    outcomes: pairs.map(() => Array.from({ length: count }, (_, i) => sample(sampleSeed(seed, i), 8 + i, true))),
    complete: Array.from({ length: count }, (_, i) => i), timedOut: false, elapsedMs: 0, workers: 0, done: count * pairs.length,
  }));
  const disabled = vi.spyOn(shadow, "f48JointScope").mockReturnValue(undefined);
  const baseline = bossLineSim(b2Args(character)); disabled.mockRestore();
  const actual = bossLineSim(b2Args(character)); expect(actual.available).toBe(true); expect(baseline.available).toBe(true);
  const { f48JointShadow: joint, ...rest } = actual;
  expect(rest).toEqual(baseline); expect(pool.mock.calls[1]).toEqual(pool.mock.calls[0]);
  const record = simLog(actual, () => "p1");
  if (character === "SILENT") expect(record.f48_joint_shadow).toMatchObject({ status: "unknown", delivered: false });
  else { expect(joint).toBeUndefined(); expect(record).not.toHaveProperty("f48_joint_shadow"); }
});

it("retains C1 pending and the 0332 failure reference as unknown without adding samples or numeric rates", () => {
  const args = { ...b2Args("SILENT"), requiredComplete: true };
  const failure = captureContinuationFailure("nonpositive-hp", 1, { synthetic: true });
  const pool = vi.spyOn(BossLinesPool.prototype, "run").mockImplementation(() => { throw new ContinuationSampleError("nonpositive-hp", failure); });
  const result = bossLineSim(args), log = simLog(result, () => "p1");
  expect(result).toMatchObject({ available: false, completion: { status: "pending", samples: 0 } });
  expect(log.f48_joint_shadow).toMatchObject({ status: "unknown", continuous: null,
    failure: { reason: "resource_contract_failure:nonpositive-hp", reference: { status: "unconfigured" } } });
  expect(pool).toHaveBeenCalledTimes(1); expect(log).not.toHaveProperty("lines");
});

it("logs an existing continuous B2 computation without adding calls or exposing the diagnostic in its line text", () => {
  vi.spyOn(doubleBoss, "firstDoubleBoss").mockReturnValue({} as never);
  const pool = vi.spyOn(BossLinesPool.prototype, "run").mockImplementation((_input, pairs, count, seed) => ({
    outcomes: pairs.map(() => Array.from({ length: count }, (_, i) => sample(sampleSeed(seed, i), 8 + i, true))),
    complete: Array.from({ length: count }, (_, i) => i), timedOut: false, elapsedMs: 0, workers: 0, done: count * pairs.length,
  }));
  const result = bossLineSim(b2Args("SILENT"));
  expect(result.available).toBe(true);
  expect(simLog(result, () => "p1").f48_joint_shadow).toMatchObject({ status: "produced", delivered: false });
  if (result.available) for (const line of result.byPlan.values()) expect(line.text).not.toContain("f48-joint-shadow");
  expect(pool).toHaveBeenCalledTimes(1);
});

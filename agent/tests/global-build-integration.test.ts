import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { withBossSim } from "../src/sim/build-sim-facts.js";
import { asArray, asRecord } from "../src/core/util/json.js";
import { board, decide, env, setupOneshotTests } from "./oneshot-support.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import type { DeckSimRunner } from "../src/sim/build-sim-pool.js";
import type { FightSampleResult } from "../src/sim/boss-sim.js";
import type { GlobalBossPool } from "../src/sim/global-build-pool.js";

vi.mock("../src/sim/boss-trust.js", async (original) => ({ ...await original<object>(), bossTrustReason: () => null }));
vi.mock("node:crypto", async (original) => ({ ...await original<object>(), randomUUID: () => "00000000-0000-4000-8000-000000000000" }));
// Sequential record comparisons must observe the same host-health input.
vi.mock("node:os", async (original) => ({ ...await original<object>(), loadavg: (): [number, number, number] => [1, 1, 1] }));
setupOneshotTests();
beforeEach(() => vi.spyOn(performance, "now").mockReturnValue(0));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

// Existing fixed stand-ins and symbolic outcomes verify plumbing, not game knowledge or trust.
const pool: GlobalBossPool = { character: "silent", ascension: 8, unknown: [],
  source: { path: "fixed", sha256: "fixed", generated: null }, unit: "observed_fight_records_including_retries",
  stages: ["SOUL_FYSH", "KAISER_CRAB", "THE_KIN"].map((boss, i) => ({ act: i + 1,
    candidates: [{ boss, count: 1, frequency: 1, evidence: ["fixed"] }] })) };
function runner(failure?: "current" | "future"): DeckSimRunner {
  return { run: vi.fn(async (req) => {
    if (failure === "current" || failure === "future" && req.base.solver.enemies.length > 1)
      throw new Error("fixed worker failure");
    const hp = req.base.solver.enemies.reduce((n, enemy) => n + enemy.hp, 0);
    const sample: FightSampleResult = { won: true, died: false, capped: false, timeUp: false, turns: 1,
      hpLoss: 1, revived: 0, drunk: [], enemyHpLeft: 0, lossByTurn: [1], dmgByTurn: [hp],
      incomingByTurn: [1], enemyLossByTurn: [hp], policyTurns: 1, policyNodes: 1,
      bossMargin: { reference: { myHp: req.base.solver.player.hp, bossHp: hp, enemyIds: ["FIXED"], unknown: [] }, outgoingHp: hp, receivedHp: 1 } };
    const from = req.range?.from ?? 0, to = req.range?.to ?? req.samples;
    return { outcomes: req.decks.map(() => req.orders.map(() => Array.from({ length: req.samples }, (_, i) =>
      i >= from && i < to ? structuredClone(sample) : undefined))),
      complete: Array.from({ length: to - from }, (_, i) => from + i), timedOut: false, elapsedMs: 0, workers: 0 };
  }) };
}
async function question(mode: string, character = "SILENT", name = "xljq-f5-reward", key = "reward", matchingPool = true, failure?: "current" | "future") {
  vi.stubEnv("GLOBAL_BUILD_EVAL", mode);
  const raw = board(name, key);
  // Build the archived fixture's own question before varying the adapter's declared role.
  // Other-role checks cover B3/G2 isolation, not a new game or a cross-role planner run.
  const original = decide(env(raw));
  Object.assign(raw.run as object, { character_id: character, ascension: 8, act_id: "0", boss_id: "SOUL_FYSH_BOSS" });
  const environment = { ...env(raw), requiredBossEvaluation: character === "SILENT" };
  const worker = runner(failure);
  const outcome = await withBossSim(original, environment, { runner: worker, samples: 2,
    db: FIXTURE_DB, mm: FIXTURE_MM, now: () => 0, ...(matchingPool ? { globalPool: pool } : {}) });
  return { ...outcome, worker, environment };
}

it.each([
  ["xljq-f5-reward", "reward"], ["7b0d-f8-rest", "rest"], ["7b0d-f8-rest", "upgrade_select"],
  ["u6ru-f22-shop", "open"], ["qug1-f22-shop-remove", "remove_select"],
])("keeps the actual %s/%s question and current C1/C2/P2 facts identical to off", async (name, key) => {
  const off = await question("off", "SILENT", name, key), shadow = await question("shadow", "SILENT", name, key);
  expect(off.record).not.toHaveProperty("error");
  expect(shadow.record).not.toHaveProperty("error");
  expect(JSON.stringify(shadow.decision)).toBe(JSON.stringify(off.decision));
  const { global_build: global, ...record } = asRecord(shadow.record);
  expect(record).toEqual(off.record);
  expect(global).toMatchObject({ mode: "shadow", delivered: false, primary: "paired_win_probability", s_sort: false });
  const targets = asArray(asRecord(global).targets).map(asRecord);
  expect(targets.find((row) => asRecord(row.target).act === 2)?.status).toBe("computed");
  expect(targets.find((row) => asRecord(row.target).act === 3)?.status).toBe("unknown");
  const currentKeys = Object.keys(asRecord(asRecord(shadow.record).options));
  for (const target of targets) expect(asArray(target.rows).map((row) => asRecord(row).key)).toEqual(expect.arrayContaining(["@current", ...currentKeys]));
  expect(shadow.environment.screenMemory.globalBuildHistory?.points).toHaveLength(1);
});

it.each(["IRONCLAD", "REGENT", "DEFECT", "NECROBINDER"])("preserves %s questions, records and worker calls exactly", async (character) => {
  const off = await question("off", character), shadow = await question("shadow", character);
  expect(JSON.stringify(shadow.decision)).toBe(JSON.stringify(off.decision));
  expect(shadow.record).toEqual(off.record);
  expect(JSON.stringify(vi.mocked(shadow.worker.run).mock.calls)).toBe(JSON.stringify(vi.mocked(off.worker.run).mock.calls));
  expect(shadow.environment.screenMemory).not.toHaveProperty("globalBuildHistory");
});

it("does not read a runtime pool for custom fixed inputs without matching pool evidence", async () => {
  const off = await question("off"), shadow = await question("shadow", "SILENT", "xljq-f5-reward", "reward", false);
  expect(JSON.stringify(shadow.decision)).toBe(JSON.stringify(off.decision));
  expect(JSON.stringify(vi.mocked(shadow.worker.run).mock.calls)).toBe(JSON.stringify(vi.mocked(off.worker.run).mock.calls));
  expect(JSON.stringify(asRecord(shadow.record).global_build)).toContain("custom_inputs_need_matching_observed_silent_pool");
});

it("preserves the original pending C1 failure without attempting supplemental computation", async () => {
  const off = await question("off", "SILENT", "xljq-f5-reward", "reward", true, "current");
  const shadow = await question("shadow", "SILENT", "xljq-f5-reward", "reward", true, "current");
  expect(JSON.stringify(shadow.decision)).toBe(JSON.stringify(off.decision));
  const { global_build: global, ...record } = asRecord(shadow.record);
  expect(record).toEqual(off.record);
  expect(record).toHaveProperty("completion.status", "pending");
  expect(global).toMatchObject({ status: "unknown", reason: "current_B3_failed", delivered: false });
  expect(vi.mocked(shadow.worker.run).mock.calls.length).toBe(vi.mocked(off.worker.run).mock.calls.length);
});

it("retains a new future-lane failure in the log while delivering the original complete question", async () => {
  const off = await question("off"), shadow = await question("shadow", "SILENT", "xljq-f5-reward", "reward", true, "future");
  expect(JSON.stringify(shadow.decision)).toBe(JSON.stringify(off.decision));
  const { global_build: global, ...record } = asRecord(shadow.record);
  expect(record).toEqual(off.record);
  expect(JSON.stringify(global)).toContain("global_computation_failed:fixed worker failure");
  expect(record).toHaveProperty("completion.status", asRecord(asRecord(off.record).completion).status);
});

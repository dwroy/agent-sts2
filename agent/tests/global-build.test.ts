import { describe, expect, it, vi } from "vitest";
import { evaluateGlobalBuild, globalBossTargets, type GlobalBossTarget } from "../src/sim/global-build.js";
import { observedGlobalBossPool } from "../src/sim/global-build-pool.js";
import type { CompareResult, OptionSim } from "../src/sim/build-sim.js";

// Symbolic arithmetic and protocol fixtures only; no Boss mechanism or real outcome assertions.
function records() {
  return { meta: { character: "silent" }, bosses: {
    A: { "10": { fights: 4, encounters: { A: 4 } } },
    B: { "10": { fights: 2, encounters: { "B_PART+SIDE": 2 } } },
    C: { "10": { fights: 6, encounters: { C: 6 } } },
    D: { "10": { fights: 3, encounters: { D: 3 } } },
  }, encounters: {
    A: { rooms: { boss: 4 }, acts: { "1": 4 } },
    "B_PART+SIDE": { rooms: { boss: 2 }, acts: { "2": 2 } },
    C: { rooms: { boss: 6 }, acts: { "2": 6 } },
    D: { rooms: { boss: 3 }, acts: { "3": 3 } },
  } };
}
const source = { path: "fixed-silent-records", sha256: "fixed-input", generated: null };
const pool = () => observedGlobalBossPool(records(), 10, source);
function option(key: string, p: number, delta: number | null): OptionSim {
  return { key, samples: 100, win: p, winCal: p, diff: delta === null ? null : {
    raw: delta, se: .02, cal: delta, calSe: .02, hpLoss: 0, hpLossSe: 0, bossLeft: 0, bossLeftSe: 0,
  }, bossLeft: 0, hpLossMean: 1, hpLossWon: 1, turns: 1, deathTurn: null, order: null, hp: 10 };
}
function result(base = .5, delta = .1): CompareResult {
  return { base: option("current", base, null), options: [option("take", base + delta, delta), option("skip", base, null)],
    buildRanking: { rows: [{ key: "take", delta_s: { mean: .2, se: .03 }, s_eligible: true }] },
    samples: 100, requested: 100, timedOut: false, elapsedMs: 12, workers: 0, orders: 1, order: null };
}
const args = () => ({ pool: pool(), currentAct: 1, visible: new Map([[1, "A"]]), keys: ["@current", "take", "skip"],
  currentBoss: "A", current: result(), trustReason: () => null, evaluate: async () => result(), now: () => 0 });

describe("G2 observed Silent target identities", () => {
  it("uses only the exact ascension's own linked encounter counts, including compound Bosses", () => {
    const value = pool();
    expect(value.stages[1]).toMatchObject({ act: 2, candidates: [{ boss: "B", count: 2, frequency: .25 }, { boss: "C", count: 6, frequency: .75 }] });
    expect(value.stages[1]!.candidates[0]!.evidence).toContain("encounters.B_PART+SIDE.acts");
    expect(value.unit).toBe("observed_fight_records_including_retries");
    expect(observedGlobalBossPool(records(), 9, source).stages).toEqual([]);
    expect(() => observedGlobalBossPool({ ...records(), meta: { character: "ironclad" } }, 10, source)).toThrow("Silent");
  });
  it("marks unassigned or partially linked observations unknown rather than normalizing away missing records", () => {
    const input = records();
    delete (input.encounters as Record<string, unknown>)["B_PART+SIDE"];
    const value = observedGlobalBossPool(input, 10, source);
    expect(value.unknown).toEqual([{ boss: "B", reason: "own_encounter_act_or_count_not_fully_observed" }]);
    const targets = globalBossTargets(value, 1, new Map([[1, "A"]]), () => null);
    expect(targets.find((row) => row.boss === "A")!.unknown).toBeNull();
    expect(targets.find((row) => row.boss === "C")!.unknown).toBe("observed_pool_has_unassigned_boss_records");
  });
  it("prefers actual visible identity to its frequency pool and does not mutate an empty pool", () => {
    const targets = globalBossTargets(pool(), 2, new Map([[2, "VISIBLE"]]), () => null);
    expect(targets.filter((row) => row.act === 2)).toMatchObject([{ boss: "VISIBLE", frequency: 1, source: "visible_actual_boss" }]);
    const value = pool(); value.stages = [];
    globalBossTargets(value, 1, new Map(), () => null);
    expect(value.stages).toEqual([]);
  });
});

describe("G2 shadow paired probabilities and coverage", () => {
  it("reuses current B3, serially evaluates future candidates, and leaves Act3/final unknown", async () => {
    const evaluate = vi.fn(async (_target: GlobalBossTarget) => result());
    const value = await evaluateGlobalBuild({ ...args(), evaluate });
    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(evaluate.mock.calls.map((call) => call[0]?.boss)).toEqual(["B", "C"]);
    expect(value.targets[0]).toMatchObject({ status: "reused_current", reported_sim_ms: 12, production_calibration: "unknown" });
    expect(value.targets.find((row) => row.target.act === 3)).toMatchObject({ status: "unknown", rows: [
      { base: null, option: null, delta_win: null, delta_s: null },
      { base: null, option: null, delta_win: null, delta_s: null },
      { base: null, option: null, delta_win: null, delta_s: null },
    ] });
    expect(value.final_sequence).toEqual({ status: "unknown", reason: "G1a_natural_consumer_pending" });
    expect(value).toMatchObject({ mode: "shadow", delivered: false, s_sort: false, status: "partial" });
    const take = value.summaries.find((row) => row.key === "take")!;
    expect(take).toMatchObject({ known_acts: [1, 2], unknown_acts: [3], sum_delta_p_over_p: null, conditional_snapshot_product: null });
    expect(take.known_only.sum_delta_p_over_p).toBeCloseTo(.4);
    expect(take.known_only.snapshot_product!.base).toBeCloseTo(.25);
    expect(take.known_only.snapshot_product!.option).toBeCloseTo(.36);
    expect(value.targets[0]!.rows.find((row) => row.key === "take")!.delta_s).toEqual({ mean: .2, se: .03 });
  });
  it("keeps low-trust Bosses and unsupported offered candidates unknown with no extra computation", async () => {
    const evaluate = vi.fn(async (_target: GlobalBossTarget) => result());
    const value = await evaluateGlobalBuild({ ...args(), evaluate, keys: ["unsupported"], trustReason: (boss) => boss === "B" ? "quality_gate" : null });
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(value.targets.find((row) => row.target.boss === "B")!.rows[0]).toMatchObject({ unknown: "quality_gate", base: null, delta_s: null });
    expect(value.summaries[0]).toMatchObject({ known_acts: [], unknown_acts: [1, 2, 3], sum_delta_p_over_p: null });
  });
  it("does not renormalize a partial future pool after failure and preserves the service failure", async () => {
    const value = await evaluateGlobalBuild({ ...args(), evaluate: async (target) => {
      if (target.boss === "B") throw new Error("fixed worker failure");
      return result();
    } });
    expect(value.targets.find((row) => row.target.boss === "B")!.rows[0]!.unknown).toContain("fixed worker failure");
    expect(value.summaries.find((row) => row.key === "take")!).toMatchObject({ known_acts: [1], unknown_acts: [2, 3] });
  });
  it("rejects incomplete fixed samples and a forged C2 status through the existing completion contract", async () => {
    const value = await evaluateGlobalBuild({ ...args(), evaluate: async () => ({ ...result(), samples: 1, adaptive: { status: "complete_adaptive" } }) });
    expect(value.targets.filter((row) => row.target.act === 2).every((row) => row.status === "unknown")).toBe(true);
    expect(value.targets[1]!.rows[0]!.unknown).toContain("incomplete");
  });
  // 5H83F3J0XSTE F8/F12/F19/F20: 838/260/103/504 actual pairs, all budgeted partials.
  it.each([838, 260, 103, 504, 1, 0])("preserves a budgeted %i-pair prefix as incomplete shadow data, not a service failure", async (samples) => {
    const current = result();
    Object.assign(current, { samples, requested: 1000, timedOut: true,
      completion: { required: true, uniqueDecks: 3, originalDecks: 3, memoHit: false,
        budgeted: true, failure: false, status: "partial", samples, requested: 1000 },
      adaptive: { mode: "on", status: "partial" } });
    for (const option of [current.base, ...current.options]) option.samples = samples;
    const value = await evaluateGlobalBuild({ ...args(), current, evaluate: async () => structuredClone(current) });
    expect(value.status).toBe("partial");
    expect(value.targets[0]).toMatchObject({ status: "budgeted_partial", reused_current: true,
      completion: current.completion, adaptive: current.adaptive, reported_sim_ms: 12 });
    expect(value.targets[1]).toMatchObject({ status: "budgeted_partial", reused_current: false });
    const row = value.targets[0]!.rows.find((row) => row.key === "take")!;
    expect(row.samples).toBe(samples);
    if (samples >= 2) expect(row).toMatchObject({ base: .5, option: .6, delta_win: { mean: .1, se: .02 }, unknown: "budgeted_prefix_incomplete" });
    else expect(row).toMatchObject({ base: null, option: null, delta_win: null, unknown: "paired_probability_or_reference_missing" });
    expect(value.summaries[0]).toMatchObject({ known_acts: [], unknown_acts: [1, 2, 3],
      sum_delta_p_over_p: null, conditional_snapshot_product: null });
    expect(JSON.stringify(value)).not.toContain("global_computation_failed:");
    expect(value).toMatchObject({ delivered: false, s_sort: false, final_sequence: { status: "unknown" } });
  });
  it("requires explicit matching budget completion and keeps non-budget or failed partials as errors", async () => {
    for (const patch of [{ budgeted: false }, { failure: true }, { failure: undefined }, { required: false },
      { status: "degraded" }, { status: "pending" }, { samples: 261 }, { requested: 999 }]) {
      const current = result();
      Object.assign(current, { samples: 260, requested: 1000, timedOut: true,
        completion: { required: true, uniqueDecks: 3, originalDecks: 3, memoHit: false,
          budgeted: true, failure: false, status: "partial", samples: 260, requested: 1000, ...patch } });
      const value = await evaluateGlobalBuild({ ...args(), current });
      expect(value.targets[0]!.status, JSON.stringify(patch)).toBe("unknown");
      expect(value.targets[0]!.rows[0]!.unknown).toBe("global_computation_failed:global_required_computation_incomplete");
    }
  });
  it("uses each option's paired reference instead of the baseline's later or unpaired samples", async () => {
    const current = result(.8, .1);
    current.options[0] = { ...current.options[0]!, win: .3, pairedReference: { samples: 100, rawWin: .2, calibratedWin: .2, bossLeft: 0 } };
    const value = await evaluateGlobalBuild({ ...args(), current });
    const row = value.targets[0]!.rows.find((row) => row.key === "take")!;
    expect(row.base).toBe(.2);
    expect(row.option).toBeCloseTo(.3);
    expect(row.delta_win).toEqual({ mean: .1, se: .02 });
  });
  it("keeps real 0/1 prefix means known when B3's four-decimal delta cannot reconstruct them", async () => {
    for (const [p, reference, delta] of [[1, 1 / 3, .6667], [0, 2 / 3, -.6667]]) {
      const current = result(.8, delta);
      current.options[0] = { ...current.options[0]!, win: p!, pairedReference: { samples: 100, rawWin: reference!, calibratedWin: reference!, bossLeft: 0 } };
      const value = await evaluateGlobalBuild({ ...args(), current });
      const row = value.targets[0]!.rows.find((row) => row.key === "take")!;
      expect(row).toMatchObject({ option: p, base: reference, unknown: null });
      expect(row.delta_win!.mean).toBe(delta);
    }
  });
  it("keeps a zero baseline ratio undefined without inventing an epsilon", async () => {
    const value = await evaluateGlobalBuild({ ...args(), current: result(0, .1) });
    const summary = value.summaries.find((row) => row.key === "take")!;
    expect(summary.known_only.sum_delta_p_over_p).toBeNull();
    expect(summary.reasons).toContain("zero_baseline_ratio_undefined");
    expect(summary.known_only.snapshot_product!.base).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { buildRank } from "../src/sim/build-rank.js";
import { buildRankingSelection, rankingOverrideProblems } from "../src/sim/build-ranking-choice.js";
import type { OptionSim } from "../src/sim/build-sim.js";
import type { FightSampleResult } from "../src/sim/boss-sim.js";
import { pickSpec, shopPlanSpec, stableSchema } from "../src/brain/specs.js";
import { sBuildRankMode } from "../src/core/config.js";

// Abstract arithmetic fixtures only; no card, Boss or game-rule assertions.
function samples(wins: number, outgoing = 50, received = 50): FightSampleResult[] {
  return Array.from({ length: 100 }, (_, i) => ({ won: i < wins, died: i >= wins, capped: false, timeUp: false,
    turns: 5, hpLoss: i < wins ? received / 2 : received, revived: 0, drunk: [], enemyHpLeft: i < wins ? 0 : 100 - outgoing,
    lossByTurn: [], dmgByTurn: [], incomingByTurn: [], enemyLossByTurn: [], policyTurns: 5, policyNodes: 0,
    bossMargin: { reference: { bossHp: 100, myHp: 50, enemyIds: ["ARITHMETIC"], unknown: [] },
      outgoingHp: i < wins ? 100 : outgoing, receivedHp: i < wins ? received / 2 : received } }));
}
function option(key: string, rows: FightSampleResult[]): OptionSim {
  const win = rows.filter((row) => row.won).length / rows.length;
  return { key, samples: rows.length, win, winCal: win, diff: null, bossLeft: 0, hpLossMean: 0, hpLossWon: null,
    turns: 5, deathTurn: null, order: null, hp: 50 };
}
function rank(base: FightSampleResult[], variants: Record<string, FightSampleResult[]>, lowTrust: string | null = null, sSort?: "on" | "shadow") {
  return buildRank(option("base", base), Object.entries(variants).map(([key, rows]) => ({ ...option(key, rows),
    diff: { raw: 0, se: 0, cal: 0, calSe: 0, bossLeft: 0, bossLeftSe: 0, hpLossSe: 0,
      hpLoss: rows.reduce((sum, row) => sum + row.hpLoss, 0) / rows.length - base.reduce((sum, row) => sum + row.hpLoss, 0) / base.length } })),
    { base, options: new Map(Object.entries(variants)) }, { tieSe: 2, calibratedFloor: .05, lowTrust, calibrate: (p) => p, ...(sSort ? { sSort } : {}) });
}

describe("P2 paired construction ranking", () => {
  it("keeps S calculations and counterfactual groups in shadow without using S for production groups", () => {
    const result = rank(samples(0, 20), { worse: samples(0, 10), better: samples(0, 80), same: samples(0, 20) }, null, "shadow");
    expect(result.best_group).toEqual(["worse", "better", "same"]);
    expect(result.no_difference).toEqual(["worse", "better", "same"]);
    expect(result.comparisons.every((row) => row.metric === "win")).toBe(true);
    expect(result.rows.find((row) => row.key === "better")!.delta_s!.mean).toBeCloseTo(.12);
    expect(result.shadow_s_ranking!.best_group).toEqual(["better"]);
    expect(result.shadow_s_ranking!.comparisons.some((row) => row.metric === "S")).toBe(true);
  });
  it("retains win ordering and the existing HP tie key in S shadow", () => {
    expect(rank(samples(100, 100, 98), { stable: samples(100, 100, 98), volatile: samples(70, 99, 0) }, null, "shadow").best_group).toEqual(["stable"]);
    const result = rank(samples(100), { slow: samples(100, 100, 40), preserved: samples(100, 100, 20) }, null, "shadow");
    expect(result.best_group).toEqual(["preserved"]);
  });
  it("groups improvements, unchanged options and regressions against the same base", () => {
    const result = rank(samples(50), { better: samples(90), same: samples(50), worse: samples(10) });
    expect(result.best_group).toEqual(["better"]);
    expect(result).toMatchObject({ better_than_current: ["better"], no_difference: ["same"], worse_than_current: ["worse"], win_saturated: false });
    expect(result.rows.map((row) => row.rank)).toEqual([1, 2, 3]);
  });
  it("uses S for saturated zero wins and reports paired attack/defense contributions", () => {
    const result = rank(samples(0, 20), { worse: samples(0, 10), better: samples(0, 80), same: samples(0, 20) });
    expect(result.best_group).toEqual(["better"]);
    expect(result.win_saturated).toBe(true);
    expect(result.rows[0]).toMatchObject({ group: "better_than_current", main_source: "offense", s_eligible: true });
    expect(result.rows[0]!.delta_a!.mean).toBeCloseTo(.12);
    expect(result.rows[0]!.delta_d!.mean).toBe(0);
  });
  it("keeps win rate first even when an alternative has a higher mean S", () => {
    expect(rank(samples(100, 100, 98), { stable: samples(100, 100, 98), volatile: samples(70, 99, 0) }).best_group).toEqual(["stable"]);
  });
  it("does not fabricate covariance by combining errors against the baseline", () => {
    const a = samples(0), b = samples(0);
    a.forEach((row, i) => { row.bossMargin!.outgoingHp = i % 2 ? 90 : 10; });
    b.forEach((row, i) => { row.bossMargin!.outgoingHp = a[i]!.bossMargin!.outgoingHp + 1; });
    const result = rank(samples(0, 50), { a, b });
    expect(result.best_group).toEqual(["b"]);
    expect(result.comparisons.find((row) => row.metric === "S" && row.key === "a" && row.reference === "b")!.se).toBeLessThan(1e-15);
  });
  it("retains the old HP tie key and all candidates when S is missing", () => {
    const a = samples(100, 100, 40), b = samples(100, 100, 20);
    a[0]!.bossMargin!.receivedHp = null;
    const result = rank(samples(100), { a, b });
    expect(result.best_group).toEqual(["b"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.find((row) => row.key === "a")!.delta_s).toBeNull();
    expect(result.comparisons.every((row) => row.metric === "win")).toBe(true);
  });
  it("reports only win ordering for low trust and never calls missing S zero", () => {
    const result = rank(samples(0), { a: samples(0, 10), b: samples(0, 90) }, "unvalidated");
    expect(result.best_group).toEqual(["a", "b"]);
    expect(result.rows.every((row) => row.delta_s === null && row.delta_a === null && row.main_source === "unknown")).toBe(true);
  });
  it("allows an option's evidenced entry-HP change but rejects an incompatible Boss window", () => {
    const a = samples(100, 100, 40), b = samples(100, 100, 40);
    a.forEach((row) => { row.bossMargin!.reference.myHp = 60; });
    b.forEach((row) => { row.bossMargin!.reference.enemyIds = ["OTHER"]; });
    const result = rank(samples(100), { a, b });
    expect(result.rows.find((row) => row.key === "a")!.s_eligible).toBe(true);
    expect(result.rows.find((row) => row.key === "b")!.s_eligible).toBe(false);
  });
  it("requires actual paired samples and isolates other roles", () => {
    expect(() => rank(samples(100), { short: samples(100).slice(1) })).toThrow("paired");
    expect(sBuildRankMode("SILENT", {})).toBe("on");
    expect(sBuildRankMode("SILENT", { S_BUILD_RANK: "shadow" })).toBe("shadow");
    expect(sBuildRankMode("SILENT", { S_BUILD_RANK: "off" })).toBe("off");
    expect(sBuildRankMode("SILENT", { S_BUILD_RANK: "on" })).toBe("on");
    expect(sBuildRankMode("IRONCLAD", { S_BUILD_RANK: "on" })).toBe("off");
  });
});

const ranking = { schema: "build-ranking-v1", best_group: ["remove|c1"], candidates: [
  { key: "remove|c1", choice_key: "remove", card_key: "c1" },
  { key: "remove|c2", choice_key: "remove", card_key: "c2" },
  { key: "leave", choice_key: "leave", card_key: null } ] };
const state = { facts: { build_ranking: ranking, your_cards: { c1: "A", c2: "B" } } };
describe("P2 actual answer schema", () => {
  it("requires a short reason for a known override and keeps the standard retry path", () => {
    const spec = pickSpec("reward/card", { remove: "{}", leave: "{}" }, state);
    expect(spec.reask).toBe(true);
    expect(spec.validate({ choice: "leave", reason: "normal" }).join()).toContain("ranking_override_reason");
    expect(spec.validate({ choice: "leave", ranking_override_reason: "Preserve a route resource." })).toEqual([]);
    expect(spec.validate({ choice: "leave", ranking_override_reason: "word ".repeat(26) }).join()).toContain("25 words");
    expect(stableSchema(spec).properties).toHaveProperty("ranking_override_reason");
    expect(stableSchema(pickSpec("reward/card", { leave: "{}" }, {})).properties).not.toHaveProperty("ranking_override_reason");
  });
  it("does not call a pending target selection an actual best-card choice", () => {
    expect(buildRankingSelection(ranking, { choice: "remove" })).toMatchObject({ target_pending: true, deviated: null });
    expect(buildRankingSelection(ranking, { choice: "remove", cards: ["c1"] })).toMatchObject({ target_pending: false, deviated: false });
    expect(rankingOverrideProblems(ranking, { choice: "remove", cards: ["c2"] })).toHaveLength(1);
  });
  it("checks the shop's first purchase/removal without claiming a complete shopping-list optimum", () => {
    const spec = shopPlanSpec("shop/plan", { remove: "{}", leave: "{}" }, state);
    expect(spec.validate({ plan: ["remove:c1"] })).toEqual([]);
    expect(spec.validate({ plan: ["remove:c2"] }).join()).toContain("ranking_override_reason");
    expect(spec.validate({ choice: "remove:c1" })).toEqual([]);
    expect(buildRankingSelection(ranking, { plan: ["remove:c1", "leave"] }, true)).toMatchObject({ deviated: false, scope: "first_purchase_or_removal_only" });
  });
});

import { describe, expect, it } from "vitest";
import { rankLines, wonLoss } from "../src/sim/boss-lines.js";
import { summarizeLine, type FightSampleResult } from "../src/sim/boss-sim.js";
import { sCombatRankEnabled } from "../src/core/config.js";

// Algebraic fixtures, not observations of any game mechanic or Boss.
function sample(won: boolean, outgoing: number, received: number, turns = 5): FightSampleResult {
  return { won, died: !won, capped: false, timeUp: false, turns, hpLoss: received, revived: 0,
    drunk: [], enemyHpLeft: 100 - outgoing, lossByTurn: [], dmgByTurn: [], incomingByTurn: [],
    enemyLossByTurn: [], policyTurns: turns, policyNodes: 0,
    bossMargin: { reference: { bossHp: 100, myHp: 50, enemyIds: ["ALGEBRA"], unknown: [], startTurn: 1 },
      outgoingHp: outgoing, receivedHp: received } };
}
const line = (i: number, value: FightSampleResult | FightSampleResult[]) => summarizeLine(i,
  Array.isArray(value) ? value : Array.from({ length: 100 }, () => structuredClone(value)));
const ranked = (lines: ReturnType<typeof line>[], lowTrust: string | null = null, eligible = (_: number) => true) =>
  rankLines(lines, 2, eligible, wonLoss, { lowTrust });

describe("P3 paired S sorting", () => {
  it("admits explicit adaptive prefixes while keeping own means and common-prefix differences", () => {
    const a = line(0, Array.from({ length: 200 }, () => sample(false, 20, 50)));
    const b = line(1, Array.from({ length: 600 }, (_, i) => sample(false, i < 200 ? 80 : 60, 50)));
    expect(ranked([a, b]).sRanking?.used).toBe(false);
    const result = rankLines([a, b], 2, () => true, wonLoss, { lowTrust: null, allowPrefixes: true });
    expect(result).toMatchObject({ best: 1, order: [1, 0], sRanking: { used: true } });
    expect(result.sRanking!.comparisons.find((row) => row.line === 0 && row.leader === 1)).toMatchObject({ samples: 200 });
    expect(result.sRanking!.comparisons.find((row) => row.line === 0 && row.leader === 1)!.mean).toBeCloseTo(-.12);
    expect(result.sRanking!.scores.find((row) => row.line === 1)!.mean).toBeCloseTo(-1 / 15);
  });
  it("distinguishes all-death lines by their admitted margin and keeps the full order consistent", () => {
    const lines = [line(0, sample(false, 20, 50)), line(1, sample(false, 80, 50)), line(2, sample(false, 50, 50))];
    expect(rankLines(lines).best).toBe(0);
    const result = ranked(lines);
    expect(result).toMatchObject({ best: 1, tied: [], order: [1, 2, 0], sRanking: { used: true, old_best: 0 } });
    expect(result.sRanking?.comparisons.find((row) => row.line === 0 && row.leader === 1)).toMatchObject({ se: 0, tied: false });
  });
  it("compares all-win HP fractions per turn, then uses the old median key inside a paired S tie", () => {
    const lines = [line(0, sample(true, 100, 10, 10)), line(1, sample(true, 100, 20, 2))];
    expect(rankLines(lines).best).toBe(0);
    expect(ranked(lines).best).toBe(1);
    const equal = [line(0, sample(true, 100, 25, 5)), line(1, sample(true, 100, 10, 8))];
    expect(ranked(equal)).toMatchObject({ best: 1, order: [1, 0], sRanking: { s_groups: [[1, 0]] } });
  });
  it("retains win probability as the first key even when the losing line has a larger mean S", () => {
    const wins = line(0, sample(true, 100, 49, 10));
    const volatile = line(1, Array.from({ length: 100 }, (_, i) => i < 70 ? sample(true, 100, 0, 1) : sample(false, 99, 50)));
    expect(ranked([wins, volatile])).toMatchObject({ best: 0, winTied: [true, false] });
  });
  it("uses paired differences, not independent confidence intervals, to establish a tie", () => {
    const a = line(0, Array.from({ length: 100 }, (_, i) => sample(false, i % 2 ? 90 : 10, 50)));
    const b = line(1, Array.from({ length: 100 }, (_, i) => sample(false, i % 2 ? 91 : 11, 50)));
    expect(ranked([a, b])).toMatchObject({ best: 1, tied: [], sRanking: { s_groups: [[1], [0]] } });
  });
  it.each(["missing", "sign", "capped", "reference", "short"])("rejects the entire tied group for %s evidence", (kind) => {
    const a = line(0, sample(false, 20, 50)), b = line(1, sample(false, 80, 50));
    if (kind === "missing") b.outcomes[0]!.bossMargin!.receivedHp = null;
    if (kind === "sign") b.outcomes.forEach((s) => { s.bossMargin!.outgoingHp = 110; });
    if (kind === "capped") b.outcomes[0]!.capped = true;
    if (kind === "reference") b.outcomes[0]!.bossMargin!.reference.startTurn = 2;
    if (kind === "short") b.outcomes.pop();
    const old = rankLines([a, b]);
    const { sRanking, ...result } = ranked([a, b]);
    expect(sRanking?.used).toBe(false);
    expect(result).toEqual(old);
  });
  it("retains low-trust fallback and eligible/dry candidate restrictions", () => {
    const lines = [line(0, sample(false, 20, 50)), line(1, sample(false, 80, 50))];
    const { sRanking, ...fallback } = ranked(lines, "uncalibrated");
    expect(fallback).toEqual(rankLines(lines));
    expect(sRanking).toMatchObject({ used: false, reason: "low_trust" });
    expect(ranked(lines, null, (i) => i === 0).best).toBe(0);
    expect(ranked(lines, null, () => false).best).toBe(-1);
  });
  it("keeps exact ties stable and exposes them without dropping candidates", () => {
    const lines = [line(0, sample(false, 80, 50)), line(1, sample(false, 80, 50))];
    expect(ranked(lines)).toMatchObject({ best: 0, tied: [0, 1], order: [0, 1] });
  });
  it("only enables Silent; off and every other character preserve the old rank result", () => {
    expect(sCombatRankEnabled("SILENT", {})).toBe(true);
    expect(sCombatRankEnabled("SILENT", { S_COMBAT_RANK: "off" })).toBe(false);
    expect(sCombatRankEnabled("SILENT", { S_COMBAT_RANK: "typo" })).toBe(false);
    for (const role of ["IRONCLAD", "REGENT", "DEFECT", "NECROBINDER"]) {
      expect(sCombatRankEnabled(role, { S_COMBAT_RANK: "on" })).toBe(false);
    }
  });
});

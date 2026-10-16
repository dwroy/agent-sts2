import { describe, expect, it } from "vitest";
import { auditSigns } from "../src/sim/s-sign.js";
import { bossReadiness, lossGap, readinessText } from "../src/sim/boss-readiness.js";
import type { MarginSample } from "../src/sim/boss-margin.js";
import { sReadinessMode } from "../src/core/config.js";

function sample(won: boolean, outgoingHp: number, receivedHp: number | null, turns = 7): MarginSample {
  return { won, died: !won, capped: false, timeUp: false, turns,
    bossMargin: { reference: { bossHp: 300, myHp: 60, enemyIds: ["FIXTURE"], unknown: [] }, outgoingHp, receivedHp } };
}

describe("S sign audit and readiness algebra", () => {
  it("checks both signs and rejects zero rather than counting it as a loss", () => {
    const audit = auditSigns([sample(true, 300, 30), sample(false, 240, 60), sample(false, 300, 60)]);
    expect(audit.valid).toBe(3);
    expect(audit.mismatches).toBe(1);
    expect(audit.rankingEligible).toBe(false);
  });
  it("keeps missing, capped, sequences and ambiguous healing out of the sign denominator", () => {
    const audit = auditSigns([sample(true, 300, 30), sample(false, 240, null),
      { ...sample(false, 240, 60), capped: true }, { ...sample(false, 240, 60), sequence: {} }]);
    expect(audit).toMatchObject({ samples: 4, valid: 1, missing: 3, mismatches: 0, rankingEligible: false });
    expect(audit.groups[0]?.healing).toBe(null);
  });
  it("does not hide a failing revival subgroup in a large passing group", () => {
    const rows = Array.from({ length: 200 }, () => sample(true, 300, 30));
    expect(auditSigns([...rows, { ...sample(true, 300, 90), revived: 1 }])).toMatchObject({ passed: true, rankingEligible: false });
  });
  it("matches the two hand-calculated loss examples, including O=0", () => {
    const value = bossReadiness([sample(false, 240, 60), sample(false, 150, 60, 5)], { calibratedWin: 0 });
    // k = 60/7 and 150/5; h = 60*300/240-60 and 60*300/150-60.
    expect(value.gap.offense.p50).toBeCloseTo((60 / 7 + 30) / 2);
    expect(value.gap.defense.p50).toBe(37.5);
    expect(lossGap(sample(false, 240, 60))).toEqual({ offense: 60 / 7, defense: 15 });
    expect(lossGap(sample(false, 150, 60, 5))).toEqual({ offense: 30, defense: 60 });
    const zero = bossReadiness([sample(false, 0, 60)], { calibratedWin: 0 });
    expect(zero.gap.defense).toMatchObject({ n: 0, missing: 1, p50: null });
    expect(zero.sensitivity.every((point) => point.win_with_hp === 0)).toBe(true);
  });
  it("covers all wins, all losses and mixtures without NaN", () => {
    for (const rows of [[sample(true, 300, 30)], [sample(false, 240, 60)], [sample(true, 300, 30), sample(false, 240, 60)]]) {
      const value = bossReadiness(rows, { calibratedWin: 0.5, calibrate: (p) => p });
      expect(value.trust.rankingEligible).toBe(true);
      expect(JSON.stringify(value)).not.toContain("NaN");
      expect(value.win.calibrated_mc_interval95).toEqual(value.win.raw_interval95);
      expect(value.sensitivity.map((point) => point.relative)).toEqual([0.1, 0.25, 0.5]);
    }
  });
  it("records low-trust data without presenting it to the brain", () => {
    const value = bossReadiness([sample(true, 300, 30)], { calibratedWin: 1, lowTrust: "fixture low trust" });
    expect(value.valid).toBe(1);
    expect(value.trust.rankingEligible).toBe(false);
    expect(readinessText(value)).toBe("低可信，未提供准备度诊断。");
    expect(value.sensitivity.every((point) => point.win_with_hp === 1)).toBe(true);
  });
  it("never turns unknown attribution into an estimated sensitivity", () => {
    const value = bossReadiness([sample(true, 300, 30), sample(false, 240, null)], { calibratedWin: 0.5 });
    expect(value).toMatchObject({ samples: 2, valid: 1, missing: 1 });
    expect(value.sensitivity.every((point) => point.win_with_dpr === null)).toBe(true);
  });
  it("enables the accepted Silent diagnostic and isolates every other character even with on requested", () => {
    expect(sReadinessMode("SILENT", {})).toBe("shadow");
    expect(sReadinessMode("SILENT", { S_READINESS: "shadow" })).toBe("shadow");
    expect(sReadinessMode("SILENT", { S_READINESS: "off" })).toBe("off");
    expect(sReadinessMode("SILENT", { S_READINESS: "on" })).toBe("on");
    expect(sReadinessMode("SILENT", { S_READINESS: "typo" })).toBe("off");
    expect(sReadinessMode("IRONCLAD", { S_READINESS: "on" })).toBe("off");
    expect(sReadinessMode("REGENT", { S_READINESS: "on" })).toBe("off");
  });
});

/** Audit the proposed S/sign equivalence; zero and contradictory terminal flags never count as agreement. */
import { marginOf, type MarginSample } from "./boss-margin.js";

export const S_SIGN_MAX_MISMATCH = 0.01;
export interface SignAuditSample extends MarginSample {
  revived?: number;
  healing?: boolean | null;
}

export function auditSigns(samples: readonly SignAuditSample[]) {
  const rows = samples.map((sample, index) => {
    const score = marginOf(sample);
    return { index, score, won: sample.won, died: sample.died,
      agrees: score === null ? null : sample.won !== sample.died && (sample.won ? score > 0 : score < 0),
      healing: sample.healing ?? (sample.bossMargin?.reference.unknown.some((reason) => /heal/i.test(reason)) ? true : null),
      revived: (sample.revived ?? 0) > 0,
      overkill: sample.bossMargin ? sample.bossMargin.outgoingHp > sample.bossMargin.reference.bossHp : null };
  });
  const summary = (subset: typeof rows) => {
    const valid = subset.filter((row) => row.agrees !== null);
    const mismatches = valid.filter((row) => !row.agrees);
    const rate = valid.length ? mismatches.length / valid.length : null;
    return { samples: subset.length, valid: valid.length, missing: subset.length - valid.length,
      mismatches: mismatches.length, mismatch_rate: rate,
      passed: rate !== null && rate <= S_SIGN_MAX_MISMATCH,
      exceptions: mismatches.map((row) => ({ sample: row.index, score: row.score, won: row.won, died: row.died })) };
  };
  const groups = [...new Set(rows.map((row) => JSON.stringify([row.healing, row.revived, row.overkill])))].map((key) => {
    const [healing, revived, overkill] = JSON.parse(key) as [boolean | null, boolean, boolean | null];
    return { healing, revived, overkill, ...summary(rows.filter((row) => JSON.stringify([row.healing, row.revived, row.overkill]) === key)) };
  });
  const all = summary(rows);
  return { schema: "s-sign-audit-v1", ...all, groups,
    rankingEligible: all.passed && all.missing === 0 && groups.every((group) => group.passed),
    limits: "Conditional simulation audit only. Missing attribution is not zero; unrecorded healing stays unknown. Not a calibration of real wins." };
}

/** Diagnostic algebra over existing samples. No simulation, action selection, or game constants. */
import { marginOf } from "./boss-margin.js";
import { auditSigns, type SignAuditSample } from "./s-sign.js";
import { binomialInterval, summarizeSamples } from "./quantitative-stats.js";

export const READINESS_LIMITS = "Linear constant-rate approximation for diagnosis only, never ranking. Extra damage changes fight duration; extra HP ignores scaling and play order. Missing or censored samples are not losses. Monte Carlo intervals exclude model and calibration uncertainty.";

export function lossGap(sample: SignAuditSample): { offense: number; defense: number | null } | null {
  if (marginOf(sample) === null || !sample.died || sample.won) return null;
  const trace = sample.bossMargin!;
  return { offense: (trace.reference.bossHp - trace.outgoingHp) / sample.turns,
    defense: trace.outgoingHp > 0 ? trace.receivedHp! * trace.reference.bossHp / trace.outgoingHp - trace.reference.myHp : null };
}

function gapDistribution(values: number[], missing: number) {
  const xs = [...values].sort((a, b) => a - b);
  const q = (p: number) => {
    if (!xs.length) return null;
    const at = (xs.length - 1) * p;
    return xs[Math.floor(at)]! + (xs[Math.ceil(at)]! - xs[Math.floor(at)]!) * (at % 1);
  };
  return { n: xs.length, missing, p25: q(0.25), p50: q(0.5), p75: q(0.75) };
}

export function bossReadiness(samples: readonly SignAuditSample[], options: {
  calibratedWin: number; calibrate?: (raw: number) => number; lowTrust?: string | null;
}) {
  const audit = auditSigns(samples);
  const valid = samples.filter((sample) => marginOf(sample) !== null);
  const wins = valid.filter((sample) => sample.won && !sample.died);
  const losses = valid.filter((sample) => sample.died && !sample.won);
  const spread = (rows: typeof valid, measure: (sample: SignAuditSample) => number) => summarizeSamples(rows.map(measure));
  const gaps = losses.map((sample) => lossGap(sample)!);
  const offensive = gaps.map((gap) => gap.offense);
  const defensive = gaps.flatMap((gap) => gap.defense === null ? [] : [gap.defense]);
  const dpr = spread(valid, (sample) => sample.bossMargin!.outgoingHp / sample.turns).mean;
  const interval = binomialInterval(samples.filter((sample) => sample.won).length, samples.length);
  const rankingEligible = !options.lowTrust && audit.rankingEligible;
  const reference = samples[0]?.bossMargin?.reference ?? null;
  const sameReference = !!reference && samples.every((sample) => sample.bossMargin?.reference.bossHp === reference.bossHp
    && sample.bossMargin.reference.myHp === reference.myHp);
  const sensitivity = [0.1, 0.25, 0.5].map((relative) => {
    const attack = dpr === null ? null : dpr * relative;
    const hp = sameReference ? reference!.myHp * relative : null;
    return { relative, extra_dpr: attack, extra_hp: hp,
      win_with_dpr: audit.rankingEligible && attack !== null ? (wins.length + offensive.filter((gap) => gap <= attack).length) / valid.length : null,
      win_with_hp: audit.rankingEligible && hp !== null ? (wins.length + defensive.filter((gap) => gap <= hp).length) / valid.length : null };
  });
  return {
    schema: "boss-readiness-v1", samples: samples.length, valid: valid.length, missing: samples.length - valid.length,
    reference,
    win: { raw: samples.length ? samples.filter((sample) => sample.won).length / samples.length : null,
      calibrated: options.calibratedWin, raw_interval95: interval,
      calibrated_mc_interval95: interval && options.calibrate ? interval.map(options.calibrate) : null,
      interval_scope: "won_before_simulation_termination; mapped_MC_interval_is_not_calibration_uncertainty" },
    loss: { n: losses.length,
      bossLeftFraction: spread(losses, (sample) => 1 - sample.bossMargin!.outgoingHp / sample.bossMargin!.reference.bossHp),
      deathTurn: spread(losses, (sample) => sample.turns) },
    win_side: { n: wins.length,
      hpLeftFraction: spread(wins, (sample) => 1 - sample.bossMargin!.receivedHp! / sample.bossMargin!.reference.myHp),
      turns: spread(wins, (sample) => sample.turns) },
    terms: { A: spread(valid, (sample) => sample.bossMargin!.outgoingHp / sample.turns / sample.bossMargin!.reference.bossHp),
      D: spread(valid, (sample) => sample.bossMargin!.receivedHp! / sample.turns / sample.bossMargin!.reference.myHp) },
    gap: { offense: gapDistribution(offensive, 0), defense: gapDistribution(defensive, losses.length - defensive.length) },
    sensitivity, sensitivity_denominator: valid.length,
    trust: { rankingEligible, bossTrustReason: options.lowTrust ?? null, sign_audit: audit },
    limits: READINESS_LIMITS,
  };
}

export type BossReadiness = ReturnType<typeof bossReadiness>;

/** The brain receives one compact statement; the complete diagnostic remains in the decision record. */
export function readinessText(value: BossReadiness): string {
  if (!value.trust.rankingEligible) return value.trust.bossTrustReason ? "低可信，未提供准备度诊断。" : "S符号审计或轨迹完整性未通过，未提供准备度诊断。";
  const n = (x: number | null) => x === null ? "未知" : String(Math.round(x * 10) / 10);
  const pct = (x: number | null) => x === null ? "未知" : `${Math.round(x * 100)}%`;
  const at = value.sensitivity[1]!;
  return `当前牌组Boss模拟胜率${pct(value.win.calibrated)}（原始${pct(value.win.raw)}）；输局${value.loss.n}例，Boss平均剩${pct(value.loss.bossLeftFraction.mean)}、死亡回合均值${n(value.loss.deathTurn.mean)}；缺口中位：进攻+${n(value.gap.offense.p50)}/回合或防守+${n(value.gap.defense.p50)}有效血；敏感度：DPR+25%→${pct(at.win_with_dpr)}，有效血+25%→${pct(at.win_with_hp)}（原始样本线性近似，仅诊断，不能排序；防守缺口未知${value.gap.defense.missing}例）。`;
}

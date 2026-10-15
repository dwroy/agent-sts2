/** P2: reproducible candidate groups from paired outcomes; no action is removed or dispatched here. */
import type { OptionSim } from "./build-sim.js";
import { marginOf } from "./boss-margin.js";
import { auditSigns, type SignAuditSample } from "./s-sign.js";
import { summarizeSamples, type SampleSummary } from "./quantitative-stats.js";

export interface BuildRankSamples {
  base: readonly SignAuditSample[];
  options: ReadonlyMap<string, readonly SignAuditSample[]>;
}
export interface BuildRankRow {
  samples?: number;
  paired_samples?: number;
  key: string;
  rank: number;
  group: "better_than_current" | "no_difference" | "worse_than_current";
  delta_win: { mean: number; se: number };
  delta_s: { mean: number; se: number } | null;
  delta_hp_loss: number;
  delta_a: { mean: number; se: number } | null;
  delta_d: { mean: number; se: number } | null;
  main_source: "offense" | "defense" | "both" | "unknown";
  s_eligible: boolean;
  s_reason: string | null;
}
export interface BuildRanking {
  schema: "build-ranking-v1";
  status: "produced";
  best_group: string[];
  groups: string[][];
  better_than_current: string[];
  no_difference: string[];
  worse_than_current: string[];
  win_saturated: boolean;
  low_trust: string | null;
  rows: BuildRankRow[];
  comparisons: { key: string; reference: string; metric: "win" | "S"; mean: number; se: number }[];
  limits: string;
}

export function buildRank(base: OptionSim, options: readonly OptionSim[], samples: BuildRankSamples,
  policy: { tieSe: number; calibratedFloor: number; lowTrust: string | null; calibrate: (win: number) => number; calibrationSamples?: number; allowPrefixes?: boolean }): BuildRanking {
  const n = samples.base.length, keys = options.map((option) => option.key);
  if (base.samples !== n) throw new Error("base sample count does not match ranking input");
  if (n < 2 || new Set(keys).size !== keys.length || options.some((option) => {
    const size = samples.options.get(option.key)?.length;
    return size === undefined || (policy.allowPrefixes ? size < 2 || size > n || size !== option.samples : size !== n);
  })) {
    throw new Error("build ranking requires complete paired sample identities");
  }
  const rowsOf = (key: string | null) => key === null ? samples.base : samples.options.get(key)!;
  const commonN = (a: string | null, b: string | null) => Math.min(rowsOf(a).length, rowsOf(b).length);
  const paired = (key: string, reference: string | null, value: (sample: SignAuditSample) => number): SampleSummary =>
    summarizeSamples(rowsOf(key).slice(0, commonN(key, reference)).map((sample, i) => value(sample) - value(rowsOf(reference)[i]!)));
  const rawWin = (key: string | null, count = rowsOf(key).length) => rowsOf(key).slice(0, count).filter((sample) => sample.won).length / count;
  const winDiff = (key: string, reference: string | null) => {
    const raw = paired(key, reference, (sample) => Number(sample.won));
    const count = commonN(key, reference);
    const a = rawWin(key, count), b = rawWin(reference, count), mean = policy.calibrate(a) - policy.calibrate(b);
    const h = 0.5 / ((policy.calibrationSamples ?? n) + 1), hi = Math.min(1, b + h), lo = Math.max(0, b - h);
    const slope = Math.abs(a - b) > 1e-9 ? mean / (a - b) : (policy.calibrate(hi) - policy.calibrate(lo)) / (hi - lo);
    return { mean, se: Math.abs(slope) * raw.meanSe! };
  };
  const sEligible = (key: string | null) => !policy.lowTrust && auditSigns(rowsOf(key)).rankingEligible;
  const admissible = new Map<string | null, boolean>([null, ...keys].map((key) => [key, sEligible(key)]));
  const scores = new Map(keys.map((key) => [key, admissible.get(key) ? summarizeSamples(rowsOf(key).map((sample) => marginOf(sample)!)).mean! : null]));
  const sameWindow = (a: string, b: string | null) => rowsOf(a).slice(0, commonN(a, b)).every((sample, i) => {
    const x = sample.bossMargin?.reference, y = rowsOf(b)[i]!.bossMargin?.reference;
    return x && y && x.bossHp === y.bossHp && (x.startTurn ?? 1) === (y.startTurn ?? 1)
      && JSON.stringify([...x.enemyIds].sort()) === JSON.stringify([...y.enemyIds].sort());
  });
  const canCompareS = (a: string, b: string | null) => admissible.get(a) === true && admissible.get(b) === true && sameWindow(a, b);
  const short = (v: SampleSummary) => ({ mean: v.mean!, se: v.meanSe! });
  const rows: BuildRankRow[] = options.map((option) => {
    const deltaWin = winDiff(option.key, null), eligible = canCompareS(option.key, null);
    const deltaS = eligible ? short(paired(option.key, null, (sample) => marginOf(sample)!)) : null;
    const term = (sample: SignAuditSample, incoming: boolean) => {
      const trace = sample.bossMargin!;
      return incoming ? trace.receivedHp! / sample.turns / trace.reference.myHp : trace.outgoingHp / sample.turns / trace.reference.bossHp;
    };
    const a = eligible ? short(paired(option.key, null, (sample) => term(sample, false))) : null;
    const d = eligible ? short(paired(option.key, null, (sample) => term(sample, true))) : null;
    const winTied = Math.abs(deltaWin.mean) <= policy.tieSe * deltaWin.se;
    const direction = !winTied ? Math.sign(deltaWin.mean)
      : deltaS && Math.abs(deltaS.mean) > policy.tieSe * deltaS.se ? Math.sign(deltaS.mean) : 0;
    return { ...(policy.allowPrefixes ? { samples: rowsOf(option.key).length, paired_samples: commonN(option.key, null) } : {}),
      key: option.key, rank: 0, group: direction > 0 ? "better_than_current" : direction < 0 ? "worse_than_current" : "no_difference",
      delta_win: deltaWin, delta_s: deltaS, delta_hp_loss: option.diff?.hpLoss ?? 0,
      delta_a: a, delta_d: d, main_source: !a || !d ? "unknown" : Math.abs(a.mean) > 2 * Math.abs(d.mean) ? "offense"
        : Math.abs(d.mean) > 2 * Math.abs(a.mean) ? "defense" : "both",
      s_eligible: eligible, s_reason: policy.lowTrust ?? (eligible ? null : "S符号、归属或同窗条件未通过") };
  });
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const comparisons: BuildRanking["comparisons"] = [], winGroups: string[][] = [], groups: string[][] = [];
  const order = new Map(keys.map((key, i) => [key, i]));
  const cmp = (a: number, b: number) => a === b ? 0 : a < b ? -1 : 1;
  let remaining = [...keys];
  while (remaining.length) {
    const leader = [...remaining].sort((a, b) => (policy.allowPrefixes
      ? cmp(policy.calibrate(rawWin(b)), policy.calibrate(rawWin(a)))
      : cmp(byKey.get(b)!.delta_win.mean, byKey.get(a)!.delta_win.mean)) || order.get(a)! - order.get(b)!)[0]!;
    const winGroup = remaining.filter((key) => {
      const delta = winDiff(key, leader);
      comparisons.push({ key, reference: leader, metric: "win", ...delta });
      return delta.mean >= -policy.tieSe * delta.se;
    });
    winGroups.push(winGroup);
    remaining = remaining.filter((key) => !winGroup.includes(key));
    let within = [...winGroup];
    const allS = within.every((key) => byKey.get(key)!.s_eligible && canCompareS(key, leader));
    while (within.length) {
      const topS = allS ? [...within].sort((a, b) => cmp(scores.get(b)!, scores.get(a)!) || order.get(a)! - order.get(b)!)[0]! : within[0]!;
      const sGroup = within.filter((key) => {
        if (!allS) return true;
        const delta = short(paired(key, topS, (sample) => marginOf(sample)!));
        comparisons.push({ key, reference: topS, metric: "S", ...delta });
        return delta.mean >= -policy.tieSe * delta.se;
      });
      // Low trust reports only win differences. Otherwise the existing paired HP key orders unresolved S ties.
      sGroup.sort((a, b) => (policy.lowTrust ? 0 : cmp(byKey.get(a)!.delta_hp_loss, byKey.get(b)!.delta_hp_loss)) || order.get(a)! - order.get(b)!);
      if (policy.lowTrust) groups.push(sGroup);
      else {
        for (const key of sGroup) {
          const last = groups[groups.length - 1];
          if (last && last.some((member) => sGroup.includes(member)) && byKey.get(last[0]!)!.delta_hp_loss === byKey.get(key)!.delta_hp_loss) last.push(key);
          else groups.push([key]);
        }
      }
      within = within.filter((key) => !sGroup.includes(key));
    }
  }
  groups.forEach((group, i) => group.forEach((key) => { byKey.get(key)!.rank = i + 1; }));
  return { schema: "build-ranking-v1", status: "produced", best_group: groups[0] ?? [], groups,
    better_than_current: rows.filter((row) => row.group === "better_than_current").map((row) => row.key),
    no_difference: rows.filter((row) => row.group === "no_difference").map((row) => row.key),
    worse_than_current: rows.filter((row) => row.group === "worse_than_current").map((row) => row.key),
    win_saturated: options.length > 0 && (options.every((option) => option.win < policy.calibratedFloor) || winGroups.length === 1),
    low_trust: policy.lowTrust, rows: [...rows].sort((a, b) => a.rank - b.rank || order.get(a.key)! - order.get(b.key)!), comparisons,
    limits: "同题同种子逐样本配对；先胜率、再合格S、最后配对掉血。只比较已模拟候选，未模拟选项保留未知；S不是胜率，缺口诊断不参与排序。大脑可偏离，但须说明理由。"
      + (policy.allowPrefixes ? "按需采样：各候选统计用自己的n；配对只用两者共有前缀，较短候选对基准的差不引用基准后续样本。" : "") };
}

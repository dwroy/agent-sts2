/** P3: paired S breaks win-rate ties only when the entire tied group is admissible. */
import { marginOf } from "./boss-margin.js";
import { auditSigns } from "./s-sign.js";
import { summarizeSamples } from "./quantitative-stats.js";
import { compareLines, type BossSimLineResult } from "./boss-sim.js";
import type { LinesRank } from "./boss-lines.js";

export interface CombatSRanking {
  schema: "s-combat-ranking-v1";
  used: boolean;
  reason: string | null;
  tie_se: number;
  win_group: number[];
  s_groups: number[][];
  audits: { line: number; audit: ReturnType<typeof auditSigns> }[];
  scores: { line: number; mean: number }[];
  comparisons: { line: number; leader: number; mean: number; se: number; tied: boolean }[];
  old_best: number;
  best: number;
}

/** Use anchored tie groups, so pairwise near-ties cannot make the sort comparator non-transitive. */
export function rankByBossMargin(lines: BossSimLineResult[], old: LinesRank, tieSe: number,
  lowTrust: string | null, second: (line: BossSimLineResult) => number): LinesRank {
  const group = lines.flatMap((_, i) => old.winTied[i] ? [i] : []);
  const diagnostic: CombatSRanking = { schema: "s-combat-ranking-v1", used: false, reason: null,
    tie_se: tieSe, win_group: group, s_groups: [], audits: group.map((i) => ({ line: i, audit: auditSigns(lines[i]!.outcomes) })),
    scores: [], comparisons: [], old_best: old.best, best: old.best };
  const fallback = (reason: string): LinesRank => ({ ...old, sRanking: { ...diagnostic, reason } });
  if (lowTrust) return fallback("low_trust");
  if (!group.length) return fallback("no_eligible_line");
  if (diagnostic.audits.some(({ audit }) => !audit.rankingEligible)) return fallback("sign_or_attribution_rejected");
  const first = lines[group[0]!]!.outcomes;
  if (first.length < 2 || group.some((i) => lines[i]!.outcomes.length !== first.length)) return fallback("unpaired_samples");
  // Each scenario must use the same entry and window across lines. No pairing by aggregate means.
  const referenceKey = (sample: typeof first[number]) => {
    const ref = sample.bossMargin!.reference;
    return JSON.stringify([ref.bossHp, ref.myHp, [...ref.enemyIds].sort(), ref.startTurn ?? 1]);
  };
  if (group.some((i) => lines[i]!.outcomes.some((sample, n) => referenceKey(sample) !== referenceKey(first[n]!)))) {
    return fallback("different_reference_or_window");
  }
  const values = new Map(group.map((i) => [i, lines[i]!.outcomes.map((sample) => marginOf(sample)!)]));
  const means = new Map(group.map((i) => [i, summarizeSamples(values.get(i)!).mean!]));
  diagnostic.scores = group.map((i) => ({ line: i, mean: means.get(i)! }));
  const cmp = (a: number, b: number) => a === b ? 0 : a < b ? -1 : 1;
  const hpOrder = (a: number, b: number) => cmp(second(lines[a]!), second(lines[b]!))
    || cmp(lines[b]!.winProb, lines[a]!.winProb) || a - b;
  let remaining = [...group];
  while (remaining.length) {
    const leader = [...remaining].sort((a, b) => cmp(means.get(b)!, means.get(a)!) || a - b)[0]!;
    const tied = remaining.filter((i) => {
      const delta = summarizeSamples(values.get(i)!.map((v, n) => v - values.get(leader)![n]!));
      const same = delta.mean! >= -tieSe * delta.meanSe!;
      diagnostic.comparisons.push({ line: i, leader, mean: delta.mean!, se: delta.meanSe!, tied: same });
      return same;
    }).sort(hpOrder);
    diagnostic.s_groups.push(tied);
    remaining = remaining.filter((i) => !tied.includes(i));
  }
  const best = diagnostic.s_groups[0]![0]!;
  const shown = (i: number) => `${Math.round(lines[i]!.winProb * 1000)}|${Math.round(second(lines[i]!) * 10)}`;
  const tied = diagnostic.s_groups[0]!.filter((i) => shown(i) === shown(best));
  const rest = lines.map((_, i) => i).filter((i) => !group.includes(i)).sort((a, b) =>
    cmp(lines[b]!.winProb, lines[a]!.winProb) || cmp(second(lines[a]!), second(lines[b]!)) || a - b);
  diagnostic.used = true;
  diagnostic.best = best;
  return { best, tied: tied.length >= 2 ? tied : [], winTied: old.winTied,
    vsBest: lines.map((line, i) => i === best ? null : compareLines(line, lines[best]!)),
    order: [...diagnostic.s_groups.flat(), ...rest], sRanking: diagnostic };
}

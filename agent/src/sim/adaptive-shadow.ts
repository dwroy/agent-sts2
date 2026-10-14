/** C2 shadow: replay stopping rules over fixed sample prefixes; never run or select an action. */
import { marginOf, type MarginSample } from "./boss-margin.js";
import { auditSigns } from "./s-sign.js";
export type AdaptiveSample = MarginSample & { enemyHpLeft?: number; hpLoss?: number; revived?: number };

export const ADAPTIVE_RULE = { version: "adaptive-v1", b3First: 300, b2First: 200, batch: 100, zElim: 3, zTie: 2 } as const;
export interface AdaptiveCandidate {
  key: string;
  samples: readonly AdaptiveSample[];
  /** B2 must choose its kill order using this round only, not the full-run winner. */
  orders?: readonly (readonly AdaptiveSample[])[];
  /** The B3 current deck remains active even if it is not a selectable option. */
  baseline?: boolean;
  /** Equivalent decks share work; mixtures select one component per sample. */
  workGroup?: string;
}
type Metric = { key: "win" | "S" | "boss_left" | "won_loss"; difference: number; se: number | null; unavailable?: string };
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  if (!xs.length) return Infinity;
  if (!xs.every(Number.isFinite)) return NaN;
  xs.sort((a, b) => a - b);
  return (xs[Math.floor((xs.length - 1) / 2)]! + xs[Math.ceil((xs.length - 1) / 2)]!) / 2;
};
function paired(key: Metric["key"], a: readonly number[], b: readonly number[]): Metric {
  if (![...a, ...b].every(Number.isFinite)) return { key, difference: 0, se: null, unavailable: "missing per-sample fallback metric" };
  const diffs = a.map((x, i) => x - b[i]!);
  const difference = mean(diffs);
  const variance = diffs.length > 1 ? diffs.reduce((sum, x) => sum + (x - difference) ** 2, 0) / (diffs.length - 1) : 0;
  return { key, difference, se: Math.sqrt(variance / diffs.length) };
}

export function adaptiveShadow(candidates: readonly AdaptiveCandidate[], options: {
  lane: "b2" | "b3"; requested: number; allowS: boolean; zElim?: number; first?: number;
}) {
  const { lane, requested } = options;
  const first = options.first ?? (lane === "b3" ? ADAPTIVE_RULE.b3First : ADAPTIVE_RULE.b2First);
  const zElim = options.zElim ?? ADAPTIVE_RULE.zElim;
  if (!Number.isSafeInteger(requested) || requested <= 0 || !Number.isSafeInteger(first) || first < 1 || !Number.isFinite(zElim) || zElim < 3
      || !candidates.length || candidates.some((c) => c.samples.length !== requested || c.orders?.some((order) => order.length !== requested))
      || new Set(candidates.map((c) => c.key)).size !== candidates.length) throw new Error("adaptive shadow requires complete identified paired samples");
  const prefix = new Map<number, { rows: readonly AdaptiveSample[]; wins: number[]; margin: number[] | null; loss: number }[]>();
  const at = (n: number) => {
    const hit = prefix.get(n);
    if (hit) return hit;
    const value = candidates.map((c) => {
      const choices = (c.orders?.length ? c.orders : [c.samples]).map((rows) => rows.slice(0, n));
      let best = choices[0]!;
      let wins = best.filter((s) => s.won).length;
      let loss = median(best.filter((s) => s.won).map((s) => s.hpLoss ?? NaN));
      for (const rows of choices.slice(1)) {
        const w = rows.filter((s) => s.won).length;
        const l = median(rows.filter((s) => s.won).map((s) => s.hpLoss ?? NaN));
        if (w > wins || (w === wins && l < loss)) { best = rows; wins = w; loss = l; }
      }
      return { rows: best, wins: best.map((s) => Number(s.won)), loss,
        margin: options.allowS && auditSigns(best).rankingEligible ? best.map((s) => marginOf(s)!) : null };
    });
    prefix.set(n, value);
    return value;
  };
  const selected = candidates.map((_, i) => i).filter((i) => !candidates[i]!.baseline);
  if (!selected.length) throw new Error("adaptive shadow requires a selectable candidate");
  // S validity is checked on the prefix actually available at that round, never future samples.
  const metric = (a: number, b: number, n: number): Metric => {
    const leftValue = at(n)[a]!, rightValue = at(n)[b]!;
    const left = leftValue.rows, right = rightValue.rows;
    const wa = leftValue.wins, wb = rightValue.wins;
    const win = paired("win", wa, wb);
    const wins = wa.reduce((x, y) => x + y, 0), other = wb.reduce((x, y) => x + y, 0);
    if (wins !== other || (wins !== 0 && wins !== n)) return win;
    if (leftValue.margin && rightValue.margin) return paired("S", leftValue.margin, rightValue.margin);
    if (lane === "b3") return paired("boss_left", left.map((s) => -(s.enemyHpLeft ?? NaN)), right.map((s) => -(s.enemyHpLeft ?? NaN)));
    // wonLoss is a median, not a mean. Keep its existing ordering, but never invent a paired mean SE
    // for a median (or Infinity when no sample won). Such a fallback keeps sampling to the cap.
    const aLoss = leftValue.loss;
    const bLoss = rightValue.loss;
    if (Number.isNaN(aLoss) || Number.isNaN(bLoss)) return { key: "won_loss", difference: 0, se: null, unavailable: "missing won-loss observations" };
    return { key: "won_loss", difference: aLoss === bLoss ? 0 : bLoss - aLoss, se: null };
  };
  let evaluable = true;
  const compare = (a: number, b: number, n: number) => {
    const m = metric(a, b, n);
    if (m.unavailable) evaluable = false;
    return m;
  };
  const ranking = (active: readonly number[], n: number) => {
    let leader = active[0]!;
    for (const i of active.slice(1)) if (compare(i, leader, n).difference > 0) leader = i;
    const group = active.filter((i) => {
      if (i === leader) return true;
      const m = compare(i, leader, n);
      return m.se === null ? m.difference === 0 : m.difference >= -ADAPTIVE_RULE.zTie * m.se;
    });
    return { leader, group };
  };
  const used = candidates.map(() => 0);
  const rounds = candidates.map(() => 0);
  const stop = candidates.map(() => "max" as "eliminated" | "leader" | "max");
  const active = new Set(candidates.map((_, i) => i));
  const history: { n: number; leader: string; eliminated: { key: string; metric: Metric }[] }[] = [];
  let n = Math.min(first, requested);
  let final = ranking(selected, n);
  for (;;) {
    for (const i of active) { used[i] = n; rounds[i]! += 1; }
    const selectable = selected.filter((i) => active.has(i));
    final = ranking(selectable, n);
    const eliminated: { key: string; metric: Metric }[] = [];
    for (const i of selectable) {
      if (i === final.leader) continue;
      const m = compare(i, final.leader, n);
      if (m.se !== null && Number.isFinite(m.difference) && m.difference < -zElim * m.se) {
        active.delete(i);
        stop[i] = "eliminated";
        eliminated.push({ key: candidates[i]!.key, metric: m });
      }
    }
    history.push({ n, leader: candidates[final.leader]!.key, eliminated });
    const remaining = selected.filter((i) => active.has(i));
    final = ranking(remaining, n);
    if (remaining.length === 1 || n === requested) {
      for (const i of active) stop[i] = n === requested ? "max" : "leader";
      break;
    }
    n = Math.min(requested, n + ADAPTIVE_RULE.batch);
  }
  const complete = ranking(selected, requested);
  const keys = (ids: number[]) => ids.map((i) => candidates[i]!.key).sort();
  const fullGroup = keys(complete.group), shadowGroup = keys(final.group);
  const groups = new Map<string, number>();
  candidates.forEach((c, i) => groups.set(c.workGroup ?? c.key, Math.max(groups.get(c.workGroup ?? c.key) ?? 0, used[i]!)));
  const fullWork = groups.size * requested, shadowWork = [...groups.values()].reduce((a, b) => a + b, 0);
  return {
    schema: "sim-adaptive-shadow-v1", mode: "shadow", lane,
    rule: { ...ADAPTIVE_RULE, first, zElim, requested },
    candidates: candidates.map((c, i) => ({ key: c.key, samples: used[i]!, stop: stop[i]!, rounds: rounds[i]!, baseline: c.baseline === true })),
    full: { leader: candidates[complete.leader]!.key, group: fullGroup },
    shadow: { leader: candidates[final.leader]!.key, group: shadowGroup },
    evaluable, agreement: evaluable ? JSON.stringify(fullGroup) === JSON.stringify(shadowGroup) : null,
    work: { full: fullWork, shadow: shadowWork, savedFraction: 1 - shadowWork / fullWork, unit: "unique-option-sample-equivalents" },
    rounds: history,
    limits: "Prefix replay only; no samples saved in shadow. S needs prefix sign/attribution and model trust gates. B2 wonLoss median retains its ordering but has no invented paired SE, so cannot eliminate. Whole-question admission requires independent offline and two-run natural coverage.",
  };
}

export type AdaptiveShadow = ReturnType<typeof adaptiveShadow>;


/** Shadow failures are observable diagnostics; they cannot turn successful simulation into a pending decision. */
export function safeAdaptiveShadow(...args: Parameters<typeof adaptiveShadow>) {
  const began = performance.now();
  try { return { ...adaptiveShadow(...args), status: "produced", ms: performance.now() - began }; }
  catch (error) { return { schema: "sim-adaptive-shadow-v1", mode: "shadow", status: "error", error: String(error).slice(0, 180), ms: performance.now() - began }; }
}

/** Numerical summaries only. These functions neither supply game rules nor choose actions. */
export interface SampleSummary {
  n: number;
  mean: number | null;
  sd: number | null;
  meanSe: number | null;
  p10: number | null;
  median: number | null;
  p90: number | null;
  min: number | null;
  max: number | null;
}

/** Empirical outcome spread is distinct from the Monte Carlo error of the mean. */
export function summarizeSamples(values: readonly number[]): SampleSummary {
  if (values.some((x) => !Number.isFinite(x))) throw new Error("non-finite sample");
  const n = values.length;
  if (!n) return { n, mean: null, sd: null, meanSe: null, p10: null, median: null, p90: null, min: null, max: null };
  const xs = [...values].sort((a, b) => a - b);
  let mean = 0;
  let m2 = 0;
  values.forEach((x, i) => { const d = x - mean; mean += d / (i + 1); m2 += d * (x - mean); });
  const sd = n > 1 ? Math.sqrt(Math.max(0, m2 / (n - 1))) : null;
  const q = (p: number): number => {
    const at = (n - 1) * p;
    const lo = Math.floor(at);
    return xs[lo]! + (xs[Math.ceil(at)]! - xs[lo]!) * (at - lo);
  };
  return { n, mean, sd, meanSe: sd === null ? null : sd / Math.sqrt(n),
    p10: q(0.1), median: q(0.5), p90: q(0.9), min: xs[0]!, max: xs[n - 1]! };
}

/** Wilson's approximate 95% interval stays non-degenerate at zero/all successes. */
export function binomialInterval(successes: number, n: number): [number, number] | null {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(successes) || n < 0 || successes < 0 || successes > n) throw new Error("invalid binomial sample");
  if (!n) return null;
  const z = 1.959963984540054;
  const p = successes / n;
  const d = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / d;
  const half = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

export interface PairedValue { sample: string | number; value: number }

/** Match by random-scenario identity; never zip incomplete or reordered samples. */
export function pairedDifference(base: readonly PairedValue[], option: readonly PairedValue[]): {
  difference: SampleSummary; unmatchedBase: number; unmatchedOption: number;
} {
  const index = (rows: readonly PairedValue[]) => {
    const out = new Map<string | number, number>();
    for (const row of rows) {
      if (out.has(row.sample) || !Number.isFinite(row.value)) throw new Error("invalid paired sample");
      out.set(row.sample, row.value);
    }
    return out;
  };
  const a = index(base);
  const b = index(option);
  const differences = [...a].flatMap(([key, value]) => b.has(key) ? [b.get(key)! - value] : []);
  return { difference: summarizeSamples(differences), unmatchedBase: a.size - differences.length, unmatchedOption: b.size - differences.length };
}

/** Pure uniform-hand model: access, not affordability or completed combinations. */
export function abstractHandAccess(deck: number, draw: number, components: number, turns: number): {
  probabilityPerHand: number; expectedQualifyingHands: number;
} {
  if (![deck, draw, components, turns].every(Number.isSafeInteger) || deck < 1 || draw < 0 || components < 1 || components > deck || turns < 0) throw new Error("invalid uniform-hand model");
  const hand = Math.min(deck, draw);
  let p = 1;
  for (let i = 0; i < components; i += 1) p *= i >= hand ? 0 : (hand - i) / (deck - i);
  return { probabilityPerHand: p, expectedQualifyingHands: turns * p };
}

/** Resource upper bound assumes one reset between complete cycles; it does not prove reachability. */
export function abstractCycleBound(energy: number, cycleCost: number, resetCost: number, actions: number, componentActions: number): {
  energyBound: number | null; actionBound: number; combinedBound: number;
} {
  if (![energy, cycleCost, resetCost].every((n) => Number.isSafeInteger(n) && n >= 0)
      || !Number.isSafeInteger(actions) || actions < 0 || !Number.isSafeInteger(componentActions) || componentActions < 1) throw new Error("invalid cycle budget");
  const e = BigInt(energy), c = BigInt(cycleCost), r = BigInt(resetCost);
  const energyBound = c + r === 0n ? null : Number((e + r) / (c + r));
  const actionBound = Number((BigInt(actions) + 1n) / (BigInt(componentActions) + 1n));
  return { energyBound, actionBound, combinedBound: Math.min(energyBound ?? actionBound, actionBound) };
}

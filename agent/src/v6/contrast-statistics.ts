/** Two-sided Student-t coverage for a run-cluster estimate, not a causal probability. */
export function contrastConfidence(value: number, se: number, clusters: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(se) || se <= 0 || !Number.isInteger(clusters) || clusters < 2) return NaN;
  if (value === 0) return 0;
  const df = clusters - 1, t = Math.abs(value) / se;
  return Math.max(0, Math.min(1, 1 - beta(df / (df + t * t), df / 2, .5)));
}

/** The learner uses the same interval convention as the strict published contract. */
export function contrastInterval(value: number, se: number, clusters: number, level = .95): { level: number; lower: number; upper: number } {
  if (!Number.isFinite(contrastConfidence(value, se, clusters)) || !(level > 0 && level < 1)) throw new Error("unidentifiable contrast uncertainty");
  let lo = 0, hi = 1;
  while (contrastConfidence(hi, 1, clusters) < level) hi *= 2;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    if (contrastConfidence(mid, 1, clusters) < level) lo = mid; else hi = mid;
  }
  const radius = (lo + hi) / 2 * se;
  return { level, lower: value - radius, upper: value + radius };
}

// Lanczos log-gamma and the continued fraction for the regularized incomplete beta.
function logGamma(z: number): number {
  const c = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  let x = .99999999999980993;
  z -= 1;
  for (let i = 0; i < c.length; i++) x += c[i]! / (z + i + 1);
  const t = z + c.length - .5;
  return .5 * Math.log(2 * Math.PI) + (z + .5) * Math.log(t) - t + Math.log(x);
}
function fraction(x: number, a: number, b: number): number {
  const tiny = 1e-300;
  const nonzero = (v: number) => Math.abs(v) < tiny ? tiny : v;
  let c = 1, d = 1 / nonzero(1 - (a + b) * x / (a + 1)), h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 / nonzero(1 + aa * d); c = nonzero(1 + aa / c); h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 / nonzero(1 + aa * d); c = nonzero(1 + aa / c);
    const delta = d * c; h *= delta;
    if (Math.abs(delta - 1) < 3e-14) return h;
  }
  return NaN;
}
function beta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const scale = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x));
  return x < (a + 1) / (a + b + 2) ? scale * fraction(x, a, b) / a : 1 - scale * fraction(1 - x, b, a) / b;
}

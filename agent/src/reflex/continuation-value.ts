/** A learned continuation utility, in HP units. Absent outside an observed multi-fight objective. */
export interface ContinuationValue {
  /** HP -> additional terminal utility, fitted from fixed character logs and replay samples. */
  hp: [number, number][];
  source: string;
}

export function continuationUtility(value: ContinuationValue | undefined, hp: number): number {
  if (!value || !Number.isFinite(hp) || hp <= 0 || value.hp.length === 0) return 0;
  const points = value.hp;
  if (hp <= points[0]![0]) return points[0]![1];
  for (let i = 1; i < points.length; i += 1) {
    const [x, y] = points[i]!;
    if (hp <= x) {
      const [before, from] = points[i - 1]!;
      return from + (y - from) * (hp - before) / (x - before);
    }
  }
  return points.at(-1)![1];
}

export function continuationCost(value: ContinuationValue | undefined, before: number, after: number): number {
  return continuationUtility(value, before) - continuationUtility(value, after);
}

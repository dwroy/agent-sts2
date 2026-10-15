/** Validate absolute sample ranges and active work indices without renumbering random seeds. */
export interface SampleRange { from: number; to: number }
export function sampleSchedule(samples: number, count: number, range?: SampleRange, active?: readonly number[]) {
  const from = range?.from ?? 0, to = range?.to ?? samples;
  const indices = active ? [...active] : Array.from({ length: count }, (_, i) => i);
  if (![samples, count, from, to].every(Number.isSafeInteger) || samples < 0 || count < 0 || from < 0 || to < from || to > samples
      || new Set(indices).size !== indices.length || indices.some((i) => !Number.isSafeInteger(i) || i < 0 || i >= count)) {
    throw new Error("invalid absolute sample range or active indices");
  }
  return { from, to, indices };
}

/**
 * Number formatting shared by the knowledge renderers. Every number carries its n; a count table is shown as
 * its dominant value only when that value clearly dominates (a sparse or split count is shown as the values
 * seen, never collapsed to a mode: consistency review #11, f72b180).
 */

/** Code-unit string order: deterministic across locales (localeCompare is not). */
export function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function round1(value: number): string {
  return String(Math.round(value * 10) / 10);
}

export function pct(value: number | null | undefined): string {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "?";
}

/** A rate as a percentage, one decimal below 10% (a death rate of 1 in 262 is 0.4%, not 0%). */
export function rate(value: number): string {
  const percent = value * 100;
  return percent > 0 && percent < 10 ? `${Math.round(percent * 10) / 10}%` : `${Math.round(percent)}%`;
}

export function signed(value: number): string {
  const text = round1(value);
  return value > 0 ? `+${text}` : value < 0 ? `−${text.slice(1)}` : text;
}

export function total(counts: Record<string, number> | undefined): number {
  return Object.values(counts ?? {}).reduce((sum, n) => sum + n, 0);
}

/** A count table's value shows alone when it holds at least this share of the observations. */
export const DOMINANT_SHARE = 0.75;
/** At most this many values of a split count table are listed. */
export const MAX_SPLIT_VALUES = 4;

/** Numeric keys first by count (desc), then by value; non-numeric keys by string. */
export function sortedCounts(counts: Record<string, number> | undefined): [string, number][] {
  return Object.entries(counts ?? {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || (Number(a[0]) - Number(b[0]) || cmp(a[0], b[0])));
}

/**
 * A count table ({value: times}) as text with its n: "3 (n=8)" when one value dominates, else the values seen
 * with their counts: "2/3（5/4 次，n=9）". `format` renders each value (signs, units).
 */
export function countsText(counts: Record<string, number> | undefined, format: (value: string) => string = (value) => value): string | null {
  const entries = sortedCounts(counts);
  if (entries.length === 0) return null;
  const n = total(counts);
  const [top, topN] = entries[0]!;
  if (entries.length === 1 || topN >= DOMINANT_SHARE * n) return `${format(top)} (n=${n})`;
  const shown = entries.slice(0, MAX_SPLIT_VALUES);
  const more = entries.length > shown.length ? "…" : "";
  return `${shown.map(([value]) => format(value)).join("/")}${more}（${shown.map(([, count]) => count).join("/")} 次，n=${n}）`;
}

/** A signed amount ("2" -> "+2", "-1" -> "−1"). */
export function signedValue(value: string): string {
  const number = Number(value);
  return Number.isFinite(number) ? signed(number) : value;
}

/** "中位/p75 (n=…)" of a {median, p75, n} stat; "—" without samples. */
export function statText(stat: { median?: number | null; p75?: number | null; n?: number } | undefined): string {
  if (!stat || !stat.n || typeof stat.median !== "number") return "— (n=0)";
  const p75 = typeof stat.p75 === "number" ? round1(stat.p75) : "?";
  return `${round1(stat.median)}/${p75} (n=${stat.n})`;
}

/** An ascension label: "A9", or "A8（非 A9）" when the number comes from another ascension. */
export function ascFrom(from: number, asc: number): string {
  return from === asc ? `A${asc}` : `A${from}（非 A${asc}）`;
}

/** A list of numeric string keys, ascending. */
export function numericKeys(record: Record<string, unknown> | undefined): number[] {
  return Object.keys(record ?? {})
    .filter((key) => /^\d+$/.test(key))
    .map(Number)
    .sort((a, b) => a - b);
}

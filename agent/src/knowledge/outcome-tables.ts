/**
 * Which outcome-stats table a run reads (Dai 2026-10-04: outcome statistics by ascension, A8 and A9 apart).
 *
 * knowledge/builders/build-outcome-stats.py writes one table per ascension (`by_ascension`: A8, A9 and each higher ascension once it
 * has runs), each counted over that ascension's runs alone with its own baseline, by the method the whole file used
 * when it was the A8 table alone (before 2026-10-04). A file of that older shape (no `by_ascension`) is read as it
 * was: its one table for every run.
 *
 * A run at A8, below A8 or of unknown ascension reads A8's table, so its text is what it was. From A9 up a run reads
 * its own ascension's table (an empty one when no run there is logged yet); where a row there has fewer than
 * OUTCOME_MIN_N runs, the same choice's row at the nearest lower ascension (down to A8) that has OUTCOME_MIN_N runs or
 * more is shown after it (for a card's act, the 拿了 / 给了没拿 pair, when that ascension has them on a side where the
 * run's has fewer), labelled with its ascension: a reference, never added into the run's own numbers. A lower row
 * that is as thin adds nothing reliable and is not shown (a starter card's 给了没拿, never offered on a reward, is
 * thin at every ascension).
 */

import type { OutcomeStats } from "./experience.js";

/** The ascension the file was counted at before 2026-10-04: at or below it (or unknown) a run reads this table as before. */
export const OUTCOME_BASE_ASC = 8;

/** Fewer runs than this and a row is thin (knowledge/builders/build-outcome-stats.py LOW_N, the rows' "low_n"). */
export const OUTCOME_MIN_N = 5;

/** The row fields the thin test reads. */
interface Counted {
  n?: number;
}

/** What a run reads: its table and, from A9 up, the lower ascensions' tables a thin row is referenced against. */
export interface OutcomeView {
  /** The run's ascension when it reads its own table from A9 up; null when it reads A8's (or an older file) as before. */
  asc: number | null;
  /** The table its rows come from. */
  table: OutcomeStats;
  /** The lower ascensions' tables down to A8, nearest first (empty: no references, the text as before). */
  refs: OutcomeStats[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Whether the file has a table per ascension (written 2026-10-04 on). */
export function hasAscensionTables(stats: OutcomeStats): boolean {
  return isRecord(stats.by_ascension);
}

/**
 * The file's tables by ascension key ("8", "9", …), each with the file's `generated`: `by_ascension`, or, for a file
 * written before 2026-10-04, the file itself under its own ascension.
 */
export function outcomeTables(stats: OutcomeStats): Map<string, OutcomeStats> {
  if (!hasAscensionTables(stats)) return new Map([[String(stats.ascension ?? "?"), stats]]);
  return new Map(Object.entries(stats.by_ascension ?? {}).map(([key, table]) => [key, { generated: stats.generated, ...table }]));
}

/** The table a run at `ascension` reads, and the lower ascensions' tables for its thin rows (OutcomeView). */
export function outcomeView(ascension: number | null | undefined, stats: OutcomeStats): OutcomeView {
  if (!hasAscensionTables(stats)) return { asc: null, table: stats, refs: [] };
  const tables = outcomeTables(stats);
  if (ascension === null || ascension === undefined || !Number.isFinite(ascension) || ascension <= OUTCOME_BASE_ASC) {
    return { asc: null, table: tables.get(String(OUTCOME_BASE_ASC)) ?? { ascension: OUTCOME_BASE_ASC, generated: stats.generated }, refs: [] };
  }
  const table = tables.get(String(ascension)) ?? { ascension, generated: stats.generated, baseline: { runs: 0, boss_pass_by_act: {} } };
  const refs = [...tables.entries()]
    .filter(([key]) => /^\d+$/.test(key) && Number(key) >= OUTCOME_BASE_ASC && Number(key) < ascension)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([, lower]) => lower);
  return { asc: ascension, table, refs };
}

/** A row with fewer than OUTCOME_MIN_N runs (none included). */
export function rowThin(row: Counted | undefined): boolean {
  return !row || !row.n || row.n < OUTCOME_MIN_N;
}

/** A card's act: thin when either side of the 拿了 / 给了没拿 contrast is (the pair is read together). */
export function pairThin(pair: { picked?: Counted; offered_not_picked?: Counted } | undefined): boolean {
  return rowThin(pair?.picked) || rowThin(pair?.offered_not_picked);
}

/** A lower ascension's row that helps a thin one: OUTCOME_MIN_N runs or more. */
export function rowHelps(row: Counted | undefined): boolean {
  return !rowThin(row);
}

/** A lower ascension's card act that helps `own`: OUTCOME_MIN_N runs or more on a side where `own` has fewer. */
export function pairHelps(own: { picked?: Counted; offered_not_picked?: Counted } | undefined): (ref: { picked?: Counted; offered_not_picked?: Counted } | undefined) => boolean {
  return (ref) => (rowThin(own?.picked) && !rowThin(ref?.picked)) || (rowThin(own?.offered_not_picked) && !rowThin(ref?.offered_not_picked));
}

/** The reference for a thin row: among `refs` (nearest ascension first), the first whose row `helps`; null when none does. */
export function referenceRow<T>(refs: readonly OutcomeStats[], rowOf: (table: OutcomeStats) => T | undefined, helps: (row: T | undefined) => boolean): { table: OutcomeStats; row: T } | null {
  for (const table of refs) {
    const row = rowOf(table);
    if (row !== undefined && helps(row)) return { table, row };
  }
  return null;
}

/** The label of a reference row: "（A9 不足5局，另附 A8：…）". */
export function referenceNote(view: OutcomeView, ref: OutcomeStats, text: string): string {
  return `（A${view.asc ?? "?"} 不足${OUTCOME_MIN_N}局，另附 A${ref.ascension ?? "?"}：${text}）`;
}

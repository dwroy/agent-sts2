/** Consumer-only bridge view: retain complete audit metrics without cloning discarded snapshots. */
import { v6ProjectionEntries } from "../sim/v6-projection-entries.js";
import type { V6ProjectionTable } from "../sim/v6-projection.js";
import type { V6Config } from "./config.js";
import type { ProjectionEntry } from "./formats.js";

export function promptProjectionEntries(table: V6ProjectionTable, config: V6Config): ProjectionEntry[] {
  if (!table.enabled || config.mode === "off") return [];
  // The provider bridge replaces these metrics with row.summary. Keep its numeric semantics intact.
  // Unknown/legacy rows retain their original entry, since the bridge does not replace that snapshot.
  const view = { ...table, combinations: table.combinations.map(row =>
    row.combination_id !== null && row.completion_source !== "unknown"
      ? { ...row, entry: { ...row.entry, combo_metrics: null } } : row) };
  return v6ProjectionEntries(view, config);
}

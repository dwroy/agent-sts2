/** Explicit #83 deployment scope, not inferred encounter aliases or gameplay knowledge. */
import { plain, safeKey } from "./schema.js";

const BOSSES = new Set(["AEONGLASS", "TEST_SUBJECT", "THE_INSATIABLE", "QUEEN"]);
export type CombatEntrySelectionConfig = { mode: "legacy" } | { mode: "invalid" }
  | { mode: "restricted"; bosses: Record<string, string[]> };
export interface CombatEntrySelection {
  schema: "combat-entry-selection-v1";
  boss: string;
  entry_ids: string[];
}

/** Absent preserves legacy behavior; empty, malformed, wildcard or unknown selectors never enable all. */
export function combatEntrySelectionConfig(raw: string | undefined): CombatEntrySelectionConfig {
  if (raw === undefined) return { mode: "legacy" };
  try {
    if (raw.length > 16384) return { mode: "invalid" };
    const value: unknown = JSON.parse(raw);
    if (!plain(value) || Object.keys(value).some(boss => !BOSSES.has(boss))) return { mode: "invalid" };
    const bosses: Record<string, string[]> = {};
    for (const boss of Object.keys(value).sort()) {
      const ids = value[boss];
      if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => typeof id !== "string" || !safeKey(id))
        || new Set(ids).size !== ids.length) return { mode: "invalid" };
      bosses[boss] = [...ids].sort();
    }
    return { mode: "restricted", bosses };
  } catch { return { mode: "invalid" }; }
}

/** Match the observed living entity, never the next run boss or a name parsed from prose. */
export function selectedCombatEntries<T extends { id: string }>(entries: T[], character: string, context: Record<string, unknown>,
  config: CombatEntrySelectionConfig): { entries: T[]; selection?: CombatEntrySelection } | null {
  if (character !== "silent" || config.mode === "legacy") return { entries };
  if (config.mode === "invalid" || context.act !== 3 || !plain(context.enemies) || !Array.isArray(context.enemies.items)) return null;
  const bosses = context.enemies.items.filter(plain).filter(e => e.alive === true && typeof e.id === "string" && BOSSES.has(e.id));
  if (bosses.length !== 1) return null;
  const boss = String(bosses[0]!.id), ids = config.bosses[boss];
  if (!ids?.length || ids.some(id => !entries.some(entry => entry.id === id))) return null;
  const allowed = new Set(ids);
  return { entries: entries.filter(entry => allowed.has(entry.id)),
    selection: { schema: "combat-entry-selection-v1", boss, entry_ids: ids } };
}

/** Frozen replays must reproduce the production subset, while retaining the full knowledge SHA. */
export function replaySelectedCombatEntries<T extends { id: string }>(entries: T[], character: string,
  context: Record<string, unknown>, selection: unknown): T[] {
  if (selection === undefined) return entries;
  if (!plain(selection) || Object.keys(selection).sort().join(",") !== "boss,entry_ids,schema"
    || selection.schema !== "combat-entry-selection-v1" || typeof selection.boss !== "string" || character !== "silent") throw Error("invalid combat entry selection");
  const result = selectedCombatEntries(entries, character, context,
    combatEntrySelectionConfig(JSON.stringify({ [selection.boss]: selection.entry_ids })));
  if (!result?.selection || JSON.stringify(result.selection) !== JSON.stringify({ schema: selection.schema, boss: selection.boss, entry_ids: selection.entry_ids }))
    throw Error("combat entry selection differs from observed cohort");
  return result.entries;
}

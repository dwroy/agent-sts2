/** Explicit bridge for consumers; no logging or model calls occur on module import. */
import type { V6Config } from "../v6/config.js";
import { V6BuildLog, type V6LogRow } from "../v6/log.js";
import type { V6ProjectionTable } from "./v6-projection.js";
import { v6ProjectionEntries } from "./v6-projection-entries.js";
export function v6ProjectionLog(config: V6Config, table: V6ProjectionTable,
  context: Pick<V6LogRow, "ts" | "run_id" | "character" | "question_id"> & Partial<Pick<V6LogRow,
    "jev_answer" | "fallback" | "triggers" | "merged_triggers" | "skipped_triggers">>, logger = new V6BuildLog(config)) {
  if (config.mode === "off" || !table.enabled) return { written: false, reason: "off" };
  return logger.append({ schema: "v6-build-log-v1", ...context, mode: config.mode, kind: table.phase === "act" ? "act" : "card_pick",
    entries: v6ProjectionEntries(table, config), jev_answer: context.jev_answer ?? null, fallback: context.fallback ?? null,
    elapsed_ms: table.telemetry.elapsed_ms, cache: { hits: table.telemetry.cache_hits, misses: table.telemetry.cache_misses },
    degradation: table.telemetry.degradation, unknown: { count: table.telemetry.unknown_entries, total: table.telemetry.total_entries },
    triggers: context.triggers ?? (table.phase === "act" ? ["act_start"] : []), merged_triggers: context.merged_triggers ?? [], skipped_triggers: context.skipped_triggers ?? [] });
}

/** Incremental metadata reads keep long-lived TUI rollouts out of a single JS string. */
import { closeSync, fstatSync, openSync, readSync } from "node:fs";

export interface FileGrowth {
  bytes: number;
  compactions: number;
  turns: number;
  contextTokens?: number;
  window?: number;
  usedPercent?: number;
  weeklyUsedPercent?: number;
  fiveHourUsedPercent?: number;
}

interface Cursor {
  identity: string;
  offset: number;
  pending: Buffer;
  skipping: boolean;
  openTurn?: string;
  growth: FileGrowth;
}

const cursors = new Map<string, Cursor>();
const MAX_LINE_BYTES = 8 * 1024 * 1024;

function consume(cursor: Cursor, line: Buffer): void {
  // Tool bodies and prompts do not carry these metadata records.
  const text = line.toString("utf8");
  if (!/"(?:task_started|task_complete|turn_aborted|context_compacted|compacted|token_count)"/.test(text)) return;
  let row: { type?: string; payload?: Record<string, unknown> };
  try { row = JSON.parse(text) as typeof row; } catch { return; }
  const p = row.payload ?? {};
  const kind = p["type"];
  const id = typeof p["turn_id"] === "string" ? p["turn_id"] : undefined;
  if (row.type === "event_msg" && kind === "task_started" && id) cursor.openTurn = id;
  if (row.type === "event_msg" && (kind === "task_complete" || kind === "turn_aborted")
      && id && (id === cursor.openTurn || cursor.openTurn === "unparsed-oversize-row")) delete cursor.openTurn;
  if (row.type === "compacted" || kind === "context_compacted") cursor.growth.compactions += 1;
  if (kind === "task_started") cursor.growth.turns += 1;
  if (kind !== "token_count") return;
  const info = p["info"] as { last_token_usage?: { input_tokens?: number }; model_context_window?: number } | undefined;
  if (info?.last_token_usage?.input_tokens !== undefined) cursor.growth.contextTokens = info.last_token_usage.input_tokens;
  if (info?.model_context_window !== undefined) cursor.growth.window = info.model_context_window;
  const limits = p["rate_limits"] as Record<string, { used_percent?: number; window_minutes?: number }> | undefined;
  if (limits?.primary?.used_percent !== undefined) cursor.growth.usedPercent = limits.primary.used_percent;
  if (!limits) return;
  delete cursor.growth.weeklyUsedPercent;
  delete cursor.growth.fiveHourUsedPercent;
  for (const slot of ["primary", "secondary"]) {
    const limit = limits[slot];
    if (typeof limit?.used_percent !== "number" || !Number.isFinite(limit.used_percent)) continue;
    if (limit.window_minutes === 10080) cursor.growth.weeklyUsedPercent = limit.used_percent;
    if (limit.window_minutes === 300) cursor.growth.fiveHourUsedPercent = limit.used_percent;
  }
}

export function readRolloutMetadata(file: string): { growth: FileGrowth; openTurn?: string } {
  const fd = openSync(file, "r");
  try {
    const stat = fstatSync(fd);
    const identity = `${stat.dev}:${stat.ino}`;
    let cursor = cursors.get(file);
    if (!cursor || cursor.identity !== identity || stat.size < cursor.offset) {
      cursor = { identity, offset: 0, pending: Buffer.alloc(0), skipping: false,
        growth: { bytes: stat.size, compactions: 0, turns: 0 } };
      cursors.set(file, cursor);
    }
    const chunk = Buffer.alloc(64 * 1024);
    while (cursor.offset < stat.size) {
      const read = readSync(fd, chunk, 0, Math.min(chunk.length, stat.size - cursor.offset), cursor.offset);
      if (!read) break;
      cursor.offset += read;
      let start = 0;
      while (start < read) {
        const newline = chunk.indexOf(10, start);
        const end = newline >= 0 && newline < read ? newline : read;
        const part = chunk.subarray(start, end);
        if (!cursor.skipping) {
          if (cursor.pending.length + part.length > MAX_LINE_BYTES) {
            cursor.pending = Buffer.alloc(0);
            cursor.skipping = true;
            // An unparsed giant record cannot establish that the TUI is idle.
            cursor.openTurn = "unparsed-oversize-row";
          } else cursor.pending = Buffer.concat([cursor.pending, part]);
        }
        if (end === read) break;
        if (!cursor.skipping) consume(cursor, cursor.pending);
        cursor.pending = Buffer.alloc(0);
        cursor.skipping = false;
        start = end + 1;
      }
    }
    cursor.growth.bytes = stat.size;
    return { growth: { ...cursor.growth }, openTurn: cursor.openTurn };
  } finally { closeSync(fd); }
}

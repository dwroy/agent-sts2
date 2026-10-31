import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { PROJECT_ROOT } from "../core/paths.js";
import { appendJsonLine } from "../core/util/jsonl.js";
import { array, enumeration, id, literal, nullable, number, object, optional, record, text, validate, type Infer } from "./schema.js";
import { characterSchema, validateProjectionEntry, projectionEntrySchema } from "./formats.js";
import type { V6Config } from "./config.js";
import { asRecord } from "../core/util/json.js";

export const v6LogSchema = object({
  schema: literal("v6-build-log-v1"), ts: text(40), run_id: id, character: characterSchema, question_id: id,
  kind: enumeration("act", "replan", "card_pick", "potion", "shop", "rest", "combat_line"), mode: enumeration("shadow", "on"),
  event: optional(literal("v6_unknown_to_brain")),
  stage: optional(enumeration("projection", "trigger", "decision", "brain")),
  // A real four-option reward has 1,224 combination/target rows.
  entries: array(projectionEntrySchema, 0, 20_000),
  metric_audits: optional(array(object({ direction_id: id, combo_id: id, sha256: text(64), file: text(100) }))),
  jev_answer: nullable(object({ choice: id, confidence: nullable(number(0, 1)), probabilities: optional(record(number(0, 1))) })),
  fallback: nullable(text(300)), elapsed_ms: number(0), cache: object({ hits: number(0, 1e9, true), misses: number(0, 1e9, true) }),
  degradation: array(text(200)), unknown: object({ count: number(0, 1e9, true), total: number(0, 1e9, true) }),
  triggers: array(enumeration("act_start", "T1", "T2", "T3", "T4", "T5", "T6", "T7")),
  merged_triggers: array(text(100)), skipped_triggers: array(text(100)),
});
export type V6LogRow = Infer<typeof v6LogSchema>;
const unsafe = (json: string) => /(sk-(?:ant-)?[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._~+/-]{16,})/.test(json);
/** Lazy opt-in skeleton. It never reads env, changes decisions, asks a model or creates a file while off. */
export class V6BuildLog {
  constructor(private readonly config: V6Config, readonly path = join(PROJECT_ROOT, "logs", "v6-build.jsonl")) {}
  append(row: unknown): { written: boolean; reason?: string } {
    if (this.config.mode === "off") return { written: false, reason: "off" };
    // Deduplicate large opaque snapshots instead of repeating megabytes for every option/target.
    const audits = new Map<string, { json: string; file: string; sha256: string; direction_id: string; combo_id: string }>();
    const snapshots = new WeakMap<object, { json: string; sha256: string }>();
    const verified = new Set<string>();
    const raw = asRecord(row);
    const entries = Array.isArray(raw.entries) ? raw.entries.map(entry => {
      const e = asRecord(entry);
      if (e.combo_metrics == null) return entry;
      const cached = typeof e.combo_metrics === "object" ? snapshots.get(e.combo_metrics) : undefined;
      const json = cached?.json ?? JSON.stringify(e.combo_metrics);
      if (json.length <= 32_000) return entry;
      const sha256 = cached?.sha256 ?? createHash("sha256").update(json).digest("hex");
      if (!verified.has(sha256)) {
        if (!validateProjectionEntry(entry).ok || unsafe(json)) return entry;
        verified.add(sha256);
      }
      if (typeof e.combo_metrics === "object") snapshots.set(e.combo_metrics, { json, sha256 });
      const file = `v6-metrics/${sha256}.json`;
      audits.set(`${e.direction_id}:${e.combo_id}:${sha256}`, { json, file, sha256, direction_id: String(e.direction_id), combo_id: String(e.combo_id) });
      const { combo_metrics: _snapshot, ...numeric } = e;
      return numeric;
    }) : raw.entries;
    const parsed = validate(v6LogSchema, audits.size ? { ...raw, entries,
      metric_audits: [...audits.values()].map(({ json: _json, ...ref }) => ref) } : row);
    if (!parsed.ok) return { written: false, reason: "invalid row" };
    const value = parsed.value;
    if (value.mode !== this.config.mode || !Number.isFinite(Date.parse(value.ts)) || value.unknown.count > value.unknown.total
      || value.entries.some(e => !validateProjectionEntry(e).ok)) return { written: false, reason: "inconsistent row" };
    try {
      const json = JSON.stringify(value);
      if (json.length > 2 * 1024 * 1024 || unsafe(json)) return { written: false, reason: "unsafe or oversized row" };
      mkdirSync(dirname(this.path), { recursive: true });
      if (audits.size) mkdirSync(join(dirname(this.path), "v6-metrics"), { recursive: true });
      for (const audit of audits.values()) {
        try { writeFileSync(join(dirname(this.path), audit.file), audit.json + "\n", { flag: "wx" }); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
      }
      appendJsonLine(this.path, value);
      return { written: true };
    } catch { return { written: false, reason: "write failed" }; }
  }
}

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { PROJECT_ROOT } from "../core/paths.js";
import { appendJsonLine } from "../core/util/jsonl.js";
import { array, enumeration, id, literal, nullable, number, object, optional, record, text, validate, type Infer } from "./schema.js";
import { characterSchema, validateProjectionEntry, projectionEntrySchema } from "./formats.js";
import type { V6Config } from "./config.js";

export const v6LogSchema = object({
  schema: literal("v6-build-log-v1"), ts: text(40), run_id: id, character: characterSchema, question_id: id,
  kind: enumeration("act", "replan", "card_pick", "potion", "shop", "rest", "combat_line"), mode: enumeration("shadow", "on"),
  stage: optional(enumeration("projection", "trigger", "decision", "brain")),
  entries: array(projectionEntrySchema),
  jev_answer: nullable(object({ choice: id, confidence: nullable(number(0, 1)), probabilities: optional(record(number(0, 1))) })),
  fallback: nullable(text(300)), elapsed_ms: number(0), cache: object({ hits: number(0, 1e9, true), misses: number(0, 1e9, true) }),
  degradation: array(text(200)), unknown: object({ count: number(0, 1e9, true), total: number(0, 1e9, true) }),
  triggers: array(enumeration("act_start", "T1", "T2", "T3", "T4", "T5", "T6", "T7")),
  merged_triggers: array(text(100)), skipped_triggers: array(text(100)),
});
export type V6LogRow = Infer<typeof v6LogSchema>;
/** Lazy opt-in skeleton. It never reads env, changes decisions, asks a model or creates a file while off. */
export class V6BuildLog {
  constructor(private readonly config: V6Config, readonly path = join(PROJECT_ROOT, "logs", "v6-build.jsonl")) {}
  append(row: unknown): { written: boolean; reason?: string } {
    if (this.config.mode === "off") return { written: false, reason: "off" };
    const parsed = validate(v6LogSchema, row);
    if (!parsed.ok) return { written: false, reason: "invalid row" };
    const value = parsed.value;
    if (value.mode !== this.config.mode || !Number.isFinite(Date.parse(value.ts)) || value.unknown.count > value.unknown.total
      || value.entries.some(e => !validateProjectionEntry(e).ok)) return { written: false, reason: "inconsistent row" };
    try {
      const json = JSON.stringify(value);
      if (json.length > 2 * 1024 * 1024 || /(sk-(?:ant-)?[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._~+/-]{16,})/.test(json)) return { written: false, reason: "unsafe or oversized row" };
      mkdirSync(dirname(this.path), { recursive: true });
      appendJsonLine(this.path, value);
      return { written: true };
    } catch { return { written: false, reason: "write failed" }; }
  }
}

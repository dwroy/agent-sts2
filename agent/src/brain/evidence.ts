/** Append-only evidence survives a deadline race and asynchronous engine cleanup. Never model input. */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { appendJsonLine } from "../core/util/jsonl.js";
import type { BrainNativeReceipt } from "./run-profile.js";
import type { ToolCallRecord } from "./types.js";

export interface AttemptEvidence {
  id: number;
  phase: string;
  mode: "session" | "exec";
  status: string;
  /** Native turn/completed status, when actually observed; local abort does not manufacture one. */
  native_status?: string | null;
  thread_id?: string | null;
  turn_id?: string | null;
  native_receipt?: BrainNativeReceipt | null;
  ms?: number;
  error?: string;
  raw?: string;
  cleanup?: string;
}
export interface ToolEvidence {
  id: string;
  attempt: number;
  request_id: string | number;
  call_id: string | null;
  thread_id: string | null;
  turn_id: string | null;
  name: string;
  input: unknown;
  status: "pending" | "completed" | "failed" | "rejected";
  output: string | null;
  ms: number;
  isError?: boolean;
}

export class BrainEvidence {
  private readonly attempts = new Map<number, AttemptEvidence>();
  private readonly tools = new Map<string, ToolEvidence>();
  private sequence = 0;
  private writeFailed = false;
  private cancellation: string | null = null;
  constructor(private readonly identity: { question_id: string; run_id?: string }, private readonly file?: string) {}

  private record(kind: string, value: unknown): void {
    if (!this.file) return;
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      appendJsonLine(this.file, { schema: "brain-evidence-v1", ...this.identity, sequence: ++this.sequence,
        ts: new Date().toISOString(), kind, value });
    } catch { this.writeFailed = true; }
  }
  start(mode: AttemptEvidence["mode"], phase: string): number {
    const id = this.attempts.size + 1;
    this.attempt({ id, mode, phase, status: "started" });
    return id;
  }
  attempt(value: Pick<AttemptEvidence, "id"> & Partial<AttemptEvidence>): void {
    const previous = this.attempts.get(value.id);
    const next = { ...previous, ...value } as AttemptEvidence;
    this.attempts.set(value.id, next);
    this.record("attempt", next);
  }
  tool(value: ToolEvidence): void { this.tools.set(value.id, { ...value }); this.record("tool", value); }
  cancel(stage: string): void { this.cancellation = stage; this.record("cancellation", stage); }
  snapshot() {
    return { schema: "brain-evidence-v1", ...this.identity, journal_write_failed: this.writeFailed,
      cancellation: this.cancellation, attempts: [...this.attempts.values()].map(a => ({ ...a })),
      tools: [...this.tools.values()].map(t => ({ ...t })),
      pending: [...this.attempts.values()].some(a => a.status === "started" || a.cleanup === "pending")
        || [...this.tools.values()].some(t => t.status === "pending") };
  }
  toolCalls(): ToolCallRecord[] {
    return [...this.tools.values()].filter(t => t.output !== null).map(t => {
      const record: ToolCallRecord = { name: t.name, input: t.input, output: t.output!, ms: t.ms,
        ...(t.isError ? { isError: true } : {}), outputBytes: Buffer.byteLength(t.output!), sources: [],
        callId: t.call_id ?? t.id, threadId: t.thread_id ?? undefined, turnId: t.turn_id ?? undefined };
      try {
        const envelope = JSON.parse(record.output);
        if (Array.isArray(envelope.sources)) record.sources = envelope.sources;
        else if (typeof envelope.source === "string") {
          const fields = ["source", "version", "provenance", "downloaded_at", "database_sha256", "dataset_sha256", "aggregate_sha256"];
          record.sources = [Object.fromEntries(fields.filter(k => k in envelope).map(k => [k, envelope[k]]))];
        }
      } catch { /* Plain error text is still the exact bridge return. */ }
      return record;
    });
  }
}

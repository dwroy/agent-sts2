/** Durable reservations precede actual sends, including re-asks and failed attempts. */
import { createHash, randomUUID } from "node:crypto";
import { closeSync, constants, existsSync, fsyncSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";
import { join } from "node:path";
import type { BrainRequest } from "./types.js";

export class DecisionKnowledgeExposure {
  reserve(req: BrainRequest, build: (available: (id: string) => boolean, status: string) => BrainRequest): BrainRequest {
    if (!req.runId || !/^[A-Z0-9]{12}$/.test(req.runId) || !req.questionId || !req.toolContext?.logsDir)
      return build(() => false, "missing_identity");
    const dir = join(req.toolContext.logsDir, "decision-knowledge-exposure");
    const key = createHash("sha256").update(req.runId).digest("hex"), path = join(dir, `${key}.jsonl`), lock = path + ".lock";
    let held: number | undefined;
    try {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      held = openSync(lock, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      const counts = new Map<string, number>();
      if (existsSync(path)) {
        const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
        let raw: string;
        try { raw = readFileSync(fd, "utf8"); } finally { closeSync(fd); }
        if (Buffer.byteLength(raw) > 4_000_000 || raw && !raw.endsWith("\n")) throw Error("invalid exposure journal");
        for (const line of raw.split("\n").filter(Boolean)) {
          const row = JSON.parse(line);
          if (row.schema !== "decision-knowledge-exposure-v1" || row.run_id !== req.runId || !Array.isArray(row.ids)
            || row.ids.some((id: unknown) => typeof id !== "string") || new Set(row.ids).size !== row.ids.length) throw Error("invalid exposure row");
          for (const id of row.ids) {
            const next = (counts.get(id) ?? 0) + 1;
            if (next > 3) throw Error("invalid exposure count");
            counts.set(id, next);
          }
        }
      }
      const result = build(id => (counts.get(id) ?? 0) < 3, "reserved");
      const context = (result.payload as any)?.decision_knowledge;
      const ids = [...new Set<string>((context?.entries ?? []).map((e: any) => String(e.id)))];
      const raw = Buffer.from(JSON.stringify({ schema: "decision-knowledge-exposure-v1", run_id: req.runId,
        question_id: req.questionId, phase: req.evidencePhase ?? null, delivery_id: randomUUID(), knowledge_version: context?.knowledge_version ?? null, ids,
        envelope_sha256: createHash("sha256").update(JSON.stringify(context ?? null)).digest("hex") }) + "\n");
      const fd = openSync(path, constants.O_CREAT | constants.O_APPEND | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
      try {
        let offset = 0;
        while (offset < raw.length) offset += writeSync(fd, raw, offset, raw.length - offset);
        fsyncSync(fd);
      } finally { closeSync(fd); }
      // Make creation of the first journal durable as well as its contents.
      const parent = openSync(dir, "r"); try { fsyncSync(parent); } finally { closeSync(parent); }
      return result;
    } catch { return build(() => false, "unavailable"); }
    finally {
      if (held !== undefined) {
        try {
          const own = fstatSync(held), current = lstatSync(lock);
          if (own.dev === current.dev && own.ino === current.ino) unlinkSync(lock);
        } catch { /* A missing or replaced lock is never removed. */ }
        try { closeSync(held); } catch { /* Cleanup cannot invalidate a durable reservation. */ }
      }
    }
  }
}

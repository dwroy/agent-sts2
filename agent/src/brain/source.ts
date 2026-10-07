/** Keep this classification identical to eval/brain_source.py (shared fixed fixtures verify both). */
import { closeSync, openSync, readSync } from "node:fs";

export const BRAIN_SOURCE_POLICY = "codex-successful-brain-v1";
type Row = Record<string, unknown>;
export interface BrainSource {
  policy: string;
  source: "codex" | "deepseek" | "mixed" | "unknown" | "other";
  eligible: boolean;
  exclusion_reason: string | null;
  successful_answers: Record<string, number>;
  successful_by_label: Record<string, Record<string, number>>;
  embedded_answers: Record<string, number>;
  brain_rows: number;
  failed_or_unaccepted_rows: number;
  unknown_successes: number;
  unresolved_questions: number;
  coverage: string;
  first_success: string | null;
  last_success: string | null;
  basis: string;
}

export function successfulBrain(row: Row): boolean {
  if (row.answer === undefined || row.answer === null || row.error) return false;
  if (typeof row.accepted === "boolean") return row.accepted;
  return row.problems == null || (Array.isArray(row.problems) && row.problems.length === 0);
}

export function classifyBrain(rows: Row[]): BrainSource {
  const counts: Record<string, number> = {};
  const kinds: Record<string, Record<string, number>> = {};
  const embedded: Record<string, number> = {};
  const seen = new Set<string>();
  const rejected = new Set<string>();
  const answered = new Set<string>();
  let failed = 0;
  let first: string | null = null;
  let last: string | null = null;
  for (const [i, row] of rows.entries()) {
    if (!successfulBrain(row)) { failed += 1; rejected.add(String(row.question_id || `unidentified-row-${i + 1}`)); continue; }
    if (row.question_id) answered.add(String(row.question_id));
    const engine = ["codex", "deepseek", "claude", "dsh"].includes(String(row.engine)) ? String(row.engine) : "unknown";
    const key = JSON.stringify([row.question_id, engine]);
    if (row.question_id && seen.has(key)) continue;
    if (row.question_id) seen.add(key);
    counts[engine] = (counts[engine] ?? 0) + 1;
    const label = String(row.label || "unknown");
    const kind = kinds[label] ??= {};
    kind[engine] = (kind[engine] ?? 0) + 1;
    const answer = row.answer as Row;
    if (typeof answer === "object" && answer !== null) {
      if (typeof answer.run_plan === "object" && answer.run_plan !== null && !Array.isArray(answer.run_plan)) embedded["run-plan"] = (embedded["run-plan"] ?? 0) + 1;
      if (answer.route && !["map/route-plan", "map/route-review"].includes(label)) embedded["map/route"] = (embedded["map/route"] ?? 0) + 1;
    }
    if (typeof row.ts === "string" && row.ts) {
      first = first === null || row.ts.localeCompare(first) < 0 ? row.ts : first;
      last = last === null || row.ts.localeCompare(last) > 0 ? row.ts : last;
    }
  }
  const known = Object.keys(counts).filter((e) => e !== "unknown");
  const unresolved = [...rejected].filter((key) => !answered.has(key)).length;
  const source: BrainSource["source"] = known.length > 1 ? "mixed" : counts.unknown || unresolved || known.length === 0 ? "unknown" : known[0] === "codex" || known[0] === "deepseek" ? known[0] : "other";
  const reason = source === "codex" ? null : source === "unknown" ? unresolved ? "unresolved_brain_questions" : rows.length ? "missing_successful_brain_engine" : "missing_brain_log" : `successful_${source === "other" ? "non_codex" : source}_brain`;
  return { policy: BRAIN_SOURCE_POLICY, source, eligible: source === "codex", exclusion_reason: reason,
    successful_answers: counts, successful_by_label: kinds, embedded_answers: embedded, brain_rows: rows.length,
    failed_or_unaccepted_rows: failed, unknown_successes: counts.unknown ?? 0, first_success: first, last_success: last,
    unresolved_questions: unresolved, coverage: rows.length && !unresolved ? "all_logged_questions_resolved" : "missing_or_unresolved_logged_questions",
    basis: "brain.jsonl accepted verdict; legacy answer != null, no error/problems; unique question_id+engine" };
}

/** Stream complete JSONL rows: climb must not load the full prompt log into one huge string. */
export function readJsonl(path: string): Row[] {
  const rows: Row[] = [];
  let fd: number;
  try { fd = openSync(path, "r"); } catch { return rows; }
  const buffer = Buffer.alloc(64 * 1024);
  let pending = Buffer.alloc(0);
  try {
    let n: number;
    while ((n = readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      const data = Buffer.concat([pending, buffer.subarray(0, n)]);
      let start = 0;
      let end: number;
      while ((end = data.indexOf(10, start)) >= 0) {
        try {
          const row = JSON.parse(data.subarray(start, end).toString("utf8")) as Row;
          if (row && typeof row === "object" && !Array.isArray(row)) {
            const answer = row.answer as Row | null;
            rows.push({ ...Object.fromEntries(["run_id", "engine", "ts", "question_id", "label", "error", "problems", "accepted"].map((k) => [k, row[k]])),
              answer: answer === undefined || answer === null ? null : typeof answer === "object" ? { run_plan: answer.run_plan, route: answer.route } : true });
          }
        } catch { /* A torn active append has no accepted verdict. */ }
        start = end + 1;
      }
      pending = data.subarray(start);
    }
  } finally { closeSync(fd); }
  return rows;
}

export function brainSources(path: string): Map<string, BrainSource> {
  const byRun = new Map<string, Row[]>();
  for (const row of readJsonl(path)) {
    if (typeof row.run_id !== "string" || !row.run_id) continue;
    const rows = byRun.get(row.run_id) ?? [];
    rows.push(row);
    byRun.set(row.run_id, rows);
  }
  return new Map([...byRun].map(([run, rows]) => [run, classifyBrain(rows)]));
}

// Original production artifacts are inputs only; no admit/complete/publish calls.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { KnowledgeStore, auditApprovedChanges } from "../../../agent/src/knowledge/runtime/store.ts";
import { mergeApprovedDelta } from "../../../agent/src/knowledge/runtime/continuation.ts";
import { validateDocuments, validateUpdate } from "../../../agent/src/knowledge/runtime/validation.ts";
const root = "/home/dw/Projects/agent-sts2";
const checks = JSON.parse(readFileSync(root + "/paper/materials/20261031-1759-four-CAS-ops/four-native-artifact-readback.json", "utf8")).batches;
const hash = (raw: Buffer) => createHash("sha256").update(raw).digest("hex");
const s = new KnowledgeStore(root + "/data/knowledge-runtime", { readOnly: true });
const current = s.current()!;
let head = s.files(current);
const originalHead = structuredClone(head), results = [], captured = new Map<string, string>();
for (const check of checks) {
 const raw = readFileSync(check.candidate), candidate = JSON.parse(raw.toString());
 assert.equal(hash(raw), check.files.find((x: any) => x.path === check.candidate).sha256);
 const approvalRaw = readFileSync(check.approval), approved = JSON.parse(approvalRaw.toString());
 for (const path of [check.candidate, check.approval, ...approved.map((a: any) => a.path)]) captured.set(path, hash(readFileSync(path)));
 const status = s.status(candidate.id);
 assert.equal(status.status, "validated"); assert(!status.version); assert(!status.completion);
 const before = s.files(candidate.base);
 auditApprovedChanges(before, candidate.files, approved);
 const merged = mergeApprovedDelta(candidate.character, before, candidate.files, head);
 const all = { ...head, ...merged.files };
 validateDocuments(all); validateUpdate(head, all); auditApprovedChanges(head, merged.files, approved);
 const successorBytes = Buffer.byteLength(JSON.stringify({ ...candidate, files: merged.files }));
 assert(successorBytes <= 32 * 1024 * 1024);
 assert(merged.delta.every(d => d.before === null));
 const path = "characters/silent/build-research.json", added = JSON.parse(all[path]).entries.filter((e: any) => merged.delta.some(d => d.id === e.id));
 const originalEntries = JSON.parse(originalHead[path]).entries;
 for (const entry of originalEntries) assert.deepEqual(JSON.parse(all[path]).entries.find((e: any) => e.id === entry.id), entry);
 results.push({ batch: candidate.id, original_candidate_sha256: hash(raw), original_approval_sha256: hash(approvalRaw),
   old_base: candidate.base, checked_current: current, delta: merged.delta, merged_document_bytes: Buffer.byteLength(all[path]), serialized_successor_bytes: successorBytes,
   external_upload_windows: added.reduce((n: number, e: any) => n + e.evidence.length, 0),
   full_schema_update_and_original_approval_pass: true, original_status: status.status });
 head = all; // Simulate sequential acceptance in memory, never change the real database.
}
assert.equal(new Set(results.flatMap(r => r.delta.map(d => d.id))).size, 4);
assert.equal(s.current(), current); s.close();
for (const [path, before] of captured) assert.equal(hash(readFileSync(path)), before);
const output = { at: new Date().toISOString(), read_only: true, database_read_only: true, current,
  in_memory_sequential_merge: true, original_artifact_hashes_unchanged: true, original_current_unchanged: true,
  total_external_upload_windows: results.reduce((n, r) => n + r.external_upload_windows, 0),
  independent_players_or_own_validation: false, results };
writeFileSync(new URL("./four-candidates-readonly.json", import.meta.url), JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({ current, candidates: results.length, external_upload_windows: output.total_external_upload_windows, read_only: true }));

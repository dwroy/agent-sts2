// Mechanical content preparation under #79/6538878551; grading and publication stay external.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";

const flags = Object.fromEntries(process.argv.slice(2).reduce((all, arg, i, a) => i % 2 ? all : [...all, [arg.slice(2), a[i + 1]]], []));
for (const key of ["paths", "authority", "compiled", "output"]) assert(flags[key], `--${key} required`);
const output = resolve(flags.output), inside = relative(resolve(".artifacts"), output);
assert(inside && !inside.startsWith("..") && !inside.startsWith("/")); mkdirSync(output, { recursive: true });
const load = path => import(pathToFileURL(join(resolve(flags.compiled), path)));
const { KnowledgeStore } = await load("agent/src/knowledge/runtime/store.js");
const { canonical } = await load("agent/src/knowledge/runtime/classification.js");
const paths = JSON.parse(readFileSync(flags.paths)), authority = JSON.parse(readFileSync(flags.authority));
assert.equal(authority.url, "https://github.com/dwroy/agent-sts2/issues/79#issuecomment-6538878551");
assert.equal(authority.author, "dwroy"); assert(authority.body.startsWith("[Claude] #79 r2 review 通过"));
const sha = raw => createHash("sha256").update(raw).digest("hex");
assert.equal(sha(authority.body), authority.body_sha256);
const originalPaths = [...new Set([paths.candidate, paths.approval, paths.report, paths.result,
 ...JSON.parse(readFileSync(paths.approval)).map(a => a.path)])];
const originalHashes = originalPaths.map(path => ({ path, sha256: sha(readFileSync(path)) }));
const candidate = JSON.parse(readFileSync(paths.candidate));
assert.equal(candidate.id, "20261026-182334-strategy-proposal");
const base = "K1-753af285189835e26c864fe38d6cf5550eab1399158bbb68ce8f73ce078e7fec";
const strategyPath = "characters/silent/strategy-entries.json", classPath = "characters/silent/classification.json";
const ids = ["silent-route-hp-observation", "silent-brain-poison-footwork-realization-review"];
const allowed = ["strategy", "evidence", "batch_supplements", "prior_texts"];
const protectedField = key => ["confidence", "evidence_type", "formal_publication", "status", "published", "publication_status", "prior_strategy", "prior_review_display"].includes(key) || key.startsWith("grading");
const clone = value => JSON.parse(JSON.stringify(value));
const index = raw => new Map(JSON.parse(raw).entries.map(e => [e.id, e]));
const store = new KnowledgeStore(paths.runtime, { readOnly: true });
try {
 const before = store.files(candidate.base), current = store.files(base), actualCurrent = store.current();
 const b = index(before[strategyPath]), c = index(candidate.files[strategyPath]), h = index(current[strategyPath]);
 const merged = [], manifest = [];
 for (const id of ids) {
  const old = b.get(id), proposed = c.get(id), head = h.get(id); assert(old && proposed && head);
  const changes = [...new Set([...Object.keys(old), ...Object.keys(proposed)])].filter(k => canonical(old[k] ?? null) !== canonical(proposed[k] ?? null));
  assert(changes.every(key => key === "version" || allowed.includes(key)), `unapproved content field for ${id}`);
  const value = clone(head), applied = changes.filter(key => allowed.includes(key)), provenance = [];
  for (const key of applied) {
   assert.equal(canonical(head[key] ?? null), canonical(old[key] ?? null), `current content also changed: ${id}/${key}`);
   value[key] = clone(proposed[key]);
   provenance.push({ field: key, origin: "original 182334 candidate", before_sha256: sha(canonical(head[key] ?? null)), after_sha256: sha(canonical(value[key])) });
  }
  const removed = Object.keys(value).filter(protectedField);
  for (const key of removed) delete value[key];
  assert(!Object.keys(value).some(protectedField));
  for (const key of Object.keys(head).filter(k => !protectedField(k) && !applied.includes(k))) assert.equal(canonical(value[key]), canonical(head[key]));
  assert.equal(value.version, head.version); // Revision metadata is left to the grading/approval owner.
  merged.push(value);
  manifest.push({ id, current_sha256: sha(canonical(head)), original_base_sha256: sha(canonical(old)), original_candidate_sha256: sha(canonical(proposed)),
   content_sha256: sha(canonical(value)), applied_fields: provenance, stripped_for_regrading: removed,
   version_not_copied_from_candidate: proposed.version, retained_current_version: value.version,
   grading_receipt: null, final_graded_object_sha256: null, publication_approved: false });
 }
 const bClass = index(before[classPath]), cClass = index(candidate.files[classPath]), hClass = index(current[classPath]);
 const classifications = ids.map(id => {
  const proposed = [...cClass.values()].find(e => e.target.id === id && e.target.path === strategyPath);
  const old = bClass.get(proposed.id), head = hClass.get(proposed.id); assert(old && head);
  const identity = v => [v.target.path, v.target.type, v.target.id, v.target.parent_id ?? null];
  assert.equal(canonical(identity(old)), canonical(identity(proposed))); assert.equal(canonical(identity(old)), canonical(identity(head)));
  const fields = ["evidence", "rationale"].filter(key => canonical(old[key] ?? null) !== canonical(proposed[key] ?? null));
  for (const key of fields) assert.equal(canonical(head[key] ?? null), canonical(old[key] ?? null));
  return { id: head.id, current_sha256: sha(canonical(head)), candidate_sha256: sha(canonical(proposed)),
   metadata: { ...clone(head), ...Object.fromEntries(fields.map(key => [key, clone(proposed[key])])), target: { path: head.target.path, type: head.target.type, id: head.target.id,
    ...(head.target.parent_id ? { parent_id: head.target.parent_id } : {}) } },
   target_sha256: null, status: "rebind only after the final graded target exists" };
 });
 const content = { schema: "issue79-regrading-input-v1", original_batch: candidate.id, fixed_base: base, source_document_sha256: sha(current[strategyPath]),
  authorization: authority.url, authorization_sha256: authority.body_sha256, entries: merged, classifications,
  status: "awaiting #85 regrading; not a knowledge candidate or source approval" };
 const raw = JSON.stringify(content, null, 2) + "\n"; writeFileSync(join(output, "regrading-input.json"), raw);
 const full = JSON.parse(current[strategyPath]); full.entries = full.entries.map(e => merged.find(m => m.id === e.id) ?? e);
 const gradingFiles = { ...current, [strategyPath]: JSON.stringify(full) };
 writeFileSync(join(output, "regrading-files.json"), JSON.stringify(gradingFiles));
 const conflictIds = new Set([...ids, ...classifications.map(e => e.id)]), unconflicted = [];
 for (const path of [strategyPath, classPath]) {
  const old = index(before[path]), next = index(candidate.files[path]), head = index(current[path]);
  for (const [id, value] of next) if (!conflictIds.has(id) && canonical(old.get(id) ?? null) !== canonical(value)) {
   assert.equal(canonical(head.get(id) ?? null), canonical(old.get(id) ?? null));
   unconflicted.push({ path, id, original_candidate_sha256: sha(canonical(value)), action: "carry forward unchanged in final original-batch reconciliation" });
  }
 }
 assert.equal(unconflicted.length, 2);
 for (const original of originalHashes) assert.equal(sha(readFileSync(original.path)), original.sha256);
 const result = { schema: "issue79-content-reconciliation-manifest-v1", original_batch: candidate.id, original_base: candidate.base, fixed_base: base,
  actual_current_at_read: actualCurrent, original_candidate_sha256: sha(readFileSync(paths.candidate)), original_approval_sha256: sha(readFileSync(paths.approval)),
  authorization: authority.url, authorization_sha256: authority.body_sha256, entries: manifest,
  regrading_input_sha256: sha(raw), preserved_unconflicted_changes: unconflicted, original_files: originalHashes, production_writes: false, grades_assigned: false,
  new_source_approval_created: false, final_classification_targets_created: false };
 writeFileSync(join(output, "manifest.json"), JSON.stringify(result, null, 2) + "\n");
 console.log(JSON.stringify({ entries: manifest.map(e => ({ id: e.id, content_sha256: e.content_sha256, stripped_for_regrading: e.stripped_for_regrading })), production_writes: false }));
} finally { store.close(); }

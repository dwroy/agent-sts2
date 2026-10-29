/** Replay the frozen 133 successful questions; no game/model/writer/publication calls. */
import { readFileSync, writeFileSync, mkdirSync, openSync, readSync, closeSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { setKnowledgeCharacter } from "../../../agent/src/knowledge/files.ts";
import { indexedKnowledge, closeIndexedReaders } from "../../../agent/src/knowledge/runtime/reader.ts";
import { attachDecisionKnowledge, decisionContextTool, decisionKnowledgeEntryView, decisionKnowledgeReference } from "../../../agent/src/brain/decision-knowledge.ts";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, i, values) => i % 2 ? pairs : [...pairs, [value, values[i + 1]]], []));
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const sourceRoot = resolve(args["--source-root"] ?? repo), output = resolve(args["--output"] ?? resolve(repo, ".artifacts/issue81-r3/replay"));
if (!output.startsWith(repo + "/")) throw Error("output must stay in this worktree");
const hash = v => createHash("sha256").update(v).digest("hex"), size = v => Buffer.byteLength(JSON.stringify(v));
const sourcePath = ".artifacts/ops-issue80-injected-five-20261027/brain.jsonl", input = readFileSync(resolve(sourceRoot, sourcePath));
assert.equal(hash(input), "78fb41df02de3d86c6eb83e7ee8cbc135739bbda663255aeb3e46757a56d6005");
const sourceFiles = ["agent/src/brain/decision-knowledge.ts", "agent/tests/decision-knowledge.test.ts", "agent/tests/decision-observations.test.ts"];
const codeHashes = () => Object.fromEntries(sourceFiles.map(p => [p, hash(readFileSync(resolve(repo, p)))])), beforeHashes = codeHashes();
const windows = input.toString().trim().split("\n").map(x => JSON.parse(x)), latest = new Map();
const fd = openSync(resolve(sourceRoot, "logs/brain.jsonl"), "r");
try {
 for (const { row, ref } of windows) {
  assert.equal(ref.file, "logs/brain.jsonl"); const original = Buffer.alloc(ref.bytes);
  assert.equal(readSync(fd, original, 0, ref.bytes, ref.offset), ref.bytes); assert.equal(hash(original), ref.sha256);
  if (row.accepted === true) latest.set(row.question_id, { row, ref });
 }
} finally { closeSync(fd); }
assert.equal(windows.length, 134); assert.equal(latest.size, 133);
const version = "K1-0725587f50e671013f48f93e6c3e6b7f27d3d05638c40f33b460c9aeda7c7c46";
const snapshot = resolve(sourceRoot, "data/knowledge-runtime/snapshots", version), results = [], examples = [];
setKnowledgeCharacter("silent");
try {
 const reader = indexedKnowledge(snapshot); assert(reader); assert.equal(reader.db.prepare("PRAGMA query_only").get().query_only, 1);
 const originals = new Map(reader.all({ type: "strategy", character: "silent", ascension: 10, view: "tool" }).map(e => [e.original_id, e.value]));
 let completeFieldsVerified = 0, fullParts = 0, fullDocuments = 0;
 const beforeEntries = [], completeIds = new Set(), referenceIds = new Set();
 for (const { row, ref } of latest.values()) {
  const previous = row.payload.decision_knowledge; assert.equal(previous.knowledge_version, version); assert.equal(previous.byte_budget, 8000);
  const { decision_knowledge: ignored, ...payload } = row.payload;
  const ctx = { label: row.label, payload, options: row.options, ascension: 10, knowledgeDir: snapshot, logsDir: "" };
  const req = { ...row, payload, knowledge: { mode: "tools" }, toolContext: ctx, system: "frozen-replay",
   spec: { label: row.label, kind: "pick", schema: { type: "object" }, validate: () => [] } };
  const after = attachDecisionKnowledge(req, { enabled: true, bytes: 8000 }).payload.decision_knowledge;
  assert(after); assert.equal(after.status, "ok"); assert(size(after) <= 8000); assert.equal(after.fragment_entries, 0);
  assert.equal(after.omitted_references, 0); assert.equal(after.total_matches, previous.total_matches);
  const ranked = [...after.entries.map(e => e.id), ...after.references.map(e => e.id)];
  assert.equal(ranked.length, after.total_matches); assert.equal(new Set(ranked).size, ranked.length);
  assert.deepEqual(ranked.slice(0, previous.entries.length), previous.entries.map(e => e.id));
  assert.deepEqual(payload, Object.fromEntries(Object.entries(row.payload).filter(([k]) => k !== "decision_knowledge")));
  for (const e of after.entries) {
   const original = originals.get(e.id); assert(original); assert.deepEqual(e, decisionKnowledgeEntryView(original, "strategy_observation"));
   for (const k of ["summary", "rule_candidate", "conditions", "denominators", "counterexamples", "limitations", "conflicts_with"]) {
    assert.deepEqual(e.review_observation[k], original.review_observation[k]); completeFieldsVerified++;
   }
   assert.equal(e.truncated, false); completeIds.add(e.id);
  }
  for (const e of after.references) { assert.deepEqual(e, decisionKnowledgeReference(originals.get(e.id), "strategy_observation")); referenceIds.add(e.id); }
  beforeEntries.push(...previous.entries);
  const prefixBytes = n => {
   if (ranked.length < n) return null;
   const entries = ranked.slice(0, n).map(id => decisionKnowledgeEntryView(originals.get(id), "strategy_observation"));
   const references = ranked.slice(n).map(id => decisionKnowledgeReference(originals.get(id), "strategy_observation"));
   return size({ ...after, entries, references, returned: n, complete_entries: n, reference_only_count: references.length, omitted: ranked.length - n });
  };
  results.push({ run: row.run_id, question_id: row.question_id, label: row.label, original_ref: ref,
   before: { entries: previous.entries.length, fragments: previous.entries.filter(e => e.truncated).length, bytes: size(previous) },
   after: { complete: after.entries.length, fragments: 0, references: after.references.length, bytes: size(after),
    complete_ids: after.entries.map(e => e.id), reference_ids: after.references.map(e => e.id) },
   ranked_prefix_envelope_bytes: Object.fromEntries([1, 2, 3, 4].map(n => [n, prefixBytes(n)])) });
  if (row.run_id === "QWM6TY3DRE67" && ["reward/card", "map/route-plan", "event/act-plan"].includes(row.label) && !examples.some(e => e.label === row.label))
   examples.push({ question_id: row.question_id, run: row.run_id, label: row.label, original_ref: ref, before: previous, after });
  if (!after.entries.length && !examples.some(e => e.after.entries.length === 0))
   examples.push({ question_id: row.question_id, run: row.run_id, label: row.label, original_ref: ref, before: previous, after });
  // Every reference remains actually retrievable in this very question's formal scope.
  for (const id of ranked) {
   let raw = "", offset = 0;
   do {
    const result = await decisionContextTool().run({ detail: "full", source: "strategy_observation", document_id: id, document_offset: offset }, ctx);
    assert(!result.isError); const part = JSON.parse(result.text); assert.equal(part.knowledge_version, version); assert(size(JSON.parse(result.text)) < 24000);
    assert.equal(typeof part.json_fragment, "string"); raw += part.json_fragment; offset = part.next_document_offset; fullParts++;
   } while (offset !== null);
   assert.equal(raw, JSON.stringify(originals.get(id))); fullDocuments++;
  }
 }
 assert.equal(examples.length, 4); assert.deepEqual(codeHashes(), beforeHashes);
 const distribution = values => Object.fromEntries([...new Set(values)].sort((a, b) => a - b).map(n => [n, values.filter(x => x === n).length]));
 const quantiles = values => { const a = values.filter(x => x !== null).sort((a, b) => a - b); return { n: a.length, min: a[0], p50: a[Math.floor((a.length - 1) * .5)], p90: a[Math.floor((a.length - 1) * .9)], max: a.at(-1), above_8000: a.filter(n => n > 8000).length }; };
 const summary = { knowledge_version: version, budget: 8000, original_rows_verified: windows.length, independent_questions: latest.size,
  source: { path: sourcePath, bytes: input.length, sha256: hash(input) }, source_sha256: beforeHashes, source_unchanged: true,
  before: { entries: beforeEntries.length, fragments: beforeEntries.filter(e => e.truncated).length, max_bytes: Math.max(...results.map(r => r.before.bytes)) },
  after: { complete_entries: results.reduce((n, r) => n + r.after.complete, 0), fragment_entries: 0,
   complete_per_question: distribution(results.map(r => r.after.complete)), reference_only_occurrences: results.reduce((n, r) => n + r.after.references, 0),
   max_bytes: Math.max(...results.map(r => r.after.bytes)), unique_complete_ids: [...completeIds], unique_reference_ids: [...referenceIds],
   all_ranked_ids_accounted_for: true, complete_fields_equal_checks: completeFieldsVerified },
  ranked_prefix_envelope_bytes: Object.fromEntries([1, 2, 3, 4].map(n => [n, quantiles(results.map(r => r.ranked_prefix_envelope_bytes[n]))])),
  scoped_full_documents_verified: fullDocuments, scoped_full_parts_verified: fullParts,
  strategy_sha256: reader.fileDigest("characters/silent/strategy-entries.json"),
  limits: "Offline saved payload; raw mod state absent. Before is the actual logged injection, after is counterfactual. No natural adoption or benefit inference." };
 mkdirSync(output, { recursive: true });
 for (const [n, v] of Object.entries({ summary, questions: results })) writeFileSync(resolve(output, n + ".json"), JSON.stringify(v, null, 2) + "\n");
 for (const e of examples) {
  const stem = e.label.replaceAll("/", "-");
  writeFileSync(resolve(output, stem + ".before.json"), JSON.stringify(e.before, null, 2) + "\n");
  writeFileSync(resolve(output, stem + ".after.json"), JSON.stringify(e.after, null, 2) + "\n");
  writeFileSync(resolve(output, stem + ".ref.json"), JSON.stringify({ question_id: e.question_id, run: e.run, label: e.label, original_ref: e.original_ref }, null, 2) + "\n");
 }
 console.log(JSON.stringify(summary));
} finally { closeIndexedReaders(); setKnowledgeCharacter(null); }

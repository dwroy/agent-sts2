// Read-only source/current inspection and tools over the already isolated original-batch replay.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";

const flags = Object.fromEntries(process.argv.slice(2).reduce((all, value, i, args) => i % 2 ? all : [...all, [value.replace(/^--/, ""), args[i + 1]]], []));
for (const key of ["paths", "compiled", "replay", "output"]) assert(flags[key], `--${key} required`);
const output = resolve(flags.output), inside = relative(resolve(".artifacts"), output);
assert(inside && !inside.startsWith("..") && !inside.startsWith("/"));
mkdirSync(output, { recursive: true });
const load = path => import(pathToFileURL(join(resolve(flags.compiled), path)));
const { KnowledgeStore, auditApprovedChanges } = await load("agent/src/knowledge/runtime/store.js");
const { canonical } = await load("agent/src/knowledge/runtime/classification.js");
const { validateDocuments, validateUpdate } = await load("agent/src/knowledge/runtime/validation.js");
const { mergeApprovedDelta } = await load("agent/src/knowledge/runtime/continuation.js");
const { closeIndexedReaders } = await load("agent/src/knowledge/runtime/reader.js");
const { strategyTool } = await load("agent/src/brain/tools/strategy-tool.js");
const { strategyEvidenceSummary } = await load("agent/src/knowledge/strategy-entries.js");
const { setKnowledgeCharacter } = await load("agent/src/knowledge/files.js");
const sha = value => createHash("sha256").update(value).digest("hex");
const meta = JSON.parse(readFileSync(flags.paths)), candidateRaw = readFileSync(meta.candidate), approvalRaw = readFileSync(meta.approval);
const candidate = JSON.parse(candidateRaw), approval = JSON.parse(approvalRaw);
const id = "silent-brain-poison-flexible-prefix-continuity-review";
const target = JSON.parse(candidate.files["characters/silent/strategy-entries.json"]).entries.find(e => e.id === id);
const source = new KnowledgeStore(meta.runtime, { readOnly: true });
let continuation;
try {
 const current = source.current(), before = source.files(candidate.base), head = source.files(current);
 validateDocuments({ ...before, ...candidate.files }); validateUpdate(before, { ...before, ...candidate.files });
 auditApprovedChanges(before, candidate.files, approval);
 const conflicts = [];
 for (const [path, raw] of Object.entries(candidate.files)) {
  const index = text => new Map(JSON.parse(text ?? '{"entries":[]}').entries.map(e => [e.id, e]));
  const b = index(before[path]), n = index(raw), h = index(head[path]);
  for (const [entryId, next] of n) if (canonical(b.get(entryId) ?? null) !== canonical(next)
   && canonical(h.get(entryId) ?? null) !== canonical(b.get(entryId) ?? null)) conflicts.push({ path, id: entryId,
    before_sha256: b.has(entryId) ? sha(canonical(b.get(entryId))) : null,
    candidate_sha256: sha(canonical(next)), current_sha256: h.has(entryId) ? sha(canonical(h.get(entryId))) : null });
 }
 continuation = { original_id: candidate.id, original_status: source.status(candidate.id).status, original_base: candidate.base, checked_current: current,
  original_audit: "passed", candidate_sha256: sha(candidateRaw), approval_sha256: sha(approvalRaw), conflicts, production_writes: false };
 try {
  const merged = mergeApprovedDelta(candidate.character, before, candidate.files, head);
  validateDocuments({ ...head, ...merged.files }); validateUpdate(head, { ...head, ...merged.files });
  auditApprovedChanges(head, merged.files, approval);
  continuation.result = "pure continuation checks passed; explicit original ops admission still required";
  continuation.delta = merged.delta;
 } catch (error) { continuation.result = "refused by existing continuation/validation contract"; continuation.error = error.message; }
} finally { source.close(); }

const replay = JSON.parse(readFileSync(join(flags.replay, "readback.json")));
const snapshot = join(resolve(flags.replay), "runtime", "snapshots", replay.isolated.receipt.version);
// This context instantiates only the original declared trigger; negative controls keep it binding.
assert.deepEqual(target.trigger.deck_cards, [{ name: "SNAKEBITE", count: { min: 1 } }]);
assert(target.trigger.question_types.includes("card_reward") && target.trigger.acts.includes(1));
const context = { ascension: 10, label: "reward/card", act: 1, payload: { facts: { act: 1, deck: [{ card_id: "SNAKEBITE" }] } }, knowledgeDir: snapshot, logsDir: join(output, "no-logs") };
const tool = strategyTool(), query = { query: id, limit: 1 }, calls = [];
async function call(input, ctx = context) {
 const result = await tool.run(input, ctx), bytes = Buffer.byteLength(result.text), body = JSON.parse(result.text);
 assert(bytes <= 24000 && !result.isError);
 calls.push({ input, bytes, result }); return body;
}
try {
 setKnowledgeCharacter("silent");
 const projection = await call(query);
 assert.equal(projection.returned, 1); assert.equal(projection.entries[0].id, id); assert.equal(projection.oversized_skipped, 0);
 let offset = 0, raw = "", documentSha, parts = 0;
 for (;;) {
  const body = await call({ query: id, detail: "full", document_id: id, document_offset: offset });
  assert.equal(body.returned, 1); assert.equal(body.document_id, id);
  documentSha ??= body.document_sha256; assert.equal(body.document_sha256, documentSha);
  raw += body.json_fragment; parts++;
  if (body.next_document_offset === null) break;
  assert(body.next_document_offset > offset && parts < 1000); offset = body.next_document_offset;
 }
 assert.equal(sha(raw), documentSha);
 const full = JSON.parse(raw), originalKeys = Object.keys(target);
 // Existing presentStrategy adds two consumer provenance fields; every stored field must remain exact.
 assert.equal(canonical(Object.fromEntries(originalKeys.map(key => [key, full[key]]))), canonical(target));
 const added = Object.keys(full).filter(key => !originalKeys.includes(key)).sort();
 assert.deepEqual(added, ["evidence_summary", "limitation_notice"]);
 assert.equal(canonical(full.evidence_summary), canonical(strategyEvidenceSummary(target))); assert.equal(typeof full.limitation_notice, "string");
 const absentCard = await call(query, { ...context, payload: { facts: { act: 1, deck: [] } } }); assert.equal(absentCard.returned, 0);
 setKnowledgeCharacter("ironclad"); const otherRole = await call(query); assert.equal(otherRole.returned, 0);
 assert.equal(sha(readFileSync(meta.candidate)), sha(candidateRaw)); assert.equal(sha(readFileSync(meta.approval)), sha(approvalRaw));
 writeFileSync(join(output, "tool-calls.json"), JSON.stringify({ context, calls }, null, 2) + "\n");
 const summary = { schema: "issue79-resume-consumer-and-continuation-v1", continuation,
  isolated_tool: { original_id: candidate.id, version: replay.isolated.receipt.version, production: false,
   context: { ascension: context.ascension, label: context.label, act: context.act, payload: context.payload },
   projected_id: projection.entries[0].id, projection_bytes: calls[0].bytes, full_parts: parts, full_sha256: documentSha,
   all_candidate_fields_exact: true, existing_consumer_additions: added, negative_absent_card_returned: absentCard.returned, negative_other_role_returned: otherRole.returned,
   max_response_bytes: Math.max(...calls.map(c => c.bytes)), raw_calls_sha256: sha(readFileSync(join(output, "tool-calls.json"))),
   historical_initial_context_returned: replay.isolated.tool.returned } };
 writeFileSync(join(output, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
 console.log(JSON.stringify(summary));
} finally { closeIndexedReaders(); setKnowledgeCharacter(null); }

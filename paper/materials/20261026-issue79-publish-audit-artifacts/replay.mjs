// Read original inputs only; all publication writes are confined to this checkout's .artifacts.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, relative, join, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const args = Object.fromEntries(process.argv.slice(2).reduce((out, value, index, all) => index % 2 ? out : [...out, [value.replace(/^--/, ""), all[index + 1]]], []));
for (const key of ["candidate", "approval", "runtime", "compiled", "baseline", "output"]) assert(args[key], `--${key} required`);
const project = process.cwd(), output = resolve(args.output);
assert(relative(join(project, ".artifacts"), output) && !relative(join(project, ".artifacts"), output).startsWith(".."));
const sha = raw => createHash("sha256").update(raw).digest("hex");
const load = path => import(pathToFileURL(join(resolve(args.compiled), path)));
const { KnowledgeStore } = await load("agent/src/knowledge/runtime/store.js");
const { canonical } = await load("agent/src/knowledge/runtime/classification.js");
const { rows } = await load("agent/src/knowledge/runtime/validation.js");
const { auditApprovedChanges, approvalEvidence } = await load("agent/src/knowledge/runtime/approval.js");
const { KnowledgeReader, closeIndexedReaders } = await load("agent/src/knowledge/runtime/reader.js");
const { strategyTool } = await load("agent/src/brain/tools/strategy-tool.js");
const { setKnowledgeCharacter } = await load("agent/src/knowledge/files.js");
const candidateRaw = readFileSync(args.candidate), approvedRaw = readFileSync(args.approval);
const candidate = JSON.parse(candidateRaw), approved = JSON.parse(approvedRaw);
const originals = [args.candidate, args.approval, ...["report.md", "result.json"].map(p => join(dirname(args.candidate), p)).filter(existsSync), ...new Set(approved.map(e => e.path))].map(path => ({ path, sha256: sha(readFileSync(path)) }));
const baselineSource = execFileSync("git", ["show", `${args.baseline}:agent/src/knowledge/runtime/store.ts`], { encoding: "utf8" });
// Strip only this fixed baseline function's type annotations; no compiler API dependency is needed.
const oldFunction = baselineSource.slice(baselineSource.indexOf("export function auditApprovedChanges"), baselineSource.indexOf("function durable("))
 .replace(/^export function auditApprovedChanges[^\n]+\n/, "function auditApprovedChanges(before, changes, approved) {\n").replaceAll(" as Row", "");
const oldAudit = new Function("readFileSync", "canonical", "rows", oldFunction + ";return auditApprovedChanges;")(readFileSync, canonical, rows);
const originalStore = new KnowledgeStore(resolve(args.runtime), { readOnly: true });
let before, originalCurrent, originalStatus;
try {
 before = originalStore.files(candidate.base); originalCurrent = originalStore.current(); originalStatus = originalStore.status(candidate.id);
} finally { originalStore.close(); }
const rejection = approval => { try { oldAudit(before, candidate.files, approval); return null; } catch (e) { return { type: e.name, message: e.message }; } };
const oldMixed = rejection(approved), oldJSONOnly = rejection(approved.filter(e => e.path.toLowerCase().endsWith(".json")));
assert(oldMixed?.type === "SyntaxError"); assert(oldJSONOnly?.message.includes("absent from frozen-source"));
auditApprovedChanges(before, candidate.files, approved); approvalEvidence(approved);
mkdirSync(output, { recursive: true });
const isolated = new KnowledgeStore(join(output, "runtime"));
const seed = { schema: "knowledge-candidate-v1", id: "issue79-isolated-seed", base: null, character: "migration", source: `isolated original base ${candidate.base}`, files: before };
let receipt, tool, indexed;
try {
 isolated.submit(seed); isolated.validate(seed.id); const localBase = isolated.publish(seed.id);
 // The generated seed has its own version identity; original files and ID are unchanged.
 const localCandidate = { ...candidate, base: localBase };
 isolated.submit(localCandidate);
 receipt = isolated.complete(localCandidate, "a".repeat(40), approved);
 assert.deepEqual(isolated.complete(localCandidate, "b".repeat(40), approved), receipt);
 const reader = new KnowledgeReader(isolated.root, receipt.version);
 const id = "silent-brain-poison-flexible-prefix-continuity-review";
 try {
  const found = reader.query({ type: "strategy", character: "silent", id, limit: 1 }); assert.equal(found.length, 1);
  indexed = { id: found[0].original_id, sha256: sha(found[0].payload), classification: found[0].classification };
 } finally { reader.close(); }
 const snapshot = join(isolated.root, "snapshots", receipt.version);
 setKnowledgeCharacter("silent");
 const result = await strategyTool().run({ query: id, limit: 1 }, { ascension: 10, label: "initial", act: 1, payload: {}, knowledgeDir: snapshot, logsDir: join(output, "no-logs") });
 const body = JSON.parse(result.text);
 tool = { bytes: Buffer.byteLength(result.text), isError: result.isError ?? false, returned: body.entries?.map(e => e.id), oversized_skipped: body.oversized_skipped ?? null };
 const report = {
  schema: "issue79-isolated-original-replay-v1", baseline: args.baseline, baseline_source_sha256: sha(baselineSource),
  original: { candidate: candidate.id, base: candidate.base, current: originalCurrent, status: originalStatus.status, version: originalStatus.version, inputs: originals },
  old_mixed_rejection: oldMixed, old_json_only_rejection: oldJSONOnly, patched_audit: "passed",
  isolated: { base_translation: { original: candidate.base, generated: localBase }, original_id_and_files_preserved: true, receipt_code: "fixed format fixture, not a deployed code SHA", receipt, indexed, tool,
   releases: isolated.db.prepare("SELECT count(*) n FROM releases").get().n,
   completion_events: isolated.db.prepare("SELECT count(*) n FROM events WHERE action='complete'").get().n },
  production_publication: "pending original ops deployment/recheck; no production writes", wrapper: "unchanged; #65/#77 original supervision contract",
 };
 for (const item of originals) assert.equal(sha(readFileSync(item.path)), item.sha256);
 writeFileSync(join(output, "readback.json"), JSON.stringify(report, null, 2) + "\n");
 console.log(JSON.stringify({ patched_audit: "passed", isolated_candidate: candidate.id, indexed: indexed.id, tool, production: "read-only" }));
} finally { closeIndexedReaders(); isolated.close(); }

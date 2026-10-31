/** Offline compatibility proof only; original #79 admission is deliberately not simulated. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ownRoot = fileURLToPath(new URL("../../../", import.meta.url));
const [backup, output] = process.argv.slice(2);
if (!backup || !output) throw Error("expected isolated-backup new-artifacts-output");
const destination = resolve(output);
if (!destination.startsWith(resolve(ownRoot, ".artifacts") + "/")) throw Error("output must be in this checkout's .artifacts");
const load = async p => import(pathToFileURL(join(ownRoot, "agent", p)));
const { KnowledgeStore } = await load("src/knowledge/runtime/store.ts");
const { KnowledgeReader, closeIndexedReaders } = await load("src/knowledge/runtime/reader.ts");
const { canonical, classificationDigest } = await load("src/knowledge/runtime/classification.ts");
const { gradedBodyEligible } = await load("src/knowledge/strategy-grading.ts");
const { compactStrategyDecisionView } = await load("src/brain/decision-knowledge-view.ts");
const { setKnowledgeCharacter } = await load("src/knowledge/files.ts");
const { buildKnowledgeTools } = await load("src/brain/tools/agent-knowledge.ts");
const { ToolHost } = await load("src/brain/tools/mcp-server.ts");
const sha = s => createHash("sha256").update(s).digest("hex");
const material = fileURLToPath(new URL("./", import.meta.url));
const receiptRaw = readFileSync(join(material, "receipt.json"), "utf8"), receipt = JSON.parse(receiptRaw);
const backupSha = sha(readFileSync(backup));
const path = "characters/silent/strategy-entries.json", cp = "characters/silent/classification.json";
const store = KnowledgeStore.restore(backup, destination);
let reader;
try {
 assert.equal(store.current(), receipt.base);
 const bindings = () => canonical(store.db.prepare("SELECT * FROM run_bindings ORDER BY run_id").all());
 const beforeBindings = bindings(), files = store.files(receipt.base), doc = JSON.parse(files[path]);
 const input = JSON.parse(readFileSync(join(material, "frozen-input.json"), "utf8"));
 assert.equal(sha(files[path]), input.source_document_sha256);
 const originals = new Map(doc.entries.map(e => [e.id, e]));
 doc.entries = doc.entries.map(e => receipt.entries.find(v => v.id === e.id) ?? e);
 assert.equal(doc.entries.length, 173);
 assert.equal(doc.entries.filter(e => canonical(e) !== canonical(originals.get(e.id))).length, 2);
 // Test-only digest rebinding preserves the old classification metadata. #79 owns final metadata/admission.
 const classifications = JSON.parse(files[cp]); let rebound = 0;
 for (const c of classifications.entries) {
  const e = receipt.entries.find(e => c.target.path === path && c.target.id === e.id);
  if (e) { c.target.sha256 = classificationDigest(e); rebound++; }
 }
 assert.equal(rebound, 2);
 const id = "issue85-regrade79-consumer-proof-v1";
 store.submit({ schema: "knowledge-candidate-v1", id, base: receipt.base, character: "silent", source: "offline compatibility proof; not original #79 admission",
  files: { [path]: JSON.stringify(doc), [cp]: JSON.stringify(classifications) } });
 store.validate(id); const version = store.publish(id);
 reader = new KnowledgeReader(destination, version);
 setKnowledgeCharacter("silent");
 const ctx = { knowledgeDir: join(destination, "snapshots", version), logsDir: destination, ascension: 10, act: 2, label: "rest/plan",
  payload: { facts: { act: 2, floor: 20, deck: "SNAKEBITE\nACCELERANT\nFOOTWORK" } } };
 const host = new ToolHost(buildKnowledgeTools(ctx), ctx);
 const results = [];
 for (const e of receipt.entries) {
  const r = receipt.revisions.find(r => r.id === e.id);
  const rows = reader.all({ type: "strategy", character: "silent", id: e.id });
  assert.equal(rows.length, 1); assert.equal(rows[0].revision, r.runtime_revision);
  assert.equal(classificationDigest(rows[0].value), r.final_sha256);
  let offset = 0, text = "", digest, pages = 0;
  while (offset !== null) {
   const response = await host.call("kb_strategies", { query: e.id, detail: "full", document_id: e.id, document_offset: offset });
   assert.notEqual(response.isError, true, response.text);
   assert.ok(Buffer.byteLength(response.text) <= 24000);
   const p = JSON.parse(response.text); assert.equal(p.document_offset, offset);
   digest ??= p.document_sha256; assert.equal(p.document_sha256, digest);
   text += p.json_fragment; offset = p.next_document_offset;
   assert.ok(++pages < 100);
  }
  assert.equal(sha(text), digest);
  const full = JSON.parse(text);
  // The tool adds these presentation fields; source content must remain exact.
  for (const k of ["evidence_summary", "limitation_notice"]) if (!Object.hasOwn(e, k)) delete full[k];
  assert.equal(classificationDigest(full), r.final_sha256);
  assert.equal(gradedBodyEligible(rows[0].value), e.grading.grade !== "B−");
  const compact = compactStrategyDecisionView(e, "strategy");
  if (e.grading.grade !== "B−") assert.ok(compact.view, JSON.stringify(compact));
  results.push({ ...r, typed_readback_exact: true, full_tool_readback_exact: true, full_tool_pages: pages, full_tool_sha256: digest,
   body_eligible: gradedBodyEligible(e), compact_rule_bytes: compact.rule_bytes, compact_view_bytes: compact.view_bytes, compact_reason: compact.reason ?? null });
 }
 assert.equal(bindings(), beforeBindings); assert.equal(sha(readFileSync(backup)), backupSha);
 assert.equal(readFileSync(join(material, "receipt.json"), "utf8"), receiptRaw);
 const proof = { schema: "issue85-regrade79-consumer-proof-v1", receipt_sha256: sha(receiptRaw), source_backup_sha256: backupSha,
  base: receipt.base, isolated_test_version: version, test_only_classification_rebindings: rebound, other_171_entries_unchanged: true,
  original_bindings_retained: store.db.prepare("SELECT count(*) n FROM run_bindings").get().n,
  bindings_unchanged: true, source_inputs_unchanged: true, entries: results, production_write: false,
  original_79_admission_tested: false, note: "Only ordinary isolated submit/validate/publish and bound consumers; original #79 reviewed-successor admission remains #79/ops responsibility." };
 writeFileSync(join(destination, "proof.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
 console.log(JSON.stringify({ entries: results.map(r => ({ id: r.id, grade: r.grade, full_pages: r.full_tool_pages, compact_bytes: r.compact_view_bytes })), production_write: false }));
} finally { reader?.close(); closeIndexedReaders(); setKnowledgeCharacter(null); store.close(); }

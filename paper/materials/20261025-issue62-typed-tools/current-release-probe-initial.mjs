// Offline projection/readback of immutable published snapshots; never opens the production DB.
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
const root = resolve(import.meta.dirname, "../../.."), hostRoot = "/home/dw/Projects/agent-sts2";
const moduleAt = name => import(pathToFileURL(join(root, "agent/src", name)).href);
const { KnowledgeStore, importFiles, digest } = await moduleAt("knowledge/runtime/store.ts");
const { KnowledgeReader, closeIndexedReaders } = await moduleAt("knowledge/runtime/reader.ts");
const { buildKnowledgeTools } = await moduleAt("brain/tools/agent-knowledge.ts");
const { ToolHost } = await moduleAt("brain/tools/mcp-server.ts");
const { setKnowledgeCharacter } = await moduleAt("knowledge/files.ts");
const current = "K1-fa912eafff5ba568bd3000f269fcd58438f377bf3a856d28908662b8af910ea0";
const snapshots = join(hostRoot, "data/knowledge-runtime/snapshots"), old = readdirSync(snapshots).filter(n => n.startsWith("K1-b781"));
assert.equal(old.length, 1);
const canonical = v => Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : v && typeof v === "object"
 ? `{${Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canonical(v[k])).join(",")}}` : JSON.stringify(v);
function source(version) {
 const base = join(snapshots, version), manifest = JSON.parse(readFileSync(join(base, "manifest.json"), "utf8")), files = importFiles(base);
 assert.equal(manifest.version, version); assert.deepEqual(Object.keys(files).sort(), Object.keys(manifest.files).sort());
 for (const [path, text] of Object.entries(files)) assert.equal(digest(text), manifest.files[path]);
 return { version, files, hashes: manifest.files };
}
const before = source(old[0]), after = source(current), path = "characters/silent/strategy-entries.json";
const original = JSON.parse(before.files[path]).entries, latest = JSON.parse(after.files[path]).entries, ids = new Set(original.map(e => e.id));
const added = latest.filter(e => !ids.has(e.id)); assert.equal(original.length, 116); assert.equal(latest.length, 124); assert.equal(added.length, 8);
for (const e of original) assert.equal(canonical(e), canonical(latest.find(n => n.id === e.id)));
for (const [p, text] of Object.entries(before.files)) if (p !== path) assert.equal(text, after.files[p]);
assert.equal(added.filter(e => e.evidence_status === "conflict").length, 7);
assert.equal(added.filter(e => e.evidence_status === "unassessed").length, 1);
const runtime = join(root, "data/issue62-typed-audit/current-release"); assert.equal(existsSync(runtime), false);
let store = new KnowledgeStore(runtime);
const publish = (files, id) => {
 store.submit({ schema: "knowledge-candidate-v1", id, base: store.current(), character: "migration", source: "fixture:immutable-published-source", files });
 store.validate(id); return store.publish(id);
};
const first = publish(before.files, "current-release-before");
store.bind("OLD_SOURCE_RUN", "isolated-probe");
const rowsBefore = store.db.prepare("SELECT type,original_id,parent_id,payload FROM business_items ORDER BY type,original_id,parent_id").all();
// Shape only this disposable fixture as v1, then run the real atomic v1->v2 migration.
store.db.exec("DROP TABLE item_search; DROP TABLE item_grams; DROP TABLE item_evidence; DROP TABLE item_links; DROP TABLE item_terms; DROP TABLE experience_details; DROP TABLE strategy_details; DROP TABLE reflex_details; DROP TABLE core_details; DROP TABLE combo_details; DROP TABLE vocab_details; DROP TABLE fact_details; DROP TABLE business_items; UPDATE metadata SET value='1' WHERE key='schema';");
store.close(); store = new KnowledgeStore(runtime);
assert.deepEqual(store.db.prepare("SELECT type,original_id,parent_id,payload FROM business_items ORDER BY type,original_id,parent_id").all(), rowsBefore);
assert.equal(store.current(), first);
const second = publish({ [path]: after.files[path] }, "current-release-after");
const oldBinding = store.bind("OLD_SOURCE_RUN", "isolated-probe"), newBinding = store.bind("NEW_SOURCE_RUN", "isolated-probe");
assert.equal(oldBinding.version, first); assert.equal(newBinding.version, second);
assert.deepEqual(store.files(second), after.files);
const a = new KnowledgeReader(runtime, first), b = new KnowledgeReader(runtime, second), queried = b.all({ type: "strategy", character: "silent", ascension: 10 });
assert.equal(a.all({ type: "strategy", character: "silent", ascension: 10 }).length, 116); assert.equal(queried.length, 124);
assert.equal(b.all({ type: "strategy", character: "ironclad", ascension: 10 }).length, 0);
setKnowledgeCharacter("silent");
const probes = [];
for (const e of added) {
 const item = queried.find(r => r.original_id === e.id); assert.equal(canonical(item.value), canonical(e));
 const makeHost = (snapshot, act) => {
  const ctx = { knowledgeDir: snapshot, logsDir: snapshot, label: "event", ascension: 10, act, payload: { facts: { act, hp: "50/70", floor: 10 } } };
  return new ToolHost(buildKnowledgeTools(ctx), ctx, undefined, true);
 };
 const act = e.trigger.acts[0], host = makeHost(newBinding.snapshot, act), input = { query: e.id };
 const result = await host.call("kb_strategies", input); assert.equal(result.isError, undefined);
 const data = JSON.parse(result.text); assert.equal(data.entries.length, 1);
 for (const [key, value] of Object.entries(e)) assert.equal(canonical(data.entries[0][key]), canonical(value));
 assert.equal(JSON.parse((await makeHost(oldBinding.snapshot, act).call("kb_strategies", input)).text).entries.length, 0);
 const wrongAct = [1, 2, 3].find(n => !e.trigger.acts.includes(n));
 assert.equal(JSON.parse((await makeHost(newBinding.snapshot, wrongAct).call("kb_strategies", input)).text).entries.length, 0);
 const times = [];
 for (let i = 0; i < 50; i++) { const start = performance.now(); const r = await host.call("kb_strategies", input); times.push(performance.now() - start); assert.equal(r.isError, undefined); host.take(); }
 times.sort((x, y) => x - y);
 probes.push({ id: e.id, original_sha256: digest(canonical(e)), source: e.source, confidence: e.confidence, evidence_status: e.evidence_status,
  original_fields_equal: true, old_version_negative: true, wrong_act_negative: true, bytes: Buffer.byteLength(result.text), n: times.length, tool_hot_p95_ms: times[Math.ceil(times.length * .95) - 1] });
}
store.rollback(first, "current-source-fixture-rollback"); assert.equal(store.bind("NEW_SOURCE_RUN", "isolated-probe").version, second);
assert.equal(store.status("current-release-after").status, "published");
const counts = store.db.prepare("SELECT b.type,b.character,count(*) n FROM business_items b JOIN release_entries p ON p.revision=b.revision WHERE p.version=? GROUP BY b.type,b.character ORDER BY b.type,b.character").all(second);
const mapping = store.db.prepare("SELECT r.path,b.type,b.original_id,b.parent_id,b.revision,b.payload FROM business_items b JOIN revisions r ON r.revision=b.revision JOIN release_entries p ON p.revision=b.revision WHERE p.version=? ORDER BY r.path,b.type,b.original_id").all(second)
 .map(r => ({ ...r, payload: undefined, payload_sha256: digest(r.payload) }));
const receipt = readFileSync(join(hostRoot, "paper/materials/20261025-knowledge114312-ops/publication-readback.json"));
const output = { source_before: before.version, source_after: after.version, source_files_before: before.hashes, source_files_after: after.hashes,
 source_receipt_sha256: digest(receipt.toString("utf8")), source_documents: Object.keys(after.files).length, old_116_unchanged: true, other_7_documents_unchanged: true,
 audit_only_versions: { before: first, after: second }, actual_v1_backfill_equal: true, rollback_keeps_new_run_and_candidate: true,
 types: counts, mapping, probes, production_db_opened: false, production_db_modified: false, natural_consumption_not_claimed: true };
writeFileSync(join(import.meta.dirname, "current-release-readback.json"), JSON.stringify(output, null, 2) + "\n", { flag: "wx" });
closeIndexedReaders(); a.close(); b.close(); store.close();
console.log(JSON.stringify({ complete: true, source_version: current, documents: output.source_documents, strategy_entries: latest.length, added: probes.length, max_hot_p95_ms: Math.max(...probes.map(p => p.tool_hot_p95_ms)) }));

// Offline projection/readback of immutable published snapshots; never opens the production DB.
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
const root = "/home/dw/Projects/agent-sts2/.worktrees/integrator62-combination-20261025", hostRoot = "/home/dw/Projects/agent-sts2";
const moduleAt = name => import(pathToFileURL(join(root, "agent/src", name)).href);
const { KnowledgeStore, importFiles, digest } = await moduleAt("knowledge/runtime/store.ts");
const { KnowledgeReader, closeIndexedReaders } = await moduleAt("knowledge/runtime/reader.ts");
const { buildKnowledgeTools } = await moduleAt("brain/tools/agent-knowledge.ts");
const { ToolHost } = await moduleAt("brain/tools/mcp-server.ts");
const { setKnowledgeCharacter } = await moduleAt("knowledge/files.ts");
const current = "K1-82b9d1291069c6034fc79147879991a5b51837ca9d173bdcd837baac7c5bb569";
const snapshots = join(hostRoot, "data/knowledge-runtime/snapshots"), old = readdirSync(snapshots).filter(n => n === "K1-fa912eafff5ba568bd3000f269fcd58438f377bf3a856d28908662b8af910ea0");
assert.equal(old.length, 1);
const canonical = v => Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : v && typeof v === "object"
 ? `{${Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canonical(v[k])).join(",")}}` : JSON.stringify(v);
function source(version) {
 const base = join(snapshots, version), manifest = JSON.parse(readFileSync(join(base, "manifest.json"), "utf8")), files = importFiles(base);
 assert.equal(manifest.version, version); assert.deepEqual(Object.keys(files).sort(), Object.keys(manifest.files).sort());
 for (const [path, text] of Object.entries(files)) assert.equal(digest(text), manifest.files[path]);
 return { version, files, hashes: manifest.files };
}
const before = source(old[0]), after = source(current), path = "characters/silent/strategy-entries.json", rkpath = "characters/silent/reflex.json";
const original = JSON.parse(before.files[path]).entries, latest = JSON.parse(after.files[path]).entries;
const oldRk = JSON.parse(before.files[rkpath]).entries, newRk = JSON.parse(after.files[rkpath]).entries;
assert.equal(original.length,124);assert.equal(latest.length,128);assert.equal(oldRk.length,165);assert.equal(newRk.length,169);
const added = latest.filter(e=>!original.some(o=>o.id===e.id)), rkAdded = newRk.filter(e=>!oldRk.some(o=>o.id===e.id));
const updated = latest.filter(e=>original.some(o=>o.id===e.id&&canonical(o)!==canonical(e)));
assert.equal(added.length,4);assert.equal(rkAdded.length,4);assert.equal(updated.length,1);
for(const o of original){const n=latest.find(e=>e.id===o.id);if(n.id!==updated[0].id)assert.deepEqual(n,o);else{assert(n.strategy.startsWith(o.strategy+"\n"));for(const [k,v]of Object.entries(o))if(!["strategy","evidence","version"].includes(k))assert.deepEqual(n[k],v);}}
for(const o of oldRk)assert.deepEqual(newRk.find(e=>e.id===o.id),o);
for(const[p,t]of Object.entries(before.files))if(![path,rkpath].includes(p))assert.equal(t,after.files[p]);
const runtime = join(import.meta.dirname, "current-release-isolated-v2-role-contract"); assert.equal(existsSync(runtime), false);
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
const second = publish({ [path]: after.files[path], [rkpath]: after.files[rkpath] }, "current-release-after");
const oldBinding = store.bind("OLD_SOURCE_RUN", "isolated-probe"), newBinding = store.bind("NEW_SOURCE_RUN", "isolated-probe");
assert.equal(oldBinding.version, first); assert.equal(newBinding.version, second);
assert.deepEqual(store.files(second), after.files);
const a = new KnowledgeReader(runtime, first), b = new KnowledgeReader(runtime, second), queried = b.all({ type: "strategy", character: "silent", ascension: 10 });
assert.equal(a.all({ type: "strategy", character: "silent", ascension: 10 }).length, 124); assert.equal(queried.length, 128);
assert.equal(b.all({ type: "strategy", character: "ironclad", ascension: 10 }).length, 0);
setKnowledgeCharacter("silent");
const probes = [];
const makeHost=(snapshot,ctxPatch={})=>{const ctx={knowledgeDir:snapshot,logsDir:snapshot,label:"fight-plan",ascension:10,act:1,payload:{facts:{act:1,hp:"50/70",floor:16,act_boss:"SOUL_FYSH_BOSS"}},...ctxPatch};return new ToolHost(buildKnowledgeTools(ctx),ctx,undefined,true);};
for(const [tool,rows]of [["kb_strategies",[...added,...updated]],["kb_reflex",rkAdded]])for(const e of rows){
 const patch=tool==="kb_strategies"&&e.trigger.question_types.includes("rest")?{label:"rest/plan"}:{};
 const host=makeHost(newBinding.snapshot,patch),input={query:e.id},result=await host.call(tool,input);assert.equal(result.isError,undefined,result.text);
 const data=JSON.parse(result.text),hit=data.entries.find(n=>n.id===e.id);assert(hit,e.id);for(const[k,v]of Object.entries(e))assert.deepEqual(hit[k],v,e.id+":"+k);
 const oldData=JSON.parse((await makeHost(oldBinding.snapshot,patch).call(tool,input)).text),oldHit=oldData.entries.find(n=>n.id===e.id),oldEntry=original.find(n=>n.id===e.id);
 if(oldEntry)for(const[k,v]of Object.entries(oldEntry))assert.deepEqual(oldHit[k],v);else assert.equal(oldHit,undefined);
 const negatives=[];
 for(const role of["ironclad","regent"]){setKnowledgeCharacter(role);const r=await makeHost(newBinding.snapshot,patch).call(tool,input);if(tool==="kb_reflex"){assert.equal(r.isError,true);assert.equal(r.text,'unknown tool "kb_reflex"');}else{assert.equal(r.isError,undefined,r.text);assert(!JSON.parse(r.text).entries.some(n=>n.id===e.id));}negatives.push({role,result:tool==="kb_reflex"?"not_registered":"empty"});}setKnowledgeCharacter("silent");
 for(const p of(tool==="kb_strategies"?[{act:4,payload:{facts:{act:4,act_boss:"SOUL_FYSH_BOSS"}}},{label:"reward/card"},...(e.trigger.bosses?[{payload:{facts:{act:1,act_boss:"OTHER_BOSS"}}}]:[])]:[{ascension:9},{label:"reward/card"}])){const r=await makeHost(newBinding.snapshot,{...patch,...p}).call(tool,input);assert.equal(r.isError,undefined,r.text);assert(!JSON.parse(r.text).entries.some(n=>n.id===e.id));negatives.push(p);}
 if(tool==="kb_reflex"&&e.applies_to==="rest"){const r=JSON.parse((await makeHost(newBinding.snapshot,{label:"rest/plan"}).call(tool,input)).text);const h=r.entries.find(n=>n.id===e.id);assert(h);assert(!("predicate"in h));assert.equal(r.representation,"construction_summary");}
 const times=[];for(let i=0;i<50;i++){const start=performance.now();const r=await host.call(tool,input);times.push(performance.now()-start);assert.equal(r.isError,undefined);host.take();}times.sort((a,b)=>a-b);
 probes.push({tool,id:e.id,original_sha256:digest(canonical(e)),original_fields_equal:true,old_version_negative_or_original:true,negatives,bytes:Buffer.byteLength(result.text),n:50,tool_hot_p95_ms:times[47]});
}
store.rollback(first, "current-source-fixture-rollback"); assert.equal(store.bind("NEW_SOURCE_RUN", "isolated-probe").version, second);
assert.equal(store.status("current-release-after").status, "published");
const counts = store.db.prepare("SELECT b.type,b.character,count(*) n FROM business_items b JOIN release_entries p ON p.revision=b.revision WHERE p.version=? GROUP BY b.type,b.character ORDER BY b.type,b.character").all(second);
const mapping = store.db.prepare("SELECT r.path,b.type,b.original_id,b.parent_id,b.revision,b.payload FROM business_items b JOIN revisions r ON r.revision=b.revision JOIN release_entries p ON p.revision=b.revision WHERE p.version=? ORDER BY r.path,b.type,b.original_id").all(second)
 .map(r => ({ ...r, payload: undefined, payload_sha256: digest(r.payload) }));
const receipt = readFileSync(join(hostRoot, "paper/materials/20261025-knowledge121312-ops/publication-readback.json"));
const output = { source_before: before.version, source_after: after.version, source_files_before: before.hashes, source_files_after: after.hashes,
 source_receipt_sha256: digest(receipt.toString("utf8")), source_documents: Object.keys(after.files).length, old_123_strategies_exact: true, updated_strategy_prefix_and_original_fields_preserved: true, old_165_rk_exact: true, other_6_documents_unchanged: true,
 audit_only_versions: { before: first, after: second }, actual_v1_backfill_equal: true, rollback_keeps_new_run_and_candidate: true,
 types: counts, mapping, probes, production_db_opened: false, production_db_modified: false, natural_consumption_not_claimed: true };
writeFileSync("/home/dw/Projects/agent-sts2/paper/materials/20261025-issue62-combination-integrator/current-release-readback.json", JSON.stringify(output, null, 2) + "\n", { flag: "wx" });
closeIndexedReaders(); a.close(); b.close(); store.close();
console.log(JSON.stringify({ complete: true, source_version: current, documents: output.source_documents, strategy_entries: latest.length, added: probes.length, max_hot_p95_ms: Math.max(...probes.map(p => p.tool_hot_p95_ms)) }));

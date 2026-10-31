// Independent actual CLI and ToolHost readback. Only a new disposable runtime is writable.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const R='/home/dw/Projects/agent-sts2',A=join(R,'.artifacts/integrator62-combination-20261025'),M=join(R,'paper/materials/20261025-issue62-combination-integrator');
const W=join(R,'.worktrees/integrator62-combination-20261025'),OA=join(R,'.artifacts/ops-issue62-fact-coverage-20261025');
const approval=JSON.parse(readFileSync(join(R,'paper/materials/20261025-issue62-fact-coverage-ops/owner-approved-source.json'),'utf8'));
const runtime=join(A,'facts-cli-isolated'),base=approval.actual_current;
assert(!existsSync(runtime));
const sha=b=>createHash('sha256').update(b).digest('hex');
const moduleAt=p=>import(join(W,'agent/src',p));
const {KnowledgeStore}=await moduleAt('knowledge/runtime/store.ts');
const {KnowledgeReader,closeIndexedReaders}=await moduleAt('knowledge/runtime/reader.ts');
const {ToolHost}=await moduleAt('brain/tools/mcp-server.ts');
const {buildKnowledgeTools}=await moduleAt('brain/tools/agent-knowledge.ts');
const {setKnowledgeCharacter}=await moduleAt('knowledge/files.ts');
const {matchStrategyArchetype,nearestArchetype}=await moduleAt('knowledge/strategy-archetypes.ts');
const sourceHashes=()=>Object.fromEntries(approval.sources.map(s=>{for(const p of[s.source_path,s.frozen_path]){const b=readFileSync(join(R,p));assert.equal(b.length,s.bytes);assert.equal(sha(b),s.sha256,p);}return[s.path,s.sha256];}));
const hashes=sourceHashes();assert.equal(sha(readFileSync(join(R,approval.backup.path))),approval.backup.sha256);
const cli=[];
function command(name,flags){const args=['--import','tsx',join(W,'agent/tools/knowledge-runtime.ts'),name,'--runtime',runtime,...Object.entries(flags).flatMap(([k,v])=>['--'+k,String(v)])];
 const p=spawnSync(process.execPath,args,{cwd:join(W,'agent'),encoding:'utf8'});writeFileSync(join(A,'facts-cli-'+name+'.log'),p.stdout+p.stderr,{flag:'wx'});assert.equal(p.status,0,p.stdout+p.stderr);const result=JSON.parse(p.stdout.trim());cli.push({command:name,rc:p.status,result});return result;}
assert.equal(command('restore',{backup:join(R,approval.backup.path)}).current,base);
let store=new KnowledgeStore(runtime,{readOnly:true});
const before=store.files(base),bindings=JSON.parse(JSON.stringify(store.db.prepare('SELECT * FROM run_bindings').all()));
assert.deepEqual(bindings,JSON.parse(readFileSync(join(OA,'original-bindings.json'),'utf8')));store.close();
const extended=command('extend',{base,id:'integrator62-approved-facts-20261025',knowledge:join(OA,'frozen-published'),source:'original-ops:6393702431:lead6393659006'});
assert.deepEqual(extended.added.slice().sort(),approval.sources.map(s=>s.path).sort());
assert.equal(extended.version,'K1-f95afea465a9104a5ce3362d0893a629635dd015ee2aef7582aaf5c6cf9d43a5');
store=new KnowledgeStore(runtime,{readOnly:true});const after=store.files(extended.version);
assert.equal(Object.keys(before).length,8);assert.equal(Object.keys(after).length,11);
for(const[p,b]of Object.entries(before))assert.equal(after[p],b,p);
assert.deepEqual(JSON.parse(JSON.stringify(store.db.prepare('SELECT * FROM run_bindings').all())),bindings);
assert.equal(JSON.parse(after['characters/silent/strategy-entries.json']).entries.length,128);
assert.equal(JSON.parse(after['characters/silent/reflex.json']).entries.length,169);store.close();
const docs=approval.sources.filter(s=>s.path.endsWith('open-book.json')).map(s=>({path:s.path,...JSON.parse(readFileSync(join(R,s.frozen_path),'utf8'))}));
const roleRows=role=>docs.filter(d=>d.path.startsWith('common/')||d.path.startsWith('characters/'+role+'/')).flatMap(d=>d.entries);
const readers=[new KnowledgeReader(runtime,base),new KnowledgeReader(runtime,extended.version)];const counts={};
const host=(version,role='silent',ascension=10)=>{setKnowledgeCharacter(role);const ctx={knowledgeDir:join(runtime,'snapshots',version),logsDir:A,label:'reward/card',ascension,act:1,payload:{facts:{act:1}}};return new ToolHost(buildKnowledgeTools(ctx),ctx,undefined,true);};
const call=async(h,input)=>{const r=await h.call('kb_open_book',input);assert.equal(r.isError,undefined,r.text);assert(Buffer.byteLength(r.text)<=24000);return JSON.parse(r.text);};
let toolCalls=0,allOriginalFields=0;
for(const role of['silent','ironclad','regent']){
 const expected=roleRows(role),rows=readers[1].all({type:'fact',character:role});counts[role]=rows.length;assert.equal(rows.length,expected.length);
 assert.equal(readers[0].all({type:'fact',character:role}).length,0);
 for(const row of rows)assert.deepEqual(row.value,expected.find(e=>e.id===row.original_id&&e.kind===row.value.kind));
 const h=host(extended.version,role),collected=[];let offset=0;
 while(true){const d=await call(h,{query:'*',limit:12,offset});toolCalls++;assert.equal(d.oversized_skipped,0);assert.equal(d.knowledge_version,extended.version);collected.push(...d.entries);if(d.next_offset===null)break;assert(d.next_offset>offset);offset=d.next_offset;h.take();}
 assert.equal(collected.length,expected.length);assert.deepEqual(collected.map(e=>e.kind+':'+e.id).sort(),expected.map(e=>e.kind+':'+e.id).sort());
 for(const e of collected){assert.deepEqual(e,expected.find(x=>x.id===e.id&&x.kind===e.kind));allOriginalFields++;}
 const empty=await call(host(base,role),{query:'*'});toolCalls++;assert.equal(empty.entries.length,0);assert.equal(empty.knowledge_version,base);
 const silentOnly=docs.find(d=>d.path.startsWith('characters/')).entries[0];
 const scoped=await call(h,{query:'*',entity:silentOnly.id});toolCalls++;assert.equal(scoped.entries.some(e=>e.id===silentOnly.id),role==='silent');
}
setKnowledgeCharacter('silent');const h=host(extended.version),positive=[];
for(const kind of['cards','relics','monsters','events']){
 const e=docs[0].entries.find(e=>e.kind===kind);
 for(const entity of[e.id,e.name,...e.aliases]){const d=await call(h,{query:'*',entity,category:kind});toolCalls++;assert(d.entries.some(x=>x.id===e.id));assert(d.sources.some(s=>s.path==='common/open-book.json'&&s.sha256===hashes['common/open-book.json']));assert(d.sources.some(s=>s.sources&&e.provenance.every(p=>s.sources[p])));positive.push({kind,id:e.id,entity,returned:d.entries.length});}
 const wrong=await call(h,{query:'*',entity:e.id,category:kind==='cards'?'relics':'cards'});toolCalls++;assert(!wrong.entries.some(x=>x.id===e.id));
}
assert.equal((await call(h,{query:'NONEXISTENT_ENTITY_INTEGRATOR62'})).entries.length,0);toolCalls++;
const invalid=[];for(const input of[{query:''},{query:'*',entity:''},{query:'*',category:'invalid'},{query:'*',limit:13},{query:'*',offset:-1},{query:'*',path:'/tmp'}]){const d=await h.call('kb_open_book',input);toolCalls++;assert.equal(d.isError,true);invalid.push(input);}
const geometry=JSON.parse(after['external/sts2fun/builds-v1/archetypes.json']);
const deck=Object.keys(geometry.model.vocabulary).sort();const ctx=v=>({knowledgeDir:join(runtime,'snapshots',v),ascension:10,payload:{deck}});
assert.equal(matchStrategyArchetype(ctx(base)).status,'unavailable');const geo=matchStrategyArchetype(ctx(extended.version));assert.notEqual(geo.status,'unavailable');assert.deepEqual(geo.match,nearestArchetype(deck,geometry.model));assert.equal(geo.sha256,hashes['external/sts2fun/builds-v1/archetypes.json']);
assert.equal(matchStrategyArchetype({...ctx(extended.version),ascension:9}).status,'out_of_scope');setKnowledgeCharacter('ironclad');assert.equal(matchStrategyArchetype(ctx(extended.version)).status,'out_of_scope');
assert.throws(()=>new KnowledgeReader(runtime,'K1-'+'0'.repeat(64)),/unavailable/);
closeIndexedReaders();for(const r of readers)r.close();
const bound=command('bind',{run:'INTEGRATOR62_FACT_PROBE',code:'0168b672a69d7cbedc04ad81f1cdc4621a2591a9'});assert.equal(bound.version,extended.version);
command('rollback',{version:base,request:'integrator62-isolated-facts-rollback'});
store=new KnowledgeStore(runtime,{readOnly:true});assert.equal(store.current(),base);const postBindings=JSON.parse(JSON.stringify(store.db.prepare('SELECT * FROM run_bindings').all()));
for(const b of bindings)assert.deepEqual(postBindings.find(x=>x.run_id===b.run_id),b);assert.equal(postBindings.find(x=>x.run_id==='INTEGRATOR62_FACT_PROBE').version,extended.version);assert.equal(store.status('integrator62-approved-facts-20261025').status,'published');store.close();
assert.deepEqual(sourceHashes(),hashes);assert.equal(sha(readFileSync(join(R,approval.backup.path))),approval.backup.sha256);
const out={at:new Date().toISOString(),authority:6393659006,owner_approval:6393702431,source_sha256:hashes,backup_sha256:approval.backup.sha256,base,extended:extended.version,cli,original_documents_exact:8,extended_documents:11,original_binding_rows_exact:bindings.length,latest_strategies:128,latest_reflex:169,counts,all_original_fact_fields_compared:allOriginalFields,real_ToolHost_calls:toolCalls,positive,invalid,old_version_fact_zero_no_fallback:true,unknown_binding_rejected:true,geometry:geo,rollback_keeps_old_and_new_bindings:true,production_operations:0,natural_consumption_claimed:false};
writeFileSync(join(M,'fact-coverage-readback.json'),JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(out));

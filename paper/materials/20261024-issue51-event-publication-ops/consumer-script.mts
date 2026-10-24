import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [contentArg,consumerArg,output,assemblyPath]=process.argv.slice(2),content=resolve(contentArg),consumer=resolve(consumerArg);
const load=(p:string)=>import(pathToFileURL(join(consumer,p)).href),a=JSON.parse(readFileSync(assemblyPath,'utf8'));
const {parseStrategyLibrary,strategyEvidenceSummary}=await load('agent/src/knowledge/strategy-entries.ts');
const {setKnowledgeCharacter}=await load('agent/src/knowledge/files.ts');
const {parseGameState}=await load('agent/src/hand/mod/schema.ts');
const {buildKnowledgeTools}=await load('agent/src/brain/tools/agent-knowledge.ts');
const {ToolHost}=await load('agent/src/brain/tools/mcp-server.ts');
const raw=readFileSync(join(content,'knowledge/characters/silent/strategy-entries.json')),library=parseStrategyLibrary(JSON.parse(raw.toString()));
const rows=[];setKnowledgeCharacter('silent');
for(const item of a.source_rows){
 const bytes=readFileSync(resolve(item.sample.path));assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sample.sha256);
 const state=parseGameState(JSON.parse(bytes.toString()).state).raw;assert.equal(state.event.event_id,item.event_id);
 const ctx={ascension:10,knowledgeDir:join(content,'knowledge'),logsDir:'/unused',label:'event/choose',payload:{facts:{act:Number(state.run.act_id)+1}},state};
 const result=await new ToolHost(buildKnowledgeTools(ctx),ctx).call('kb_strategies',{query:item.runtime_entry.id});assert(!result.isError,result.text);
 const body=JSON.parse(result.text),entry=body.entries.find((e:any)=>e.id===item.runtime_entry.id);assert(entry,item.runtime_entry.id+': '+result.text);const {evidence_summary,limitation_notice,...originalFields}=entry;assert.deepEqual(originalFields,item.runtime_entry);assert.deepEqual(evidence_summary,strategyEvidenceSummary(item.runtime_entry));assert.equal(typeof limitation_notice,'string');assert(limitation_notice.includes('观察性统计、非因果'));assert(Buffer.byteLength(result.text)<=24000);
 const wrong={...ctx,label:'shop/plan'},neg=await new ToolHost(buildKnowledgeTools(wrong),wrong).call('kb_strategies',{query:entry.id});assert(!neg.isError);assert.equal(JSON.parse(neg.text).entries.length,0);
 rows.push({id:entry.id,event_id:item.event_id,source:item.sample,bytes:Buffer.byteLength(result.text),entry,evidence_summary:strategyEvidenceSummary(entry),actual_production_tool:true,event_identity_automatic_gate:false,event_guard_is_learner_body_condition:true,non_event_negative:true,executable_comparison:false});
}
for(const character of ['ironclad','regent']){setKnowledgeCharacter(character);const ctx={ascension:10,knowledgeDir:join(content,'knowledge'),logsDir:'/unused',label:'event/choose',payload:{facts:{act:1}},state:{}};const result=await new ToolHost(buildKnowledgeTools(ctx),ctx).call('kb_strategies',{query:a.ids[0]});assert(!result.isError);assert.equal(JSON.parse(result.text).entries.length,0);}setKnowledgeCharacter('silent');
const before=JSON.parse(readFileSync(resolve(assemblyPath,'../preimages/live/knowledge/characters/silent/strategy-entries.json'),'utf8'));for(const old of before.entries)assert.deepEqual(library.entries.find((e:any)=>e.id===old.id),old);
writeFileSync(output,JSON.stringify({passed:true,content_root:content,consumer_root:consumer,library_sha256:createHash('sha256').update(raw).digest('hex'),library_entries:library.entries.length,fixed_production_id_queries:rows.length,non_event_negative_queries:rows.length,other_role_negative_queries:2,rows,automatic_event_identity_and_ascension_gate:false,body_scope_and_sparse_mechanism_limitations_preserved:true,rk_entries_added:0,rk_contract_waiting:6,custom_experience_consumers:'pending6',new_executable_comparisons:0,natural_brain_queries:0,new_full_models_games_ticks:0},null,2)+'\n');
console.log(JSON.stringify({passed:true,entries:library.entries.length,positive:rows.length,non_event_negative:rows.length,other_role:2}));

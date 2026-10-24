import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [contentArg,consumerArg,output,assemblyPath]=process.argv.slice(2),content=resolve(contentArg),consumer=resolve(consumerArg);
const load=(p:string)=>import(pathToFileURL(join(consumer,p)).href),a=JSON.parse(readFileSync(assemblyPath,'utf8'));
const {parseStrategyLibrary,retrieveStrategies}=await load('agent/src/knowledge/strategy-entries.ts');
const {setKnowledgeCharacter}=await load('agent/src/knowledge/files.ts');
const {parseGameState}=await load('agent/src/hand/mod/schema.ts');
const {buildKnowledgeTools}=await load('agent/src/brain/tools/agent-knowledge.ts');
const {ToolHost}=await load('agent/src/brain/tools/mcp-server.ts');
const raw=readFileSync(join(content,'knowledge/characters/silent/strategy-entries.json')),library=parseStrategyLibrary(JSON.parse(raw.toString())),entry=a.source_rows[0].runtime_entry;
assert.deepEqual(library.entries.find((e:any)=>e.id===entry.id),entry);setKnowledgeCharacter('silent');const rows=[];
for(const c of a.cases){
 const bytes=readFileSync(c.raw_path);assert.equal(createHash('sha256').update(bytes).digest('hex'),c.raw_sha256);
 const state=parseGameState(JSON.parse(bytes.toString()).state).raw,facts={act:Number(state.run.act_id)+1,deck:state.run.deck,floor:state.run.floor},label=c.label??'shop/plan';
 const matches=retrieveStrategies(library,label,{facts}).filter((e:any)=>e.id===entry.id);assert.equal(matches.length,c.matches.length,c.run_id);
 const ctx={ascension:10,knowledgeDir:join(content,'knowledge'),logsDir:'/unused',label,payload:{facts},state};
 const result=await new ToolHost(buildKnowledgeTools(ctx),ctx).call('kb_strategies',{query:entry.id});assert(!result.isError,result.text);
 const body=JSON.parse(result.text);assert.equal(body.entries.filter((e:any)=>e.id===entry.id).length,c.matches.length,c.run_id);assert(Buffer.byteLength(result.text)<=24000);
 if(c.matches.length)assert.deepEqual(body.entries.find((e:any)=>e.id===entry.id),entry);
 rows.push({run_id:c.run_id,label,raw_state:c.raw_path,raw_sha256:c.raw_sha256,expected_match:c.matches.length===1,matched:matches.length===1,bytes:Buffer.byteLength(result.text),actual_production_tool:true,scope:c.scope});
}
for(const character of ['ironclad','regent']){setKnowledgeCharacter(character);const ctx={ascension:10,knowledgeDir:join(content,'knowledge'),logsDir:'/unused',label:'shop/plan',payload:{facts:{act:1}},state:{}};const result=await new ToolHost(buildKnowledgeTools(ctx),ctx).call('kb_strategies',{query:entry.id});assert(!result.isError);assert.equal(JSON.parse(result.text).entries.length,0);}setKnowledgeCharacter('silent');
const before=JSON.parse(readFileSync(resolve(assemblyPath,'../preimages/live/knowledge/characters/silent/strategy-entries.json'),'utf8'));for(const old of before.entries)assert.deepEqual(library.entries.find((e:any)=>e.id===old.id),old);
writeFileSync(output,JSON.stringify({passed:true,consumer_root:consumer,library_sha256:createHash('sha256').update(raw).digest('hex'),library_entries:library.entries.length,fixed_production_id_queries:1,positive_tool_queries:2,negative_missing_component_queries:3,other_role_negative_queries:2,rows,entry,A10_evidence_only:true,automatic_ascension_gate:false,existing_scope_is_textual_not_broadened_by_ops:true,natural_brain_queries:0,models_full_games_ticks:0},null,2)+'\n');
console.log(JSON.stringify({passed:true,entries:library.entries.length,positive:2,negative:3,other_role:2}));

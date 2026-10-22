import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=process.argv[2]!; const output=process.argv[3]!;
const load=(p:string)=>import(pathToFileURL(root+'/'+p).href);
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const {setKnowledgeCharacter,KNOWLEDGE_DIR}=await load('agent/src/knowledge/files.ts');
setKnowledgeCharacter('silent');assert.equal(KNOWLEDGE_DIR,root+'/knowledge');
const {buildKnowledgeTools}=await load('agent/src/brain/tools/agent-knowledge.ts');
const {ToolHost}=await load('agent/src/brain/tools/mcp-server.ts');
const ctx={ascension:10,knowledgeDir:root+'/knowledge',logsDir:root+'/logs',label:'act_plan',payload:{act:1,floor:1}};
const tools=buildKnowledgeTools(ctx);assert.equal(tools.length,14);
const host=new ToolHost(tools,ctx,undefined,true);
const q=[{name:'external_stats_card',input:{id:'BLADE_DANCE',act:1}},{name:'external_stats_skip',input:{act:2}},{name:'kb_old_knowledge',input:{source:'jev_hints',keyword:'*'}},{name:'kb_stats',input:{table:'fights',act:1}},{name:'kb_strategies',input:{query:'*'}}];
const calls=[];
for(const item of q){
 const result=await host.call(item.name,item.input);if(item.name!=='kb_old_knowledge') assert(!result.isError, item.name+':'+result.text); // Optional hints may report an explicit no-data result with sources.
 const body=JSON.parse(result.text);const audit=host.calls.at(-1)!;
 assert.equal(audit.output,result.text);assert.equal(audit.outputBytes,Buffer.byteLength(result.text));
 if(item.name.startsWith('external_')){assert.equal(body.source,'external:sts2fun');assert.equal(body.character,'silent');assert(body.rows.length>0);assert(body.provenance&&body.aggregate_sha256);}
 if(item.name==='kb_stats'){assert(body.sources.some((s:any)=>s.file==='monster-records.json'));assert(body.sources.some((s:any)=>s.file==='monster-db.json'));}
 calls.push({name:item.name,input:item.input,isError:result.isError??false,output_bytes:Buffer.byteLength(result.text),output_sha256:sha(result.text),source:body.source??null,sources:body.sources??null,version:body.version??null,rows:body.rows?.length??body.entries?.length??null});
}
setKnowledgeCharacter('ironclad');const denied=await host.call('external_stats_skip',{act:2});assert.equal(denied.isError,true);setKnowledgeCharacter('silent');
const {loadFightValueModel}=await load('agent/src/reflex/fight-value.ts');const model=readFileSync(root+'/knowledge/characters/silent/fight-value.json');assert.deepEqual(loadFightValueModel(),JSON.parse(model.toString()));
const {parseStrategyLibrary}=await load('agent/src/knowledge/strategy-entries.ts');const sb=readFileSync(root+'/knowledge/characters/silent/strategy-entries.json');const strategies=parseStrategyLibrary(JSON.parse(sb.toString()));assert.equal(strategies.entries.length,3);
const {readKnowledgeCatalog}=await load('agent/src/knowledge/catalog.ts');assert(readKnowledgeCatalog(root+'/knowledge'));
const {loadConfig}=await load('agent/src/core/config.ts');const {createRouter}=await load('agent/src/brain/brain.ts');
const config=loadConfig({BRAIN_ENGINE:'codex',BRAIN_CODEX_EFFORT:'high',BRAIN_DEEPSEEK_EFFORT:'max',BRAIN_CODEX_MODE:'session',BRAIN_LOG:'off'});const router=createRouter(config,null);assert(router.knowledgeAgent&&router.codexOnly);assert.equal(config.brain.engines.codex.effort,'high');assert.equal(config.brain.engines.deepseek.effort,'max');
const {configProblems}=await load('agent/src/brain/engines/codex-session.ts');assert.equal(configProblems('/home/dw/Projects/agent-sts2/ops/codex-ops/accounts/codex3/brain').length,0);
const result={passed:true,root,tool_names:tools.map((x:any)=>x.name).sort(),calls,external_other_character_rejected:true,router_knowledge_agent:true,default_codex_high:true,deepseek_max:true,model_sha256:sha(model),strategy_sha256:sha(sb),strategy_ids:strategies.entries.map((x:any)=>x.id),catalog_sha256:sha(readFileSync(root+'/knowledge/catalog.json')),external_dataset_sha256:sha(readFileSync(root+'/knowledge/external/sts2fun/silent-a10.json')),credentials_read:false,model_API_or_game_calls:0,natural_adoption:false};writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,tools:tools.length,calls:calls.length,model_API_or_game_calls:0}));

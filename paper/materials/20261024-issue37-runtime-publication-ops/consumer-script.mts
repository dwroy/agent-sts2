import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
const [w,k]=process.argv.slice(2),load=async(p:string)=>import(pathToFileURL(w+'/agent/src/'+p).href);
const {setKnowledgeCharacter}=await load('knowledge/files.ts');
const {buildKnowledgeTools}=await load('brain/tools/agent-knowledge.ts');
const {ToolHost}=await load('brain/tools/mcp-server.ts');
const {strategyMatches}=await load('brain/tools/query-guidance.ts');
const {loadV6Knowledge}=await load('v6/knowledge.ts');
const raw=readFileSync(k+'/characters/silent/strategy-entries.json'),library=JSON.parse(raw.toString());
const rk=JSON.parse(readFileSync(k+'/characters/silent/reflex.json','utf8')),v=loadV6Knowledge(k,'silent');
if(v.reflex.status!=='loaded'||v.vocab.status!=='loaded'||v.reflex.value.length!==rk.entries.length)throw Error('latest reflex loader failed');
setKnowledgeCharacter('silent');
const contexts=[{label:'reward/card',ascension:10,act:1,knowledgeDir:k,logsDir:'/unused',payload:{facts:{act:1,deck:[]}}},{label:'map/act-start',ascension:10,act:2,knowledgeDir:k,logsDir:'/unused',payload:{facts:{act:2,deck:[]}}},{label:'rest-site',ascension:10,act:3,knowledgeDir:k,logsDir:'/unused',payload:{facts:{act:3,deck:[]}}},{label:'shop/plan',ascension:10,act:2,knowledgeDir:k,logsDir:'/unused',payload:{facts:{act:2,deck:[]}}}];
const results=[];
for(const ctx of contexts){
 const host=new ToolHost(buildKnowledgeTools(ctx),ctx),expected=strategyMatches(ctx).entries.map((e:any)=>e.id),first=await host.call('kb_strategies',{query:'*'}),initial=JSON.parse(first.text);
 if(first.isError||Buffer.byteLength(first.text)>24000||initial.returned>3)throw Error('default page failed');
 const pages=[],ids=[];let offset=0;
 for(let n=0;n<100;n++){
  const result=await host.call('kb_strategies',{query:'*',limit:6,offset}),d=JSON.parse(result.text);
  if(result.isError||Buffer.byteLength(result.text)>24000||d.oversized_skipped)throw Error('page failed');
  for(const e of d.entries){const original=library.entries.find((x:any)=>x.id===e.id);if(!original||!Object.keys(original).every(key=>isDeepStrictEqual(e[key],original[key])))throw Error('entry field changed');ids.push(e.id);}
  pages.push({bytes:Buffer.byteLength(result.text),ids:d.entries.map((e:any)=>e.id),next_offset:d.next_offset,total_matches:d.total_matches});
  if(d.next_offset===null)break;if(!(d.next_offset>offset))throw Error('cursor not advancing');offset=d.next_offset;
 }
 if(!isDeepStrictEqual(ids,expected)||new Set(ids).size!==ids.length)throw Error('incomplete page set');
 results.push({label:ctx.label,act:ctx.act,default_bytes:Buffer.byteLength(first.text),default_ids:initial.entries.map((e:any)=>e.id),total:ids.length,pages,whole_entries_exact:true});
}
setKnowledgeCharacter('ironclad');if(strategyMatches(contexts[0]).entries.length)throw Error('other character scope changed');
console.log(JSON.stringify({schema:'issue37-current-library-consumers-v1',library_sha256:createHash('sha256').update(raw).digest('hex'),library_entries:library.entries.length,reflex_entries:rk.entries.length,model_bound_entries:library.entries.filter((e:any)=>e.trigger.archetype).length,results,ironclad_strategy_empty:true,model_or_game_calls:0,passed:true},null,2));

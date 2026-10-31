/** Offline ToolDef/SQL audit. All writes require a fresh isolated directory, never a production runtime. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { KnowledgeStore, importFiles, digest, type Candidate } from "../src/knowledge/runtime/store.js";
import { classificationDigest } from "../src/knowledge/runtime/classification.js";
import { closeIndexedReaders, KnowledgeReader } from "../src/knowledge/runtime/reader.js";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { ToolHost } from "../src/brain/tools/mcp-server.js";
import type { ToolContext } from "../src/brain/tools/types.js";

const flags: Record<string, string> = {};
for (let i=2;i<process.argv.length;i+=2) flags[process.argv[i]!.replace(/^--/, "")] = process.argv[i+1]!;
if (!flags["runtime"] || !flags["output"]) throw Error("explicit --runtime and --output required");
const root=resolve(flags["runtime"]), output=resolve(flags["output"]);
if (existsSync(root)) throw Error("audit root must be new and isolated");
mkdirSync(output,{recursive:true});
const save=(name:string,value:unknown)=>writeFileSync(join(output,name),JSON.stringify(value,null,2)+"\n",{flag:"wx"});
const percentile=(samples:number[])=>{const a=[...samples].sort((a,b)=>a-b);return {n:a.length,p50_ms:a[Math.ceil(a.length*.5)-1],p95_ms:a[Math.ceil(a.length*.95)-1],max_ms:a.at(-1)};};
const publish=(s:KnowledgeStore,files:Record<string,string>,id:string)=>{const c:Candidate={schema:"knowledge-candidate-v1",id,base:s.current(),character:"migration",source:"fixed offline fixture",files};s.submit(c);s.validate(id);return s.publish(id);};
const path="characters/silent/experience.json", meta="characters/silent/classification.json";
const sources=["classification","classification-schema","reader","projection","store","validation","schema"].map(n=>`src/knowledge/runtime/${n}.ts`)
 .concat(["typed-knowledge","classification-feedback","query-guidance"].map(n=>`src/brain/tools/${n}.ts`),["tools/knowledge-runtime.ts","tools/knowledge-classification-audit.ts"]);
const sourceHashes=Object.fromEntries(sources.map(p=>[p,digest(readFileSync(resolve(import.meta.dirname,"..",p),"utf8"))]));
save("source-manifest.json",sourceHashes);
setKnowledgeCharacter("silent");
async function measure(s:KnowledgeStore,version:string,ctx:ToolContext,name:string,input:Record<string,unknown>,query:Parameters<KnowledgeReader["plan"]>[0],n=100){
 closeIndexedReaders();const r=new KnowledgeReader(s.root,version);
 try{
  const host=new ToolHost(buildKnowledgeTools(ctx),ctx,undefined,true);
  let start=performance.now();const cold=await host.call(name,input),coldMs=performance.now()-start;host.take();
  if(cold.isError)throw Error(cold.text);
  const hot:number[]=[],db:number[]=[];
  for(let i=0;i<n;i++){
   start=performance.now();r.query(query);db.push(performance.now()-start);
   start=performance.now();const result=await host.call(name,input);hot.push(performance.now()-start);host.take();if(result.isError)throw Error(result.text);
  }
  const parsed=JSON.parse(cold.text);
  return {name,input,version,cold_tool_ms:coldMs,cold_basis:"new readonly SQLite reader and ToolHost; process/module/OS file cache uncontrolled",hot_tool:percentile(hot),hot_sql_page:percentile(db),output_bytes:Buffer.byteLength(cold.text),returned:parsed.returned,total_matches:parsed.total_matches,coverage:parsed.classification_coverage,empty_reasons:parsed.empty_reasons,query_plan:r.plan(query)};
 }finally{r.close();closeIndexedReaders();}
}
const real=new KnowledgeStore(join(root,"real"));
try{
 const files=importFiles(resolve(flags["knowledge"]??"../knowledge")),v=publish(real,files,"real-fixed");
 const differences=Object.entries(files).filter(([p,t])=>real.files(v)[p]!==t).map(([p])=>p);if(differences.length)throw Error("source bytes changed");
 const snapshot=String(real.bind("FIXED_REAL","audit").snapshot),ctx:ToolContext={ascension:10,act:1,label:"map/act-start",payload:{facts:{act:1,hp:"50/70",floor:4,deck:[]}},knowledgeDir:snapshot,logsDir:snapshot};
 const results=[];
 for(const [name,input,type,text] of [["kb_experience",{relevant:true},"experience",undefined],["kb_experience",{keyword:"启动"},"experience","启动"],["kb_strategies",{query:"*",topic:"startup"},"strategy",undefined],["kb_strategies",{query:"*"},"strategy",undefined],["kb_reflex",{query:"*"},"reflex",undefined],["kb_open_book",{query:"ABUNDANCE"},"fact","ABUNDANCE"],["kb_build_cores",{query:"*"},"core",undefined],["kb_build_combos",{query:"*"},"combo",undefined],["kb_vocab",{query:"*"},"vocab",undefined]] as const)
  results.push(await measure(real,v,ctx,name,input,{type,character:"silent",ascension:10,view:"tool",...(text?{text}:{}),...(input["topic" as keyof typeof input]?{topic:"startup"}:{})}));
 save("real-performance.json",{version:v,basis:"unchanged frozen Git inputs; no fabricated labels",files:Object.fromEntries(Object.entries(files).map(([p,t])=>[p,digest(t)])),differences,results});
}finally{real.close();}
const scaled=new KnowledgeStore(join(root,"scale"));
try{
 const entries=Array.from({length:10000},(_,i)=>({id:`fixture-${String(i).padStart(5,"0")}`,scope:"general:deck",asc:[10,10],lesson:"启动路线，仅规模格式夹具",evidence:["SILENT000001"],n_support:1,n_contradict:0,confidence:"low",status:"active",last_seen:"2026-10-25"}));
 const begin=performance.now(),v=publish(scaled,{[path]:JSON.stringify({version:"fixture",entries})},"scale"),importMs=performance.now()-begin;
 let snapshot=String(scaled.bind("SCALE_UNKNOWN","audit").snapshot);
 const ctx:ToolContext={ascension:10,act:1,label:"reward/card",payload:{},knowledgeDir:snapshot,logsDir:snapshot},results=[];
 results.push(await measure(scaled,v,ctx,"kb_experience",{id:"fixture-09999"},{type:"experience",character:"silent",ascension:10,id:"fixture-09999"}));
 results.push(await measure(scaled,v,ctx,"kb_experience",{relevant:true},{type:"experience",character:"silent",ascension:10},30));
 const metadata=entries.filter((_,i)=>i%100===0).map(e=>({id:`c-${e.id}`,target:{path,type:"experience",id:e.id,sha256:classificationDigest(e)},topics:["startup","build_route"],entities:[`ENTITY_${e.id}`],aliases:[`别名${e.id}`],evidence:["SILENT000001"],rationale:"synthetic fixture only"}));
 const next=publish(scaled,{[meta]:JSON.stringify({schema:"knowledge-classification-v1",character:"silent",entries:metadata})},"classify-100");
 snapshot=String(scaled.bind("SCALE_CLASSIFIED","audit").snapshot);ctx.knowledgeDir=snapshot;
 results.push(await measure(scaled,next,ctx,"kb_experience",{topic:"startup"},{type:"experience",character:"silent",ascension:10,topic:"startup"}));
 results.push(await measure(scaled,next,ctx,"kb_experience",{entity:"别名fixture-09900"},{type:"experience",character:"silent",ascension:10,entity:"别名fixture-09900"}));
 results.push(await measure(scaled,next,ctx,"kb_experience",{relevant:true},{type:"experience",character:"silent",ascension:10},30));
 save("scale-performance.json",{entries:10000,classifications:100,import_ms:importMs,basis:"same #62 10000-row scale; synthetic partial coverage; not gameplay evidence",results});
}finally{scaled.close();setKnowledgeCharacter(null);}
if(sources.some(p=>digest(readFileSync(resolve(import.meta.dirname,"..",p),"utf8"))!==sourceHashes[p]))throw Error("source changed during audit; retain original results");
console.log(JSON.stringify({complete:true,root,output}));

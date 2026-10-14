import { readFileSync, writeFileSync } from "node:fs";
import { deepStrictEqual, ok, equal } from "node:assert";
import { constructionEvaluation } from "/home/dw/Projects/agent-sts2/.worktrees/v5-construction-integration-20261014/agent/src/construction/evaluation.ts";
import { withConstructionEvaluation } from "/home/dw/Projects/agent-sts2/.worktrees/v5-construction-integration-20261014/agent/src/construction/consumer.ts";
import { asRecord } from "/home/dw/Projects/agent-sts2/.worktrees/v5-construction-integration-20261014/agent/src/core/util/json.ts";
const out="/home/dw/Projects/agent-sts2/paper/materials/20261014-v5-construction-integration";
const templates=JSON.parse(readFileSync("/home/dw/Projects/agent-sts2/knowledge/characters/silent/construction-templates.json","utf8")).templates;
const fixtures=JSON.parse(readFileSync(out+"/consumer-fixtures.json","utf8"));
const results=[];
for(const f of fixtures){
 // Inventory remains unknown for historical candidate-key probes; never reconstruct an absent state from the answer.
 const initial={cards:[],relics:[],hp:1,maxHp:1,gold:0,floor:f.floor,cap:null};
 const binding={run:f.run,floor:f.floor,label:f.label};
 const keys=Object.keys(f.record.quantitative.options);
 const evaluation=constructionEvaluation(initial,keys.map(key=>({key,state:null,why:"historical inventory not supplied"})),templates,binding,{...binding,record:f.record});
 for(const key of keys){
   const supplied=f.record.quantitative.options[key].effective_damage_per_turn, actual=asRecord(asRecord(evaluation.options)[key]).fight;
   const got=asRecord(actual).completeDpr;
   if(supplied.n>0) {deepStrictEqual(asRecord(got).n,supplied.n);deepStrictEqual(asRecord(got).mean,supplied.mean);}
   else equal(got,null);
 }
 const decision={kind:"ask",label:f.label,state:{facts:{}},deepseek:{question:"pick"},questions:{pick:{type:"choice",instructions:"fixed historical consumer probe",criteria:{}}}};
 const env={state:{raw:{run_id:f.run},run:{floor:f.floor,raw:{character_id:"SILENT"}}}};
 const shown=withConstructionEvaluation(decision,env,{evaluation},true);
 ok(shown!==decision);equal(JSON.stringify(shown).includes("conditionalSignature"),false);
 results.push({source:f.source,run:f.run,floor:f.floor,label:f.label,keys,metricsExact:true,attached:true,probabilityLeaked:false,payloadBytes:JSON.stringify(shown).length});
}
writeFileSync(out+"/consumer-probe.json",JSON.stringify({results,limitation:"Actual historical quantitative records through current pure consumer; inventory deliberately unknown. No model call, natural adoption, new simulation or historical code replay."},null,2)+"\n");

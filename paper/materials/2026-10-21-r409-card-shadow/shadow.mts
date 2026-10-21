// Read-only production replay: no ModClient, actions, runtime publication, or live logs.
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { V6ProjectionRuntime } from '../../../.artifacts/runtime/agent/src/v6/projection-runtime.js';
import { V6ProjectionEngine } from '../../../.artifacts/runtime/agent/src/sim/v6-projection.js';
import { V6CardResultsEngine } from '../../../.artifacts/runtime/agent/src/sim/v6-card-results.js';
import { SerialDeckRunner } from '../../../.artifacts/runtime/agent/src/sim/build-sim-pool.js';
import { v6ProjectionInputs } from '../../../.artifacts/runtime/agent/src/v6/projection-input.js';
import { cardResultsContext } from '../../../.artifacts/runtime/agent/src/v6/card-results-input.js';
import { buildV6CardPick, cardAnswer } from '../../../.artifacts/runtime/agent/src/v6/card-pick.js';
import { constructionQuestion } from '../../../.artifacts/runtime/agent/src/v6/construction-safety.js';
import { restoreV6CardReward } from '../../../.artifacts/runtime/agent/src/v6/card-reward-scope.js';
import { replayRun } from '../../../.artifacts/runtime/agent/src/memory/journal-replay.js';
import { loggedEnv } from '../../../.artifacts/runtime/agent/tests/logged.js';
import { makeKnowledge } from '../../../.artifacts/runtime/agent/src/knowledge/index.js';
import { setKnowledgeCharacter } from '../../../.artifacts/runtime/agent/src/knowledge/files.js';
import { JevClient } from '../../../.artifacts/runtime/agent/src/reflex/jev/client.js';
const dir=dirname(fileURLToPath(import.meta.url)), root=resolve(dir,'../../..'), out=resolve(dir,'results'); mkdirSync(out,{recursive:true});
const json=(file:string)=>JSON.parse(gunzipSync(readFileSync(resolve(dir,'frozen',file))).toString());
const lines=(name:string)=>gunzipSync(readFileSync(resolve(dir,'frozen',name+'.jsonl.gz'))).toString().trim().split('\n').map(x=>JSON.parse(x));
const qs=json('questions.json.gz'), states=lines('states'), decisions=lines('decisions'), plans=lines('run-plans');
const data=JSON.parse(readFileSync(resolve(root,'.artifacts/runtime/data/game-data.json'),'utf8'));
const knowledge=makeKnowledge(data.collections,'cache',{modVersion:data.mod_version} as any);
Object.assign(process.env,{CHARACTER:'silent',V6_BUILD:'on',V6_CARD_DECIDER:'jev',V6_POTION_DECIDER:'brain',V6_SHOP_DECIDER:'brain',V6_REST_DECIDER:'brain',V6_REFLEX:'off',V6_DIRECTION_REPLAN:'off',V6_COMBAT_ENTRIES:'off',V6_PICK_MS:'5000',V6_JEV_MS:'5000'});setKnowledgeCharacter('silent');
const noNova=process.argv.includes('--no-nova'), limitArg=process.argv.indexOf('--limit'), limit=limitArg<0?Infinity:Number(process.argv[limitArg+1]);
const ledger=resolve(out,'requests.jsonl'); let count=existsSync(ledger)?readFileSync(ledger,'utf8').trim().split('\n').filter(Boolean).length:0;
const client=noNova?null:new JevClient({apiKey:readFileSync('/home/dw/.config/nova-game-agents/api.key','utf8').trim(),baseUrl:'https://llm-proxy.tapsvc.com',model:'typesafe/jev-1.14',timeoutMs:5000,maxRetries:0});
const runner=new SerialDeckRunner(), background:any[]=[], snapshots:any[]=[];
const runtime=new V6ProjectionRuntime(new V6ProjectionEngine(runner),async()=>null,()=>{},v6ProjectionInputs(undefined,()=>new Date().toISOString(),s=>snapshots.push(s)),{engine:new V6CardResultsEngine(runner),context:cardResultsContext,record:()=>{},recordBackground:(_,e)=>background.push(e)});
let done=0;
for(const [index,q] of qs.entries()){
 const target=resolve(out,q.key+'.json.gz'); if(existsSync(target)){
  const saved=JSON.parse(gunzipSync(readFileSync(target)).toString());
  if(saved.nova_selected&&client&&!saved.jev&&saved.prompt){
   if(count>=60)throw new Error('request cap reached');
   appendFileSync(ledger,JSON.stringify({ordinal:++count,key:q.key,ts:new Date().toISOString()})+'\n');
   const started=performance.now();try{const response=await client.ask(saved.prompt.state,saved.prompt.questions,5000);saved.jev={...response,validated:cardAnswer(response.answers,Object.keys(saved.prompt.questions.pick.criteria))};}catch(e:any){saved.jev={error:{name:e.name,kind:e.kind??null,status:e.status??null,message:String(e.message).slice(0,600)}};}saved.jev_wall_ms=performance.now()-started;writeFileSync(target,gzipSync(JSON.stringify(saved)));process.stdout.write(JSON.stringify({resume:q.key,nova:saved.jev.validated?.choice??saved.jev.error})+'\n');
  }continue;
 }if(done>=limit)break;
 const began=performance.now(); const replay=replayRun({runId:q.run,states:states.filter(s=>s.state.run_id===q.run),decisions:decisions.filter(s=>s.run_id===q.run),runPlans:plans.filter(s=>s.run===q.run)},knowledge,{before:q.frame.observed_ts??q.frame.ts});
 const env=loggedEnv({source:q.key,state:q.frame.state,decision:{label:'reward/card',decider:'brain',chosen:null,rationale:''}},{knowledge});
 env.screenMemory.lastMap=replay.lastMap??undefined;env.screenMemory.routePlan=replay.routePlan??undefined;
 restoreV6CardReward(env.screenMemory,[q.combat,q.frame]);
 const setupMs=performance.now()-began, beforeBackground=background.length;
 // Replay the pre-existing reward brain wait. No extra B work is hidden in foreground preparation.
 const waitBudget=Math.min(5000,q.brain.latency_ms??q.decision.latency_ms??0);const bStart=performance.now();
 await runtime.startCardBackground(env,waitBudget);const bMs=performance.now()-bStart;
 const cached=runtime.peekCompletedCore(env);const aStart=performance.now();env.v6CardResults=await runtime.evaluateCard(env);const aMs=performance.now()-aStart;
 const packStart=performance.now(), pick=buildV6CardPick(env), packMs=performance.now()-packStart;
 const coverage=pick?constructionQuestion(env,pick.decision):null;
 const result:any={key:q.key,run:q.run,floor:q.floor,brain_choice:q.brain_choice,nova_selected:q.nova_selected,setup_ms:setupMs,background_ms:bMs,background_allowance_ms:waitBudget,background_events:background.slice(beforeBackground),cache_snapshot:cached,a_ms:aMs,packing_ms:packMs,foreground_ms:aMs+packMs,table:env.v6CardResults,coverage,route:env.screenMemory.routePlan??null,remembered_map:!!env.screenMemory.lastMap,snapshots:[...snapshots],prompt:pick?{state:pick.decision.state,questions:pick.decision.questions}:null};
 if(q.nova_selected&&client&&pick){
  if(count>=60)throw new Error('request cap reached');
  appendFileSync(ledger,JSON.stringify({ordinal:++count,key:q.key,ts:new Date().toISOString()})+'\n');
  const started=performance.now();try{const response=await client.ask(pick.decision.state,pick.decision.questions,5000);result.jev={...response,validated:cardAnswer(response.answers,pick.choices)};}catch(e:any){result.jev={error:{name:e.name,kind:e.kind??null,status:e.status??null,message:String(e.message).slice(0,600)}};} result.jev_wall_ms=performance.now()-started;
 }
 writeFileSync(target,gzipSync(JSON.stringify(result)));
 const summary={i:index+1,total:qs.length,key:q.key,known:coverage?.coverage.known,foreground_ms:Math.round(result.foreground_ms),B_numeric:env.v6CardResults?.long_term.filter(r=>r.samples>=2&&r.metrics.hp_loss).length??0,B_rows:env.v6CardResults?.long_term.length??0,nova:result.jev?.validated?.choice??result.jev?.error??null};
 appendFileSync(resolve(out,'progress.jsonl'),JSON.stringify(summary)+'\n');process.stdout.write(JSON.stringify(summary)+'\n');done++;
}
await runner.close?.();writeFileSync(resolve(out,'run-state.json'),JSON.stringify({completed:done,requests:count,at:new Date().toISOString(),code:'cf4aff4ceebd958ad70b1512cc886c45bd8092aa',protocol:'Replay recorded reward brain wait <=5000ms for B; production foreground A and criteria; no actions.'},null,2));

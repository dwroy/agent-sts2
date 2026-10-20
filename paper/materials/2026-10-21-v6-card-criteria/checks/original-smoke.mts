import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JevClient} from '../../agent/src/reflex/jev/client.js';
import {choiceQ} from '../../agent/src/reflex/jev/questions.js';
import {cardCriteria,V6_CARD_CRITERIA_INSTRUCTIONS} from '../../agent/src/v6/card-criteria.js';
import {boundedV6Jev} from '../../agent/src/v6/prompt-summary.js';
import {makeKnowledge} from '../../agent/src/knowledge/index.js';
import {setKnowledgeCharacter} from '../../agent/src/knowledge/files.js';
import {loggedEnv} from '../../agent/tests/logged.js';
import {v6ProjectionInputs} from '../../agent/src/v6/projection-input.js';
import {cardResultsContext} from '../../agent/src/v6/card-results-input.js';
import {V6CardResultsEngine} from '../../agent/src/sim/v6-card-results.js';
import {SerialDeckRunner} from '../../agent/src/sim/build-sim-pool.js';
import {restoreV6CardReward} from '../../agent/src/v6/card-reward-scope.js';
import {buildV6CardPick} from '../../agent/src/v6/card-pick.js';

const here=new URL('./',import.meta.url), get=(s:string)=>JSON.parse(readFileSync(new URL(s,here),'utf8'));
const save=(s:string,x:unknown)=>writeFileSync(new URL(s,here),JSON.stringify(x,null,2)+'\n');
const sha=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const pack=(x:any)=>['hp_loss','turns','damage_per_turn','death_rate','losing_enemy_hp_fraction'].map(k=>x[k]?[x[k].mean,x[k].se,x[k].n]:null);
const view=(r:any)=>({target:r.target_id,result:pack(r.metrics),vs_skip:pack(r.paired_delta),samples:r.samples,requested:r.requested_samples,trust:r.trust,unknown_reasons:r.unknown_reasons});
const old=get('jev-prompts.json'), tables=get('v6-card-results.json');
const requests:any[]=[];
for(const p of old){
  const start=performance.now(), t=tables.find((x:any)=>x.run_id===p.run_id&&x.floor===p.floor).table, prior=p.request.state;
  const state:any=structuredClone(prior);for(const k of ['card_display','display_catalog','prompt_budget'])delete state[k];
  state.card_criteria_schema='paired-criteria-v1';state.targets=t.targets;
  state.options=Object.fromEntries(Object.entries(prior.options).map(([id,o]:any)=>[id,{card:o.card,upgraded:o.upgraded,known_current_boss:o.known_current_boss,reflex:o.reflex??[],
    immediate:t.immediate.filter((r:any)=>r.option_id===id).map(view),advances:(t.progress[id]??[]).filter((p:any)=>p.advanced>0)}]));
  state.core_metrics=prior.core_metrics.map((c:any)=>({...c,cards:c.cards.map(([count,items]:any)=>({count,any:items.map((v:any)=>typeof v==='string'?{kind:'card',id:v,upgraded:false}:{kind:'card',id:v[0],upgraded:!!v[1]})})),
    outcomes:t.long_term.filter((r:any)=>r.direction_id===c.direction&&r.combo_id===c.id).map(view),outcomes_omitted:undefined}));
  const names=Object.fromEntries(Object.entries(prior.options).map(([id,o]:any)=>[id,id==='skip'?'Take no card':`Take ${o.card}${o.upgraded?'+':''}`]));
  const request=boundedV6Jev(state,{pick:choiceQ(V6_CARD_CRITERIA_INSTRUCTIONS,cardCriteria(names,t))});
  requests.push({key:`${p.run_id}-f${p.floor}`,source:'R407_frozen_table',run:p.run_id,floor:p.floor,request,table:t,format_ms:performance.now()-start});
}
for(const [k,v] of Object.entries({V6_BUILD:'on',V6_CARD_DECIDER:'jev',V6_DIRECTION_REPLAN:'off',V6_COMBAT_ENTRIES:'off',V6_REFLEX:'off',V6_SHOP_DECIDER:'brain',V6_REST_DECIDER:'brain',V6_POTION_DECIDER:'brain'}))process.env[k]=v;
setKnowledgeCharacter('silent');
if(process.argv.includes('--fresh')){
  const data=JSON.parse(readFileSync('/home/dw/Projects/agent-sts2/.worktrees/live/data/game-data.json','utf8'));
  const knowledge=makeKnowledge(data.collections,'cache',{modVersion:data.mod_version});
  const provider=v6ProjectionInputs();
  for(const frame of get('new-states.json')){
    const raw=frame.state, key=`${raw.run_id}-f${raw.run.floor}`, start=performance.now();
    const env=loggedEnv({source:key,decision:{label:'reward/card',decider:'jev',chosen:null,rationale:''},state:raw},{knowledge});
    const combat=get('new-combats.json').find((x:any)=>x.state.run_id===raw.run_id&&x.state.run.floor===raw.run.floor);
    restoreV6CardReward(env.screenMemory,[combat,frame]);
    const input=await provider(env,'pick');if(!input)throw Error('input null '+key);
    const ready=input.factory.create(input.situation);if(ready.status!=='ready')throw Error(JSON.stringify(ready));
    const r=ready.request,context=cardResultsContext(env,input,r),engine=new V6CardResultsEngine(new SerialDeckRunner());
    const factory_ms=performance.now()-start;
    const bstart=performance.now();await engine.precompute(r,context,5000);const background_ms=performance.now()-bstart;
    const astart=performance.now();const table=await engine.evaluate(r,context,5000);env.v6CardResults=table;
    const astop=performance.now(),pick=buildV6CardPick(env);if(!pick)throw Error('pick null '+key);
    requests.push({key,source:'R408_frozen_state',run:raw.run_id,floor:raw.run.floor,request:{state:pick.decision.state,questions:pick.decision.questions},table,
      factory_ms,background_ms,A_ms:astop-astart,format_ms:performance.now()-astop});
    console.log(JSON.stringify({prepared:key,factory_ms,background_ms,A_ms:astop-astart,B_known:table.telemetry.long_term_computed,B_total:table.long_term.length}));
  }
}
const prepared=requests.map(({table,...x})=>({...x,wire_bytes:Buffer.byteLength(JSON.stringify({model:'typesafe/jev-1.14',...x.request})),sha256:sha(x.request)}));
save('prepared.json',prepared);save('tables.json',requests.map(({key,table})=>({key,table})));
for(const x of prepared){if(x.wire_bytes>24000||x.request.state.card_prompt_unavailable)throw Error('invalid bounded request '+JSON.stringify({key:x.key,wire:x.wire_bytes,state:x.request.state}));}
console.log(JSON.stringify({prepared:prepared.length,bytes:prepared.map(x=>[x.key,x.wire_bytes]),max_format_ms:Math.max(...prepared.map(x=>x.format_ms))}));
if(process.argv.includes('--nova')){
  const apiKey=readFileSync('/home/dw/.config/nova-game-agents/api.key','utf8').trim();
  const client=new JevClient({apiKey,baseUrl:'https://llm-proxy.tapsvc.com',model:'typesafe/jev-1.14',timeoutMs:5000,maxRetries:0});
  const answers:any[]=[];
  for(const x of prepared){
    const started=performance.now();let result:any;
    try{result={ok:true,...await client.ask(x.request.state,x.request.questions,5000)};}
    catch(e:any){result={ok:false,name:e.name,kind:e.kind,status:e.status,message:e.message};}
    const row={key:x.key,request_sha256:x.sha256,elapsed_ms:performance.now()-started,...result};answers.push(row);save('answers.json',answers);
    console.log(JSON.stringify({key:x.key,ok:row.ok,elapsed_ms:row.elapsed_ms,answers:row.answers,status:row.status}));
  }
}

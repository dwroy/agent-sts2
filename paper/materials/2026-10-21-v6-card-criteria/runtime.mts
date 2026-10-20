import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {makeKnowledge} from '../../../agent/src/knowledge/index.js';
import {setKnowledgeCharacter} from '../../../agent/src/knowledge/files.js';
import {loggedEnv} from '../../../agent/tests/logged.js';
import {v6ProjectionInputs} from '../../../agent/src/v6/projection-input.js';
import {cardResultsContext} from '../../../agent/src/v6/card-results-input.js';
import {V6ProjectionRuntime} from '../../../agent/src/v6/projection-runtime.js';
import {V6ProjectionEngine} from '../../../agent/src/sim/v6-projection.js';
import {V6CardResultsEngine,cardResultKnown} from '../../../agent/src/sim/v6-card-results.js';
import {SerialDeckRunner} from '../../../agent/src/sim/build-sim-pool.js';
import {restoreV6CardReward} from '../../../agent/src/v6/card-reward-scope.js';
import {buildV6CardPick} from '../../../agent/src/v6/card-pick.js';
const here=new URL('./',import.meta.url), output=new URL('../../../.artifacts/criteria-replay/',import.meta.url);
mkdirSync(output,{recursive:true});
const get=(f:string)=>JSON.parse(gunzipSync(readFileSync(new URL('frozen/'+f+'.gz',here))).toString('utf8'));
for(const [k,v] of Object.entries({V6_BUILD:'on',V6_CARD_DECIDER:'jev',V6_DIRECTION_REPLAN:'off',V6_COMBAT_ENTRIES:'off',V6_REFLEX:'off',V6_SHOP_DECIDER:'brain',V6_REST_DECIDER:'brain',V6_POTION_DECIDER:'brain'}))process.env[k]=v;
setKnowledgeCharacter('silent');
const data=JSON.parse(readFileSync('/home/dw/Projects/agent-sts2/.worktrees/live/data/game-data.json','utf8'));
const knowledge=makeKnowledge(data.collections,'cache',{modVersion:data.mod_version}),runner=new SerialDeckRunner();
const runtime=new V6ProjectionRuntime(new V6ProjectionEngine(runner),async()=>null,()=>{},v6ProjectionInputs(),{
 engine:new V6CardResultsEngine(runner),context:cardResultsContext,record:()=>{}});
const rows=[];
for(const frame of get('new-states.json')){
 const raw=frame.state,key=`${raw.run_id}-f${raw.run.floor}`,env=loggedEnv({source:key,decision:{label:'reward/card',decider:'jev',chosen:null,rationale:''},state:raw},{knowledge});
 const combat=get('new-combats.json').find((x:any)=>x.state.run_id===raw.run_id&&x.state.run.floor===raw.run.floor);
 restoreV6CardReward(env.screenMemory,[combat,frame]);
 const start=performance.now(),table=await runtime.evaluateCard(env),evaluated=performance.now();env.v6CardResults=table;
 const pick=buildV6CardPick(env),stop=performance.now();
 const row={key,runtime_ms:evaluated-start,format_ms:stop-evaluated,total_ms:stop-start,telemetry:table?.telemetry,
  known:['card0','card1','card2','skip'].map(id=>cardResultKnown(table,id)),table,
  request:pick?{state:pick.decision.state,questions:pick.decision.questions}:null};
 rows.push(row);writeFileSync(new URL('runtime-results.json',output),JSON.stringify(rows,null,2)+'\n');
 console.log(JSON.stringify({...row,table:undefined,request:undefined,bytes:row.request?Buffer.byteLength(JSON.stringify({model:'typesafe/jev-1.14',...row.request})):null}));
}

/** Read-only paired retrospective audit; no API, action execution, knowledge writes or pool workers. */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { loggedEnv } from '../../../agent/tests/logged.js';
import { makeKnowledge } from '../../../agent/src/knowledge/index.js';
import { KNOWLEDGE_DIR, knowledgeFile, setKnowledgeCharacter } from '../../../agent/src/knowledge/files.js';
import { loadMonsterDb } from '../../../agent/src/sim/boss-start.js';
import { cardResultsContext } from '../../../agent/src/v6/card-results-input.js';
import { cardCombatRow } from '../../../agent/src/sim/v6-card-results.js';
import { fightSample, slimInput, sampleSeed } from '../../../agent/src/sim/boss-sim.js';
import { boardOf } from '../../../agent/tools/boss-sim/backtest-board.js';
import { parseGameState } from '../../../agent/src/hand/mod/schema.js';
import { rolloutLiveOptions } from '../../../agent/src/reflex/rollout-live.js';
const dir=dirname(fileURLToPath(import.meta.url));
const rows=JSON.parse(gunzipSync(readFileSync(join(dir,'prepared-inputs.json.gz'))).toString());
const data=JSON.parse(gunzipSync(readFileSync(join(dir,'game-data.json.gz'))).toString());
const knowledge=makeKnowledge(data.collections,'cache',{modVersion:data.mod_version});
setKnowledgeCharacter('silent'); rolloutLiveOptions.enabled=false;
const db=loadMonsterDb(), mm=JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR,'move-model.json'),'utf8'));
const n=32,out=join(dir,'sensitivity');mkdirSync(out,{recursive:true});
writeFileSync(join(out,'start.json'),JSON.stringify({started:new Date().toISOString(),pid:process.pid,samples:n})+'\n');
for(const row of rows.filter((r:any)=>r.fight.encounter==='TERROR_EEL')){
  const t=performance.now(),f=row.fight,raw=row.state.run;
  const env=loggedEnv({source:row.id,decision:{label:'audit',decider:'offline',chosen:null,rationale:''},state:row.state},{knowledge});
  const request={character:'silent',ascension:10,act:f.act,modelVersion:'audit-cf3372505',targets:[],directions:[]} as any;
  const context=cardResultsContext(env,{situation:{state:env.state,route:{steps:[],costs:[],signature:'observed-entry'}}} as any,request);
  const target={id:`observed:${row.id}`,boss:f.encounter,act:f.act,floor:f.floor,kind:'elite',probability:null,labels:[]} as any;
  const option={id:'skip',state:{cards:raw.deck.map((c:any)=>({id:c.card_id,upgraded:c.upgraded===true})),relics:raw.relics.map((r:any)=>r.relic_id),hp:f.entry_hp,maxHp:f.max_hp,gold:raw.gold,floor:f.floor,cap:null}};
  const prepared=context.prepareElite!(target,option)!;
  const ready=parseGameState(row.ready_state),hand=Number(row.ready_state.combat.hand.length), energy=Number(row.ready_state.combat.player.energy);
  const observed=boardOf(ready,knowledge,f.encounter,db.monsters,mm,{randomPotions:false});
  const variants:any={
    'draw-count-only':{...prepared.input,options:{...prepared.input.options,drawFirst:hand}},
    'energy-only':{...prepared.input,solver:{...prepared.input.solver,player:{...prepared.input.solver.player,energy}}},
    'policy-scale-1':prepared.input,
    'actual-opening-no-random-potions':observed.input,
  };
  const result:any={id:row.id,observed_hand:hand,observed_energy:energy,variants:{}};
  for(const [name,input] of Object.entries(variants)){
    const begin=performance.now(),slim=slimInput(input as any,1500,name==='policy-scale-1'?1:0.5);
    const unsupported=[...slim.piles.draw,...slim.solver.hand].filter((c:any)=>c.type!=='Potion'&&c.playable&&!c.known).map((c:any)=>c.cardId);
    const samples=unsupported.length?[]:Array.from({length:n},(_,i)=>fightSample(slim,null,sampleSeed(1,i),30));
    result.variants[name]={status:unsupported.length?'unmodelled':'computed',unsupported,metrics:cardCombatRow('skip',target,prepared,samples,samples,null as any,n),samples,elapsed_ms:performance.now()-begin};
  }
  writeFileSync(join(out,`${row.id}.json`),JSON.stringify(result)+'\n');
  process.stdout.write(`${row.id} ${Math.round(performance.now()-t)}ms\n`);
}
writeFileSync(join(out,'end.json'),JSON.stringify({ended:new Date().toISOString(),pid:process.pid})+'\n');

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
const n=Number(process.env.AUDIT_SAMPLES??32), selected=process.env.AUDIT_IDS?.split(',');
const out=join(dir,process.env.AUDIT_OUT??'replay'); mkdirSync(out,{recursive:true});
const sha=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const started=new Date().toISOString();
writeFileSync(join(out,'start.json'),JSON.stringify({started,pid:process.pid,samples:n,seed:1,policy_nodes:1500,damage_scale:0.5,max_turns:30,selected},null,2)+'\n');
for(const row of rows){
  if(selected&&!selected.includes(row.id))continue;
  const t=performance.now(), f=row.fight, raw=row.state.run;
  const env=loggedEnv({source:row.id,decision:{label:'audit',decider:'offline',chosen:null,rationale:''},state:row.state},{knowledge});
  const request={character:'silent',ascension:f.ascension,act:f.act,modelVersion:'audit-cf3372505',targets:[],directions:[]} as any;
  const context=cardResultsContext(env,{situation:{state:env.state,route:{steps:[],costs:[],signature:'observed-entry'}}} as any,request);
  const target={id:`observed:${row.id}`,boss:f.encounter,act:f.act,floor:f.floor,kind:'elite',probability:null,labels:['matched_observed_elite_entry']} as any;
  const option={id:'skip',state:{cards:raw.deck.map((c:any)=>({id:c.card_id,upgraded:c.upgraded===true})),relics:raw.relics.map((r:any)=>r.relic_id),hp:f.entry_hp,maxHp:f.max_hp,gold:raw.gold,floor:f.floor,cap:null}};
  const result:any={id:row.id,fight:f,observed:row.observed,entry_deck:option.state.cards};
  for(const variant of ['synthetic','actual-opening']){
    const begin=performance.now();
    try{
      const prepared=variant==='synthetic'?context.prepareElite!(target,option):row.ready_state?(()=>{
        const built=boardOf(parseGameState(row.ready_state),knowledge,f.encounter,db.monsters,mm);
        return {input:{...built.input,captureResources:true,captureCore:true,meta:{...built.input.meta,kind:'elite' as const}},maxHp:f.max_hp,
          bossHp:built.input.solver.enemies.reduce((a:any,b:any)=>a+b.hp,0),labels:['observed_first_actionable_turn_one',`piles:${built.piles}`]};
      })():null;
      if(!prepared){result[variant]={status:'opening_unavailable'};continue;}
      const unsupported=[...new Set([...prepared.labels.filter((s:string)=>s.startsWith('unmodelled_card:')),...[...prepared.input.piles.draw,...prepared.input.solver.hand].filter((c:any)=>c.type!=='Potion'&&c.playable&&!c.known).map((c:any)=>`unmodelled_card:${c.cardId}`)])];
      const slim=slimInput(prepared.input);
      const opening={solver:slim.solver,options:slim.options,enemies:slim.enemies,fightRelics:slim.fightRelics,piles:slim.piles,randomPotions:slim.randomPotions};
      // Unsupported models stay explicit unknowns, exactly as the published A guard requires.
      const samples=unsupported.length?[]:Array.from({length:n},(_,i)=>fightSample(slim,null,sampleSeed(1,i),30));
      result[variant]={status:unsupported.length?'unmodelled':'computed',unsupported,labels:prepared.labels,opening,opening_sha256:sha(opening),
        metrics:cardCombatRow('skip',target,prepared,samples,samples,null as any,n),samples,elapsed_ms:performance.now()-begin};
    }catch(error){result[variant]={status:'error',error:String(error),stack:(error as Error).stack,elapsed_ms:performance.now()-begin};}
  }
  result.elapsed_ms=performance.now()-t;
  writeFileSync(join(out,`${row.id}.json`),JSON.stringify(result)+'\n');
  appendFileSync(join(out,'progress.jsonl'),JSON.stringify({id:row.id,synthetic:result.synthetic.status,actual:result['actual-opening'].status,ms:Math.round(result.elapsed_ms)})+'\n');
  process.stdout.write(`${row.id} ${result.synthetic.status}/${result['actual-opening'].status} ${Math.round(result.elapsed_ms)}ms\n`);
}
writeFileSync(join(out,'end.json'),JSON.stringify({started,ended:new Date().toISOString(),pid:process.pid})+'\n');

/** Exercise the actual precompiled simulation on independently frozen intent observations. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const out=resolve(process.argv[2]);
const load=(root,file)=>import(pathToFileURL(resolve(out,root,'agent/src',file)).href);
const base=await load('frozen-compiled','reflex/rollout.js');
const fixed=await load('repaired-v2-compiled','reflex/rollout.js');
const {solveTurn}=await load('repaired-v2-compiled','reflex/turn-solver.js');
const {withObservedSilentBossWeak}=await load('repaired-v2-compiled','reflex/rollout-live.js');
const {enemyTable}=await load('frozen-compiled','reflex/rollout-live.js');
const {readMonsterDbJson}=await load('frozen-compiled','knowledge/monster-db.js');
const db=readMonsterDbJson().monsters;
const mm=JSON.parse(readFileSync(resolve(out,'frozen-model/knowledge/common/move-model.json'),'utf8'));
const rows=JSON.parse(readFileSync(resolve(out,'table-audit-merged.json'),'utf8'));
function probe(engine,table,move,strength,vulnerable){
 const input={solver:{hand:[],player:{hp:200,maxHp:200,block:0,energy:3,weak:false,vulnerable,intangible:false,strengthNow:0},enemies:[{index:0,name:'Amalgam',hp:200,maxHp:200,block:0,vulnerable:0,weak:2,artifact:0,intangible:false,attacks:[]}],fightKind:'boss',turn:1},plans:[],enemies:[{index:0,id:'TORCH_HEAD_AMALGAM',move:'WAIT',strength,powers:{}}],
 tables:{TORCH_HEAD_AMALGAM:{...table,moves:{...table.moves,WAIT:{damage:0,hits:1,strength:0,block:0}},next:{...table.next,WAIT:{[move]:1}}}},piles:{draw:[],discard:[],handBase:[]},meta:{act:3,t:1,asc:2,kind:'boss',enc:'QUEEN+TORCH_HEAD_AMALGAM',deck:{n:0,atk:0,skl:0,pow:0,junk:0,dmg:0,blk:0,up:0},relics:1,max_en:3},playerPowers:vulnerable?{VULNERABLE_POWER:99}:{},potions:0,mm:{},model:null,gates:null};
 const line=solveTurn(input.solver).plans.find(p=>p.steps.length===0);assert(line);
 const r=engine.simulateFight(input,line,2,7).records;assert.equal(r.length,2);
 return {incoming:r[1].snap.E[0][7],records:r};
}
const evidence=[];
for(const row of rows.filter(x=>x.boss==='QUEEN'&&x.first_hit_matches===false)){
 const raw=JSON.parse(readFileSync(row.source.frozen_path,'utf8')).state;
 const table=enemyTable(row.id,row.asc,db,mm);const ctx={character:raw.run.character_id,asc:row.asc,relics:raw.run.relics};
 const repair=withObservedSilentBossWeak(table,row.id,ctx);const str=row.powers.STRENGTH_POWER??0,vuln=(row.playerPowers.VULNERABLE_POWER??0)>0;
 const before=probe(base,table,row.move,str,vuln),after=probe(fixed,repair,row.move,str,vuln);
 const actual=row.actual.reduce((s,a)=>s+a.damage*a.hits,0);
 // Negative regression: require the original unpatched compiled source to reproduce the actual intent.
 assert.equal(before.incoming,actual, 'unpatched production-source model must match the frozen observed intent');assert.equal(after.incoming,actual);
 evidence.push({source:row.source,run:row.run,asc:row.asc,turn:row.turn,endpoint:row.label,move:row.move,strength:str,vulnerable:vuln,actual,before:before.incoming,after:after.incoming});
}
assert.equal(evidence.length,9);
const table=enemyTable('TORCH_HEAD_AMALGAM',2,db,mm),ctx={character:'SILENT',asc:2,relics:[{relic_id:'PAPER_KRANE',is_melted:false}]};
let isolation=0;
for(const variant of [{...ctx,character:'IRONCLAD'},{...ctx,character:'REGENT'},{...ctx,asc:0},{...ctx,asc:10},{...ctx,relics:[]},{...ctx,relics:[{relic_id:'PAPER_KRANE',is_melted:true}]},{...ctx,relics:[{relic_id:'PAPER_KRANE'}]}]){
 const unchanged=withObservedSilentBossWeak(table,'TORCH_HEAD_AMALGAM',variant);assert.equal(unchanged,table);
 for(const move of Object.keys(table.moves))assert.deepEqual(probe(base,table,move,0,true),probe(fixed,unchanged,move,0,true));isolation++;
}
const repair=withObservedSilentBossWeak(table,'TORCH_HEAD_AMALGAM',ctx);
assert.deepEqual(probe(base,table,'BEAM_MOVE',5,true),probe(fixed,repair,'BEAM_MOVE',5,true));isolation++;
const result={status:'passed',actual_intent_observations:evidence.length,independent_runs:1,evidence,isolated_context_groups:isolation,source:'ZZMYZ5UBCG72/A2/F48/T2-T7 and the actual 40% Paper Krane text in those raw states',limits:'Controlled two-turn simulation reconstructs observed intent damage only; no natural outcome, general new-Weak rounding or A10 repair claim.'};
writeFileSync(resolve(out,'repair-probe-negative-unexpected-pass.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,observations:evidence.length,independent_runs:1,isolation}));

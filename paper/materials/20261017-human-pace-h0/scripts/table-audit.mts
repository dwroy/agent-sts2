/** Compare frozen enemy move tables with actual displayed intents; no policy or model call. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const out=resolve(process.argv[2]!);
const model=resolve(out,'frozen-model');
const { enemyTable }=await import(pathToFileURL(resolve(model,'agent/src/reflex/rollout-live.ts')).href);
const { readMonsterDbJson }=await import(pathToFileURL(resolve(model,'agent/src/knowledge/monster-db.ts')).href);
const db=readMonsterDbJson().monsters;
const mm=JSON.parse(readFileSync(resolve(model,'knowledge/common/move-model.json'),'utf8'));
const refs=JSON.parse(readFileSync(resolve(out,'raw-frame-manifest.json'),'utf8'));
const rows=[];
for(const ref of refs){
  const state=JSON.parse(readFileSync(ref.frozen_path,'utf8')).state;
  const powers=(holder:any)=>Object.fromEntries((holder?.powers??[]).map((p:any)=>[p.power_id,p.amount]));
  const player=powers(state.combat.player);
  for(const e of state.combat.enemies){
    const table=enemyTable(e.enemy_id,ref.asc,db,mm);const m=table?.moves[e.move_id];
    const p:any=powers(e);
    const hits=(e.intents??[]).filter((i:any)=>typeof i.damage==='number');
    const actual=hits.map((i:any)=>({damage:i.damage,hits:i.hits}));
    const base=m?Math.max(0,Math.floor((m.damage+(m.shown?0:p.STRENGTH_POWER??0))*(p.WEAK_POWER>0?.75:1)*(p.SHRINK_POWER>0?.5:1)*(m.shown?1:player.VULNERABLE_POWER>0?1.5:1))):null;
    rows.push({run:ref.run,boss:ref.boss,asc:ref.asc,floor:ref.floor,attempt:ref.attempt,turn:ref.turn,label:ref.label,source:ref,
      id:e.enemy_id,move:e.move_id,hp:e.current_hp,maxHp:e.max_hp,powers:p,playerPowers:player,
      actual,model:m,calculated_per_hit:base,first_hit_matches:actual.length?actual[0].damage===base:null,
      scope:'Static table only: later-hit growth, facing and conditional modifiers require actual replay; mismatch is a diagnostic, not established mechanism error.'});
  }
}
writeFileSync(resolve(out,'table-audit-merged.json'),JSON.stringify(rows,null,2)+'\n');
const groups:any={};for(const row of rows){const k=row.boss;const g=groups[k]??={frames:0,attackFrames:0,perHitMismatch:0,moves:{}};g.frames++;if(row.actual.length)g.attackFrames++;if(row.first_hit_matches===false)g.perHitMismatch++;g.moves[row.move]=(g.moves[row.move]??0)+1;}
console.log(JSON.stringify(groups));

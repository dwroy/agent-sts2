/** Replay observed end-turn inputs only; never select a policy, call a model, or change gates. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const out=resolve(process.argv[2]!);
const model=resolve(out,'frozen-model');
const load=(p:string)=>import(pathToFileURL(resolve(model,p)).href);
const { makeKnowledge }=await load('agent/src/knowledge/index.ts');
const { parseGameState }=await load('agent/src/hand/mod/schema.ts');
const { boardOf }=await load('agent/tools/boss-sim/backtest-board.ts');
const { solveTurn }=await load('agent/src/reflex/turn-solver.ts');
const { simulateFight }=await load('agent/src/reflex/rollout.ts');
const { readMonsterDbJson }=await load('agent/src/knowledge/monster-db.ts');
const { rolloutLiveOptions }=await load('agent/src/reflex/rollout-live.ts');
rolloutLiveOptions.enabled=false; // Constructor only; no policy is replayed in this end-turn diagnostic.
const data=JSON.parse(readFileSync(resolve(model,'data/game-data.json'),'utf8'));
const knowledge=makeKnowledge(data.collections,'cache');
const db=readMonsterDbJson().monsters;
const mm=JSON.parse(readFileSync(resolve(model,'knowledge/common/move-model.json'),'utf8'));
const windows=JSON.parse(readFileSync(resolve(out,'end-turn-windows.json'),'utf8'));
const rows=[];
for(const w of windows){
  const base={key:w.key,boss:w.boss,run:w.run,asc:w.asc,turn:w.turn,attempt:w.attempt,pre:w.pre,next:w.next,command:w.command};
  try {
    const raw=JSON.parse(readFileSync(w.pre.frozen_path,'utf8')).state;
    const state=parseGameState(raw);
    const b=boardOf(state,knowledge,w.boss,db,mm,{randomPotions:false});
    // Disallow every play while retaining actual held-card penalties and all observed state.
    const noPlays={...b.solver,hand:b.solver.hand.map((c:any)=>({...c,playable:false}))};
    const p=solveTurn(noPlays).plans.find((p:any)=>p.steps.length===0);
    if(!p)throw new Error('no end-turn plan');
    const result=simulateFight(b.input,p,1,7,true,null);
    const r=result.records[0];
    rows.push({...base,status:'replayed',input_character:state.run?.characterId,actual_net_loss:w.net_window_loss,old_leak:w.old_leak,
      predicted_net_loss:r?.loss,predicted_enemy_part:r?.enemyPart,solver_end_turn:p.outcome,record:r,
      net_loss_error:r? r.loss-w.net_window_loss:null,claim:'Same observed end-turn action; net loss includes enemy and held/start effects. No policy or next-move damage equivalence claim.'});
  }catch(e){rows.push({...base,status:'unavailable',error:String(e)});}
}
writeFileSync(resolve(out,'window-replay-merged.json'),JSON.stringify(rows,null,2)+'\n');
const groups:any={};for(const row of rows){const g=groups[row.boss]??={replayed:0,unavailable:0,netMismatch:0,errors:{}};if(row.status==='replayed'){g.replayed++;if(row.net_loss_error!==0)g.netMismatch++;}else{g.unavailable++;g.errors[row.error]=(g.errors[row.error]??0)+1;}}
console.log(JSON.stringify(groups));

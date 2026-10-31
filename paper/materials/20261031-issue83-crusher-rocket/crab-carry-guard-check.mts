/** Isolate one observed tune end-state -> next solver board, without changing physics or policy. */
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { makeKnowledge } from "../../../agent/src/knowledge/index.js";
import { parseGameState } from "../../../agent/src/hand/mod/schema.js";
import { KNOWLEDGE_DIR, knowledgeFile } from "../../../agent/src/knowledge/files.js";
import { readMonsterDbJson } from "../../../agent/src/knowledge/monster-db.js";
import { boardOf } from "../../../agent/tools/boss-sim/backtest-board.js";
import { solveTurn, solveTap, type SolverInput } from "../../../agent/src/reflex/turn-solver.js";
import { simulateFight, rolloutDecision, type MoveModelData } from "../../../agent/src/reflex/rollout.js";
import { slimInput } from "../../../agent/src/sim/boss-sim.js";
import type { MonsterMoves } from "../../../agent/src/reflex/rollout-live.js";
const { values } = parseArgs({ options: { input:{type:"string"}, split:{type:"string"}, catalog:{type:"string"}, out:{type:"string"} } });
if (!values.input || !values.split || !values.catalog || !values.out || process.env.CHARACTER !== "silent" || process.env.V6_COMBAT_ENTRIES !== "off") throw Error("Explicit frozen tune inputs and Silent/off required");
if (["STS2_KNOWLEDGE_SNAPSHOT","STS2_DATA_SNAPSHOT","STS2_DATA_RUNTIME"].some(k=>process.env[k])) throw Error("No production bindings");
const knowledge=makeKnowledge(JSON.parse(readFileSync(values.catalog,"utf8")).collections,"cache");
const db=(readMonsterDbJson() as {monsters:MonsterMoves}).monsters;
const mm=JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR,"move-model.json"),"utf8")) as MoveModelData;
const rows=JSON.parse(readFileSync(values.input,"utf8")), tune=new Set<string>(JSON.parse(readFileSync(values.split,"utf8")).tune);
if (rows.some((r:any)=>!tune.has(r.key)) || new Set(rows.map((r:any)=>r.key)).size!==rows.length) throw Error("Foreign val or duplicate tune key");
const powers=(e:any)=>Object.fromEntries((e.powers??[]).map((p:any)=>[p.power_id,p.amount]));
const observed=(state:any)=>({hp:state.combat.player.current_hp,block:state.combat.player.block,
  powers:powers(state.combat.player),enemies:state.combat.enemies.filter((e:any)=>e.is_alive).map((e:any)=>({id:e.enemy_id,hp:e.current_hp,block:e.block,
    powers:powers(e),move:e.move_id,incoming:e.intents.reduce((s:number,a:any)=>s+(a.damage??0)*(a.hits??1),0)}))});
const row=rows.find((r:any)=>r.key==="9TG1RP5LFAAK:33:1:7456072841");
if (!row) throw Error("Frozen tune witness missing");
const frames=row.frames.filter((f:any)=>f.record.state.turn===7 && f.record.state.combat?.action_readiness?.can_use_combat_actions===true);
const original=frames.at(-1).record.state;
const results=[];
for (const name of ["observed","disabled","A9","Ironclad","wrong-max","player-kill"]) {
 const raw=structuredClone(original);
 if (name==="A9") raw.run.ascension=9;
 if (name==="Ironclad") raw.run.character_id="IRONCLAD";
 if (name==="wrong-max") raw.combat.enemies.find((e:any)=>e.enemy_id==="ROCKET").max_hp=208;
 const board=boardOf(parseGameState(raw),knowledge,"CRUSHER+ROCKET",db,mm,{randomPotions:false});
 if(name==="disabled") delete board.input.observedSilentCrabPoisonRageCarry;
 let plan=solveTurn({...board.solver,maxNodes:1}).plans.find(p=>p.steps.length===0)!;
 if (name==="player-kill") {
  const base=board.solver.hand[0];
  if(!base) throw Error("Need a fixed card model for the synthetic negative control");
  const strike={...base,index:0,key:"test-crab-kill",cardId:"TEST_CRAB_DIRECT_KILL",name:"Test",cost:0,xCost:false,type:"Attack" as const,damage:100,hits:1,block:0,poison:0,weak:0,vulnerable:0,draw:0,special:null,target:"single" as const,validTargets:[1],playable:true,known:true};
  board.solver.hand=[strike];board.solver.player.energy=3;board.input.solver=board.solver;board.input.piles.handBase=[strike];
  plan=solveTurn(board.solver).plans.find(p=>p.steps.some(s=>s.cardId==="TEST_CRAB_DIRECT_KILL"))!;
  if(!plan) throw Error("No synthetic direct kill");
 }
 let next:SolverInput|null=null;
 solveTap.onSolve=input=>{if(input.turn===8)next=structuredClone(input);};
 try {
  const trajectory=simulateFight(slimInput(board.input),plan,2,1,true,null);
  results.push({name,enabled:board.input.observedSilentCrabPoisonRageCarry===true,plan:plan.steps,
    next:next?{player:(next as SolverInput).player,enemies:(next as SolverInput).enemies}:null,first:trajectory.records[0]});
 } finally {solveTap.onSolve=null;}
}
const shortBoard=boardOf(parseGameState(original),knowledge,"CRUSHER+ROCKET",db,mm,{randomPotions:false});
const empty=solveTurn({...shortBoard.solver,maxNodes:1}).plans.find(p=>p.steps.length===0)!;
const short=rolloutDecision({...shortBoard.input,plans:[empty],options:{horizon:5,samples:8,k:1,seed:1,budgetMs:1e9}});
const stable=JSON.parse(JSON.stringify(short,(k,v)=>["elapsedMs","policyMs"].includes(k)?undefined:v));
results.push({name:"short-five",result:stable} as any);
writeFileSync(values.out,JSON.stringify(results,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({cases:results.length}));

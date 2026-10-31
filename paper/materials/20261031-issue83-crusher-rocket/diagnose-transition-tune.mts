/** Isolate one observed tune end-state -> next solver board, without changing physics or policy. */
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { makeKnowledge } from "../../../agent/src/knowledge/index.js";
import { parseGameState } from "../../../agent/src/hand/mod/schema.js";
import { KNOWLEDGE_DIR, knowledgeFile } from "../../../agent/src/knowledge/files.js";
import { readMonsterDbJson } from "../../../agent/src/knowledge/monster-db.js";
import { boardOf } from "../../../agent/tools/boss-sim/backtest-board.js";
import { solveTurn, solveTap, type SolverInput } from "../../../agent/src/reflex/turn-solver.js";
import { simulateFight, type MoveModelData } from "../../../agent/src/reflex/rollout.js";
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
const out=[];
for (const row of rows) {
  const turns=new Map<number,any[]>();
  for (const frame of row.frames) if (Number.isInteger(frame.record.state.turn)) turns.set(frame.record.state.turn,[...(turns.get(frame.record.state.turn)??[]),frame]);
  for (const [turn,frames] of turns) {
    const ready=(fs:any[])=>fs.filter(f=>f.record.state.combat?.action_readiness?.can_use_combat_actions===true);
    const last=ready(frames).at(-1), next=ready(turns.get(turn+1)??[])[0];
    const base={key:row.key,attempt:row.attempt,asc:row.asc,turn,
      source:last?{off:last.off,len:last.len,sha256:last.sha256}:null,
      next_source:next?{off:next.off,len:next.len,sha256:next.sha256}:null};
    if (!last || !next) { out.push({...base,error:"missing settled adjacent frame"}); continue; }
    try {
      const board=boardOf(parseGameState(last.record.state),knowledge,"CRUSHER+ROCKET",db,mm,{randomPotions:false});
      const empty=solveTurn({...board.solver,maxNodes:1}).plans.find(p=>p.steps.length===0);
      if (!empty) throw Error("no empty line");
      for (const seed of [1,2,3]) {
        let captured:SolverInput|null=null;
        solveTap.onSolve=(input)=>{if (input.turn===turn+1) captured=structuredClone(input);};
        let result;
        try { result=simulateFight(slimInput(board.input),empty,2,seed,true,null); }
        finally { solveTap.onSolve=null; }
        const following=captured as SolverInput|null;
        const ids=new Map(board.input.enemies.map(e=>[e.index,e.id]));
        out.push({...base,seed,observed_before:observed(last.record.state),observed_next:observed(next.record.state),
          model_current_outcome:empty.outcome,
          simulated_first:result.records[0],
          model_current_moves:board.input.enemies.map(e=>({id:e.id,move:e.move,table:board.input.tables[e.id]})),
          predicted_next:following?{player:following.player,enemies:following.enemies.map(e=>({...e,id:ids.get(e.index)})),
            moves:result.records[1]?.snap.E.map(e=>({id:e[1],move:e[8]}))}:null,
          status:following?"next_board_captured":"terminal_or_no_next_board",
          note:"Only observed first transition compared; next-turn policy/draw differs and is not treated as historical action replay."});
      }
    } catch (error) { solveTap.onSolve=null; out.push({...base,error:String(error)}); }
  }
}
writeFileSync(values.out,JSON.stringify({schema:"issue83-tune-transition-diagnostic-v1",parameter_changes:false,jev_calls:0,seeds:[1,2,3],rows:out},null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({rows:out.length,errors:out.filter((r:any)=>r.error).length}));

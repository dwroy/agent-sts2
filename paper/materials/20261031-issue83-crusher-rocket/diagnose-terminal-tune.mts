/** Tune-only observed end-of-turn replay; no parameter fit, action execution or model API. */
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { makeKnowledge } from "../../../agent/src/knowledge/index.js";
import { parseGameState } from "../../../agent/src/hand/mod/schema.js";
import { KNOWLEDGE_DIR, knowledgeFile } from "../../../agent/src/knowledge/files.js";
import { readMonsterDbJson } from "../../../agent/src/knowledge/monster-db.js";
import { boardOf } from "../../../agent/tools/boss-sim/backtest-board.js";
import { solveTurn } from "../../../agent/src/reflex/turn-solver.js";
import type { MoveModelData } from "../../../agent/src/reflex/rollout.js";
import type { MonsterMoves } from "../../../agent/src/reflex/rollout-live.js";
const { values } = parseArgs({ options: { input: {type:"string"}, split: {type:"string"}, catalog:{type:"string"}, out:{type:"string"} } });
if (!values.input || !values.split || !values.catalog || !values.out || process.env.CHARACTER !== "silent" || process.env.V6_COMBAT_ENTRIES !== "off") throw Error("Explicit frozen tune inputs and Silent/off required");
const knowledge = makeKnowledge(JSON.parse(readFileSync(values.catalog,"utf8")).collections,"cache");
const db = (readMonsterDbJson() as {monsters:MonsterMoves}).monsters;
const mm = JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR,"move-model.json"),"utf8")) as MoveModelData;
const rows = JSON.parse(readFileSync(values.input,"utf8"));
const tune=new Set<string>(JSON.parse(readFileSync(values.split,"utf8")).tune);
if (rows.some((row:any)=>!tune.has(row.key)) || new Set(rows.map((row:any)=>row.key)).size!==rows.length) throw Error("Foreign validation or duplicate fight in tune diagnostic");
const out=[];
for (const row of rows) {
  const turns = new Map<number, any[]>();
  for (const frame of row.frames) {
    const state=frame.record.state, t=state.turn;
    if (Number.isInteger(t)) turns.set(t,[...(turns.get(t)??[]),frame]);
  }
  for (const [turn,frames] of turns) {
    const ready=frames.filter(f=>f.record.state.combat?.action_readiness?.can_use_combat_actions===true);
    const last=ready.at(-1), next=turns.get(turn+1)?.[0];
    if (!last) { out.push({key:row.key,turn,error:"no settled player frame"}); continue; }
    const raw=last.record.state, player=raw.combat.player;
    const facts={key:row.key,attempt:row.attempt,asc:row.asc,turn,off:last.off,len:last.len,sha256:last.sha256,
      player_hp:player.current_hp,block:player.block,actual_net_enemy_window:next ? player.current_hp-next.record.state.combat.player.current_hp : null,
      enemies:raw.combat.enemies.map((e:any)=>({id:e.enemy_id,hp:e.current_hp,block:e.block,move:e.move_id,powers:e.powers,intents:e.intents})),
      note:"Conditioned on observed settled final player state; no reconstruction of prior actions. Net enemy window may contain heals/start-turn effects; terminal unknown retained."};
    try {
      const board=boardOf(parseGameState(raw),knowledge,"CRUSHER+ROCKET",db,mm,{randomPotions:false});
      // Retain held cards (Burn/Wither etc.) but prohibit playing any; maxNodes=1 scores only the empty line.
      const result=solveTurn({...board.solver,maxNodes:1});
      const empty=result.plans.find(p=>p.steps.length===0);
      if (!empty) throw Error("no empty line");
      out.push({...facts,solver_player:board.solver.player,solver_enemies:board.solver.enemies,
        empty_outcome:empty.outcome,steps:empty.steps});
    } catch (error) { out.push({...facts,error:String(error)}); }
  }
}
writeFileSync(values.out,JSON.stringify({schema:"issue83-tune-terminal-replay-v1",jev_calls:0,parameter_changes:false,rows:out},null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({rows:out.length,errors:out.filter((x:any)=>x.error).length}));

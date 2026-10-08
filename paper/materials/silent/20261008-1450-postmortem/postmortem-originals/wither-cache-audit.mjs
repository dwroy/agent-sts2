import fs from 'node:fs';
import { parseGameState } from '/home/dw/Projects/agent-sts2/.worktrees/live/agent/src/hand/mod/schema.ts';
import { createScreenMemory } from '/home/dw/Projects/agent-sts2/.worktrees/live/agent/src/memory/types.ts';
import { observeFightPlays } from '/home/dw/Projects/agent-sts2/.worktrees/live/agent/src/reflex/fight-plays.ts';
const scratch='/home/dw/Projects/agent-sts2/learner/runs/20261008-141302-postmortem';
const rows=fs.readFileSync(`${scratch}/H1T1F8ML9FUE-states.jsonl`,'utf8').trim().split('\n').map(JSON.parse);
const memory=createScreenMemory('COMBAT');
const result=[];
for (const row of rows.filter(x=>x._line>=298805&&x._line<=298833)) {
  const state=parseGameState(row.state);
  observeFightPlays(memory,state);
  if ([298824,298827,298829,298830,298831,298832,298833].includes(row._line)) result.push({line:row._line,turn:state.turn,damage:memory.fightCards?.witherDamage,handWithers:row.state.combat.hand.filter(x=>x.card_id==='WITHER').map(x=>x.dynamic_values.find(v=>v.name==='Damage')?.current_value),enemyPowers:row.state.combat.enemies[0].powers.map(x=>[x.power_id,x.amount])});
}
if (result.find(x=>x.line===298830)?.damage!==3 || result.find(x=>x.line===298832)?.damage!==6) throw new Error('固定帧未复现预期的缓存差额');
fs.writeFileSync(`${scratch}/wither-cache-audit.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));

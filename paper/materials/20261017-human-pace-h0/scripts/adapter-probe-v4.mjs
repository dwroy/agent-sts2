/** Actual board adapter and B3 redeal readback on the frozen Silent A2 opening. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const out=resolve(process.argv[2]);
const load=p=>import(pathToFileURL(resolve(out,'repaired-v2-compiled/agent/src',p)).href);
const {makeKnowledge}=await load('knowledge/index.js');
const {parseGameState}=await load('hand/mod/schema.js');
const {readMonsterDbJson}=await load('knowledge/monster-db.js');
const {rolloutLiveOptions}=await load('reflex/rollout-live.js');
rolloutLiveOptions.enabled=false;
const {redealInput}=await load('sim/boss-sim.js');
const {boardOf}=await import(pathToFileURL(resolve(out,'repaired-v2-compiled/agent/tools/boss-sim/backtest-board.js')).href);
const fights=readFileSync(resolve(out,'../../../experiments/boss-sim/silent/995fbdbd421116fc5aff5c375c35623cb939dcdb1f72a5877b6c03b8e91f3a7b/fights.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const row=fights.find(r=>r.key==='ZZMYZ5UBCG72:48:1:6575079429');assert(row);
const ref=row.source;
const knowledge=makeKnowledge(JSON.parse(readFileSync(resolve(out,'frozen-model/data/game-data.json'),'utf8')).collections,'cache');
const mm=JSON.parse(readFileSync(resolve(out,'frozen-model/knowledge/common/move-model.json'),'utf8'));
const {loadMonsterDb,bossOpening}=await load('sim/boss-start.js');
const {normalizeCalibrationOpening}=await import(pathToFileURL(resolve(out,'repaired-v2-compiled/agent/tools/boss-sim/calibration-board.js')).href);
const monsterDb=loadMonsterDb();
const opening=bossOpening('QUEEN',2,monsterDb,knowledge);assert(opening);
const raw=structuredClone(row.t1.state);
const provenance=normalizeCalibrationOpening(raw,opening,monsterDb,2);
const state=parseGameState(raw);
const b2=boardOf(state,knowledge,'QUEEN+TORCH_HEAD_AMALGAM',readMonsterDbJson().monsters,mm,{randomPotions:false}).input;
const b3=redealInput(b2,{fresh:true,hp:row.entry_hp});
const before=b2.tables.TORCH_HEAD_AMALGAM.moves,after=b3.tables.TORCH_HEAD_AMALGAM.moves;
const expected={TACKLE_2_MOVE:1,BEAM_MOVE:2,TACKLE_3_MOVE:2,TACKLE_4_MOVE:1};
for(const [move,n] of Object.entries(expected)){
 assert.equal(before[move].observedWeak.length,n);assert.deepEqual(after[move].observedWeak,before[move].observedWeak);
}
writeFileSync(resolve(out,'adapter-probe-v4-output.json'),JSON.stringify({status:'passed',source:ref,key:row.key,provenance,b2_start:'Original fixed calibration T1 drawn-hand state and original boss DB normalization',b3_start:'pre/redeal with actual entry HP',b2_tables:before,b3_tables:after,expected,scope:'Production board adapter and original B3 redeal only; diagnostic construction suppresses unrelated rollout facts, no game/model/API or natural-outcome claim. First no-hand room-entry and incorrect helper-import probe failures preserved.'},null,2)+'\n');
console.log(JSON.stringify({status:'passed',b2:true,b3:true,contexts:6,source:ref.t1_sha256}));

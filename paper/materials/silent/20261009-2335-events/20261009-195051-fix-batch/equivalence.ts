import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
process.env.CHARACTER='silent';
const [oldRoot,newRoot,data,out]=process.argv.slice(2);
const rows=readFileSync(data!, 'utf8').trim().split('\n').map(JSON.parse);
const canonical=(v:any):any => Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
async function inputs(root:string) {
 const imp=(rel:string)=>import(pathToFileURL(root+'/'+rel).href);
 const [{makeKnowledge},{parseGameState},{boardOf},{bossOpening,loadMonsterDb},{normalizeCalibrationOpening},{slimInput,redealInput,fightOrders}]=await Promise.all([
 imp('agent/src/knowledge/index.ts'),imp('agent/src/hand/mod/schema.ts'),imp('agent/tools/boss-sim/backtest-board.ts'),imp('agent/src/sim/boss-start.ts'),imp('agent/tools/boss-sim/calibration-board.ts'),imp('agent/src/sim/boss-sim.ts')]);
 const knowledge=makeKnowledge(JSON.parse(readFileSync('/home/dw/Projects/agent-sts2/data/game-data.json','utf8')).collections,'cache');
 const db=loadMonsterDb(), mm=JSON.parse(readFileSync(root+'/knowledge/common/move-model.json','utf8'));
 const out=[];
 for (let i=0;i<rows.length;i++) {
  const r=rows[i],raw=structuredClone(r.t1.state),key=r.encounter.includes('CRUSHER')?'KAISER_CRAB':r.encounter.includes('KIN_PRIEST')?'THE_KIN':r.encounter.includes('QUEEN')?'QUEEN':r.encounter;
  try {
   normalizeCalibrationOpening(raw,bossOpening(key,r.asc,db,knowledge),db,r.asc);
   const board=boardOf(parseGameState(raw),knowledge,r.encounter,db.monsters,mm,{randomPotions:true});
   for(const start of ['t1','pre']) {
    const input=start==='pre'?redealInput(board.input,{fresh:true,hp:r.entry_hp}):board.input;
    const value={input:slimInput(input),orders:fightOrders(input),plan1:board.plans[0],startPolicy:true,samples:200,seed:1+i*101};
    const encoded=JSON.stringify(canonical(value));
    out.push({key:r.key,start,sha256:createHash('sha256').update(encoded).digest('hex'),value:JSON.parse(encoded)});
   }
  }catch(e){out.push({key:r.key,error:String(e)});}
 }
 return out;
}
const old=await inputs(oldRoot!),current=await inputs(newRoot!);
writeFileSync(out!+'.old-inputs.jsonl',old.map(r=>JSON.stringify(r)).join('\n')+'\n');
writeFileSync(out!+'.base-inputs.jsonl',current.map(r=>JSON.stringify(r)).join('\n')+'\n');
const lookup=new Map(old.map(r=>[r.key+':'+r.start,r]));
const differing=current.filter(r=>r.error||lookup.get(r.key+':'+r.start)?.sha256!==r.sha256).map(r=>({key:r.key,start:r.start,error:r.error}));
writeFileSync(out!+'.json',JSON.stringify({checked:current.length,differing,identical:current.length-differing.length},null,1)+'\n');
console.log(JSON.stringify({checked:current.length,differing:differing.length}));

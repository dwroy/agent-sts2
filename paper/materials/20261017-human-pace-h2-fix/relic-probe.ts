import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
/** Classify frozen original held relics with the existing start adapter. No simulations or model calls. */
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
async function main(){
const source=resolve(process.env.H2_REPLAY_SOURCE_ROOT??'.worktrees/human-pace-h2-fix-20261017');
const {fightStartRelics}=await import(pathToFileURL(join(source,'agent/src/sim/boss-start.ts')).href);
const {makeKnowledge}=await import(pathToFileURL(join(source,'agent/src/knowledge/index.ts')).href);
const dir='paper/materials/20261017-human-pace-h2-fix/';
const cache=JSON.parse(readFileSync(dir+'relic-catalog-snapshot.json','utf8'));
const knowledge=makeKnowledge(cache.collections,'cache');
const rows=gunzipSync(readFileSync(dir+'relic-probe-input.jsonl.gz')).toString().trim().split('\n').map(s=>JSON.parse(s));
const output=rows.map(r=>({decision_id:r.decision_id,run_id:r.run_id,floor:r.floor,matched_fingerprint:r.matched_fingerprint,
  held:(r.raw.state?.run?.relics??[]).map((x:any)=>x.relic_id),unmodelled:fightStartRelics(r.raw.state.run,knowledge).unmodelled,
  applied:fightStartRelics(r.raw.state.run,knowledge).applied,source:r.source,
  scope:'existing classifier on original inventories and frozen current metadata; no assumption that unmodelled effects cancel'}));
writeFileSync(dir+'relic-probe.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({frames:output.length,with_unmodelled:output.filter(r=>r.unmodelled.length).length,
  labels:[...new Set(output.flatMap(r=>r.unmodelled))]}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

/** Frozen historical card facts; only the explicitly authorized Jev judge can make a model request. */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root=process.cwd(), dir=join(root,'paper/materials/20261017-human-pace-h2-fix');
const rows=readFileSync(join(dir,'replay-input.jsonl'),'utf8').trim().split('\n').map(s=>JSON.parse(s));
const planRows=gunzipSync(readFileSync(join(root,'paper/materials/20261017-human-pace-h2/natural/inputs-final/run-plans.jsonl.gz'))).toString().trim().split('\n').map(s=>JSON.parse(s));
const plans=new Map(planRows.filter(r=>r.plan).map(r=>[createHash('sha256').update(JSON.stringify(r.plan)).digest('hex'),r]));
const nullHash=createHash('sha256').update('null').digest('hex');
async function main(){
  const sourceRoot=resolve(process.env.H2_REPLAY_SOURCE_ROOT ?? join(root,'.worktrees/human-pace-h2-fix-20261017'));
  const load=(name:string)=>import(pathToFileURL(join(sourceRoot,'agent/src',name+'.ts')).href);
  const {rankShadowCards,shadowPlanCoverage}=await load('sim/human-pace-card-policy');
  const {projectActPlan,shadowCardList}=await load('sim/human-pace-plan-shadow');
  const {askCardShadow}=await load('sim/human-pace-card-shadow');
  const {JevClient}=await load('reflex/jev/client');
  const {loadConfig,requireJevApiKey}=await load('core/config');
  const live=process.argv.includes('--jev');
  const resultsPath=join(dir,live?'replay-jev.jsonl':'replay-mechanical.jsonl');
  if(live && (()=>{try{return readFileSync(resultsPath).length>0;}catch{return false;}})()) throw new Error('Existing Jev results: refuse duplicate requests');
  let jev:InstanceType<typeof JevClient>|null=null;
  if(live){process.loadEnvFile(join(root,'.worktrees/live/agent/.env'));const config=loadConfig(process.env);jev=new JevClient({apiKey:requireJevApiKey(config),model:config.jev.model,baseUrl:config.jev.baseUrl,maxRetries:0,timeoutMs:1000});}
  const output=[];
  for(const row of rows){
    const facts=structuredClone(row.facts), prior=plans.get(facts.prior_plan_sha256), plan=prior?.plan ?? null;
    if(!prior && facts.prior_plan_sha256!==nullHash) throw new Error('Frozen prior plan binding missing');
    if(prior && (prior.run_id!==row.run_id || prior.ts>row.ts)) throw new Error('Future or cross-run plan binding');
    const ranking=rankShadowCards(facts.rows,facts.primary);
    const next={...facts,module_first:ranking.first,module_first_basis:ranking.basis,module_first_confidence:ranking.confidence,
      module_order:ranking.ordered,defer_to_brain:ranking.first===null,plan_status:shadowPlanCoverage(facts.primary,!!plan,false).status,
      initial_direction_needed:!plan||facts.primary==='uncommitted',
      plan_preferences:{take:shadowCardList(plan?.want??[]),avoid:shadowCardList(plan?.avoid??[])},
      rows:facts.rows.map((r:any)=>{const coverage=shadowPlanCoverage(facts.primary,!!plan,r.wake.uncovered_by_plan===false);
        return {...r,wake:{...r.wake,uncovered_by_plan:coverage.uncovered,plan_status:coverage.status,initial_direction_needed:coverage.initial_direction_needed,
          possible_direction_change:coverage.status==='committed'?r.wake.possible_direction_change:null}};})};
    const newJudge=live?await askCardShadow(next as any,jev,row.actual):null;
    const result={run_id:row.run_id,decision_id:row.decision_id,floor:row.floor,actual:row.actual,actual_decider:row.actual_decider,
      original_jev:row.original_jev.jev_choice,original_jev_fallback:row.original_jev.fallback,
      old_module_first:facts.module_first,new_facts:next,new_jev:newJudge,
      prior_plan_source:prior?prior._source:null,projected_plan:plan?projectActPlan(plan):null,sources:row.sources,
      scope:'offline mechanical replay of frozen cached estimates; correlated historical choices, not new outcomes or natural validation'};
    output.push(result);if(live)appendFileSync(resultsPath,JSON.stringify(result)+'\n');
  }
  if(!live)writeFileSync(resultsPath,output.map(x=>JSON.stringify(x)).join('\n')+'\n');
  const brain=output.filter(r=>r.actual_decider==='codex'),success=brain.filter(r=>r.new_jev?.fallback===null);
  const comparable=brain.filter(r=>r.new_facts.module_first!==null);
  const summary={mode:live?'Jev historical replay':'mechanical cached-facts replay',questions:output.length,brain:brain.length,
    next_boss_complete:output.filter(r=>r.new_facts.rows.every((x:any)=>x.next_boss_delta_win!==null)).length,
    ranking_bases:output.reduce((a:any,r)=>{a[r.new_facts.module_first_basis]=(a[r.new_facts.module_first_basis]??0)+1;return a;},{}),
    module_vs_brain:{agree:comparable.filter(r=>r.new_facts.module_first===r.actual).length,n:comparable.length},
    jev_vs_brain:live?{agree:success.filter(r=>r.new_jev!.jev_choice===r.actual).length,n:success.length}:null,
    jev_fallbacks:live?output.filter(r=>r.new_jev?.fallback!==null).length:null,
    any_uncovered_old:output.filter(r=>r.new_facts.rows.some((x:any)=>rowOld(r.decision_id).facts.rows.find((o:any)=>o.key===x.key)?.wake.uncovered_by_plan===true)).length,
    any_uncovered_new:output.filter(r=>r.new_facts.rows.some((x:any)=>x.wake.uncovered_by_plan===true)).length,
    uncommitted_or_missing:output.filter(r=>r.new_facts.initial_direction_needed).length,
    target_group_still_unknown:output.filter(r=>r.new_facts.rows.some((x:any)=>x.target_delta_win===null)).length,
    no_game_calls:true,no_brain_calls:true,no_new_worker_or_simulation:true};
  writeFileSync(join(dir,live?'replay-jev-summary.json':'replay-mechanical-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
}
function rowOld(id:string){return rows.find(x=>x.decision_id===id)!;}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

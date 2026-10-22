import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createBrain } from '../../../.worktrees/integrator-35-20261022/agent/src/brain/brain.ts';
import { loadConfig } from '../../../.worktrees/integrator-35-20261022/agent/src/core/config.ts';
import { runLoop } from '../../../.worktrees/integrator-35-20261022/agent/src/hand/loop.ts';
import { ModClient } from '../../../.worktrees/integrator-35-20261022/agent/src/hand/mod/client.ts';
import { mainMenuPayload, rewardCardPayload, testKnowledge } from '../../../.worktrees/integrator-35-20261022/agent/tests/scenarios.ts';
const R='/home/dw/Projects/agent-sts2';
const A=process.env['CONSTRUCTION_PROBE_OUTPUT'] ?? join(R,'.artifacts/issue35-probe-rerun-'+Date.now());
mkdirSync(A,{recursive:true});
const fixture=JSON.parse(readFileSync(join(R,'.worktrees/integrator-35-20261022/agent/tests/logged-states/oneshot/u6ru-f22-shop.json'),'utf8'));
const envelope=(data: unknown)=>({ok:true,request_id:'fixture-35',data});
const rows=(path:string)=>readFileSync(path,'utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));
const reports=[];
for(const engine of ['codex','deepseek'] as const) {
  const dir=join(A,'probe-'+engine); mkdirSync(dir);
  const cfg=loadConfig({BRAIN_RUN_CONFIG:JSON.stringify({engine,effort:engine==='codex'?'high':'max'}),BRAIN_LOG:'off',RUN_PLAN:'off',FIGHT_PLAN:'off',BUILD_ONESHOT:'on'});
  cfg.log.decisionLog=join(dir,'decisions.jsonl'); cfg.runPlanLog=join(dir,'run-plans.jsonl'); cfg.fightPlanLog=join(dir,'fight-plans.jsonl');
  const brain=createBrain(cfg,null), requests:any[]=[];
  brain.router.decide=async(req:any)=>{ requests.push(req); return {engine,model:'fixed',answer:req.label==='shop/plan'?{plan:['buy_card3','buy_potion2','buy_card4','buy_card0','buy_card2'],reason:'本局固定方向的购物短理由'}:{choice:'skip',reason:'本局不再增加牌'},problems:[],attempts:1,latencyMs:1,usage:{inputTokens:1,outputTokens:1},toolCalls:[]}; };
  const sequence=['open','after_card3','after_potion2','after_card4','after_card0','after_card2','closed'].map(k=>structuredClone(fixture.states[k]));
  sequence.push(mainMenuPayload()); let at=0, sent=0;
  const client=new ModClient({baseUrl:'http://fixture.invalid',fetchImpl:(async(url,options)=>{
    if(String(url).endsWith('/state'))return Response.json(envelope(sequence[at]));
    const intent=JSON.parse(String(options?.body)); sent++; at=Math.min(at+1,sequence.length-1);
    return Response.json(envelope({action:intent.action,status:'completed',stable:true,message:'fixed',state:sequence[at]}));
  }) as typeof fetch});
  const jev={ask:async()=>{throw Error('unexpected Jev request')}} as any;
  const result=await runLoop({config:cfg,mode:'play',client,jev,brain,knowledge:testKnowledge,maxRuns:1,maxDecisions:7,maxMinutes:1,pollIntervalMs:0,restoreRun:false});
  assert.equal(result.acts,7); assert.equal(sent,7); assert.equal(requests.length,1);
  const snapshots=rows(join(dir,'construction-log.jsonl')); const before=snapshots.at(-1);
  assert.equal(before.entries.length,4);
  for(const entry of before.entries){assert.equal(entry.action,'商店买');assert.equal(entry.reason,'本局固定方向的购物短理由');assert.equal(entry.source,engine);}
  // Start a new process-equivalent loop with the actual logged shop trajectory and no in-memory journal.
  const reward=rewardCardPayload(); reward.run={...sequence[6].run,floor:23}; reward.run_id=before.run_id;
  const restartClient=new ModClient({baseUrl:'http://fixture.invalid',fetchImpl:(async(url,options)=>{
    if(String(url).endsWith('/state'))return Response.json(envelope(reward));
    const intent=JSON.parse(String(options?.body));return Response.json(envelope({action:intent.action,status:'completed',stable:true,message:'fixed',state:mainMenuPayload()}));
  }) as typeof fetch});
  const restartedBrain=createBrain(cfg,null); const restartedRequests:any[]=[];
  restartedBrain.router.decide=async(req:any)=>{ restartedRequests.push(req); return {engine,model:'fixed',answer:{choice:'skip',reason:'重启后固定跳过'},problems:[],attempts:1,latencyMs:1,usage:{inputTokens:1,outputTokens:1},toolCalls:[]}; };
  const afterResult=await runLoop({config:cfg,mode:'play',client:restartClient,jev,brain:restartedBrain,knowledge:testKnowledge,maxDecisions:1,maxMinutes:1,pollIntervalMs:0,restoreRun:true});
  assert.equal(afterResult.acts,1);assert.equal(restartedRequests.length,1);
  const memory=restartedRequests[0].memory.construction_log;
  assert.equal((memory.match(/商店买/g)||[]).length,4);assert(memory.includes('本局固定方向的购物短理由'));
  const after=rows(join(dir,'construction-log.jsonl')).at(-1);assert.deepEqual(after.entries.slice(0,4),before.entries);assert.equal(after.entries.at(-1).action,'跳过');
  reports.push({engine,shop_requests:requests.length,shop_actions:sent,confirmed_buys:before.entries.length,restart_requests:restartedRequests.length,restored_entries:4,final_entries:after.entries.length});
}
writeFileSync(join(A,'production-probe.json'),JSON.stringify({fixture_only:true,real_game_runs:0,reports},null,2)+'\n');
console.log(JSON.stringify(reports));

/** Read-only frozen-state acceptance: candidate W3, production routing and live Nova adapter. */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root='/home/dw/Projects/agent-sts2',here=dirname(fileURLToPath(import.meta.url)),source=resolve(here,'../../..'),live=`${root}/.worktrees/live`;
const revision=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const candidate='303bbb1ac';
// Permit evidence-only commits while requiring the exact candidate source and knowledge.
execFileSync('git',['-C',source,'merge-base','--is-ancestor',candidate,'HEAD']);
// Working candidate revision and diff are archived with the development smoke.
// Match ops/run.sh: worker --import tsx resolves from the agent directory.
process.chdir(join(source,'agent'));
const real=process.argv.includes('--real'),out=resolve(source,'.artifacts',`current-boss-${real?'real':'prepare'}-${Date.now()}`);mkdirSync(out,{recursive:true});
const hash=(b:any)=>createHash('sha256').update(b).digest('hex');
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const save=(p:string,x:any)=>writeFileSync(join(out,`${p}.json`),JSON.stringify(x,(k,v)=>k==='summary'&&v?{audit:'frozen build-core/history metrics; content hashes in report'}:v,2)+'\n');
const protectedPaths=[`${root}/ops/STOP`,`${root}/logs/brain-wait.json`,`${root}/logs/brain-fault.json`];
const protectedState=()=>Object.fromEntries(protectedPaths.map(p=>[p,existsSync(p)?hash(readFileSync(p)):null]));
const sourceDiff=execFileSync('git',['-C',source,'diff','HEAD','--','agent/src'],{encoding:'utf8'});
writeFileSync(join(out,'source.diff'),sourceDiff);
const report:any={source_diff_sha256:hash(sourceDiff),schema:'v6-known-jev-smoke-v1',started_at:new Date().toISOString(),source,revision,live_revision:execFileSync('git',['-C',live,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),real,game_actions:0,protected_before:protectedState(),http:[],cases:[]};
Object.assign(process.env,{CHARACTER:'silent',V6_BUILD:'on',V6_CARD_DECIDER:'jev',V6_POTION_DECIDER:'jev',V6_SHOP_DECIDER:'jev',V6_REST_DECIDER:'jev',V6_COMBAT_ENTRIES:'on',V6_REFLEX:'on',V6_PICK_MS:'5000',V6_JEV_MS:'5000',BOSS_SIM_WORKERS:'1',STS2_WORKSPACE:out});
const load=(p:string)=>import(pathToFileURL(`${source}/agent/src/${p}.ts`).href);
const liveLoad=(p:string)=>import(pathToFileURL(`${live}/agent/src/${p}.ts`).href);
const {makeKnowledge}=await load('knowledge/index'),{setKnowledgeCharacter}=await load('knowledge/files'),{loadConfig}=await load('core/config');
const {parseGameState}=await load('hand/mod/schema'),{buildRunBrief}=await load('memory/run-brief'),{createScreenMemory}=await load('memory/types'),{planDecision}=await load('hand/screens/index');
const {productionV6Projection}=await load('v6/projection-runtime'),{BuildSimPool}=await load('sim/build-sim-pool');
const {buildV6CardPick}=await load('v6/card-pick'),{prepareV6RoomDecision}=await load('hand/screens/v6-room'),{runtimeV6RoomProjection}=await load('hand/screens/v6-room-projection');
const {constructionQuestion,recordConstructionHandover}=await load('v6/construction-safety');
setKnowledgeCharacter('silent');const catalogBytes=readFileSync(`${root}/data/game-data.json`),cached=JSON.parse(catalogBytes.toString());
const knowledge=makeKnowledge(cached.collections,'cache',{modVersion:cached.mod_version,fetchedAt:cached.fetched_at});
report.knowledge_hashes=Object.fromEntries(['build-cores.json','v6-history.json','construction-templates.json','construction-support.json','construction-opportunities.json'].map(f=>[f,hash(readFileSync(`${source}/knowledge/characters/silent/${f}`))]));report.catalog_sha256=hash(catalogBytes);
report.live_adapter_hashes=Object.fromEntries(['reflex/jev/client','reflex/jev/nova'].map(f=>{const a=hash(readFileSync(`${source}/agent/src/${f}.ts`)),b=hash(readFileSync(`${live}/agent/src/${f}.ts`));if(a!==b)throw Error('candidate/live Nova adapter differs');return[f,b];}));
const config=loadConfig({...process.env,DECISION_LOG:`${out}/decisions.jsonl`,RUN_PLAN_LOG:`${out}/run-plans.jsonl`,JEV_PROMPT_LOG:`${out}/jev-prompts.jsonl`});
const manifest=read(join(here,'manifest.json')),plans=read(join(here,'frozen/run-plans.json')),routes=read(join(here,'frozen/routes.json'));
let providerResult:any=null;let currentCase:any=null;const fetchReal=globalThis.fetch;
globalThis.fetch=async(input:any,init:any)=>{const u=new URL(typeof input==='string'?input:input.url??String(input));if(!real||u.origin!=='https://llm-proxy.tapsvc.com'||u.pathname!=='/api/alpha/decisions')throw Error('all non-Nova HTTP denied');const body=JSON.parse(init.body);if(body.model!=='typesafe/jev-1.14')throw Error('wrong model');for(const q of Object.values(body.questions) as any[])if(q.type==='choice'&&(!q.criteria||Array.isArray(q.criteria)))throw Error('choice criteria must be object');const h:any={case:currentCase.id,bytes:Buffer.byteLength(init.body),model:body.model,url:u.origin+u.pathname};report.http.push(h);const t=performance.now();try{const response=await fetchReal(input,init);h.status=response.status;return response;}finally{h.elapsed_ms=performance.now()-t;save('report',report);}};
const {JevClient}=await liveLoad('reflex/jev/client'),{withConstructionJevBudget}=await liveLoad('v6/potion-entries');
const client=real?new JevClient({apiKey:readFileSync('/home/dw/.config/nova-game-agents/api.key','utf8').trim(),baseUrl:'https://llm-proxy.tapsvc.com',model:'jev-1.14.0',timeoutMs:5000,maxRetries:0}):null;
const pool=new BuildSimPool(1),runner={async run(request:any){const at=performance.now();try{const result=await pool.run(request);(currentCase.sim_batches??=[]).push({elapsed_ms:performance.now()-at,diagnostics:result.diagnostics,complete:result.complete.length,timed_out:result.timedOut});return result;}catch(e:any){(currentCase.sim_errors??=[]).push(String(e.stack??e).slice(0,2000));throw e;}}},runtime=productionV6Projection(runner,`${out}/run-plans.jsonl`),roomProvider=runtimeV6RoomProjection(runtime!),provider=async(...args:any[])=>{const result=await (roomProvider as any)(...args);if(result){currentCase.provider_reason=result.reason??null;currentCase.provider_table=!!result.table;providerResult=result;}return result;};
for(const stage of ["request","record"]) { const original=(runtime as any)[stage]; (runtime as any)[stage]=stage==="record"?function(...args:any[]){const start=performance.now();console.log("stage-start",stage);try{return original(...args);}finally{(currentCase.stages??={})[stage]=(currentCase.stages?.[stage]??0)+performance.now()-start;console.log("stage-done",stage,performance.now()-start);}}:async function(...args:any[]){const start=performance.now();console.log("stage-start",stage);try{return await original(...args);}finally{(currentCase.stages??={})[stage]=(currentCase.stages?.[stage]??0)+performance.now()-start;console.log("stage-done",stage,performance.now()-start);}}; }
const originalEval=(runtime as any).engine.evaluate.bind((runtime as any).engine); (runtime as any).engine.evaluate=async(...args:any[])=>{const start=performance.now();console.log("engine-start");try{return await originalEval(...args);}finally{(currentCase.stages??={}).engine=performance.now()-start;console.log("engine-done",performance.now()-start);}};
try{for(const m of (process.argv.includes("--one")?manifest.samples.slice(0,1):manifest.samples.filter((m:any)=>!process.env.SMOKE_CASES||process.env.SMOKE_CASES.split(",").includes(m.id)))){const c:any={id:m.id,run:m.run,floor:m.floor,screen:m.screen,category:m.category,fixture_sha256:m.sha256};report.cases.push(c);currentCase=c;providerResult=null;
try{const bytes=readFileSync(join(here,'frozen',m.file));if(hash(bytes)!==m.sha256)throw Error('fixture hash mismatch');const raw=JSON.parse(bytes.toString()),state=parseGameState(raw.state);if(state.run?.ascension!==10||state.run.raw.character_id!=='SILENT')throw Error('fixture outside Silent A10');
const memory=createScreenMemory(state.screen);const plan=plans.filter((p:any)=>p.run===m.run&&p.ts<=m.ts).at(-1),route=routes.filter((r:any)=>r.run_id===m.run&&r.ts<=m.ts).at(-1);if(plan)memory.runPlan=plan.plan;if(route)memory.routePlan=route.route_plan;
const env:any={state,knowledge,brief:buildRunBrief(state,knowledge),thresholds:config.thresholds,runStart:'auto',characterPreference:'silent',allowFtueModals:false,strictJev:true,combatPlanner:'turn',buildDecider:'deepseek',oneshot:'off',requiredBossEvaluation:true,screenMemory:memory,shopDiscardPotions:[]};
c.plan_source=plan?{line:plan.line,ts:plan.ts,floor:plan.floor}:null;c.route_source=route?{ts:route.ts,floor:route.floor}:null;c.direction_weights=plan?.plan.v6?.direction_weights??null;
const started=performance.now();let d:any,table:any;
if(m.category==='card'){table=await runtime!.evaluate(env,'pick');env.v6ProjectionTable=table;d=buildV6CardPick(env,table??undefined)?.decision;}
else {const planAt=performance.now();const planned:any=planDecision(env);c.initial_plan_ms=performance.now()-planAt;d=planned.decision;if(d?.kind==='ask'&&d.v6Room){const prepareAt=performance.now();d=await prepareV6RoomDecision(d,env,provider);c.room_prepare_ms=performance.now()-prepareAt;}table=d?.roomProjection;}
c.data_prepare_ms=performance.now()-started;
if(providerResult){const auditAt=performance.now();save(`${m.id}-provider`,providerResult);c.smoke_audit_save_ms=performance.now()-auditAt;}
if(process.argv.includes('--warm')){const hotAt=performance.now();if(m.category==='card')await runtime!.evaluate(env,'pick');else{const planned:any=planDecision(env);if(planned.decision?.kind==='ask'&&planned.decision.v6Room)await prepareV6RoomDecision(planned.decision,env,provider);}c.warm_prepare_ms=performance.now()-hotAt;}
c.label=d?.label;c.decision_kind=d?.kind;c.telemetry=table?.telemetry??null;c.target_mixtures=table?.target_mixtures??[];c.targets=table?.targets??[];
const q=d?constructionQuestion(env,d):null;c.coverage=q?.coverage??null;c.v6_unknown_to_brain=!!q?.coverage.reason;
if(q?.coverage.reason)recordConstructionHandover(env,`${out}/run-plans.jsonl`,m.id,q.kind,q.coverage,q.coverage.reason,c.data_prepare_ms);
c.unknown_reasons=table?Object.fromEntries([...new Set(table.combinations.flatMap((r:any)=>r.unknown_reasons??[]))].map(reason=>[reason,table.combinations.filter((r:any)=>r.unknown_reasons?.includes(reason)).length])):null;
if(table){save(`${m.id}-table`,table);c.combination_rows=table.combinations.length;c.known_expected_rows=table.combinations.filter((r:any)=>r.entry?.expected_win!=null).length;}
if(d?.kind==='ask'){const wire=d.potionJev??d;save(`${m.id}-question`,{state:wire.state,questions:wire.questions});c.state_bytes=Buffer.byteLength(JSON.stringify(wire.state));c.logical_request_bytes=Buffer.byteLength(JSON.stringify({state:wire.state,questions:wire.questions}));c.options=Object.keys(wire.questions.pick?.criteria??{});c.potion_options=c.options.filter((id:string)=>id.includes('potion'));
if(c.state_bytes>22000||Buffer.byteLength(JSON.stringify({model:'typesafe/jev-1.14',state:wire.state,questions:wire.questions}))>24000)throw Error('application request byte ceiling exceeded');
if(client&&!c.v6_unknown_to_brain){const jt=performance.now();try{const result=await withConstructionJevBudget(`smoke_${m.id}`,()=>client.ask(wire.state,wire.questions));c.jev={answers:result.answers,model:result.model,latency_ms:result.latencyMs,request_id:result.requestId,input_tokens:result.inputTokens,output_tokens:result.outputTokens};}catch(e:any){c.jev_error={kind:e.kind??e.name,status:e.status??null,message:String(e.message).slice(0,500)};}c.jev_wall_ms=performance.now()-jt;}
else c.jev_not_called=client?'production_unknown_gate':'prepare_only';
}else c.jev_not_called='code_direct_action';
}catch(e:any){c.error=String(e.stack??e).slice(0,1500);}save('report',report);console.log(JSON.stringify({id:c.id,label:c.label,coverage:c.coverage,prepare_ms:c.data_prepare_ms,jev_ms:c.jev_wall_ms,choice:c.jev?.answers?.pick?.choice,error:c.error??c.jev_error,not_called:c.jev_not_called}));}
}finally{await pool.close();report.finished_at=new Date().toISOString();report.protected_after=protectedState();report.protected_unchanged=JSON.stringify(report.protected_before)===JSON.stringify(report.protected_after);save('report',report);console.log(JSON.stringify({out,protected_unchanged:report.protected_unchanged}));}

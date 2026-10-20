import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const [wt,stage]=process.argv.slice(2), out=dirname(fileURLToPath(import.meta.url));
const imp=(p:string)=>import(pathToFileURL(join(wt!,'agent/src',p)).href);
const {loadV6Knowledge}=await imp('v6/knowledge.ts');
const {evaluatePredicate}=await imp('v6/predicate.ts');
const {loadCombatEntries,combatEntryAudit}=await imp('reflex/jev/combat-entries.ts');
const {parseGameState}=await imp('hand/mod/schema.ts');
const {makeKnowledge}=await imp('knowledge/index.ts');
const {buildRunBrief}=await imp('memory/run-brief.ts');
const {createScreenMemory}=await imp('memory/types.ts');
const {loadConfig}=await imp('core/config.ts');
const {directionSummaries,directionTask}=await imp('v6/direction-plan.ts');
const {buildV6CardPick}=await imp('v6/card-pick.ts');
const {buildV6RoomDecision}=await imp('hand/screens/v6-room.ts');
const {v6ShopOptions,v6RestOptions}=await imp('hand/screens/v6-room-options.ts');
const hash=(v:any)=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const fixedKnowledge=makeKnowledge(read(join(wt!,'agent/tests/logged-states/game-data.json')),'cache');
const kd=join(wt!,'knowledge'),loaded=loadV6Knowledge(kd,'silent');
assert.equal(loaded.cores.status,'loaded');assert.equal(loaded.reflex.status,'loaded');assert.equal(loaded.vocab.status,'loaded');
assert.equal(loaded.reflex.value.length,85);
const samples=read(join(out,'probe-inputs.json')),combat=[];
for(const s of samples){
 const state=parseGameState(s.start.state);assert.equal(state.run.raw.character_id,'SILENT');
 let source=s.decision;for(const part of s.sample.phase.split('.'))source=source[part];
 const steps=(source.planned_steps??source.steps).map((v:any)=>({cardId:v.card_id,
 ...Object.fromEntries([['upgraded','upgraded'],['card_index','cardIndex'],['target_index','target'],['cost','cost'],['discards','discards']].filter(([a])=>a! in v).map(([a,b])=>[b,v[a!]])),
 ...('target'in v&&!('target_index'in v)?{target:v.target}:{})}));
 const plan={steps,outcome:{}};
 const session=loadCombatEntries(state,kd,{V6_COMBAT_ENTRIES:'on'},typeof s.decision.sl_attempt==='number'?{slAttempt:s.decision.sl_attempt}:{});
 assert.ok(session);
 const audit=combatEntryAudit(session,plan,null,null),hit=audit.memory.find((x:any)=>x.id===s.id);
 assert.ok(hit,s.id);assert.deepEqual(hit.signal,loaded.reflex.value.find((x:any)=>x.id===s.id).signal);
 const unknown=evaluatePredicate(loaded.reflex.value.find((x:any)=>x.id===s.id).predicate,{});
 assert.notEqual(unknown,true);
 combat.push({id:s.id,input_sha256:hash({state:s.start,decision:s.decision}),hit,unknown,
  actual_fields:Object.keys(hit),metrics_sidecar_consumed:('n'in hit||'design'in hit||'method'in hit)});
}
const allUnknown=evaluatePredicate(loaded.reflex.value[0].predicate,{});assert.equal(allUnknown,null);
const tags=[];
for(const e of loaded.reflex.value.filter((e:any)=>e.signal.kind==='tag')){
 const terms:any[]=[];const visit=(p:any)=>{terms.push(p);if(p.args)p.args.forEach(visit);if(p.arg)visit(p.arg);};visit(e.predicate);
 const cardId=terms.find(p=>p.field==='card.id'&&p.op==='eq').value;
 const upgraded=terms.find(p=>p.field==='card.upgraded'&&p.op==='eq')?.value??false;
 const raw=structuredClone(samples[0].start.state);raw.run.ascension=e.scope.ascensions[0];
 raw.combat.hand=[{card_id:cardId,upgraded,index:0}];
 const plan={steps:[{cardId,upgraded}],outcome:{}};
 const session=loadCombatEntries(parseGameState(raw),kd,{V6_COMBAT_ENTRIES:'on'});
 const audit=combatEntryAudit(session,plan,null,null),hit=audit.memory.find((x:any)=>x.id===e.id);
 assert.ok(hit,e.id);assert.ok(hit.vocabulary?.length);assert.deepEqual(hit.signal,e.signal);
 raw.combat.hand=[];
 const falseAudit=combatEntryAudit(loadCombatEntries(parseGameState(raw),kd,{V6_COMBAT_ENTRIES:'on'}),plan,null,null);
 assert.ok(!falseAudit.memory.some((x:any)=>x.id===e.id));
 tags.push({id:e.id,input:{fixture:'synthetic_plumbing_only_not_game_evidence',cardId,upgraded,ascension:e.scope.ascensions[0],plan},hit,false_result:falseAudit.evaluated.find((x:any)=>x.id===e.id)?.result});
}
const summaries=directionSummaries('silent',10,loaded.cores.value,[],null);
assert.equal(summaries.length,4);assert.equal(summaries.flatMap((x:any)=>x.combos).length,17);
const direction=directionTask({summaries,entries:[],appearedCards:[],potionIds:[],floor:1,current:{}});
Object.assign(process.env,{V6_BUILD:'on',V6_REFLEX:'on',V6_CARD_DECIDER:'jev',V6_SHOP_DECIDER:'jev',V6_REST_DECIDER:'jev',CHARACTER:'silent'});
const roomResults=[];
for(const [kind,file,key] of [['card','xljq-f5-reward','reward'],['shop','u6ru-f22-shop','open'],['rest','w2tb-f7-rest','rest']]){
 const raw=read(join(wt!,'agent/tests/logged-states/oneshot',file+'.json')).states[key];
 Object.assign(raw.run,{character_id:'SILENT',ascension:10});
 const state=parseGameState(raw),env={state,screenMemory:{...createScreenMemory(state.screen),runPlan:{runId:raw.run_id,act:1,v6:{direction_weights:{P:.25,D:.25,S:.25,R:.25},potion_directions:[],checkpoint:40}}},brief:buildRunBrief(state,fixedKnowledge),knowledge:fixedKnowledge,thresholds:loadConfig({}).thresholds,shopDiscardPotions:[],runStart:'auto',strictJev:true,combatPlanner:'turn'};
 const input={kind,raw};writeFileSync(join(out,stage+'-'+kind+'-input.json'),JSON.stringify(input)+'\n');
 const decision=kind==='card'?buildV6CardPick(env,undefined,kd)?.decision:buildV6RoomDecision(env,kind==='shop'?v6ShopOptions(env):v6RestOptions(env),undefined,undefined,kd);
 assert.ok(decision,kind);
 const result={label:decision.label,state:decision.state,questions:decision.questions};
 const serial=JSON.stringify(result);writeFileSync(join(out,stage+'-'+kind+'-output.json'),serial+'\n');
 const comboIds=summaries.flatMap((d:any)=>d.combos.map((c:any)=>c.id)).filter((id:string)=>serial.includes('"'+id+'"'));
 assert.ok(new Set(comboIds).size>=1,kind);
 roomResults.push({consumer:kind,input:join(out,stage+'-'+kind+'-input.json'),output:join(out,stage+'-'+kind+'-output.json'),input_sha256:hash(JSON.stringify(input)+'\n'),sha256:hash(serial+'\n'),status:'question_inclusion_offline',combo_ids:comboIds,omitted_combo_ids:summaries.flatMap((d:any)=>d.combos.map((c:any)=>c.id)).filter((id:string)=>!comboIds.includes(id)),limitations:['未模拟；投影数值保持unknown；未发在线请求或执行动作。','题面受现有体积上限裁剪，命中数量按实际报告，不冒全部组合都已上屏。']});
}
const isolation=[];
for(const character of ['ironclad','regent','necrobinder','defect']){
 const x=loadV6Knowledge(kd,character);
 assert.ok(x.reflex.status!=='loaded'||x.reflex.value.every((e:any)=>e.scope.character===character));
 isolation.push({character,reflex:x.reflex.status,cores:x.cores.status});
}
const missing=mkdtempSync(join(out,'missing-fixture-'));mkdirSync(join(missing,'characters/silent'),{recursive:true});
const absent=loadV6Knowledge(missing,'silent');assert.equal(absent.cores.status,'missing');assert.equal(absent.reflex.status,'missing');
for(const n of ['build-cores.json','reflex.json'])copyFileSync(join(kd,'characters/silent',n),join(missing,'characters/silent',n));
const noVocab=loadV6Knowledge(missing,'silent');assert.equal(noVocab.vocab.status,'missing');assert.equal(noVocab.reflex.status,'invalid');
const entryIds=new Set(loaded.reflex.value.map((x:any)=>x.id)),exp=read(join(kd,'characters/silent/experience.json'));
for(const c of loaded.cores.value){assert.ok(c.linked_reflex.every((id:string)=>entryIds.has(id)));assert.ok(c.linked_experience.every((id:string)=>exp.entries.some((e:any)=>e.id===id)));}
const result={stage,root:wt,formal_files:['build-cores.json','reflex.json','reflex-vocab.json','experience.json'].map(file=>({file,sha256:createHash('sha256').update(readFileSync(join(kd,'characters/silent',file))).digest('hex')})),
 loader:{cores:loaded.cores.status,reflex:loaded.reflex.status,vocab:loaded.vocab.status},combat,tags,unknown:allUnknown,
 direction:{input:{character:'silent',ascension:10,entries:[]},output:direction,combo_ids:summaries.flatMap((d:any)=>d.combos.map((c:any)=>c.id))},
 room:roomResults,isolation,missing:{cores:absent.cores.status,reflex:absent.reflex.status,no_vocab_reflex:noVocab.reflex.status},
 limitations:['combat memory实际有signal、label、confidence、support/contradict、cores/combos及正式来源SHA；n/design/method、独立局G、窗口与删失只在明确SHA关联审计侧表。','固定回放只证明加载/题面包含，不证明自然采用或收益。','七条tag无可验收实际完整计划HP结果；只用明确标识的合成固定题验证tag/词表字段传递，不称实盘命中，不构造HP数值。']};
writeFileSync(join(out,stage+'-consumer-readback.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({stage,combat_hits:combat.length,directions:summaries.length,combos:17,room:roomResults.map(x=>x.consumer),metadata_sidecar_consumed:combat.some((x:any)=>x.metrics_sidecar_consumed)}));

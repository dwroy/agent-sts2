import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root='/home/dw/Projects/agent-sts2';
const candidate=root+'/.worktrees/issue53-experience-rollback-20261024';
const report=root+'/paper/materials/20261024-issue53-regression';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const imp=p=>import(pathToFileURL(candidate+'/agent/src/'+p));
const {setKnowledgeCharacter}=await imp('knowledge/files.ts');
setKnowledgeCharacter('silent');
const {loadExperience,setExperienceForTests}=await imp('knowledge/experience.ts');
const {buildKnowledgeTools}=await imp('brain/tools/agent-knowledge.ts');
const {queryExperience}=await imp('knowledge/render/experience-text.ts');
const {jevLessonLine,jevExperience}=await imp('reflex/jev-experience.ts');
const {parseGameState}=await imp('hand/mod/schema.ts');
const {fightLessons}=await imp('reflex/combat-plan.ts');
const old=read(report+'/experience-before.json');
const current=read(report+'/experience-live-frozen.json');
const diff=read(report+'/experience-diff.json');
const knowledgeDir=candidate+'/knowledge';
const path=knowledgeDir+'/characters/silent/experience.json';
assert.equal(sha(path),sha(report+'/experience-before.json'));
const before=sha(path),shared=sha(knowledgeDir+'/common/shared-experience.json');
const entries=loadExperience(knowledgeDir);
const ctx={knowledgeDir,logsDir:root+'/logs',ascension:10};
const tool=buildKnowledgeTools(ctx).find(t=>t.name==='kb_experience');
const rows=[];
for(const d of diff){
 const legacy=entries.find(e=>e.id===d.id);
 const result=await tool.run({id:d.id},ctx);
 assert.ok(!result.isError);
 const body=JSON.parse(result.text);
 const brain=body.entries.find(e=>e.id===d.id);
 if(d.kind==='added'){
  assert.equal(legacy,undefined);assert.equal(brain,undefined);
  rows.push({id:d.id,removed:true,legacy:true,brain:true,sources:body.sources});continue;
 }
 assert.deepEqual(legacy,d.old);assert.deepEqual(brain,d.old);
 const rendered=queryExperience(ctx,{ids:[d.id]},{path:'fixed-no-postmortems',sections:new Map()});
 assert.ok(rendered.includes(d.id));
 const line=jevLessonLine(legacy,10);
 assert.ok(line.length>0);
 assert.ok(body.sources.some(s=>s.sha256===before));
 rows.push({id:d.id,legacy:true,brain:true,legacy_render:true,jev_line:true,jev_line_sha256:createHash('sha256').update(line).digest('hex'),sources:body.sources});
}
const oldIds=new Set(old.entries.map(e=>e.id));
const sharedEntries=entries.filter(e=>!oldIds.has(e.id));
const replay=[];
for(const x of read(root+'/.artifacts/issue53-20261024/replay-frames.json')){
 const state=parseGameState(x.state);
 setExperienceForTests(entries);
 const oldFight=fightLessons(state);
 for(const e of oldFight) assert.deepEqual(e,entries.find(x=>x.id===e.id));
 setExperienceForTests([...current.entries,...sharedEntries]);
 const newFight=fightLessons(state);
 setExperienceForTests(null);
 const oldResult=jevExperience({state,kind:'monster',runPlan:null,entries});
 const newResult=jevExperience({state,kind:'monster',runPlan:null,entries:[...current.entries,...sharedEntries]});
 replay.push({run_id:x.run_id,source:'logs/states.jsonl',off:x.off,len:x.len,old_ids:oldResult.ids,current_ids:newResult.ids,old_fight_ids:oldFight.map(e=>e.id),current_fight_ids:newFight.map(e=>e.id),old_fight_lines_sha256:createHash('sha256').update(JSON.stringify(oldFight.map(e=>jevLessonLine(e,10)))).digest('hex'),old_output_sha256:createHash('sha256').update(JSON.stringify(oldResult)).digest('hex')});
}
assert.equal(sha(path),before);assert.equal(sha(knowledgeDir+'/common/shared-experience.json'),shared);
const receipt={at:new Date().toISOString(),candidate,experience_version:old.version,experience_sha256:before,active_private:old.entries.filter(e=>e.status==='active').length,total_private:old.entries.length,shared_sha256:shared,shared_entries:sharedEntries.length,entries:rows,historical_selector_replay:replay,scope:'offline consumer probe; no model, game, publication, full check, or outcome counterfactual'};
writeFileSync(report+'/consumer-checks.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({version:old.version,active:receipt.active_private,updated:rows.filter(x=>!x.removed).length,removed:rows.filter(x=>x.removed).length,shared:sharedEntries.length,replay:replay.length}));

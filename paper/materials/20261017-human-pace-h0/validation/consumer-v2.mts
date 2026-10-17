/** Actual Silent experience loader/render/query readback; no foreign private data or game/model invocation. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [rootArg,inputArg,outputArg]=process.argv.slice(2);
const root=resolve(rootArg!);
const input=JSON.parse(readFileSync(inputArg!,'utf8'));
const moduleAt=(file:string)=>import(pathToFileURL(resolve(root,'agent/src',file)).href);
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const canonical=(value:any):any=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const {setKnowledgeCharacter,knowledgeCharacter}=await moduleAt('knowledge/files.ts');
setKnowledgeCharacter('silent');assert.equal(knowledgeCharacter(),'silent');
const {loadExperience}=await moduleAt('knowledge/experience.ts');
const {queryExperience,renderExperience}=await moduleAt('knowledge/render/experience-text.ts');
const knowledgeDir=resolve(root,'knowledge');
const file=resolve(knowledgeDir,'characters/silent/experience.json');
const before=readFileSync(file);const raw=JSON.parse(before.toString());
assert.equal(raw.version,input.experience_version);
const loaded=loadExperience(knowledgeDir);
// Explicit empty case-note lookup keeps the probe scoped to the actual Silent experience objects.
const postmortems={path:'fixed-consumer:no-postmortem-lookup',sections:new Map()};
const ctx={ascension:10,act:3,knowledgeDir,logsDir:resolve(root,'logs')};
const rendered=renderExperience(ctx,postmortems);
const selected=queryExperience(ctx,{ids:input.entries.map((row:any)=>row.entry.id)},postmortems);
const checks=[];
for(const expected of input.entries){
  const entry=loaded.find((e:any)=>e.id===expected.entry.id);assert.deepEqual(entry,expected.entry);
  const digest=sha(JSON.stringify(canonical(entry)));assert.equal(digest,expected.sha256);
  assert.ok(rendered.includes(entry.id));assert.ok(selected.includes(entry.id));assert.ok(selected.includes(entry.lesson));
  checks.push({id:entry.id,sha256:digest,loaded:true,rendered:true,queried:true,entry});
}
for(const ascension of [0,2,9]){
  const text=renderExperience({...ctx,ascension},postmortems);
  for(const expected of input.entries)if(expected.entry.asc[0]>ascension||expected.entry.asc[1]<ascension)assert.ok(!text.includes(expected.entry.id));
}
assert.deepEqual(readFileSync(file),before);
// The caller records Git before/after: this sandbox denies Node spawnSync even after Git exits 0.
const observationBytes=readFileSync(input.observation_file);
assert.equal(sha(observationBytes),input.observation_sha256);
const observation=JSON.parse(observationBytes.toString());
const {head,tree}=observation;
assert.equal(observation.experience_sha256,sha(before));
for(const row of observation.source_files)assert.equal(sha(readFileSync(resolve(root,row.path))),row.sha256);
if(input.expected_head)assert.equal(head,input.expected_head);
if(input.expected_tree)assert.equal(tree,input.expected_tree);
const ownLines=rendered.split('\n').filter((line:string)=>input.entries.some((row:any)=>line.includes(row.entry.id)));
const output={request_id:input.request_id,revision:input.revision,character:knowledgeCharacter(),experience_version:raw.version,status:'passed',kind:'fixed-consumer',root,head,tree,git_observation_sha256:input.observation_sha256,experience_file_sha256:sha(before),checks,ascension_exclusion:[0,2,9],selected_text:selected,rendered_own_lines:ownLines,full_render_sha256:sha(rendered),source_files:['knowledge/files.ts','knowledge/experience.ts','knowledge/render/data.ts','knowledge/render/experience-text.ts'].map(path=>({path:'agent/src/'+path,sha256:sha(readFileSync(resolve(root,'agent/src',path)))})),scope:'Actual production functions and current file; caller verifies Git/source before and after the actual probe. Fixed readability only, no natural use, win effect, new four-gate validation or parent completion.'};
writeFileSync(outputArg!,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({status:'passed',entries:checks.length,experience_version:raw.version,head,tree}));

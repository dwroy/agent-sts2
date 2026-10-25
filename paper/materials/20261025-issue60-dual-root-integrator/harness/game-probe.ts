import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {strategyTool} from '@GAME@/agent/src/brain/tools/strategy-tool.ts';
import {reflexKnowledgeTool} from '@GAME@/agent/src/brain/tools/reflex-knowledge.ts';
import {experienceMatches} from '@GAME@/agent/src/brain/tools/query-guidance.ts';
import {setKnowledgeCharacter,knowledgeFile} from '@GAME@/agent/src/knowledge/files.ts';
import {runtimeKnowledgeIdentity} from '@GAME@/agent/src/knowledge/runtime-paths.ts';
import {KNOWLEDGE_DIR} from '@GAME@/agent/src/core/paths.ts';
const [fixture,version,legacy]=process.argv.slice(2);
assert.equal(KNOWLEDGE_DIR,'@GAME@/knowledge');assert.equal(runtimeKnowledgeIdentity()?.version,version);assert.equal(process.env.STS2_KNOWLEDGE_VERSION,version);
setKnowledgeCharacter('silent');
const ctx={label:'reward/card',ascension:10,act:1,knowledgeDir:KNOWLEDGE_DIR,logsDir:fixture,payload:{facts:{act:1,floor:4}}};
const results=[];
for(const tool of [strategyTool(),reflexKnowledgeTool()]) {
 const actual=JSON.parse((await tool.run({query:'*'},ctx)).text);
 const original=JSON.parse((await tool.run({query:'*'},{...ctx,knowledgeDir:join(fixture!,legacy!)})).text);
 // Snapshot provenance adds a version; payload entries retain identical semantics.
 assert.deepEqual(actual.entries,original.entries);assert(actual.entries.length>0);
 assert.deepEqual(JSON.parse((await tool.run({query:'nonexistent'},ctx)).text).entries,[]);
 results.push({tool:tool.name,positive:actual.entries.length,negative:0});
}
assert.deepEqual(JSON.parse((await strategyTool().run({query:'*'},{...ctx,label:'rest/plan'})).text).entries,[]);
assert.deepEqual(JSON.parse((await reflexKnowledgeTool().run({query:'*'},{...ctx,ascension:9})).text).entries,[]);
const exp=await experienceMatches(ctx),original=JSON.parse(readFileSync(join(fixture!,legacy!,'characters/silent/experience.json'),'utf8')).entries;
assert.deepEqual(exp.result,original);assert(exp.sources.some(s=>s.knowledge_version===version));
assert.equal(knowledgeFile(KNOWLEDGE_DIR,'room-costs.json','silent'),join(KNOWLEDGE_DIR,'characters/silent/room-costs.json'));
const pinned=runtimeKnowledgeIdentity();process.env.STS2_KNOWLEDGE_SNAPSHOT='/nonexistent/changed';process.env.STS2_KNOWLEDGE_VERSION='invalid';assert.deepEqual(runtimeKnowledgeIdentity(),pinned);
console.log(JSON.stringify({actual_game_sources:true,version,results,experience:exp.result.length,provenance:true,process_pinned:true,nonmigrated_path_unchanged:true,game_or_model_calls:0}));

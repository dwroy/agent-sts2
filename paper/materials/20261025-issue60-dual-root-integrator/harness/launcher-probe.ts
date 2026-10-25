import assert from 'node:assert/strict';
import {main} from '@HOST@/learner/lib/launcher.ts';
import {join} from 'node:path';
const fixture=process.argv[2]!,version=process.argv[3]!;
let output='',errors='';
const rc=await main(['--engine','codex','--task','experience-update','--character','silent','--cwd',fixture,'--set','runs=SILENT000001','--dry-run'],{projectRoot:'@HOST@',tasksDir:'@HOST@/learner/tasks',runsDir:join(fixture,'runs'),env:{STS2_KNOWLEDGE_RUNTIME:join(fixture,'runtime'),LEARNER_BATCH_ID:'fixture',LEARNER_STATE_FILE:join(fixture,'state.json'),CODEX_OPS_ROOT:fixture,CODEX_BIN:'/nonexistent/codex'},secretFiles:[],now:()=>new Date('2026-10-25T00:00:00Z'),out:s=>{output+=s;},err:s=>{errors+=s;},checkCodex:async()=>{throw Error('model check forbidden');},checkKeys:async()=>{throw Error('key check forbidden');}});
assert.equal(rc,0,errors);assert(output.includes(version));assert(output.includes('不commit/merge'));assert(output.includes('@HOST@/agent/tools/knowledge-runtime.ts'));assert(output.includes('是否合入对局分支：no'));assert(!output.includes('externalDecision is not defined'));console.log(JSON.stringify({rc,baseline:version,root_cli:true,merge_no:true,real_launcher:true,model_calls:0}));

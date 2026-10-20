import { performance } from 'node:perf_hooks';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { loadV6Knowledge } from '../../../agent/src/v6/knowledge.js';
import { loadCombatEntries, combatEntryAudit } from '../../../agent/src/reflex/jev/combat-entries.js';
import { fixedState, fixedPlan, fixedRollout, fixedBoss } from '../../../agent/tests/v6-combat-fixtures.js';
const directory = process.argv[2]!;
const state = fixedState();
const times: Record<string,number[]> = {};
function sample(name: string, work:()=>unknown) { const start=performance.now();const value=work(); (times[name]??=[]).push(performance.now()-start); return value; }
for(let i=0;i<10;i++)sample('uncached_full_knowledge',()=>loadV6Knowledge(directory,'silent'));
const loaded=sample('combat_cold',()=>loadCombatEntries(state,directory,{V6_COMBAT_ENTRIES:'on'}));
if(!loaded)throw Error('missing benchmark knowledge');
for(let i=0;i<50;i++) { const session=sample('combat_warm',()=>loadCombatEntries(state,directory,{V6_COMBAT_ENTRIES:'on'}));sample('predicates_and_audit',()=>combatEntryAudit(session,fixedPlan,fixedRollout,fixedBoss)); }
const result={kind:'read-only benchmark on current published files; synthetic combat state; not historical timing',directory,entry_count:loaded.entries.length,sources:Object.fromEntries(['build-cores.json','direction-cards.json','reflex.json','reflex-vocab.json'].map(name=>{ const path=join(directory,'characters','silent',name); if(!existsSync(path))return [name,{status:'missing'}]; const bytes=readFileSync(path); return [name,{bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}]; })),times};
writeFileSync(new URL(process.argv[3] ?? './benchmark.json',import.meta.url),JSON.stringify(result,null,2)+'\n');

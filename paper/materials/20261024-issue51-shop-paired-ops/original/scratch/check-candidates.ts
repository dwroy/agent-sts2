import { readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { parseStrategyLibrary } from '../../../../agent/src/knowledge/strategy-entries.ts';
import { validateReflexEntry, validateReflexVocab } from '../../../../agent/src/v6/formats.ts';
import { loadV6Knowledge } from '../../../../agent/src/v6/knowledge.ts';
const s = resolve('learner/runs/20261024-184402-978f9d6e-be89-4c5d-b87b-be2dd9843bae-strategy-proposal/scratch');
const json = (p: string) => JSON.parse(readFileSync(resolve(s,p),'utf8'));
const strategies = parseStrategyLibrary(json('strategy-candidates.json'));
const reflex = json('reflex-candidates.json');
const checks = reflex.entries.map((e: unknown) => validateReflexEntry(e));
if (checks.some((r: {ok: boolean}) => !r.ok)) throw new Error(JSON.stringify(checks));
const vocab = validateReflexVocab(json('reflex-vocab-candidates.json'));
if (!vocab.ok) throw new Error(JSON.stringify(vocab));
for (const entry of reflex.entries) for (const source of entry.sources) {
 const bytes=readFileSync(resolve(source.path));
 if (createHash('sha256').update(bytes).digest('hex')!==source.sha256) throw new Error('source SHA mismatch');
}
const isolated=resolve(s,'isolated-knowledge');
const role=resolve(isolated,'characters/silent'); mkdirSync(role,{recursive:true});
copyFileSync(resolve(s,'reflex-candidates.json'),resolve(role,'reflex.json'));
copyFileSync(resolve(s,'reflex-vocab-candidates.json'),resolve(role,'reflex-vocab.json'));
const loaded=loadV6Knowledge(isolated,'silent');
if (loaded.reflex.status!=='loaded'||loaded.reflex.value.length!==6||loaded.vocab.status!=='loaded') throw new Error(JSON.stringify(loaded));
const ironclad=loadV6Knowledge(isolated,'ironclad');
if (ironclad.reflex.status!=='missing') throw new Error('character isolation');
const result={strategy_entries:strategies.entries.length,reflex_entries:reflex.entries.length,vocab_tags:vocab.value.dimensions.resource_cost.length,source_sha_checks:6,isolated_loader:'loaded',ironclad:'missing',publication:false,production_consumer_readback:false,simulation_or_api_calls:0};
writeFileSync(resolve(s,'candidate-format-check.json'),JSON.stringify(result,null,2)+'\n');
process.stdout.write(JSON.stringify(result)+'\n');

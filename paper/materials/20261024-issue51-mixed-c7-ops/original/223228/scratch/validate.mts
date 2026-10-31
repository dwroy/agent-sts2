import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseStrategyLibrary } from '../../../../agent/src/knowledge/strategy-entries.ts';
import { validateReflexEntry, validateReflexVocab } from '../../../../agent/src/v6/formats.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const read = (name: string) => JSON.parse(readFileSync(root + name, 'utf8'));
const strategies = parseStrategyLibrary(read('strategy-candidates.json'));
const rkResults = read('rk-candidates.json').entries.map((entry: unknown) => validateReflexEntry(entry));
const vocabResult = validateReflexVocab(read('rk-vocab-candidates.json'));
if (rkResults.some((r: {ok: boolean}) => !r.ok) || !vocabResult.ok) {
  throw new Error(JSON.stringify({rkResults, vocabResult}));
}
const result = {
  strategy_entries_valid: strategies.entries.length,
  rk_entries_valid: rkResults.length,
  vocabulary_valid: vocabResult.ok,
  production_readback: false,
  gameplay_replay: false,
};
writeFileSync(root + 'format-validation.json', JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result) + '\n');

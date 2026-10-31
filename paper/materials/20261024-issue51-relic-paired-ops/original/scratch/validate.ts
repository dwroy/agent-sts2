import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseStrategyLibrary, retrieveStrategies } from '../../../../agent/src/knowledge/strategy-entries.ts';
import { validateReflexEntry } from '../../../../agent/src/v6/formats.ts';
import { evaluatePredicate } from '../../../../agent/src/v6/predicate.ts';

const dir = fileURLToPath(new URL('.', import.meta.url));
const read = (name: string) => JSON.parse(readFileSync(dir + name, 'utf8'));
const library = parseStrategyLibrary(read('strategy-candidates.json'));
const rk = read('rk-candidates.json');
const checks = rk.entries.map((entry: any) => {
  const result = validateReflexEntry(entry);
  if (!result.ok) throw new Error(entry.id + ': ' + result.issues.join('; '));
  const relic = entry.predicate.args[0].arg.args[0].value;
  const facts = { player: { gold: 300, deck: [] }, shop: { stock: [{ id: relic, stocked: true }] } };
  const positive = evaluatePredicate(entry.predicate, facts);
  const negative = evaluatePredicate(entry.predicate, { ...facts, shop: { stock: [{ id: relic, stocked: false }] } });
  if (positive !== true || negative !== false) throw new Error(entry.id + ': predicate mismatch ' + positive + '/' + negative);
  return { id: entry.id, format: true, matching_stock: positive, sold_stock: negative, signal_kind: entry.signal.kind };
});
const otherType = retrieveStrategies(library, 'reward/card', { facts: { act: 2 } });
if (otherType.length) throw new Error('shop/event entries matched card reward');
const result = { strategy_format: true, strategies: library.entries.length, reflex_format: true, reflex_entries: checks.length, checks,
  unrelated_question_matches: otherType.length, scope: '固定scratch格式/谓词检查；未读正式消费者、未回放原生产题、未调用模型/模拟器/游戏；不算发布或采用。' };
writeFileSync(dir + 'candidate-validation.json', JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result) + '\n');

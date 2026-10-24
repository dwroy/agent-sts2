import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStrategyLibrary, retrieveStrategies } from '../../../../agent/src/knowledge/strategy-entries.ts';
import { validateReflexEntry } from '../../../../agent/src/v6/formats.ts';
import { evaluatePredicate } from '../../../../agent/src/v6/predicate.ts';

const root = dirname(fileURLToPath(import.meta.url));
const library = parseStrategyLibrary(JSON.parse(readFileSync(join(root, 'strategy-entries.json'), 'utf8')));
const rkFile = JSON.parse(readFileSync(join(root, 'reflex.json'), 'utf8'));
const mapping = JSON.parse(readFileSync(join(root, 'scenario-mapping.json'), 'utf8'));
const rows: unknown[] = [];
for (const entry of rkFile.entries) {
  const parsed = validateReflexEntry(entry);
  if (!parsed.ok) throw new Error(JSON.stringify({ id: entry.id, issues: parsed.issues }));
}
for (const map of mapping) {
  const candidate = JSON.parse(readFileSync(map.path, 'utf8'));
  const entry = library.entries.find(e => e.id === map.strategy_id)!;
  const rk = candidate.rk_entry;
  // Constructed DTOs validate format and predicate behavior, not original replay or use.
  const card = candidate.candidate_card_id;
  const act = candidate.current_information.prior_deck_proxy.act;
  const positive = evaluatePredicate(rk.predicate, { act, card: { id: card } });
  const negative = evaluatePredicate(rk.predicate, { act, card: { id: 'UNRELATED_CARD' } });
  const matching = retrieveStrategies({ ...library, entries: [entry] }, 'reward/card', { facts: { act } }).length;
  const wrongType = retrieveStrategies({ ...library, entries: [entry] }, 'combat/turn', { facts: { act } }).length;
  if (positive !== true || negative !== false || matching !== 1 || wrongType !== 0) {
    throw new Error(JSON.stringify({ id: entry.id, positive, negative, matching, wrongType }));
  }
  rows.push({ strategy_id: entry.id, rk_id: rk.id, positive, negative, matching, wrongType });
}
const result = { schema_validation: 'passed', strategy_entries: library.entries.length,
  rk_entries: rkFile.entries.length, checks: rows,
  boundary: 'Constructed fixed DTOs only; no captured original replay, production readback, native model, simulation or game.' };
writeFileSync(join(root, 'candidate-format-validation.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result, null, 2) + '\n');

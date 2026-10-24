import fs from 'node:fs';
import path from 'node:path';
import { parseStrategyLibrary, retrieveStrategies, strategyEvidenceSummary } from '../../../../agent/src/knowledge/strategy-entries.ts';

const scratch = path.dirname(new URL(import.meta.url).pathname);
const library = parseStrategyLibrary(JSON.parse(fs.readFileSync(path.join(scratch, 'strategy-candidates.json'), 'utf8')));
const results = library.entries.map(entry => ({
  id: entry.id,
  text_bytes: Buffer.byteLength(entry.strategy, 'utf8'),
  evidence_summary: strategyEvidenceSummary(entry),
  event_body_guard: (entry as any).event_identity_guard_in_body,
  matching_event_acts: entry.trigger.acts?.filter(act => retrieveStrategies(library, 'event/choose', { facts: { act } }).some(e => e.id === entry.id)),
  non_event_shop_matches: retrieveStrategies(library, 'shop/choose', { facts: { act: 1 } }).filter(e => e.id === entry.id).length,
}));
if (results.some(row => row.matching_event_acts?.length !== library.entries.find(e => e.id === row.id)!.trigger.acts?.length || row.non_event_shop_matches)) throw new Error('candidate routing mismatch');
fs.writeFileSync(path.join(scratch, 'candidate-format-validation.json'), JSON.stringify({
  strategy_library_valid: true,
  entries: results,
  validation_scope: 'Offline candidate parse and existing retrieval only; no production tool readback or natural adoption.',
  rk_valid_entries: 0,
  rk_status: 'Six descriptive notes waiting for event contract; not passed to validateReflexEntry.',
}, null, 2) + '\n');
process.stdout.write(JSON.stringify({ strategy_library_valid: true, entries: results.length, production_readback: false }) + '\n');

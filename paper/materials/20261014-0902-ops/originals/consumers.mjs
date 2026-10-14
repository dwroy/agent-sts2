import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { auditSelectionExecution } from '../../lib/selection-execution.ts';
import { silentApotheosisReference } from '../../../agent/src/reflex/silent-apotheosis-reference.ts';
import { parseGameState } from '../../../agent/src/hand/mod/schema.ts';

const out = fileURLToPath(new URL('.', import.meta.url));
const dispatch = JSON.parse(readFileSync(out + 'dispatch.json', 'utf8'));
const results = [];
for (const run of dispatch.runs) {
  const input = JSON.parse(readFileSync(out + run + '-consumer-input.json', 'utf8'));
  const output = auditSelectionExecution(input);
  writeFileSync(out + run + '-consumer-output.json', JSON.stringify(output, null, 2) + '\n');
  const actions = output.observed_actions;
  const turns = output.observed_turns ?? output.turns ?? [];
  results.push({run, decisions: input.decisions.length, states: input.states.length,
    segments: output.segments.length, actions: actions.length,
    observed_intervals: actions.filter(action => action.observed_interval?.status === 'observed_endpoints').length,
    observed_turns: turns.filter(turn => turn.status === 'observed_turn_endpoints').length,
    unknown_turns: turns.filter(turn => turn.status === 'unknown').length,
    full_candidate_known: output.segments.filter(segment => segment.actual_full_candidate_result !== null).length});
}
const godInput = JSON.parse(readFileSync(out + 'VLZ6CCT8AQ0A-consumer-input.json', 'utf8'));
const frames = [275679, 275680, 275722, 275732].map(line => {
  const raw = godInput.states.find(row => row._line === line);
  if (!raw) throw new Error('缺少原神化帧 ' + line);
  return {line, reference: silentApotheosisReference(parseGameState(raw.state), null)};
});
writeFileSync(out + 'consumer-summary.json', JSON.stringify({results, frames}, null, 2) + '\n');
process.stdout.write(JSON.stringify({results, frames}, null, 2) + '\n');

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseGameState } from '../../../agent/src/hand/mod/schema.ts';
import { survivorDiscardFacts } from '../../../agent/src/hand/screens/silent-discard-facts.ts';

const input = JSON.parse(readFileSync(new URL('./P74C04AEPL1F.input.json', import.meta.url), 'utf8'));
const decision = input.decisions.find(row => row._line === 278543);
const frame = input.states.find(row => row.fingerprint === decision.fingerprint && row.observed_ts === decision.observed_ts);
const nextDecision = input.decisions.find(row => row._line === 278544);
const after = input.states.find(row => row.fingerprint === nextDecision.fingerprint && row.observed_ts === nextDecision.observed_ts);
const beforeBytes = JSON.stringify(frame.state);
const result = survivorDiscardFacts(parseGameState(frame.state), true);
assert(result !== null);
assert.deepEqual([...result.keys()], [0, 1, 2, 3]);
assert.deepEqual(result.get(2).retained_cards.map(c => c.card_id), after.state.combat.hand.map(c => c.card_id));
assert.deepEqual(result.get(2).current_resources, { hp: 1, block: 16, energy: 2 });
assert.equal(JSON.stringify(frame.state), beforeBytes);
for (const facts of result.values()) {
  assert.equal(facts.retained_cards.length, 3);
  assert(!Object.hasOwn(facts, 'hp_after'));
  assert(!Object.hasOwn(facts, 'damage_after'));
}
process.stdout.write(JSON.stringify({ source_decision: decision._line, source_state: frame._line,
  after_decision: nextDecision._line, after_state: after._line,
  status: '既有生产快照与实际弃后手牌相符；四分支保留；伤害、格挡、剩血后继未模拟',
  branches: [...result].map(([index, facts]) => ({ index, facts })) }, null, 2) + '\n');

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseStrategyLibrary, retrieveStrategies, applyStrategyEntries } from '../../../agent/src/knowledge/strategy-entries.ts';

const here = new URL('./', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, here), 'utf8'));
const lib = parseStrategyLibrary(read('brain-strategy-candidates.json'));
const whole = read('whole-run-audit.json');
const signature = ['SNAKEBITE', 'ACCELERANT', 'FOOTWORK'];
const rows = [];
for (const run of ['BKK8KAR3E83C', 'TB5YKELW0355']) {
  const s = whole[run].deck_changes.find(s => signature.every(id => s.deck.some(c => c.card_id === id)));
  const label = s.screen === 'SHOP' ? 'shop/plan' : 'reward/card';
  const payload = { facts: { act: Number(s.act_id) + 1, floor: s.floor, deck: s.deck } };
  const hits = retrieveStrategies(lib, label, payload);
  if (hits.length !== 1) throw new Error(`missing candidate: ${run}`);
  const request = { label, payload };
  const injected = applyStrategyEntries(request, lib);
  if (injected.payload.strategy_entries?.entries?.[0]?.id !== lib.entries[0].id) throw new Error('candidate did not fit serialized envelope');
  rows.push({ run_id: run, source: s.ref, label, matches: hits.map(e => e.id),
    envelope_bytes: Buffer.byteLength(JSON.stringify(injected.payload.strategy_entries)),
    scope: '冻结实盘牌组适配为固定检索输入；不是当局原始大脑请求或live读回' });
}
for (const run of ['QVDR4R3UWKXU', '37U27AS6JNJ0', 'XC9AHZH3CZVK']) {
  const s = whole[run].terminal;
  const payload = { facts: { act: Number(s.act_id) + 1, floor: s.floor, deck: s.deck } };
  const hits = retrieveStrategies(lib, 'rest/plan', payload);
  if (hits.length) throw new Error(`incomplete signature matched: ${run}`);
  rows.push({ run_id: run, source: s.ref, matches: [], scope: '仅缺组件负例；不把终态作为可行动题' });
}
const output = { schema: 'candidate-contract-readback-v1', production_parser: true,
  formal_knowledge_modified: false, published: false, live_consumer_readback: null,
  model_calls: 0, cases: rows };
fs.writeFileSync(new URL('candidate-validation.json', here), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ path: fileURLToPath(new URL('candidate-validation.json', here)), cases: rows.length, passed: true }));

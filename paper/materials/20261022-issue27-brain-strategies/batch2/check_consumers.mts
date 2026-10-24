/** Fixed production-consumer readback; no model, game, simulator or network calls. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStrategyLibrary, retrieveStrategies, applyStrategyEntries, StrategyEntries, STRATEGY_LIMITS } from '../../../../agent/src/knowledge/strategy-entries.js';
import { setKnowledgeCharacter } from '../../../../agent/src/knowledge/files.js';
import { buildKnowledgeTools } from '../../../../agent/src/brain/tools/agent-knowledge.js';
import { userMessage } from '../../../../agent/src/brain/message.js';
import { freeSpec } from '../../../../agent/src/brain/specs.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');
const out = process.argv[2] ?? join(here, 'consumer-output');
mkdirSync(out, { recursive: true });
const raw = readFileSync(join(root, 'knowledge/characters/silent/strategy-entries.json'), 'utf8');
const library = parseStrategyLibrary(JSON.parse(raw));
const previous = JSON.parse(readFileSync('/home/dw/Projects/agent-sts2/.artifacts/ops-issue27-batch2-20261022/frozen/knowledge/characters/silent/strategy-entries.json', 'utf8'));
for (const e of previous.entries) assert.deepEqual(library.entries.find(x => x.id === e.id), e);
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const save = (name: string, value: unknown) => writeFileSync(join(out, name), JSON.stringify(value, null, 2) + '\n');
const request = (label: string, payload: any) => ({ label, system: 'fixed offline replay', question: 'fixed consumer readback', payload, spec: freeSpec(label, { type: 'object' }) });
const metadata = (e: any) => ({ id: e.id, version: e.version, source: e.source, evidence: e.evidence,
  evidence_summary: e.evidence_summary ?? null });
setKnowledgeCharacter('silent');
const ctx = (req: any) => ({ ascension: 10, label: req.label, payload: req.payload,
  knowledgeDir: join(root, 'knowledge'), logsDir: '/tmp/issue27-no-logs' });
const toolFor = (req: any) => buildKnowledgeTools(ctx(req)).find(t => t.name === 'kb_strategies')!;
const labelFor = (q: string) => ({ card_reward: 'reward/card', act_plan: 'event/act-plan', event: 'event/plan', rest: 'rest/plan', shop: 'shop/plan' })[q]!;
const perEntry = [];
for (const e of library.entries) {
  const t = e.trigger;
  const facts: any = { act: t.acts?.[0] ?? 1, floor: t.floor?.min ?? t.floor?.max ?? 5,
    act_boss: t.bosses?.[0] ?? 'FIXTURE_UNKNOWN_BOSS', hp: '60/70', deck_size: 20,
    run_brief: { character: '静默猎手' } };
  const req = request(labelFor(t.question_types[0]!), facts);
  const matched = retrieveStrategies(library, req.label, req.payload);
  assert(matched.some(x => x.id === e.id), e.id + ' positive');
  const applied = new StrategyEntries().apply(req, join(root, 'knowledge'), 'silent');
  const block = (applied.payload as any).strategy_entries;
  assert(block?.entries.some((x: any) => x.id === e.id), e.id + ' must fit compatibility byte budget');
  assert(block.entries.length <= 3 && Buffer.byteLength(JSON.stringify(block)) <= 4096);
  const result = await toolFor(req).run({ query: e.id }, ctx(req));
  assert(!result.isError, result.text);
  const queried = JSON.parse(result.text);
  assert(queried.entries.some((x: any) => x.id === e.id), e.id + ' tool');
  assert.deepEqual(metadata(queried.entries.find((x: any) => x.id === e.id)), metadata(matched.find(x => x.id === e.id)));
  const negative = structuredClone(facts); negative.act = 99;
  assert(!retrieveStrategies(library, req.label, negative).some(x => x.id === e.id));
  const unknown = structuredClone(facts); delete unknown.act;
  assert(!retrieveStrategies(library, req.label, unknown).some(x => x.id === e.id));
  const unknownBoss = structuredClone(facts); delete unknownBoss.act_boss;
  if (t.bosses) assert(!retrieveStrategies(library, req.label, unknownBoss).some(x => x.id === e.id));
  const unknownFloor = structuredClone(facts); delete unknownFloor.floor;
  if (t.floor) assert(!retrieveStrategies(library, req.label, unknownFloor).some(x => x.id === e.id));
  assert(!retrieveStrategies(library, 'combat/plan', facts).some(x => x.id === e.id));
  for (const role of ['ironclad', 'regent']) {
    setKnowledgeCharacter(role);
    const other = request(req.label, { ...facts, run_brief: { character: role } });
    assert.equal(new StrategyEntries().apply(other, join(root, 'knowledge'), role), other);
    assert.deepEqual(JSON.parse((await toolFor(other).run({ query: '*' }, ctx(other))).text).entries, []);
  }
  setKnowledgeCharacter('silent');
  save(e.id + '.tool.json', queried);
  writeFileSync(join(out, e.id + '.prompt.txt'), userMessage(applied) + '\n');
  perEntry.push({ ...metadata(matched.find(x => x.id === e.id)), positive: true,
    wrong_act: true, unknown_act: true, unknown_boss: t.bosses ? true : 'not required',
    unknown_floor: t.floor ? true : 'not required', wrong_question_type: true,
    other_characters_excluded: ['ironclad', 'regent'], block_bytes: Buffer.byteLength(JSON.stringify(block)),
    tool_bytes: Buffer.byteLength(result.text), compatibility_count: block.entries.length });
}
const fixed = JSON.parse(readFileSync(join(here, 'fixed-questions.json'), 'utf8'));
const replays = [];
for (const q of fixed) {
  // Retain factual question fields; map the dataset's boss field to the runtime's act_boss.
  const req = request(q.label, { ...q.question, act_boss: q.question.boss, run_brief: { character: q.question.character } });
  const before = userMessage(req);
  const applied = new StrategyEntries().apply(req, join(root, 'knowledge'), 'silent');
  const block = (applied.payload as any).strategy_entries;
  assert(block?.entries.length > 0, q.type);
  assert(block.entries.length <= 3 && Buffer.byteLength(JSON.stringify(block)) <= 4096);
  const noHit = { ...req, payload: { ...req.payload, act: 99 } };
  const unchanged = new StrategyEntries().apply(noHit, join(root, 'knowledge'), 'silent');
  assert.equal(unchanged, noHit); assert.equal(userMessage(unchanged), userMessage(noHit));
  const result = await toolFor(req).run({ query: '*' }, ctx(req));
  assert(!result.isError);
  const queried = JSON.parse(result.text);
  for (const e of block.entries) assert.deepEqual(metadata(queried.entries.find((x: any) => x.id === e.id)), metadata(e));
  save(q.type + '.tool.json', queried);
  writeFileSync(join(out, q.type + '.prompt.txt'), userMessage(applied) + '\n');
  replays.push({ type: q.type, dataset_id: q.dataset_id, dataset_ref: q.dataset_ref,
    entries: block.entries.map(metadata), tool_entries: queried.entries.map(metadata),
    block_bytes: Buffer.byteLength(JSON.stringify(block)), base_prompt_bytes: Buffer.byteLength(before),
    prompt_bytes: Buffer.byteLength(userMessage(applied)), tool_bytes: Buffer.byteLength(result.text), no_hit_byte_identical: true });
}
// Stress only the original budget contract, without asserting any gameplay outcome.
const forced = parseStrategyLibrary({ ...library, entries: library.entries.map(e => ({ ...e,
  trigger: { question_types: ['card_reward'], acts: [1] } })) });
const stressReq = request('reward/card', { act: 1 });
const stressBlock = (applyStrategyEntries(stressReq, forced).payload as any).strategy_entries;
assert.equal(retrieveStrategies(forced, stressReq.label, stressReq.payload).length, library.entries.length);
assert(stressBlock.entries.length <= STRATEGY_LIMITS.entries);
assert(Buffer.byteLength(JSON.stringify(stressBlock)) <= STRATEGY_LIMITS.bytes);
const bytesLimited = parseStrategyLibrary({ ...forced, entries: forced.entries.map(e => ({ ...e, strategy: '测'.repeat(400) })) });
const bytesBlock = (applyStrategyEntries(stressReq, bytesLimited).payload as any).strategy_entries;
assert(bytesBlock.entries.length < 3 && Buffer.byteLength(JSON.stringify(bytesBlock)) <= 4096);
const shortText = parseStrategyLibrary({ ...forced, entries: forced.entries.map(e => ({ ...e, strategy: '格式预算夹具' })) });
const countBlock = (applyStrategyEntries(stressReq, shortText).payload as any).strategy_entries;
assert.equal(countBlock.entries.length, 3);
assert(Buffer.byteLength(JSON.stringify(countBlock)) <= 4096);
save('summary.json', { fixed_only: true, model_calls: 0, game_calls: 0, simulation_calls: 0,
  production_library_sha256: sha(raw), parsed_entries: library.entries.length, prior_entries_unchanged: true,
  limits: STRATEGY_LIMITS, per_entry: perEntry, five_type_replays: replays,
  stress: { available: library.entries.length, included: stressBlock.entries.length,
    block_bytes: Buffer.byteLength(JSON.stringify(stressBlock)), long_text_count: bytesBlock.entries.length,
    long_text_bytes: Buffer.byteLength(JSON.stringify(bytesBlock)), short_text_count: countBlock.entries.length,
    short_text_bytes: Buffer.byteLength(JSON.stringify(countBlock)) },
  tool_scope: '#33 current source kb_strategies direct run; not live tool invocation or natural brain use',
  compatibility_scope: 'actual StrategyEntries.apply and userMessage; not live prompt, model choice or game effect' });
console.log(JSON.stringify({ parsed_entries: library.entries.length,
  per_entry: perEntry.map(({ id, block_bytes, tool_bytes }) => ({ id, block_bytes, tool_bytes })),
  five_types: replays.map(({ type, entries, block_bytes }) => ({ type, ids: entries.map((e: any) => e.id), block_bytes })),
  stress_bytes: Buffer.byteLength(JSON.stringify(stressBlock)), passed: true }));

import fs from 'node:fs';
import assert from 'node:assert/strict';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const out = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(out, '../../..');
const input = JSON.parse(fs.readFileSync(path.join(out, 'discard-evidence.json'), 'utf8'));
const read = fs.readFileSync;
let blockedKnowledgeReads = 0;
fs.readFileSync = function (name, ...args) {
  const filename = name instanceof URL ? fileURLToPath(name) : typeof name === 'string' ? name : '';
  if (filename.includes('/knowledge/') && !filename.includes('/agent/src/knowledge/')) {
    blockedKnowledgeReads++;
    throw Object.assign(new Error('ENOENT: frozen observations only'), { code: 'ENOENT' });
  }
  return read.call(this, name, ...args);
};
syncBuiltinESMExports();
const source = (name) => import(path.join(root, 'agent/src', name));
const { setKnowledgeCharacter } = await source('knowledge/files.ts');
setKnowledgeCharacter('silent');
const { loadConfig } = await source('core/config.ts');
const { parseGameState } = await source('hand/mod/schema.ts');
const { planSelection } = await source('hand/screens/selection.ts');
const { survivorDiscardFacts } = await source('hand/screens/silent-discard-facts.ts');
const { survivorSmoggyFacts } = await source('hand/screens/silent-smoggy-selection.ts');
const { makeKnowledge } = await source('knowledge/index.ts');
const { buildRunBrief } = await source('memory/run-brief.ts');
const { createScreenMemory } = await source('memory/types.ts');
const { facingFightOf } = await source('reflex/combat-plan.ts');
const knowledge = makeKnowledge({ cards: input.selection.selection.cards.map((card) => ({
  id: card.card_id, name: card.name, type: card.card_type, cost: card.energy_cost,
  description: card.resolved_rules_text, description_raw: card.rules_text, vars: card.dynamic_values,
})) }, 'cache');

function context(raw) {
  const state = parseGameState(structuredClone(raw));
  const memory = createScreenMemory('CARD_SELECTION');
  memory.cardSource = { action: 'play_card', id: 'SURVIVOR', fight: facingFightOf(state), turn: state.turn };
  // Reconstructed solely from d355906/355907, not an archived runtime memory.
  memory.pausedCombatPlan = {
    turn: state.turn,
    remaining: [{ cardId: 'HAZE', name: '迷雾+', upgraded: true, cost: 2, target: null }],
    selectionReference: input.original_full_plan_prediction,
  };
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: 'auto', characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: memory, shopDiscardPotions: [], buildDecider: 'deepseek' };
}

const env = context(input.selection);
const pristine = JSON.stringify(env.state.raw);
const decision = planSelection(env);
assert.equal(decision.kind, 'ask');
assert.equal(decision.deepseek, undefined);
assert.deepEqual(Object.keys(decision.questions.pick.criteria).sort(), ['card0', 'card1', 'card2']);
const criteria = Object.fromEntries(Object.entries(decision.questions.pick.criteria).map(([key, value]) => [key, JSON.parse(value)]));
assert.deepEqual(Object.values(criteria).map((c) => c.removes_planned_continuation), [false, false, true]);
for (const key of ['card0', 'card1']) {
  const haze = criteria[key].discard_snapshot.retained_cards.find((c) => c.card_id === 'HAZE');
  assert.deepEqual([haze.upgraded, haze.energy_cost_now, haze.energy_sufficient_for_this_card_alone, haze.energy_after_this_card_alone], [true, 2, true, 1]);
  assert.equal(haze.text_now, '给予所有敌人6层中毒和2层虚弱。');
}
const actualProjection = criteria.card2.discard_snapshot;
assert.deepEqual(actualProjection.current_resources, { hp: 22, block: 17, energy: 3 });
assert.deepEqual(actualProjection.retained_cards.map((c) => [c.card_id, c.upgraded]), input.after.combat.hand.map((c) => [c.card_id, c.upgraded]));
assert.equal(survivorSmoggyFacts(env.state, true), null);
const legalActions = [];
for (let index = 0; index < 3; index++) {
  const key = `card${index}`;
  const result = decision.resolve({ pick: { type: 'choice', choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } });
  assert.deepEqual(result.intent, { action: 'select_deck_card', option_index: index });
  if (index === 2) assert.match(result.rationale, /原整条预测失效/);
  legalActions.push(result.intent);
}
assert.equal(JSON.stringify(env.state.raw), pristine);
const boundaries = [];
for (const [field, value] of [['character_id', 'IRONCLAD'], ['character_id', 'NECROBINDER'], ['ascension', 9], ['ascension', 11]]) {
  const raw = structuredClone(input.selection);
  raw.run[field] = value;
  const state = parseGameState(raw);
  assert.equal(survivorDiscardFacts(state, true), null);
  assert.equal(survivorSmoggyFacts(state, true), null);
  boundaries.push({ field, value, projection: null });
}
const report = {
  status: 'passed', run: input.run, floor: 21, turn: 4,
  scope: '固定帧的现有弃牌消费者核验；不调用模型，不等同完整生产测试或自然收益验收',
  reconstructed_memory: true, blocked_knowledge_reads: blockedKnowledgeReads,
  criteria, legal_actions: legalActions, boundaries,
  full_continuation_prediction: 'unknown', retained_haze_actual_fight_result: null,
};
fs.writeFileSync(path.join(out, 'consumer-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, legal_choices: 3, boundaries: 4, blocked_knowledge_reads: blockedKnowledgeReads }));

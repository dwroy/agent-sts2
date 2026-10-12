import { readFileSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

if (process.env.CHARACTER !== 'silent') throw new Error('silent isolation required');
const root = resolve('agent');
const out = resolve('learner/runs/20261012-140823-strategy-proposal');
const moduleOf = (path) => import(pathToFileURL(resolve(root, path)).href);
const { setKnowledgeCharacter } = await moduleOf('src/knowledge/files.ts');
setKnowledgeCharacter('silent');
const { loadConfig } = await moduleOf('src/core/config.ts');
const { makeKnowledge } = await moduleOf('src/knowledge/index.ts');
const { parseGameState } = await moduleOf('src/hand/mod/schema.ts');
const { buildRunBrief } = await moduleOf('src/memory/run-brief.ts');
const { createScreenMemory } = await moduleOf('src/memory/types.ts');
const { planCombatTurn } = await moduleOf('src/reflex/combat-plan.ts');
const { rolloutLiveOptions } = await moduleOf('src/reflex/rollout-live.ts');
const { solveTap } = await moduleOf('src/reflex/turn-solver.ts');
const { coreRealization } = await moduleOf('src/sim/core-realization.ts');
rolloutLiveOptions.enabled = false;

const fixtureBytes = readFileSync(resolve(root, 'tests/core-realization-observations.json'));
const fixture = JSON.parse(fixtureBytes)['L704TLETMZBM-CALCULATED_GAMBLE'];
const original = Buffer.alloc(58902);
const handle = openSync('/home/dw/Projects/agent-sts2/logs/states.jsonl', 'r');
readSync(handle, original, 0, original.length, 7860860721);
closeSync(handle);
if (createHash('sha256').update(original).digest('hex') !== '78b7c862ae71d9086a2ea977129b2c3be448d54a05a1d21257adf24f225ec269') throw new Error('source SHA mismatch');
if (JSON.stringify(JSON.parse(original).state) !== JSON.stringify(fixture.before.state)) throw new Error('fixed input differs from observed state');
const raw = structuredClone(fixture.before.state);
const types = new Map(raw.run.deck.map((c) => [c.card_id, c.card_type]));
for (const c of raw.combat.hand) types.set(c.card_id, c.card_type);
const knowledge = makeKnowledge({ cards: [...types].map(([id, type]) => ({ id, type })) }, 'cache');
const state = parseGameState(raw);
const env = { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
  runStart: 'auto', characterPreference: null, allowFtueModals: false, strictJev: true,
  screenMemory: createScreenMemory('COMBAT'), shopDiscardPotions: [] };
let solver;
solveTap.onSolve = (input) => { solver ??= structuredClone(input); };
try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
if (!solver) throw new Error('no solver input captured');
const card = solver.hand.find((c) => c.cardId === 'CALCULATED_GAMBLE');
if (!card) throw new Error('Gamble missing');
const step = { cardIndex: card.index, cardId: card.cardId, name: card.name, upgraded: card.upgraded, target: null };
const baseHandCount = solver.hand.length;
if (baseHandCount !== 10) throw new Error('unexpected observed hand');
const without = (input, id) => {
  const copy = structuredClone(input);
  const index = copy.hand.findIndex((c) => c.cardId === id);
  if (index < 0) throw new Error(`missing ${id}`);
  copy.hand.splice(index, 1);
  return copy;
};
const candidate = without(solver, 'THE_HUNT');
const extra = structuredClone(candidate);
const backflip = structuredClone(solver.hand.find((c) => c.cardId === 'BACKFLIP'));
backflip.index = 9001;
backflip.key = 'conditional-observed-backflip-copy';
extra.hand.push(backflip);
const variants = [
  ['original', '原观测手牌', solver],
  ['candidate', '条件移除已到手狩猎；不回滚此前动作', candidate],
  ['minus_key', '再移除下注，所选动作不合法', without(candidate, 'CALCULATED_GAMBLE')],
  ['plus_support', '在空出的手位条件加入同型后空翻；不是实际获得', extra],
  ['minus_existing', '再移除一张已到手后空翻', without(candidate, 'BACKFLIP')],
];
const result = { question: '绷带下注当步，减少手中可弃牌是否仍可预支原27挡？',
  source: { run: fixture.run, floor: fixture.floor, attempt: fixture.attempt, turn: 3,
    path: 'logs/states.jsonl', offset: 7860860721, bytes: 58902,
    sha256: '78b7c862ae71d9086a2ea977129b2c3be448d54a05a1d21257adf24f225ec269' },
  fixture_sha256: createHash('sha256').update(fixtureBytes).digest('hex'),
  method: 'coreRealization / traceSteps，既有quantitative realization接口的同一函数',
  horizon: '一次已选择出牌的已建挡/能量/HP前缀；不执行抽入未知身份后的动作，不模拟敌回合',
  randomness: '当前弃牌与绷带即时前缀不依赖抽牌随机性；没有随机样本分布或Monte Carlo SE',
  source_and_target_deck_comparison: false,
  actual_original_endpoint: { hp: fixture.after.state.combat.player.current_hp,
    block: fixture.after.state.combat.player.block, energy: fixture.after.state.combat.player.energy },
  variants: variants.map(([id, label, input]) => ({ id, label, input, steps: [step], result: coreRealization(input, [step]) })),
  limits: ['新增/移除仅为当前手牌条件干预，不是永久牌组增删后的可达状态或整战反事实。',
    '只有原臂有真实后帧；变体没有实际损血、击杀回合、boss胜率、药水收益或完整组合数。',
    '沿原绷带证据的局部算术，不支持缩牌必坏、补牌必好或新的自动策略。'] };
writeFileSync(resolve(out, 'bounded-discard-result.json'), JSON.stringify(result, null, 2) + '\n');
for (const row of result.variants) {
  const action = row.result.actions[0];
  process.stdout.write(JSON.stringify({ id: row.id, hand: row.input.hand.length,
    complete: row.result.complete_line, action: action ? { block: action.block_gained,
      blockAfter: action.block_after, energy: action.energy_after, hp: action.hp_after,
      discards: action.discards.length, draws: action.draws } : null,
    unknown: row.result.unknown }) + '\n');
}

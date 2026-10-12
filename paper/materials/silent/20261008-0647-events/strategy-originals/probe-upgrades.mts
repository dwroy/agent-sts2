import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { makeKnowledge } from '../../../agent/src/knowledge/index.js';
import { applyUpgrade, modelHandCard } from '../../../agent/src/reflex/card-model.js';

const states = JSON.parse(readFileSync(new URL('./fixed-states.json', import.meta.url), 'utf8'));
const raws = Object.values(states).flatMap((s: any) => s.combat?.hand ?? []);
const knowledge = makeKnowledge({ cards: [...new Map(raws.map((c: any) => [c.card_id, {
  id: c.card_id, type: c.card_type, name: c.name, target: c.target_type,
}])).values()] }, 'cache');
const model = (line: string, id: string) => {
  const raw = states[line].combat.hand.find((c: any) => c.card_id === id);
  return modelHandCard(raw, raw.index, knowledge, 'silent', 10);
};
const fields = ['damage', 'hits', 'maulIncrease', 'block', 'vulnerable', 'weak', 'strength',
  'tempStrength', 'draw', 'energyGain', 'hpLoss', 'cost', 'plating', 'retaliate', 'powerAmount'];
const results: any[] = [];
const apotheosis = model('275679', 'APOTHEOSIS');
assert.equal(apotheosis.known, false);
results.push({ card: 'APOTHEOSIS', line: 275679, known: apotheosis.known, flatValue: apotheosis.flatValue });
for (const [id, effect] of [['FASTEN', 'fasten'], ['PIERCING_WAIL', 'enemyTempStrengthLoss']] as const) {
  const plain: any = model('275679', id);
  const upgraded: any = model('275680', id);
  const delta = Object.fromEntries(fields.flatMap(field => {
    const difference = (upgraded[field] ?? 0) - (plain[field] ?? 0);
    return difference ? [[field, difference]] : [];
  }));
  const applied: any = applyUpgrade(plain, delta);
  assert.notEqual(applied[effect], upgraded[effect]);
  results.push({ card: id, effect, original: plain[effect], observed_upgrade: upgraded[effect],
    current_generic_hand_upgrade: applied[effect], numeric_delta: delta,
    note: '仅核验当前通用手牌升级字段缺口，不以此代替未实现的神化路径' });
}
assert.equal(model('275680', 'FASTEN').fasten, 6);
writeFileSync(new URL('./upgrade-probe.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify({ 原神化仍未建模: true, 通用升级遗漏: results.slice(1).map(r => r.effect), 已有升级勒紧: 6 }));

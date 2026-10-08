import assert from 'node:assert/strict';
import { modelPotion } from '../../../agent/src/reflex/card-model.ts';

const model = modelPotion('CURE_ALL', '痊愈药水', 0, []);
assert.equal(model?.energyGain, 1);
assert.equal(model?.draw, 2);
assert.notEqual(model?.special, 'heal');
console.log(JSON.stringify({ potion: 'CURE_ALL', energyGain: model?.energyGain, draw: model?.draw, heals: false }));

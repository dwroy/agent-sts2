/** Actual T1 board and original B3 redeal construction; synthetic role variants read Silent data only. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const out = resolve(process.argv[2]), parent = resolve(out, '..'), compiled = resolve(out, 'compiled');
const load = name => import(pathToFileURL(resolve(compiled, 'agent/src', name)).href);
const { makeKnowledge } = await load('knowledge/index.js');
const { parseGameState } = await load('hand/mod/schema.js');
const { readMonsterDbJson } = await load('knowledge/monster-db.js');
const { rolloutLiveOptions } = await load('reflex/rollout-live.js');
rolloutLiveOptions.enabled = false;
const { redealInput } = await load('sim/boss-sim.js');
const { loadMonsterDb, bossOpening } = await load('sim/boss-start.js');
const { boardOf } = await import(pathToFileURL(resolve(compiled, 'agent/tools/boss-sim/backtest-board.js')).href);
const { normalizeCalibrationOpening } = await import(pathToFileURL(resolve(compiled, 'agent/tools/boss-sim/calibration-board.js')).href);
const old = resolve(parent, '../../../experiments/boss-sim/silent/995fbdbd421116fc5aff5c375c35623cb939dcdb1f72a5877b6c03b8e91f3a7b');
const fights = readFileSync(resolve(old, 'fights.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const knowledge = makeKnowledge(JSON.parse(readFileSync(resolve(parent, 'frozen-model/data/game-data.json'), 'utf8')).collections, 'cache');
const mm = JSON.parse(readFileSync(resolve(parent, 'frozen-model/knowledge/common/move-model.json'), 'utf8'));
const monsterDb = loadMonsterDb();
const row = fights.find(r => r.key === 'JMH5C51RLN4E:48:5:7439906621'); assert(row);
const raw = structuredClone(row.t1.state);
const opening = bossOpening('TEST_SUBJECT', 10, monsterDb, knowledge); assert(opening);
const provenance = normalizeCalibrationOpening(raw, opening, monsterDb, 10);
function build(raw, asc) {
  return boardOf(parseGameState(raw), knowledge, 'TEST_SUBJECT', readMonsterDbJson().monsters, mm, { randomPotions: false }).input;
}
const b2 = build(raw, 10);
const b3 = redealInput(b2, { fresh: true, hp: row.entry_hp });
assert.equal(b2.observedSilentTestSubjectPhasePowers, true);
assert.equal(b3.observedSilentTestSubjectPhasePowers, true);
const variants = [];
for (const character of ['IRONCLAD', 'REGENT', 'UNKNOWN']) {
  const variant = structuredClone(raw); variant.run.character_id = character;
  const input = build(variant, 10);
  assert.equal(input.observedSilentTestSubjectPhasePowers, undefined);
  variants.push({ character, enabled: false, scope: 'Synthetic role label over the same Silent frame; no other-role knowledge read.' });
}
const unseen = structuredClone(raw); unseen.combat.enemies[0].powers.find(p => p.power_id === 'ENRAGE_POWER').amount = 4;
assert.equal(build(unseen, 10).observedSilentTestSubjectPhasePowers, undefined);
const population = structuredClone(raw); population.combat.enemies.push({ ...population.combat.enemies[0], index: 1, enemy_id: 'UNKNOWN' });
// Use the adapter directly: an unknown extra enemy need not be a solvable policy board.
const { boardRolloutInput } = await load('reflex/rollout-live.js');
assert.equal(boardRolloutInput(parseGameState(raw), knowledge, b2.solver, 9, readMonsterDbJson().monsters, mm).observedSilentTestSubjectPhasePowers, undefined);
const observed = boardRolloutInput(parseGameState(population), knowledge, b2.solver, 10, readMonsterDbJson().monsters, mm);
assert.equal(observed.observedSilentTestSubjectPhasePowers, undefined);
const result = { status: 'passed', source: row.source, key: row.key, provenance,
  b2: { observed: b2.observedSilentTestSubjectPhasePowers }, b3: { observed: b3.observedSilentTestSubjectPhasePowers },
  variants, unseen_enrage_unchanged: true, unobserved_population_unchanged: true,
  scope: 'Actual original calibration T1/pre constructors only; no H1 timing, natural-use, synthetic future-resource or other-role game claim.' };
writeFileSync(resolve(out, 'adapter-probe-output.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: 'passed', b2: true, b3: true, role_variants: variants.length }));

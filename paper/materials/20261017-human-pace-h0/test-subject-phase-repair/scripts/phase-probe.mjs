/** Controlled two-turn phase-state regression through the actual compiled old/new simulators. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const out = resolve(process.argv[2]);
const parent = resolve(out, '..');
const load = (root, name) => import(pathToFileURL(resolve(root, 'agent/src', name)).href);
const old = await load(resolve(parent, 'repaired-v2-compiled'), 'reflex/rollout.js');
const fixed = process.argv.includes('--negative') ? old : await load(resolve(out, 'compiled'), 'reflex/rollout.js');
const { solveTurn } = await load(resolve(out, 'compiled'), 'reflex/turn-solver.js');
const table = { moves: {
  BITE_MOVE: { damage: 20, hits: 1, strength: 0, block: 0 }, SKULL_BASH_MOVE: { damage: 12, hits: 1, strength: 0, block: 0 },
  MULTI_CLAW_MOVE: { damage: 11, hits: 3, strength: 0, block: 0 }, PHASE3_LACERATE_MOVE: { damage: 12, hits: 3, strength: 0, block: 0 },
  BIG_POUNCE: { damage: 44, hits: 1, strength: 0, block: 0 }, BURNING_GROWL_MOVE: { damage: 0, hits: 1, strength: 3, block: 0 } },
  next: { BITE_MOVE: { SKULL_BASH_MOVE: 1 }, SKULL_BASH_MOVE: { BITE_MOVE: 1 }, MULTI_CLAW_MOVE: { MULTI_CLAW_MOVE: 1 },
    PHASE3_LACERATE_MOVE: { BIG_POUNCE: 1 }, BIG_POUNCE: { BURNING_GROWL_MOVE: 1 }, BURNING_GROWL_MOVE: { PHASE3_LACERATE_MOVE: 1 } } };
const skill = { index: 10, key: 'control', cardId: 'CONTROL_BLOCK', name: 'CONTROL_BLOCK', type: 'Skill', upgraded: false,
  cost: 0, xCost: false, playable: true, target: 'self', validTargets: [], damage: null, hits: 1, block: 100, vulnerable: 0,
  weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0, draw: 0,
  exhausts: false, special: null, known: true, flatValue: 1000, heldPenalty: 0, text: '' };
function input(phase, enabled = true, asc = 10, id = 'TEST_SUBJECT', enrageOverride) {
  const enrage = enrageOverride ?? (phase === 1 ? 3 : 0);
  const powers = phase === 1 ? { ADAPTABLE_POWER: 1, ENRAGE_POWER: enrage } : { ADAPTABLE_POWER: 1, PAINFUL_STABS_POWER: 1 };
  return { solver: { hand: [], player: { hp: 200, maxHp: 200, block: 0, energy: 3, weak: false, vulnerable: false,
    intangible: false, strengthNow: 0 }, enemies: [{ index: 0, name: 'Test Subject', hp: 1, maxHp: phase === 1 ? 111 : 212,
    block: 0, vulnerable: 0, weak: 0, poison: 1, artifact: 0, intangible: false, attacks: [], revives: true,
    enrage, woundsPerHit: phase === 1 ? 0 : 1 }], fightKind: 'boss', turn: 1 }, plans: [],
    enemies: [{ index: 0, id, move: phase === 1 ? 'BITE_MOVE' : 'MULTI_CLAW_MOVE', strength: 0, powers }],
    tables: { [id]: table }, piles: { draw: [skill], discard: [], handBase: [] },
    meta: { act: 3, t: 1, asc, kind: 'boss', enc: id, deck: { n: 1, atk: 0, skl: 1, pow: 0, junk: 0, dmg: 0, blk: 100, up: 0 }, relics: 0, max_en: 3 },
    playerPowers: {}, potions: 0, mm: {}, model: null, gates: null, observedSilentTestSubjectPhasePowers: enabled };
}
function run(engine, data, scripts = true) {
  const line = solveTurn(data.solver).plans.find(p => p.steps.length === 0); assert(line);
  const result = engine.simulateFight(data, line, 2, 7, scripts);
  assert.equal(result.records.length, 2);
  return result;
}
const observations = [];
for (const phase of [1, 2]) {
  const before = run(old, input(phase));
  const after = run(fixed, input(phase));
  const b = before.records.at(-1).snap.E[0], a = after.records.at(-1).snap.E[0];
  if (phase === 1) {
    assert.equal(b[9].ENRAGE_POWER, 3); assert.equal(b[9].STRENGTH_POWER, 3);
    assert.equal(a[3], 212); assert.equal(a[9].ENRAGE_POWER, undefined);
    assert.equal(a[9].STRENGTH_POWER ?? 0, 0); assert.equal(a[9].PAINFUL_STABS_POWER, 1);
  } else {
    assert.equal(b[9].PAINFUL_STABS_POWER, 1); assert.equal(a[3], 313);
    assert.equal(a[9].PAINFUL_STABS_POWER, undefined); assert.equal(a[9].NEMESIS_POWER, 1);
  }
  observations.push({ phase, before, after });
}
const isolation = [];
for (const [phase, enabled, asc, id, enrage, scripts] of [
  [1, false, 10, 'TEST_SUBJECT', undefined, true], [2, false, 10, 'TEST_SUBJECT', undefined, true],
  [1, true, 9, 'TEST_SUBJECT', undefined, true], [2, true, 9, 'TEST_SUBJECT', undefined, true],
  [1, true, 10, 'OTHER', undefined, true], [1, true, 10, 'TEST_SUBJECT', 4, true],
  [1, true, 10, 'TEST_SUBJECT', undefined, false] ]) {
  const data = input(phase, enabled, asc, id, enrage);
  const before = run(old, data, scripts), after = run(fixed, data, scripts);
  assert.deepEqual(after, before);
  isolation.push({ phase, enabled, asc, id, enrage, scripts, equal: true });
}
const result = { status: 'passed', observations, isolation, raw_evidence: resolve(out, 'evidence.json'),
  scope: 'Controlled forced poison-kill/Block inputs isolate observed phase power signatures and the false later Skill trigger. Not an original full-state replay, wound-pile settlement, policy equivalence, win benefit or natural use.' };
writeFileSync(resolve(out, 'phase-probe-output.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: 'passed', phase_transitions: observations.length, isolation: isolation.length }));

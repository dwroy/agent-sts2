/** Actual two end-turn windows from the original tuning run; compare phase fields only. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const out = resolve(process.argv[2]), parent = resolve(out, '..');
const evidence = JSON.parse(readFileSync(resolve(out, 'evidence.json'), 'utf8'));
const windows = evidence.transitions.filter(w => w.key.startsWith('JMH5C51RLN4E:'));
assert.equal(windows.length, 2);
const data = JSON.parse(readFileSync(resolve(parent, 'frozen-model/data/game-data.json'), 'utf8'));
const mm = JSON.parse(readFileSync(resolve(parent, 'frozen-model/knowledge/common/move-model.json'), 'utf8'));
const results = [];
for (const window of windows) {
  const bytes = readFileSync(window.pre.frozen_path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), window.pre.sha256);
  const next = readFileSync(window.next.frozen_path);
  assert.equal(createHash('sha256').update(next).digest('hex'), window.next.sha256);
  const raw = JSON.parse(bytes.toString()).state;
  assert.equal(raw.run.character_id, 'SILENT');
  const expected = Object.fromEntries(window.after.powers.map(p => [p.power_id, p.amount]));
  const row = { key: window.key, turn: window.turn, pre: window.pre, next: window.next, expected };
  for (const [label, root] of [['before', resolve(parent, 'repaired-v2-compiled')], ['after', resolve(out, 'compiled')]]) {
    const load = name => import(pathToFileURL(resolve(root, name)).href);
    const { makeKnowledge } = await load('agent/src/knowledge/index.js');
    const { parseGameState } = await load('agent/src/hand/mod/schema.js');
    const { boardOf } = await load('agent/tools/boss-sim/backtest-board.js');
    const { readMonsterDbJson } = await load('agent/src/knowledge/monster-db.js');
    const { solveTurn } = await load('agent/src/reflex/turn-solver.js');
    const { simulateFight } = await load('agent/src/reflex/rollout.js');
    const { rolloutLiveOptions } = await load('agent/src/reflex/rollout-live.js');
    rolloutLiveOptions.enabled = false;
    const board = boardOf(parseGameState(structuredClone(raw)), makeKnowledge(data.collections, 'cache'), 'TEST_SUBJECT', readMonsterDbJson().monsters, mm, { randomPotions: false });
    const noPlays = { ...board.solver, hand: board.solver.hand.map(c => ({ ...c, playable: false })) };
    const plan = solveTurn(noPlays).plans.find(p => p.steps.length === 0); assert(plan);
    const actual = simulateFight(board.input, plan, 1, 7, true, null);
    assert.equal(actual.records.length, 1);
    row[label] = actual;
    const enemy = actual.records[0].snap.E[0];
    assert.equal(enemy[3], window.after.max_hp);
    if (label === 'after') {
      assert.equal(enemy[9].ENRAGE_POWER ?? 0, expected.ENRAGE_POWER ?? 0);
      assert.equal(enemy[9].PAINFUL_STABS_POWER ?? 0, expected.PAINFUL_STABS_POWER ?? 0);
    } else {
      assert.notDeepEqual([enemy[9].ENRAGE_POWER ?? 0, enemy[9].PAINFUL_STABS_POWER ?? 0],
        [expected.ENRAGE_POWER ?? 0, expected.PAINFUL_STABS_POWER ?? 0]);
    }
  }
  results.push(row);
}
writeFileSync(resolve(out, 'observed-transition-probe-output.json'), JSON.stringify({ status: 'passed', windows: results,
  independent_runs: 1, split: 'tune', scope: 'Actual original tuning-run end-turn input, actual no-play action, one transition each. Only the Enrage/Painful Stabs phase fields and new max HP are asserted; not full trajectory, all resources/HP settlement, Wound piles, win effects or natural consumption.' }, null, 2) + '\n');
console.log(JSON.stringify({ status: 'passed', actual_transition_windows: results.length, independent_tuning_runs: 1 }));

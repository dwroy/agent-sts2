import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { deserialize } from 'node:v8';
import { gunzipSync } from 'node:zlib';

const [live, _knowledge, out] = process.argv.slice(2);
const frozen = JSON.parse(readFileSync(new URL('./frozen.json', import.meta.url), 'utf8'));
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const sourceHashes: Record<string, string> = {};
for (const [name, expected] of Object.entries(frozen.source_after)) {
  const actual = sha(readFileSync(join(live, name)));
  assert.equal(actual, expected);
  sourceHashes[name] = actual;
}
const { fightSample } = await import(pathToFileURL(join(live, 'agent/src/sim/boss-sim.ts')).href);
const fixture = JSON.parse(gunzipSync(readFileSync(join(live, 'agent/tests/fixtures/continuation-retaliation-cen1.json.gz'))).toString());
const row = fixture.fixtures[0];
const bytes = Buffer.from(row.fixture_payload, 'base64');
assert.equal(sha(bytes), row.fixture_sha256);
const { input, sample } = deserialize(bytes);
const result = fightSample(input, sample.plan, sample.seed, sample.maxTurns, sample.scripts, sample.order);
assert.equal(result.won, false);
assert.equal(result.died, true);
assert.ok(result.resources.hp <= 0);
assert.equal(result.sequence.firstWon, false);
assert.equal(result.sequence.firstDied, true);
assert.equal(result.sequence.secondBoss, null);
assert.equal(result.failureTrajectory, undefined);
writeFileSync(out, JSON.stringify({
  sourceHashes, actualModule: join(live, 'agent/src/sim/boss-sim.ts'),
  fixedOriginalCase: { run: fixture.run, floor: row.floor, label: row.label, seed: sample.seed, payload_sha256: row.fixture_sha256 },
  actualResult: { won: result.won, died: result.died, hp: result.resources.hp, sequence: result.sequence },
  fixedCalls: 1, newMonteCarloBatch: false, API: false,
  runtime: { CARD: process.env.V6_CARD_DECIDER, REFLEX: process.env.V6_REFLEX },
}, null, 2) + '\n');

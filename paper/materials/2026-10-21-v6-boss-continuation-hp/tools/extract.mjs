import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { deserialize, serialize } from 'node:v8';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
const root = '/home/dw/Projects/agent-sts2';
const source = join(root, 'logs/sim-failures/b6ddac7edc547c659ee8c4a54ae448099b18053926eb17e8c1f9e67b2948ab5a');
const output = 'paper/materials/2026-10-21-v6-boss-continuation-hp';
mkdirSync(join(output, 'evidence'), { recursive: true });
mkdirSync('agent/tests/fixtures', { recursive: true });
const hash = b => createHash('sha256').update(b).digest('hex');
const fixtures = [], sources = [];
for (const name of ["011ba91409ba7388111abea15cb41d06b9a75306bbf75d00cccc11ab5d2d934e.json", "10496d790ec0ab164dc0e65585ab8111638a706eab39e2216baee20dd91a528f.json", "13f8f293d6ea33ff7bb1c18d617388d1af68e8a319a38424eef3ad1e48c55bfe.json", "3feef53db590fcfe538d4a7e6fac7d1f028f4c618b6eef0de83f5df5f45b8170.json", "6e1c2c8e2963f8af447339794a5068955c2372842ff4188b2aedf4af745fc2ac.json", "79030ab4351374ee15fcc0c68cd58ceac97e41932e5fb9b29376ea3244cb2f97.json", "7f0c1c010c98040cb02ffcc8d988810cc42bb43bf330e645b537e2806524b062.json", "b98a7ad31440d7dfb8d9d3d6980d7077b0dd5ca0b5d9b60158abe1a8899fcbcf.json", "bb10d1d04259e67a9df1461f2f5ce41f797b8cb53165e312eccbe79cf9ca3013.json", "ca24ad768804d86aa343f9482351cc7558585c4a2fd0e5c737cf85bcf053823b.json", "d6a5d4d6bb39b9a4853f2f53af8d9d6ab5eaa96bc8000ae673f6e6469ddb4d25.json"]) {
  const raw = readFileSync(join(source, name));
  const j = JSON.parse(raw);
  if (j.question.run !== 'CEN1Z8HEU7NM') throw Error('wrong run');
  const payload = Buffer.from(j.sample.payload, 'base64');
  if (hash(payload) !== j.sample.sha256) throw Error('payload mismatch');
  const d = deserialize(payload);
  const last = d.first.failureTrajectory.at(-1);
  const replay = serialize({ input: d.input, sample: d.sample });
  const entry = { source: name, source_sha256: hash(raw), payload_sha256: hash(payload),
    floor: j.question.floor, label: j.question.label, runtime: j.sample.runtime,
    original: { won: d.first.won, died: d.first.died, hp: d.first.resources.hp, turns: d.first.turns,
      solver_dies: last.resourceAudit.outcome.dies, solver_wins: last.resourceAudit.outcome.winsFight },
    fixture_sha256: hash(replay), fixture_payload: replay.toString('base64') };
  fixtures.push(entry);
  sources.push({ name, source_sha256: hash(raw), bytes: raw.length,
    question: { ...j.question, state: undefined },
    state_sha256: hash(JSON.stringify(j.question.state)),
    failure: { seed: j.sample.seed, reason: j.sample.reason, sha256: j.sample.sha256 } });
  writeFileSync(join(output, 'evidence', name + '.gz'), gzipSync(raw, { level: 9 }));
}
writeFileSync('agent/tests/fixtures/continuation-retaliation-cen1.json.gz',
  gzipSync(Buffer.from(JSON.stringify({ schema: 'continuation-retaliation-replay-v1', run: 'CEN1Z8HEU7NM', fixtures }) + '\n'), { level: 9 }));
writeFileSync(join(output, 'evidence/sources.json'), JSON.stringify(sources, null, 2) + '\n');
console.log(JSON.stringify(sources.map(s => ({ name: s.name, floor: s.question.floor, label: s.question.label, seed: s.failure.seed }))));

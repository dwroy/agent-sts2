// Existing JSON path only. No imports, database creation, game, model, or cache eviction.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
const out = dirname(fileURLToPath(import.meta.url));
const root = resolve(out, '../../..');
const names = ['common/monster-db.json', 'characters/silent/room-costs.json', 'characters/silent/v6-history.json', 'characters/silent/strategy-entries.json'];
const rows = [];
const q = (xs, fraction) => [...xs].sort((a,b) => a-b)[Math.ceil(xs.length*fraction)-1];
for (const name of names) {
  const path = resolve(root, 'knowledge', name);
  const raw = readFileSync(path);
  const samples = [];
  for (let i=0; i<21; i++) { const start=performance.now(); JSON.parse(readFileSync(path, 'utf8')); samples.push(performance.now()-start); }
  rows.push({ path:name, bytes:raw.length, sha256:createHash('sha256').update(raw).digest('hex'), samples_ms:samples,
    p50_ms:q(samples,0.5), p95_ms:q(samples,0.95), first_ms:samples[0] });
}
const report = { time:new Date().toISOString(), node:process.version, nice:19, samples:21, cache:'OS state unmodified; repeat reads, not cold-cache',
  scope:'Read+JSON.parse only, base Git files; not full decision latency or DB comparison. No migration implemented.', rows };
writeFileSync(resolve(out,'json-baseline.json'), JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows.map(({path,bytes,p50_ms,p95_ms})=>({path,bytes,p50_ms,p95_ms}))));

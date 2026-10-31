/** Fixed pre-S1 data for tests only. Never downloads or opens production databases. */
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const KNOWLEDGE_FIXTURE_BASE = '39e48ce9d09248b86c0eec1bf2339c4b453ec253';
export function createKnowledgeTestFixture() {
 const project = fileURLToPath(new URL('../..', import.meta.url));
 const directory = mkdtempSync(join(tmpdir(), 'sts2-knowledge-')), token = randomUUID();
 const marker = join(directory, '.knowledge-fixture-owner');
 writeFileSync(marker, token, { flag: 'wx', mode: 0o600 });
 const tree = execFileSync('git', ['-C', project, 'ls-tree', '-rz', KNOWLEDGE_FIXTURE_BASE, '--', 'knowledge'], { maxBuffer: 4 * 1024 * 1024 }).toString('utf8');
 const entries = tree.split('\0').filter(Boolean).map(line => {
  const match = /^(\d+) blob ([a-f0-9]{40})\t(.+)$/.exec(line);
  if (!match) throw Error('unknown fixed knowledge object');
  return { mode: match[1], oid: match[2], path: match[3] };
 }).filter(row => row.path === 'knowledge/catalog.json'
   || /^knowledge\/common\/.*\.(json|md)$/.test(row.path)
   || /^knowledge\/characters\/[a-z0-9_]+\/[^/]+\.(json|md)$/.test(row.path)
   || ['knowledge/external/sts2fun/silent-a10.json', 'knowledge/external/sts2fun/builds-v1/archetypes.json'].includes(row.path));
 const batch = execFileSync('git', ['-C', project, 'cat-file', '--batch'], {
  input: entries.map(row => row.oid).join('\n') + '\n', maxBuffer: 128 * 1024 * 1024 });
 let offset = 0;
 for (const entry of entries) {
  if (entry.mode !== '100644') throw Error('fixed data must be a regular nonexecutable blob');
  const end = batch.indexOf(10, offset), header = batch.subarray(offset, end).toString('ascii');
  const match = /^([a-f0-9]{40}) blob (\d+)$/.exec(header);
  if (!match || match[1] !== entry.oid) throw Error('fixed knowledge object header mismatch');
  const size = Number(match[2]), raw = batch.subarray(end + 1, end + 1 + size);
  const digest = createHash('sha1').update('blob ' + size + '\0').update(raw).digest('hex');
  if (raw.length !== size || digest !== entry.oid || batch[end + 1 + size] !== 10) throw Error('fixed knowledge object checksum mismatch');
  const target = join(directory, entry.path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, raw, { mode: 0o600, flag: 'wx' });
  offset = end + 2 + size;
 }
 if (offset !== batch.length) throw Error('unexpected trailing fixture objects');
 return { directory: join(directory, 'knowledge'), base: KNOWLEDGE_FIXTURE_BASE, files: entries.length,
  cleanup() { if (readFileSync(marker, 'utf8') !== token) throw Error('knowledge fixture owner differs'); rmSync(directory, { recursive: true }); } };
}

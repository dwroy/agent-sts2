import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, it, vi } from 'vitest';
import { StatsStore, statsCanonical, statsSha, type StatsBundle, type StatsPublication } from '../src/knowledge/runtime/stats-store.js';
import { KnowledgeResources } from '../src/knowledge/resources.js';
import { main as statsMain } from '../tools/stats-runtime.js';

const roots: string[] = [], stores: StatsStore[] = [], readers: KnowledgeResources[] = [];
afterEach(() => { readers.splice(0).forEach(r => r.close()); stores.splice(0).forEach(s => s.close()); roots.splice(0).forEach(r => rmSync(r, { recursive: true, force: true })); });
function store(root = mkdtempSync(join(tmpdir(), 'stats-resources-'))) { if (!roots.includes(root)) roots.push(root); const s = new StatsStore(root, { initialize: true }); stores.push(s); if (!s.authority()) s.admit('fixture-admission', null, { fixture: method }, false, 'e'.repeat(64)); return s; }
const key = 'characters/silent/room-costs.json', method = 'a'.repeat(64), code = 'b'.repeat(40);
function input(s: StatsStore, request: string, content = '{ "fixture": [null, 0, false], "a/b": {"~": "原字节"} }\n'): StatsPublication {
 return { request, base: s.current(), files: { [key]: Buffer.from(content), 'common/move-model.json': Buffer.from('{"fixture":{}}\n') }, methods: { fixture: method }, admission_epoch: s.authority()!.epoch, dependencies: {}, provenance: { source: 'fixed-fixture', sample_scope: 'synthetic' } };
}
function bundle(version: string): StatsBundle { return { schema: 'knowledge-resource-bundle-v1', stats_version: version, k1_version: 'K1-' + 'c'.repeat(64), operational_view_sha: null, capabilities_sha: method, dependencies: {} }; }
function resources(s: StatsStore, run: string, version: string, backend: 'sqlite' | 'json' = 'sqlite') {
 const binding = s.bind(run, code, bundle(version), backend), r = new KnowledgeResources(s.root, binding); readers.push(r); return r;
}

it('publishes whole releases atomically and pins both backends and resumed runs across later publications', () => {
 const s = store(), c = input(s, 'first'), v1 = s.publish(c);
 const a = resources(s, 'old-run', v1), j = resources(s, 'json-run', v1, 'json');
 expect(a.readBytes(key)).toEqual(c.files[key]); expect(j.readBytes(key)).toEqual(c.files[key]);
 expect(a.readJson(key)).toEqual(j.readJson(key)); expect(a.query(key, '/a~1b/~0')).toBe('原字节');
 const v2 = s.publish(input(s, 'second', '{"fixture":[1]}'));
 expect(a.readBytes(key)).toEqual(c.files[key]); expect(s.bind('old-run', 'd'.repeat(40), bundle(v2), 'json').bundle.stats_version).toBe(v1);
 expect(resources(s, 'new-run', v2).readJson(key)).toEqual({ fixture: [1] });
 expect(a.list('characters/silent/')).toEqual([key]);
 expect(a.has('characters/ironclad/room-costs.json')).toBe(false);
 expect(() => a.readJson('characters/ironclad/room-costs.json')).toThrow('absent');
 expect(() => { a.identity.bundle.stats_version = v2; }).toThrow();
});

it('never advances current when preparation or any write before pointer completion fails', () => {
 const s = store(), v = s.publish(input(s, 'baseline'));
 expect(() => s.publish(input(s, 'prepare-failure', '{}'), { beforeCommit() { throw Error('prepare fixture'); } })).toThrow('prepare fixture');
 expect(s.current()).toBe(v);
 expect(s.status('prepare-failure').state).toBe('prepared');
 expect(() => s.publish(input(s, 'commit-failure', '{}'), { beforePointer() { throw Error('transaction fixture'); } })).toThrow('transaction fixture');
 expect(s.current()).toBe(v);
 expect(s.status('commit-failure').state).toBe('prepared');
 expect(s.db.prepare('SELECT count(*) n FROM stats_publications').get()!['n']).toBe(1);
 const c = input(s, 'retry', '{}'), v2 = s.publish(c);
 expect(s.publish(c)).toBe(v2);
 s.rollback(v, 'back'); expect(s.publish(c)).toBe(v2); expect(s.current()).toBe(v);
 expect(() => s.publish({ ...c, provenance: { changed: true } })).toThrow('identity reused');
});

it('rejects a stale writer without mixing its members into the winner and permits an old read transaction', () => {
 const a = store(), b = store(a.root), c = input(a, 'old-candidate');
 const first = a.publish(c), x = input(a, 'winner', '{}'), y = input(b, 'loser', '{"fixture":false}');
 b.db.exec('BEGIN'); expect(b.current()).toBe(first);
 const next = a.publish(x); expect(b.current()).toBe(first); b.db.exec('COMMIT');
 expect(() => b.publish(y)).toThrow('base conflict'); expect(a.current()).toBe(next);
 expect(resources(a, 'winner-run', next).readJson(key)).toEqual({});
});

it('rejects corrupt DB bytes, invalid keys, nonfinite metadata and a reused rollback ID', () => {
 const s = store(), c = input(s, 'valid'), v = s.publish(c);
 expect(() => s.publish({ ...input(s, 'bad-key'), files: { '../secret.json': Buffer.from('{}') } })).toThrow('unregistered');
 expect(() => s.publish({ ...input(s, 'pending'), files: { 'characters/silent/pending/fixture.json': Buffer.from('{}') } })).toThrow('unregistered');
 expect(() => s.publish({ ...input(s, 'infinite'), provenance: { count: Infinity } })).toThrow('unsupported');
 const expected = s.manifest(v).files[key]!;
 s.db.prepare('UPDATE stats_objects SET body=?,byte_length=? WHERE sha256=?').run(Buffer.from('{}'), 2, expected);
 expect(() => s.read(v, key)).toThrow('checksum');
 const r = resources(s, 'corrupt-run', v); expect(() => r.readBytes(key)).toThrow('checksum');
 const v2 = s.publish(input(s, 'other', '{"fixture":1}')); s.rollback(v, 'back');
 expect(() => s.rollback(v2, 'back')).toThrow('identity reused');
});

it('uses a prepared JSON backend without opening a missing stats DB and refuses mirror tampering', () => {
 const s = store(), v = s.publish(input(s, 'fallback')), binding = s.bind('fallback-run', code, bundle(v), 'json');
 const root = s.root; stores.splice(stores.indexOf(s), 1); s.close();
 renameSync(join(root, 'stats.sqlite'), join(root, 'saved.sqlite'));
 const r = new KnowledgeResources(root, binding); readers.push(r); expect(r.query(key, '/fixture/1')).toBe(0);
 expect(() => new KnowledgeResources(root, { ...binding, backend: 'sqlite' })).toThrow('unavailable');
 writeFileSync(join(root, 'json', v, key), '{}');
 const other = new KnowledgeResources(root, binding); readers.push(other); expect(() => other.readBytes(key)).toThrow('checksum');
 expect(readFileSync(join(root, 'json', v, 'manifest.json'), 'utf8')).toBe(statsCanonical(JSON.parse(readFileSync(join(root, 'json', v, 'manifest.json'), 'utf8'))));
 expect(statsSha(Buffer.from('fixture'))).toHaveLength(64);
});

it('restores all committed versions and original bindings from a consistent backup into a new directory', async () => {
 const s = store(), v1 = s.publish(input(s, 'first'));
 const original = s.bind('saved-run', code, bundle(v1), 'json');
 const v2 = s.publish(input(s, 'second', '{}')), backup = join(s.root, 'backup.sqlite');
 await s.backup(backup);
 const destination = join(s.root, 'restored'), restored = StatsStore.restore(backup, destination); stores.push(restored);
 expect(restored.current()).toBe(v2); expect(restored.bind('saved-run', code, bundle(v2), 'sqlite')).toEqual(original);
 expect(restored.read(v1, key)).toEqual(input(s, 'unused').files[key]);
 expect(() => StatsStore.restore(backup, destination)).toThrow('must be new');
 await expect(s.backup(backup)).rejects.toThrow('exists');
});

it('requires explicit initialization through the CLI and never rebuilds an absent original runtime', async () => {
 const root = mkdtempSync(join(tmpdir(), 'stats-cli-')); roots.push(root);
 const missing = join(root, 'missing');
 await expect(statsMain(['current', '--runtime', missing])).rejects.toThrow();
 expect(existsSync(missing)).toBe(false);
 expect(await statsMain(['init', '--runtime', missing])).toEqual({ version: null });
 expect(await statsMain(['status', '--runtime', missing, '--request', 'not-published'])).toEqual({ request: 'not-published', state: 'absent' });
 await expect(statsMain(['current', '--runtime', missing, '--runtime', missing])).rejects.toThrow('unique');
});

it('checks the engineering epoch again inside the final CAS and never replays old authority over a successor', () => {
 const s = store(), v1 = s.publish(input(s, 'baseline')), c = input(s, 'stale', '{}'), old = s.authority()!;
 let blocked = '';
 expect(() => s.publish(c, { beforeCommit() { blocked = s.admit('source-start', old.epoch, old.methods, true, 'e'.repeat(64)); } })).toThrow('authority');
 expect(s.current()).toBe(v1); expect(s.status('stale').state).toBe('prepared');
 const ready = s.admit('source-finish', blocked, old.methods, false, 'e'.repeat(64));
 expect(s.admit('source-start', old.epoch, old.methods, true, 'e'.repeat(64))).toBe(blocked);
 expect(s.authority()!.epoch).toBe(ready);
 expect(() => s.publish(c)).toThrow('authority');
 expect(() => s.admit('wrong-CAS', old.epoch, old.methods, false, 'e'.repeat(64))).toThrow('CAS conflict');
 expect(s.publish(input(s, 'fresh', '{}'))).not.toBe(v1);
});

it('does not advance current when a deduplicated original object has become corrupt', () => {
 const s = store(), first = s.publish(input(s, 'dedupe-first', '{}'));
 const digest = s.manifest(first).files[key]!;
 s.db.prepare('UPDATE stats_objects SET body=?,byte_length=? WHERE sha256=?').run(Buffer.from('[]'), 2, digest);
 expect(() => s.publish(input(s, 'dedupe-corrupt', '{}'))).toThrow('checksum');
 expect(s.current()).toBe(first);
});

it('caches pinned manifest and metadata without SQL on hot stat calls while keeping authority live', () => {
 const s = store(), version = s.publish(input(s, 'metadata-cache'));
 const first = s.manifest(version);
 expect(s.manifest(version)).toBe(first);
 expect(() => { first.files[key] = '0'.repeat(64); }).toThrow();
 const r = resources(s, 'metadata-reader', version);
 const query = vi.spyOn(StatsStore.prototype, 'byteLength');
 try {
  const size = r.byteLength(key);
  for (let i = 0; i < 20; i++) expect(r.byteLength(key)).toBe(size);
  expect(query).toHaveBeenCalledTimes(1);
 } finally { query.mockRestore(); }
 const old = s.authority()!;
 s.admit('cache-must-not-pin-authority', old.epoch, old.methods, true, 'e'.repeat(64));
 expect(s.authority()!.blocked).toBe(true);
 expect(() => s.publish(input(s, 'blocked-after-cache'))).toThrow('authority');
});

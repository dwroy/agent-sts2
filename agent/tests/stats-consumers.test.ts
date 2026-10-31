import { mkdtempSync, mkdirSync, readFileSync as nativeRead, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, it, vi } from 'vitest';
import { StatsStore } from '../src/knowledge/runtime/stats-store.js';
import type { AssetsSelection } from '../src/knowledge/assets-binding.js';

const roots: string[] = [], stores: StatsStore[] = [];
let close: (() => void) | null = null;
afterEach(() => { close?.(); close = null; stores.splice(0).forEach(s => s.close()); vi.unstubAllEnvs(); vi.doUnmock('../src/core/paths.js'); vi.resetModules(); roots.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })); });
const key = 'characters/silent/room-costs.json';
const fixture = { by_asc: { '10': { '1': { RestSite: { n: 5, mean: 2, median: 2, p75: 3 } } } } };

async function setup(mode: AssetsSelection['mode']) {
 const root = mkdtempSync(join(tmpdir(), 'stats-consumers-')); roots.push(root);
 const knowledge = join(root, 'knowledge'), runtime = join(root, 'runtime');
 mkdirSync(join(knowledge, 'characters/silent'), { recursive: true }); mkdirSync(join(knowledge, 'common'), { recursive: true });
 writeFileSync(join(knowledge, key), '{"stale_editable_fixture":true}');
 const store = new StatsStore(runtime, { initialize: true }); stores.push(store);
 const epoch = store.admit('fixture-admission', null, { fixture: 'a'.repeat(64) }, false, 'e'.repeat(64));
 const raw = Buffer.from(JSON.stringify(fixture));
 const version = store.publish({ request: 'fixture', base: null, methods: { fixture: 'a'.repeat(64) }, admission_epoch: epoch, dependencies: {}, provenance: { source: 'synthetic' },
  files: { [key]: raw, 'common/move-model.json': Buffer.from('{"fixture":{}}') } });
 const binding = store.bind('fixture-run', 'a'.repeat(40), { schema: 'knowledge-resource-bundle-v1', stats_version: version,
  k1_version: null, operational_view_sha: null, capabilities_sha: 'b'.repeat(64), dependencies: {} }, mode === 'sqlite' ? 'sqlite' : 'json');
 const log = join(root, 'shadow.jsonl');
 const selection: AssetsSelection = { directory: runtime, binding, mode, ...(mode === 'shadow' ? { shadow_log: log } : {}) };
 vi.resetModules(); vi.stubEnv('CHARACTER', 'silent'); vi.stubEnv('STS2_ASSETS_SELECTION', JSON.stringify(selection));
 vi.stubEnv('STS2_KNOWLEDGE_SNAPSHOT', ''); vi.stubEnv('STS2_KNOWLEDGE_VERSION', '');
 vi.stubEnv('STS2_DATA_SNAPSHOT', ''); vi.stubEnv('STS2_DATA_VERSION', ''); vi.stubEnv('STS2_DATA_MANAGED_PATHS', '[]');
 vi.doMock('../src/core/paths.js', async () => ({ ...await vi.importActual('../src/core/paths.js'), KNOWLEDGE_DIR: knowledge }));
 const fs = await import('../src/knowledge/resource-fs.js'); close = fs.closeBoundResources;
 return { root, knowledge, store, version, raw, fs, log };
}

for (const backend of ['sqlite', 'json'] as const) it(`reads actual room consumers and metadata from ${backend}, with no editable A files`, async () => {
 const { knowledge, raw, fs } = await setup(backend);
 expect(fs.readFileSync(join(knowledge, key))).toEqual(raw);
 unlinkSync(join(knowledge, key));
 expect(fs.existsSync(join(knowledge, key))).toBe(true);
 expect(fs.statSync(join(knowledge, key)).size).toBe(raw.length);
 expect(fs.statSync(join(knowledge, key)).isFile()).toBe(true);
 expect(fs.realpathSync(join(knowledge, key))).toBe(join(knowledge, key));
 expect(fs.readdirSync(join(knowledge, 'common'))).toContain('move-model.json');
 expect(fs.readdirSync(join(knowledge, 'common'), { withFileTypes: true }).find(e => e.name === 'move-model.json')!.isFile()).toBe(true);
 const { measuredRoomExact } = await import('../src/knowledge/room-costs.js');
 expect(measuredRoomExact(10, 1, 'RestSite')).toEqual(fixture.by_asc['10']['1'].RestSite);
 expect(fs.existsSync(join(knowledge, 'characters/ironclad/room-costs.json'))).toBe(false);
 expect(() => fs.readFileSync(join(knowledge, 'characters/ironclad/room-costs.json'))).toThrow('absent');
});

it('does not convert corrupt selected data into empty knowledge in an existing consumer catch', async () => {
 const { store, version } = await setup('sqlite');
 const digest = store.manifest(version).files[key]!;
 store.db.prepare('UPDATE stats_objects SET body=?,byte_length=? WHERE sha256=?').run(Buffer.from('{}'), 2, digest);
 const { measuredRoomExact } = await import('../src/knowledge/room-costs.js');
 expect(() => measuredRoomExact(10, 1, 'RestSite')).toThrow('checksum');
});

it('shadow records a DB failure and keeps the authoritative JSON result unchanged', async () => {
 const { store, version, fs, knowledge, raw, log } = await setup('shadow');
 const digest = store.manifest(version).files[key]!;
 store.db.prepare('UPDATE stats_objects SET body=?,byte_length=? WHERE sha256=?').run(Buffer.from('{}'), 2, digest);
 expect(fs.readFileSync(join(knowledge, key))).toEqual(raw);
 const event = JSON.parse(nativeRead(log, 'utf8').trim());
 expect(event.equal).toBe(false); expect(event.error_type).toBe('Error');
 expect(event.run_key).toBe('fixture-run'); expect(Number(event.json_ns)).toBeGreaterThanOrEqual(0);
});

it('does not treat a missing declared JSON object as optional empty knowledge', async () => {
 const { root, version } = await setup('json');
 unlinkSync(join(root, 'runtime/json', version, key));
 const { measuredRoomExact } = await import('../src/knowledge/room-costs.js');
 expect(() => measuredRoomExact(10, 1, 'RestSite')).toThrow('bound fallback resource unavailable');
});

it('does not use stale source metadata when a declared JSON mirror is missing', async () => {
 const { root, version, fs, knowledge } = await setup('json');
 unlinkSync(join(root, 'runtime/json', version, key));
 expect(() => fs.statSync(join(knowledge, key))).toThrow('bound fallback metadata unavailable');
});

it('audits an authoritative shadow read failure instead of leaving a successful prefix', async () => {
 const { root, version, fs, knowledge, log } = await setup('shadow');
 fs.readFileSync(join(knowledge, 'common/move-model.json'));
 unlinkSync(join(root, 'runtime/json', version, key));
 expect(() => fs.readFileSync(join(knowledge, key))).toThrow('bound fallback resource unavailable');
 fs.closeBoundResources();
 const rows = nativeRead(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
 expect(rows[0].equal).toBe(true);
 expect(rows[1]).toMatchObject({ sequence: 2, equal: false, outcome: 'authority-error', error_type: 'authority:Error' });
 expect(rows[2]).toMatchObject({ schema: 'stats-shadow-session-v1', reads: 2, write_failures: 0 });
});

it('keeps matching optional absence as absence on both shadow backends', async () => {
 const { fs, knowledge, log } = await setup('shadow');
 expect(() => fs.readFileSync(join(knowledge, 'characters/ironclad/room-costs.json'))).toThrow('absent');
 fs.closeBoundResources();
 const event = JSON.parse(nativeRead(log, 'utf8').trim().split('\n')[0]!);
 expect(event).toMatchObject({ outcome: 'absent', equal: true, error_type: null, bytes: null });
});

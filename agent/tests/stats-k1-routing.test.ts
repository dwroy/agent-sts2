import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, it, vi } from 'vitest';
import { KnowledgeStore } from '../src/knowledge/runtime/store.js';

const roots: string[] = [];
afterEach(() => { vi.unstubAllEnvs(); vi.doUnmock('../src/core/paths.js'); vi.resetModules(); roots.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })); });

it('routes a bound legacy strategy file reader to 173 frozen fixture members instead of 116 editable members', async () => {
 const root = mkdtempSync(join(tmpdir(), 'stats-k1-routing-')); roots.push(root);
 const legacy = join(root, 'knowledge'), version = 'K1-' + 'a'.repeat(64), snapshot = join(root, 'runtime/snapshots', version);
 const relative = 'characters/silent/strategy-entries.json';
 const document = (count: number) => JSON.stringify({ entries: Array.from({ length: count }, (_, i) => ({ id: 'fixture-' + i })) });
 for (const [dir, count] of [[legacy, 116], [snapshot, 173]] as const) {
  mkdirSync(join(dir, 'characters/silent'), { recursive: true }); writeFileSync(join(dir, relative), document(count));
 }
 vi.resetModules();
 vi.stubEnv('STS2_KNOWLEDGE_SNAPSHOT', snapshot); vi.stubEnv('STS2_KNOWLEDGE_VERSION', version);
 vi.stubEnv('STS2_DATA_SNAPSHOT', ''); vi.stubEnv('STS2_DATA_VERSION', ''); vi.stubEnv('STS2_DATA_MANAGED_PATHS', '[]');
 vi.doMock('../src/core/paths.js', () => ({ KNOWLEDGE_DIR: legacy }));
 const { knowledgeFile } = await import('../src/knowledge/files.js');
 const path = knowledgeFile(legacy, 'strategy-entries.json', 'silent');
 expect(path).toBe(join(snapshot, relative)); expect(JSON.parse(readFileSync(path, 'utf8')).entries).toHaveLength(173);
 expect(JSON.parse(readFileSync(join(legacy, relative), 'utf8')).entries).toHaveLength(116);
 // Explicit research directories must not be redirected into the production binding.
 expect(knowledgeFile(join(root, 'research'), 'strategy-entries.json', 'silent')).toBe(join(root, 'research', relative));
});

it('binds the bundle-selected historical K1 and rejects a conflicting resume without changing current', () => {
 const root = mkdtempSync(join(tmpdir(), 'stats-selected-k1-')); roots.push(root);
 const store = new KnowledgeStore(root);
 try {
  const publish = (id: string) => {
   store.submit({ schema: 'knowledge-candidate-v1', id, base: store.current(), character: 'silent', source: 'synthetic fixed fixture',
    files: { 'characters/silent/experience.json': JSON.stringify({ version: id, entries: [] }) } });
   store.validate(id); return store.publish(id);
  };
  const first = publish('fixture-old'), second = publish('fixture-new');
  expect(store.bind('bundle-run', 'fixed-code', first)['version']).toBe(first);
  expect(() => store.bind('bundle-run', 'fixed-code', second)).toThrow('binding mismatch');
  expect(store.current()).toBe(second);
  expect(store.bind('default-run', 'fixed-code')['version']).toBe(second);
  expect(() => store.bind('unknown-run', 'fixed-code', 'K1-' + '0'.repeat(64))).toThrow('unavailable');
 } finally { store.close(); }
});

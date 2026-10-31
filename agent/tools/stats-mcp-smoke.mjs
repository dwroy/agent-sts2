/** Real child readback; run with --experimental-transform-types and stats-loader.mjs. No models/mod. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { StatsStore, statsSha } from '../src/knowledge/runtime/stats-store.ts';

const source = fileURLToPath(new URL('../..', import.meta.url));
const files = ['agent/src/core/paths.ts', 'agent/src/knowledge/files.ts', 'agent/src/knowledge/runtime-paths.ts',
 'agent/src/knowledge/runtime-data.ts', 'agent/src/knowledge/assets-binding.ts', 'agent/src/knowledge/resource-fs.ts',
 'agent/src/knowledge/resources.ts', 'agent/src/knowledge/runtime/stats-store.ts', 'agent/src/knowledge/runtime/stats-schema.ts',
 'agent/src/knowledge/runtime/sqlite-version.ts', 'agent/src/brain/engines/process.ts', 'agent/src/brain/tools/mcp-launch.ts'];
const scratch = mkdtempSync(join(tmpdir(), 'stats-mcp-smoke-'));
const saved = { ...process.env }, reports = [];
function put(path, body) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, body); }
const url = path => pathToFileURL(path).href;
try {
 for (const mode of ['sqlite', 'json', 'd1']) {
  const root = join(scratch, mode), knowledge = join(root, 'knowledge');
  for (const name of files) { const target = join(root, name); mkdirSync(dirname(target), { recursive: true }); copyFileSync(join(source, name), target); }
  put(join(root, 'package.json'), '{"type":"module"}');
  for (const name of Object.keys(process.env)) if (name.startsWith('STS2_KNOWLEDGE_') || name.startsWith('STS2_DATA_') || name.startsWith('STS2_ASSETS_')) delete process.env[name];
  process.env.CHARACTER = 'silent';
  process.env.JEV_API_KEY = 'synthetic-never-forward';
  const version = 'K1-' + statsSha('synthetic-k1-' + mode);
  const snapshot = join(root, 'data/formal/snapshots', version), key = 'characters/silent/room-costs.json';
  const strategies = count => JSON.stringify({ entries: Array.from({ length: count }, (_, i) => ({ id: 'synthetic-' + i })) });
  put(join(knowledge, 'characters/silent/strategy-entries.json'), strategies(116));
  put(join(snapshot, 'characters/silent/strategy-entries.json'), strategies(173));
  put(join(knowledge, key), '{"source":"stale editable fixture"}');
  process.env.STS2_KNOWLEDGE_SNAPSHOT = snapshot;
  process.env.STS2_KNOWLEDGE_VERSION = version;
  process.env.STS2_KNOWLEDGE_RUN_KEY = 'fixture-run';
  const expected = { source: 'synthetic pinned ' + mode, n: 7 }, raw = JSON.stringify(expected);
  if (mode === 'd1') {
   const directory = join(root, 'data/fixed'), dataVersion = 'D1-' + statsSha('synthetic-d1');
   put(join(directory, 'data-snapshots', dataVersion, key), raw);
   Object.assign(process.env, { STS2_DATA_RUNTIME: directory, STS2_DATA_VERSION: dataVersion,
    STS2_DATA_SNAPSHOT: join(directory, 'data-snapshots', dataVersion), STS2_DATA_RUN_KEY: 'fixture-data-run',
    STS2_DATA_MANAGED_PATHS: JSON.stringify([key]), STS2_DATA_KNOWLEDGE_DEPENDENCIES: '{}' });
  } else {
   const directory = join(root, 'data/stats'), store = new StatsStore(directory, { initialize: true });
   try {
    const methods = { fixture: 'a'.repeat(64) }, epoch = store.admit('fixture-admit', null, methods, false, 'e'.repeat(64));
    const statsVersion = store.publish({ request: 'fixture', base: null, files: { [key]: Buffer.from(raw) }, methods,
     admission_epoch: epoch, dependencies: {}, provenance: { source: 'synthetic MCP transport fixture' } });
    const bundle = { schema: 'knowledge-resource-bundle-v1', stats_version: statsVersion, k1_version: version,
     operational_view_sha: null, capabilities_sha: 'b'.repeat(64), dependencies: {} };
    const binding = store.bind('fixture-run', 'c'.repeat(40), bundle, mode);
    process.env.STS2_ASSETS_SELECTION = JSON.stringify({ directory, binding, mode });
   } finally { store.close(); }
   if (mode === 'json') rmSync(join(directory, 'stats.sqlite'));
  }
  const { mcpLaunchSpec } = await import(url(join(root, 'agent/src/brain/tools/mcp-launch.ts')));
  const { agentEnv } = await import(url(join(root, 'agent/src/brain/engines/process.ts')));
  const spec = mcpLaunchSpec({ ascension: 10, knowledgeDir: knowledge, logsDir: join(root, 'logs') });
  assert.equal(spec.env.CHARACTER, 'silent');
  assert.equal(spec.env.STS2_KNOWLEDGE_VERSION, version);
  assert(!Object.hasOwn(spec.env, 'JEV_API_KEY'));
  assert.deepEqual(mcpLaunchSpec({ ascension: 10, knowledgeDir: join(root, 'research'), logsDir: root }).env, {});
  const childCode = `
   import { knowledgeFile, KNOWLEDGE_DIR, knowledgeCharacter } from ${JSON.stringify(url(join(root, 'agent/src/knowledge/files.ts')))};
   import { readFileSync, closeBoundResources } from ${JSON.stringify(url(join(root, 'agent/src/knowledge/resource-fs.ts')))};
   const strategies = JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, 'strategy-entries.json'), 'utf8'));
   const stats = JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, 'room-costs.json'), 'utf8'));
   process.stdout.write(JSON.stringify({ count: strategies.entries.length, character: knowledgeCharacter(), stats,
     keyAbsent: !Object.hasOwn(process.env, 'JEV_API_KEY') })); closeBoundResources();`;
  const child = spawnSync(process.execPath, ['--experimental-transform-types', '--import', join(source, 'agent/tools/stats-loader.mjs'), '--input-type=module', '-e', childCode],
   { env: { ...agentEnv(), ...spec.env }, cwd: root, encoding: 'utf8', timeout: 10_000 });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), { count: 173, character: 'silent', stats: expected, keyAbsent: true });
  assert.equal(JSON.parse(readFileSync(join(knowledge, 'characters/silent/strategy-entries.json'), 'utf8')).entries.length, 116);
  reports.push({ mode, synthetic_k1_members: 173, editable_members: 116, resource_exact: true, secret_filtered: true,
   custom_directory_isolated: true, json_with_database_absent: mode === 'json' });
 }
 console.log(JSON.stringify({ scope: 'sanitized MCP environment and legacy/S1/D1 file reader in a real child; synthetic fixtures, not production K1 adoption',
  source_sha256: Object.fromEntries(files.map(name => [name, statsSha(readFileSync(join(source, name)))])), cases: reports }));
} finally {
 for (const name of Object.keys(process.env)) if (!(name in saved)) delete process.env[name];
 Object.assign(process.env, saved);
 rmSync(scratch, { recursive: true, force: true });
}

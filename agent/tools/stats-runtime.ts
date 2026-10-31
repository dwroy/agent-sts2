/** Explicit local CLI; initialization, frozen input and version selection are never implicit. */
import { lstatSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { StatsStore, type StatsBundle, type StatsPublication } from '../src/knowledge/runtime/stats-store.js';
import { statsResourceKey } from '../src/knowledge/runtime/stats-schema.js';

export async function main(argv = process.argv.slice(2)): Promise<unknown> {
 const [action, ...rest] = argv, flags: Record<string, string> = {};
 for (let i = 0; i < rest.length; i += 2) {
  const key = rest[i], value = rest[i + 1];
  if (!key?.startsWith('--') || !value || value.startsWith('--') || Object.hasOwn(flags, key.slice(2))) throw Error('expected unique --name value');
  flags[key.slice(2)] = value;
 }
 const required = (key: string): string => { if (!flags[key]) throw Error('--' + key + ' required'); return flags[key]!; };
 const runtime = resolve(required('runtime'));
 if (action === 'restore') { const restored = StatsStore.restore(resolve(required('backup')), runtime); try { return { version: restored.current() }; } finally { restored.close(); } }
 const readonly = ['current', 'status', 'manifest', 'read', 'verify', 'backup', 'authority'].includes(action ?? '');
 const store = new StatsStore(runtime, { initialize: action === 'init', readOnly: readonly });
 try {
  switch (action) {
   case 'init': case 'current': return { version: store.current() };
   case 'status': return store.status(required('request'));
   case 'authority': return store.authority();
   case 'admit': {
    const body = JSON.parse(readFileSync(required('record'), 'utf8')) as { request: string; expected: string | null; methods: Record<string, string>; blocked: boolean; evidence_sha256: string };
    return { epoch: store.admit(body.request, body.expected, body.methods, body.blocked, body.evidence_sha256) };
   }
   case 'manifest': return store.manifest(required('version'));
   case 'verify': store.verifyExport(required('version')); return { version: flags['version'], verified: true };
   case 'backup': await store.backup(resolve(required('destination'))); return { backed_up: true };
   case 'rollback': return { version: store.rollback(required('version'), required('request')) };
   case 'seed': {
    if (store.current() !== null && store.status(required('request')).state !== 'published') throw Error('statistics seed requires an empty explicitly initialized database');
    const source = resolve(required('source')), files: Record<string, Buffer> = {};
    if (realpathSync(source) !== source) throw Error('redirected frozen seed');
    const visit = (relative: string) => {
     for (const entry of readdirSync(join(source, 'knowledge', relative), { withFileTypes: true })) {
      const key = relative ? relative + '/' + entry.name : entry.name;
      if (entry.isSymbolicLink()) throw Error('linked frozen seed');
      if (entry.isDirectory() && !['builders', 'schemas', 'pending', 'build-statistics-v1'].includes(entry.name)) visit(key);
      else if (entry.isFile() && statsResourceKey(key)) files[key] = readFileSync(join(source, 'knowledge', key));
     }
    };
    visit('');
    const report = join(source, 'notes/monster-db-check.md');
    try { if (lstatSync(report).isSymbolicLink()) throw Error('linked frozen report'); files['reports/monster-db-check.md'] = readFileSync(report); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    return { version: store.publish({ request: required('request'), base: null, files,
     methods: JSON.parse(readFileSync(required('methods'), 'utf8')) as Record<string, string>,
     dependencies: JSON.parse(readFileSync(required('dependencies'), 'utf8')) as Record<string, string>,
     provenance: { source: 'explicit-frozen-migration', original_source: source } }, {}, { migration: true }) };
   }
   case 'publish': {
    const input = JSON.parse(readFileSync(required('candidate'), 'utf8')) as Omit<StatsPublication, 'files'> & { files: Record<string, string>; directory: string };
    const directory = resolve(input.directory);
    if (!isAbsolute(input.directory) || realpathSync(directory) !== directory) throw Error('invalid frozen statistics directory');
    const files: Record<string, Buffer> = {};
    for (const [key, source] of Object.entries(input.files)) {
     if (isAbsolute(source) || source.split(/[\\/]/).some(part => part === '..' || part === '.git' || part.startsWith('.env'))) throw Error('unsafe frozen statistics path');
     const path = join(directory, source);
     if (realpathSync(path) !== path || !path.startsWith(directory + '/')) throw Error('redirected frozen statistics input');
     files[key] = readFileSync(path);
    }
    return { version: store.publish({ ...input, files }) };
   }
   case 'bind': {
    const bundle = JSON.parse(readFileSync(required('bundle'), 'utf8')) as StatsBundle;
    const backend = required('backend'); if (backend !== 'sqlite' && backend !== 'json') throw Error('invalid statistics backend');
    return store.bind(required('run'), required('code'), bundle, backend);
   }
   case 'read': {
    const bytes = store.read(required('version'), required('key'));
    if (!bytes) throw Error('statistics resource absent');
    writeFileSync(required('destination'), bytes, { flag: 'wx', mode: 0o600 });
    return { version: flags['version'], key: flags['key'], bytes: bytes.length };
   }
   default: throw Error('unknown statistics command');
  }
 } finally { store.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
 main().then(result => console.log(JSON.stringify(result))).catch(error => { console.error(String(error)); process.exitCode = 1; });
}

/** Immutable S1 releases. Computation and fallback exports precede the short CAS transaction. */
import { createHash } from 'node:crypto';
import { backup, DatabaseSync } from 'node:sqlite';
import { chmodSync, closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { safeSQLiteVersion } from './sqlite-version.js';
import { STATS_SCHEMA, STATS_SCHEMA_VERSION, statsResourceKey } from './stats-schema.js';

export const statsSha = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
export function statsCanonical(value: unknown): string {
 if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
 if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
 if (Array.isArray(value)) return '[' + value.map(statsCanonical).join(',') + ']';
 if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + statsCanonical((value as Record<string, unknown>)[key])).join(',') + '}';
 throw Error('unsupported statistics metadata');
}
function id(value: string): void { if (!/^[A-Za-z0-9][A-Za-z0-9_.:+-]{0,180}$/.test(value)) throw Error('invalid statistics request identity'); }
function versionId(value: string): void { if (!/^S1-[a-f0-9]{64}$/.test(value)) throw Error('invalid statistics version'); }
function syncDirectory(path: string): void { const fd = openSync(path, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); } }
function durable(path: string, bytes: Uint8Array): void {
 mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
 if (lstatSync(dirname(path)).isSymbolicLink() || realpathSync(dirname(path)) !== resolve(dirname(path))) throw Error('redirected statistics export');
 if (existsSync(path)) {
  if (lstatSync(path).isSymbolicLink() || !readFileSync(path).equals(Buffer.from(bytes))) throw Error('statistics export checksum mismatch');
  return;
 }
 const fd = openSync(path, 'wx', 0o600);
 try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
 syncDirectory(dirname(path));
}

export interface StatsManifest {
 schema: 'stats-release-v1'; files: Record<string, string>; methods: Record<string, string>;
 dependencies: Record<string, string>;
}
export interface StatsPublication {
 request: string; base: string | null; files: Record<string, Uint8Array>;
 methods: Record<string, string>; dependencies: Record<string, string>; provenance: Record<string, unknown>;
 admission_epoch?: string; executed_methods?: Record<string, string>;
}
export interface StatsAuthority { epoch: string; methods: Record<string, string>; blocked: boolean; evidence_sha256: string }
export interface StatsBundle {
 schema: 'knowledge-resource-bundle-v1'; stats_version: string; k1_version: string | null;
 operational_view_sha: string | null; capabilities_sha: string; dependencies: Record<string, string>;
}
export interface StatsBinding { run_key: string; bundle_sha: string; code_sha: string; backend: 'sqlite' | 'json'; bundle: StatsBundle }

export class StatsStore {
 readonly db: DatabaseSync;
 readonly root: string;
 private readonly manifests = new Map<string, StatsManifest>();
 constructor(directory: string, options: { initialize?: boolean; readOnly?: boolean } = {}) {
  this.root = resolve(directory);
  if (options.initialize) mkdirSync(this.root, { recursive: true, mode: 0o700 });
  if (realpathSync(this.root) !== this.root || /^\/mnt\/(?:[a-z](?:\/|$)|wsl\/)/.test(this.root) || this.root.startsWith('//')) throw Error('statistics runtime must be host-local without redirects');
  const file = join(this.root, 'stats.sqlite');
  if (!existsSync(file) && !options.initialize) throw Error('original statistics database unavailable');
  if (existsSync(file) && lstatSync(file).isSymbolicLink()) throw Error('redirected statistics database');
  this.db = new DatabaseSync(file, { readOnly: options.readOnly ?? false });
  try {
   if (!safeSQLiteVersion(String(this.db.prepare('SELECT sqlite_version() v').get()!['v']))) throw Error('statistics SQLite lacks WAL-reset fix');
   this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
   if (options.readOnly) this.db.exec('PRAGMA query_only=ON');
   const version = Number(this.db.prepare('PRAGMA user_version').get()!['user_version']);
   if (version === 0 && options.initialize && !options.readOnly) {
    if (Number(this.db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='table'").get()!['n'])) throw Error('unknown statistics schema');
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; BEGIN IMMEDIATE');
    try { this.db.exec(STATS_SCHEMA + `PRAGMA user_version=${STATS_SCHEMA_VERSION}; COMMIT;`); }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
   } else if (version !== STATS_SCHEMA_VERSION) throw Error('unknown statistics schema');
   if (!options.readOnly) this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL');
  } catch (error) { this.db.close(); throw error; }
 }
 close(): void { this.db.close(); this.manifests.clear(); }
 current(): string | null { return this.db.prepare("SELECT value FROM stats_metadata WHERE key='current'").get()?.['value'] as string | undefined ?? null; }
 authority(): StatsAuthority | null {
  const row = this.db.prepare('SELECT body FROM stats_authority WHERE singleton=1').get();
  return row ? JSON.parse(String(row['body'])) as StatsAuthority : null;
 }
 /** The existing engineering publication owner supplies the checked source receipt. */
 admit(request: string, expected: string | null, methods: Record<string, string>, blocked: boolean, evidence: string): string {
  id(request);
  if (expected !== null && !/^[a-f0-9]{64}$/.test(expected) || !/^[a-f0-9]{64}$/.test(evidence) || typeof blocked !== 'boolean'
   || Object.entries(methods).some(([key, digest]) => !/^[a-z][a-z0-9-]*$/.test(key) || !/^[a-f0-9]{64}$/.test(digest))) throw Error('invalid statistics engineering authority');
  const signature = statsCanonical({ request, expected, methods, blocked, evidence });
  const digest = statsSha(signature), epoch = statsSha('stats-method-authority-v1:' + signature);
  const body = statsCanonical({ epoch, methods, blocked, evidence_sha256: evidence });
  this.db.exec('BEGIN IMMEDIATE');
  try {
   const prior = this.db.prepare('SELECT digest,epoch FROM stats_authority_events WHERE request=?').get(request);
   if (prior) {
    if (prior['digest'] !== digest) throw Error('statistics authority request reused');
    this.db.exec('COMMIT'); return String(prior['epoch']);
   }
   if ((this.authority()?.epoch ?? null) !== expected) throw Error('statistics authority CAS conflict');
   this.db.prepare('INSERT INTO stats_authority_events VALUES(?,?,?,?)').run(request, digest, epoch, body);
   this.db.prepare('INSERT INTO stats_authority VALUES(1,?,?) ON CONFLICT(singleton) DO UPDATE SET epoch=excluded.epoch,body=excluded.body').run(epoch, body);
   this.db.exec('COMMIT'); return epoch;
  } catch (error) { this.db.exec('ROLLBACK'); throw error; }
 }
 private admitted(input: StatsPublication): void {
  const authority = this.authority(), methods = input.executed_methods ?? input.methods;
  if (!authority || authority.blocked || !Object.keys(methods).length || input.admission_epoch !== authority.epoch
   || Object.entries(methods).some(([key, digest]) => authority.methods[key] !== digest)) throw Error('statistics method authority changed or is blocked');
 }
 manifest(version: string): StatsManifest {
  versionId(version);
  const cached = this.manifests.get(version);
  if (cached) return cached;
  const row = this.db.prepare('SELECT manifest FROM stats_releases WHERE version=?').get(version);
  if (!row) throw Error('bound statistics version unavailable');
  const manifest = JSON.parse(String(row['manifest'])) as StatsManifest;
  if ('S1-' + statsSha(statsCanonical(manifest)) !== version) throw Error('statistics manifest checksum mismatch');
  Object.freeze(manifest.files); Object.freeze(manifest.methods); Object.freeze(manifest.dependencies); Object.freeze(manifest);
  this.manifests.set(version, manifest);
  return manifest;
 }
 read(version: string, key: string): Buffer | null {
  if (!statsResourceKey(key)) throw Error('unregistered statistics resource');
  const manifest = this.manifest(version), expected = manifest.files[key];
  if (expected === undefined) return null;
  const row = this.db.prepare('SELECT o.body FROM stats_members m JOIN stats_objects o ON o.sha256=m.object_sha WHERE m.version=? AND m.resource_key=? AND m.object_sha=?').get(version, key, expected);
  if (!row || !(row['body'] instanceof Uint8Array) || statsSha(row['body']) !== expected) throw Error('statistics object checksum mismatch');
  const bytes = row['body'];
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
 }
 byteLength(version: string, key: string): number {
  const expected = this.manifest(version).files[key];
  if (!statsResourceKey(key) || expected === undefined) throw Error('statistics resource absent');
  const row = this.db.prepare('SELECT o.byte_length FROM stats_members m JOIN stats_objects o ON o.sha256=m.object_sha WHERE m.version=? AND m.resource_key=? AND m.object_sha=?').get(version, key, expected);
  if (!row) throw Error('statistics object unavailable');
  return Number(row['byte_length']);
 }
 publish(input: StatsPublication, hooks: { beforeCommit?: () => void; beforePointer?: () => void } = {}, options: { migration?: boolean } = {}): string {
  id(input.request); if (input.base !== null) versionId(input.base);
  const files: Record<string, string> = {}, bytes: Record<string, Buffer> = {};
  for (const [key, raw] of Object.entries(input.files).sort(([a], [b]) => a.localeCompare(b))) {
   if (!statsResourceKey(key) || raw.byteLength > 128 * 1024 * 1024) throw Error('unregistered or oversized statistics resource');
   const body = Buffer.from(raw);
   if (!key.endsWith('.md')) statsCanonical(JSON.parse(body.toString('utf8')));
   files[key] = statsSha(body); bytes[key] = body;
  }
  if (!Object.keys(files).length) throw Error('empty statistics publication');
  for (const digest of [...Object.values(input.methods), ...Object.values(input.dependencies)]) if (!/^[a-f0-9]{64}$/.test(digest)) throw Error('invalid statistics provenance digest');
  const manifest: StatsManifest = { schema: 'stats-release-v1', files, methods: { ...input.methods }, dependencies: { ...input.dependencies } };
  const serialized = statsCanonical(manifest), version = 'S1-' + statsSha(serialized);
  const signature = statsSha(statsCanonical({ request: input.request, base: input.base, manifest, provenance: input.provenance,
   admission_epoch: input.admission_epoch ?? null, executed_methods: input.executed_methods ?? input.methods, migration: options.migration ?? false }));
  const prior = this.db.prepare('SELECT digest,version FROM stats_publications WHERE request=?').get(input.request);
  if (prior) {
   if (prior['digest'] !== signature) throw Error('statistics request identity reused');
   this.verifyExport(String(prior['version']));
   return String(prior['version']);
  }
  if (!options.migration) this.admitted(input);
  else if (input.base !== null || this.current() !== null) throw Error('statistics migration requires original empty baseline');
  const requestPath = join(this.root, 'requests', statsSha(input.request) + '.json');
  const candidate = statsCanonical({ request: input.request, digest: signature, base: input.base, version, manifest, provenance: input.provenance,
   admission_epoch: input.admission_epoch ?? null, executed_methods: input.executed_methods ?? input.methods, migration: options.migration ?? false });
  if (existsSync(requestPath) && (realpathSync(requestPath) !== requestPath || readFileSync(requestPath, 'utf8') !== candidate)) throw Error('statistics request identity reused');
  durable(requestPath, Buffer.from(candidate));
  // A ready fallback exists before a release/current pointer can become visible.
  const exported = join(this.root, 'json', version);
  for (const [key, raw] of Object.entries(bytes)) durable(join(exported, key), raw);
  durable(join(exported, 'manifest.json'), Buffer.from(serialized));
  const directories = new Set<string>([this.root, dirname(requestPath), dirname(exported), exported]);
  for (const key of Object.keys(bytes)) {
   let parent = dirname(join(exported, key));
   while (parent !== exported) { directories.add(parent); parent = dirname(parent); }
  }
  [...directories].sort((a, b) => b.length - a.length).forEach(syncDirectory);
  hooks.beforeCommit?.();
  this.db.exec('BEGIN IMMEDIATE');
  try {
   const raced = this.db.prepare('SELECT digest,version FROM stats_publications WHERE request=?').get(input.request);
   if (raced) {
    if (raced['digest'] !== signature) throw Error('statistics request identity reused');
    this.db.exec('COMMIT'); return String(raced['version']);
   }
   if (this.current() !== input.base) throw Error('statistics publication base conflict');
   if (!options.migration) this.admitted(input);
   else if (input.base !== null || this.current() !== null) throw Error('statistics migration requires original empty baseline');
   for (const [key, raw] of Object.entries(bytes)) {
    this.db.prepare('INSERT OR IGNORE INTO stats_objects VALUES(?,?,?)').run(files[key]!, raw, raw.length);
    const saved = this.db.prepare('SELECT body FROM stats_objects WHERE sha256=?').get(files[key]!)!['body'];
    if (!(saved instanceof Uint8Array) || statsSha(saved) !== files[key]) throw Error('existing statistics object checksum mismatch');
   }
   this.db.prepare('INSERT OR IGNORE INTO stats_releases VALUES(?,?,?,?)').run(version, input.base, serialized, statsCanonical(input.provenance));
   for (const [key, digest] of Object.entries(files)) this.db.prepare('INSERT OR IGNORE INTO stats_members VALUES(?,?,?)').run(version, key, digest);
   this.db.prepare('INSERT INTO stats_publications VALUES(?,?,?)').run(input.request, signature, version);
   hooks.beforePointer?.();
   this.db.prepare("INSERT INTO stats_metadata VALUES('current',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(version);
   this.db.exec('COMMIT');
  } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  return version;
 }
 status(request: string): { request: string; state: 'absent' | 'prepared' | 'published'; version?: string } {
  id(request);
  const row = this.db.prepare('SELECT version FROM stats_publications WHERE request=?').get(request);
  if (row) return { request, state: 'published', version: String(row['version']) };
  const path = join(this.root, 'requests', statsSha(request) + '.json');
  if (!existsSync(path)) return { request, state: 'absent' };
  if (realpathSync(path) !== path) throw Error('redirected statistics candidate');
  const saved = JSON.parse(readFileSync(path, 'utf8')) as { request: string; version: string };
  if (saved.request !== request) throw Error('statistics candidate identity mismatch');
  return { request, state: 'prepared', version: saved.version };
 }
 verifyExport(version: string): void {
  const manifest = this.manifest(version), root = join(this.root, 'json', version);
  const raw = readFileSync(join(root, 'manifest.json'));
  if (raw.toString('utf8') !== statsCanonical(manifest)) throw Error('statistics fallback manifest mismatch');
  for (const [key, sha] of Object.entries(manifest.files)) {
   const path = join(root, key);
   if (!statsResourceKey(key) || realpathSync(path) !== path || statsSha(readFileSync(path)) !== sha) throw Error('statistics fallback object mismatch');
  }
 }
 rollback(version: string, request: string): string {
  id(request); this.manifest(version); this.verifyExport(version);
  this.db.exec('BEGIN IMMEDIATE');
  try {
   const previous = this.db.prepare('SELECT version FROM stats_switches WHERE request=?').get(request);
   if (previous && previous['version'] !== version) throw Error('statistics rollback identity reused');
   if (!previous) {
    this.db.prepare('INSERT INTO stats_switches VALUES(?,?)').run(request, version);
    this.db.prepare("INSERT INTO stats_metadata VALUES('current',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(version);
   }
   this.db.exec('COMMIT');
  } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  return version;
 }
 bind(run: string, code: string, bundle: StatsBundle, backend: 'sqlite' | 'json'): StatsBinding {
  id(run); if (!/^[a-f0-9]{40}$/.test(code) || !['sqlite', 'json'].includes(backend)) throw Error('invalid resource run binding');
  const existing = this.db.prepare('SELECT body FROM stats_bindings WHERE run_key=?').get(run);
  if (existing) return JSON.parse(String(existing['body'])) as StatsBinding;
  const manifest = this.manifest(bundle.stats_version);
  if (bundle.schema !== 'knowledge-resource-bundle-v1' || bundle.k1_version !== null && !/^K1-[a-f0-9]{64}$/.test(bundle.k1_version)
   || bundle.operational_view_sha !== null && !/^[a-f0-9]{64}$/.test(bundle.operational_view_sha)
   || !/^[a-f0-9]{64}$/.test(bundle.capabilities_sha) || statsCanonical(bundle.dependencies) !== statsCanonical(manifest.dependencies)) throw Error('incompatible resource bundle');
  // The publisher prepared/fsynced every mirror object before committing S1.
  // Binding at a game boundary only checks the small sealed manifest; readers
  // verify each requested object, and explicit verify runs during preparation.
  const mirror = join(this.root, 'json', bundle.stats_version, 'manifest.json');
  if (realpathSync(mirror) !== mirror || readFileSync(mirror, 'utf8') !== statsCanonical(manifest)) throw Error('statistics fallback manifest mismatch');
  const body = statsCanonical(bundle), sha = statsSha(body);
  const binding: StatsBinding = { run_key: run, bundle_sha: sha, code_sha: code, backend, bundle };
  this.db.exec('BEGIN IMMEDIATE');
  try {
   this.db.prepare('INSERT OR IGNORE INTO stats_bundles VALUES(?,?)').run(sha, body);
   this.db.prepare('INSERT OR IGNORE INTO stats_bindings VALUES(?,?,?)').run(run, statsCanonical(binding), sha);
   const saved = JSON.parse(String(this.db.prepare('SELECT body FROM stats_bindings WHERE run_key=?').get(run)!['body'])) as StatsBinding;
   this.db.exec('COMMIT'); return saved;
  } catch (error) { this.db.exec('ROLLBACK'); throw error; }
 }
 async backup(destination: string): Promise<void> {
  if (existsSync(destination)) throw Error('statistics backup destination exists');
  mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
  if (realpathSync(dirname(destination)) !== resolve(dirname(destination))) throw Error('redirected statistics backup');
  await backup(this.db, destination);
  chmodSync(destination, 0o600);
  const fd = openSync(destination, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); }
  syncDirectory(dirname(destination));
 }
 static restore(source: string, destination: string): StatsStore {
  if (existsSync(destination)) throw Error('statistics restore destination must be new');
  if (realpathSync(source) !== resolve(source)) throw Error('redirected statistics backup');
  mkdirSync(destination, { recursive: true, mode: 0o700 });
  durable(join(destination, 'stats.sqlite'), readFileSync(source));
  const store = new StatsStore(destination);
  try {
   if (store.db.prepare('PRAGMA integrity_check').get()!['integrity_check'] !== 'ok') throw Error('statistics backup integrity failure');
   for (const row of store.db.prepare('SELECT version FROM stats_releases').all()) {
    const version = String(row['version']), manifest = store.manifest(version), exported = join(store.root, 'json', version);
    for (const key of Object.keys(manifest.files)) {
     const bytes = store.read(version, key); if (!bytes) throw Error('statistics backup object missing');
     durable(join(exported, key), bytes);
    }
    durable(join(exported, 'manifest.json'), Buffer.from(statsCanonical(manifest)));
    store.verifyExport(version);
   }
   return store;
  } catch (error) { store.close(); throw error; }
 }
}

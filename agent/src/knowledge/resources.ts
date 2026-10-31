/** Pinned, read-only resources. JSON is an explicit fallback backend, never an error fallback. */
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { statsResourceKey } from './runtime/stats-schema.js';
import { StatsStore, statsCanonical, statsSha, type StatsBinding, type StatsManifest } from './runtime/stats-store.js';

function freezeMetadata<T>(value: T): T {
 if (value && typeof value === 'object') { Object.values(value).forEach(freezeMetadata); Object.freeze(value); }
 return value;
}

export class KnowledgeResources {
 readonly identity: StatsBinding;
 private readonly manifest: StatsManifest;
 private readonly store: StatsStore | null;
 private readonly root: string;
 private readonly bytes = new Map<string, Buffer>();
 private readonly parsed = new Map<string, unknown>();
 private readonly texts = new Map<string, string>();
 private readonly sizes = new Map<string, number>();
 constructor(directory: string, binding: StatsBinding) {
  // Capture caller-owned metadata so later edits cannot silently rebind a process.
  this.identity = freezeMetadata(JSON.parse(statsCanonical(binding)) as StatsBinding);
  this.root = resolve(directory);
  if (binding.bundle_sha !== statsSha(statsCanonical(binding.bundle)) || !/^S1-[a-f0-9]{64}$/.test(binding.bundle.stats_version)
   || !['sqlite', 'json'].includes(binding.backend)) throw Error('invalid resource binding');
  if (binding.backend === 'sqlite') {
   this.store = new StatsStore(this.root, { readOnly: true });
   try { this.manifest = this.store.manifest(binding.bundle.stats_version); }
   catch (error) { this.store.close(); throw error; }
  } else {
   // This branch must remain usable when the stats database is unavailable.
   this.store = null;
   const path = join(this.root, 'json', binding.bundle.stats_version, 'manifest.json');
   if (realpathSync(path) !== path) throw Error('redirected fallback manifest');
   this.manifest = JSON.parse(readFileSync(path, 'utf8')) as StatsManifest;
  }
  if ('S1-' + statsSha(statsCanonical(this.manifest)) !== binding.bundle.stats_version
   || this.manifest.schema !== 'stats-release-v1' || Object.keys(this.manifest.files).some(key => !statsResourceKey(key))
   || statsCanonical(this.manifest.dependencies) !== statsCanonical(binding.bundle.dependencies)) {
   this.store?.close(); throw Error('bound resource manifest mismatch');
  }
  freezeMetadata(this.manifest);
 }
 close(): void { this.store?.close(); this.bytes.clear(); this.parsed.clear(); this.texts.clear(); this.sizes.clear(); }
 list(prefix = ''): string[] { return Object.keys(this.manifest.files).filter(key => key.startsWith(prefix)).sort(); }
 has(key: string): boolean { return statsResourceKey(key) && Object.hasOwn(this.manifest.files, key); }
 digest(key: string): string | null { return this.has(key) ? this.manifest.files[key]! : null; }
 private cacheKey(key: string): string {
  if (!statsResourceKey(key)) throw Error('unregistered resource key');
  if (!this.has(key)) throw Object.assign(Error('resource absent from pinned bundle: ' + key), { code: 'ENOENT' });
  return `${this.identity.bundle_sha}:${key}:${this.manifest.files[key]}`;
 }
 private loadBytes(key: string): Buffer {
  const cacheKey = this.cacheKey(key), cached = this.bytes.get(cacheKey);
  if (cached) return cached;
  let bytes: Buffer | null;
  if (this.store) bytes = this.store.read(this.identity.bundle.stats_version, key);
  else {
   const path = join(this.root, 'json', this.identity.bundle.stats_version, key);
   try {
    if (realpathSync(path) !== path) throw Error('redirected fallback resource');
    bytes = readFileSync(path);
   } catch (error) { throw new Error('bound fallback resource unavailable: ' + key, { cause: error }); }
  }
  if (!bytes || !this.store && statsSha(bytes) !== this.manifest.files[key]) throw Error('bound resource checksum mismatch');
  this.bytes.set(cacheKey, bytes);
  return bytes;
 }
 readBytes(key: string): Buffer { return Buffer.from(this.loadBytes(key)); }
 byteLength(key: string): number {
  const cache = this.cacheKey(key), cached = this.bytes.get(cache);
  if (cached) return cached.length;
  const prior = this.sizes.get(cache);
  if (prior !== undefined) return prior;
  let size: number;
  if (this.store) size = this.store.byteLength(this.identity.bundle.stats_version, key);
  else {
   const path = join(this.root, 'json', this.identity.bundle.stats_version, key);
   try {
    if (realpathSync(path) !== path) throw Error('redirected fallback resource');
    size = statSync(path).size;
   } catch (error) { throw new Error('bound fallback metadata unavailable: ' + key, { cause: error }); }
  }
  this.sizes.set(cache, size);
  return size;
 }
 readText(key: string): string {
  const cache = this.cacheKey(key);
  if (!this.texts.has(cache)) this.texts.set(cache, this.loadBytes(key).toString('utf8'));
  return this.texts.get(cache)!;
 }
 readJson<T = unknown>(key: string): T {
  const cacheKey = this.cacheKey(key);
  if (!this.parsed.has(cacheKey)) this.parsed.set(cacheKey, freezeMetadata(JSON.parse(this.readText(key)) as unknown));
  return this.parsed.get(cacheKey) as T;
 }
 query(key: string, pointer: string): unknown {
  if (pointer !== '' && !pointer.startsWith('/') || /~(?:[^01]|$)/.test(pointer)) throw Error('invalid resource JSON pointer');
  let value: unknown = this.readJson(key);
  for (const token of pointer === '' ? [] : pointer.slice(1).split('/').map(key => key.replaceAll('~1', '/').replaceAll('~0', '~'))) {
   if (Array.isArray(value) && !/^(0|[1-9][0-9]*)$/.test(token)) throw Error('resource pointer not found');
   if (!value || typeof value !== 'object' || !Object.hasOwn(value, token)) throw Error('resource pointer not found');
   value = (value as Record<string, unknown>)[token];
  }
  return value;
 }
}

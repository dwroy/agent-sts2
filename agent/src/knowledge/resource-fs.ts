/** Compatibility adapter for A loaders. Every selected read goes through KnowledgeResources. */
import * as fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { isAbsolute, relative, resolve } from 'node:path';
import { KNOWLEDGE_DIR } from '../core/paths.js';
import { assetsSelection } from './assets-binding.js';
import { KnowledgeResources } from './resources.js';
import { statsResourceKey } from './runtime/stats-schema.js';
import { statsSha } from './runtime/stats-store.js';

let reader: KnowledgeResources | null = null, comparison: KnowledgeResources | null = null;
let comparisonError: string | null = null;
let auditSession: { id: string; reads: number; failures: number } | null = null;
function finishAudit(): void {
 const session = auditSession;
 if (!session) return;
 auditSession = null;
 process.removeListener('exit', finishAudit);
 const config = assetsSelection()!;
 try {
  if (!config.shadow_log) throw Error('missing original shadow audit log');
  fs.appendFileSync(config.shadow_log, JSON.stringify({ schema: 'stats-shadow-session-v1', session: session.id,
   run_key: config.binding.run_key, bundle_sha: config.binding.bundle_sha,
   reads: session.reads, write_failures: session.failures }) + '\n', { mode: 0o600 });
 } catch { process.emitWarning('statistics shadow audit incomplete; this run cannot pass shadow acceptance'); }
}
export class StatsResourceError extends Error { readonly statsResourceFailure = true; }
export function rethrowStatsResourceError(error: unknown): void {
 if (error instanceof StatsResourceError || error && typeof error === 'object' && 'statsResourceFailure' in error && error.statsResourceFailure === true) throw error;
}

export function boundResources(): KnowledgeResources | null {
 const selected = assetsSelection();
 if (!selected) return null;
 if (!reader) {
  try {
   reader = new KnowledgeResources(selected.directory, selected.binding);
   if (selected.mode === 'shadow') {
    try { comparison = new KnowledgeResources(selected.directory, { ...selected.binding, backend: 'sqlite' }); }
    catch (error) { comparisonError = (error as Error).name; }
   }
  } catch (error) { reader?.close(); reader = null; throw new StatsResourceError(String(error)); }
 }
 return reader;
}
export function closeBoundResources(): void { finishAudit(); reader?.close(); comparison?.close(); reader = comparison = null; comparisonError = null; }
function keyFor(path: fs.PathLike | number): string | null {
 if (!assetsSelection() || typeof path !== 'string') return null;
 const key = relative(resolve(KNOWLEDGE_DIR), resolve(path)).split('\\').join('/');
 return !isAbsolute(key) && !key.startsWith('../') && statsResourceKey(key) ? key : null;
}
function selected<T>(path: fs.PathLike | number, run: (r: KnowledgeResources, key: string) => T): T | undefined {
 const key = keyFor(path);
 if (key === null) return undefined;
 try { return run(boundResources()!, key); }
 catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw error;
  throw error instanceof StatsResourceError ? error : new StatsResourceError(String(error));
 }
}
function bytes(r: KnowledgeResources, key: string): Buffer {
 const config = assetsSelection()!;
 if (config.mode !== 'shadow') return r.readBytes(key);
 if (!auditSession) { auditSession = { id: randomUUID(), reads: 0, failures: 0 }; process.once('exit', finishAudit); }
 const sequence = ++auditSession.reads, started = process.hrtime.bigint();
 let raw: Buffer | undefined, authorityError: unknown, authorityAbsent = false;
 try { raw = r.readBytes(key); }
 catch (error) { authorityError = error; authorityAbsent = (error as NodeJS.ErrnoException).code === 'ENOENT' && !r.has(key); }
 const middle = process.hrtime.bigint();
 let equal = false, errorType = authorityError && !authorityAbsent ? 'authority:' + (authorityError as Error).name : comparisonError;
 if (comparison) {
  try { const compared = comparison.readBytes(key); equal = raw !== undefined && raw.equals(compared); }
  catch (error) {
   const absent = (error as NodeJS.ErrnoException).code === 'ENOENT' && !comparison.has(key);
   if (authorityAbsent && absent) equal = true;
   else if (!errorType) errorType = (error as Error).name;
  }
 }
 const ended = process.hrtime.bigint();
 // Failed authority reads are audited too: a successful prefix cannot qualify.
 try {
  if (!config.shadow_log) throw Error('missing original shadow audit log');
  fs.appendFileSync(config.shadow_log, JSON.stringify({ schema: 'stats-resource-shadow-v1', session: auditSession.id, sequence, run_key: config.binding.run_key,
   bundle_sha: config.binding.bundle_sha, key, sha256: raw ? statsSha(raw) : null, bytes: raw?.length ?? null,
   outcome: authorityAbsent ? 'absent' : raw ? 'bytes' : 'authority-error', equal, error_type: errorType,
   json_ns: String(middle - started), sqlite_ns: String(ended - middle) }) + '\n', { mode: 0o600 });
 } catch { auditSession.failures++; process.emitWarning('statistics shadow audit unavailable; this run cannot pass shadow acceptance'); }
 if (authorityError) throw authorityError;
 return raw!;
}

export const readFileSync: typeof fs.readFileSync = ((path: fs.PathOrFileDescriptor, options?: unknown) => {
 const value = selected(path, (r, key) => {
  const encoding = typeof options === 'string' ? options : (options as { encoding?: string } | undefined)?.encoding;
  if (assetsSelection()!.mode !== 'shadow' && encoding === 'utf8') return r.readText(key);
  const raw = bytes(r, key);
  return encoding ? raw.toString(encoding as BufferEncoding) : raw;
 });
 return value ?? fs.readFileSync(path, options as BufferEncoding);
}) as typeof fs.readFileSync;

export const existsSync: typeof fs.existsSync = (path) => selected(path, (r, key) => r.has(key)) ?? (children(path)?.size ? true : fs.existsSync(path));
function children(path: fs.PathLike): Map<string, boolean> | null {
 if (!assetsSelection() || typeof path !== 'string') return null;
 const rel = relative(resolve(KNOWLEDGE_DIR), resolve(path)).split('\\').join('/');
 if (isAbsolute(rel) || rel === '..' || rel.startsWith('../')) return null;
 const prefix = rel ? rel + '/' : '', names = new Map<string, boolean>();
 for (const key of boundResources()!.list(prefix)) {
  const rest = key.slice(prefix.length), name = rest.split('/')[0]!;
  names.set(name, rest.includes('/') || names.get(name) === true);
 }
 return names;
}
export const realpathSync: typeof fs.realpathSync = ((path: fs.PathLike, options?: unknown) => {
 const key = keyFor(path);
 if (key !== null) { if (!boundResources()!.has(key)) throw Object.assign(Error('resource absent'), { code: 'ENOENT' }); return resolve(String(path)); }
 if (children(path)?.size && !fs.existsSync(path)) return resolve(String(path));
 return fs.realpathSync(path, options as BufferEncoding);
}) as typeof fs.realpathSync;
realpathSync.native = realpathSync;

export const readdirSync: typeof fs.readdirSync = ((path: fs.PathLike, options?: { withFileTypes?: boolean; encoding?: string } | string) => {
 const extra = children(path);
 if (extra === null) return fs.readdirSync(path, options as { withFileTypes: true });
 const withTypes = typeof options === 'object' && options.withFileTypes;
 const names = new Map<string, fs.Dirent | string>();
 let physical: (fs.Dirent | string)[] = [];
 try { physical = withTypes ? fs.readdirSync(path, { withFileTypes: true }) : fs.readdirSync(path, { encoding: 'utf8' }); }
 catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || !extra.size) throw error; }
 for (const entry of physical) {
  const name = typeof entry === 'string' ? entry : entry.name;
  // Editable stale A files do not add members to a pinned resource manifest.
  const rel = relative(KNOWLEDGE_DIR, resolve(String(path), name)).split('\\').join('/');
  if (!statsResourceKey(rel) || boundResources()!.has(rel)) names.set(name, entry);
 }
 for (const [name, directory] of extra) {
  if (!withTypes) names.set(name, name);
  else names.set(name, Object.assign(Object.create(fs.Dirent.prototype), { name, parentPath: String(path), path: String(path),
   isDirectory: () => directory, isFile: () => !directory, isSymbolicLink: () => false,
   isBlockDevice: () => false, isCharacterDevice: () => false, isFIFO: () => false, isSocket: () => false }) as fs.Dirent);
 }
 return [...names].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
}) as typeof fs.readdirSync;
export const statSync: typeof fs.statSync = ((path: fs.PathLike, options?: { bigint?: boolean; throwIfNoEntry?: boolean }) => {
 const value = selected(path, (r, key) => {
  if (!r.has(key)) {
   if (options?.throwIfNoEntry === false) return null;
   throw Object.assign(Error('resource absent: ' + key), { code: 'ENOENT' });
  }
  if (options?.bigint) throw Error('bigint statistics metadata is not a declared consumer');
  const stat = Object.create(fs.Stats.prototype) as fs.Stats;
  Object.assign(stat, { dev: 0, ino: Number.parseInt(r.digest(key)!.slice(0, 12), 16), mode: 0o100400,
   nlink: 1, uid: 0, gid: 0, rdev: 0, size: r.byteLength(key), blksize: 4096, blocks: 0,
   atimeMs: 0, mtimeMs: 0, ctimeMs: 0, birthtimeMs: 0, atime: new Date(0), mtime: new Date(0), ctime: new Date(0), birthtime: new Date(0) });
  return stat;
 });
 if (value === null) return undefined;
 return value ?? fs.statSync(path, options as { bigint: false });
}) as typeof fs.statSync;

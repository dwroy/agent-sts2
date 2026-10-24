/** Host-local publisher. The gameplay process never imports this writable adapter. */
import { DatabaseSync, backup } from "node:sqlite";
import { createHash } from "node:crypto";
import { chmodSync, closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { SCHEMA, SCHEMA_VERSION } from "./schema.js";
import { allowedPath, ARCHETYPE_PATH, MIGRATED_NAMES, object, rows, evidenceRows, validateDocuments, validateUpdate, type Row } from "./validation.js";

export const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export interface Candidate {
 schema: "knowledge-candidate-v1";
 id: string;
 base: string | null;
 character: string;
 source: string;
 files: Record<string, string>;
}
export interface Manifest { schema: "knowledge-release-v1"; version: string; files: Record<string, string> }
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
};

/** External callbacks may publish only the actual artifacts verified by the original source protocol. */
export function auditApprovedChanges(before: Record<string, string>, changes: Record<string, string>, approved: Array<{ id: string; path: string }>): void {
  const permitted = new Set(approved.flatMap(item => {
    const body = JSON.parse(readFileSync(item.path, "utf8")) as Row;
    const entries = Array.isArray(body) ? body : Array.isArray(body.entries) ? body.entries : [body];
    return entries.filter(e => e.id === item.id).map(e => canonical(e));
  }));
  let count = 0;
  for (const [path, text] of Object.entries(changes)) {
    const next = JSON.parse(text) as Row;
    if (!Array.isArray(next.entries)) throw new Error("reference-artifact updates require owner review");
    const old = new Map(rows(JSON.parse(before[path] ?? '{"entries":[]}') as Row).map(e => [e.id, canonical(e)]));
    for (const entry of rows(next)) if (old.get(entry.id) !== canonical(entry)) {
      if (!permitted.has(canonical(entry))) throw new Error(`change is absent from frozen-source artifacts: ${entry.id}`);
      count++;
    }
  }
  if (!count) throw new Error("no new content; use original no-change completion");
}
function durable(path: string, text: string | Buffer): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, text, { mode: 0o600, flag: "wx" });
  const fd = openSync(path, "r"); try { fsyncSync(fd); } finally { closeSync(fd); }
}
function syncDir(path: string): void { const fd = openSync(path, "r"); try { fsyncSync(fd); } finally { closeSync(fd); } }

export function safeSQLiteVersion(version: string): boolean {
  const [major = 0, minor = 0, patch = 0] = version.split(".").map(Number);
  return major > 3 || major === 3 && (minor > 51 || minor === 51 && patch >= 3 || minor === 50 && patch >= 7 || minor === 44 && patch >= 6);
}

/** Discover only published leaves. Pending directories, original logs and frozen evidence are never imported. */
export function importFiles(root: string): Record<string, string> {
  const result: Record<string, string> = {};
  const add = (path: string) => { if (existsSync(join(root, path))) result[path] = readFileSync(join(root, path), "utf8"); };
  add("common/shared-experience.json"); add(ARCHETYPE_PATH);
  for (const character of readdirSync(join(root, "characters"))) {
    if (!/^[a-z0-9_]+$/.test(character) || !statSync(join(root, "characters", character)).isDirectory()) continue;
    for (const name of MIGRATED_NAMES) add(`characters/${character}/${name}`);
  }
  validateDocuments(result);
  return result;
}

export class KnowledgeStore {
 readonly db: DatabaseSync;
 readonly root: string;
 constructor(root: string, options: { readOnly?: boolean } = {}) {
  this.root = resolve(root);
  if (!options.readOnly) mkdirSync(this.root, { recursive: true, mode: 0o700 });
  // All callers must use a host-local runtime directory; refuse common WSL network/Windows mounts.
  const physical = realpathSync(this.root);
  if (/^\/mnt\/(?:[a-z](?:\/|$)|wsl\/)/.test(physical) || physical.startsWith("//")) throw new Error("SQLite runtime must be on a host-local Linux filesystem");
  this.db = new DatabaseSync(join(this.root, "knowledge.sqlite"), { readOnly: options.readOnly ?? false });
  try {
    const version = String(this.db.prepare("SELECT sqlite_version() AS version").get()!["version"]);
    if (!safeSQLiteVersion(version)) throw new Error(`SQLite ${version} lacks required WAL-reset fix`);
    this.db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
    if (!options.readOnly) {
      this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;");
      this.db.exec(SCHEMA);
      const old = this.db.prepare("SELECT value FROM metadata WHERE key='schema'").get();
      if (old && Number(old["value"]) !== SCHEMA_VERSION) throw new Error("unsupported knowledge schema");
      this.db.prepare("INSERT OR IGNORE INTO metadata VALUES('schema',?)").run(String(SCHEMA_VERSION));
      chmodSync(join(this.root, "knowledge.sqlite"), 0o600);
    }
  } catch (error) { this.db.close(); throw error; }
 }
 close(): void { this.db.close(); }
 private transaction<T>(run: () => T): T {
  this.db.exec("BEGIN IMMEDIATE");
  try { const result = run(); this.db.exec("COMMIT"); return result; }
  catch (error) { this.db.exec("ROLLBACK"); throw error; }
 }
 current(): string | null { return String(this.db.prepare("SELECT value FROM metadata WHERE key='current'").get()?.["value"] ?? "") || null; }
 files(version: string | null): Record<string, string> {
  if (version === null) return {};
  if (!this.db.prepare("SELECT 1 FROM releases WHERE version=?").get(version)) throw new Error("unknown knowledge version");
  return Object.fromEntries(this.db.prepare("SELECT f.path,d.body FROM release_files f JOIN documents d ON d.digest=f.digest WHERE version=? ORDER BY f.path").all(version).map(r => [String(r["path"]), String(r["body"])]));
 }
 submit(candidate: Candidate): Row {
  if (candidate.schema !== "knowledge-candidate-v1" || !/^[a-zA-Z0-9_.:-]{1,160}$/.test(candidate.id)
    || !(candidate.base === null || /^K1-[a-f0-9]{64}$/.test(candidate.base)) || !/^[a-z0-9_]+$/.test(candidate.character)
    || !candidate.source?.trim() || !object(candidate.files) || !Object.keys(candidate.files).length) throw new Error("invalid candidate envelope");
  for (const [path, text] of Object.entries(candidate.files)) {
    if (!allowedPath(path) || typeof text !== "string" || candidate.character !== "migration"
      && !(path.startsWith(`characters/${candidate.character}/`) || candidate.character === "common" && path === "common/shared-experience.json")) throw new Error("candidate character/path mismatch");
  }
  const body = canonical(candidate), hash = digest(body);
  if (Buffer.byteLength(body) > 32 * 1024 * 1024) throw new Error("candidate exceeds 32MB");
  return this.transaction(() => {
    const old = this.db.prepare("SELECT * FROM candidates WHERE id=?").get(candidate.id);
    if (old) { if (old["digest"] !== hash) throw new Error("idempotency key reused with different content"); return old; }
    if (candidate.base !== null && !this.db.prepare("SELECT 1 FROM releases WHERE version=?").get(candidate.base)) throw new Error("unknown candidate base");
    this.db.prepare("INSERT INTO candidates(id,digest,base,body,status) VALUES(?,?,?,?,'submitted')").run(candidate.id, hash, candidate.base, body);
    return this.status(candidate.id);
  });
 }
 status(id: string): Row {
  const row = this.db.prepare("SELECT id,digest,base,status,version,created FROM candidates WHERE id=?").get(id);
  if (!row) throw new Error("unknown candidate"); return row;
 }
 private prepared(id: string) {
  const row = this.db.prepare("SELECT body FROM candidates WHERE id=?").get(id);
  if (!row) throw new Error("unknown candidate");
  const candidate = JSON.parse(String(row["body"])) as Candidate;
  const before = this.files(candidate.base), files = { ...before, ...candidate.files };
  validateDocuments(files);
  validateUpdate(before, files);
  const hashes = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([path, text]) => [path, digest(text)]));
  const version = `K1-${digest(canonical({ parent: candidate.base, candidate: candidate.id, files: hashes }))}`;
  const manifest: Manifest = { schema: "knowledge-release-v1", version, files: hashes };
  return { candidate, files, version, manifest };
 }
 validate(id: string): Row {
  const saved = this.status(id);
  if (saved.status === "published") return saved;
  this.prepared(id);
  this.db.prepare("UPDATE candidates SET status='validated' WHERE id=? AND status='submitted'").run(id);
  return this.status(id);
 }
 /** Write and fsync all immutable files BEFORE committing their database visibility. Orphans are safe to retry. */
 private snapshot(manifest: Manifest, files: Record<string, string>): void {
  const target = join(this.root, "snapshots", manifest.version);
  if (existsSync(target)) { this.verifySnapshot(manifest); return; }
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  const stage = target + `.prepare-${process.pid}`;
  if (existsSync(stage)) rmSync(stage, { recursive: true });
  mkdirSync(stage, { mode: 0o700 });
  for (const [path, text] of Object.entries(files)) { durable(join(stage, path), text); chmodSync(join(stage, path), 0o444); }
  durable(join(stage, "manifest.json"), JSON.stringify(manifest));
  // Child directory entries must be durable too, not just the top-level rename.
  const syncTree = (path: string) => { for (const item of readdirSync(path, { withFileTypes: true })) if (item.isDirectory()) syncTree(join(path, item.name)); syncDir(path); };
  syncTree(stage);
  try { renameSync(stage, target); }
  catch (error) { if (!existsSync(target)) throw error; rmSync(stage, { recursive: true }); }
  syncDir(dirname(target));
  this.verifySnapshot(manifest);
 }
 verifySnapshot(manifest: Manifest): string {
  const root = join(this.root, "snapshots", manifest.version);
  const saved = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  if (canonical(saved) !== canonical(manifest)) throw new Error("snapshot manifest mismatch");
  for (const [path, hash] of Object.entries(manifest.files)) if (!allowedPath(path) || digest(readFileSync(join(root, path), "utf8")) !== hash) throw new Error(`snapshot checksum mismatch: ${path}`);
  return root;
 }
 publish(id: string, failpoint?: () => void): string {
  const status = this.status(id);
  if (status.status === "published") return String(status.version);
  if (status.status !== "validated") throw new Error("candidate is not validated");
  // Validation, snapshot IO and indexing preparation happen outside the short writer transaction.
  const { candidate, files, version, manifest } = this.prepared(id);
  this.snapshot(manifest, files);
  const revisions = this.indexRows(files);
  return this.transaction(() => {
    const status = this.status(id);
    if (status.status === "published") return String(status.version);
    if (candidate.base !== this.current()) throw new Error("knowledge version conflict; nothing published");
    this.db.prepare("INSERT INTO releases(version,parent,candidate,source,manifest) VALUES(?,?,?,?,?)").run(version, candidate.base, id, candidate.source, JSON.stringify(manifest));
    for (const [path, text] of Object.entries(files)) {
      this.db.prepare("INSERT OR IGNORE INTO documents VALUES(?,?,?)").run(digest(text), path, text);
      this.db.prepare("INSERT INTO release_files VALUES(?,?,?)").run(version, path, digest(text));
    }
    for (const entry of revisions) this.insertRevision(version, entry);
    failpoint?.();
    this.db.prepare("INSERT INTO metadata VALUES('current',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(version);
    this.db.prepare("UPDATE candidates SET status='published',version=? WHERE id=?").run(version, id);
    this.db.prepare("INSERT INTO events(request,action,version) VALUES(?,'publish',?)").run(`publish:${id}`, version);
    return version;
  });
 }
 private indexRows(files: Record<string, string>): Row[] {
  return Object.entries(files).flatMap(([path, text]) => rows(JSON.parse(text) as Row).map(e => {
    const payload = canonical(e), revision = digest(path + "\n" + payload);
    const character = path.startsWith("characters/") ? path.split("/")[1]! : "common";
    const kind = path.split("/").at(-1)!.replace(".json", "");
    const asc = Array.isArray(e.asc) ? e.asc : e.scope?.ascensions;
    const terms: Array<[string, string]> = [];
    const add = (cat: string, value: unknown) => { if (typeof value === "string") terms.push([cat, value.toLowerCase()]); };
    add("entity", e.id); add("alias", e.name); add("alias", e.label_en);
    if (typeof e.scope === "string") { const [category, entity] = e.scope.split(":"); add("category", category); add("entity", entity); }
    for (const q of e.trigger?.question_types ?? []) add("question", q);
    for (const a of e.trigger?.acts ?? []) add("act", String(a));
    for (const b of e.trigger?.bosses ?? []) add("entity", b);
    for (const card of e.trigger?.deck_cards ?? []) add("entity", card.name);
    for (const category of e.categories ?? []) add("category", category);
    for (const ascension of e.scope?.ascensions ?? []) add("ascension", String(ascension));
    if (e.applies_to) add("category", e.applies_to);
    return { revision, path, entry_id: e.id, character, kind, payload, source: e.source ?? null, confidence: String(e.confidence ?? "unknown"),
      evidence_status: e.evidence_status ?? "unassessed", asc_min: asc?.length ? Math.min(...asc) : null, asc_max: asc?.length ? Math.max(...asc) : null, terms,
      game_version: e.game_version ?? e.scope?.game_version ?? null,
      evidence: [...evidenceRows(e), ...(e.sources ?? []), ...(e.counterexamples ?? []).map((value: unknown) => ({ value, role: "contradict" })),
        ...(e.contradicting ?? []).map((run: string) => ({ run, role: "contradict", source: "own" }))] };
  }));
 }
 private insertRevision(version: string, e: Row): void {
  const result = this.db.prepare("INSERT OR IGNORE INTO revisions VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").run(e.revision, e.path, String(e.entry_id), e.character, e.kind, e.source, e.confidence, e.evidence_status, e.asc_min, e.asc_max, e.game_version, e.payload);
  this.db.prepare("INSERT INTO release_entries VALUES(?,?)").run(version, e.revision);
  if (!result.changes) return;
  for (const [category, term] of e.terms) this.db.prepare("INSERT OR IGNORE INTO terms VALUES(?,?,?)").run(e.revision, category, term);
  for (const [ordinal, ev] of e.evidence.entries()) this.db.prepare("INSERT INTO evidence VALUES(?,?,?,?,?,?)").run(e.revision, ordinal, ev.role ?? "support", ev.source ?? null, ev.dataset_sha256 ?? ev.evidence_sha256 ?? null, JSON.stringify(ev));
  this.db.prepare("INSERT INTO body_search VALUES(?,?)").run(e.revision, e.payload);
 }
 rollback(version: string, request: string): string {
  const row = this.db.prepare("SELECT manifest FROM releases WHERE version=?").get(version);
  if (!row) throw new Error("unknown rollback version");
  this.verifySnapshot(JSON.parse(String(row["manifest"])) as Manifest);
  return this.transaction(() => {
    const old = this.db.prepare("SELECT version,action FROM events WHERE request=?").get(request);
    if (old) { if (old["version"] !== version || old["action"] !== "rollback") throw new Error("rollback request reused"); return version; }
    this.db.prepare("UPDATE metadata SET value=? WHERE key='current'").run(version);
    this.db.prepare("INSERT INTO events(request,action,version) VALUES(?,'rollback',?)").run(request, version);
    return version;
  });
 }
 /** Persist before launching the brain. A restart of this run reuses its original version. */
 bind(runId: string, code: string): Row {
  if (!runId.trim() || !code.trim()) throw new Error("run/code identity required");
  const binding = this.transaction(() => {
    const old = this.db.prepare("SELECT * FROM run_bindings WHERE run_id=?").get(runId);
    if (old) return old;
    const version = this.current(); if (!version) throw new Error("no published knowledge");
    this.db.prepare("INSERT INTO run_bindings(run_id,version,code) VALUES(?,?,?)").run(runId, version, code);
    return this.db.prepare("SELECT * FROM run_bindings WHERE run_id=?").get(runId)!;
  });
  const release = this.db.prepare("SELECT manifest FROM releases WHERE version=?").get(binding["version"]!);
  const snapshot = this.verifySnapshot(JSON.parse(String(release!["manifest"])) as Manifest);
  return { ...binding, snapshot, schema: SCHEMA_VERSION };
 }
 query(options: { version: string; character: string; kind?: string; ascension?: number; category?: string; entity?: string; text?: string; source?: string; gameVersion?: string; evidenceStatus?: string; limit?: number; offset?: number }): Row[] {
  const { version, character, kind, ascension, category, entity, text } = options;
  const limit = options.limit ?? 20, offset = options.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0 || offset > 10000 || (text?.length ?? 0) > 200) throw new Error("invalid query bounds");
  const where = ["p.version=?", "r.character IN (?,'common')"], params: Array<string | number> = [version, character];
  if (kind) { where.push("r.kind=?"); params.push(kind); }
  if (ascension !== undefined) {
    where.push("(r.asc_min IS NULL OR r.asc_min<=?) AND (r.asc_max IS NULL OR r.asc_max>=?)"); params.push(ascension, ascension);
    where.push("(r.asc_min IS NULL OR r.kind NOT IN ('reflex','build-cores','direction-cards') OR r.revision IN (SELECT revision FROM terms WHERE category='ascension' AND term=?))"); params.push(String(ascension));
  }
  for (const [column, value] of [["source", options.source], ["evidence_status", options.evidenceStatus]] as const) if (value) { where.push(`r.${column}=?`); params.push(value); }
  if (options.gameVersion) { where.push("(r.game_version IS NULL OR r.game_version=?)"); params.push(options.gameVersion); }
  for (const [cat, value] of [["category", category], ["entity", entity]] as const) if (value) {
    where.push(cat === "entity" ? "r.revision IN (SELECT revision FROM terms WHERE category IN ('entity','alias') AND term=?)"
      : "r.revision IN (SELECT revision FROM terms WHERE category=? AND term=?)");
    if (cat !== "entity") params.push(cat);
    params.push(value.toLowerCase());
  }
  if (text) {
    // Trigrams cannot recall two-character Chinese terms. Fall back to instr for short queries.
    if (Array.from(text).length >= 3) { where.push("r.revision IN (SELECT revision FROM body_search WHERE body_search MATCH ?)"); params.push('"' + text.replaceAll('"', '""') + '"'); }
    else { where.push("instr(lower(r.payload),?)>0"); params.push(text.toLowerCase()); }
  }
  return this.db.prepare(`SELECT r.* FROM release_entries p JOIN revisions r ON r.revision=p.revision WHERE ${where.join(" AND ")} ORDER BY r.path,r.entry_id LIMIT ? OFFSET ?`).all(...params, limit, offset);
 }
 async backup(destination: string): Promise<void> {
  if (existsSync(destination)) throw new Error("backup destination already exists");
  mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
  await backup(this.db, destination);
  chmodSync(destination, 0o600);
 }
 /** Restore into a new directory. Rebuild and verify every snapshot from the consistent SQLite backup. */
 static restore(source: string, destination: string): KnowledgeStore {
  if (existsSync(destination)) throw new Error("restore destination must be new; retain original runtime");
  mkdirSync(destination, { recursive: true, mode: 0o700 });
  durable(join(destination, "knowledge.sqlite"), readFileSync(source));
  const store = new KnowledgeStore(destination);
  if (store.db.prepare("PRAGMA integrity_check").get()!["integrity_check"] !== "ok") { store.close(); throw new Error("backup integrity check failed"); }
  for (const row of store.db.prepare("SELECT version,manifest FROM releases").all()) store.snapshot(JSON.parse(String(row["manifest"])) as Manifest, store.files(String(row["version"])));
  return store;
 }
}

/** Fixed-parameter indexed queries. Gameplay can open an existing database read-only, never latest. */
import { DatabaseSync } from "node:sqlite";
import { basename, dirname, join, resolve } from "node:path";
import { runtimeKnowledgeRoot } from "../runtime-paths.js";
import type { Row } from "./validation.js";
import type { BusinessType } from "./projection.js";
import { safeSQLiteVersion } from "./sqlite-version.js";

export interface TypedQuery {
 character: string; type: BusinessType; ascension?: number; text?: string; entity?: string; topic?: string; id?: string;
 category?: string; questions?: string[]; limit?: number; offset?: number;
 view?: "tool";
}
export interface IndexedItem extends Row { item: string; revision: string; original_id: string; path: string; payload: string; value: Row }
const readers = new Map<string, KnowledgeReader>();

/** Explicit snapshots used by replays are bound too. An arbitrary custom knowledgeDir stays on its own source. */
export function indexedKnowledge(dir: string): KnowledgeReader | null {
 const snapshot = resolve(runtimeKnowledgeRoot(dir)), version = basename(snapshot);
 if (!/^K1-[a-f0-9]{64}$/.test(version) || basename(dirname(snapshot)) !== "snapshots") return null;
 const root = dirname(dirname(snapshot)), key = join(root, version);
 let hit = readers.get(key);
 if (!hit) {
  hit = new KnowledgeReader(root, version);
  readers.set(key, hit);
  if (readers.size > 8) { const key = readers.keys().next().value!; readers.get(key)!.close(); readers.delete(key); }
 }
 return hit;
}
export function closeIndexedReaders(): void { for (const r of readers.values()) r.close(); readers.clear(); }

export class KnowledgeReader {
 readonly db: DatabaseSync;
 private parsed = new Map<string, Row>();
 private parsedSizes = new Map<string, number>();
 private parsedBytes = 0;
 private recalls = new Map<string, { rows: IndexedItem[]; bytes: number }>();
 private recallBytes = 0;
 private files: Record<string, string>;
 private statements = new Map<string, ReturnType<DatabaseSync["prepare"]>>();
 constructor(readonly root: string, readonly version: string) {
  if (!/^K1-[a-f0-9]{64}$/.test(version)) throw new Error("invalid bound knowledge version");
  this.db = new DatabaseSync(join(root, "knowledge.sqlite"), { readOnly: true });
  try {
   this.db.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=5000;");
   const sqlite = String(this.db.prepare("SELECT sqlite_version() version").get()!["version"]);
   if (!safeSQLiteVersion(sqlite)) throw new Error(`SQLite ${sqlite} lacks required WAL-reset fix`);
   if (this.db.prepare("SELECT value FROM metadata WHERE key='schema'").get()?.["value"] !== "2") throw new Error("typed knowledge schema requires owner migration");
   const release = this.db.prepare("SELECT manifest FROM releases WHERE version=?").get(version);
   if (!release) throw new Error("bound knowledge version is unavailable");
   this.files = (JSON.parse(String(release["manifest"])) as { files: Record<string, string> }).files;
  } catch (error) { this.db.close(); throw error; }
 }
 close(): void { this.db.close(); }
 fileDigest(path: string): string | undefined { return this.files[path]; }
 private statement(sql: string) {
  let s = this.statements.get(sql);
  if (!s) { s = this.db.prepare(sql); this.statements.set(sql, s); }
  return s;
 }
 private sql(q: TypedQuery) {
  const limit = q.limit ?? 100, offset = q.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0
   || (q.text?.length ?? 0) > 200 || !/^[a-z0-9_]+$/.test(q.character)) throw new Error("invalid typed query bounds");
  const conditions = ["b.type=?", "b.character IN (?,'common')", "EXISTS(SELECT 1 FROM release_entries p WHERE p.version=? AND p.revision=b.revision)"],
   params: Array<string | number> = [q.type, q.character, this.version];
  if (q.id) { conditions.push("b.original_id=?"); params.push(q.id); }
  if (q.ascension !== undefined) {
   conditions.push("(r.asc_min IS NULL OR r.asc_min<=?) AND (r.asc_max IS NULL OR r.asc_max>=?)"); params.push(q.ascension, q.ascension);
   conditions.push("(r.asc_min IS NULL OR r.kind NOT IN ('reflex','build-cores','direction-cards') OR r.revision IN (SELECT revision FROM terms WHERE category='ascension' AND term=?))"); params.push(String(q.ascension));
  }
  for (const [category, value] of [["entity", q.entity], ["topic", q.topic], ["category", q.category]] as const) if (value) {
   if (category === "entity") {
    // Expand only explicit, published aliases from this role/common fact index. Ambiguous aliases recall all candidates.
    conditions.push("b.item IN (SELECT item FROM item_terms WHERE category='entity' AND (term=? OR term IN (SELECT lower(f.original_id) FROM business_items f JOIN item_terms t ON t.item=f.item WHERE f.type='fact' AND f.character IN (?,'common') AND t.category='entity' AND t.term=? AND EXISTS(SELECT 1 FROM release_entries p WHERE p.version=? AND p.revision=f.revision))))");
    params.push(value.toLowerCase(), q.character, value.toLowerCase(), this.version);
   } else { conditions.push("b.item IN (SELECT item FROM item_terms WHERE category=? AND term=?)"); params.push(category, value.toLowerCase()); }
  }
  if (q.questions?.length) {
   conditions.push(`b.item IN (SELECT item FROM item_terms WHERE category='question' AND term IN (${q.questions.map(() => "?").join(",")}))`);
   params.push(...q.questions);
  }
  if (q.text) {
   if (Array.from(q.text).length < 3) { conditions.push("b.item IN (SELECT item FROM item_grams WHERE gram=?)"); params.push(q.text.toLowerCase()); }
   else { conditions.push("b.item IN (SELECT item FROM item_search WHERE item_search MATCH ?)"); params.push('"' + q.text.replaceAll('"', '""') + '"'); }
  }
  const projection = `b.item,b.revision,b.type,b.original_id,b.parent_id,b.ordinal,b.character,b.status,b.game_version,b.${q.view === "tool" ? "tool_payload" : "payload"} AS payload`;
  return { sql: `SELECT ${projection},r.path,r.source,r.confidence,r.evidence_status FROM business_items b JOIN revisions r ON r.revision=b.revision WHERE ${conditions.join(" AND ")} ORDER BY b.character,b.original_id,b.parent_id,b.item LIMIT ? OFFSET ?`, params: [...params, limit, offset] };
 }
 query(q: TypedQuery): IndexedItem[] {
  const { sql, params } = this.sql(q);
  return this.statement(sql).all(...params).map(raw => this.decode(raw, q.view));
 }
 private decode(raw: unknown, view?: "tool"): IndexedItem {
   const row = raw as IndexedItem;
   const key = row.item + (view ?? "full");
   let value = this.parsed.get(key);
   if (!value) {
    value = JSON.parse(row.payload) as Row;
    this.parsed.set(key, value);
    const bytes = Buffer.byteLength(row.payload); this.parsedSizes.set(key, bytes); this.parsedBytes += bytes;
    while (this.parsedBytes > 16 * 1024 * 1024 && this.parsed.size) {
      const oldest = this.parsed.keys().next().value!;
      this.parsedBytes -= this.parsedSizes.get(oldest)!; this.parsedSizes.delete(oldest); this.parsed.delete(oldest);
    }
   }
   return { ...row, value };
 }
 /** Exhaust one indexed cursor before dynamic filtering. Repeated OFFSET sorts are quadratic at scale. */
 all(q: Omit<TypedQuery, "limit" | "offset">): IndexedItem[] {
  // Only immutable recall is cached. HP, deck, relevance, predicates and presentation stay outside this layer.
  const key = JSON.stringify(Object.fromEntries(Object.entries(q).sort(([a], [b]) => a.localeCompare(b))));
  const hit = this.recalls.get(key); if (hit) return hit.rows;
  const { sql, params } = this.sql(q), statement = this.statement(sql.replace(/ LIMIT \? OFFSET \?$/, ""));
  const rows = Array.from(statement.iterate(...params.slice(0, -2)), raw => this.decode(raw, q.view));
  const bytes = rows.reduce((sum, row) => sum + Buffer.byteLength(row.payload) + 256, 0);
  if (bytes <= 8 * 1024 * 1024) {
    this.recalls.set(key, { rows, bytes }); this.recallBytes += bytes;
    while (this.recallBytes > 8 * 1024 * 1024 || this.recalls.size > 64) {
      const oldest = this.recalls.keys().next().value!;
      this.recallBytes -= this.recalls.get(oldest)!.bytes; this.recalls.delete(oldest);
    }
  }
  return rows;
 }
 plan(q: TypedQuery): Row[] { const { sql, params } = this.sql(q); return this.db.prepare("EXPLAIN QUERY PLAN " + sql).all(...params); }
 sources(items: IndexedItem[]): Row[] {
  return items.map(e => ({ source: e.source ?? e.value.source ?? "own", character: e.character, file: basename(e.path), path: e.path,
   entry_id: e.original_id, version: this.version, knowledge_version: this.version, revision: e.revision, sha256: this.files[e.path], item_sha256: e.item,
   confidence: e.value.confidence ?? "unknown", evidence_status: e.evidence_status, limits: e.value.limits ?? e.value.limitations ?? [] }));
 }
}

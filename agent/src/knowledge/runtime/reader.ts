/** Fixed-parameter indexed queries. Gameplay can open an existing database read-only, never latest. */
import { TOPICS, BUSINESS_TYPES } from "./classification.js";
import { DatabaseSync } from "node:sqlite";
import { basename, dirname, join, resolve } from "node:path";
import { runtimeKnowledgeRoot } from "../runtime-paths.js";
import type { Row } from "./validation.js";
import type { BusinessType } from "./projection.js";
import { safeSQLiteVersion } from "./sqlite-version.js";
import { createHash } from "node:crypto";

export interface TypedQuery {
 character: string; type: BusinessType; ascension?: number; text?: string; entity?: string; topic?: string; id?: string;
 category?: string; gameVersion?: string; questions?: string[]; limit?: number; offset?: number;
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
 private coverages = new Map<string, Row>();
 private files: Record<string, string>;
 private statements = new Map<string, ReturnType<DatabaseSync["prepare"]>>();
 constructor(readonly root: string, readonly version: string) {
  if (!/^K1-[a-f0-9]{64}$/.test(version)) throw new Error("invalid bound knowledge version");
  this.db = new DatabaseSync(join(root, "knowledge.sqlite"), { readOnly: true });
  try {
   this.db.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=5000;");
   const sqlite = String(this.db.prepare("SELECT sqlite_version() version").get()!["version"]);
   if (!safeSQLiteVersion(sqlite)) throw new Error(`SQLite ${sqlite} lacks required WAL-reset fix`);
   if (this.db.prepare("SELECT value FROM metadata WHERE key='schema'").get()?.["value"] !== "3") throw new Error("typed knowledge schema requires owner migration");
   const release = this.db.prepare("SELECT manifest FROM releases WHERE version=?").get(version);
   if (!release) throw new Error("bound knowledge version is unavailable");
   this.files = (JSON.parse(String(release["manifest"])) as { files: Record<string, string> }).files;
  } catch (error) { this.db.close(); throw error; }
 }
 close(): void { this.db.close(); }
 fileDigest(path: string): string | undefined { return this.files[path]; }
 /** Read exact release membership, never current or an editable snapshot file. */
 document(path: string): { text: string; sha256: string } | null {
  const expected = this.files[path];
  if (!expected) return null;
  const row = this.statement("SELECT d.body FROM release_files f JOIN documents d ON d.digest=f.digest WHERE f.version=? AND f.path=? AND f.digest=?").get(this.version, path, expected);
  if (!row || typeof row["body"] !== "string" || createHash("sha256").update(row["body"]).digest("hex") !== expected) throw Error("bound knowledge document checksum mismatch");
  return { text: row["body"], sha256: expected };
 }
 private statement(sql: string) {
  let s = this.statements.get(sql);
  if (!s) { s = this.db.prepare(sql); this.statements.set(sql, s); }
  return s;
 }
 private sql(q: TypedQuery) {
  const limit = q.limit ?? 100, offset = q.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0
   || !(BUSINESS_TYPES as readonly string[]).includes(q.type) || q.topic !== undefined && !(TOPICS as readonly string[]).includes(q.topic)
   || [q.entity, q.category, q.id, q.gameVersion].some(v => v !== undefined && (typeof v !== "string" || !v.trim() || v.length > 200))
   || q.ascension !== undefined && (!Number.isInteger(q.ascension) || q.ascension < 0 || q.ascension > 20)
   || (q.text?.length ?? 0) > 200 || !/^[a-z0-9_]+$/.test(q.character)) throw new Error("invalid typed query bounds");
  const conditions = ["b.type=?", "b.character IN (?,'common')", "EXISTS(SELECT 1 FROM release_entries p WHERE p.version=? AND p.revision=b.revision)"],
   params: Array<string | number> = [q.type, q.character, this.version];
  const classifiedTerm = (categories: string[], value: string) => {
   params.push(...categories, value.toLowerCase(), this.version);
   return `b.item IN (SELECT ct.item FROM classification_terms ct WHERE ct.category IN (${categories.map(() => "?").join(",")}) AND ct.term=? AND EXISTS(SELECT 1 FROM release_entries cp WHERE cp.version=? AND cp.revision=ct.revision))`;
  };
  if (q.gameVersion) { conditions.push("(b.game_version IS NULL OR b.game_version=?)"); params.push(q.gameVersion); }
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
    const original = conditions.pop()!;
    conditions.push(`(${original} OR ${classifiedTerm(["entity", "alias"], value)})`);
   } else {
    params.push(category, value.toLowerCase());
    const original = "b.item IN (SELECT item FROM item_terms WHERE category=? AND term=?)";
    conditions.push(category === "topic" ? `((c.revision IS NULL AND ${original}) OR ${classifiedTerm(["topic"], value)})` : original);
   }
  }
  if (q.questions?.length) {
   conditions.push(`b.item IN (SELECT item FROM item_terms WHERE category='question' AND term IN (${q.questions.map(() => "?").join(",")}))`);
   params.push(...q.questions);
  }
  if (q.text) {
   if (Array.from(q.text).length < 3) { conditions.push("b.item IN (SELECT item FROM item_grams WHERE gram=?)"); params.push(q.text.toLowerCase()); }
   else { conditions.push("b.item IN (SELECT item FROM item_search WHERE item_search MATCH ?)"); params.push('"' + q.text.replaceAll('"', '""') + '"'); }
   const original = conditions.pop()!; conditions.push(`(${original} OR ${classifiedTerm(["alias"], q.text)})`);
  }
  const projection = `b.item,b.revision,b.type,b.original_id,b.parent_id,b.ordinal,b.character,b.status,b.game_version,b.${q.view === "tool" ? "tool_payload" : "payload"} AS payload`;
  return { sql: `SELECT ${projection},r.path,r.source,r.confidence,r.evidence_status,c.payload AS classification_payload,c.revision AS classification_revision,
   CASE WHEN c.payload IS NOT NULL THEN json_extract(c.payload,'$.topics') ELSE json_extract(b.payload,'$.topics') END AS classification_topics
   FROM business_items b JOIN revisions r ON r.revision=b.revision LEFT JOIN classification_bindings c ON c.item=b.item
   AND EXISTS(SELECT 1 FROM release_entries cp WHERE cp.version=? AND cp.revision=c.revision)
   WHERE ${conditions.join(" AND ")} ORDER BY b.character,b.original_id,b.parent_id,b.item LIMIT ? OFFSET ?`, params: [this.version, ...params, limit, offset] };
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
   const metadata = row.classification_payload ? JSON.parse(String(row.classification_payload)) : null;
   const topics = row.classification_topics === null ? null : JSON.parse(String(row.classification_topics));
   return { ...row, value, classification: { state: topics === null ? "unknown" : "classified", topics,
    ...(metadata ? { metadata, source: { path: row.character === "common" ? "common/classification.json" : `characters/${row.character}/classification.json`, revision: row.classification_revision,
     sha256: this.files[row.character === "common" ? "common/classification.json" : `characters/${row.character}/classification.json`] } } : {}) } };
 }
 /** Exhaust one indexed cursor before dynamic filtering. Repeated OFFSET sorts are quadratic at scale. */
 all(q: Omit<TypedQuery, "limit" | "offset">): IndexedItem[] {
  // Only immutable recall is cached. HP, deck, relevance, predicates and presentation stay outside this layer.
  const key = JSON.stringify(Object.fromEntries(Object.entries(q).sort(([a], [b]) => a.localeCompare(b))));
  const hit = this.recalls.get(key); if (hit) return hit.rows;
  const { sql, params } = this.sql(q), statement = this.statement(sql.replace(/ LIMIT \? OFFSET \?$/, ""));
  const rows = Array.from(statement.iterate(...params.slice(0, -2)), raw => this.decode(raw, q.view));
  const bytes = rows.reduce((sum, row) => sum + Buffer.byteLength(row.payload) + Buffer.byteLength(String(row.classification_payload ?? "")) + 512, 0);
  if (bytes <= 8 * 1024 * 1024) {
    this.recalls.set(key, { rows, bytes }); this.recallBytes += bytes;
    while (this.recallBytes > 8 * 1024 * 1024 || this.recalls.size > 64) {
      const oldest = this.recalls.keys().next().value!;
      this.recallBytes -= this.recalls.get(oldest)!.bytes; this.recalls.delete(oldest);
    }
  }
  return rows;
 }
 /** Counts are diagnostics within this bound role/common static scope, never applicable knowledge. */
 coverage(q: Omit<TypedQuery, "limit" | "offset">): Row {
  const key = JSON.stringify(q), cached = this.coverages.get(key); if (cached) return cached;
  const { sql, params } = this.sql(q);
  const inner = sql.replace(/ ORDER BY b.character,b.original_id,b.parent_id,b.item LIMIT \? OFFSET \?$/, "");
  const row = this.statement(`SELECT count(*) AS total, count(classification_topics) AS classified FROM (${inner})`).get(...params.slice(0, -2))!;
  const result = { total: Number(row.total), classified: Number(row.classified), unknown: Number(row.total) - Number(row.classified) };
  this.coverages.set(key, result); if (this.coverages.size > 64) this.coverages.delete(this.coverages.keys().next().value!);
  return result;
 }
 plan(q: TypedQuery): Row[] { const { sql, params } = this.sql(q); return this.db.prepare("EXPLAIN QUERY PLAN " + sql).all(...params); }
 sources(items: IndexedItem[]): Row[] {
  return items.map(e => ({ source: e.source ?? e.value.source ?? "own", character: e.character, file: basename(e.path), path: e.path,
   entry_id: e.original_id, version: this.version, knowledge_version: this.version, revision: e.revision, sha256: this.files[e.path], item_sha256: e.item,
   classification: e.classification,
   confidence: e.value.confidence ?? "unknown", evidence_status: e.evidence_status, limits: e.value.limits ?? e.value.limitations ?? [] }));
 }
}

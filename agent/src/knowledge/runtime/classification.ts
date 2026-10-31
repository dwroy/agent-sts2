/** Explicit classification is learner-authored metadata, never inferred from prose or identities. */
import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export const BUSINESS_TYPES = ["experience", "strategy", "reflex", "core", "combo", "direction", "vocab", "fact"] as const;
export type BusinessType = typeof BUSINESS_TYPES[number];
export const TOPICS = ["startup", "boss", "double_boss", "build_route", "climb_route"] as const;
export interface Classification {
 id: string;
 target: { path: string; type: BusinessType; id: string; parent_id?: string; sha256: string };
 topics: typeof TOPICS[number][];
 entities: string[];
 aliases: string[];
 evidence: string[];
 rationale: string;
}
export const canonical = (value: unknown): string => {
 if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
 if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
 return JSON.stringify(value);
};
export const classificationDigest = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const only = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).every(k => keys.includes(k));
const text = (v: unknown): v is string => typeof v === "string" && !!v.trim() && v.length <= 200;
const strings = (v: unknown, max: number) => Array.isArray(v) && v.length <= max && v.every(text) && new Set(v).size === v.length;

export function validateTopics(value: unknown): void {
 if (!strings(value, TOPICS.length) || !(value as unknown[]).every(t => (TOPICS as readonly unknown[]).includes(t))) throw Error("invalid explicit classification topics");
}
/** The parent disambiguates combos, vocabulary dimensions and kind-qualified facts. */
export function classificationTargets(path: string, body: Record<string, any>): Array<{ type: BusinessType; id: string; parent_id?: string; value: any }> {
 const name = path.split("/").at(-1);
 if (name === "reflex-vocab.json") return Object.entries(body.dimensions).flatMap(([parent_id, entries]) => (entries as any[]).map(value => ({ type: "vocab" as const, id: value.id, parent_id, value })));
 const type = ({ "experience.json": "experience", "shared-experience.json": "experience", "strategy-entries.json": "strategy", "reflex.json": "reflex",
  "build-cores.json": "core", "direction-cards.json": "direction", "open-book.json": "fact" } as Record<string, BusinessType>)[name!];
 if (!type) return [];
 return body.entries.flatMap((value: any) => [{ type, id: value.id ?? value.direction, ...(type === "fact" ? { parent_id: value.kind } : {}), value },
  ...(type === "core" ? value.combos.map((v: any) => ({ type: "combo", id: v.id, parent_id: value.direction, value: v })) : [])]);
}
export function validateClassifications(path: string, body: Record<string, any>, files: Record<string, string>): void {
 const character = path.startsWith("common/") ? "common" : path.split("/")[1];
 if (!only(body, ["schema", "character", "entries"]) || body.schema !== "knowledge-classification-v1" || body.character !== character || !Array.isArray(body.entries) || body.entries.length > 20000) throw Error("invalid classification document");
 const ids = new Set(), targets = new Set();
 const targetFiles = new Map<string, Map<string, ReturnType<typeof classificationTargets>[number]>>();
 for (const e of body.entries) {
  if (!object(e) || !only(e, ["id", "target", "topics", "entities", "aliases", "evidence", "rationale"]) || !text(e.id) || !object(e.target)
   || !only(e.target, ["path", "type", "id", "parent_id", "sha256"]) || !text(e.target.id) || e.target.parent_id !== undefined && !text(e.target.parent_id)
   || !/^[a-f0-9]{64}$/.test(e.target.sha256) || !strings(e.entities, 32) || !strings(e.aliases, 32) || !strings(e.evidence, 64) || !e.evidence.length
   || !text(e.rationale)) throw Error("invalid classification entry");
  validateTopics(e.topics);
  const t = e.target, expectedPrefix = character === "common" ? "common/" : `characters/${character}/`;
  if (typeof t.path !== "string" || !t.path.startsWith(expectedPrefix) || !files[t.path] || t.path.endsWith("/classification.json")) throw Error("classification target path/character mismatch");
  let indexed = targetFiles.get(t.path);
  if (!indexed) {
   indexed = new Map(classificationTargets(t.path, JSON.parse(files[t.path]!)).map(v => [canonical([t.path, v.type, v.id, v.parent_id ?? null]), v]));
   targetFiles.set(t.path, indexed);
  }
  const key = canonical([t.path, t.type, t.id, t.parent_id ?? null]), target = indexed.get(key);
  if (!target || classificationDigest(target.value) !== t.sha256) throw Error("dangling or stale classification reference");
  if (ids.has(e.id) || targets.has(key)) throw Error("duplicate classification identity/target");
  ids.add(e.id); targets.add(key);
 }
}

/** Relations are immutable and selected through BOTH the content and metadata release membership. */
export function projectClassifications(db: DatabaseSync, revisions: string[]): void {
 const get = db.prepare("SELECT payload FROM revisions WHERE revision=? AND kind='classification'");
 const targets = db.prepare("SELECT b.item,b.payload FROM business_items b JOIN revisions r ON r.revision=b.revision WHERE r.path=? AND b.type=? AND b.character=? AND b.original_id=? AND (CASE WHEN b.type='fact' THEN json_extract(b.payload,'$.kind') ELSE b.parent_id END) IS ?");
 const bind = db.prepare("INSERT OR IGNORE INTO classification_bindings VALUES(?,?,?)"), term = db.prepare("INSERT OR IGNORE INTO classification_terms VALUES(?,?,?,?)");
 for (const revision of revisions) {
  const row = get.get(revision); if (!row) continue;
  const e = JSON.parse(String(row.payload)) as Classification, t = e.target;
  for (const b of targets.all(t.path, t.type, t.path.startsWith("common/") ? "common" : t.path.split("/")[1]!, t.id, t.parent_id ?? null)) {
   if (classificationDigest(JSON.parse(String(b.payload))) !== t.sha256) continue;
   bind.run(revision, String(b.item), JSON.stringify(e));
   for (const [category, values] of [["topic", e.topics], ["entity", e.entities], ["alias", e.aliases]] as const) for (const value of values) term.run(revision, String(b.item), category, value.toLowerCase());
  }
 }
}

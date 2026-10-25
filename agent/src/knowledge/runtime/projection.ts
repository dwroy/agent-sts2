import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { evidenceRows, object, type Row } from "./validation.js";

export const BUSINESS_TYPES = ["experience", "strategy", "reflex", "core", "combo", "direction", "vocab", "fact"] as const;
export type BusinessType = typeof BUSINESS_TYPES[number];
export const TOPICS = ["startup", "boss", "double_boss", "build_route", "climb_route"] as const;
const json = (v: unknown) => JSON.stringify(v);
const array = (v: unknown): any[] => Array.isArray(v) ? v : [];

/** Only explicit fields create relations. Text, IDs and labels never infer a planning topic. */
export function projectRevision(db: DatabaseSync, row: Row): void {
 const e = JSON.parse(String(row.payload)) as Row;
 const type: BusinessType | undefined = ({ experience: "experience", "shared-experience": "experience", "strategy-entries": "strategy",
  reflex: "reflex", "build-cores": "core", "direction-cards": "direction", "reflex-vocab": "vocab", "open-book": "fact" } as Record<string, BusinessType>)[String(row.kind)];
 if (!type) return; // The pinned archetype geometry is not a gameplay assertion.
 function insert(type: BusinessType, entry: Row, id: string, ordinal: number, parent: string | null = null, dimension?: string): void {
  const item = createHash("sha256").update(`${row.revision}\n${type}\n${parent ?? ""}\n${id}`).digest("hex");
  const tool = type === "core" ? { id, direction: entry.direction, name: entry.name, status: entry.status, scope: entry.scope,
   combos: entry.combos.map((c: Row) => ({ id: c.id, confidence: c.confidence })), linked_experience: entry.linked_experience,
   linked_reflex: entry.linked_reflex, evidence_relation: "combos", representation: "core_summary", omitted_fields: ["card_pool", "pivot_signals", "failure_modes", "combos.*"] }
   : type === "combo" ? { id, core_id: parent, types: entry.types, boss: entry.boss, cards: entry.cards,
     prerequisites: entry.prerequisites, evidence: entry.evidence, confidence: entry.confidence, linked_experience: entry.linked_experience,
     fits: entry.fits, representation: "combo_summary", omitted_fields: ["metrics"] } : entry;
  if (!db.prepare("INSERT INTO business_items VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(item) DO NOTHING").run(item, String(row.revision), type, id, parent, ordinal,
   String(row.character), entry.status ?? null, entry.game_version ?? entry.scope?.game_version ?? null, json(entry), json(tool)).changes) return;
  const term = (category: string, value: unknown) => {
   if (typeof value === "string" && value) db.prepare("INSERT OR IGNORE INTO item_terms VALUES(?,?,?)").run(item, category, value.toLowerCase());
  };
  const link = (relation: string, value: unknown) => {
   if (typeof value === "string") db.prepare("INSERT OR IGNORE INTO item_links VALUES(?,?,?)").run(item, relation, value);
  };
  term("entity", id); term("entity", entry.name); term("entity", entry.label_en);
  for (const a of array(entry.aliases)) term("entity", a);
  for (const t of array(entry.topics)) if ((TOPICS as readonly string[]).includes(t)) term("topic", t);
  for (const t of array(entry.categories)) term("category", t);
  if (type === "fact") term("category", entry.kind);
  for (const n of array(entry.scope?.ascensions)) term("ascension", String(n));
  if (typeof entry.scope === "string") { const [cat, entity] = entry.scope.split(":"); term("category", cat); term("entity", entity); }
  for (const q of array(entry.trigger?.question_types)) term("question", q);
  for (const a of array(entry.trigger?.acts)) term("act", String(a));
  for (const b of array(entry.trigger?.bosses)) term("entity", b);
  for (const c of array(entry.trigger?.deck_cards)) term("entity", c.name);
  for (const c of Object.keys(entry.card_pool ?? {})) term("entity", c);
  for (const c of array(entry.cards)) for (const id of c.any_of ?? [c.id]) term("entity", id);
  if (parent) term("entity", parent);
  if (entry.boss) term("entity", entry.boss);
  // Equality predicates carry explicit entities; no arbitrary prose extraction.
  const predicate = (p: unknown): void => {
   if (!object(p)) return;
   if (p.op === "eq" && /^(card|enemy|boss|relic|potion)\.(id|name)$/.test(p.field ?? "")) term("entity", p.value);
   for (const a of array(p.args)) predicate(a);
   predicate(p.arg);
  };
  predicate(entry.predicate);
  for (const [field, relation] of [["source_experience", "experience"], ["linked_experience", "experience"], ["linked_reflex", "reflex"],
   ["directions", "direction"], ["cores", "core"], ["combos", "combo"]]) {
   for (const value of array(entry[field!])) if (typeof value === "string") link(relation!, value);
  }
  if (entry.signal?.kind === "tag") link("vocab", entry.signal.value);
  for (const combo of array(entry.combos)) if (object(combo)) link("combo", combo.id);
  const evidence = [...evidenceRows(entry), ...array(entry.sources), ...array(entry.shared?.sources),
   ...array(entry.counterexamples).map(value => ({ value, role: "contradict" })),
   ...array(entry.contradicting).map(run => ({ run, role: "contradict", source: "own" }))];
  const addEvidence = db.prepare("INSERT INTO item_evidence VALUES(?,?,?,?,?,?)");
  for (const [ordinal, value] of evidence.entries()) {
   const ev = object(value) ? value : {};
   addEvidence.run(item, ordinal, ev.role ?? "support", ev.source ?? null, ev.dataset_sha256 ?? ev.evidence_sha256 ?? null, json(value));
  }
  if (type === "experience") db.prepare("INSERT INTO experience_details VALUES(?,?,?,?,?)").run(item, entry.scope, entry.lesson, entry.n_support, entry.n_contradict);
  if (type === "strategy") db.prepare("INSERT INTO strategy_details VALUES(?,?,?,?)").run(item, entry.strategy, json(entry.trigger), entry.confidence);
  if (type === "reflex") db.prepare("INSERT INTO reflex_details VALUES(?,?,?,?)").run(item, entry.applies_to, json(entry.predicate), json(entry.signal));
  if (type === "core" || type === "direction") db.prepare("INSERT INTO core_details VALUES(?,?,?,?)").run(item, entry.direction ?? entry.id, entry.name ?? entry.label_en ?? id, json(entry.scope));
  if (type === "combo") { db.prepare("INSERT INTO combo_details VALUES(?,?,?,?,?)").run(item, parent!, entry.boss, json(entry.cards), entry.prerequisites === null ? null : json(entry.prerequisites)); link("core", parent); }
  if (type === "vocab") db.prepare("INSERT INTO vocab_details VALUES(?,?,?)").run(item, dimension!, entry.label_en);
  if (type === "fact") db.prepare("INSERT INTO fact_details VALUES(?,?,?,?)").run(item, entry.kind, entry.name, json(entry.facts));
  const text = type === "strategy" ? `${id} ${entry.strategy}` : type === "fact" ? [id, entry.name, ...array(entry.aliases)].join(" ") : json(entry);
  const points = Array.from(text.toLowerCase()), grams = new Set<string>();
  for (let i = 0; i < points.length; i++) { grams.add(points[i]!); if (i + 1 < points.length) grams.add(points[i]! + points[i + 1]!); }
  const addGram = db.prepare("INSERT INTO item_grams VALUES(?,?)");
  for (const gram of grams) addGram.run(gram, item);
  db.prepare("INSERT INTO item_search VALUES(?,?)").run(item, text);
 }
 if (type === "vocab") {
  let ordinal = 0;
  for (const [dimension, entries] of Object.entries(e.dimensions)) for (const entry of entries as Row[]) insert(type, entry, entry.id, ordinal++, dimension, dimension);
 } else {
  const id = e.id ?? e.direction;
  if (typeof id !== "string") throw new Error(`projection has no original identity: ${row.path}`);
  insert(type, e, id, 0);
  if (type === "core") for (const [ordinal, c] of (e.combos as Row[]).entries()) insert("combo", c, c.id, ordinal, id);
 }
}

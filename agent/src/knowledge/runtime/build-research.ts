/** Research is an archival business type. No execution consumer imports this module. */
import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { classificationDigest, classificationTargets } from "./classification.js";

type ObjectValue = Record<string, any>;
const object = (v: unknown): v is ObjectValue => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && !!v.trim();
const short = (v: unknown): v is string => text(v) && v.length <= 200;
const sha = (v: unknown) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(text);
const only = (v: ObjectValue, keys: string[]) => Object.keys(v).every(k => keys.includes(k));
export const RESEARCH_SCHEMA = `
CREATE TABLE IF NOT EXISTS research_terms(
 revision TEXT NOT NULL REFERENCES revisions(revision), category TEXT NOT NULL, term TEXT NOT NULL,
 PRIMARY KEY(revision,category,term));
CREATE INDEX IF NOT EXISTS research_term_lookup ON research_terms(category,term,revision);
CREATE TABLE IF NOT EXISTS research_grams(
 gram TEXT NOT NULL, revision TEXT NOT NULL REFERENCES revisions(revision), PRIMARY KEY(gram,revision));
`;

/** Provenance describes observations, not a fabricated aggregate statistic or synthetic own run. */
export function validateBuildResearch(body: ObjectValue, character: string, files: Record<string, string>): void {
 if (!only(body, ["schema", "character", "entries"]) || body.schema !== "build-research-v1" || body.character !== character || !Array.isArray(body.entries)) throw Error("invalid build research document");
 const ids = new Set();
 for (const e of body.entries) {
  if (!object(e) || !only(e, ["id", "revision", "title", "scope", "source", "status", "confidence", "evidence_status", "verified_complete_playbook", "validation_status", "sources", "evidence", "phases", "limitations", "unknowns", "original", "references", "attachments"])
   || !short(e.id) || ids.has(e.id) || !short(e.revision) || !short(e.title) || !object(e.scope)
   || !only(e.scope, ["character", "ascensions", "game_version"]) || e.scope.character !== character
   || !Array.isArray(e.scope.ascensions) || !e.scope.ascensions.length || !e.scope.ascensions.every((n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 20)
   || new Set(e.scope.ascensions).size !== e.scope.ascensions.length || !(e.scope.game_version === null || short(e.scope.game_version))
   || !short(e.source) || !["own", "mixed"].includes(e.source) && !/^external:\S+$/.test(e.source)
   || !["candidate", "retired"].includes(e.status) || e.verified_complete_playbook !== false || e.validation_status !== "unverified"
   || typeof e.confidence !== "number" || !Number.isFinite(e.confidence) || e.confidence < 0 || e.confidence > .49
   || !["aligned", "conflict", "unassessed"].includes(e.evidence_status) || !strings(e.limitations) || !e.limitations.length || !strings(e.unknowns)
   || !Array.isArray(e.sources) || !e.sources.length || !Array.isArray(e.evidence) || !e.evidence.length
   || !Array.isArray(e.phases) || !e.phases.length || e.phases.length > 24 || !Array.isArray(e.references)
   || !object(e.original) || !only(e.original, ["sha256", "content"]) || !sha(e.original.sha256) || typeof e.original.content !== "string" || createHash("sha256").update(e.original.content).digest("hex") !== e.original.sha256) throw Error("invalid or executable build research entry");
  ids.add(e.id);
  if (e.attachments !== undefined && (!Array.isArray(e.attachments) || e.attachments.length > 24)) throw Error("invalid research attachments");
  const attachments = new Set();
  for (const a of e.attachments ?? []) {
   if (!object(a) || !only(a, ["id", "media_type", "sha256", "content"]) || !short(a.id) || a.id.length > 80 || attachments.has(a.id)
    || !["application/json", "text/markdown", "text/plain"].includes(a.media_type) || typeof a.content !== "string"
    || !sha(a.sha256) || createHash("sha256").update(a.content).digest("hex") !== a.sha256) throw Error("invalid research attachment identity/checksum");
   if (a.media_type === "application/json") JSON.parse(a.content);
   attachments.add(a.id);
  }
  const sources = new Set();
  for (const s of e.sources) {
   if (!object(s) || !only(s, ["id", "source", "url", "game_version", "sha256", "downloaded_at", "sample", "filters", "license", "design", "limitations", "runs"])
    || !short(s.id) || sources.has(s.id) || !short(s.source) || !sha(s.sha256) || !short(s.game_version)
    || !object(s.sample) || !only(s.sample, ["n", "unit", "players"]) || !(s.sample.n === null || Number.isSafeInteger(s.sample.n) && s.sample.n > 0)
    || !short(s.sample.unit) || !(s.sample.players === null || Number.isSafeInteger(s.sample.players) && s.sample.players > 0)
    || !text(s.filters) || !strings(s.limitations) || !s.limitations.length) throw Error("invalid research provenance/sample");
   if (s.source.startsWith("external:")) {
    if (!/^external:\S+$/.test(s.source) || !/^https?:\/\/[^\s/]+/.test(s.url) || !/^\d{4}-\d{2}-\d{2}$/.test(s.downloaded_at) || !Number.isFinite(Date.parse(s.downloaded_at))
     || new Date(s.downloaded_at).toISOString().slice(0, 10) !== s.downloaded_at || !text(s.license) || s.design !== "observational" || s.runs !== undefined) throw Error("invalid external research provenance");
   } else if (s.source !== "own" || !strings(s.runs) || !s.runs.length || !s.runs.every((r: string) => /^[A-Z0-9]{12}$/.test(r))) throw Error("invalid own research evidence");
   sources.add(s.id);
  }
  const evidence = new Set();
  for (const ev of e.evidence) {
   if (!object(ev) || !only(ev, ["id", "source_id", "role", "ref", "observation", "limitations"]) || !short(ev.id) || evidence.has(ev.id)
    || !sources.has(ev.source_id) || !["support", "contradict", "unassessed"].includes(ev.role) || !text(ev.ref) || !text(ev.observation) || !strings(ev.limitations)) throw Error("invalid research evidence reference");
   if (ev.role === "contradict" && e.evidence_status !== "conflict") throw Error("research counterevidence requires conflict");
   evidence.add(ev.id);
  }
  const phases = new Set();
  for (const p of e.phases) {
   if (!object(p) || !only(p, ["id", "stage", "acts", "goals", "evidence_ids", "content"]) || !short(p.id) || p.id.length > 40 || phases.has(p.id)
    || !short(p.stage) || p.stage.length > 40 || !Array.isArray(p.acts) || !p.acts.every((a: unknown) => Number.isInteger(a) && Number(a) >= 1 && Number(a) <= 3)
    || !Array.isArray(p.goals) || !p.goals.every(short) || !Array.isArray(p.evidence_ids) || !p.evidence_ids.length || !p.evidence_ids.every((id: string) => evidence.has(id))
    || !(object(p.content) || text(p.content))) throw Error("invalid research phase/evidence");
   phases.add(p.id);
  }
  for (const ref of e.references) {
   if (!object(ref) || !only(ref, ["path", "type", "id", "parent_id", "sha256", "content"]) || typeof ref.path !== "string" || !ref.path.startsWith(`characters/${character}/`)
    || ref.path.endsWith("/build-research.json") || !files[ref.path] || !sha(ref.sha256)) throw Error("invalid research fragment reference");
   const target = classificationTargets(ref.path, JSON.parse(files[ref.path]!)).find(t => t.type === ref.type && t.id === ref.id && t.parent_id === ref.parent_id);
   if (!target || !object(ref.content) || (ref.content.id ?? ref.content.direction) !== ref.id || classificationDigest(ref.content) !== ref.sha256) throw Error("dangling or stale research fragment reference");
  }
 }
}

export function projectResearch(db: DatabaseSync, row: ObjectValue): void {
 const e = JSON.parse(String(row.payload));
 const add = (category: string, value: string) => db.prepare("INSERT OR IGNORE INTO research_terms VALUES(?,?,?)").run(String(row.revision), category, value.toLowerCase());
 for (const p of e.phases) {
  add("stage", p.stage); for (const a of p.acts) add("act", String(a)); for (const g of p.goals) add("goal", g);
 }
 const points = Array.from(String(row.payload).toLowerCase()), grams = new Set<string>();
 for (let i = 0; i < points.length; i++) { grams.add(points[i]!); if (i + 1 < points.length) grams.add(points[i]! + points[i + 1]!); }
 for (const gram of grams) db.prepare("INSERT OR IGNORE INTO research_grams VALUES(?,?)").run(gram, String(row.revision));
}

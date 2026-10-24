import { createHash } from "node:crypto";
import { parseStrategyLibrary, STRATEGY_LIMITS } from "../strategy-entries.js";
import { ARCHETYPES_SHA256 } from "../strategy-archetypes.js";
import { parseSharedExperience } from "../shared-experience.js";
import { validateBuildCoreFile } from "../../v6/build-core.js";
import { directionFile, reflexFile } from "../../v6/knowledge.js";
import { reflexVocabSchema } from "../../v6/formats.js";
import { validate } from "../../v6/schema.js";

export type Row = Record<string, any>;
export const object = (v: unknown): v is Row => !!v && typeof v === "object" && !Array.isArray(v);
export const MIGRATED_NAMES = new Set(["experience.json", "strategy-entries.json", "reflex.json", "reflex-vocab.json", "build-cores.json", "direction-cards.json"]);
export const ARCHETYPE_PATH = "external/sts2fun/builds-v1/archetypes.json";
export function allowedPath(path: string): boolean {
  return path === "common/shared-experience.json" || path === ARCHETYPE_PATH
    || /^characters\/[a-z0-9_]+\/[a-z-]+\.json$/.test(path) && MIGRATED_NAMES.has(path.split("/")[2]!);
}
export function rows(body: Row): Row[] { return Array.isArray(body.entries) ? body.entries : [{ id: "$document", ...body }]; }
export function evidenceRows(entry: Row): unknown[] {
  return Array.isArray(entry.evidence) ? entry.evidence : object(entry.evidence) ? [entry.evidence] : [];
}
function retains(before: unknown, after: unknown): boolean {
  if (Array.isArray(before)) return Array.isArray(after) && before.every(old => after.some(next => retains(old, next)));
  if (object(before)) return object(after) && Object.entries(before).every(([key, value]) =>
    ["n_support", "n_contradict"].includes(key) && typeof value === "number" ? Number(after[key]) >= value : retains(value, after[key]));
  return before === after;
}
const nonempty = (s: unknown) => typeof s === "string" && s.trim().length > 0;

/** Validate with the consumers' schemas, then check the complete release's cross-file references. */
export function validateDocuments(files: Record<string, string>): void {
  const parsed: Record<string, Row> = {};
  for (const [path, text] of Object.entries(files)) {
    if (!allowedPath(path) || Buffer.byteLength(text) > 8 * 1024 * 1024) throw new Error(`invalid document path/size: ${path}`);
    const body: unknown = JSON.parse(text);
    if (!object(body)) throw new Error(`invalid document: ${path}`);
    parsed[path] = body;
    const name = path.split("/").at(-1), character = path.split("/")[1];
    if (name === "shared-experience.json") parseSharedExperience(body, path);
    else if (name === "experience.json") {
      if (!nonempty(body.version) || !Array.isArray(body.entries)) throw new Error(`invalid experience: ${path}`);
      const ids = new Set();
      for (const e of body.entries) {
        if (!object(e) || !nonempty(e.id) || ids.has(e.id) || !nonempty(e.scope) || !nonempty(e.lesson)
          || !["active", "retired"].includes(e.status) || !["low", "med", "high"].includes(e.confidence)
          || !Array.isArray(e.asc) || e.asc.length !== 2 || !e.asc.every((n: unknown) => Number.isInteger(n) && Number(n) >= 0) || e.asc[0] > e.asc[1]
          || !Array.isArray(e.evidence) || !(e.evidence.length || e.status === "retired" && e.contradicting?.length) || !e.evidence.every(nonempty)
          || !Number.isInteger(e.n_support) || e.n_support < 0 || !Number.isInteger(e.n_contradict) || e.n_contradict < 0) throw new Error(`invalid experience entry: ${path}/${e.id}`);
        ids.add(e.id);
      }
    } else if (name === "strategy-entries.json") {
      if (Buffer.byteLength(text) > STRATEGY_LIMITS.fileBytes) throw new Error("strategy document exceeds consumer byte limit");
      parseStrategyLibrary(body);
    }
    else if (name === "archetypes.json") {
      if (!object(body.model) || Buffer.byteLength(text) > 200000 || createHash("sha256").update(text).digest("hex") !== ARCHETYPES_SHA256) throw new Error("invalid or incompatible archetype model");
    } else {
      const result = name === "build-cores.json" ? validateBuildCoreFile(body)
        : name === "direction-cards.json" ? validate(directionFile, body)
        : name === "reflex.json" ? validate(reflexFile, body) : validate(reflexVocabSchema, body);
      if (!result.ok) throw new Error(`invalid ${path}: ${result.issues.join("; ")}`);
      if (body.character !== character) throw new Error(`cross-character document: ${path}`);
    }
  }
  for (const [path, body] of Object.entries(parsed)) {
    if (!path.endsWith("/reflex.json")) continue;
    const prefix = path.slice(0, -"reflex.json".length);
    const cores = parsed[prefix + "build-cores.json"]?.entries ?? [];
    const directions = new Set(cores.length ? cores.map((e: Row) => e.direction) : (parsed[prefix + "direction-cards.json"]?.entries ?? []).map((e: Row) => e.id));
    const combos = new Set(cores.flatMap((e: Row) => e.combos.map((c: Row) => c.id)));
    const tags = new Set(Object.values(parsed[prefix + "reflex-vocab.json"]?.dimensions ?? {}).flatMap(v => (v as Row[]).map(e => e.id)));
    for (const entry of body.entries) {
      if (entry.directions?.some((id: string) => !directions.has(id)) || entry.cores?.some((id: string) => !directions.has(id))
        || entry.combos?.some((id: string) => !combos.has(id)) || entry.signal.kind === "tag" && !tags.has(entry.signal.value)) throw new Error(`incomplete reflex references: ${entry.id}`);
    }
  }
}

/** Revisions keep history, and an update cannot silently drop published evidence or counterexamples. */
export function validateUpdate(before: Record<string, string>, after: Record<string, string>): void {
  for (const [path, text] of Object.entries(before)) {
    const old = JSON.parse(text) as Row, next = JSON.parse(after[path] ?? "null") as Row | null;
    if (!next) throw new Error(`cannot delete published document: ${path}`);
    if (!Array.isArray(old.entries)) continue;
    const current = new Map(rows(next).map(e => [e.id, e]));
    for (const entry of rows(old)) {
      const changed = current.get(entry.id);
      if (!changed) throw new Error(`retire instead of deleting published entry: ${entry.id}`);
      if (JSON.stringify(entry) === JSON.stringify(changed)) continue;
      if (!retains(evidenceRows(entry), evidenceRows(changed))
        || !retains(entry.sources ?? [], changed.sources ?? []) || !retains(entry.counterexamples ?? [], changed.counterexamples ?? [])
        || (entry.contradicting ?? []).some((e: unknown) => !(changed.contradicting ?? []).includes(e))
        || Number(changed.n_contradict ?? 0) < Number(entry.n_contradict ?? 0)
        || entry.evidence_status === "conflict" && changed.evidence_status !== "conflict") throw new Error(`published counterevidence must be preserved: ${entry.id}`);
      // Scope changes require a separate evidence-reviewed migration, not a routine content callback.
      for (const key of ["scope", "asc", "shared"]) if (JSON.stringify(entry[key]) !== JSON.stringify(changed[key])) throw new Error(`scope change requires owner review: ${entry.id}/${key}`);
    }
  }
}

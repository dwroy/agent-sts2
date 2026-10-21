/** Offline external facts. Live mod values win; references certify no simulation rule. */
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { KNOWLEDGE_DIR, workspaceRoot } from "../core/paths.js";
import { characterKey, knowledgeCharacter } from "./files.js";

type Row = Record<string, unknown>;
export type ReferenceKind = "cards" | "relics" | "monsters" | "events";
export interface ExternalReference extends Row {
  kind: ReferenceKind; id: string; name: string; aliases: string[];
  source: string; game_version: string; provenance: string[]; facts: Row;
  description?: string; description_en?: string;
  upgraded_description?: string; upgraded_description_en?: string;
}
interface Library {
  entries: ExternalReference[]; sources: Row[];
  byKey: Map<string, ExternalReference>; names: Map<string, ExternalReference[]>;
}
const object = (v: unknown): Row | null => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Row : null;
const kinds = new Set(["cards", "relics", "monsters", "events"]);
const cache = new Map<string, { stamp: string; library: Library }>();
export const OPEN_BOOK_MAX_BYTES = 18_000;
const typed: Record<string, ReferenceKind> = { card_id: "cards", relic_id: "relics", monster_id: "monsters", enemy_id: "monsters", event_id: "events" };
const collections: Record<string, ReferenceKind> = { cards: "cards", deck: "cards", hand: "cards", relics: "relics", monsters: "monsters", enemies: "monsters", events: "events" };
const validId = (id: string) => /^[A-Z][A-Z0-9_]{0,99}$/.test(id);
const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");

export function loadOpenBook(directory = KNOWLEDGE_DIR): Library {
  const overlay = directory === KNOWLEDGE_DIR ? join(workspaceRoot(), "data/external/open-book/catalog/knowledge") : null;
  const groups = ["common", "characters/silent"].map((scope) => [...(overlay ? [join(overlay, scope, "open-book.json")] : []), join(directory, scope, "open-book.json")]);
  const stamp = groups.flat().map((path) => { try { const s = statSync(path); return `${path}:${s.ino}:${s.size}:${s.mtimeMs}`; } catch { return `${path}:missing`; } }).join("/");
  const prior = cache.get(directory);
  if (prior?.stamp === stamp) return prior.library;
  const result: Library = { entries: [], sources: [], byKey: new Map(), names: new Map() };
  for (const paths of groups) for (const path of paths) {
    try {
      if (statSync(path).size > 10_000_000) continue;
      const data = JSON.parse(readFileSync(path, "utf8")) as Row;
      if (data.schema !== "open-book-v1" || !Array.isArray(data.entries)) continue;
      const manifest = object(data.sources);
      if (overlay && path.startsWith(overlay) && manifest?.revision !== "4f52f5a53597e4fdc6cf130f7ebe2cdd35236101") continue;
      for (const raw of data.entries) {
        const e = object(raw);
        if (!e || !kinds.has(String(e.kind)) || typeof e.id !== "string" || !validId(e.id) || typeof e.name !== "string" ||
          !Array.isArray(e.aliases) || !e.aliases.every((s) => typeof s === "string") || !Array.isArray(e.provenance) ||
          e.source !== "external:spire-codex" || e.game_version !== "v0.111.0" || !object(e.facts)) continue;
        const entry = e as ExternalReference;
        const key = `${entry.kind}:${entry.id}`;
        if (result.byKey.has(key)) continue;
        result.byKey.set(key, entry); result.entries.push(entry);
        for (const name of new Set([entry.id, entry.name, ...entry.aliases])) {
          if (name.length < 2) continue;
          result.names.set(name, [...(result.names.get(name) ?? []), entry]);
        }
      }
      const source = object(data.sources);
      if (source) result.sources.push(source);
      break;
    } catch { /* Missing/corrupt optional data must not interrupt play. */ }
  }
  cache.set(directory, { stamp, library: result });
  return result;
}

export function externalReference(kind: ReferenceKind, id: string, character: string, directory = KNOWLEDGE_DIR): ExternalReference | null {
  return characterKey(character) === "silent" ? loadOpenBook(directory).byKey.get(`${kind}:${id}`) ?? null : null;
}
export function externalCardReference(id: string, character: string, directory = KNOWLEDGE_DIR): ExternalReference | null {
  return externalReference("cards", id, character, directory);
}

function queue(kind: ReferenceKind, id: string, directory: string): void {
  if (!validId(id)) return;
  try {
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, `${kind}-${id}.json`), JSON.stringify({ schema: "open-book-missing-v1", kind, id, game_version: "v0.111.0" }) + "\n", { flag: "wx" });
  } catch { /* Immutable ID deduplication; queue errors must not become decision failures. */ }
}
const clean = (s: string): string => s.replace(/\[\/?(?:gold|blue|red|green|purple|orange|yellow|sine|jitter|b|i)\]/g, "").replace(/\s+/g, "").trim();
const unknown = "?(数值未知)";
const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Require an entire matching static numeric template, preserving every known number. */
export function fillExternalUnknown(text: string, reference: ExternalReference, upgraded: boolean): string {
  if (!text.includes(unknown) || reference.game_version !== "v0.111.0") return text;
  const pattern = new RegExp(`^${clean(text).split(unknown).map(escape).join("([+-]?\\d+(?:\\.\\d+)?)")}$`);
  const candidates = upgraded ? [reference.upgraded_description, reference.upgraded_description_en] : [reference.description, reference.description_en];
  const match = candidates.find((s) => s && pattern.test(clean(s)));
  return match ? `${match}（基础资料补全，${reference.source} ${reference.game_version} ${reference.id}${upgraded ? "+" : ""}；战斗修正未计）` : text;
}

export interface OpenBookOptions { character?: string; directory?: string; queueDir?: string | null; maxBytes?: number }

/** Bounded offline selection. The caller orders options/question before background deck facts. */
export function attachOpenBook(payload: unknown, options: OpenBookOptions = {}): unknown {
  if (characterKey(options.character ?? knowledgeCharacter()) !== "silent" || !object(payload)) return payload;
  const library = loadOpenBook(options.directory);
  const selected = new Map<string, ExternalReference>();
  const conflicts: Row[] = []; const missing = new Set<string>();
  const directory = options.queueDir === undefined ? join(workspaceRoot(), "data/external/open-book/pending") : options.queueDir;
  let budget = 120_000;
  const add = (kind: ReferenceKind, id: string): ExternalReference | undefined => {
    const entry = library.byKey.get(`${kind}:${id}`);
    if (entry) selected.set(`${kind}:${id}`, entry);
    else if (validId(id)) { missing.add(`${kind}:${id}`); if (directory) queue(kind, id, directory); }
    return entry;
  };
  const named = (text: string): ExternalReference[] => {
    const matches: ExternalReference[] = [];
    for (const [name, entries] of library.names) {
      if (entries.length !== 1 || !text.includes(name)) continue; // Ambiguous display names need a typed ID.
      if (/^[\x00-\x7f]+$/.test(name) && !new RegExp(`(?<![\\p{L}\\p{N}_])${escape(name)}(?![\\p{L}\\p{N}_])`, "u").test(text)) continue;
      matches.push(entries[0]!);
    }
    // A longer name suppresses its proper substring (e.g. an upgraded/compound card name).
    return [...new Set(matches)].filter((e) => !matches.some((other) => other !== e && other.name.includes(e.name) && other.name.length > e.name.length));
  };
  const visit = (value: unknown, scope?: ReferenceKind, depth = 0, dynamic = false): unknown => {
    if (depth > 16 || budget <= 0) return value;
    if (typeof value === "string") {
      budget -= value.length;
      const text = value.slice(0, Math.max(0, budget + value.length));
      // Choice values are JSON strings in the actual Brain API.
      if (text.startsWith("{") && text.length < 20_000) {
        try {
          const parsed = object(JSON.parse(text));
          if (parsed) { const filled = visit(parsed, scope, depth + 1, dynamic); return JSON.stringify(filled) === JSON.stringify(parsed) ? value : JSON.stringify(filled); }
        } catch { /* Ordinary prose. */ }
      }
      if (scope && validId(text)) add(scope, text);
      const refs = named(text);
      for (const entry of refs) selected.set(`${entry.kind}:${entry.id}`, entry);
      // run_brief/facts relic_effects use "name (ID): description". Only that exact static tail is filled.
      if (!dynamic && text.includes(unknown) && refs.length === 1) {
        const colon = value.search(/[:：]/);
        if (colon >= 0) {
          const prefix = value.slice(0, colon + 1); const tail = value.slice(colon + 1).trim();
          const filled = fillExternalUnknown(tail, refs[0]!, false);
          if (filled !== tail) return `${prefix} ${filled}`;
        }
      }
      return value;
    }
    if (Array.isArray(value)) return value.map((v) => visit(v, scope, depth + 1, dynamic));
    const row = object(value); if (!row) return value;
    let entry: ExternalReference | undefined;
    for (const [key, kind] of Object.entries(typed)) if (typeof row[key] === "string") entry = add(kind, row[key]);
    if (scope && typeof row.id === "string") entry = add(scope, row.id);
    // Pick summaries carry a display-name `card` and `text`, without a typed ID.
    const hasTypedIdentity = Object.keys(typed).some((key) => typeof row[key] === "string") || (scope && typeof row.id === "string");
    if (!entry && !hasTypedIdentity) for (const key of ["card", "relic", "monster", "event", "name"]) {
      const name = row[key];
      const matches = typeof name === "string" ? library.names.get(name) : undefined;
      if (matches?.length === 1) { entry = matches[0]; break; }
    }
    if (entry) selected.set(`${entry.kind}:${entry.id}`, entry);
    const out = Object.fromEntries(Object.entries(row).map(([key, v]) => [key, visit(v, collections[key], depth + 1, dynamic || ["resolved_rules_text", "rules_text", "combat", "board"].includes(key))]));
    if (entry) {
      const upgraded = row.upgraded === true || (typeof row.upgrade_level === "number" && row.upgrade_level > 0);
      for (const key of ["description", "text", "resolved_rules_text"]) {
        const actual = row[key]; if (typeof actual !== "string" || !actual) continue;
        if (key !== "resolved_rules_text" && !dynamic) out[key] = fillExternalUnknown(actual, entry, upgraded);
        const expected = upgraded ? [entry.upgraded_description, entry.upgraded_description_en] : [entry.description, entry.description_en];
        if (!actual.includes(unknown) && expected.some(Boolean) && !expected.some((s) => s && clean(s) === clean(actual))) {
          const conflict = { kind: entry.kind, id: entry.id, field: key, upgraded, actual: actual.slice(0, 800), external: expected.filter(Boolean), resolution: "当前 mod 优先；动态修正可能造成差异" };
          conflicts.push(conflict);
          if (directory) try {
            const dir = join(directory, "../conflicts"); mkdirSync(dir, { recursive: true });
            writeFileSync(join(dir, `${entry.kind}-${entry.id}-${upgraded ? "plus" : "base"}-${key}.json`), JSON.stringify(conflict) + "\n", { flag: "wx" });
          } catch { /* Keep the first observation, without run/player data. */ }
        }
      }
    }
    return out;
  };
  const enriched = visit(payload) as Row;
  const envelope: Row = {
    schema: "open-book-context-v1", source: "external:spire-codex", game_version: "v0.111.0",
    limits: "外部机械资料，与实盘证据分账；当前 mod 优先。升级 facts.upgrade 是增量；进阶阈值未知。资料存在不证明模拟已支持。省略项可按 kind/id 查询本地库。",
    sources: [], entries: [], conflicts: [], missing: [], omitted: selected.size,
  };
  const cap = Math.min(OPEN_BOOK_MAX_BYTES, Math.max(0, options.maxBytes ?? OPEN_BOOK_MAX_BYTES));
  // Include all enrichment bytes (including filled descriptions), not just the reference section.
  const delta = bytes(enriched) - bytes(payload);
  const fits = () => delta + 13 + bytes(envelope) <= cap;
  if (!fits()) return payload;
  const sourceRows = new Map<string, Row>();
  for (const source of library.sources) for (const [key, raw] of Object.entries(object(source.sources) ?? {})) {
    const meta = object(raw); if (meta) sourceRows.set(key, { key, url: meta.url, sha256: meta.sha256, license: meta.license, required_notice: meta.required_notice });
  }
  for (const entry of selected.values()) {
    const rows = envelope.entries as unknown[]; const sources = envelope.sources as Row[];
    const priorSources = sources.length;
    for (const key of entry.provenance) if (!sources.some((s) => s.key === key) && sourceRows.has(key)) sources.push(sourceRows.get(key)!);
    rows.push(entry); envelope.omitted = selected.size - rows.length;
    if (!fits()) { rows.pop(); sources.splice(priorSources); envelope.omitted = selected.size - rows.length; }
  }
  for (const [key, values] of [["conflicts", conflicts], ["missing", [...missing]]] as const) for (const value of values) {
    const rows = envelope[key] as unknown[]; rows.push(value); if (!fits()) rows.pop();
  }
  return { ...enriched, open_book: envelope };
}

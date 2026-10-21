/** Offline external facts. Current mod values always win; these facts certify no simulation rule. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { KNOWLEDGE_DIR, workspaceRoot } from "../core/paths.js";
import { characterKey, knowledgeCharacter } from "./files.js";

type Row = Record<string, unknown>;
export type ReferenceKind = "cards" | "relics" | "monsters" | "events";
export interface ExternalReference extends Row {
  kind: ReferenceKind;
  id: string;
  name: string;
  aliases: string[];
  source: string;
  game_version: string;
  provenance: string[];
  facts: Row;
  description?: string;
  description_en?: string;
  upgraded_description?: string;
  upgraded_description_en?: string;
}
interface Library { entries: ExternalReference[]; sources: unknown[] }
const object = (v: unknown): Row | null => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Row : null;
const kinds = new Set(["cards", "relics", "monsters", "events"]);
const cache = new Map<string, Library>();
export const OPEN_BOOK_MAX_BYTES = 18_000;
const typed: Record<string, ReferenceKind> = { card_id: "cards", relic_id: "relics", monster_id: "monsters", enemy_id: "monsters", event_id: "events" };

export function loadOpenBook(directory = KNOWLEDGE_DIR): Library {
  const prior = cache.get(directory);
  if (prior) return prior;
  const result: Library = { entries: [], sources: [] };
  for (const scope of ["common", "characters/silent"]) {
    try {
      const data = JSON.parse(readFileSync(join(directory, scope, "open-book.json"), "utf8")) as Row;
      if (data.schema !== "open-book-v1" || !Array.isArray(data.entries)) continue;
      result.entries.push(...data.entries.filter((e): e is ExternalReference => !!object(e) && kinds.has(e.kind) && /^[A-Z0-9_]+$/.test(e.id) && e.source === "external:spire-codex" && !!object(e.facts)));
      result.sources.push(data.sources);
    } catch { /* Optional library: missing/corrupt files do not interrupt play. */ }
  }
  cache.set(directory, result);
  return result;
}

export function externalCardReference(id: string, character: string, directory = KNOWLEDGE_DIR): ExternalReference | null {
  if (characterKey(character) !== "silent") return null;
  return loadOpenBook(directory).entries.find((e) => e.kind === "cards" && e.id === id) ?? null;
}

function queue(kind: ReferenceKind, id: string, queueDir: string): void {
  if (!/^[A-Z][A-Z0-9_]{0,99}$/.test(id)) return;
  try {
    mkdirSync(queueDir, { recursive: true });
    writeFileSync(join(queueDir, `${kind}-${id}.json`), JSON.stringify({ schema: "open-book-missing-v1", kind, id, game_version: "v0.111.0" }) + "\n", { flag: "wx" });
  } catch { /* Dedupe by ID; local queue failures must not become decision failures. */ }
}

const clean = (s: string): string => s.replace(/\[\/?(?:gold|blue|red|green|purple|orange|yellow|sine|jitter|b|i)\]/g, "").replace(/\s+/g, "").trim();
const unknown = "?(数值未知)";
const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Replace only an entire matching numeric template, never an arbitrary unknown or a dynamic combat value. */
export function fillExternalUnknown(text: string, reference: ExternalReference, upgraded: boolean): string {
  if (!text.includes(unknown) || reference.game_version !== "v0.111.0") return text;
  const pattern = new RegExp(`^${clean(text).split(unknown).map(escape).join("([+-]?\\d+(?:\\.\\d+)?)")}$`);
  const candidates = upgraded ? [reference.upgraded_description, reference.upgraded_description_en] : [reference.description, reference.description_en];
  const match = candidates.find((s) => s && pattern.test(clean(s)));
  return match ? `${match}（基础资料补全，${reference.source} ${reference.game_version} ${reference.id}${upgraded ? "+" : ""}；战斗修正未计）` : text;
}

export interface OpenBookOptions {
  character?: string;
  directory?: string;
  queueDir?: string | null;
  maxBytes?: number;
}

/** Pure reference selection plus a deduplicated fact-only missing/conflict queue; never performs network I/O. */
export function attachOpenBook(payload: unknown, options: OpenBookOptions = {}): unknown {
  if (characterKey(options.character ?? knowledgeCharacter()) !== "silent" || !object(payload)) return payload;
  const library = loadOpenBook(options.directory);
  const byKey = new Map(library.entries.map((e) => [`${e.kind}:${e.id}`, e]));
  const selected = new Map<string, ExternalReference>();
  const conflicts: Row[] = [];
  const missing = new Set<string>();
  const queueDir = options.queueDir === undefined ? join(workspaceRoot(), "data/external/open-book/pending") : options.queueDir;
  let budget = 120_000;
  const add = (kind: ReferenceKind, id: string): ExternalReference | undefined => {
    const entry = byKey.get(`${kind}:${id}`);
    if (entry) selected.set(`${kind}:${id}`, entry);
    else if (/^[A-Z][A-Z0-9_]{0,99}$/.test(id)) {
      missing.add(`${kind}:${id}`);
      if (queueDir) queue(kind, id, queueDir);
    }
    return entry;
  };
  const strings: string[] = [];
  const visit = (value: unknown, scope?: ReferenceKind, depth = 0): unknown => {
    if (depth > 16 || budget <= 0) return value;
    if (typeof value === "string") {
      if (scope && /^[A-Z][A-Z0-9_]{0,99}$/.test(value)) add(scope, value);
      strings.push(value.slice(0, Math.max(0, budget))); budget -= value.length; return value;
    }
    if (Array.isArray(value)) return value.map((v) => visit(v, scope, depth + 1));
    const row = object(value);
    if (!row) return value;
    let entry: ExternalReference | undefined;
    for (const [key, kind] of Object.entries(typed)) if (typeof row[key] === "string") entry = add(kind, row[key]);
    if (scope && typeof row.id === "string") entry = add(scope, row.id);
    const out = Object.fromEntries(Object.entries(row).map(([key, v]) => [key, visit(v, kinds.has(key) ? key as ReferenceKind : scope, depth + 1)]));
    if (entry) {
      const upgraded = row.upgraded === true || (typeof row.upgrade_level === "number" && row.upgrade_level > 0);
      for (const key of ["description", "resolved_rules_text"]) {
        const actual = row[key];
        if (typeof actual !== "string" || !actual) continue;
        // Combat card rules include player modifiers; only static descriptions may be filled.
        if (key === "description") out[key] = fillExternalUnknown(actual, entry, upgraded);
        const expected = upgraded ? [entry.upgraded_description, entry.upgraded_description_en] : [entry.description, entry.description_en];
        if (!actual.includes(unknown) && expected.some(Boolean) && !expected.some((s) => s && clean(s) === clean(actual))) {
          const conflict = { kind: entry.kind, id: entry.id, field: key, upgraded, actual: actual.slice(0, 800), external: expected.filter(Boolean), resolution: "以当前 mod 为准；外部仅作版本化参考，动态修正可能造成差异" };
          conflicts.push(conflict);
          if (queueDir) {
            try {
              const dir = join(queueDir, "../conflicts");
              mkdirSync(dir, { recursive: true });
              // One immutable first-observation per variant; no run/player data is recorded.
              writeFileSync(join(dir, `${entry.kind}-${entry.id}-${upgraded ? "plus" : "base"}-${key}.json`), JSON.stringify(conflict) + "\n", { flag: "wx" });
            } catch { /* Retain the first record. */ }
          }
        }
      }
    }
    return out;
  };
  const enriched = visit(payload) as Row;
  const haystack = strings.join("\n");
  for (const entry of library.entries) {
    // Token boundaries prevent e.g. STRIKE from matching STRIKE_SILENT or a name inside another name.
    const names = [entry.id, entry.name, ...entry.aliases].filter((s) => s.length >= 3);
    if (names.some((name) => new RegExp(`(?<![\\p{L}\\p{N}_])${escape(name)}(?![\\p{L}\\p{N}_])`, "u").test(haystack))) selected.set(`${entry.kind}:${entry.id}`, entry);
  }
  const envelope: Row = {
    schema: "open-book-context-v1", source: "external:spire-codex", game_version: "v0.111.0",
    limits: "外部机械资料，与本系统实盘证据分账。现场 mod 数值/文本优先；版本、升级、动态值与进阶不明时不得套用。资料存在不证明模拟已支持。",
    entries: [], conflicts: [], missing: [], omitted: selected.size,
  };
  const cap = Math.min(OPEN_BOOK_MAX_BYTES, Math.max(0, options.maxBytes ?? OPEN_BOOK_MAX_BYTES));
  const size = () => Buffer.byteLength(JSON.stringify(envelope), "utf8");
  if (size() > cap) return payload;
  for (const entry of selected.values()) {
    const rows = envelope.entries as unknown[];
    rows.push(entry);
    envelope.omitted = selected.size - rows.length;
    if (size() > cap) { rows.pop(); envelope.omitted = selected.size - rows.length; }
  }
  for (const [key, values] of [["conflicts", conflicts], ["missing", [...missing]]] as const) for (const value of values) {
    const rows = envelope[key] as unknown[];
    rows.push(value);
    if (size() > cap) rows.pop();
  }
  return { ...enriched, open_book: envelope };
}

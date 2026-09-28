/** JSON helpers: defensive conversion, stable serialisation, and a cheap content hash. */

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export function toJsonValue(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === "object") {
    const out: { [key: string]: JsonValue } = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry === undefined) continue;
      out[key] = toJsonValue(entry);
    }
    return out;
  }
  return String(value);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function numOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Key-sorted stringify, so the same object always hashes the same way. */
export function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const walk = (node: unknown): string => {
    if (node === null || node === undefined) return "null";
    if (typeof node === "number") return Number.isFinite(node) ? String(node) : "null";
    if (typeof node === "boolean" || typeof node === "string") return JSON.stringify(node);
    if (Array.isArray(node)) return `[${node.map(walk).join(",")}]`;
    if (typeof node === "object") {
      if (seen.has(node)) return '"<cycle>"';
      seen.add(node);
      const entries = Object.entries(node as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => `${JSON.stringify(key)}:${walk(entry)}`);
      return `{${entries.join(",")}}`;
    }
    return "null";
  };
  return walk(value);
}

/** FNV-1a, 32-bit, hex. Used to key decisions and detect duplicate states. */
export function shortHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function truncate(text: string, max: number): string {
  text = iconsToText(text);
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * The game renders energy (and the Regent's stars) as inline images; their res:// paths reached the
 * models verbatim ("获得res://…energy_icon.pngres://…energy_icon.png" = gain 2 energy). A run of N
 * adjacent icons reads "N点能量" / "N颗星"; any other inline image is dropped.
 */
export function iconsToText(text: string): string {
  const icon = (kind: string): string => `(?:\\[img\\])?res:\\/\\/[^\\s\\[\\]]*?${kind}\\.png(?:\\[\\/img\\])?`;
  const run = (kind: string): RegExp => new RegExp(`(?:${icon(kind)}\\s*)*${icon(kind)}`, "g");
  const count = (match: string): number => match.match(/\.png/g)?.length ?? 1;
  return text
    .replace(run("energy_icon"), (match) => `${count(match)}点能量`)
    .replace(run("star_icon"), (match) => `${count(match)}颗星`)
    .replace(new RegExp(icon("[^\\s\\[\\]]*?"), "g"), "");
}

/** Collapses whitespace and drops the mod's `[blue]…[/blue]` markup for model consumption. */
export function stripMarkup(text: string): string {
  return iconsToText(text)
    .replace(/\[\/?[a-zA-Z_]+(?::[^\]]*)?\]/g, "")
    .replace(/\\([\[\]{}])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

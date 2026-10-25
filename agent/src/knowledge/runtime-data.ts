/** Immutable fixed-method data is distinct from formal K1 knowledge and source releases. */
import { basename, dirname, join, resolve } from "node:path";
import { KNOWLEDGE_DIR } from "../core/paths.js";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const names = new Set(["monster-db.json", "move-model.json", "card-upgrades.json", "monster-records.json", "outcome-stats.json",
  "construction-opportunities.json", "room-costs.json", "boss-damage.json", "potion-equivalents.json", "v6-history.json",
  "fight-value.json", "fight-value-gates.json", "boss-trust.json", "opening-value.json", "event-pages.json"]);
const snapshot = process.env["STS2_DATA_SNAPSHOT"], version = process.env["STS2_DATA_VERSION"];
const managed: unknown = JSON.parse(process.env["STS2_DATA_MANAGED_PATHS"] ?? "[]");
if (!Array.isArray(managed) || managed.some((path: unknown) => typeof path !== "string"
  || !/^(common|characters\/(?:\{character\}|[a-z][a-z0-9_]*))\/[^/]+\.json$/.test(path)
  || !names.has(basename(path)))) throw new Error("invalid fixed data consumer selection");
const managedPaths = managed as string[];
function selected(path: string): boolean {
  return managedPaths.some(pattern => pattern === path || pattern.includes("{character}")
    && /^characters\/[a-z][a-z0-9_]*\/[^/]+\.json$/.test(path)
    && pattern.replace("{character}", path.split("/")[1]!) === path);
}
if (Boolean(snapshot) !== Boolean(version) || snapshot && (!snapshot.startsWith("/") || !/^D1-[a-f0-9]{64}$/.test(version ?? "")
  || basename(snapshot) !== version || basename(dirname(snapshot)) !== "data-snapshots")) throw new Error("invalid fixed data binding");
let dependenciesChecked = false;
function checkDependencies(): void {
  if (!snapshot || dependenciesChecked) return;
  // Keep the disabled resolver free of fs imports: existing fs mock factories
  // import knowledge/files themselves. D1 verification uses the real local bytes.
  const { readFileSync } = createRequire(import.meta.url)("node:fs") as typeof import("node:fs");
  const dependencies: unknown = JSON.parse(process.env["STS2_DATA_KNOWLEDGE_DEPENDENCIES"] ?? "{}");
  if (!dependencies || typeof dependencies !== "object" || Array.isArray(dependencies)) throw new Error("invalid fixed data dependencies");
  for (const [name, digest] of Object.entries(dependencies)) {
    if (!/^characters\/[a-z][a-z0-9_]*\/build-cores\.json$/.test(name) || typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest)) throw new Error("unknown fixed data consumer dependency");
    const path = join(process.env["STS2_KNOWLEDGE_SNAPSHOT"] ?? KNOWLEDGE_DIR, name);
    if (createHash("sha256").update(readFileSync(path)).digest("hex") !== digest) throw new Error("fixed data/knowledge version conflict");
  }
  dependenciesChecked = true;
}

export function runtimeDataFile(dir: string, path: string): string | null {
  if (!snapshot || resolve(dir) !== resolve(KNOWLEDGE_DIR) || !selected(path)) return null;
  checkDependencies();
  return join(snapshot, path);
}

export function runtimeDataRoot(dir: string, path: string): string {
  return runtimeDataFile(dir, path) ? snapshot! : dir;
}

export function runtimeDataIdentity(): { version: string; directory: string; run: string; managed_paths: string[] } | null {
  if (!snapshot || !version) return null;
  // The outer K1 CLI imports this module before it binds its child. Validate
  // only when a gameplay consumer/run-config uses D1, after both bindings exist.
  checkDependencies();
  const directory = process.env["STS2_DATA_RUNTIME"], run = process.env["STS2_DATA_RUN_KEY"];
  if (!directory || !run || resolve(directory) !== dirname(dirname(snapshot))) throw new Error("missing original fixed data identity");
  return { version, directory, run, managed_paths: [...managedPaths] };
}

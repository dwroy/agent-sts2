/** Read-only snapshot routing. No filesystem or SQLite access in the gameplay path resolver. */
import { basename, dirname, join, resolve } from "node:path";
import { KNOWLEDGE_DIR } from "../core/paths.js";
import { runtimeDataFile } from "./runtime-data.js";

const migrated = new Set(["experience.json", "shared-experience.json", "strategy-entries.json", "reflex.json", "reflex-vocab.json", "build-cores.json", "direction-cards.json", "open-book.json", "decision-context.json"]);
// Captured at process startup. A publication never switches an already-running reader.
const snapshot = process.env["STS2_KNOWLEDGE_SNAPSHOT"];
const version = process.env["STS2_KNOWLEDGE_VERSION"];
if (Boolean(snapshot) !== Boolean(version) || snapshot && (!snapshot.startsWith("/") || !/^K1-[a-f0-9]{64}$/.test(version ?? "")
  || basename(snapshot) !== version || basename(dirname(snapshot)) !== "snapshots")) throw new Error("invalid runtime knowledge binding");

export function runtimeKnowledgeIdentity(): { version: string; snapshot: string } | null {
  return snapshot && version ? { version, snapshot } : null;
}
export function runtimeKnowledgeRoot(dir: string): string {
  return snapshot && resolve(dir) === resolve(KNOWLEDGE_DIR) ? snapshot : dir;
}
export function runtimeKnowledgeFile(dir: string, relativePath: string): string {
  const data = runtimeDataFile(dir, relativePath);
  if (data) return data;
  const name = relativePath.split("/").at(-1)!;
  const selected = migrated.has(name) || relativePath === "external/sts2fun/builds-v1/archetypes.json";
  return join(selected ? runtimeKnowledgeRoot(dir) : dir, relativePath);
}

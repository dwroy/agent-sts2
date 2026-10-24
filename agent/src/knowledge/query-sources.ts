/** Per-query input bytes and provenance. Ordinary gameplay loaders keep their existing caches and paths. */
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { readCompatibleKnowledgeText } from "./catalog.js";
import { knowledgeCharacter, knowledgeFile } from "./files.js";
import { runtimeKnowledgeIdentity, runtimeKnowledgeRoot } from "./runtime-paths.js";

type Row = Record<string, unknown>;
const object = (v: unknown): v is Row => !!v && typeof v === "object" && !Array.isArray(v);
const sha = (text: string | Buffer) => createHash("sha256").update(text).digest("hex");
interface Input { text?: string; json?: Row | null; error?: unknown; source: Row }
interface Query { dir: string; character: string; inputs: Map<string, Input>; sources: Map<string, Row> }
const active = new AsyncLocalStorage<Query>();

export function knowledgeQueryActive(): boolean { return active.getStore() !== undefined; }

function input(query: Query, name: string): Input {
  const hit = query.inputs.get(name);
  if (hit) return hit;
  const path = knowledgeFile(query.dir, name, query.character);
  const source: Row = { source: "own", character: query.character, file: name, path: relative(query.dir, path).split("\\").join("/") };
  const snapshot = runtimeKnowledgeRoot(query.dir);
  if (snapshot !== query.dir && path.startsWith(snapshot + "/")) {
    source["knowledge_version"] = runtimeKnowledgeIdentity()?.version;
    source["path"] = relative(snapshot, path).split("\\").join("/");
  }
  const result: Input = { source };
  try {
    let text: string, bytes: string | Buffer;
    try { bytes = readFileSync(path); text = bytes.toString("utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" || name !== "monster-db.json") throw error;
      text = readCompatibleKnowledgeText(query.dir, name, query.character);
      bytes = text;
      // This is a reconstructed logical view, not the SHA of a nonexistent legacy file.
      source["representation"] = "catalog-compatible-view";
      source["catalog_file"] = "catalog.json";
      source["catalog_sha256"] = sha(readFileSync(join(query.dir, "catalog.json")));
    }
    result.text = text;
    source["sha256"] = sha(bytes);
    let value: Row = {};
    try { const parsed: unknown = JSON.parse(text); if (object(parsed)) value = parsed; result.json = object(parsed) ? parsed : null; } catch { result.json = null; }
    const meta = object(value["meta"]) ? value["meta"] : {};
    source["version"] = String(value["version"] ?? value["schema"] ?? value["generated"] ?? meta["generated"] ?? `sha256:${source["sha256"]}`);
  } catch (error) {
    result.error = error;
    source["status"] = (error as NodeJS.ErrnoException).code === "ENOENT" ? "missing" : "unreadable";
    source["version"] = source["status"]; source["sha256"] = null;
  }
  query.inputs.set(name, result);
  return result;
}

/** Mark only the selected content inputs; eager legacy validation is not relabelled as content provenance. */
export function recordKnowledgeQuerySource(name: string): void {
  const query = active.getStore();
  if (query) query.sources.set(name, input(query, name).source);
}

/** Renderers read the same snapshotted bytes that were hashed, even if an old mtime/size cache is warm. */
export function queryKnowledgeText(dir: string, name: string): string | undefined {
  const query = active.getStore();
  if (!query || resolve(dir) !== query.dir) return undefined;
  const value = input(query, name);
  if (value.error) throw value.error;
  return value.text!;
}

/** Dynamic fact loaders use this query's directory and record the inputs they actually request. */
export function queryKnowledgeJson(name: string): Row | null | undefined {
  const query = active.getStore();
  if (!query) return undefined;
  recordKnowledgeQuerySource(name);
  return input(query, name).json ?? null;
}

export async function withKnowledgeQuerySources<T>(dir: string, run: () => Promise<T>): Promise<{ result: T; sources: Row[] }> {
  const query: Query = { dir: resolve(dir), character: knowledgeCharacter(), inputs: new Map(), sources: new Map() };
  return active.run(query, async () => ({ result: await run(), sources: [...query.sources.values()] }));
}

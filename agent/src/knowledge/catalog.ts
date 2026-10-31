/** Read-only catalogue/query facade. Existing gameplay reads retain their exact legacy bytes. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { characterKey, knowledgeCharacter, knowledgeFile, knowledgeSubdir } from "./files.js";
import { runtimeDataFile } from "./runtime-data.js";

type Obj = Record<string, unknown>;
const object = (x: unknown): x is Obj => x !== null && typeof x === "object" && !Array.isArray(x);
const hash = (x: string | Buffer): string => createHash("sha256").update(x).digest("hex");
const GENERATED = new Set(["mechanics-observed.json", "model-observed.json", "_legacy-meta.json"]);

export interface KnowledgeCatalog {
  schema: "knowledge-catalog-v1";
  sources: Record<string, { path: string; sha256: string; source_character: string | null }>;
  generated_files: Record<string, { sha256: string }>;
  legacy_views: Record<string, { source: string; source_sha256: string; metadata: string }>;
  enemies: Record<string, unknown>;
}

function safePath(dir: string, name: string): string {
  if (isAbsolute(name) || name.split(/[\\/]/).some((p) => p === ".." || p === ".git" || /^\.env(?:$|\.)/i.test(p))) {
    throw new Error("知识路径必须位于指定快照内");
  }
  const root = realpathSync(dir);
  const path = resolve(root, name);
  if (!path.startsWith(root + sep)) throw new Error("知识路径越界");
  if (existsSync(path) && !realpathSync(path).startsWith(root + sep)) throw new Error("知识路径软链接越界");
  return path;
}

export function readKnowledgeCatalog(dir: string): KnowledgeCatalog | null {
  const path = join(dir, "catalog.json");
  if (!existsSync(path)) return null;
  const value: unknown = JSON.parse(readFileSync(safePath(dir, "catalog.json"), "utf8"));
  if (!object(value) || value["schema"] !== "knowledge-catalog-v1"
      || !object(value["sources"]) || !object(value["legacy_views"]) || !object(value["generated_files"]) || !object(value["enemies"])) {
    throw new Error("知识catalog结构损坏；不能以读取成功代替有效性");
  }
  return value as unknown as KnowledgeCatalog;
}

function fragment(dir: string, catalog: KnowledgeCatalog, name: string): Obj {
  const descriptor = catalog.generated_files[name];
  const raw = readFileSync(safePath(dir, name));
  if (!descriptor || hash(raw) !== descriptor.sha256) throw new Error("公共知识片段SHA不符");
  const value: unknown = JSON.parse(raw.toString("utf8"));
  if (!object(value)) throw new Error("公共知识片段不是对象");
  return value;
}

/** Public fragments can reconstruct a missing compatible common view; never borrow role statistics. */
export function readCompatibleKnowledgeText(dir: string, name: string, character = knowledgeCharacter()): string {
  const legacy = knowledgeFile(dir, name, character);
  if (runtimeDataFile(dir, relative(dir, join(knowledgeSubdir(name, dir, character), name)))) return readFileSync(legacy, "utf8");
  // No catalogue I/O or new default facts in a healthy existing game process.
  if (existsSync(legacy)) return readFileSync(legacy, "utf8");
  if (name !== "monster-db.json" && name !== "move-model.json") return readFileSync(legacy, "utf8");
  const catalog = readKnowledgeCatalog(dir);
  const alias = catalog?.legacy_views[name];
  if (!catalog || !alias || alias.source !== "common/" + name) return readFileSync(legacy, "utf8");
  const metadata = fragment(dir, catalog, alias.metadata);
  const views = metadata["views"];
  const view = object(views) ? views[name] : null;
  if (!object(view) || view["source"] !== alias.source || view["source_sha256"] !== alias.source_sha256
      || !Array.isArray(view["root_order"]) || !Array.isArray(view["enemy_order"])
      || !object(view["root_fields"]) || !object(view["fragments"])) throw new Error("公共知识兼容视图不完整");
  const rows: Obj = Object.create(null) as Obj;
  const fragments = view["fragments"];
  for (const id of view["enemy_order"]) {
    if (typeof id !== "string" || typeof fragments[id] !== "string") throw new Error("公共敌人ID/引用损坏");
    const row = fragment(dir, catalog, fragments[id]);
    if (row["schema"] !== "legacy-enemy-observation-v1" || row["enemy_id"] !== id || row["source"] !== alias.source) {
      throw new Error("公共敌人片段来源不符");
    }
    rows[id] = row["payload"];
  }
  if (object(view["container_fields"])) Object.assign(rows, view["container_fields"]);
  const orderedRows: Obj = Object.create(null) as Obj;
  if (Array.isArray(view["container_order"])) for (const key of view["container_order"]) {
    if (typeof key !== "string" || !Object.hasOwn(rows, key)) throw new Error("公共视图容器字段损坏");
    orderedRows[key] = rows[key];
  }
  const result: Obj = Object.create(null) as Obj;
  const fields = view["root_fields"];
  for (const key of view["root_order"]) {
    if (typeof key !== "string") throw new Error("公共视图字段顺序损坏");
    result[key] = view["container"] === key ? orderedRows : Object.hasOwn(rows, key) ? rows[key] : fields[key];
  }
  return JSON.stringify(result);
}

function runReferences(value: unknown): string[] {
  const result = new Set<string>();
  const visit = (node: unknown, namedEvidence = false): void => {
    if (typeof node === "string" && namedEvidence) {
      const match = /^([A-Z0-9]{12})(?:$|\s)/.exec(node);
      if (match) result.add(match[1]!);
    } else if (Array.isArray(node)) {
      for (const child of node) visit(child, namedEvidence);
    } else if (object(node)) {
      for (const [key, child] of Object.entries(node)) visit(child,
        ["run", "run_id", "evidence", "runs", "first_run", "last_run"].includes(key));
    }
  };
  visit(value);
  return [...result];
}

function jsonFiles(base: string): string[] {
  if (!existsSync(base)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || ["history", "cache", "node_modules"].includes(entry.name)) continue;
    const path = join(base, entry.name);
    if (entry.isDirectory()) result.push(...jsonFiles(path));
    else if (entry.isFile() && [".json", ".md"].includes(extname(path))) result.push(path);
  }
  return result;
}

export interface CatalogQuery {
  character?: string;
  sourceCharacter?: string;
  keyword?: string;
  id?: string;
  file?: string;
  pointer?: string;
  details?: boolean;
  limit?: number;
}

export interface CatalogRecord {
  id: string;
  kind: string;
  source_character: string | null;
  target_character: string;
  reference_only: boolean;
  target_validation: "not_established_by_query";
  source: { path: string; pointer: Array<string | number>; sha256: string; catalog_source_match: boolean | null };
  evidence_run_ids: string[];
  evidence_ids_in_source: number;
  evidence_status: string;
  name?: unknown;
  scope?: unknown;
  payload?: unknown;
}

/** Explicit cross-role references remain separate records; no statistic or support denominator is merged. */
export function queryKnowledgeCatalog(dir: string, options: CatalogQuery = {}): {
  target_character: string; records: CatalogRecord[]; total_matches: number; truncated: boolean; read_only: true;
} {
  const character = characterKey(options.character ?? knowledgeCharacter());
  if (!character) throw new Error("目标角色ID无效");
  const source = options.sourceCharacter === "all" ? "all" : characterKey(options.sourceCharacter ?? character);
  if (!source) throw new Error("来源角色ID无效");
  const catalog = readKnowledgeCatalog(dir);
  const common = join(dir, "common");
  let paths = existsSync(common) ? readdirSync(common).filter((n) => n.endsWith(".json")).map((n) => join(common, n)) : [];
  paths.push(...jsonFiles(join(common, "enemies")).filter((p) => !GENERATED.has(p.split(sep).at(-1)!)));
  const characters = join(dir, "characters");
  const roles = source === "all" ? (existsSync(characters) ? readdirSync(characters).filter((n) => /^[a-z0-9_]+$/.test(n)) : []) : [source];
  for (const role of roles) paths.push(...jsonFiles(join(characters, role)));
  if (options.file) {
    const parts = options.file.split("/");
    if (parts[0] !== "common" && !(parts[0] === "characters" && roles.includes(parts[1] ?? ""))) {
      throw new Error("跨角色文件需要显式sourceCharacter，不能隐式回退或混用");
    }
    if (![".json", ".md"].includes(extname(options.file))) throw new Error("只能查询知识JSON/Markdown");
    paths = [safePath(dir, options.file)];
  }
  const records: CatalogRecord[] = [];
  const needle = options.keyword?.toLowerCase();
  for (const path of [...new Set(paths)].sort()) {
    const name = relative(dir, path).split(sep).join("/");
    const raw = readFileSync(safePath(dir, name));
    const rawSha = hash(raw);
    const role = name.startsWith("characters/") ? name.split("/")[1]! : null;
    const value: unknown = name.endsWith(".json") ? JSON.parse(raw.toString("utf8")) : raw.toString("utf8");
    const put = (id: string, kind: string, payload: unknown, pointer: Array<string | number>): void => {
      if (options.id && options.id !== id) return;
      if (needle && ![id, name, JSON.stringify(payload)].join(" ").toLowerCase().includes(needle)) return;
      const ids = runReferences(payload);
      const row: CatalogRecord = { id, kind, source_character: role, target_character: character,
        reference_only: role !== null && role !== character, target_validation: "not_established_by_query",
        source: { path: name, pointer, sha256: rawSha, catalog_source_match: catalog?.sources[name] ? catalog.sources[name]!.sha256 === rawSha : null },
        evidence_run_ids: ids.slice(0, 20), evidence_ids_in_source: ids.length,
        evidence_status: ids.length ? "原来源引用，未重验/未增加支持数；完整列表见原件" : "原件没有可直接识别的局号；不以文件SHA补证" };
      if (object(payload)) { if (payload["name"] !== undefined) row.name = payload["name"]; if (payload["scope"] !== undefined) row.scope = payload["scope"]; }
      if (options.details) row.payload = payload;
      records.push(row);
    };
    if (options.file) put("file:" + name, role ? "role_file" : "common_file", value, []);
    else if (name === "common/monster-db.json" && object(value) && object(value["monsters"])) {
      for (const [id, payload] of Object.entries(value["monsters"])) put("enemy:" + id + ":mechanics", "legacy_common_enemy", payload, ["monsters", id]);
    } else if (name === "common/move-model.json" && object(value)) {
      for (const [id, payload] of Object.entries(value)) if (object(payload) && ("next" in payload || "damage" in payload)) put("enemy:" + id + ":model", "legacy_common_model", payload, [id]);
    } else if (object(value) && Array.isArray(value["entries"])) {
      value["entries"].forEach((entry, index) => { if (object(entry)) put(String(entry["id"] ?? `${name}#${index}`), role ? "role_experience" : "common_experience", entry, ["entries", index]); });
    } else put("file:" + name, role ? "role_data" : "common_document", value, []);
  }
  if (options.pointer !== undefined) {
    if (!options.details || !options.file || (options.pointer && !options.pointer.startsWith("/"))) throw new Error("pointer需配合显式file/details并遵循JSON Pointer");
    const parts = options.pointer ? options.pointer.slice(1).split("/").map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~")) : [];
    for (const row of records) {
      let value: unknown = row.payload;
      for (const key of parts) {
        if ((object(value) || Array.isArray(value)) && Object.hasOwn(value, key)) value = (value as Obj)[key];
        else throw new Error("知识pointer不存在");
      }
      row.payload = value;
      row.source.pointer.push(...parts);
    }
  }
  const limit = options.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1) throw new Error("查询limit必须为正整数");
  return { target_character: character, records: records.slice(0, limit), total_matches: records.length, truncated: records.length > limit, read_only: true };
}

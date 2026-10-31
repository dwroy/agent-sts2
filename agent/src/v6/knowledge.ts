import { readFileSync, realpathSync, statSync } from "node:fs";
import { join, relative, isAbsolute } from "node:path";
import { array, object, literal, refine, validate, type Result } from "./schema.js";
import { characterKey } from "../knowledge/files.js";
import { runtimeKnowledgeRoot } from "../knowledge/runtime-paths.js";
import { characterSchema, directionCardSchema, reflexEntrySchema, reflexVocabSchema, type Character, type DirectionCard, type ReflexEntry, type ReflexVocab } from "./formats.js";
import { validateBuildCoreFile, type BuildCore } from "./build-core.js";

export type KnowledgeResult<T> = { status: "loaded"; value: T; path: string }
  | { status: "missing" | "invalid"; message: string; path: string; issues?: string[] };
export const directionFile = refine(object({ schema: literal("direction-cards-v1"), character: characterSchema, entries: array(directionCardSchema) }), (v, e) => {
  if (new Set(v.entries.map(entry => entry.id)).size !== v.entries.length) e.push("direction cards: duplicate IDs");
  if (v.entries.some(entry => entry.scope.character !== v.character)) e.push("direction cards: cross-character scope");
});
export const reflexFile = refine(object({ schema: literal("reflex-file-v1"), character: characterSchema, entries: array(reflexEntrySchema) }), (v, e) => {
  if (new Set(v.entries.map(entry => entry.id)).size !== v.entries.length) e.push("reflex: duplicate IDs");
  if (v.entries.some(entry => entry.scope.character !== v.character)) e.push("reflex: cross-character scope");
});
export interface V6Knowledge {
  character: Character | null;
  cores: KnowledgeResult<BuildCore[]>;
  /** Legacy compatibility only; cores never fall back to these cards. */
  directions: KnowledgeResult<DirectionCard[]>;
  vocab: KnowledgeResult<ReflexVocab>;
  reflex: KnowledgeResult<ReflexEntry[]>;
}
/** No global/default character, common fallback, directory creation, cache or knowledge synthesis. */
export function loadV6Knowledge(knowledgeDir: string, rawCharacter: string | null | undefined,
  readText: (path: string) => string = path => readFileSync(path, "utf8")): V6Knowledge {
  knowledgeDir = runtimeKnowledgeRoot(knowledgeDir);
  const parsed = validate(characterSchema, characterKey(rawCharacter));
  const character = parsed.ok ? parsed.value : null;
  function load<T>(name: string, parse: (v: unknown) => Result<T>): KnowledgeResult<T> {
    const path = character ? join(knowledgeDir, "characters", character, name) : "";
    if (!character) return { status: "invalid", message: "无此知识：未提供有效角色", path };
    try {
      const resolved = realpathSync(path), root = realpathSync(join(knowledgeDir, "characters", character));
      if (root !== join(realpathSync(knowledgeDir), "characters", character)) return { status: "invalid", message: "角色目录不能重定向至其他位置", path };
      const rel = relative(root, resolved);
      if (rel.startsWith("..") || isAbsolute(rel)) return { status: "invalid", message: "知识文件越出角色目录", path };
      if (!statSync(resolved).isFile() || statSync(resolved).size > 8 * 1024 * 1024) return { status: "invalid", message: "知识文件不是有效大小的普通文件", path };
      const data: unknown = JSON.parse(readText(resolved));
      const result = parse(data);
      if (!result.ok) return { status: "invalid", message: "知识格式校验失败", path, issues: result.issues };
      return { status: "loaded", path, value: result.value };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { status: "missing", message: "无此知识", path };
      return { status: "invalid", message: "知识文件不可读或 JSON 无效", path };
    }
  }
  function own<T extends { character: Character }>(result: Result<T>): Result<T> {
    return result.ok && result.value.character !== character ? { ok: false, issues: ["file character does not match requested character"] } : result;
  }
  const cores = load("build-cores.json", v => {
    const r = own(validateBuildCoreFile(v));
    return r.ok ? { ok: true, value: r.value.entries } : r;
  });
  const directions = load("direction-cards.json", v => {
    const r = own(validate(directionFile, v));
    return r.ok ? { ok: true, value: r.value.entries } : r;
  });
  const vocab = load("reflex-vocab.json", v => own(validate(reflexVocabSchema, v)));
  let reflex = load("reflex.json", v => {
    const r = own(validate(reflexFile, v));
    return r.ok ? { ok: true, value: r.value.entries } : r;
  });
  if (reflex.status === "loaded") {
    const directionIds = new Set(cores.status === "loaded" ? cores.value.map(d => d.direction)
      : directions.status === "loaded" ? directions.value.map(d => d.id) : []);
    const tags = new Set(vocab.status === "loaded" ? Object.values(vocab.value.dimensions).flat().map(m => m.id) : []);
    const issues: string[] = [];
    for (const entry of reflex.value) {
      if (entry.directions?.some(id => !directionIds.has(id))) issues.push(`${entry.id}: unknown direction reference`);
      if (entry.signal.kind === "tag" && !tags.has(entry.signal.value)) issues.push(`${entry.id}: unknown vocabulary tag`);
      if (entry.signal.kind === "contrast") {
        const coreIds = new Set(cores.status === "loaded" ? cores.value.map(c => c.direction) : []);
        const combos = new Set(cores.status === "loaded" ? cores.value.flatMap(c => c.combos.map(combo => combo.id)) : []);
        if (entry.cores?.some(id => !coreIds.has(id)) || entry.combos?.some(id => !combos.has(id))) issues.push(`${entry.id}: unknown published core/combo reference`);
      }
    }
    if (issues.length) reflex = { status: "invalid", message: "小脑记忆引用缺失", path: reflex.path, issues };
  }
  return { character, cores, directions, vocab, reflex };
}

/** Evidence-backed lessons explicitly promoted for use by every character. */
import { existsSync, readFileSync, statSync } from "node:fs";
import type { ExperienceEntry } from "./experience.js";
import { CHARACTER_NAMES, KNOWLEDGE_DIR, knowledgeFile } from "./files.js";

export const SHARED_EXPERIENCE_FILE = "shared-experience.json";

export interface SharedExperienceSource {
  character: string;
  run_id: string;
  experience_id: string;
  evidence_path: string;
  evidence_sha256: string;
}

export interface SharedExperienceEntry extends ExperienceEntry {
  shared: {
    independent_of_character: true;
    reason: string;
    conditions: string;
    sources: SharedExperienceSource[];
  };
}

export interface SharedExperienceFile {
  version: string;
  entries: SharedExperienceEntry[];
}

const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const count = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;
const fail = (path: string, detail: string): never => { throw new Error(`公共经验文件 ${path}: ${detail}`); };

/** Schema checks cannot establish generality; that decision belongs to the evidence-reviewing learner. */
export function parseSharedExperience(value: unknown, path: string): SharedExperienceFile {
  if (!record(value) || !text(value.version) || !Array.isArray(value.entries)) return fail(path, "缺少 version/entries");
  const ids = new Set<string>();
  for (const raw of value.entries) {
    if (!record(raw) || !text(raw.id) || !/^common-[a-z0-9-]+$/.test(raw.id) || ids.has(raw.id)) return fail(path, "id 必须唯一并以 common- 开头");
    ids.add(raw.id);
    if (!text(raw.scope) || !/^(boss|elite|hallway|act|general|card|relic|potion|event):.+$/.test(raw.scope) || !text(raw.lesson) ||
        !Array.isArray(raw.asc) || raw.asc.length !== 2 || !raw.asc.every(count) || raw.asc[0]! > raw.asc[1]! ||
        !count(raw.n_support) || !count(raw.n_contradict) || !["low", "med", "high"].includes(String(raw.confidence)) ||
        !["active", "retired"].includes(String(raw.status)) || !text(raw.last_seen)) return fail(path, `${raw.id} 的经验字段不完整`);
    if (!Array.isArray(raw.evidence) || raw.evidence.length === 0 || !raw.evidence.every(v => typeof v === "string" && /^[A-Z0-9]{12}$/.test(v)) ||
        new Set(raw.evidence).size !== raw.evidence.length) return fail(path, `${raw.id} 缺少唯一证据局号`);
    // Character-derived placeholders would silently substitute another character's statistics.
    if (/\{(?:[A-Z][A-Z0-9_]*(?::[A-Z0-9_:]+)*|@\d+:[A-Z0-9_:]+)\}/.test(raw.lesson)) return fail(path, `${raw.id} 不能引用角色统计占位符`);
    const shared = raw.shared;
    if (!record(shared) || shared.independent_of_character !== true || !text(shared.reason) || !text(shared.conditions) ||
        !Array.isArray(shared.sources) || shared.sources.length === 0) return fail(path, `${raw.id} 缺少通用性理由、适用条件或来源`);
    const runs = new Set<string>();
    for (const source of shared.sources) {
      if (!record(source) || !text(source.character) || !Object.hasOwn(CHARACTER_NAMES, source.character) ||
          !text(source.run_id) || !raw.evidence.includes(source.run_id) || !text(source.experience_id) ||
          !text(source.evidence_path) || typeof source.evidence_sha256 !== "string" || !/^[0-9a-f]{64}$/.test(source.evidence_sha256)) return fail(path, `${raw.id} 的角色/局号/原条目/冻结证据来源不完整`);
      runs.add(source.run_id);
    }
    if (runs.size !== raw.evidence.length) return fail(path, `${raw.id} 有证据局缺少来源`);
  }
  return value as unknown as SharedExperienceFile;
}

const cache = new Map<string, { stamp: string; value: SharedExperienceFile }>();

/** Missing means no promoted lessons yet; malformed existing data is reported rather than ignored. */
export function loadSharedExperience(dir: string = KNOWLEDGE_DIR): SharedExperienceFile {
  const path = knowledgeFile(dir, SHARED_EXPERIENCE_FILE);
  if (!existsSync(path)) return { version: "无", entries: [] };
  const info = statSync(path);
  const stamp = `${info.mtimeMs}:${info.size}`;
  const hit = cache.get(path);
  if (hit?.stamp === stamp) return hit.value;
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { return fail(path, `读取失败: ${(error as Error).message}`); }
  const value = parseSharedExperience(parsed, path);
  cache.set(path, { stamp, value });
  return value;
}

/** Shared provenance is displayed directly; it never reads a different character's raw post-mortems. */
export function sharedExperienceNote(entry: ExperienceEntry): string | null {
  const shared = (entry as Partial<SharedExperienceEntry>).shared;
  if (!shared) return null;
  const sources = shared.sources.map(s => `${s.character}/${s.run_id}/${s.experience_id}`).sort();
  return `公共经验；适用条件：${shared.conditions}；通用性依据：${shared.reason}；来源：${sources.join("，")}`;
}

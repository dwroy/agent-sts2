/**
 * The knowledge files the V4 renderers and kb_* tools read (docs/v4-architecture.md §3), loaded from the
 * context's knowledge directory. Unlike the v3 loaders (monster-db.ts, experience.ts), which fall back to empty
 * data, a missing or malformed file throws: the brain must never be handed an empty knowledge base silently.
 *
 * The files are refreshed after every run, so the cache is keyed by each file's mtime and size.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import type { ExperienceEntry, OutcomeStats } from "../experience.js";
import type { JevHint } from "../jev-hints.js";
import type { MonsterDb } from "../monster-db.js";
import type { MeasuredRoom } from "../room-costs.js";
import type { ToolContext } from "../../brain/tools/types.js";
import { fillGuideFacts } from "../../sim/boss-clock.js";
import type { FactFiller } from "./facts.js";
import { fromRoot, KNOWLEDGE_DIR, LOGS_DIR, PROJECT_ROOT, workspaceRoot } from "../../core/paths.js";
import { CHARACTER_NAMES, DEFAULT_CHARACTER, knowledgeCharacter, knowledgeFile, MONSTER_RECORDS_FILE } from "../files.js";
import { mergeMonsterRecords, readMonsterRecords } from "../monster-db.js";

/**
 * What a renderer reads from the context. `facts`: how the hand-written texts' data placeholders are filled (fresh
 * when absent; the brain's KNOWLEDGE_PREFIX=full prompt freezes them for the day, render/facts.ts). `mechanics`: whether
 * the monster blocks carry the observed mechanics (monster-db.json `observed`; MECH_RULES, docs/mechanics-learning.md);
 * absent means yes, false renders the blocks exactly as before them.
 */
export type RenderContext = Pick<ToolContext, "ascension" | "knowledgeDir"> & Partial<Pick<ToolContext, "act" | "logsDir">> & { facts?: FactFiller; mechanics?: boolean; moveRules?: boolean };

export class KnowledgeLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KnowledgeLoadError";
  }
}

/** A lookup that found nothing (or too much): the message says why and what is available. */
export class KnowledgeLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KnowledgeLookupError";
  }
}

export interface MonsterDbFile extends MonsterDb {
  meta?: { note?: string; generated_from?: { fights?: number; fights_by_asc?: Record<string, number>; last_seen?: string } };
}

export interface RoomCostsFile {
  meta?: { note?: string; runs?: number; last_seen?: string };
  /** asc -> act -> room type -> measured HP change. */
  by_asc: Record<string, Record<string, Record<string, MeasuredRoom & { p90?: number }>>>;
}

export interface ExperienceFile {
  version: string;
  entries: ExperienceEntry[];
}

export interface JevHintsFile {
  version?: string;
  note?: string;
  hints: JevHint[];
}

export interface KnowledgeData {
  dir: string;
  monsterDb: MonsterDbFile;
  experience: ExperienceFile;
  roomCosts: RoomCostsFile;
  outcomeStats: OutcomeStats & { generated?: string; _about?: string };
  /**
   * The old hand-written knowledge (docs/v4-architecture.md §3: whole, marked unverified), its data facts filled now,
   * without an ascension (the records over every logged ascension); the prefix and the kb_* tools fill the templates
   * below at the run's ascension instead (render/old-knowledge.ts).
   */
  guide: string;
  handbook: string;
  /** The same as written, placeholders and all (the prefix fills them through its RenderContext `facts`). */
  guideTemplate: string;
  handbookTemplate: string;
  jevHints: JevHintsFile;
}

/** The hand-written strategy guide's file name for a character ("ironclad-guide.md"); a new character has none yet. */
export function guideFileName(character: string = knowledgeCharacter()): string {
  return `${character}-guide.md`;
}

export const KNOWLEDGE_FILES = {
  monsterDb: "monster-db.json",
  /** The run's character's fight records, merged into the monster DB (knowledge/monster-db.ts mergeMonsterRecords). */
  monsterRecords: MONSTER_RECORDS_FILE,
  experience: "experience.json",
  roomCosts: "room-costs.json",
  outcomeStats: "outcome-stats.json",
  /** The run's character's guide (guideFileName). */
  get guide(): string {
    return guideFileName();
  },
  handbook: "ds-handbook.md",
  jevHints: "jev-hints.json",
};

/** The repository root (core/paths.ts PROJECT_ROOT). */
export const REPO_ROOT = PROJECT_ROOT;
/** The project's knowledge directory: each file is in its common/ or characters/<id>/ (knowledge/files.ts knowledgeFile). */
export const DEFAULT_KNOWLEDGE_DIR = KNOWLEDGE_DIR;
export const DEFAULT_LOGS_DIR = LOGS_DIR;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function readText(dir: string, name: string): string {
  const path = knowledgeFile(dir, name);
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    throw new KnowledgeLoadError(`知识文件读取失败 ${path}: ${(error as Error).message}`);
  }
  if (text.trim().length === 0) throw new KnowledgeLoadError(`知识文件为空 ${path}`);
  return text;
}

/**
 * The text of a file of the run's character, or null when a new character has none (characters/<id>/ or the file
 * missing: no knowledge yet, read as empty). The Ironclad's knowledge is complete, so a file of its missing still throws,
 * as before; a file that is there but empty or unreadable throws for every character.
 */
function readCharacterText(dir: string, name: string): string | null {
  if (knowledgeCharacter() !== DEFAULT_CHARACTER && !existsSync(knowledgeFile(dir, name))) return null;
  return readText(dir, name);
}

function readCharacterJson(dir: string, name: string): Record<string, unknown> | null {
  return readCharacterText(dir, name) === null ? null : readJson(dir, name);
}

function readJson(dir: string, name: string): Record<string, unknown> {
  const text = readText(dir, name);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new KnowledgeLoadError(`知识文件不是合法 JSON ${knowledgeFile(dir, name)}: ${(error as Error).message}`);
  }
  if (!isRecord(parsed)) throw new KnowledgeLoadError(`知识文件顶层不是对象 ${join(dir, name)}`);
  return parsed;
}

function requireRecord(file: string, value: unknown, field: string, nonEmpty = true): Record<string, unknown> {
  if (!isRecord(value)) throw new KnowledgeLoadError(`${file} 缺少对象字段 ${field}`);
  if (nonEmpty && Object.keys(value).length === 0) throw new KnowledgeLoadError(`${file} 的 ${field} 为空`);
  return value;
}

function parseAll(dir: string): KnowledgeData {
  // The common monster facts with the run's character's own records; a character with no records yet has no encounters
  // or bosses (a file of the combined shape from before the split keeps its own: mergeMonsterRecords).
  let records: Record<string, unknown> | null;
  try {
    records = readMonsterRecords(dir);
  } catch (error) {
    throw new KnowledgeLoadError(`知识文件读取失败 ${knowledgeFile(dir, MONSTER_RECORDS_FILE)}: ${(error as Error).message}`);
  }
  const db = mergeMonsterRecords(readJson(dir, KNOWLEDGE_FILES.monsterDb), records);
  requireRecord(KNOWLEDGE_FILES.monsterDb, db["monsters"], "monsters");
  // The Ironclad's files must hold something (a missing or empty one is a broken refresh); a new character's may be absent.
  const strict = knowledgeCharacter() === DEFAULT_CHARACTER;
  const noRecords = !strict && records === null && db["encounters"] === undefined && db["bosses"] === undefined;
  if (noRecords) Object.assign(db, { encounters: {}, bosses: {} });
  requireRecord(KNOWLEDGE_FILES.monsterDb, db["encounters"], "encounters", !noRecords);
  requireRecord(KNOWLEDGE_FILES.monsterDb, db["bosses"], "bosses", !noRecords);

  // The run's character's own files: none yet is empty knowledge (a new character starts from nothing, never from another's).
  const experience = readCharacterJson(dir, KNOWLEDGE_FILES.experience) ?? { version: "无", entries: [] };
  if (!Array.isArray(experience["entries"]) || (strict && experience["entries"].length === 0)) throw new KnowledgeLoadError(`${KNOWLEDGE_FILES.experience} 缺少 entries 或为空`);
  for (const [index, entry] of (experience["entries"] as unknown[]).entries()) {
    const ok = isRecord(entry) && typeof entry["id"] === "string" && typeof entry["scope"] === "string" && typeof entry["lesson"] === "string" && Array.isArray(entry["asc"]) && Array.isArray(entry["evidence"]);
    if (!ok) throw new KnowledgeLoadError(`${KNOWLEDGE_FILES.experience} 第 ${index} 条缺少 id/scope/lesson/asc/evidence`);
  }

  const rooms = readCharacterJson(dir, KNOWLEDGE_FILES.roomCosts) ?? { by_asc: {} };
  requireRecord(KNOWLEDGE_FILES.roomCosts, rooms["by_asc"], "by_asc", strict);

  const outcome = readCharacterJson(dir, KNOWLEDGE_FILES.outcomeStats) ?? { by_ascension: {} };
  // One table per ascension from 2026-10-04 (by_ascension; a higher ascension's may have no rest rows yet), else the
  // A8 table itself (knowledge/outcome-tables.ts).
  if (outcome["by_ascension"] !== undefined) {
    const tables = requireRecord(KNOWLEDGE_FILES.outcomeStats, outcome["by_ascension"], "by_ascension", strict);
    for (const [asc, table] of Object.entries(tables)) requireRecord(KNOWLEDGE_FILES.outcomeStats, requireRecord(KNOWLEDGE_FILES.outcomeStats, table, `by_ascension.${asc}`)["rest"], `by_ascension.${asc}.rest`, false);
  } else requireRecord(KNOWLEDGE_FILES.outcomeStats, outcome["rest"], "rest");

  const hints = readCharacterJson(dir, KNOWLEDGE_FILES.jevHints) ?? { hints: [] };
  if (!Array.isArray(hints["hints"]) || (strict && hints["hints"].length === 0)) throw new KnowledgeLoadError(`${KNOWLEDGE_FILES.jevHints} 缺少 hints 或为空`);

  const guideTemplate = readCharacterText(dir, KNOWLEDGE_FILES.guide) ?? "";
  const handbookTemplate = readCharacterText(dir, KNOWLEDGE_FILES.handbook) ?? "";
  return {
    dir,
    monsterDb: db as unknown as MonsterDbFile,
    experience: { version: String(experience["version"] ?? "?"), entries: experience["entries"] as ExperienceEntry[] },
    roomCosts: rooms as unknown as RoomCostsFile,
    outcomeStats: outcome as unknown as KnowledgeData["outcomeStats"],
    // The guides' data facts ({GIANT_BLOCK_RECORD}) are filled here, once, as v3 fills them in its prompt (no
    // ascension). The full prefix, the kb_* tools and gkb-dump fill the templates at the run's ascension.
    guide: fillGuideFacts(guideTemplate),
    handbook: fillGuideFacts(handbookTemplate),
    guideTemplate,
    handbookTemplate,
    jevHints: hints as unknown as JevHintsFile,
  };
}

function stamp(dir: string): string {
  return Object.values(KNOWLEDGE_FILES)
    .map((name) => {
      try {
        const info = statSync(knowledgeFile(dir, name));
        return `${name}:${info.mtimeMs}:${info.size}`;
      } catch {
        return `${name}:missing`;
      }
    })
    .join("|");
}

const cache = new Map<string, { stamp: string; data: KnowledgeData }>();

/**
 * Every knowledge file in `dir` for the run's character, parsed and checked; throws KnowledgeLoadError on any failure. A
 * file of the character's that is not there is empty knowledge, not a failure.
 */
export function loadKnowledgeData(dir: string): KnowledgeData {
  const resolved = resolve(dir);
  const key = `${resolved}|${knowledgeCharacter()}`;
  const now = stamp(resolved);
  const hit = cache.get(key);
  if (hit && hit.stamp === now) return hit.data;
  const data = parseAll(resolved);
  cache.set(key, { stamp: now, data });
  return data;
}

/* ---- post-mortems (notes/lessons.md) ----------------------------------------------------------- */

/** notes/lessons.md: KNOWLEDGE_LESSONS_FILE (a relative path against the project root), else the workspace's notes (core/paths.ts workspaceRoot: STS2_WORKSPACE or the project root). */
export function lessonsPath(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env["KNOWLEDGE_LESSONS_FILE"];
  return configured && configured.trim() ? fromRoot(configured.trim()) : join(workspaceRoot(env), "notes", "lessons.md");
}

export interface PostmortemSection {
  runId: string;
  /** The heading's parenthesised summary ("A9，第17层，死于…"), "" when the heading has none. */
  summary: string;
  /** Ascension named at the start of the summary ("A9，…"), null for the early headings without one. */
  asc: number | null;
  /**
   * The run's character: the character name the summary carries ("A0，静默猎手，第17层…"; the learner writes it for
   * every character but the Ironclad), else the Ironclad (every heading written before 2026-10-04).
   */
  character: string;
  /** Position in the file (later = more recent). */
  order: number;
  /** The section as written: heading line and body. */
  text: string;
}

export interface Postmortems {
  path: string;
  /** null when the file could not be read (the reason is in `missing`). */
  sections: Map<string, PostmortemSection[]> | null;
  missing?: string;
}

const RUN_HEADING = /^## ([0-9A-Z]{12})(?:（(.*)）)?\s*$/;

/** The character a post-mortem heading's summary names (one of its comma-separated items), else the default (the Ironclad). */
export function summaryCharacter(summary: string): string {
  for (const item of summary.split(/[，,]/)) {
    const named = Object.entries(CHARACTER_NAMES).find(([id, names]) => [id, names.zh, names.en.toLowerCase()].includes(item.trim().toLowerCase()) || item.trim() === names.zh);
    if (named) return named[0];
  }
  return DEFAULT_CHARACTER;
}

/** Parses the post-mortem file: every "## <run id>（…）" section. */
export function parsePostmortems(text: string, path: string): Postmortems {
  const lines = text.split("\n");
  const sections = new Map<string, PostmortemSection[]>();
  let current: { runId: string; summary: string; start: number } | null = null;
  let order = 0;
  const close = (end: number) => {
    if (!current) return;
    const summary = current.summary;
    const asc = /^A(\d+)/.exec(summary);
    const section: PostmortemSection = { runId: current.runId, summary, asc: asc ? Number(asc[1]) : null, character: summaryCharacter(summary), order: order++, text: lines.slice(current.start, end).join("\n").trimEnd() };
    sections.set(current.runId, [...(sections.get(current.runId) ?? []), section]);
    current = null;
  };
  lines.forEach((line, index) => {
    if (!line.startsWith("# ") && !line.startsWith("## ")) return;
    close(index);
    const match = RUN_HEADING.exec(line);
    if (match) current = { runId: match[1]!, summary: (match[2] ?? "").trim(), start: index };
  });
  close(lines.length);
  return { path, sections };
}

const postmortemCache = new Map<string, { stamp: string; value: Postmortems }>();

/** The post-mortems at `path` (lessonsPath() by default); a missing file is reported, not thrown. */
export function loadPostmortems(path: string = lessonsPath()): Postmortems {
  let fileStamp: string;
  try {
    const info = statSync(path);
    fileStamp = `${info.mtimeMs}:${info.size}`;
  } catch (error) {
    return { path, sections: null, missing: `找不到复盘文件 ${path}（${(error as NodeJS.ErrnoException).code ?? (error as Error).message}）` };
  }
  const hit = postmortemCache.get(path);
  if (hit && hit.stamp === fileStamp) return hit.value;
  let value: Postmortems;
  try {
    value = parsePostmortems(readFileSync(path, "utf8"), path);
  } catch (error) {
    value = { path, sections: null, missing: `复盘文件读取失败 ${path}（${(error as Error).message}）` };
  }
  postmortemCache.set(path, { stamp: fileStamp, value });
  return value;
}

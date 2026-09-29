/**
 * The knowledge files the V4 renderers and kb_* tools read (docs/v4-architecture.md §3), loaded from the
 * context's knowledge directory. Unlike the v3 loaders (monster-db.ts, experience.ts), which fall back to empty
 * data, a missing or malformed file throws: the brain must never be handed an empty knowledge base silently.
 *
 * The files are refreshed after every run, so the cache is keyed by each file's mtime and size.
 */

import { readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ExperienceEntry, OutcomeStats } from "../experience.js";
import type { JevHint } from "../jev-hints.js";
import type { MonsterDb } from "../monster-db.js";
import type { MeasuredRoom } from "../room-costs.js";
import type { ToolContext } from "../../tools/types.js";
import { fillGuideFacts } from "../../strategy/boss-clock.js";

/** What a renderer reads from the context. */
export type RenderContext = Pick<ToolContext, "ascension" | "knowledgeDir"> & Partial<Pick<ToolContext, "act" | "logsDir">>;

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
  /** The old hand-written knowledge (docs/v4-architecture.md §3: whole, marked unverified). */
  guide: string;
  handbook: string;
  jevHints: JevHintsFile;
}

export const KNOWLEDGE_FILES = {
  monsterDb: "monster-db.json",
  experience: "experience.json",
  roomCosts: "room-costs.json",
  outcomeStats: "outcome-stats.json",
  guide: "ironclad-guide.md",
  handbook: "ds-handbook.md",
  jevHints: "jev-hints.json",
} as const;

/** The repository root (this file is src/knowledge/render/data.ts). */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const DEFAULT_KNOWLEDGE_DIR = join(REPO_ROOT, "src", "knowledge");
export const DEFAULT_LOGS_DIR = join(REPO_ROOT, "logs");

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function readText(dir: string, name: string): string {
  const path = join(dir, name);
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    throw new KnowledgeLoadError(`知识文件读取失败 ${path}: ${(error as Error).message}`);
  }
  if (text.trim().length === 0) throw new KnowledgeLoadError(`知识文件为空 ${path}`);
  return text;
}

function readJson(dir: string, name: string): Record<string, unknown> {
  const text = readText(dir, name);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new KnowledgeLoadError(`知识文件不是合法 JSON ${join(dir, name)}: ${(error as Error).message}`);
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
  const db = readJson(dir, KNOWLEDGE_FILES.monsterDb);
  requireRecord(KNOWLEDGE_FILES.monsterDb, db["monsters"], "monsters");
  requireRecord(KNOWLEDGE_FILES.monsterDb, db["encounters"], "encounters");
  requireRecord(KNOWLEDGE_FILES.monsterDb, db["bosses"], "bosses");

  const experience = readJson(dir, KNOWLEDGE_FILES.experience);
  if (!Array.isArray(experience["entries"]) || experience["entries"].length === 0) throw new KnowledgeLoadError(`${KNOWLEDGE_FILES.experience} 缺少 entries 或为空`);
  for (const [index, entry] of (experience["entries"] as unknown[]).entries()) {
    const ok = isRecord(entry) && typeof entry["id"] === "string" && typeof entry["scope"] === "string" && typeof entry["lesson"] === "string" && Array.isArray(entry["asc"]) && Array.isArray(entry["evidence"]);
    if (!ok) throw new KnowledgeLoadError(`${KNOWLEDGE_FILES.experience} 第 ${index} 条缺少 id/scope/lesson/asc/evidence`);
  }

  const rooms = readJson(dir, KNOWLEDGE_FILES.roomCosts);
  requireRecord(KNOWLEDGE_FILES.roomCosts, rooms["by_asc"], "by_asc");

  const outcome = readJson(dir, KNOWLEDGE_FILES.outcomeStats);
  requireRecord(KNOWLEDGE_FILES.outcomeStats, outcome["rest"], "rest");

  const hints = readJson(dir, KNOWLEDGE_FILES.jevHints);
  if (!Array.isArray(hints["hints"]) || hints["hints"].length === 0) throw new KnowledgeLoadError(`${KNOWLEDGE_FILES.jevHints} 缺少 hints 或为空`);

  return {
    dir,
    monsterDb: db as unknown as MonsterDbFile,
    experience: { version: String(experience["version"] ?? "?"), entries: experience["entries"] as ExperienceEntry[] },
    roomCosts: rooms as unknown as RoomCostsFile,
    outcomeStats: outcome as unknown as KnowledgeData["outcomeStats"],
    // The guides' data facts ({GIANT_BLOCK_RECORD}) are filled here, once, as v3 fills them in its prompt: the full
    // prefix, the kb_* tools and gkb-dump all read the filled text.
    guide: fillGuideFacts(readText(dir, KNOWLEDGE_FILES.guide)),
    handbook: fillGuideFacts(readText(dir, KNOWLEDGE_FILES.handbook)),
    jevHints: hints as unknown as JevHintsFile,
  };
}

function stamp(dir: string): string {
  return Object.values(KNOWLEDGE_FILES)
    .map((name) => {
      try {
        const info = statSync(join(dir, name));
        return `${name}:${info.mtimeMs}:${info.size}`;
      } catch {
        return `${name}:missing`;
      }
    })
    .join("|");
}

const cache = new Map<string, { stamp: string; data: KnowledgeData }>();

/** Every knowledge file in `dir`, parsed and checked; throws KnowledgeLoadError on any failure. */
export function loadKnowledgeData(dir: string): KnowledgeData {
  const key = resolve(dir);
  const now = stamp(key);
  const hit = cache.get(key);
  if (hit && hit.stamp === now) return hit.data;
  const data = parseAll(key);
  cache.set(key, { stamp: now, data });
  return data;
}

/* ---- post-mortems (notes/lessons.md) ----------------------------------------------------------- */

/** notes/lessons.md: KNOWLEDGE_LESSONS_FILE, else the notes directory next to the repository. */
export function lessonsPath(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env["KNOWLEDGE_LESSONS_FILE"];
  return configured && configured.trim() ? resolve(configured.trim()) : join(REPO_ROOT, "..", "notes", "lessons.md");
}

export interface PostmortemSection {
  runId: string;
  /** The heading's parenthesised summary ("A9，第17层，死于…"), "" when the heading has none. */
  summary: string;
  /** Ascension named at the start of the summary ("A9，…"), null for the early headings without one. */
  asc: number | null;
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
    const section: PostmortemSection = { runId: current.runId, summary, asc: asc ? Number(asc[1]) : null, order: order++, text: lines.slice(current.start, end).join("\n").trimEnd() };
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

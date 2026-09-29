/**
 * The old hand-written knowledge (docs/v4-architecture.md §3): the Ironclad guide, the DeepSeek handbook and
 * Jev's fight hints, whole, marked as unverified and below the data. The hints' {DMG:…}-style placeholders are
 * filled from the monster DB at the run's ascension (monster-db fillDbNumbers), and their counted records
 * ({CRAB_KILLS_EN}, {LAG_NO_STRENGTH_EN}) from the fight data (boss-clock fillGuideFacts), as Jev reads them
 * (jev-hints.ts hintText).
 */

import { fillGuideFacts } from "../../strategy/boss-clock.js";
import { fillDbNumbers } from "../monster-db.js";
import { KNOWLEDGE_FILES, KnowledgeLookupError, loadKnowledgeData, type KnowledgeData, type RenderContext } from "./data.js";

export const OLD_SOURCES = {
  guide: { file: KNOWLEDGE_FILES.guide, title: "铁甲战士攻略" },
  handbook: { file: KNOWLEDGE_FILES.handbook, title: "DeepSeek 经验手册" },
  jev_hints: { file: KNOWLEDGE_FILES.jevHints, title: "Jev 战斗提示" },
} as const;

export type OldSource = keyof typeof OLD_SOURCES;
export const OLD_SOURCE_KEYS = Object.keys(OLD_SOURCES) as OldSource[];

export const OLD_KNOWLEDGE_NOTE =
  "以下是早期手写的旧知识（攻略、DeepSeek 手册、Jev 战斗提示），整份放入，未按数据逐条验证，标「旧知识、待数据验证」。和数据冲突时以数据为准：其中的数字、阈值和评级若与统计表、怪物数据库或经验库不同，以后者为准。";

function hintsText(data: KnowledgeData, asc: number, keyword?: string): string[] {
  const needle = keyword?.toLowerCase();
  return data.jevHints.hints
    .map((hint) => ({ hint, when: JSON.stringify(hint.when ?? {}), text: fillGuideFacts(fillDbNumbers(hint.text, asc, data.monsterDb.monsters)) }))
    .filter(({ hint, when, text }) => !needle || [hint.id, when, text].some((part) => part.toLowerCase().includes(needle)))
    .map(({ hint, when, text }) => `- [${hint.id}] 条件 ${when}：${text}（证据 ${hint.evidence?.length ?? 0} 局${hint.evidence?.length ? `: ${hint.evidence.join(", ")}` : ""}）`);
}

function sourceTitle(source: OldSource, data: KnowledgeData, asc: number): string {
  const { file, title } = OLD_SOURCES[source];
  if (source === "jev_hints") return `### 旧知识：${title}（${file} ${data.jevHints.version ?? ""}，待数据验证；原文英文，{…} 占位的数字已按 A${asc} 怪物数据库填入）`;
  return `### 旧知识：${title}（${file}，待数据验证）`;
}

/** One source whole. */
export function renderOldSource(source: OldSource, ctx: RenderContext): string {
  const data = loadKnowledgeData(ctx.knowledgeDir);
  const title = sourceTitle(source, data, ctx.ascension);
  if (source === "jev_hints") return [title, data.jevHints.note ?? "", ...hintsText(data, ctx.ascension)].filter(Boolean).join("\n");
  return `${title}\n${demoteHeadings((source === "guide" ? data.guide : data.handbook).trimEnd())}`;
}

/** The file's headings two levels down (# -> ###, capped at ######), so they sit under the source's heading. */
export function demoteHeadings(text: string): string {
  return text.replace(/^(#{1,6}) /gm, (_match, hashes: string) => `${"#".repeat(Math.min(6, hashes.length + 2))} `);
}

/** Every source whole, after the note that the data wins. */
export function renderOldKnowledge(ctx: RenderContext): string {
  return [OLD_KNOWLEDGE_NOTE, ...OLD_SOURCE_KEYS.map((source) => renderOldSource(source, ctx))].join("\n\n");
}

/**
 * A source (all when omitted), whole or only the lines holding `keyword` under their nearest heading. Throws
 * KnowledgeLookupError for an unknown source or a keyword found nowhere.
 */
export function queryOldKnowledge(ctx: RenderContext, source?: string, keyword?: string): string {
  if (source !== undefined && !OLD_SOURCE_KEYS.includes(source as OldSource)) throw new KnowledgeLookupError(`没有旧知识来源「${source}」。可用的来源: ${OLD_SOURCE_KEYS.map((key) => `${key}（${OLD_SOURCES[key].file}）`).join(", ")}`);
  const sources = source ? [source as OldSource] : OLD_SOURCE_KEYS;
  const needle = keyword?.trim();
  if (!needle) return [OLD_KNOWLEDGE_NOTE, ...sources.map((key) => renderOldSource(key, ctx))].join("\n\n");
  const data = loadKnowledgeData(ctx.knowledgeDir);
  const blocks: string[] = [];
  for (const key of sources) {
    const lines = key === "jev_hints" ? hintsText(data, ctx.ascension, needle) : matchingLines(key === "guide" ? data.guide : data.handbook, needle);
    if (lines.length > 0) blocks.push([sourceTitle(key, data, ctx.ascension), ...lines].join("\n"));
  }
  if (blocks.length === 0) throw new KnowledgeLookupError(`旧知识${source ? ` ${source}` : ""}里没有「${needle}」。可用的来源: ${OLD_SOURCE_KEYS.join(", ")}；不带关键词可取整份`);
  return [OLD_KNOWLEDGE_NOTE, ...blocks].join("\n\n");
}

/** The lines holding `needle` (any case), each group under the nearest heading above it. */
function matchingLines(text: string, needle: string): string[] {
  const lower = needle.toLowerCase();
  const out: string[] = [];
  let heading: string | null = null;
  let headingShown = false;
  for (const line of text.split("\n")) {
    if (/^#{1,6} /.test(line)) {
      heading = line;
      headingShown = false;
      if (!line.toLowerCase().includes(lower)) continue;
    }
    if (!line.toLowerCase().includes(lower)) continue;
    if (heading && !headingShown && heading !== line) out.push(heading);
    headingShown = true;
    out.push(line);
  }
  return out;
}

/**
 * The whole knowledge base as a system-prompt prefix (docs/v4-architecture.md §3) for an engine that runs without
 * tools: fixed block order, stable sort keys everywhere, no clock or random input, so the same data renders the
 * same bytes and DeepSeek's prefix cache hits. The blocks go from the one that changes least to the one that
 * changes most (old knowledge, then experience, then the per-run refreshed monster DB and statistics, then the potion
 * table built from them), so a data refresh keeps the longest cached prefix. A knowledge file that fails to load
 * throws (KnowledgeLoadError).
 */

import { lessonsPath, loadKnowledgeData, loadPostmortems, type Postmortems, type RenderContext } from "./data.js";
import { loadPotionEquivalents } from "../potion-equivalents.js";
import { EXPERIENCE_LEGEND, THEME_KEYS, activeLessons, renderTheme } from "./experience-text.js";
import { renderEncounters, renderMonsters } from "./monster-text.js";
import { OLD_KNOWLEDGE_NOTE, OLD_SOURCE_KEYS, renderOldSource } from "./old-knowledge.js";
import { renderPotionTable } from "./potion-text.js";
import { renderFightRecords, renderRestStats, renderRoomCosts } from "./stats-text.js";

export interface KnowledgeSection {
  /** Stable key ("monsters", "experience.deck", …): gkb-dump --section and the size report use it. */
  key: string;
  text: string;
}

function header(ctx: RenderContext): string {
  const data = loadKnowledgeData(ctx.knowledgeDir);
  const db = data.monsterDb.meta?.generated_from;
  const potions = loadPotionEquivalents(ctx.knowledgeDir).meta;
  return [
    `# 知识库（本局进阶 A${ctx.ascension}）`,
    "以下知识在程序启动时从数据文件生成，本局内不变。可信度从高到低：统计表和怪物数据库（日志自动统计，每个数带样本数 n）＞ 经验库（复盘提炼，带支持/反对局数和置信度）＞ 旧知识（手写，待数据验证）。和数据冲突时以数据为准；n 小的数字只作参考；「估」表示本进阶没有记录、按相邻进阶的实测比例推算。",
    `数据版本：怪物数据库 ${db?.fights ?? "?"} 场战斗（最后 ${db?.last_seen ?? "?"}），经验库 ${data.experience.version}，房间代价 ${data.roomCosts.meta?.runs ?? "?"} 局，结果统计生成于 ${data.outcomeStats.generated ?? "?"}，药水换算表生成于 ${potions.generated.slice(0, 10)}（boss 战 ${potions.logs?.boss_fights ?? "?"} 场）。`,
    "块的顺序：旧知识 → 经验 → 怪物 → 遭遇 → 统计表 → 药水换算表。",
  ].join("\n");
}

/** Every block of the prefix, in order. */
export function renderKnowledgeSections(ctx: RenderContext, postmortems: Postmortems = loadPostmortems(lessonsPath())): KnowledgeSection[] {
  const data = loadKnowledgeData(ctx.knowledgeDir);
  const lessons = activeLessons(data, ctx.ascension);
  const missing = postmortems.sections ? "" : `\n（案例说明缺失：${postmortems.missing ?? `读不到 ${postmortems.path}`}；案例只列 run id）`;
  const sections: KnowledgeSection[] = [
    { key: "header", text: header(ctx) },
    { key: "old", text: `## 旧知识（待数据验证）\n${OLD_KNOWLEDGE_NOTE}` },
    ...OLD_SOURCE_KEYS.map((source) => ({ key: `old.${source}`, text: renderOldSource(source, ctx) })),
    {
      key: "experience",
      text: `## 经验库（${data.experience.version}，A${ctx.ascension} 适用 ${lessons.length} 条）\n${EXPERIENCE_LEGEND}${missing}`,
    },
    ...THEME_KEYS.map((theme) => ({ key: `experience.${theme}`, text: renderTheme(theme, lessons, postmortems, ctx.ascension) })).filter((section) => section.text !== ""),
    { key: "monsters", text: `## 怪物（A${ctx.ascension}）\n${renderMonsters(ctx)}` },
    { key: "encounters", text: `## 走廊和问号房遭遇的战绩\n${renderEncounters(ctx)}` },
    { key: "stats.rooms", text: `## 统计表\n### 房间代价（各幕、各进阶）\n${renderRoomCosts(ctx)}` },
    { key: "stats.fights", text: `### 精英和 boss 战绩（各进阶）\n${renderFightRecords(ctx)}` },
    { key: "stats.rest", text: `### 休息点：回血和锻造\n${renderRestStats(ctx)}` },
    { key: "potions", text: renderPotionTable(ctx) },
  ];
  return sections;
}

/** The whole prefix: the blocks joined by blank lines. */
export function renderKnowledgePrefix(ctx: RenderContext, postmortems?: Postmortems): string {
  return renderKnowledgeSections(ctx, postmortems).map((section) => section.text).join("\n\n");
}

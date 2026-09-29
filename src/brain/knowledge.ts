/**
 * The brain's knowledge in its system prompt (KNOWLEDGE_PREFIX; docs/v4-architecture.md §2 "修订后的主路径", §3).
 *
 * - off (default): v3's system prompt (rules + Ironclad guide + DeepSeek handbook) and v3's memory, byte for byte.
 * - full: the rules (llm/deepseek.ts SYSTEM, unchanged), a note that the data wins, then the whole knowledge base at
 *   the run's ascension (knowledge/render/knowledge-prefix.ts: old knowledge, experience, monsters, encounters,
 *   statistics). The same system goes to every engine (DeepSeek JSON mode, Claude's --system-prompt-file).
 *   What the prefix already holds is not sent twice:
 *   - the guide and the handbook are whole in the prefix's old-knowledge block, so they are not appended again;
 *   - the memory's `knowledge` section loses its experience lessons (the prefix has every lesson for this
 *     ascension); its outcome-statistics rows for what is offered (cards, relics, event options, rest by HP band)
 *     are not in the prefix, so they stay. Every other memory section (act, history, route, lookahead, ...) stays.
 * - The prefix is rendered once per process and ascension and kept until a knowledge file or the post-mortems file
 *   changes (their loaders re-read on a new mtime/size): the same bytes on every question, so the prefix caches hit
 *   (DeepSeek's automatic prefix cache, Claude's prompt cache).
 * - A knowledge base that fails to load is not hidden and not replaced by an empty one: that question goes out with
 *   v3's prompt and memory, and the failure is in the request's `knowledge` note (brain.jsonl) and the caller's note.
 */
import { createHash } from "node:crypto";

import { SLICE_LESSONS_HEADING, SLICE_STATS_HEADING } from "../knowledge/experience.js";
import { loadKnowledgeData, loadPostmortems, type Postmortems, type RenderContext } from "../knowledge/render/data.js";
import { renderKnowledgePrefix } from "../knowledge/render/knowledge-prefix.js";
import { SYSTEM } from "../llm/deepseek.js";
import { fillGuideFacts } from "../strategy/boss-clock.js";
import type { BrainRequest, KnowledgeNote } from "./types.js";

/** Between the rules and the prefix: what follows, what wins over it, and what memory.knowledge now holds. */
export const FULL_KNOWLEDGE_NOTE = [
  "# 全量知识库（背景知识；本题状态里的事实和代码算出的数字优先）",
  "下面是整份知识库：旧知识（铁甲战士攻略、DeepSeek 经验手册、Jev 战斗提示）、本进阶适用的全部经验、怪物数据库、走廊和问号房遭遇战绩、统计表。",
  "和数据冲突时以数据为准：统计表和怪物数据库（日志自动统计，带样本数 n）优先于经验库，经验库优先于旧知识；本题状态里的事实和代码算出的数字优先于这里的一切。",
  "构筑类问题（选牌、商店、休息、事件、选牌屏、宝箱、礼包）的结果统计写在选项里（outcome_stats 等，口径见 facts.outcome_stats_basis），memory.knowledge 不再重复；其他问题的 memory.knowledge 只带本题所给选项的结果统计行。经验条目都在下面的经验库里，不再逐题重复。",
].join("\n");

/** The full-knowledge system prompt: v3's rules, the note, the prefix. */
export function fullSystemPrompt(prefix: string): string {
  return `${SYSTEM}\n\n${FULL_KNOWLEDGE_NOTE}\n\n${prefix}`;
}

/**
 * The knowledge slice without its experience lessons: the outcome-statistics part as it was, or null when the slice
 * has nothing else (or is not a slice this code wrote: then it is left as it is).
 */
export function sliceWithoutLessons(text: string): string | null {
  if (!text.startsWith(SLICE_LESSONS_HEADING)) return text;
  const stats = text.indexOf(`\n${SLICE_STATS_HEADING}`);
  return stats < 0 ? null : text.slice(stats + 1);
}

/** Memory (named sections) without the lessons in its `knowledge` section; anything else as given. */
export function memoryWithoutLessons<T>(memory: T): T {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) return memory;
  const sections = memory as Record<string, unknown>;
  const knowledge = sections["knowledge"];
  if (typeof knowledge !== "string") return memory;
  const kept = sliceWithoutLessons(knowledge);
  if (kept === knowledge) return memory;
  const { knowledge: _dropped, ...rest } = sections;
  return (kept === null ? rest : { ...rest, knowledge: kept }) as T;
}

function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

export interface KnowledgePromptOptions {
  /** The post-mortems (case summaries); default: loadPostmortems() (KNOWLEDGE_LESSONS_FILE or ../notes/lessons.md). */
  postmortems?: () => Postmortems;
  /** The prefix renderer (tests). */
  render?: (ctx: RenderContext, postmortems: Postmortems) => string;
}

/** The full-knowledge system prompt per ascension and knowledge directory, rendered once and kept while the data holds. */
export class KnowledgePrompt {
  private cached: { key: string; data: unknown; postmortems: Postmortems; system: string; note: KnowledgeNote } | null = null;
  /** Renders so far (tests: the cache holds). */
  renders = 0;

  constructor(private readonly opts: KnowledgePromptOptions = {}) {}

  /** The system prompt and its note; throws KnowledgeLoadError when a knowledge file does not load. */
  system(ctx: RenderContext): { system: string; note: KnowledgeNote } {
    const key = `${ctx.ascension}|${ctx.knowledgeDir}`;
    // Both loaders return the same object while their files are unchanged (keyed by mtime and size).
    const data = loadKnowledgeData(ctx.knowledgeDir);
    const postmortems = (this.opts.postmortems ?? loadPostmortems)();
    const hit = this.cached;
    if (hit && hit.key === key && hit.data === data && hit.postmortems === postmortems) return hit;
    const render = this.opts.render ?? ((c: RenderContext, p: Postmortems) => renderKnowledgePrefix(c, p));
    // The guides' data facts ({GIANT_BLOCK_RECORD}) are filled as v3 fills them in its guide and handbook.
    const prefix = fillGuideFacts(render({ ascension: ctx.ascension, knowledgeDir: ctx.knowledgeDir }, postmortems));
    const system = fullSystemPrompt(prefix);
    this.renders += 1;
    const note: KnowledgeNote = { mode: "full", ascension: ctx.ascension, prefix_sha: sha(prefix), prefix_chars: prefix.length };
    this.cached = { key, data, postmortems, system, note };
    return { system, note };
  }

  /**
   * The request with the full knowledge: the full system, the lessons dropped from its memory, the note set. When
   * the knowledge does not load (or the ascension is unknown), the request as given (v3's prompt and memory) with
   * the error in its note.
   */
  apply(req: BrainRequest, ctx: RenderContext | null): BrainRequest {
    if (!ctx) return { ...req, knowledge: { mode: "off", error: "full knowledge asked for, but the run's ascension is not known yet: v3 prompt sent" } };
    let full: { system: string; note: KnowledgeNote };
    try {
      full = this.system(ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ...req, knowledge: { mode: "off", ascension: ctx.ascension, error: `knowledge failed to load, v3 prompt sent: ${message}`.slice(0, 400) } };
    }
    return {
      ...req,
      system: full.system,
      ...(req.memory === undefined ? {} : { memory: memoryWithoutLessons(req.memory) }),
      knowledge: full.note,
    };
  }
}

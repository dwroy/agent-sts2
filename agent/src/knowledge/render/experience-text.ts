/**
 * Experience knowledge text (docs/v4-architecture.md §3): every active lesson of experience.json whose ascension
 * range holds the run's, in theme blocks. Each lesson is its conclusion, the runs for and against it, its
 * confidence and one or two example runs, each with its post-mortem heading's one-line summary from
 * notes/lessons.md ("## <run id>（A9，第17层，死于…）"). Without the post-mortem file the examples are bare run
 * ids and the text says the case notes are missing.
 */

import type { Confidence, ExperienceEntry } from "../experience.js";
import { KnowledgeLookupError, loadKnowledgeData, loadPostmortems, lessonsPath, type KnowledgeData, type Postmortems, type RenderContext } from "./data.js";
import { factsAtAscension, fillGuideFacts } from "../../sim/boss-clock.js";
import { freshFacts, type FactFiller } from "./facts.js";
import { cmp } from "./format.js";

export const EXPERIENCE_THEMES = [
  { key: "monster", title: "怪物/boss" },
  { key: "deck", title: "构筑" },
  { key: "route", title: "路线/休息" },
  { key: "shop_event", title: "商店/事件" },
  { key: "potion", title: "药水" },
  { key: "mechanics", title: "机制/综合" },
] as const;

export type ThemeKey = (typeof EXPERIENCE_THEMES)[number]["key"];
export const THEME_KEYS: ThemeKey[] = EXPERIENCE_THEMES.map((theme) => theme.key);

/**
 * Scope -> theme: the full scope for general topics ("general:rest"), else its kind ("boss"). A scope not listed
 * falls in FALLBACK_THEME, so no lesson is dropped.
 */
export const SCOPE_THEMES: Record<string, ThemeKey> = {
  boss: "monster",
  elite: "monster",
  hallway: "monster",
  card: "deck",
  relic: "deck",
  "general:deck": "deck",
  "general:route": "route",
  "general:rest": "route",
  "general:elite": "route",
  act: "route",
  "general:shop": "shop_event",
  "general:event": "shop_event",
  "general:neow": "shop_event",
  event: "shop_event",
  potion: "potion",
  "general:potion": "potion",
  "general:plan": "mechanics",
};
export const FALLBACK_THEME: ThemeKey = "mechanics";

export function themeOf(scope: string): ThemeKey {
  const kind = scope.split(":")[0] ?? scope;
  return SCOPE_THEMES[scope] ?? SCOPE_THEMES[kind] ?? FALLBACK_THEME;
}

export function themeTitle(key: ThemeKey): string {
  return EXPERIENCE_THEMES.find((theme) => theme.key === key)!.title;
}

const CONFIDENCE_ZH: Record<Confidence, string> = { high: "高", med: "中", low: "低" };
const CONFIDENCE_RANK: Record<string, number> = { high: 0, med: 1, low: 2 };

/** Example runs per lesson. */
export const MAX_CASES = 2;
/** A case summary is the heading's text up to its first 「：」/「；」, cut to this many characters. */
export const CASE_SUMMARY_MAX = 90;

/** Whether the lesson applies at `asc`: active and its ascension range holds it. */
export function appliesAt(entry: ExperienceEntry, asc: number): boolean {
  const [lo, hi] = entry.asc ?? [0, 20];
  return entry.status === "active" && asc >= lo && asc <= hi;
}

function entryOrder(a: ExperienceEntry, b: ExperienceEntry): number {
  return (
    cmp(a.scope, b.scope) ||
    (CONFIDENCE_RANK[a.confidence] ?? 3) - (CONFIDENCE_RANK[b.confidence] ?? 3) ||
    b.n_support - a.n_support ||
    cmp(a.id, b.id)
  );
}

/** The lessons that apply at `asc`, in a stable order (scope, confidence, support, id). */
export function activeLessons(data: KnowledgeData, asc: number): ExperienceEntry[] {
  return data.experience.entries.filter((entry) => appliesAt(entry, asc)).sort(entryOrder);
}

/** The one-line summary of a post-mortem heading ("A9，第17层，死于一幕 boss 墨影幻灵 VANTOM"). */
export function caseSummary(summary: string): string {
  const cut = summary.search(/[：；]/);
  const head = (cut >= 0 ? summary.slice(0, cut) : summary).trim();
  return head.length > CASE_SUMMARY_MAX ? `${head.slice(0, CASE_SUMMARY_MAX)}…` : head;
}

interface Case {
  runId: string;
  summary: string | null;
}

/**
 * Up to MAX_CASES supporting runs: those with a post-mortem first, the ones at the nearest ascension, then the
 * most recent (later in the file), then by run id.
 */
export function pickCases(entry: ExperienceEntry, postmortems: Postmortems, asc: number): Case[] {
  const sections = postmortems.sections;
  const ranked = [...new Set(entry.evidence)].map((runId) => {
    const section = sections?.get(runId)?.[0];
    return { runId, section, distance: section?.asc === null || section?.asc === undefined ? 99 : Math.abs(section.asc - asc) };
  });
  ranked.sort((a, b) => Number(!!b.section) - Number(!!a.section) || a.distance - b.distance || (b.section?.order ?? -1) - (a.section?.order ?? -1) || cmp(a.runId, b.runId));
  return ranked.slice(0, MAX_CASES).map(({ runId, section }) => ({ runId, summary: section ? caseSummary(section.summary) || "（标题无说明）" : null }));
}

function caseText(item: Case, postmortems: Postmortems): string {
  if (item.summary !== null) return `${item.runId}（${item.summary}）`;
  return postmortems.sections ? `${item.runId}（复盘里没有这一局）` : item.runId;
}

export function lessonText(entry: ExperienceEntry, postmortems: Postmortems, asc: number, facts: FactFiller = freshFacts): string {
  const [lo, hi] = entry.asc ?? [0, 20];
  const cases = pickCases(entry, postmortems, asc).map((item) => caseText(item, postmortems));
  // The lesson's data placeholders filled as the guides' are (v3 b5e1f44: one count of the same fights in both), the
  // records by the run's ascension band (factsAtAscension).
  const head = `- [${entry.id}｜${entry.scope}${entry.name ? ` ${entry.name}` : ""}｜适用 A${lo}–${hi}] ${facts(factsAtAscension(entry.lesson, asc), fillGuideFacts)}`;
  const tail = `  支持 ${entry.n_support} 局，反对 ${entry.n_contradict} 局，置信 ${CONFIDENCE_ZH[entry.confidence] ?? entry.confidence}${cases.length > 0 ? `；案例: ${cases.join("；")}` : ""}`;
  return `${head}\n${tail}`;
}

export const EXPERIENCE_LEGEND =
  "每条：[id｜范围｜适用进阶] 结论；支持/反对的局数和置信度；一两个典型案例（run id 和复盘标题里的一句话，全文可用 kb_postmortem 查）。经验是证据不是命令，和统计数据冲突时以数据为准。";

function missingNote(postmortems: Postmortems): string | null {
  return postmortems.sections ? null : `（案例说明缺失：${postmortems.missing ?? `读不到 ${postmortems.path}`}；案例只列 run id）`;
}

export interface ExperienceFilter {
  theme?: ThemeKey;
  ids?: string[];
  keyword?: string;
}

/** One theme block: heading and its lessons ("" when the theme has none). */
export function renderTheme(theme: ThemeKey, lessons: ExperienceEntry[], postmortems: Postmortems, asc: number, facts: FactFiller = freshFacts): string {
  const own = lessons.filter((entry) => themeOf(entry.scope) === theme);
  if (own.length === 0) return "";
  return [`### 经验：${themeTitle(theme)}（${own.length} 条）`, ...own.map((entry) => lessonText(entry, postmortems, asc, facts))].join("\n");
}

/** The whole experience block for the prefix: legend, then every theme with lessons. */
export function renderExperience(ctx: RenderContext, postmortems: Postmortems = loadPostmortems(lessonsPath())): string {
  const data = loadKnowledgeData(ctx.knowledgeDir);
  const lessons = activeLessons(data, ctx.ascension);
  const note = missingNote(postmortems);
  const head = `经验库 ${data.experience.version}：A${ctx.ascension} 适用的有效条目 ${lessons.length} 条（共 ${data.experience.entries.length} 条）。${EXPERIENCE_LEGEND}${note ? `\n${note}` : ""}`;
  return [head, ...THEME_KEYS.map((theme) => renderTheme(theme, lessons, postmortems, ctx.ascension, ctx.facts)).filter(Boolean)].join("\n\n");
}

/**
 * Lessons by theme, id and/or keyword (all given filters must hold), grouped by theme. Throws KnowledgeLookupError
 * when nothing matches, saying why (an id that is retired or outside this ascension's range, an unknown theme).
 */
export function queryExperience(ctx: RenderContext, filter: ExperienceFilter, postmortems: Postmortems = loadPostmortems(lessonsPath())): string {
  const data = loadKnowledgeData(ctx.knowledgeDir);
  const asc = ctx.ascension;
  if (filter.theme && !THEME_KEYS.includes(filter.theme)) throw new KnowledgeLookupError(`没有主题「${filter.theme}」。可用的主题: ${EXPERIENCE_THEMES.map((theme) => `${theme.key}（${theme.title}）`).join(", ")}`);
  const lessons = activeLessons(data, asc);
  if (filter.ids && filter.ids.length > 0) {
    for (const id of filter.ids) {
      if (lessons.some((entry) => entry.id === id)) continue;
      const entry = data.experience.entries.find((item) => item.id === id);
      if (!entry) throw new KnowledgeLookupError(`没有经验条目「${id}」。A${asc} 适用的 id: ${lessons.map((item) => item.id).join(", ")}`);
      if (entry.status !== "active") throw new KnowledgeLookupError(`经验条目「${id}」已退役（${entry.retired_reason ?? "无说明"}），不再使用`);
      throw new KnowledgeLookupError(`经验条目「${id}」适用 A${entry.asc[0]}–${entry.asc[1]}，不含当前 A${asc}`);
    }
  }
  const keyword = filter.keyword?.trim().toLowerCase();
  const matched = lessons.filter(
    (entry) =>
      (!filter.theme || themeOf(entry.scope) === filter.theme) &&
      (!filter.ids || filter.ids.length === 0 || filter.ids.includes(entry.id)) &&
      (!keyword || [entry.id, entry.scope, entry.name ?? "", entry.lesson].some((text) => text.toLowerCase().includes(keyword))),
  );
  if (matched.length === 0) {
    const what = [filter.theme ? `主题 ${filter.theme}` : "", filter.keyword ? `关键词「${filter.keyword}」` : ""].filter(Boolean).join("、");
    throw new KnowledgeLookupError(`A${asc} 适用的经验里没有符合 ${what || "条件"} 的条目。可用的主题: ${THEME_KEYS.join(", ")}`);
  }
  const note = missingNote(postmortems);
  const blocks = THEME_KEYS.map((theme) => renderTheme(theme, matched, postmortems, asc, ctx.facts)).filter(Boolean);
  return [`${matched.length} 条（A${asc}，经验库 ${data.experience.version}）。${EXPERIENCE_LEGEND}${note ? `\n${note}` : ""}`, ...blocks].join("\n\n");
}

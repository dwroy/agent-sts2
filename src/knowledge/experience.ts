/**
 * The experience knowledge base (DeepSeek only): distilled lessons from our post-mortems
 * (experience.json, curated from notes/lessons.md) and outcome statistics from the logs
 * (outcome-stats.json, tools/build-outcome-stats.py). Every DeepSeek question gets the *relevant slice*:
 * the lessons whose scope matches what is on the screen (offered cards/relics/potions/events), the act
 * boss, the act's elites and dangerous hallway fights, and the general topics of this kind of decision,
 * plus the outcome-stats rows of what is offered. The slice is bounded by relevance and confidence;
 * the most relevant tiers (offered items, the act boss) are never cut to make room for general advice.
 *
 * Lessons are evidence-based guidance with their confidence and sample sizes, not orders: the state and
 * code's computed numbers take precedence (the DeepSeek system prompt says so).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { GameState } from "../mod/schema.js";
import { fillGuideFacts } from "../strategy/boss-clock.js";
import { asArray, asRecord, num, str, type JsonValue } from "../util/json.js";
import { actThreatIds, bossOnBoard } from "./monster-db.js";
import { bumpDataVersion } from "../util/data-version.js";

export type Confidence = "low" | "med" | "high";

export interface ExperienceEntry {
  id: string;
  /** boss:<ID> | elite:<ID> | hallway:<ID> | act:<n> | card:<ID> | relic:<ID> | event:<ID> | potion:<ID> | general:<topic> */
  scope: string;
  /** Chinese name of the scoped item, to recognise it where the screen shows only names (reward potions, chest relics). */
  name?: string;
  /** Inclusive ascension range the lesson was learnt at / applies to. */
  asc: [number, number];
  lesson: string;
  evidence: string[];
  n_support: number;
  n_contradict: number;
  confidence: Confidence;
  last_seen: string;
  status: "active" | "retired";
  retired_reason?: string;
}

interface ExperienceFile {
  version?: string;
  entries?: ExperienceEntry[];
}

interface OutcomeRow {
  n?: number;
  mean_floor?: number | null;
  boss_pass?: number | null;
  hp_change?: number | null;
  max_hp_change?: number | null;
  gold_change?: number | null;
  low_n?: boolean;
  title?: string;
}

export interface OutcomeStats {
  ascension?: number | string;
  /** When tools/build-outcome-stats.py wrote the file. */
  generated?: string;
  baseline?: { runs?: number; mean_floor?: number | null; boss_pass_by_act?: Record<string, { n?: number; boss_pass?: number }> };
  cards?: Record<string, { name?: string; by_act?: Record<string, { picked?: OutcomeRow; offered_not_picked?: OutcomeRow }> }>;
  relics?: Record<string, { name?: string; by_act?: Record<string, OutcomeRow> }>;
  events?: Record<string, { name?: string; options?: Record<string, OutcomeRow> }>;
  rest?: Record<string, Record<string, OutcomeRow>>;
}

let experienceCache: ExperienceEntry[] | null = null;
let statsCache: OutcomeStats | null = null;

function here(file: string): string {
  return join(dirname(fileURLToPath(import.meta.url)), file);
}

export function loadExperience(): ExperienceEntry[] {
  if (experienceCache) return experienceCache;
  try {
    const parsed = JSON.parse(readFileSync(here("experience.json"), "utf8")) as ExperienceFile;
    experienceCache = Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch {
    experienceCache = [];
  }
  return experienceCache;
}

export function loadOutcomeStats(): OutcomeStats {
  if (statsCache) return statsCache;
  try {
    statsCache = JSON.parse(readFileSync(here("outcome-stats.json"), "utf8")) as OutcomeStats;
  } catch {
    statsCache = {};
  }
  return statsCache;
}

/** For tests: use these instead of the files (null reloads the file). */
export function setExperienceForTests(entries: ExperienceEntry[] | null, stats: OutcomeStats | null = null): void {
  bumpDataVersion();
  experienceCache = entries;
  statsCache = stats;
}

/* ---- what is on the screen ------------------------------------------------------------------- */

export interface Offered {
  cards: string[];
  relics: string[];
  potions: string[];
  events: string[];
  /** Event option keys (the text_key's last segment, e.g. NEOW's relic ids), for the outcome stats. */
  eventOptions: string[];
  /** Every string shown in the screen's section (names), for entries matched by name. */
  text: string;
}

/** The screen sections whose ids count as "offered" (the run's deck/relics are not offers). */
const SCREEN_SECTIONS = ["reward", "shop", "event", "chest", "selection", "bundles", "capstone", "crystal_sphere", "rest"];
const ID_KEYS: Record<string, keyof Pick<Offered, "cards" | "relics" | "potions" | "events">> = {
  card_id: "cards",
  relic_id: "relics",
  potion_id: "potions",
  event_id: "events",
};

/** The offer with extra card ids (a one-shot question's deck targets: the cards the old selection screen showed). */
function withCards(offered: Offered, cards: readonly string[]): Offered {
  const extra = cards.filter((id) => id && !offered.cards.includes(id));
  return extra.length > 0 ? { ...offered, cards: [...offered.cards, ...extra] } : offered;
}

export function offeredOn(state: GameState, criteria: Record<string, string | null> = {}): Offered {
  const offered: Offered = { cards: [], relics: [], potions: [], events: [], eventOptions: [], text: "" };
  const texts: string[] = [];
  const add = (list: string[], id: string): void => {
    if (id && !list.includes(id)) list.push(id);
  };
  const walk = (value: JsonValue | undefined, depth: number): void => {
    if (depth > 6 || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }
    if (typeof value === "string") {
      if (value.length <= 60) texts.push(value);
      return;
    }
    if (typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      const list = ID_KEYS[key];
      if (list && typeof child === "string") add(offered[list], child);
      else if (key === "text_key" && typeof child === "string") add(offered.eventOptions, child.split(".").at(-1) ?? "");
      else if (key === "title" || key === "name" || key === "description") walk(child, depth + 1);
      else if (typeof child === "object") walk(child, depth + 1);
    }
  };
  for (const section of SCREEN_SECTIONS) walk(state.raw[section] as JsonValue | undefined, 0);
  for (const criterion of Object.values(criteria)) if (criterion) texts.push(criterion);
  offered.text = texts.join("\n");
  return offered;
}

/* ---- slice selection ------------------------------------------------------------------------- */

/** General topics per decision label (prefix match, first hit wins). */
const TOPICS: [RegExp, string[]][] = [
  [/^run-plan/, ["plan", "route", "deck", "elite", "rest", "shop", "potion"]],
  [/^fight-plan/, ["plan", "potion"]],
  [/^(map\/)?route|^map\//, ["route", "elite", "rest"]],
  [/^reward\//, ["deck"]],
  [/^shop\//, ["shop", "deck", "potion"]],
  // One-shot questions (BUILD_ONESHOT) also pick the deck card(s) their follow-up takes.
  [/^rest\/plan/, ["rest", "deck"]],
  [/^rest\//, ["rest"]],
  [/^selection\/upgrade/, ["rest", "deck"]],
  [/^selection\//, ["deck"]],
  [/^event\/plan/, ["event", "deck"]],
  // The act-start Ancient with the act's route (BUILD_ONESHOT): the route's topics too.
  [/^event\/act-plan/, ["event", "deck", "route", "elite", "rest"]],
  [/^event\//, ["event"]],
  [/^(chest|bundle|capstone)\//, ["deck"]],
  [/^combat\//, ["potion"]],
];

/** Ancient events (Neow and the act-start ancients): their options are relics, and general:neow applies. */
export const ANCIENT_EVENTS = new Set(["NEOW", "PAEL", "TEZCATARA", "VAKUU", "TANX", "NONUPEIPE"]);

export function topicsFor(label: string, offered?: Pick<Offered, "events">): string[] {
  for (const [pattern, topics] of TOPICS) {
    if (!pattern.test(label)) continue;
    return offered?.events.some((id) => ANCIENT_EVENTS.has(id)) ? [...topics, "neow"] : topics;
  }
  return [];
}

/** A scope's monster id matches a fight's or the map's id, or the parts named after it (DECIMILLIPEDE_SEGMENT_*). */
function monsterMatch(scopeId: string, ids: readonly string[] | undefined): boolean {
  return !!ids && ids.some((id) => id === scopeId || id.startsWith(`${scopeId}_`));
}

/** Labels whose decision is about the map ahead: the act's elites and hallways rank with the boss. */
const ROUTE_LABELS = /^(run-plan|map\/|route|rest\/|event\/act-plan)/;

export interface SliceInput {
  label: string;
  act: number;
  asc: number;
  bossId: string | null;
  offered: Offered;
  /** Monster ids of the act's elites and dangerous hallway fights (monster DB). */
  threats: string[];
  /** Monster ids in the current fight (fight plans). */
  enemies?: string[];
}

export const MAX_LESSONS = 25;
/** Hard cap even for the never-cut tiers (offered items, the act boss). */
export const HARD_MAX_LESSONS = 40;

const CONFIDENCE_RANK: Record<Confidence, number> = { high: 0, med: 1, low: 2 };

function scopeParts(scope: string): [string, string] {
  const at = scope.indexOf(":");
  return at < 0 ? [scope, ""] : [scope.slice(0, at), scope.slice(at + 1)];
}

/**
 * Relevance tier of an entry for this decision (lower is more relevant), or null when it does not apply:
 * 0 offered items / current enemies, 1 the act boss, 2 route-relevant threats, 3 the decision's general
 * topics, 4 the act and threats on non-route screens.
 */
export function relevance(entry: ExperienceEntry, input: SliceInput): number | null {
  if (entry.status !== "active") return null;
  const [lo, hi] = entry.asc ?? [0, 20];
  if (input.asc < lo || input.asc > hi) return null;
  const [kind, id] = scopeParts(entry.scope);
  const named = (): boolean => !!entry.name && entry.name.length >= 2 && input.offered.text.includes(entry.name);
  const boss = (input.bossId ?? "").toUpperCase().replace(/_BOSS$/, "");
  switch (kind) {
    case "card":
      // By id only: short card names ("愤怒") also occur inside other options' text.
      return input.offered.cards.includes(id) ? 0 : null;
    case "relic":
      return input.offered.relics.includes(id) || input.offered.eventOptions.includes(id) || named() ? 0 : null;
    case "potion":
      return input.offered.potions.includes(id) || named() ? 0 : null;
    case "event":
      return input.offered.events.includes(id) ? 0 : null;
    case "boss":
      // Scoped to the boss id while the board shows its parts (KAISER_CRAB: CRUSHER + ROCKET).
      if (bossOnBoard(id, input.enemies)) return 0;
      return boss && id === boss ? (input.enemies && input.enemies.length > 0 ? 0 : 1) : null;
    case "elite":
    case "hallway":
      if (monsterMatch(id, input.enemies)) return 0;
      if (!monsterMatch(id, input.threats)) return null;
      return ROUTE_LABELS.test(input.label) ? 2 : 4;
    case "act":
      return Number(id) === input.act ? 4 : null;
    case "general":
      return topicsFor(input.label, input.offered).includes(id) ? 3 : null;
    default:
      return null;
  }
}

/**
 * The lessons for this decision, most relevant first: tiers 0–1 (offered items, the act boss) are all
 * kept up to HARD_MAX_LESSONS; the rest fill up to MAX_LESSONS by tier, confidence and support.
 */
export function selectLessons(input: SliceInput, entries: ExperienceEntry[] = loadExperience(), max = MAX_LESSONS): ExperienceEntry[] {
  const ranked = entries
    .map((entry) => ({ entry, tier: relevance(entry, input) }))
    .filter((item): item is { entry: ExperienceEntry; tier: number } => item.tier !== null)
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        CONFIDENCE_RANK[a.entry.confidence] - CONFIDENCE_RANK[b.entry.confidence] ||
        b.entry.n_support - a.entry.n_support ||
        a.entry.n_contradict - b.entry.n_contradict ||
        a.entry.id.localeCompare(b.entry.id),
    );
  const core = ranked.filter((item) => item.tier <= 1).slice(0, HARD_MAX_LESSONS);
  const rest = ranked.filter((item) => item.tier > 1).slice(0, Math.max(0, max - core.length));
  return [...core, ...rest].map((item) => item.entry);
}

/* ---- rendering ------------------------------------------------------------------------------- */

const CONFIDENCE_ZH: Record<Confidence, string> = { high: "高", med: "中", low: "低" };

/**
 * A lesson as the models read it: counts that the fight data also holds are written as the guides' placeholders
 * ({GIANT_KILLS_A8}, {CRAB_KILL_ORDER}, {BOSS_RECORD:ID}, {QUEEN_AMALGAM}…) and filled here from the data
 * (boss-clock fillGuideFacts), as the guides are, so a lesson and the guide never quote two different counts of the
 * same fights (2026-09-30: giant-explode said "A8 27 场…T10 前击杀 13/15" while the guide's filled record said 29
 * fights, 14/17, in the same DeepSeek question).
 */
export function lessonText(entry: Pick<ExperienceEntry, "lesson">): string {
  return entry.lesson.includes("{") ? fillGuideFacts(entry.lesson) : entry.lesson;
}

function lessonLine(entry: ExperienceEntry): string {
  const contra = entry.n_contradict > 0 ? ` 反例${entry.n_contradict}` : "";
  return `- [${entry.scope}${entry.name ? ` ${entry.name}` : ""} | 置信${CONFIDENCE_ZH[entry.confidence]} n=${entry.n_support}${contra}] ${lessonText(entry)}`;
}

function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? "?" : `${Math.round(value * 100)}%`;
}

function signed(value: number | null | undefined): string {
  if (value === null || value === undefined) return "?";
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function outcome(row: OutcomeRow | undefined): string | null {
  if (!row || !row.n) return null;
  return `n=${row.n}${row.low_n ? "(少)" : ""} 均终层${row.mean_floor ?? "?"} 过本幕boss ${pct(row.boss_pass)}`;
}

function hpBand(state: GameState): string | null {
  const hp = state.run?.current_hp ?? null;
  const max = state.run?.max_hp ?? null;
  if (hp === null || !max) return null;
  const frac = hp / max;
  return frac < 0.4 ? "<40%" : frac < 0.6 ? "40-60%" : frac < 0.8 ? "60-80%" : ">=80%";
}

export const MAX_STAT_ROWS = 12;

/** Outcome-stats rows for what is offered (cards, relics, event options) and, at a rest site, the HP band. */
export function statsLines(state: GameState, input: SliceInput, stats: OutcomeStats = loadOutcomeStats()): string[] {
  const rows: string[] = [];
  const act = String(input.act);
  for (const id of input.offered.cards) {
    const card = stats.cards?.[id];
    const byAct = card?.by_act?.[act];
    if (!byAct) continue;
    const picked = outcome(byAct.picked);
    const skipped = outcome(byAct.offered_not_picked);
    if (picked || skipped) rows.push(`卡 ${card?.name ?? id}(${id}) 第${act}幕: 拿了 ${picked ?? "无记录"} | 给了没拿 ${skipped ?? "无记录"}`);
  }
  for (const id of [...input.offered.relics, ...input.offered.eventOptions]) {
    const relic = stats.relics?.[id];
    const line = outcome(relic?.by_act?.[act]);
    if (line) rows.push(`遗物 ${relic?.name ?? id}(${id}) 第${act}幕获得: ${line}`);
  }
  for (const id of input.offered.events) {
    const event = stats.events?.[id];
    if (!event?.options) continue;
    for (const [key, row] of Object.entries(event.options)) {
      const line = outcome(row);
      if (!line) continue;
      const deltas = [
        row.hp_change != null && Math.round(row.hp_change) !== 0 ? `HP${signed(row.hp_change)}` : "",
        row.max_hp_change != null && Math.round(row.max_hp_change) !== 0 ? `上限${signed(row.max_hp_change)}` : "",
        row.gold_change != null && Math.round(row.gold_change) !== 0 ? `金${signed(row.gold_change)}` : "",
      ].filter(Boolean);
      rows.push(`事件 ${event.name ?? id}(${id}) 选「${row.title ?? key}」: ${line}${deltas.length > 0 ? ` | 本层平均 ${deltas.join(" ")}` : ""}`);
    }
  }
  if (/^rest\//.test(input.label)) {
    const band = hpBand(state);
    if (band) {
      for (const [option, byBand] of Object.entries(stats.rest ?? {})) {
        const line = outcome(byBand[band]);
        if (line) rows.push(`休息点 ${option} 在 HP ${band}: ${line}`);
      }
    }
  }
  if (rows.length === 0) return [];
  const pass = stats.baseline?.boss_pass_by_act?.[act];
  const baseline = `基线 A${stats.ascension ?? "?"} 全部 ${stats.baseline?.runs ?? "?"} 局: 均终层 ${stats.baseline?.mean_floor ?? "?"}${pass ? `，到达第${act}幕的局过本幕boss ${pct(pass.boss_pass)} (n=${pass.n})` : ""}`;
  return [baseline, ...rows.slice(0, MAX_STAT_ROWS)];
}

export interface KnowledgeSlice {
  text: string;
  lessons: string[];
  stats: number;
}

/** The headings of the knowledge slice's two parts (the V4 full-knowledge prompt drops the lessons part: brain/knowledge.ts). */
export const SLICE_LESSONS_HEADING = `经验库（过往对局复盘提炼；置信 高/中/低，n=支持局数，反例=相反证据局数；是证据不是命令，与状态里的事实和代码算出的数字一起权衡）:`;
export const SLICE_STATS_HEADING = `结果统计（日志自动统计，观察数据：混有「在什么局面下选它」的因素；n<5 标「少」）:`;

/**
 * The whole `knowledge` section for one DeepSeek question ("" when nothing applies). `withStats: false` when the
 * question carries its options' outcome statistics itself (V4 M2 build questions: knowledge/outcome-facts.ts), so
 * they are not repeated here.
 */
export function knowledgeSlice(state: GameState, label: string, criteria: Record<string, string | null> = {}, offeredCards: readonly string[] = [], withStats = true): KnowledgeSlice {
  const act = actNumber(state);
  const asc = state.run?.ascension ?? 0;
  const combat = asRecord(state.combat?.raw ?? state.raw["combat"]);
  const enemies = asArray(combat["enemies"]).map((enemy) => str(asRecord(enemy)["enemy_id"])).filter(Boolean);
  const input: SliceInput = {
    label,
    act,
    asc,
    bossId: state.run?.boss_id ?? (str(asRecord(state.run?.raw)["boss_id"]) || null),
    offered: withCards(offeredOn(state, criteria), offeredCards),
    threats: actThreatIds(act, asc),
    enemies,
  };
  const lessons = selectLessons(input);
  const stats = withStats ? statsLines(state, input) : [];
  if (lessons.length === 0 && stats.length === 0) return { text: "", lessons: [], stats: 0 };
  const parts: string[] = [];
  if (lessons.length > 0) {
    parts.push(SLICE_LESSONS_HEADING);
    parts.push(...lessons.map(lessonLine));
  }
  if (stats.length > 0) {
    parts.push(SLICE_STATS_HEADING);
    parts.push(...stats);
  }
  return { text: parts.join("\n"), lessons: lessons.map((entry) => entry.id), stats: stats.length };
}

function actNumber(state: GameState): number {
  const raw = str(asRecord(state.run?.raw)["act_id"]);
  if (/^\d+$/.test(raw)) return Number(raw) + 1;
  return num(state.run?.act_id, 0) + 1;
}

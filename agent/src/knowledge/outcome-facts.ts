/**
 * Outcome statistics as facts on the brain's build questions (V4 M2, docs/v4-build-facts.md): the rows of
 * outcome-stats.json (knowledge/builders/build-outcome-stats.py, refreshed after every run) for what an option is, given as they
 * are, with n and the ascension they were counted at; "无数据" when the file has no row. Code does not turn them
 * into a score or a ranking: the brain weighs them (Dai 2026-09-29, v4-dev-brief §3).
 *
 * By the run's ascension (Dai 2026-10-04; knowledge/outcome-tables.ts): at A8, below A8 or without an ascension the
 * A8 table, the text as before; from A9 up the run's own ascension's rows, and where one has fewer than 5 runs and A8's
 * has 5 or more, the same choice's A8 row after it in brackets, labelled ("（A9 不足5局，另附 A8：…）"), never added into it.
 *
 * The statistics' own definitions (which runs count as "picked", what boss_pass means) are the build script's and
 * are not changed here (docs/v4-architecture.md: 口径 B waits for the discussion with Dai).
 */

import { loadOutcomeStats, type OutcomeStats } from "./experience.js";
import { OUTCOME_MIN_N, outcomeView, pairHelps, pairThin, referenceNote, referenceRow, rowHelps, rowThin, type OutcomeView } from "./outcome-tables.js";

/** What an option carries when outcome-stats.json has no row for it. */
export const NO_DATA = "无数据";

/** The facts key of the basis note (a question carrying it has its outcome statistics in its options). */
export const OUTCOME_BASIS_KEY = "outcome_stats_basis";

interface Row {
  n?: number;
  mean_floor?: number | null;
  boss_pass?: number | null;
  hp_change?: number | null;
  max_hp_change?: number | null;
  gold_change?: number | null;
  low_n?: boolean;
  title?: string;
}

interface CardAct {
  picked?: Row;
  offered_not_picked?: Row;
}

function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? "?" : `${Math.round(value * 100)}%`;
}

function signed(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

/** One row: "n=41 过本幕boss 73% 均终层27.9" ("(少)" after n when n < 5); null without runs. */
export function outcomeRow(row: Row | undefined): string | null {
  if (!row || !row.n) return null;
  return `n=${row.n}${row.low_n ? "(少)" : ""} 过本幕boss ${pct(row.boss_pass)} 均终层${row.mean_floor ?? "?"}`;
}

/** "A8 " (the ascension the table was counted at). */
function ascOf(stats: OutcomeStats): string {
  return `A${stats.ascension ?? "?"}`;
}

/** The keys of every table's record, sorted (the run's table and its references: a key only a reference has is listed too). */
function keysOf(view: OutcomeView, recordOf: (table: OutcomeStats) => Record<string, unknown> | undefined): string[] {
  return [...new Set([view.table, ...view.refs].flatMap((table) => Object.keys(recordOf(table) ?? {})))].sort();
}

/** A card's act line: "拿了 n=41 … / 给了没拿 n=1(少) …" (null when neither side has runs). */
function cardActLine(pair: CardAct | undefined): string | null {
  const picked = outcomeRow(pair?.picked);
  const skipped = outcomeRow(pair?.offered_not_picked);
  return picked || skipped ? `拿了 ${picked ?? NO_DATA} / 给了没拿 ${skipped ?? NO_DATA}` : null;
}

/**
 * A card, per act it was picked in: runs that took it in that act, and runs offered it on that act's card rewards
 * that did not take it. "A8 第1幕 拿了 n=41 过本幕boss 73% 均终层27.9 / 给了没拿 n=1(少) 过本幕boss 0% 均终层17；第2幕 …".
 * From A9 up an act where a side has fewer than 5 runs carries the A8 act line after it when A8 has 5 or more on that side
 * ("（A9 不足5局，另附 A8：拿了 … / 给了没拿 …）"): the contrast is read within one ascension.
 */
export function cardOutcome(cardId: string, ascension?: number | null, stats: OutcomeStats = loadOutcomeStats()): string {
  const view = outcomeView(ascension, stats);
  const id = cardId.replace(/\+$/, "");
  const actsOf = (table: OutcomeStats) => table.cards?.[id]?.by_act;
  const parts: string[] = [];
  for (const act of keysOf(view, actsOf)) {
    const own = actsOf(view.table)?.[act];
    const line = cardActLine(own);
    const ref = view.refs.length > 0 && pairThin(own) ? referenceRow(view.refs, (table) => actsOf(table)?.[act], pairHelps(own)) : null;
    if (!line && !ref) continue;
    parts.push(`第${act}幕 ${line ?? `拿了 ${NO_DATA} / 给了没拿 ${NO_DATA}`}${ref ? referenceNote(view, ref.table, cardActLine(ref.row) ?? NO_DATA) : ""}`);
  }
  return parts.length > 0 ? `${ascOf(view.table)} ${parts.join("；")}` : NO_DATA;
}

/** A relic, per act it was obtained in: "A8 第1幕获得 n=5 过本幕boss 60% 均终层25；第2幕获得 …" (from A9 up, thin acts with A8's). */
export function relicOutcome(relicId: string, ascension?: number | null, stats: OutcomeStats = loadOutcomeStats()): string {
  const view = outcomeView(ascension, stats);
  const actsOf = (table: OutcomeStats) => table.relics?.[relicId]?.by_act as Record<string, Row> | undefined;
  const parts = keysOf(view, actsOf).flatMap((act) => {
    const own = actsOf(view.table)?.[act];
    const line = outcomeRow(own);
    const ref = view.refs.length > 0 && rowThin(own) ? referenceRow(view.refs, (table) => actsOf(table)?.[act], rowHelps) : null;
    if (!line && !ref) return [];
    return [`第${act}幕获得 ${line ?? NO_DATA}${ref ? referenceNote(view, ref.table, outcomeRow(ref.row) ?? NO_DATA) : ""}`];
  });
  return parts.length > 0 ? `${ascOf(view.table)} ${parts.join("；")}` : NO_DATA;
}

/** An event option's row with its HP / max HP / gold change to the next floor: "n=10 … 均终层32.4，到下一层平均 HP-3". */
function eventLine(row: Row | undefined): string | null {
  const line = outcomeRow(row);
  if (!line || !row) return null;
  const deltas = [
    row.hp_change != null && Math.round(row.hp_change) !== 0 ? `HP${signed(row.hp_change)}` : "",
    row.max_hp_change != null && Math.round(row.max_hp_change) !== 0 ? `上限${signed(row.max_hp_change)}` : "",
    row.gold_change != null && Math.round(row.gold_change) !== 0 ? `金${signed(row.gold_change)}` : "",
  ].filter(Boolean);
  return `${line}${deltas.length > 0 ? `，到下一层平均 ${deltas.join(" ")}` : ""}`;
}

/**
 * An event option (event id + the option's text_key last segment, as the build script keys it): runs that chose
 * it, and the HP / max HP / gold change from the choice to the first decision on the next floor. An option named
 * after a relic (Neow and the act-start Ancients) also carries the relic's row. From A9 up a thin row carries A8's.
 */
export function eventOptionOutcome(eventId: string, optionKey: string, ascension?: number | null, stats: OutcomeStats = loadOutcomeStats()): string {
  const view = outcomeView(ascension, stats);
  const rowOf = (table: OutcomeStats) => table.events?.[eventId]?.options?.[optionKey] as Row | undefined;
  const parts: string[] = [];
  const own = rowOf(view.table);
  const line = eventLine(own);
  const ref = view.refs.length > 0 && rowThin(own) ? referenceRow(view.refs, rowOf, rowHelps) : null;
  if (line || ref) parts.push(`选这个选项 ${line ?? NO_DATA}${ref ? referenceNote(view, ref.table, eventLine(ref.row) ?? NO_DATA) : ""}`);
  const relicTable = optionKey ? [view.table, ...view.refs].find((table) => table.relics?.[optionKey]) : undefined;
  if (relicTable) {
    const relic = relicOutcome(optionKey, ascension, stats);
    if (relic !== NO_DATA) parts.push(`遗物 ${relicTable.relics?.[optionKey]?.name ?? optionKey} ${relic.replace(/^A\S+ /, "")}`);
  }
  return parts.length > 0 ? `${ascOf(view.table)} ${parts.join("；")}` : NO_DATA;
}

/** The HP bands of the rest-site rows (knowledge/builders/build-outcome-stats.py HP_BANDS), by HP share on arrival. */
export function hpBandOf(hp: number | null | undefined, maxHp: number | null | undefined): string | null {
  if (hp === null || hp === undefined || !maxHp) return null;
  const frac = hp / maxHp;
  return frac < 0.4 ? "<40%" : frac < 0.6 ? "40-60%" : frac < 0.8 ? "60-80%" : ">=80%";
}

const BANDS = ["<40%", "40-60%", "60-80%", ">=80%"];

/**
 * A rest-site option (HEAL, SMITH, …) at each HP band on arrival: "A8 HP<40% n=137 过本幕boss 31% 均终层30.4；…" (from
 * A9 up, a thin band with A8's).
 */
export function restOutcome(optionId: string, ascension?: number | null, stats: OutcomeStats = loadOutcomeStats()): string {
  const view = outcomeView(ascension, stats);
  const bandsOf = (table: OutcomeStats) => (table.rest?.[optionId] ?? {}) as Record<string, Row>;
  const parts = BANDS.flatMap((band) => {
    const own = bandsOf(view.table)[band];
    const line = outcomeRow(own);
    const ref = view.refs.length > 0 && rowThin(own) ? referenceRow(view.refs, (table) => bandsOf(table)[band], rowHelps) : null;
    if (!line && !ref) return [];
    return [`HP${band} ${line ?? NO_DATA}${ref ? referenceNote(view, ref.table, outcomeRow(ref.row) ?? NO_DATA) : ""}`];
  });
  return parts.length > 0 ? `${ascOf(view.table)} ${parts.join("；")}` : NO_DATA;
}

/** A table's baseline: "到达第1幕的局过第1幕boss 77% (n=232)，…" ("" without one). */
function baselineText(stats: OutcomeStats): string {
  return Object.entries(stats.baseline?.boss_pass_by_act ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([act, row]) => `到达第${act}幕的局过第${act}幕boss ${pct(row.boss_pass)} (n=${row.n ?? "?"})`)
    .join("，");
}

/**
 * What the outcome_stats fields mean and where they come from, with the baseline to read them against: one note in
 * the question's facts. `ascension` is the run's: at A8 and below its table is A8's (a mismatch is said); from A9 up
 * its own ascension's, with the baseline of each ascension its thin rows are referenced against.
 */
export function outcomeStatsBasis(ascension: number | null, stats: OutcomeStats = loadOutcomeStats()): string {
  const view = outcomeView(ascension, stats);
  const table = view.table;
  const asc = ascOf(table);
  const runs = table.baseline?.runs ?? "?";
  const generated = table.generated ? `，生成于 ${table.generated}` : "";
  const baseline = baselineText(table);
  const mismatch = view.refs.length === 0 && ascension !== null && String(ascension) !== String(table.ascension ?? "") ? `（本局 A${ascension}，统计只有 ${asc} 的）` : "";
  const apart = view.asc !== null ? "；每个进阶分开统计" : "";
  const refs = view.refs.length > 0
    ? `${asc} 的一行不足${OUTCOME_MIN_N}局、而 ${view.refs.map(ascOf).join("/")} 的同一行够${OUTCOME_MIN_N}局时，后面括号里另附那一行，标明进阶（${view.refs.length > 1 ? "取最近的一个进阶；" : ""}另算，不与 ${asc} 的合并）；` +
      `${view.refs.map((ref) => `${ascOf(ref)} 基线（全部 ${ref.baseline?.runs ?? "?"} 局）：${baselineText(ref) || NO_DATA}`).join("；")}。`
    : "";
  return [
    `outcome_stats / card_outcome_stats / option_outcome_stats = ${asc} 数据${mismatch}：src/knowledge/outcome-stats.json（日志自动统计，tools/build-outcome-stats.py${generated}，${asc} 共 ${runs} 局${apart}）；没有记录的写「${NO_DATA}」。`,
    "口径：n = 局数（n<5 标「少」）；过本幕boss = 这些局里打过「做这个选择时所在那一幕」boss 的比例；均终层 = 这些局的平均最终层数。",
    "卡牌「拿了」= 这一幕里牌组多了这张牌（奖励、商店、事件都算），「给了没拿」= 这一幕的卡牌奖励里给过、这一幕没拿；遗物 = 这一幕获得；事件选项 = 选了这个选项（到下一层第一次决策时的平均 HP/上限/金币变化）；休息点 = 按到达时的 HP 档。",
    "观察数据：混有「在什么局面下做这个选择」的因素，不是因果。",
    `基线（${asc} 全部 ${runs} 局）：${baseline || NO_DATA}。`,
    refs,
  ].join("");
}

/**
 * Outcome statistics as facts on the brain's build questions (V4 M2, docs/v4-build-facts.md): the rows of
 * outcome-stats.json (tools/build-outcome-stats.py, refreshed after every run) for what an option is, given as they
 * are, with n and the ascension they were counted at; "无数据" when the file has no row. Code does not turn them
 * into a score or a ranking: the brain weighs them (Dai 2026-09-29, v4-dev-brief §3).
 *
 * The statistics' own definitions (which runs count as "picked", what boss_pass means) are the build script's and
 * are not changed here (docs/v4-architecture.md: 口径 B waits for the discussion with Dai).
 */

import { loadOutcomeStats, type OutcomeStats } from "./experience.js";

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

/** "A8 " (the ascension the file was counted at). */
function ascOf(stats: OutcomeStats): string {
  return `A${stats.ascension ?? "?"}`;
}

/**
 * A card, per act it was picked in: runs that took it in that act, and runs offered it on that act's card rewards
 * that did not take it. "A8 第1幕 拿了 n=41 过本幕boss 73% 均终层27.9 / 给了没拿 n=1(少) 过本幕boss 0% 均终层17；第2幕 …".
 */
export function cardOutcome(cardId: string, stats: OutcomeStats = loadOutcomeStats()): string {
  const byAct = stats.cards?.[cardId.replace(/\+$/, "")]?.by_act ?? {};
  const acts = Object.keys(byAct).sort();
  const parts: string[] = [];
  for (const act of acts) {
    const picked = outcomeRow(byAct[act]?.picked);
    const skipped = outcomeRow(byAct[act]?.offered_not_picked);
    if (!picked && !skipped) continue;
    parts.push(`第${act}幕 拿了 ${picked ?? NO_DATA} / 给了没拿 ${skipped ?? NO_DATA}`);
  }
  return parts.length > 0 ? `${ascOf(stats)} ${parts.join("；")}` : NO_DATA;
}

/** A relic, per act it was obtained in: "A8 第1幕获得 n=5 过本幕boss 60% 均终层25；第2幕获得 …". */
export function relicOutcome(relicId: string, stats: OutcomeStats = loadOutcomeStats()): string {
  const byAct = stats.relics?.[relicId]?.by_act ?? {};
  const parts = Object.keys(byAct)
    .sort()
    .flatMap((act) => {
      const line = outcomeRow(byAct[act] as Row | undefined);
      return line ? [`第${act}幕获得 ${line}`] : [];
    });
  return parts.length > 0 ? `${ascOf(stats)} ${parts.join("；")}` : NO_DATA;
}

/**
 * An event option (event id + the option's text_key last segment, as the build script keys it): runs that chose
 * it, and the HP / max HP / gold change from the choice to the first decision on the next floor. An option named
 * after a relic (Neow and the act-start Ancients) also carries the relic's row.
 */
export function eventOptionOutcome(eventId: string, optionKey: string, stats: OutcomeStats = loadOutcomeStats()): string {
  const row = stats.events?.[eventId]?.options?.[optionKey] as Row | undefined;
  const parts: string[] = [];
  const line = outcomeRow(row);
  if (line && row) {
    const deltas = [
      row.hp_change != null && Math.round(row.hp_change) !== 0 ? `HP${signed(row.hp_change)}` : "",
      row.max_hp_change != null && Math.round(row.max_hp_change) !== 0 ? `上限${signed(row.max_hp_change)}` : "",
      row.gold_change != null && Math.round(row.gold_change) !== 0 ? `金${signed(row.gold_change)}` : "",
    ].filter(Boolean);
    parts.push(`选这个选项 ${line}${deltas.length > 0 ? `，到下一层平均 ${deltas.join(" ")}` : ""}`);
  }
  if (optionKey && stats.relics?.[optionKey]) {
    const relic = relicOutcome(optionKey, stats);
    if (relic !== NO_DATA) parts.push(`遗物 ${stats.relics[optionKey]?.name ?? optionKey} ${relic.replace(/^A\S+ /, "")}`);
  }
  return parts.length > 0 ? `${ascOf(stats)} ${parts.join("；")}` : NO_DATA;
}

/** The HP bands of the rest-site rows (tools/build-outcome-stats.py HP_BANDS), by HP share on arrival. */
export function hpBandOf(hp: number | null | undefined, maxHp: number | null | undefined): string | null {
  if (hp === null || hp === undefined || !maxHp) return null;
  const frac = hp / maxHp;
  return frac < 0.4 ? "<40%" : frac < 0.6 ? "40-60%" : frac < 0.8 ? "60-80%" : ">=80%";
}

const BANDS = ["<40%", "40-60%", "60-80%", ">=80%"];

/** A rest-site option (HEAL, SMITH, …) at each HP band on arrival: "A8 HP<40% n=137 过本幕boss 31% 均终层30.4；…". */
export function restOutcome(optionId: string, stats: OutcomeStats = loadOutcomeStats()): string {
  const byBand = (stats.rest?.[optionId] ?? {}) as Record<string, Row>;
  const parts = BANDS.flatMap((band) => {
    const line = outcomeRow(byBand[band]);
    return line ? [`HP${band} ${line}`] : [];
  });
  return parts.length > 0 ? `${ascOf(stats)} ${parts.join("；")}` : NO_DATA;
}

/**
 * What the outcome_stats fields mean and where they come from, with the baseline to read them against: one note in
 * the question's facts. `ascension` is the run's (a mismatch with the file's is said).
 */
export function outcomeStatsBasis(ascension: number | null, stats: OutcomeStats = loadOutcomeStats()): string {
  const asc = ascOf(stats);
  const runs = stats.baseline?.runs ?? "?";
  const generated = stats.generated ? `，生成于 ${stats.generated}` : "";
  const baseline = Object.entries(stats.baseline?.boss_pass_by_act ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([act, row]) => `到达第${act}幕的局过第${act}幕boss ${pct(row.boss_pass)} (n=${row.n ?? "?"})`)
    .join("，");
  const mismatch = ascension !== null && String(ascension) !== String(stats.ascension ?? "") ? `（本局 A${ascension}，统计只有 ${asc} 的）` : "";
  return [
    `outcome_stats / card_outcome_stats / option_outcome_stats = ${asc} 数据${mismatch}：src/knowledge/outcome-stats.json（日志自动统计，tools/build-outcome-stats.py${generated}，${asc} 共 ${runs} 局）；没有记录的写「${NO_DATA}」。`,
    "口径：n = 局数（n<5 标「少」）；过本幕boss = 这些局里打过「做这个选择时所在那一幕」boss 的比例；均终层 = 这些局的平均最终层数。",
    "卡牌「拿了」= 这一幕里牌组多了这张牌（奖励、商店、事件都算），「给了没拿」= 这一幕的卡牌奖励里给过、这一幕没拿；遗物 = 这一幕获得；事件选项 = 选了这个选项（到下一层第一次决策时的平均 HP/上限/金币变化）；休息点 = 按到达时的 HP 档。",
    "观察数据：混有「在什么局面下做这个选择」的因素，不是因果。",
    `基线（${asc} 全部 ${runs} 局）：${baseline || NO_DATA}。`,
  ].join("");
}

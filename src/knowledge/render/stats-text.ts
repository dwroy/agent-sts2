/**
 * Statistics tables (docs/v4-architecture.md §3): HP cost of each map room by act and ascension
 * (room-costs.json), our record against elites and act bosses by ascension (monster-db.json), and what healing
 * or upgrading at a rest site went with, by HP band (outcome-stats.json). Acts, ascensions, room types and HP
 * bands come from the data: no floor numbers are written here.
 */

import { MEASURED_ROOM_MIN_N } from "../room-costs.js";
import { KnowledgeLookupError, loadKnowledgeData, type KnowledgeData, type RenderContext } from "./data.js";
import { RECORD_LEGEND, bossAct, bossIds, bossLine, encounterKeys, encounterLine } from "./monster-text.js";
import { cmp, numericKeys, pct, rate, round1 } from "./format.js";

export const STATS_TABLES = ["room_costs", "fights", "rest"] as const;
export type StatsTable = (typeof STATS_TABLES)[number];

/** Room types in reading order, with their names; a type not listed follows in id order. */
const ROOM_ORDER: [string, string][] = [
  ["Monster", "走廊"],
  ["Elite", "精英"],
  ["Unknown", "问号"],
  // v3 337074d (tools/build-room-costs.py): the ? rooms that turned out to be a fight, also counted in Unknown.
  ["UnknownFight", "问号里的战斗"],
  ["RestSite", "休息"],
  ["Shop", "商店"],
  ["Treasure", "宝箱"],
];
const ROOM_NAME = new Map(ROOM_ORDER);

const REST_NAME: Record<string, string> = { HEAL: "回血 HEAL", SMITH: "锻造 SMITH", LIFT: "举重 LIFT", DIG: "挖掘 DIG", RECALL: "回忆 RECALL", TOKE: "TOKE" };
/** HP bands in reading order; a band not listed follows in string order. */
const BAND_ORDER = ["<40%", "40-60%", "60-80%", ">=80%"];

function orderBy<T extends string>(keys: T[], order: readonly string[]): T[] {
  const rank = (key: string) => {
    const index = order.indexOf(key);
    return index < 0 ? order.length : index;
  };
  return [...keys].sort((a, b) => rank(a) - rank(b) || cmp(a, b));
}

function acts(data: KnowledgeData): number[] {
  const seen = new Set<number>();
  for (const byAct of Object.values(data.roomCosts.by_asc)) for (const act of numericKeys(byAct)) seen.add(act);
  return [...seen].sort((a, b) => a - b);
}

function roomTypes(data: KnowledgeData, act: number): string[] {
  const seen = new Set<string>();
  for (const byAct of Object.values(data.roomCosts.by_asc)) for (const room of Object.keys(byAct[String(act)] ?? {})) seen.add(room);
  return orderBy([...seen], ROOM_ORDER.map(([room]) => room));
}

function hasP90(data: KnowledgeData): boolean {
  return Object.values(data.roomCosts.by_asc).some((byAct) => Object.values(byAct).some((rooms) => Object.values(rooms).some((room) => typeof room.p90 === "number")));
}

function roomCell(room: { n: number; deaths?: number; median: number; p75: number; p90?: number; fight_median?: number; fight_p75?: number } | undefined): string {
  if (!room || !room.n) return "—";
  const p90 = typeof room.p90 === "number" ? round1(room.p90) : "—";
  const few = room.n < MEASURED_ROOM_MIN_N ? "(少)" : "";
  const inside = typeof room.fight_median === "number" && typeof room.fight_p75 === "number" ? ` 战内${round1(room.fight_median)}/${round1(room.fight_p75)}` : "";
  return `${round1(room.median)}/${round1(room.p75)}/${p90}${inside} 死${rate((room.deaths ?? 0) / room.n)} n=${room.n}${few}`;
}

/** Said under the table when the data has the in-fight columns or the ? room fights. */
function fightNote(data: KnowledgeData): string {
  const rooms = Object.values(data.roomCosts.by_asc).flatMap((byAct) => Object.values(byAct).flatMap((byRoom) => Object.entries(byRoom)));
  const parts = [
    ...(rooms.some(([, room]) => typeof room.fight_median === "number") ? ["「战内 中位/p75」= 战斗里掉的血（第一个到最后一个出牌决策，不含战后燃烧之血等回血）"] : []),
    ...(rooms.some(([name]) => name === "UnknownFight") ? ["「问号里的战斗」= 进门是战斗的问号房，也算在「问号」里"] : []),
  ];
  return parts.length > 0 ? `${parts.join("；")}。` : "";
}

/** The room-cost table of one act (every logged ascension, highest first), or of every act. */
export function renderRoomCosts(ctx: RenderContext, act?: number): string {
  const data = loadKnowledgeData(ctx.knowledgeDir);
  const all = acts(data);
  if (act !== undefined && !all.includes(act)) throw new KnowledgeLookupError(`房间代价表没有第 ${act} 幕。可用的幕: ${all.join(", ")}`);
  const meta = data.roomCosts.meta;
  const p90Note = hasP90(data) ? "" : "p90 暂缺（room-costs.json 还没有 p90 字段，要用新版 tools/build-room-costs.py 重建），记为 —。";
  const lines = [
    `每个房间的血量变化 = 进房血量 − 下一层地图上的血量（正数=掉血，负数=回血；战斗房含燃烧之血等战后回血；死在房间里的按进房血量全掉计）。格子: 中位/p75/p90 死亡率 n=房间数；n<${MEASURED_ROOM_MIN_N} 标(少)。${fightNote(data)}${p90Note}数据 ${meta?.runs ?? "?"} 局，最后 ${meta?.last_seen ?? "?"}。`,
  ];
  for (const at of act === undefined ? all : [act]) {
    const rooms = roomTypes(data, at);
    lines.push(`#### 第${at}幕`, `| 进阶 | ${rooms.map((room) => ROOM_NAME.get(room) ?? room).join(" | ")} |`, `|---|${rooms.map(() => "---").join("|")}|`);
    for (const asc of numericKeys(data.roomCosts.by_asc).reverse()) {
      const byRoom = data.roomCosts.by_asc[String(asc)]?.[String(at)];
      if (!byRoom) continue;
      lines.push(`| A${asc}${asc === ctx.ascension ? "（本局）" : ""} | ${rooms.map((room) => roomCell(byRoom[room])).join(" | ")} |`);
    }
  }
  return lines.join("\n");
}

/** Elites and act bosses: our record at every logged ascension, by act. */
export function renderFightRecords(ctx: RenderContext, act?: number): string {
  const data = loadKnowledgeData(ctx.knowledgeDir);
  const eliteActs = encounterKeys(data, ["elite"]).flatMap((key) => numericKeys(data.monsterDb.encounters[key]!.acts));
  const actList = [...new Set([...eliteActs, ...bossIds(data).map((id) => bossAct(data, id))])].sort((a, b) => a - b);
  if (act !== undefined && !actList.includes(act)) throw new KnowledgeLookupError(`精英和 boss 战绩没有第 ${act} 幕。可用的幕: ${actList.join(", ")}`);
  const lines = [`${RECORD_LEGEND}boss 另有赢局回合数和每回合掉血（输赢都算）。`];
  for (const at of act === undefined ? actList : [act]) {
    const elites = encounterKeys(data, ["elite"], at);
    const bosses = bossIds(data, at);
    if (elites.length === 0 && bosses.length === 0) continue;
    lines.push(`#### 第${at}幕`);
    for (const key of elites) lines.push(encounterLine(data, key, data.monsterDb.encounters[key]!));
    for (const id of bosses) lines.push(bossLine(data, id));
  }
  return lines.join("\n");
}

/** Rest-site choices by HP band on arrival (outcome-stats.json rest), with the baseline they compare to. */
export function renderRestStats(ctx: RenderContext): string {
  const data = loadKnowledgeData(ctx.knowledgeDir);
  const stats = data.outcomeStats;
  const baseline = stats.baseline;
  const pass = Object.entries(baseline?.boss_pass_by_act ?? {})
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([act, row]) => `第${act}幕 ${pct(row.boss_pass)} (n=${row.n ?? 0})`);
  const lines = [
    `结果统计（outcome-stats.json，A${stats.ascension ?? "?"} 的局，生成于 ${stats.generated ?? "?"}；观察数据：一个选择的数字混有「在什么局面下选它」的影响；n=局数，n<5 标(少)）。` +
      `${String(stats.ascension) !== String(ctx.ascension) ? `注意：这是 A${stats.ascension ?? "?"} 的数据，不是本局的 A${ctx.ascension}。` : ""}`,
    `基线 ${baseline?.runs ?? "?"} 局：均终层 ${baseline?.mean_floor ?? "?"}；过本幕 boss 比例 ${pass.join("，") || "?"}。`,
    "休息点选择（按到达时的血量段）：n 局，均终层，过本幕 boss 比例。实际回血多少见房间代价表「休息」列（负数=回血）。",
  ];
  for (const option of orderBy(Object.keys(stats.rest ?? {}), Object.keys(REST_NAME))) {
    const byBand = stats.rest![option]!;
    const cells = orderBy(Object.keys(byBand), BAND_ORDER).map((band) => {
      const row = byBand[band]!;
      return `${band} n=${row.n ?? 0}${row.low_n ? "(少)" : ""} 均终层 ${row.mean_floor ?? "?"} 过boss ${pct(row.boss_pass)}`;
    });
    lines.push(`- ${REST_NAME[option] ?? option}：${cells.join("；")}`);
  }
  return lines.join("\n");
}

export function renderStatsTable(table: string, ctx: RenderContext, act?: number): string {
  switch (table) {
    case "room_costs":
      return renderRoomCosts(ctx, act);
    case "fights":
      return renderFightRecords(ctx, act);
    case "rest":
      return renderRestStats(ctx);
    default:
      throw new KnowledgeLookupError(`没有统计表「${table}」。可用的表: room_costs（房间代价）, fights（精英和 boss 战绩）, rest（休息点）`);
  }
}

/**
 * The potion table (Dai 2026-09-30; docs/potion-equivalents.md): what each potion held is worth in the act boss
 * fight at the run's ascension, as HP / damage / block, with its source and n. The same code renders the knowledge
 * prefix block (every potion an Ironclad run can get, one line each) and the kb_potion tool (one potion in detail,
 * or the table). Numbers come from knowledge/characters/ironclad/potion-equivalents.json; a table that does not load throws.
 */

import {
  CATEGORY_ZH,
  SOLVER_ZH,
  loadPotionEquivalents,
  loadPotionEquivalentsOrNull,
  potionEquivalentFrom,
  potionText,
  tableAscension,
  type PotionEquivalent,
  type PotionEquivalentsFile,
  type PotionEntry,
} from "../potion-equivalents.js";
import { KnowledgeLookupError, type RenderContext } from "./data.js";
import { cmp, round1 } from "./format.js";
import { characterName, knowledgeCharacter } from "../files.js";

const ACTS = [1, 2, 3] as const;
const ACT_ZH: Record<number, string> = { 1: "一幕", 2: "二幕", 3: "三幕" };
const USAGE_ZH: Record<string, string> = { AnyTime: "战斗内外都能喝", CombatOnly: "只能在战斗中喝", Automatic: "自动触发，不能主动喝" };

export const POTION_TABLE_LEGEND =
  "持有价值 = 这瓶药留到本幕 boss 战能省下（或回复）的血：boss 之前喝掉它，就等于付出这些血；boss 战里喝不算代价。每格三个数是同一个价值的三种说法：血 / 伤害（血 ÷ r，r = boss 每回合打进来的血 ÷ 我方每回合伤害）/ 格挡（1:1）。来源：公式 = boss 战实测输入代公式；估 = 公式里有估计常数（抽到的牌打出率、敌方每回合段数等）。n = 输入用到的 boss 战场数；「输入借 A8」= 本进阶这一幕 boss 战不足 5 场，借用 A8 的实测输入。";

/** The table's worth of `id` in every act at `asc` (the table's ascension), null where it has no value. */
function worths(file: PotionEquivalentsFile, id: string, asc: number): (PotionEquivalent | null)[] {
  return ACTS.map((act) => potionEquivalentFrom(file, id, act, asc));
}

/** "9.2/31.4/9.2": the held value (a negative HP reads 0) as HP / damage / block. */
function triple(eq: PotionEquivalent): string {
  const scale = eq.hp !== 0 ? eq.holdHp / eq.hp : 0;
  return `${round1(eq.holdHp)}/${round1(eq.damage * scale)}/${round1(eq.block * scale)}`;
}

/** Special notes of a potion (never a rule). */
function notes(entry: PotionEntry, eqs: (PotionEquivalent | null)[]): string[] {
  const out: string[] = [];
  if (entry.timing_free) out.push("什么时候喝都一样，喝掉不算代价");
  if (entry.usage === "Automatic") out.push("自动触发，不能主动喝");
  const negative = eqs.find((eq) => eq && eq.hp < 0);
  if (negative) out.push(`喝了净亏 ${round1(-negative.hp)} 血（伤到自己），持有价值按 0`);
  return out;
}

/** 「公式 n=49/12/22」: the sources of the three acts, merged when they agree (a borrowed act is on the rates line). */
function sourcesText(eqs: (PotionEquivalent | null)[]): string {
  const present = eqs.filter((eq): eq is PotionEquivalent => eq !== null);
  const kinds = [...new Set(present.map((eq) => eq.source))];
  const source = kinds.length === 1 ? kinds[0]! : present.map((eq) => `${ACT_ZH[eq.act]}${eq.source}`).join("、");
  return `${source} n=${present.map((eq) => eq.n).join("/")}`;
}

function potionLine(file: PotionEquivalentsFile, id: string, asc: number): string | null {
  const entry = file.potions[id]!;
  const eqs = worths(file, id, asc);
  if (eqs.every((eq) => eq === null)) return null;
  const cells = eqs.map((eq, i) => `${ACT_ZH[i + 1]} ${eq ? triple(eq) : "—"}`).join("，");
  const extra = notes(entry, eqs);
  return `- ${entry.name} ${id}［${CATEGORY_ZH[entry.category]}］${cells}（${sourcesText(eqs)}${extra.length > 0 ? `；${extra.join("；")}` : ""}）`;
}

function ratesLine(file: PotionEquivalentsFile, asc: number): string {
  const acts = file.rates[String(asc)] ?? {};
  const parts = ACTS.filter((act) => acts[String(act)]).map((act) => {
    const r = acts[String(act)]!;
    const borrowed = r.from_asc !== asc ? `，借 A${r.from_asc}` : "";
    return `${ACT_ZH[act]} r=${r.r.toFixed(3)}（我方每回合 ${round1(r.D)} 伤害，boss 每回合打进来 ${round1(r.L)} 血，战斗 ${round1(r.T)} 回合，每回合 ${round1(r.h)} 段攻击、${round1(r.b)} 张格挡牌，n=${r.fights}${borrowed}）`;
  });
  return `换算率（boss 战实测）：${parts.join("；")}`;
}

/** The ascension the table answers for, or a lookup error naming the ascensions it has. */
function ascOf(file: PotionEquivalentsFile, ascension: number): number {
  const asc = tableAscension(file, ascension);
  if (asc === null) throw new KnowledgeLookupError("药水换算表没有任何进阶的数据");
  return asc;
}

function heldOrder(file: PotionEquivalentsFile, asc: number): string[] {
  const first = (id: string) => potionEquivalentFrom(file, id, 1, asc)?.holdHp ?? -1;
  return Object.keys(file.potions).sort((a, b) => first(b) - first(a) || cmp(a, b));
}

/** The prefix block (and kb_potion without an id): every potion an Ironclad run can get, at the run's ascension. */
export function renderPotionTable(ctx: RenderContext): string {
  const character = knowledgeCharacter();
  const loaded = loadPotionEquivalentsOrNull(ctx.knowledgeDir);
  if (!loaded) return `## 药水换算表\n${characterName(character)}还没有药水换算表（还没有它的 boss 战记录）。`;
  const file = loaded;
  // The flag of the pools this character's runs draw from is named after it ("ironclad": the Ironclad's file).
  const inPool = (id: string): boolean => (file.potions[id] as unknown as Record<string, unknown>)[character] === true;
  const asc = ascOf(file, ctx.ascension);
  const note = asc === ctx.ascension ? `A${asc}` : `A${asc}（本表没有 A${ctx.ascension}，用最近的 A${asc}）`;
  const generated = `生成于 ${file.meta.generated.slice(0, 10)}，boss 战 ${file.meta.logs?.boss_fights ?? "?"} 场`;
  const lines = [`## 药水换算表（${note}：每瓶药留到本幕 boss 战值多少，血/伤害/格挡）`, `${POTION_TABLE_LEGEND}（${generated}；公式见 docs/potion-equivalents.md）`, ratesLine(file, asc), "按一幕持有价值从高到低："];
  const none: string[] = [];
  for (const id of heldOrder(file, asc)) {
    const entry = file.potions[id]!;
    if (!inPool(id)) continue;
    const line = potionLine(file, id, asc);
    if (line) lines.push(line);
    else none.push(`${entry.name} ${id}${entry.note ? `（${entry.note}）` : ""}`);
  }
  if (none.length > 0) lines.push(`没有数值：${none.join("，")}`);
  const others = Object.keys(file.potions)
    .filter((id) => !inPool(id))
    .sort(cmp);
  if (others.length > 0) lines.push(`不在${characterName(character)}药水池（没有数值）：${others.map((id) => file.potions[id]!.name).join("、")}`);
  return lines.join("\n");
}

/** A potion by id (FIRE_POTION), its Chinese name (火焰药水), or a unique part of the name. */
export function findPotion(file: PotionEquivalentsFile, query: string): string {
  const text = query.trim();
  const upper = text.toUpperCase();
  if (file.potions[upper]) return upper;
  const ids = Object.keys(file.potions).sort(cmp);
  const exact = ids.filter((id) => file.potions[id]!.name === text);
  if (exact.length === 1) return exact[0]!;
  const partial = ids.filter((id) => text.length > 0 && (file.potions[id]!.name.includes(text) || id.includes(upper)));
  if (partial.length === 1) return partial[0]!;
  const shown = (partial.length > 1 ? partial : ids).map((id) => `${id}（${file.potions[id]!.name}）`);
  throw new KnowledgeLookupError(`${partial.length > 1 ? `「${text}」对上多瓶药` : `找不到药水「${text}」`}。可选：${shown.join("，")}`);
}

/** kb_potion with an id: one potion in detail (effect, log counts, every act's worth with its formula and checks). */
export function renderPotion(query: string, ctx: RenderContext, act?: number): string {
  const file = loadPotionEquivalents(ctx.knowledgeDir);
  const id = findPotion(file, query);
  const entry = file.potions[id]!;
  const asc = ascOf(file, ctx.ascension);
  const boss = Object.entries(entry.log.boss_drinks)
    .sort((a, b) => cmp(a[0], b[0]))
    .map(([a, n]) => `A${a} ${n} 次`)
    .join("、");
  const lines = [
    `${entry.name} ${id}［${CATEGORY_ZH[entry.category]}］稀有度 ${entry.rarity ?? "?"}，${USAGE_ZH[entry.usage ?? ""] ?? entry.usage ?? "?"}，目标 ${entry.target ?? "?"}；求解器：${SOLVER_ZH[entry.solver]}`,
    `效果：${potionText(id, entry)}`,
    `日志：出现在 ${entry.log.runs_seen} 局，喝了 ${entry.log.drinks} 次${boss ? `；boss 战喝 ${boss}` : ""}`,
  ];
  const eqs = worths(file, id, asc).filter((eq): eq is PotionEquivalent => eq !== null && (act === undefined || eq.act === act));
  if (eqs.length === 0) {
    lines.push(`没有数值：${entry.note ?? `A${asc}${act !== undefined ? ` ${ACT_ZH[act] ?? `第 ${act} 幕`}` : ""} 没有记录`}`);
    return lines.join("\n");
  }
  lines.push(`A${asc}${asc === ctx.ascension ? "" : `（本表没有 A${ctx.ascension}）`} 本幕 boss 战里值多少（血/伤害/格挡）：`);
  for (const eq of eqs) {
    const borrowed = eq.inputsAscension !== eq.tableAscension ? `，输入借 A${eq.inputsAscension}` : "";
    const check = eq.check ? `；校验：boss 战喝它时，「喝」的推演线比「不喝」的整场少掉 ${round1(eq.check.median)} 血（中位，n=${eq.check.n}）` : "";
    const mc = eq.mc ? `；蒙特卡洛本回合平均增益 ${round1(eq.mc.hp)} 血（n=${eq.mc.n}，拿着它的每一问都算，不只是该喝的那回合）` : "";
    lines.push(`- ${ACT_ZH[eq.act]}：${triple(eq)}（${eq.source} n=${eq.n}${borrowed}）：${eq.formula}${check}${mc}`);
  }
  const extra = notes(entry, eqs);
  if (extra.length > 0) lines.push(`注意：${extra.join("；")}`);
  if (entry.check_all) {
    lines.push(`校验合计（A8/A9 各幕）：中位 ${round1(entry.check_all.median)} 血（n=${entry.check_all.n}）。「不喝」的线后面几回合仍可以喝这瓶药，所以校验列量的是「现在喝还是这场晚点喝」，不是留到 boss 的持有价值。`);
  }
  return lines.join("\n");
}

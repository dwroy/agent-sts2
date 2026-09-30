/**
 * Potion equivalents (Dai 2026-09-30): a potion drunk is HP paid later, so each potion held is worth some HP,
 * damage or block in the act boss fight. The table is built from the logs by tools/build-potion-equivalents.py
 * (formulas and inputs: docs/potion-equivalents.md) into src/knowledge/potion-equivalents.json; this module loads
 * and checks it (a missing or malformed file throws KnowledgeLoadError, never an empty table) and answers
 * "what is potion X worth in act N's boss at ascension A" for the knowledge prefix, the kb_potion tool and Jev's
 * combat question. Facts only: nothing here decides a drink.
 */

import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { fillPotionText } from "./potion-values.js";
import { DEFAULT_KNOWLEDGE_DIR, KnowledgeLoadError } from "./render/data.js";

export const POTION_EQUIVALENTS_FILE = "potion-equivalents.json";

export const POTION_CATEGORIES = ["damage", "block", "heal", "strength", "dexterity", "debuff", "energy", "draw", "random", "other"] as const;
export type PotionCategory = (typeof POTION_CATEGORIES)[number];
export const CATEGORY_ZH: Record<PotionCategory, string> = {
  damage: "伤害",
  block: "格挡",
  heal: "回血",
  strength: "力量",
  dexterity: "敏捷",
  debuff: "易伤虚弱类减益",
  energy: "能量",
  draw: "抽牌",
  random: "随机",
  other: "其他",
};

/** How the turn solver plays the potion: exactly (card-model POTION_EFFECTS), by Monte Carlo, or not at all. */
export type SolverModel = "exact" | "mc" | "none";
export const SOLVER_ZH: Record<SolverModel, string> = { exact: "精确", mc: "蒙特卡洛", none: "未建模" };

/** One potion in one act's boss fight at one ascension (the builder's numbers). */
export interface PotionWorth {
  /** HP saved (or healed) in the boss fight; negative when drinking hurts (Foul Potion). */
  hp: number;
  /** The damage worth as much: hp / r. */
  damage: number;
  /** The block worth as much (1:1). */
  block: number;
  /** Held value: max(0, hp). */
  hold_hp: number;
  /** 公式: a formula on the logged inputs; 估: an estimate constant is in it. */
  source: "公式" | "估";
  formula: string;
  /** Boss fights behind the inputs. */
  n: number;
  inputs?: Record<string, number>;
  /** The inputs were borrowed from this ascension (this one had fewer than min_n boss fights of the act). */
  inputs_asc?: number;
  /** Check column: median over boss drinks of (best no-drink line's rollout loss − the drink line's), n. */
  check?: { median: number; n: number };
  /** Second check (random potions): the logged Monte Carlo this-turn gain in HP, n questions. */
  mc?: { hp: number; n: number };
}

export interface PotionEntry {
  name: string;
  /** The game's template (「造成{Damage}点伤害。」): filled with potion-values.ts by potionText(). */
  description: string;
  rarity: string | null;
  usage: string | null;
  target: string | null;
  pool: string;
  /** In the pools an Ironclad run draws from (shared, ironclad, event, token). */
  ironclad: boolean;
  category: PotionCategory;
  kind: string | null;
  solver: SolverModel;
  values: Record<string, number>;
  log: { runs_seen: number; drinks: number; boss_drinks: Record<string, number> };
  /** Worth the same whenever drunk (Fruit Juice): drinking it early costs nothing. */
  timing_free: boolean;
  note?: string;
  check_all?: { median: number; n: number };
  /** ascension -> act -> worth. Empty when the potion has no value (note says why). */
  by_asc: Record<string, Record<string, PotionWorth>>;
}

/** The conversion inputs of one (ascension, act), from its boss fights (docs/potion-equivalents.md §2). */
export interface ConversionRates {
  fights: number;
  turns_n: number;
  /** Median boss fight turns. */
  T: number;
  /** Our damage a turn. */
  D: number;
  /** The boss's unblocked damage a turn. */
  L: number;
  /** HP per point of damage: L / D. */
  r: number;
  hit_share: number;
  L_hit: number;
  I: number;
  /** Attack hits a turn. */
  h: number;
  a: number;
  /** Block cards played a turn. */
  b: number;
  C: number;
  E: number;
  B: number;
  max_hp: number;
  deck: number;
  s: number;
  sd: number;
  v_card: number;
  v_energy: number;
  from_asc: number;
}

export interface PotionEquivalentsFile {
  meta: { generated: string; generator?: string; min_n: number; ascensions: number[]; logs?: { boss_fights?: number; last_fight?: string }; note?: string; constants?: Record<string, number> };
  rates: Record<string, Record<string, ConversionRates>>;
  potions: Record<string, PotionEntry>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isNum = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** The parsed file, checked; throws KnowledgeLoadError naming the first problem. */
export function parsePotionEquivalents(text: string, path: string): PotionEquivalentsFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new KnowledgeLoadError(`药水换算表不是合法 JSON ${path}: ${(error as Error).message}`);
  }
  const fail = (what: string): never => {
    throw new KnowledgeLoadError(`药水换算表 ${path} ${what}`);
  };
  if (!isRecord(parsed)) return fail("顶层不是对象");
  const meta = parsed["meta"];
  if (!isRecord(meta) || typeof meta["generated"] !== "string" || !isNum(meta["min_n"])) fail("缺少 meta.generated / meta.min_n");
  const rates = parsed["rates"];
  if (!isRecord(rates) || Object.keys(rates).length === 0) fail("缺少 rates 或为空");
  for (const [asc, acts] of Object.entries(rates as Record<string, unknown>)) {
    if (!isRecord(acts) || Object.keys(acts).length === 0) fail(`rates.${asc} 为空`);
    for (const [act, row] of Object.entries(acts as Record<string, unknown>)) {
      for (const field of ["fights", "T", "D", "L", "r", "h", "b", "v_card", "v_energy", "from_asc"]) {
        if (!isRecord(row) || !isNum(row[field])) fail(`rates.${asc}.${act} 缺少数字字段 ${field}`);
      }
    }
  }
  const potions = parsed["potions"];
  if (!isRecord(potions) || Object.keys(potions).length === 0) fail("缺少 potions 或为空");
  for (const [id, entry] of Object.entries(potions as Record<string, unknown>)) {
    if (!isRecord(entry) || typeof entry["name"] !== "string" || !(POTION_CATEGORIES as readonly unknown[]).includes(entry["category"]) || !isRecord(entry["by_asc"]) || !isRecord(entry["log"])) {
      fail(`potions.${id} 缺少 name / category / by_asc / log`);
    }
    for (const [asc, acts] of Object.entries((entry as Record<string, unknown>)["by_asc"] as Record<string, unknown>)) {
      for (const [act, worth] of Object.entries(isRecord(acts) ? acts : {})) {
        const ok = isRecord(worth) && ["hp", "damage", "block", "hold_hp", "n"].every((field) => isNum(worth[field])) && (worth["source"] === "公式" || worth["source"] === "估") && typeof worth["formula"] === "string";
        if (!ok) fail(`potions.${id}.by_asc.${asc}.${act} 缺少 hp/damage/block/hold_hp/n/source/formula`);
      }
    }
  }
  return parsed as unknown as PotionEquivalentsFile;
}

const cache = new Map<string, { stamp: string; file: PotionEquivalentsFile }>();

/** The table in `dir` (src/knowledge by default), cached by the file's mtime and size; throws KnowledgeLoadError. */
export function loadPotionEquivalents(dir: string = DEFAULT_KNOWLEDGE_DIR): PotionEquivalentsFile {
  const path = join(resolve(dir), POTION_EQUIVALENTS_FILE);
  let stamp: string;
  try {
    const info = statSync(path);
    stamp = `${info.mtimeMs}:${info.size}`;
  } catch (error) {
    throw new KnowledgeLoadError(`药水换算表读取失败 ${path}: ${(error as Error).message}（用 .cache/logdb-venv/bin/python tools/build-potion-equivalents.py 生成）`);
  }
  const hit = cache.get(path);
  if (hit && hit.stamp === stamp) return hit.file;
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    throw new KnowledgeLoadError(`药水换算表读取失败 ${path}: ${(error as Error).message}`);
  }
  const file = parsePotionEquivalents(text, path);
  cache.set(path, { stamp, file });
  return file;
}

/** The ascension the table has numbers for: this one, else the nearest (the lower on a tie); null when none. */
export function tableAscension(file: PotionEquivalentsFile, ascension: number): number | null {
  const ascs = Object.keys(file.rates)
    .filter((key) => /^\d+$/.test(key))
    .map(Number)
    .sort((a, b) => Math.abs(a - ascension) - Math.abs(b - ascension) || a - b);
  return ascs[0] ?? null;
}

/** An act number the table has (1-3; anything else clamped). */
export function tableAct(act: number | null | undefined): 1 | 2 | 3 {
  return !act || act < 1 ? 1 : act > 3 ? 3 : (Math.floor(act) as 1 | 2 | 3);
}

/** One answer of potionEquivalent. */
export interface PotionEquivalent {
  id: string;
  name: string;
  category: PotionCategory;
  act: 1 | 2 | 3;
  /** The ascension asked for. */
  ascension: number;
  /** The table's ascension the numbers are from (the nearest one when the asked one is not in it). */
  tableAscension: number;
  /** The ascension of the logged inputs (differs when this act borrowed another ascension's boss fights). */
  inputsAscension: number;
  hp: number;
  damage: number;
  block: number;
  holdHp: number;
  source: "公式" | "估";
  n: number;
  formula: string;
  timingFree: boolean;
  check: { median: number; n: number } | null;
  mc: { hp: number; n: number } | null;
}

/** `id`'s worth in `act`'s boss fight at `ascension` from a loaded table; null for an unknown potion or one with no value. */
export function potionEquivalentFrom(file: PotionEquivalentsFile, id: string, act: number | null | undefined, ascension: number): PotionEquivalent | null {
  const entry = file.potions[id];
  const asc = tableAscension(file, ascension);
  if (!entry || asc === null) return null;
  const actKey = tableAct(act);
  const worth = entry.by_asc[String(asc)]?.[String(actKey)];
  if (!worth) return null;
  return {
    id,
    name: entry.name,
    category: entry.category,
    act: actKey,
    ascension,
    tableAscension: asc,
    inputsAscension: worth.inputs_asc ?? asc,
    hp: worth.hp,
    damage: worth.damage,
    block: worth.block,
    holdHp: worth.hold_hp,
    source: worth.source,
    n: worth.n,
    formula: worth.formula,
    timingFree: entry.timing_free,
    check: worth.check ?? null,
    mc: worth.mc ?? null,
  };
}

/**
 * `id`'s worth in `act`'s boss fight at `ascension` (the table in `dir`, src/knowledge by default); null for an
 * unknown potion or one with no value. Throws KnowledgeLoadError when the table does not load.
 */
export function potionEquivalent(id: string, act: number | null | undefined, ascension: number, dir?: string): PotionEquivalent | null {
  return potionEquivalentFrom(loadPotionEquivalents(dir), id, act, ascension);
}

/** The potion's effect text, its numbers filled (potion-values.ts). */
export function potionText(id: string, entry: PotionEntry): string {
  return fillPotionText(id, entry.description);
}

const round1 = (value: number): string => String(Math.round(value * 10) / 10);

/** 「公式 n=49」, 「估 n=22（输入借 A8）」, 「A8 公式 n=170」 when the table's ascension is not the one asked for. */
export function sourceLabel(eq: PotionEquivalent, withAsc = false): string {
  const asc = withAsc || eq.tableAscension !== eq.ascension ? `A${eq.tableAscension} ` : "";
  const borrowed = eq.inputsAscension !== eq.tableAscension ? `（输入借 A${eq.inputsAscension}）` : "";
  return `${asc}${eq.source} n=${eq.n}${borrowed}`;
}

/** 「约等于 9.2 血 / 31 伤害 / 9.2 格挡」 (the held value: a negative HP reads 0). */
export function worthText(eq: PotionEquivalent): string {
  const hp = eq.holdHp;
  const scale = eq.hp !== 0 ? hp / eq.hp : 0;
  return `约等于 ${round1(hp)} 血 / ${round1(eq.damage * scale)} 伤害 / ${round1(eq.block * scale)} 格挡`;
}

/** Test hook: the directory Jev's combat question reads the table from (src/knowledge when unset). */
export const potionWorthSource: { dir: string | undefined } = { dir: undefined };

/** The key of Jev's combat question (potion_context) that carries the held potions' worth. */
export const POTION_WORTH_KEY = "potion_worth_in_act_boss";

/**
 * The held potions' worth for Jev's combat question: 「火焰药水：约等于 4.7 血 / 20 伤害 / 4.7 格挡（本幕 boss，A8 公式
 * n=170）」 per potion with a value (Dai 2026-09-30: facts beside each potion, no rule, no change to the options).
 * A table that does not load is said, not hidden: {potion_worth_error}.
 */
export function heldPotionWorth(potionIds: string[], act: number | null, ascension: number): Record<string, string | string[]> {
  if (potionIds.length === 0) return {};
  let file: PotionEquivalentsFile;
  try {
    file = loadPotionEquivalents(potionWorthSource.dir);
  } catch (error) {
    return { potion_worth_error: (error instanceof Error ? error.message : String(error)).slice(0, 160) };
  }
  const lines = potionIds
    .map((id) => potionEquivalentFrom(file, id, act, ascension))
    .filter((eq): eq is PotionEquivalent => eq !== null)
    .map((eq) => `${eq.name}：${worthText(eq)}（本幕 boss，${sourceLabel(eq, true)}${eq.timingFree ? "，什么时候喝都一样" : ""}）`);
  return lines.length > 0 ? { [POTION_WORTH_KEY]: lines } : {};
}

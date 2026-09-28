/**
 * The monster database (tools/build-monster-db.py -> monster-db.json): measured facts about every enemy,
 * encounter and act boss from the logged fights, per ascension, with n on every number. DeepSeek sees it
 * as static facts: the act boss on every question, the act's elites and dangerous hallway fights on route
 * and run plans, and the enemy an event names. Measured values are shown in preference to hand-written
 * numbers (the hand notes stay as strategy text). An ascension with no logged fights says so and shows the
 * nearest logged ascension, labelled as such.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface Stat {
  median?: number;
  p75?: number;
  n?: number;
}

interface Range {
  min?: number;
  median?: number;
  max?: number;
  n?: number;
  count_per_fight?: number;
}

interface MoveEntry {
  name?: string;
  n_seen?: number;
  intents?: Record<string, number>;
  turns_seen?: Record<string, number>;
  next?: Record<string, number>;
  damage_by_asc?: Record<string, { base_per_hit?: Record<string, number>; hits?: Record<string, number>; shown?: Record<string, number> }>;
  self_powers_gained?: Record<string, Record<string, number>>;
  status_cards?: Record<string, number>;
}

interface MonsterEntry {
  name?: { zh?: string };
  kind?: string;
  moves?: Record<string, MoveEntry>;
  powers?: Record<string, { name?: string; type?: string; n_fights?: number; amount_at_first_sight?: Record<string, number> }>;
  hp_by_asc?: Record<string, Range>;
}

interface Threat {
  fights?: number;
  n_outcome_known?: number;
  win_rate?: number;
  hp_loss_won?: Stat;
  turns_won?: Stat;
  deaths?: number;
  death_runs?: string[];
  start_hp_total?: Range;
  hp_loss_per_turn?: Stat;
  parts?: Record<string, Range>;
  phases?: Record<string, number>;
}

interface EncounterEntry {
  rooms?: Record<string, number>;
  acts?: Record<string, number>;
  by_asc?: Record<string, Threat>;
}

interface MonsterDb {
  bosses: Record<string, Record<string, Threat>>;
  encounters: Record<string, EncounterEntry>;
  monsters: Record<string, MonsterEntry>;
}

let cached: MonsterDb | null = null;

function load(): MonsterDb {
  if (cached) return cached;
  try {
    const path = join(dirname(fileURLToPath(import.meta.url)), "monster-db.json");
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<MonsterDb>;
    cached = { bosses: parsed.bosses ?? {}, encounters: parsed.encounters ?? {}, monsters: parsed.monsters ?? {} };
  } catch {
    cached = { bosses: {}, encounters: {}, monsters: {} };
  }
  return cached;
}

/** For tests: use this DB instead of the file (null reloads the file). */
export function setMonsterDbForTests(db: MonsterDb | null): void {
  cached = db;
}

/** The logged ascension to show for `asc`: itself when logged, else the nearest (the higher on a tie). */
export function nearestAscension(byAsc: Record<string, unknown> | undefined, asc: number): { key: string; exact: boolean } | null {
  if (!byAsc) return null;
  const keys = Object.keys(byAsc).filter((key) => /^\d+$/.test(key));
  if (keys.length === 0) return null;
  if (keys.includes(String(asc))) return { key: String(asc), exact: true };
  const best = keys.sort((a, b) => Math.abs(Number(a) - asc) - Math.abs(Number(b) - asc) || Number(b) - Number(a))[0]!;
  return { key: best, exact: false };
}

function ascLabel(found: { key: string; exact: boolean }, asc: number): string {
  return found.exact ? `A${asc}` : `A${asc} 无记录 (n=0)，以下为最近的 A${found.key}`;
}

export function monsterName(id: string): string {
  return load().monsters[id]?.name?.zh || id;
}

function mode(counts: Record<string, number> | undefined): string | null {
  if (!counts) return null;
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0]![0];
}

function round(value: number | undefined): string {
  return value === undefined ? "?" : String(Math.round(value * 10) / 10);
}

function stat(value: Stat | undefined): string {
  return value && (value.n ?? 0) > 0 ? `${round(value.median)}/${round(value.p75)} (n=${value.n})` : "无 (n=0)";
}

function pct(value: number | undefined): string {
  return value === undefined ? "?" : `${Math.round(value * 100)}%`;
}

/** One move as shown: name, damage at this ascension (per hit × hits), Strength it gains, status cards. */
function moveText(move: MoveEntry, id: string, asc: number): string {
  const parts: string[] = [move.name || id];
  const found = nearestAscension(move.damage_by_asc, asc);
  const damage = found ? move.damage_by_asc![found.key] : undefined;
  const base = mode(damage?.base_per_hit);
  const hits = Number(mode(damage?.hits) ?? 1);
  if (base !== null) parts.push(hits > 1 ? `${base}×${hits}` : base);
  else if (move.intents) parts.push(`(${Object.keys(move.intents).join("/")})`);
  const strength = mode(move.self_powers_gained?.["STRENGTH_POWER"]);
  if (strength) parts.push(`+${strength}力`);
  const status = mode(move.status_cards);
  if (status) parts.push(`塞${status}张状态牌`);
  return parts.join(" ");
}

/** The enemy's move cycle from its turn-1 move, following the most frequent successor. */
export function moveCycle(id: string, asc: number, maxMoves = 6): string {
  const monster = load().monsters[id];
  const moves = monster?.moves;
  if (!moves || Object.keys(moves).length === 0) return "";
  const byFirst = Object.entries(moves).sort((a, b) => (b[1].turns_seen?.["1"] ?? 0) - (a[1].turns_seen?.["1"] ?? 0) || (b[1].n_seen ?? 0) - (a[1].n_seen ?? 0));
  const order: string[] = [];
  let current: string | null = byFirst[0]![0];
  while (current && !order.includes(current) && order.length < maxMoves) {
    order.push(current);
    const next = mode(moves[current]?.next);
    current = next && moves[next] ? next : null;
  }
  const loops = current !== null && order.includes(current) ? ` →循环回 ${moves[current]?.name || current}` : "";
  const others = Object.entries(moves)
    .filter(([moveId, move]) => !order.includes(moveId) && (move.n_seen ?? 0) >= 3)
    .map(([moveId, move]) => moveText(move, moveId, asc));
  return `${order.map((moveId) => moveText(moves[moveId]!, moveId, asc)).join(" → ")}${loops}${others.length > 0 ? `；其他: ${others.join(", ")}` : ""}`;
}

function powersText(id: string, fights: number): string {
  const powers = load().monsters[id]?.powers ?? {};
  const common = Object.values(powers)
    // Its own buffs only: Vulnerable, Weak and the like on it are what we applied.
    .filter((power) => power.type !== "Debuff" && (power.n_fights ?? 0) >= Math.max(2, fights * 0.3))
    .map((power) => {
      const amount = mode(power.amount_at_first_sight);
      return `${power.name ?? "?"}${amount && amount !== "1" ? ` ${amount}` : ""}`;
    });
  return common.join(", ");
}

/** The act boss's DB entry: HP (parts/phases), move cycles, powers, and our record against it. */
export function bossDossier(bossId: string | null | undefined, asc: number): string | null {
  if (!bossId) return null;
  const id = bossId.toUpperCase().replace(/_BOSS$/, "");
  const byAsc = load().bosses[id];
  const found = nearestAscension(byAsc, asc);
  if (!byAsc || !found) return null;
  const entry = byAsc[found.key]!;
  const parts = Object.entries(entry.parts ?? {});
  const hp = parts.map(([part, range]) => `${monsterName(part)} ${round(range.median)}${(range.count_per_fight ?? 1) > 1 ? `×${round(range.count_per_fight)}` : ""} (n=${range.n ?? 0})`).join(" + ");
  const phases = Object.entries(entry.phases ?? {}).map(([sequence, n]) => `${sequence} (n=${n})`);
  const lines = [
    `boss 数据库 ${monsterName(parts[0]?.[0] ?? id)} (${id}) ${ascLabel(found, asc)}: HP ${hp || "?"}${phases.length > 0 ? ` | 阶段 HP: ${phases.join("; ")}` : ""}`,
    `我方战绩: ${entry.fights ?? 0} 场，胜率 ${pct(entry.win_rate)} (n=${entry.n_outcome_known ?? 0})，阵亡 ${entry.death_runs?.length ?? 0}；赢局失血 中位/p75 ${stat(entry.hp_loss_won)}；赢局回合 ${stat(entry.turns_won)}；每回合失血 ${stat(entry.hp_loss_per_turn)}`,
  ];
  for (const [part] of parts) {
    const cycle = moveCycle(part, asc);
    const powers = powersText(part, entry.fights ?? 0);
    if (cycle || powers) lines.push(`${monsterName(part)} 招式: ${cycle || "?"}${powers ? ` | 能力: ${powers}` : ""}`);
  }
  return lines.join("\n");
}

function encounterNames(key: string): string {
  const counts = new Map<string, number>();
  for (const id of key.split("+")) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].map(([id, n]) => `${monsterName(id)}${n > 1 ? `×${n}` : ""}`).join("+");
}

/** One encounter as a line: enemies, HP, our record at this ascension, and each enemy's moves. */
export function encounterLine(key: string, asc: number, maxMoves = 4): string | null {
  const encounter = load().encounters[key];
  const found = nearestAscension(encounter?.by_asc, asc);
  if (!encounter || !found) return null;
  const entry = encounter.by_asc![found.key]!;
  const room = mode(encounter.rooms) ?? "?";
  const moves = [...new Set(key.split("+"))].map((id) => `${monsterName(id)}: ${moveCycle(id, asc, maxMoves) || "?"}`).join("；");
  return `${encounterNames(key)} [${room === "elite" ? "精英" : room === "hallway" ? "小怪" : room}] ${ascLabel(found, asc)}: HP ${round(entry.start_hp_total?.median)} (n=${entry.start_hp_total?.n ?? 0}) | ${entry.fights ?? 0} 场 胜率 ${pct(entry.win_rate)} 阵亡 ${entry.deaths ?? 0} | 赢局失血 中位/p75 ${stat(entry.hp_loss_won)} | 招式 ${moves}`;
}

/** Deaths at every ascension, and the p75 HP loss in wins at `asc` (nearest logged). */
function danger(encounter: EncounterEntry, asc: number): { deaths: number; p75: number } {
  const deaths = Object.values(encounter.by_asc ?? {}).reduce((sum, entry) => sum + (entry.deaths ?? 0), 0);
  const found = nearestAscension(encounter.by_asc, asc);
  const p75 = found ? (encounter.by_asc![found.key]!.hp_loss_won?.p75 ?? 0) : 0;
  return { deaths, p75 };
}

/** Hallway fights shown as dangerous: any death logged, or a p75 HP loss in wins at least this high. */
export const DANGEROUS_HALLWAY_P75 = 20;
export const MAX_HALLWAY_THREATS = 8;

/**
 * The act's elites (all logged) and its dangerous hallway encounters at this ascension, one line each,
 * for route and run plans: which elites to take and which fights to avoid are real numbers.
 */
export function actThreats(act: number, asc: number): string[] {
  return actThreatKeys(act, asc)
    .map((key) => encounterLine(key, asc))
    .filter((line): line is string => line !== null);
}

/** The monster ids in the act's elites and dangerous hallway encounters (the experience slice's threats). */
export function actThreatIds(act: number, asc: number): string[] {
  return [...new Set(actThreatKeys(act, asc).flatMap((key) => key.split("+")))];
}

function actThreatKeys(act: number, asc: number): string[] {
  const encounters = Object.entries(load().encounters).filter(([, encounter]) => (encounter.acts?.[String(act)] ?? 0) > 0);
  const elites = encounters.filter(([, encounter]) => mode(encounter.rooms) === "elite");
  const hallways = encounters
    .filter(([, encounter]) => mode(encounter.rooms) === "hallway")
    .map(([key, encounter]) => ({ key, ...danger(encounter, asc) }))
    .filter((entry) => entry.deaths > 0 || entry.p75 >= DANGEROUS_HALLWAY_P75)
    .sort((a, b) => b.deaths - a.deaths || b.p75 - a.p75)
    .slice(0, MAX_HALLWAY_THREATS);
  return [...elites.map(([key]) => key), ...hallways.map((entry) => entry.key)];
}

/** Monster ids whose Chinese name appears in the text (an event that starts a fight names its enemy). */
export function monstersNamedIn(text: string): string[] {
  if (!text) return [];
  return Object.entries(load().monsters)
    .filter(([, monster]) => {
      const name = monster.name?.zh ?? "";
      return name.length >= 2 && text.includes(name);
    })
    .map(([id]) => id);
}

/** An enemy's DB entry in one line: HP at this ascension, moves, our record in its encounters. */
export function monsterLine(id: string, asc: number): string | null {
  const monster = load().monsters[id];
  if (!monster) return null;
  const found = nearestAscension(monster.hp_by_asc, asc);
  const hp = found ? monster.hp_by_asc![found.key]! : undefined;
  const cycle = moveCycle(id, asc);
  return `${monsterName(id)} (${id}) ${found ? ascLabel(found, asc) : ""}: HP ${round(hp?.median)} (n=${hp?.n ?? 0}) | 招式 ${cycle || "?"}`;
}

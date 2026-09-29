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

export interface MoveEntry {
  name?: string;
  n_seen?: number;
  intents?: Record<string, number>;
  turns_seen?: Record<string, number>;
  next?: Record<string, number>;
  damage_by_asc?: Record<string, { base_per_hit?: Record<string, number>; hits?: Record<string, number>; shown?: Record<string, number> }>;
  self_powers_gained?: Record<string, Record<string, number>>;
  /** The same deltas by ascension: asc -> power id -> {delta: n}. */
  self_powers_gained_by_asc?: Record<string, Record<string, Record<string, number>>>;
  /** Debuffs the move put on us (and Strength/Dexterity it drained): power id -> {delta: n}. */
  player_powers_applied?: Record<string, Record<string, number>>;
  player_powers_applied_by_asc?: Record<string, Record<string, Record<string, number>>>;
  /** Surrounded (Kaiser Crab): the logged turns the move came from behind us (x1.5) and from in front. */
  back_attack_by_asc?: Record<string, { behind?: number; facing?: number }>;
  status_cards?: Record<string, number>;
}

interface MonsterEntry {
  name?: { zh?: string };
  kind?: string;
  moves?: Record<string, MoveEntry>;
  powers?: Record<
    string,
    {
      name?: string;
      type?: string;
      n_fights?: number;
      amount_at_first_sight?: Record<string, number>;
      /** asc -> {amount: n}: each instance's first logged amount, and the turn it was on. */
      amount_at_first_sight_by_asc?: Record<string, Record<string, number>>;
      turn_at_first_sight_by_asc?: Record<string, Record<string, number>>;
    }
  >;
  hp_by_asc?: Record<string, Range>;
}

interface Threat {
  fights?: number;
  n_outcome_known?: number;
  win_rate?: number;
  hp_loss_won?: Stat;
  /** Entry HP minus HP after the fight (after Burning Blood and other end-of-combat heals). */
  net_hp_loss_won?: Stat;
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

/** The monsters part of the DB (moves by id), as the rollout reads it too. */
export type MonsterMoveData = Record<string, { moves?: Record<string, MoveEntry> }>;

/** A move's base damage per hit and hits at an ascension. */
export interface MoveDamage {
  perHit: number;
  hits: number;
  /** Not logged at this ascension: the nearest logged one's damage times `ratio`, rounded. */
  estimated: boolean;
  /** The logged ascension the numbers come from. */
  from: number;
  /** The damage ratio applied (to / from); 1 when logged at this ascension or when nothing measures it. */
  ratio: number;
  /** Moves the ratio was measured on, and whether they are this monster's own (else every monster's). */
  ratioN?: number;
  ratioOwn?: boolean;
  /**
   * Surrounded (the Kaiser Crab's claws): the move's base at this ascension and the share of the logged
   * turns it came from behind us (x1.5); perHit is then the hit as it lands on average.
   */
  base?: number;
  backAttackShare?: number;
}

/**
 * Surrounded (the Kaiser Crab's claws, BACK_ATTACK_LEFT/RIGHT_POWER): the share of the logged turns this
 * move came from behind us, for x1.5 (monster DB back_attack_by_asc, pooled over ascensions: which claw we
 * face is our play, not the monster's). null for a move never logged under Surrounded.
 */
export function backAttackShare(move: MoveEntry | undefined): number | null {
  let behind = 0;
  let facing = 0;
  for (const counts of Object.values(move?.back_attack_by_asc ?? {})) {
    behind += counts.behind ?? 0;
    facing += counts.facing ?? 0;
  }
  return behind + facing > 0 ? behind / (behind + facing) : null;
}

function basePerHit(move: MoveEntry | undefined, asc: string): number | null {
  const base = mode(move?.damage_by_asc?.[asc]?.base_per_hit);
  return base === null ? null : Number(base);
}

/**
 * How much harder the moves hit at `to` than at `from`: summed base damage per hit at `to` over at
 * `from`, over the moves logged at both: the monster's own when it has any, else every monster's (A8 -> A9:
 * 110 of 122 moves hit harder, e.g. Crusher's Guarded Strike 12 -> 14 before the back attack). null when no move is logged at both.
 */
export function ascensionDamageRatio(monsters: MonsterMoveData, monsterId: string, from: number, to: number): { ratio: number; n: number; own: boolean } | null {
  const pairs = (ids: string[]) =>
    ids.flatMap((id) =>
      Object.values(monsters[id]?.moves ?? {})
        .map((move) => [basePerHit(move, String(from)), basePerHit(move, String(to))] as const)
        .filter((pair): pair is readonly [number, number] => pair[0] !== null && pair[1] !== null && pair[0] > 0),
    );
  const own = pairs([monsterId]);
  const used = own.length > 0 ? own : pairs(Object.keys(monsters));
  if (used.length === 0) return null;
  const ratio = used.reduce((sum, pair) => sum + pair[1], 0) / used.reduce((sum, pair) => sum + pair[0], 0);
  return { ratio, n: used.length, own: own.length > 0 };
}

/**
 * A move's damage at `asc`: as logged there, else the nearest logged ascension's scaled by the measured
 * ratio (ascensionDamageRatio), rounded and marked estimated. null when the move has no logged damage.
 * A Surrounded back-attack move (Kaiser Crab) is its base times 1 + 0.5 x the share of the logged turns it
 * came from behind (backAttackShare): the rollout's later turns and the boss clock do not track which claw
 * we face (A8 Laser: base 31, 49 from behind on 83% of turns; the DB used to call 47 its base).
 */
export function moveDamageAt(monsters: MonsterMoveData, monsterId: string, moveId: string, asc: number): MoveDamage | null {
  const move = monsters[monsterId]?.moves?.[moveId];
  const withBase = Object.fromEntries(Object.entries(move?.damage_by_asc ?? {}).filter(([, entry]) => mode(entry.base_per_hit) !== null));
  const found = nearestAscension(withBase, asc);
  if (!move || !found) return null;
  const logged = basePerHit(move, found.key)!;
  const hits = Number(mode(move.damage_by_asc![found.key]!.hits) ?? 1);
  const from = Number(found.key);
  const share = backAttackShare(move);
  const behind = (base: number) => (share === null ? {} : { base, backAttackShare: share });
  const average = (base: number) => (share === null ? base : Math.round(base * (1 + 0.5 * share)));
  if (found.exact) return { perHit: average(logged), hits, estimated: false, from, ratio: 1, ...behind(logged) };
  const measured = ascensionDamageRatio(monsters, monsterId, from, asc);
  const ratio = measured?.ratio ?? 1;
  const base = Math.round(logged * ratio);
  return { perHit: average(base), hits, estimated: true, from, ratio, ...(measured ? { ratioN: measured.n, ratioOwn: measured.own } : {}), ...behind(base) };
}

/**
 * A move's shown damage per hit (Strength and our Vulnerable in) at `asc`, for a move whose base was never
 * measured (every logged turn had a debuff in the way: the Queen's Off With Your Head, the Amalgam's
 * Beam): the nearest logged ascension's most common shown hit, scaled like moveDamageAt when not this one.
 */
function shownDamageAt(monsters: MonsterMoveData, monsterId: string, moveId: string, asc: number): MoveDamage | null {
  const move = monsters[monsterId]?.moves?.[moveId];
  const withShown = Object.fromEntries(Object.entries(move?.damage_by_asc ?? {}).filter(([, entry]) => mode(entry.shown) !== null));
  const found = nearestAscension(withShown, asc);
  if (!move || !found) return null;
  const shown = /^(\d+)x(\d+)$/.exec(mode(move.damage_by_asc![found.key]!.shown) ?? "");
  if (!shown) return null;
  const from = Number(found.key);
  const ratio = found.exact ? 1 : (ascensionDamageRatio(monsters, monsterId, from, asc)?.ratio ?? 1);
  return { perHit: Math.round(Number(shown[1]) * ratio), hits: Number(shown[2]), estimated: !found.exact, from, ratio };
}

/**
 * A monster's expected attack damage on each of its first `turns` turns at `asc`: its turn-1 move as
 * logged (turns_seen), then its logged successors (next; a move with none, the Waterfall Giant's death
 * Explode, is not a turn of the fight), each move's damage per hit at this ascension (moveDamageAt:
 * scaled from the nearest ascension when unseen here; the shown hit when no base was ever measured) plus
 * the Strength its earlier moves gained (self_powers_gained), times its hits. `estimated`: some move's
 * damage was scaled. null without logged moves.
 */
export function monsterDamageByTurn(monsterId: string, asc: number, turns: number, monsters: MonsterMoveData = load().monsters): { perTurn: number[]; estimated: boolean } | null {
  const moves = monsters[monsterId]?.moves;
  if (!moves || turns <= 0) return null;
  const firsts = Object.entries(moves).map(([id, move]) => [id, move.turns_seen?.["1"] ?? 0] as const).filter(([, n]) => n > 0);
  const total = firsts.reduce((sum, [, n]) => sum + n, 0);
  if (total <= 0) return null;
  let dist = new Map(firsts.map(([id, n]) => [id, n / total]));
  const ongoing = (id: string) => Object.keys(moves[id]?.next ?? {}).length > 0;
  const damage = new Map<string, (MoveDamage & { shown?: boolean }) | null>(
    Object.keys(moves).map((id) => {
      const base = moveDamageAt(monsters, monsterId, id, asc);
      const shown = base ? null : shownDamageAt(monsters, monsterId, id, asc);
      return [id, base ?? (shown ? { ...shown, shown: true } : null)];
    }),
  );
  const strengthOf = (id: string) => Number(mode(moves[id]?.self_powers_gained?.["STRENGTH_POWER"]) ?? 0);
  let strength = 0;
  let estimated = false;
  const perTurn: number[] = [];
  for (let t = 1; t <= turns; t += 1) {
    if (t > 1) {
      const next = new Map<string, number>();
      for (const [id, p] of dist) {
        const successors = Object.entries(moves[id]?.next ?? {}).filter(([to]) => ongoing(to));
        const sum = successors.reduce((acc, [, n]) => acc + n, 0);
        if (sum <= 0) next.set(id, (next.get(id) ?? 0) + p);
        else for (const [to, n] of successors) next.set(to, (next.get(to) ?? 0) + (p * n) / sum);
      }
      dist = next;
    }
    let expected = 0;
    for (const [id, p] of dist) {
      const hit = damage.get(id);
      if (!hit) continue;
      if (hit.estimated) estimated = true;
      expected += p * (hit.perHit + (hit.shown ? 0 : strength)) * hit.hits;
    }
    perTurn.push(expected);
    for (const [id, p] of dist) strength += p * strengthOf(id);
  }
  return { perTurn, estimated };
}

/**
 * An act boss's expected attack damage on each of its first `turns` turns at `asc`: its bodies' (monster
 * DB boss parts at this ascension, else the nearest logged one; each body times its count per fight)
 * monsterDamageByTurn summed. null when the DB has no parts or moves for it.
 */
export function bossDamageByTurn(bossId: string, asc: number, turns: number): { perTurn: number[]; estimated: boolean; parts: string[] } | null {
  const id = bossId.toUpperCase().replace(/_BOSS$/, "");
  const byAsc = load().bosses[id];
  const found = nearestAscension(byAsc, asc);
  if (!byAsc || !found) return null;
  const parts = Object.entries(byAsc[found.key]!.parts ?? {});
  const perTurn = Array.from({ length: turns }, () => 0);
  let estimated = false;
  const used: string[] = [];
  for (const [part, range] of parts) {
    const own = monsterDamageByTurn(part, asc, turns);
    if (!own) continue;
    used.push(part);
    if (own.estimated) estimated = true;
    const count = range.count_per_fight ?? 1;
    own.perTurn.forEach((value, t) => (perTurn[t]! += value * count));
  }
  return used.length > 0 ? { perTurn, estimated, parts: used } : null;
}

/**
 * An act boss's HP at `asc` from the DB (its parts' median max HP at this ascension, else the nearest
 * logged one; each part times its count per fight), only the parts named when `only` is given, and its
 * phases' max HP when it has several (Test Subject "111 > 212 > 313"). null when the DB has no parts.
 */
export function bossHpAt(bossId: string, asc: number, only?: string[]): { hp: number; phases: number[]; asc: number; exact: boolean; n: number } | null {
  const id = bossId.toUpperCase().replace(/_BOSS$/, "");
  const byAsc = load().bosses[id];
  const found = nearestAscension(byAsc, asc);
  if (!byAsc || !found) return null;
  const entry = byAsc[found.key]!;
  const parts = Object.entries(entry.parts ?? {}).filter(([part]) => !only || only.includes(part));
  if (parts.length === 0) return null;
  const hp = parts.reduce((sum, [, range]) => sum + (range.median ?? 0) * (range.count_per_fight ?? 1), 0);
  const phases = Object.keys(entry.phases ?? {})
    .map((sequence) => sequence.replace(/\s*\(.*\)\s*$/, "").split(">").map((value) => Number(value.trim())).filter((value) => Number.isFinite(value) && value > 0))
    .sort((a, b) => b.length - a.length)[0] ?? [];
  const n = Math.min(...parts.map(([, range]) => range.n ?? 0));
  return { hp: Math.round(hp), phases, asc: Number(found.key), exact: found.exact, n };
}

/** One move as shown: name, damage at this ascension (per hit × hits), Strength it gains, status cards. */
function moveText(move: MoveEntry, id: string, asc: number, monsterId: string): string {
  const parts: string[] = [move.name || id];
  const damage = moveDamageAt(load().monsters, monsterId, id, asc);
  if (damage) {
    const shown = damage.base ?? damage.perHit;
    const behind = damage.backAttackShare !== undefined ? ` (在背后 ×1.5 = ${Math.floor(shown * 1.5)}，记录中 ${pct(damage.backAttackShare)} 的回合在背后)` : "";
    const text = `${damage.hits > 1 ? `${shown}×${damage.hits}` : String(shown)}${behind}`;
    // Unseen at this ascension: the nearest one's number scaled by the measured ratio, said so.
    parts.push(damage.estimated ? `${text} (A${asc}估: A${damage.from}×${damage.ratio.toFixed(2)})` : text);
  } else if (move.intents) parts.push(`(${Object.keys(move.intents).join("/")})`);
  const strength = mode(move.self_powers_gained?.["STRENGTH_POWER"]);
  if (strength) parts.push(`+${strength}力`);
  const status = mode(move.status_cards);
  if (status) parts.push(`塞${status}张状态牌`);
  return parts.join(" ");
}

/** A power a monster stacks on itself turn after turn, at an ascension (powerScheduleAt). */
export interface PowerSchedule {
  /** The amount it is first seen with, on turn `firstTurn`. */
  first: number;
  firstTurn: number;
  /** What each later move adds. */
  perTurn: number;
  /** The logged ascension the numbers come from, whether it is the one asked for, and the fights behind `first`. */
  asc: number;
  exact: boolean;
  n: number;
}

/**
 * A power a monster stacks on itself every turn (the Waterfall Giant's Steam Eruption: first seen on T2
 * at 15 up to A8 and 20 at A9, +3 with every move after) at `asc`: the amount it is first seen with and
 * the turn that is on (amount/turn_at_first_sight_by_asc), and the most common gain its later moves put
 * on it (self_powers_gained_by_asc; the move that first gives it, seen only before that turn, left out).
 * This ascension's logs, else the nearest logged one's. null when the DB has no per-ascension numbers.
 */
export function powerScheduleAt(monsterId: string, powerId: string, asc: number, monsters: Record<string, MonsterEntry> = load().monsters): PowerSchedule | null {
  const monster = monsters[monsterId];
  const power = monster?.powers?.[powerId];
  const found = nearestAscension(power?.amount_at_first_sight_by_asc, asc);
  if (!power || !found) return null;
  const firstCounts = power.amount_at_first_sight_by_asc![found.key]!;
  const first = Number(mode(firstCounts));
  const firstTurn = Number(mode(power.turn_at_first_sight_by_asc?.[found.key]) ?? NaN);
  if (!Number.isFinite(first) || !Number.isFinite(firstTurn)) return null;
  const gains: Record<string, number> = {};
  for (const move of Object.values(monster.moves ?? {})) {
    const seen = Object.keys(move.turns_seen ?? {}).filter((key) => /^\d+$/.test(key)).map(Number);
    if (seen.length > 0 && seen.every((turn) => turn < firstTurn)) continue;
    const byAsc = move.self_powers_gained_by_asc;
    const at = nearestAscension(Object.fromEntries(Object.entries(byAsc ?? {}).filter(([, powers]) => powers[powerId])), Number(found.key));
    for (const [delta, n] of Object.entries(at ? byAsc![at.key]![powerId]! : {})) gains[delta] = (gains[delta] ?? 0) + n;
  }
  const perTurn = Number(mode(gains) ?? NaN);
  if (!Number.isFinite(perTurn)) return null;
  const n = Object.values(firstCounts).reduce((sum, count) => sum + count, 0);
  return { first, firstTurn, perTurn, asc: Number(found.key), exact: found.exact, n };
}

/**
 * Every base damage per hit logged for a move at `asc` (the nearest logged ascension when not this one),
 * ascending: a move that grows each use (the Waterfall Giant's Pressure Gun, A8 20/25/30, A9 23/28/33).
 */
export function moveBaseDamages(monsterId: string, moveId: string, asc: number): number[] {
  const byAsc = load().monsters[monsterId]?.moves?.[moveId]?.damage_by_asc;
  const withBase = Object.fromEntries(Object.entries(byAsc ?? {}).filter(([, entry]) => Object.keys(entry.base_per_hit ?? {}).length > 0));
  const found = nearestAscension(withBase, asc);
  if (!found) return [];
  return Object.keys(withBase[found.key]!.base_per_hit!).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
}

/** The fight turns a move was seen on (monster DB `turns_seen`), ascending; empty when unknown. */
export function moveTurns(id: string, moveId: string): number[] {
  const seen = load().monsters[id]?.moves?.[moveId]?.turns_seen ?? {};
  return Object.keys(seen)
    .filter((key) => /^\d+$/.test(key))
    .map(Number)
    .sort((a, b) => a - b);
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
    .map(([moveId, move]) => moveText(move, moveId, asc, id));
  return `${order.map((moveId) => moveText(moves[moveId]!, moveId, asc, id)).join(" → ")}${loops}${others.length > 0 ? `；其他: ${others.join(", ")}` : ""}`;
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

/** A room's measured HP cost: median and p75 of HP lost (after end-of-fight heals) in won fights. */
export interface RoomCost {
  median: number;
  p75: number;
  /** Won fights behind the numbers. */
  n: number;
  /** Encounters pooled. */
  encounters: number;
  /** The ascension the numbers come from (the nearest logged one when `asc` has too few fights). */
  asc: number;
}

/** Fewest won fights for a pooled room cost; below it the nearest logged ascension is tried. */
export const ROOM_COST_MIN_N = 5;

function weightedMedian(pairs: [number, number][]): number {
  const sorted = [...pairs].sort((a, b) => a[0] - b[0]);
  const total = sorted.reduce((sum, [, weight]) => sum + weight, 0);
  let seen = 0;
  for (const [value, weight] of sorted) {
    seen += weight;
    if (seen >= total / 2) return value;
  }
  return sorted.at(-1)?.[0] ?? 0;
}

/**
 * HP a hallway ("Monster") or elite room of this act costs, pooled over the act's encounters of that
 * room type at this ascension: the n-weighted median of each encounter's median (and of its p75) of
 * net HP lost in won fights (so after Burning Blood). Wins only: deaths are not in it. Null when no
 * ascension has ROOM_COST_MIN_N won fights for this act and room type.
 */
export function roomHpCost(act: number, asc: number, room: "Monster" | "Elite"): RoomCost | null {
  const kind = room === "Elite" ? "elite" : "hallway";
  const encounters = Object.values(load().encounters).filter((encounter) => (encounter.acts?.[String(act)] ?? 0) > 0 && mode(encounter.rooms) === kind);
  const ascs = [...new Set(encounters.flatMap((encounter) => Object.keys(encounter.by_asc ?? {})).filter((key) => /^\d+$/.test(key)).map(Number))].sort(
    (a, b) => Math.abs(a - asc) - Math.abs(b - asc) || b - a,
  );
  for (const at of ascs) {
    const medians: [number, number][] = [];
    const p75s: [number, number][] = [];
    for (const encounter of encounters) {
      const loss = encounter.by_asc?.[String(at)]?.net_hp_loss_won;
      const n = loss?.n ?? 0;
      if (n <= 0 || typeof loss?.median !== "number") continue;
      medians.push([loss.median, n]);
      p75s.push([typeof loss.p75 === "number" ? loss.p75 : loss.median, n]);
    }
    const n = medians.reduce((sum, [, weight]) => sum + weight, 0);
    if (n < ROOM_COST_MIN_N) continue;
    return { median: Math.max(0, weightedMedian(medians)), p75: Math.max(0, weightedMedian(p75s)), n, encounters: medians.length, asc: at };
  }
  return null;
}

/** The act boss's HP lost in our won fights (median/p75, n) and win rate, at `asc` (nearest logged). */
export function bossHpLoss(
  bossId: string | null | undefined,
  asc: number,
): { median: number; p75: number; n: number; fights: number; winRate: number | null; asc: number; perTurn: { median: number; n: number } | null } | null {
  if (!bossId) return null;
  const byAsc = load().bosses[bossId.toUpperCase().replace(/_BOSS$/, "")];
  const found = nearestAscension(byAsc, asc);
  if (!byAsc || !found) return null;
  const entry = byAsc[found.key]!;
  const loss = entry.hp_loss_won;
  if (!loss || !loss.n || typeof loss.median !== "number") return null;
  const turn = entry.hp_loss_per_turn;
  return {
    median: loss.median,
    p75: typeof loss.p75 === "number" ? loss.p75 : loss.median,
    n: loss.n,
    fights: entry.fights ?? 0,
    winRate: entry.win_rate ?? null,
    asc: Number(found.key),
    perTurn: turn && turn.n && typeof turn.median === "number" ? { median: turn.median, n: turn.n } : null,
  };
}

/**
 * Enemy ids a boss fight shows on the board, by boss id (experience scopes use the boss id: boss:KAISER_CRAB
 * while the board shows CRUSHER and ROCKET). The logged parts in the monster DB, plus these known ones so a
 * DB without the boss still maps it.
 */
const KNOWN_BOSS_PARTS: Record<string, string[]> = {
  KAISER_CRAB: ["CRUSHER", "ROCKET"],
  THE_KIN: ["KIN_PRIEST", "KIN_FOLLOWER"],
  QUEEN: ["QUEEN", "TORCH_HEAD_AMALGAM"],
};

export function bossPartIds(bossId: string): string[] {
  const id = bossId.toUpperCase().replace(/_BOSS$/, "");
  const logged = Object.values(load().bosses[id] ?? {}).flatMap((threat) => Object.keys(threat.parts ?? {}));
  return [...new Set([id, ...(KNOWN_BOSS_PARTS[id] ?? []), ...logged])];
}

/** An enemy on the board belongs to this boss's fight (the boss itself, a `_BOSS` variant or one of its parts). */
export function bossOnBoard(bossId: string, enemies: readonly string[] | undefined): boolean {
  if (!enemies || enemies.length === 0) return false;
  const parts = bossPartIds(bossId);
  return enemies.some((enemy) => {
    const bare = enemy.toUpperCase().replace(/_BOSS$/, "");
    return parts.some((part) => bare === part || bare.startsWith(`${part}_`));
  });
}

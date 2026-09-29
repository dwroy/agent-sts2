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

export interface Stat {
  median?: number;
  p75?: number;
  n?: number;
}

export interface Range {
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
  /** The status cards a StatusCard move put in our piles over its enemy turn (card id -> n), and the pile they landed in. */
  status_card_ids?: Record<string, number>;
  status_card_pile?: Record<string, number>;
  /** Block a Defend move gave (pooled), and by ascension. */
  block_gained?: Record<string, number>;
  block_gained_by_asc?: Record<string, Record<string, number>>;
  /** HP a Heal move gave its user across its enemy turn, by ascension (Siphon, Ponder). */
  heal_by_asc?: Record<string, Record<string, number>>;
}

export interface MonsterEntry {
  name?: { zh?: string };
  kind?: string;
  /** Map rooms and acts the monster was fought in (fights), and the encounters it was in. */
  rooms?: Record<string, number>;
  acts?: Record<string, number>;
  encounters?: Record<string, number>;
  moves?: Record<string, MoveEntry>;
  powers?: Record<
    string,
    {
      name?: string;
      type?: string;
      description?: string;
      n_fights?: number;
      amount_at_first_sight?: Record<string, number>;
      /** asc -> {amount: n}: each instance's first logged amount, and the turn it was on. */
      amount_at_first_sight_by_asc?: Record<string, Record<string, number>>;
      turn_at_first_sight_by_asc?: Record<string, Record<string, number>>;
    }
  >;
  hp_by_asc?: Record<string, Range>;
  /** asc -> {"phase1 > phase2 > ...": fights}: max HP of each phase of a multi-phase enemy. */
  phases_by_asc?: Record<string, Record<string, number>>;
}

export interface Threat {
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

export interface EncounterEntry {
  rooms?: Record<string, number>;
  acts?: Record<string, number>;
  by_asc?: Record<string, Threat>;
}

export interface MonsterDb {
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

/** The monsters part of the loaded DB (moves by id), for moveDamageAt and the like. */
export function monsterMoves(): Record<string, MonsterEntry> {
  return load().monsters;
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
  /** Estimated only: the logged ascension's number before the ratio (base per hit, or the shown hit). */
  logged?: number;
  /** Moves the ratio was measured on, and whether they are this monster's own (else every monster's). */
  ratioN?: number;
  ratioOwn?: boolean;
  /**
   * Estimated only: the ascension the measured ratio reaches (chainedDamageRatio). Below the one asked for
   * when no move is logged there yet (A10 before any A10 run: A8 x the A8 -> A9 ratio, A9 -> A10 taken as 1).
   */
  ratioTo?: number;
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

/**
 * Counts at `asc` from a per-ascension split: this ascension's when logged, else the nearest logged one's
 * (A9's Ritual +3 at A10, not the pooled +2 most fights were logged with); the pooled counts only when
 * no ascension has any (a DB built before the split, or only unknown-ascension rows).
 */
export function countsAt(byAsc: Record<string, Record<string, number> | undefined> | undefined, pooled: Record<string, number> | undefined, asc: number): Record<string, number> | undefined {
  return countsAtAscension(byAsc, pooled, asc).counts;
}

/**
 * countsAt, and where the counts came from: the logged ascension (`exact` when it is `asc`), or null when
 * they are the pooled counts (the knowledge text labels a number from another ascension).
 */
export function countsAtAscension(
  byAsc: Record<string, Record<string, number> | undefined> | undefined,
  pooled: Record<string, number> | undefined,
  asc: number,
): { counts: Record<string, number> | undefined; asc: number | null; exact: boolean } {
  const logged = Object.fromEntries(Object.entries(byAsc ?? {}).filter(([, counts]) => counts && Object.keys(counts).length > 0));
  const found = nearestAscension(logged, asc);
  return found ? { counts: logged[found.key], asc: Number(found.key), exact: found.exact } : { counts: pooled, asc: null, exact: false };
}

/** An effect is the move's own when logged on at least this share of the enemy turns its most-logged effect was. */
export const REGULAR_EFFECT_SHARE = 0.5;
/** … and on at least this share of the move's uses (n_seen). */
export const REGULAR_EFFECT_MIN_USES = 0.2;

const countTotal = (counts: Record<string, number> | undefined): number => Object.values(counts ?? {}).reduce((sum, n) => sum + n, 0);

/**
 * Whether a move's logged effect (its counts, pooled over ascensions) is the move's own or a rare leak of
 * something else in that enemy turn (consistency review #11: the Waterfall Giant's +1 Strength on 1 of its
 * 58-129 uses of every move, a Brimstone run, was applied on every move by the rollout and the boss clock). The
 * deltas are logged only when the enemy turn was seen whole (about half to three quarters of real effects are),
 * so the share is taken against the move's most-logged effect (its own Steam Eruption: 115 of 129), and against
 * its uses. Counts unknown: taken as its own.
 */
export function regularEffect(move: MoveEntry | undefined, counts: Record<string, number> | undefined): boolean {
  if (!move || !counts) return true;
  const seen = countTotal(counts);
  const effects = [
    ...Object.values(move.self_powers_gained ?? {}).map(countTotal),
    ...Object.values(move.player_powers_applied ?? {}).map(countTotal),
    countTotal(move.block_gained),
  ];
  const most = Math.max(seen, ...effects);
  const uses = move.n_seen ?? 0;
  return seen >= REGULAR_EFFECT_SHARE * most && (uses <= 0 || seen >= REGULAR_EFFECT_MIN_USES * uses);
}

/**
 * The most common amount of a power a move gives its user at `asc` (self_powers_gained_by_asc, nearest
 * logged ascension, pooled only without a split): Kin Priest's Ritual +2 up to A8, +3 at A9. null when
 * the move never gave it, or only as a rare leak (regularEffect).
 */
export function selfGainAt(move: MoveEntry | undefined, powerId: string, asc: number): number | null {
  if (!regularEffect(move, move?.self_powers_gained?.[powerId])) return null;
  const byAsc = Object.fromEntries(Object.entries(move?.self_powers_gained_by_asc ?? {}).map(([key, powers]) => [key, powers[powerId]]));
  const value = mode(countsAt(byAsc, move?.self_powers_gained?.[powerId], asc));
  return value === null ? null : Number(value);
}

/** Picks an alternative needs to be one (appliedPowerIds). */
export const ALTERNATIVE_MIN_USES = 3;

/**
 * Which of `candidates` (powers a move puts on us, player_powers_applied) are the move's own, and whether each
 * use put one of them on us (a choice: the Knowledge Demon's Curse of Knowledge, 105 picks in 109 uses). A
 * choice is two or more powers each picked ALTERNATIVE_MIN_USES times at least (the Magi Knight's Dampen with
 * 1 Weak in 16 is no choice) whose uses add up to the move's; otherwise only the regular effects are the move's
 * own, not a rare leak (regularEffect: Stabbot's Frail on 3 of 20). Candidates keep their order.
 */
export function appliedPowerIds(move: MoveEntry, candidates: readonly string[]): { ids: string[]; choice: boolean } {
  const uses = (id: string) => countTotal(move.player_powers_applied?.[id]);
  const picks = candidates.filter((id) => uses(id) >= ALTERNATIVE_MIN_USES);
  const pooled = picks.reduce((sum, id) => sum + uses(id), 0);
  const choice = picks.length >= 2 && (move.n_seen ?? 0) > 0 && pooled <= 1.1 * move.n_seen!;
  return { ids: choice ? picks : candidates.filter((id) => regularEffect(move, move.player_powers_applied?.[id])), choice };
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

const loggedAscensionsCache = new WeakMap<MonsterMoveData, number[]>();

/** The ascensions some monster's move has a logged base damage at, ascending. */
function loggedDamageAscensions(monsters: MonsterMoveData): number[] {
  const cached = loggedAscensionsCache.get(monsters);
  if (cached) return cached;
  const seen = new Set<number>();
  for (const monster of Object.values(monsters)) {
    for (const move of Object.values(monster.moves ?? {})) {
      for (const [asc, entry] of Object.entries(move.damage_by_asc ?? {})) {
        if (/^\d+$/.test(asc) && mode(entry.base_per_hit) !== null) seen.add(Number(asc));
      }
    }
  }
  const out = [...seen].sort((a, b) => a - b);
  loggedAscensionsCache.set(monsters, out);
  return out;
}

/**
 * The damage ratio from `from` to `to`: measured directly on the moves logged at both
 * (ascensionDamageRatio), else chained through the ascensions logged on the way, one measured step at a
 * time (A8 -> A9 x A9 -> A10). An ascension no move is logged at yet (A10 before the first A10 run) adds
 * nothing: the chain stops at the last logged one (`reached`), the rest taken as 1 until measured. A move
 * logged only at A8 is then A8 x (A8 -> A9) at A10, as at A9, not its bare A8 damage. null when no step is
 * measured.
 */
export function chainedDamageRatio(
  monsters: MonsterMoveData,
  monsterId: string,
  from: number,
  to: number,
): { ratio: number; n: number; own: boolean; reached: number } | null {
  const direct = ascensionDamageRatio(monsters, monsterId, from, to);
  if (direct) return { ...direct, reached: to };
  const up = to > from;
  const onTheWay = loggedDamageAscensions(monsters)
    .filter((asc) => (up ? asc > from && asc <= to : asc < from && asc >= to))
    .sort((a, b) => (up ? a - b : b - a));
  let at = from;
  let ratio = 1;
  let n = Infinity;
  let own = true;
  for (const next of onTheWay) {
    const step = ascensionDamageRatio(monsters, monsterId, at, next);
    if (!step) continue;
    ratio *= step.ratio;
    n = Math.min(n, step.n);
    own = own && step.own;
    at = next;
  }
  return at === from ? null : { ratio, n, own, reached: at };
}

/**
 * A move's damage at `asc`: as logged there, else the nearest logged ascension's scaled by the measured
 * ratio (chainedDamageRatio: through the logged ascensions in between; one never logged counts as the
 * last logged one before it), rounded and marked estimated. null when the move has no logged damage.
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
  const measured = chainedDamageRatio(monsters, monsterId, from, asc);
  const ratio = measured?.ratio ?? 1;
  const base = Math.round(logged * ratio);
  return {
    perHit: average(base),
    hits,
    estimated: true,
    from,
    ratio,
    logged,
    ...(measured ? { ratioN: measured.n, ratioOwn: measured.own } : {}),
    ratioTo: measured?.reached ?? from,
    ...behind(base),
  };
}

/**
 * A move's shown damage per hit (Strength and our Vulnerable in) at `asc`, for a move whose base was never
 * measured (every logged turn had a debuff in the way: the Queen's Off With Your Head, the Amalgam's
 * Beam): the nearest logged ascension's most common shown hit, scaled like moveDamageAt when not this one.
 */
export function shownDamageAt(monsters: MonsterMoveData, monsterId: string, moveId: string, asc: number): MoveDamage | null {
  const move = monsters[monsterId]?.moves?.[moveId];
  const withShown = Object.fromEntries(Object.entries(move?.damage_by_asc ?? {}).filter(([, entry]) => mode(entry.shown) !== null));
  const found = nearestAscension(withShown, asc);
  if (!move || !found) return null;
  const shown = /^(\d+)x(\d+)$/.exec(mode(move.damage_by_asc![found.key]!.shown) ?? "");
  if (!shown) return null;
  const from = Number(found.key);
  if (found.exact) return { perHit: Number(shown[1]), hits: Number(shown[2]), estimated: false, from, ratio: 1 };
  const measured = chainedDamageRatio(monsters, monsterId, from, asc);
  const ratio = measured?.ratio ?? 1;
  return {
    perHit: Math.round(Number(shown[1]) * ratio),
    hits: Number(shown[2]),
    estimated: true,
    from,
    ratio,
    logged: Number(shown[1]),
    ...(measured ? { ratioN: measured.n, ratioOwn: measured.own } : {}),
    ratioTo: measured?.reached ?? from,
  };
}

/** A monster's median max HP at an ascension (monsterHpAt). */
export interface MonsterHp {
  hp: number;
  /** Instances behind the logged median (at `from`), and its range there. */
  n: number;
  min?: number;
  max?: number;
  /** Not logged at this ascension: the nearest logged one's median times `ratio`, rounded. */
  estimated: boolean;
  /** The logged ascension the median comes from. */
  from: number;
  /** The HP ratio applied (1 when logged here or when nothing measures it). */
  ratio: number;
  /** The logged median at `from`, before the ratio. */
  logged: number;
  /** Estimated only: monsters the ratio was measured on (the fewest over its steps), and the ascension the chain reaches. */
  ratioN?: number;
  ratioTo?: number;
}

function medianHp(monster: MonsterEntry | undefined, asc: number): number | null {
  const median = monster?.hp_by_asc?.[String(asc)]?.median;
  return typeof median === "number" && median > 0 ? median : null;
}

/**
 * How much more HP enemies have at `to` than at `from`: summed median max HP at `to` over at `from`, over every
 * monster logged at both (A7 -> A8: 1.06 on 103 monsters; A8 -> A9: 1.00 on 93). null when none is logged at both.
 */
export function ascensionHpRatio(monsters: Record<string, MonsterEntry>, from: number, to: number): { ratio: number; n: number } | null {
  let atFrom = 0;
  let atTo = 0;
  let n = 0;
  for (const monster of Object.values(monsters)) {
    const a = medianHp(monster, from);
    const b = medianHp(monster, to);
    if (a === null || b === null) continue;
    atFrom += a;
    atTo += b;
    n += 1;
  }
  return n > 0 ? { ratio: atTo / atFrom, n } : null;
}

/**
 * The HP ratio from `from` to `to` (ascension review #1/#20, as chainedDamageRatio): measured directly on the
 * monsters logged at both, else chained through the ascensions logged on the way, one measured step at a time;
 * an ascension nobody is logged at adds nothing (`reached` stops short of `to`). null when no step is measured.
 */
export function chainedHpRatio(monsters: Record<string, MonsterEntry>, from: number, to: number): { ratio: number; n: number; reached: number } | null {
  const direct = ascensionHpRatio(monsters, from, to);
  if (direct) return { ...direct, reached: to };
  const up = to > from;
  const logged = new Set<number>();
  for (const monster of Object.values(monsters)) {
    for (const key of Object.keys(monster.hp_by_asc ?? {})) if (/^\d+$/.test(key) && medianHp(monster, Number(key)) !== null) logged.add(Number(key));
  }
  const onTheWay = [...logged].filter((asc) => (up ? asc > from && asc <= to : asc < from && asc >= to)).sort((a, b) => (up ? a - b : b - a));
  let at = from;
  let ratio = 1;
  let n = Infinity;
  for (const next of onTheWay) {
    const step = ascensionHpRatio(monsters, at, next);
    if (!step) continue;
    ratio *= step.ratio;
    n = Math.min(n, step.n);
    at = next;
  }
  return at === from ? null : { ratio, n, reached: at };
}

/**
 * A monster's median max HP at `asc` (phase 1 for a multi-phase enemy): as logged there, else the nearest logged
 * ascension's scaled by the measured HP ratio (chainedHpRatio), rounded and marked estimated. null when its HP
 * was never logged.
 */
export function monsterHpAt(monsters: Record<string, MonsterEntry>, monsterId: string, asc: number): MonsterHp | null {
  const monster = monsters[monsterId];
  const withHp = Object.fromEntries(Object.entries(monster?.hp_by_asc ?? {}).filter(([key]) => medianHp(monster, Number(key)) !== null));
  const found = nearestAscension(withHp, asc);
  if (!monster || !found) return null;
  const range = withHp[found.key]!;
  const logged = range.median!;
  const from = Number(found.key);
  const spread = { ...(typeof range.min === "number" ? { min: range.min } : {}), ...(typeof range.max === "number" ? { max: range.max } : {}) };
  if (found.exact) return { hp: Math.round(logged), n: range.n ?? 0, ...spread, estimated: false, from, ratio: 1, logged };
  const measured = chainedHpRatio(monsters, from, asc);
  const ratio = measured?.ratio ?? 1;
  return {
    hp: Math.round(logged * ratio),
    n: range.n ?? 0,
    ...spread,
    estimated: true,
    from,
    ratio,
    logged,
    ...(measured ? { ratioN: measured.n } : {}),
    ratioTo: measured?.reached ?? from,
  };
}

/**
 * A monster's expected attack damage on each of its first `turns` turns at `asc`: its turn-1 move as
 * logged (turns_seen), then its logged successors (next; a move with none, the Waterfall Giant's death
 * Explode, is not a turn of the fight), each move's damage per hit at this ascension (moveDamageAt:
 * scaled from the nearest ascension when unseen here; the shown hit when no base was ever measured) plus
 * the Strength its earlier moves gained (selfGainAt: at this ascension, A9's Ritual +3 not the pooled +2),
 * times its hits. `estimated`: some move's
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
  const strengthOf = (id: string) => selfGainAt(moves[id], "STRENGTH_POWER", asc) ?? 0;
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

/**
 * A hand-written note's numbers from the DB at `asc` (the notes keep the strategy, the DB the numbers):
 *   {HP:ID}              the enemy's median max HP (hp_by_asc, nearest logged ascension);
 *   {DMG:ID:MOVE}        the move's base damage per hit, "×hits" for a multi-hit (moveDamageAt; the shown
 *                        hit when no base was measured), "≈" in front when estimated (not logged here);
 *   {BEHIND:ID:MOVE}     a Surrounded move's hit from behind (base × 1.5);
 *   {GAIN:ID:MOVE:POWER} what the move gives its user of a power (selfGainAt);
 *   {POWER:ID:POWER}     the amount the enemy is first seen with (amount_at_first_sight_by_asc);
 *   {BLOCK:ID:MOVE}      the block the move gives (block_gained_by_asc).
 * One the DB cannot fill becomes "?", never a hand-set number from another ascension. `db`: the monsters to read
 * (the loaded DB by default; the knowledge renderer passes the one it loaded from its knowledge directory).
 */
export function fillDbNumbers(text: string, asc: number, db: Record<string, MonsterEntry> = load().monsters): string {
  const fill = (kind: string, id: string, a?: string, b?: string): string | null => {
    const monster = db[id];
    const move = a ? monster?.moves?.[a] : undefined;
    switch (kind) {
      case "HP": {
        const found = nearestAscension(monster?.hp_by_asc, asc);
        const median = found ? monster!.hp_by_asc![found.key]!.median : undefined;
        return median === undefined ? null : String(Math.round(median));
      }
      case "DMG":
      case "BEHIND": {
        if (!a) return null;
        const base = moveDamageAt(db, id, a, asc);
        const hit = base ?? shownDamageAt(db, id, a, asc);
        if (!hit) return null;
        const perHit = base ? (base.base ?? base.perHit) : hit.perHit;
        const mark = hit.estimated ? "≈" : "";
        if (kind === "BEHIND") return base?.backAttackShare !== undefined ? `${mark}${Math.floor(perHit * 1.5)}` : null;
        return `${mark}${perHit}${hit.hits > 1 ? `×${hit.hits}` : ""}`;
      }
      case "GAIN": {
        const gain = a && b ? selfGainAt(move, b, asc) : null;
        return gain === null ? null : String(gain);
      }
      case "POWER": {
        const power = a ? monster?.powers?.[a] : undefined;
        return power ? mode(countsAt(power.amount_at_first_sight_by_asc, power.amount_at_first_sight, asc)) : null;
      }
      case "BLOCK":
        return move ? mode(countsAt(move.block_gained_by_asc, move.block_gained, asc)) : null;
      case "APPLIES": {
        // The power a move puts on us, its usual amount at this ascension (player_powers_applied).
        const byAsc = Object.fromEntries(Object.entries(move?.player_powers_applied_by_asc ?? {}).map(([key, powers]) => [key, b ? powers?.[b] : undefined]));
        return b ? mode(countsAt(byAsc, move?.player_powers_applied?.[b], asc)) : null;
      }
      default:
        return null;
    }
  };
  return text.replace(/\{(HP|DMG|BEHIND|GAIN|POWER|BLOCK|APPLIES):([A-Z0-9_]+)(?::([A-Z0-9_]+))?(?::([A-Z0-9_]+))?\}/g, (_, kind: string, id: string, a?: string, b?: string) => fill(kind, id, a, b) ?? "?");
}

/**
 * A power's first-seen amount at every logged ascension, runs of equal amounts joined ("A0–A8 150、A9 160": the
 * Ceremonial Beast's Plow, the HP it is stunned at). For the guides, which are read at any ascension: the stun
 * line was written as a flat 150 and is 160 at A9. null when the DB has no per-ascension amounts.
 */
export function powerAmountByAscText(monsterId: string, powerId: string, monsters: Record<string, MonsterEntry> = load().monsters): string | null {
  const byAsc = monsters[monsterId]?.powers?.[powerId]?.amount_at_first_sight_by_asc;
  const logged = Object.keys(byAsc ?? {})
    .filter((key) => /^\d+$/.test(key))
    .map(Number)
    .sort((a, b) => a - b)
    .map((asc) => ({ asc, amount: mode(byAsc![String(asc)]) }))
    .filter((row): row is { asc: number; amount: string } => row.amount !== null);
  if (logged.length === 0) return null;
  const runs: { from: number; to: number; amount: string }[] = [];
  for (const row of logged) {
    const last = runs[runs.length - 1];
    if (last && last.amount === row.amount) last.to = row.asc;
    else runs.push({ from: row.asc, to: row.asc, amount: row.amount });
  }
  return runs.map((run) => `${run.from === run.to ? `A${run.from}` : `A${run.from}–A${run.to}`} ${run.amount}`).join("、");
}

/** One move as shown: name, damage at this ascension (per hit × hits), Strength it gains, status cards. */
function moveText(move: MoveEntry, id: string, asc: number, monsterId: string): string {
  const parts: string[] = [move.name || id];
  const damage = moveDamageAt(load().monsters, monsterId, id, asc);
  if (damage) {
    const shown = damage.base ?? damage.perHit;
    const behind = damage.backAttackShare !== undefined ? ` (在背后 ×1.5 = ${Math.floor(shown * 1.5)}，记录中 ${pct(damage.backAttackShare)} 的回合在背后)` : "";
    const text = `${damage.hits > 1 ? `${shown}×${damage.hits}` : String(shown)}${behind}`;
    // Unseen at this ascension: the nearest one's number scaled by the measured ratio, said so, and where
    // the measured chain stops short of this ascension (A10 before any A10 run: A9 -> A10 taken as 1).
    const unmeasured = damage.ratioTo !== undefined && damage.ratioTo !== asc ? `，A${damage.ratioTo}→A${asc} 未测按 ×1` : "";
    parts.push(damage.estimated ? `${text} (A${asc}估: A${damage.from}×${damage.ratio.toFixed(2)}${unmeasured})` : text);
  } else if (move.intents) parts.push(`(${Object.keys(move.intents).join("/")})`);
  const strength = selfGainAt(move, "STRENGTH_POWER", asc);
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

/**
 * What an enemy spawns when it dies, as logged (coverage review 2026-09-29 #7): the Phrog Parasite
 * (INFESTED_POWER: 「死亡时，召唤……某种东西」) 4 Wrigglers (208 spawned in its 52 fights), the Gremlin Merc
 * (SURPRISE_POWER) a Fat and a Sneaky Gremlin (61 each in 61). Killing it is no win: the solver said
 * "lethal" and code auto-played it (48 Phrog and 47 Gremlin turns).
 */
export const ON_DEATH_SPAWNS: Record<string, { id: string; count: number }[]> = {
  PHROG_PARASITE: [{ id: "WRIGGLER", count: 4 }],
  GREMLIN_MERC: [
    { id: "FAT_GREMLIN", count: 1 },
    { id: "SNEAKY_GREMLIN", count: 1 },
  ],
};

/** A spawn's HP when the monster DB has none logged (the Wriggler's and the gremlins' are 11-21). */
const SPAWN_FALLBACK_HP = 15;

/**
 * An enemy's on-death spawns at `asc`: each one's name, HP (its median max HP at the nearest logged ascension)
 * and first move (SPAWNED_MOVE when logged: no attack on the turn it arrives). null when it spawns nothing known.
 */
export function spawnsAt(enemyId: string, asc: number, monsters: Record<string, MonsterEntry> = load().monsters): { id: string; name: string; hp: number; count: number; move: string | null }[] | null {
  const spawns = ON_DEATH_SPAWNS[enemyId];
  if (!spawns) return null;
  return spawns.map(({ id, count }) => {
    const monster = monsters[id];
    const found = nearestAscension(monster?.hp_by_asc, asc);
    const median = found ? monster!.hp_by_asc![found.key]!.median : undefined;
    const moves = Object.keys(monster?.moves ?? {});
    return { id, name: monster?.name?.zh || id, hp: Math.round(median ?? SPAWN_FALLBACK_HP), count, move: moves.includes("SPAWNED_MOVE") ? "SPAWNED_MOVE" : null };
  });
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

function powersText(id: string, fights: number, asc: number): string {
  const powers = load().monsters[id]?.powers ?? {};
  const common = Object.values(powers)
    // Its own buffs only: Vulnerable, Weak and the like on it are what we applied.
    .filter((power) => power.type !== "Debuff" && (power.n_fights ?? 0) >= Math.max(2, fights * 0.3))
    .map((power) => {
      // At this ascension (the Waterfall Giant's Steam Eruption: 15 up to A8, 20 at A9), not pooled.
      const amount = mode(countsAt(power.amount_at_first_sight_by_asc, power.amount_at_first_sight, asc));
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
    const powers = powersText(part, entry.fights ?? 0, asc);
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

/** The act boss's measured HP cost (bossHpLoss). */
export interface BossHpLoss {
  /**
   * HP lost in our won fights (median/p75, n) at the nearest ascension with a win, `asc` (A9 Kaiser Crab: 0
   * wins in 2 fights, so A8's); null when no ascension has a win.
   */
  won: { median: number; p75: number; n: number; asc: number } | null;
  /** Our record at the nearest logged ascension (`recordAsc`): fights and win rate. */
  fights: number;
  winRate: number | null;
  recordAsc: number;
  /** HP lost a turn in every logged fight, wins and deaths, at the nearest ascension that has any (`asc`). */
  perTurn: { median: number; n: number; asc: number } | null;
}

/** Numeric keys ordered by distance from `asc`, the higher first on a tie (as nearestAscension picks). */
function byDistance(keys: string[], asc: number): string[] {
  return keys.filter((key) => /^\d+$/.test(key)).sort((a, b) => Math.abs(Number(a) - asc) - Math.abs(Number(b) - asc) || Number(b) - Number(a));
}

/**
 * The act boss's HP lost in our won fights and a turn, and our record, at `asc`: each from the nearest
 * logged ascension that has it (the win sample walks on to the next ascension when the nearest has no
 * win, as roomHpCost does; the per-turn loss counts deaths too, so it does not wait for a win). null when
 * the DB has no fight against the boss.
 */
export function bossHpLoss(bossId: string | null | undefined, asc: number): BossHpLoss | null {
  if (!bossId) return null;
  const byAsc = load().bosses[bossId.toUpperCase().replace(/_BOSS$/, "")];
  const found = nearestAscension(byAsc, asc);
  if (!byAsc || !found) return null;
  const order = byDistance(Object.keys(byAsc), asc);
  const wonAt = order.find((key) => {
    const loss = byAsc[key]!.hp_loss_won;
    return !!loss?.n && typeof loss.median === "number";
  });
  const turnAt = order.find((key) => {
    const turn = byAsc[key]!.hp_loss_per_turn;
    return !!turn?.n && typeof turn.median === "number";
  });
  const loss = wonAt ? byAsc[wonAt]!.hp_loss_won! : null;
  const turn = turnAt ? byAsc[turnAt]!.hp_loss_per_turn! : null;
  const record = byAsc[found.key]!;
  return {
    won: loss && wonAt ? { median: loss.median!, p75: typeof loss.p75 === "number" ? loss.p75 : loss.median!, n: loss.n!, asc: Number(wonAt) } : null,
    fights: record.fights ?? 0,
    winRate: record.win_rate ?? null,
    recordAsc: Number(found.key),
    perTurn: turn && turnAt ? { median: turn.median!, n: turn.n!, asc: Number(turnAt) } : null,
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

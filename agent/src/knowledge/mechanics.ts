/**
 * Observed mechanics (docs/mechanics-learning.md; Dai 2026-10-02): rules the game's text does not state, mined from the
 * logs by knowledge/builders/build-monster-db.py into monster-db.json `observed`, refreshed with the DB after every run. Nothing here
 * names an enemy or a power: a rule is whatever the counts say, and any power meeting the thresholds gets it.
 *
 * The first rule class the simulator uses is "stunned when a power is stripped to 0": the Thieving Hopper's Flutter says
 * only 「从攻击牌中受到的伤害减少50%」, yet the logs show every strip of its last stack on our turn stunning it (move
 * STUNNED) with that turn's move cancelled (MCK9SMSK40ZY F19 T4: Nab 14, no HP lost; XMY29WWQDC1Y F19 T5: the Escape
 * delayed to T6). MECH_RULES (config) switches its use in the turn solver, the rollout and the combat question.
 *
 * The second class (MECH_MOVE_RULES, docs/mechanics-learning.md §8) is "a power removed or lowered on our turn -> the
 * enemy's move changes at once": an Axebot killed with Stock left comes back with its move Boot Up (no attack), 22 of 23
 * logged last-Stock strips and 22 of 22 first revives (Stock 2 -> 1; TQX5JJX3UD39 F37 T1 and T5: HAMMER_UPPERCUT /
 * ONE_TWO -> BOOT_UP, Hammer Uppercut next). Moves are a monster's own, so this class is learned per monster.
 *
 * The third (MECH_DEATH_MOVE, docs/mechanics-learning.md §9) is "an ally dies on our turn -> a survivor's move changes",
 * learned per (survivor, ally) pair from every logged multi-enemy fight: the Torch Head Amalgam dying turns the Queen's Burn
 * Bright For Me into Enrage on that very frame (21 of 21; no attack either way, so that turn's incoming stays) and her next
 * move into Off With Your Head (22 of 22; 7x5 at A8, the first one killed us in 7 logged attempts), moves she never showed
 * beside a living Amalgam in 205 turns. No power text says it.
 */

import type { MonsterDb } from "./monster-db.js";

/** One power stripped to 0 on our turn while the enemy lived (build-monster-db.py Mechanics.strip_obj). */
export interface StrippedPower {
  n: number;
  fights: number;
  amount_before?: Record<string, number>;
  /** The enemy's move on the frame right after the strip ("STUNNED": stunned). */
  move_after?: Record<string, number>;
  stunned_share?: number | null;
  /** Other powers gone on the same frame (the Matriarch's Plating with its Asleep). */
  co_removed?: Record<string, number>;
  died_same_turn?: number;
  turn_end_unclear?: number;
  alive_at_turn_end?: number;
  stunned_at_turn_end?: number;
  /** Of the strips whose enemy lived to our end turn: the ones that showed an attack before, and showed none at the end. */
  attack_before?: number;
  attack_cancelled?: number;
  /** The checkable ones (the only attacker, past our block) and those in which the attack still took HP. */
  hp_check?: { n?: number; landed?: number };
  evidence?: string[];
  /** Pooled (top level): strips per monster. */
  monsters?: Record<string, number>;
  /** Class B: the move on the frame before the strip, the strips whose own frame showed another move, and which. */
  move_before?: Record<string, number>;
  move_changed?: number;
  move_changed_share?: number | null;
  changed_to?: Record<string, number>;
  changed_evidence?: string[];
  /** Its move at our turn's end-turn decision and on the next turn's first frame (changed_next: of the changed ones). */
  end_move?: Record<string, number>;
  next_move?: Record<string, number>;
  changed_next?: Record<string, number>;
  /** The strips whose frame showed its max HP changed or its HP up: a revive (Axebot), a husk (Waterfall Giant). */
  revived?: number;
}

/** A power lowered (still > 0) on our turn while the enemy lived: the class-B counters only (build-monster-db.py). */
export type LoweredPower = Pick<StrippedPower, "n" | "fights" | "move_before" | "move_changed" | "move_changed_share" | "changed_to" | "changed_evidence" | "end_move" | "next_move" | "changed_next" | "revived">;

export interface EscapeObserved {
  n: number;
  gone: number;
  gone_stunned?: number;
  stayed: number;
  stayed_stunned?: number;
  killed_first?: number;
  killed_last_card?: number;
  we_died?: number;
  unclear?: number;
  gone_share?: number | null;
  next_after_stay?: Record<string, number>;
  evidence_gone?: string[];
  evidence_stayed?: string[];
}

export interface KillReward {
  /** "<reward_type>:<text with numbers as N>". */
  reward: string;
  /** [fights with it, fights] when the monster was killed / left / not in the fight. */
  killed: [number, number];
  left: [number, number];
  elsewhere: [number, number];
  only_when_killed: boolean;
  exclusive: boolean;
  evidence?: string[];
}

export interface MidTurnStuns {
  n: number;
  fights: number;
  /** What changed on the stun's frame: power_removed:<id>, power_down:<id>, block_broken, ally_died, hp_lost. */
  triggers: Record<string, number>;
  unexplained: number;
  evidence?: string[];
}

/** A monster's `observed` entry. */
export interface ObservedMonster {
  powers_stripped?: Record<string, StrippedPower>;
  powers_lowered?: Record<string, LoweredPower>;
  escape_moves?: Record<string, EscapeObserved>;
  kill_rewards?: KillReward[];
  mid_turn_stuns?: MidTurnStuns;
  /** MECH_DEATH_MOVE: by the dying ally's monster id, this monster's move around that death (deathRules). */
  ally_deaths?: Record<string, AllyDeathObserved>;
}

/** The DB's top-level `observed` block: each stripped power pooled over the monsters carrying it. */
export interface ObservedDb {
  note?: string;
  end_turn_check?: boolean;
  powers_stripped?: Record<string, StrippedPower>;
}

/** The move a stunned enemy shows. */
export const STUN_MOVE = "STUNNED";
/**
 * A power's strip is a stun rule with at least this many logged strips: below it a pattern is an anecdote. The current
 * candidates are far above it (Flutter 41, Shriek 90, Burrowed 120; 2026-10-02).
 */
export const STRIP_STUN_MIN_N = 5;
/**
 * ... and at least this share of them stunned it on the next frame. The logged shares are bimodal: 1.0 (Flutter, Shriek,
 * Plow, Burrowed, Asleep, Slumber) or at most 0.44 (Strength, removed with a Plow stun or an Axebot's revive); 0.8 sits
 * in the gap and still allows a stray frame.
 */
export const STRIP_STUN_MIN_SHARE = 0.8;
/** When at least this many strips showed an attack before: that share of them showed none at our turn's end. */
export const STRIP_CANCEL_MIN_N = 3;
export const STRIP_CANCEL_MIN_SHARE = 0.8;
/** When at least this many could be checked against our HP: at most this share of the attacks still landed. */
export const STRIP_LANDED_MAX_SHARE = 0.2;

/** A power whose strip to 0 stunned its enemy in the logs (the counts behind it, for facts and notes). */
export interface StripStunRule {
  power: string;
  n: number;
  fights: number;
  stunned: number;
  /** [attacks cancelled, strips that showed an attack before]. */
  cancelled: [number, number];
  /** [attacks that still took HP, strips checkable against our HP]. */
  landed: [number, number];
  evidence: string[];
  /** Monsters it was logged on, by strips. */
  monsters: Record<string, number>;
}

const count = (value: number | undefined | null): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

/** Whether a pooled stripped power meets the stun-rule thresholds. */
export function isStripStun(stats: StrippedPower | undefined): boolean {
  if (!stats) return false;
  const n = count(stats.n);
  const stunned = count(stats.move_after?.[STUN_MOVE]);
  if (n < STRIP_STUN_MIN_N || stunned < STRIP_STUN_MIN_SHARE * n) return false;
  const before = count(stats.attack_before);
  if (before >= STRIP_CANCEL_MIN_N && count(stats.attack_cancelled) < STRIP_CANCEL_MIN_SHARE * before) return false;
  const checked = count(stats.hp_check?.n);
  if (checked >= STRIP_CANCEL_MIN_N && count(stats.hp_check?.landed) > STRIP_LANDED_MAX_SHARE * checked) return false;
  return true;
}

/** The powers whose strip to 0 stuns the enemy, by power id, from the DB's top-level `observed` (empty without it). */
export function stripStunRules(observed: ObservedDb | undefined | null): Map<string, StripStunRule> {
  const out = new Map<string, StripStunRule>();
  for (const [power, stats] of Object.entries(observed?.powers_stripped ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (!isStripStun(stats)) continue;
    out.set(power, {
      power,
      n: count(stats.n),
      fights: count(stats.fights),
      stunned: count(stats.move_after?.[STUN_MOVE]),
      cancelled: [count(stats.attack_cancelled), count(stats.attack_before)],
      landed: [count(stats.hp_check?.landed), count(stats.hp_check?.n)],
      evidence: [...(stats.evidence ?? [])],
      monsters: { ...(stats.monsters ?? {}) },
    });
  }
  return out;
}

/** The stun rules of a loaded monster DB (its `observed` block). */
export function stripStunRulesOf(db: Pick<MonsterDb, "observed"> | null | undefined): Map<string, StripStunRule> {
  return stripStunRules(db?.observed);
}

/* ---- class B: a power removed or lowered -> the enemy's move changes (MECH_MOVE_RULES) ----------------------------- */

/**
 * A (monster, power) is a move rule with at least this many logged strips (or lowerings), as the stun rule: below it a
 * pattern is an anecdote.
 */
export const MOVE_RULE_MIN_N = 5;
/**
 * ... at least this share of them changed its move on the strip's own frame, and to one move at least this share of all
 * of them (STUNNED is the stun rule's, not this one's). The logged shares are bimodal (6,112 fights, 2026-10-02): every
 * (monster, power) with n >= 5 changed its move on 0% of its strips or on 87.5-100% (Axebot Stock 22/23, Strength 25/26,
 * Vulnerable 27/28, Weak 7/8, all to Boot Up; Waterfall Giant Vulnerable 38/38, Strength 10/10 to About to Blow), each
 * time to a single move. 0.8 sits in that gap, as the stun rule's does.
 */
export const MOVE_RULE_MIN_SHARE = 0.8;

/** How a rule's power went: taken to 0 (stripped) or down a stack and still up (lowered). */
export type MoveRuleHow = "removed" | "lowered";

/** A learned move change: this power of this monster removed (or lowered) on our turn changes its move to `move` at once. */
export interface MoveRule {
  monster: string;
  power: string;
  how: MoveRuleHow;
  move: string;
  n: number;
  fights: number;
  /** The strips that showed `move` on their own frame. */
  changed: number;
  /** Its move at the next turn's first frame after a change (its next intent). */
  next: Record<string, number>;
  /** The changes on a frame showing it revived or transformed (max HP changed, HP up). */
  revived: number;
  /** Other powers gone on the same frames (removed rules only). */
  coRemoved: Record<string, number>;
  evidence: string[];
}

/** The move a power's logged strips (or lowerings) change to, when they meet the class-B thresholds; else null. */
export function moveChangeOf(stats: Pick<StrippedPower, "n" | "move_changed" | "changed_to"> | undefined): { move: string; changed: number } | null {
  if (!stats) return null;
  const n = count(stats.n);
  if (n < MOVE_RULE_MIN_N || count(stats.move_changed) < MOVE_RULE_MIN_SHARE * n) return null;
  const top = Object.entries(stats.changed_to ?? {})
    .filter(([move]) => move !== STUN_MOVE)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
  if (!top || top[1] < MOVE_RULE_MIN_SHARE * n) return null;
  return { move: top[0], changed: top[1] };
}

const sortedKeys = <T>(record: Record<string, T> | undefined): string[] => Object.keys(record ?? {}).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/**
 * Every learned move rule, by monster id, from the monsters' `observed` blocks (empty without them). Per monster: a move id
 * is its own (Boot Up is the Axebot's), unlike a stun.
 */
export function moveRules(monsters: Record<string, { observed?: ObservedMonster } | undefined> | undefined | null): Map<string, MoveRule[]> {
  const out = new Map<string, MoveRule[]>();
  for (const monster of sortedKeys(monsters ?? {})) {
    const observed = monsters![monster]?.observed;
    const rules: MoveRule[] = [];
    for (const [how, table] of [["removed", observed?.powers_stripped], ["lowered", observed?.powers_lowered]] as const) {
      for (const power of sortedKeys(table)) {
        const stats = table![power]!;
        const change = moveChangeOf(stats);
        if (!change) continue;
        rules.push({
          monster, power, how, move: change.move, n: count(stats.n), fights: count(stats.fights), changed: change.changed,
          next: { ...(stats.changed_next ?? {}) }, revived: count(stats.revived),
          coRemoved: how === "removed" ? { ...((stats as StrippedPower).co_removed ?? {}) } : {}, evidence: [...(stats.changed_evidence ?? [])],
        });
      }
    }
    if (rules.length > 0) out.set(monster, rules);
  }
  return out;
}

/** The move rules of a loaded monster DB. */
export function moveRulesOf(db: Pick<MonsterDb, "monsters"> | null | undefined): Map<string, MoveRule[]> {
  return moveRules(db?.monsters);
}

/**
 * The powers that go with a rule's change: the monster's other powers whose own removal changes its move to the same one
 * (an Axebot's revive clears its Strength, Vulnerable and Weak: their strips show Boot Up 25/26, 27/28, 7/8). The rollout
 * clears them with the change.
 */
export function clearedWith(rule: Pick<MoveRule, "power" | "move">, rules: readonly MoveRule[]): string[] {
  return [...new Set(rules.filter((other) => other.how === "removed" && other.move === rule.move && other.power !== rule.power).map((other) => other.power))].sort();
}

/* ---- class D: an ally's death -> a survivor's move changes (MECH_DEATH_MOVE) -------------------------------------- */

/**
 * One (survivor, ally) pair's logged ally deaths on our turn (build-monster-db.py death_obj; monster-db.json
 * monsters.<survivor>.observed.ally_deaths.<ally>). Docs: docs/mechanics-learning.md §9.
 */
export interface AllyDeathObserved {
  n: number;
  fights: number;
  /** The survivor's move on the frame before the death, and by it the move on the death's own frame. */
  move_before?: Record<string, number>;
  move_changed?: number;
  move_changed_share?: number | null;
  changed_to?: Record<string, number>;
  by_move?: Record<string, { n: number; changed_to?: Record<string, number> }>;
  changed_evidence?: string[];
  /** Deaths whose frame changed the survivor's intent total; deaths with another enemy dead on the same frame. */
  attack_changed?: number;
  co_deaths?: number;
  /** Its move at our end-turn decision; the deaths it lived to the next turn's first frame and its move there (by end move). */
  end_move?: Record<string, number>;
  next_n?: number;
  next_move?: Record<string, number>;
  next_after?: Record<string, Record<string, number>>;
  next_evidence?: string[];
  /** The baseline: the turns it started beside a living ally of that id, the moves it showed, the next move by move. */
  alive?: { turns?: number; moves?: Record<string, number>; next?: Record<string, Record<string, number>> };
  /** The turns it started after such an ally died on an earlier turn of the fight, none of that id alive: the moves it showed. */
  dead?: { turns?: number; moves?: Record<string, number> };
}

/** A death rule (either part) needs at least this many logged deaths behind it: fewer is an anecdote (Dai 2026-10-03). */
export const DEATH_RULE_MIN_N = 3;
/**
 * ... and this share of them showing the one move. The logged shares that pass n >= 3 are 1.0 or far below (the Queen's
 * Burn Bright For Me -> Enrage 21/21, Off With Your Head next 22/22; the noise pairs' "next" moves are their own cycles).
 */
export const DEATH_RULE_MIN_SHARE = 0.9;
/** A move is the death's own (never shown while the ally lived) only over at least this many turns beside a living one. */
export const DEATH_ALIVE_MIN_TURNS = 10;
/**
 * A next-turn rule must be the death's doing, not the survivor's own cycle: its move is one the survivor never showed beside a
 * living ally (above), or, after the same end move with the ally alive (at least this many logged turns), the survivor went
 * elsewhere at least DEATH_BASELINE_MISS of the time (the Living Shield: Shield Slam -> Shield Slam 81/81 beside a living
 * Turret Operator, Smash 5/5 once it died). Otherwise the move model already says it (a Twig Slime's Pokey Pounce).
 */
export const DEATH_BASELINE_MIN_N = 3;
export const DEATH_BASELINE_MISS = 0.5;
/**
 * ... and it must change what the move model says: after at least one of the end moves it was logged after, the monster's
 * own successor counts give its move less than this share (or none). Else it is reported but not applied: the rollout's
 * move model already makes that move (the Living Fog's Bloat after a Gas Bomb dies: Super Gas Blast -> Bloat 70/70).
 */
export const DEATH_MODEL_SHARE = 0.9;

/**
 * A learned "an ally's death changes my move" rule (MECH_DEATH_MOVE): when a `ally` dies on our turn, the survivor
 * `monster`'s move changes at once (same turn: `now`, by the move it shows then) and/or is `next.move` on the next turn.
 */
export interface DeathRule {
  monster: string;
  ally: string;
  n: number;
  fights: number;
  /** Same turn: by the survivor's move when the ally dies, the move it shows on the death's own frame (this enemy turn's). */
  now: Record<string, { move: string; changed: number; n: number }>;
  /**
   * Next turn: its move on the next turn's first frame after such a death (its next intent), or null; `after`: the moves
   * it was logged ending our turn on before it (the rule is applied after those only: past them it is a guess).
   */
  next: { move: string; count: number; n: number; after: string[] } | null;
  /** The rule's moves it never showed at a turn start beside a living ally of that id (the rollout keeps them out then). */
  exclusive: string[];
  /**
   * The moves it showed beside a living ally of that id and never once such an ally was dead (at least DEATH_ALIVE_MIN_TURNS
   * turns after a death): the rollout keeps them out after the death (the Queen's Burn Bright For Me, You Are Mine, Puppet
   * Strings).
   */
  aliveOnly: string[];
  /** Turns logged beside a living ally of that id (the baseline behind `exclusive`). */
  aliveTurns: number;
  evidence: string[];
}

const topMove = (counts: Record<string, number> | undefined, skip?: string): [string, number] | null =>
  Object.entries(counts ?? {})
    .filter(([move]) => move !== skip && move !== STUN_MOVE && move !== "?")
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0] ?? null;

/**
 * The rule of one logged (survivor, ally) pair under the thresholds, or null (nothing passes). `moves`: the survivor's move
 * table (monster DB `moves`, its `next` successor counts) for the move-model check; absent, no next-turn rule is applied.
 */
export function deathRuleOf(monster: string, ally: string, stats: AllyDeathObserved | undefined, moves?: Record<string, { next?: Record<string, number> } | undefined>): DeathRule | null {
  if (!stats) return null;
  const now: DeathRule["now"] = {};
  for (const before of sortedKeys(stats.by_move)) {
    const by = stats.by_move![before]!;
    const top = topMove(by.changed_to, before);
    if (count(by.n) >= DEATH_RULE_MIN_N && top && top[1] >= DEATH_RULE_MIN_SHARE * count(by.n)) now[before] = { move: top[0], changed: top[1], n: count(by.n) };
  }
  const aliveTurns = count(stats.alive?.turns);
  const ownMove = (move: string) => aliveTurns >= DEATH_ALIVE_MIN_TURNS && count(stats.alive?.moves?.[move]) === 0;
  let next: DeathRule["next"] = null;
  const nextN = count(stats.next_n);
  const top = topMove(stats.next_move);
  if (nextN >= DEATH_RULE_MIN_N && top && top[1] >= DEATH_RULE_MIN_SHARE * nextN) {
    // The survivor's own cycle beside a living ally, after the end moves these deaths left it on.
    let weight = 0;
    let miss = 0;
    for (const [end, after] of Object.entries(stats.next_after ?? {})) {
      const base = stats.alive?.next?.[end] ?? {};
      const total = Object.values(base).reduce((sum, n) => sum + count(n), 0);
      if (total < DEATH_BASELINE_MIN_N) continue;
      const c = Object.values(after).reduce((sum, n) => sum + count(n), 0);
      weight += c;
      miss += c * (1 - count(base[top[0]]) / total);
    }
    const ownCycle = weight >= DEATH_BASELINE_MIN_N && miss / weight < DEATH_BASELINE_MISS;
    const after = sortedKeys(stats.next_after).filter((end) => end !== "?");
    // The move model already makes it after every one of those end moves: nothing to change.
    const changesModel = after.some((end) => {
      const successors = moves?.[end]?.next;
      const total = Object.values(successors ?? {}).reduce((sum, n) => sum + count(n), 0);
      return moves !== undefined && (total === 0 || count(successors?.[top[0]]) < DEATH_MODEL_SHARE * total);
    });
    if ((ownMove(top[0]) || (weight >= DEATH_BASELINE_MIN_N && !ownCycle)) && changesModel) next = { move: top[0], count: top[1], n: nextN, after };
  }
  if (Object.keys(now).length === 0 && !next) return null;
  const ruleMoves = [...new Set([...Object.values(now).map((entry) => entry.move), ...(next ? [next.move] : [])])].sort();
  const aliveOnly = count(stats.dead?.turns) >= DEATH_ALIVE_MIN_TURNS ? sortedKeys(stats.alive?.moves).filter((move) => move !== "?" && count(stats.dead?.moves?.[move]) === 0) : [];
  return {
    monster, ally, n: count(stats.n), fights: count(stats.fights), now, next, exclusive: ruleMoves.filter(ownMove), aliveOnly, aliveTurns,
    evidence: [...new Set([...(stats.changed_evidence ?? []), ...(stats.next_evidence ?? [])])].slice(0, 3),
  };
}

/** Every learned death rule, by survivor monster id, from the monsters' `observed.ally_deaths` (empty without them). */
export function deathRules(monsters: Record<string, { observed?: ObservedMonster; moves?: Record<string, { next?: Record<string, number> } | undefined> } | undefined> | undefined | null): Map<string, DeathRule[]> {
  const out = new Map<string, DeathRule[]>();
  for (const monster of sortedKeys(monsters ?? {})) {
    const table = monsters![monster]?.observed?.ally_deaths;
    const rules = sortedKeys(table).map((ally) => deathRuleOf(monster, ally, table![ally], monsters![monster]?.moves ?? {})).filter((rule): rule is DeathRule => rule !== null);
    if (rules.length > 0) out.set(monster, rules);
  }
  return out;
}

/** The death rules of a loaded monster DB. */
export function deathRulesOf(db: Pick<MonsterDb, "monsters"> | null | undefined): Map<string, DeathRule[]> {
  return deathRules(db?.monsters);
}

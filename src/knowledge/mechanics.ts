/**
 * Observed mechanics (docs/mechanics-learning.md; Dai 2026-10-02): rules the game's text does not state, mined from the
 * logs by tools/build-monster-db.py into monster-db.json `observed`, refreshed with the DB after every run. Nothing here
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

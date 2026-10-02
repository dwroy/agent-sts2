/**
 * Observed mechanics (docs/mechanics-learning.md; Dai 2026-10-02): rules the game's text does not state, mined from the
 * logs by tools/build-monster-db.py into monster-db.json `observed`, refreshed with the DB after every run. Nothing here
 * names an enemy or a power: a rule is whatever the counts say, and any power meeting the thresholds gets it.
 *
 * The first rule class the simulator uses is "stunned when a power is stripped to 0": the Thieving Hopper's Flutter says
 * only 「从攻击牌中受到的伤害减少50%」, yet the logs show every strip of its last stack on our turn stunning it (move
 * STUNNED) with that turn's move cancelled (MCK9SMSK40ZY F19 T4: Nab 14, no HP lost; XMY29WWQDC1Y F19 T5: the Escape
 * delayed to T6). MECH_RULES (config) switches its use in the turn solver, the rollout and the combat question.
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
}

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

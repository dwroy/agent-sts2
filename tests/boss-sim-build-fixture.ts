/**
 * A fixed monster DB and move model for tests/boss-sim-build.test.ts (B3), not the files every run refreshes: the three
 * bosses the one-shot fixture boards head for (Soul Fysh A9 on xljq-f5-reward, the Kaiser Crab on u6ru-f22-shop, the
 * Kin on 7b0d-f8-rest) as small, beatable stand-ins with the shapes that matter (several parts, a half-way median HP,
 * two first moves for two copies, a minion power, a power seen on turn 1 that is ours).
 */
import type { MonsterDb, MonsterEntry } from "../src/knowledge/monster-db.js";
import type { MoveModelData } from "../src/strategy/rollout.js";

const hp = (median: number, n = 10) => ({ "8": { min: Math.floor(median), median, max: Math.ceil(median), n } });
const attack = (damage: number, first: number, next: Record<string, number>) => ({
  intents: { Attack: 10 },
  turns_seen: { "1": first, "2": 5 },
  next,
  damage_by_asc: { "8": { base_per_hit: { [String(damage)]: 10 }, hits: { "1": 10 }, shown: { [`${damage}x1`]: 10 } } },
});
const buff = (first: number, next: Record<string, number>) => ({ intents: { Buff: 10 }, turns_seen: { "1": first }, next, self_powers_gained: { STRENGTH_POWER: { "2": 10 } }, self_powers_gained_by_asc: { "8": { STRENGTH_POWER: { "2": 10 } } } });
const onTurn1 = (amount: number, fights = 10) => ({ amount_at_first_sight_by_asc: { "8": { [String(amount)]: fights } }, turn_at_first_sight_by_asc: { "8": { "1": fights } } });

const monsters: Record<string, MonsterEntry> = {
  SOUL_FYSH: {
    name: { zh: "测试鱼" },
    hp_by_asc: hp(70),
    moves: { BITE_MOVE: attack(9, 10, { GROW_MOVE: 10 }), GROW_MOVE: buff(0, { BITE_MOVE: 10 }) },
    // Vulnerable first seen on turn 1 in every fight: ours (Bag of Marbles, a Bash), never the boss's own.
    powers: { VULNERABLE_POWER: onTurn1(1), ARTIFACT_POWER: onTurn1(1) },
  },
  CRUSHER: {
    name: { zh: "碾碎爪" },
    hp_by_asc: hp(40),
    moves: { THRASH_MOVE: attack(6, 10, { THRASH_MOVE: 10 }) },
    powers: { BACK_ATTACK_LEFT_POWER: onTurn1(1), CRAB_RAGE_POWER: onTurn1(1) },
  },
  ROCKET: {
    name: { zh: "火箭" },
    hp_by_asc: hp(38),
    moves: { LASER_MOVE: attack(7, 10, { LASER_MOVE: 10 }) },
    powers: { BACK_ATTACK_RIGHT_POWER: onTurn1(1), CRAB_RAGE_POWER: onTurn1(1) },
  },
  KIN_FOLLOWER: {
    name: { zh: "同族信徒" },
    hp_by_asc: hp(12.5, 20),
    moves: { POWER_DANCE_MOVE: buff(10, { QUICK_SLASH_MOVE: 10 }), QUICK_SLASH_MOVE: attack(3, 10, { POWER_DANCE_MOVE: 10 }) },
    powers: { MINION_POWER: onTurn1(1) },
  },
  KIN_PRIEST: {
    name: { zh: "同族神官" },
    hp_by_asc: hp(40),
    moves: { BEAM_MOVE: attack(6, 10, { BEAM_MOVE: 10 }) },
    powers: {},
  },
};

const boss = (parts: Record<string, number>) => ({ "8": { fights: 10, parts: Object.fromEntries(Object.entries(parts).map(([id, count]) => [id, { ...monsters[id]!.hp_by_asc!["8"]!, count_per_fight: count }])) } });

export const FIXTURE_DB: MonsterDb = {
  bosses: { SOUL_FYSH: boss({ SOUL_FYSH: 1 }), KAISER_CRAB: boss({ CRUSHER: 1, ROCKET: 1 }), THE_KIN: boss({ KIN_PRIEST: 1, KIN_FOLLOWER: 2 }) },
  encounters: {},
  monsters,
};

export const FIXTURE_MM: MoveModelData = {
  SOUL_FYSH: { damage: { BITE_MOVE: 9, GROW_MOVE: 0 }, next: { BITE_MOVE: { GROW_MOVE: 1 }, GROW_MOVE: { BITE_MOVE: 1 } } },
  CRUSHER: { damage: { THRASH_MOVE: 6 }, next: { THRASH_MOVE: { THRASH_MOVE: 1 } } },
  ROCKET: { damage: { LASER_MOVE: 7 }, next: { LASER_MOVE: { LASER_MOVE: 1 } } },
  KIN_FOLLOWER: { damage: { POWER_DANCE_MOVE: 0, QUICK_SLASH_MOVE: 3 }, next: { POWER_DANCE_MOVE: { QUICK_SLASH_MOVE: 1 }, QUICK_SLASH_MOVE: { POWER_DANCE_MOVE: 1 } } },
  KIN_PRIEST: { damage: { BEAM_MOVE: 6 }, next: { BEAM_MOVE: { BEAM_MOVE: 1 } } },
} as unknown as MoveModelData;

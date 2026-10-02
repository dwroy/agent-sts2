/**
 * A random enemy with one enemy to hit is no chance (ops 2026-10-02, X7BX5DYHFZ3N F48: Juggernaut's hit "on a random enemy"
 * against the lone boss kept the early reload off). Read by the SL judge (judge.ts midTurnRisks: relics and powers acting by
 * chance) and the turn planner's least-loss facts (combat-plan leastLossFactsFor: Juggernaut, Kusarigama, Hellraiser, a card
 * hitting a random enemy). Its own module: the judge reads the planner and the planner the judge.
 */
import type { GameState } from "../mod/schema.js";
import { asArray, asRecord } from "../util/json.js";

const RANDOM = /随机|random/i;
/** "A random enemy" as the game's texts say it (对随机敌人, 随机对一名敌人, 对一名随机敌人, 随机一名敌人, 给予随机敌人, 随机对敌人...). */
const RANDOM_ENEMY = /随机(?:对|给予)?(?:一名|一个)?敌人|(?:对|给予)(?:一名|一个)?随机(?:一名|一个)?敌人|(?:a )?random enem(?:y|ies)|enemies at random/gi;

/**
 * The text's only chance is which enemy it hits (Juggernaut's 「对随机敌人造成6点伤害」, Kusarigama's 「就随机对一名敌人造成」,
 * Sword Boomerang's 「随机对敌人造成3点伤害3次」, Tingsha's 「对一名随机敌人」): with one enemy that can be hit, certain (Dai
 * 2026-10-02: SL judges only what is certain). Anything else random in it is still chance (Stampede's 「随机打出你手牌中的1张
 * 攻击牌攻击随机敌人」: which Attack).
 */
export function randomTargetOnly(text: string): boolean {
  return RANDOM.test(text) && !RANDOM.test(text.replace(RANDOM_ENEMY, ""));
}

/** The enemies a random hit can land on: living and hittable. */
export function randomTargets(state: GameState): number {
  return asArray(asRecord(state.raw["combat"])["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false && enemy["is_hittable"] !== false).length;
}

/**
 * Expected HP cost of map rooms and the chance of coming out of one alive, shared by route scoring
 * (screens/map.ts), the run intents' route weights (intent.ts mapShift) and the event HP guard.
 */

/**
 * HP fraction of max HP a hallway fight costs, by act: the 75th percentile of the net loss (after
 * Burning Blood) of logged A8 fights, so a route is priced at a bad-but-common fight, not the median.
 * A8 logs (decisions.jsonl, fight-plans.jsonl kind, 2026-09-28): act 1 hallways n=219, median 5, mean
 * 6.4, p75 11, p90 17 HP of 80 -> 0.14 (was 0.10; N7KR F4-F7 lost 6/11/28, K7G9 act 1 averaged 12.3
 * before the heal); act 2 hallways n=148, p75 19 (0.24; 0.22 kept); act 1 elites p75 29 (0.36, x2.5 =
 * 0.35); act 2 elites p75 41 (0.51, x2.5 = 0.55).
 * Earlier: A7 measured 12.5 HP a hallway fight; act 3 hallways ~0.33 max HP each in 1LJF and SUUK.
 */
export const FIGHT_HP_COST_BY_ACT = [0.14, 0.22, 0.28];
/** Share of a hallway fight's HP cost a "?" room carries (some are fights, some events cost HP). */
export const UNKNOWN_HP_SHARE = 0.4;
/** Elites x2.5: at A4 an act-1 elite cost ~43 HP where x2 priced 16 (BHMP F11 Bygone Effigy). */
export const ELITE_HP_COST_FACTOR = 2.5;

export function fightHpCost(type: string, act: number): number {
  const base = FIGHT_HP_COST_BY_ACT[Math.min(Math.max(act, 1), FIGHT_HP_COST_BY_ACT.length) - 1]!;
  return type === "Elite" ? base * ELITE_HP_COST_FACTOR : type === "Monster" ? base : 0;
}

/** Expected HP cost of a room of this type ("?" at its share of a hallway fight). */
export function roomHpCost(type: string, act: number): number {
  if (type === "Unknown") return UNKNOWN_HP_SHARE * fightHpCost("Monster", act);
  return fightHpCost(type, act);
}

/** Standard normal CDF (Abramowitz-Stegun 7.1.26 through erf). */
function phi(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/**
 * Chance to come out of a fight alive, entering at `hp` (fraction of max HP) against a fight whose
 * priced cost is `cost` (the p75 loss above). The logged losses put the median near 0.6 of the p75 and
 * the p90 near 1.4x it: survival = Phi((hp/cost - 0.6) / 0.6), 0.5 at 0.6 x cost, 0.75 at the cost,
 * 0.95 at 1.6 x cost.
 */
export function fightSurvival(hp: number, cost: number): number {
  if (cost <= 0) return 1;
  if (hp <= 0) return 0;
  return phi((hp / cost - 0.6) / 0.6);
}

/** Chance to leave a room of this type alive ("?": a hallway fight UNKNOWN_HP_SHARE of the time). */
export function roomSurvival(type: string, hp: number, act: number): number {
  if (type === "Monster" || type === "Elite") return fightSurvival(hp, fightHpCost(type, act));
  if (type === "Unknown") return 1 - UNKNOWN_HP_SHARE * (1 - fightSurvival(hp, fightHpCost("Monster", act)));
  return 1;
}

/**
 * Expected HP cost of map rooms and the chance of coming out of one alive, shared by route scoring
 * (screens/map.ts), the run intents' route weights (intent.ts mapShift) and the event HP guard.
 */

/**
 * HP fraction of max HP a room's fight costs, by act: the 75th percentile of the net loss (after
 * Burning Blood; a death counts as the whole HP brought in) of the logged A8 fights, so a route is
 * priced at a bad-but-common fight, not the median. The p75 is bagged (mean over 2000 bootstrap
 * resamples) so a small sample's one fight does not set it; fewer than 20 fights keep the prior.
 * Rooms are typed by the map node entered.
 *
 * A8 logs, 69 runs, 2026-09-26..28 (states.jsonl: HP at the first combat state vs the reward screen;
 * room type from the map's current node or the map/route decision), median / p75 (bagged, 90% CI) / p90:
 *   hallway   act 1 n=386 0.05 / 0.11 (0.10-0.13) / 0.19;  act 2 n=201 0.15 / 0.24 (0.23-0.26) / 0.34;
 *             act 3 n=24 0.19 / 0.31 (0.22-0.39) / 0.42
 *   "?" fight act 1 n=56 0.06 / 0.14 (0.10-0.19) / 0.21;  act 2 n=35 0.18 / 0.27 (0.20-0.41) / 0.42;
 *             act 3 n=12: too few, the hallway's
 *   elite     act 1 n=48 0.28 / 0.37 (0.33-0.43) / 0.51;  act 2 n=33 0.43 / 0.59 (0.44-0.66) / 0.67;
 *             act 3 n=5: too few, 0.70 kept
 * The median is ~0.6 of the p75 wherever n >= 20, as fightSurvival assumes. Was 0.14 / 0.22 / 0.28 with
 * elites at x2.5 (0.35 / 0.55 / 0.70): act-2 hallways and act-1/2 elites were priced low (PWSD, KGR6,
 * EGX7 post-mortems: act-2 hallways 13-55 HP of 80, act-1 elites 40-61%), act-1 hallways high. The last
 * 20 A8 runs alone: act-1 hallway 0.10, act-2 0.26, act-1 elite 0.50, act-2 elite 0.62 (n 117/52/13/9).
 */
export const FIGHT_HP_COST_BY_ACT = [0.11, 0.24, 0.31];
export const ELITE_HP_COST_BY_ACT = [0.37, 0.59, 0.7];
/** A "?" room that opens a fight: p75 of those fights' net loss. */
export const UNKNOWN_FIGHT_COST_BY_ACT = [0.14, 0.27, 0.31];
/**
 * Share of "?" rooms entered that were fights (A8 logs: act 1 56 of 244, act 2 35 of 136, act 3 12 of
 * 35). The others (events) cost ~0 HP at the median; their p75 over all "?" rooms is 0.02 / 0.07 / 0.08,
 * about this share times the fight's cost.
 */
export const UNKNOWN_FIGHT_SHARE_BY_ACT = [0.23, 0.26, 0.34];

const byAct = (table: number[], act: number): number => table[Math.min(Math.max(act, 1), table.length) - 1]!;

export function fightHpCost(type: string, act: number): number {
  return type === "Elite" ? byAct(ELITE_HP_COST_BY_ACT, act) : type === "Monster" ? byAct(FIGHT_HP_COST_BY_ACT, act) : 0;
}

/** How many hallway fights an elite costs this act (the chain penalty scales by it). */
export function eliteCostFactor(act: number): number {
  return fightHpCost("Elite", act) / fightHpCost("Monster", act);
}

/** Expected HP cost of a room of this type ("?" at its share of fights times a "?" fight's cost). */
export function roomHpCost(type: string, act: number): number {
  if (type === "Unknown") return byAct(UNKNOWN_FIGHT_SHARE_BY_ACT, act) * byAct(UNKNOWN_FIGHT_COST_BY_ACT, act);
  return fightHpCost(type, act);
}

/**
 * The median fight loss is ~0.6 of its p75 (the table above, wherever n >= 20). HP is projected along a
 * route at the median, room by room; the p75 stays the tail input of each fight's survival
 * (fightSurvival). Chaining the p75 over 7-8 rooms drove every act-2 route to 0 HP before its last rest
 * (Z49J F18, 77UJ F18-F28, 77QX F18: "~30% HP at the F33 boss, alive ~0%" on every option).
 */
export const MEDIAN_OF_P75 = 0.6;

/** HP a room takes off the projection along a route: its expected cost (roomHpCost) at the median. */
export function roomProjectedCost(type: string, act: number): number {
  return MEDIAN_OF_P75 * roomHpCost(type, act);
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

/** Chance to leave a room of this type alive ("?": a "?" fight UNKNOWN_FIGHT_SHARE of the time). */
export function roomSurvival(type: string, hp: number, act: number): number {
  if (type === "Monster" || type === "Elite") return fightSurvival(hp, fightHpCost(type, act));
  if (type === "Unknown") return 1 - byAct(UNKNOWN_FIGHT_SHARE_BY_ACT, act) * (1 - fightSurvival(hp, byAct(UNKNOWN_FIGHT_COST_BY_ACT, act)));
  return 1;
}

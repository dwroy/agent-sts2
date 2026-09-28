/**
 * Expected HP cost of map rooms and the chance of coming out of one alive, shared by route scoring
 * (screens/map.ts) and the event HP cautions (screens/event.ts).
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
 * Re-measured 2026-09-28 over 105 A8 runs (a fight ends when in_combat does, not at a mid-fight card
 * selection; a death is the run ending in it), net p75: hallway 0.11 / 0.26, "?" fight 0.14 / 0.24, elite
 * 0.38 / 0.62 (acts 1 / 2): inside the intervals above, kept.
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
 * A fight's in-fight (gross) loss, as a multiple of its priced cost: median SURVIVAL_LOSS_MEDIAN, spread
 * SURVIVAL_LOSS_SPREAD (normal). Death is that loss reaching the HP brought in; Burning Blood heals only
 * after the fight, so the net median the route projects (MEDIAN_OF_P75) is lower.
 *
 * Fit by maximum likelihood to the deaths of the logged A8 act-2 hallway and "?" fights by the HP brought
 * in (105 runs to 2026-09-28, 347 fights, 22 deaths; a death is the run ending in that fight). Observed
 * vs predicted deaths by entry HP (n): <20% 7 vs 7.4 (12), 20-30% 4 vs 4.3 (11), 30-40% 5 vs 4.1 (20),
 * 40-50% 5 vs 2.7 (30), 50-60% 1 vs 1.0 (36), 60%+ 0 vs 0.5 (238). The old 0.6 / 0.6 (the net loss's
 * median / spread) predicted 5.8 / 2.5 / 1.5 / 0.6 / 0.1 / 0.0: a third of the deaths, ~94% alive at
 * 30-40% HP where 75% lived (ZW9S F22 at 30/80, TD8A F25 at 33/80). The same curve holds for act-1
 * hallways (1 death vs 1.0 predicted over 665) and elites (act 1: 5 vs 4.4; act 2: 11 vs 13.5); its
 * implied gross loss, median 0.85 x cost and p75 1.36 x cost, is the logged gross loss of act-2
 * hallways (0.23 / 0.31 of max HP vs 0.20 / 0.33).
 */
export const SURVIVAL_LOSS_MEDIAN = 0.85;
export const SURVIVAL_LOSS_SPREAD = 0.75;

/**
 * Chance to come out of a fight alive, entering at `hp` (fraction of max HP) against a fight whose
 * priced cost is `cost` (the p75 net loss above): Phi((hp/cost - 0.85) / 0.75), 0.5 at 0.85 x cost,
 * ~0.58 at the cost, ~0.94 at 2 x cost.
 */
export function fightSurvival(hp: number, cost: number): number {
  if (cost <= 0) return 1;
  if (hp <= 0) return 0;
  return phi((hp / cost - SURVIVAL_LOSS_MEDIAN) / SURVIVAL_LOSS_SPREAD);
}

/** Chance to leave a room of this type alive ("?": a "?" fight UNKNOWN_FIGHT_SHARE of the time). */
export function roomSurvival(type: string, hp: number, act: number): number {
  if (type === "Monster" || type === "Elite") return fightSurvival(hp, fightHpCost(type, act));
  if (type === "Unknown") return 1 - byAct(UNKNOWN_FIGHT_SHARE_BY_ACT, act) * (1 - fightSurvival(hp, byAct(UNKNOWN_FIGHT_COST_BY_ACT, act)));
  return 1;
}

/** Inverse of the standard normal CDF (Acklam's rational approximation, |error| < 1.2e-9). */
function phiInverse(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const q = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
  if (q < 0.02425) {
    const r = Math.sqrt(-2 * Math.log(q));
    return (((((c[0]! * r + c[1]!) * r + c[2]!) * r + c[3]!) * r + c[4]!) * r + c[5]!) / ((((d[0]! * r + d[1]!) * r + d[2]!) * r + d[3]!) * r + 1);
  }
  if (q > 1 - 0.02425) return -phiInverse(1 - q);
  const r = q - 0.5;
  const s = r * r;
  return ((((((a[0]! * s + a[1]!) * s + a[2]!) * s + a[3]!) * s + a[4]!) * s + a[5]!) * r) / (((((b[0]! * s + b[1]!) * s + b[2]!) * s + b[3]!) * s + b[4]!) * s + 1);
}

/**
 * Outcomes a fight leaves alive, each with its weight (they sum to fightSurvival): the gross loss
 * fightSurvival implies, clamped at 0, below the HP brought in, cut into FIGHT_OUTCOMES equal slices of
 * the surviving mass; each leaves the HP less that loss plus what the fight gives back after it (the
 * gross median less the net median the route projects, (0.85 - 0.6) x cost: Burning Blood), never more
 * than it came in with. A route's survival is the chance of getting through every room with the HP each
 * earlier room leaves, not each room at the median HP (TD8A, ZW9S, CRY9: two or three act-2 fights in a
 * row read ~90% alive at the median, while their losses add up). Losses of one run's act-2 fights are
 * not correlated with each other (r = -0.07 over the logged runs), so rooms are independent.
 */
export const FIGHT_OUTCOMES = 5;
export function fightOutcomes(hp: number, cost: number): { hp: number; w: number }[] {
  if (cost <= 0) return [{ hp, w: 1 }];
  const alive = fightSurvival(hp, cost);
  if (alive <= 0) return [];
  const atZero = phi(-SURVIVAL_LOSS_MEDIAN / SURVIVAL_LOSS_SPREAD);
  const back = (SURVIVAL_LOSS_MEDIAN - MEDIAN_OF_P75) * cost;
  const out: { hp: number; w: number }[] = [];
  for (let k = 0; k < FIGHT_OUTCOMES; k += 1) {
    const u = (alive * (k + 0.5)) / FIGHT_OUTCOMES;
    const loss = u <= atZero ? 0 : cost * (SURVIVAL_LOSS_MEDIAN + SURVIVAL_LOSS_SPREAD * phiInverse(u));
    out.push({ hp: Math.min(hp, Math.max(0, hp - loss) + back), w: alive / FIGHT_OUTCOMES });
  }
  return out;
}

/**
 * Outcomes a room leaves alive, HP change only (a rest's heal and a shop's gold are the caller's): a
 * fight's (fightOutcomes), a "?" room as an event UNKNOWN_FIGHT_SHARE of the time costing nothing and
 * otherwise a "?" fight; other rooms leave the HP as it is.
 */
export function roomOutcomes(type: string, hp: number, act: number): { hp: number; w: number }[] {
  if (type === "Monster" || type === "Elite") return fightOutcomes(hp, fightHpCost(type, act));
  if (type === "Unknown") {
    const share = byAct(UNKNOWN_FIGHT_SHARE_BY_ACT, act);
    return [{ hp, w: 1 - share }, ...fightOutcomes(hp, byAct(UNKNOWN_FIGHT_COST_BY_ACT, act)).map((outcome) => ({ hp: outcome.hp, w: share * outcome.w }))];
  }
  return [{ hp, w: 1 }];
}

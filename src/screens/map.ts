/**
 * Route choice (PLAN.md §6.2): code enumerates the lookahead from each reachable node, Jev picks.
 *
 * Node weights shift with the Run Brief — elites are worth more with a healthy deck and high HP,
 * rests more when HP is low, shops more when there is gold to spend and a card worth removing.
 */

import { asArray, asRecord, bool, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { currentRunPlan, floorsToBoss } from "../strategy/run-plan.js";
import { isReserved, LABEL_NOTE, mapFit, mapShift, RESERVE_RELEASE_HP, routeRiskAt, routeRiskFilter, type EliteGate, type RouteArrival } from "../strategy/intent.js";
import { actEliteNeed } from "../knowledge/dossiers.js";
import { damageGap, deckDamagePerTurn, type DamageGap } from "../strategy/boss-clock.js";
import { routeFacts, routeFactsText, type RouteNode } from "../strategy/route-facts.js";
import { eliteCostFactor, fightHpCost, roomProjectedCost, roomSurvival } from "../strategy/route-cost.js";
import { isModelledPotion, potionRegen, regenHealHp } from "../strategy/card-model.js";

export { eliteCostFactor, fightHpCost } from "../strategy/route-cost.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import type { GameState } from "../mod/schema.js";
import { buildPickDecision, type PickOption } from "./pick.js";

interface MapNode {
  row: number;
  col: number;
  type: string;
  children: { row: number; col: number }[];
  parents?: { row: number; col: number }[];
  visited?: boolean;
}

const key = (row: number, col: number): string => `${row},${col}`;

/**
 * Share of max HP a heal potion in the belt restores, drinkable before or during the next fight (RVL2
 * F26: 14/74 with a Blood Potion, 20% max HP, measured 25 -> 39 at F30; counted as 19% the Monster
 * route was a "likely death" and the rest line into a forced elite won).
 */
export const HEAL_POTION_SHARE: Record<string, number> = { BLOOD_POTION: 0.2 };
/**
 * Our turn ends a Regen Potion's heal is counted over on the route: a hallway fight's typical length
 * (Regen 5: 5+4+3+2 = 14 HP; PKB0 F17 T8 REGEN_POWER 5).
 */
export const REGEN_ROUTE_TURNS = 4;

/** HP a heal potion restores (Blood Potion 20% of max HP, Regen Potion over REGEN_ROUTE_TURNS turns). */
export function potionHealHp(potionId: string, maxHp: number): number {
  const regen = potionRegen(potionId);
  if (regen > 0) return regenHealHp(regen, REGEN_ROUTE_TURNS);
  return Math.floor((HEAL_POTION_SHARE[potionId] ?? 0) * maxHp);
}

/**
 * Heal a potion adds to the route's HP, as a share of max HP: only one the fights drink by their numbers
 * (card-model POTION_EFFECTS). EN55 F7: an unmodelled Blood Potion read 51% as ~71% and the optional
 * elite was taken; in the fight it stayed "its effect is in no line's numbers" until 7 HP. The Regen
 * Potion counts since it is modelled (PKB0).
 */
export function routeHealShare(potionId: string, maxHp = 80): number {
  if (!isModelledPotion(potionId) || maxHp <= 0) return 0;
  const regen = potionRegen(potionId);
  return regen > 0 ? potionHealHp(potionId, maxHp) / maxHp : HEAL_POTION_SHARE[potionId] ?? 0;
}

/**
 * HP fraction for route projection, modelled heal potions in the belt included (`withHeal`). Not one the
 * run plan reserves for the act boss while HP is above the reserve's release line: it is not drunk
 * before then (Z7D7 F25: the Blood Potion kept for the boss read 50/80 as 82%, the elite after a shop was
 * priced like one after a rest).
 */
export function hpPercent(env: DecisionEnv, withHeal = true): number {
  const hp = env.state.run?.current_hp ?? null;
  const max = env.state.run?.max_hp ?? null;
  if (hp === null || max === null || max <= 0) return 1;
  if (!withHeal) return Math.min(1, hp / max);
  const reserve = currentRunPlan(env.screenMemory, env.state)?.reserve;
  const held = (potion: Record<string, unknown>) => hp / max >= RESERVE_RELEASE_HP && isReserved(reserve, str(potion["potion_id"]), str(potion["description"]));
  const potions = asArray(asRecord(env.state.run?.raw)["potions"]).map(asRecord);
  const heal = potions.reduce((sum, potion) => sum + (bool(potion["occupied"], true) && !held(potion) ? routeHealShare(str(potion["potion_id"]), max) : 0), 0);
  return Math.min(1, hp / max + heal);
}

/** Projected state on arrival at a node: HP fraction and gold. */
interface RouteState {
  hp: number;
  gold: number;
  /** Hallway/elite fights in a row so far, with no rest, shop or "?" between them. */
  fights: number;
}

/**
 * A chain of hallway fights with no rest, shop or "?" between them is what killed QE4K, XJWF (both at
 * F22 after four forced Act 2 fights, 80/80 -> 18 and 92 -> 41) and MD3F (five in Act 3, 87 -> 16);
 * every time the fork before it had a route with a RestSite, Shop or Unknown. The 3rd fight in a row
 * and every one after it costs this much, up to twice as much as projected HP falls below 60%.
 */
export const FIGHT_CHAIN_PENALTY = 1.5;
export function fightChainPenalty(fightsBefore: number, hpOnArrival: number): number {
  if (fightsBefore < 2) return 0;
  return FIGHT_CHAIN_PENALTY * (1 + Math.min(1, Math.max(0, 0.6 - hpOnArrival) / 0.3));
}

/**
 * Hallway fights are worth a little (cards, gold) only while there is HP to pay for them. MD3F walked
 * five Act 3 hallway fights at a flat +1.2 each and died at 16 HP holding 307 gold: below half HP on
 * arrival a fight is worth nothing, and below 35% it is a cost.
 */
export function monsterWeight(hpOnArrival: number): number {
  if (hpOnArrival >= 0.5) return 1.2;
  if (hpOnArrival >= 0.35) return (1.2 * (hpOnArrival - 0.35)) / 0.15;
  return Math.max(-4, (-3 * (0.35 - hpOnArrival)) / 0.15);
}

/**
 * A hallway fight's extra worth while the deck is well short of the act boss (acts 1-2): each one is a
 * card reward toward the gap. Proportional to the gap's share of the need (nothing under
 * GAP_FIGHT_MIN_SHARE, full at GAP_FIGHT_FULL_SHARE) and to HP safety: the HP a bad (p75) hallway fight
 * leaves above GAP_FIGHT_HP_FLOOR, full once that is another such fight's worth. 11LC (act 1, gap 13 of
 * 28 a turn, 50/80): code took '?' over a hallway four times (F3 28.9 vs 26.4, F4, F5, F11), 5 of 7 '?'
 * were events, 6 fights and 6 card picks in the act; the Waterfall Giant was fought at ~25 a turn.
 */
export const GAP_FIGHT_MAX = 3;
export const GAP_FIGHT_MIN_SHARE = 0.25;
export const GAP_FIGHT_FULL_SHARE = 0.5;
export const GAP_FIGHT_HP_FLOOR = 0.4;
export function gapFightBonus(gap: DamageGap | null, hpOnArrival: number, act: number): number {
  if (!gap || act > 2 || gap.need <= 0) return 0;
  const share = gap.gap / gap.need;
  if (share < GAP_FIGHT_MIN_SHARE) return 0;
  const size = Math.min(1, share / GAP_FIGHT_FULL_SHARE);
  const cost = fightHpCost("Monster", act);
  const safety = Math.min(1, Math.max(0, (hpOnArrival - cost - GAP_FIGHT_HP_FLOOR) / cost));
  return GAP_FIGHT_MAX * size * safety;
}

/**
 * HP (heal potions out) an optional elite needs: twice the act's elite cost, so that a bad elite fight
 * still leaves one elite's cost (act 1: 74%). Capped at 90% where twice the cost is more than full HP
 * (acts 2-3). EN55 F7: 51% HP (71% with an unmodelled Blood Potion) took the optional Terror Eel.
 */
export const OPTIONAL_ELITE_HP_FACTOR = 2;
export const OPTIONAL_ELITE_HP_CAP = 0.9;
export function optionalEliteBar(act: number): number {
  return Math.min(OPTIONAL_ELITE_HP_CAP, OPTIONAL_ELITE_HP_FACTOR * fightHpCost("Elite", act));
}

/** Weight of a fight reached with no more HP than it is expected to cost (at exactly that HP). */
export const LIKELY_DEATH = -20;

/**
 * A likely death scales with the HP shortfall, down to 2 x LIKELY_DEATH at 0 HP: a route that reaches
 * the forced elite at 46% (cost 55%) is not the same death as one reaching it at 33% (NJSZ F29), and one
 * reaching the F45 elite at 44% of a 70% cost is not the same as dying in the hallway now (K7G9 F43,
 * RVR6 F38).
 */
export function likelyDeathWeight(hpPct: number, cost: number): number {
  return LIKELY_DEATH * (1 + Math.min(1, Math.max(0, cost - hpPct) / Math.max(cost, 0.01)));
}

/**
 * A likely death k nodes ahead weighs (1 - 0.1 (k - 1)) of one at the next node, at least half: the
 * first likely death further down the route is the better one (RVR6 F38: at 15/80 "die in the hallway
 * now" scored above "? -> shop -> chest -> forced elite").
 */
export function deathDelay(nodesAhead: number): number {
  return Math.max(0.5, 1 - 0.1 * (Math.max(1, nodesAhead) - 1));
}

/**
 * Route value per unit of the chance of dying on the survival stretch every option is priced over:
 * through the last forced elite any option must fight (the checkpoint every option shares, the first
 * floor where every path meets an elite, or an option's own) to the next rest after it, or to the boss.
 * K7G9 F43: "?" and a rest both led into the F45 Mecha Knight, 44% vs 86% on arrival, scored -28.7 vs
 * -29.0 before arrival HP at the shared elite was priced by survival.
 */
export const SURVIVAL_WEIGHT = 40;

/**
 * Winged Boots: a node off the current node's children spends one of its charges (the relic's `stack`).
 * RVR6 spent all three in act 1, two of them for +0.6 and +0.9 route value; one left at F38 would have
 * routed around the Frog Knight and the F42 forced elite. Off-path nodes cost BOOTS_CHARGE route value
 * in acts 1-2, the last charge BOOTS_LAST_CHARGE (kept for act 3), nothing in act 3.
 */
export const BOOTS_CHARGE = 3;
export const BOOTS_LAST_CHARGE = 6;
export function bootsCost(act: number, charges: number): number {
  if (act >= 3) return 0;
  return charges <= 1 ? BOOTS_LAST_CHARGE : BOOTS_CHARGE;
}

/** How much this node type is worth to *this* run, at the projected HP/gold on arrival. */
export function nodeWeight(type: string, hpPct: number, gold: number, floorInAct: number, act?: number): number {
  // A fight reached with no more HP than it is expected to cost is a likely death, not a -3.
  if ((type === "Elite" || type === "Monster") && act !== undefined && hpPct <= fightHpCost(type, act)) return likelyDeathWeight(hpPct, fightHpCost(type, act));
  switch (type) {
    case "Elite":
      // Below half HP an elite gets worse the lower HP is (K39J F28: Infested Prism at 21/80 scored -3,
      // the same as at 69%, above the monster path; T1 took 21 -> 6 and the run died on T3).
      if (hpPct < 0.5) return Math.max(-15, -3 - (12 * (0.5 - hpPct)) / 0.5);
      // Phase 2: no elites in the first floors of an act (the deck is still starter cards), and only
      // with HP to spare.
      if (floorInAct <= 4) return -3;
      // The elite right before the boss: only at near-full HP (BG4W F14: took it at 47/80, lost 33,
      // and went into the boss short after the rest).
      // From act 2 on the pre-boss elite costs the boss its entry HP and potions (UMX6 F31: Decimillipede
      // at 67/80, 26 left and both potions gone, crab entered at 50/80 with none; MK1N 52/80): only at
      // full HP, and never a draw toward it.
      if (floorInAct >= 12) return act !== undefined && act >= 2 ? (hpPct >= 0.95 ? 1 : -5) : hpPct > 0.8 ? 4 : -3;
      // Act 1 before the mid-act: the deck is still the starter one (CWMP F6 at A5: 61/87 into four
      // Phantasmal Gardeners with 2 non-basic cards; died in 7 turns). Only at near-full HP.
      if (act === 1 && floorInAct <= 7) return hpPct > 0.85 ? 2 : -3;
      // Optional elites mid-act only above 80% HP (UJS25 F24: took Swarm Caster at 58/80 under the old
      // 70% bar, fell to 8 HP and died two fights later; G8AQ died to the same elite). 70-80% is
      // neutral, below that a cost. Same at every ascension: from A1 on elites are more frequent anyway
      // (LEVEL_01), so there is no need to seek out extra ones.
      return hpPct > 0.8 ? 4 : hpPct > 0.7 ? 0 : -3;
    case "RestSite": // the game's name ("Rest" kept for older fixtures)
    case "Rest":
      return hpPct < 0.55 ? 5 : hpPct < 0.75 ? 2.5 : 1;
    case "Shop":
      // Low on HP a shop is worth no more than a rest: gold does not save a run that dies on the way
      // (2VW5 F26/F27: a 12-point shop beat a rest at 42/80 and 33/80, died at F28 holding 698 gold).
      return hpPct < 0.5 ? Math.min(shopWeight(gold, floorInAct, act), 4) : shopWeight(gold, floorInAct, act);
    case "Treasure":
      return 3;
    case "Unknown": // "?" rooms
    case "Event":
      return 1.8;
    case "Monster":
      return monsterWeight(hpPct);
    case "Boss":
      return 0;
    default:
      return 1;
  }
}

/**
 * Shop weight grows with gold, min(12, gold / 50), never below the old steps (8LQG reached the Act 1
 * boss with 565 gold, G6YV with 630 and an empty potion belt: the old cap of 6 lost to a rest at 10.2
 * vs 9.2). Late in Act 1 with 300+ gold, the boss is the next thing to spend it on: +3.
 */
export function shopWeight(gold: number, floorInAct: number, act?: number): number {
  const floor = gold >= 350 ? 6 : gold >= 200 ? 3.5 : gold >= 120 ? 2 : 0.8;
  const base = Math.max(floor, Math.min(12, gold / 50));
  return base + (act === 1 && floorInAct >= 10 && gold >= 300 ? 3 : 0);
}

/** Expected HP cost of a room: strategy/route-cost.ts (fightHpCost, roomHpCost). */
/** A rest heals 30% of max HP (the model assumes resting, not smithing, when projecting). */
const REST_HEAL = 0.3;
/** Rough gold from a fight; what is left after a shop visit. */
const FIGHT_GOLD: Record<string, number> = { Monster: 15, Elite: 30 };
const GOLD_AFTER_SHOP = 50;

/**
 * Projected state after a node. Later nodes are valued at the HP the route leaves, not at entry HP:
 * 0NG F27 took "Monster -> Elite" at 70% with the elite valued as if fought at 70%, and reached it at
 * 44/71. Rests heal and shops spend, so a fight behind a rest is valued at the healed HP. Rooms cost
 * their median (roomProjectedCost); each fight's survival is priced at its p75 (roomSurvival).
 */
function stateAfter(type: string, at: RouteState, act: number): RouteState {
  switch (type) {
    case "Monster":
    case "Elite":
      return { hp: Math.max(0, at.hp - roomProjectedCost(type, act)), gold: at.gold + (FIGHT_GOLD[type] ?? 0), fights: at.fights + 1 };
    case "RestSite":
    case "Rest":
      return { hp: Math.min(1, at.hp + REST_HEAL), gold: at.gold, fights: 0 };
    case "Shop":
      return { hp: at.hp, gold: Math.min(at.gold, GOLD_AFTER_SHOP), fights: 0 };
    case "Unknown":
      // A "?" room is often a fight or an HP event: it costs some HP and does not reset the fight chain
      // (4V5T F20: the lantern-key event fight cost 28 HP on a route priced as free).
      return { ...at, hp: Math.max(0, at.hp - roomProjectedCost("Unknown", act)) };
    case "Event":
      return { ...at, fights: 0 };
    default:
      return at;
  }
}

/** Node weight at a projected state; `row` gives the node's own floor (elite timing, floors to boss). */
/** `optional`: an Elite a sibling node avoids (the route could take the other one). */
type Weights = (type: string, at: RouteState, row: number, optional?: boolean) => number;

/** Whether this child of `parent` is an Elite another child avoids. */
function optionalEliteChild(parent: MapNode, child: MapNode, nodes: Map<string, MapNode>): boolean {
  return child.type === "Elite" && parent.children.some((other) => nodes.get(key(other.row, other.col))?.type !== "Elite");
}

/**
 * Each Elite that cannot be avoided after a route's likely death (PFBK F18: the truncation dropped
 * them, and a no-branch line with forced elites on F25/F27/F29 scored above routes with one; KEMS
 * F18). -15 each when the run plan says to avoid elites.
 */
export const FORCED_ELITE_AFTER_DEATH = 10;
export const FORCED_ELITE_AFTER_DEATH_AVOID = 15;

/** Fewest Elite nodes on any path from this node's children to the end of the map (memoised). */
function minElitesAhead(node: MapNode, nodes: Map<string, MapNode>, memo: Map<string, number>): number {
  const nodeKey = key(node.row, node.col);
  const cached = memo.get(nodeKey);
  if (cached !== undefined) return cached;
  let best = Infinity;
  for (const child of node.children) {
    const childNode = nodes.get(key(child.row, child.col));
    if (!childNode) continue;
    best = Math.min(best, (childNode.type === "Elite" ? 1 : 0) + minElitesAhead(childNode, nodes, memo));
  }
  const value = best === Infinity ? 0 : best;
  memo.set(nodeKey, value);
  return value;
}

const NO_ROWS: ReadonlySet<number> = new Set();

/** Best continuation value from a node reached in state `at`, memoised (the graph is a DAG in row order). */
function continuation(
  node: MapNode,
  at: RouteState,
  nodes: Map<string, MapNode>,
  weights: Weights,
  act: number,
  memo: Map<string, number>,
  deathElite = FORCED_ELITE_AFTER_DEATH,
  eliteMemo: Map<string, number> = new Map(),
  deathUrgency = 1,
  depth = 1,
  forcedRows: ReadonlySet<number> = NO_ROWS,
): number {
  const left = stateAfter(node.type, at, act);
  const nodeKey = `${key(node.row, node.col)}@${left.hp.toFixed(2)}/${Math.round(left.gold)}/${Math.min(left.fights, 2)}/${Math.min(depth, 6)}`;
  const cached = memo.get(nodeKey);
  if (cached !== undefined) return cached;
  // Children can all be negative (forced fights at low HP): the best of them, not 0.
  let best = -Infinity;
  for (const child of node.children) {
    const childNode = nodes.get(key(child.row, child.col));
    if (!childNode) continue;
    // A likely death ends the route: nothing after it counts (4UWK F22: at 9/80 the Unknown room into a
    // forced elite scored 15.4 on the rooms after the elite; the Monster -> Rest route -49.7), except
    // the elites it cannot avoid after it (PFBK F18).
    // A likely death further down counts with the same low-HP urgency as one at the next node: the max
    // over children dodges it where the map allows, so only a forced one keeps the penalty (RVL2 F26:
    // rest -> ? -> ? -> Monster -> forced Elite at a projected 9% scored -20, the Monster right now -60).
    // The death's weight scales with the HP shortfall and a later one weighs less (deathDelay).
    // An elite every path of this option meets is not a later, better death: no delay discount
    // (KGR6 F19: the F28 elite at the end of a branchless line counted at half weight, 9 nodes ahead).
    const here = weights(childNode.type, left, childNode.row, optionalEliteChild(node, childNode, nodes));
    const delay = childNode.type === "Elite" && forcedRows.has(childNode.row) ? 1 : deathDelay(depth + 1);
    best = Math.max(
      best,
      here <= LIKELY_DEATH
        ? here * deathUrgency * delay - deathElite * minElitesAhead(childNode, nodes, eliteMemo)
        : here + continuation(childNode, left, nodes, weights, act, memo, deathElite, eliteMemo, deathUrgency, depth + 1, forcedRows),
    );
  }
  if (best === -Infinity) best = 0;
  memo.set(nodeKey, best);
  return best;
}

/** Chance of arriving alive (and HP on arrival) at a checkpoint row; `inclusive` counts the checkpoint's own fight. */
interface Arrival {
  p: number;
  hp: number;
  row: number;
  /** Row of the first room whose projected cost takes the HP to 0 on this path (null: it never runs out). */
  ranOut?: number | null;
}

const isRest = (type: string): boolean => type === "RestSite" || type === "Rest";

/**
 * Where a projection stops: at `row` (its room's own survival counted when `inclusive`: a forced
 * elite; the boss is only arrived at), or earlier at the first rest past `restAfter`.
 */
interface Stop {
  row: number;
  inclusive: boolean;
  restAfter?: number;
}

/**
 * Best chance over the paths from `node` (entered at `at`) of getting through every room up to the stop
 * alive, with the projected HP there. HP is projected at the rooms' medians (stateAfter); each room's
 * survival is roomSurvival at that HP (its p75 as the tail), and a path's is their product: hallways, "?"
 * rooms and elites alike (77QX F18: the forced elite was charged in full, a chain of five hallways only
 * as discounted likely deaths).
 */
function arrivalAt(node: MapNode, at: RouteState, nodes: Map<string, MapNode>, act: number, target: Stop, memo: Map<string, Arrival>, avoidEliteAt?: (hp: number) => boolean): Arrival {
  const id = `${key(node.row, node.col)}@${at.hp.toFixed(3)}/${Math.min(at.fights, 2)}`;
  const cached = memo.get(id);
  if (cached) return cached;
  let value: Arrival;
  if (target.restAfter !== undefined && isRest(node.type) && node.row > target.restAfter && node.row < target.row) value = { p: 1, hp: at.hp, row: node.row };
  else if (node.row >= target.row) value = { p: target.inclusive ? roomSurvival(node.type, at.hp, act) : 1, hp: at.hp, row: node.row };
  else {
    const survive = roomSurvival(node.type, at.hp, act);
    const left = stateAfter(node.type, at, act);
    const ranOut = left.hp <= 0 && at.hp > 0 ? node.row : null;
    let best: Arrival | null = null;
    // A fork the run plan (or the elite gate) would take away from an optional elite is projected the
    // same way: the elite child is skipped while a sibling is not an elite (PCGH F25: (8,2) read "alive
    // ~53%" through the optional elite (10,3) that avoid_elites then filtered).
    const children = node.children.map((child) => nodes.get(key(child.row, child.col))).filter((child): child is MapNode => child !== undefined);
    const avoid = avoidEliteAt?.(left.hp) === true && children.some((child) => child.type !== "Elite");
    for (const childNode of avoid ? children.filter((child) => child.type !== "Elite") : children) {
      const next = arrivalAt(childNode, left, nodes, act, target, memo, avoidEliteAt);
      if (!best || next.p > best.p + 1e-9 || (Math.abs(next.p - best.p) <= 1e-9 && next.hp > best.hp)) best = next;
    }
    value = best ? { ...best, p: survive * best.p, ranOut: ranOut ?? best.ranOut ?? null } : { p: survive, hp: left.hp, row: node.row, ranOut };
  }
  memo.set(id, value);
  return value;
}

/**
 * HP on arrival at the first elite of every path, on the path that arrives with the most, or null when
 * some path meets no elite.
 */
function firstEliteArrival(node: MapNode, at: RouteState, nodes: Map<string, MapNode>, act: number, memo: Map<string, { hp: number; row: number } | null>): { hp: number; row: number } | null {
  if (node.type === "Elite") return { hp: at.hp, row: node.row };
  const id = `${key(node.row, node.col)}@${at.hp.toFixed(3)}/${Math.min(at.fights, 2)}`;
  if (memo.has(id)) return memo.get(id)!;
  const left = stateAfter(node.type, at, act);
  let best: { hp: number; row: number } | null = null;
  let avoidable = node.children.length === 0;
  for (const child of node.children) {
    const childNode = nodes.get(key(child.row, child.col));
    if (!childNode) continue;
    const next = firstEliteArrival(childNode, left, nodes, act, memo);
    if (!next) avoidable = true;
    else if (!best || next.hp > best.hp) best = next;
  }
  const value = avoidable ? null : best;
  memo.set(id, value);
  return value;
}

/** The first elite every path from these children meets, entered at `at` (null when some path meets none). */
function firstEliteArrivalFrom(children: MapNode[], at: RouteState, nodes: Map<string, MapNode>, act: number, memo: Map<string, { hp: number; row: number } | null>): { hp: number; row: number } | null {
  let best: { hp: number; row: number } | null = null;
  for (const child of children) {
    const next = firstEliteArrival(child, at, nodes, act, memo);
    if (!next) return null;
    if (!best || next.hp > best.hp) best = next;
  }
  return best;
}

/** Follow the highest-value children to describe where this choice leads. */
function pathPreview(node: MapNode, start: RouteState, nodes: Map<string, MapNode>, weights: Weights, act: number, steps: number): string {
  const types: string[] = [];
  let current = node;
  let at = start;
  for (let step = 0; step < steps; step += 1) {
    types.push(current.type);
    at = stateAfter(current.type, at, act);
    let bestChild: MapNode | null = null;
    let bestValue = -Infinity;
    for (const child of current.children) {
      const childNode = nodes.get(key(child.row, child.col));
      if (!childNode) continue;
      const value = weights(childNode.type, at, childNode.row, optionalEliteChild(current, childNode, nodes)) + continuation(childNode, at, nodes, weights, act, new Map());
      if (value > bestValue) {
        bestValue = value;
        bestChild = childNode;
      }
    }
    if (!bestChild) break;
    current = bestChild;
  }
  return types.join(" -> ");
}

/** Fights in a row that end at the current node, walking back through visited parents. */
function fightsSoFar(nodes: Map<string, MapNode>, current: unknown): number {
  const at = asRecord(current);
  let node = at["row"] === undefined ? undefined : nodes.get(key(num(at["row"]), num(at["col"])));
  let fights = 0;
  while (node && (node.type === "Monster" || node.type === "Elite" || node.type === "Treasure")) {
    if (node.type !== "Treasure") fights += 1;
    node = (node.parents ?? []).map((parent) => nodes.get(key(parent.row, parent.col))).find((parent) => parent?.visited);
  }
  return fights;
}

/** Arrival facts in words for a route option. */
function arrivalText(arrival: RouteArrival, survival: number | null): Record<string, JsonValue> {
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  return {
    ...(arrival.eliteHp !== null && arrival.eliteFloor !== null
      ? { next_forced_elite: `arrives at the F${arrival.eliteFloor} elite at ~${pct(arrival.eliteHp)} HP (an elite costs ~${pct(arrival.eliteCost)})` }
      : {}),
    ...(arrival.bossHp !== null && arrival.bossFloor !== null
      ? { boss_arrival: `~${pct(arrival.bossHp)} HP at the F${arrival.bossFloor} boss on the safest path, alive there ~${pct(arrival.bossSurvival ?? 1)} of the time` }
      : arrival.ranOutFloor !== undefined && arrival.bossFloor !== null
      ? { boss_arrival: `HP runs out at F${arrival.ranOutFloor} on its safest path before the F${arrival.bossFloor} boss (alive there ~${pct(arrival.bossSurvival ?? 0)} of the time)` }
      : {}),
    ...(survival !== null ? { survival_to_checkpoint: pct(survival) } : {}),
  };
}

export function planMap(env: DecisionEnv): Decision | null {
  const { state } = env;
  if (state.session.mode !== "singleplayer" && state.session.mode !== "multiplayer") return null;
  if (!state.available_actions.includes("choose_map_node")) return null;

  const map = asRecord(state.raw["map"]);
  // A recorded vote means "wait for the others", never "vote again" (PLAN.md §2.1 fact 6).
  if (map["local_vote"] !== null && map["local_vote"] !== undefined) return null;

  const available = asArray(map["available_nodes"]).map(asRecord);
  if (available.length === 0) return null;

  // Full potion slots with a guaranteed potion coming (White Beast Statue after every fight, Tiny
  // Mailbox at a rest): the reward screen cannot discard, so the new potion was silently dropped
  // (YVWA F35-F47: 10 potions lost, Strength, Fire, Regen, Ashwater among them). Free the weakest slot
  // here, where discarding is allowed, unless the weakest is still worth keeping.
  const relics = asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  const belt = asArray(asRecord(state.run?.raw)["potions"]).map(asRecord);
  const beltFull = belt.length > 0 && belt.every((slot) => bool(slot["occupied"]));
  const potionComing =
    (relics.includes("WHITE_BEAST_STATUE") && available.some((node) => ["Monster", "Elite", "Unknown", "Boss"].includes(str(node["node_type"])))) ||
    (relics.includes("TINY_MAILBOX") && available.some((node) => ["RestSite", "Rest"].includes(str(node["node_type"]))));
  if (beltFull && potionComing && state.available_actions.includes("discard_potion")) {
    // Not a potion the run plan keeps for the boss while another can go (HCBJ F11: Beetle Juice, a
    // block potion under reserve [strength, damage] read as damage, dropped for the Tiny Mailbox's).
    const reserve = currentRunPlan(env.screenMemory, state)?.reserve;
    const discardable = belt.filter((slot) => bool(slot["can_discard"], true));
    const unreserved = discardable.filter((slot) => !isReserved(reserve, str(slot["potion_id"]), str(slot["description"])));
    const weakest = (unreserved.length > 0 ? unreserved : discardable)
      .map((slot) => ({ slot, rank: potionRank(str(slot["potion_id"])) }))
      .sort((a, b) => a.rank - b.rank)[0];
    if (weakest && weakest.rank <= POTION_RANK_DISCARDABLE) {
      return {
        kind: "act",
        label: "map/discard-potion",
        intent: { action: "discard_potion", option_index: num(weakest.slot["index"]) },
        rationale: `potion slots full with a guaranteed potion coming: discarding ${str(weakest.slot["name"], str(weakest.slot["potion_id"]))} (rank ${weakest.rank})`,
      };
    }
  }

  const nodes = new Map<string, MapNode>();
  for (const raw of asArray(map["nodes"]).map(asRecord)) {
    const row = num(raw["row"]);
    const col = num(raw["col"]);
    nodes.set(key(row, col), {
      row,
      col,
      type: str(raw["node_type"], "Unknown"),
      children: asArray(raw["children"]).map(asRecord).map((child) => ({ row: num(child["row"]), col: num(child["col"]) })),
      parents: asArray(raw["parents"]).map(asRecord).map((parent) => ({ row: num(parent["row"]), col: num(parent["col"]) })),
      visited: raw["visited"] === true,
    });
  }

  const hpPct = hpPercent(env);
  const gold = state.run?.gold ?? 0;
  const floor = state.run?.floor ?? 1;
  // Acts are 17, 16 and 15 floors (bosses on 17, 33, 48) (V1YT F34: floor/17 scored act 3 as act 2 floor 17, every elite got the pre-boss +4 and the
  // route into a forced F43 elite won by 0.4).
  const act = floor <= 17 ? 1 : floor <= 33 ? 2 : 3;
  const actStart = [1, 18, 34][Math.min(act, 3) - 1]!;
  const floorInAct = Math.max(1, floor - actStart + 1);
  // Each node at its own floor, not the current one (PFBK F18: every act-2 elite down to F29 was priced
  // as "floor 1 of the act"): rows count floors from the node we stand on (act start: row 0 is the
  // act's first floor after the one we are on).
  const currentRow = numOrNull(asRecord(map["current_node"])["row"]);
  const floorsAhead = (row: number) => Math.max(1, currentRow === null ? row + 1 : row - currentRow);
  // RUN_PLAN=v1: the run's hp_policy, route_risk and entry HP shift node weights (intent.ts mapShift).
  const runPlan = currentRunPlan(env.screenMemory, state);
  // A deck under the act's lowest elite need avoids optional elites, whatever the plan (intent.ts EliteGate).
  const eliteNeed = actEliteNeed(act);
  const deckDamage = deckDamagePerTurn(state, env.knowledge, { realised: false });
  const deckGate: EliteGate | null = eliteNeed !== null && deckDamage > 0 && deckDamage < eliteNeed ? { deck: deckDamage, need: eliteNeed } : null;
  // HP without heal potions under twice an elite's cost avoids optional elites too, now and wherever
  // the projection reaches one that low (the projection's heal share taken back out); a forced elite is
  // priced by its survival, not avoided.
  const eliteBar = optionalEliteBar(act);
  const healShare = hpPct - hpPercent(env, false);
  const gateAt = (hp: number): EliteGate | null => {
    const bare = Math.max(0, hp - healShare);
    return bare < eliteBar ? { ...deckGate, hp: bare, bar: eliteBar } : deckGate;
  };
  const gate = gateAt(hpPct);
  // A likely death is its own weight: no node-type shift or chain penalty on top (RVR6 F38: the elite's
  // -9 under avoid_elites + preserve stacked on -20 and tripled). An elite as the 3rd fight in a row
  // pays the chain penalty too, at its cost factor (N7KR F4: "? -> Monster -> Monster -> Elite").
  // The act boss's damage gap: a hallway fight (a card reward) gains worth over '?' (gapFightBonus).
  const bossGap = damageGap(state, env.knowledge);
  const weightOf: Weights = (type, at, row, optional = false) => {
    const base = nodeWeight(type, at.hp, at.gold, floorInAct + floorsAhead(row), act);
    if (base <= LIKELY_DEATH) return base;
    const chain = type === "Monster" ? fightChainPenalty(at.fights, at.hp) : type === "Elite" ? eliteCostFactor(act) * fightChainPenalty(at.fights, at.hp) : 0;
    return base - chain + mapShift(runPlan, type, at.hp, floorsToBoss(floor + floorsAhead(row)), act, type === "Elite" && optional ? gateAt(at.hp) : deckGate);
  };
  const deathElite = runPlan?.routeRisk === "avoid_elites" ? FORCED_ELITE_AFTER_DEATH_AVOID : FORCED_ELITE_AFTER_DEATH;
  const start: RouteState = { hp: hpPct, gold, fights: fightsSoFar(nodes, map["current_node"]) };

  // route_risk avoid_elites is hard on the next node: an Elite is not offered while another node is.
  const offered = routeRiskFilter(runPlan, available.map((node) => ({ node, type: str(node["node_type"], "Unknown") })), hpPct, gate).map((entry) => entry.node);
  const selfOf = (node: Record<string, unknown>): MapNode => {
    const row = num(node["row"]);
    const col = num(node["col"]);
    return nodes.get(key(row, col)) ?? { row, col, type: str(node["node_type"], "Unknown"), children: [] };
  };
  const floorOf = (nodeRow: number) => floor + floorsAhead(nodeRow);
  // The checkpoint every option meets: the first floor with an elite on every path from every option.
  // Each option's chance of getting there alive and through that elite prices it. The boss is not a
  // checkpoint for scoring: its arrival HP is shown and labelled, but pricing every optional elite's
  // death risk on the way re-ranked healthy routes (G6YV F12: 577 gold, Shop -> Monster -> Elite at 46%
  // lost to Rest -> Elite on a 12% death chance) that the node weights already price.
  const bossRow = numOrNull(asRecord(map["boss_node"])["row"]);
  const sharedElite = routeFacts(nodes as Map<string, RouteNode>, offered.map(selfOf), floorOf, 0).forcedElites[0];
  const checkpoint = sharedElite ? { row: sharedElite.row, inclusive: true } : null;
  const arrivalMemo = new Map<string, Arrival>();
  // Later forks are projected as they will be decided: optional elites avoided under route_risk
  // avoid_elites or the elite gate, at the HP projected there (routeRiskFilter).
  const avoidEliteAt = (hp: number): boolean => routeRiskAt(runPlan, hp) === "avoid_elites" || gateAt(hp) !== null;
  const survivalOf = (self: MapNode): number => (checkpoint ? arrivalAt(self, start, nodes, act, checkpoint, arrivalMemo, avoidEliteAt).p : 1);
  const restMemo = new Map<string, Arrival>();
  const bossMemo = new Map<string, Arrival>();
  const eliteMemo = new Map<string, { hp: number; row: number } | null>();
  // Winged Boots: nodes off the current node's children spend a charge.
  const bootsRelic = asArray(asRecord(state.run?.raw)["relics"]).map(asRecord).find((relic) => str(relic["relic_id"]) === "WINGED_BOOTS");
  const bootsCharges = bootsRelic ? num(bootsRelic["stack"]) : 0;
  const currentKey = currentRow === null ? null : key(currentRow, num(asRecord(map["current_node"])["col"]));
  const pathChildren = new Set((currentKey ? nodes.get(currentKey)?.children ?? [] : []).map((child) => key(child.row, child.col)));
  const offPath = (row: number, col: number) => bootsCharges > 0 && pathChildren.size > 0 && !pathChildren.has(key(row, col));
  // An Elite option another open node avoids is optional: the forced elites and the first elite every
  // path meets are counted from its children (EGX7 F27: the optional (10,2) read "every path to the
  // boss meets F28 (row 10, col 2): no rest before it"; Jev took it at 0.09).
  const factsOf = (node: Record<string, unknown>) => {
    const self = selfOf(node);
    const optionalElite = str(node["node_type"], "Unknown") === "Elite" && offered.some((other) => str(other["node_type"], "Unknown") !== "Elite");
    const children = self.children.map((child) => nodes.get(key(child.row, child.col))).filter((child): child is MapNode => child !== undefined);
    const facts = optionalElite ? routeFacts(nodes as Map<string, RouteNode>, children, floorOf, start.fights + 1) : routeFacts(nodes as Map<string, RouteNode>, [self], floorOf, start.fights);
    // This option's own forced elite (every path from it meets one on that floor) that the shared
    // checkpoint does not already price (KGR6 F19: the Shop line reached the F28 elite at ~42% of a ~55%
    // cost after eight branchless floors, scored +6.5 vs -13.4 and was taken).
    const lineElite = facts.forcedElites.find((forced) => checkpoint === null || forced.row > checkpoint.row);
    return { self, optionalElite, children, facts, lineElite };
  };
  // Survival is one product along the projected path, hallways and elites alike (77QX F18: a forced
  // elite's death was charged in full, a chain of hallways' only as discounted likely deaths), over the
  // same stretch of map for every option: through the last forced elite any option must fight (the
  // shared checkpoint, each option's own) to the next rest after it, or to the boss.
  const horizon = Math.max(-1, checkpoint?.row ?? -1, ...offered.map((node) => factsOf(node).lineElite?.row ?? -1));
  const options: (Omit<PickOption, "summary"> & { summary: Record<string, JsonValue>; type: string; row: number; arrival: RouteArrival })[] = offered.flatMap((node) => {
    const index = numOrNull(node["index"]);
    if (index === null) return [];
    const row = num(node["row"]);
    const col = num(node["col"]);
    const type = str(node["node_type"], "Unknown");
    const self = selfOf(node);
    // At low HP the next node matters most (a rest now beats a better path later): at 29% HP a
    // Monster-first route scored level with a Rest-first one on a live run.
    const urgency = hpPct < 0.4 ? 3 : hpPct < 0.55 ? 1.8 : 1;
    // A likely death right here ends the route too, as further down (RC9A F24: at 38/80 the elite now
    // scored -36 plus the rooms after it, above a "?" whose forced elite later counted in full).
    // The boss gap prices the fight on offer now, not every fight down the line: each later fork is
    // decided again with the gap then (along every path it mostly rewarded routes that keep HP for later
    // fights: 11LC F4 '?' 47.4 vs Monster 45.0 at twice the bonus).
    const gapBonus = type === "Monster" ? gapFightBonus(bossGap, start.hp, act) : 0;
    const here = weightOf(type, start, row) + (weightOf(type, start, row) > LIKELY_DEATH ? gapBonus : 0);
    const survival = survivalOf(self);
    const { optionalElite, children, facts } = factsOf(node);
    const toRest = arrivalAt(self, start, nodes, act, { row: bossRow ?? Infinity, inclusive: false, restAfter: horizon }, restMemo, avoidEliteAt);
    // The shared checkpoint keeps its discount: every option dies there alike, the later the better (RVR6 F38).
    const forcedRows = new Set(facts.forcedElites.filter((forced) => forced.row !== checkpoint?.row).map((forced) => forced.row));
    const boots = offPath(row, col) ? bootsCost(act, bootsCharges) : null;
    const value =
      -(boots ?? 0) +
      (here <= LIKELY_DEATH
        ? here * urgency - deathElite * minElitesAhead(self, nodes, new Map())
        : here * urgency + continuation(self, start, nodes, weightOf, act, new Map(), deathElite, new Map(), urgency, 1, forcedRows)) -
      SURVIVAL_WEIGHT * (1 - toRest.p);
    // Projected HP on arrival at the first elite every path meets and at the boss (stateAfter).
    const elite = optionalElite ? firstEliteArrivalFrom(children, stateAfter(type, start, act), nodes, act, eliteMemo) : firstEliteArrival(self, start, nodes, act, eliteMemo);
    const bossArrival = bossRow !== null ? arrivalAt(self, start, nodes, act, { row: bossRow, inclusive: false }, bossMemo, avoidEliteAt) : null;
    // A projection that runs out of HP before the boss says so: its "+30% at the last rest" is no arrival HP.
    const ranOut = bossArrival?.ranOut ?? null;
    const arrival: RouteArrival = {
      eliteHp: elite ? elite.hp : null,
      eliteFloor: elite ? floorOf(elite.row) : null,
      eliteCost: fightHpCost("Elite", act),
      eliteRest: facts.forcedElites.find((forced) => forced.row === elite?.row)?.rest ?? facts.eliteOnEveryPath?.rest ?? null,
      bossHp: bossArrival && ranOut === null ? bossArrival.hp : null,
      bossSurvival: bossArrival ? bossArrival.p : null,
      bossFloor: bossRow !== null ? floorOf(bossRow) : null,
      ...(ranOut !== null ? { ranOutFloor: floorOf(ranOut) } : {}),
    };
    const restText = toRest.row >= (bossRow ?? Infinity) ? `the F${floorOf(toRest.row)} boss` : `the F${floorOf(toRest.row)} rest`;
    const through = horizon >= 0 ? ` through F${floorOf(horizon)}` : "";
    return [
      {
        key: `n${index}`,
        intent: { action: "choose_map_node", option_index: index },
        label: `${type} (row ${row}, col ${col})`,
        score: value,
        summary: {
          node_type: type,
          position: `row ${row}, column ${col}`,
          route_value: Number(value.toFixed(2)),
          likely_continuation: pathPreview(self, start, nodes, weightOf, act, 3),
          // What no later choice changes on this route: forced elites (rest before each or not) and the
          // longest run of fights every path takes (VQ7J F7, Z7D7 F25).
          ...(optionalElite ? { optional_elite: "this node is an optional Elite (another open node avoids it)" } : {}),
          ...(optionalElite ? { forced_elites: `after this elite: ${routeFactsText(facts).forced_elites}`, longest_forced_fight_run: facts.longestForcedFightRun } : routeFactsText(facts)),
          ...arrivalText(arrival, checkpoint ? survival : null),
          route_survival: `alive${through} at ${restText} ~${Math.round(toRest.p * 100)}% of the time on its safest path (median room costs, p75 risk)`,
          ...(gapBonus > 0 && bossGap
            ? { boss_gap: `a card reward toward the act boss gap (deck ~${bossGap.deck} of ${bossGap.need} damage a turn for ${bossGap.boss}): +${gapBonus.toFixed(1)} route value` }
            : {}),
          ...(boots !== null ? { winged_boots: `off the current path: uses a Winged Boots charge, ${bootsCharges - 1} left after${boots > 0 ? ` (priced -${boots}: charges are kept for act 3)` : ""}` } : {}),
        } as Record<string, JsonValue>,
        type,
        row,
        arrival,
      },
    ];
  });
  // Labels come from the same scoring that ranks the nodes (5JU3 F10: '?' labelled "breaks preserve"
  // while Monster, priced dearer by the route scoring, had no label).
  const bestValue = Math.max(...options.map((option) => option.score));
  const bestArrival = {
    eliteHp: Math.max(...options.map((option) => (option.arrival.eliteHp === null ? 1 : option.arrival.eliteHp))),
    bossHp: Math.max(...options.map((option) => option.arrival.bossHp ?? 0)),
  };
  // The HP gate is about optional elites: not on a choice of elites only.
  const labelGate = offered.some((node) => str(node["node_type"], "Unknown") !== "Elite") ? gate : deckGate;
  const labelled: PickOption[] = options.map(({ type, row, arrival, ...option }) => {
    const fit = mapFit(runPlan, type, hpPct, { value: option.score, best: bestValue }, floorsToBoss(floor + floorsAhead(row)), { ...arrival, best: bestArrival }, act, labelGate);
    return {
      ...option,
      summary: { ...option.summary, ...(fit ? { intent_fit: fit } : {}) },
      ...(fit?.startsWith("costs") ? { intentBreak: fit } : {}),
    } satisfies PickOption;
  });

  if (labelled.length === 0) return null;

  const current = asRecord(map["current_node"]);
  const boss = asRecord(map["boss_node"]);
  return buildPickDecision({
    label: "map/route",
    instructions: "Which node should I travel to next?",
    actThreshold: env.thresholds.act,
    strictJev: env.strictJev,
    escalateBelow: 0.35,
    options: labelled,
    planVersion: runPlan?.version ?? null,
    codeMargin: env.combatPlanner === "card" ? undefined : 2.5,
    state: {
      run_brief: briefJson(env.brief),
      situation: {
        screen: "MAP",
        floor: state.run?.floor ?? null,
        // act_id counts from 0; the models read it as the act number (W6F4: "act 1" at F31).
        act: state.run?.act_id != null && /^\d+$/.test(state.run.act_id) ? String(Number(state.run.act_id) + 1) : (state.run?.act_id ?? null),
        hp_percent: Math.round(hpPct * 100),
        gold,
        current_node: `row ${num(current["row"])}, column ${num(current["col"])}`,
        boss_node: `row ${num(boss["row"])}, column ${num(boss["col"])}`,
      },
      note: "route_value and likely_continuation are computed in code from the visible map graph. Do not recompute them.",
      ...(runPlan ? { labels: LABEL_NOTE } : {}),
    },
  });
}

/**
 * Rough keep-value of a potion (0 worst .. 10 best) for freeing a slot. Card-generating and random
 * potions are the least reliable; defensive, damage and Strength potions the most.
 */
const POTION_RANKS: Record<string, number> = {
  FOUL_POTION: 0, GAMBLERS_BREW: 2, CLARITY: 3, SWIFT_POTION: 3, LIQUID_MEMORIES: 3, COLORLESS_POTION: 3,
  SKILL_POTION: 4, ATTACK_POTION: 4, POWER_POTION: 5, ENERGY_POTION: 4, BLESSING_OF_THE_FORGE: 3, ASHWATER: 5,
  BLOCK_POTION: 7, FIRE_POTION: 7, EXPLOSIVE_AMPOULE: 7, WEAK_POTION: 6, VULNERABLE_POTION: 6, FEAR_POTION: 6,
  DEXTERITY_POTION: 7, STRENGTH_POTION: 8, BEETLE_JUICE: 7, MAZALETHS_GIFT: 7, FLEX_POTION: 6, REGEN_POTION: 7, HEART_OF_IRON: 8, FORTIFIER: 9,
  DUPLICATOR: 6, BLOOD_POTION: 6, FAIRY_IN_A_BOTTLE: 10, POTION_OF_BINDING: 7, GIGANTIFICATION_POTION: 7,
  // Petrified Toad refills it every fight: the first slot to free for a real potion (H7W0 F42).
  POTION_SHAPED_ROCK: 1,
};
/** Potions at or below this rank are dropped to make room for a guaranteed one. */
export const POTION_RANK_DISCARDABLE = 5;
export function potionRank(potionId: string): number {
  return POTION_RANKS[potionId] ?? 5;
}

/**
 * Every route from the nodes open now meets an Elite within `depth` nodes (the run plan's
 * forced_route trigger: an elite the plan cannot route around).
 */
export function everyRouteMeetsElite(state: GameState, depth = 3): boolean {
  const map = asRecord(state.raw["map"]);
  const nodes = new Map<string, { type: string; children: { row: number; col: number }[] }>();
  for (const raw of asArray(map["nodes"]).map(asRecord)) {
    nodes.set(key(num(raw["row"]), num(raw["col"])), {
      type: str(raw["node_type"], "Unknown"),
      children: asArray(raw["children"]).map(asRecord).map((child) => ({ row: num(child["row"]), col: num(child["col"]) })),
    });
  }
  const reaches = (at: { row: number; col: number }, left: number): boolean => {
    const node = nodes.get(key(at.row, at.col));
    if (!node) return false;
    if (node.type === "Elite") return true;
    if (left <= 1 || node.children.length === 0) return false;
    return node.children.every((child) => reaches(child, left - 1));
  };
  const available = asArray(map["available_nodes"]).map(asRecord);
  return available.length > 0 && available.every((node) => reaches({ row: num(node["row"]), col: num(node["col"]) }, depth));
}

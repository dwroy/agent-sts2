/**
 * Route choice. BUILD_DECIDER=deepseek (M2): the brain plans the act's route on the whole map and code follows it
 * (routePlanDecision below); code's greedy baseline (the node weights here) moves only when the brain fails or is
 * not asked, and its values are never shown to the brain. BUILD_DECIDER=jev: code enumerates the lookahead from each
 * reachable node and Jev picks (PLAN.md §6.2).
 *
 * Node weights shift with the Run Brief — elites are worth more with a healthy deck and high HP,
 * rests more when HP is low, shops more when there is gold to spend and a card worth removing.
 */

import type { ActionRequest } from "../mod/client.js";
import { choiceQ } from "../jev/questions.js";
import { asArray, asRecord, bool, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { runPlanEliteShift } from "../strategy/run-plan.js";
import { briefJson } from "../project/run-brief.js";
import type { ActDecision, AskDecision, Decision, DecisionEnv, RememberedMap, ResolvedAction } from "../project/types.js";
import { bestOption, buildPickDecision, type PickOption } from "./pick.js";
import { buildFacts, deepseekDecides } from "../strategy/build-facts.js";
import { bossStartHealOf, NO_REST_RELICS, restedHp, restHealOf, roomCost, roomCostModel, type RestHeal, type RoomCostModel } from "../strategy/route-projection.js";
import { checkRoute, floorOfRow, hasChoiceAhead, isKeep, nextRestVersus, nodeId, roomName, routeIds, type RouteMap } from "../strategy/route-map.js";
import { actOfFloor, actPlan, makeRoutePlan, mapActOf, mapFromState, nextPlannedStep, remainingIds, routeBlockState, routeCosts, runSnapshot, snapshotChange, type RoutePlan } from "./route-plan.js";
import { oneshotOn } from "./oneshot.js";
import { continueAfterDiscard, DISCARD_ANSWER_NOTE, DISCARD_SUFFIX, discardableSlots, discardSlotsOf, discardVariant, DRINK_SUFFIX, drinkableSlots, drinkVariant } from "./potion-discard.js";

interface MapNode {
  row: number;
  col: number;
  type: string;
  children: { row: number; col: number }[];
  parents?: { row: number; col: number }[];
  visited?: boolean;
}

const key = (row: number, col: number): string => `${row},${col}`;

function hpPercent(env: DecisionEnv): number {
  const hp = env.state.run?.current_hp ?? null;
  const max = env.state.run?.max_hp ?? null;
  return hp !== null && max !== null && max > 0 ? hp / max : 1;
}

/** Projected state on arrival at a node: HP fraction and gold. */
interface RouteState {
  hp: number;
  gold: number;
  /** The fight chain so far: hallway/elite fights as the act counts them (chainAfter). */
  fights: number;
}

/**
 * A chain of hallway fights is what killed QE4K, XJWF (both at F22 after four forced Act 2 fights, 80/80 -> 18 and
 * 92 -> 41) and MD3F (five in Act 3, 87 -> 16); every time the fork before it had a route with a RestSite, Shop or
 * Unknown. A fight from FIGHT_CHAIN_FROM on (chainPenalised: hallway fights, from act 2 elites too) costs this much, up
 * to twice as much as projected HP falls below 60%.
 */
export const FIGHT_CHAIN_PENALTY = 1.5;

const isRestNode = (type: string): boolean => type === "RestSite" || type === "Rest";

/**
 * The fight chain the route model counts (RouteState.fights), by act:
 * - act 1 (unchanged, 200e5f3): hallway/elite fights in a row. A rest site or a shop ends it; ahead (this function,
 *   the projection) a "?" room or a treasure room carries it; walking back from the current node (fightsSoFar) the
 *   chain stops at anything but a fight or a treasure room.
 * - acts 2 and 3 (Dai 2026-10-03, experience route-no-chains): hallway/elite fights since the last rest site or the
 *   act start, as the data counts a stretch between rests. Shops, "?" rooms and treasure rooms do not end it, and a
 *   "?" room is not counted (the map cannot tell its fight from its event). The data (A8+A9 to 10-02, stretches
 *   starting at >= 60% HP) counts the fights the run actually had, "?" fights included; counting only the map's
 *   Monster and Elite rooms gives the same step: an act-2 Monster/Elite room is the run's death in 9/464 (1.9%) as
 *   the 1st of its stretch, 8/315 (2.5%) the 2nd, 11/193 (5.7%) the 3rd, 13/79 (16.5%) the 4th. A shop in the
 *   stretch does not reset it: the 4th fight with a shop earlier in the stretch 6/52 (11.5%), without 10/51 (19.6%).
 */
export function chainAfter(type: string, chain: number, act: number): number {
  if (type === "Monster" || type === "Elite") return chain + 1;
  if (act >= 2) return isRestNode(type) || type === "Ancient" ? 0 : chain;
  return isRestNode(type) || type === "Shop" || type === "Event" ? 0 : chain;
}

/**
 * The fights before a fight in its chain from which the penalty applies, by act (null: none):
 * - act 1: the 3rd fight in a row (unchanged; act-1 deaths are 0.4-1.7% per Monster/Elite room up to the 4th of a
 *   stretch, so the data neither asks for nor against it).
 * - act 2: the 4th fight between rest sites (route-no-chains: A8+A9 act-2 stretches with 1-3 fights died in 29 of
 *   368, with 4+ in 21 of 103; the act-2 opening to the first rest site with <= 3 fights A8 7/98, >= 4 15/80).
 * - act 3: none. The count alone does not raise deaths there (stretches with 1, 2, 3 fights 17%, 15%, 19%; 4+ 1/24);
 *   the HP projection (monsterWeight, LIKELY_DEATH) still prices every fight.
 */
export const FIGHT_CHAIN_FROM: Record<number, number | null> = { 1: 2, 2: 3, 3: null };

/**
 * The rooms the chain penalty is charged on: act 1 hallway fights only (unchanged: elites have their own HP rules);
 * from act 2 an elite too, since the data counts it as one of the stretch's fights (A8+A9 act 2: an Elite room as
 * the 2nd-4th Monster/Elite room of its stretch was the run's death in 9 of 29). Act 3 has no penalty.
 */
export function chainPenalised(type: string, act: number): boolean {
  return type === "Monster" || (act >= 2 && type === "Elite");
}

export function fightChainPenalty(fightsBefore: number, hpOnArrival: number, act: number): number {
  const from = FIGHT_CHAIN_FROM[Math.min(Math.max(act, 1), 3)] ?? null;
  if (from === null || fightsBefore < from) return 0;
  return FIGHT_CHAIN_PENALTY * (1 + Math.min(1, Math.max(0, 0.6 - hpOnArrival) / 0.3));
}

/** The chain lengths the memo tells apart: every count below the act's penalty start, then "that many or more". */
const CHAIN_MEMO_CAP = 3;

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

/** Weight of a fight reached with no more HP than it is expected to cost. */
export const LIKELY_DEATH = -20;

/**
 * How much this node type is worth to *this* run, at the projected HP/gold on arrival. `floorInAct`: the
 * node's own floor in its act (its row + 1). `deathShare`: the fight's expected cost as a share of max HP
 * (the route's measured room costs, routeCostShare); without it the old fixed shares (fightHpCost).
 */
export function nodeWeight(type: string, hpPct: number, gold: number, floorInAct: number, act?: number, deathShare?: number): number {
  // A fight reached with no more HP than it is expected to cost is a likely death, not a -3.
  if ((type === "Elite" || type === "Monster") && act !== undefined && hpPct <= (deathShare ?? fightHpCost(type, act))) return LIKELY_DEATH;
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

/**
 * Expected HP fraction lost to a hallway fight, by act (MD3F Act 3 hallway fights took ~0.3 max HP
 * each; the old flat 0.12 made all-fight continuations look free). Elites cost twice as much.
 */
// A7 measured 12.5 HP a hallway fight (~16% of max HP, all acts); act 2/3 hallways drained the runs
// that died before the act-2 boss (4V5T F19-F23, MF7A F19-F24) and SUUK F40-F45 (-50, -30).
// Act 3 hallways cost ~0.33 max HP each in 1LJF (-39, -17, -31) and SUUK (-50, -30).
// Act 2 hallways at A8 cost ~0.33 max HP each (SCBC, H8LC, X4QR: -26.8 a fight); 0.22 splits A7 and A8.
const FIGHT_HP_COST_BY_ACT = [0.1, 0.22, 0.28];
/** Share of a hallway fight's HP cost a "?" room carries (some are fights, some events cost HP). */
const UNKNOWN_HP_SHARE = 0.4;
export const ELITE_HP_COST_FACTOR = 2.5;
export function fightHpCost(type: string, act: number): number {
  const base = FIGHT_HP_COST_BY_ACT[Math.min(Math.max(act, 1), FIGHT_HP_COST_BY_ACT.length) - 1]!;
  // Elites x2.5: at A4 an act-1 elite cost ~43 HP where x2 priced 16 (BHMP F11 Bygone Effigy).
  return type === "Elite" ? base * ELITE_HP_COST_FACTOR : type === "Monster" ? base : 0;
}
/**
 * A rest heals 30% of max HP rounded down, plus the rest relics (Regal Pillow +15 HP, Stone Humidifier +5 max
 * HP; route-projection restedHp, batch D 981ae07); the model assumes resting, not smithing, when projecting.
 * Without the max HP (callers that pass none) the old flat 30%.
 */
const REST_HEAL = 0.3;

/** What a rest heals on this run: max HP now and the rest relics held (null: the flat 30%). */
export type RestContext = { maxHp: number; heal: RestHeal } | null;

/** HP fraction after resting at fraction `hp` (of max HP now; after Stone Humidifier, of the new max). */
export function restedFraction(hp: number, rest: RestContext): number {
  if (!rest || rest.maxHp <= 0) return Math.min(1, hp + REST_HEAL);
  const after = restedHp(hp * rest.maxHp, rest.maxHp, rest.heal);
  return Math.min(1, after.hp / after.max);
}
/**
 * Rough gold from a fight at this ascension: A3's -25% gold shows in the logs (MAP-to-MAP gold after a
 * hallway fight: median 15 at A0/A2, 11 at A3-A9, A8 n=1253, A9 n=154; elites 29-30 at A3+).
 */
export function fightGold(type: string, ascension: number): number {
  if (type === "Monster") return ascension >= 3 ? 11 : 15;
  return type === "Elite" ? 30 : 0;
}
/** What is left after a shop visit. */
const GOLD_AFTER_SHOP = 50;

/**
 * Projected state after a node. Later nodes are valued at the HP the route leaves, not at entry HP:
 * 0NG F27 took "Monster -> Elite" at 70% with the elite valued as if fought at 70%, and reached it at
 * 44/71. Rests heal and shops spend, so a fight behind a rest is valued at the healed HP.
 */
function stateAfter(type: string, at: RouteState, act: number, ascension: number, rest: RestContext = null): RouteState {
  const fights = chainAfter(type, at.fights, act);
  switch (type) {
    case "Monster":
    case "Elite":
      return { hp: Math.max(0, at.hp - fightHpCost(type, act)), gold: at.gold + fightGold(type, ascension), fights };
    case "RestSite":
    case "Rest":
      return { hp: restedFraction(at.hp, rest), gold: at.gold, fights };
    case "Shop":
      return { hp: at.hp, gold: Math.min(at.gold, GOLD_AFTER_SHOP), fights };
    case "Unknown":
      // A "?" room is often a fight or an HP event: it costs some HP and does not reset the fight chain
      // (4V5T F20: the lantern-key event fight cost 28 HP on a route priced as free).
      return { ...at, hp: Math.max(0, at.hp - UNKNOWN_HP_SHARE * fightHpCost("Monster", act)), fights };
    default:
      return { ...at, fights };
  }
}

/** A node's weight on arrival in state `at`; `row`: the node's map row (its floor in the act is row + 1). */
type Weights = (type: string, at: RouteState, row: number) => number;

/** Best continuation value from a node reached in state `at`, memoised (the graph is a DAG in row order). */
function continuation(node: MapNode, at: RouteState, nodes: Map<string, MapNode>, weights: Weights, act: number, memo: Map<string, number>, ascension: number, rest: RestContext = null): number {
  const left = stateAfter(node.type, at, act, ascension, rest);
  const nodeKey = `${key(node.row, node.col)}@${left.hp.toFixed(2)}/${Math.round(left.gold)}/${Math.min(left.fights, CHAIN_MEMO_CAP)}`;
  const cached = memo.get(nodeKey);
  if (cached !== undefined) return cached;
  // Children can all be negative (forced fights at low HP): the best of them, not 0.
  let best = -Infinity;
  for (const child of node.children) {
    const childNode = nodes.get(key(child.row, child.col));
    if (!childNode) continue;
    // A likely death ends the route: nothing after it counts (4UWK F22: at 9/80 the Unknown room into a
    // forced elite scored 15.4 on the rooms after the elite; the Monster -> Rest route -49.7).
    const here = weights(childNode.type, left, childNode.row);
    best = Math.max(best, here <= LIKELY_DEATH ? here : here + continuation(childNode, left, nodes, weights, act, memo, ascension, rest));
  }
  if (best === -Infinity) best = 0;
  memo.set(nodeKey, best);
  return best;
}

/** Follow the highest-value children to describe where this choice leads. */
function pathPreview(node: MapNode, start: RouteState, nodes: Map<string, MapNode>, weights: Weights, act: number, steps: number, ascension: number, rest: RestContext = null): string {
  const types: string[] = [];
  let current = node;
  let at = start;
  for (let step = 0; step < steps; step += 1) {
    types.push(current.type);
    at = stateAfter(current.type, at, act, ascension, rest);
    let bestChild: MapNode | null = null;
    let bestValue = -Infinity;
    for (const child of current.children) {
      const childNode = nodes.get(key(child.row, child.col));
      if (!childNode) continue;
      const value = weights(childNode.type, at, childNode.row) + continuation(childNode, at, nodes, weights, act, new Map(), ascension, rest);
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

/** The graph of a MAP state's map object, keyed "row,col". */
function mapGraph(map: Record<string, unknown>): Map<string, MapNode> {
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
  return nodes;
}

/** The fight chain ending at a MAP state's current node in this act (kept with the remembered map for the rooms after it). */
export function fightChainAt(map: Record<string, unknown>, act: number): number {
  return fightsSoFar(mapGraph(map), map["current_node"], act);
}

/**
 * The fight chain ending at the current node (chainAfter's count, walking back). Act 1: fights in a row, through
 * visited parents and treasure rooms. Acts 2 and 3: the Monster and Elite rooms walked since the last rest site or
 * the act start, the visited node of each row back from the current one (one per row, Winged Boots jumps included).
 */
function fightsSoFar(nodes: Map<string, MapNode>, current: unknown, act: number): number {
  const at = asRecord(current);
  let node = at["row"] === undefined ? undefined : nodes.get(key(num(at["row"]), num(at["col"])));
  let fights = 0;
  if (act >= 2) {
    if (!node) return 0;
    const walked = [...nodes.values()].filter((entry) => entry.visited && entry.row <= node!.row && entry !== node).sort((a, b) => b.row - a.row);
    for (const entry of [node, ...walked]) {
      if (isRestNode(entry.type) || entry.type === "Ancient") break;
      if (entry.type === "Monster" || entry.type === "Elite") fights += 1;
    }
    return fights;
  }
  while (node && (node.type === "Monster" || node.type === "Elite" || node.type === "Treasure")) {
    if (node.type !== "Treasure") fights += 1;
    node = (node.parents ?? []).map((parent) => nodes.get(key(parent.row, parent.col))).find((parent) => parent?.visited);
  }
  return fights;
}

/** A fight's median measured cost as a share of max HP (the route projection's RoomCostModel): its likely-death line. */
export function routeCostShare(type: string, costs: RoomCostModel): number | undefined {
  if (type !== "Monster" && type !== "Elite") return undefined;
  return costs.maxHp > 0 ? roomCost(type, costs, "median") / costs.maxHp : undefined;
}

/**
 * Code's node weights for an act's map: each node at its own floor in the act (row + 1; consistency R1: every
 * node took the current floor, so an act-start plan read every elite as a first-floors -3 and never gave the
 * mid-act +4 nor the pre-boss rule), a fight a likely death when the HP on arrival is at most its median
 * measured cost (R2: the old 25%/55%/70%-of-max elite shares called 50 logged elite nodes a death that the
 * projection shown beside them survives). RUN_PLAN=v1: the plan's elite appetite shifts elite nodes.
 */
export function makeRouteWeights(act: number, costs: RoomCostModel, runPlan?: DecisionEnv["screenMemory"]["runPlan"]): Weights {
  return (type, at, row) =>
    nodeWeight(type, at.hp, at.gold, Math.max(1, row + 1), act, routeCostShare(type, costs)) -
    (chainPenalised(type, act) ? fightChainPenalty(at.fights, at.hp, act) : 0) +
    (type === "Elite" ? runPlanEliteShift(runPlan, at.hp) : 0);
}

function routeWeights(env: DecisionEnv, floor: number): { act: number; weightOf: Weights; costs: RoomCostModel } {
  const act = actOfFloor(floor);
  // Rest relics (Regal Pillow, Stone Humidifier) change what every later rest heals.
  const relics = asArray(asRecord(env.state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  const costs = roomCostModel(act, env.state.run?.ascension ?? 0, env.state.run?.max_hp ?? 80, restHealOf(relics, asArray(asRecord(env.state.run?.raw)["deck"]).length), bossStartHealOf(relics));
  return { act, weightOf: makeRouteWeights(act, costs, env.screenMemory.runPlan), costs };
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

  // The node chosen with a potion discarded first (White Beast Statue with a full belt, below): once the
  // discard lands, travel on to it.
  const pending = continueAfterDiscard(env, "map", "map", (option, title) => {
    const node = available.find((entry) => numOrNull(entry["index"]) === option);
    return node && nodeTitle(str(node["node_type"], "Unknown"), num(node["row"]), num(node["col"])) === title ? { action: "choose_map_node", option_index: option } : null;
  });
  if (pending !== undefined) return pending;
  const nodeRefs = available.flatMap((node) => {
    const index = numOrNull(node["index"]);
    return index === null ? [] : [{ index, row: num(node["row"]), col: num(node["col"]), type: str(node["node_type"], "Unknown") }];
  });
  const statue = statuePotionOptions(env, nodeRefs);

  const nodes = mapGraph(map);

  const hpPct = hpPercent(env);
  const gold = state.run?.gold ?? 0;
  const ascension = state.run?.ascension ?? 0;
  const floor = state.run?.floor ?? 1;
  const { act, weightOf, costs } = routeWeights(env, floor);
  const rest: RestContext = { maxHp: costs.maxHp, heal: costs.rest ?? NO_REST_RELICS };
  const start: RouteState = { hp: hpPct, gold, fights: fightsSoFar(nodes, map["current_node"], act) };

  const options: PickOption[] = available.flatMap((node) => {
    const index = numOrNull(node["index"]);
    if (index === null) return [];
    const row = num(node["row"]);
    const col = num(node["col"]);
    const type = str(node["node_type"], "Unknown");
    const self = nodes.get(key(row, col)) ?? { row, col, type, children: [] };
    // At low HP the next node matters most (a rest now beats a better path later): at 29% HP a
    // Monster-first route scored level with a Rest-first one on a live run.
    const urgency = hpPct < 0.4 ? 3 : hpPct < 0.55 ? 1.8 : 1;
    const value = weightOf(type, start, row) * urgency + continuation(self, start, nodes, weightOf, act, new Map(), ascension, rest);
    return [
      {
        key: `n${index}`,
        intent: { action: "choose_map_node", option_index: index },
        label: nodeTitle(type, row, col),
        score: value,
        summary: {
          node_type: type,
          position: `row ${row}, column ${col}`,
          route_value: Number(value.toFixed(2)),
          likely_continuation: pathPreview(self, start, nodes, weightOf, act, 3, ascension, rest),
        } satisfies JsonValue,
      } satisfies PickOption,
    ];
  });

  if (options.length === 0) return null;

  const current = asRecord(map["current_node"]);
  const boss = asRecord(map["boss_node"]);
  // BUILD_DECIDER=deepseek: the brain plans the act's route on the whole map; code follows it node by node. Code's
  // greedy baseline moves only when the brain fails or is not asked; its values are never shown to the brain.
  if (deepseekDecides(env)) {
    const best = bestOption(options);
    const fallback: Decision = { kind: "act", label: "map/route-fallback", intent: best.intent, rationale: `the brain's route is not available: code's greedy baseline takes ${best.label ?? best.key}` };
    return routePlanDecision(env, fallback, nodeRefs, typeof current["row"] === "number" ? { row: num(current["row"]), col: num(current["col"]) } : null);
  }
  return buildPickDecision({
    label: "map/route",
    instructions: "Which node should I travel to next?",
    actThreshold: env.thresholds.act,
    strictJev: env.strictJev,
    escalateBelow: 0.35,
    options: options.flatMap(statue),
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
    },
  });
}

/* ---- route plan (BUILD_DECIDER=deepseek) ---------------------------------------------------------- */

/*
 * M2 (docs/v4-architecture.md §4): the brain gets the act's whole map (every node's row, column, type and lines,
 * where we stand, the nodes walked, the Winged Boots charges, the boss nodes) and plans any route on it, answering
 * the node sequence from the next node to the boss; code checks it (strategy/route-map.ts checkRoute, through the
 * question's AnswerSpec: one re-ask with the specific errors) and follows it node by node. Code lists no candidate
 * routes and gives no route a score or rank. The chosen route's facts (HP on arrival, rest sites healed or smithed,
 * fights before the next rest, the next elite and the boss) ride on the next question the brain answers (the card
 * reward, rest site or event after this room: route-review.ts), where it keeps or changes the route.
 * A re-plan is asked only when the plan breaks (its next node is not available, or nothing is left ahead).
 * When the brain fails or is not asked, code's greedy baseline (planMap's node weights above) moves; that value is
 * never shown to the brain.
 */

export type { RoutePlan, RoutePlanStep, RunSnapshot } from "./route-plan.js";
export { actOfFloor, nextPlannedStep, runSnapshot, snapshotChange, wingedBootsLeft } from "./route-plan.js";

interface NodeRef {
  index: number;
  row: number;
  col: number;
  type: string;
}

/** The route-plan task (map/route-plan). */
export const ROUTE_PLAN_TASK =
  "规划本幕路线。state.route_map 是本幕完整地图（每个节点的行、列、类型和连线）、你的位置、飞行靴剩余次数和 boss 节点。" +
  "从 next_nodes 里的一个节点出发，每一步走到下一层（沿连线；有飞行靴时，每跳一次用掉 1 次，可以跳到下一层任意节点），一直走到 boss，按顺序列出每个节点的 id。" +
  "代码按你的路线逐个节点走，只在路线走不通时再问你；之后的选牌、休息点和事件的最后一问都会附上这条路线按当时 HP 算的事实" +
  "（各节点到达血量的中位数和 p75、休息点回血或锻造后的血量、到下一个休息点前的连续战斗、下一只精英和 boss 前的血量），你可以在那时保留或修改路线。" +
  '只回答 JSON：{"route": "<节点 id，用空格分隔，从下一步一直到 boss，如 r4c1 r5c2 … r16c3>", "reason": "<30 字以内>"}';

/** The review after an act-start Ancient whose outcome was not known when the route was planned (map/route-review). */
export const ROUTE_REVIEW_TASK =
  "本幕路线是和幕初远古的选项一起定的，当时还不知道选项的结果；结果见 state.route_map.revealed_outcome。" +
  "state.route_map 有完整地图、你的路线计划（plan）和按现在 HP 算的计划事实（plan_facts），next_rest 是计划（keep）和经每个下一步节点的另一条（switch）到下一个休息点的战斗数和到达 HP。保留原路线回答 \"keep\"；" +
  "要换就给出新的节点序列（从 next_nodes 之一出发，沿连线或用飞行靴，一直到 boss）。" +
  '只回答 JSON：{"route": "keep" 或 "<节点 id，用空格分隔>", "reason": "<30 字以内>"}';

/** The route-plan answer's White Beast Statue part (a full belt, a fight node first). */
const STATUE_ROUTE_LOST = '白兽雕像：每场战斗后必掉一瓶药水，药水栏已满且奖励界面不能扔药水，所以路线第一步若是战斗（或问号房里的战斗），那瓶药水会丢失，';
const STATUE_ROUTE_NOTE = `${STATUE_ROUTE_LOST}除非先扔：可以在回答里加 "discard": [药水槽编号]（见 discardable_potions），代码先扔再走；不扔就不写。`;
/**
 * The drink part (v3 2f6ae4c, 5LRZ7HJ7YGSY F37: with only keep / discard, Fruit Juice was discarded): a potion
 * usable on the map can be drunk before the first step instead. Facts only; code does not say which.
 */
const STATUE_DRINK_NOTE = '也可以先喝掉一瓶地图上能喝的药水：在回答里加 "drink": [药水槽编号]（一个，见 drinkable_potions），代码先喝再走；不喝就不写。"discard" 和 "drink" 只写一种。';
const STATUE_DRINK_ONLY_NOTE = `${STATUE_ROUTE_LOST}除非先喝掉一瓶地图上能喝的药水：在回答里加 "drink": [药水槽编号]（一个，见 drinkable_potions），代码先喝再走；不喝就不写。`;

function routePlanDecision(env: DecisionEnv, fallback: Decision, available: NodeRef[], current: { row: number; col: number } | null): Decision {
  const { state, screenMemory } = env;
  const runId = str(state.raw["run_id"]);
  const act = mapActOf(state);
  const plan = actPlan(env, act);
  let replanWhy: string | null = null;
  if (plan) {
    const next = nextPlannedStep(plan, current);
    const target = next ? available.find((node) => node.row === next.row && node.col === next.col) : undefined;
    if (next && target) {
      const step = plan.path.indexOf(next) + 1;
      const joint = plan.oneshot?.firstPending ? plan.oneshot : null;
      const follow: ActDecision = {
        kind: "act",
        label: "map/route-follow",
        intent: { action: "choose_map_node", option_index: target.index },
        rationale: `following the brain's route plan (floor ${plan.floor ?? "?"}): step ${step}/${plan.path.length} ${next.type} at row ${next.row}, col ${next.col}; plan ${plan.summary}`,
        // The first move of a route planned with the act's Ancient is a step of that plan.
        ...(joint ? { plan: { ref: joint.ref, step: joint.firstStep, choice: `${next.type} at row ${next.row}, col ${next.col}` } } : {}),
        ...(joint || plan.review
          ? {
              apply: () => {
                if (plan.oneshot) plan.oneshot.firstPending = false;
                plan.review = undefined;
              },
            }
          : {}),
      };
      // The Ancient's outcome is known now: the brain keeps or changes the route, once (default keep).
      if (plan.review && deepseekDecides(env)) {
        const map = mapFromState(env);
        if (map) return routeReviewQuestion(env, plan, follow, map, available);
      }
      return statueFollow(env, follow, available) ?? follow;
    }
    replanWhy = next ? `the planned next node (row ${next.row}, col ${next.col}, ${next.type}) is not available` : "the plan has no node ahead";
  }
  const failedKey = `${runId}:${act}:${state.run?.floor ?? "?"}`;
  if (screenMemory.routePlanFailed === failedKey) return fallback;
  // BUILD_ONESHOT: the act-start Ancient is the only node; the act's route is planned with its option.
  if (oneshotOn(env) && available.every((node) => node.type === "Ancient")) return onlyMove(available) ?? fallback;
  const map = mapFromState(env);
  if (!map || map.bosses.length === 0) return fallback;
  // One way on to the boss (no fork, no boots): nothing to plan; take it.
  if (!hasChoiceAhead(map)) return onlyMove(available) ?? fallback;
  return routePlanQuestion(env, map, fallback, available, replanWhy, plan, failedKey);
}

/** The only available node as a move (no question), or null when there are several. */
function onlyMove(available: NodeRef[]): Decision | null {
  if (available.length !== 1) return null;
  const only = available[0]!;
  return { kind: "act", label: "map/route-only", intent: { action: "choose_map_node", option_index: only.index }, rationale: `one way on: ${only.type} at row ${only.row}, col ${only.col}` };
}

/** The map's next nodes as the question's options: "r4c1": "F5 普通战（沿连线）". */
function nextOptions(map: RouteMap): Record<string, string | null> {
  const current = map.current ? map.nodes.get(map.current) : undefined;
  return Object.fromEntries(
    map.next.map((id) => {
      const node = map.nodes.get(id);
      const how = current && !current.children.includes(id) ? "飞行靴跳跃" : "沿连线";
      return [id, node ? `F${floorOfRow(map, node.row)} ${roomName(node.type)}（${how}）` : null];
    }),
  );
}

/**
 * White Beast Statue with a full belt: the route question's fields (the note, the discardable potions, the potions
 * that can be drunk on the map, and the Fruit Juice fact), or null.
 */
function statueSlots(env: DecisionEnv, available: NodeRef[]): Record<string, JsonValue> | null {
  const probe = available.find((node) => STATUE_FIGHT_NODES.has(node.type));
  if (!probe) return null;
  const variants = statuePotionOptions(env, available)(goOption(probe));
  const variant = variants.find((option) => option.key.endsWith(DISCARD_SUFFIX));
  const drinks = variants.filter((option) => option.key.includes(DRINK_SUFFIX));
  if (!variant && drinks.length === 0) return null;
  const drinkable = Object.fromEntries(drinks.map((drink) => [drinkSlotOf(drink.key), asRecord(drink.summary)["potion"] as JsonValue]));
  const juice = asRecord(variants[0]?.summary)["fruit_juice"];
  const note = variant ? `${STATUE_ROUTE_NOTE}${drinks.length > 0 ? STATUE_DRINK_NOTE : ""}` : STATUE_DRINK_ONLY_NOTE;
  return {
    white_beast_statue: note,
    ...(variant ? { discardable_potions: asRecord(asRecord(variant.summary)["discardable_potions"]) as Record<string, JsonValue> } : {}),
    ...(drinks.length > 0 ? { drinkable_potions: drinkable } : {}),
    ...(typeof juice === "string" ? { fruit_juice: juice } : {}),
  };
}

/** The potion slot a "drink, then travel" variant's key names ("n0:drink2" -> "2"). */
function drinkSlotOf(key: string): string {
  return key.slice(key.indexOf(DRINK_SUFFIX) + DRINK_SUFFIX.length);
}

/** A plain "travel to this node" option (the statue's discard variant is built on it). */
function goOption(node: NodeRef): PickOption {
  return { key: `n${node.index}`, label: nodeTitle(node.type, node.row, node.col), intent: { action: "choose_map_node", option_index: node.index }, score: 0, summary: { travel: nodeTitle(node.type, node.row, node.col) } };
}

/**
 * The move a route's first node makes: travel there, or (White Beast Statue, the answer's "discard") discard the
 * named potion slots first and then travel (potion-discard.ts, as the Jev map question's discard variants), or
 * (the answer's "drink") drink the named potion on the map first and then travel (its drink variant).
 */
function firstMove(env: DecisionEnv, available: NodeRef[], first: NodeRef, discard: number[] | undefined, drink?: number[]): { intent: ActionRequest; apply?: () => void; journal?: string } | { invalid: string } {
  const move: ActionRequest = { action: "choose_map_node", option_index: first.index };
  const drinking = drink !== undefined && drink.length > 0;
  if ((!discard || discard.length === 0) && !drinking) return { intent: move };
  if (!STATUE_FIGHT_NODES.has(first.type)) return { intent: move };
  if (drinking) {
    if (discard && discard.length > 0) return { invalid: 'the answer both discards and drinks potions before the first step: name one ("discard" or "drink")' };
    const drinks = statuePotionOptions(env, available)(goOption(first)).filter((option) => option.key.includes(DRINK_SUFFIX));
    const valid = drinks.map((option) => drinkSlotOf(option.key)).join(", ") || "none";
    if (drink.length > 1) return { invalid: `the answer drinks ${drink.length} potions first; name one ("drink": [one of ${valid}])` };
    const chosen = drinks.find((option) => drinkSlotOf(option.key) === String(drink[0]));
    if (!chosen) return { invalid: `potion slot ${drink[0]} cannot be drunk here (drinkable: ${valid})` };
    return { intent: chosen.intent, ...(chosen.apply ? { apply: chosen.apply } : {}), journal: chosen.label ?? `drank potion slot ${drink[0]}, then travelled` };
  }
  const variant = statuePotionOptions(env, available)(goOption(first)).find((option) => option.key.endsWith(DISCARD_SUFFIX));
  if (!variant?.plan) return { intent: move };
  const planned = variant.plan({ cards: [], discard });
  if (!planned) return { intent: move };
  if ("invalid" in planned) return planned;
  return { intent: planned.intent ?? move, ...(planned.apply ? { apply: planned.apply } : {}), ...(planned.journal ? { journal: planned.journal } : {}) };
}

/** HP and max HP now. */
function hpNow(env: DecisionEnv): { hp: number; max: number } {
  return { hp: env.state.run?.current_hp ?? 0, max: env.state.run?.max_hp ?? 0 };
}

/** The map/route-plan question: the whole map; the answer is the route from a next node to the boss. */
function routePlanQuestion(env: DecisionEnv, map: RouteMap, fallback: Decision, available: NodeRef[], replanWhy: string | null, previous: RoutePlan | null, failedKey: string): Decision {
  const { state, screenMemory } = env;
  const costs = routeCosts(env, map.act);
  const start = hpNow(env);
  const statue = statueSlots(env, available);
  const routeMap: Record<string, JsonValue> = {
    ...routeBlockState({ map, start, costs }),
    ...(replanWhy ? { replan_because: replanWhy, previous_plan: previous?.summary ?? null } : {}),
    ...(statue ?? {}),
  };
  const question: AskDecision = {
    kind: "ask",
    label: "map/route-plan",
    state: {
      situation: { screen: "MAP", floor: state.run?.floor ?? null, act: map.act, hp: `${start.hp}/${start.max}`, gold: state.run?.gold ?? null },
      route_map: routeMap,
      facts: buildFacts(env, replanWhy ? { replan_because: replanWhy } : {}),
    },
    questions: { pick: choiceQ(ROUTE_PLAN_TASK, nextOptions(map)) },
    resolve: () => fallbackResolution(fallback),
    deepseek: {
      question: "pick",
      baseline: fallback,
      onFail: () => {
        screenMemory.routePlanFailed = failedKey;
      },
      plan: {
        resolve(json): ResolvedAction | { invalid: string } {
          const ids = routeIds(json["route"]);
          if (!ids) return { invalid: `the answer names no route (route: ${JSON.stringify(json["route"] ?? null).slice(0, 80)})` };
          const problems = checkRoute(map, ids);
          if (problems.length > 0) return { invalid: problems.join("; ").slice(0, 400) };
          const first = available.find((node) => nodeId(node.row, node.col) === ids[0]);
          if (!first) return { invalid: `the route's first node ${ids[0]} is not an available map node` };
          const plan = makeRoutePlan(env, map, ids, start, costs, replanWhy ? `re-plan: ${replanWhy}` : undefined);
          const move = firstMove(env, available, first, discardSlotsOf(json["discard"]), typeof json["drink"] === "number" ? [json["drink"]] : discardSlotsOf(json["drink"]));
          if ("invalid" in move) return move;
          return {
            intent: move.intent,
            rationale: `route plan${replanWhy ? ` (re-plan: ${replanWhy}; was ${previous?.summary ?? "none"})` : ""}: ${plan.summary}${move.journal ? `; ${move.journal}` : ""}`,
            confidence: null,
            fallback: false,
            decider: "deepseek",
            journal: `route ${plan.summary}`,
            apply: () => {
              screenMemory.routePlan = plan;
              move.apply?.();
            },
          };
        },
      },
    },
  };
  return question;
}

/**
 * The route review after an act-start Ancient whose outcome was not known when the route was planned
 * (BUILD_ONESHOT): the whole map, the plan and its facts at HP now; keep, or a new route. Default keep: when the
 * brain fails, code follows the plan.
 */
function routeReviewQuestion(env: DecisionEnv, plan: RoutePlan, follow: ActDecision, map: RouteMap, available: NodeRef[]): Decision {
  const { state, screenMemory } = env;
  const review = plan.review!;
  const costs = routeCosts(env, map.act);
  const start = hpNow(env);
  const here = map.current ? map.nodes.get(map.current) ?? null : null;
  const kept = remainingIds(plan, here);
  const revealed = snapshotChange(review.before, runSnapshot(state));
  const clear = (): void => {
    if (plan.oneshot) plan.oneshot.firstPending = false;
    plan.review = undefined;
  };
  return {
    kind: "ask",
    label: "map/route-review",
    state: {
      situation: { screen: "MAP", floor: state.run?.floor ?? null, act: map.act, hp: `${start.hp}/${start.max}`, gold: state.run?.gold ?? null },
      route_map: { ...routeBlockState({ map, plan: kept, start, costs }), revealed_outcome: `${review.why}: ${revealed}` },
      facts: buildFacts(env),
    },
    questions: { pick: choiceQ(ROUTE_REVIEW_TASK, { keep: `保留原路线：${plan.summary}`, ...nextOptions(map) }) },
    resolve: () => fallbackResolution(follow),
    deepseek: {
      question: "pick",
      baseline: follow,
      onFail: () => {
        plan.review = undefined;
        screenMemory.routePlan = plan;
      },
      plan: {
        resolve(json): ResolvedAction | { invalid: string } {
          const reason = str(json["reason"]).trim();
          if (isKeep(json["route"])) {
            return { intent: follow.intent, rationale: `route review (${review.why}): keep ${plan.summary}${reason ? ` — ${reason}` : ""}`, confidence: null, fallback: false, decider: "deepseek", journal: `route kept: ${plan.summary}`, apply: () => (follow.apply?.(), clear()) };
          }
          const ids = routeIds(json["route"]);
          if (!ids) return { invalid: `the answer names neither keep nor a route (route: ${JSON.stringify(json["route"] ?? null).slice(0, 80)})` };
          const problems = checkRoute(map, ids);
          if (problems.length > 0) return { invalid: problems.join("; ").slice(0, 400) };
          const first = available.find((node) => nodeId(node.row, node.col) === ids[0]);
          if (!first) return { invalid: `the route's first node ${ids[0]} is not an available map node` };
          const changed = makeRoutePlan(env, map, ids, start, costs, `review after the act-start Ancient (${review.why}): ${revealed}`);
          const nextRest = nextRestVersus(map, kept, ids, start, costs);
          return {
            intent: { action: "choose_map_node", option_index: first.index },
            rationale: `route review (${review.why}): changed to ${changed.summary}${reason ? ` — ${reason}` : ""}${nextRest ? `; next rest: ${nextRest.text}${nextRest.worse ? " (clearly worse than the kept route)" : ""}` : ""}`,
            confidence: null,
            fallback: false,
            decider: "deepseek",
            journal: `route ${changed.summary}`,
            apply: () => {
              clear();
              screenMemory.routePlan = changed;
            },
          };
        },
      },
    },
  };
}

/** A decision's code resolution when no brain answer is used (the loop plays the baseline itself). */
function fallbackResolution(decision: Decision): ResolvedAction {
  if (decision.kind === "act") return { intent: decision.intent, rationale: decision.rationale, confidence: null, fallback: true, ...(decision.apply ? { apply: decision.apply } : {}) };
  return { intent: null, rationale: "no brain answer", confidence: null, fallback: true };
}

/* ---- the route from the room we are in (card rewards, rest sites, events: route-review.ts) ----------- */

/** The rooms a card reward comes from: a fight, or an event in a "?" room (a boss ends the act's route). */
export const CARD_REWARD_ROOMS = ["Monster", "Elite", "Unknown"] as const;

/**
 * The node we are in on a REWARD, REST or EVENT screen (their states carry no map position): the node chosen from
 * the map remembered one floor earlier (RememberedMap.chosen), else the only available node of `rooms` on it; null
 * when neither is known or it is not one of `rooms`.
 */
export function roomPosition(map: RememberedMap | undefined, runId: string, floor: number | null, rooms: readonly string[]): { row: number; col: number; type: string; fights: number } | null {
  if (!map || map.runId !== runId || floor === null || map.floor !== floor - 1) return null;
  const only = map.available.filter((node) => rooms.includes(node.type));
  const here = map.chosen ?? (only.length === 1 ? only[0]! : null);
  if (!here || !rooms.includes(here.type)) return null;
  // The fight chain ending here: the map's chain at its current node, plus this room (as fightsSoFar walks it: in
  // act 1 anything but a fight or a treasure room ends it; from act 2 only a rest site or the act start).
  const chain = map.fights ?? 0;
  const act = actOfFloor(floor);
  const fights = act >= 2 ? chainAfter(here.type, chain, act) : here.type === "Monster" || here.type === "Elite" ? chain + 1 : here.type === "Treasure" ? chain : 0;
  return { row: here.row, col: here.col, type: here.type, fights };
}

/* ---- White Beast Statue: a potion after every fight ------------------------------------------------ */

/** A map node as its option names it (the discard variant checks it is still offered before travelling). */
function nodeTitle(type: string, row: number, col: number): string {
  return `${type} (row ${row}, col ${col})`;
}

/** Node types a White Beast Statue potion may follow: a fight (an Unknown node is one only sometimes). */
const STATUE_FIGHT_NODES = new Set(["Monster", "Elite", "Boss", "Unknown"]);

/**
 * White Beast Statue drops a potion after every fight (「战斗结束后必定掉落药水」; every logged combat reward with
 * it has one) and the reward screen cannot discard, so with a full belt that potion is lost. Code used to discard
 * its weakest-ranked potion on the map (YVWA F35-F47); Dai: code does not handle potions for the decider. An
 * option that travels to a fight node gets a "discard potion(s), then travel" variant (potion-discard.ts, as the
 * Tiny Mailbox's rest) and a "drink <potion>, then travel" variant per potion usable on the map (5LRZ7HJ7YGSY F37:
 * with only keep / discard, Fruit Juice was discarded): the decider says whether and which. Facts only: Fruit Juice
 * is drunk by code at its first decision of the next fight (combat-plan.ts, permanent max HP), which frees its slot
 * before that fight's potion drops. Identity when nothing applies.
 */
export function statuePotionOptions(env: DecisionEnv, available: { index: number; row: number; col: number; type: string }[]): (option: PickOption) => PickOption[] {
  const run = asRecord(env.state.run?.raw);
  const relics = asArray(run["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  const belt = asArray(run["potions"]).map(asRecord);
  const full = belt.length > 0 && belt.every((slot) => bool(slot["occupied"]));
  const statueFull = relics.includes("WHITE_BEAST_STATUE") && full;
  const slots = statueFull ? discardableSlots(env) : [];
  const drinkable = statueFull ? drinkableSlots(env) : [];
  const juice = belt.find((slot) => str(slot["potion_id"]) === "FRUIT_JUICE");
  const juiceFact: Record<string, JsonValue> = juice
    ? {
        fruit_juice: `code drinks ${str(juice["name"], "Fruit Juice")} (potion slot ${num(juice["index"])}) by itself at its first decision of the next fight (permanent max HP, nothing gained by waiting), so that slot is empty again before the fight's potion drops`,
      }
    : {};
  return (option) => {
    const index = option.intent.action === "choose_map_node" ? option.intent.option_index : undefined;
    const node = slots.length + drinkable.length > 0 && typeof index === "number" ? available.find((entry) => entry.index === index) : undefined;
    if (!node || !STATUE_FIGHT_NODES.has(node.type) || option.key.endsWith(DISCARD_SUFFIX) || option.key.includes(DRINK_SUFFIX)) return [option];
    const title = nodeTitle(node.type, node.row, node.col);
    const then = { place: "map", option: node.index, title };
    const variant = discardVariant(env, option, then, 1, slots);
    const drinks = drinkable.map((slot) => drinkVariant(env, option, then, slot));
    if (!variant && drinks.length === 0) return [option];
    const summary = option.summary && typeof option.summary === "object" && !Array.isArray(option.summary) ? (option.summary as Record<string, JsonValue>) : { option: option.summary ?? null };
    const maybe = node.type === "Unknown" ? " if this Unknown node is a fight" : "";
    const ways = [
      ...(variant ? [`a potion is discarded first (option ${variant.key})`] : []),
      ...drinks.map((drink, at) => `${drinkable[at]!.name} is drunk now on the map (option ${drink.key})`),
      "one is drunk in that fight",
    ];
    const lost = {
      ...option,
      summary: {
        ...summary,
        potion_slots: `White Beast Statue drops a potion after every fight; the belt is full and the reward screen cannot discard, so the potion after the fight at ${title}${maybe} is lost unless ${ways.slice(0, -1).join(", ")} or ${ways[ways.length - 1]}`,
        ...juiceFact,
      },
    };
    return [lost, ...(variant ? [variant] : []), ...drinks];
  };
}

/** The DeepSeek note for a question with "discard, then …" options (their answer's "discard" field), else nothing. */
function discardNoteOf(options: PickOption[]): { note?: string } {
  return options.some((option) => option.key.endsWith(DISCARD_SUFFIX)) ? { note: DISCARD_ANSWER_NOTE } : {};
}

/**
 * The route plan's next move into a fight with White Beast Statue and a full belt: travel keeping every potion, or
 * discard first (the decider's call; its failure or absence keeps the plain move). Null when nothing applies.
 */
function statueFollow(env: DecisionEnv, follow: Decision, available: { index: number; row: number; col: number; type: string }[]): Decision | null {
  if (follow.kind !== "act") return null;
  const go: PickOption = {
    key: "go",
    label: `travel on (${follow.rationale.replace(/^following /, "")})`,
    intent: follow.intent,
    score: 0,
    why: "the route plan's next node; code does not rank which potions to discard",
    summary: { travel: "the route plan's next node, keeping every potion" },
    ...(follow.apply ? { apply: follow.apply } : {}),
  };
  const options = statuePotionOptions(env, available)(go);
  if (options.length < 2) return null;
  return buildPickDecision({
    label: "map/statue-potion",
    instructions:
      "White Beast Statue drops a potion after every fight and the potion belt is full: travel to the route's next node keeping every potion, or first discard potion(s) or drink a potion usable on the map, so the fight's potion has a slot?",
    actThreshold: env.thresholds.act,
    strictJev: env.strictJev,
    options,
    unranked: true,
    state: {
      run_brief: briefJson(env.brief),
      situation: { screen: "MAP", floor: env.state.run?.floor ?? null, hp_percent: Math.round(hpPercent(env) * 100) },
    },
    ...(deepseekDecides(env) ? { deepseek: { facts: buildFacts(env), baseline: follow, ...discardNoteOf(options) } } : {}),
  });
}

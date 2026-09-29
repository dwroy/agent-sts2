/**
 * Route choice (PLAN.md §6.2): code enumerates the lookahead from each reachable node, Jev picks.
 *
 * Node weights shift with the Run Brief — elites are worth more with a healthy deck and high HP,
 * rests more when HP is low, shops more when there is gold to spend and a card worth removing.
 */

import { asArray, asRecord, bool, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { runPlanEliteShift } from "../strategy/run-plan.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import { buildPickDecision, type PickOption } from "./pick.js";
import { buildFacts, deepseekDecides } from "../strategy/build-facts.js";
import { projectPath, roomCost, roomCostModel, roomCostNote, type PathProjection, type RoomCostModel } from "../strategy/route-projection.js";
import type { GameState } from "../mod/schema.js";
import { oneshotOn } from "./oneshot.js";

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
/** A rest heals 30% of max HP (the model assumes resting, not smithing, when projecting). */
const REST_HEAL = 0.3;
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
function stateAfter(type: string, at: RouteState, act: number, ascension: number): RouteState {
  switch (type) {
    case "Monster":
    case "Elite":
      return { hp: Math.max(0, at.hp - fightHpCost(type, act)), gold: at.gold + fightGold(type, ascension), fights: at.fights + 1 };
    case "RestSite":
    case "Rest":
      return { hp: Math.min(1, at.hp + REST_HEAL), gold: at.gold, fights: 0 };
    case "Shop":
      return { hp: at.hp, gold: Math.min(at.gold, GOLD_AFTER_SHOP), fights: 0 };
    case "Unknown":
      // A "?" room is often a fight or an HP event: it costs some HP and does not reset the fight chain
      // (4V5T F20: the lantern-key event fight cost 28 HP on a route priced as free).
      return { ...at, hp: Math.max(0, at.hp - UNKNOWN_HP_SHARE * fightHpCost("Monster", act)) };
    case "Event":
      return { ...at, fights: 0 };
    default:
      return at;
  }
}

/** A node's weight on arrival in state `at`; `row`: the node's map row (its floor in the act is row + 1). */
type Weights = (type: string, at: RouteState, row: number) => number;

/** Best continuation value from a node reached in state `at`, memoised (the graph is a DAG in row order). */
function continuation(node: MapNode, at: RouteState, nodes: Map<string, MapNode>, weights: Weights, act: number, memo: Map<string, number>, ascension: number): number {
  const left = stateAfter(node.type, at, act, ascension);
  const nodeKey = `${key(node.row, node.col)}@${left.hp.toFixed(2)}/${Math.round(left.gold)}/${Math.min(left.fights, 2)}`;
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
    best = Math.max(best, here <= LIKELY_DEATH ? here : here + continuation(childNode, left, nodes, weights, act, memo, ascension));
  }
  if (best === -Infinity) best = 0;
  memo.set(nodeKey, best);
  return best;
}

/** Follow the highest-value children to describe where this choice leads. */
function pathPreview(node: MapNode, start: RouteState, nodes: Map<string, MapNode>, weights: Weights, act: number, steps: number, ascension: number): string {
  const types: string[] = [];
  let current = node;
  let at = start;
  for (let step = 0; step < steps; step += 1) {
    types.push(current.type);
    at = stateAfter(current.type, at, act, ascension);
    let bestChild: MapNode | null = null;
    let bestValue = -Infinity;
    for (const child of current.children) {
      const childNode = nodes.get(key(child.row, child.col));
      if (!childNode) continue;
      const value = weights(childNode.type, at, childNode.row) + continuation(childNode, at, nodes, weights, act, new Map(), ascension);
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

/** The act of a floor: acts are 17, 16 and 15 floors (bosses on 17, 33, 48). */
export function actOfFloor(floor: number): number {
  // V1YT F34: floor/17 scored act 3 as act 2 floor 17, every elite got the pre-boss +4 and the route into
  // a forced F43 elite won by 0.4.
  return floor <= 17 ? 1 : floor <= 33 ? 2 : 3;
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
    (type === "Monster" ? fightChainPenalty(at.fights, at.hp) : 0) +
    (type === "Elite" ? runPlanEliteShift(runPlan, at.hp) : 0);
}

function routeWeights(env: DecisionEnv, floor: number): { act: number; weightOf: Weights; costs: RoomCostModel } {
  const act = actOfFloor(floor);
  const costs = roomCostModel(act, env.state.run?.ascension ?? 0, env.state.run?.max_hp ?? 80);
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
    const weakest = belt
      .filter((slot) => bool(slot["can_discard"], true))
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
  const ascension = state.run?.ascension ?? 0;
  const floor = state.run?.floor ?? 1;
  const { act, weightOf, costs } = routeWeights(env, floor);
  const start: RouteState = { hp: hpPct, gold, fights: fightsSoFar(nodes, map["current_node"]) };

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
    const value = weightOf(type, start, row) * urgency + continuation(self, start, nodes, weightOf, act, new Map(), ascension);
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
          likely_continuation: pathPreview(self, start, nodes, weightOf, act, 3, ascension),
        } satisfies JsonValue,
      } satisfies PickOption,
    ];
  });

  if (options.length === 0) return null;

  const current = asRecord(map["current_node"]);
  const boss = asRecord(map["boss_node"]);
  const baseline = buildPickDecision({
    label: "map/route",
    instructions: "Which node should I travel to next?",
    actThreshold: env.thresholds.act,
    strictJev: env.strictJev,
    escalateBelow: 0.35,
    options,
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
  // BUILD_DECIDER=deepseek: DeepSeek plans the act's route once; code follows it node by node.
  if (!deepseekDecides(env)) return baseline;
  return routePlanDecision(env, baseline, {
    nodes,
    available: available.flatMap((node) => {
      const index = numOrNull(node["index"]);
      return index === null ? [] : [{ index, row: num(node["row"]), col: num(node["col"]), type: str(node["node_type"], "Unknown") }];
    }),
    current: typeof current["row"] === "number" ? { row: num(current["row"]), col: num(current["col"]) } : null,
    start,
    weights: weightOf,
    act,
    ascension,
    hpPct,
    urgency: hpPct < 0.4 ? 3 : hpPct < 0.55 ? 1.8 : 1,
    costs,
  });
}

/* ---- route plan (BUILD_DECIDER=deepseek) ---------------------------------------------------------- */

/**
 * HP drop (fraction of max HP) below the HP the plan projected for the next node that makes DeepSeek
 * re-plan the route (Dai 2026-09-28: plan the act's route once, re-ask only when the plan is broken or HP
 * moved a lot).
 */
export const ROUTE_REPLAN_HP_DROP = 0.3;
/** Candidate paths shown to DeepSeek. */
export const ROUTE_CANDIDATES = 8;
/** Cap on the paths enumerated from the available nodes to the boss. */
const MAX_PATHS = 4000;

export interface RoutePlanStep {
  row: number;
  col: number;
  type: string;
  /** Projected HP fraction on arrival at this node (code's route model, resting at rest sites). */
  hpOnArrival: number;
}

export interface RoutePlan {
  runId: string;
  act: number;
  floor: number | null;
  /** HP fraction when the plan was made. */
  hpPct: number;
  path: RoutePlanStep[];
  /** DeepSeek's summary of the path (the option text). */
  summary: string;
  /** Why the previous plan of this act was replaced (a re-plan), for the run memory. */
  why?: string;
  /**
   * Planned together with the act-start Ancient's option (BUILD_ONESHOT, event/act-plan): the plan's
   * reference, and the plan step the first map move is (logged as that step, not a code follow).
   */
  oneshot?: { ref: string; firstStep: number; firstPending: boolean };
  /**
   * The Ancient's option had an outcome not known when the route was planned (random relics, a pack chosen
   * later): DeepSeek reviews the route once at the first map (keep or change). `before`: the run then.
   */
  review?: { why: string; before: RunSnapshot };
}

/** Relics, potions and deck (names) with max HP and gold: what an outcome changed (the route review). */
export interface RunSnapshot {
  relics: string[];
  potions: string[];
  deck: string[];
  maxHp: number | null;
  gold: number | null;
}

export function runSnapshot(state: GameState): RunSnapshot {
  const run = asRecord(state.run?.raw);
  const names = (list: unknown, id: string): string[] =>
    asArray(list)
      .map(asRecord)
      .filter((entry) => entry["occupied"] !== false)
      .map((entry) => str(entry["name"], str(entry[id])))
      .filter(Boolean);
  return { relics: names(run["relics"], "relic_id"), potions: names(run["potions"], "potion_id"), deck: names(run["deck"], "card_id"), maxHp: state.run?.max_hp ?? null, gold: state.run?.gold ?? null };
}

/** What changed since `before`: new relics, potions and cards, max HP and gold. */
export function snapshotChange(before: RunSnapshot, after: RunSnapshot): string {
  const added = (was: string[], now: string[]): string[] => {
    const left = [...was];
    return now.filter((name) => {
      const at = left.indexOf(name);
      if (at < 0) return true;
      left.splice(at, 1);
      return false;
    });
  };
  const parts = [
    ...added(before.relics, after.relics).map((name) => `relic +${name}`),
    ...added(before.potions, after.potions).map((name) => `potion +${name}`),
    ...added(before.deck, after.deck).map((name) => `card +${name}`),
    ...added(after.deck, before.deck).map((name) => `card -${name}`),
    ...(before.maxHp !== null && after.maxHp !== null && before.maxHp !== after.maxHp ? [`max HP ${before.maxHp} -> ${after.maxHp}`] : []),
    ...(before.gold !== null && after.gold !== null && before.gold !== after.gold ? [`gold ${before.gold} -> ${after.gold}`] : []),
  ];
  return parts.length > 0 ? parts.join(", ") : "nothing visible changed";
}

interface RouteContext {
  nodes: Map<string, MapNode>;
  available: { index: number; row: number; col: number; type: string }[];
  current: { row: number; col: number } | null;
  start: RouteState;
  weights: Weights;
  act: number;
  /** Fight gold along a path depends on it (A3: -25% gold). */
  ascension: number;
  hpPct: number;
  urgency: number;
  /** Measured room costs (monster DB) the route facts project HP with. */
  costs: RoomCostModel;
}

/** Every path from the available nodes to the boss (or the map's end), capped. */
export function enumeratePaths(starts: MapNode[], nodes: Map<string, MapNode>, limit = MAX_PATHS): MapNode[][] {
  const paths: MapNode[][] = [];
  const walk = (node: MapNode, sofar: MapNode[]): void => {
    if (paths.length >= limit) return;
    const path = [...sofar, node];
    const children = node.type === "Boss" ? [] : node.children.map((child) => nodes.get(key(child.row, child.col))).filter((child): child is MapNode => child !== undefined);
    if (children.length === 0) {
      paths.push(path);
      return;
    }
    for (const child of children) walk(child, path);
  };
  for (const start of starts) walk(start, []);
  return paths;
}

interface ScoredPath {
  path: MapNode[];
  value: number;
  /** HP fraction on arrival at each step at the measured median room costs (0 once it has run out). */
  hpOnArrival: number[];
  projection: PathProjection;
}

/**
 * Code's value of a path (the heuristic weights) at the HP the measured room costs project: the route
 * facts and the value use the same projection (audit 2026-09-28: the old 22%/55%-of-max-HP act-2 costs put
 * every QZQU F18 route at ~0/80 at the boss).
 */
function scorePath(path: MapNode[], context: RouteContext): ScoredPath {
  const max = context.costs.maxHp;
  const projection = projectPath(
    path.map((node) => node.type),
    context.hpPct * max,
    context.costs,
  );
  let at = context.start;
  let value = 0;
  const hpOnArrival: number[] = [];
  let dead = false;
  path.forEach((node, step) => {
    at = { ...at, hp: Math.max(0, Math.min(1, projection.arrival[step]! / max)) };
    hpOnArrival.push(at.hp);
    if (dead) return;
    const weight = context.weights(node.type, at, node.row);
    value += step === 0 ? weight * context.urgency : weight;
    // A likely death ends the route: nothing after it counts (as in continuation()).
    if (weight <= LIKELY_DEATH) dead = true;
    at = stateAfter(node.type, at, context.act, context.ascension);
  });
  return { path, value, hpOnArrival, projection };
}

/** The candidate paths DeepSeek chooses from: the best by code's value, the best from each first node, and the extremes. */
export function candidatePaths(context: RouteContext): ScoredPath[] {
  const starts = context.available.map((node) => context.nodes.get(key(node.row, node.col)) ?? { row: node.row, col: node.col, type: node.type, children: [] });
  const scored = enumeratePaths(starts, context.nodes).map((path) => scorePath(path, context)).sort((a, b) => b.value - a.value);
  const signature = (entry: ScoredPath): string => entry.path.map((node) => `${node.row},${node.col}`).join(">");
  const types = (entry: ScoredPath): string => entry.path.map((node) => node.type).join(">");
  const chosen = new Map<string, ScoredPath>();
  const seenTypes = new Set<string>();
  const add = (entry: ScoredPath | undefined): void => {
    if (!entry || chosen.has(signature(entry))) return;
    // Two paths with the same room sequence are the same choice; keep the better-valued one.
    if (seenTypes.has(types(entry))) return;
    seenTypes.add(types(entry));
    chosen.set(signature(entry), entry);
  };
  // Every first step is represented by its best path.
  for (const start of starts) add(scored.find((entry) => entry.path[0] === start));
  const count = (entry: ScoredPath, test: (type: string) => boolean): number => entry.path.filter((node) => test(node.type)).length;
  const byMost = (test: (type: string) => boolean, sign: 1 | -1) => [...scored].sort((a, b) => sign * (count(b, test) - count(a, test)) || b.value - a.value)[0];
  add(byMost((type) => type === "Elite", 1));
  add(byMost((type) => type === "Elite", -1));
  add(byMost((type) => type === "RestSite" || type === "Rest", 1));
  add(byMost((type) => type === "Shop", 1));
  for (const entry of scored) {
    if (chosen.size >= ROUTE_CANDIDATES) break;
    add(entry);
  }
  return [...chosen.values()].sort((a, b) => b.value - a.value);
}

/** Projected HP in route facts: "~52/80", or that it ran out at an earlier step. */
function hpText(hp: number, maxHp: number): string {
  return hp > 0 ? `~${Math.round(hp)}/${maxHp}` : "HP ran out earlier on this path";
}

/** The risk line of a path: the one room whose p75 cost leaves the least HP, and whether that is all of it. */
function riskText(entry: ScoredPath, maxHp: number): string {
  const { projection, path } = entry;
  const low = projection.riskLow;
  if (!low) return "no fight or \"?\" room on this path";
  const room = `step ${low.step + 1} (${path[low.step]!.type}, arriving ~${Math.round(projection.arrival[low.step]!)}/${maxHp})`;
  if (low.hp > 0) return `worst single room at its p75 cost: ~${Math.round(low.hp)}/${maxHp} left after ${room}`;
  const rest = path.findIndex((node, at) => at > low.step && (node.type === "RestSite" || node.type === "Rest"));
  return `a p75 fight at ${room} would take all HP${rest >= 0 ? `, before the rest at step ${rest + 1}` : ""}`;
}

/** "step 6: ~47/80 on arrival, ~13 left at its median cost, ~2 at p75". */
function eliteText(entry: ScoredPath, step: number, maxHp: number): string {
  const arrive = entry.projection.arrival[step]!;
  if (arrive <= 0) return `step ${step + 1}: HP ran out earlier on this path`;
  const left = (hp: number): string => (hp > 0 ? `~${Math.round(hp)}` : "none");
  return `step ${step + 1}: ~${Math.round(arrive)}/${maxHp} on arrival, ${left(entry.projection.arrival[step + 1] ?? entry.projection.end)} left at its median cost, ${left(entry.projection.riskAfter[step]!)} at p75`;
}

function pathFacts(entry: ScoredPath, maxHp: number): Record<string, JsonValue> {
  const hp = (step: number): string => hpText(entry.projection.arrival[step]!, maxHp);
  const count = (test: (type: string) => boolean): number => entry.path.filter((node) => test(node.type)).length;
  const bossAt = entry.path.findIndex((node) => node.type === "Boss");
  const restAt = entry.path.findIndex((node) => node.type === "RestSite" || node.type === "Rest");
  const beforeRest = restAt >= 0 ? entry.path.slice(0, restAt) : entry.path;
  return {
    path: entry.path.map((node) => node.type).join(" -> "),
    first_node: `row ${entry.path[0]!.row}, column ${entry.path[0]!.col} (${entry.path[0]!.type})`,
    fights: count((type) => type === "Monster" || type === "Elite"),
    elites: count((type) => type === "Elite"),
    unknown_rooms: count((type) => type === "Unknown"),
    shops: count((type) => type === "Shop"),
    rests: count((type) => type === "RestSite" || type === "Rest"),
    treasure: count((type) => type === "Treasure"),
    fights_before_first_rest: restAt >= 0 ? beforeRest.filter((node) => node.type === "Monster" || node.type === "Elite").length : "no rest on this path",
    hp_on_arrival_at_elites: entry.path.flatMap((node, step) =>
      node.type === "Elite" ? [eliteText(entry, step, maxHp)] : [],
    ),
    hp_at_boss: bossAt >= 0 ? hp(bossAt) : hpText(entry.projection.end, maxHp),
    ...(entry.projection.runsOut !== null ? { hp_runs_out_at_median_costs: `step ${entry.projection.runsOut + 1} (${entry.path[entry.projection.runsOut]!.type})` } : {}),
    hp_risk: riskText(entry, maxHp),
    forks_on_path: entry.path.filter((node) => node.children.length > 1).length,
  };
}

/** The next planned node: the first plan step on a row after the current node (the first step before any). */
export function nextPlannedStep(plan: RoutePlan, current: { row: number; col: number } | null): RoutePlanStep | null {
  return plan.path.find((step) => current === null || step.row > current.row) ?? null;
}

function routePlanDecision(env: DecisionEnv, baseline: Decision, context: RouteContext): Decision {
  const { state, screenMemory } = env;
  const runId = str(state.raw["run_id"]);
  const act = context.act;
  const plan = screenMemory.routePlan && screenMemory.routePlan.runId === runId && screenMemory.routePlan.act === act ? screenMemory.routePlan : null;
  const planText = (entry: RoutePlan): string => entry.path.map((step) => step.type).join(" -> ");
  let replanWhy: string | null = null;
  if (plan) {
    const next = nextPlannedStep(plan, context.current);
    const target = next ? context.available.find((node) => node.row === next.row && node.col === next.col) : undefined;
    if (next && target) {
      const drop = next.hpOnArrival - context.hpPct;
      if (drop < ROUTE_REPLAN_HP_DROP) {
        const step = plan.path.indexOf(next) + 1;
        const joint = plan.oneshot?.firstPending ? plan.oneshot : null;
        const follow: Decision = {
          kind: "act",
          label: "map/route-follow",
          intent: { action: "choose_map_node", option_index: target.index },
          rationale: `following DeepSeek's route plan (floor ${plan.floor ?? "?"}): step ${step}/${plan.path.length} ${next.type} at row ${next.row}, col ${next.col}; plan ${planText(plan)}`,
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
        // The Ancient's outcome is known now: DeepSeek keeps or changes the route, once (default keep).
        if (plan.review && deepseekDecides(env)) return routeReview(env, plan, follow, context);
        return follow;
      }
      replanWhy = `HP ${Math.round(context.hpPct * 100)}% is ${Math.round(drop * 100)} points below the ${Math.round(next.hpOnArrival * 100)}% the plan projected for the next node (re-plan at ${Math.round(ROUTE_REPLAN_HP_DROP * 100)})`;
    } else {
      replanWhy = next ? `the planned next node (row ${next.row}, col ${next.col}, ${next.type}) is not available` : "the plan has no node ahead";
    }
  }
  if (screenMemory.routePlanFailed === `${runId}:${act}`) return baseline;
  // BUILD_ONESHOT: the act-start Ancient is the only node; the act's route is planned with its option.
  if (oneshotOn(env) && context.available.every((node) => node.type === "Ancient")) return baseline;
  // A broken plan with only one way on: take it and re-plan at the next fork.
  if (plan && context.available.length < 2) return baseline;
  const candidates = candidatePaths(context);
  if (candidates.length < 2) return baseline;
  const options: PickOption[] = routeOptions(env, context, candidates, replanWhy);
  const decision = buildPickDecision({
    label: "map/route-plan",
    instructions:
      "Plan this act's route: which path should I follow to the act boss? Code follows the path you pick node by node and asks you again only if the path breaks or HP falls well below the projection.",
    actThreshold: env.thresholds.act,
    strictJev: env.strictJev,
    options,
    state: {
      run_brief: briefJson(env.brief),
      situation: { screen: "MAP", floor: state.run?.floor ?? null, act, hp_percent: Math.round(context.hpPct * 100), gold: state.run?.gold ?? null },
      ...(replanWhy ? { replan_because: replanWhy, previous_plan: plan ? planText(plan) : null } : {}),
      note: `Each option is a full path from the next node to the boss. ${roomCostNote(context.costs)}`,
    },
    deepseek: {
      facts: buildFacts(env, replanWhy ? { replan_because: replanWhy } : {}),
      baseline,
      onFail: () => {
        screenMemory.routePlanFailed = `${runId}:${act}`;
      },
    },
  });
  if (replanWhy && decision.kind === "ask") {
    // Log why the route was re-planned with the decision that re-plans it.
    const inner = decision.resolve.bind(decision);
    decision.resolve = (answers) => {
      const result = inner(answers);
      return { ...result, rationale: `route re-plan (${replanWhy}; was ${plan ? planText(plan) : "none"}): ${result.rationale}` };
    };
  }
  return decision;
}

/** Code's why for a route's value (the route-plan options' `why`). */
const ROUTE_WHY = "sum of code's node weights along the path at the projected HP (elites valued by HP and act, rests by HP, shops by gold, fight chains penalised)";

/** A candidate path as the route plan it becomes, with its facts. */
function candidatePlan(env: DecisionEnv, context: RouteContext, entry: ScoredPath, why: string | null): { facts: Record<string, JsonValue>; plan: RoutePlan } {
  const { state } = env;
  const facts = pathFacts(entry, state.run?.max_hp ?? 80);
  const plan: RoutePlan = {
    runId: str(state.raw["run_id"]),
    act: context.act,
    floor: state.run?.floor ?? null,
    hpPct: context.hpPct,
    path: entry.path.map((node, step) => ({ row: node.row, col: node.col, type: node.type, hpOnArrival: entry.hpOnArrival[step]! })),
    summary: String(facts["path"]),
    ...(why ? { why } : {}),
  };
  return { facts, plan };
}

/** The route-plan options: each candidate path, its facts, code's value; choosing it stores its plan. */
function routeOptions(env: DecisionEnv, context: RouteContext, candidates: ScoredPath[], why: string | null): PickOption[] {
  return candidates.map((entry, at) => {
    const first = context.available.find((node) => node.row === entry.path[0]!.row && node.col === entry.path[0]!.col)!;
    const { facts, plan } = candidatePlan(env, context, entry, why);
    return {
      key: `p${at + 1}`,
      label: `route ${String(facts["path"])}`,
      intent: { action: "choose_map_node", option_index: first.index },
      score: Number(entry.value.toFixed(2)),
      why: ROUTE_WHY,
      summary: facts,
      apply: () => {
        env.screenMemory.routePlan = plan;
      },
    } satisfies PickOption;
  });
}

/**
 * The route review after an act-start Ancient whose outcome was not known when the route was planned
 * (BUILD_ONESHOT): keep the planned path, or take another candidate at today's HP. Default keep: without
 * DeepSeek, or when its answer fails, code follows the plan.
 */
function routeReview(env: DecisionEnv, plan: RoutePlan, follow: Decision, context: RouteContext): Decision {
  const { state, screenMemory } = env;
  const review = plan.review!;
  const nodes = plan.path.map((step) => context.nodes.get(key(step.row, step.col)) ?? { row: step.row, col: step.col, type: step.type, children: [] });
  const kept = scorePath(nodes.filter((node) => node.row > (context.current?.row ?? -1)), context);
  const keepFacts = pathFacts(kept, state.run?.max_hp ?? 80);
  const why = `review after the act-start Ancient (${review.why}): ${snapshotChange(review.before, runSnapshot(state))}`;
  const others = candidatePaths(context).filter((entry) => entry.path.map((node) => node.type).join(">") !== kept.path.map((node) => node.type).join(">"));
  const options: PickOption[] = [
    {
      key: "keep",
      label: `keep the planned route ${keepFacts["path"]}`,
      intent: follow.kind === "act" ? follow.intent : { action: "choose_map_node" },
      score: Number(kept.value.toFixed(2)),
      why: ROUTE_WHY,
      summary: { keep: "the route planned with the Ancient's option", ...keepFacts },
      apply: () => {
        if (plan.oneshot) plan.oneshot.firstPending = false;
        plan.review = undefined;
      },
    },
    ...routeOptions(env, context, others.slice(0, ROUTE_CANDIDATES - 1), why),
  ];
  return buildPickDecision({
    label: "map/route-review",
    instructions:
      "The act's route was planned together with the Ancient's option, before that option's outcome was known; the outcome is in facts.route_review. Keep the planned route (keep) or change to another path? Code follows the path node by node.",
    actThreshold: env.thresholds.act,
    strictJev: env.strictJev,
    options,
    state: {
      run_brief: briefJson(env.brief),
      situation: { screen: "MAP", floor: state.run?.floor ?? null, act: context.act, hp_percent: Math.round(context.hpPct * 100), gold: state.run?.gold ?? null },
      note: `Each option is a full path from the next node to the boss. ${roomCostNote(context.costs)}`,
    },
    deepseek: {
      facts: buildFacts(env, { route_review: { planned: plan.summary, why: review.why, revealed_outcome: snapshotChange(review.before, runSnapshot(state)) } }),
      // Default keep: without DeepSeek, or when its answer fails, the plan is followed.
      baseline: follow,
      onFail: () => {
        plan.review = undefined;
        screenMemory.routePlan = plan;
      },
    },
  });
}

/**
 * The act's route candidates at an act-start Ancient (BUILD_ONESHOT, event/act-plan): the map is the one the
 * MAP screen before the Ancient showed (screenMemory.lastMap: the Ancient is its only available node; the
 * EVENT state carries no map), the paths start at the Ancient's children. Null when this is not that event,
 * the act already has a route plan, or the map is not known (act 1: the run opens on Neow before any map).
 */
export function actStartRoutes(env: DecisionEnv): { act: number; note: string; routes: { key: string; value: number; facts: Record<string, JsonValue>; plan: RoutePlan; entry: ScoredPath }[]; hpAtBoss: (key: string, hp: number, maxHp: number) => string } | null {
  const { state, screenMemory } = env;
  const map = screenMemory.lastMap;
  const runId = str(state.raw["run_id"]);
  const floor = state.run?.floor ?? null;
  if (!map || map.runId !== runId || floor === null || map.floor !== floor - 1) return null;
  if (map.available.length === 0 || !map.available.every((node) => node.type === "Ancient")) return null;
  const { act, weightOf, costs } = routeWeights(env, floor);
  if (screenMemory.routePlan && screenMemory.routePlan.runId === runId && screenMemory.routePlan.act === act) return null;
  if (screenMemory.routePlanFailed === `${runId}:${act}`) return null;
  const nodes = new Map<string, MapNode>(map.nodes.map((node) => [key(node.row, node.col), { row: node.row, col: node.col, type: node.type, children: node.children }]));
  const ancient = nodes.get(key(map.available[0]!.row, map.available[0]!.col));
  if (!ancient || ancient.children.length === 0) return null;
  const hpPct = hpPercent(env);
  const context: RouteContext = {
    nodes,
    available: ancient.children.map((child, index) => ({ index, row: child.row, col: child.col, type: nodes.get(key(child.row, child.col))?.type ?? "Unknown" })),
    current: { row: ancient.row, col: ancient.col },
    start: { hp: hpPct, gold: state.run?.gold ?? 0, fights: 0 },
    weights: weightOf,
    act,
    hpPct,
    urgency: hpPct < 0.4 ? 3 : hpPct < 0.55 ? 1.8 : 1,
    ascension: state.run?.ascension ?? 0,
    costs,
  };
  const candidates = candidatePaths(context);
  if (candidates.length < 2) return null;
  const routes = candidates.map((entry, at) => ({ key: `p${at + 1}`, value: entry.value, entry, ...candidatePlan(env, context, entry, null) }));
  const asc = state.run?.ascension ?? 0;
  return {
    act,
    note: roomCostNote(context.costs),
    routes,
    // The HP a route reaches the boss with when the act starts at `hp`/`maxHp` (an option that changes them).
    hpAtBoss: (routeKey, hp, maxHp) => {
      const entry = routes.find((route) => route.key === routeKey)?.entry;
      if (!entry) return "?";
      const projection = projectPath(entry.path.map((node) => node.type), hp, roomCostModel(act, asc, maxHp));
      const boss = entry.path.findIndex((node) => node.type === "Boss");
      return hpText(boss >= 0 ? projection.arrival[boss]! : projection.end, maxHp);
    },
  };
}

/**
 * Rough keep-value of a potion (0 worst .. 10 best) for freeing a slot. Card-generating and random
 * potions are the least reliable; defensive, damage and Strength potions the most.
 */
const POTION_RANKS: Record<string, number> = {
  FOUL_POTION: 0, GAMBLERS_BREW: 2, CLARITY: 2, SWIFT_POTION: 3, LIQUID_MEMORIES: 3, COLORLESS_POTION: 3,
  SKILL_POTION: 4, ATTACK_POTION: 4, POWER_POTION: 5, ENERGY_POTION: 4, BLESSING_OF_THE_FORGE: 3, ASHWATER: 5,
  BLOCK_POTION: 7, FIRE_POTION: 7, EXPLOSIVE_AMPOULE: 7, WEAK_POTION: 6, VULNERABLE_POTION: 6, FEAR_POTION: 6,
  DEXTERITY_POTION: 7, STRENGTH_POTION: 8, FLEX_POTION: 6, REGEN_POTION: 7, HEART_OF_IRON: 8, FORTIFIER: 9,
  DUPLICATOR: 6, BLOOD_POTION: 6, FAIRY_IN_A_BOTTLE: 10, POTION_OF_BINDING: 7, GIGANTIFICATION_POTION: 7,
};
/** Potions at or below this rank are dropped to make room for a guaranteed one. */
export const POTION_RANK_DISCARDABLE = 5;
export function potionRank(potionId: string): number {
  return POTION_RANKS[potionId] ?? 5;
}

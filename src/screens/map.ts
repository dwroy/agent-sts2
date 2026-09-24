/**
 * Route choice (PLAN.md §6.2): code enumerates the lookahead from each reachable node, Jev picks.
 *
 * Node weights shift with the Run Brief — elites are worth more with a healthy deck and high HP,
 * rests more when HP is low, shops more when there is gold to spend and a card worth removing.
 */

import { asArray, asRecord, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
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

/** How much this node type is worth to *this* run, at the projected HP/gold on arrival. */
function nodeWeight(type: string, hpPct: number, gold: number, floorInAct: number): number {
  switch (type) {
    case "Elite":
      // Phase 2: no elites in the first floors of an act (the deck is still starter cards), and only
      // with HP to spare.
      if (floorInAct <= 4) return -3;
      // The elite right before the boss: only at near-full HP (BG4W F14: took it at 47/80, lost 33,
      // and went into the boss short after the rest).
      if (floorInAct >= 12) return hpPct > 0.8 ? 4 : -3;
      return hpPct > 0.7 ? 4 : hpPct > 0.5 ? 0.5 : -3;
    case "RestSite": // the game's name ("Rest" kept for older fixtures)
    case "Rest":
      return hpPct < 0.55 ? 5 : hpPct < 0.75 ? 2.5 : 1;
    case "Shop":
      // 8LQG reached the Act 1 boss holding 565 gold without a shop visit.
      return gold >= 350 ? 6 : gold >= 200 ? 3.5 : gold >= 120 ? 2 : 0.8;
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
 * Expected HP fraction lost to a hallway fight, by act (MD3F Act 3 hallway fights took ~0.3 max HP
 * each; the old flat 0.12 made all-fight continuations look free). Elites cost twice as much.
 */
const FIGHT_HP_COST_BY_ACT = [0.1, 0.14, 0.18];
export function fightHpCost(type: string, act: number): number {
  const base = FIGHT_HP_COST_BY_ACT[Math.min(Math.max(act, 1), FIGHT_HP_COST_BY_ACT.length) - 1]!;
  return type === "Elite" ? base * 2 : type === "Monster" ? base : 0;
}
/** A rest heals 30% of max HP (the model assumes resting, not smithing, when projecting). */
const REST_HEAL = 0.3;
/** Rough gold from a fight; what is left after a shop visit. */
const FIGHT_GOLD: Record<string, number> = { Monster: 15, Elite: 30 };
const GOLD_AFTER_SHOP = 50;

/**
 * Projected state after a node. Later nodes are valued at the HP the route leaves, not at entry HP:
 * 0NG F27 took "Monster -> Elite" at 70% with the elite valued as if fought at 70%, and reached it at
 * 44/71. Rests heal and shops spend, so a fight behind a rest is valued at the healed HP.
 */
function stateAfter(type: string, at: RouteState, act: number): RouteState {
  switch (type) {
    case "Monster":
    case "Elite":
      return { hp: Math.max(0, at.hp - fightHpCost(type, act)), gold: at.gold + (FIGHT_GOLD[type] ?? 0), fights: at.fights + 1 };
    case "RestSite":
    case "Rest":
      return { hp: Math.min(1, at.hp + REST_HEAL), gold: at.gold, fights: 0 };
    case "Shop":
      return { hp: at.hp, gold: Math.min(at.gold, GOLD_AFTER_SHOP), fights: 0 };
    case "Unknown":
    case "Event":
      return { ...at, fights: 0 };
    default:
      return at;
  }
}

type Weights = (type: string, at: RouteState) => number;

/** Best continuation value from a node reached in state `at`, memoised (the graph is a DAG in row order). */
function continuation(node: MapNode, at: RouteState, nodes: Map<string, MapNode>, weights: Weights, act: number, memo: Map<string, number>): number {
  const left = stateAfter(node.type, at, act);
  const nodeKey = `${key(node.row, node.col)}@${left.hp.toFixed(2)}/${Math.round(left.gold)}/${Math.min(left.fights, 2)}`;
  const cached = memo.get(nodeKey);
  if (cached !== undefined) return cached;
  // Children can all be negative (forced fights at low HP): the best of them, not 0.
  let best = -Infinity;
  for (const child of node.children) {
    const childNode = nodes.get(key(child.row, child.col));
    if (!childNode) continue;
    best = Math.max(best, weights(childNode.type, left) + continuation(childNode, left, nodes, weights, act, memo));
  }
  if (best === -Infinity) best = 0;
  memo.set(nodeKey, best);
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
      const value = weights(childNode.type, at) + continuation(childNode, at, nodes, weights, act, new Map());
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

export function planMap(env: DecisionEnv): Decision | null {
  const { state } = env;
  if (state.session.mode !== "singleplayer" && state.session.mode !== "multiplayer") return null;
  if (!state.available_actions.includes("choose_map_node")) return null;

  const map = asRecord(state.raw["map"]);
  // A recorded vote means "wait for the others", never "vote again" (PLAN.md §2.1 fact 6).
  if (map["local_vote"] !== null && map["local_vote"] !== undefined) return null;

  const available = asArray(map["available_nodes"]).map(asRecord);
  if (available.length === 0) return null;

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
  const floorInAct = ((floor - 1) % 17) + 1;
  const act = Math.floor((floor - 1) / 17) + 1;
  const weightOf: Weights = (type, at) =>
    nodeWeight(type, at.hp, at.gold, floorInAct) - (type === "Monster" ? fightChainPenalty(at.fights, at.hp) : 0);
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
    const value = weightOf(type, start) * urgency + continuation(self, start, nodes, weightOf, act, new Map());
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
        } satisfies JsonValue,
      } satisfies PickOption,
    ];
  });

  if (options.length === 0) return null;

  const current = asRecord(map["current_node"]);
  const boss = asRecord(map["boss_node"]);
  return buildPickDecision({
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
        act: state.run?.act_id ?? null,
        hp_percent: Math.round(hpPct * 100),
        gold,
        current_node: `row ${num(current["row"])}, column ${num(current["col"])}`,
        boss_node: `row ${num(boss["row"])}, column ${num(boss["col"])}`,
      },
      note: "route_value and likely_continuation are computed in code from the visible map graph. Do not recompute them.",
    },
  });
}

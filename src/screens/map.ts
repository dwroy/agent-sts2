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
}

const key = (row: number, col: number): string => `${row},${col}`;

function hpPercent(env: DecisionEnv): number {
  const hp = env.state.run?.current_hp ?? null;
  const max = env.state.run?.max_hp ?? null;
  return hp !== null && max !== null && max > 0 ? hp / max : 1;
}

/** How much this node type is worth to *this* run right now. */
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
      return 1.2;
    case "Boss":
      return 0;
    default:
      return 1;
  }
}

/**
 * Expected HP fraction after fighting at a node. Later nodes are valued at the HP the route leaves,
 * not at entry HP: 0NG F27 took "Monster -> Elite" at 70% with the elite valued as if fought at 70%,
 * and reached it at 44/71.
 */
const FIGHT_HP_COST = 0.12;
function hpAfter(type: string, hpPct: number): number {
  return type === "Monster" || type === "Elite" ? Math.max(0, hpPct - FIGHT_HP_COST) : hpPct;
}

/** Best continuation value from a node reached with `hpPct`, memoised (the graph is a DAG in row order). */
function continuation(
  node: MapNode,
  hpPct: number,
  nodes: Map<string, MapNode>,
  weights: (type: string, hpPct: number) => number,
  memo: Map<string, number>,
): number {
  const hpLeft = hpAfter(node.type, hpPct);
  const nodeKey = `${key(node.row, node.col)}@${hpLeft.toFixed(2)}`;
  const cached = memo.get(nodeKey);
  if (cached !== undefined) return cached;
  let best = 0;
  for (const child of node.children) {
    const childNode = nodes.get(key(child.row, child.col));
    if (!childNode) continue;
    best = Math.max(best, weights(childNode.type, hpLeft) + continuation(childNode, hpLeft, nodes, weights, memo));
  }
  memo.set(nodeKey, best);
  return best;
}

/** Follow the highest-value children to describe where this choice leads. */
function pathPreview(node: MapNode, hpPct: number, nodes: Map<string, MapNode>, weights: (type: string, hpPct: number) => number, steps: number): string {
  const types: string[] = [];
  let current = node;
  let hp = hpPct;
  for (let step = 0; step < steps; step += 1) {
    types.push(current.type);
    hp = hpAfter(current.type, hp);
    let bestChild: MapNode | null = null;
    let bestValue = -Infinity;
    for (const child of current.children) {
      const childNode = nodes.get(key(child.row, child.col));
      if (!childNode) continue;
      const value = weights(childNode.type, hp) + continuation(childNode, hp, nodes, weights, new Map());
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
    });
  }

  const hpPct = hpPercent(env);
  const gold = state.run?.gold ?? 0;
  const floorInAct = ((state.run?.floor ?? 1) - 1) % 17 + 1;
  const weightOf = (type: string, hp: number): number => nodeWeight(type, hp, gold, floorInAct);

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
    const value = weightOf(type, hpPct) * urgency + continuation(self, hpPct, nodes, weightOf, new Map());
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
          likely_continuation: pathPreview(self, hpPct, nodes, weightOf, 3),
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

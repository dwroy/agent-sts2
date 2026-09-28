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

/** How much this node type is worth to *this* run, at the projected HP/gold on arrival. */
export function nodeWeight(type: string, hpPct: number, gold: number, floorInAct: number, act?: number): number {
  // A fight reached with no more HP than it is expected to cost is a likely death, not a -3.
  if ((type === "Elite" || type === "Monster") && act !== undefined && hpPct <= fightHpCost(type, act)) return LIKELY_DEATH;
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
      // A "?" room is often a fight or an HP event: it costs some HP and does not reset the fight chain
      // (4V5T F20: the lantern-key event fight cost 28 HP on a route priced as free).
      return { ...at, hp: Math.max(0, at.hp - UNKNOWN_HP_SHARE * fightHpCost("Monster", act)) };
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
    // A likely death ends the route: nothing after it counts (4UWK F22: at 9/80 the Unknown room into a
    // forced elite scored 15.4 on the rooms after the elite; the Monster -> Rest route -49.7).
    const here = weights(childNode.type, left);
    best = Math.max(best, here <= LIKELY_DEATH ? here : here + continuation(childNode, left, nodes, weights, act, memo));
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
  const floor = state.run?.floor ?? 1;
  // Acts are 17, 16 and 15 floors (bosses on 17, 33, 48) (V1YT F34: floor/17 scored act 3 as act 2 floor 17, every elite got the pre-boss +4 and the
  // route into a forced F43 elite won by 0.4).
  const act = floor <= 17 ? 1 : floor <= 33 ? 2 : 3;
  const actStart = [1, 18, 34][Math.min(act, 3) - 1]!;
  const floorInAct = Math.max(1, floor - actStart + 1);
  // RUN_PLAN=v1: the plan's elite appetite shifts elite nodes.
  const weightOf: Weights = (type, at) =>
    nodeWeight(type, at.hp, at.gold, floorInAct, act) -
    (type === "Monster" ? fightChainPenalty(at.fights, at.hp) : 0) +
    (type === "Elite" ? runPlanEliteShift(env.screenMemory.runPlan, at.hp) : 0);
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

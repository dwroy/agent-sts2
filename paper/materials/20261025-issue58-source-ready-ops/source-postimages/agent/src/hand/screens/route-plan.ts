/**
 * The act's route plan and the map it is made on, as the screens build them (M2): the MAP screen's map, the map
 * remembered from it on the screens after it (card rewards, rest sites, events: their states carry no map), and
 * the act-start Ancient's map; the plan a legal node sequence becomes; the route block (map, plan, facts) the
 * brain gets with its next question. The map model, the route check and the facts are strategy/route-map.ts.
 */

import type { GameState } from "../mod/schema.js";
import type { DecisionEnv, RememberedMap } from "../../memory/types.js";
import { asArray, asRecord, bool, num, str, type JsonValue } from "../../core/util/json.js";
import { buildRouteMap, candidateRoutesFacts, floorOfRow, nextRestFacts, nodeId, reachableNext, roomCostsLine, routeFacts, routeText, routeView, type RouteFacts, type RouteMap, type RouteStart } from "../../sim/route-map.js";
import { bossStartHealOf, projectPath, restHealOf, roomCostModel, type RoomCostModel } from "../../sim/route-projection.js";

export interface RoutePlanStep {
  row: number;
  col: number;
  type: string;
  /** Projected HP fraction on arrival; null after an unmodelled boss loss. */
  hpOnArrival: number | null;
}

/** Audit inputs and absolute arrivals, kept with the decision row's observed_ts and fingerprint. */
export interface RoutePlanProjection {
  version: 1;
  currentNode: string | null;
  start: { hp: number; maxHp: number };
  costs: RoomCostModel;
  assumptions: { rests: "heal"; bossLoss: "unmodelled" };
  arrival: { row: number; col: number; type: string; hp: number | null; maxHp: number }[];
}

export interface RoutePlan {
  runId: string;
  act: number;
  floor: number | null;
  /** HP fraction when the plan was made. */
  hpPct: number;
  path: RoutePlanStep[];
  /** Silent A10 audit only; the existing route facts and normalized arrivals remain the decision inputs. */
  projection?: RoutePlanProjection;
  /** The route as text: "r8c1 普通战 → r9c1 休息 → … → r16c3 Boss". */
  summary: string;
  /** Why the previous plan of this act was replaced (a re-plan or a revision), for the run memory. */
  why?: string;
  /**
   * Planned together with the act-start Ancient's option (BUILD_ONESHOT, event/act-plan): the plan's
   * reference, and the plan step the first map move is (logged as that step, not a code follow).
   */
  oneshot?: { ref: string; firstStep: number; firstPending: boolean };
  /**
   * The Ancient's option had an outcome not known when the route was planned (random relics, a pack chosen
   * later): the brain reviews the route once at the first map (keep or change). `before`: the run then.
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

/** The next planned node: the first plan step on a row after the current node (the first step before any). */
export function nextPlannedStep(plan: RoutePlan, current: { row: number; col: number } | null): RoutePlanStep | null {
  return plan.path.find((step) => current === null || step.row > current.row) ?? null;
}

/** The act of a floor: acts are 17, 16 and 15 floors (bosses on 17, 33, 48). */
export function actOfFloor(floor: number): number {
  // V1YT F34: floor/17 scored act 3 as act 2 floor 17.
  return floor <= 17 ? 1 : floor <= 33 ? 2 : 3;
}

/** The act of the map a state shows (act_id counts from 0; the MAP screen after a boss already shows the next act's map). */
export function mapActOf(state: GameState): number {
  const id = state.run?.act_id;
  return id != null && /^\d+$/.test(id) ? Number(id) + 1 : actOfFloor(state.run?.floor ?? 1);
}

/** Winged Boots charges left (the relic's `stack`; 0 without the relic or once they are spent). */
export function wingedBootsLeft(run: Record<string, unknown> | undefined): number {
  const boots = asArray(asRecord(run)["relics"]).map(asRecord).find((relic) => str(relic["relic_id"]) === "WINGED_BOOTS");
  if (!boots || bool(boots["is_melted"])) return 0;
  return Math.max(0, num(boots["stack"]));
}

const relicIds = (state: GameState): string[] => asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));

/** The measured room costs the route facts project HP with, for this act and run (rest relics, boss-start heal). */
export function routeCosts(env: DecisionEnv, act: number): RoomCostModel {
  const { state } = env;
  const relics = relicIds(state);
  return roomCostModel(act, state.run?.ascension ?? 0, state.run?.max_hp ?? state.run?.current_hp ?? 80, restHealOf(relics, asArray(asRecord(state.run?.raw)["deck"]).length), bossStartHealOf(relics));
}

type Point = { row: number; col: number };

function point(value: unknown): Point | null {
  const record = asRecord(value);
  return typeof record["row"] === "number" && typeof record["col"] === "number" ? { row: record["row"], col: record["col"] } : null;
}

/** The MAP screen's map: every node, its lines, the nodes walked, the boss node(s), the available next nodes. */
export function mapFromState(env: DecisionEnv): RouteMap | null {
  const { state } = env;
  const map = asRecord(state.raw["map"]);
  const raw = asArray(map["nodes"]).map(asRecord);
  if (raw.length === 0) return null;
  return buildRouteMap({
    act: mapActOf(state),
    nodes: raw.map((node) => ({
      row: num(node["row"]),
      col: num(node["col"]),
      type: str(node["node_type"], "Unknown"),
      children: asArray(node["children"]).map(point).filter((child): child is Point => child !== null),
      visited: node["visited"] === true,
      boss: node["is_boss"] === true || node["is_second_boss"] === true,
    })),
    bosses: [point(map["boss_node"]), point(map["second_boss_node"])],
    current: point(map["current_node"]),
    next: asArray(map["available_nodes"]).map(point).filter((next): next is Point => next !== null),
    boots: wingedBootsLeft(state.run?.raw),
  });
}

/** A remembered map with us standing on `here` (a room entered from it): the next move is this node's lines, or the next row with boots. */
export function mapFromMemory(remembered: RememberedMap, act: number, here: Point, boots: number): RouteMap {
  const built = buildRouteMap({
    act,
    nodes: remembered.nodes.map((node) => ({ ...node, visited: node.visited === true || (node.row === here.row && node.col === here.col) })),
    bosses: remembered.bosses ?? [remembered.boss ?? null],
    current: here,
    next: [],
    boots,
  });
  return { ...built, next: reachableNext(built, nodeId(here.row, here.col)) };
}

/**
 * The act-start Ancient's map (acts 2 and 3, BUILD_ONESHOT event/act-plan): the map the MAP screen before the Ancient
 * showed (screenMemory.lastMap: the Ancient is its only available node; the EVENT state carries no map), standing on
 * the Ancient. Null when this is not that event or the map is not known (act 1: Neow comes before any map).
 */
export function actStartMap(env: DecisionEnv): RouteMap | null {
  const { state, screenMemory } = env;
  const map = screenMemory.lastMap;
  const runId = str(state.raw["run_id"]);
  const floor = state.run?.floor ?? null;
  if (!map || map.runId !== runId || floor === null || map.floor !== floor - 1) return null;
  if (map.available.length === 0 || !map.available.every((node) => node.type === "Ancient")) return null;
  const ancient = map.available[0]!;
  const node = map.nodes.find((entry) => entry.row === ancient.row && entry.col === ancient.col);
  if (!node || node.children.length === 0) return null;
  return mapFromMemory(map, actOfFloor(floor), ancient, wingedBootsLeft(state.run?.raw));
}

/** The plan a legal route becomes: its steps with the HP the projection expects on arrival from `start`. */
export function makeRoutePlan(env: DecisionEnv, map: RouteMap, ids: string[], start: { hp: number; max: number }, costs: RoomCostModel, why?: string): RoutePlan {
  const nodes = ids.map((id) => map.nodes.get(id)!);
  const projection = projectPath(
    nodes.map((node) => node.type),
    start.hp,
    costs,
    start.max,
  );
  return {
    runId: str(env.state.raw["run_id"]),
    act: map.act,
    floor: env.state.run?.floor ?? null,
    hpPct: start.max > 0 ? Math.max(0, Math.min(1, start.hp / start.max)) : 1,
    path: nodes.map((node, at) => ({ row: node.row, col: node.col, type: node.type, hpOnArrival: projection.arrival[at] === null ? null : Math.max(0, Math.min(1, projection.arrival[at]! / (projection.maxArrival[at]! || start.max || 1))) })),
    // K2JAGKVJAWZJ F34/F46 and 79UCJ0K6R9C1 F14: a later max HP cannot recover an old projection.
    ...(str(asRecord(env.state.run?.raw)["character_id"]).toUpperCase() === "SILENT" && env.state.run?.ascension === 10 ? {
      projection: {
        version: 1 as const,
        currentNode: map.current,
        start: { hp: start.hp, maxHp: start.max },
        costs: structuredClone(costs),
        assumptions: { rests: "heal" as const, bossLoss: "unmodelled" as const },
        arrival: nodes.map((node, at) => ({ row: node.row, col: node.col, type: node.type, hp: projection.arrival[at]!, maxHp: projection.maxArrival[at]! })),
      },
    } : {}),
    summary: routeText(map, ids),
    ...(why ? { why } : {}),
  };
}

/** The plan's steps after `here` as node ids (the route from the next node on). */
export function remainingIds(plan: RoutePlan, here: Point | null): string[] {
  return plan.path.filter((step) => here === null || step.row > here.row).map((step) => nodeId(step.row, step.col));
}

/** The act's route plan for this run and act, if any. */
export function actPlan(env: DecisionEnv, act: number): RoutePlan | null {
  const plan = env.screenMemory.routePlan;
  return plan && plan.runId === str(env.state.raw["run_id"]) && plan.act === act ? plan : null;
}

export interface RouteBlockInput {
  map: RouteMap;
  /** The plan from the next node on (node ids); absent: no plan yet (the act-start and route-plan questions). */
  plan?: string[];
  start: { hp: number; max: number };
  costs: RoomCostModel;
  /** The fight chain ending at the current node (screens/map.ts chainAfter: act 1 in a row, acts 2-3 since the last rest site). */
  chain?: number;
  /** The HP each option of this question leaves (a rest site's options). */
  options?: { label: string; hp: number; max: number }[];
  /**
   * Where the stretches to the next rest site (next_rest: the plan's and each next node's) start, when not `start`:
   * at a rest site the HP its heal leaves, with the note saying so.
   */
  nextRest?: { start: RouteStart; note: string };
  /**
   * No plan yet (the act-start Ancient's event/act-plan, map/route-plan): list candidate routes to the boss with their
   * projected HP (candidate_routes, strategy/route-map.ts candidateRoutesFacts); `note` says where the HP starts.
   */
  candidates?: { note?: string };
  /** Process-local, exact-dependency reuse; never persisted as a projection or plan. */
  cache?: RouteCalculationCache;
}

/** Each computation has its own dependency key; a changed rest option need not enumerate routes again. */
export class RouteCalculationCache {
  private readonly entries = new Map<string, { key: string; value: unknown; dependencies: Record<string, unknown> }>();
  read<T>(name: string, dependencies: Record<string, unknown>, compute: () => T): { value: T; audit: JsonValue } {
    const key = JSON.stringify(dependencies), previous = this.entries.get(name);
    const reused = previous?.key === key;
    const changed = previous ? Object.keys(dependencies).filter(k => JSON.stringify(dependencies[k]) !== JSON.stringify(previous.dependencies[k])) : ["initial"];
    const value = reused ? previous.value as T : compute();
    if (!reused) this.entries.set(name, { key, value: structuredClone(value), dependencies: structuredClone(dependencies) });
    return { value: structuredClone(value), audit: { outcome: reused ? "reused" : "computed", invalidated_by: reused ? [] : changed } };
  }
}

/** Retain caches only for the current run. Rollbacks use fresh observed dependencies, never old HP estimates. */
export function routeCalculationCache(env: DecisionEnv): RouteCalculationCache | undefined {
  const raw = asRecord(env.state.run?.raw);
  if (str(raw["character_id"]).toLowerCase() !== "silent" || env.state.run?.ascension !== 10) return undefined;
  const run = str(env.state.raw["run_id"]), memory = env.screenMemory;
  if (memory.routeCalculations?.run !== run) memory.routeCalculations = { run, cache: new RouteCalculationCache() };
  return memory.routeCalculations.cache;
}

/**
 * The route block: the whole map, the plan and its facts at HP now, each route's stretch to the next rest site (the
 * plan's and the best one through each next node: next_rest, a review only), the candidate routes to the boss when the
 * question plans the act's route (candidate_routes), and the room costs they use.
 */
export function routeBlockState(input: RouteBlockInput): Record<string, JsonValue> {
  const planned = input.plan && input.plan.length > 0 ? input.plan : null;
  const audit: Record<string, JsonValue> = {};
  const shared = { map: { ...input.map, nodes: [...input.map.nodes] }, plan: planned, costs: input.costs };
  const calculation = <T>(name: string, dependencies: Record<string, unknown>, compute: () => T): T => {
    if (!input.cache) return compute();
    const result = input.cache.read(name, { ...shared, ...dependencies }, compute);
    audit[name] = result.audit;
    return result.value;
  };
  const facts: RouteFacts | null = planned ? calculation("plan_facts", { start: input.start, chain: input.chain ?? 0, options: input.options ?? [] },
    () => routeFacts(input.map, planned, input.start, input.costs, input.chain ?? 0, input.options ?? [])) : null;
  const nextRest = planned ? calculation("next_rest", { start: input.nextRest?.start ?? input.start, chain: input.chain ?? 0, note: input.nextRest?.note },
    () => nextRestFacts(input.map, planned, input.nextRest?.start ?? input.start, input.costs, input.chain ?? 0, input.nextRest?.note)) : null;
  const candidates = !planned && input.candidates ? calculation("candidate_routes", { start: input.start, note: input.candidates.note },
    () => candidateRoutesFacts(input.map, input.start, input.costs, input.candidates!.note)) : null;
  return {
    ...(routeView(input.map) as unknown as Record<string, JsonValue>),
    ...(planned ? { plan: routeText(input.map, planned) } : {}),
    ...(facts ? { plan_facts: facts as unknown as JsonValue } : {}),
    ...(nextRest ? { next_rest: nextRest as unknown as JsonValue } : {}),
    ...(candidates ? { candidate_routes: candidates as unknown as JsonValue } : {}),
    room_costs: roomCostsLine(input.costs),
    ...(input.cache ? { route_calculation: audit } : {}),
  };
}

/** "F9" for a plan step. */
export const stepFloor = (map: RouteMap, row: number): string => `F${floorOfRow(map, row)}`;

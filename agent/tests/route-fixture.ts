/** A small fixed map and fixed room costs for the route tests (tests/route-map.test.ts, tests/brain-specs.test.ts). */

import { routeMapFromView, type RouteMapInput } from "../src/sim/route-map.js";
import type { RoomCostModel } from "../src/sim/route-projection.js";

export const p = (row: number, col: number) => ({ row, col });

/**
 * A small act-1 map (rows 0-5; A10's two bosses at rows 4 and 5):
 *   r0c1 普通战 → r1c0 r1c2; r1c0 休息 → r2c0; r1c2 精英 → r2c1 r2c2; r2c0 问号 → r3c1; r2c1 商店 → r3c1;
 *   r2c2 普通战 → r3c2; r3c1 休息 → r4c1; r3c2 普通战 → r4c1; r4c1 Boss → r5c1; r5c1 Boss.
 * We stand on r0c1 (walked), the next move is r1c0 or r1c2.
 */
export function input(over: Partial<RouteMapInput> = {}): RouteMapInput {
  return {
    act: 1,
    nodes: [
      { ...p(0, 1), type: "Monster", children: [p(1, 0), p(1, 2)], visited: true },
      { ...p(1, 0), type: "RestSite", children: [p(2, 0)] },
      { ...p(1, 2), type: "Elite", children: [p(2, 1), p(2, 2)] },
      { ...p(2, 0), type: "Unknown", children: [p(3, 1)] },
      { ...p(2, 1), type: "Shop", children: [p(3, 1)] },
      { ...p(2, 2), type: "Monster", children: [p(3, 2)] },
      { ...p(3, 1), type: "RestSite", children: [p(4, 1)] },
      { ...p(3, 2), type: "Monster", children: [p(4, 1)] },
      { ...p(4, 1), type: "Boss", children: [p(5, 1)] },
      { ...p(5, 1), type: "Unknown", children: [], boss: true },
    ],
    bosses: [p(4, 1), p(5, 1)],
    current: p(0, 1),
    next: [p(1, 0), p(1, 2)],
    boots: 0,
    ...over,
  };
}

export const costs: RoomCostModel = {
  act: 1,
  maxHp: 80,
  monster: { median: 10, p75: 16, source: "fixture n=10" },
  elite: { median: 25, p75: 35, source: "fixture n=5" },
  unknown: { median: 2, p75: 6, source: "fixture n=8" },
};


/**
 * Every legal route (no boots jumps) on a rendered map (a route block, state.route_map, state.act_route): from each
 * next node along the lines to a boss node, depth first, up to `limit` routes.
 */
export function legalRoutes(view: unknown, limit = 200): string[][] {
  const map = routeMapFromView(view);
  if (!map) return [];
  const out: string[][] = [];
  const walk = (id: string, sofar: string[]): void => {
    if (out.length >= limit) return;
    const path = [...sofar, id];
    if (map.bosses.includes(id) && (map.nodes.get(id)?.children.length ?? 0) === 0) {
      out.push(path);
      return;
    }
    if (map.bosses.includes(id) && map.bosses.indexOf(id) === map.bosses.length - 1) {
      out.push(path);
      return;
    }
    for (const child of map.nodes.get(id)?.children ?? []) walk(child, path);
  };
  for (const id of map.next) walk(id, []);
  return out;
}

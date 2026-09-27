/**
 * Facts of the map ahead that no route choice changes: the elites every path to the boss meets (and
 * whether a rest comes before each), and the longest run of back-to-back fights every path must take.
 *
 * Why: the route options showed a 3-node likely_continuation, and a forced elite on the 4th node was
 * invisible (VQ7J F6/F7: "Unknown -> RestSite -> Treasure" with the Bygone Effigy next; Z7D7 F25: both
 * options met a row-10 elite, one after a rest and one after a shop, and the shop line was taken).
 */

export interface RouteNode {
  row: number;
  col: number;
  type: string;
  children: { row: number; col: number }[];
}

export type RestBefore = "every" | "some" | "none";

export interface ForcedElite {
  row: number;
  /** The elite nodes on that row the paths can meet. */
  cols: number[];
  floor: number;
  /** Whether every, some or no path to it passes a rest site first. */
  rest: RestBefore;
}

export interface RouteFacts {
  forcedElites: ForcedElite[];
  /** Fewest back-to-back fights (Monster/Elite, no rest, shop or event between) the worst stretch of any path to the boss holds. */
  longestForcedFightRun: number;
}

const key = (row: number, col: number): string => `${row},${col}`;
const FIGHTS = new Set(["Monster", "Elite"]);
/** Rooms that end a run of fights (map.ts stateAfter). */
const CHAIN_BREAKS = new Set(["RestSite", "Rest", "Shop", "Event"]);
const RESTS = new Set(["RestSite", "Rest"]);

/**
 * Route facts from `starts` (the nodes that can be entered next, or one option) to the end of the map.
 * `floorOf` gives a node row's floor; `fightsBefore` is the run of fights already behind us.
 */
export function routeFacts(nodes: Map<string, RouteNode>, starts: RouteNode[], floorOf: (row: number) => number, fightsBefore = 0): RouteFacts {
  const childrenOf = (node: RouteNode): RouteNode[] => node.children.map((child) => nodes.get(key(child.row, child.col))).filter((child): child is RouteNode => child !== undefined);

  // Paths from a node to the end of the map (memoised; the map is a DAG in row order).
  const toEnd = new Map<string, number>();
  const pathsToEnd = (node: RouteNode): number => {
    const id = key(node.row, node.col);
    const cached = toEnd.get(id);
    if (cached !== undefined) return cached;
    const children = childrenOf(node);
    const count = children.length === 0 ? 1 : children.reduce((sum, child) => sum + pathsToEnd(child), 0);
    toEnd.set(id, count);
    return count;
  };

  // Paths from the starts to each node, forward by row; `blocked` nodes pass no path on (a rest when
  // counting paths that avoid one).
  const reachable: RouteNode[] = [];
  const seen = new Set<string>();
  const stack = [...starts];
  while (stack.length > 0) {
    const node = stack.pop()!;
    const id = key(node.row, node.col);
    if (seen.has(id)) continue;
    seen.add(id);
    reachable.push(node);
    stack.push(...childrenOf(node));
  }
  reachable.sort((a, b) => a.row - b.row);
  const fromStarts = (blocked: (node: RouteNode) => boolean): Map<string, number> => {
    const count = new Map<string, number>();
    for (const start of starts) count.set(key(start.row, start.col), (count.get(key(start.row, start.col)) ?? 0) + 1);
    for (const node of reachable) {
      const here = count.get(key(node.row, node.col)) ?? 0;
      if (here === 0 || blocked(node)) continue;
      for (const child of childrenOf(node)) count.set(key(child.row, child.col), (count.get(key(child.row, child.col)) ?? 0) + here);
    }
    return count;
  };
  const all = fromStarts(() => false);
  const avoidingRest = fromStarts((node) => RESTS.has(node.type));
  const total = starts.reduce((sum, start) => sum + pathsToEnd(start), 0);

  // A floor is a forced elite when every path meets an Elite on it (not always the same node: Z7D7
  // F25, both starts met a row-10 elite). A path crosses a row once, so the paths through that row's
  // elites add up.
  const forcedElites: ForcedElite[] = [];
  const rows = [...new Set(reachable.filter((node) => node.type === "Elite").map((node) => node.row))].sort((a, b) => a - b);
  for (const row of rows) {
    const elites = reachable.filter((node) => node.row === row && node.type === "Elite");
    const via = elites.reduce((sum, node) => sum + (all.get(key(node.row, node.col)) ?? 0) * pathsToEnd(node), 0);
    if (total === 0 || via !== total) continue;
    const noRest = elites.reduce((sum, node) => sum + (avoidingRest.get(key(node.row, node.col)) ?? 0) * pathsToEnd(node), 0);
    const cols = elites.filter((node) => (all.get(key(node.row, node.col)) ?? 0) > 0).map((node) => node.col).sort((a, b) => a - b);
    forcedElites.push({ row, cols, floor: floorOf(row), rest: noRest === 0 ? "every" : noRest === via ? "none" : "some" });
  }

  // Min over paths of the longest run of fights on it.
  const memo = new Map<string, number>();
  const leastWorstRun = (node: RouteNode, run: number): number => {
    const id = `${key(node.row, node.col)}@${run}`;
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    const here = FIGHTS.has(node.type) ? run + 1 : CHAIN_BREAKS.has(node.type) ? 0 : run;
    const children = childrenOf(node);
    const value = children.length === 0 ? here : Math.max(here, Math.min(...children.map((child) => leastWorstRun(child, here))));
    memo.set(id, value);
    return value;
  };
  const longestForcedFightRun = starts.length === 0 ? 0 : Math.min(...starts.map((start) => leastWorstRun(start, fightsBefore)));
  return { forcedElites, longestForcedFightRun };
}

/** The facts in words, for a route option or the run plan. */
export function routeFactsText(facts: RouteFacts): { forced_elites: string; longest_forced_fight_run: number } {
  const rest = { every: "a rest before it on every path", some: "a rest before it only on some paths", none: "no rest before it" } as const;
  const elites = facts.forcedElites.map((elite) => `F${elite.floor} (row ${elite.row}, col ${elite.cols.join("/")}): ${rest[elite.rest]}`);
  return {
    forced_elites: elites.length > 0 ? `every path to the boss meets ${elites.join("; ")}` : "none: every elite ahead can be routed around",
    longest_forced_fight_run: facts.longestForcedFightRun,
  };
}

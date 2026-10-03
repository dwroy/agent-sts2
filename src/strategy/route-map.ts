/**
 * The act's map as the brain sees it (M2; docs/v4-architecture.md §4, notes/v4-dev-brief.md item 2): every node
 * with its row, column, type and lines, where we stand, the nodes walked, the Winged Boots charges left and the
 * boss node(s) (A10: two). The brain plans any route on it and answers a node sequence; code checks the route
 * (lines, boots, boss, ids) and works out the chosen route's facts with the route projection (no scores, no
 * ranking; the projection itself is route-projection.ts, unchanged).
 *
 * The map is rendered as text lines ("F6 r5c2 精英 → r6c1 r6c3") and read back from them: the answer checker in
 * src/brain works from exactly what the brain was shown (the request's state), so the two cannot drift apart.
 */

import { projectPath, restedHp, type PathProjection, type RoomCostEntry, type RoomCostModel } from "./route-projection.js";

/** First floor of each act: a node's floor is the act's first floor + its row (logged maps: act 1 +1, act 2 +18, act 3 +34). */
export const ACT_FIRST_FLOOR = [1, 18, 34] as const;

export function actFirstFloor(act: number): number {
  return ACT_FIRST_FLOOR[Math.min(Math.max(act, 1), ACT_FIRST_FLOOR.length) - 1]!;
}

/** A node's id: r<row>c<col>. */
export const nodeId = (row: number, col: number): string => `r${row}c${col}`;

const ID = /^r(\d+)c(\d+)$/;

export function parseNodeId(id: string): { row: number; col: number } | null {
  const match = ID.exec(id);
  return match ? { row: Number(match[1]), col: Number(match[2]) } : null;
}

/** The map's room types in the brain's words (the game's names on the left). */
export const ROOM_NAMES: Record<string, string> = {
  Monster: "普通战",
  Elite: "精英",
  RestSite: "休息",
  Rest: "休息",
  Shop: "商店",
  Unknown: "问号",
  Treasure: "宝箱",
  Ancient: "远古",
  Boss: "Boss",
};

const TYPE_OF_NAME: Record<string, string> = { 普通战: "Monster", 精英: "Elite", 休息: "RestSite", 商店: "Shop", 问号: "Unknown", 宝箱: "Treasure", 远古: "Ancient", Boss: "Boss" };

export const roomName = (type: string): string => ROOM_NAMES[type] ?? type;

export const isRestType = (type: string): boolean => type === "RestSite" || type === "Rest";
export const isFightType = (type: string): boolean => type === "Monster" || type === "Elite";

export interface RouteNode {
  id: string;
  row: number;
  col: number;
  type: string;
  /** Ids of the next row's nodes this one has a line to. */
  children: string[];
  visited: boolean;
}

export interface RouteMap {
  act: number;
  /** The act's first floor (row 0). */
  firstFloor: number;
  nodes: Map<string, RouteNode>;
  /** Boss node ids by row (A10's act 3: the first boss, then the second). */
  bosses: string[];
  /** The node we stand on (the room we are in off the map screen); null before the act's first move. */
  current: string | null;
  /** The nodes the next move can take (the map screen's available nodes; off it, this room's lines, or the next row with boots). */
  next: string[];
  /** Winged Boots charges left: each one lets a step go to any node of the next row, off the lines. */
  boots: number;
}

type Point = { row: number; col: number };

/** What a map is built from: the MAP screen's map object or the map remembered from it. */
export interface RouteMapInput {
  act: number;
  nodes: { row: number; col: number; type: string; children: Point[]; visited?: boolean; boss?: boolean }[];
  /** boss_node / second_boss_node (A10), when the map names them. */
  bosses?: (Point | null | undefined)[];
  current: Point | null;
  next: Point[];
  boots: number;
}

export function buildRouteMap(input: RouteMapInput): RouteMap {
  const nodes = new Map<string, RouteNode>();
  const flagged = new Set<string>();
  for (const node of input.nodes) {
    const id = nodeId(node.row, node.col);
    nodes.set(id, { id, row: node.row, col: node.col, type: node.type, children: node.children.map((child) => nodeId(child.row, child.col)), visited: node.visited === true });
    if (node.boss || node.type === "Boss") flagged.add(id);
  }
  for (const point of input.bosses ?? []) if (point && nodes.has(nodeId(point.row, point.col))) flagged.add(nodeId(point.row, point.col));
  // Every boss node, not the first one found (review: the old path search stopped at the first Boss).
  const bosses = [...flagged].sort((a, b) => nodes.get(a)!.row - nodes.get(b)!.row || nodes.get(a)!.col - nodes.get(b)!.col);
  const current = input.current && nodes.has(nodeId(input.current.row, input.current.col)) ? nodeId(input.current.row, input.current.col) : null;
  return { act: input.act, firstFloor: actFirstFloor(input.act), nodes, bosses, current, next: input.next.map((point) => nodeId(point.row, point.col)), boots: Math.max(0, input.boots) };
}

export const floorOfRow = (map: RouteMap, row: number): number => map.firstFloor + row;

/** Nodes in map order: by row, then column. */
export function orderedNodes(map: RouteMap): RouteNode[] {
  return [...map.nodes.values()].sort((a, b) => a.row - b.row || a.col - b.col);
}

/** The nodes one step on from the current node: its lines, and with boots left any node of the next row. */
export function reachableNext(map: RouteMap, from: string): string[] {
  const node = map.nodes.get(from);
  if (!node) return [];
  if (map.boots <= 0) return [...node.children];
  const row = orderedNodes(map).filter((other) => other.row === node.row + 1).map((other) => other.id);
  return row.length > 0 ? row : [...node.children];
}

/* ---- rendering ---------------------------------------------------------------------------------- */

/** What the map lines mean (static text). */
export const MAP_LEGEND =
  "节点 id = r<行>c<列>，行 r 是本幕第 r+1 层（F 是全局层号）。每行「F层 id 类型 → 下一层与它有连线的节点」；" +
  "类型：普通战（走廊战斗）、精英、休息（休息点）、商店、问号（事件，可能是战斗）、宝箱、远古、Boss。（当前）是你所在的节点，（已走）是本幕走过的节点。" +
  "路线只能沿连线每次走到下一层；有飞行靴时，每用 1 次可以从一个节点跳到下一层的任意节点（不沿连线）。";

const BOSS_MARK = (map: RouteMap, id: string): string => (map.bosses.length > 1 ? `第 ${map.bosses.indexOf(id) + 1} 个 boss` : "本幕 boss");

/** One map line per node: "F6 r5c2 精英 → r6c1 r6c3", marks in full-width brackets after the type. */
export function mapLines(map: RouteMap): string[] {
  return orderedNodes(map).map((node) => {
    const marks = [
      ...(node.id === map.current ? ["当前"] : node.visited ? ["已走"] : []),
      ...(map.bosses.includes(node.id) ? [BOSS_MARK(map, node.id)] : []),
    ];
    const head = `F${floorOfRow(map, node.row)} ${node.id} ${roomName(node.type)}${marks.map((mark) => `（${mark}）`).join("")}`;
    return node.children.length > 0 ? `${head} → ${node.children.join(" ")}` : head;
  });
}

/** "r8c1（F9 普通战）". */
export function nodeLabel(map: RouteMap, id: string): string {
  const node = map.nodes.get(id);
  return node ? `${id}（F${floorOfRow(map, node.row)} ${roomName(node.type)}）` : id;
}

/** The map as the brain sees it (state.route_map, state.route_review, state.act_route share it). */
export interface RouteView {
  map_legend: string;
  map: string[];
  position: string;
  /** The ids the route's first step may be (a jump with boots marked in `position`). */
  next_nodes: string[];
  winged_boots_left: number;
  boss: string;
  walked?: string;
}

export function routeView(map: RouteMap): RouteView {
  const current = map.current ? map.nodes.get(map.current) : undefined;
  const lines = new Set(current?.children ?? []);
  const next = map.next.map((id) => `${id}${current && !lines.has(id) ? "（飞行靴跳跃）" : ""}`);
  const where = current ? `你在 ${nodeLabel(map, current.id)}` : "本幕还没有走，下一步是本幕第一个节点";
  const walked = orderedNodes(map).filter((node) => node.visited || node.id === map.current);
  return {
    map_legend: MAP_LEGEND,
    map: mapLines(map),
    position: `${where}；下一步可走：${next.join("、") || "无"}`,
    next_nodes: [...map.next],
    winged_boots_left: map.boots,
    boss: map.bosses.map((id) => nodeLabel(map, id)).join(" → ") || "地图上没有 boss 节点",
    ...(walked.length > 0 ? { walked: walked.map((node) => node.id).join(" → ") } : {}),
  };
}

/** The rendered route in plan and log text: "r8c1 普通战 → r9c1 休息 → … → r16c3 Boss". */
export function routeText(map: RouteMap, ids: string[]): string {
  return ids.map((id) => `${id} ${roomName(map.nodes.get(id)?.type ?? "?")}`).join(" → ");
}

/* ---- reading a rendered map back ----------------------------------------------------------------- */

const LINE = /^F(\d+) (r\d+c\d+) ([^\s（]+)((?:（[^）]*）)*)(?: → (.+))?$/;

const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/** The map a RouteView shows (the answer checker's map); null when it holds no map lines. */
export function routeMapFromView(value: unknown): RouteMap | null {
  const view = record(value);
  const lines = Array.isArray(view["map"]) ? view["map"].filter((line): line is string => typeof line === "string") : [];
  const nodes: RouteMapInput["nodes"] = [];
  let firstFloor: number | null = null;
  let current: Point | null = null;
  for (const line of lines) {
    const match = LINE.exec(line.trim());
    if (!match) continue;
    const point = parseNodeId(match[2]!)!;
    firstFloor ??= Number(match[1]) - point.row;
    const marks = match[4] ?? "";
    const children = (match[5] ?? "").split(/\s+/).map((id) => parseNodeId(id)).filter((child): child is Point => child !== null);
    const name = match[3]!;
    nodes.push({ ...point, type: TYPE_OF_NAME[name] ?? name, children, visited: /已走|当前/.test(marks), boss: /boss/.test(marks) || name === "Boss" });
    if (marks.includes("当前")) current = point;
  }
  if (nodes.length === 0) return null;
  const next = (Array.isArray(view["next_nodes"]) ? view["next_nodes"] : []).map((id) => (typeof id === "string" ? parseNodeId(id.trim()) : null)).filter((point): point is Point => point !== null);
  const boots = typeof view["winged_boots_left"] === "number" ? view["winged_boots_left"] : 0;
  const act = firstFloor === null ? 1 : Math.max(1, ACT_FIRST_FLOOR.findIndex((floor) => floor === firstFloor) + 1);
  return buildRouteMap({ act, nodes, current, next, boots });
}

/* ---- the answer ---------------------------------------------------------------------------------- */

/** Whether a route answer says "keep" (follow the plan as it is). */
export function isKeep(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 1 && isKeep(value[0]);
  return typeof value === "string" && /^\s*["']?keep["']?\s*$/i.test(value);
}

/**
 * The node ids a route answer names, in order: a string ("r8c1 r9c1 … r16c3", with any separators or arrows) or a
 * list of ids; null when it names none (missing, "keep", or no id in it).
 */
export function routeIds(value: unknown): string[] | null {
  const text = Array.isArray(value) ? value.filter((item) => typeof item === "string").join(" ") : typeof value === "string" ? value : "";
  const ids = [...text.matchAll(/r\s*(\d+)\s*c\s*(\d+)/gi)].map((match) => nodeId(Number(match[1]), Number(match[2])));
  return ids.length > 0 ? ids : null;
}

/** The answer's route as one string for logs and v3's answer fields ("keep", "r8c1 r9c1 …", or as given). */
export function routeAnswerText(value: unknown): string {
  if (isKeep(value)) return "keep";
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string").map((item) => item.trim()).join(" ");
  return typeof value === "string" ? value.trim() : "";
}

/**
 * What is wrong with a route on this map, step by step (empty: it is legal). The route starts at one of the next
 * nodes, goes one row at a time along the lines, jumps (a step off the lines to any node of the next row) at most as
 * often as there are Winged Boots charges, names only nodes on the map, and ends at a boss node.
 */
export function checkRoute(map: RouteMap, ids: string[]): string[] {
  if (ids.length === 0) return ["路线是空的：要给出从下一步到 boss 的节点序列"];
  const problems: string[] = [];
  const unknown = ids.map((id, at) => ({ id, at })).filter(({ id }) => !map.nodes.has(id));
  for (const { id, at } of unknown) problems.push(`第 ${at + 1} 步 ${id}：地图上没有这个节点`);
  if (unknown.length > 0) return problems;
  const jumps: number[] = [];
  const current = map.current ? map.nodes.get(map.current) : undefined;
  const first = map.nodes.get(ids[0]!)!;
  if (!map.next.includes(first.id)) {
    const nextRow = current ? current.row + 1 : Math.min(...map.next.map((id) => map.nodes.get(id)?.row ?? Infinity));
    if (map.boots > 0 && first.row === nextRow) jumps.push(1);
    else problems.push(`第 1 步 ${first.id}：不是下一步能走的节点（能走：${map.next.join("、") || "无"}）`);
  } else if (current && !current.children.includes(first.id)) {
    // Offered on the map screen only through a boots jump.
    jumps.push(1);
  }
  for (let at = 1; at < ids.length; at += 1) {
    const from = map.nodes.get(ids[at - 1]!)!;
    const to = map.nodes.get(ids[at]!)!;
    if (to.row !== from.row + 1) {
      problems.push(`第 ${at + 1} 步 ${from.id} → ${to.id}：不是下一层（${from.id} 在第 ${from.row} 行，下一步要在第 ${from.row + 1} 行）`);
      continue;
    }
    if (from.children.includes(to.id)) continue;
    if (map.boots > 0) jumps.push(at + 1);
    else problems.push(`第 ${at + 1} 步 ${from.id} → ${to.id}：没有连线（${from.id} 只连到 ${from.children.join("、") || "无"}；没有飞行靴次数）`);
  }
  if (jumps.length > map.boots) problems.push(`飞行靴只剩 ${map.boots} 次，这条路线不沿连线跳了 ${jumps.length} 次（第 ${jumps.join("、")} 步）`);
  const last = map.nodes.get(ids[ids.length - 1]!)!;
  if (!map.bosses.includes(last.id)) problems.push(`终点 ${last.id}（${roomName(last.type)}）不是 boss：路线要一直走到 boss（${map.bosses.join("、") || "?"}）`);
  return problems;
}

/** The steps of a legal route that jump with Winged Boots (1-based), for the plan's facts. */
export function bootsJumps(map: RouteMap, ids: string[]): number[] {
  const out: number[] = [];
  const current = map.current ? map.nodes.get(map.current) : undefined;
  ids.forEach((id, at) => {
    const from = at === 0 ? current : map.nodes.get(ids[at - 1]!);
    if (from && !from.children.includes(id)) out.push(at + 1);
  });
  return out;
}

/** Whether anything is left to choose from here to the boss: a fork on some path, or boots charges. */
export function hasChoiceAhead(map: RouteMap): boolean {
  if (map.boots > 0 || map.next.length > 1) return true;
  const seen = new Set<string>();
  const stack = [...map.next];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = map.nodes.get(id);
    if (!node) continue;
    if (node.children.length > 1) return true;
    stack.push(...node.children);
  }
  return false;
}

/* ---- the chosen route's facts ------------------------------------------------------------------- */

/** The room costs at their p75: the projection run on these is every room at its p75 in a row (a pessimistic line). */
export function p75Costs(costs: RoomCostModel): RoomCostModel {
  const at75 = (entry: RoomCostEntry): RoomCostEntry => ({ ...entry, median: entry.p75 });
  return { ...costs, monster: at75(costs.monster), elite: at75(costs.elite), unknown: at75(costs.unknown) };
}

export interface RouteFacts {
  /** Every node's HP on arrival: median and p75 projections. */
  arrival: string[];
  /** Each rest site on the route: HP on arrival, after resting (HEAL), after smithing (no heal). */
  rest_sites: string[];
  /** Fights between here and the next rest site. */
  fights_before_rest: string;
  next_elite: string;
  boss: string;
  /** Where the median projection runs out, when it does. */
  hp_runs_out?: string;
  /** Winged Boots jumps on the route. */
  winged_boots?: string;
  /** The HP each option of this question leaves, and where that puts the next elite and the boss (a rest site's options). */
  if_option?: string[];
  about: string;
}

export interface RouteStart {
  /** Absolute HP and max HP the route starts with. */
  hp: number;
  max: number;
}

const hpAt = (hp: number, max: number): string => (hp > 0 ? `${Math.round(hp)}/${max}` : "0（血量耗尽）");

/** One node's arrival text: "52/80（p75 45）". */
function arrivalText(median: PathProjection, p75: PathProjection, at: number): string {
  const max = median.maxArrival[at]!;
  const low = p75.arrival[at]!;
  return `${hpAt(median.arrival[at]!, max)}（p75 ${low > 0 ? Math.round(low) : "耗尽"}）`;
}

/**
 * The facts of a route from here (the route's first node on), projected from `start` with the measured room costs
 * (route-projection.ts, unchanged): HP on arrival at each node at the median costs and with every room at its p75
 * cost, each rest site healed or smithed, the fights before the next rest site, the next elite and the boss.
 * `chain`: the fight chain ending at the current node (screens/map.ts chainAfter: act 1 fights in a row; acts 2 and 3
 * the Monster and Elite rooms since the last rest site or the act start, shops and "?" rooms not ending it, as the
 * experience route-no-chains counts a stretch). `options`: the HP each option of this question leaves.
 */
export function routeFacts(map: RouteMap, ids: string[], start: RouteStart, costs: RoomCostModel, chain = 0, options: { label: string; hp: number; max: number }[] = []): RouteFacts {
  const nodes = ids.map((id) => map.nodes.get(id)!);
  const types = nodes.map((node) => node.type);
  const median = projectPath(types, start.hp, costs, start.max);
  const p75 = projectPath(types, start.hp, p75Costs(costs), start.max);
  const place = (at: number): string => `F${floorOfRow(map, nodes[at]!.row)} ${nodes[at]!.id}`;
  const where = (at: number): string => `${place(at)} ${roomName(nodes[at]!.type)}`;
  const arrival = nodes.map((_, at) => `${where(at)}：${arrivalText(median, p75, at)}`);
  const enter = costs.rest?.enterHeal ?? 0;
  const rest_sites = nodes.flatMap((node, at) => {
    if (!isRestType(node.type)) return [];
    const max = median.maxArrival[at]!;
    const heal = (hp: number): string => (hp > 0 ? `${Math.round(restedHp(hp, max, costs.rest).hp)}` : "耗尽");
    const smith = (hp: number): string => (hp > 0 ? `${Math.round(Math.min(max, hp + enter))}` : "耗尽");
    const healMax = max + (costs.rest?.maxGain ?? 0);
    return [`${where(at)}：到达 ${arrivalText(median, p75, at)}；回血 → ${heal(median.arrival[at]!)}/${healMax}（p75 ${heal(p75.arrival[at]!)}）；锻造（不回血）→ ${smith(median.arrival[at]!)}/${max}（p75 ${smith(p75.arrival[at]!)}）`];
  });
  const restAt = nodes.findIndex((node) => isRestType(node.type));
  const before = restAt >= 0 ? nodes.slice(0, restAt) : nodes.filter((node) => node.type !== "Boss");
  const monsters = before.filter((node) => node.type === "Monster").length;
  const elites = before.filter((node) => node.type === "Elite").length;
  const unknown = before.filter((node) => node.type === "Unknown").length;
  const shops = before.filter((node) => node.type === "Shop").length;
  const counted = `战斗 ${monsters + elites} 场（普通战 ${monsters}、精英 ${elites}），问号 ${unknown} 个，商店 ${shops} 个`;
  // Act 1: the old chain (fights in a row). Acts 2-3: the stretch between rest sites, its fights so far and in all.
  const sofar =
    map.act >= 2
      ? `；本幕从上一个休息点（没有就从幕初）到当前节点已打普通战和精英 ${chain} 场（商店、问号不打断，问号不计），这一段到${restAt >= 0 ? `休息点 ${place(restAt)}` : " boss"} 前共 ${chain + monsters + elites} 场`
      : `；到当前节点为止已连续战斗 ${chain} 场`;
  const fights_before_rest = (restAt >= 0 ? `到下一个休息点 ${place(restAt)} 前：${counted}` : `路线上没有休息点：到 boss 前${counted}`) + sofar;
  const eliteAt = nodes.findIndex((node) => node.type === "Elite");
  const bossAt = nodes.findIndex((node) => map.bosses.includes(node.id));
  const next_elite = eliteAt >= 0 ? `${place(eliteAt)}：到达 ${arrivalText(median, p75, eliteAt)}` : "路线上没有精英";
  const boss =
    bossAt >= 0
      ? `${place(bossAt)}：到达 ${arrivalText(median, p75, bossAt)}${map.bosses.length > 1 ? `；之后还有第 ${map.bosses.length} 个 boss（${map.bosses.slice(1).join("、")}），中间不休息` : ""}`
      : "路线没有走到 boss";
  const jumps = bootsJumps(map, ids);
  const facts: RouteFacts = {
    arrival,
    rest_sites: rest_sites.length > 0 ? rest_sites : ["路线上没有休息点"],
    fights_before_rest,
    next_elite,
    boss,
    ...(median.runsOut !== null ? { hp_runs_out: `按中位数投影，血量在 ${where(median.runsOut)} 耗尽` } : {}),
    ...(jumps.length > 0 ? { winged_boots: `第 ${jumps.join("、")} 步用飞行靴跳跃（共 ${jumps.length} 次，剩 ${map.boots} 次）` } : {}),
    about:
      `从现在的 HP ${hpAt(start.hp, start.max)} 起按实测房间掉血投影（route-projection，算法未改）：中位数 = 每个房间按中位数代价；p75 = 每个战斗和问号房都按 p75 代价连续累计（偏悲观）；` +
      "之后的休息点按回血算（锻造的情况单独列出）；死亡不会被后面的休息点救回。",
  };
  if (options.length > 0) {
    facts.if_option = options.map((option) => {
      const run = projectPath(types, option.hp, costs, option.max);
      const low = projectPath(types, option.hp, p75Costs(costs), option.max);
      const point = (at: number, what: string): string => `${what} ${hpAt(run.arrival[at]!, run.maxArrival[at]!)}（p75 ${low.arrival[at]! > 0 ? Math.round(low.arrival[at]!) : "耗尽"}）`;
      const parts = [...(eliteAt >= 0 ? [point(eliteAt, "下一只精英前")] : []), ...(bossAt >= 0 ? [point(bossAt, "boss 前")] : [])];
      return `${option.label}（HP ${hpAt(option.hp, option.max)}）：${parts.join("，") || "路线上没有精英和 boss"}`;
    });
  }
  return facts;
}

/** The room costs the facts use, with their sources and n (Chinese, one line). */
export function roomCostsLine(costs: RoomCostModel): string {
  const r = (value: number): string => String(Math.round(value * 10) / 10);
  const one = (label: string, entry: RoomCostEntry): string => `${label} ${r(entry.median)}/${r(entry.p75)}（${entry.source}）`;
  const rest = costs.rest && costs.rest.sources.length > 0 ? `，另加 ${costs.rest.sources.join("、")}` : "";
  return (
    `第 ${costs.act} 幕每个房间掉血（中位数/p75，最大生命 ${costs.maxHp}）：${one("普通战", costs.monster)}；${one("精英", costs.elite)}；${one("问号", costs.unknown)}。` +
    `掉血 = 进房 HP 减下一层 HP（已含燃烧之血、药水、事件），死在房间里记为全部进房 HP；休息回血 = 最大生命 30%（向下取整）${rest}，锻造不回血` +
    `${costs.bossStartHeal ? `；boss 战开始回 ${costs.bossStartHeal}（缩放仪），已算进 boss 前血量` : ""}。`
  );
}

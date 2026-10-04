/**
 * The act's map as the brain sees it (M2, src/sim/route-map.ts): the rendered map and reading it back, the route
 * check (lines, Winged Boots charges, the boss, A10's two boss nodes, node ids, step-by-step errors), the answer
 * parser, and the chosen route's facts on a fixed map with fixed room costs (no logged data).
 */

import { describe, expect, it } from "vitest";

import { bootsJumps, buildRouteMap, checkRoute, hasChoiceAhead, isKeep, mapLines, MAP_LEGEND, routeAnswerText, routeFacts, routeIds, routeMapFromView, routeText, routeView } from "../src/sim/route-map.js";
import type { RoomCostModel } from "../src/sim/route-projection.js";
import { costs, input, p } from "./route-fixture.js";

describe("the map the brain sees", () => {
  it("one line per node with its floor, id, type, marks and lines; every boss node marked (A10: both)", () => {
    const map = buildRouteMap(input());
    expect(map.bosses).toEqual(["r4c1", "r5c1"]);
    expect(mapLines(map)).toEqual([
      "F1 r0c1 普通战（当前） → r1c0 r1c2",
      "F2 r1c0 休息 → r2c0",
      "F2 r1c2 精英 → r2c1 r2c2",
      "F3 r2c0 问号 → r3c1",
      "F3 r2c1 商店 → r3c1",
      "F3 r2c2 普通战 → r3c2",
      "F4 r3c1 休息 → r4c1",
      "F4 r3c2 普通战 → r4c1",
      "F5 r4c1 Boss（第 1 个 boss） → r5c1",
      "F6 r5c1 问号（第 2 个 boss）",
    ]);
    const view = routeView(map);
    expect(view).toMatchObject({ map_legend: MAP_LEGEND, position: "你在 r0c1（F1 普通战）；下一步可走：r1c0、r1c2", next_nodes: ["r1c0", "r1c2"], winged_boots_left: 0, boss: "r4c1（F5 Boss） → r5c1（F6 问号）", walked: "r0c1" });
    expect(MAP_LEGEND).toContain("r<行>c<列>");
    // One boss: "本幕 boss". Act 2 starts at F18 (row 0).
    const single = buildRouteMap(input({ act: 2, nodes: input().nodes.slice(0, 9).map((node) => (node.row === 4 ? { ...node, children: [] } : node)), bosses: [p(4, 1)] }));
    expect(mapLines(single).at(-1)).toBe("F22 r4c1 Boss（本幕 boss）");
    expect(mapLines(single)[0]).toBe("F18 r0c1 普通战（当前） → r1c0 r1c2");
  });

  it("walked nodes are marked; the next nodes a boots jump would take are marked in the position", () => {
    const map = buildRouteMap(input({ current: p(1, 2), nodes: input().nodes.map((node) => (node.row === 1 && node.col === 2 ? { ...node, visited: true } : node)), next: [p(2, 0), p(2, 1), p(2, 2)], boots: 2 }));
    expect(mapLines(map).slice(0, 3)).toEqual(["F1 r0c1 普通战（已走） → r1c0 r1c2", "F2 r1c0 休息 → r2c0", "F2 r1c2 精英（当前） → r2c1 r2c2"]);
    expect(routeView(map).position).toBe("你在 r1c2（F2 精英）；下一步可走：r2c0（飞行靴跳跃）、r2c1、r2c2");
    expect(routeView(map).walked).toBe("r0c1 → r1c2");
  });

  it("reads back what it rendered: nodes, lines, types, the current node, the next nodes, boots and bosses", () => {
    const map = buildRouteMap(input({ boots: 1 }));
    const back = routeMapFromView(JSON.parse(JSON.stringify(routeView(map))))!;
    expect(back.act).toBe(1);
    expect(back.firstFloor).toBe(1);
    expect(back.current).toBe("r0c1");
    expect(back.next).toEqual(["r1c0", "r1c2"]);
    expect(back.boots).toBe(1);
    expect(back.bosses).toEqual(["r4c1", "r5c1"]);
    expect([...back.nodes.values()]).toEqual([...map.nodes.values()]);
    expect(routeMapFromView({ map: [] })).toBeNull();
    expect(routeMapFromView("nothing")).toBeNull();
    // Act 3 from its first floor (F34).
    expect(routeMapFromView(routeView(buildRouteMap(input({ act: 3 }))))!.act).toBe(3);
  });

  it("whether anything is left to choose: a fork ahead or boots charges", () => {
    expect(hasChoiceAhead(buildRouteMap(input()))).toBe(true);
    const straight = buildRouteMap(input({ current: p(2, 0), next: [p(3, 1)] }));
    expect(hasChoiceAhead(straight)).toBe(false);
    expect(hasChoiceAhead({ ...straight, boots: 1 })).toBe(true);
  });
});

describe("the route check", () => {
  const map = buildRouteMap(input());

  it("a route from a next node along the lines to a boss is legal; A10: ending at either boss node", () => {
    expect(checkRoute(map, ["r1c2", "r2c2", "r3c2", "r4c1"])).toEqual([]);
    expect(checkRoute(map, ["r1c0", "r2c0", "r3c1", "r4c1", "r5c1"])).toEqual([]);
  });

  it("names the step, the nodes and why: not a next node, no line, a skipped row, an unknown id, not ending at a boss", () => {
    expect(checkRoute(map, [])).toEqual(["路线是空的：要给出从下一步到 boss 的节点序列"]);
    expect(checkRoute(map, ["r1c2", "r2c9", "r3c2", "r4c1"])).toEqual(["第 2 步 r2c9：地图上没有这个节点"]);
    expect(checkRoute(map, ["r2c0", "r3c1", "r4c1"])).toEqual(["第 1 步 r2c0：不是下一步能走的节点（能走：r1c0、r1c2）"]);
    expect(checkRoute(map, ["r1c2", "r2c0", "r3c1", "r4c1"])).toEqual(["第 2 步 r1c2 → r2c0：没有连线（r1c2 只连到 r2c1、r2c2；没有飞行靴次数）"]);
    expect(checkRoute(map, ["r1c2", "r3c2", "r4c1"])).toEqual(["第 2 步 r1c2 → r3c2：不是下一层（r1c2 在第 1 行，下一步要在第 2 行）"]);
    expect(checkRoute(map, ["r1c2", "r2c2", "r3c2"])).toEqual(["终点 r3c2（普通战）不是 boss：路线要一直走到 boss（r4c1、r5c1）"]);
  });

  it("Winged Boots: a step off the lines to any node of the next row, at most one per charge left", () => {
    const boots = buildRouteMap(input({ boots: 1 }));
    expect(checkRoute(boots, ["r1c2", "r2c0", "r3c1", "r4c1"])).toEqual([]);
    expect(bootsJumps(boots, ["r1c2", "r2c0", "r3c1", "r4c1"])).toEqual([2]);
    expect(checkRoute(boots, ["r1c2", "r2c0", "r3c2", "r4c1"])).toEqual(["飞行靴只剩 1 次，这条路线不沿连线跳了 2 次（第 2、3 步）"]);
    // A jump does not skip a row.
    expect(checkRoute(boots, ["r1c2", "r3c1", "r4c1"])).toEqual(["第 2 步 r1c2 → r3c1：不是下一层（r1c2 在第 1 行，下一步要在第 2 行）"]);
    // The first step: a next-row node off this node's lines is a jump (the map screen lists them with boots).
    const fromShop = buildRouteMap(input({ current: p(2, 1), next: [p(3, 1)], boots: 1 }));
    expect(checkRoute(fromShop, ["r3c2", "r4c1"])).toEqual([]);
    expect(bootsJumps(fromShop, ["r3c2", "r4c1"])).toEqual([1]);
    expect(checkRoute({ ...fromShop, boots: 0 }, ["r3c2", "r4c1"])).toEqual(["第 1 步 r3c2：不是下一步能走的节点（能走：r3c1）"]);
  });

  it("reads the answer: ids in any separators or a list, keep, or nothing", () => {
    expect(routeIds("r1c2 r2c2 → r3c2, R4C1")).toEqual(["r1c2", "r2c2", "r3c2", "r4c1"]);
    expect(routeIds(["r1c2", "r2c2"])).toEqual(["r1c2", "r2c2"]);
    expect(routeIds("keep")).toBeNull();
    expect(routeIds(undefined)).toBeNull();
    expect(isKeep("keep")).toBe(true);
    expect(isKeep(" Keep ")).toBe(true);
    expect(isKeep(["keep"])).toBe(true);
    expect(isKeep("r1c2")).toBe(false);
    expect(routeAnswerText(["r1c2", " r2c2"])).toBe("r1c2 r2c2");
    expect(routeAnswerText("KEEP")).toBe("keep");
    expect(routeAnswerText(null)).toBe("");
    expect(routeText(map, ["r1c2", "r2c2", "r4c1"])).toBe("r1c2 精英 → r2c2 普通战 → r4c1 Boss");
  });
});

describe("the chosen route's facts (fixed room costs: hallway 10/16, elite 25/35, ? 2/6; rest 30% of 80 = 24)", () => {
  const map = buildRouteMap(input());

  it("HP on arrival at every node at the median and p75 costs, the next elite, the boss, a route with no rest site", () => {
    const facts = routeFacts(map, ["r1c2", "r2c2", "r3c2", "r4c1"], { hp: 60, max: 80 }, costs, 1);
    expect(facts.arrival).toEqual(["F2 r1c2 精英：60/80（p75 60）", "F3 r2c2 普通战：35/80（p75 25）", "F4 r3c2 普通战：25/80（p75 9）", "F5 r4c1 Boss：15/80（p75 耗尽）"]);
    expect(facts.rest_sites).toEqual(["路线上没有休息点"]);
    expect(facts.fights_before_rest).toBe("路线上没有休息点：到 boss 前战斗 3 场（普通战 2、精英 1），问号 0 个，商店 0 个；到当前节点为止已连续战斗 1 场");
    expect(facts.next_elite).toBe("F2 r1c2：到达 60/80（p75 60）");
    expect(facts.boss).toBe("F5 r4c1：到达 15/80（p75 耗尽）；之后还有第 2 个 boss（r5c1），中间不休息");
    expect(facts.hp_runs_out).toBeUndefined();
    expect(facts.about).toContain("p75 = 每个战斗和问号房都按 p75 代价连续累计");
  });

  it("each rest site healed or smithed; the fights before the next rest site; later rests heal in the projection", () => {
    const facts = routeFacts(map, ["r1c0", "r2c0", "r3c1", "r4c1"], { hp: 60, max: 80 }, costs);
    expect(facts.arrival).toEqual(["F2 r1c0 休息：60/80（p75 60）", "F3 r2c0 问号：80/80（p75 80）", "F4 r3c1 休息：78/80（p75 74）", "F5 r4c1 Boss：80/80（p75 80）"]);
    expect(facts.rest_sites).toEqual(["F2 r1c0 休息：到达 60/80（p75 60）；回血 → 80/80（p75 80）；锻造（不回血）→ 60/80（p75 60）", "F4 r3c1 休息：到达 78/80（p75 74）；回血 → 80/80（p75 80）；锻造（不回血）→ 78/80（p75 74）"]);
    expect(facts.fights_before_rest).toBe("到下一个休息点 F2 r1c0 前：战斗 0 场（普通战 0、精英 0），问号 0 个，商店 0 个；到当前节点为止已连续战斗 0 场");
    expect(facts.next_elite).toBe("路线上没有精英");
  });

  it("the median projection running out, a rest site's options, boots jumps", () => {
    const low = routeFacts(map, ["r1c2", "r2c2", "r3c2", "r4c1"], { hp: 30, max: 80 }, costs, 0, [{ label: "o0 HEAL", hp: 54, max: 80 }, { label: "o1 SMITH", hp: 30, max: 80 }]);
    expect(low.hp_runs_out).toBe("按中位数投影，血量在 F3 r2c2 普通战 耗尽");
    expect(low.arrival[2]).toBe("F4 r3c2 普通战：0（血量耗尽）（p75 耗尽）");
    expect(low.if_option).toEqual(["o0 HEAL（HP 54/80）：下一只精英前 54/80（p75 54），boss 前 9/80（p75 耗尽）", "o1 SMITH（HP 30/80）：下一只精英前 30/80（p75 30），boss 前 0（血量耗尽）（p75 耗尽）"]);
    const boots = buildRouteMap(input({ boots: 1 }));
    expect(routeFacts(boots, ["r1c2", "r2c0", "r3c1", "r4c1"], { hp: 60, max: 80 }, costs).winged_boots).toBe("第 2 步用飞行靴跳跃（共 1 次，剩 1 次）");
  });

  it("rest relics: Regal Pillow heals 15 more at every rest site on the route", () => {
    const pillow: RoomCostModel = { ...costs, rest: { bonus: 15, maxGain: 0, sources: ["Regal Pillow +15 HP"] } };
    const facts = routeFacts(map, ["r1c0", "r2c0", "r3c1", "r4c1"], { hp: 30, max: 80 }, pillow);
    expect(facts.rest_sites[0]).toBe("F2 r1c0 休息：到达 30/80（p75 30）；回血 → 69/80（p75 69）；锻造（不回血）→ 30/80（p75 30）");
  });
});

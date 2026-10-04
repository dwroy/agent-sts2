/**
 * The act-start route questions' candidate routes (Dai 2026-10-04): a bounded set of distinct routes to the boss with
 * the route projection (median; p75 = that stretch's rooms at their p75 from the median HP it starts with; rest sites
 * healing): the best few by boss-entry HP, the safest, the most elites, the most shops, each split at its rest sites
 * with its fights, elite entries and the HP at each rest site and the boss.
 *
 * Fixed data only: the views the model saw at PEGLM9PFY97U F18 (A9 act 2: the route it took reached F24 at 27/80 and
 * the run died at F30 to the Exoskeletons at 12/80) and GWGTNXPWS7PE F34 (A8 act 3: 10/78 at the F43 rest, died at
 * F44), copied from logs/brain.jsonl (tests/act-route-data/plans.json) with the room costs those questions showed;
 * and small maps built here.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildRouteMap, CANDIDATE_MAX, candidateRoutes, candidateRoutesFacts, checkRoute, routeMapFromView, routesToBoss } from "../src/sim/route-map.js";
import type { RoomCostModel } from "../src/sim/route-projection.js";
import { p } from "./route-fixture.js";

interface Plan {
  hp: string;
  view: Record<string, unknown>;
  answer_route: string;
}

const PLANS = JSON.parse(readFileSync(join(import.meta.dirname, "act-route-data", "plans.json"), "utf8")) as Record<string, Plan>;
const entry = (median: number, p75: number) => ({ median, p75, source: "fixed" });
/** The room costs each question showed (its room_costs line; no rest relics, no boss-start heal). */
const COSTS: Record<string, RoomCostModel> = {
  "pegl-f18-act2": { act: 2, maxHp: 80, monster: entry(8, 17), elite: entry(44, 57.5), unknown: entry(0, 3) },
  "gwgt-f34-act3": { act: 3, maxHp: 82, monster: entry(8, 20), elite: entry(32, 54), unknown: entry(0, 0) },
};

function plan(name: string) {
  const logged = PLANS[name]!;
  const [hp, max] = /(\d+)\/(\d+)/.exec(logged.hp)!.slice(1).map(Number) as [number, number];
  return { map: routeMapFromView(logged.view)!, start: { hp, max }, costs: COSTS[name]!, answer: logged.answer_route };
}

describe("PEGLM9PFY97U F18 (A9 act 2, 69/80): the act plan it took and the others", () => {
  it("five distinct routes, each split at its rest sites, with the HP there and at the boss", () => {
    const { map, start, costs } = plan("pegl-f18-act2");
    const facts = candidateRoutesFacts(map, start, costs)!;
    expect(facts.about).toContain("从现在的 HP 69/80 起");
    expect(facts.routes).toEqual([
      "【boss 前 HP 第 1】r1c6 r2c6 r3c6 r4c6 r5c6 r6c5 r7c5 r8c6 r9c5 r10c6 r11c6 r12c5 r13c6 r14c5 r15c3：F19–F24 普通战 4、问号 1、商店 1 → F25 休息 37/80（p75 耗尽）；F26 宝箱 1 → F27 休息 61/80（p75 61）；F28 普通战 1 → F29 休息 72/80（p75 63）；F30–F31 普通战 1、问号 1 → F32 休息 72/80（p75 60）；F33 boss 80/80（p75 80）",
      "【boss 前 HP 第 2】r1c6 r2c6 r3c6 r4c6 r5c6 r6c6 r7c6 r8c6 r9c5 r10c6 r11c6 r12c5 r13c6 r14c5 r15c3：F19–F26 普通战 4、问号 2、商店 1、宝箱 1 → F27 休息 37/80（p75 耗尽）；F28 普通战 1 → F29 休息 53/80（p75 44）；F30–F31 普通战 1、问号 1 → F32 休息 69/80（p75 57）；F33 boss 80/80（p75 80）",
      "【boss 前 HP 第 3】r1c6 r2c6 r3c6 r4c6 r5c6 r6c5 r7c5 r8c6 r9c5 r10c6 r11c6 r12c5 r13c4 r14c5 r15c3：F19–F24 普通战 4、问号 1、商店 1 → F25 休息 37/80（p75 耗尽）；F26 宝箱 1 → F27 休息 61/80（p75 61）；F28 普通战 1 → F29 休息 72/80（p75 63）；F30–F31 普通战 2 → F32 休息 64/80（p75 46）；F33 boss 80/80（p75 80）",
      "【最稳（路上最低点最高）；商店最多（2）】r1c1 r2c0 r3c0 r4c0 r5c0 r6c0 r7c0 r8c1 r9c0 r10c0 r11c0 r12c0 r13c0 r14c0 r15c3：F19–F23 普通战 3、问号 1、商店 1 → F24 休息 45/80（p75 15）；F25–F31 普通战 3、问号 2、商店 1、宝箱 1 → F32 休息 45/80（p75 12）；F33 boss 69/80（p75 69）",
      "【精英最多（3）】r1c6 r2c6 r3c6 r4c6 r5c6 r6c5 r7c4 r8c3 r9c3 r10c3 r11c2 r12c2 r13c2 r14c2 r15c3：F19–F26 普通战 4、精英 1（F25 进场 37/80，p75 耗尽）、问号 1、商店 1、宝箱 1 → F27 休息 耗尽；F28–F31 普通战 2、精英 2（F28 进场 耗尽；F30 进场 耗尽） → F32 休息 耗尽；F33 boss 耗尽",
    ]);
    // A route with a "?" room where the first has its shop (both cost nothing: the same numbers) is not another best.
  });

  it("the route the answer took is the listed safest one: seven rooms with no rest site after F24, p75 12 on reaching F32", () => {
    const { map, start, costs, answer } = plan("pegl-f18-act2");
    const taken = candidateRoutes(map, start, costs).find((c) => c.route.ids.join(" ") === answer)!;
    expect(taken.why).toEqual(["最稳（路上最低点最高）", "商店最多（2）"]);
    expect(taken.legs.map((leg) => leg.rooms.length)).toEqual([5, 7, 0]);
    // The second stretch's bad line: every room of it at p75 from the 69 the F24 heal leaves (45 + 24).
    expect(Math.round(taken.p75[taken.legs[1]!.end]!)).toBe(12);
    expect(taken.lowP75).toBe(12);
  });

  it("every listed route is a legal answer (from a next node along the lines to the boss)", () => {
    const { map, start, costs } = plan("pegl-f18-act2");
    for (const c of candidateRoutes(map, start, costs)) expect(checkRoute(map, c.route.ids)).toEqual([]);
  });
});

describe("GWGTNXPWS7PE F34 (A8 act 3, 72/82)", () => {
  it("safest: when every route's p75 line runs out somewhere, the one with the highest lowest median point", () => {
    const { map, start, costs, answer } = plan("gwgt-f34-act3");
    const list = candidateRoutes(map, start, costs);
    const safest = list.find((c) => c.why.some((why) => why.startsWith("最稳")))!;
    expect(safest.lowP75).toBe(0);
    for (const c of list) expect(c.lowMedian).toBeLessThanOrEqual(safest.lowMedian);
    // The route the run took (10/78 at the F43 rest, died at F44): listed, its F43 projection 24/82 with p75 run out.
    const taken = list.find((c) => c.route.ids.join(" ") === answer)!;
    expect(taken).toBeDefined();
    expect(candidateRoutesFacts(map, start, costs)!.routes.find((line) => line.includes(answer))).toContain("F43 休息 24/82（p75 耗尽）");
  });
});

describe("listing rules, on small maps", () => {
  const costs: RoomCostModel = { act: 2, maxHp: 80, monster: entry(10, 16), elite: entry(25, 35), unknown: entry(2, 6) };

  it("routes with the same room types are one route; every route reaches the boss", () => {
    // r0c1 (here) → r1c0 普通战 | r1c2 普通战; both → r2c1 休息 → r3c1 Boss: one sequence of room types.
    const map = buildRouteMap({
      act: 2,
      nodes: [
        { ...p(0, 1), type: "Monster", children: [p(1, 0), p(1, 2)], visited: true },
        { ...p(1, 0), type: "Monster", children: [p(2, 1)] },
        { ...p(1, 2), type: "Monster", children: [p(2, 1)] },
        { ...p(2, 1), type: "RestSite", children: [p(3, 1)] },
        { ...p(3, 1), type: "Boss", children: [] },
      ],
      bosses: [p(3, 1)],
      current: p(0, 1),
      next: [p(1, 0), p(1, 2)],
      boots: 0,
    });
    // One path per next node (the first node differs), one candidate in the list (the same stretches).
    expect(routesToBoss(map)).toHaveLength(2);
    expect(candidateRoutesFacts(map, { hp: 60, max: 80 }, costs)!.routes).toEqual([
      "【boss 前 HP 第 1；最稳（路上最低点最高）】r1c0 r2c1 r3c1：F19 普通战 1 → F20 休息 50/80（p75 44）；F21 boss 74/80（p75 74）",
    ]);
  });

  it("best by boss HP, safest, most elites, most shops; at most CANDIDATE_MAX, each once with all its reasons", () => {
    // r0c3 (here) → seven nodes on row 1, each → its own row-2 room → r3c3 休息 → r4c3 Boss.
    const rooms = ["Shop", "Elite", "Monster", "Unknown", "Shop", "Elite", "Treasure"];
    const second = ["Shop", "Elite", "Unknown", "Monster", "Monster", "Monster", "Treasure"];
    const map = buildRouteMap({
      act: 2,
      nodes: [
        { ...p(0, 3), type: "Monster", children: [0, 1, 2, 3, 4, 5, 6].map((col) => p(1, col)), visited: true },
        ...rooms.map((type, col) => ({ ...p(1, col), type, children: [p(2, col)] })),
        ...second.map((type, col) => ({ ...p(2, col), type, children: [p(3, 3)] })),
        { ...p(3, 3), type: "RestSite", children: [p(4, 3)] },
        { ...p(4, 3), type: "Boss", children: [] },
      ],
      bosses: [p(4, 3)],
      current: p(0, 3),
      next: [0, 1, 2, 3, 4, 5, 6].map((col) => p(1, col)),
      boots: 0,
    });
    const list = candidateRoutes(map, { hp: 60, max: 80 }, costs);
    expect(list.length).toBeLessThanOrEqual(CANDIDATE_MAX);
    const whyOf = (first: string): string[] => list.find((c) => c.route.ids[0] === first)?.why ?? [];
    // Two shops (c0) cost nothing: the best, the safest and the most shops. A shop and a treasure (c6) have the very
    // same numbers: not another best. Then c4 (shop, hallway: 10), c2 (hallway, "?": 12; c3 the same numbers).
    expect(whyOf("r1c0")).toEqual(["boss 前 HP 第 1", "最稳（路上最低点最高）", "商店最多（2）"]);
    expect(whyOf("r1c6")).toEqual([]);
    expect(whyOf("r1c4")).toEqual(["boss 前 HP 第 2"]);
    expect(whyOf("r1c2")).toEqual(["boss 前 HP 第 3"]);
    expect(whyOf("r1c1")).toEqual(["精英最多（2）"]);
    // Ordered by boss-entry HP.
    expect(list.map((c) => c.route.ids[0])).toEqual(["r1c0", "r1c4", "r1c2", "r1c1"]);
  });

  it("the bad-stretch line starts each stretch from the median HP it begins with (the rest site's heal on the median line)", () => {
    // r0c0 (here) → r1c0 普通战 → r2c0 普通战 → r3c0 休息 → r4c0 普通战 → r5c0 休息 → r6c0 Boss.
    const types = ["Monster", "Monster", "Monster", "RestSite", "Monster", "RestSite", "Boss"];
    const map = buildRouteMap({
      act: 2,
      nodes: types.map((type, row) => ({ ...p(row, 0), type, children: row < types.length - 1 ? [p(row + 1, 0)] : [], visited: row === 0 })),
      bosses: [p(6, 0)],
      current: p(0, 0),
      next: [p(1, 0)],
      boots: 0,
    });
    const [only] = candidateRoutes(map, { hp: 60, max: 80 }, costs);
    // 60 - 10 - 10 = 40 at the F21 rest (p75: 60 - 16 - 16 = 28); healed 64; - 10 = 54 at F23 (p75 64 - 16 = 48).
    expect(candidateRoutesFacts(map, { hp: 60, max: 80 }, costs)!.routes[0]).toBe(
      "【boss 前 HP 第 1；最稳（路上最低点最高）】r1c0 r2c0 r3c0 r4c0 r5c0 r6c0：F19–F20 普通战 2 → F21 休息 40/80（p75 28）；F22 普通战 1 → F23 休息 54/80（p75 48）；F24 boss 78/80（p75 78）",
    );
    expect(only!.lowP75).toBe(28);
  });
});

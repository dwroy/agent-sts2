/**
 * The route review's next_rest facts (Dai 2026-10-03, experience route-replan-on-drop): for the kept route and the
 * routes the answer may switch to, the fights and "?" rooms to the next rest site, whether the stretch passes a
 * shop, and the projected HP on arriving there (median and p75, the route projection unchanged); an alternative
 * clearly worse than the kept route says so, and a change logs the same comparison for the route it took.
 *
 * Fixed data only: the views DeepSeek saw at 9175DLPM2EFR F37 (A9 act 3, 49/80: the shop swapped for two hallways,
 * died at F39), QWXKQVYQGGCJ F25 (A8 act 2, a rest site at 30/91: the elite moved after a hallway) and 0QSB9YV3UFCL
 * F19 (A8 act 2, 70/80: past the F28 rest to F32, arrived 7/80), copied from logs/brain.jsonl
 * (tests/route-next-rest-data/reviews.json), with the room costs those reviews showed; and the small fixed map of
 * tests/route-fixture.ts.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { restStart } from "../src/screens/route-review.js";
import {
  buildRouteMap,
  clearlyWorse,
  NEXT_REST_MAX_SWITCHES,
  nextRestFacts,
  nextRestStretches,
  nextRestVersus,
  routeFacts,
  routeMapFromView,
  stretchOf,
  type RouteMap,
} from "../src/strategy/route-map.js";
import type { RoomCostModel } from "../src/strategy/route-projection.js";
import { costs as fixtureCosts, input, p } from "./route-fixture.js";

interface Review {
  hp: string;
  view: Record<string, unknown>;
  plan: string;
  arrival: string[];
  if_option?: string[];
  answer_route: string;
}

const REVIEWS = JSON.parse(readFileSync(join(import.meta.dirname, "route-next-rest-data", "reviews.json"), "utf8")) as Record<string, Review>;

/** The room costs each review showed (its room_costs line). */
const entry = (median: number, p75: number) => ({ median, p75, source: "fixed" });
const COSTS: Record<string, RoomCostModel> = {
  "9175-f37-reward": { act: 3, maxHp: 80, monster: entry(7, 15.8), elite: entry(35.5, 54), unknown: entry(0, 6.8) },
  "qwxk-f25-rest": { act: 2, maxHp: 91, monster: entry(8.5, 18), elite: entry(31, 45), unknown: entry(0, 5) },
  "0qsb-f19-reward": { act: 2, maxHp: 80, monster: entry(10, 19), elite: entry(33, 45.8), unknown: entry(0, 4.8) },
};

function review(name: string): { map: RouteMap; plan: string[]; start: { hp: number; max: number }; costs: RoomCostModel; answer: string[]; logged: Review } {
  const logged = REVIEWS[name]!;
  const map = routeMapFromView(logged.view)!;
  const [hp, max] = /(\d+)\/(\d+)/.exec(logged.hp)!.slice(1).map(Number) as [number, number];
  return { map, plan: logged.plan.split(" → ").map((step) => step.split(" ")[0]!), start: { hp, max }, costs: COSTS[name]!, answer: logged.answer_route.split(" "), logged };
}

describe("the fixed reviews are the views DeepSeek saw", () => {
  it("the plan's arrivals from the copied map and costs are the logged plan_facts", () => {
    for (const name of Object.keys(COSTS)) {
      const { map, plan, start, costs, logged } = review(name);
      expect(routeFacts(map, plan, start, costs).arrival).toEqual(logged.arrival);
    }
  });
});

describe("9175DLPM2EFR F37 (49/80): the shop swapped for two hallways", () => {
  it("keep: shop and a hallway to the F40 rest, 42/80 (p75 33); switch: two hallways, 35/80 (p75 17), clearly worse and saying so", () => {
    const { map, plan, start, costs } = review("9175-f37-reward");
    // Act 3: the Monster/Elite rooms since the act start (r1c4, r3c3) and the stretch's own.
    const facts = nextRestFacts(map, plan, start, costs, 2)!;
    expect(facts.keep).toBe("r4c3 商店 → r5c3 普通战 → F40 r6c2 休息：普通战 1、精英 0（这一段共 3 场）、问号 0，经过商店；到达 42/80（p75 33）");
    expect(facts.switch).toEqual([
      "r4c2 普通战 → r5c2 普通战 → F40 r6c2 休息：普通战 2、精英 0（这一段共 4 场）、问号 0，没有商店；到达 35/80（p75 17）；明显比保留路线差：这条到 F40 约 35/80，保留路线到 F40 约 42/80（p75 17 对 33）",
    ]);
    expect(facts.about).toContain("从现在的 HP 49/80 起");
    expect(facts.about).toContain("keep = 你的计划；switch = ");
  });

  it("the answer's change logs the same comparison, clearly worse", () => {
    const { map, plan, start, costs, answer } = review("9175-f37-reward");
    expect(nextRestVersus(map, plan, answer, start, costs)).toEqual({ text: "新路线到 F40 约 35/80，保留路线到 F40 约 42/80（p75 17 对 33）", worse: true });
    // The kept route again, or one with the same stretch: nothing to compare.
    expect(nextRestVersus(map, plan, plan, start, costs)).toBeNull();
  });
});

describe("QWXKQVYQGGCJ F25 (a rest site at 30/91): the elite moved after a hallway", () => {
  it("at a rest site the stretches start from the HP its heal leaves; the switch to the F27 rest is not worse", () => {
    const { map, plan, start, costs, logged } = review("qwxk-f25-rest");
    const options = logged.if_option!.map((line) => {
      const [, label, hp, max] = /^(.+?)（HP (\d+)\/(\d+)）/.exec(line)!;
      return { label: label!, hp: Number(hp), max: Number(max) };
    });
    const at = restStart(options, start).nextRest!;
    expect(at).toEqual({ start: { hp: 57, max: 91 }, note: "从本休息点 o0 HEAL 后的 HP 57/91 起；不回血就从现在的 30/91 起" });
    const facts = nextRestFacts(map, plan, at.start, costs, 0, at.note)!;
    expect(facts.about).toContain("从本休息点 o0 HEAL 后的 HP 57/91 起");
    expect(facts.keep).toBe("r8c1 宝箱 → r9c0 普通战 → r10c0 精英 → F29 r11c0 休息：普通战 1、精英 1（这一段共 2 场）、问号 0，没有商店；到达 18/91（p75 耗尽）");
    expect(facts.switch).toEqual(["r8c1 宝箱 → F27 r9c1 休息：普通战 0、精英 0（这一段共 0 场）、问号 0，没有商店；到达 57/91（p75 57）"]);
    // The change is better at its next rest site: logged, not flagged. (Its elite comes after that rest site: these
    // facts stop there.)
    expect(nextRestVersus(map, plan, review("qwxk-f25-rest").answer, at.start, costs)).toEqual({ text: "新路线到 F27 约 57/91，保留路线到 F29 约 18/91（p75 57 对 耗尽）；保留路线到 F27 时约 57/91（p75 57）", worse: false });
    // From HP now the kept route runs out on the way.
    expect(nextRestFacts(map, plan, start, costs)!.keep).toMatch(/到达 0（血量耗尽）（p75 耗尽）$/);
  });

  it("no heal among the options (or none above HP now): HP now, no note", () => {
    expect(restStart([{ label: "o0 SMITH", hp: 30, max: 91 }], { hp: 30, max: 91 })).toEqual({});
    expect(restStart([], { hp: 30, max: 91 })).toEqual({});
  });
});

describe("0QSB9YV3UFCL F19 (70/80): past the F28 rest to F32", () => {
  it("each next node's two nearest rest floors; a stretch ending on another floor than the kept one gives the kept route's HP there too", () => {
    const { map, plan, start, costs, answer } = review("0qsb-f19-reward");
    const facts = nextRestFacts(map, plan, start, costs, 1)!;
    expect(facts.keep).toMatch(/^r2c0 普通战 → .* → F28 r10c1 休息：普通战 3、精英 0（这一段共 4 场）、问号 2，经过商店；到达 40\/80（p75 3）$/);
    const viaR2c1 = facts.switch.filter((line) => line.startsWith("r2c1 "));
    expect(viaR2c1.map((line) => /(F\d+) r\d+c\d+ 休息：/.exec(line)![1])).toEqual(["F28", "F32"]);
    expect(viaR2c1[0]).toMatch(/到达 50\/80（p75 18）$/);
    expect(viaR2c1[1]).toMatch(/到达 30\/80（p75 耗尽）；明显比保留路线差：这条到 F32 约 30\/80，保留路线到 F28 约 40\/80（p75 耗尽 对 3）；保留路线到 F32 时约 21\/80（p75 耗尽）$/);
    // The answer's stretch is that listed one.
    const taken = stretchOf(map, answer, start, costs);
    expect(viaR2c1[1]!.split("：")[0]!.split(" → ").map((step) => /r\d+c\d+/.exec(step)![0])).toEqual(taken.ids);
    expect(nextRestVersus(map, plan, answer, start, costs)).toEqual({ text: "新路线到 F32 约 30/80，保留路线到 F28 约 40/80（p75 耗尽 对 3）；保留路线到 F32 时约 21/80（p75 耗尽）", worse: true });
    // r2c0's other F28 stretch (the plan's with an elite: 7/80) is a worse variant of the kept one: not listed.
    expect(facts.switch.some((line) => line.startsWith("r2c0 ") && line.includes("F28 r10c1"))).toBe(false);
  });
});

describe("which stretches are listed, on the small fixed map", () => {
  // r0c1 普通战 (here) → r1c0 休息 | r1c2 精英 → r2c1 商店 | r2c2 普通战 → r3c1 休息 | r3c2 普通战 → boss.
  const costs = fixtureCosts;

  it("the best stretch through each next node, the plan's own not repeated; act 1 shows no stretch total", () => {
    const map = buildRouteMap(input({ bosses: [p(4, 1)], nodes: input().nodes.filter((node) => node.row < 5).map((node) => (node.row === 4 ? { ...node, children: [] } : node)) }));
    const facts = nextRestFacts(map, ["r1c2", "r2c1", "r3c1", "r4c1"], { hp: 60, max: 80 }, costs)!;
    expect(facts.keep).toBe(`r1c2 精英 → r2c1 商店 → F4 r3c1 休息：普通战 0、精英 1、问号 0，经过商店；到达 ${60 - costs.elite.median}/80（p75 ${60 - costs.elite.p75}）`);
    // Through r1c0: the rest site itself. Through r1c2: the plan's stretch is the only one to the F4 rest; the other
    // way reaches the boss with no rest site, another floor, so it is listed (clearly worse, with the kept route's HP
    // on that floor).
    expect(facts.switch).toEqual([
      "F2 r1c0 休息：普通战 0、精英 0、问号 0，没有商店；到达 60/80（p75 60）",
      "r1c2 精英 → r2c2 普通战 → r3c2 普通战 → F5 r4c1 Boss（boss 前没有休息点）：普通战 2、精英 1、问号 0，没有商店；到达 15/80（p75 耗尽）；明显比保留路线差：这条到 F5 boss 约 15/80，保留路线到 F4 约 35/80（p75 耗尽 对 25）；保留路线到 F5 时约 59/80（p75 49）",
    ]);
    // Planned through r1c2's worse branch: the better one through r1c2 is listed too.
    const worse = nextRestFacts(map, ["r1c2", "r2c2", "r3c2", "r4c1"], { hp: 60, max: 80 }, costs)!;
    expect(worse.switch.map((line) => line.split("：")[0])).toEqual(["F2 r1c0 休息", "r1c2 精英 → r2c1 商店 → F4 r3c1 休息"]);
    expect(worse.keep).toMatch(/^r1c2 精英 → r2c2 普通战 → r3c2 普通战 → F5 r4c1 Boss（boss 前没有休息点）：普通战 2、精英 1、问号 0，没有商店；到达 /);
  });

  it("one way on: the switch list says there is no other route", () => {
    const map = buildRouteMap(input({ next: [p(1, 2)], nodes: input().nodes.map((node) => (node.row === 1 && node.col === 2 ? { ...node, children: [p(2, 1)] } : node)) }));
    expect(nextRestFacts(map, ["r1c2", "r2c1", "r3c1", "r4c1", "r5c1"], { hp: 60, max: 80 }, costs)!.switch).toEqual(["没有别的路线：从下一步到下一个休息点只有计划这一段"]);
  });

  it("a stretch equal to the kept one on every number (another column) does not take its place", () => {
    const map = buildRouteMap({
      act: 1,
      nodes: [
        { ...p(0, 0), type: "Monster", children: [p(1, 0)], visited: true },
        { ...p(1, 0), type: "Monster", children: [p(2, 0), p(2, 1)] },
        { ...p(2, 0), type: "Monster", children: [p(3, 0)] },
        { ...p(2, 1), type: "Monster", children: [p(3, 0)] },
        { ...p(3, 0), type: "RestSite", children: [p(4, 0)] },
        { ...p(4, 0), type: "Boss", children: [] },
      ],
      bosses: [p(4, 0)],
      current: p(0, 0),
      next: [p(1, 0)],
      boots: 0,
    });
    expect(nextRestFacts(map, ["r1c0", "r2c1", "r3c0", "r4c0"], { hp: 60, max: 80 }, costs)!.switch).toEqual(["没有别的路线：从下一步到下一个休息点只有计划这一段"]);
  });

  it("Winged Boots: the line children first, then the jumps, at most NEXT_REST_MAX_SWITCHES in all, a jump marked", () => {
    // Seven nodes on row 1, all reachable with boots; each leads to its own rest site on row 2.
    const nodes = [
      { ...p(0, 3), type: "Monster", children: [p(1, 3)], visited: true },
      ...[0, 1, 2, 3, 4, 5, 6].map((col) => ({ ...p(1, col), type: col % 2 ? "Monster" : "Unknown", children: [p(2, col)] })),
      ...[0, 1, 2, 3, 4, 5, 6].map((col) => ({ ...p(2, col), type: "RestSite", children: [p(3, 3)] })),
      { ...p(3, 3), type: "Boss", children: [] },
    ];
    const map = buildRouteMap({ act: 2, nodes, bosses: [p(3, 3)], current: p(0, 3), next: [0, 1, 2, 3, 4, 5, 6].map((col) => p(1, col)), boots: 1 });
    const { kept, switches } = nextRestStretches(map, ["r1c3", "r2c3", "r3c3"], { hp: 60, max: 80 }, costs);
    expect(kept.ids).toEqual(["r1c3", "r2c3"]);
    expect(switches).toHaveLength(NEXT_REST_MAX_SWITCHES);
    // The "?" rooms (cheaper) jump first.
    expect(switches.map((stretch) => stretch.ids[0])).toEqual(["r1c0", "r1c2", "r1c4", "r1c6", "r1c1", "r1c5"]);
    const facts = nextRestFacts(map, ["r1c3", "r2c3", "r3c3"], { hp: 60, max: 80 }, costs)!;
    expect(facts.switch[0]).toBe(`r1c0 问号（飞行靴跳跃） → F20 r2c0 休息：普通战 0、精英 0（这一段共 0 场）、问号 1，没有商店；到达 ${60 - costs.unknown.median}/80（p75 ${60 - costs.unknown.p75}）`);
  });

  it("clearly worse: the median 10% of max HP lower, the p75 line 15% lower, or a run-out the kept route does not have", () => {
    const at = (median: number, p75: number) => ({ ids: ["x"], end: "rest" as const, row: 1, monsters: 0, elites: 0, unknown: 0, shops: 0, median, p75, max: 80 });
    expect(clearlyWorse(at(35, 30), at(42, 33))).toBe(false);
    expect(clearlyWorse(at(34, 30), at(42, 33))).toBe(true);
    expect(clearlyWorse(at(40, 17), at(42, 33))).toBe(true);
    expect(clearlyWorse(at(40, 22), at(42, 33))).toBe(false);
    expect(clearlyWorse(at(-1, -10), at(5, -2))).toBe(true);
    expect(clearlyWorse(at(-5, -10), at(-1, -2))).toBe(false);
    expect(clearlyWorse(at(60, 50), at(42, 33))).toBe(false);
  });
});

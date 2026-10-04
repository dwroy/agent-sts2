/** Route facts' HP projection: measured median room costs, p75 only as risk, no healing the dead. */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setRoomCostsForTests } from "../src/knowledge/room-costs.js";
import { planDecision } from "../src/screens/index.js";
import { projectPath, roomCostModel, type RoomCostModel } from "../src/strategy/route-projection.js";
import type { AskDecision, DecisionEnv } from "../src/project/types.js";
import type { JsonValue } from "../src/util/json.js";
import { logged, loggedEnv } from "./logged.js";

const model: RoomCostModel = {
  act: 2,
  maxHp: 80,
  monster: { median: 11, p75: 19, source: "test" },
  elite: { median: 33, p75: 45, source: "test" },
  unknown: { median: 0, p75: 3, source: "test" },
};

describe("projectPath", () => {
  it("chains the median room costs; a rest heals 30% of max HP up to max", () => {
    const projection = projectPath(["Monster", "Unknown", "RestSite", "Elite", "Boss"], 69, model);
    expect(projection.arrival).toEqual([69, 58, 58, 80, 47]);
    expect(projection.runsOut).toBeNull();
  });

  it("p75 is the risk of one bad room, not compounded over the path", () => {
    const projection = projectPath(["Monster", "Monster", "Elite", "Boss"], 80, model);
    // median chain: 80 -> 69 -> 58 -> 25; the elite at p75 leaves 58 - 45 = 13.
    expect(projection.arrival).toEqual([80, 69, 58, 25]);
    expect(projection.riskLow).toEqual({ hp: 13, step: 2 });
  });

  it("HP that runs out is not healed by a later rest", () => {
    const projection = projectPath(["Elite", "Elite", "RestSite", "Boss"], 60, model);
    expect(projection.runsOut).toBe(1);
    expect(projection.arrival[3]).toBeLessThanOrEqual(0);
  });
});

describe("roomCostModel", () => {
  afterEach(() => setRoomCostsForTests(null));

  it("uses the logged rooms of this act and ascension, with n, and the nearest ascension when this one has too few", () => {
    setRoomCostsForTests({
      "8": { "2": { Monster: { n: 321, median: 11, p75: 19, mean: 12.5 }, Elite: { n: 3, median: 90, p75: 99, mean: 90 }, Unknown: { n: 232, median: 0, p75: 3, mean: 2.3 } } },
      "7": { "2": { Elite: { n: 16, median: 10, p75: 38, mean: 17.7 } } },
    });
    const costs = roomCostModel(2, 8, 80);
    expect(costs.monster).toMatchObject({ median: 11, p75: 19 });
    expect(costs.monster.source).toContain("n=321");
    expect(costs.elite).toMatchObject({ median: 10, p75: 38 });
    expect(costs.elite.source).toContain("A7 (A8 has too few)");
    expect(costs.unknown).toMatchObject({ median: 0, p75: 3 });
  });

  it("with nothing logged, fights fall back to the monster DB and '?' rooms to the old share", () => {
    setRoomCostsForTests({});
    const costs = roomCostModel(2, 8, 80);
    expect(costs.monster.source).toMatch(/monster DB|old fixed model/);
    expect(costs.unknown.source).toContain("40% of a hallway fight");
  });
});

/** The logged board's route-plan question (fixed room costs: hallway 11/19, elite 33/45, "?" 0/3 at A8 act 2, 5/9 act 1). */
function routeQuestion(name: string): { env: DecisionEnv; question: AskDecision } {
  const env: DecisionEnv = loggedEnv(logged(name), { buildDecider: "deepseek" } as Partial<DecisionEnv>);
  const outcome = planDecision(env);
  if (outcome.kind !== "decision" || outcome.decision.kind !== "ask") throw new Error("expected a route-plan question");
  expect(outcome.decision.label).toBe("map/route-plan");
  return { env, question: outcome.decision };
}

const FIXED_COSTS = {
  "8": {
    "1": { Monster: { n: 400, median: 5, p75: 9, mean: 6 }, Elite: { n: 90, median: 20, p75: 30, mean: 22 }, Unknown: { n: 300, median: 0, p75: 3, mean: 1 } },
    "2": { Monster: { n: 321, median: 11, p75: 19, mean: 12.5 }, Elite: { n: 57, median: 33, p75: 45, mean: 35 }, Unknown: { n: 232, median: 0, p75: 3, mean: 2.3 } },
  },
};

describe("the route-plan question on logged boards (M2: the whole map, no candidate routes, no scores)", () => {
  beforeEach(() => setRoomCostsForTests(FIXED_COSTS));
  afterEach(() => setRoomCostsForTests(null));

  it("QZQU F18 (69/80): every node of the act's map with its lines, where we stand, the next nodes and the boss", () => {
    const { env, question } = routeQuestion("qzqu-f18-route-plan");
    const raw = env.state.raw["map"] as { nodes: unknown[]; available_nodes: { row: number; col: number }[] };
    const view = question.state["route_map"] as Record<string, JsonValue>;
    expect((view["map"] as string[]).length).toBe(raw.nodes.length);
    expect((view["map"] as string[])[0]).toBe("F18 r0c3 远古（当前） → r1c2 r1c3 r1c6");
    expect((view["map"] as string[]).at(-1)).toBe("F33 r15c3 Boss（本幕 boss）");
    expect(view["next_nodes"]).toEqual(raw.available_nodes.map((node) => `r${node.row}c${node.col}`));
    expect(view["boss"]).toBe("r15c3（F33 Boss）");
    expect(String(view["room_costs"])).toMatch(/普通战 11\/19（logged A8 act-2 Monster rooms, n=321）/);
    expect(Object.keys((question.questions["pick"] as { criteria: Record<string, string> }).criteria)).toEqual(["r1c2", "r1c3", "r1c6"]);
    // No candidate paths, code values or ranks anywhere in the question.
    const text = JSON.stringify(question.state) + JSON.stringify(question.questions);
    for (const word of ["code_value", "code_rank", "route_value", "likely_continuation", "hp_at_boss", "act_routes"]) expect(text).not.toContain(word);
    // Without the brain: code's greedy baseline, never shown to it.
    expect(question.deepseek?.baseline).toMatchObject({ kind: "act", label: "map/route-fallback", intent: { action: "choose_map_node" } });
  });

  it("QZQU F18: a legal route with an elite becomes the act's plan, projected from HP now (the boss at 71/80; the old model had every route at ~0/80)", () => {
    const { env, question } = routeQuestion("qzqu-f18-route-plan");
    const route = "r1c6 r2c6 r3c6 r4c5 r5c4 r6c5 r7c4 r8c3 r9c3 r10c3 r11c3 r12c2 r13c1 r14c1 r15c3";
    const resolved = question.deepseek!.plan!.resolve({ route, reason: "one elite, a rest before it" });
    if ("invalid" in resolved) throw new Error(resolved.invalid);
    expect(resolved.intent).toEqual({ action: "choose_map_node", option_index: 2 });
    resolved.apply?.();
    const plan = env.screenMemory.routePlan!;
    expect(plan.path.map((step) => `r${step.row}c${step.col}`).join(" ")).toBe(route);
    expect(plan.summary).toBe("r1c6 普通战 → r2c6 问号 → r3c6 普通战 → r4c5 商店 → r5c4 问号 → r6c5 休息 → r7c4 问号 → r8c3 宝箱 → r9c3 问号 → r10c3 普通战 → r11c3 休息 → r12c2 精英 → r13c1 商店 → r14c1 休息 → r15c3 Boss");
    // 69 -11 -11 -> 47, rest +24 -> 71, -11 -> 60, rest -> 80, elite -33 -> 47, rest -> 71 at the boss.
    expect(Math.round(plan.path.at(-1)!.hpOnArrival * 80)).toBe(71);
    // An illegal route is not a plan (the spec re-asks it first).
    const bad = question.deepseek!.plan!.resolve({ route: "r1c3 r2c1 r3c0", reason: "x" });
    expect(bad).toEqual({ invalid: expect.stringContaining("第 2 步 r1c3 → r2c1：没有连线") });
  });

  it("SFCE F18 (72/87): the path the run took, projected as the route facts project it, reaches the boss near what happened (82/97), not 46/87", () => {
    const env = loggedEnv(logged("sfce-f18-route-plan"), { buildDecider: "deepseek" } as Partial<DecisionEnv>);
    const taken = "Monster -> Monster -> Shop -> Unknown -> Monster -> RestSite -> Monster -> Treasure -> RestSite -> Unknown -> RestSite -> Monster -> Monster -> RestSite -> Boss".split(" -> ");
    const costs = roomCostModel(2, 8, env.state.run?.max_hp ?? 80);
    const projection = projectPath(taken, env.state.run!.current_hp!, costs);
    expect(projection.arrival[taken.length - 1]!).toBeGreaterThanOrEqual(70);
    expect(routeQuestion("sfce-f18-route-plan").question.label).toBe("map/route-plan");
  });

  it("SFCE F1 (act 1): the question's options are the next nodes; the map starts on the Neow node", () => {
    const { question } = routeQuestion("sfce-f1-route-plan");
    const view = question.state["route_map"] as Record<string, JsonValue>;
    expect((view["map"] as string[])[0]).toMatch(/^F1 r0c\d 远古（当前） → /);
    expect(Object.keys((question.questions["pick"] as { criteria: Record<string, string> }).criteria)).toEqual(view["next_nodes"]);
  });
});

/** Route facts' HP projection: measured median room costs, p75 only as risk, no healing the dead. */

import { afterEach, describe, expect, it } from "vitest";

import { setRoomCostsForTests } from "../src/knowledge/room-costs.js";
import { planDecision } from "../src/screens/index.js";
import { projectPath, roomCostModel, type RoomCostModel } from "../src/strategy/route-projection.js";
import type { DecisionEnv } from "../src/project/types.js";
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

/** The logged board's route-plan options (the facts DeepSeek sees). */
function routeOptions(name: string): Record<string, Record<string, unknown>> {
  const env: DecisionEnv = loggedEnv(logged(name), { buildDecider: "deepseek" } as Partial<DecisionEnv>);
  const outcome = planDecision(env);
  if (outcome.kind !== "decision" || outcome.decision.kind !== "ask") throw new Error("expected a route-plan question");
  expect(outcome.decision.label).toBe("map/route-plan");
  const question = Object.values(outcome.decision.questions)[0] as { criteria: Record<string, string> };
  return Object.fromEntries(Object.entries(question.criteria).map(([key, value]) => [key, JSON.parse(value) as Record<string, unknown>]));
}

const bossHp = (option: Record<string, unknown>): number | null => {
  const match = /^~(\d+)\//.exec(String(option["hp_at_boss"]));
  return match ? Number(match[1]) : null;
};

describe("route facts on logged boards (audit 2026-09-28)", () => {
  it("QZQU F18 (69/80): the routes no longer all reach the boss at ~0/80, and a route with an elite still reaches it", () => {
    const options = Object.values(routeOptions("qzqu-f18-route-plan"));
    const atBoss = options.map(bossHp);
    // Logged: all 8 were "~0/80".
    expect(atBoss.filter((hp) => hp !== null && hp > 0).length).toBeGreaterThanOrEqual(4);
    expect(new Set(atBoss).size).toBeGreaterThanOrEqual(4);
    expect(options.some((option) => Number(option["elites"]) >= 1 && (bossHp(option) ?? 0) > 20)).toBe(true);
    for (const option of options) {
      expect(String(option["hp_risk"])).toMatch(/p75/);
      for (const elite of option["hp_on_arrival_at_elites"] as string[]) expect(elite).toMatch(/on arrival|ran out earlier/);
    }
  });

  it("the route plan's note names the room costs and their n", () => {
    const env = loggedEnv(logged("qzqu-f18-route-plan"), { buildDecider: "deepseek" } as Partial<DecisionEnv>);
    const outcome = planDecision(env);
    const note = outcome.kind === "decision" ? String(outcome.decision.state["note"]) : "";
    expect(note).toMatch(/hallway fight [\d.]+ HP \(p75 [\d.]+; .*n=\d+/);
    expect(note).toMatch(/elite [\d.]+ HP/);
    expect(note).toContain("not healed by a later rest");
  });

  it("SFCE F18 (72/87): DeepSeek's path is projected near what happened (82/97 at the boss), not 46/87", () => {
    const options = Object.values(routeOptions("sfce-f18-route-plan"));
    const taken = options.find((option) => option["path"] === "Monster -> Monster -> Shop -> Unknown -> Monster -> RestSite -> Monster -> Treasure -> RestSite -> Unknown -> RestSite -> Monster -> Monster -> RestSite -> Boss");
    expect(taken).toBeDefined();
    expect(bossHp(taken!)).toBeGreaterThanOrEqual(70);
  });

  it("act 1 stays sensible: SFCE F1 (64/80) routes reach the boss between 30 and 80 HP", () => {
    const options = Object.values(routeOptions("sfce-f1-route-plan"));
    for (const option of options) {
      const hp = bossHp(option);
      if (hp === null) continue;
      expect(hp).toBeGreaterThanOrEqual(30);
      expect(hp).toBeLessThanOrEqual(80);
    }
    expect(options.filter((option) => bossHp(option) !== null).length).toBeGreaterThanOrEqual(6);
  });
});

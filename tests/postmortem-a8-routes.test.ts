/**
 * Route scoring at forced elites and likely deaths, from the A8 post-mortems of RVR6, K7G9, N7KR and NJSZ
 * (notes/lessons.md), each replayed on the logged map of the cited floor (tests/logged-states).
 */

import { describe, expect, it } from "vitest";

import type { AskDecision, Decision } from "../src/project/types.js";
import { BOOTS_CHARGE, BOOTS_LAST_CHARGE, bootsCost, deathDelay, likelyDeathWeight, LIKELY_DEATH, planMap } from "../src/screens/map.js";
import { fightHpCost, fightSurvival, roomHpCost, roomProjectedCost } from "../src/strategy/route-cost.js";
import { mapShift } from "../src/strategy/intent.js";
import { logged, loggedEnv } from "./logged.js";

type Raw = Record<string, unknown>;

/** Code's pick on a logged map (the recorded run plan in force). */
const pick = (name: string): unknown => {
  const decision = planMap(loggedEnv(logged(name)));
  return decision?.kind === "act" ? decision.intent : decision?.kind;
};
/** Every option with its summary, with no code margin (the "card" planner asks Jev every time). */
function options(name: string): Record<string, Raw> {
  const decision = planMap(loggedEnv(logged(name), { combatPlanner: "card" })) as Decision;
  expect(decision.kind).toBe("ask");
  const question = (decision as AskDecision).questions["pick"]!;
  if (question.type !== "choice") throw new Error("not a choice");
  return Object.fromEntries(Object.entries(question.criteria).map(([key, value]) => [key, JSON.parse(value!) as Raw]));
}

describe("likely deaths scale with the shortfall and come later rather than sooner", () => {
  it("a likely death weighs -20 at the cost, down to -40 at 0 HP; one further down weighs less", () => {
    expect(likelyDeathWeight(0.55, 0.55)).toBe(LIKELY_DEATH);
    expect(likelyDeathWeight(0.46, 0.55)).toBeGreaterThan(likelyDeathWeight(0.33, 0.55));
    expect(likelyDeathWeight(0, 0.55)).toBe(2 * LIKELY_DEATH);
    expect(deathDelay(1)).toBe(1);
    expect(deathDelay(4)).toBeCloseTo(0.7);
    expect(deathDelay(20)).toBe(0.5);
  });

  it("survival through a fight: 0.5 at 0.6 x its priced cost, 0.75 at the cost", () => {
    expect(fightSurvival(0.33, 0.55)).toBeCloseTo(0.5, 2);
    expect(fightSurvival(0.55, 0.55)).toBeCloseTo(0.75, 2);
    expect(fightSurvival(0.86, 0.7)).toBeGreaterThan(0.8);
  });
});

describe("K7G9 F43: '?' vs rest, both into the forced F45 Mecha Knight at 40/72", () => {
  it("rests: the rest arrives at ~86%, the '?' at ~44% of a 70% elite (logged: '?' -28.7 vs rest -29.0, Jev 0.51 took '?')", () => {
    expect(pick("k7g9-map-f43")).toEqual({ action: "choose_map_node", option_index: 1 });
  });

  it("the options say what each arrives at the forced elite with, and the '?' costs entry_hp", () => {
    const byType = Object.fromEntries(Object.values(options("k7g9-map-f43")).map((option) => [option["node_type"], option]));
    expect(byType["Unknown"]!["next_forced_elite"]).toMatch(/F45 elite at ~4\d% HP \(an elite costs ~70%\)/);
    expect(byType["RestSite"]!["next_forced_elite"]).toMatch(/F45 elite at ~86% HP/);
    expect(byType["Unknown"]!["intent_fit"]).toMatch(/^costs entry_hp 90%: arrives at the F45 elite at ~4\d% with no rest before it/);
    expect(byType["RestSite"]!["intent_fit"]).toMatch(/^fits .*code's best route/);
    expect(byType["RestSite"]!["boss_arrival"]).toMatch(/at the F48 boss/);
  });
});

describe("RVR6 F38: at 15/80 'die in the hallway now' no longer beats '? -> shop -> chest -> forced elite'", () => {
  it("takes the '?' (logged: Monster -76.5 vs Unknown -82.3, code picked the Monster into the Frog Knight)", () => {
    expect(pick("rvr6-map-f38")).toEqual({ action: "choose_map_node", option_index: 0 });
  });
});

describe("N7KR F4: 67/80, '? -> Monster -> Monster -> forced elite, no rest' vs a route with a rest before its elite", () => {
  it("(4,2) is code's best (logged: Unknown (4,0) 21.44 vs Monster (4,2) 15.82, code picked the '?')", () => {
    // At the rooms' median costs (Z49J/77QX) the margin is under the code margin: Jev is asked, with
    // (4,2) the best route value and (4,0) labelled as costing the entry target.
    const decision = planMap(loggedEnv(logged("n7kr-map-f4")));
    if (decision?.kind === "act") expect(decision.intent).toEqual({ action: "choose_map_node", option_index: 2 });
    const all = options("n7kr-map-f4");
    const best = Object.values(all).reduce((a, b) => (Number(b["route_value"]) > Number(a["route_value"]) ? b : a));
    expect(best["position"]).toBe("row 4, column 2");
  });

  it("(4,2) no longer reads 'every elite ahead can be routed around'; (4,0) costs entry_hp", () => {
    const all = options("n7kr-map-f4");
    const byPosition = Object.fromEntries(Object.values(all).map((option) => [option["position"], option]));
    expect(byPosition["row 4, column 2"]!["forced_elites"]).toMatch(/^every path to the boss meets an elite, not all on one floor \(F7\/F9/);
    expect(byPosition["row 4, column 2"]!["forced_elites"]).toMatch(/a rest before the first one only on some paths/);
    expect(byPosition["row 4, column 0"]!["intent_fit"]).toMatch(/^costs entry_hp 90%: arrives at the F8 elite at ~\d+% with no rest before it/);
  });

  it("an act-1 hallway is priced at the p75 of logged A8 losses (~11% of max HP)", () => {
    expect(fightHpCost("Monster", 1)).toBeGreaterThan(0.08);
    expect(fightHpCost("Monster", 1)).toBeLessThan(0.15);
  });
});

describe("NJSZ F29: preserve prices '?' and Monster by their expected HP cost (44/80, both into the forced F31 elite)", () => {
  it("takes the '?' (logged: Monster -26.8 vs '?' -27.7 with preserve's '?' -1.5; the Monster took 44 -> 12)", () => {
    expect(pick("njsz-map-f29")).toEqual({ action: "choose_map_node", option_index: 1 });
  });

  it("the shift follows the room's cost: a '?' is never below a Monster at the same spot", () => {
    const plan = logged("njsz-map-f29").runPlan!;
    expect(mapShift(plan, "Unknown", 0.55, 4, 2)).toBeCloseTo(-10 * roomHpCost("Unknown", 2));
    expect(mapShift(plan, "Monster", 0.55, 4, 2)).toBeCloseTo(-10 * roomHpCost("Monster", 2));
    expect(mapShift(plan, "Unknown", 0.55, 4, 2)).toBeGreaterThan(mapShift(plan, "Monster", 0.55, 4, 2));
  });

  it("the Monster arrives at the elite well under its cost, the '?' about a hallway's median cost higher", () => {
    const byType = Object.fromEntries(Object.values(options("njsz-map-f29")).map((option) => [option["node_type"], option]));
    const at = (text: unknown) => Number(/~(\d+)% HP/.exec(String(text))?.[1]);
    // 44/80 at the rooms' median costs (Z49J/77QX): ~41% into a ~59% elite (it took 44 -> 12 there).
    expect(at(byType["Monster"]!["next_forced_elite"])).toBeGreaterThan(25);
    expect(at(byType["Monster"]!["next_forced_elite"])).toBeLessThan(100 * fightHpCost("Elite", 2));
    const gap = 100 * (roomProjectedCost("Monster", 2) - roomProjectedCost("Unknown", 2));
    expect(at(byType["Unknown"]!["next_forced_elite"]) - at(byType["Monster"]!["next_forced_elite"])).toBeGreaterThanOrEqual(Math.floor(gap) - 1);
  });
});

describe("Winged Boots charges are budgeted across acts (RVR6: three spent in act 1, none left at F38)", () => {
  it("off-path nodes cost 3 in acts 1-2, 6 for the last charge, nothing in act 3", () => {
    expect(bootsCost(1, 3)).toBe(BOOTS_CHARGE);
    expect(bootsCost(2, 1)).toBe(BOOTS_LAST_CHARGE);
    expect(bootsCost(3, 1)).toBe(0);
  });

  it("F13: the child elite (13,3), not the off-path (13,0) for +0.6 (logged: Jev took (13,0) at 0.89)", () => {
    expect(pick("rvr6-map-f13")).toEqual({ action: "choose_map_node", option_index: 1 });
  });

  it("F14: the child '?' (14,0), not the off-path Monster (14,4) for +0.9 with the last charge; the option says so", () => {
    expect(pick("rvr6-map-f14")).toEqual({ action: "choose_map_node", option_index: 0 });
    const offPath = Object.values(options("rvr6-map-f14")).find((option) => option["position"] === "row 14, column 4")!;
    expect(offPath["winged_boots"]).toMatch(/uses a Winged Boots charge, 0 left after \(priced -6/);
  });
});

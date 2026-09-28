/**
 * Fact-layer fixes from the redesign's second batch (notes/lessons.md, TD8A2M6M4SWW, XA8CMSK1V9H3,
 * CRY9LDHSKVFB, ZW9SQYC7KBC3): route survival, rest labels, potion slots and potion values, name mapping and
 * start-of-turn HP loss. Each is replayed on the logged board of the cited floor (tests/logged-states).
 */

import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { AskDecision, Decision } from "../src/project/types.js";
import { planMap } from "../src/screens/map.js";
import { fightHpCost, fightOutcomes, fightSurvival, roomProjectedCost } from "../src/strategy/route-cost.js";
import { logged, loggedEnv } from "./logged.js";

type Raw = Record<string, unknown>;

/** Every option of a logged map with its facts (the "card" planner always asks). */
function mapOptions(name: string, onlyAsked = false): Raw[] {
  const decision = planMap(loggedEnv(logged(name), { combatPlanner: "card" })) as Decision;
  if (onlyAsked && decision?.kind !== "ask") return [];
  expect(decision.kind).toBe("ask");
  const question = (decision as AskDecision).questions["pick"]!;
  if (question.type !== "choice") throw new Error("not a choice");
  return Object.values(question.criteria).map((value) => JSON.parse(value!) as Raw);
}
const pctIn = (text: unknown, pattern: RegExp): number => Number(String(text).match(pattern)?.[1] ?? NaN);
const at = (all: Raw[], position: string): Raw => all.find((option) => option["position"] === position)!;

describe("1. Route survival: calibrated to the logged deaths, carried room to room, the boss figure explained (TD8A F18, ZW9S F21)", () => {
  it("an act-2 hallway entered at 30-50% HP is a real death risk (logged: 10 deaths in 50 such fights)", () => {
    const hallway = fightHpCost("Monster", 2);
    expect(1 - fightSurvival(0.35, hallway)).toBeGreaterThan(0.1);
    expect(1 - fightSurvival(0.45, hallway)).toBeGreaterThan(0.05);
    expect(1 - fightSurvival(0.8, hallway)).toBeLessThan(0.01);
  });

  it("the HP a fight leaves goes into the next one: two act-2 hallways from 55% are riskier than the second at the median", () => {
    const hallway = fightHpCost("Monster", 2);
    const atMedian = fightSurvival(0.55, hallway) * fightSurvival(0.55 - roomProjectedCost("Monster", 2), hallway);
    const carried = fightOutcomes(0.55, hallway).reduce((sum, outcome) => sum + outcome.w * fightSurvival(outcome.hp, hallway), 0);
    expect(carried).toBeLessThan(atMedian);
    // The outcomes' weights are the fight's survival; no outcome leaves more HP than came in.
    expect(fightOutcomes(0.55, hallway).reduce((sum, outcome) => sum + outcome.w, 0)).toBeCloseTo(fightSurvival(0.55, hallway), 6);
    for (const outcome of fightOutcomes(0.55, hallway)) expect(outcome.hp).toBeLessThanOrEqual(0.55);
  });

  it("TD8A F18 (1,5): the boss figure is the forced elite's HP less its median cost plus the rests after it, and no likelier to be reached than the elite survived", () => {
    const n2 = at(mapOptions("td8a-map-f18"), "row 1, column 5");
    const elite = String(n2["next_forced_elite"]);
    expect(elite).toMatch(/^arrives at the F24 elite at ~41% HP \(an elite costs ~35% at the median, ~59% in a bad fight \(p75\); alive through it ~\d+% of the time at that HP\)/);
    const boss = String(n2["boss_arrival"]);
    expect(boss).toMatch(/after the F24 elite, then \+30% at each rest \(F25\//);
    const afterElite = pctIn(boss, /~(\d+)% after the F24 elite/);
    const rests = (boss.match(/rest \(([^)]*)\)/)?.[1] ?? "").split("/").length;
    expect(afterElite).toBeLessThanOrEqual(41 - 35 + 1);
    expect(pctIn(boss, /^~(\d+)% HP/)).toBeLessThanOrEqual(afterElite + 30 * rests);
    expect(pctIn(boss, /alive there ~(\d+)%/)).toBeLessThanOrEqual(pctIn(elite, /alive through it ~(\d+)%/));
    // Logged: "alive through F24 at the F25 rest ~56%" with the elite alone at ~56%: the hallways before it were free.
    expect(pctIn(n2["route_survival"], /~(\d+)% of the time/)).toBeLessThan(45);
  });

  it("on every logged map, a route is never likelier to reach the boss than to survive its forced elite", () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), "logged-states");
    const maps = readdirSync(dir).filter((file) => /-map-f\d+\.json$/.test(file)).map((file) => file.replace(/\.json$/, ""));
    expect(maps.length).toBeGreaterThan(20);
    for (const name of maps) {
      for (const option of mapOptions(name, true)) {
        if (!option["next_forced_elite"] || !/alive there/.test(String(option["boss_arrival"] ?? ""))) continue;
        expect(pctIn(option["boss_arrival"], /alive there ~(\d+)%/), `${name} ${option["position"]}`).toBeLessThanOrEqual(pctIn(option["next_forced_elite"], /alive through it ~(\d+)%/) + 1);
      }
    }
  });

  it("TD8A F18 and F22, ZW9S F21, CRY9 F22: the survival shown is below the old ~90% where the run died on the way", () => {
    // Logged (old): TD8A F18 (1,2) ~75%, F22 (5,4) ~92%; ZW9S F21 '?' ~94%, Monster ~86%; CRY9 F22 '?' ~67%.
    expect(pctIn(at(mapOptions("td8a-map-f18"), "row 1, column 2")["route_survival"], /~(\d+)% of the time/)).toBeLessThan(65);
    expect(pctIn(at(mapOptions("td8a-map-f22"), "row 5, column 4")["route_survival"], /~(\d+)% of the time/)).toBeLessThan(80);
    const zw9s = mapOptions("zw9s-map-f21");
    const unknown = pctIn(at(zw9s, "row 4, column 1")["route_survival"], /~(\d+)% of the time/);
    const monster = pctIn(at(zw9s, "row 4, column 0")["route_survival"], /~(\d+)% of the time/);
    expect(unknown).toBeLessThan(90);
    expect(monster).toBeLessThan(80);
    expect(monster).toBeLessThan(unknown);
    expect(pctIn(at(mapOptions("cry9-map-f22"), "row 5, column 3")["route_survival"], /~(\d+)% of the time/)).toBeLessThan(70);
  });
});

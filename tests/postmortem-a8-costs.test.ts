/**
 * Post-mortems of PWSD, KGR6, EGX7 and K8TC (notes/lessons.md, A8): room costs calibrated from the
 * logged A8 fights, forced elites on branchless lines, optional elites, block rewards at low HP,
 * unmodelled potions and the event HP guard, each replayed on the logged board of the cited floor.
 */

import { describe, expect, it } from "vitest";

import type { AskDecision, Decision } from "../src/project/types.js";
import { planMap } from "../src/screens/map.js";
import { eliteCostFactor, fightHpCost, fightSurvival, roomHpCost } from "../src/strategy/route-cost.js";
import { logged, loggedEnv } from "./logged.js";

type Raw = Record<string, unknown>;

/** Code's pick on a logged map (the recorded run plan in force). */
const pick = (name: string): unknown => {
  const decision = planMap(loggedEnv(logged(name)));
  return decision?.kind === "act" ? decision.intent : decision?.kind;
};
/** Every option with its summary, with no code margin (the "card" planner asks Jev every time). */
function options(name: string): Raw[] {
  const decision = planMap(loggedEnv(logged(name), { combatPlanner: "card" })) as Decision;
  expect(decision.kind).toBe("ask");
  const question = (decision as AskDecision).questions["pick"]!;
  if (question.type !== "choice") throw new Error("not a choice");
  return Object.values(question.criteria).map((value) => JSON.parse(value!) as Raw);
}
const at = (options: Raw[], position: string): Raw => options.find((option) => option["position"] === position)!;

describe("room costs: the p75 of logged A8 losses per act (PWSD, KGR6, EGX7, K8TC)", () => {
  it("act-2 hallways and every elite cost more than act-1 hallways; elites cost more than two hallways", () => {
    expect(fightHpCost("Monster", 2)).toBeGreaterThan(0.22);
    expect(fightHpCost("Elite", 1)).toBeGreaterThan(0.35);
    expect(fightHpCost("Elite", 2)).toBeGreaterThan(0.55);
    for (const act of [1, 2, 3]) expect(eliteCostFactor(act)).toBeGreaterThan(2);
    // A "?" room: its share of fights times a "?" fight's cost, below a hallway's.
    for (const act of [1, 2, 3]) expect(roomHpCost("Unknown", act)).toBeLessThan(roomHpCost("Monster", act));
    // Survival at the priced cost stays 0.75 (the p75).
    expect(fightSurvival(fightHpCost("Elite", 2), fightHpCost("Elite", 2))).toBeCloseTo(0.75, 2);
  });

  it("PWSD F6 at 80/80: rests before the act-1 elite (logged: Elite 24.9 vs RestSite 22.4, code took the elite, 80 -> 40)", () => {
    expect(pick("pwsd-map-f6")).toEqual({ action: "choose_map_node", option_index: 1 });
  });

  it("K8TC F3: (3,5), not the line into the forced F8 Bygone Effigy (logged: Jev took (3,4) at 0.89, 80 -> 34 there)", () => {
    expect(pick("k8tc-map-f3")).toEqual({ action: "choose_map_node", option_index: 1 });
    expect(String(at(options("k8tc-map-f3"), "row 3, column 4")["intent_fit"])).toMatch(/^costs entry_hp 90%/);
  });
});

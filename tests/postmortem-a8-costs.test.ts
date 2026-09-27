/**
 * Post-mortems of PWSD, KGR6, EGX7 and K8TC (notes/lessons.md, A8): room costs calibrated from the
 * logged A8 fights, forced elites on branchless lines, optional elites, block rewards at low HP,
 * unmodelled potions and the event HP guard, each replayed on the logged board of the cited floor.
 */

import { describe, expect, it } from "vitest";

import type { AskDecision, Decision } from "../src/project/types.js";
import { planMap } from "../src/screens/map.js";
import { planReward } from "../src/screens/reward.js";
import { actEliteNeed } from "../src/knowledge/dossiers.js";
import { mapFit, mapShift, routeRiskAt, routeRiskFilter } from "../src/strategy/intent.js";
import { LOW_HP_BLOCK_BONUS, MUST_HAVE_BONUS, mustHaveBonus } from "../src/strategy/run-plan.js";
import { eliteCostFactor, fightHpCost, fightSurvival, roomHpCost } from "../src/strategy/route-cost.js";
import { logged, loggedEnv } from "./logged.js";

type Raw = Record<string, unknown>;

/** Code's pick on a logged map (the recorded run plan in force). */
const pick = (name: string): unknown => {
  const decision = planMap(loggedEnv(logged(name)));
  return decision?.kind === "act" ? decision.intent : decision?.kind;
};
/** Every option with its summary, with no code margin (the "card" planner asks Jev every time). */
function options(name: string, edit: (fx: ReturnType<typeof logged>) => void = () => {}): Raw[] {
  const fx = logged(name);
  edit(fx);
  const decision = planMap(loggedEnv(fx, { combatPlanner: "card" })) as Decision;
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

describe("a forced elite on one option's branchless line is priced like the shared checkpoint (KGR6 F19)", () => {
  it("takes the Monster (2,5), not the Shop into eight branchless floors and the F28 elite (logged: Shop -9.18 vs Monster -21.72)", () => {
    expect(pick("kgr6-map-f19")).toEqual({ action: "choose_map_node", option_index: 0 });
  });

  it("the Shop line is labelled by its arrival at the F28 elite, below that elite's cost", () => {
    const shop = at(options("kgr6-map-f19"), "row 2, column 6");
    expect(String(shop["next_forced_elite"])).toMatch(/^arrives at the F28 elite at ~4\d% HP/);
    expect(String(shop["intent_fit"])).toMatch(/^costs entry_hp 85%: arrives at the F28 elite at ~4\d%/);
  });

  it("the label check covers code's best-scored route too", () => {
    const plan = logged("kgr6-map-f19").runPlan!;
    const arrival = { eliteHp: 0.42, eliteFloor: 28, eliteCost: fightHpCost("Elite", 2), eliteRest: "every" as const, bossHp: 0.5, bossFloor: 33, best: { eliteHp: 1, bossHp: 0.9 } };
    expect(mapFit(plan, "Shop", 0.74, { value: 6.5, best: 6.5 }, 14, arrival, 2)).toMatch(/^costs entry_hp 85%: arrives at the F28 elite at ~42% .*code's best route by route value/);
  });
});

describe("an optional elite option is not a forced elite (EGX7 F27, PWSD F10)", () => {
  for (const [name, position] of [["egx7-map-f27", "row 10, column 2"], ["pwsd-map-f10", "row 10, column 5"]] as const) {
    it(`${name}: the Elite option reads optional; its forced elites are counted after it`, () => {
      // With a deck the act's elites do not outpace (6 energy), so the Elite stays on offer.
      const elite = at(options(name, (fx) => Object.assign(fx.state["run"] as Raw, { max_energy: 6 })), position);
      expect(elite["optional_elite"]).toMatch(/optional Elite/);
      expect(String(elite["forced_elites"])).toMatch(/^after this elite: none/);
      expect(elite["next_forced_elite"]).toBeUndefined();
    });
  }
});

describe("optional elites are avoided while the deck is under the act's lowest elite need (EGX7 F27)", () => {
  it("EGX7 F27 at 75/87, deck ~25/turn vs act-2 elites 30+: the Monster (10,3), not the Entomancer (logged: Elite 9.6 vs Monster 8.3, Jev 0.09 took it, 75 -> 32)", () => {
    expect(pick("egx7-map-f27")).toEqual({ action: "choose_map_node", option_index: 1 });
    // The run plan's route_risk had lapsed (low-HP origin, 86% >= 85%): the deck decides, not the provenance.
    const plan = logged("egx7-map-f27").runPlan!;
    expect(routeRiskAt(plan, 75 / 87)).toBe("normal");
  });

  it("PWSD F10 at 70/80, deck ~18/turn vs act-1 elites 20+: rests (logged: Elite 15.6 vs RestSite 7.4, 72 -> 23 at the F11 Bygone Effigy)", () => {
    expect(pick("pwsd-map-f10")).toEqual({ action: "choose_map_node", option_index: 0 });
  });

  it("the gate's words and weight, with or without a run plan", () => {
    const gate = { deck: 25, need: 30 };
    expect(mapShift(null, "Elite", 0.9, 99, 2, gate)).toBe(-6);
    expect(mapShift(null, "Monster", 0.9, 99, 2, gate)).toBe(0);
    expect(mapFit(null, "Elite", 0.9, { value: 1, best: 1 }, 99, undefined, 2, gate)).toBe("deck ~25/turn under the act's elites (30+)");
    expect(routeRiskFilter(null, [{ type: "Elite" }, { type: "Monster" }], 0.9, gate)).toEqual([{ type: "Monster" }]);
    expect(actEliteNeed(2)).toBeGreaterThan(25);
  });
});

describe("block rewards two short of the plan's block target below half HP (PWSD F20, K8TC F14)", () => {
  /** Code's value of each offered card on a logged card reward. */
  const values = (name: string): Record<string, number> => {
    const decision = planReward(loggedEnv(logged(name))) as Decision;
    if (decision.kind !== "ask") return decision.kind === "act" ? { [JSON.stringify(decision.intent)]: 1 } : {};
    const question = decision.questions["pick"]!;
    if (question.type !== "choice") throw new Error("not a choice");
    return Object.fromEntries(Object.values(question.criteria).map((text) => JSON.parse(text!) as Raw).map((option) => [String(option["card"]), Number(option["code_value"])]));
  };

  it("PWSD F20 at 25/80, block 1/3: Blood Wall above Battle Trance+ (logged: 72 halved vs 83)", () => {
    const shown = values("pwsd-reward-f20");
    expect(shown["血墙"]).toBeGreaterThan(shown["战斗专注+"]!);
  });

  it("K8TC F14 at 38/80, block 1/3: True Grit above Uppercut (logged: 72 halved vs 83)", () => {
    const shown = values("k8tc-reward-f14");
    expect(shown["坚毅"]).toBeGreaterThan(shown["上勾拳"]!);
  });

  it("the rule: +21 two short below half HP; the boss-gap halving only once the target is met", () => {
    const plan = { needs: ["block"], blockTarget: 3 } as never;
    expect(mustHaveBonus(plan, "BLOOD_WALL", ["STONE_ARMOR"], 13, 0.31).bonus).toBe(LOW_HP_BLOCK_BONUS);
    expect(LOW_HP_BLOCK_BONUS).toBe(MUST_HAVE_BONUS * 1.5);
    // Above half HP, short of the target: the full bonus, not halved.
    expect(mustHaveBonus(plan, "BLOOD_WALL", ["STONE_ARMOR"], 13, 0.8).bonus).toBe(MUST_HAVE_BONUS);
    // Target met: halved by the gap as before (UP1C F6).
    expect(mustHaveBonus(plan, "BLOOD_WALL", ["STONE_ARMOR", "SHRUG_IT_OFF", "TRUE_GRIT"], 13, 0.31).bonus).toBe(2);
    // EGX7 F23 (block 4/5): one short, no low-HP bonus.
    expect(mustHaveBonus({ needs: ["block"], blockTarget: 5 } as never, "FLAME_BARRIER", ["STONE_ARMOR", "SHRUG_IT_OFF", "TRUE_GRIT", "BLOOD_WALL"], 13, 0.2).bonus).toBe(4);
  });
});

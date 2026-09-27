/**
 * Intent-translation fixes from the A8 post-mortems of VQ7J, G8F1, FN0H, VF5C and Z7D7 (notes/lessons.md),
 * each replayed on the logged board of the cited turn (tests/logged-states) where one exists.
 */

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import type { AskDecision, Decision } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { planMap } from "../src/screens/map.js";
import { modelHandCard } from "../src/strategy/card-model.js";
import { fightFocus, parseFightPlan } from "../src/strategy/fight-plan.js";
import { combatPolicy, mapShift, objectiveInForce, originOf, policyAt, reserveReleased } from "../src/strategy/intent.js";
import { routeFacts, type RouteNode } from "../src/strategy/route-facts.js";
import { parseRunPlan, routeAhead } from "../src/strategy/run-plan.js";
import { logged, loggedEnv, loggedKnowledge } from "./logged.js";

type Raw = Record<string, unknown>;

/** The options of a combat question: key -> parsed criteria. */
function optionsOf(decision: Decision | null): Record<string, Raw> {
  expect(decision?.kind).toBe("ask");
  const question = Object.values((decision as AskDecision).questions)[0]!;
  if (question.type !== "choice") throw new Error("not a choice");
  return Object.fromEntries(Object.entries(question.criteria).map(([key, value]) => [key, JSON.parse(value!) as Raw]));
}
const strategyOf = (decision: Decision | null): string[] => ((decision as AskDecision).state["strategy"] as string[]) ?? [];

describe("RELAX: next turn's energy and draw (FN0H F33 T2)", () => {
  it("is modelled as block now, no energy or draw this turn", () => {
    const fx = logged("fn0h-f33-t2");
    const relax = ((fx.state["combat"] as Raw)["hand"] as Raw[]).find((card) => card["card_id"] === "RELAX")!;
    const model = modelHandCard(relax, 0, loggedKnowledge);
    expect(model.block).toBe(32);
    expect(model.energyGain).toBe(0);
    expect(model.draw).toBe(0);
  });

  it("no line plays Relax and then a 2-cost attack on 3 energy (the logged rank 1 'Relax, Bash+' dealt 0)", () => {
    const fx = logged("fn0h-f33-t2");
    const options = optionsOf(planCombatTurn(loggedEnv(fx)));
    for (const option of Object.values(options)) {
      const plays = String(option["plays"] ?? "");
      if (plays.includes("放松")) expect(plays).not.toMatch(/痛击|突破/);
    }
  });
});

describe("hp_policy preserve in an act-boss fight behind its clock (G8F1 F33)", () => {
  it("translates as balanced while the clock needs more a turn than the deck deals", () => {
    const fx = logged("g8f1-f33-t2");
    expect(combatPolicy(fx.runPlan, fx.fightPlan, 44 / 87, { need: 51, deck: 32 }).policy).toBe("balanced");
    expect(combatPolicy(fx.runPlan, fx.fightPlan, 44 / 87, { need: 30, deck: 40 }).policy).toBe("preserve");
    expect(combatPolicy(fx.runPlan, fx.fightPlan, 44 / 87, null).policy).toBe("preserve");
  });

  it("the logged T2 board: no label prices a damage line against preserve, and Jev is told why", () => {
    const fx = logged("g8f1-f33-t2");
    const decision = planCombatTurn(loggedEnv(fx));
    const options = optionsOf(decision);
    for (const option of Object.values(options)) expect(String(option["intent_fit"] ?? "")).not.toMatch(/hp_policy preserve/);
    // Howl from Beyond, 27 damage for 17 HP: "breaks hp_policy preserve: loses 17 more HP" in the log.
    const howl = Object.values(options).find((option) => String(option["plays"]).includes("彼岸咆哮"));
    expect(String(howl?.["intent_fit"])).toMatch(/^fits/);
    expect(strategyOf(decision).join("\n")).toMatch(/in force now: hp_policy balanced \(act boss behind its clock/);
  });
});

describe("a low-HP preserve ends by its origin, not by a later re-plan's reason (Z7D7 F24, FN0H F33)", () => {
  it("Z7D7 v8: the F20 hp_below_target preserve, reason rewritten to boss_prep, lapses at the 85% target", () => {
    const plan = logged("z7d7-map-f25").runPlan!;
    expect(plan.version).toBe(8);
    expect(plan.reasons?.hp_policy).toBe("boss_prep");
    expect(originOf(plan, "hp_policy")?.trigger).toBe("hp_below_target");
    expect(policyAt(plan, 69 / 80)).toBe("balanced");
    expect(policyAt(plan, 50 / 80)).toBe("preserve");
  });

  it("FN0H v5: the F31 preserve is off at 94% after the forced rest", () => {
    const fx = logged("fn0h-f33-t2");
    expect(policyAt(fx.runPlan, 78 / 83)).toBe("balanced");
    expect(strategyOf(planCombatTurn(loggedEnv(fx))).join("\n")).toMatch(/in force now: hp_policy balanced \(hp_policy preserve was for low HP/);
  });

  it("the origin is kept in plan state across a re-plan that only rewrites the reason", () => {
    const fx = logged("z7d7-map-f25");
    const state = parseGameState(fx.state);
    // v7 as it was at F20 (the logged v7 without origins: read from its changes).
    const v7 = { ...fx.runPlan!, version: 7, hpPolicy: "preserve" as const, reasons: { ...fx.runPlan!.reasons, hp_policy: "low_hp" as const }, changes: fx.runPlan!.changes.filter((change) => change.version <= 7) };
    delete v7.origins;
    const v8 = parseRunPlan({ hp_policy: "preserve", reasons: { hp_policy: "boss_prep" }, changes: [] }, state, loggedKnowledge, "hp_rise", v7);
    expect(v8.origins?.hp_policy).toMatchObject({ trigger: "hp_below_target", version: 7 });
    expect(policyAt(v8, 0.86)).toBe("balanced");
    // A preserve the first plan set for the boss (no low-HP origin) holds at any HP.
    const start = parseRunPlan({ hp_policy: "preserve", reasons: { hp_policy: "boss_prep" } }, state, loggedKnowledge, "start", null);
    expect(start.origins?.hp_policy).toMatchObject({ trigger: "start", reason: "boss_prep" });
    expect(policyAt(start, 0.95)).toBe("preserve");
  });
});

describe("reserved potions are released when the safest dry line ends within next turn's hit + 3", () => {
  it("the rule", () => {
    const base = { bossFight: false, hpFraction: 31 / 80, everyDryLineDies: false };
    expect(reserveReleased({ ...base, dry: { hpAfter: 2, nextIncoming: 20, maxHp: 80 } })).toMatch(/leaves 2 HP/);
    expect(reserveReleased({ ...base, dry: { hpAfter: 40, nextIncoming: 20, maxHp: 80 } })).toBeNull();
  });

  it("VF5C F27 T4: the only dry line left 2 of 31 HP; the Weak Potion and Explosive Ampoule are drunk now", () => {
    const fx = logged("vf5c-f27-t4");
    const e = loggedEnv(fx);
    const decision = planCombatTurn(e);
    const text = JSON.stringify([decision?.kind === "act" ? decision.rationale : (decision as AskDecision).questions, e.screenMemory.combatPlan?.remaining]);
    expect(text).toMatch(/虚弱药水|爆炸安瓿/);
  });

  it("Z7D7 F28 T3: every line 27 -> 2, Heart of Iron is on offer", () => {
    const options = optionsOf(planCombatTurn(loggedEnv(logged("z7d7-f28-t3"))));
    const heart = Object.values(options).find((option) => String(option["plays"]).includes("铁心药水"));
    expect(String(heart?.["reserve"])).toMatch(/released: the safest line without it leaves 2 HP/);
  });
});

describe("segments that must die together are leveled, not focused (Z7D7 F28 T2)", () => {
  it("the logged T2 board (50/38/52, Middle with Strength 2): code's lines leave the Middle alone", () => {
    const options = optionsOf(planCombatTurn(loggedEnv(logged("z7d7-f28-t2"))));
    // Every logged option put all of its damage into the Middle (38 -> 10..25).
    const middleAfter = (option: Raw) => String(option["enemies_after"]).split("; ")[1];
    expect(middleAfter(options["plan1"]!)).toMatch(/^残杀千足虫 38 HP/);
  });
});

describe("kill_priority puts minions behind the last non-minion (G8F1 F17 The Kin)", () => {
  it("the validator reorders [KIN_FOLLOWER, KIN_PRIEST] and says so", () => {
    const fx = logged("g8f1-f17-t1");
    const state = parseGameState(fx.state);
    const plan = parseFightPlan({ objective: "kill_fast", kill_priority: ["KIN_FOLLOWER", "KIN_PRIEST"] }, state, loggedKnowledge, { runId: "G8F1QPPZCM4T", fight: "0:17", kind: "boss", replans: 0 });
    expect(plan.killPriority).toEqual(["KIN_PRIEST", "KIN_FOLLOWER"]);
    expect(plan.validator.join("; ")).toMatch(/minion KIN_FOLLOWER moved behind KIN_PRIEST/);
  });

  it("a plan logged in the old order focuses the priest while it lives", () => {
    const fx = logged("g8f1-f17-t1");
    expect(fx.fightPlan!.killPriority).toEqual(["KIN_FOLLOWER", "KIN_PRIEST"]);
    expect(fightFocus(fx.fightPlan, parseGameState(fx.state))).toBe("KIN_PRIEST");
  });
});

describe("scale_then_kill is a phase: kill_fast once the setup window closes or no setup is left (VQ7J F11)", () => {
  it("the rule", () => {
    expect(objectiveInForce("scale_then_kill", { turn: 2, laterPhase: false, setupLeft: true }).objective).toBe("scale_then_kill");
    expect(objectiveInForce("scale_then_kill", { turn: 2, laterPhase: false, setupLeft: false }).objective).toBe("kill_fast");
    expect(objectiveInForce("scale_then_kill", { turn: 4, laterPhase: false, setupLeft: true }).objective).toBe("kill_fast");
    expect(objectiveInForce("preserve_hp", { turn: 5, laterPhase: false, setupLeft: false }).objective).toBe("preserve_hp");
  });

  it("T3 (Inferno in the draw pile) is still setup; T4 (nothing left) is labelled kill_fast", () => {
    const t3 = planCombatTurn(loggedEnv(logged("vq7j-f11-t3")));
    expect(Object.values(optionsOf(t3)).map((option) => String(option["intent_fit"])).join("\n")).toMatch(/scale_then_kill/);
    const t4 = planCombatTurn(loggedEnv(logged("vq7j-f11-t4")));
    const labels = Object.values(optionsOf(t4)).map((option) => String(option["intent_fit"] ?? "")).join("\n");
    expect(labels).toMatch(/kill_fast/);
    expect(labels).not.toMatch(/scale_then_kill/);
    expect(strategyOf(t4).join("\n")).toMatch(/in force now: objective kill_fast \(scale_then_kill's setup window is over/);
  });
});

describe("the validator's growth check reads the move cycle (Z7D7 F8 Terror Eel, F17 Waterfall Giant)", () => {
  for (const [name, fight, kind] of [["z7d7-f8-t1", "0:8", "monster"], ["z7d7-f17-t1", "0:17", "boss"]] as const) {
    it(`${name}: reason enemy_scales is no disagreement`, () => {
      const fx = logged(name);
      // Logged then: "reason enemy_scales, but code sees no growth power, Strength or Buff intent on the board".
      expect(fx.fightPlan!.disagreements!.join("; ")).toMatch(/sees no growth/);
      const plan = parseFightPlan({ objective: "kill_fast", reason: ["enemy_scales"] }, parseGameState(fx.state), loggedKnowledge, { runId: "Z7D7J1RUUJ61", fight, kind, replans: 0 });
      expect((plan.disagreements ?? []).join("; ")).not.toMatch(/sees no growth/);
    });
  }
});

describe("route: forced elites, rest before them, and a reserved heal potion (Z7D7 F25)", () => {
  const nodesOf = (map: Raw): Map<string, RouteNode> =>
    new Map((map["nodes"] as Raw[]).map((node) => [`${node["row"]},${node["col"]}`, { row: node["row"] as number, col: node["col"] as number, type: node["node_type"] as string, children: node["children"] as { row: number; col: number }[] }]));

  it("each option's forced elite and whether a rest comes first", () => {
    const map = logged("z7d7-map-f25").state["map"] as Raw;
    const nodes = nodesOf(map);
    const floorOf = (row: number) => 25 + (row - 7);
    const viaShop = routeFacts(nodes, [nodes.get("8,0")!], floorOf);
    const viaRest = routeFacts(nodes, [nodes.get("8,1")!], floorOf);
    expect(viaShop.forcedElites).toEqual([{ row: 10, cols: [0], floor: 28, rest: "none" }]);
    expect(viaRest.forcedElites).toEqual([{ row: 10, cols: [2], floor: 28, rest: "every" }]);
    // From the open nodes together: an elite on F28 whichever way, a rest before it only on one.
    expect(routeAhead(parseGameState(logged("z7d7-map-f25").state))).toMatchObject({ forced_elites: expect.stringMatching(/F28 \(row 10, col 0\/2\): a rest before it only on some paths/) });
  });

  it("the rest line into the elite wins once the Blood Potion kept for the boss is not counted as HP", () => {
    const fx = logged("z7d7-map-f25");
    const decision = planMap(loggedEnv(fx));
    // Logged: "Treasure (row 8, col 0) scores 13.48 vs Treasure (row 8, col 1) 8.38" (shop -> elite).
    expect(decision?.kind === "act" ? decision.intent : decision?.kind === "ask" ? "ask" : null).toEqual({ action: "choose_map_node", option_index: 1 });
  });

  it("the near-boss elite rule is never milder for the elite reached with more HP", () => {
    const plan = logged("z7d7-map-f25").runPlan!;
    expect(mapShift(plan, "Elite", 0.92, 5)).toBeGreaterThanOrEqual(mapShift(plan, "Elite", 0.62, 5));
    expect(mapShift(plan, "Elite", 0.62, 5)).toBeLessThanOrEqual(-8);
  });
});

describe("the HP guard compares HP lost until the kill (G8F1 F30 T6, kill_fast elite)", () => {
  it("code's 39-damage line is played, not swapped for a line that leaves the kill a turn later", () => {
    const fx = logged("g8f1-f30-t6");
    const e = loggedEnv(fx);
    const decision = planCombatTurn(e);
    // Logged: "HP guard: plan 1 (Pommel Strike, Hemokinesis, Strike) loses 14 HP … playing plan 2".
    expect(decision?.kind).toBe("act");
    expect(decision?.kind === "act" ? decision.label : "").toBe("combat/plan");
    expect(decision?.kind === "act" ? decision.rationale : "").toMatch(/^code plan .*御血术/);
  });

  it("the guard still swaps when the extra damage does not bring the kill a turn sooner (VF5C F27 T2)", () => {
    const decision = planCombatTurn(loggedEnv(logged("vf5c-f27-t2")));
    expect(decision?.kind).toBe("ask");
    // Jev's logged pick: plan 3 (Defend, Bash, Strike: 17 damage, -12) at 0.34; the Entomancer's 147 HP
    // takes as many turns either way, so the -1 line is played.
    const resolved = (decision as AskDecision).resolve({ plan: { type: "choice", choice: "plan3", confidence: 0.34, probabilities: {}, raw: {} } } as never);
    expect(resolved.rationale).toMatch(/HP guard: plan 3/);
  });
});

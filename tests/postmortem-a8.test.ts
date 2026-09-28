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
import { combatPolicy, objectiveInForce, originOf, policyAt } from "../src/strategy/intent.js";
import { routeFacts, type RouteNode } from "../src/strategy/route-facts.js";
import { parseRunPlan, routeAhead } from "../src/strategy/run-plan.js";
import { logged, loggedEnv, loggedKnowledge, referencePick } from "./logged.js";

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

  it("the logged T2 board: Jev is told the clock reads preserve as balanced; the Howl line carries its facts", () => {
    const fx = logged("g8f1-f33-t2");
    const decision = planCombatTurn(loggedEnv(fx));
    const options = optionsOf(decision);
    // Howl from Beyond, 27 damage for 17 HP: "breaks hp_policy preserve: loses 17 more HP" in the log.
    const howl = Object.values(options).find((option) => String(option["plays"]).includes("彼岸咆哮"));
    expect(String(howl?.["reference"])).toMatch(/^(same as reference|reference rank)/);
    expect(strategyOf(decision).join("\n")).toMatch(/code note: hp_policy reads as balanced now \(act boss behind its clock/);
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
    expect(strategyOf(planCombatTurn(loggedEnv(fx))).join("\n")).toMatch(/code note: hp_policy reads as balanced now \(hp_policy preserve was for low HP/);
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

describe("potions DeepSeek holds are on offer when the safest dry line ends within next turn's hit", () => {
  it("VF5C F27 T4: the only dry line left 2 of 31 HP; the Weak Potion and Explosive Ampoule are drunk now", () => {
    const fx = logged("vf5c-f27-t4");
    const e = loggedEnv(fx);
    const decision = planCombatTurn(e);
    const text = JSON.stringify([decision?.kind === "act" ? decision.rationale : (decision as AskDecision).questions, e.screenMemory.combatPlan?.remaining]);
    expect(text).toMatch(/虚弱药水|爆炸安瓿/);
  });

  it("Z7D7 F28 T3: every line 27 -> 2, Heart of Iron is on offer", () => {
    // Heart of Iron is on a line with its facts: what it saves against the best line without it.
    const decision = planCombatTurn(loggedEnv(logged("z7d7-f28-t3")));
    if (decision?.kind === "act") {
      expect(decision.rationale).toMatch(/铁心药水/);
    } else {
      const heart = Object.values(optionsOf(decision)).find((option) => String(option["plays"]).includes("铁心药水"));
      expect(String(heart?.["potion_facts"])).toMatch(/drinking 铁心药水 now: saves \d+ HP/);
    }
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

describe("scale_then_kill is a phase: kill_fast once the fight is too short for setup or none is left (VQ7J F11, G8F1 F33)", () => {
  it("the rule", () => {
    expect(objectiveInForce("scale_then_kill", { turnsLeft: 8, laterPhase: false, setupLeft: true }).objective).toBe("scale_then_kill");
    expect(objectiveInForce("scale_then_kill", { turnsLeft: 8, laterPhase: false, setupLeft: false }).objective).toBe("kill_fast");
    expect(objectiveInForce("scale_then_kill", { turnsLeft: 2, laterPhase: false, setupLeft: true }).objective).toBe("kill_fast");
    expect(objectiveInForce("scale_then_kill", { turnsLeft: 8, laterPhase: true, setupLeft: true }).objective).toBe("kill_fast");
    expect(objectiveInForce("preserve_hp", { turnsLeft: 1, laterPhase: false, setupLeft: false }).objective).toBe("preserve_hp");
  });

  it("VQ7J T3 (Inferno in the draw pile) is still setup; T4 (nothing left) reads as kill_fast", () => {
    const t3 = planCombatTurn(loggedEnv(logged("vq7j-f11-t3")));
    // Still scale_then_kill (no "read as kill_fast" note); no line in hand sets up, so no setup label that
    // every line would carry ("no line sets up more" was on every line: 99X7/G8YY post-mortems).
    expect(strategyOf(t3).join("\n")).toMatch(/DeepSeek fight objective scale_then_kill/);
    expect(strategyOf(t3).join("\n")).not.toMatch(/code note: the fight now reads as kill_fast/);
    expect(Object.values(optionsOf(t3)).map((option) => String(option["tempo"])).join("\n")).not.toMatch(/no line sets up more/);
    const t4 = planCombatTurn(loggedEnv(logged("vq7j-f11-t4")));
    const labels = Object.values(optionsOf(t4)).map((option) => String(option["tempo"] ?? "")).join("\n");
    expect(labels).toMatch(/DeepSeek's scale_then_kill, read as kill_fast now/);
    expect(strategyOf(t4).join("\n")).toMatch(/code note: the fight now reads as kill_fast \(scale_then_kill: /);
  });

  it("G8F1 F33 T4: a long boss fight left, Demon Form is still played (no turn cutoff)", () => {
    const fx = logged("g8f1-f33-t4");
    // Logged: "code plan (+21.5 over next): 恶魔形态; hp -11, dmg 0".
    expect(fx.decision.rationale).toMatch(/恶魔形态/);
    const decision = planCombatTurn(loggedEnv(fx));
    if (decision?.kind === "act") {
      expect(decision.rationale).toMatch(/恶魔形态/);
      return;
    }
    // Offered, and it is the line that matches DeepSeek's scale_then_kill (balanced weights may rank it lower).
    const demon = Object.values(optionsOf(decision)).find((option) => String(option["plays"]).includes("恶魔形态"));
    expect(String(demon?.["tempo"])).toMatch(/^matches DeepSeek's scale_then_kill/);
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

  it("code's reference is the rest line into the elite once the Blood Potion kept for the boss is not counted as HP", () => {
    const fx = logged("z7d7-map-f25");
    const decision = planMap(loggedEnv(fx));
    // Logged: "Treasure (row 8, col 0) scores 13.48 vs Treasure (row 8, col 1) 8.38" (shop -> elite).
    expect(decision?.kind).toBe("ask");
    expect(referencePick(decision).intent).toEqual({ action: "choose_map_node", option_index: 1 });
  });
});

describe("HP lost until the kill is a fact on each line; no guard swaps (G8F1 F30 T6, VF5C F27 T2)", () => {
  it("G8F1 F30 T6: the 39-damage Hemokinesis line is code's reference, and says when the kill comes", () => {
    const fx = logged("g8f1-f30-t6");
    const decision = planCombatTurn(loggedEnv(fx));
    // Logged: "HP guard: plan 1 (Pommel Strike, Hemokinesis, Strike) loses 14 HP … playing plan 2".
    if (decision?.kind === "act") {
      expect(decision.rationale).toMatch(/御血术/);
      return;
    }
    const reference = Object.values(optionsOf(decision)).find((option) => /^same as reference/.test(String(option["reference"])));
    expect(String(reference?.["plays"])).toMatch(/御血术/);
    expect(String(reference?.["kill_eta"])).toMatch(/^~\d+ turns to the kill/);
  });

  it("VF5C F27 T2: Jev's plan 3 at 0.34 is played as picked, its extra HP a fact", () => {
    const decision = planCombatTurn(loggedEnv(logged("vf5c-f27-t2")));
    expect(decision?.kind).toBe("ask");
    const resolved = (decision as AskDecision).resolve({ plan: { type: "choice", choice: "plan3", confidence: 0.34, probabilities: {}, raw: {} } } as never);
    expect(resolved.rationale).toMatch(/^Jev chose plan 3\//);
    expect(resolved.guard).toBeUndefined();
    expect(String(optionsOf(decision)["plan3"]!["reference"])).toMatch(/^(same as reference|reference rank \d)/);
  });
});

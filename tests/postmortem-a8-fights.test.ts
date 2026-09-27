/**
 * Fight-level fixes from the A8 post-mortems of XMY2, K7G9, N7KR, NJSZ and HCBJ (notes/lessons.md),
 * each replayed on the logged board of the cited turn (tests/logged-states).
 */

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import type { AskDecision, Decision } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { expectedLossPerTurn, parseFightPlan } from "../src/strategy/fight-plan.js";
import { grindOutlasts, objectiveInForce } from "../src/strategy/intent.js";
import { logged, loggedEnv, loggedKnowledge } from "./logged.js";

const strategyOf = (decision: Decision | null): string[] => ((decision as AskDecision).state["strategy"] as string[]) ?? [];

describe("a preserve_hp grind the enemy outlasts is logged and played as kill_fast (XMY2 F24, K7G9 F45)", () => {
  it("the rule: turns to kill x HP lost a turn against HP now", () => {
    expect(grindOutlasts({ turnsToKill: 6, lossPerTurn: 13, hp: 19 })).toMatch(/grind outlasts our HP/);
    expect(grindOutlasts({ turnsToKill: 2, lossPerTurn: 5, hp: 19 })).toBeNull();
    expect(objectiveInForce("preserve_hp", { turnsLeft: 6, laterPhase: false, setupLeft: false, grind: { turnsToKill: 6, lossPerTurn: 13, hp: 19 } }).objective).toBe("kill_fast");
    expect(objectiveInForce("preserve_hp", { turnsLeft: 2, laterPhase: false, setupLeft: false, grind: { turnsToKill: 2, lossPerTurn: 5, hp: 19 } }).objective).toBe("preserve_hp");
  });

  for (const [name, why] of [
    ["xmy2-f24-t1", "Hunter Killer 126 HP at 19/80"],
    ["k7g9-f45-t1", "Mecha Knight 320 HP at 20/72"],
  ] as const) {
    it(`the validator logs it as a disagreement and keeps the objective (${why})`, () => {
      const fx = logged(name);
      const state = parseGameState(fx.state);
      expect(expectedLossPerTurn(state, loggedKnowledge)).toBeGreaterThan(0);
      const plan = parseFightPlan({ objective: "preserve_hp", kill_priority: [], reason: ["low_hp"] }, state, loggedKnowledge, { runId: "x", fight: fx.fightPlan!.fight, kind: fx.fightPlan!.kind, replans: 0 }, fx.runPlan);
      expect(plan.objective).toBe("preserve_hp");
      expect(plan.disagreements?.join(" ")).toMatch(/preserve_hp: the grind outlasts our HP .*code plays the fight as kill_fast/);
    });
  }

  it("XMY2 F24 T2 (the logged preserve_hp plan): Jev is told the fight is played as kill_fast, under balanced weights", () => {
    const decision = planCombatTurn(loggedEnv(logged("xmy2-f24-t2")));
    const lines = strategyOf(decision).join("\n");
    expect(lines).toMatch(/in force now: objective kill_fast \(preserve_hp: the grind outlasts our HP/);
    expect(lines).toMatch(/in force now: hp_policy balanced \(damage first/);
  });
});

/**
 * Combat execution is Jev's (Dai 2026-09-28): with two or more distinct lines Jev is asked even when
 * code's line leads by 6+ points; no DeepSeek escalation in combat; a low-confidence hallway pick stands;
 * code still plays lethal lines itself.
 */

import { describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import type { AskDecision } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { logged, loggedEnv } from "./logged.js";

const answer = (key: string, confidence: number): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;

describe("combat lines are Jev's", () => {
  it("RA3Q F14 T1: code led by 7.7 and played its line; now Jev is asked, with no DeepSeek escalation", () => {
    const fx = logged("ra3q-f14-t1-margin");
    expect(fx.decision.rationale).toMatch(/\+7\.7 over next/);
    const decision = planCombatTurn(loggedEnv(fx));
    expect(decision?.kind).toBe("ask");
    const ask = decision as AskDecision;
    expect(ask.label).toMatch(/^combat\/plan-choice/);
    const plan = ask.questions["plan"];
    expect(plan?.type === "choice" && Object.keys(plan.criteria).length).toBeGreaterThanOrEqual(2);
    expect(ask.escalate).toBeUndefined();
  });

  it("a low-confidence hallway pick below code's rank 1 stands (no fallback to code)", () => {
    const decision = planCombatTurn(loggedEnv(logged("ra3q-f14-t1-margin"))) as AskDecision;
    const plan = decision.questions["plan"];
    if (plan?.type !== "choice") throw new Error("expected a choice");
    const keys = Object.keys(plan.criteria).filter((key) => key.startsWith("plan"));
    const second = keys[1]!;
    const resolved = decision.resolve(answer(second, 0.1));
    expect(resolved.fallback).toBe(false);
    expect(resolved.rationale).toMatch(/Jev chose/);
  });

  it("lethal lines are still played by code (9VG8 F35 T6)", () => {
    const decision = planCombatTurn(loggedEnv(logged("9vg8-f35-t6")));
    expect(decision?.kind === "act" && decision.label).toBe("combat/lethal");
  });
});

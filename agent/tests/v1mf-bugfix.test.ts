/**
 * V1MF91VL7A2G regressions on logged boards: Toasty Mittens' forced exhaust took Fight Me (F19 T1,
 * F33 T2), and a Jev-chosen line's Powdered Demise was left undrunk when True Grit emptied the hand
 * (F33 T4: "no playable cards; ending the turn").
 */

import { describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import type { AskDecision } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { planSelection } from "../src/screens/selection.js";
import { logged, loggedEnv } from "./logged.js";

const answer = (key: string, confidence: number): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;

describe("V1MF Toasty Mittens exhaust", () => {
  for (const [name, was] of [["v1mf-f19-t1-mittens", "打击 70"], ["v1mf-f33-t2-mittens", "愤怒 50"]] as const) {
    it(`${name}: Fight Me (Strength scaling) is kept; logged pick was Fight Me 75 over ${was}`, () => {
      const fx = logged(name);
      expect(fx.decision.rationale).toMatch(/与我一战！ scores 75/);
      const decision = planSelection(loggedEnv(fx));
      if (decision?.kind !== "act") throw new Error(`expected an act, got ${decision?.kind}`);
      const index = decision.intent.option_index;
      const cards = ((fx.state["selection"] as Record<string, unknown>)["cards"] as Record<string, unknown>[]);
      const picked = cards.find((card) => card["index"] === index) ?? cards[index as number];
      expect(picked?.["card_id"]).not.toBe("FIGHT_ME");
    });
  }
});

describe("V1MF F33 T4: a chosen line's drink is not lost when the line is cut short", () => {
  it("the logged end-of-turn board (no playable card): the Demise is offered, not dropped by an end turn", () => {
    const fx = logged("v1mf-f33-t4-end");
    expect(fx.decision.rationale).toMatch(/no playable cards/);
    // The drink is Jev's call (potions are Jev's, Dai 2026-09-28): asked again, with the Demise line shown.
    const fight = planCombatTurn(loggedEnv(fx));
    if (fight?.kind !== "ask") throw new Error(`expected an ask, got ${fight?.kind}`);
    const plan = fight.questions["plan"];
    if (plan?.type !== "choice") throw new Error("expected a choice");
    expect(Object.values(plan.criteria ?? {}).some((text) => /potion 消亡粉末 -> 火箭/.test(String(text)))).toBe(true);
  });

  it("choosing a line with a later drink keeps it in the line; the cut-short board re-plans it (XMK1 F33 T3)", () => {
    const fx = logged("v1mf-f33-t4");
    const env = loggedEnv(fx);
    const decision = planCombatTurn(env) as AskDecision;
    expect(decision.kind).toBe("ask");
    const plan = decision.questions["plan"];
    if (plan?.type !== "choice") throw new Error("expected a choice");
    // The logged pick was "防御, 飞剑回旋镖, 坚毅, potion 消亡粉末 -> 火箭"; any line drinking the Demise after a card.
    const chosen = Object.entries(plan.criteria).find(([key, text]) => key.startsWith("plan") && /then potion 消亡粉末 -> 火箭/.test(String(text)));
    if (!chosen) throw new Error("the logged line is not offered");
    decision.resolve(answer(chosen[0], 0.67)).apply?.();
    expect(env.screenMemory.combatPlan?.remaining.map((step) => step.cardId)).toContain("POTION:POWDERED_DEMISE:0");
    const end = logged("v1mf-f33-t4-end");
    const later = planCombatTurn({ ...loggedEnv(end), screenMemory: env.screenMemory });
    expect(later?.kind === "act" && later.intent.action === "use_potion").toBe(false);
    expect(later?.kind).toBe("ask");
  });
});

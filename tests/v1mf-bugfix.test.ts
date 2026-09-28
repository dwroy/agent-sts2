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
import { fightKey } from "../src/strategy/fight-plan.js";
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

describe("V1MF F33 T4: a chosen line's drink is drunk when the line is cut short", () => {
  const drink = { cardIndex: -1, cardId: "POTION:POWDERED_DEMISE:0", upgraded: false, name: "potion 消亡粉末", target: 1, targetName: "火箭" };

  it("the logged end-of-turn board with the Demise still pending: drink it, not end the turn", () => {
    const fx = logged("v1mf-f33-t4-end");
    expect(fx.decision.rationale).toMatch(/no playable cards/);
    const env = loggedEnv(fx);
    // Without a pending drink the Demise is Jev's call (potions are Jev's, Dai 2026-09-28): asked, not drunk.
    const fight = planCombatTurn(loggedEnv(fx));
    expect(fight?.kind === "act" && fight.intent.action === "use_potion").toBe(false);
    env.screenMemory.pendingDrinks = { fight: fightOf(env), turn: env.state.turn ?? null, via: "jev", steps: [drink] };
    const decision = planCombatTurn(env);
    if (decision?.kind !== "act") throw new Error("expected an act");
    expect(decision.label).toBe("combat/plan-potion");
    expect(decision.intent).toEqual({ action: "use_potion", option_index: 0, target_index: 1 });
    expect(env.screenMemory.pendingDrinks).toBeUndefined();
  });

  it("a pending drink from another turn is dropped", () => {
    const env = loggedEnv(logged("v1mf-f33-t4-end"));
    env.screenMemory.pendingDrinks = { fight: fightOf(env), turn: (env.state.turn ?? 0) - 1, via: "jev", steps: [drink] };
    const decision = planCombatTurn(env);
    expect(decision?.kind === "act" && decision.intent.action === "use_potion").toBe(false);
    expect(env.screenMemory.pendingDrinks).toBeUndefined();
  });

  it("choosing a line with a later drink records it (commit), and the cut-short board drinks it", () => {
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
    expect(env.screenMemory.pendingDrinks?.steps.map((step) => step.cardId)).toEqual(["POTION:POWDERED_DEMISE:0"]);
    const end = logged("v1mf-f33-t4-end");
    const later = planCombatTurn({ ...loggedEnv(end), screenMemory: env.screenMemory });
    expect(later?.kind === "act" && later.label).toBe("combat/plan-potion");
    expect(later?.kind === "act" && later.intent).toEqual({ action: "use_potion", option_index: 0, target_index: 1 });
  });
});

/** The fight key commit stores with the pending drinks. */
function fightOf(env: ReturnType<typeof loggedEnv>): string {
  return fightKey(env.state);
}

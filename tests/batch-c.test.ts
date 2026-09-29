/**
 * Fix batch C (notes/fix-queue.md, from the 2026-09-29 post-mortems in notes/lessons.md): pure bugs in
 * combat, selection, shop, events, DeepSeek logging and the facts. One describe per fix; boards are
 * synthetic or logged fixtures (tests/logged-states), never the refreshing knowledge files.
 */

import { describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import type { AskDecision } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { logged, loggedEnv } from "./logged.js";

const choose = (key: string, confidence: number): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;

function planCriteria(decision: ReturnType<typeof planCombatTurn>): Record<string, string> {
  if (decision?.kind !== "ask") throw new Error(`expected an ask, got ${decision?.kind} ${decision?.kind === "act" ? decision.label : ""}`);
  const question = decision.questions["plan"];
  if (question?.type !== "choice") throw new Error("expected a plan choice");
  return Object.fromEntries(Object.entries(question.criteria ?? {}).map(([key, text]) => [key, String(text)]));
}

describe("1. A cut-short line's drink is re-planned with the new hand, not drunk as a stale step (XMK1JFZ0VD2Q F33 T3)", () => {
  it("Battle Trance cuts Jev's line; the Blood Potion is offered again beside the drawn cards, not drunk by code", () => {
    // Logged: Jev chose "战斗专注, 上勾拳, 防御, potion 鲜血药水" at 76/87; Battle Trance drew Pyre, Fight Me+ and
    // Inferno, and code drank the Blood Potion "from the Jev-chosen line before re-planning" (11 of 17 healed).
    const ask = loggedEnv(logged("xmk1-f33-t3-ask"));
    const criteria = planCriteria(planCombatTurn(ask));
    const chosen = Object.entries(criteria).find(([key, text]) => key.startsWith("plan") && /"plays":"战斗专注, then 上勾拳 -> 无厌沙虫, then 防御, then potion 鲜血药水"/.test(text));
    if (!chosen) throw new Error("the logged line is not offered");
    (planCombatTurn(ask) as AskDecision).resolve(choose(chosen[0], 0.64)).apply?.();
    const cut = logged("xmk1-f33-t3-cut");
    expect(cut.decision.label).toBe("combat/plan-potion");
    const decision = planCombatTurn({ ...loggedEnv(cut), screenMemory: ask.screenMemory });
    expect(decision?.kind === "act" && decision.intent.action === "use_potion").toBe(false);
    const again = planCriteria(decision);
    // The drink is a choice again: lines with and without it, over the new hand.
    expect(Object.values(again).some((text) => text.includes("potion 鲜血药水"))).toBe(true);
    expect(Object.values(again).some((text) => !text.includes("potion ") && text.includes("与我一战！+"))).toBe(true);
  });
});

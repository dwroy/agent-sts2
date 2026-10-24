/** W546CNAWY3RG F21 attempt 4 T4, silent-0581: a timed-out root is not an exhaustive search. */
import { readFileSync } from "node:fs";
import { afterEach, expect, it } from "vitest";
import { DecisionBudget, withDecisionBudget } from "../src/core/decision-budget.js";
import { gate } from "../src/hand/act/gate.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { setPaceSolverScope } from "../src/reflex/pace-solver-cache.js";
import { solveTap, type SolveResult } from "../src/reflex/turn-solver.js";
import { env } from "./oneshot-support.js";
import { testKnowledge } from "./scenarios.js";

function fixture() {
  return JSON.parse(readFileSync(new URL("./logged-states/w546-f21-t4-budget-root.json", import.meta.url), "utf8")).state;
}
afterEach(() => { setPaceSolverScope("cleared-root-budget"); solveTap.onSolve = null; });

it("offers the four observed legal Shivs through the existing card layer after a root-only timeout", () => {
  const e = env(fixture(), undefined, { knowledge: testKnowledge, strictJev: true });
  const budget = new DecisionBudget("root-timeout", "ordinary", () => 0, 0);
  let solved: SolveResult | undefined;
  solveTap.onSolve = (_input, result) => { solved = result; };
  setPaceSolverScope("w546-root-timeout");
  const next = withDecisionBudget(budget, () => planCombatTurn(e));
  expect(solved).toMatchObject({ nodes: 1, truncated: true, timedOut: true });
  expect(solved?.plans).toHaveLength(1);
  expect(solved?.plans[0]?.steps).toEqual([]);
  expect(next?.kind).toBe("ask");
  if (next?.kind !== "ask") throw Error("the unsearched legal cards must remain available");
  expect(next.label).toBe("combat/play");
  const question = next.questions["play"];
  if (question?.type !== "choice") throw Error("missing card choices");
  for (const index of [2, 3, 4, 5]) expect(Object.keys(question.criteria)).toContain(`c${index}->e0`);
  // The loop already supplies this context when no Jev time remains; no model or extra search here.
  const resolved = next.resolve({}, { budgetExpired: true });
  expect(resolved.intent?.action).toBe("play_card");
  expect(resolved.intent?.card_index).toBe(2);
  expect(gate(e.state, resolved.intent!).ok).toBe(true);
  expect(budget.remaining()).toBe(0);
  expect(budget.record().fallback).toBe("partial_solver_root_only_existing_card_layer");
});

it("keeps explicitly blocked Shivs unavailable on the same expired board", () => {
  const raw = fixture();
  for (const card of raw.combat.hand) if (card.card_id === "SHIV") {
    card.playable = false; card.can_play_result = false;
    card.unplayable_reason = "blocked_by_hook"; card.unplayable_preventer_id = "FIXED_BLOCKER";
  }
  const e = env(raw, undefined, { knowledge: testKnowledge, strictJev: true });
  const budget = new DecisionBudget("blocked-timeout", "ordinary", () => 0, 0);
  setPaceSolverScope("w546-blocked-timeout");
  const next = withDecisionBudget(budget, () => planCombatTurn(e));
  expect(next).toMatchObject({ kind: "act", intent: { action: "end_turn" } });
});

it.each([["IRONCLAD", 10], ["SILENT", 11]])("preserves the previous root-only behavior for %s A%d", (character, ascension) => {
  const raw = fixture(); raw.run.character_id = character; raw.run.ascension = ascension;
  const e = env(raw, undefined, { knowledge: testKnowledge, strictJev: true });
  const budget = new DecisionBudget("other-scope", "ordinary", () => 0, 0);
  setPaceSolverScope(`${character}:${ascension}:root-only`);
  const next = withDecisionBudget(budget, () => planCombatTurn(e));
  expect(next).toMatchObject({ kind: "act", label: "combat/plan", intent: { action: "end_turn" } });
  expect(budget.record().fallback).toBeNull();
});

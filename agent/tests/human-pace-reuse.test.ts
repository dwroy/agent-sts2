/** Fixed observed inputs: cache identity, partial honesty, preparation isolation and execution gates. */
import { afterEach, expect, it, vi } from "vitest";
import { DecisionBudget, withDecisionBudget } from "../src/core/decision-budget.js";
import { bumpDataVersion } from "../src/core/util/data-version.js";
import { budgetedSolve, PreparedSolverDone, preparingCandidates, setPaceSolverScope } from "../src/reflex/pace-solver-cache.js";
import { solveTap, solveTurn } from "../src/reflex/turn-solver.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { prepareObservedCandidates } from "../src/hand/pace-precompute.js";
import { gate } from "../src/hand/act/gate.js";
import { board } from "./boss-sim-fixture.js";
import { env } from "./oneshot-support.js";
import { combatPayload, testKnowledge } from "./scenarios.js";

afterEach(() => { setPaceSolverScope("cleared"); solveTap.onSolve = undefined; vi.restoreAllMocks(); });
it("prepares a pure candidate result and reuses it after a changed clock, but never after changed resources, policy, data or fight", () => {
  const input = board().solver;
  let computes = 0;
  const compute = () => { computes++; return { plans: [], nodes: 17, truncated: true, timedOut: true as const }; };
  setPaceSolverScope("run:48:policy1");
  const budget = new DecisionBudget("first", "boss", () => 0);
  expect(() => withDecisionBudget(budget, () => preparingCandidates(() => budgetedSolve(input, compute)))).toThrow(PreparedSolverDone);
  const clone = structuredClone(input);
  const reused = withDecisionBudget(new DecisionBudget("retry", "retry", () => 10), () => budgetedSolve({ ...clone, deadline: 50, deadlineNow: () => 10 }, compute));
  expect(reused).toMatchObject({ nodes: 17, truncated: true, timedOut: true }); expect(computes).toBe(1);
  reused.nodes = 99;
  expect(withDecisionBudget(budget, () => budgetedSolve(input, compute)).nodes).toBe(17);
  withDecisionBudget(budget, () => budgetedSolve({ ...input, player: { ...input.player, hp: 9 } }, compute)); expect(computes).toBe(2);
  bumpDataVersion(); withDecisionBudget(budget, () => budgetedSolve(input, compute)); expect(computes).toBe(3);
  setPaceSolverScope("run:48:policy2"); withDecisionBudget(budget, () => budgetedSolve(input, compute)); expect(computes).toBe(4);
  setPaceSolverScope("run:49:policy2"); withDecisionBudget(budget, () => budgetedSolve(input, compute)); expect(computes).toBe(5);
  // No H1 context: historical and other-role computations retain their exact original path.
  budgetedSolve(input, compute); budgetedSolve(input, compute); expect(computes).toBe(7);
});

it("a clock-cut solver preserves an explicitly partial result rather than inventing a complete lethal proof", () => {
  const input = board().solver, budget = new DecisionBudget("expired", "boss", () => 0, 0);
  setPaceSolverScope("expired-proof");
  const result = withDecisionBudget(budget, () => solveTurn(input));
  expect(result).toMatchObject({ truncated: true, timedOut: true, nodes: 1 });
  expect(result.plans.length).toBeGreaterThan(0);
});

it("prepares only the exact observed candidate input in scratch memory and leaves the actual legality gate in control", () => {
  const raw = combatPayload(); (raw.run as Record<string, unknown>).character_id = "SILENT";
  const e = env(raw, undefined, { knowledge: testKnowledge, strictJev: false });
  const snapshot = structuredClone({ state: e.state, memory: e.screenMemory });
  const budget = new DecisionBudget("observed", "ordinary", () => 0);
  let solves = 0; solveTap.onSolve = () => { solves++; };
  const prepared = withDecisionBudget(budget, () => prepareObservedCandidates(e, 500));
  expect(prepared).toMatchObject({ status: "prepared", basis: "exact_observed_input_only", reused: false });
  expect({ state: e.state, memory: e.screenMemory }).toEqual(snapshot);
  expect(solves).toBe(1);
  const again = withDecisionBudget(budget, () => prepareObservedCandidates(e, 500));
  expect(again).toMatchObject({ status: "prepared", reused: true }); expect(solves).toBe(2);
  const next = withDecisionBudget(budget, () => planCombatTurn(e));
  expect(next).not.toBeNull();
  expect(budget.record().stages).toEqual(expect.arrayContaining([expect.objectContaining({ stage: "exact_observed_solver_cache" })]));
  expect(gate(e.state, { action: "play_card", card_index: 999, target_index: 0 }).ok).toBe(false);
  const unknown = env(structuredClone(raw), undefined, { knowledge: testKnowledge });
  (unknown.state.raw.combat as any).action_readiness.can_use_combat_actions = false;
  expect(withDecisionBudget(budget, () => prepareObservedCandidates(unknown, 500))).toMatchObject({ status: "unknown" });
});

it("does not turn a budget-cut root death into the least-loss label used by the existing early-SL proof gate", () => {
  const raw = combatPayload({ lethalEndTurn: true }); (raw.run as any).character_id = "SILENT";
  (raw.run as any).current_hp = 1; (raw.combat as any).player.current_hp = 1;
  const e = env(raw, undefined, { knowledge: testKnowledge, strictJev: false });
  setPaceSolverScope("partial-death-no-proof");
  const budget = new DecisionBudget("expired-death", "ordinary", () => 0, 0);
  const next = withDecisionBudget(budget, () => planCombatTurn(e));
  expect(next).not.toBeNull(); expect(next?.label).not.toBe("combat/least-loss");
  expect(budget.record().fallback).toBe("partial_solver_existing_card_layer_no_death_proof");
});

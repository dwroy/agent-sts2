/** Use an existing animation/poll interval only when the next candidate input is already observed. */
import { DecisionBudget, currentDecisionBudget, withDecisionBudget } from "../core/decision-budget.js";
import { planCombatTurn, plannerTiming } from "../reflex/combat-plan.js";
import { PreparedSolverDone, preparingCandidates } from "../reflex/pace-solver-cache.js";
import type { DecisionEnv } from "../memory/types.js";

export function prepareObservedCandidates(env: DecisionEnv, idleMs: number): Record<string, unknown> | null {
  const parent = currentDecisionBudget();
  if (!parent || env.state.screen !== "COMBAT" || !env.state.in_combat) return null;
  // Even an exhausted preparation allowance must leave the following animation wait uncharged.
  parent.pause();
  const allowance = Math.max(0, Math.min(idleMs, parent.computationRemaining()));
  if (allowance <= 0) { parent.skip("idle_candidates"); return { status: "unknown", reason: "decision_budget_exhausted" }; }
  const started = parent.now(), previousTiming = plannerTiming.last;
  const child = new DecisionBudget(`${parent.key}:idle`, parent.kind, parent.now, allowance, 0);
  try {
    // Only scratch memory is copied. No speculative legal actions, turn, hand, energy or enemy state is invented.
    withDecisionBudget(child, () => preparingCandidates(() => planCombatTurn({ ...env,
      screenMemory: structuredClone(env.screenMemory), sl: undefined, slRecord: undefined })));
    return { status: "unknown", reason: "next_solver_input_not_observed_or_not_ready", budget_ms: allowance };
  } catch (error) {
    if (!(error instanceof PreparedSolverDone)) return { status: "unknown", reason: "preparation_unavailable", budget_ms: allowance };
    return { status: "prepared", basis: "exact_observed_input_only", nodes: error.result.nodes,
      partial: error.result.truncated, reused: error.reused, budget_ms: allowance };
  } finally {
    child.pause();
    const actual = Math.max(0, parent.now() - started);
    parent.charge(actual);
    parent.stages.push({ stage: "idle_observed_candidates", budget_ms: allowance, actual_ms: Math.round(actual), timed_out: child.remaining() === 0 });
    plannerTiming.last = previousTiming;
  }
}

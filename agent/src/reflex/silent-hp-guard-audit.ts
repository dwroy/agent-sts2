import { asRecord, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { Plan } from "./turn-solver.js";

// Read only the already computed numbers; this logger cannot invoke the rollout adapter.
type GuardRollout = { available: false } | { available: true; byPlan: ReadonlyMap<Plan, {
  horizon: number; samples: number; deaths: number; wins: number; hpLoss: number;
}> };

/** 8JRE1C4H4Z2W A10 F33 T5: candidate differences are not realized savings. */
export function silentHpGuardAudit(state: GameState, jev: Plan, before: Plan, after: Plan,
  slack: number, rollout: GuardRollout | null | undefined): JsonValue | null {
  if (str(asRecord(state.run?.raw)["character_id"]).toLowerCase() !== "silent" ||
    state.run?.ascension !== 10 || before === after) return null;
  const snapshot = (plan: Plan): JsonValue => {
    const outcome = plan.outcome;
    const line = rollout?.available ? rollout.byPlan.get(plan) : undefined;
    return {
      steps: plan.steps.map((step) => ({ card_id: step.cardId, name: step.name,
        upgraded: step.upgraded, target: step.target ?? null })),
      hp_lost: outcome.hpLoss, damage_dealt: outcome.damageDealt,
      strength_gained: outcome.strengthGained, sandpit_after: outcome.sandpitAfter,
      unmodelled_cards: [...outcome.unknownCards],
      enemies_after: outcome.enemyHpAfter.map((enemy) => ({ index: enemy.index,
        name: enemy.name, hp: enemy.hp, poison: enemy.poison ?? 0, weak: enemy.weak })),
      rollout: line ? { horizon: line.horizon, samples: line.samples,
        deaths: line.deaths, wins: line.wins, expected_hp_loss: line.hpLoss } : null,
    };
  };
  return {
    scope: "candidate_predictions_before_sl", slack,
    jev: snapshot(jev), before_guard: snapshot(before), after_guard: snapshot(after),
    predicted_hp_saved: before.outcome.hpLoss - after.outcome.hpLoss,
    predicted_damage_change: after.outcome.damageDealt - before.outcome.damageDealt,
    // A later SL replacement or re-plan can change what is actually dispatched.
    actual_outcome: null,
  };
}

import { asRecord, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { ActionRequest } from "../hand/mod/client.js";
import type { Plan } from "./turn-solver.js";

export interface SelectionCandidate {
  text: string;
  plan: Plan | null;
  sampled?: boolean;
  rollout?: { horizon: number; samples: number; deaths: number; hpLoss: number };
}

/** 8JRE/YF0L/XP2S, silent-0079: a selected forecast is not an executed turn. */
export function silentSelectionAudit(
  state: GameState,
  attempt: number | null,
  stages: { answer: SelectionCandidate | null; beforeSl: SelectionCandidate | null; afterSl: SelectionCandidate | null },
  requested: ActionRequest | null,
): JsonValue | null {
  if (str(asRecord(state.run?.raw)["character_id"]).toLowerCase() !== "silent" || state.run?.ascension !== 10) return null;
  const snapshot = (candidate: SelectionCandidate | null): JsonValue => {
    if (!candidate) return null;
    const plan = candidate.plan;
    return {
      line: candidate.text,
      outcome_kind: candidate.sampled ? "sampled_potion_median" : plan ? "turn_model" : "unavailable",
      planned_steps: plan?.steps.map((step) => ({ card_id: step.cardId, upgraded: step.upgraded, card_index: step.cardIndex, target_index: step.target })) ?? null,
      turn: plan ? {
        hp_loss: plan.outcome.hpLoss,
        damage: plan.outcome.damageDealt,
        block_gained: plan.outcome.blockGained,
        strength_gained: plan.outcome.strengthGained,
        lasting_value: plan.outcome.lasting,
        cards_drawn: plan.outcome.cardsDrawn,
        sandpit_after: plan.outcome.sandpitAfter,
        unmodelled_cards: [...plan.outcome.unknownCards],
      } : null,
      rollout: candidate.rollout ? {
        scope: candidate.rollout.horizon > 1 ? "sampled_horizon" : "current_turn_and_clock",
        horizon: candidate.rollout.horizon,
        samples: candidate.rollout.horizon > 1 ? candidate.rollout.samples : null,
        deaths: candidate.rollout.horizon > 1 ? candidate.rollout.deaths : null,
        further_hp_loss: candidate.rollout.hpLoss,
      } : null,
    };
  };
  const original = stages.beforeSl?.plan;
  const final = stages.afterSl?.plan;
  return {
    schema: 1,
    scope: "predicted_candidates",
    run_id: str(state.raw["run_id"]),
    turn: state.turn,
    attempt,
    answer: snapshot(stages.answer),
    before_sl: snapshot(stages.beforeSl),
    after_sl: snapshot(stages.afterSl),
    sl_delta: original && final ? {
      hp_loss: final.outcome.hpLoss - original.outcome.hpLoss,
      damage: final.outcome.damageDealt - original.outcome.damageDealt,
      strength_gained: final.outcome.strengthGained - original.outcome.strengthGained,
      lasting_value: final.outcome.lasting - original.outcome.lasting,
    } : null,
    requested_action: requested ? {
      action: requested.action,
      card_index: requested.card_index ?? null,
      target_index: requested.target_index ?? null,
      option_index: requested.option_index ?? null,
    } : null,
    execution_status: "pending_dispatch",
    // The loop's existing chosen/result fields record dispatch; draws can cut off these remaining steps.
    actual_turn: null,
  };
}

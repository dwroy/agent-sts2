import { asRecord, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { Plan } from "./turn-solver.js";

export interface SlCandidateSnapshot {
  plan: Plan | null;
  randomPotion: boolean;
  rollout?: { horizon: number; samples: number; deaths: number; wins: number; hpLoss: number };
}

/** YF0LXT1QSTGG F48 T1/T5, silent-0079: a selected/replayed candidate is not a completed turn. */
export function silentSlComparison(
  state: GameState,
  original: SlCandidateSnapshot,
  replacement: SlCandidateSnapshot,
): Record<string, JsonValue> {
  if (str(asRecord(state.run?.raw)["character_id"]).toLowerCase() !== "silent" || state.run?.ascension !== 10) return {};
  const snapshot = ({ plan, randomPotion, rollout }: SlCandidateSnapshot): JsonValue => {
    if (!plan) return null;
    const o = plan.outcome;
    const sampled = rollout !== undefined && rollout.horizon > 1 && rollout.samples > 0;
    return {
      basis: randomPotion ? "random_potion_median" : "turn_model",
      steps: plan.steps.map((step) => ({ card: step.cardId, upgraded: step.upgraded, target: step.target })),
      hp_loss: o.hpLoss,
      hp_after: o.hpAfter,
      damage: o.damageDealt,
      block_gained: o.blockGained,
      strength_gained: o.strengthGained,
      sandpit_after: o.sandpitAfter,
      enemies_after: o.enemyHpAfter.map((enemy) => ({ index: enemy.index, name: enemy.name,
        hp: enemy.hp, block: enemy.block ?? null, poison: enemy.poison ?? null })),
      cards_drawn: o.cardsDrawn,
      unknown_cards: [...o.unknownCards],
      replan_expected: randomPotion || o.cardsDrawn > 0,
      rollout: rollout ? { scope: sampled ? "sampled_horizon" : "current_turn_and_clock",
        horizon: rollout.horizon, samples: rollout.samples,
        sampled_deaths: sampled ? rollout.deaths : null, sampled_wins: sampled ? rollout.wins : null,
        further_hp_loss: rollout.hpLoss } : null,
    };
  };
  const a = original.plan?.outcome;
  const b = replacement.plan?.outcome;
  return { candidate_comparison: {
    scope: "candidate_forecast",
    original_stage: "after_guard_before_sl",
    original: snapshot(original),
    replacement: snapshot(replacement),
    delta_replacement_minus_original: a && b ? {
      hp_loss: b.hpLoss - a.hpLoss, damage: b.damageDealt - a.damageDealt,
      block_gained: b.blockGained - a.blockGained, strength_gained: b.strengthGained - a.strengthGained,
    } : null,
    actual_turn_result: null,
    note: "两线数字是同一题面的候选预测；不是实际损血、伤害或整线执行记录。原线为护栏之后、SL之前。实际首次派发核对本条chosen/result/gate_reject，完整回合须连后续状态与决策；抽牌、弃牌、药水等重规划后不能沿用未执行续步。",
  } };
}

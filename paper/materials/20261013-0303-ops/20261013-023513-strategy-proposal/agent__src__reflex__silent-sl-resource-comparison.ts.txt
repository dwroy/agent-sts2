import { asRecord, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { Outcome, Plan } from "./turn-solver.js";

type ResourceLine = Pick<Plan, "steps"> & {
  outcome: Pick<Outcome, "hpLoss" | "damageDealt" | "blockGained" | "strengthGained" | "cardsDrawn" | "unknownCards" | "dies" | "revived">;
};

/** YF0LXT1QSTGG F48 T1 attempts 2/3, silent-0079: a sampled tie still has a current-turn resource cost. */
export function silentSlResourceComparison(
  state: GameState,
  original: ResourceLine | null,
  replacement: ResourceLine | null,
  medians: { original: boolean; replacement: boolean },
): Record<string, JsonValue> {
  if (str(asRecord(state.run?.raw)["character_id"]).toLowerCase() !== "silent" || state.run?.ascension !== 10) return {};
  const finite = (value: number): number | null => Number.isFinite(value) ? value : null;
  const describe = (plan: ResourceLine | null, median: boolean): JsonValue => plan === null ? null : {
    steps: plan.steps.map((step) => ({ card: step.cardId, hand_index: step.cardIndex, target_index: step.target ?? null })),
    hp_loss: finite(plan.outcome.hpLoss),
    damage_dealt: finite(plan.outcome.damageDealt),
    block_gained: finite(plan.outcome.blockGained),
    strength_gained: finite(plan.outcome.strengthGained),
    cards_drawn: plan.outcome.cardsDrawn,
    unmodelled_cards: [...plan.outcome.unknownCards],
    random_potion_median: median,
    dies: plan.outcome.dies,
    spends_revive: plan.outcome.revived !== undefined,
    execution: "unverified",
  };
  const delta = (key: "hpLoss" | "damageDealt" | "blockGained" | "strengthGained"): number | null => {
    if (!original || !replacement || medians.original || medians.replacement) return null;
    const before = original.outcome[key];
    const after = replacement.outcome[key];
    return Number.isFinite(before) && Number.isFinite(after) ? after - before : null;
  };
  return {
    resource_comparison: {
      scope: "current_turn_prediction",
      original_stage: "after_plan_guards_before_sl",
      original: describe(original, medians.original),
      replacement: describe(replacement, medians.replacement),
      delta: { hp_loss: delta("hpLoss"), damage_dealt: delta("damageDealt"), block_gained: delta("blockGained"), strength_gained: delta("strengthGained") },
      note: "同一观测盘面的模型预测，差值为替线减原线；不是实际扣血、保血或胜率收益。抽牌、选择、生成与用药后必须按实际状态核验续步；列出的步骤未证完整派发。随机药水中位线不作成对差值，缺线或非有限值记未知。",
    },
  };
}

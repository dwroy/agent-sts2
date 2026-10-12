import { asRecord, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import { drunkIds, type PotionCost } from "./potion-cost.js";
import type { Plan } from "./turn-solver.js";

// The combat planner owns rollout-live; this formatter only reads its existing estimates.
interface PotionEstimate {
  horizon: number;
  samples: number;
  hpLoss: number;
  wins: number;
  deaths: number;
  winProb: number;
  turnsToWin: number | null;
  laterDrinks?: Record<string, number>;
}
type PotionRollout = { available: false } | {
  available: true;
  result: { horizon: number; degraded: string[] };
  byPlan: ReadonlyMap<Plan, PotionEstimate>;
  noPotion: { line: Plan; base: Plan; merged: boolean } | null;
};

/** 751FN9QM9MHQ F13 T3, silent-0019: an absent held value is not a measured zero. */
export function silentPotionReference(
  state: GameState,
  costs: ReadonlyMap<string, PotionCost>,
  shown: { key: string; plan: Plan }[],
  rollout: PotionRollout | null,
): Record<string, JsonValue> {
  if (str(asRecord(state.run?.raw)["character_id"]).toLowerCase() !== "silent" || state.run?.ascension !== 10) return {};
  const unknown = [...costs.values()].filter((cost) => cost.holdHp === null);
  if (unknown.length === 0) return {};
  const active = rollout?.available ? rollout : null;
  const forecast = active !== null && active.result.horizon > 1 && !active.result.degraded.includes("1-turn");
  const dry = active?.noPotion;
  const reference = dry ? (dry.merged ? dry.base : dry.line) : null;
  const finite = (value: number | null): number | null => value !== null && Number.isFinite(value) ? value : null;
  const options = shown.map(({ key, plan }) => {
    const drinks = drunkIds(plan);
    const estimate = active?.byPlan.get(plan);
    const sampled = forecast && estimate !== undefined && estimate.horizon > 1 && estimate.samples > 0;
    const later = sampled ? Object.entries(estimate.laterDrinks ?? {}).filter(([, count]) => count > 0)
      .map(([id, count]) => ({ potion: id, samples_using: count })) : null;
    const noPotionFight = sampled && plan === reference && drinks.length === 0 && later?.length === 0;
    return {
      key,
      drinks_now: drinks,
      no_potion_scope: drinks.length > 0 ? "drinks_now" : noPotionFight ? "sampled_fight_reference" : "current_turn_only",
      prediction: {
        hp_loss: finite(plan.outcome.hpLoss), damage: finite(plan.outcome.damageDealt),
        cards_drawn: plan.outcome.cardsDrawn, unmodelled_cards: [...plan.outcome.unknownCards],
      },
      rollout_scope: sampled ? "sampled_horizon" : estimate ? "current_turn_and_clock" : "unavailable",
      horizon: estimate?.horizon ?? null,
      samples: sampled ? estimate.samples : null,
      sampled_wins: sampled ? estimate.wins : null,
      sampled_deaths: sampled ? estimate.deaths : null,
      forecast_hp_loss: sampled ? finite(estimate.hpLoss) : null,
      estimated_win_probability: sampled ? finite(estimate.winProb) : null,
      mean_end_turn_surviving_samples: sampled ? finite(estimate.turnsToWin) : null,
      later_drinks: later,
    };
  });
  return { potion_value_reference: {
    scope: "same_question_model_comparison",
    unknown_held_values: unknown.map((cost) => ({
      potion: cost.id, hold_hp: null, charged_hp: finite(cost.hp), zero_reason: cost.zero, source: cost.source,
    })),
    no_potion_now: options.filter((option) => option.drinks_now.length === 0).map((option) => option.key),
    no_potion_fight_reference: options.filter((option) => option.no_potion_scope === "sampled_fight_reference").map((option) => option.key),
    options,
    note: "持有价值未知：成本记0不等于已证实留药价值为0。同题只对照已展示牌线的当轮预测与已有抽样；本轮不喝的线后续仍可能喝，整战无药参考单列。胜数只属所列回合样本，预计胜率含模型估计，终结回合仅对存活样本取均值。时钟估计不作抽样胜负；未知效果、抽牌重算、随机药水及实际执行仍须另核。未执行的无药或留药支线不是实盘反事实，不据本栏要求喝药或留药。",
  } };
}

import { asArray, asRecord, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { Outcome, Plan } from "./turn-solver.js";

type ResourceLine = Pick<Plan, "steps"> & {
  outcome: Pick<Outcome, "hpLoss" | "damageDealt" | "blockGained" | "strengthGained" | "cardsDrawn" | "unknownCards" | "dies" | "revived" | "taintedGained"> &
    Partial<Pick<Outcome, "enemyHpAfter" | "sandpitAfter" | "winsFight">>;
};

/** YF0LXT1QSTGG F48 T1 attempts 2/3, silent-0079: a sampled tie still has a current-turn resource cost. */
export function silentSlResourceComparison(
  state: GameState,
  original: ResourceLine | null,
  replacement: ResourceLine | null,
  medians: { original: boolean; replacement: boolean; saturated?: boolean | null },
): Record<string, JsonValue> {
  if (str(asRecord(state.run?.raw)["character_id"]).toLowerCase() !== "silent" || state.run?.ascension !== 10) return {};
  const finite = (value: number): number | null => Number.isFinite(value) ? value : null;
  // NEWRFAYKTQHR A10 F31 T2, silent-0079: 6 versus 3 Tainted and 10 versus 3 remaining poison.
  // Keep the modeled play-time Tainted separate from the poison remaining after the modeled turn's settlement.
  const tainted = (plan: ResourceLine): number | null => plan.outcome.taintedGained === undefined ? null : finite(plan.outcome.taintedGained);
  const rawPowers = asRecord(asRecord(state.raw["combat"])["player"])["powers"];
  const taintedPower = asArray(rawPowers).map(asRecord).find((power) => power["power_id"] === "TAINTED_POWER");
  const observedTainted = Array.isArray(rawPowers)
    ? !taintedPower ? 0 : typeof taintedPower["amount"] === "number" ? finite(taintedPower["amount"]) : null : null;
  const poison = (plan: ResourceLine | null): Record<string, JsonValue> | null => !plan?.outcome.enemyHpAfter ? null
    : Object.fromEntries(plan.outcome.enemyHpAfter.map((enemy) => [String(enemy.index), enemy.poison === undefined ? null : finite(enemy.poison)]));
  const describe = (plan: ResourceLine | null, median: boolean): JsonValue => plan === null ? null : {
    steps: plan.steps.map((step) => ({ card: step.cardId, hand_index: step.cardIndex, target_index: step.target ?? null })),
    hp_loss: finite(plan.outcome.hpLoss),
    damage_dealt: finite(plan.outcome.damageDealt),
    block_gained: finite(plan.outcome.blockGained),
    strength_gained: finite(plan.outcome.strengthGained),
    tainted_gained_during_plays: tainted(plan),
    enemy_poison_after_turn: poison(plan),
    // WQZ F33 T7, silent-0018/0079: extending the deadline can cost HP without adding damage.
    sandpit_after_enemy_turn: typeof plan.outcome.sandpitAfter === "number" ? finite(plan.outcome.sandpitAfter) : null,
    wins_fight: typeof plan.outcome.winsFight === "boolean" ? plan.outcome.winsFight : null,
    cards_drawn: plan.outcome.cardsDrawn,
    unmodelled_cards: [...plan.outcome.unknownCards],
    random_potion_median: median,
    dies: plan.outcome.dies,
    spends_revive: plan.outcome.revived !== undefined,
    execution: "unverified",
  };
  const delta = (key: "hpLoss" | "damageDealt" | "blockGained" | "strengthGained" | "taintedGained" | "sandpitAfter"): number | null => {
    if (!original || !replacement || medians.original || medians.replacement) return null;
    const before = original.outcome[key];
    const after = replacement.outcome[key];
    return typeof before === "number" && typeof after === "number" && Number.isFinite(before) && Number.isFinite(after) ? after - before : null;
  };
  const originalPoison = poison(original), replacementPoison = poison(replacement);
  const poisonDelta = originalPoison && replacementPoison && !medians.original && !medians.replacement
    ? Object.fromEntries([...new Set([...Object.keys(originalPoison), ...Object.keys(replacementPoison)])].map((index) => {
        const a = originalPoison[index], b = replacementPoison[index];
        return [index, typeof a === "number" && typeof b === "number" ? b - a : null];
      })) : null;
  return {
    resource_comparison: {
      scope: "current_turn_prediction",
      original_stage: "after_plan_guards_before_sl",
      rollout_saturated: medians.saturated ?? null,
      observed_tainted_before_plays: observedTainted,
      original: describe(original, medians.original),
      replacement: describe(replacement, medians.replacement),
      delta: { hp_loss: delta("hpLoss"), damage_dealt: delta("damageDealt"), block_gained: delta("blockGained"), strength_gained: delta("strengthGained"),
        tainted_gained_during_plays: delta("taintedGained"), enemy_poison_after_turn: poisonDelta,
        sandpit_after_enemy_turn: delta("sandpitAfter") },
      note: "同一观测盘面的模型预测，差值为替线减原线；不是实际扣血、保血或胜率收益。沙坑为敌方回合后的模型余量，空值不当零回合；是否结束战斗另列。抽牌、选择、生成与用药后必须按实际状态核验续步；列出的步骤未证完整派发。随机药水中位线不作成对差值，缺线或非有限值记未知。",
    },
  };
}

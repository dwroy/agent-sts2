import { asArray, asRecord, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { Plan } from "./turn-solver.js";

/** 751 F17 T7 / KEN F17 T10, silent-0176/0079: a pending discard is not a confirmed held-card loss. */
export function silentHeldLossFacts(state: GameState, plan: Plan): Record<string, JsonValue> {
  if (!state.in_combat || state.run?.ascension !== 10 || state.run.floor !== 17 ||
      str(asRecord(state.run.raw)["character_id"]).toLowerCase() !== "silent") return {};
  const combat = asRecord(state.raw["combat"]);
  const enemies = asArray(combat["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] === true);
  if (enemies.length !== 1 || enemies[0]!["enemy_id"] !== "SOUL_FYSH" ||
      !asArray(combat["hand"]).some((card) => asRecord(card)["card_id"] === "BECKON")) return {};
  const o = plan.outcome;
  const finite = (value: number): number | null => Number.isFinite(value) ? value : null;
  const pending = o.unknownCards.includes("弃牌选择未确定");
  return { held_loss_prediction: {
    scope: "current_turn_model",
    total_hp_loss: finite(o.hpLoss),
    held_hp_loss: finite(o.heldHpLoss ?? 0),
    held_hp_loss_from: [...(o.heldHpLossFrom ?? [])],
    incoming_after_block: finite(o.incomingAfterBlock),
    discard_choice_pending: pending,
    unmodelled_cards: [...o.unknownCards],
    actual_held_hp_loss: null,
    // Do not subtract components to claim a certain remainder: healing, revives and unknown effects may intervene.
    note: pending
      ? "持牌失血来自当前模型保守保留的手牌；弃牌尚未确定，不能把此数当成必然失血，也不能预扣一张呼唤。选牌及续步后按实际手牌重算。"
      : "持牌失血是该候选的模型预测，不是已结算损血；后续抽牌、选择或重问后须按实际状态重算。",
    accounting: "总损血已包含模型计入的持牌失血，不再相加。挡后入伤沿用模型字段，可能包含其他可挡持牌伤害；本栏不把剩余差额称为已确定敌伤。",
  } };
}

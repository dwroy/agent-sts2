import { asRecord, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { Plan } from "./turn-solver.js";

/** VLZ6CCT8AQ0A F35/F43/F45, silent-0237/0238: ownership is not a cast or complete model coverage. */
export function silentApotheosisReference(
  state: GameState,
  plan: Plan | null,
  basis: "candidate" | "potion_median" | "unsimulated" = "candidate",
): Record<string, JsonValue> {
  if (str(state.run?.raw["character_id"]).toLowerCase() !== "silent" || state.run?.ascension !== 10) return {};
  const count = (cards: unknown): number | null => Array.isArray(cards)
    ? cards.filter((card) => str(asRecord(card)["card_id"]) === "APOTHEOSIS").length : null;
  const deck = count(state.run.raw["deck"]);
  const hand = count(asRecord(state.raw["combat"])["hand"]);
  const planned = plan ? plan.steps.filter((step) => step.cardId === "APOTHEOSIS").length : null;
  if (!(deck || hand || planned || plan?.outcome.apotheosisApplied)) return {};
  return {
    apotheosis_reference: {
      deck_copies: deck,
      hand_copies: hand,
      forecast_basis: basis,
      planned_plays: planned,
      simulated_upgrade_applied: plan ? plan.outcome.apotheosisApplied === true : null,
      candidate_unmodelled_cards: plan ? [...plan.outcome.unknownCards] : null,
      // A current board and a forecast do not certify earlier actions or all future draws.
      actual_cast_this_fight: null,
      note: "持有、候选出牌与模拟升级分列；本字段未核本战实际施放。缺口列表属于整个候选，空列表也不证明全部后续升级已覆盖；药水中位样本不是实抽结果。",
    },
  };
}

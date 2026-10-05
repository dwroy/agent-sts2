import { asRecord, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { Plan } from "./turn-solver.js";

/** 9YT51CK8RC39 F17 attempt 3/6 T5, silent-0079/0080: long-horizon ties can still cost different HP now. */
export function silentLossReference(
  state: GameState,
  shown: { key: string; plan: Plan }[],
  tied: Plan[],
): Map<Plan, Record<string, JsonValue>> {
  const facts = new Map<Plan, Record<string, JsonValue>>();
  if (str(asRecord(state.run?.raw)["character_id"]).toLowerCase() !== "silent") return facts;
  // A draw prefix or an unknown card is not a completed turn; random-potion medians are not passed here.
  const comparable = shown.filter(({ plan }) => tied.includes(plan)
    && Number.isFinite(plan.outcome.hpLoss) && !plan.outcome.dies && !plan.outcome.revived
    && plan.outcome.cardsDrawn === 0 && plan.outcome.unknownCards.length === 0);
  if (comparable.length < 2) return facts;
  const least = Math.min(...comparable.map(({ plan }) => plan.outcome.hpLoss));
  const references = comparable.filter(({ plan }) => plan.outcome.hpLoss === least);
  const keys = references.map(({ key }) => key).join("、");
  for (const { plan } of comparable) {
    const extra = plan.outcome.hpLoss - least;
    facts.set(plan, {
      tied_hp_loss_rank: 1 + comparable.filter((entry) => entry.plan.outcome.hpLoss < plan.outcome.hpLoss).length,
      tied_hp_loss_extra: extra,
      tied_hp_loss_reference: `长程推演并列组的即时损血参考：${keys}，单回合模型净损血${least}；本线多损${extra}。${references.length > 1 ? "最低损血参考在该指标上并列；" : ""}只比较已列出且无未知牌或待抽牌、不花复活的当轮存活线。即时损血不同不代表整场胜率不同；输出、成长及长程并列仍一起交由Jev判断。`,
    });
  }
  return facts;
}

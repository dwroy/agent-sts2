import { asRecord, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { PotionMc } from "./potion-mc.js";
import type { Plan } from "./turn-solver.js";

// The combat planner owns rollout-live; this formatter accepts only its factual fields.
type ScopeRollout =
  | { available: false; reason: string; elapsedMs: number }
  | {
      available: true;
      result: { horizon: number; samples: number; degraded: string[] };
      byPlan: ReadonlyMap<Plan, { horizon: number; samples: number; wins: number; deaths: number }>;
      best: Plan | null;
      tied: Plan[];
      spentMs: number;
      elapsedMs: number;
    };

/** VLZ6CCT8AQ0A F45 T1/T4, silent-0239: missing comparisons and explicit ties are different evidence. */
export function silentSimulationReference(
  state: GameState,
  shown: { key: string; plan: Plan }[],
  rollout: ScopeRollout | null,
  potions: Pick<PotionMc, "source" | "samples" | "requested" | "ms" | "degraded">[],
): Record<string, JsonValue> {
  if (str(asRecord(state.run?.raw)["character_id"]).toLowerCase() !== "silent") return {};
  const active = rollout?.available ? rollout : null;
  const fallback = active !== null && active.result.degraded.includes("1-turn");
  const forecast = active !== null && active.result.horizon > 1 && !fallback;
  const best = forecast ? shown.find(({ plan }) => plan === active.best)?.key ?? null : null;
  const peers = forecast ? shown.filter(({ plan }) => active.tied.includes(plan)).map(({ key }) => key) : [];
  const tied = forecast && active.tied.length >= 2 ? peers : [];
  const ranking = forecast && active.best !== null
    ? best !== null ? "best" : "outside_shown"
    : forecast && active.tied.length >= 2 ? "tied" : "not_compared";
  return {
    note: "选项数字是代码模型参考，受未建模效果、抽牌重算和推演范围限制。依据当轮代价、成长与后续证据选择整场打法；simulation_reference分列这些限制，无未知标记也不代表已经校准。",
    simulation_reference: {
      rollout: {
        available: active !== null,
        scope: forecast ? "sampled_horizon" : active ? "current_turn_and_clock" : "unavailable",
        horizon: active?.result.horizon ?? null,
        samples: active?.result.samples ?? null,
        elapsed_ms: rollout?.elapsedMs ?? null,
        random_potion_shared_ms: active?.spentMs ?? null,
        degraded: active ? [...active.result.degraded] : [],
        ranking,
        best,
        tied,
        tied_total: forecast ? active.tied.length : 0,
        ...(!active ? { reason: rollout && !rollout.available ? rollout.reason : "未运行后续推演" } : {}),
        note: forecast
          ? "仅表示所列回合及样本的模型结果；全败样本不证明实盘必败，目标顺序不是实际击杀记录。排名仅指rollout，整场boss模拟另列；best/tied只列已展示的选项键，tied_total保留原并列线数。"
          : "未形成可比较的后续抽样推演；时钟剩余损血估计即使封顶也不表示实际死亡。没有最佳线不等于选项并列。",
      },
      options: shown.map(({ key, plan }) => {
        const line = active?.byPlan.get(plan);
        const sampled = forecast && line !== undefined && line.horizon > 1 && line.samples > 0;
        return {
          key,
          unmodelled_cards: [...plan.outcome.unknownCards],
          cards_drawn: plan.outcome.cardsDrawn,
          draw_replan: plan.outcome.cardsDrawn > 0,
          evaluated: line !== undefined,
          horizon: line?.horizon ?? null,
          samples: line?.samples ?? null,
          // A clock fallback's synthetic deaths/wins must not be presented as sampled fight outcomes.
          sampled_wins: sampled ? line.wins : null,
          sampled_deaths: sampled ? line.deaths : null,
          note: plan.outcome.cardsDrawn > 0
            ? "当轮包含抽牌，实际牌面变化后重新核验；抽样中的后续出牌不等于已实打。"
            : plan.outcome.unknownCards.length > 0
              ? "当轮含未建模牌，数字未覆盖其全部效果。"
              : "当轮按现有模型计算；不由无未知牌标记推定整场结论可信。",
        };
      }),
      random_potions: potions.map((mc) => ({
        slot: mc.source.slot,
        potion: mc.source.potionId,
        samples: mc.samples,
        requested: mc.requested,
        elapsed_ms: mc.ms,
        degraded: mc.degraded,
        note: "本栏是药水当轮抽样，实际使用后依据真实效果重算；样本完成不等于整场胜率已验证。",
      })),
    },
  };
}

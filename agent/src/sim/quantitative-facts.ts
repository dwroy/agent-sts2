import { asRecord, str, toJsonValue, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { Plan, SolverInput } from "../reflex/turn-solver.js";
import type { FightSampleResult } from "./boss-sim.js";
import { binomialInterval, pairedDifference, summarizeSamples } from "./quantitative-stats.js";

import { summarizeCoreWindows } from "./core-window.js";
import { coreRealization } from "./core-realization.js";

export const QUANTITATIVE_SCHEMA = "quantitative-v1";
export const QUANTITATIVE_LIMITS = "模拟分布不是实际结果；p10–p90是样本结果波动，meanSe是均值的蒙特卡洛误差，不含机制/策略偏差。增加样本不能修复模型偏差；零次/全胜样本不证明必死/必胜。超时完成样本可能有选择偏差，capped是未结束，不能当已败；胜率区间仅指模拟终止前获胜。";

export function quantitativeEnabled(state: GameState): boolean {
  return str(asRecord(state.run?.raw)["character_id"]).toLowerCase() === "silent";
}

/** Adapt the existing transition model; do not infer replay triggers or payability from card names. */
export function quantitativeTurnFacts(state: GameState, plan: Plan, input?: SolverInput | null): Record<string, JsonValue> {
  if (!quantitativeEnabled(state)) return {};
  return { quantitative_turn: {
    schema: QUANTITATIVE_SCHEMA, source: "turn-solver", kind: "conditional_model", window: "current_line_and_enemy_response",
    damage_hp: plan.outcome.damageDealt, block_gained: plan.outcome.blockGained,
    hp_after: plan.outcome.revived?.hp ?? plan.outcome.hpAfter, energy_left: plan.outcome.energyLeft,
    planned_actions: plan.steps.length,
    planned_card_actions: plan.steps.filter((step) => !step.cardId.startsWith("POTION:")).length,
    ...(input && state.run?.ascension === 10 ? { realization: toJsonValue(coreRealization(input, plan.steps)) } : {}),
    complete_combinations: null,
    limits: "沿用当前机制模型；动作数不含自动重放，完整组合须有经证据验证的定义，不能用动作数替代。",
    unknown_cards: plan.outcome.unknownCards,
  } };
}

/** Retain censored trajectories and conditional denominators rather than treating caps as losses. */
export function quantitativeFightFacts(samples: readonly FightSampleResult[], base: readonly FightSampleResult[], ids: readonly number[]): JsonValue {
  if (samples.length !== ids.length || base.length !== ids.length || new Set(ids).size !== ids.length) throw new Error("mismatched fight samples");
  const wins = samples.filter((s) => s.won).length;
  const paired = (value: (s: FightSampleResult) => number) => pairedDifference(
    base.map((s, i) => ({ sample: ids[i]!, value: value(s) })),
    samples.map((s, i) => ({ sample: ids[i]!, value: value(s) })),
  ).difference;
  return toJsonValue({
    ...(samples.some((s) => s.coreWindow !== undefined) ? {
      core_window: summarizeCoreWindows(samples.map((s) => s.coreWindow), base.map((s) => s.coreWindow), ids),
    } : {}),
    schema: QUANTITATIVE_SCHEMA, source: "boss-sim", kind: "sample_estimate", samples: samples.length,
    wins, deaths: samples.filter((s) => s.died).length, capped: samples.filter((s) => s.capped).length,
    time_up: samples.filter((s) => s.timeUp).length,
    win_interval_scope: "won_before_simulation_termination",
    raw_win_mc_interval95: binomialInterval(wins, samples.length),
    hp_loss: summarizeSamples(samples.map((s) => s.hpLoss)),
    damage_hp: summarizeSamples(samples.map((s) => s.dmgByTurn.reduce((a, b) => a + b, 0))),
    first_turn_damage: summarizeSamples(samples.flatMap((s) => s.dmgByTurn.length ? [s.dmgByTurn[0]!] : [])),
    later_damage: summarizeSamples(samples.filter((s) => s.turns > 1).map((s) => s.dmgByTurn.slice(1).reduce((a, b) => a + b, 0))),
    block_gained: summarizeSamples(samples.flatMap((s) => s.blockByTurn ? [s.blockByTurn.reduce((a, b) => a + b, 0)] : [])),
    potions_used: summarizeSamples(samples.map((s) => s.drunk.length)),
    hp_remaining: summarizeSamples(samples.flatMap((s) => s.resources ? [s.resources.hp] : [])),
    simulated_turns: summarizeSamples(samples.map((s) => s.turns)),
    turns_won_only: summarizeSamples(samples.filter((s) => s.won).map((s) => s.turns)),
    paired_hp_loss_difference: paired((s) => s.hpLoss),
    paired_win_difference: paired((s) => Number(s.won)),
    complete_combinations: null,
    limits: QUANTITATIVE_LIMITS + "模拟回合数含截断样本；胜局回合仅以wins为分母。区间仅针对原始样本胜率，不是校准胜率或真实游戏置信区间。完整组合定义尚未提供。",
  });
}

/** Keep the full distribution in the audit record, and a bounded summary in each option. */
export function compactQuantitativeFight(full: JsonValue): JsonValue {
  const value = asRecord(full);
  const compactSpread = (raw: unknown): JsonValue => {
    const s = asRecord(raw);
    return toJsonValue({ n: s.n, mean: s.mean, p10: s.p10, p90: s.p90, meanSe: s.meanSe });
  };
  const spread = (key: string) => compactSpread(value[key]);
  const core = asRecord(value.core_window);
  const coreCards = asRecord(core.cards);
  const named = ["FOOTWORK", "ACCELERANT", "ACROBATICS", "CALCULATED_GAMBLE", "BURST", "NIGHTMARE"];
  return toJsonValue({ samples: value.samples, raw_win_mc_interval95: value.raw_win_mc_interval95,
    hp_loss: spread("hp_loss"), turns_won_only: spread("turns_won_only"),
    paired_hp_loss_difference: spread("paired_hp_loss_difference"),
    capped: value.capped, complete_combinations: null,
    ...(value.core_window ? { core_window: { samples: core.samples, valid: core.valid, missing: core.missing,
      energy_paid: compactSpread(core.energy_paid), manual_actions: compactSpread(core.manual_actions),
      effect_resolutions: compactSpread(core.effect_resolutions), combinations: core.combinations,
      first_core_play_when_played: Object.fromEntries(named.filter((id) => coreCards[id] !== undefined)
        .map((id) => [id, compactSpread(asRecord(coreCards[id]).first_play_when_played)])), limits: core.limits } } : {}),
    block_gained: spread("block_gained"), potions_used: spread("potions_used"), hp_remaining: spread("hp_remaining") });
}

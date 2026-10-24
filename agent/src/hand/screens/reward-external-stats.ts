/** Optional lookup navigation for the Silent A10 brain reward question only. */
import { asArray, asRecord, numOrNull, str } from "../../core/util/json.js";
import type { DecisionEnv } from "../../memory/types.js";
import type { PickOption } from "./pick.js";
import { externalStatsCardId } from "./reward-external-stats-ids.js";

export const REWARD_EXTERNAL_STATS_MAX_BYTES = 1024;
export const REWARD_EXTERNAL_STATS_NOTE =
  "若需真人样本背景，可任选 external_stats_card 按候选 id 与当前幕 act 查 Silent A10（v0.111）的拿取率与胜率关联，或 external_stats_skip 查本幕跳过率；结果仅为观察统计、非因果，与题内自有 outcome_stats 分账。";

export function rewardExternalStatsView(env: DecisionEnv, options: PickOption[]): { options: PickOption[]; note: string } {
  if (env.state.screen !== "REWARD" || env.state.in_combat
    || str(env.state.run?.raw["character_id"]).toLowerCase() !== "silent" || env.state.run?.ascension !== 10) {
    return { options, note: "" };
  }
  const offered = new Map(asArray(asRecord(env.state.raw["reward"])["card_options"]).map((raw, fallbackIndex) => {
    const card = asRecord(raw);
    return [numOrNull(card["index"]) ?? fallbackIndex, str(card["card_id"])] as const;
  }));
  let bytes = Buffer.byteLength(` ${REWARD_EXTERNAL_STATS_NOTE}`);
  const shown = options.map(option => {
    if (option.intent.action !== "choose_reward_card") return option;
    const localId = offered.get(option.intent.option_index ?? -1);
    const id = localId ? externalStatsCardId(localId) : null;
    if (!id) return option;
    // Include JSON key/separator escaping so even an unusually large offer list stays bounded.
    const extra = Buffer.byteLength(JSON.stringify(id)) + 12;
    if (bytes + extra > REWARD_EXTERNAL_STATS_MAX_BYTES) return option;
    bytes += extra;
    return { ...option, facts: { ...option.facts, id } };
  });
  return { options: shown, note: REWARD_EXTERNAL_STATS_NOTE };
}

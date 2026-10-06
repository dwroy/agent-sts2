import { asArray, asRecord, bool, numOrNull, str, type JsonValue } from "../../core/util/json.js";
import type { GameState } from "../mod/schema.js";
import type { PickOption } from "./pick.js";

/** PU80F84P6HPN F28 T7 / F30 T7 / F31 T6; silent-0190, related observations 0187/0188. */
export function silentRewardAdditionFacts(state: GameState, options: PickOption[]): Record<string, JsonValue> {
  const run = asRecord(state.run?.raw);
  const reward = asRecord(state.raw["reward"]);
  const relics = asArray(run["relics"]).map(asRecord);
  if (str(run["character_id"]).toLowerCase() !== "silent" || state.screen !== "REWARD" || state.in_combat
    || !bool(reward["pending_card_choice"])
    || !["BING_BONG", "BOOK_OF_FIVE_RINGS", "PAELS_TOOTH"].every((id) => relics.some((r) => str(r["relic_id"]) === id && !bool(r["is_melted"])))) return {};

  const book = relics.find((r) => str(r["relic_id"]) === "BOOK_OF_FIVE_RINGS" && !bool(r["is_melted"]))!;
  const stack = numOrNull(book["stack"]);
  const count = stack !== null && Number.isInteger(stack) && stack >= 0 && stack <= 5 ? stack : null;
  const size = asArray(run["deck"]).length;
  const hp = state.run?.current_hp ?? null;
  const max = state.run?.max_hp ?? null;
  // Only these pre-choice counters have complete observed card-reward transitions in this combination.
  const transition = count === 1 ? { count: 3, heal: 0 }
    : count === 2 ? { count: 4, heal: 0 }
    : count === 3 ? { count: 0, heal: 20 } : null;
  const offered = asArray(reward["card_options"]).map(asRecord);
  const references = options.map((option) => {
    const action = str(option.intent["action"]);
    const index = numOrNull(option.intent["option_index"]);
    const skip = action === "skip_reward_cards" && state.available_actions.includes(action);
    const take = action === "choose_reward_card" && state.available_actions.includes(action)
      && index !== null && Number.isInteger(index) && index >= 0
      && offered.some((card, fallback) => (numOrNull(card["index"]) ?? fallback) === index);
    const heal = skip ? 0 : take && transition && hp !== null && max !== null && hp >= 0 && hp + transition.heal <= max ? transition.heal : null;
    return {
      key: option.key,
      cards_added_reference: skip ? 0 : take ? 2 : null,
      deck_size_after_reference: skip ? size : take ? size + 2 : null,
      five_rings_count_after_reference: skip ? (count === 5 ? null : count) : take ? transition?.count ?? null : null,
      hp_gain_reference: heal,
      hp_after_reference: heal !== null && hp !== null ? hp + heal : null,
    };
  });
  const groups = new Map<string, string[]>();
  for (const { key, ...values } of references) {
    if (Object.values(values).some((value) => value === null)) continue;
    const signature = JSON.stringify(values);
    groups.set(signature, [...(groups.get(signature) ?? []), key]);
  }
  return {
    reward_card_addition: {
      current_deck_size: size,
      current_hp: hp,
      current_five_rings_count: count,
      options: references,
      addition_reference_tied_option_groups: [...groups.values()].filter((keys) => keys.length > 1),
      tie_note: "并列只比较本表的加牌数量、五轮书计数与血量参考；不同牌的构筑价值和整场推演需另看。未知结果不判并列。",
      observed: "PU80卡奖实加两张：F28手上技法27→29、书2→4、9血不变；F30斗篷31→33、书1→3、35血不变；F31计算下注33→35、3→23血，书暂显示5，到F32才归0。",
      source: "PU80F84P6HPN SILENT A10 F28 T7、F30 T7、F31 T6（战后卡奖）；silent-0190/0187/0188。三个现场来自同一局。",
      simulation_scope: "当前boss_sim按单张加牌，未模拟宾邦复制和五轮书加牌回血。保留原模拟结果，评估此组合时同时考虑本表的条件参考。",
      limits: "仅本角色、宾邦／五轮书／佩尔之牙均未熔化的卡奖组合。取牌时计数1／2／3的结果按已见现场提供；0／4／5、坏计数或回血超过最大血量时保持未知。瞬时计数5的跳过后计数也未知。前面的返还牌与回血已经计入现场，不重复加。参考尚未执行；没有其他奖励选择或跳过的受控胜负，不规定取牌顺序。",
    },
  };
}

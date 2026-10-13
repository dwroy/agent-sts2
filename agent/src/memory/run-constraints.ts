/** Roy's experimental run constraints. These are operator limits, not learned card values. */
import type { GameState } from "../hand/mod/schema.js";
import type { ActionRequest } from "../hand/mod/client.js";
import { asArray, asRecord, numOrNull, str, type JsonValue } from "../core/util/json.js";
import { deckFollowUp } from "../hand/screens/oneshot.js";
import { silentRewardAdditionFacts } from "../hand/screens/silent-reward-addition.js";

export const SILENT_DECK_CONSTRAINT = {
  id: "roy-20261013-silent-deck-cap30",
  maximum: 30,
  // This already-running game keeps its old rules, including a resumed controller.
  exemptRunIds: ["Y82C2NV7WM2M"],
} as const;

export function deckBudget(state: GameState): { maximum: number; current: number | null; remaining: number | null } | null {
  const run = asRecord(state.run?.raw);
  if (str(run["character_id"]).toLowerCase() !== "silent"
      || SILENT_DECK_CONSTRAINT.exemptRunIds.some((id) => id === str(state.raw["run_id"]))) return null;
  const current = Array.isArray(run["deck"]) ? run["deck"].length : state.run?.deck_size ?? null;
  return { maximum: SILENT_DECK_CONSTRAINT.maximum, current, remaining: current === null ? null : SILENT_DECK_CONSTRAINT.maximum - current };
}

export function deckBudgetFacts(state: GameState): Record<string, JsonValue> {
  const budget = deckBudget(state);
  if (!budget) return {};
  return { run_constraints: {
    policy: SILENT_DECK_CONSTRAINT.id, character: "silent", source: "Roy指定的实验约束，不是学习经验",
    max_permanent_cards: budget.maximum, permanent_cards_now: budget.current, slots_remaining: budget.remaining,
    counting: "永久牌组全部卡牌实例计数，包括重复牌和诅咒；战斗临时手牌、抽牌堆或消耗不改变这个计数。",
    requirement: "永久牌组始终不得超过30张。30是上限，不是凑满目标；加牌必须权衡已有核心兑现、稀释、伤害/回合、升级替代和最终boss指标，依据已有角色经验及可用模拟结果，未知要标明。",
    choices: "同时权衡拿牌、过牌、删牌和升级；购物逐步检查，只有实际先删牌腾出名额才能再买牌，不允许先超限再删。事件和批量加牌按实际新增总数检查。",
  } };
}

function option(list: unknown, index: number | undefined): Record<string, unknown> {
  return asArray(list).map(asRecord).find((o, at) => (numOrNull(o["index"]) ?? at) === index) ?? {};
}

/** Read explicitly stated permanent additions; never infer a card's strength or a relic mechanism. */
export function declaredCardGain(entry: Record<string, unknown>): number | null {
  const explicit = numOrNull(entry["cards_added"]) ?? numOrNull(entry["cards_to_add"]);
  if (explicit !== null && Number.isInteger(explicit) && explicit >= 0) return explicit;
  const text = str(entry["description"]) || str(entry["resolved_rules_text"]);
  const follow = deckFollowUp(text);
  let gain = follow?.task === "duplicate" ? follow.count : 0;
  const counts = [...text.matchAll(/(?:加入|添加|增加)[^。；.!\n]{0,30}?(\d+|一|二|两|三|四|五|六|七|八|九|十)\s*张[^。；.!\n]{0,30}?(?:牌组|永久牌组)|(?:add|gain)\s+(a|an|one|two|three|\d+)\s+[^.!\n]{0,40}?cards?\s+(?:to|into)\s+your\s+deck|(?:将|把)?(\d+|一|二|两|三|四|五|六|七|八|九|十)\s*张[^。；.!\n]{0,30}?(?:加入|添加)[^。；.!\n]{0,10}牌组|(?:获得|得到)(\d+|一|二|两|三|四|五|六|七|八|九|十)\s*张(?:卡牌|牌)/gi)];
  const words: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, a: 1, an: 1, one: 1, two: 2, three: 3 };
  for (const count of counts) {
    const amount = count[1] ?? count[2] ?? count[3] ?? count[4] ?? "";
    gain += words[amount.toLowerCase()] ?? Number(amount);
  }
  if (gain) return gain;
  if (/(?:加入|添加|增加)[^。；.!\n]{0,40}牌组|(?:add|gain|obtain)[^.!\n]{0,60}(?:to|into) your deck/i.test(text)) return null;
  if (/获得[^。；.!\n]{0,20}(?:诅咒|张.*牌)|\bgain\b[^.!\n]{0,20}\b(?:curse|cards?)\b/i.test(text)) return null;
  return 0;
}

function selectionAdds(state: GameState): boolean {
  if (state.in_combat) return false;
  const selection = asRecord(state.raw["selection"]), kind = str(selection["kind"]), prompt = str(selection["prompt"]);
  const follow = deckFollowUp(prompt);
  if (follow && follow.task !== "duplicate") return false;
  if (follow?.task === "duplicate" || kind === "deck_add_select" || /加入到?你的.{0,12}牌组|add .{0,30}to your deck/i.test(prompt)) return true;
  const ids = new Set(asArray(asRecord(state.run?.raw)["deck"]).map((c) => str(asRecord(c)["card_id"])));
  return kind === "deck_card_select" && asArray(selection["cards"]).some((c) => !ids.has(str(asRecord(c)["card_id"])));
}

export function permanentCardGain(state: GameState, intent: ActionRequest): number | null {
  const { action, option_index: index } = intent;
  const reward = asRecord(state.raw["reward"]), shop = asRecord(state.raw["shop"]);
  if (action === "buy_card") return 1;
  if (action === "choose_reward_card") {
    const reference = asRecord(silentRewardAdditionFacts(state, [{ key: "chosen", intent, score: 0, summary: null }])["reward_card_addition"]);
    const known = asArray(reference["options"]).map(asRecord)[0];
    return known ? numOrNull(known["cards_added_reference"]) : 1;
  }
  if (action === "choose_bundle") return asArray(option(state.raw["bundles"], index)["cards"]).length;
  if (action === "choose_event_option") return declaredCardGain(option(asRecord(state.raw["event"])["options"], index));
  if (action === "buy_relic") return declaredCardGain(option(shop["relics"], index));
  if (action === "choose_treasure_relic") return declaredCardGain(option(asRecord(state.raw["chest"])["relic_options"], index));
  if (action === "choose_capstone_option") return declaredCardGain(option(asRecord(state.raw["capstone"])["options"], index));
  if (action === "claim_reward") {
    const entry = option(reward["rewards"], index);
    // Opening the card picker changes no permanent cards; its choice is checked separately.
    if (str(entry["reward_type"]) === "SpecialCard" && /被偷走|灯火钥匙|stolen|lantern key/i.test(str(entry["description"]))) return 1;
    return ["Card", "LinkedRewardSet", "SpecialCard"].includes(str(entry["reward_type"])) ? 0 : declaredCardGain(entry);
  }
  if ((action === "select_deck_card" || action === "confirm_selection") && selectionAdds(state)) {
    const selected = numOrNull(asRecord(state.raw["selection"])["selected_count"]) ?? 0;
    return selected + (action === "select_deck_card" ? 1 : 0);
  }
  return 0;
}

export function deckBudgetProblem(state: GameState, intent: ActionRequest, current?: number): string | null {
  const budget = deckBudget(state);
  if (!budget) return null;
  const gain = permanentCardGain(state, intent);
  if (gain === null) return "Silent deck cap: permanent addition is unknown; do not dispatch an unbounded addition";
  const size = current ?? budget.current;
  if (gain > 0 && size === null) return "Silent deck cap: current permanent deck size is unknown";
  return gain > 0 && size !== null && size + gain > budget.maximum
    ? `Silent deck cap: ${size} + ${gain} exceeds ${budget.maximum} permanent cards` : null;
}

/** Filter complete actions before asking a model; original indices stay stable. */
export function budgetedState(state: GameState): GameState {
  if (!deckBudget(state)) return state;
  const raw = { ...state.raw };
  const keep = (list: unknown, action: string) => asArray(list).map((entry, at) => {
    const o = asRecord(entry); return { ...o, index: numOrNull(o["index"]) ?? at };
  }).filter((o) => !deckBudgetProblem(state, { action, option_index: o.index }));
  if (state.screen === "REWARD") {
    const reward = asRecord(raw["reward"]);
    raw["reward"] = { ...reward, card_options: keep(reward["card_options"], "choose_reward_card"),
      rewards: asArray(reward["rewards"]).map((o, at) => {
        const entry = asRecord(o), index = numOrNull(entry["index"]) ?? at;
        return deckBudgetProblem(state, { action: "claim_reward", option_index: index }) ? { ...entry, index, claimable: false } : entry;
      }) };
  } else if (state.screen === "EVENT") {
    const event = asRecord(raw["event"]);raw["event"] = { ...event, options: keep(event["options"], "choose_event_option") };
  } else if (state.screen === "BUNDLE_SELECTION") raw["bundles"] = keep(raw["bundles"], "choose_bundle");
  else if (state.screen === "CAPSTONE_SELECTION") {
    const capstone = asRecord(raw["capstone"]);raw["capstone"] = { ...capstone, options: keep(capstone["options"], "choose_capstone_option") };
  } else if (state.screen === "CHEST") {
    const chest = asRecord(raw["chest"]);raw["chest"] = { ...chest, relic_options: keep(chest["relic_options"], "choose_treasure_relic") };
  }
  return { ...state, raw };
}

/** A required selection that cannot fit must stop, never loop or silently exceed the limit. */
export function requiredSelectionProblem(state: GameState): string | null {
  const budget = deckBudget(state);
  if (!budget || !selectionAdds(state)) return null;
  const selection = asRecord(state.raw["selection"]);
  const min = numOrNull(selection["min_select"]) ?? 1;
  if (budget.remaining === null || min > budget.remaining) return "Silent deck cap: this required permanent-card selection cannot fit; preserve the state and notify ops";
  return null;
}

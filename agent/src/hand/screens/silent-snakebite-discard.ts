import { asArray, asRecord, numOrNull, str, type JsonValue } from "../../core/util/json.js";
import type { Decision, DecisionEnv } from "../../memory/types.js";
import { buildPickDecision, type PickOption } from "./pick.js";

type Raw = Record<string, unknown>;

// CMS8QL9E3C5U A10 F19 T1, silent-0425: selection slots compact after each pick,
// while combat.hand remains unchanged. Match effect signatures, never the old hand index.
function signature(card: Raw): string {
  return JSON.stringify(["card_id", "upgraded", "energy_cost", "star_cost", "costs_x", "star_costs_x",
    "rules_text", "resolved_rules_text", "dynamic_values", "enchantment"].map((key) => card[key] ?? null));
}

function plainSnakebite(card: Raw): boolean {
  const values = asArray(card["dynamic_values"]).map(asRecord);
  return card["card_id"] === "SNAKEBITE" && card["upgraded"] === false && card["energy_cost"] === 2 &&
    card["star_cost"] === 0 && card["costs_x"] === false && card["star_costs_x"] === false &&
    card["enchantment"] == null && card["rules_text"] === "给予{PoisonPower:diff()}层中毒。" &&
    str(card["resolved_rules_text"]).replace(/\s+/g, "") === "保留。给予7层中毒。" &&
    values.length === 1 && values[0]!["name"] === "PoisonPower" &&
    ["base_value", "current_value", "enchanted_value"].every((key) => values[0]![key] === 7);
}

/** A nonpositive damage/block score does not establish that a payable Snakebite has no effect. */
export function snakebiteDiscardChoice(env: DecisionEnv, automaticIndex: number, currentGambler: boolean): Decision | null {
  const { state } = env;
  const selection = asRecord(state.raw["selection"]);
  if (!currentGambler || !state.in_combat || state.run?.ascension !== 10 ||
      str(asRecord(state.run.raw)["character_id"]).toUpperCase() !== "SILENT" ||
      selection["kind"] !== "combat_hand_select" || selection["min_select"] !== 0 ||
      !/替换|弃|replace|discard/i.test(str(selection["prompt"]))) return null;
  const combat = asRecord(state.raw["combat"]);
  const player = asRecord(combat["player"]);
  const energy = numOrNull(player["energy"]);
  if (energy === null || energy < 2 || !Array.isArray(player["powers"]) || player["powers"].length !== 0 ||
      !/UsePotionAction$/.test(str(asRecord(combat["action_readiness"])["running_action_type"]))) return null;
  const enemies = asArray(combat["enemies"]).map(asRecord).filter((e) => e["is_alive"] !== false);
  // No inference about blocking powers, multiple targets, or unobserved selection timing.
  if (enemies.length !== 1) return null;
  const enemy = enemies[0]!;
  const target = numOrNull(enemy["index"]);
  if (target === null || enemy["is_alive"] !== true || enemy["is_hittable"] !== true ||
      (numOrNull(enemy["current_hp"]) ?? 0) <= 0 || !Array.isArray(enemy["powers"]) || enemy["powers"].length !== 0) return null;
  const hand = asArray(combat["hand"]).map(asRecord);
  const cards = asArray(selection["cards"]).map(asRecord);
  const selected = numOrNull(selection["selected_count"]);
  if (selected === null || selected < 0 || cards.length + selected !== hand.length ||
      cards.some((c) => c["selected"] !== false) ||
      cards.some((c) => !Number.isInteger(c["index"]) || (c["index"] as number) < 0) ||
      new Set(cards.map((c) => c["index"])).size !== cards.length) return null;
  const automatic = cards.find((c) => c["index"] === automaticIndex);
  if (!automatic || !plainSnakebite(automatic)) return null;
  // Duplicate copies need no physical UID for these facts, but every matching copy must
  // agree on observed playability and target. Unknown or mixed copies retain the old path.
  const known = new Set<number>();
  for (const card of cards.filter(plainSnakebite)) {
    const matches = hand.filter((c) => signature(c) === signature(card));
    const count = cards.filter((c) => signature(c) === signature(card)).length;
    if (matches.length < count || matches.some((c) => c["playable"] !== true ||
        c["target_type"] !== "AnyEnemy" || c["requires_target"] !== true || c["target_index_space"] !== "enemies" ||
        !asArray(c["valid_target_indices"]).includes(target))) return null;
    known.add(card["index"] as number);
  }
  const options: PickOption[] = cards.map((card) => ({
    key: `card${card["index"]}`, label: str(card["name"], str(card["card_id"])), score: 0,
    intent: { action: "select_deck_card", option_index: card["index"] as number },
    summary: {
      action: "弃掉这张牌，随后重读选择界面", selection_index: card["index"] as number,
      card_id: str(card["card_id"]), card: str(card["name"]), cost: numOrNull(card["energy_cost"]),
      text: str(card["resolved_rules_text"]),
      ...(known.has(card["index"] as number) ? { snakebite_effect: {
        energy_sufficient_alone: true, playable_before_selection_settles: true,
        poison_if_played: 7, target_index: target, immediate_hp_damage: 0,
        remaining_offered_snakebites_after_pick: known.size - 1,
        turn_hp_value: null, fight_hp_value: null,
      } } : {}),
    } satisfies JsonValue,
  }));
  if (selection["can_confirm"] === true && state.available_actions.includes("confirm_selection")) {
    options.push({ key: "confirm", label: "确认已选，保留其余牌", score: 0,
      intent: { action: "confirm_selection" }, summary: { action: "确认已选，保留其余牌", selected_count: selected } });
  }
  return buildPickDecision({
    label: "selection/discard", options, unranked: true, strictJev: env.strictJev, actThreshold: env.thresholds.act,
    instructions: "选择继续弃牌或确认。蛇咬可支付2费并给予7毒，不能因直伤/格挡评分低就视为无效果；7毒不是7点即时伤害。比较当前来袭、其他手牌与替换需求，所有选项均可选；没有长期血价或必须保留的排名。",
    state: { situation: {
      task: "替换任意张手牌", energy_now: energy, hp_now: numOrNull(player["current_hp"]),
      block_now: numOrNull(player["block"]), selected_count: selected,
      enemies: enemies as JsonValue[], remaining_offered_snakebites: known.size,
      limitation: "选择索引可能重排，combat.hand仍是未结算快照；这里只识别相同效果副本，不追认物理身份。保留不代表两张都应打出，替换后的手牌、整轮与整战收益未知；确认后按真实手牌重算。",
    }, candidates: options.map((option) => option.summary) },
  });
}

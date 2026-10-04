/**
 * The execution gate (PLAN.md §8.1; V4 M3): an intent is only dispatched if the *freshest* payload still
 * advertises it with the arguments we computed, and its indices still point at what the decision meant (the
 * card, enemy, potion, node or option in its `expect`; act/identity.ts).
 */

import type { ActionRequest } from "../mod/client.js";
import type { GameState } from "../mod/schema.js";
import { asArray, asRecord, bool, num, numOrNull, stableStringify } from "../../core/util/json.js";
import { checkIdentity, type ActionExpect } from "./identity.js";

export interface GateResult {
  ok: boolean;
  reason: string;
  /** A refusal's kind: the action is not legal now, or its indices hold something else than was decided. */
  kind?: "legality" | "identity";
  /** An identity refusal: what the decision meant and what the indices hold now. */
  expected?: ActionExpect;
  actual?: ActionExpect;
}

const INDEX_ACTIONS = new Set([
  "choose_map_node",
  "choose_event_option",
  "choose_reward_card",
  "select_deck_card",
  "choose_treasure_relic",
  "choose_rest_option",
  "choose_capstone_option",
  "choose_bundle",
  "choose_timeline_epoch",
  "claim_reward",
  "buy_card",
  "buy_relic",
  "buy_potion",
  "use_potion",
  "discard_potion",
  "select_character",
  "switch_profile",
  "resolve_rewards",
  "play_card",
]);

export function gate(state: GameState, intent: ActionRequest): GateResult {
  const legal = legality(state, intent);
  if (!legal.ok && legal.stage === "action") return { ok: false, kind: "legality", reason: legal.reason };
  // Identity before the index checks: "card 3 is now a Defend" says more than "card 3 is not playable".
  const mismatch = checkIdentity(state, intent);
  if (mismatch) return { ok: false, kind: "identity", reason: `not what was decided: ${mismatch.reason}`, expected: mismatch.expected, actual: mismatch.actual };
  if (!legal.ok) return { ok: false, kind: "legality", reason: legal.reason };
  return { ok: true, reason: "legal" };
}

/** The legality checks; `stage` "action" when the action itself is not offered. */
function legality(state: GameState, intent: ActionRequest): { ok: true } | { ok: false; reason: string; stage: "action" | "arguments" } {
  if (!state.available_actions.includes(intent.action)) {
    return {
      ok: false,
      stage: "action",
      reason: `"${intent.action}" is not in available_actions (${state.available_actions.join(", ") || "none"})`,
    };
  }
  if (INDEX_ACTIONS.has(intent.action)) {
    const index = intent.action === "play_card" ? intent.card_index : intent.option_index;
    if (index === undefined || !Number.isInteger(index)) {
      return { ok: false, stage: "arguments", reason: `"${intent.action}" needs an integer index and none was set` };
    }
  }
  if (intent.action === "play_card") {
    const combat = asRecord(state.raw["combat"]);
    const card = asArray(combat["hand"])
      .map(asRecord)
      .find((entry) => numOrNull(entry["index"]) === intent.card_index);
    if (!card) return { ok: false, stage: "arguments", reason: `card_index ${intent.card_index} is not in the current hand` };
    if (!bool(card["playable"])) {
      return { ok: false, stage: "arguments", reason: `card_index ${intent.card_index} is not playable right now` };
    }
    if (bool(card["requires_target"])) {
      const valid = asArray(card["valid_target_indices"]).map((value) => num(value));
      if (intent.target_index === undefined || !valid.includes(intent.target_index)) {
        return {
          ok: false,
          stage: "arguments",
          reason: `target_index ${intent.target_index ?? "unset"} is not in valid_target_indices [${valid.join(", ")}]`,
        };
      }
    }
  }
  if (intent.action === "crystal_clear_cell") {
    if (intent.x === undefined || intent.y === undefined) return { ok: false, stage: "arguments", reason: "crystal_clear_cell needs x and y" };
  }
  if (intent.action === "choose_map_node") {
    const map = asRecord(state.raw["map"]);
    const available = asArray(map["available_nodes"]).map((entry) => numOrNull(asRecord(entry)["index"]));
    if (!available.includes(intent.option_index ?? null)) {
      return { ok: false, stage: "arguments", reason: `option_index ${intent.option_index} is not among the available map nodes [${available.join(", ")}]` };
    }
  }
  return { ok: true };
}

/**
 * A cheap content fingerprint of the parts a decision depends on. If it changes between planning and
 * dispatch, the intent is dropped and the decision is remade from fresh state (PLAN.md §8.1).
 */
export function fingerprint(state: GameState): string {
  const combat = asRecord(state.raw["combat"]);
  const player = asRecord(combat["player"]);
  const hand = asArray(combat["hand"])
    .map((entry) => {
      const card = asRecord(entry);
      return `${num(card["index"])}:${String(card["card_id"])}:${bool(card["playable"])}`;
    })
    .join("|");
  const enemies = asArray(combat["enemies"])
    .map((entry) => {
      const enemy = asRecord(entry);
      return `${num(enemy["index"])}:${numOrNull(enemy["current_hp"])}:${num(enemy["block"])}:${bool(enemy["is_alive"])}`;
    })
    .join("|");
  // Player state matters more than it looks: drinking a potion changes only energy/powers, and
  // leaving those out made "the board did not move" a lie — which risked repeating the action.
  const powers = asArray(player["powers"])
    .map((entry) => {
      const power = asRecord(entry);
      return `${String(power["power_id"])}:${numOrNull(power["amount"])}`;
    })
    .join("|");
  const potions = asArray(asRecord(state.raw["run"])["potions"])
    .map((entry) => {
      const potion = asRecord(entry);
      return `${String(potion["potion_id"] ?? "")}:${bool(potion["occupied"])}:${bool(potion["can_use"])}`;
    })
    .join("|");
  const map = asRecord(state.raw["map"]);
  const nodes = asArray(map["available_nodes"]).map((entry) => num(asRecord(entry)["index"])).join("|");
  const reward = asRecord(state.raw["reward"]);
  const selection = asRecord(state.raw["selection"]);
  const shop = asRecord(state.raw["shop"]);
  // An event's page: its id, description and options. A choice that timed out but went through turns
  // the page with HP unchanged; without this the next page looked like the same board and the answer
  // was replayed (KFPC F4: Tablet of Truth clicked twice more, max HP 80 -> 71).
  const event = asRecord(state.raw["event"]);
  const eventPage = Object.keys(event).length === 0
    ? ""
    : `${String(event["event_id"] ?? "")}:${String(event["description"] ?? "").length}:${bool(event["is_finished"])}:${asArray(event["options"])
        .map((entry) => {
          const option = asRecord(entry);
          return `${String(option["title"] ?? "")}/${String(option["description"] ?? "")}/${bool(option["is_locked"])}`;
        })
        .join("|")}`;

  return stableStringify({
    run: String(state.raw["run_id"] ?? ""),
    screen: state.screen,
    turn: state.turn,
    combat: state.in_combat,
    actions: state.available_actions,
    hp: state.run?.current_hp ?? null,
    maxHp: state.run?.max_hp ?? null,
    gold: state.run?.gold ?? null,
    player: `${num(player["energy"])}:${num(player["block"])}:${num(player["stars"])}`,
    powers,
    potions,
    pendingCard: bool(reward["pending_card_choice"]),
    rewards: asArray(reward["rewards"]).map((entry) => num(asRecord(entry)["index"])).join("|"),
    selection: `${numOrNull(selection["selected_count"])}:${bool(selection["can_confirm"])}`,
    shopOpen: bool(shop["is_open"]),
    shopStock: asArray(shop["cards"])
      .map((entry) => {
        const card = asRecord(entry);
        return `${num(card["index"])}:${bool(card["is_stocked"], true)}`;
      })
      .join("|"),
    hand,
    enemies,
    nodes,
    event: eventPage,
  });
}

/**
 * The execution gate's identity check (V4 M3, docs/v4-architecture.md §1 "hand action adapter + execution gate").
 *
 * An action names positions (card_index, target_index, option_index); what the decision meant is the card, the
 * enemy, the potion, the map node or the option those positions held when it was made. The loop stamps every
 * intent with that (`expect`, from the state the decision was made on; a step of a combat line keeps what its
 * line chose), and the gate checks it on the freshest state: an index that still exists but now holds something
 * else is refused, never played. C batch (ef5eb16): 220 drinks of a cut-short line in 112 runs were played on a
 * board the line had not planned; NEVM F23 T2: a kill shifted the enemy indices and a Bash meant for the Silk
 * Bowlbug hit the sleeping beetle.
 *
 * An intent without `expect` (an old one, a test's) only gets the legality checks, as before.
 */

import type { ActionRequest } from "../mod/client.js";
import type { GameState } from "../mod/schema.js";
import { asArray, asRecord, bool, num, numOrNull, str } from "../util/json.js";

/** What an action's indices pointed at when it was decided. Only the parts that apply to its action are set. */
export interface ActionExpect {
  /** play_card: the card at card_index; `upgraded` unset means either (a line whose own step upgrades cards). */
  card?: { id: string; upgraded?: boolean };
  /** play_card / use_potion with a target: the enemy at target_index. */
  target?: { id: string };
  /** use_potion / discard_potion: the potion in belt slot option_index. */
  potion?: { id: string };
  /** choose_map_node: the node at option_index. */
  node?: { row: number; col: number; type: string };
  /**
   * The option at option_index: an item id (a reward, shop or selection card "ID" / "ID+", a relic, a shop
   * potion, a rest option, a character) or its text (an event option's title, a reward's "type: description").
   */
  option?: { id?: string; text?: string };
  /** In combat: the turn the action was decided in. */
  turn?: number;
  /** A combat line's step: the hand the line expected before this step (sorted "ID" / "ID+" list, comma-joined). */
  hand?: string;
  /** A combat line's step: the living enemies when the line was chosen ("index:enemy_id", "|"-joined; a kill shifts indices). */
  enemies?: string;
  /** Where it came from: the state the decision was made on, or a combat line chosen earlier. */
  from?: "decision" | "line";
}

/** A refused identity: why, what the decision meant and what the indices hold now (the same fields). */
export interface IdentityMismatch {
  reason: string;
  expected: ActionExpect;
  actual: ActionExpect;
}

/** The action as the mod takes it: the gate's `expect` is ours, never sent. */
export function wireIntent(intent: ActionRequest): ActionRequest {
  if (intent.expect === undefined) return intent;
  const { expect: _expect, ...wire } = intent;
  return wire;
}

/** A hand as the combat line memo writes it (combat-plan handSignature): card ids, "+" when upgraded, sorted. */
export function handSignatureOf(raw: Record<string, unknown>): string {
  return asArray(asRecord(raw["combat"])["hand"])
    .map(asRecord)
    .map((card) => `${str(card["card_id"])}${bool(card["upgraded"]) ? "+" : ""}`)
    .sort()
    .join(",");
}

/** The living enemies as the combat line memo writes them (combat-plan livingEnemySignature): "index:enemy_id", "|"-joined. */
export function livingEnemiesOf(raw: Record<string, unknown>): string {
  return asArray(asRecord(raw["combat"])["enemies"])
    .map(asRecord)
    .filter((enemy) => enemy["is_alive"] !== false)
    .map((enemy) => `${num(enemy["index"])}:${str(enemy["enemy_id"])}`)
    .join("|");
}

/** A card as an option id: "ID", or "ID+" when upgraded. */
function cardKey(card: Record<string, unknown>): string {
  return `${str(card["card_id"])}${bool(card["upgraded"]) ? "+" : ""}`;
}

/** The entry of a list whose `index` is `index` (the mod's lists carry their own indices). */
function entryAt(list: unknown, index: number | undefined): Record<string, unknown> | null {
  if (index === undefined || !Number.isInteger(index)) return null;
  return (asArray(list).map(asRecord).find((entry) => numOrNull(entry["index"]) === index) ?? null);
}

/** The enemy at a target index, when the combat has one there. */
function enemyAt(raw: Record<string, unknown>, index: number | undefined): { id: string } | undefined {
  if (index === undefined || index === null) return undefined;
  const enemy = entryAt(asRecord(raw["combat"])["enemies"], index);
  return enemy ? { id: str(enemy["enemy_id"]) } : undefined;
}

const COMBAT_TURN_ACTIONS = new Set(["play_card", "use_potion", "end_turn"]);

/**
 * What the intent's indices point at on `state` (only the parts that apply to its action; a part whose index
 * points at nothing is left out). The loop stamps this at decision time; the gate reads it again to compare.
 */
export function identityAt(state: GameState, intent: ActionRequest): ActionExpect {
  const raw = state.raw;
  const out: ActionExpect = {};
  const option = intent.option_index;
  switch (intent.action) {
    case "play_card": {
      const card = entryAt(asRecord(raw["combat"])["hand"], intent.card_index);
      if (card) out.card = { id: str(card["card_id"]), upgraded: bool(card["upgraded"]) };
      const target = enemyAt(raw, intent.target_index);
      if (target) out.target = target;
      break;
    }
    case "use_potion":
    case "discard_potion": {
      const slot = entryAt(asRecord(raw["run"])["potions"], option);
      if (slot && bool(slot["occupied"]) && str(slot["potion_id"])) out.potion = { id: str(slot["potion_id"]) };
      if (intent.action === "use_potion") {
        const target = enemyAt(raw, intent.target_index);
        if (target) out.target = target;
      }
      break;
    }
    case "choose_map_node": {
      const node = entryAt(asRecord(raw["map"])["available_nodes"], option);
      if (node) out.node = { row: num(node["row"]), col: num(node["col"]), type: str(node["node_type"]) };
      break;
    }
    case "choose_event_option": {
      const entry = entryAt(asRecord(raw["event"])["options"], option);
      if (entry) out.option = { text: str(entry["title"]) || str(entry["text_key"]) };
      break;
    }
    case "choose_rest_option": {
      const entry = entryAt(asRecord(raw["rest"])["options"], option);
      if (entry) out.option = str(entry["option_id"]) ? { id: str(entry["option_id"]) } : { text: str(entry["title"]) };
      break;
    }
    case "claim_reward": {
      const entry = entryAt(asRecord(raw["reward"])["rewards"], option);
      if (entry) out.option = { text: `${str(entry["reward_type"])}: ${str(entry["description"])}` };
      break;
    }
    case "choose_reward_card": {
      const entry = entryAt(asRecord(raw["reward"])["card_options"], option);
      if (entry) out.option = { id: cardKey(entry) };
      break;
    }
    case "select_deck_card": {
      const entry = entryAt(asRecord(raw["selection"])["cards"], option);
      if (entry) out.option = { id: cardKey(entry) };
      break;
    }
    case "buy_card": {
      const entry = entryAt(asRecord(raw["shop"])["cards"], option);
      if (entry) out.option = { id: cardKey(entry) };
      break;
    }
    case "buy_relic": {
      const entry = entryAt(asRecord(raw["shop"])["relics"], option);
      if (entry) out.option = { id: str(entry["relic_id"]) };
      break;
    }
    case "buy_potion": {
      const entry = entryAt(asRecord(raw["shop"])["potions"], option);
      if (entry) out.option = { id: str(entry["potion_id"]) };
      break;
    }
    case "choose_treasure_relic": {
      const entry = entryAt(asRecord(raw["chest"])["relic_options"], option);
      if (entry) out.option = { id: str(entry["relic_id"]) };
      break;
    }
    case "choose_bundle": {
      const entry = entryAt(raw["bundles"], option);
      if (entry) out.option = { text: str(entry["title"]) };
      break;
    }
    case "choose_capstone_option": {
      const entry = entryAt(asRecord(raw["capstone"])["options"], option);
      if (entry) out.option = { text: str(entry["title"]) };
      break;
    }
    case "select_character": {
      const entry = entryAt(asRecord(raw["character_select"])["characters"], option);
      if (entry) out.option = { id: str(entry["character_id"]) };
      break;
    }
    default:
      break;
  }
  if (state.in_combat && COMBAT_TURN_ACTIONS.has(intent.action) && state.turn !== null) out.turn = state.turn;
  return out;
}

/**
 * The intent with its identity on `state` (the state the decision was made on). What the planner already set
 * wins (a combat line's step keeps the card, enemy and potion its line chose, and its expected hand); the rest
 * is read from the state. An intent whose action points at nothing is returned as it is.
 */
export function withExpect(state: GameState, intent: ActionRequest): ActionRequest {
  const expect: ActionExpect = { ...identityAt(state, intent) };
  for (const [key, value] of Object.entries(intent.expect ?? {})) {
    if (value !== undefined) (expect as Record<string, unknown>)[key] = value;
  }
  const parts = Object.keys(expect).filter((key) => key !== "from");
  if (parts.length === 0) return intent;
  return { ...intent, expect: { ...expect, from: intent.expect?.from ?? "decision" } };
}

/** "BASH+" / "BASH" / "BASH (either upgrade)". */
function cardText(card: { id: string; upgraded?: boolean } | undefined): string {
  if (!card) return "nothing";
  return card.upgraded === undefined ? card.id : `${card.id}${card.upgraded ? "+" : ""}`;
}

function nodeText(node: ActionExpect["node"]): string {
  return node ? `row ${node.row} col ${node.col} (${node.type})` : "nothing";
}

function optionText(option: ActionExpect["option"]): string {
  if (!option) return "nothing";
  return option.id !== undefined ? option.id : `"${option.text ?? ""}"`;
}

/**
 * The intent's `expect` checked on `state`: null when it holds (or when there is none), else why not, with
 * what was expected and what the indices hold now.
 */
export function checkIdentity(state: GameState, intent: ActionRequest): IdentityMismatch | null {
  const expected = intent.expect;
  if (!expected) return null;
  const now = identityAt(state, intent);
  const actual: ActionExpect = {};
  const problems: string[] = [];
  if (expected.card) {
    actual.card = now.card ?? { id: "" };
    const same = now.card !== undefined && now.card.id === expected.card.id && (expected.card.upgraded === undefined || now.card.upgraded === expected.card.upgraded);
    if (!same) problems.push(`card_index ${intent.card_index} is ${now.card ? cardText(now.card) : "not in the hand"}, expected ${cardText(expected.card)}`);
  }
  if (expected.target) {
    actual.target = now.target ?? { id: "" };
    if (now.target?.id !== expected.target.id) problems.push(`target_index ${intent.target_index} is ${now.target ? now.target.id : "no enemy"}, expected ${expected.target.id}`);
  }
  if (expected.potion) {
    actual.potion = now.potion ?? { id: "" };
    if (now.potion?.id !== expected.potion.id) problems.push(`potion slot ${intent.option_index} holds ${now.potion ? now.potion.id : "nothing"}, expected ${expected.potion.id}`);
  }
  if (expected.node) {
    if (now.node) actual.node = now.node;
    const same = now.node !== undefined && now.node.row === expected.node.row && now.node.col === expected.node.col && now.node.type === expected.node.type;
    if (!same) problems.push(`map node ${intent.option_index} is ${nodeText(now.node)}, expected ${nodeText(expected.node)}`);
  }
  if (expected.option) {
    if (now.option) actual.option = now.option;
    const same =
      now.option !== undefined &&
      (expected.option.id === undefined || now.option.id === expected.option.id) &&
      (expected.option.text === undefined || now.option.text === expected.option.text);
    if (!same) problems.push(`option ${intent.option_index} is ${optionText(now.option)}, expected ${optionText(expected.option)}`);
  }
  if (expected.turn !== undefined) {
    if (state.turn !== null) actual.turn = state.turn;
    if (state.turn !== expected.turn) problems.push(`turn is ${state.turn ?? "unknown"}, expected ${expected.turn}`);
  }
  if (expected.hand !== undefined) {
    actual.hand = handSignatureOf(state.raw);
    if (actual.hand !== expected.hand) problems.push(`the hand is [${actual.hand}], the line expected [${expected.hand}]`);
  }
  if (expected.enemies !== undefined) {
    actual.enemies = livingEnemiesOf(state.raw);
    if (actual.enemies !== expected.enemies) problems.push(`the enemies are [${actual.enemies}], the line expected [${expected.enemies}]`);
  }
  if (problems.length === 0) return null;
  return { reason: problems.join("; "), expected, actual };
}

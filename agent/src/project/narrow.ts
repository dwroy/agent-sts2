/** Helpers that turn the raw state into the small English shapes the questions refer to. */

import type { Knowledge } from "../knowledge/index.js";
import type { PowerLine } from "../strategy/damage.js";
import { fillPotionText } from "../knowledge/potion-values.js";
import { asArray, asRecord, bool, num, numOrNull, str, truncate, type JsonValue } from "../util/json.js";

export interface EnemyView {
  key: string;
  index: number;
  name: string;
  hp: number | null;
  max_hp: number | null;
  block: number;
  alive: boolean;
  powers: string[];
  intents: string;
  /** Power id + amount, for the damage resolver. */
  power_lines: PowerLine[];
  /** Raw attack intents, so combat maths can resolve them against our powers and block. */
  attacks: { damage: number; hits: number }[];
  incoming: number;
}

function describeIntents(enemy: Record<string, unknown>): { text: string; incoming: number } {
  const intents = asArray(enemy["intents"]).map(asRecord);
  let incoming = 0;
  const parts: string[] = [];
  for (const intent of intents) {
    const kind = str(intent["intent_type"]);
    const label = str(intent["label"]);
    const total = numOrNull(intent["total_damage"]);
    const hits = numOrNull(intent["hits"]);
    if (total !== null) incoming += total;
    const detail = label || (total !== null ? `${total}` : kind);
    parts.push(
      total !== null && hits !== null && hits > 1 ? `${kind} ${detail} (${hits} hits, ${total} total)` : `${kind} ${detail}`,
    );
  }
  if (parts.length === 0) {
    const legacy = str(enemy["intent"]);
    if (legacy) parts.push(legacy);
  }
  return { text: parts.join(", ") || "unknown", incoming };
}

/** Power id + amount, for the damage resolver (the text form above is what the model reads). */
export function powerLines(holder: Record<string, unknown>): PowerLine[] {
  return asArray(holder["powers"])
    .map(asRecord)
    .map((power) => ({ id: str(power["power_id"]), amount: numOrNull(power["amount"]) }))
    .filter((power) => power.id.length > 0);
}

function attackIntents(enemy: Record<string, unknown>): { damage: number; hits: number }[] {
  return asArray(enemy["intents"])
    .map(asRecord)
    .flatMap((intent) => {
      const damage = numOrNull(intent["damage"]);
      if (damage === null) return [];
      return [{ damage, hits: Math.max(1, Math.round(numOrNull(intent["hits"]) ?? 1)) }];
    });
}

/**
 * Powers are shown as `Name 3 [debuff] (what it does)`. Names alone are not enough: Jev has no
 * reliable priors for a new game's buffs, and the effect is exactly the decision-relevant part.
 */
/**
 * One enemy power for the combat question (combat-plan.ts): its id and amount (the notes and rules key on the
 * id), then its name, [debuff], and the game's description, as describePowers shows ours. The description's
 * own numbers are the game data's defaults; the amount is the one on the board.
 */
export function enemyPowerText(power: Record<string, unknown>, knowledge: Knowledge): string {
  const id = str(power["power_id"]);
  const info = knowledge.power(id);
  const amount = numOrNull(power["amount"]);
  const name = str(power["name"], info?.name ?? "");
  const debuff = bool(power["is_debuff"]) || info?.type === "Debuff";
  const text = [name, debuff ? "[debuff]" : ""].filter(Boolean).join(" ");
  const effect = info?.description ? truncate(info.description, 140) : "";
  return `${id}${amount === null ? "" : ` ${amount}`}${text || effect ? ` = ${text}${text && effect ? ": " : ""}${effect}` : ""}`;
}

function describePowers(holder: Record<string, unknown>, knowledge: Knowledge): string[] {
  return asArray(holder["powers"])
    .map(asRecord)
    .map((power) => {
      const id = str(power["power_id"]);
      const info = knowledge.power(id);
      const name = str(power["name"], info?.name ?? id);
      const amount = numOrNull(power["amount"]);
      const debuff = bool(power["is_debuff"]);
      const effect = info?.description ? ` (${truncate(info.description, 90)})` : "";
      return `${name}${amount === null ? "" : ` ${amount}`}${debuff ? " [debuff]" : ""}${effect}`;
    })
    .slice(0, 8);
}

export function enemyViews(state: { raw: Record<string, unknown> }, knowledge: Knowledge): EnemyView[] {
  return asArray(state.raw["enemies"]).map((entry, fallbackIndex) => {
    const enemy = asRecord(entry);
    const id = str(enemy["enemy_id"]);
    const info = knowledge.monster(id);
    const { text, incoming } = describeIntents(enemy);
    return {
      key: `e${numOrNull(enemy["index"]) ?? fallbackIndex}`,
      index: numOrNull(enemy["index"]) ?? fallbackIndex,
      name: str(enemy["name"], info?.name ?? id),
      hp: numOrNull(enemy["current_hp"]),
      max_hp: numOrNull(enemy["max_hp"]),
      block: num(enemy["block"]),
      alive: enemy["is_alive"] !== false,
      powers: describePowers(enemy, knowledge),
      power_lines: powerLines(enemy),
      intents: text,
      attacks: attackIntents(enemy),
      incoming,
    };
  });
}

export function enemyJson(view: EnemyView): Record<string, JsonValue> {
  return {
    key: view.key,
    name: view.name,
    hp: view.hp,
    block: view.block,
    alive: view.alive,
    intents: view.intents,
    powers: view.powers,
  };
}

export interface HandCardView {
  index: number;
  key: string;
  card_id: string;
  name: string;
  type: string;
  upgraded: boolean;
  cost: number;
  playable: boolean;
  unplayable_reason: string | null;
  requires_target: boolean;
  valid_targets: number[];
  text: string;
  /** Code-computed effect magnitudes, never left for the model to derive (PLAN.md §6.1). */
  damage: number | null;
  hits: number;
  block: number | null;
}

function dynamicValue(card: Record<string, unknown>, names: string[]): number | null {
  for (const name of names) {
    for (const entry of asArray(card["dynamic_values"])) {
      const value = asRecord(entry);
      if (str(value["name"]) === name) {
        const current = numOrNull(value["current_value"]);
        if (current !== null) return current;
        return numOrNull(value["base_value"]);
      }
    }
  }
  return null;
}

export function handViews(state: { raw: Record<string, unknown> }, knowledge: Knowledge): HandCardView[] {
  return asArray(state.raw["hand"]).map((entry, fallbackIndex) => {
    const card = asRecord(entry);
    const cardId = str(card["card_id"]);
    const info = knowledge.card(cardId);
    const index = numOrNull(card["index"]) ?? fallbackIndex;
    const damage = dynamicValue(card, ["Damage", "CalculatedDamage", "DamagePerHit"]);
    const hits = Math.max(1, Math.round(dynamicValue(card, ["Repeat", "Hits"]) ?? 1));
    const block = dynamicValue(card, ["Block", "CalculatedBlock"]);
    return {
      index,
      key: `c${index}`,
      card_id: cardId,
      name: str(card["name"], info?.name ?? cardId),
      type: info?.type ?? "",
      upgraded: bool(card["upgraded"]),
      cost: num(card["energy_cost"]),
      playable: bool(card["playable"]),
      unplayable_reason: typeof card["unplayable_reason"] === "string" ? str(card["unplayable_reason"]) : null,
      requires_target: bool(card["requires_target"]),
      valid_targets: asArray(card["valid_target_indices"]).map((value) => num(value)).filter((value) => Number.isFinite(value)),
      text: truncate(str(card["resolved_rules_text"]) || info?.description || "", 180),
      damage,
      hits,
      block,
    };
  });
}

export function handCardJson(view: HandCardView): Record<string, JsonValue> {
  return {
    key: view.key,
    name: view.name,
    type: view.type,
    upgraded: view.upgraded,
    cost: view.cost,
    playable: view.playable,
    unplayable_reason: view.unplayable_reason,
    text: view.text,
  };
}

export interface PotionView {
  slot: number;
  key: string;
  potion_id: string;
  name: string;
  text: string;
  can_use: boolean;
  can_discard: boolean;
  requires_target: boolean;
  valid_targets: number[];
}

export function potionViews(state: { raw: Record<string, unknown> }, knowledge: Knowledge): PotionView[] {
  return asArray(state.raw["potions"])
    .map(asRecord)
    .filter((potion) => bool(potion["occupied"]))
    .map((potion, fallbackIndex) => {
      const slot = numOrNull(potion["index"]) ?? fallbackIndex;
      const id = str(potion["potion_id"]);
      const info = knowledge.potion(id);
      return {
        slot,
        key: `p${slot}`,
        potion_id: id,
        name: str(potion["name"], info?.name ?? id),
        text: truncate(fillPotionText(id, str(potion["description"]) || info?.description || ""), 140),
        can_use: bool(potion["can_use"]),
        can_discard: bool(potion["can_discard"]),
        requires_target: bool(potion["requires_target"]),
        valid_targets: asArray(potion["valid_target_indices"]).map((value) => num(value)),
      };
    });
}

export function playerJson(player: Record<string, unknown>, knowledge: Knowledge): Record<string, JsonValue> {
  return {
    hp: numOrNull(player["current_hp"]),
    max_hp: numOrNull(player["max_hp"]),
    block: num(player["block"]),
    energy: num(player["energy"]),
    stars: num(player["stars"]),
    powers: describePowers(player, knowledge),
    cards_played_this_turn: num(player["cards_played_this_turn"]),
    attacks_played_this_turn: num(player["attacks_played_this_turn"]),
    skills_played_this_turn: num(player["skills_played_this_turn"]),
  };
}

/** The player's powers as id + amount, for the incoming-damage resolution. */
export function playerPowers(holder: Record<string, unknown>): PowerLine[] {
  return powerLines(holder);
}

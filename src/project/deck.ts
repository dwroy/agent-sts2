/** Deck reading and summarising. Used by deck-shaping decisions (PLAN.md §5.2 "deck sizing"). */

import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../mod/schema.js";
import { asArray, asRecord, bool, numOrNull, str, truncate } from "../util/json.js";

export interface DeckEntry {
  index: number;
  card_id: string;
  name: string;
  upgraded: boolean;
  type: string;
  rarity: string;
  cost: number | null;
  description: string;
}

export function deckEntries(state: GameState, knowledge: Knowledge): DeckEntry[] {
  const run = asRecord(state.run?.raw);
  return asArray(run["deck"]).map((entry, fallbackIndex) => {
    const obj = asRecord(entry);
    const cardId = str(obj["card_id"]);
    const info = knowledge.card(cardId);
    const upgraded = bool(obj["upgraded"]);
    const rendered = str(obj["resolved_rules_text"]) || info?.description || "";
    return {
      index: numOrNull(obj["index"]) ?? fallbackIndex,
      card_id: cardId,
      name: str(obj["name"], info?.name ?? cardId),
      upgraded,
      type: str(obj["card_type"], info?.type ?? ""),
      rarity: str(obj["rarity"], info?.rarity ?? ""),
      cost: numOrNull(obj["energy_cost"]) ?? info?.cost ?? null,
      description: truncate(rendered.split(".")[0] ?? rendered, 90),
    };
  });
}

export interface DeckStats {
  total: number;
  attacks: number;
  skills: number;
  powers: number;
  curses: number;
  upgraded: number;
  average_cost: number | null;
  cost_curve: Record<string, number>;
}

export function deckStats(entries: DeckEntry[]): DeckStats {
  const costCurve: Record<string, number> = {};
  let costTotal = 0;
  let costCount = 0;
  let attacks = 0;
  let skills = 0;
  let powers = 0;
  let curses = 0;
  let upgraded = 0;

  for (const entry of entries) {
    const type = entry.type.toLowerCase();
    if (type === "attack") attacks += 1;
    else if (type === "skill") skills += 1;
    else if (type === "power") powers += 1;
    else if (type === "curse" || type === "status") curses += 1;
    if (entry.upgraded) upgraded += 1;
    if (entry.cost !== null) {
      const bucket = entry.cost >= 3 ? "3+" : String(entry.cost);
      costCurve[bucket] = (costCurve[bucket] ?? 0) + 1;
      costTotal += entry.cost;
      costCount += 1;
    }
  }

  return {
    total: entries.length,
    attacks,
    skills,
    powers,
    curses,
    upgraded,
    average_cost: costCount > 0 ? Number((costTotal / costCount).toFixed(2)) : null,
    cost_curve: costCurve,
  };
}

export function summarizeDeck(stats: DeckStats): string {
  const parts = [
    `${stats.total} cards`,
    `${stats.attacks} attacks / ${stats.skills} skills / ${stats.powers} powers`,
  ];
  if (stats.upgraded > 0) parts.push(`${stats.upgraded} upgraded`);
  if (stats.curses > 0) parts.push(`${stats.curses} curses/statuses`);
  if (stats.average_cost !== null) parts.push(`avg cost ${stats.average_cost}`);
  return parts.join(" | ");
}

/** One compact line per card — only for deck-shaping decisions (PLAN.md §5.2). */
export function describeDeck(entries: DeckEntry[], max = 40): string {
  return entries
    .slice(0, max)
    .map((entry) => {
      const cost = entry.cost === null ? "?" : String(entry.cost);
      const plus = entry.upgraded ? "+" : "";
      return `${entry.name}${plus} (${entry.type || "?"}, ${cost}E): ${entry.description}`;
    })
    .join("\n");
}

export function describeRunRelics(state: GameState, knowledge: Knowledge): string[] {
  return asArray(asRecord(state.run?.raw)["relics"]).map((entry) => {
    const obj = asRecord(entry);
    const id = str(obj["relic_id"]);
    return str(obj["name"], knowledge.relic(id)?.name ?? id);
  });
}

export function describeRunPotions(state: GameState, knowledge: Knowledge): string[] {
  return asArray(asRecord(state.run?.raw)["potions"])
    .map((entry) => {
      const obj = asRecord(entry);
      if (!bool(obj["occupied"])) return null;
      const id = str(obj["potion_id"]);
      const name = str(obj["name"], knowledge.potion(id)?.name ?? id);
      const description = knowledge.potion(id)?.description ?? str(obj["description"]);
      return `${name}: ${truncate(description, 70)}`;
    })
    .filter((entry): entry is string => entry !== null);
}

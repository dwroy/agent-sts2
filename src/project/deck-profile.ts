/** The deck in numbers, one line (DeepSeek's facts and run memory). */

import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../mod/schema.js";
import { deckProfile } from "../strategy/card-value.js";
import { deckEntries, deckStats } from "./deck.js";

/** Cards that give lasting Strength (Setup Strike's is gone at the end of the turn). */
const STRENGTH_IDS = new Set(["INFLAME", "DEMON_FORM", "RUPTURE", "SPOT_WEAKNESS", "LIMIT_BREAK", "FLEX"]);

/**
 * The deck in numbers, one line: size and type counts, upgrades, curses/statuses, average cost, lasting
 * Strength sources and code's AOE / block / draw / scaling / damage card counts (card-value.ts).
 */
export function deckProfileLine(state: GameState, knowledge: Knowledge): string {
  const entries = deckEntries(state, knowledge);
  const stats = deckStats(entries);
  const profile = deckProfile(entries);
  const strength = [...new Set(entries.filter((card) => givesStrength(card.card_id, card.description)).map((card) => card.upgraded && !card.name.endsWith("+") ? `${card.name}+` : card.name))];
  return [
    `${stats.total} 张 (攻击 ${stats.attacks}/技能 ${stats.skills}/能力 ${stats.powers}${stats.curses > 0 ? `/诅咒或状态 ${stats.curses}` : ""})`,
    `升级 ${stats.upgraded}`,
    ...(stats.average_cost === null ? [] : [`平均费用 ${stats.average_cost}`]),
    `力量来源 ${strength.length > 0 ? strength.join("、") : "无"}`,
    `AOE ${profile.aoe}`,
    `格挡牌 ${profile.block}`,
    `过牌 ${profile.draw}`,
    `成长 ${profile.scaling}`,
    `伤害牌 ${profile.frontload}`,
  ].join(" | ");
}

function givesStrength(cardId: string, description: string): boolean {
  if (cardId === "SETUP_STRIKE") return false;
  return STRENGTH_IDS.has(cardId) || /\bgains?\s+(?:\d+|X)\s+Strength/i.test(description);
}

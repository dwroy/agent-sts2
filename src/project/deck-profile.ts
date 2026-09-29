/** The deck in numbers, one line (DeepSeek's facts and run memory). */

import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../mod/schema.js";
import { givesLastingStrength } from "../strategy/card-model.js";
import { deckProfile } from "../strategy/card-value.js";
import { asArray, asRecord, num, str } from "../util/json.js";
import { deckEntries, deckStats } from "./deck.js";

/**
 * The deck in numbers, one line: size and type counts, upgrades, curses/statuses, average cost, lasting
 * Strength sources (cards and relics) and code's AOE / block / draw / scaling / damage card counts (card-value.ts).
 */
export function deckProfileLine(state: GameState, knowledge: Knowledge): string {
  const entries = deckEntries(state, knowledge);
  const stats = deckStats(entries);
  const profile = deckProfile(entries);
  const cards = entries
    .filter((card) => isStrengthCard(card.card_id, knowledge, card.description))
    .map((card) => (card.upgraded && !card.name.endsWith("+") ? `${card.name}+` : card.name));
  const strength = [...new Set([...cards, ...strengthRelics(state, knowledge)])];
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

/**
 * Relics that give lasting Strength, from their text (Vajra, Girya, Brimstone, Toasty Mittens, …); Girya
 * with its lifts so far (the relic's stack: RBJ402TKQZ6F 0 → 1/2/3 at the F16/F32/F44 rest sites).
 */
function strengthRelics(state: GameState, knowledge: Knowledge): string[] {
  return asArray(asRecord(state.run?.raw)["relics"]).flatMap((value) => {
    const relic = asRecord(value);
    const id = str(relic["relic_id"]);
    if (!isStrengthRelic(id, knowledge, str(relic["description"]))) return [];
    const name = str(relic["name"], knowledge.relic(id)?.name ?? id);
    return [id === "GIRYA" ? `${name}(锻炼 ${num(relic["stack"])} 次)` : name];
  });
}

/** Whether a deck card gives lasting Strength (the line's 「力量来源」): the game data's template, else the card's own text. */
export function isStrengthCard(cardId: string, knowledge: Knowledge, text = ""): boolean {
  return givesLastingStrength(knowledge.card(cardId)?.descriptionRaw || text);
}

/** Whether a relic gives lasting Strength: its live description, else the game data's. */
export function isStrengthRelic(relicId: string, knowledge: Knowledge, text = ""): boolean {
  return givesLastingStrength(text || knowledge.relic(relicId)?.description || "");
}

/**
 * Every card and relic id in the game data that gives lasting Strength, by the line's own test (the evaluator's
 * "Strength source at the act-1 boss": tools/eval/strength-sources.ts, docs/eval.md). Deck ids carry "+" when
 * upgraded; upgrades are not listed apart.
 */
export function strengthSourceIds(knowledge: Knowledge): { cards: string[]; relics: string[] } {
  const cards = knowledge.cards().filter((card) => isStrengthCard(card.id, knowledge, card.description));
  const relics = knowledge.relics().filter((relic) => isStrengthRelic(relic.id, knowledge));
  return { cards: cards.map((card) => card.id).sort(), relics: relics.map((relic) => relic.id).sort() };
}

/**
 * How much a card is worth adding to *this* deck, 0–100. Code's side of deck building:
 *
 *   base    — community tier (nat1gaming / sts2companion Ironclad lists, v0.111 era; see
 *             notes/research-2026-09-24.md), revised with src/knowledge/ironclad-guide.md (S/A/F
 *             grades); unknown cards default to 45
 *   needs   — what the deck lacks right now: early damage in Act 1, AoE, draw, scaling, block
 *   bloat   — every card dilutes the deck; mediocre cards get worse as it grows
 *   copies  — diminishing returns for duplicates
 *
 * `SKIP_BAR` is the value a card must beat to be worth taking at all. Tuned from run logs.
 */

import type { DeckEntry } from "../project/deck.js";

const TIER: Record<string, number> = {
  // S
  OFFERING: 92, BREAK: 90, FEED: 86,
  // A
  POMMEL_STRIKE: 76, SHRUG_IT_OFF: 76, BATTLE_TRANCE: 78, BLOODLETTING: 68, CORRUPTION: 78, DEMON_FORM: 80,
  IMPERVIOUS: 74, UNMOVABLE: 76, HELLRAISER: 66, THRASH: 80, TEAR_ASUNDER: 68, STOMP: 72, FIEND_FIRE: 68,
  CRIMSON_MANTLE: 72, DOMINATE: 66, BRAND: 66, STOKE: 64, COLOSSUS: 66,
  // B
  // Inflame 68 -> 74: permanent Strength in 50% of Act 1 wins, 27% of losses.
  INFLAME: 74, UPPERCUT: 68, HEMOKINESIS: 64, FLAME_BARRIER: 66, BLUDGEON: 60, TWIN_STRIKE: 58, HEADBUTT: 62,
  SETUP_STRIKE: 62, BURNING_PACT: 64, FEEL_NO_PAIN: 54, DRUM_OF_BATTLE: 30, CONFLAGRATION: 62, BULLY: 56,
  DISMANTLE: 64, EXPECT_A_FIGHT: 56, MANGLE: 35, PYRE: 80, STONE_ARMOR: 60, UNRELENTING: 58, BLOOD_WALL: 54,
  ANGER: 50, PERFECTED_STRIKE: 50, RAMPAGE: 35, SPITE: 52, FORGOTTEN_RITUAL: 54, HOWL_FROM_BEYOND: 60,
  PILLAGE: 54, ONE_TWO_PUNCH: 54, INFERNAL_BLADE: 52, EVIL_EYE: 54, TRUE_GRIT: 54, ARMAMENTS: 48, // its upgrade effect is unmodelled: the solver never plays it for value (WX16, BG4W)
  MOLTEN_FIST: 54, OUTRAGE: 52, RUPTURE: 50, INFERNO: 66, JUGGERNAUT: 56, WHIRLWIND: 66,
  // C
  BREAKTHROUGH: 62, // AoE 9 for 1 energy, 1 HP; 54 -> 62 (1K5G F14 passed it for Taunt, no AoE at the boss)
  IRON_WAVE: 30, BODY_SLAM: 38, THUNDERCLAP: 40, CINDER: 30, DARK_EMBRACE: 42, TREMBLE: 30, SWORD_BOOMERANG: 46,
  TAUNT: 62, SECOND_WIND: 44, RAGE: 42, VICIOUS: 42, CRUELTY: 44, AGGRESSION: 46, STAMPEDE: 44, JUGGLING: 25,
  PACTS_END: 40, BARRICADE: 44, ASHEN_STRIKE: 44, PRIMAL_FORCE: 36, CASCADE: 40, NOT_YET: 44, MIDNIGHT: 36,
  THE_BOMB: 48, // colorless: 40 to every enemy after 3 turns, good in long boss fights (1ZQJ never played it)
  // F
  HAVOC: 20, FIGHT_ME: 25, THE_GAMBIT: 0, BLAZE: 10, DEMONIC_SHIELD: 10, TANK: 5,
};

export const SKIP_BAR = 50;

const AOE = new Set(["INFERNO", "THUNDERCLAP", "BREAKTHROUGH", "STOMP", "CONFLAGRATION", "WHIRLWIND", "HOWL_FROM_BEYOND", "FIEND_FIRE", "SWORD_BOOMERANG"]);
const DRAW = new Set(["POMMEL_STRIKE", "SHRUG_IT_OFF", "BATTLE_TRANCE", "BURNING_PACT", "OFFERING", "DRUM_OF_BATTLE", "PILLAGE"]);
/** Lasting Strength/scaling. Not Setup Strike: its Strength is gone at the end of the turn. */
const SCALING = new Set(["DEMON_FORM", "INFLAME", "CORRUPTION", "FEEL_NO_PAIN", "CRIMSON_MANTLE", "PYRE", "RUPTURE", "BRAND", "DOMINATE", "FEED", "JUGGERNAUT", "HELLRAISER", "UNMOVABLE", "BARRICADE"]);
const FRONTLOAD = new Set(["BREAK", "BLUDGEON", "HEMOKINESIS", "UPPERCUT", "CARNAGE", "TWIN_STRIKE", "POMMEL_STRIKE", "THRASH", "HEADBUTT", "DISMANTLE", "MANGLE", "UNRELENTING", "STOMP", "CONFLAGRATION", "HOWL_FROM_BEYOND", "FEED", "SETUP_STRIKE", "TEAR_ASUNDER", "WHIRLWIND", "RAMPAGE", "MOLTEN_FIST", "CINDER", "FIEND_FIRE"]);
/**
 * Cards that exhaust something (another card, or themselves): what Dark Embrace and Feel No Pain
 * feed on. Z2H3 F12: Dark Embrace (62) over True Grit in a 19-card deck with one exhausting card; it
 * sat in hand four times in the boss fight and was never played. Payoffs (Pact's End, Ashen Strike,
 * Evil Eye) exhaust nothing and do not count.
 */
const EXHAUST = new Set([
  "TRUE_GRIT", "BURNING_PACT", "SECOND_WIND", "FIEND_FIRE", "CORRUPTION", "BRAND", "CINDER", "STOKE", "THRASH", "HAVOC",
  "FEED", "IMPERVIOUS", "DOMINATE", "OFFERING", "MOLTEN_FIST", "INFERNAL_BLADE", "TREMBLE", "NOT_YET", "FORGOTTEN_RITUAL",
]);
/** Exhaust payoffs and their bonus once the deck has at least 3 exhausting cards. */
const EXHAUST_PAYOFF: Record<string, number> = { DARK_EMBRACE: 20, FEEL_NO_PAIN: 10 };

const MULTI_HIT = new Set(["TWIN_STRIKE", "SWORD_BOOMERANG", "CONFLAGRATION", "WHIRLWIND", "THRASH", "FIGHT_ME", "DISMANTLE", "TEAR_ASUNDER", "ANGER", "PUMMEL"]);

/**
 * What each Act boss punishes (from logged boss fights): Vantom has 9 Slippery stacks and 173 HP, so
 * multi-hit and scaling; The Kin is a priest plus followers, so AoE; Ceremonial Beast has 230 HP;
 * Waterfall Giant explodes for its Steam Eruption stacks (15, +3 a turn), so block and a fast kill;
 * Knowledge Demon has 379 HP and heals, so Strength/scaling. `bossId` is the current act's boss.
 */
function bossBonus(cardId: string, bossId: string): { bonus: number; why: string | null } {
  const boss = bossId.toUpperCase();
  if (boss.includes("VANTOM")) {
    if (MULTI_HIT.has(cardId)) return { bonus: 10, why: "multi-hit strips Vantom's Slippery" };
    if (SCALING.has(cardId)) return { bonus: 8, why: "scaling for Vantom's 173 HP" };
  }
  if (boss.includes("KIN")) {
    if (AOE.has(cardId)) return { bonus: 10, why: "AoE for the Kin followers" };
  }
  if (boss.includes("WATERFALL_GIANT")) {
    if (BLOCK.has(cardId)) return { bonus: 6, why: "block for the Waterfall Giant's explosion" };
    if (FRONTLOAD.has(cardId)) return { bonus: 6, why: "a fast kill before the Giant's eruption stacks" };
  }
  if (boss.includes("KNOWLEDGE_DEMON")) {
    if (SCALING.has(cardId)) return { bonus: 6, why: "Strength/scaling for the Knowledge Demon's 379 HP" };
  }
  if (boss.includes("CEREMONIAL") || boss.includes("BEAST")) {
    if (SCALING.has(cardId) || FRONTLOAD.has(cardId)) return { bonus: 6, why: "damage for the Beast's 230 HP" };
  }
  // Soul Fysh shuffles Beckons into the deck (XPA4: 8 in the deck at death): exhaust clears them, damage
  // ends it before they pile up, and Battle Trance draws them (twice in that fight).
  if (boss.includes("SOUL_FYSH")) {
    const BECKON_CLEARERS = new Set(["BURNING_PACT", "PURITY", "FIEND_FIRE", "SECOND_WIND", "BRAND", "STOKE"]);
    if (cardId === "BATTLE_TRANCE") return { bonus: -10, why: "draws Soul Fysh's Beckons" };
    // Only cards that exhaust OTHER chosen cards clear Beckons (K8RK: +8 went to Not Yet, Forgotten
    // Ritual and plain True Grit, which exhaust themselves or at random; Purity went unbought).
    if (BECKON_CLEARERS.has(cardId)) return { bonus: 8, why: "exhausts chosen cards: clears Soul Fysh's Beckons" };
    if (FRONTLOAD.has(cardId)) return { bonus: 6, why: "damage before the Beckons pile up" };
  }
  // The Matriarch sleeps two turns (time to play powers), then it is a 222 HP damage race (1K5G, Z2H3).
  // The Queen: from her third turn on the Amalgam hits 12x3 / 22 under permanent Vulnerable, Weak and
  // Frail; block and early scaling decide it (WY41 F48: 3 block cards, dead on T4; 88HN).
  // Aeonglass: 512 HP with two 33-block turns by T9 and Withers every 6 cards: about 70 damage a turn,
  // few big cards, and a way to exhaust Withers (YVWA/TQX5/Y0KJ: left at 312, 33, 32 of 512).
  if (boss.includes("AEONGLASS")) {
    if (SCALING.has(cardId)) return { bonus: 8, why: "scaling for Aeonglass's 512 HP" };
    if (cardId === "TRUE_GRIT" || cardId === "BURNING_PACT" || cardId === "FIEND_FIRE") return { bonus: 8, why: "exhausts Aeonglass's Withers" };
    if (FRONTLOAD.has(cardId)) return { bonus: 4, why: "big hits: few cards against Withering Presence" };
  }
  if (boss.includes("QUEEN")) {
    if (BLOCK.has(cardId)) return { bonus: 8, why: "block for the Queen's Amalgam hits under Frail" };
    if (SCALING.has(cardId)) return { bonus: 6, why: "early scaling for the Queen's first two turns" };
  }
  if (boss.includes("LAGAVULIN_MATRIARCH")) {
    if (SCALING.has(cardId)) return { bonus: 10, why: "scaling for the Matriarch's sleeping turns" };
    if (FRONTLOAD.has(cardId)) return { bonus: 6, why: "damage for the Matriarch's 222 HP" };
  }
  return { bonus: 0, why: null };
}

/** Whether a card is one of the deck's block cards (Defends count too). */
export function isBlockCardId(cardId: string): boolean {
  return BLOCK.has(cardId) || cardId.startsWith("DEFEND_");
}

const BLOCK = new Set(["SHRUG_IT_OFF", "FLAME_BARRIER", "IMPERVIOUS", "COLOSSUS", "BLOOD_WALL", "TRUE_GRIT", "EVIL_EYE", "EXPECT_A_FIGHT", "STONE_ARMOR", "CRIMSON_MANTLE", "FEEL_NO_PAIN", "TAUNT", "IRON_WAVE"]);

export interface CardValue {
  value: number;
  reasons: string[];
}

export interface DeckProfile {
  size: number;
  aoe: number;
  draw: number;
  scaling: number;
  frontload: number;
  block: number;
  /** Cards that exhaust something (EXHAUST). */
  exhaust: number;
  basics: number;
  copies: Map<string, number>;
}

export function deckProfile(deck: DeckEntry[]): DeckProfile {
  const copies = new Map<string, number>();
  let aoe = 0;
  let draw = 0;
  let scaling = 0;
  let frontload = 0;
  let block = 0;
  let exhaust = 0;
  let basics = 0;
  for (const card of deck) {
    copies.set(card.card_id, (copies.get(card.card_id) ?? 0) + 1);
    if (AOE.has(card.card_id)) aoe += 1;
    if (DRAW.has(card.card_id)) draw += 1;
    if (SCALING.has(card.card_id) && card.card_id !== "SETUP_STRIKE") scaling += 1;
    if (FRONTLOAD.has(card.card_id)) frontload += 1;
    if (BLOCK.has(card.card_id)) block += 1;
    if (EXHAUST.has(card.card_id)) exhaust += 1;
    if (card.rarity === "Basic") basics += 1;
  }
  return { size: deck.length, aoe, draw, scaling, frontload, block, exhaust, basics, copies };
}

export function cardValue(
  cardId: string,
  rarity: string,
  type: string,
  deck: DeckProfile,
  act: number,
  floor: number,
  bossId = "",
  relics: readonly string[] = [],
): CardValue {
  const reasons: string[] = [];
  let value = TIER[cardId] ?? (type === "Curse" || type === "Status" ? 0 : rarity === "Rare" ? 55 : 45);
  if (!(cardId in TIER)) reasons.push("no tier data");

  // Early Act 1: the deck has to kill hallway fights and the first elite fast.
  if (act <= 1 && FRONTLOAD.has(cardId) && deck.frontload < 3) {
    value += 12;
    reasons.push("Act 1 needs damage");
  }
  // AoE: 81% of Act 1 wins had at least one by the boss, 47% of losses.
  if (AOE.has(cardId) && deck.aoe === 0) {
    value += 14;
    reasons.push("no AoE yet");
  }
  if (DRAW.has(cardId) && deck.draw < 2) {
    value += 5;
    reasons.push("little draw");
  }
  // From floor 4, not 8: Demon Form was in 6 Act 1 wins and 0 losses.
  if (SCALING.has(cardId) && deck.scaling === 0 && (act >= 2 || floor >= 4)) {
    value += 10;
    reasons.push("no scaling for bosses");
  }
  if (BLOCK.has(cardId) && deck.block < 2 && floor >= 5) {
    value += 5;
    reasons.push("thin on block");
  }
  const payoff = EXHAUST_PAYOFF[cardId];
  if (payoff !== undefined && (deck.exhaust >= 3 || relics.includes("TOASTY_MITTENS"))) {
    value += payoff;
    reasons.push(deck.exhaust >= 3 ? `${deck.exhaust} exhausting cards to feed it` : "Baking Gloves exhaust every turn");
  }
  // Relic synergies found on live runs: Baking Gloves (TOASTY_MITTENS) exhaust a card every turn, so
  // Howl from Beyond replays itself each turn and Evil Eye always gets its bonus block.
  if (relics.includes("TOASTY_MITTENS") && (cardId === "HOWL_FROM_BEYOND" || cardId === "EVIL_EYE")) {
    value += 25;
    reasons.push("Baking Gloves synergy");
  }
  // Fiddle: no mid-turn draw, so cards valued for their draw lose that value.
  if (relics.includes("FIDDLE") && DRAW.has(cardId)) {
    value -= 15;
    reasons.push("Fiddle: no mid-turn draw");
  }
  const boss = bossBonus(cardId, bossId);
  if (boss.bonus !== 0) {
    value += boss.bonus;
    reasons.push(boss.why ?? "boss");
  }
  const copies = deck.copies.get(cardId) ?? 0;
  if (copies > 0) {
    // Strength powers stack, so a second copy is still good; other powers mostly do not.
    const stacks = cardId === "INFLAME" || cardId === "DEMON_FORM";
    const penalty = type === "Power" && !stacks ? 18 * copies : 6 * copies;
    value -= penalty;
    reasons.push(`already have ${copies}`);
  }
  // Bloat: past 22 cards a middling card makes the good ones rarer. (The guide targets 20–28 cards;
  // starting at 18 pushed every Act 2 offer under SKIP_BAR and 0NG took no card in Act 2.)
  if (deck.size > 22 && value < 70) {
    value -= Math.min(15, (deck.size - 22) * 1.5);
    reasons.push(`deck is ${deck.size} cards`);
  }
  return { value: Math.round(value), reasons };
}

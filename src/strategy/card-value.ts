/**
 * How much a card is worth adding to *this* deck, 0–100. Code's side of deck building:
 *
 *   base    — community tier (nat1gaming / sts2companion Ironclad lists, v0.111 era; see
 *             notes/research-2026-09-24.md), unknown cards default to 45
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
  POMMEL_STRIKE: 76, SHRUG_IT_OFF: 76, BATTLE_TRANCE: 72, BLOODLETTING: 68, CORRUPTION: 74, DEMON_FORM: 76,
  IMPERVIOUS: 74, UNMOVABLE: 66, HELLRAISER: 66, THRASH: 72, TEAR_ASUNDER: 68, STOMP: 72, FIEND_FIRE: 68,
  CRIMSON_MANTLE: 72, DOMINATE: 66, BRAND: 66, STOKE: 64, COLOSSUS: 66,
  // B
  INFLAME: 64, UPPERCUT: 66, HEMOKINESIS: 64, FLAME_BARRIER: 66, BLUDGEON: 60, TWIN_STRIKE: 58, HEADBUTT: 56,
  SETUP_STRIKE: 56, BURNING_PACT: 60, FEEL_NO_PAIN: 62, DRUM_OF_BATTLE: 58, CONFLAGRATION: 62, BULLY: 56,
  DISMANTLE: 60, EXPECT_A_FIGHT: 56, MANGLE: 60, PYRE: 64, STONE_ARMOR: 60, UNRELENTING: 58, BLOOD_WALL: 54,
  ANGER: 50, PERFECTED_STRIKE: 50, RAMPAGE: 56, SPITE: 52, FORGOTTEN_RITUAL: 54, HOWL_FROM_BEYOND: 60,
  PILLAGE: 54, ONE_TWO_PUNCH: 54, INFERNAL_BLADE: 52, EVIL_EYE: 54, TRUE_GRIT: 54, ARMAMENTS: 54,
  MOLTEN_FIST: 54, OUTRAGE: 52, RUPTURE: 50, INFERNO: 54, JUGGERNAUT: 56, WHIRLWIND: 60,
  // C
  BREAKTHROUGH: 54, // AoE 9 for 1 energy, 1 HP
  IRON_WAVE: 42, BODY_SLAM: 38, THUNDERCLAP: 44, CINDER: 40, DARK_EMBRACE: 42, TREMBLE: 40, SWORD_BOOMERANG: 46,
  TAUNT: 46, SECOND_WIND: 44, RAGE: 42, VICIOUS: 42, CRUELTY: 44, AGGRESSION: 46, STAMPEDE: 44, JUGGLING: 40,
  PACTS_END: 40, BARRICADE: 44, ASHEN_STRIKE: 44, PRIMAL_FORCE: 36, CASCADE: 40, NOT_YET: 44, MIDNIGHT: 36,
  // F
  HAVOC: 20, BLAZE: 10, DEMONIC_SHIELD: 10, TANK: 5,
};

export const SKIP_BAR = 50;

const AOE = new Set(["THUNDERCLAP", "BREAKTHROUGH", "STOMP", "CONFLAGRATION", "WHIRLWIND", "HOWL_FROM_BEYOND", "FIEND_FIRE", "SWORD_BOOMERANG"]);
const DRAW = new Set(["POMMEL_STRIKE", "SHRUG_IT_OFF", "BATTLE_TRANCE", "BURNING_PACT", "OFFERING", "DRUM_OF_BATTLE", "PILLAGE", "DARK_EMBRACE"]);
const SCALING = new Set(["DEMON_FORM", "INFLAME", "CORRUPTION", "FEEL_NO_PAIN", "CRIMSON_MANTLE", "PYRE", "RUPTURE", "BRAND", "DOMINATE", "FEED", "JUGGERNAUT", "HELLRAISER", "UNMOVABLE", "BARRICADE"]);
const FRONTLOAD = new Set(["BREAK", "BLUDGEON", "HEMOKINESIS", "UPPERCUT", "CARNAGE", "TWIN_STRIKE", "POMMEL_STRIKE", "THRASH", "HEADBUTT", "DISMANTLE", "MANGLE", "UNRELENTING", "STOMP", "CONFLAGRATION", "HOWL_FROM_BEYOND", "FEED", "SETUP_STRIKE", "TEAR_ASUNDER", "WHIRLWIND", "RAMPAGE", "MOLTEN_FIST", "CINDER", "FIEND_FIRE"]);
const MULTI_HIT = new Set(["TWIN_STRIKE", "SWORD_BOOMERANG", "CONFLAGRATION", "WHIRLWIND", "THRASH", "FIGHT_ME", "DISMANTLE", "TEAR_ASUNDER", "ANGER", "PUMMEL"]);

/**
 * What each Act boss punishes (from logged boss fights): Vantom has 9 Slippery stacks and 173 HP, so
 * multi-hit and scaling; The Kin is a priest plus followers, so AoE; Ceremonial Beast has 230 HP.
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
  if (boss.includes("CEREMONIAL") || boss.includes("BEAST")) {
    if (SCALING.has(cardId) || FRONTLOAD.has(cardId)) return { bonus: 6, why: "damage for the Beast's 230 HP" };
  }
  return { bonus: 0, why: null };
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
  let basics = 0;
  for (const card of deck) {
    copies.set(card.card_id, (copies.get(card.card_id) ?? 0) + 1);
    if (AOE.has(card.card_id)) aoe += 1;
    if (DRAW.has(card.card_id)) draw += 1;
    if (SCALING.has(card.card_id)) scaling += 1;
    if (FRONTLOAD.has(card.card_id)) frontload += 1;
    if (BLOCK.has(card.card_id)) block += 1;
    if (card.rarity === "Basic") basics += 1;
  }
  return { size: deck.length, aoe, draw, scaling, frontload, block, basics, copies };
}

export function cardValue(cardId: string, rarity: string, type: string, deck: DeckProfile, act: number, floor: number, bossId = ""): CardValue {
  const reasons: string[] = [];
  let value = TIER[cardId] ?? (type === "Curse" || type === "Status" ? 0 : rarity === "Rare" ? 55 : 45);
  if (!(cardId in TIER)) reasons.push("no tier data");

  // Early Act 1: the deck has to kill hallway fights and the first elite fast.
  if (act <= 1 && FRONTLOAD.has(cardId) && deck.frontload < 3) {
    value += 12;
    reasons.push("Act 1 needs damage");
  }
  if (AOE.has(cardId) && deck.aoe === 0) {
    value += 8;
    reasons.push("no AoE yet");
  }
  if (DRAW.has(cardId) && deck.draw < 2) {
    value += 5;
    reasons.push("little draw");
  }
  if (SCALING.has(cardId) && deck.scaling === 0 && (act >= 2 || floor >= 8)) {
    value += 10;
    reasons.push("no scaling for bosses");
  }
  if (BLOCK.has(cardId) && deck.block < 2 && floor >= 5) {
    value += 5;
    reasons.push("thin on block");
  }
  const boss = bossBonus(cardId, bossId);
  if (boss.bonus > 0) {
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
  // Bloat: past 18 cards a middling card makes the good ones rarer.
  if (deck.size > 18 && value < 70) {
    value -= Math.min(15, (deck.size - 18) * 1.5);
    reasons.push(`deck is ${deck.size} cards`);
  }
  return { value: Math.round(value), reasons };
}

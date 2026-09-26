/**
 * Boss clock: how much damage a turn the act boss needs, and a rough estimate of what the deck deals.
 *
 * Why: at A7 most runs reached the act-2 boss at full HP and lost the race (24HM 24.9 a turn of 33.5
 * needed, WLY1 21.6 into the crab's 408 HP, GGF8 20.3, SM9H 30.6 of ~44). Card rewards, shops and rest
 * sites never asked whether the deck could kill the boss in time, and DeepSeek's run plan only saw the
 * boss id. The estimate feeds a card-value bonus for damage cards while the deck is short, a smith
 * preference at rest sites, and the run plan's input.
 */

import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../mod/schema.js";
import { asArray, asRecord, num, str, type JsonValue } from "../util/json.js";
import { modelHandCard } from "./card-model.js";
import { damageRole, isBigHit } from "./card-value.js";

export interface BossNeed {
  /** Total HP to chew through (both claws for the crab). */
  hp: number;
  /** Turns a fight can reasonably last before the boss's script kills us. */
  turns: number;
  note: string;
}

/**
 * From the logged fights (lessons.md): HP, and the turn count the winners and near-misses managed.
 * Keys match a substring of run.boss_id.
 */
export const BOSS_NEEDS: Record<string, BossNeed> = {
  // The two wins took 7-8 turns (58 and 51 a turn); the Bug Sting -> Laser opener ends longer fights
  // (GL2U: "gap 0" at 12 turns, 31.7 a turn was not enough).
  KAISER_CRAB: { hp: 408, turns: 8, note: "two claws, kill both in one turn; Bug Sting then Laser from T3-T4; a claw killed alone enrages the other" },
  KNOWLEDGE_DEMON: { hp: 379, turns: 9, note: "heals, curses the deck every few turns; Strength scaling wins" },
  THE_INSATIABLE: { hp: 321, turns: 7, note: "Sandpit starts at 4, eaten at 0; each Frantic Escape adds a turn" },
  // 512 HP plus two 33-block Ebb turns, and no loss lived past T8 (L34T: 48 a turn, left at 173).
  AEONGLASS: { hp: 578, turns: 8, note: "Artifact 3 at start; Ebb gains 33 block every 3rd turn; a Wither every 6 cards played: few big cards" },
  QUEEN: { hp: 350, turns: 8, note: "from her third turn the Amalgam hits 12x3/22 under Vulnerable, Weak and Frail" },
  // Three phases, ~100 + 200 + 300 HP (7DFB F48: phase 2 at 27/200 on T7 with phase 3 still to come).
  TEST_SUBJECT: { hp: 600, turns: 14, note: "three phases (~100/200/300 HP); Painful Stabs Wounds on unblocked hits; Multi Claw grows each use" },
  LAGAVULIN_MATRIARCH: { hp: 222, turns: 12, note: "sleeps two turns (play powers), then drains Strength/Dexterity" },
  SOUL_FYSH: { hp: 211, turns: 9, note: "shuffles Beckons into the deck, Intangible turns" },
  THE_KIN: { hp: 307, turns: 10, note: "priest 190 plus two followers ~59: AoE" },
  VANTOM: { hp: 173, turns: 8, note: "9 Slippery stacks: multi-hit" },
  WATERFALL_GIANT: { hp: 260, turns: 11, note: "240 HP plus two Siphon heals; Pressure Gun on T5/T10/T15: block it fully; Steam Eruption explodes for its stacks" },
  // 252 HP at A7 (RAWT, 8LQG); fights run ~13 turns with the Ringing one-card turns.
  CEREMONIAL_BEAST: { hp: 252, turns: 13, note: "stunned when HP first drops to 150; Ringing turns allow one card: keep block potions for them" },
};

export function bossNeed(bossId: string): (BossNeed & { id: string; perTurn: number }) | null {
  const upper = bossId.toUpperCase();
  const key = Object.keys(BOSS_NEEDS).find((id) => upper.includes(id));
  if (!key) return null;
  const need = BOSS_NEEDS[key]!;
  return { ...need, id: key, perTurn: Math.round(need.hp / need.turns) };
}

/** Relics that give 1 energy on (almost) every turn. */
const ENERGY_RELICS = new Set([
  "BLESSED_ANTLER", "BLOOD_SOAKED_ROSE", "BREAD", "ECTOPLASM", "PAELS_FLESH", "PHILOSOPHERS_STONE", "PRISMATIC_GEM",
  "PUMPKIN_CANDLE", "SOZU", "SPIKED_GAUNTLETS", "VELVET_CHOKER", "WHISPERING_EARRING",
]);
/** Cards drawn a turn (no draw cards counted: this is a floor, not a ceiling). */
const HAND = 5;
/**
 * The count above misses draw, relics, potions and powers played mid-fight: on nine logged act-2 boss
 * fights (A7, 09-26) it read on average ~40% below the damage a turn actually dealt. A rough estimate.
 */
export const ESTIMATE_SCALE = 1.4;
/** Damage multiplier with two or more Vulnerable sources in the deck. */
const VULNERABLE_UPTIME = 1.2;
/** Average Strength over a boss fight from one Demon Form (+2 a turn from turn 2, over ~9 turns). */
const DEMON_FORM_STRENGTH = 7;

/**
 * Rough damage a turn of the deck in a boss fight: the average attack damage per card drawn, limited
 * by energy, plus permanent Strength times the attacks played. AoE counts double into the crab.
 */
export function deckDamagePerTurn(state: GameState, knowledge: Knowledge): number {
  const run = asRecord(state.run?.raw);
  // The model takes the type from the game data; the deck entry's own card_type covers unknown ids.
  const cards = asArray(run["deck"]).map((entry, index) => {
    const model = modelHandCard(entry, index, knowledge);
    return model.type ? model : { ...model, type: str(asRecord(entry)["card_type"]) };
  });
  if (cards.length === 0) return 0;
  const crab = str(run["boss_id"]).toUpperCase().includes("KAISER_CRAB");
  // max_energy leaves out the relics that add energy every turn (7DFB: 3 shown with Pael's Flesh and
  // Blessed Antler).
  const relicIds = asArray(run["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  const energy = Math.max(3, num(run["max_energy"]) || 3) + relicIds.filter((id) => ENERGY_RELICS.has(id)).length;
  let damage = 0;
  let cost = 0;
  let attacks = 0;
  let strength = 0;
  let vulnerable = 0;
  for (const card of cards) {
    // Deck entries carry no "playable" flag (that is a hand-card field): Curses, Statuses and
    // unplayable cards (cost -1) are the ones that never play.
    const playable = card.type !== "Curse" && card.type !== "Status" && (card.xCost || card.cost >= 0);
    if (!playable) continue;
    const cardCost = card.xCost ? energy : Math.max(0, card.cost);
    cost += cardCost;
    if (card.type === "Attack") {
      attacks += 1;
      damage += (card.damage ?? 0) * Math.max(1, card.hits) * (crab && card.target === "all" ? 2 : 1);
    }
    strength += card.cardId === "DEMON_FORM" ? DEMON_FORM_STRENGTH : Math.max(0, card.strength);
    if (card.vulnerable > 0) vulnerable += 1;
  }
  const n = cards.length;
  // Energy caps how many of the drawn cards get played.
  const playedShare = Math.min(1, energy / Math.max(1, (HAND * cost) / n));
  const attacksPlayed = HAND * (attacks / n) * playedShare;
  const base = HAND * (damage / n) * playedShare + strength * attacksPlayed;
  // Two Vulnerable sources keep the boss Vulnerable most turns.
  return Math.round(base * (vulnerable >= 2 ? VULNERABLE_UPTIME : 1) * ESTIMATE_SCALE);
}

export interface DamageGap {
  boss: string;
  need: number;
  deck: number;
  /** Damage a turn the deck is short (0 when it is not). */
  gap: number;
}

export function damageGap(state: GameState, knowledge: Knowledge): DamageGap | null {
  // On a boss floor the boss id is the one just killed; the next act's is not known yet (7DFB F33:
  // Dominate valued against the dead crab's numbers).
  if (BOSS_FLOORS.includes(state.run?.floor ?? 0)) return null;
  const need = bossNeed(str(asRecord(state.run?.raw)["boss_id"]));
  if (!need) return null;
  const deck = deckDamagePerTurn(state, knowledge);
  return { boss: need.id, need: need.perTurn, deck, gap: Math.max(0, need.perTurn - deck) };
}

const BOSS_FLOORS = [17, 33, 48];

/** Largest card-value bonus a damage card gets from the gap. */
export const GAP_BONUS_MAX = 12;

/** Card-value bonus for a damage card (scaling, frontload, AoE into the crab) while the deck is short. */
export function gapCardBonus(gap: DamageGap | null, cardId: string): { bonus: number; why: string | null } {
  if (!gap || gap.gap <= 0) return { bonus: 0, why: null };
  const role = damageRole(cardId);
  if (!role || (role === "aoe" && gap.boss !== "KAISER_CRAB" && gap.boss !== "THE_KIN")) return { bonus: 0, why: null };
  // Against Aeonglass small attacks feed Withering Presence: the gap counts only scaling and big hits.
  if (gap.boss === "AEONGLASS" && role === "frontload" && !isBigHit(cardId)) return { bonus: 0, why: null };
  const bonus = Math.min(GAP_BONUS_MAX, Math.round(gap.gap * 0.4) + (role === "scaling" ? 2 : 0));
  return { bonus, why: `deck ~${gap.deck}/turn of ${gap.need} for ${gap.boss}: ${role} +${bonus}` };
}

/** Rest-site shift: smith over a comfortable heal while the deck is well short of the boss. */
export function gapRestShift(gap: DamageGap | null, option: string, hpPct: number, beforeBoss: boolean): number {
  if (!gap || gap.gap < 8 || beforeBoss || hpPct < 0.65) return 0;
  return option === "SMITH" ? 2 : 0;
}

/** The run plan's view of the act boss and the deck's damage. */
export function bossClockJson(state: GameState, knowledge: Knowledge): Record<string, JsonValue> | null {
  const bossId = str(asRecord(state.run?.raw)["boss_id"]);
  const need = bossNeed(bossId);
  if (!need) return null;
  const deck = deckDamagePerTurn(state, knowledge);
  return {
    boss: need.id,
    boss_hp: need.hp,
    fight_turns: need.turns,
    need_damage_per_turn: need.perTurn,
    deck_damage_per_turn_estimate: deck,
    estimate_note: "rough: cards, Strength and Vulnerable only; no draw, relics or potions",
    gap_per_turn: Math.max(0, need.perTurn - deck),
    boss_note: need.note,
  };
}

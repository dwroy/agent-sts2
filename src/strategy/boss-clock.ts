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
import { awakeDamagePerTurn } from "../knowledge/move-model.js";
import { modelHandCard } from "./card-model.js";
import { damageRole, isBigHit } from "./card-value.js";

export interface BossNeed {
  /** Total HP to chew through (both claws for the crab), at A7 and below. */
  hp: number;
  /** The same at A8 and above (states.jsonl max_hp; heals and block turns added as for hp). */
  hpA8: number;
  /** Turns a fight can reasonably last before the boss's script kills us. */
  turns: number;
  note: string;
  /**
   * Share of the deck estimate the boss lets through, measured (default 1): Soul Fysh's Beckons and
   * Intangible turns (JF8N F17: estimate ~20, dealt 13.5), the Queen's 99 Weak from T3 and the chained
   * cards (H7W0 F48: ~39, dealt 27.5; CWU9 26.7).
   */
  realised?: number;
}

/** Ascension from which bosses have their A8 HP. */
export const BOSS_HP_ASCENSION = 8;

/**
 * From the logged fights (lessons.md): HP, and the turn count the winners and near-misses managed.
 * Keys match a substring of run.boss_id. A8 HP from the A8 ablation's states (XWPV, WB02, YNMB, CWU9,
 * 90JG, 7048, N28L): the A7 numbers read the gap 2-10 a turn short (WB02 F31: "321 in clock").
 */
export const BOSS_NEEDS: Record<string, BossNeed> = {
  // The two wins took 7-8 turns (58 and 51 a turn); the Bug Sting -> Laser opener ends longer fights
  // (GL2U: "gap 0" at 12 turns, 31.7 a turn was not enough).
  KAISER_CRAB: { hp: 408, hpA8: 428, turns: 8, note: "two claws, kill both in one turn; Bug Sting then Laser from T3-T4; a claw killed alone enrages the other" },
  // 379 HP (399 at A8) plus two 30-HP Ponder heals (T4, T8) (P0AT: 21 a turn, left at 206; 5BXM A8).
  KNOWLEDGE_DEMON: { hp: 439, hpA8: 459, turns: 9, note: "heals, curses the deck every few turns; Strength scaling wins" },
  // 341 at A8 (XWPV, WB02 states).
  THE_INSATIABLE: { hp: 321, hpA8: 341, turns: 7, note: "Sandpit starts at 4, eaten at 0; each Frantic Escape adds a turn" },
  // 512 HP plus two 33-block Ebb turns, and no loss lived past T8 (L34T: 48 a turn, left at 173).
  // 535 at A8 plus two 33-block Ebbs (M6P7: 33 a turn, left at 234).
  AEONGLASS: { hp: 578, hpA8: 601, turns: 8, note: "Artifact 3 at start; Ebb gains 33 block every 3rd turn; a Wither every 6 cards played: few big cards" },
  // Queen 400 + Amalgam 199 at A7, plus 20 Queen block a turn while the Amalgam lives; wins took 9-12
  // turns (P2E4: 47.5 a turn, Queen left at 219). A8: Queen 419 (CWU9), ~69 a turn.
  QUEEN: { hp: 640, hpA8: 690, turns: 10, realised: 0.75, note: "kill the Torch Head Amalgam first: from her third turn it hits 12x3/22 under Vulnerable, Weak and Frail while the Queen only buffs" },
  // Three phases, ~100 + 200 + 300 HP (7DFB F48: phase 2 at 27/200 on T7 with phase 3 still to come).
  TEST_SUBJECT: { hp: 600, hpA8: 630, turns: 14, note: "three phases (~100/200/300 HP); Painful Stabs Wounds on unblocked hits; Multi Claw grows each use" },
  // 233 at A8 (N28L).
  LAGAVULIN_MATRIARCH: { hp: 222, hpA8: 233, turns: 12, note: "sleeps two turns (play powers), then drains Strength/Dexterity" },
  // 221 at A8 (BUUY, VL2D).
  SOUL_FYSH: { hp: 211, hpA8: 221, turns: 9, realised: 0.65, note: "shuffles Beckons into the deck, Intangible turns" },
  // Priest 199 at A8 (WYF0).
  THE_KIN: { hp: 307, hpA8: 322, turns: 10, note: "priest 190 (199 at A8) plus two followers ~59: AoE; the fight ends when the priest dies; priest cycle Orb of Frailty, Orb of Weakness, Beam 3x(3+Strength) on T3/T7/T11, Ritual (+Strength): be above the T11 Beam (~21)" },
  // 183 at A8 (XWPV, YNMB, RC9A).
  VANTOM: { hp: 173, hpA8: 183, turns: 8, note: "9 Slippery stacks: multi-hit" },
  // 250 at A8 plus two Siphon heals (7048: ~280 dealt over 10 turns).
  WATERFALL_GIANT: { hp: 260, hpA8: 280, turns: 11, note: "240 HP (250 at A8) plus two Siphon heals; Pressure Gun on T5/T10/T15: block it fully; Steam Eruption explodes for its stacks" },
  // 252 HP at A7 (RAWT, 8LQG), 262 at A8 (90JG); fights run ~13 turns with the Ringing one-card turns.
  CEREMONIAL_BEAST: { hp: 252, hpA8: 262, turns: 13, note: "stunned when HP first drops to 150; Ringing turns allow one card: keep block potions for them" },
};

export function bossNeed(bossId: string, ascension = 0): (BossNeed & { id: string; perTurn: number }) | null {
  const upper = bossId.toUpperCase();
  const key = Object.keys(BOSS_NEEDS).find((id) => upper.includes(id));
  if (!key) return null;
  const entry = BOSS_NEEDS[key]!;
  const need = { ...entry, hp: ascension >= BOSS_HP_ASCENSION ? entry.hpA8 : entry.hp };
  return { ...need, id: key, perTurn: Math.round(need.hp / need.turns) };
}

/** Relics that give 1 energy on (almost) every turn. */
const ENERGY_RELICS = new Set([
  "BLESSED_ANTLER", "BLOOD_SOAKED_ROSE", "BREAD", "ECTOPLASM", "PAELS_FLESH", "PHILOSOPHERS_STONE", "PRISMATIC_GEM",
  "PUMPKIN_CANDLE", "SOZU", "SPIKED_GAUNTLETS", "VELVET_CHOKER", "WHISPERING_EARRING",
  // +1 energy a turn, not in max_energy (KFPC F18-F28: clock read ~19-22 of 49, the boss took 38.4 a turn).
  "SEAL_OF_GOLD",
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
/**
 * The turn a power (or any one card) is expected to be played: half a pass through the deck at HAND
 * cards a turn, plus the turn it is drawn on (28 cards: ~T4). M9PL F33: Demon Form counted as up from
 * T1 read the deck at 53 a turn for the crab; drawn T3 without the energy, played T5, the fight dealt
 * 24.5 a turn. WB02 F31: Inflame counted from T1, 37 read against 20 dealt.
 */
export function expectedPlayTurn(deckSize: number): number {
  return deckSize / HAND / 2 + 1;
}

/**
 * Strength a turn, averaged over a boss fight of `turns` turns, from a power played on `playTurn`:
 * a one-off (Inflame) holds its amount from the next turn on; a per-turn one (Demon Form) adds its
 * amount at the start of each later turn (1, 2, 3... times it). Only the clock's turns count.
 */
export function averagePowerStrength(amount: number, perTurn: boolean, playTurn: number, turns: number): number {
  const up = Math.max(0, turns - playTurn);
  if (turns <= 0 || up <= 0) return 0;
  return perTurn ? (amount * up * (up + 1)) / 2 / turns : (amount * up) / turns;
}

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
  const need = bossNeed(str(run["boss_id"]));
  const turns = need?.turns ?? 9;
  const playTurn = expectedPlayTurn(cards.length);
  let energyBonus = 0;
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
    // Spiked Gauntlets: powers cost 1 more (G1Z0: Demon Form at 4, never played).
    const cardCost = card.xCost ? energy : Math.max(0, card.cost) + (card.type === "Power" && relicIds.includes("SPIKED_GAUNTLETS") ? 1 : 0);
    cost += cardCost;
    if (card.type === "Attack") {
      attacks += 1;
      damage += (card.damage ?? 0) * Math.max(1, card.hits) * (crab && card.target === "all" ? 2 : 1);
    }
    // Demon Form: StrengthPower is its per-turn amount (3, 4 upgraded).
    strength += averagePowerStrength(Math.max(0, card.strength), card.cardId === "DEMON_FORM", playTurn, turns);
    // Pyre: its Energy (1, 2 upgraded: states.jsonl) at the start of each turn once it is up (T86W:
    // card-value counted it as Strength).
    if (card.cardId === "PYRE") energyBonus += averagePowerStrength(card.upgraded ? 2 : 1, false, playTurn, turns);
    if (card.vulnerable > 0) vulnerable += 1;
  }
  // Strength that grows every turn (XWPV F48: 1 on T1, 19 on T11; the run plans read a 48 gap, the deck
  // dealt 41.6 a turn and 92 on T8-T10): Toasty Mittens +1 a turn from T1, i.e. (turns+1)/2 on average;
  // Rupture fed by a self-damage power every turn (Crimson Mantle, Inferno) from when both are up,
  // counted from T3: (turns-2)/2.
  if (relicIds.includes("TOASTY_MITTENS")) strength += (turns + 1) / 2;
  const deckIds = new Set(cards.map((card) => card.cardId));
  if (deckIds.has("RUPTURE") && (deckIds.has("CRIMSON_MANTLE") || deckIds.has("INFERNO"))) strength += Math.max(0, (turns - 2) / 2);
  const n = cards.length;
  // Energy caps how many of the drawn cards get played.
  const playedShare = Math.min(1, (energy + energyBonus) / Math.max(1, (HAND * cost) / n));
  const attacksPlayed = HAND * (attacks / n) * playedShare;
  const base = HAND * (damage / n) * playedShare + strength * attacksPlayed;
  // Two Vulnerable sources keep the boss Vulnerable most turns.
  // A boss that starts with Artifact eats the Vulnerable (G1Z0: Aeonglass, estimate 58, dealt 34).
  const artifactBoss = str(run["boss_id"]).toUpperCase().includes("AEONGLASS");
  return Math.round((base * (vulnerable >= 2 && !artifactBoss ? VULNERABLE_UPTIME : 1) * ESTIMATE_SCALE + relicDamagePerTurn(relicIds, turns, crab)) * (need?.realised ?? 1));
}

/**
 * Rough block a turn of the deck: block per card drawn, limited by energy like deckDamagePerTurn, with
 * the same ESTIMATE_SCALE for draw and powers the count misses (HCBJ F17: ~5.6 against ~8 realised, the
 * Matriarch's ~14.8 a turn less 6.8 lost).
 */
export function deckBlockPerTurn(state: GameState, knowledge: Knowledge): number {
  const run = asRecord(state.run?.raw);
  const cards = asArray(run["deck"]).map((entry, index) => modelHandCard(entry, index, knowledge));
  if (cards.length === 0) return 0;
  const relicIds = asArray(run["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  const energy = Math.max(3, num(run["max_energy"]) || 3) + relicIds.filter((id) => ENERGY_RELICS.has(id)).length;
  let block = 0;
  let cost = 0;
  for (const card of cards) {
    const playable = card.type !== "Curse" && card.type !== "Status" && (card.xCost || card.cost >= 0);
    if (!playable) continue;
    cost += card.xCost ? energy : Math.max(0, card.cost);
    block += card.block;
  }
  const n = cards.length;
  const playedShare = Math.min(1, energy / Math.max(1, (HAND * cost) / n));
  return Math.round(HAND * (block / n) * playedShare * ESTIMATE_SCALE * 10) / 10;
}

/** HP fraction the clock assumes the boss is entered with before its last floor: the run plans' usual entry_hp target. */
export const ASSUMED_ENTRY_HP = 0.85;

/**
 * Turns we can stay alive in the boss fight: its sleep turns plus entry HP over the net hit a turn
 * (the move model's awake average less the deck's block a turn, at least 1). Null when the boss's moves
 * are not modelled. HCBJ F17: the clock assumed 12 turns for the Matriarch; 52 HP against ~14.8 a turn
 * and ~7 block lasted to T9 (3 asleep + 6 awake).
 */
export function survivableBossTurns(bossId: string, entryHp: number, blockPerTurn: number): number | null {
  const damage = awakeDamagePerTurn(bossId);
  if (!damage || entryHp <= 0) return null;
  return damage.sleepTurns + entryHp / Math.max(1, damage.perTurn - blockPerTurn);
}

/** HP the boss will likely be entered with: current HP on the floor before it, else at least the assumed target. */
export function clockEntryHp(state: GameState): number {
  const hp = state.run?.current_hp ?? 0;
  const max = state.run?.max_hp ?? 0;
  const bossNext = BOSS_FLOORS.includes((state.run?.floor ?? 0) + 1);
  return bossNext ? hp : Math.max(hp, Math.round(ASSUMED_ENTRY_HP * max));
}

/**
 * The boss's need with its turns capped by the turns we can survive from the expected entry HP; the
 * damage a turn follows (HCBJ F16: gap 1 at 12 turns read "trade HP for damage"; at ~9 turns it is ~7).
 */
export function cappedBossNeed(state: GameState, knowledge: Knowledge): (ReturnType<typeof bossNeed> & object) & { survivableTurns: number | null; entryHp: number } | null {
  const need = bossNeed(str(asRecord(state.run?.raw)["boss_id"]), state.run?.ascension ?? 0);
  if (!need) return null;
  const entryHp = clockEntryHp(state);
  const survivable = survivableBossTurns(need.id, entryHp, deckBlockPerTurn(state, knowledge));
  if (survivable === null || survivable >= need.turns) return { ...need, survivableTurns: survivable === null ? null : Math.round(survivable * 10) / 10, entryHp };
  const turns = Math.max(1, survivable);
  return { ...need, turns: Math.round(turns * 10) / 10, perTurn: Math.round(need.hp / turns), survivableTurns: Math.round(survivable * 10) / 10, entryHp };
}

/** Mercury Hourglass: 3 to every enemy at the start of each turn (same number as the solver's). */
const HOURGLASS_DAMAGE = 3;
/** Festive Popper: once at the start of each fight (EJXC F33: ~9 of the ~58 relic damage). */
const FESTIVE_POPPER_DAMAGE = 9;
/** Stone Calendar: once at the end of its turn (Slay the Spire 1 numbers, 52 on turn 7; not measured here). */
const STONE_CALENDAR = { damage: 52, turn: 7 };

/**
 * Relic damage a turn over a boss fight of `turns` turns, all enemies: Mercury Hourglass 3 a turn,
 * Mr. Struggles the turn number (1+2+...+turns, i.e. (turns+1)/2 a turn), one-offs spread over the
 * fight. Into the crab an all-enemy hit lands on both claws (EJXC F33: the clock read 23 a turn against
 * 44 dealt, ~8.3 of it relics; the gap looked like 26 when it was ~4).
 */
export function relicDamagePerTurn(relicIds: string[], turns: number, bothClaws = false): number {
  let total = 0;
  if (relicIds.includes("MERCURY_HOURGLASS")) total += HOURGLASS_DAMAGE * turns;
  if (relicIds.includes("MR_STRUGGLES")) total += (turns * (turns + 1)) / 2;
  if (relicIds.includes("FESTIVE_POPPER")) total += FESTIVE_POPPER_DAMAGE;
  if (relicIds.includes("STONE_CALENDAR") && turns >= STONE_CALENDAR.turn) total += STONE_CALENDAR.damage;
  return Math.round((total / Math.max(1, turns)) * (bothClaws ? 2 : 1));
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
  const need = cappedBossNeed(state, knowledge);
  if (!need) return null;
  const deck = deckDamagePerTurn(state, knowledge);
  return { boss: need.id, need: need.perTurn, deck, gap: Math.max(0, need.perTurn - deck) };
}

const BOSS_FLOORS = [17, 33, 48];

/** Largest card-value bonus a damage card gets from the gap. */
export const GAP_BONUS_MAX = 12;
/** Gap a turn from which the bonus is gap/2, up to GAP_BONUS_BIG_MAX (same bar as run-plan BIG_GAP). */
export const BIG_GAP_BONUS = 8;
export const GAP_BONUS_BIG_MAX = 16;

/** Card-value bonus for a damage card (scaling, frontload, AoE into the crab) while the deck is short. */
export function gapCardBonus(gap: DamageGap | null, cardId: string): { bonus: number; why: string | null } {
  if (!gap || gap.gap <= 0) return { bonus: 0, why: null };
  const role = damageRole(cardId);
  if (!role || (role === "aoe" && gap.boss !== "KAISER_CRAB" && gap.boss !== "THE_KIN")) return { bonus: 0, why: null };
  // Against Aeonglass small attacks feed Withering Presence: the gap counts only scaling and big hits.
  if (gap.boss === "AEONGLASS" && role === "frontload" && !isBigHit(cardId)) return { bonus: 0, why: null };
  // From a gap of BIG_GAP_BONUS a turn, gap/2 (UP1C, GZ24: a 9 gap gave +4 against a +14 must-have
  // block bonus; both bosses were fought at ~62% of the clock).
  const bonus =
    gap.gap >= BIG_GAP_BONUS
      ? Math.min(GAP_BONUS_BIG_MAX, Math.round(gap.gap / 2) + (role === "scaling" ? 2 : 0))
      : Math.min(GAP_BONUS_MAX, Math.round(gap.gap * 0.4) + (role === "scaling" ? 2 : 0));
  return { bonus, why: `deck ~${gap.deck}/turn of ${gap.need} for ${gap.boss}: ${role} +${bonus}` };
}

/** Rest-site shift: smith over a comfortable heal while the deck is well short of the boss. */
export function gapRestShift(gap: DamageGap | null, option: string, hpPct: number, beforeBoss: boolean): number {
  if (!gap || gap.gap < 8 || beforeBoss || hpPct < 0.65) return 0;
  return option === "SMITH" ? 2 : 0;
}

/** The run plan's view of the act boss and the deck's damage. */
export function bossClockJson(state: GameState, knowledge: Knowledge): Record<string, JsonValue> | null {
  const need = cappedBossNeed(state, knowledge);
  if (!need) return null;
  const table = bossNeed(need.id, state.run?.ascension ?? 0)!;
  const deck = deckDamagePerTurn(state, knowledge);
  const relicIds = asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  // The same turns as the deck estimate's relic share (the table's).
  const relics = relicDamagePerTurn(relicIds, table.turns, need.id === "KAISER_CRAB");
  return {
    boss: need.id,
    boss_hp: need.hp,
    fight_turns: need.turns,
    ...(need.turns < table.turns
      ? { turns_note: `${table.turns} turns in the table, capped at ${need.turns}: the turns ${need.entryHp} HP survives against the boss's hits less the deck's block` }
      : {}),
    need_damage_per_turn: need.perTurn,
    deck_damage_per_turn_estimate: deck,
    estimate_note: `rough: cards, Strength (Toasty Mittens and Rupture+Crimson Mantle growth included), Vulnerable${relics > 0 ? ` and relic damage (~${relics}/turn of it)` : ""}; no draw or potions`,
    gap_per_turn: Math.max(0, need.perTurn - deck),
    boss_note: need.note,
  };
}

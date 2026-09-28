/**
 * Boss clock: how much damage a turn the act boss needs, and an estimate of what the deck deals there.
 *
 * Why: at A7 most runs reached the act-2 boss at full HP and lost the race (24HM 24.9 a turn of 33.5
 * needed, WLY1 21.6 into the crab's 408 HP, GGF8 20.3, SM9H 30.6 of ~44). Card rewards, shops and rest
 * sites never asked whether the deck could kill the boss in time, and DeepSeek's run plan only saw the
 * boss id.
 *
 * 2026-09-28 calibration (Dai: "1，2，3 直接修复"): 4 of 7 baseline deaths came from a clock that read
 * "gap 0/1" while the deck was well short (64ZB Vantom, ERPH Waterfall Giant, 02L4 Ceremonial Beast,
 * D3X1 Test Subject phase 2; NZWR Knowledge Demon the other way round). The clock used A0/A7 HP, flat
 * script turn counts, no mechanic that wastes damage, and a flat Demon Form. Now:
 *  - HP is the A8 HP from ascension 8 (logged max_hp in states.jsonl), plus heals/block the boss adds;
 *  - fight turns = min(the boss's script, the turns we survive at its logged A8 HP loss a turn from the
 *    expected entry HP), Waterfall Giant capped by its eruption, Test Subject split into phases;
 *  - Vantom's Slippery (9 hits deal 1), Ceremonial Beast's Ringing turns (one card), Knowledge Demon's
 *    curses, Queen's "You are mine" Weak and Aeonglass's Artifact cut the deck estimate or add HP;
 *  - Strength that grows (Demon Form from its play turn, Toasty Mittens, fed Rupture) is averaged over
 *    the fight's turns and multiplied by the attack hits a turn, not the attack cards.
 * The deck estimate's overall scale is fitted on the logged A8 boss fights (tools/boss-clock-calibrate.ts).
 */

import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../mod/schema.js";
import { asArray, asRecord, num, numOrNull, str, type JsonValue } from "../util/json.js";
import { modelHandCard } from "./card-model.js";
import { damageRole, isBigHit } from "./card-value.js";

export interface BossProfile {
  /** HP below ascension 8 (all parts / phases). */
  hp: number;
  /** HP at ascension 8 and above (logged max_hp). */
  hpA8: number;
  /** Turns the boss's script allows before it ends the fight (a kill turn, a sandpit, the typical length). */
  scriptTurns: number;
  /**
   * HP we lose a turn in the logged A8 fights, our block already counted: the 75th percentile of (entry
   * HP - HP at the end) / turns, so a deck with less block than usual is not promised a long fight.
   */
  lossPerTurn: number;
  note: string;
  /** The mechanic that makes the damage race harder, in one line (shown to DeepSeek). */
  mechanic: string;
}

/**
 * Keys match a substring of run.boss_id. hpA8 from the logged max_hp at A8 (states.jsonl, 162 A8 boss
 * fights); lossPerTurn is the 75th percentile of (entry HP - HP at the end) / turns in those fights;
 * scriptTurns about the 75th percentile of the won fights' length, or the script's kill turn.
 */
export const BOSSES: Record<string, BossProfile> = {
  // Crusher 209 + Rocket 199 (A8: 219 + 209). The two wins took 7-8 turns; Bug Sting -> Laser opener.
  KAISER_CRAB: { hp: 408, hpA8: 428, scriptTurns: 8, lossPerTurn: 10, note: "two claws, kill both in one turn; Bug Sting then Laser from T3-T4; a claw killed alone enrages the other", mechanic: "two bodies: single-target damage is split; AoE hits both" },
  // 379 (A8 399) plus two 30-HP Ponder heals; the T11 Overwhelming (12x3 and more) ends long fights (NZWR).
  KNOWLEDGE_DEMON: { hp: 379, hpA8: 399, scriptTurns: 11, lossPerTurn: 6.3, note: "heals 30 twice (Ponder), curses the deck on T1/T5/T9; Strength scaling wins", mechanic: "curses from T1: Sloth caps plays at 3 a turn, Mind Rot draws one less from T5; +60 HP of heals" },
  THE_INSATIABLE: { hp: 321, hpA8: 341, scriptTurns: 8, lossPerTurn: 8.9, note: "Sandpit starts at 4, eaten at 0; each Frantic Escape adds a turn", mechanic: "Sandpit: the fight ends around T7 unless Frantic Escapes push it back" },
  // 512 (A8 535) plus two 33-block Ebb turns (L34T: 48 a turn, left at 173; M6P7: 33 a turn, left at 234).
  AEONGLASS: { hp: 578, hpA8: 601, scriptTurns: 9, lossPerTurn: 8.6, note: "Artifact 3 at start; Ebb gains 33 block every 3rd turn; a Wither every 6 cards played: few big cards", mechanic: "Artifact eats Vulnerable; +66 block from Ebb; small cards feed Withers" },
  // Queen 400 (A8 419) plus ~20 block a turn while the Amalgam lives (~60). The Amalgam (199, A8 211) leaves
  // when she dies (notes/bosses.md; VE97, CWU9 ended with the Queen alone): its HP only counts when it
  // is killed first for survival.
  QUEEN: { hp: 460, hpA8: 480, scriptTurns: 8, lossPerTurn: 13.3, note: "from her third turn the Amalgam hits 12x3/22 under Vulnerable, Weak and Frail", mechanic: "\"You are mine\" from her T3: Weak (-25% damage), Vulnerable and Frail for the rest of the fight; ~60 Queen block; the Amalgam (211) adds its HP only if killed first" },
  // Three phases, 100/200/300 (A8 111/212, phase 3 not logged yet: ~318 assumed at the same +6%).
  TEST_SUBJECT: { hp: 600, hpA8: 641, scriptTurns: 12, lossPerTurn: 7.5, note: "three phases (~100/200/300 HP, A8 111/212/~318); Painful Stabs Wounds on unblocked hits; Multi Claw grows each use", mechanic: "phase 2 is a race: Multi Claw starts 10x3 and gains a hit every turn (D3X1: dead on its 5th)" },
  LAGAVULIN_MATRIARCH: { hp: 222, hpA8: 233, scriptTurns: 12, lossPerTurn: 5.8, note: "sleeps two turns (play powers), then drains Strength/Dexterity", mechanic: "drains Strength and Dexterity each cycle after it wakes" },
  SOUL_FYSH: { hp: 211, hpA8: 221, scriptTurns: 12, lossPerTurn: 5.1, note: "shuffles Beckons into the deck, Intangible turns", mechanic: "Intangible turns (each hit deals 1) and Beckons clogging the draw" },
  // Priest 190 (A8 199) plus two followers ~59 (A8 62/63); the fight ends with the priest, winners dealt
  // ~60 into the followers on the way.
  THE_KIN: { hp: 250, hpA8: 260, scriptTurns: 10, lossPerTurn: 10.1, note: "priest 190 (A8 199) plus two followers ~60: AoE; priest cycle Orb of Frailty, Orb of Weakness, Beam 3x(3+Strength) on T3/T7/T11, Ritual (+Strength): be above the T11 Beam (~21)", mechanic: "followers soak single-target damage; Ritual grows the Beam every cycle" },
  VANTOM: { hp: 173, hpA8: 183, scriptTurns: 11, lossPerTurn: 7.3, note: "9 Slippery stacks: multi-hit", mechanic: "Slippery 9: its next 9 HP losses are 1 each (64ZB: 9 damage in T1-T4); multi-hit strips it" },
  // 240 (A8 250) plus Siphon heals (~20: winners dealt 250-285).
  WATERFALL_GIANT: { hp: 260, hpA8: 270, scriptTurns: 14, lossPerTurn: 5.1, note: "Siphon heals; Pressure Gun on T5/T10/T15: block it fully; Steam Eruption explodes for its stacks when it dies", mechanic: "eruption 12+3 a turn explodes on the kill: a late kill is lethal (ERPH: T14 kill, 51 into 25 HP)" },
  // 252 (A8 262); Ringing turns allow one card (02L4 T6, T9: 0 damage).
  CEREMONIAL_BEAST: { hp: 252, hpA8: 262, scriptTurns: 12, lossPerTurn: 6.2, note: "stunned when HP first drops to 150; Ringing turns allow one card: keep block potions for them", mechanic: "Ringing: every third turn from T6 you play one card (02L4: T6 and T9 dealt 0)" },
};

/** @deprecated name kept for callers; the profiles above. */
export const BOSS_NEEDS = BOSSES;

export function bossProfile(bossId: string): (BossProfile & { id: string }) | null {
  const upper = bossId.toUpperCase();
  const key = Object.keys(BOSSES).find((id) => upper.includes(id));
  return key ? { ...BOSSES[key]!, id: key } : null;
}

/** HP at this ascension (A8 raises boss HP ~5%). */
export function bossHp(profile: BossProfile, ascension: number): number {
  return ascension >= 8 ? profile.hpA8 : profile.hp;
}

/** Relics that give 1 energy on (almost) every turn. */
const ENERGY_RELICS = new Set([
  "BLESSED_ANTLER", "BLOOD_SOAKED_ROSE", "BREAD", "ECTOPLASM", "PAELS_FLESH", "PHILOSOPHERS_STONE", "PRISMATIC_GEM",
  "PUMPKIN_CANDLE", "SOZU", "SPIKED_GAUNTLETS", "VELVET_CHOKER", "WHISPERING_EARRING",
]);
/** Cards drawn a turn (no draw cards counted: this is a floor, not a ceiling). */
const HAND = 5;
/**
 * The raw count misses draw, relics, potions and powers played mid-fight, and a weak deck's fights are
 * helped by them as much as a strong one's. Fitted (least absolute deviation) on the 160 logged A8 boss
 * fights with a known outcome (tools/boss-clock-calibrate.ts): realised / mechanic = 9 + 1.04 x raw. A flat x1.4
 * (the old scale) read weak decks too low and strong decks too high (median realised/raw 2.05 for the
 * weakest fifth, 1.46 for the strongest).
 */
export const ESTIMATE_BASE = 9;
export const ESTIMATE_SLOPE = 1.04;
export function calibrated(raw: number): number {
  return raw > 0 ? ESTIMATE_BASE + ESTIMATE_SLOPE * raw : 0;
}
/** Damage multiplier with two or more Vulnerable sources in the deck. */
const VULNERABLE_UPTIME = 1.2;
/** Share of max HP a boss is entered with when it is still some floors away (logged A8 median ~0.9). */
export const ENTRY_HP_SHARE = 0.85;
/** Vantom's Slippery stacks. */
const SLIPPERY_STACKS = 9;

/** What the deck plays in an average boss turn, before boss mechanics. */
export interface DeckProfile {
  size: number;
  energy: number;
  /** Share of the drawn cards the energy pays for. */
  playedShare: number;
  /** Cards played a turn. */
  plays: number;
  /** Attack damage a turn with no Strength, before Vulnerable (AoE counted per enemy by the caller). */
  damage: number;
  /** AoE part of `damage`. */
  aoeDamage: number;
  /** Attack hits a turn (Strength adds to each). */
  hits: number;
  /** Average damage of one hit. */
  avgHit: number;
  vulnerableSources: number;
  /** Permanent Strength from one-off cards (Inflame), played around `setupTurn`. */
  flatStrength: number;
  /** Strength gained each turn from the power's play turn (Demon Form 3, Demon Form+ 4). */
  demonFormRate: number;
  /** Strength a turn from relics from T1 (Toasty Mittens). */
  relicStrengthRate: number;
  /** Strength a turn from Rupture fed by self-damage cards. */
  ruptureRate: number;
  /** Turn a power drawn at random is played on average. */
  setupTurn: number;
  /** Strength-growth sources named for the note. */
  growth: string[];
}

function dynValue(entry: unknown, name: string): number | null {
  for (const value of asArray(asRecord(entry)["dynamic_values"])) {
    const record = asRecord(value);
    if (str(record["name"]) === name) return numOrNull(record["current_value"]) ?? numOrNull(record["base_value"]);
  }
  return null;
}

/** The deck's playing profile (cards from run.deck, energy from max_energy and energy relics). */
export function deckProfileForBoss(state: GameState, knowledge: Knowledge): DeckProfile | null {
  const run = asRecord(state.run?.raw);
  const entries = asArray(run["deck"]);
  // The model takes the type from the game data; the deck entry's own card_type covers unknown ids.
  const cards = entries.map((entry, index) => {
    const model = modelHandCard(entry, index, knowledge);
    return { entry, model: model.type ? model : { ...model, type: str(asRecord(entry)["card_type"]) } };
  });
  if (cards.length === 0) return null;
  // max_energy leaves out the relics that add energy every turn (7DFB: 3 shown with Pael's Flesh and
  // Blessed Antler).
  const relicIds = asArray(run["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  const energy = Math.max(3, num(run["max_energy"]) || 3) + relicIds.filter((id) => ENERGY_RELICS.has(id)).length;
  const n = cards.length;
  let damage = 0;
  let aoe = 0;
  let cost = 0;
  let hits = 0;
  let flatStrength = 0;
  let demonForm = 0;
  let ruptures = 0;
  let selfDamage = 0;
  let vulnerable = 0;
  const growth: string[] = [];
  for (const { entry, model: card } of cards) {
    // Deck entries carry no "playable" flag (that is a hand-card field): Curses, Statuses and
    // unplayable cards (cost -1) are the ones that never play.
    const playable = card.type !== "Curse" && card.type !== "Status" && (card.xCost || card.cost >= 0);
    if (!playable) continue;
    // Spiked Gauntlets: powers cost 1 more (G1Z0: Demon Form at 4, never played).
    cost += card.xCost ? energy : Math.max(0, card.cost) + (card.type === "Power" && relicIds.includes("SPIKED_GAUNTLETS") ? 1 : 0);
    if (card.type === "Attack") {
      // Whirlwind (X hits) reads 0 hits in the model: it hits once per energy.
      const cardHits = card.special === "whirlwind" ? energy : Math.max(1, card.hits);
      const cardDamage = (card.damage ?? 0) * cardHits;
      damage += cardDamage;
      if (card.target === "all") aoe += cardDamage;
      if ((card.damage ?? 0) > 0) hits += cardHits;
    }
    if (card.cardId === "DEMON_FORM") {
      // The deck entry carries the (upgraded) value; 3 is the base card's.
      const rate = dynValue(entry, "StrengthPower") ?? 3;
      demonForm += rate;
      growth.push(`Demon Form +${rate}/turn`);
    } else if (card.cardId === "RUPTURE") {
      ruptures += 1;
    } else {
      flatStrength += Math.max(0, card.strength);
    }
    if (card.hpLoss > 0 || card.cardId === "CRIMSON_MANTLE") selfDamage += 1;
    if (card.vulnerable > 0) vulnerable += 1;
  }
  // Energy caps how many of the drawn cards get played.
  const playedShare = Math.min(1, energy / Math.max(1, (HAND * cost) / n));
  const perCard = (HAND / n) * playedShare;
  const relicStrengthRate = relicIds.includes("TOASTY_MITTENS") ? 1 : 0;
  if (relicStrengthRate > 0) growth.push("Toasty Mittens +1/turn");
  // Rupture: +1 Strength each time a self-damage card is played on our turn.
  const ruptureRate = ruptures > 0 ? ruptures * selfDamage * perCard : 0;
  if (ruptureRate > 0) growth.push(`Rupture fed by ${selfDamage} self-damage cards (~+${ruptureRate.toFixed(1)}/turn)`);
  return {
    size: n,
    energy,
    playedShare,
    plays: HAND * playedShare,
    damage: damage * perCard,
    aoeDamage: aoe * perCard,
    hits: hits * perCard,
    avgHit: hits > 0 ? damage / hits : 0,
    vulnerableSources: vulnerable,
    flatStrength,
    demonFormRate: demonForm,
    relicStrengthRate,
    ruptureRate,
    // A power is drawn on average halfway through the first shuffle.
    setupTurn: 1 + Math.round(n / (2 * HAND)),
    growth,
  };
}

/** Sum of a Strength ramp r, 2r, 3r, … that starts on turn `from` (inclusive), over turns 1..T, divided by T. */
function rampAverage(rate: number, from: number, turns: number): number {
  const n = Math.max(0, turns - from + 1);
  return turns > 0 ? (rate * n * (n + 1)) / 2 / turns : 0;
}

/** Average Strength over a T-turn fight. */
export function averageStrength(deck: DeckProfile, turns: number): number {
  const setup = deck.setupTurn;
  // One-off Strength (Inflame) from its play turn on.
  const flat = turns > 0 ? (deck.flatStrength * Math.max(0, turns - setup + 1)) / turns : 0;
  // Demon Form: Strength at the start of each turn after it is played.
  const demon = rampAverage(deck.demonFormRate, setup + 1, turns);
  // Toasty Mittens: +1 at the start of every turn from T1.
  const mittens = rampAverage(deck.relicStrengthRate, 1, turns);
  // Rupture: from the turn after it is played, fed at its rate.
  const rupture = rampAverage(deck.ruptureRate, setup + 1, turns);
  return flat + demon + mittens + rupture;
}

/** Raw deck damage a turn in a T-turn fight against this boss: cards, Strength growth, Vulnerable, bodies. */
export function rawDeckDamage(deck: DeckProfile, bossId: string, turns: number): number {
  const id = bossProfile(bossId)?.id ?? "";
  const bodies = id === "KAISER_CRAB" ? 2 : 1;
  // AoE counts once per body into the crab.
  let perTurn = deck.damage + deck.aoeDamage * (bodies - 1) + averageStrength(deck, turns) * deck.hits;
  // Two Vulnerable sources keep the boss Vulnerable most turns. A boss that starts with Artifact eats
  // the Vulnerable (G1Z0: Aeonglass, estimate 58, dealt 34).
  if (deck.vulnerableSources >= 2 && id !== "AEONGLASS") perTurn *= VULNERABLE_UPTIME;
  return perTurn;
}

/** Deck damage a turn in a T-turn fight against this boss: calibrated, and cut by the boss's mechanic. */
export function deckEstimate(deck: DeckProfile, bossId: string, turns: number): number {
  const id = bossProfile(bossId)?.id ?? "";
  return Math.round(calibrated(rawDeckDamage(deck, bossId, turns)) * mechanicFactor(id, deck, turns));
}

/** Ceremonial Beast Ringing turns in a T-turn fight: every third turn from T6 (02L4: T6, T9). */
export function ringingTurns(turns: number): number {
  return turns >= 6 ? Math.floor((turns - 6) / 3) + 1 : 0;
}

/** Share of the deck's damage a boss's mechanic lets through over a T-turn fight. */
export function mechanicFactor(id: string, deck: DeckProfile, turns: number): number {
  if (turns <= 0) return 1;
  switch (id) {
    case "CEREMONIAL_BEAST": {
      // A Ringing turn plays one card: about one card's share of the turn.
      const ringing = ringingTurns(turns);
      const oneCard = 1 / Math.max(1, deck.plays);
      return (turns - ringing + ringing * oneCard) / turns;
    }
    case "KNOWLEDGE_DEMON": {
      // Sloth from T1 (code takes it first): at most 3 plays a turn. Mind Rot from T5: one card less drawn.
      const sloth = Math.min(1, 3 / Math.max(1, deck.plays));
      const mindRot = (HAND - 1) / HAND;
      const late = Math.max(0, turns - 5);
      return (sloth * (turns - late) + sloth * mindRot * late) / turns;
    }
    case "QUEEN":
      // Weak (-25%) from her third turn to the end.
      return (Math.min(turns, 2) + Math.max(0, turns - 2) * 0.75) / turns;
    // No explicit model yet: the logged A8 share of the calibrated estimate these fights realised
    // (Soul Fysh's Intangible turns and Beckons: 20.1 of 24.5; the Matriarch's Strength/Dexterity drain:
    // 20.3 of 26.1).
    case "SOUL_FYSH":
      return 0.82;
    case "LAGAVULIN_MATRIARCH":
      return 0.78;
    default:
      return 1;
  }
}

/**
 * Vantom: turns until its 9 Slippery stacks are gone. Each HP loss takes a stack and deals 1, so it lasts
 * 9 hits (logged A8: median 4 turns of 1-damage hits; 64ZB 4, D3X1 2 with Sword Boomerang and Twin Strikes).
 */
export function slipperyTurns(deck: DeckProfile | null, turns: number): number {
  const hits = deck && deck.hits > 0 ? deck.hits : 2;
  return Math.min(turns, SLIPPERY_STACKS / Math.max(0.5, hits));
}

/** Extra HP the boss effectively has over a T-turn fight (heals, and the damage Slippery wastes). */
export function extraHp(id: string, deck: DeckProfile | null, turns: number, perTurn: number): number {
  switch (id) {
    case "KNOWLEDGE_DEMON":
      // Ponder heals 30 on T4 and T8.
      return (turns > 4 ? 30 : 0) + (turns > 8 ? 30 : 0);
    case "VANTOM":
      // The turns spent stripping Slippery deal 1 a hit instead of the deck's damage.
      return Math.max(0, Math.round(slipperyTurns(deck, turns) * perTurn - SLIPPERY_STACKS));
    default:
      return 0;
  }
}

/** Turns we survive at the boss's logged A8 HP loss a turn from `entryHp`. */
export function survivableTurns(profile: BossProfile, entryHp: number): number {
  return Math.max(1, Math.floor(entryHp / Math.max(1, profile.lossPerTurn)));
}

/**
 * Waterfall Giant: killed on turn T it explodes for 12 + 3(T-1). Surviving it with ~12 block needs
 * entry - loss*T + 12 >= 12 + 3(T-1), so T <= (entry + 3) / (3 + loss) (ERPH: 66 HP -> T9, not 11).
 */
export function eruptionTurns(entryHp: number, lossPerTurn: number): number {
  return Math.max(3, Math.floor((entryHp + 3) / (3 + lossPerTurn)));
}

/** HP lost a turn in the Test Subject's first phase. */
const TEST_SUBJECT_PHASE1_LOSS = 3;

/** Test Subject phase HP by ascension (phase 3 at A8 is not logged yet: +6% like phase 2). */
export function testSubjectPhases(ascension: number): [number, number, number] {
  return ascension >= 8 ? [111, 212, 318] : [100, 200, 300];
}

export interface BossClock {
  boss: string;
  ascension: number;
  /** HP to chew through at this ascension, including heals, block and Slippery's wasted hits. */
  hp: number;
  hpNote: string;
  /** HP the fight is expected to start with. */
  entryHp: number;
  survivableTurns: number;
  fightTurns: number;
  turnsNote: string;
  need: number;
  deck: number;
  gap: number;
  mechanic: string;
  note: string;
  growth: string[];
  /** Test Subject only: the per-phase needs. */
  phases?: { phase: number; hp: number; turns: number; need: number }[];
}

/** The expected entry HP: the current HP, or ENTRY_HP_SHARE of max HP when a rest can still heal. */
export function expectedEntryHp(state: GameState): number {
  const hp = state.run?.current_hp ?? null;
  const max = state.run?.max_hp ?? null;
  if (max === null || max <= 0) return hp ?? 70;
  return Math.round(Math.max(hp ?? max, ENTRY_HP_SHARE * max));
}

/** The act boss's clock at this state (entryHp overrides the expected entry HP, for the calibration). */
export function bossClock(state: GameState, knowledge: Knowledge, entryHpOverride?: number): BossClock | null {
  const bossId = str(asRecord(state.run?.raw)["boss_id"]);
  const profile = bossProfile(bossId);
  if (!profile) return null;
  const ascension = state.run?.ascension ?? 0;
  const deck = deckProfileForBoss(state, knowledge);
  const entryHp = entryHpOverride ?? expectedEntryHp(state);
  const survive = survivableTurns(profile, entryHp);
  const estimateAt = (turns: number): number => (deck ? deckEstimate(deck, bossId, turns) : 0);
  const base = {
    boss: profile.id,
    ascension,
    entryHp,
    survivableTurns: survive,
    mechanic: profile.mechanic,
    note: profile.note,
    growth: deck?.growth ?? [],
  };

  if (profile.id === "TEST_SUBJECT") {
    const [p1, p2, p3] = testSubjectPhases(ascension);
    // Phase 1 hits lightly (D3X1: 68 -> 60 in 3 turns): ~3 a turn.
    const est1 = Math.max(1, estimateAt(4));
    const turns1 = Math.max(2, Math.min(5, Math.ceil(p1 / est1)));
    const hpAt2 = Math.max(1, entryHp - TEST_SUBJECT_PHASE1_LOSS * turns1);
    // Multi Claw 10x3 on phase 2's first turn, a hit more each turn: ~15 net a turn after block (D3X1:
    // 60 HP at phase 2, dead on the 5th claw).
    const turns2 = Math.max(3, Math.min(5, Math.round(hpAt2 / 15)));
    const turns3 = 6;
    const need2 = Math.round(p2 / turns2);
    const need3 = Math.round(p3 / turns3);
    const fightTurns = turns1 + turns2 + turns3;
    const deckNow = estimateAt(turns1 + turns2);
    const need = Math.max(need2, need3);
    return {
      ...base,
      hp: p1 + p2 + p3,
      hpNote: `three phases ${p1}/${p2}/${p3}${ascension >= 8 ? " (A8; phase 3 not yet logged)" : ""}`,
      fightTurns,
      turnsNote: `phase 1 ~${turns1} turns at the deck's pace; phase 2 must die within ~${turns2} turns of Multi Claw at ~${hpAt2} HP; phase 3 assumed ${turns3}`,
      need,
      deck: deckNow,
      gap: Math.max(0, need - deckNow),
      phases: [
        { phase: 1, hp: p1, turns: turns1, need: Math.round(p1 / turns1) },
        { phase: 2, hp: p2, turns: turns2, need: need2 },
        { phase: 3, hp: p3, turns: turns3, need: need3 },
      ],
    };
  }

  let cap = profile.scriptTurns;
  let capWhy = `script ${profile.scriptTurns}`;
  if (profile.id === "WATERFALL_GIANT") {
    const eruption = eruptionTurns(entryHp, profile.lossPerTurn);
    if (eruption < cap) {
      cap = eruption;
      capWhy = `eruption kill by T${eruption}`;
    }
  }
  const fightTurns = Math.max(3, Math.min(cap, survive));
  const deckNow = estimateAt(fightTurns);
  const hp = bossHp(profile, ascension) + extraHp(profile.id, deck, fightTurns, deckNow);
  const need = Math.round(hp / fightTurns);
  const extra = hp - bossHp(profile, ascension);
  return {
    ...base,
    hp,
    hpNote: `${bossHp(profile, ascension)}${ascension >= 8 ? " (A8)" : ""}${extra > 0 ? ` + ${extra} (${profile.id === "VANTOM" ? `Slippery: ~${slipperyTurns(deck, fightTurns).toFixed(1)} turns of hits dealing 1` : "heals"})` : ""}`,
    fightTurns,
    turnsNote: `min(${capWhy}, survive ~${survive} at ${entryHp} HP losing ~${profile.lossPerTurn}/turn)`,
    need,
    deck: deckNow,
    gap: Math.max(0, need - deckNow),
  };
}

/** @deprecated kept for older callers: need by boss id at A0-A7 script turns. */
export function bossNeed(bossId: string): (BossProfile & { id: string; turns: number; perTurn: number }) | null {
  const profile = bossProfile(bossId);
  if (!profile) return null;
  return { ...profile, turns: profile.scriptTurns, perTurn: Math.round(profile.hp / profile.scriptTurns) };
}

/** Rough damage a turn of the deck in the act boss fight (its expected length). */
export function deckDamagePerTurn(state: GameState, knowledge: Knowledge): number {
  const clock = bossClock(state, knowledge);
  if (clock) return clock.deck;
  const deck = deckProfileForBoss(state, knowledge);
  return deck ? deckEstimate(deck, "", 9) : 0;
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
  const clock = bossClock(state, knowledge);
  if (!clock) return null;
  return { boss: clock.boss, need: clock.need, deck: clock.deck, gap: clock.gap };
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

/** The act boss clock as DeepSeek sees it (run plan, build/route/rest questions). */
export function bossClockJson(state: GameState, knowledge: Knowledge): Record<string, JsonValue> | null {
  const clock = bossClock(state, knowledge);
  if (!clock) return null;
  const onBossFloor = BOSS_FLOORS.includes(state.run?.floor ?? 0);
  return {
    boss: clock.boss,
    ...(onBossFloor ? { stale: "this floor's boss is the one just fought; the next act's boss is not known yet" } : {}),
    boss_hp: clock.hp,
    boss_hp_note: clock.hpNote,
    expected_entry_hp: clock.entryHp,
    survivable_turns: clock.survivableTurns,
    fight_turns: clock.fightTurns,
    fight_turns_note: clock.turnsNote,
    need_damage_per_turn: clock.need,
    deck_damage_per_turn_estimate: clock.deck,
    estimate_note: "calibrated on 160 logged A8 boss fights (9 + 1.04 x the card count; typical error ~25%): cards, energy, Strength growth averaged over the fight, Vulnerable, and the boss mechanic below",
    gap_per_turn: clock.gap,
    ...(clock.growth.length > 0 ? { strength_growth: clock.growth.join("; ") } : {}),
    harder_because: clock.mechanic,
    ...(clock.phases ? { phases: clock.phases.map((phase) => ({ ...phase })) } : {}),
    boss_note: clock.note,
  };
}

/**
 * THIEF_COST: the pure part of the stolen card's HP value (src/sim/thief-card-value.ts computes it with the boss
 * simulator): its shape, the conversion rules (cardHpOf) and the facts' text (cardValueText). No heavy imports, so the
 * combat planner and thief.ts read it without the simulator (which builds its start through the planner).
 */

/** Samples per deck (B3's count: a paired standard error of about 1-1.5 points on a win rate difference). */
export const THIEF_CARD_SAMPLES = 1000;
/** Seed of the samples (the same for the three decks: common random numbers). */
export const THIEF_CARD_SEED = 11;
/** The entry HP taken off for the win rate an HP buys (Dai: "entry HP vs entry HP − 10"). */
export const THIEF_CARD_HP_STEP = 10;
/** The whole computation's wall clock, the synthetic start included (Dai: +10-15 s is accepted, as for B3). */
export const THIEF_CARD_BUDGET_MS = 15_000;
/** A difference within this many paired standard errors is not told from noise. */
export const THIEF_CARD_Z = 2;
/**
 * The most HP a stolen card counts for (docs/thief.md §7). The conversion is linear on a 10 HP step: past a few steps it
 * extrapolates the win rate per HP beyond what was measured, and one card's worth above this is a deck that lives or
 * dies by it (a Kin fight without its only area attack: −35 points, B1.5 §6.6), where "HP" stops being the right unit.
 */
export const THIEF_CARD_CAP_HP = 30;

export type ThiefCardStatus = "ok" | "capped" | "not_significant" | "worse_with" | "flat" | "no_samples" | "unknown_card" | "no_boss" | "error";

/** How the HP was read: the win rate (Dai's conversion), or a fallback where the win rate is pinned (§7). */
export type ThiefCardRoute = "win" | "progress" | "hp";

/** A paired difference and its standard error. */
export interface Paired {
  value: number;
  se: number;
}

/** The paired numbers of the three decks (the card's and an HP's worth on each measure), as cardHpOf reads them. */
export interface ThiefCardMeasures {
  /** Raw win rates on the same seeds: with the card at the entry HP, without it, with it at entry − step. */
  win: { with: number; without: number; lower: number };
  /** win(with) − win(without). */
  cardDiff: Paired;
  /** (win(with) − win(with, −step)) / step: the win rate one HP of entry HP buys. */
  perHp: Paired;
  /** The boss's mean HP left at the end (0 when won): with the card, and what losing it adds / an HP of entry HP saves. */
  bossLeft: { with: number; card: Paired; perHp: Paired };
  /** Mean HP lost in the boss fight (a death: all of it): what losing the card adds. */
  hpLost: { with: number; card: Paired };
}

export interface ThiefCardValue {
  /** The fight (thief.ts thiefFightOf: "<run id>:<act>:<floor>"). */
  fight: string;
  /** The card as the deck names it ("拆卸+"), and its id with "+" when upgraded. */
  card: string;
  cardId: string;
  /** This act's boss: its key (boss-start bossKey), name; the B3 low-confidence reason when it is on that list. */
  boss: string;
  bossName: string;
  lowTrust: string | null;
  entryHp: number;
  maxHp: number;
  entrySource: string;
  step: number;
  samples: number;
  requested: number;
  timedOut: boolean;
  ms: number;
  /** The three decks' paired numbers (null: not simulated). */
  measures: ThiefCardMeasures | null;
  /** Which measure the HP is read on (null: none). */
  route: ThiefCardRoute | null;
  /** The card's worth ÷ an HP's worth on that measure, before the significance rules and the clamp. */
  ratio: number | null;
  /** The HP the cost counts (0..THIEF_CARD_CAP_HP); null: no value, no cost (`why`). */
  hp: number | null;
  status: ThiefCardStatus;
  /** Why the HP is 0, capped, read on a fallback or missing (English, for the facts). */
  why: string | null;
  /**
   * The card's effect is only partly modelled in the simulation (card-model `known` false, as B3 marks it, or a draw
   * "until" the rollout leaves out: Pillage plays as a 6-damage attack, SCBC3F0QT8BC F19 gave Strike's numbers to the
   * sample): its worth may be understated.
   */
  partial?: boolean;
}

const pct = (p: number) => `${Math.round(p * 100)}%`;
const pp = (x: number) => `${Math.round(x * 1000) / 10}`;
const one = (x: number) => Math.round(x * 10) / 10;

/** The base deck's raw win rate under which (or over 1 minus which) the win rate is pinned: B3's "mostly lost" bar. */
export const THIEF_CARD_PINNED = 0.1;

const significant = (d: Paired) => Math.abs(d.value) > THIEF_CARD_Z * d.se;

/**
 * The HP of a card from the three decks' paired numbers (module comment, docs/thief.md §7). Pure: the tests and the
 * offline table call it on fixed numbers. The measure follows the deck's raw win rate with the card (B3's split):
 *   - win (Dai's conversion), THIEF_CARD_PINNED..1 − THIEF_CARD_PINNED: HP = Δwin(card) ÷ Δwin per HP of entry HP;
 *   - progress, under THIEF_CARD_PINNED (the deck now mostly loses this boss: B3's "boss HP left"): the boss HP left
 *     the card saves ÷ the boss HP left an HP of entry HP saves (more HP = more turns alive = more damage dealt);
 *   - hp, over 1 − THIEF_CARD_PINNED (mostly won): the HP the card saves in the boss fight itself (HP already).
 * On the measure used: the card's difference within THIEF_CARD_Z standard errors is 0 (not significant), a card the
 * deck does better without 0 (losing it costs nothing); no positive HP slope beyond THIEF_CARD_Z standard errors on the
 * win or progress measure: no conversion, no value.
 */
export function cardHpOf(m: ThiefCardMeasures): Pick<ThiefCardValue, "route" | "ratio" | "hp" | "status" | "why"> {
  const slope = (d: Paired) => d.value > 0 && significant(d);
  const clamp = (route: ThiefCardRoute, ratio: number, why: string | null): Pick<ThiefCardValue, "route" | "ratio" | "hp" | "status" | "why"> =>
    ratio > THIEF_CARD_CAP_HP ? { route, ratio, hp: THIEF_CARD_CAP_HP, status: "capped", why: `${why ? `${why}; ` : ""}${ratio} HP on the ${route} measure, capped at ${THIEF_CARD_CAP_HP}` } : { route, ratio, hp: Math.max(0, ratio), status: "ok", why };
  const zero = (route: ThiefCardRoute, card: Paired, unit: string, ratio: number | null, lead: string | null): Pick<ThiefCardValue, "route" | "ratio" | "hp" | "status" | "why"> | null => {
    const head = lead ? `${lead}; ` : "";
    if (!significant(card)) return { route, ratio, hp: 0, status: "not_significant", why: `${head}what the card is worth on ${unit} (${fmt(card.value)} ± ${fmt(card.se)}) is not told from noise` };
    if (card.value < 0) return { route, ratio, hp: 0, status: "worse_with", why: `${head}the deck does better without it on ${unit} (${fmt(card.value)} ± ${fmt(card.se)}): losing it costs nothing` };
    return null;
  };
  if (m.win.with < THIEF_CARD_PINNED) {
    const lead = `the deck now mostly loses this boss (win ${pct(m.win.with)}): read on the boss's HP left`;
    if (!slope(m.bossLeft.perHp)) return { route: "progress", ratio: null, hp: null, status: "flat", why: `${lead}, and an HP of entry HP does not lower it (${fmt(m.bossLeft.perHp.value)} ± ${fmt(m.bossLeft.perHp.se)} boss HP): no conversion to HP` };
    const ratio = one(m.bossLeft.card.value / m.bossLeft.perHp.value);
    return zero("progress", m.bossLeft.card, "the boss's HP left", ratio, lead) ?? clamp("progress", ratio, lead);
  }
  if (m.win.with > 1 - THIEF_CARD_PINNED) {
    const lead = `the deck now mostly wins this boss (win ${pct(m.win.with)}): read on the HP lost in the boss fight`;
    const ratio = one(m.hpLost.card.value);
    return zero("hp", m.hpLost.card, "the HP lost", ratio, lead) ?? clamp("hp", ratio, lead);
  }
  if (!slope(m.perHp)) {
    return { route: "win", ratio: null, hp: null, status: "flat", why: `the boss win rate (${pct(m.win.with)}) does not move with entry HP here (${fmt(m.perHp.value * 100)} ± ${fmt(m.perHp.se * 100)} points an HP): no conversion to HP` };
  }
  const ratio = one(m.cardDiff.value / m.perHp.value);
  return zero("win", { value: m.cardDiff.value * 100, se: m.cardDiff.se * 100 }, "the boss win rate (points)", ratio, null) ?? clamp("win", ratio, null);
}

const fmt = (x: number) => String(Math.round(x * 10) / 10);

/**
 * The value as the facts say it: 「拆卸 ≈ 12 HP: boss (墨影幻灵, entry 61 HP) win 46% with it → 38% without (−8 ± 1.4
 * points), 10 HP less → 39%: 1 HP ≈ 0.7 points (1000 samples)」; a fallback measure, no value or 0: why. Low trust: said.
 */
export function cardValueText(v: ThiefCardValue): string {
  const trust = v.lowTrust ? `; low trust: the simulator is not validated on ${v.bossName} (${v.lowTrust})` : "";
  const head = v.hp === null ? `${v.card}: no HP value` : `${v.card} ≈ ${one(v.hp)} HP`;
  const m = v.measures;
  if (!m) return `${head} (${v.why ?? v.status})${trust}`;
  const samples = `${v.samples} samples${v.timedOut ? ", cut by the time budget" : ""}`;
  const boss = `boss (${v.bossName}, entry ${v.entryHp} HP)`;
  let numbers: string;
  if (v.route === "progress") {
    numbers = `${boss} HP left ${Math.round(m.bossLeft.with)} with it → ${Math.round(m.bossLeft.with + m.bossLeft.card.value)} without (+${fmt(m.bossLeft.card.value)} ± ${fmt(m.bossLeft.card.se)}), 1 HP of entry ≈ ${fmt(m.bossLeft.perHp.value)} boss HP (win ${pct(m.win.with)}; ${samples})`;
  } else if (v.route === "hp") {
    numbers = `${boss} won ${pct(m.win.with)}: HP lost ${Math.round(m.hpLost.with)} with it → ${Math.round(m.hpLost.with + m.hpLost.card.value)} without (${fmt(m.hpLost.card.value)} ± ${fmt(m.hpLost.card.se)}; ${samples})`;
  } else {
    numbers = `${boss} win ${pct(m.win.with)} with it → ${pct(m.win.without)} without (${m.cardDiff.value >= 0 ? "−" : "+"}${pp(Math.abs(m.cardDiff.value))} ± ${pp(m.cardDiff.se)} points), ${v.step} HP less → ${pct(m.win.lower)}: 1 HP ≈ ${pp(m.perHp.value)} points (${samples})`;
  }
  const partial = v.partial ? "; its effect is only partly modelled in the simulation: its worth may be understated" : "";
  return `${head}: ${numbers}${v.why && v.route === "win" ? `; ${v.why}` : v.why && v.route !== "win" ? ` [${v.why}]` : ""}${partial}${trust}`;
}

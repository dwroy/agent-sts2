/**
 * Multi-turn rollout of a turn's candidate lines, with the fight-value model as the terminal estimate,
 * gated by its measured effect (tools/build-fight-value.py -> src/knowledge/fight-value-gates.json).
 *
 * Backtested by tools/rollout-backtest.ts (notes/rollout-backtest.md). Live, it only supplies FACTS to Jev's
 * combat question (src/strategy/rollout-live.ts): it never ranks, filters or auto-plays a line. Everything
 * here is a pure function of its inputs (models, piles, RNG seed, and an injectable clock for the time budget).
 *
 * Per decision:
 *   1. Candidates: the top K lines by solver score, plus the line with the most damage, the least HP lost
 *      and the most setup (lasting value), without repeats.
 *   2. Every candidate is played as planned (turn 0: the solver's own outcome, enemy turn included), then
 *      up to `horizon - 1` more turns are simulated, M times with common random numbers across lines:
 *        - the enemies move by the per-enemy move model (successor counts), with each move's base damage per
 *          hit, hits, Strength and Block gain from the monster DB; Strength accumulates, our Vulnerable and
 *          the enemies' Weak apply; Vulnerable/Weak on enemies wear off one per enemy turn;
 *        - our draws come from the shuffled draw pile (the discard pile reshuffled in when it runs out);
 *        - our turns are played by the solver itself with a small node cap (the fast policy); the modelled
 *          potions still held are in its hand like 0-energy cards that exist once, each with its cost
 *          (potion-cost.ts, Dai 2026-09-30: its held value in the potion table, taken off the solver's score):
 *          drunk when its best line drinks one, gone for the rest of that sample.
 *        - the "no potion this fight" line (options.noPotionLine) holds none in its later turns.
 *   3. At the horizon (or the fight's end) the terminal estimate of the end-of-our-turn state is added:
 *      w x model (calibrated win probability) + (1 - w) x a deck-damage clock, w from the gate of the
 *      encounter's segment (0 when the model's ranking advantage is not established).
 *   3b. Kill orders (two or more kinds of enemy, killOrders()): every shown line is rolled out once per order,
 *      the policy aiming each later turn at the order's first group still alive (turn-solver focusIndex with
 *      ORDER_FOCUS_BONUS); a line's numbers are its best order's, the others kept beside them. Orders that agree
 *      on every group a sample looked at share that sample.
 *      Leader rule (rankOrders()): when one group's death ends the fight (every other group is a minion, which
 *      leaves with it: The Kin's Priest and its Followers) and no order of the line ends the fight within the
 *      horizon, the orders are ranked by fight-ending progress first: the least expected leader HP left at the
 *      horizon (within LEADER_HP_TIE), then value. A 199-HP Priest that no order kills in 5 turns otherwise
 *      ranks "Followers first" on HP lost and deaths within the horizon alone (2CCM6XK4PB37 F17), which only
 *      puts the loss past the horizon.
 *   4. A time budget per decision: the first sample of every line runs at the full horizon and times the
 *      policy; the rest is scheduled to fit (5 turns x 8 samples, else 3 turns, else fewer samples, else
 *      1 turn: the line itself + terminal). Horizon and samples used are recorded per line.
 *
 * Values are on one HP-equivalent scale: -(expected HP lost from now to the fight's end) - (expected cost of the
 * potions drunk, this turn and later: potion-cost.ts) - DEATH_HP x (1 - win probability). The current solver score
 * (which takes the drinks' cost off already) is put on it as score / its HP weight.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { TEMP_STRENGTH_LOSS_POWERS } from "../knowledge/move-model.js";
import { isStrikeCard, type CardModel } from "./card-model.js";
import { laterPhaseHps } from "./boss-clock.js";
import { valueOf, type FightValueModel } from "./fight-value.js";
import { samplePotion, type PotionMcSource } from "./potion-mc.js";
import { CLARITY_LATER_DRAWS, DEX_POTION, ERUPTION_NEXT_BLOCK, HAND_LIMIT, mantleHpCost, MUSIC_BOX_INDEX, musicBoxCopy, RADIANCE_LATER_ENERGY, SHRINK_DAMAGE_FACTOR, solveTurn, STABLE_SERUM_TURNS, turnsLeftOf, type EnemySim, type Plan, type PlayerSim, type Revive, type SolverInput } from "./turn-solver.js";

// ---------------------------------------------------------------- state snapshot + features (mirror of the Python builder)

/** One enemy in a snapshot, as in fight-value rows: [serial, id, hp, maxHp, block, alive, minion, intent total, move, powers]. */
export type SnapEnemy = [number, string, number, number, number, boolean, boolean, number, string | null, Record<string, number>];

/** The state at the end of our turn (fight-value rows `E`). */
export interface Snapshot {
  hp: number;
  mhp: number;
  blk: number;
  en: number;
  pw: Record<string, number>;
  hand: number;
  pots: number;
  E: SnapEnemy[];
}

export interface DeckSummary {
  n: number;
  atk: number;
  skl: number;
  pow: number;
  junk: number;
  dmg: number;
  blk: number;
  up: number;
}

export type FightKindName = "hallway" | "elite" | "boss";

/** Fight constants of a row: act, turn, ascension, kind, encounter, deck summary, relics, energy per turn. */
export interface FightMeta {
  act: number;
  t: number;
  asc: number;
  kind: FightKindName;
  enc: string;
  deck: DeckSummary;
  relics: number;
  max_en: number;
}

/** move-model.json: successor counts and average shown damage per move. */
export type MoveModelData = Record<string, { next: Record<string, Record<string, number>>; damage: Record<string, number> }>;

const PLAYER_POWERS = [
  "STRENGTH_POWER", "DEXTERITY_POWER", "WEAK_POWER", "FRAIL_POWER", "VULNERABLE_POWER", "DEMON_FORM_POWER", "METALLICIZE_POWER",
  "PLATING_POWER", "BARRICADE_POWER", "FEEL_NO_PAIN_POWER", "REGEN_POWER", "INTANGIBLE_POWER", "BUFFER_POWER", "THORNS_POWER",
  "RAGE_POWER", "JUGGERNAUT_POWER",
];

function expectedNext(mm: MoveModelData, id: string, move: string | null): number | null {
  const entry = mm[id];
  if (!entry || !move) return null;
  const successors = entry.next[move];
  if (!successors) return null;
  let total = 0;
  let count = 0;
  for (const [m, n] of Object.entries(successors)) {
    const d = entry.damage[m];
    if (d === undefined || d === null) continue;
    total += d * n;
    count += n;
  }
  return count ? total / count : null;
}

/** base_features() of tools/build-fight-value.py: the model's named inputs for one end-of-turn state. */
export function featuresOf(meta: FightMeta, E: Snapshot, mm: MoveModelData): Record<string, number> {
  const pw = E.pw;
  const live = E.E.filter((e) => e[5]);
  const nonMinion = live.filter((e) => !e[6]);
  const main = nonMinion.length > 0 ? nonMinion : live;
  const deck = meta.deck;
  const f: Record<string, number> = {};
  f["hp"] = E.hp;
  f["max_hp"] = E.mhp || 80;
  f["hp_frac"] = E.hp / Math.max(1, f["max_hp"]);
  f["block"] = E.blk;
  for (const p of PLAYER_POWERS) f[`p_${p.replace("_POWER", "").toLowerCase()}`] = pw[p] ?? 0;
  f["n_powers"] = Object.keys(pw).length;
  f["energy_per_turn"] = meta.max_en;
  f["hand"] = E.hand;
  f["potions"] = E.pots;
  f["relics"] = meta.relics;
  f["deck_n"] = deck.n;
  const n = Math.max(1, deck.n);
  f["deck_atk_frac"] = deck.atk / n;
  f["deck_pow"] = deck.pow;
  f["deck_junk"] = deck.junk;
  f["deck_dmg_per_card"] = deck.dmg / n;
  f["deck_blk_per_card"] = deck.blk / n;
  f["deck_up_frac"] = deck.up / n;
  f["act"] = meta.act || 1;
  f["turn"] = meta.t;
  f["asc"] = meta.asc || 0;
  f["kind_elite"] = meta.kind === "elite" ? 1 : 0;
  f["kind_boss"] = meta.kind === "boss" ? 1 : 0;
  f["n_living"] = live.length;
  f["n_minions"] = live.filter((e) => e[6]).length;
  f["enemy_hp_sum"] = main.reduce((s, e) => s + Math.max(0, e[2]), 0);
  f["enemy_hp_max"] = main.length > 0 ? Math.max(...main.map((e) => e[2])) : 0;
  f["enemy_maxhp_sum"] = main.reduce((s, e) => s + (e[3] || 0), 0);
  f["enemy_hp_frac"] = f["enemy_hp_sum"] / Math.max(1, f["enemy_maxhp_sum"]);
  f["enemy_block_sum"] = live.reduce((s, e) => s + e[4], 0);
  const strs = live.map((e) => e[9]["STRENGTH_POWER"] ?? 0);
  f["enemy_str_sum"] = strs.reduce((s, v) => s + v, 0);
  f["enemy_str_max"] = strs.length > 0 ? Math.max(...strs) : 0;
  f["enemy_vuln_max"] = Math.max(0, ...live.map((e) => e[9]["VULNERABLE_POWER"] ?? 0));
  f["enemy_weak_max"] = Math.max(0, ...live.map((e) => e[9]["WEAK_POWER"] ?? 0));
  f["enemy_artifact"] = live.reduce((s, e) => s + (e[9]["ARTIFACT_POWER"] ?? 0), 0);
  f["enemy_npowers"] = live.reduce((s, e) => s + Object.keys(e[9]).length, 0);
  const incoming = live.reduce((s, e) => s + e[7], 0);
  f["intent_dmg"] = incoming;
  f["intent_dmg_max"] = Math.max(0, ...live.map((e) => e[7]));
  f["incoming_after_block"] = Math.max(0, incoming - E.blk);
  let next = 0;
  let unknown = 0;
  for (const e of live) {
    let x = expectedNext(mm, e[1], e[8]);
    if (x === null) {
      unknown += 1;
      x = e[7];
    }
    next += x;
  }
  f["threat_next"] = next;
  f["threat_next_unknown"] = unknown;
  const cardsTurn = Math.min(5.0, meta.max_en * 1.4);
  const atkTurn = (cardsTurn * deck.atk) / n;
  const raw = (cardsTurn * deck.dmg) / n + atkTurn * (f["p_strength"] ?? 0);
  f["deck_dmg_turn"] = 9 + 1.04 * raw;
  f["turns_to_kill"] = f["enemy_hp_sum"] / Math.max(1.0, f["deck_dmg_turn"]);
  f["hp_minus_incoming"] = E.hp - f["incoming_after_block"];
  return f;
}

/** Terminal estimate: further HP loss (the coming enemy turn included), win probability, turns after this one. */
export interface Estimate {
  hpLoss: number;
  winProb: number;
  turns: number;
}

/** baseline_b1() of the Python builder: a deck-damage clock (incoming now + next-turn threat per turn to kill). */
export function clockEstimate(f: Record<string, number>): Estimate {
  if ((f["n_living"] ?? 0) === 0 || (f["enemy_hp_sum"] ?? 0) <= 0) return { hpLoss: 0, winProb: 0.99, turns: 0 };
  const ttk = Math.min(15, Math.max(1, Math.ceil(f["turns_to_kill"] ?? 1)));
  const per = Math.max(0, (f["threat_next"] ?? 0) - 0.5 * (f["deck_blk_per_card"] ?? 0) * Math.min(5, (f["energy_per_turn"] ?? 3) * 1.4) * (1 - (f["deck_atk_frac"] ?? 0)));
  const loss = (f["incoming_after_block"] ?? 0) + per * (ttk - 1);
  const margin = (f["hp"] ?? 0) - loss;
  return { hpLoss: loss, winProb: 1 / (1 + Math.exp(-margin / 8)), turns: ttk - 1 };
}

// ---------------------------------------------------------------- gates (Part A)

export interface GateSegment {
  level: "enc" | "ak" | "k" | "global";
  n_pairs: number;
  /** Decision points in the segment's pairs: the sample size n of the gate. */
  n_rows: number;
  conc_current: number | null;
  conc_model: number | null;
  /** The blend weight tested (grid value with the highest lower CI bound). */
  w_cap: number;
  /** Advantage of the w_cap blend over the current weights, and its CI. */
  advantage: number;
  ci: [number | null, number | null];
  /** The same for the model alone. */
  advantage_model?: number;
  ci_model?: [number | null, number | null];
  w: number;
  uses: string;
  act?: number;
  kind?: string;
}

export type Calibration = { method: "none" } | { method: "isotonic"; knots: [number, number][] } | { method: "platt"; ab: [number, number] };

export interface FightValueGates {
  params: { min_rows: number; n0: number; a_full: number; death_hp: number; grid: number[] };
  /** Win-probability calibration per fight kind (chosen by nested out-of-fold Brier). */
  calibration: Record<string, Calibration>;
  segments: Record<string, GateSegment>;
}

let gatesCache: FightValueGates | null | undefined;

/** The committed gates file, or null when missing. */
export function loadFightValueGates(): FightValueGates | null {
  if (gatesCache !== undefined) return gatesCache;
  try {
    const path = join(dirname(fileURLToPath(import.meta.url)), "..", "knowledge", "fight-value-gates.json");
    gatesCache = JSON.parse(readFileSync(path, "utf8")) as FightValueGates;
  } catch {
    gatesCache = null;
  }
  return gatesCache;
}

export const DEATH_HP = 40;

function smoothstep(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

/** w = w_cap x n/(n+n0) x smoothstep(clamp(lower CI bound / a_full, 0, 1)) (gate_weight() in the builder). */
export function gateWeight(n: number, lowerBound: number, wCap = 1, params: { n0: number; a_full: number } = { n0: 100, a_full: 0.02 }): number {
  if (n <= 0) return 0;
  return wCap * (n / (n + params.n0)) * smoothstep(lowerBound / params.a_full);
}

export interface Gate {
  /** The segment the weight comes from (the encounter's own, or the one it backed off to). */
  segment: string;
  w: number;
  /** Decision points behind the segment's measurement. */
  n: number;
  advantage: number;
  ci: [number | null, number | null];
}

/** The gate of a decision: its encounter's segment, else act x kind, else kind, else global (resolve_segment() in the builder). */
export function gateFor(gates: FightValueGates | null, enc: string, act: number, kind: FightKindName): Gate {
  if (!gates) return { segment: "none", w: 0, n: 0, advantage: 0, ci: [null, null] };
  for (const key of [`enc:${enc}`, `ak:${act}|${kind}`, `k:${kind}`, "global"]) {
    const entry = gates.segments[key];
    if (!entry) continue;
    const used = gates.segments[entry.uses] ?? entry;
    return { segment: entry.uses, w: entry.w, n: used.n_rows, advantage: used.advantage, ci: used.ci };
  }
  return { segment: "none", w: 0, n: 0, advantage: 0, ci: [null, null] };
}

function logit(p: number): number {
  const c = Math.min(1 - 1e-4, Math.max(1e-4, p));
  return Math.log(c / (1 - c));
}

/** Calibrated win probability: none, isotonic (linear between knots, flat outside) or Platt (cal_apply() in the builder). */
export function calibrate(cal: Calibration | undefined, p: number): number {
  if (!cal || cal.method === "none") return p;
  if (cal.method === "platt") return 1 / (1 + Math.exp(-(cal.ab[0] * logit(p) + cal.ab[1])));
  const knots = cal.knots;
  if (knots.length === 0) return p;
  if (p <= knots[0]![0]) return knots[0]![1];
  const last = knots[knots.length - 1]!;
  if (p >= last[0]) return last[1];
  let j = 1;
  while (j < knots.length && knots[j]![0] <= p) j += 1;
  const [x0, y0] = knots[j - 1]!;
  const [x1, y1] = knots[j]!;
  return x1 === x0 ? y0 : y0 + ((y1 - y0) * (p - x0)) / (x1 - x0);
}

/** The solver's HP weight (turn-solver weightsFor, without the next-phase factor). */
export function solverHpWeight(hp: number, maxHp: number): number {
  const frac = maxHp > 0 ? hp / maxHp : 1;
  return 1 + (1.5 * Math.max(0, 0.6 - frac)) / 0.6;
}

/** HP-equivalent value of an estimate: -(own HP lost) - further loss - DEATH_HP x (1 - win). */
export function hpValue(own: number, e: Estimate): number {
  return -own - e.hpLoss - DEATH_HP * (1 - e.winProb);
}

/** w x model + (1 - w) x current, both HP-equivalent. */
export function blend(w: number, model: number, current: number): number {
  return w * model + (1 - w) * current;
}

export interface TerminalContext {
  meta: FightMeta;
  mm: MoveModelData;
  model: FightValueModel | null;
  gates: FightValueGates | null;
  w: number;
}

/** Model (calibrated), clock and gated terminal estimates of one end-of-our-turn state. */
export function terminal(ctx: TerminalContext, snap: Snapshot, t: number): { model: Estimate | null; clock: Estimate; gated: Estimate; n: number } {
  const meta = { ...ctx.meta, t };
  const f = featuresOf(meta, snap, ctx.mm);
  const clock = clockEstimate(f);
  const live = snap.E.filter((e) => e[5]);
  const raw = ctx.model ? valueOf({ features: f, enemyIds: live.map((e) => e[1]), encounter: meta.enc, kind: meta.kind, act: meta.act }, ctx.model) : null;
  const model = raw ? { hpLoss: raw.hpLoss, winProb: calibrate(ctx.gates?.calibration[meta.kind], raw.winProb), turns: raw.turns } : null;
  const w = model ? ctx.w : 0;
  const gated = model
    ? { hpLoss: w * model.hpLoss + (1 - w) * clock.hpLoss, winProb: w * model.winProb + (1 - w) * clock.winProb, turns: w * model.turns + (1 - w) * clock.turns }
    : clock;
  return { model, clock, gated, n: raw?.n ?? 0 };
}

// ---------------------------------------------------------------- rollout

/** One enemy move: base damage per hit (before Strength), hits, Strength and Block it gains. */
export interface EnemyMove {
  damage: number;
  hits: number;
  strength: number;
  block: number;
  /** Burrow (Tunneler): the move gains BURROWED_POWER. */
  burrows?: boolean;
  /** Vigor the move gives itself (Terror Eel's Thrash: 6): added to its next attack's hits. */
  vigor?: number;
  /**
   * What the move puts on us (monster DB player_powers_applied at this ascension): Vulnerable, Weak and
   * Frail turns, and Strength/Dexterity drained (negative). Terror Eel's Terror: VULNERABLE_POWER 99.
   */
  playerPowers?: Partial<Record<PlayerDebuff, number>>;
  /**
   * The powers in playerPowers are alternatives, one a use (the Knowledge Demon's Curse of Knowledge: we
   * pick one of Sloth, Mind Rot, Waste Away, Disintegration): in the order of the logged picks, the first we
   * do not hold yet is the one applied.
   */
  playerPowerChoice?: PlayerDebuff[];
  /** Not logged at this ascension: the nearest ascension's damage scaled by the measured ratio (monster-db moveDamageAt). */
  estimated?: boolean;
  /**
   * `damage` is the move's shown hit (monster-db shownDamageAt: no base was ever measured), Strength and our
   * Vulnerable already in it: not scaled by them again (the Queen's Off With Your Head, 7x5 shown, was one
   * 67 hit in the rollout).
   */
  shown?: boolean;
  /**
   * Whole fights only (B4): a Surrounded move's hit when we face it (monster-db moveDamageAt `base`); `damage` is the
   * average over the logged facings, which the whole fight must not scale by the back attack's 1.5 again.
   */
  faceDamage?: number;
  /** Whole fights only (B4): the Sandpit count the move starts on its user (the Insatiable's Liquify Ground: 4). */
  sandpit?: number;
  /**
   * Powers the move gives its user besides Strength, Block, Burrowed and Vigor (monster DB self_powers_gained
   * at this ascension): Ritual (Cultists' Incantation: Strength at the end of each of its later turns),
   * Intangible (Soul Fysh's Fade: our next turn's hits deal 1), Thorns (Spiny Toad, Toadpole) and Soar (Owl
   * Magistrate: damage halved) until its next move, Flutter (Thieving Hopper), Personal Hive (Entomancer: a
   * Dazed per hit), Vital Spark (Infested Prism: Tainted per Skill), Steam Eruption (Waterfall Giant: +3 a
   * move, what it explodes for when killed).
   */
  selfPowers?: Partial<Record<EnemySelfPower, number>>;
  /** HP it heals itself (Waterfall Giant's Siphon, Knowledge Demon's Ponder; rollout-live healOf). */
  heal?: number;
  /**
   * Damage a hit gains with each use (the Waterfall Giant's Pressure Gun: A8 20, 25, 30; monster-db moveBaseDamages).
   * Whole fights only (simulateFight): a 5-turn window sees one use.
   */
  growth?: number;
  /**
   * Status cards it puts in our piles (monster DB status_cards, status_card_ids, status_card_pile): Soul
   * Fysh's Beckon 2, Vantom's Dismember, Chomper's Screech 3 … `cardId` null when the DB does not know
   * which card (built before it recorded them): UNKNOWN_STATUS stands in, a dead draw.
   */
  statusCards?: { cardId: string | null; count: number; pile: "draw" | "discard" }[];
}

/** The status a move adds when the monster DB does not say which: a Wound (「不能被打出」, nothing else), a dead draw. */
export const UNKNOWN_STATUS = "WOUND";

/** The self-buffs of enemy moves the rollout applies (EnemyMove.selfPowers). */
export const ENEMY_SELF_POWERS = ["RITUAL_POWER", "INTANGIBLE_POWER", "THORNS_POWER", "SOAR_POWER", "FLUTTER_POWER", "PERSONAL_HIVE_POWER", "VITAL_SPARK_POWER", "STEAM_ERUPTION_POWER"] as const;
export type EnemySelfPower = (typeof ENEMY_SELF_POWERS)[number];

/**
 * Strength an enemy gains at the end of each of its turns (「在你的回合结束时获得力量」): Ritual (Cultists,
 * Devoted Sculptor), Territorial (Byrdonis, 「会获得1点力量」), High Voltage (Zapbot, 「会获得2点力量」); the amount
 * is the gain (logged Territorial 1, High Voltage 2).
 */
export const STRENGTH_GROWTH_POWERS = ["RITUAL_POWER", "TERRITORIAL_POWER", "HIGH_VOLTAGE_POWER"] as const;

/** The powers an enemy move puts on us that the rollout applies to its later turns (EnemyMove.playerPowers). */
export const PLAYER_DEBUFFS = [
  "VULNERABLE_POWER", "WEAK_POWER", "FRAIL_POWER", "STRENGTH_POWER", "DEXTERITY_POWER",
  // Hunter Killer's Tender (for the fight: Strength and Dexterity -1 a card played), Living Fog's Smoggy (one
  // Skill a turn), Vine Shambler's Tangled (Attacks +1 next turn), the Queen's Chains of Binding (the first 3
  // cards drawn each turn Soulbound), the Shrinker's Shrink (-1: for the fight), the Beast's Ringing (one card
  // next turn), the Knowledge Demon's curses (Sloth, Disintegration, Mind Rot, Waste Away), Constrict.
  "TENDER_POWER", "SMOGGY_POWER", "TANGLED_POWER", "CHAINS_OF_BINDING_POWER", "SHRINK_POWER", "RINGING_POWER",
  "SLOTH_POWER", "DISINTEGRATION_POWER", "CONSTRICT_POWER", "MIND_ROT_POWER", "WASTE_AWAY_POWER",
] as const;
export type PlayerDebuff = (typeof PLAYER_DEBUFFS)[number];

export interface EnemyTable {
  moves: Record<string, EnemyMove>;
  /** Successor counts per move. */
  next: Record<string, Record<string, number>>;
  /**
   * A Shriek / Plow threshold the enemy gets later in the fight (the Ceremonial Beast's Plow 150, A9 160: first seen
   * on turn 2, after Stamp): its amount and the fight turn it is up from. Whole fights arm it then (simulateFight).
   */
  shriekFrom?: { amount: number; turn: number };
}

/** The enemy behind each solver enemy (same index). */
export interface RolloutEnemy {
  index: number;
  id: string;
  move: string | null;
  strength: number;
  powers: Record<string, number>;
}

export interface RolloutOptions {
  /** Top lines by score (before the diversity picks). */
  k?: number;
  samples?: number;
  horizon?: number;
  budgetMs?: number;
  seed?: number;
  /** Node cap of the fast policy's solver call. */
  policyNodes?: number;
  /** The fast policy's damage weight times this (SolverInput.damageScale; the whole-fight simulator's knob). Unset: 1. */
  policyDamageScale?: number;
  /**
   * The whole-fight simulator's policy only (src/sim/boss-sim.ts, docs/boss-sim.md B1.5; never set by the live planner or
   * the rollout): the policy's HP weight times this (SolverInput.hpScale). Unset: 1.
   */
  policyHpScale?: number;
  /**
   * The whole-fight policy only: the HP weight also times (1 + policyThreat x the enemies' attack this turn / our HP), so
   * a turn whose hit is large against the HP left blocks more, as the logged boss fights did. Unset: 0.
   */
  policyThreat?: number;
  /**
   * The whole-fight policy only (B5, docs/boss-sim.md §14; never set by the live planner or the rollout): a one-turn
   * lookahead. Each policy turn the enemies' attacks on their next turn are forecast from the move model along their
   * scripts (nextAttacks) and given to the solver as the live planner gives its own (nextIncoming), and:
   *  - lethal: HP lost now that ends us below what the next hit takes through a fresh hand counts this much more
   *    (SolverInput.nextHit);
   *  - threat: the HP weight also times (1 + threat x the next turn's forecast attack / our HP).
   * Unset (or both 0): no lookahead, the turns as before.
   */
  policyLookahead?: { lethal: number; threat: number };
  /**
   * The whole-fight simulator's pre-fight start only (simulateFight with no line; boss-sim syntheticStart): cards drawn
   * from the shuffled draw pile into the hand before the policy plays the first turn. Unset: 0 (the hand as given).
   */
  drawFirst?: number;
  handSize?: number;
  /** Clock in ms (injectable for tests). */
  now?: () => number;
  /** Lines to evaluate as well (tagged "offered"): the backtest adds every line Jev was shown. */
  include?: Plan[];
  /**
   * Kill orders for the later turns (killOrders()). With two or more, every `include` line is rolled out
   * under each, with the same random numbers; its estimate is its best order's, the others kept beside it.
   * The other candidates keep the solver's own later turns.
   */
  orders?: KillOrder[];
  /** The kill-order policy's extra damage weight on its target (default ORDER_FOCUS_BONUS). */
  orderFocusBonus?: number;
  /**
   * The "no potion this fight" line (Dai 2026-09-30): a potion-free line (its own Plan object, a copy of a shown
   * one) rolled out with no potion in its later turns either. Tagged "offered" and "no-potion".
   */
  noPotionLine?: Plan;
}

export interface RolloutInput {
  /** This turn's solver input (as the live planner built it). */
  solver: SolverInput;
  /** The solver's plans for it, best first. */
  plans: Plan[];
  enemies: RolloutEnemy[];
  tables: Record<string, EnemyTable>;
  /**
   * Base cards (before our Strength and Weak): the draw pile (null when unknown), the discard pile, and
   * the base version of each hand card by solver hand position (null: keep the hand card as it is).
   */
  piles: {
    draw: CardModel[];
    discard: CardModel[];
    handBase: (CardModel | null)[];
    /**
     * SL_RETRY_KNOWN_DRAWS (docs/sl.md §10): the draw pile's top cards in draw order, as indices into `draw` (the first
     * one drawn first), known from an earlier attempt at this fight. Every sample draws them first, in this order; only
     * the rest of the pile is shuffled. Absent: the whole pile shuffled, as before.
     */
    drawTop?: number[];
  };
  meta: FightMeta;
  playerPowers: Record<string, number>;
  potions: number;
  mm: MoveModelData;
  model: FightValueModel | null;
  gates: FightValueGates | null;
  options?: RolloutOptions;
  /**
   * Base card models of the status cards enemy moves put in our piles (EnemyMove.statusCards), by card id,
   * UNKNOWN_STATUS included (rollout-live builds them as the piles' own). Absent: no status is added.
   */
  statusCards?: Record<string, CardModel>;
  /**
   * Energy relics (run.max_energy leaves them out: 3 shown with Pumpkin Candle, 4 at every turn start): each
   * one's energy a turn from fight turn `from` (Pael's Flesh from T3, Bread from T2). meta.max_en stays the
   * fight-value feature it was trained as.
   */
  relicEnergy?: { amount: number; from: number }[];
  /**
   * Block relics that trigger at the start of one fight turn (Captain's Wheel: 18 at the start of turn 3, logged 19
   * of 20 third turns started with exactly 18, every other turn with none): the amount and that turn.
   */
  relicBlock?: { amount: number; turn: number }[];
  /**
   * Whole fights only (simulateFight; the rollout and the live planner never read it): relics whose energy or block
   * comes on given fight turns and that relicEnergy / relicBlock leave out (rollout-live fightRelicsOf: Candelabra's 2
   * energy on turn 2, Chandelier's 3 on turn 3, Happy Flower's 1 every 3rd turn, Horn Cleat's 14 block on turn 2).
   */
  fightRelics?: {
    energy: { amount: number; turn: number }[];
    block: { amount: number; turn: number }[];
    /**
     * B2 (whole fights only): Pendulum's extra draws on given turns (logged: every 3rd turn, 1 card), Orichalcum's end-of-turn
     * block when the turn left none (6), Ripple Basin's when no Attack was played (4), Sturdy Clamp's block kept into the
     * next turn (up to 10), Ice Cream's unspent energy carried over.
     */
    draws?: { amount: number; turn: number }[];
    orichalcum?: number;
    rippleBasin?: number;
    blockKeep?: number;
    iceCream?: boolean;
  };
  /**
   * Whole fights only (B2): the random potions held (potion-mc sources: card-choice potions' pools, draw potions). Each
   * later turn a held one is a new sample of it, as potion-mc draws them: a random offer of 3 cards from the pool, or
   * the top cards of this sample's own draw pile; the hand's card for it (card-model's expected value) otherwise.
   */
  randomPotions?: PotionMcSource[];
  /**
   * What an enemy spawns when it dies, by its id (monster-db ON_DEATH_SPAWNS: the Phrog Parasite's 4 Wrigglers,
   * the Gremlin Merc's two gremlins): each spawn's id, name, HP and first move. Their move tables are in `tables`.
   */
  spawns?: Record<string, SpawnTemplate[]>;
  /**
   * A card put into the draw pile each time it is shuffled (Biiig Hug: 「每当你的抽牌堆打乱洗牌时，将一张煤灰加入你的
   * 抽牌堆」; logged CMUX F19/F20/F22: one Soot in the new draw pile after each shuffle), or absent.
   */
  onShuffle?: CardModel;
  /**
   * THIEF_FACTS (src/strategy/thief.ts escapeInput; absent: before it, nobody leaves): enemies that leave the fight.
   * `moves`: by enemy id, the moves whose resolution takes it out of the fight (the monster DB's Escape intent: the
   * Thieving Hopper's ESCAPE_MOVE, the Fat Gremlin's FLEE_MOVE), unless it is stunned (a Hopper whose last Flutter the
   * turn stripped: its Escape is cancelled, XMY29WWQDC1Y F19 T5 -> T6). Gone, it is no kill and spawns nothing, and the
   * fight is over when nobody is left (RPC6X61N9FQ0 F20 T5: the reward screen next). Before, the move model kept it
   * there doing nothing (Escape -> Escape 0 damage; Flee with no successor) until the policy killed it.
   * `carriers`: the board index of each enemy carrying our card or gold now, and its tag; `heirs`: by enemy id, the
   * spawn that takes the tag over when it dies (Gremlin Merc -> Fat Gremlin). Each turn record then says, per tag, whether
   * the loot is back (every holder killed), gone (a holder left) or still open.
   * `lootHp` (THIEF_COST, docs/thief.md §7; absent: no cost, the value as before): by tag, the HP the loot is worth. A
   * sample pays it when the loot is gone at its end, or still open (a holder in the fight at the horizon's end: the Merc
   * keeps taking gold and its Fat Gremlin flees two turns after it dies; the gold came back in 12 of 44 logged A8+ Merc
   * fights), and not when it is back or the sample dies (no later for it, as a potion's cost). Off the value like a
   * potion's cost: `thiefCost` is the line's mean.
   */
  escapes?: { moves: Record<string, string[]>; carriers: Record<number, string>; heirs: Record<string, string>; lootHp?: Record<string, number> };
}

/** One enemy an on-death spawn brings (RolloutInput.spawns). */
export interface SpawnTemplate {
  id: string;
  name: string;
  hp: number;
  count: number;
  /** Its first move (SPAWNED_MOVE: no attack the turn it arrives), null when unknown (the table's own chain). */
  move: string | null;
}

/** One kill order's rollout of a line: the same numbers as the line's own (LineEstimate). */
export interface OrderEstimate {
  order: KillOrder;
  /**
   * Samples in which the order's first group is dead by the end of the horizon (the fight won counts);
   * null when that group is an illusion, which revives (FA82/981W Parafright: "dead by T5 8/8").
   */
  firstDown: number | null;
  /**
   * With a leader (KillOrder.leader): its expected HP left at the end of the horizon (0 in a sample that
   * ended the fight) and the samples in which it is dead by then; null without one.
   */
  leader: { hpLeft: number; dead: number } | null;
  /** Expected HP of the living enemies at the end of the horizon (0 in a sample that won; at our death, what they had then). */
  enemyHpLeft: number;
  /** Expected turns we stay alive within the horizon (the horizon when we live through it or win). */
  turnsSurvived: number;
  hpLoss: number;
  turnsToWin: number | null;
  deaths: number;
  turnsToDeath: number | null;
  winProb: number;
  wins: number;
  value: number;
  valueModelTerminal: number | null;
  modelForecast: { hpLoss: number; winProb: number } | null;
  perTurn: TurnSpread[];
  /** Expected cost of the potions drunk (this turn and the later turns), in HP: in `value` already. */
  potionCost: number;
  /** Samples (of `samples`) whose later turns drink each potion (by id). */
  laterDrinks: Record<string, number>;
  /** RolloutInput.escapes: per carrier tag, the samples in which its loot is back by the horizon (killed) or gone (it left). */
  thieves?: Record<string, { back: number; gone: number }>;
  /** THIEF_COST (escapes.lootHp): the expected loot lost, in HP (in `value` already), and per tag the samples charged. */
  thiefCost?: number;
  thiefLost?: Record<string, number>;
}

export interface LineEstimate {
  plan: Plan;
  /**
   * The kill order of the later turns behind this estimate (the best of `orders` by value), or null
   * without kill orders (one kind of enemy, or a 1-turn estimate).
   */
  order: KillOrder | null;
  /** Every kill order rolled out for the line, best first (empty without kill orders). */
  orders: OrderEstimate[];
  /** The orders were ranked by the leader rule (rankOrders()), not by value alone. */
  ordersByLeader?: boolean;
  /** Why it is a candidate: top (by score), damage, safe (least HP lost), setup. */
  tags: string[];
  score: number;
  /** (i) the current score on the HP scale. */
  currentValue: number;
  /** (ii) the line + terminal: expected own-turn loss + further loss, win prob, value (gated blend with the current score). */
  oneTurn: { hpLoss: number; winProb: number; turns: number; modelValue: number | null; value: number };
  /** (iii) the rollout: expected HP lost from now to the fight's end, turns to the fight's end, win prob. */
  hpLoss: number;
  /**
   * Expected HP of the living enemies at the end of the horizon (0 in a sample that won; at our death,
   * what they had then), and the expected turns we stay alive within it: what still tells lines apart
   * when every line loses all our HP (rollout-live.ts pickRolloutBest).
   */
  enemyHpLeft: number;
  turnsSurvived: number;
  /**
   * With a leader (KillGroup.leader: its death ends the fight, the others are minions; not the Queen): its
   * expected HP left at the end of the horizon (0 in a sample that won; at our death, what it had then), for
   * every line, whatever its kill order; null without one. A saturated board ranks by it first
   * (rollout-live pickRolloutBest), as the kill orders are ranked (rankOrders).
   */
  leaderHpLeft: number | null;
  /** Mean turns to the fight's end over the samples that survive the horizon; null when every sample dies. */
  turnsToWin: number | null;
  /** Samples (of `samples`) in which we die within the horizon, and the mean turn of death among them. */
  deaths: number;
  turnsToDeath: number | null;
  winProb: number;
  /** Samples (of `samples`) in which the fight was won within the horizon. */
  wins: number;
  /** Samples in which a time limit ended the fight unwon (the Battleworn Dummy); absent when none. */
  timeUps?: number;
  /**
   * Expected cost of the potions the line drinks, this turn and in its later turns, in HP (potion-cost.ts: each one's
   * held value; 0 in a boss fight). `value` has it taken off; the effective loss is hpLoss + potionCost.
   */
  potionCost?: number;
  /** Samples (of `samples`) whose later turns drink each potion (by id); empty when none does. */
  laterDrinks?: Record<string, number>;
  /** The "no potion this fight" line (RolloutOptions.noPotionLine). */
  noPotionFight?: boolean;
  /** Samples that spent a revive (Fairy in a Bottle, Lizard Tail) within the horizon; absent when none. */
  revived?: number;
  /**
   * RolloutInput.escapes: per carrier tag, the samples (of `samples`) in which the loot is back by the horizon (every
   * holder killed before it left) or gone (a holder left with it); the rest are still open (or died). Absent without.
   */
  thieves?: Record<string, { back: number; gone: number }>;
  /**
   * THIEF_COST (RolloutInput.escapes.lootHp): the expected HP of the loot lost (a sample pays a thief's loot HP when it
   * is gone at its end or still open; not when back or when the sample dies); `value` has it taken off. Per tag, the
   * samples charged. Absent without lootHp.
   */
  thiefCost?: number;
  thiefLost?: Record<string, number>;
  value: number;
  /** The same trajectories with the ungated model as terminal (w = 1), for comparison. */
  valueModelTerminal: number | null;
  /** Forecasts with the model terminal (w = 1): (ii) and (iii) expected HP loss and win probability. */
  modelForecast: { oneTurn: { hpLoss: number; winProb: number } | null; rollout: { hpLoss: number; winProb: number } | null };
  horizon: number;
  samples: number;
  /**
   * The simulated later turns (2..horizon), across the samples: HP lost and damage dealt that turn
   * (mean, min, max over the samples still fighting it), and how many samples are alive at its end and
   * have won by then. Empty for a 1-turn estimate.
   */
  perTurn: TurnSpread[];
  /** modelN: the model's support (logged turns in the matching cell) at the line's end-of-turn state. */
  basis: { rolloutSamples: number; horizon: number; modelN: number; w: number; segment: string; gateN: number };
  /**
   * A drink line whose drink changes nothing this turn: the line without it, whose rollout numbers these are
   * (rollout-live noEffectTwin; the two read tied instead of one winning by sampling noise).
   */
  sameAsDry?: Plan;
}

export interface TurnSpread {
  /** 2 = next turn (1 is the line itself, exact). */
  turn: number;
  /** Samples still fighting this turn (of `samples`). */
  fighting: number;
  loss: { mean: number; min: number; max: number };
  dmg: { mean: number; min: number; max: number };
  alive: number;
  won: number;
}

/** Per-turn spread of one line's samples (turns 2..horizon). */
export function turnSpreads(trajectories: TurnRecord[][], horizon: number): TurnSpread[] {
  const out: TurnSpread[] = [];
  const stats = (xs: number[]) => ({ mean: xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length), min: xs.length ? Math.min(...xs) : 0, max: xs.length ? Math.max(...xs) : 0 });
  for (let t = 1; t < horizon; t += 1) {
    const fighting = trajectories.filter((records) => records.length > t && !records.slice(0, t).some((r) => r.won || r.died || r.timeUp));
    out.push({
      turn: t + 1,
      fighting: fighting.length,
      loss: stats(fighting.map((records) => records[t]!.loss)),
      dmg: stats(fighting.map((records) => records[t]!.dmg)),
      alive: trajectories.filter((records) => !records.slice(0, t + 1).some((r) => r.died)).length,
      won: trajectories.filter((records) => records.slice(0, t + 1).some((r) => r.won)).length,
    });
  }
  return out;
}

export interface RolloutResult {
  lines: LineEstimate[];
  /** The kill orders compared (empty: none, the solver's own later turns). */
  orders: KillOrder[];
  horizon: number;
  samples: number;
  elapsedMs: number;
  /** Steps taken to fit the budget ("horizon 3", "samples 4", "1-turn"). */
  degraded: string[];
  policyTurns: number;
  policyMs: number;
  policyNodes: number;
}

/** Seeded PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * A sample's draw pile (drawn from the end): the whole pile shuffled, or with SL_RETRY_KNOWN_DRAWS (piles.drawTop) the
 * known top cards on top in their order and only the rest shuffled under them. Indices that do not name distinct cards of
 * the pile leave the pile shuffled as before (the caller built them from this pile; never expected).
 */
export function sampledDrawPile(piles: RolloutInput["piles"], random: () => number): CardModel[] {
  const top = piles.drawTop;
  if (!top || top.length === 0) return shuffle(piles.draw, random);
  const valid = top.every((at, i) => Number.isInteger(at) && at >= 0 && at < piles.draw.length && top.indexOf(at) === i);
  if (!valid) return shuffle(piles.draw, random);
  const known = new Set(top);
  const rest = piles.draw.filter((_, i) => !known.has(i));
  return [...shuffle(rest, random), ...[...top].reverse().map((at) => piles.draw[at]!)];
}

const isPotion = (step: { cardId: string }): boolean => step.cardId.startsWith("POTION:");
/** A Waterfall Giant husk's HP (the game shows 999,999,999). */
const HUSK_HP = 999_999_999;

/** Top k by score, then the most damage, the least HP lost and the most setup, without repeats. */
export function selectCandidates(plans: Plan[], k = 6, include: Plan[] = []): { plan: Plan; tags: string[] }[] {
  const picked = new Map<Plan, string[]>();
  const add = (plan: Plan | undefined, tag: string) => {
    if (!plan) return;
    const tags = picked.get(plan) ?? [];
    tags.push(tag);
    picked.set(plan, tags);
  };
  plans.slice(0, k).forEach((plan) => add(plan, "top"));
  const best = (key: (plan: Plan) => number) => plans.reduce<Plan | undefined>((a, b) => (a === undefined || key(b) > key(a) ? b : a), undefined);
  add(best((p) => p.outcome.damageDealt * 1000 + p.score / 1000), "damage");
  add(best((p) => -p.outcome.hpLoss * 1000 + p.score / 1000), "safe");
  const setup = best((p) => p.outcome.lasting + 5 * p.outcome.strengthGained + p.score / 1000);
  if (setup && setup.outcome.lasting + setup.outcome.strengthGained > 0) add(setup, "setup");
  include.forEach((plan) => add(plan, "offered"));
  return [...picked.entries()].map(([plan, tags]) => ({ plan, tags }));
}

/** A lasting power the rollout carries into its later turns (a SimPlayer field). */
type LastingPower = "demonForm" | "endTurnBlock" | "juggernaut" | "keepsBlock" | "inferno" | "mantle" | "rupture" | "pyre" | "unmovable" | "boulder" | "hellraiser" | "darkEmbrace";

/**
 * Power cards whose lasting effect the rollout carries: the SimPlayer field, the power it shows as (for
 * the terminal snapshot) and the fallback amounts (base / upgraded, from the logged cards' vars) when the
 * card has no powerAmount. A power played in the line stays up for every later rollout turn (0B5Y F33
 * T1: a line with Inferno and one without showed the same T2/T3 damage, 16 and 30.4). Feel No Pain and
 * Stone Armor ride on their own card fields (feelNoPain, plating); Inflame's Strength is the outcome's.
 */
const POWER_EFFECTS: Record<string, { effect: LastingPower; power: string; amount: [number, number] }> = {
  DEMON_FORM: { effect: "demonForm", power: "DEMON_FORM_POWER", amount: [3, 4] },
  METALLICIZE: { effect: "endTurnBlock", power: "METALLICIZE_POWER", amount: [3, 4] },
  JUGGERNAUT: { effect: "juggernaut", power: "JUGGERNAUT_POWER", amount: [6, 8] },
  BARRICADE: { effect: "keepsBlock", power: "BARRICADE_POWER", amount: [1, 1] },
  INFERNO: { effect: "inferno", power: "INFERNO_POWER", amount: [6, 9] },
  CRIMSON_MANTLE: { effect: "mantle", power: "CRIMSON_MANTLE_POWER", amount: [7, 10] },
  RUPTURE: { effect: "rupture", power: "RUPTURE_POWER", amount: [1, 2] },
  PYRE: { effect: "pyre", power: "PYRE_POWER", amount: [1, 2] },
  UNMOVABLE: { effect: "unmovable", power: "UNMOVABLE_POWER", amount: [1, 1] },
  ROLLING_BOULDER: { effect: "boulder", power: "ROLLING_BOULDER_POWER", amount: [5, 5] },
  HELLRAISER: { effect: "hellraiser", power: "HELLRAISER_POWER", amount: [1, 1] },
  // 「每当有一张牌被消耗时，抽1张牌」 (DARK_EMBRACE_POWER 1 a copy).
  DARK_EMBRACE: { effect: "darkEmbrace", power: "DARK_EMBRACE_POWER", amount: [1, 1] },
};

/**
 * Hellraiser (「每当你抽到名字中有“打击”的牌时，对一名随机敌人打出这张牌」): a Strike drawn at the start of a later
 * turn is played at once, free, at a random enemy (logged WFR4 F15 T2: 5 drawn, 3 Strikes auto-played, the hand
 * held 2 and Byrdonis 71 -> 39). In the policy's hand it is a 0-energy card at a random enemy (the solver's worst
 * victim), the way Distilled Chaos plays the pile's top cards.
 */
function hellraised(card: CardModel): CardModel {
  return { ...card, cost: 0, xCost: false, playable: true, ...(card.target === "single" ? { target: "random" as const, validTargets: [] } : {}) };
}

/**
 * Rolling Boulder (「在你的回合开始时，对所有敌人造成5点伤害，然后将该伤害增加5点」): the power's amount is the
 * next start of turn's damage to every enemy, 5 more after each (logged ROLLING_BOULDER_POWER 5, 10, 15, … 35
 * over M6P7 F48 T3-T9; KYC0 F28: played T1, the segments 52/48/38 -> 47/43/33 at T2's start, amount 10).
 */
export const BOULDER_STEP = 5;

/** HP lost at the start of our next turn (Crimson Mantle's per copy, Inferno's 1, anything else already up). */
function startTurnHpLossOf(player: SimPlayer): number {
  return player.otherStartLoss + mantleHpCost(player.mantle) + (player.inferno > 0 ? 1 : 0);
}

/** HP-loss events at the start of our turn: each one triggers Inferno and Rupture. */
function startLossEvents(player: SimPlayer): number {
  return (player.inferno > 0 ? 1 : 0) + (player.mantle > 0 ? 1 : 0);
}

/** Damage to every enemy at the start of our next turn (combat-plan turnStartAoe): relics, Inferno per loss event, Rolling Boulder. */
function turnStartAoeOf(player: SimPlayer): number {
  return player.relicAoe + player.inferno * startLossEvents(player) + player.boulder;
}

/** Enemy turns a lone dead Decimillipede segment stays down, and the HP it returns with when REATTACH_POWER is unread. */
const REATTACH_TURNS = 2;
const REATTACH_HP = 25;

interface SimEnemy {
  index: number;
  id: string;
  move: string | null;
  hp: number;
  maxHp: number;
  block: number;
  strength: number;
  /**
   * Vigor (VIGOR_POWER, 「你的下一张攻击牌伤害增加」): added to each hit of its next attack, then gone
   * (XLJQ6FPQAU7N F7: Thrash's 6 made the Crash after Terror 18 + 6 = 24, x1.5 under Vulnerable = 36).
   */
  vigor: number;
  vulnerable: number;
  weak: number;
  alive: boolean;
  /** A dead Decimillipede segment: enemy turns left until it reattaches (while another segment lives). */
  reattachIn?: number;
  /**
   * An illusion already dead on the decision's board (Parafright on REVIVE_MOVE): enemy turns left until
   * it is back at full HP, its usual move next.
   */
  reviveIn?: number;
  /**
   * Waterfall Giant husk (killed with Steam Eruption stacks): the simulated turn at whose end it explodes
   * for `blast` (through that turn's block), after which the fight is over if we live.
   */
  explodeAt?: number;
  blast?: number;
  /** A phase boss: the max HP of each phase still to come after the current one (set at its first revive). */
  phasesLeft?: number[];
  /** Our turns of Intangible left, this one included (every hit into it is 1). */
  intangibleTurns: number;
  /** Nemesis (Test Subject phase 3): enemy turns until it next gains 1 Intangible, else undefined. */
  nemesisIn?: number;
  /**
   * Burrowed (Tunneler, BURROWED_POWER: "Block is not removed at the start of this creature's turn.
   * Stunned if all Block is removed."): its block carries over, and breaking it stuns it for its move.
   */
  burrowed: boolean;
  /**
   * Once-a-fight and decaying powers, carried turn to turn from each line's outcome instead of restored
   * from the decision's board every simulated turn: Artifact (spent by debuffs), Slippery (a stack per HP
   * loss, never back: Vantom 9, 8, … 0), Curl Up (「每场战斗一次」), Flutter (a stack per hit).
   */
  artifact: number;
  slippery: number;
  curlUp: number;
  flutter: number;
  /** Strength it gains at the end of each of its turns (STRENGTH_GROWTH_POWERS; a move's Ritual adds from its next turn). */
  growth: number;
  /** Shrink turns left (Beetle Juice: its attacks 30% less), one less after each of its turns. */
  shrink: number;
  /** Demise (Powdered Demise): HP it loses at the end of each of its turns, until it dies. */
  demise: number;
  /**
   * Shriek / Plow (Terror Eel, Ceremonial Beast: stunned the first time its HP drops to the threshold, that
   * turn's move lost) not yet triggered: the later turns' solver calls model it too (they dropped it, so a Beast
   * taken under 150 on a later turn still Plowed: coverage review #15, forecast 47.0 vs actual 17.7 HP).
   */
  shriekArmed: boolean;
  /**
   * Thorns and damage halving (Guarded, Soar), Dazed per hit (Personal Hive), Tainted per Skill (Vital Spark):
   * the decision's, then what its moves give. A move's Thorns or Soar lasts until its next move resolves
   * (logged: Spiny Toad Thorns 5 only while it shows Spike Explosion, Toadpole 2 only on Spike Spit, the
   * Owl's Soar only on Verdict): `moveBuffs` marks them to drop then.
   */
  thorns: number;
  halved: boolean;
  dazedPerHit: number;
  vitalSpark: number;
  moveBuffs: { thorns: boolean; soar: boolean };
  /**
   * Plating (PLATING_POWER: 「在你的回合结束时获得格挡。覆甲会在你的回合开始时减少1层」): its block at the end of
   * each of its turns, one stack less at the start of each but its first (logged Sewer Clam 8, 8, 7, 6; Frog
   * Knight 15, 15, 14, 13).
   */
  plating: number;
  /**
   * Whole fights only (simulateFight; undefined in the 5-turn rollout): Asleep turns left (Lagavulin Matriarch,
   * fightNextMove), whether it lost HP this turn (wakes a sleeper), its phase (PHASE_MOVES index) and the hits its
   * growing move has gained (GROWING_HITS).
   */
  asleep?: number;
  hurt?: boolean;
  phase?: number;
  extraHits?: number;
  /** Uses of each growing move so far (EnemyMove.growth). */
  uses?: Record<string, number>;
  /** The Knowledge Demon's Curse of Knowledge uses so far (whole fights: KNOWLEDGE_CURSES at most). */
  curses?: number;
  /**
   * Whole fights: this enemy's own random stream for its moves (seeded by the sample and its board index), so two
   * lines compared on the same sample see the same enemy moves however differently they drew and played.
   */
  random?: () => number;
  powers: Record<string, number>;
  /** RolloutInput.escapes: the tag of the loot it carries (its own, or a dying carrier's: the Fat Gremlin's from the Merc). */
  carrier?: string;
  /** It left the fight (its Escape / Flee resolved): not alive, no kill. */
  gone?: boolean;
  base: EnemySim;
  /** Fallback attack when the move model does not know the enemy: the intents shown at the decision. */
  shown: { damage: number; hits: number }[];
  /**
   * What the shown intents already carry (its Weak and Shrink, our Vulnerable at the decision): the fallback
   * takes it out before this turn's (consistency #20: it re-applied them, 15 shown under our Vulnerable read 22).
   */
  shownScale?: number;
}

interface SimPlayer {
  hp: number;
  maxHp: number;
  strength: number;
  dexterity: number;
  weakTurns: number;
  vulnTurns: number;
  /** Frail: block from cards is 25% less while it lasts (enemy turns left, like Weak and Vulnerable). */
  frailTurns: number;
  block: number;
  keepsBlock: boolean;
  demonForm: number;
  /** Block at the end of every turn that does not wear off (Metallicize). */
  endTurnBlock: number;
  /**
   * Plating (PLATING_POWER, 「在你的回合结束时获得格挡。覆甲会在你的回合开始时减少1层。」): block at the
   * end of our turn, one stack less at the start of each of our turns.
   */
  plating: number;
  juggernaut: number;
  feelNoPain: number;
  potions: number;
  /** Inferno up (INFERNO_POWER amount): every HP loss on our turn hits every enemy for it. */
  inferno: number;
  /** Crimson Mantle up (CRIMSON_MANTLE_POWER: block at the start of our turn, 1 HP per copy). */
  mantle: number;
  /** Rupture stacks: Strength per HP loss on our turn. */
  rupture: number;
  /** Pyre: energy at the start of every turn. */
  pyre: number;
  /** Thorns up (THORNS_POWER, Liquid Bronze's 3 a drink): damage back per enemy attack hit, for the fight. */
  thorns: number;
  /**
   * Red Skull held: the Strength it gives at or below half HP (0 without it), and whether it is in `strength` now;
   * re-read from HP at the start of every turn.
   */
  redSkull: number;
  skullUp: boolean;
  /** Self-Forming Clay: the block the last turn's HP losses give at the start of this one (Outcome.clayBlockNext). */
  clayNext: number;
  /** Radiance (Radiant Tincture): turns left with 1 extra energy at their start. */
  radiance: number;
  /** Soldier's Stew drunk: every Strike card is played this many extra times for the rest of the fight. */
  strikeReplay: number;
  /**
   * The lasting parts of potions (the solver prices them, the later turns dropped them): Regen up at the
   * start of the turn (healed at its end, one less each turn), Ritual (Mazaleth's Gift: +1 Strength at the end
   * of each turn), Clarity's extra card on the next turns (CLARITY_POWER, turns left). Heart of Iron's
   * Plating and Dexterity Potion's +2 go to plating / dexterity.
   */
  regen: number;
  ritual: number;
  clarityTurns: number;
  /**
   * Stable Serum (RETAIN_HAND_POWER): turn ends left whose unplayed hand stays in hand, and the cards kept at the
   * last one (base cards; the next turn draws on top of them, up to the hand limit).
   */
  retainTurns: number;
  retained: CardModel[];
  /** Unmovable: the first card Block each turn is doubled. */
  unmovable: boolean;
  /** Start-of-turn damage to every enemy from relics (Mercury Hourglass): turnStartAoe without Inferno and Rolling Boulder. */
  relicAoe: number;
  /** Rolling Boulder: the next start of turn's damage to every enemy; BOULDER_STEP more after each. */
  boulder: number;
  /** Hellraiser up: a Strike drawn is played at once, free, at a random enemy (hellraised). */
  hellraiser: boolean;
  /** Unrelenting's free Attacks left at the end of the last turn (FREE_ATTACK_POWER stays up into the next). */
  freeAttacks: number;
  /** Pael's Tear's extra energy for this turn: the last turn ended with energy unspent (Outcome.nextTurnEnergy). */
  paelsNext: number;
  /**
   * Dark Embrace (cards drawn per card exhausted): the ethereal cards exhausted at the end of a turn draw that
   * many each, discarded with the hand (the draw pile runs down, and may be reshuffled, before the next turn).
   */
  darkEmbrace: number;
  /** Start-of-turn HP loss from anything but Crimson Mantle and Inferno. */
  otherStartLoss: number;
  /** Damage the last start-of-turn AoE dealt: counted in the next turn's record. */
  startDealt: number;
  /**
   * Cards a turn (SLOTH_POWER: 「你在每个回合不能打出超过3张牌」), null for no cap. The decision's own cap is
   * the plays left this turn (combat-plan playCap: Ringing's 1 this turn only, Sloth minus the cards played),
   * so a later turn gets the per-turn amount (VQKX9AD1YHKS F17 T5: a Ringing turn's cap of 1 on every
   * simulated turn read "dead 8/8, dmg 0").
   */
  playCap: number | null;
  /** Intangible on us (INTANGIBLE_POWER, turns): every hit 1 through the enemy turn of each turn it covers. */
  intangibleTurns: number;
  /** Blur (BLUR_POWER, turns): block kept at the start of the next turn, for that many turns; Barricade is keepsBlock. */
  blurTurns: number;
  /** Shrink on us (SHRINK_POWER: 「攻击伤害在3回合内减少30%」): turns left. */
  shrinkTurns: number;
  /** End-of-turn damage: Disintegration (for the fight) and Constrict (while its Slithering Strangler lives). */
  disintegration: number;
  constrict: number;
  /** Of `strength` / `dexterity`, the decision turn's temporary part (TEMP_STRENGTH_POWERS): gone after it. */
  tempStrength: number;
  tempDexterity: number;
  /** Tender (for the fight): each card played lowers Strength and Dexterity by this for the rest of the turn. */
  tender: number;
  /** Smoggy: one Skill a turn. */
  smoggy: boolean;
  /** Tangled put on us this enemy turn: Attacks cost this much more on our next turn only. */
  tangledNext: number;
  /** Chains of Binding: the first this many cards drawn each turn are Soulbound. */
  chains: number;
  /** Ringing put on us this enemy turn: one card on our next turn only. */
  ringingNext: boolean;
  /** Mind Rot: cards fewer drawn each turn; Waste Away: energy fewer each turn. */
  mindRot: number;
  wasteAway: number;
  /** Revives still held (Fairy in a Bottle, Lizard Tail), in trigger order: a spent one is gone for the sample. */
  revives: Revive[];
}

/** The enemy a Rampart gives its block to (RAMPART_POWER: 「高塔炮手获得25点格挡」). */
const RAMPART_TARGET = "TURRET_OPERATOR";

/** The enemy whose Constrict it is (CONSTRICT_POWER: 「蛇行扼杀者存活时…」). */
const CONSTRICTOR = "SLITHERING_STRANGLER";

/**
 * Strength (and Dexterity) up or down for this turn only (「在本回合结束前获得/失去力量」): part of STRENGTH_POWER
 * on the decision's board, gone for the later turns. Ours: Setup Strike, Flex, Reptile Trinket, Feeding
 * Frenzy, Coordinate (Strength), Speed Potion (Dexterity). On enemies: Mangle, Shackling Potion, Dark
 * Shackles, Piercing Wail (logged Byrdonis STRENGTH_POWER -10 with MANGLE_POWER 10).
 */
export const TEMP_STRENGTH_POWERS = ["SETUP_STRIKE_POWER", "FLEX_POTION_POWER", "REPTILE_TRINKET_POWER", "FEEDING_FRENZY_POWER", "COORDINATE_POWER"] as const;
export const TEMP_DEXTERITY_POWERS = ["SPEED_POTION_POWER"] as const;
export const ENEMY_TEMP_STRENGTH_LOSS_POWERS = TEMP_STRENGTH_LOSS_POWERS;

const sumOf = (powers: Record<string, number> | undefined, ids: readonly string[]): number => ids.reduce((sum, id) => sum + Math.max(0, powers?.[id] ?? 0), 0);

interface Piles {
  draw: CardModel[];
  discard: CardModel[];
  /** RolloutInput.onShuffle: into the draw pile at a random place each time the discard pile is shuffled in. */
  onShuffle?: CardModel;
}

/** One sample's trajectory: per simulated turn, the HP lost that turn and the end-of-our-turn snapshot. */
export interface TurnRecord {
  /** HP lost this turn (our own + the enemy turn), as the solver outcome counts it. */
  loss: number;
  /** Of it, the enemy turn's hits after block. */
  enemyPart: number;
  /** Damage we dealt this turn (the played line's outcome). */
  dmg: number;
  snap: Snapshot;
  won: boolean;
  died: boolean;
  /** A time limit ended the fight at this turn's end without a win (the Battleworn Dummy's 3 turns). */
  timeUp?: boolean;
  /** Revives this turn spent (its `loss` is all the HP we had, then what their HP lost: the solver's hpLoss). */
  revived?: number;
  /**
   * Each enemy's HP still to take off by board index at the end of our turn (remainingHp: a phase boss's later
   * phases, an Axebot's stock, an illusion at full, a segment that will reattach, a spawner's spawns included);
   * absent in a hand-made record (the snapshot's HP then).
   */
  hpLeft?: Record<number, number>;
  /** The potions this turn drank (ids), and their cost in HP (the plan's outcome.potionCost; potion-cost.ts). */
  drunk?: string[];
  potionCost?: number;
  /** Whole fights only (simulateFight): the Power cards played this turn (ids) and the block the line gained. */
  powers?: string[];
  blockGained?: number;
  /** RolloutInput.escapes: each carrier tag's loot by the end of this turn, and the board indices gone by then (they left). */
  thieves?: Record<string, "back" | "gone" | "open">;
  gone?: number[];
}

function moveAttack(enemy: SimEnemy, table: EnemyTable | undefined, move: string | null, playerVulnerable: boolean, fight: { fullFight: boolean; faced: boolean } = { fullFight: false, faced: false }): { damage: number; hits: number }[] {
  const m = move && table ? table.moves[move] : undefined;
  const scale = (enemy.weak > 0 ? 0.75 : 1) * (enemy.shrink > 0 ? SHRINK_DAMAGE_FACTOR : 1) * (playerVulnerable ? 1.5 : 1);
  if (!m) return enemy.shown.map((a) => ({ damage: Math.floor((a.damage / (enemy.shownScale ?? 1)) * scale), hits: a.hits }));
  if (m.damage <= 0) return [];
  // A whole fight's growing move (Multi Claw): a hit more for each earlier use in this phase; the Pressure Gun's hit grows.
  const hits = Math.max(1, m.hits) + (move === GROWING_HITS[enemy.id] ? enemy.extraHits ?? 0 : 0);
  const grown = m.growth && move ? m.growth * (enemy.uses?.[move] ?? 0) : 0;
  // B4, whole fights: a Surrounded move is its faced hit once the facing is tracked (x1.5 behind us).
  const own = fight.faced && m.faceDamage !== undefined ? m.faceDamage : null;
  if (m.shown && own === null) return [{ damage: Math.max(0, Math.floor((m.damage + grown + enemy.vigor) * (enemy.weak > 0 ? 0.75 : 1) * (enemy.shrink > 0 ? SHRINK_DAMAGE_FACTOR : 1))), hits }];
  return [{ damage: Math.max(0, Math.floor(((own ?? m.damage) + grown + enemy.strength + enemy.vigor) * scale)), hits }];
}

/** Some move of the enemy gives it this power (EnemyMove.selfPowers). */
function gainsSelf(table: EnemyTable | undefined, power: EnemySelfPower): boolean {
  return Object.values(table?.moves ?? {}).some((move) => (move.selfPowers?.[power] ?? 0) > 0);
}

/** The move an enemy uses most (successor counts summed): what a revived illusion does next (Parafright: Slam). */
export function usualMove(table: EnemyTable | undefined): string | null {
  if (!table) return null;
  const counts = new Map<string, number>();
  for (const successors of Object.values(table.next)) for (const [move, n] of Object.entries(successors)) counts.set(move, (counts.get(move) ?? 0) + n);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** The move-model state after an enemy's stun (the Bowlbug Rock's Imbalanced). */
const STUNNED_MOVE = "STUNNED";

function nextMove(table: EnemyTable | undefined, move: string | null, random: () => number, exclude?: string, allowed?: (move: string) => boolean): string | null {
  if (!table || !move) return move;
  const successors = table.next[move];
  if (!successors) return move;
  // An Imbalanced enemy's stun comes from our block, not by chance (exclude "STUNNED"), unless nothing else follows.
  // A whole fight's script (fightNextMove) keeps only the moves `allowed` now, unless none follows.
  const all = Object.entries(successors);
  const kept = all.filter(([m]) => m !== exclude && (!allowed || allowed(m)));
  const entries = kept.length > 0 ? kept : all;
  const total = entries.reduce((s, [, n]) => s + n, 0);
  let r = random() * total;
  for (const [m, n] of entries) {
    r -= n;
    if (r < 0) return m;
  }
  return entries[entries.length - 1]![0];
}

// ---------------------------------------------------------------- whole-fight scripts (src/sim/boss-sim.ts)

/**
 * Moves an enemy only makes once it is dead: a Waterfall Giant husk's Explode, the Test Subject's Respawn into its
 * last phase. The move model has them after the move of the turn it was killed (the Giant: ~10% after every move),
 * which a 5-turn window seldom reaches and a whole fight does (a living Giant "exploding" on turn 9). A whole-fight
 * simulation never picks them for a living enemy (the husk's blast is enemyDown's).
 */
export const DEATH_MOVES: Record<string, readonly string[]> = { WATERFALL_GIANT: ["EXPLODE_MOVE"], TEST_SUBJECT: ["RESPAWN_MOVE"] };

/**
 * A phase boss's moves by phase (logged A7-A9 Test Subject: Bite / Skull Bash at 111 HP, Multi Claw at 212, then
 * Lacerate > Big Pounce > Burning Growl at 313). The move model mixes them (Bite -> Multi Claw 45%: the turn phase 1
 * died); a whole fight keeps each phase to its own moves and starts the next phase at its first.
 */
export const PHASE_MOVES: Record<string, readonly (readonly string[])[]> = {
  TEST_SUBJECT: [["BITE_MOVE", "SKULL_BASH_MOVE"], ["MULTI_CLAW_MOVE"], ["PHASE3_LACERATE_MOVE", "BIG_POUNCE", "BURNING_GROWL_MOVE"]],
};

/** Moves that gain a hit each use (Multi Claw: logged 10x3, 10x4, … 10x7 in one phase 2): the move and its enemy. */
export const GROWING_HITS: Record<string, string> = { TEST_SUBJECT: "MULTI_CLAW_MOVE" };

/**
 * The Knowledge Demon's Curse of Knowledge: 3 uses a fight (logged on turns 1, 5 and 9 only, 132 uses in 52 fights; after
 * the third, Ponder is followed by Slap: turns 13, 16). The move model's Ponder -> Curse 91% gave long fights a 4th and
 * 5th curse.
 */
export const KNOWLEDGE_CURSES = 3;

/**
 * Status cards a move shuffles into the draw pile, of the ones it adds (the rest go to the move's pile): the Insatiable's
 * Liquify Ground, 6 Frantic Escapes, 3 into the draw pile and 3 into the discard pile (46 of 46 logged fights at turn 2:
 * draw + hand 3, discard 3; the monster DB records the discard pile only).
 */
export const STATUS_INTO_DRAW: Record<string, number> = { LIQUIFY_GROUND_MOVE: 3 };

/**
 * The next move in a whole fight: the move model's successors, but where the game's script depends on the fight's
 * state and not on the last move alone (logged A8 move sequences, 2026-09-30):
 *  - Ceremonial Beast: Plow again until the stun at its Plow threshold (then STUNNED > Beast Cry, applyPlan's shriek);
 *    the model's Plow -> Beast Cry 27% is the stun turn;
 *  - the Queen: Burn Bright For Me while the Torch Head Amalgam lives, Off With Your Head once it is dead;
 *  - Lagavulin Matriarch: Sleep while Asleep lasts (3 enemy turns), Slash the turn after the first HP it loses; awake,
 *    its Plating and block are gone;
 *  - never a death move (DEATH_MOVES) or another phase's move (PHASE_MOVES).
 */
function fightNextMove(e: SimEnemy, table: EnemyTable | undefined, random: () => number, enemies: SimEnemy[], exclude?: string): string | null {
  if (e.id === "CEREMONIAL_BEAST" && e.move === "PLOW_MOVE" && e.shriekArmed) return "PLOW_MOVE";
  if (e.id === "QUEEN" && e.move === "BURN_BRIGHT_FOR_ME_MOVE") return enemies.some((x) => x.alive && x.id === "TORCH_HEAD_AMALGAM") ? "BURN_BRIGHT_FOR_ME_MOVE" : "OFF_WITH_YOUR_HEAD_MOVE";
  // B4: no fourth curse; the move model's Ponder -> Slap is what the logged fights do after the third.
  if (e.id === "KNOWLEDGE_DEMON" && (e.curses ?? 0) >= KNOWLEDGE_CURSES) {
    const next = nextMove(table, e.move, random, exclude, (m) => m !== "CURSE_OF_KNOWLEDGE_MOVE");
    return next === "CURSE_OF_KNOWLEDGE_MOVE" ? "SLAP_MOVE" : next;
  }
  if (e.asleep !== undefined && e.asleep > 0) {
    e.asleep = e.hurt ? 0 : e.asleep - 1;
    if (e.asleep > 0) return e.move;
    // Awake: its sleeping Plating is gone with its block (logged Matriarch: Plating 12, block 12/12/11 on T1-T3, 0 on T4).
    e.plating = 0;
    e.block = 0;
    const awake = nextMove(table, e.move, random, exclude, (m) => m !== e.move && m !== STUNNED_MOVE);
    return awake === e.move ? usualMove(table) : awake;
  }
  const dead = DEATH_MOVES[e.id] ?? [];
  const phase = PHASE_MOVES[e.id]?.[e.phase ?? 0];
  return nextMove(table, e.move, random, exclude, (m) => !dead.includes(m) && (!phase || phase.includes(m)));
}

function withStrength(card: CardModel, player: SimPlayer, index: number, targets: number[]): CardModel {
  const weak = player.weakTurns > 0;
  return {
    ...card,
    index,
    damage: card.damage === null ? null : Math.floor((card.damage + player.strength) * (weak ? 0.75 : 1)),
    // Unmovable: the hand shows every Block card doubled (the solver halves all but the first; combat-plan).
    // Frail: 25% less block from cards, after Dexterity.
    block: card.block > 0 ? Math.floor(Math.max(0, card.block + player.dexterity) * (player.frailTurns > 0 ? 0.75 : 1)) * (player.unmovable ? 2 : 1) : card.block,
    validTargets: card.target === "single" ? targets : [],
  };
}

function snapshotOf(player: SimPlayer, enemies: SimEnemy[], hpEnd: number, blockEnd: number, energyLeft: number, handLeft: number, playerPowers: Record<string, number>): Snapshot {
  const pw: Record<string, number> = { ...playerPowers };
  for (const [id, v] of [["STRENGTH_POWER", player.strength], ["DEXTERITY_POWER", player.dexterity], ["WEAK_POWER", player.weakTurns], ["VULNERABLE_POWER", player.vulnTurns], ["FRAIL_POWER", player.frailTurns], ["PLATING_POWER", player.plating]] as const) {
    if (v !== 0) pw[id] = v;
    else delete pw[id];
  }
  return {
    hp: hpEnd,
    mhp: player.maxHp,
    blk: blockEnd,
    en: energyLeft,
    pw,
    hand: handLeft,
    pots: player.potions,
    E: enemies.map((e) => {
      const powers: Record<string, number> = { ...e.powers };
      for (const [id, v] of [["STRENGTH_POWER", e.strength], ["VIGOR_POWER", e.vigor], ["VULNERABLE_POWER", e.vulnerable], ["WEAK_POWER", e.weak], ["INTANGIBLE_POWER", e.intangibleTurns]] as const) {
        if (v) powers[id] = v;
        else delete powers[id];
      }
      const intent = e.base.attacks.reduce((s, a) => s + a.damage * a.hits, 0);
      // A Giant husk is no HP to chew through, only its blast to survive (the terminal reads it so).
      if (e.explodeAt !== undefined) return [e.index, e.id, 1, e.maxHp, 0, e.alive, false, e.blast ?? intent, e.move, powers] as SnapEnemy;
      return [e.index, e.id, e.hp, e.maxHp, e.block, e.alive && e.hp > 0, e.base.minion === true, intent, e.move, powers] as SnapEnemy;
    }),
  };
}

/** A fresh enemy spawned mid-fight (RolloutInput.spawns), at its first move, with a board index of its own. */
function spawnedEnemy(template: SpawnTemplate, index: number): SimEnemy {
  const base: EnemySim = { index, name: template.name, hp: template.hp, maxHp: template.hp, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] };
  return {
    index,
    id: template.id,
    move: template.move,
    hp: template.hp,
    maxHp: template.hp,
    block: 0,
    strength: 0,
    vigor: 0,
    vulnerable: 0,
    weak: 0,
    alive: true,
    intangibleTurns: 0,
    burrowed: false,
    artifact: 0,
    slippery: 0,
    curlUp: 0,
    flutter: 0,
    growth: 0,
    shrink: 0,
    demise: 0,
    shriekArmed: false,
    thorns: 0,
    halved: false,
    dazedPerHit: 0,
    vitalSpark: 0,
    moveBuffs: { thorns: false, soar: false },
    plating: 0,
    powers: {},
    base,
    shown: [],
  };
}

/** An enemy at 0 HP: a husk to explode, restocked, back at full (illusion), its next phase, or dead (with its spawns). */
function enemyDown(e: SimEnemy, turn: number, input: RolloutInput, enemies: SimEnemy[], fullFight = false): void {
  if ((e.base.eruption ?? 0) > 0 && e.maxHp < HUSK_HP && e.explodeAt === undefined) {
    // Waterfall Giant: a husk that explodes at the end of our next turn (turn-solver explodesNext).
    e.hp = HUSK_HP;
    e.maxHp = HUSK_HP;
    e.blast = e.base.eruption ?? 0;
    e.explodeAt = turn + 1;
    e.move = "ABOUT_TO_BLOW";
    e.base = { ...e.base, hp: HUSK_HP, maxHp: HUSK_HP, attacks: [] };
  } else if ((e.base.stock ?? 0) > 0) {
    e.hp = e.maxHp;
    e.base = { ...e.base, stock: (e.base.stock ?? 1) - 1 };
  } else if (e.base.illusion) {
    // An illusion (Parafright) is back at full HP next turn (FA82 F27: killed turn after turn, the
    // rollout called it dead for good and the Obscura, the real target, sat at 77).
    e.hp = e.maxHp;
  } else if (e.base.revives) {
    // A phase boss (Test Subject): the next phase at its own, higher max HP, Vulnerable and Strength
    // cleared, and more phases after it while any are left (FSPK F48: phase 1 at 111 was revived at 111
    // once and the fight "ended"; phase 2 had 212 and a phase 3 followed).
    const later = e.phasesLeft ?? laterPhaseHps(e.maxHp, input.meta.asc);
    const next = later[0] ?? e.maxHp;
    e.phasesLeft = later.slice(1);
    e.hp = next;
    e.maxHp = next;
    e.vulnerable = 0;
    e.weak = 0;
    e.strength = 0;
    if (e.phasesLeft.length === 0) {
      const { ADAPTABLE_POWER: _last, ...powers } = e.powers;
      e.powers = powers;
      // The Test Subject's last phase comes with Nemesis and starts Intangible (every logged phase 3's
      // first turn): Intangible through the enemy turn, then re-granted, so on our next turn too.
      if (e.id === "TEST_SUBJECT") {
        e.powers = { ...e.powers, NEMESIS_POWER: 1 };
        e.intangibleTurns = 1;
        e.nemesisIn = 1;
      }
    }
    e.base = { ...e.base, hp: next, maxHp: next, revives: e.phasesLeft.length > 0 };
    // A whole fight: the next phase's own moves, from its first (Multi Claw at phase 2, Lacerate at phase 3).
    const phases = PHASE_MOVES[e.id];
    if (fullFight && phases) {
      e.phase = Math.min(phases.length - 1, (e.phase ?? 0) + 1);
      e.move = phases[e.phase]![0] ?? e.move;
      e.extraHits = 0;
    }
  } else {
    e.alive = false;
    // An on-death spawn (Phrog Parasite, Gremlin Merc): its spawns join the fight (the rollout called the
    // Phrog's death a win: "over within 5 turns" 0.95 vs 0.47 in the logs, 4LC3YKCZV218 F9 T3 forecast 0,
    // actual 23).
    const spawns = e.base.spawnsOnDeath ? input.spawns?.[e.id] ?? [] : [];
    let next = Math.max(...enemies.map((x) => x.index)) + 1;
    // THIEF_FACTS: a dying carrier's loot goes with its heir (the Merc's gold with the Fat Gremlin, as its HEIST_POWER).
    const heir = e.carrier !== undefined ? input.escapes?.heirs[e.id] : undefined;
    for (const template of spawns) {
      for (let k = 0; k < template.count; k += 1) {
        const spawn = spawnedEnemy(template, next++);
        if (heir !== undefined && template.id === heir) spawn.carrier = e.carrier;
        enemies.push(spawn);
      }
    }
  }
}

/**
 * The start of our next turn: Crimson Mantle's block, Rupture's Strength per HP-loss event, and the
 * start-of-turn AoE (Inferno per loss event, Mercury Hourglass) through each enemy's block. The HP those
 * losses cost is already in the line's outcome (the solver's startTurnHpLoss). Returns the damage dealt.
 */
function startOfTurn(turn: number, player: SimPlayer, enemies: SimEnemy[], input: RolloutInput, fullFight = false): number {
  player.plating = Math.max(0, player.plating - 1);
  player.block += player.mantle;
  // A relic's block on this fight turn (Captain's Wheel on turn 3): `turn` is the one that just ended.
  const fightTurn = (input.solver.turn ?? input.meta.t) + turn + 1;
  for (const relic of input.relicBlock ?? []) if (relic.turn === fightTurn) player.block += relic.amount;
  if (fullFight) for (const relic of input.fightRelics?.block ?? []) if (relic.turn === fightTurn) player.block += relic.amount;
  // Self-Forming Clay's block for the last turn's HP losses.
  player.block += player.clayNext;
  player.clayNext = 0;
  // Red Skull: on at or below half HP, off above it (the HP the enemy turn left).
  if (player.redSkull > 0 && (player.hp * 2 <= player.maxHp) !== player.skullUp) {
    player.skullUp = !player.skullUp;
    player.strength += player.skullUp ? player.redSkull : -player.redSkull;
  }
  player.strength += player.rupture * startLossEvents(player);
  const aoe = turnStartAoeOf(player);
  if (player.boulder > 0) player.boulder += BOULDER_STEP;
  if (aoe <= 0) return 0;
  let dealt = 0;
  for (const e of enemies) {
    if (!e.alive || e.explodeAt !== undefined) continue;
    // The enemy's caps as for the solver's non-attack damage (turn-solver hitEnemyRaw): Intangible, Hard to
    // Kill, Guarded/Soar, then block, then a Slippery stack.
    let hit = e.halved ? Math.floor(aoe * 0.5) : aoe;
    if (e.base.perHitCap !== null && e.base.perHitCap !== undefined) hit = Math.min(hit, e.base.perHitCap);
    if (e.intangibleTurns > 0) hit = Math.min(1, hit);
    const blocked = Math.min(e.block, hit);
    e.block -= blocked;
    let through = hit - blocked;
    if (through > 0 && e.slippery > 0) {
      through = 1;
      e.slippery -= 1;
    }
    const lost = Math.min(e.hp, through);
    e.hp -= lost;
    dealt += lost;
    if (fullFight && lost > 0) e.hurt = true;
    if (e.hp <= (e.base.shriek ?? 0)) e.shriekArmed = false;
    if (e.hp <= 0) enemyDown(e, turn, input, enemies, fullFight);
  }
  return dealt;
}

/** Energy the relics give at the start of fight turn `turn` (RolloutInput.relicEnergy). */
function relicEnergyAt(input: RolloutInput, turn: number): number {
  return (input.relicEnergy ?? []).reduce((sum, relic) => sum + (turn >= relic.from ? relic.amount : 0), 0);
}

/** Whole fights: the one-turn energy relics' energy on fight turn `turn` (RolloutInput.fightRelics). */
function fightRelicEnergyAt(input: RolloutInput, turn: number): number {
  return (input.fightRelics?.energy ?? []).reduce((sum, relic) => sum + (relic.turn === turn ? relic.amount : 0), 0);
}

/** Whole fights (B2): the end-of-turn block relics for the policy's solver (turn-solver PlayerSim.orichalcum / rippleBasin). */
function endBlockRelics(input: RolloutInput): Pick<PlayerSim, "orichalcum" | "rippleBasin"> {
  const relics = input.fightRelics;
  return { ...(relics?.orichalcum ? { orichalcum: relics.orichalcum } : {}), ...(relics?.rippleBasin ? { rippleBasin: relics.rippleBasin } : {}) };
}

/** Whole fights (B2): Pendulum's extra draws on a fight turn. */
function fightRelicDrawsAt(input: RolloutInput, turn: number): number {
  return (input.fightRelics?.draws ?? []).reduce((sum, relic) => sum + (relic.turn === turn ? relic.amount : 0), 0);
}

/** Draw potions whose only random part is which cards they draw (card-model DRAW_POTIONS without a special). */
const PLAIN_DRAW_POTIONS = new Set(["SWIFT_POTION", "CLARITY", "CURE_ALL"]);

/**
 * Whole fights (B2): each random potion held (RolloutInput.randomPotions) as a new sample of it for this turn, as
 * potion-mc draws them: a card-choice potion's offer of 3 from its pool (samplePotion), from a stream of its own (the
 * sample's seed, the slot, the turn: the same offer for every line of a sample); a plain draw potion's cards the next
 * ones on this sample's draw pile after the draw cards' (knownDraws), known and playable like theirs (added to `known`).
 * The policy's cost of drinking it (potionCost) stays. Others keep the hand's expected-value card.
 */
function sampledPotions(potions: CardModel[], input: RolloutInput, seed: number, turn: number, hand: CardModel[], piles: Piles, player: SimPlayer, targets: number[], known: Map<number, { card: CardModel; base: CardModel }> | undefined): CardModel[] {
  const sources = input.randomPotions ?? [];
  if (sources.length === 0) return potions;
  return potions.map((card) => {
    const [, id, slotText] = card.cardId.split(":");
    const source = sources.find((entry) => entry.potionId === id && String(entry.slot) === slotText);
    if (!source) return card;
    if (source.kind === "choice") {
      const random = rng((Math.imul(seed, 0x27d4eb2f) ^ Math.imul(source.slot + 1, 0x165667b1) ^ Math.imul(turn + 1, 0x9e3779b1)) >>> 0 || 1);
      const sample = samplePotion({ ...source, cost: 0 }, hand, random);
      return { ...sample, validTargets: card.validTargets, ...(card.potionCost !== undefined ? { potionCost: card.potionCost } : {}) };
    }
    if (!PLAIN_DRAW_POTIONS.has(source.potionId) || !known || source.noDraw) return card;
    const count = Math.max(0, Math.round(card.draw));
    const drawn: CardModel[] = [];
    for (let k = 0; k < count && known.size < piles.draw.length; k += 1) {
      const depth = known.size;
      const base = piles.draw[piles.draw.length - 1 - depth]!;
      const index = KNOWN_DRAW_INDEX + depth;
      const model = { ...withStrength(base, player, index, targets), key: `drawn${index}` };
      known.set(index, { card: model, base });
      drawn.push(model);
    }
    return drawn.length > 0 ? { ...card, drawn, draw: card.draw - drawn.length } : card;
  });
}

/** A debuff's turns: -1 (and any amount below 0) is for the fight. */
function turnsOf(amount: number): number {
  return amount < 0 ? Infinity : amount;
}

/** We already hold this curse (a Curse of Knowledge pick is not offered twice). */
function holds(player: SimPlayer, id: PlayerDebuff): boolean {
  switch (id) {
    case "SLOTH_POWER":
      return player.playCap !== null;
    case "MIND_ROT_POWER":
      return player.mindRot > 0;
    case "WASTE_AWAY_POWER":
      return player.wasteAway > 0;
    case "DISINTEGRATION_POWER":
      return player.disintegration > 0;
    default:
      return false;
  }
}

/** What a move puts on us: all its powers, or of alternatives the first in pick order we do not hold. */
function chosenDebuffs(move: EnemyMove, player: SimPlayer): Partial<Record<PlayerDebuff, number>> {
  const powers = move.playerPowers ?? {};
  if (!move.playerPowerChoice) return powers;
  const pick = move.playerPowerChoice.find((id) => !holds(player, id) && (powers[id] ?? 0) !== 0);
  return pick ? { [pick]: powers[pick] } : {};
}

/** Debuffs an enemy turn put on us, onto the simulated player. */
function applyPlayerDebuffs(player: SimPlayer, powers: Partial<Record<PlayerDebuff, number>>): void {
  player.vulnTurns += powers.VULNERABLE_POWER ?? 0;
  player.weakTurns += powers.WEAK_POWER ?? 0;
  player.frailTurns += powers.FRAIL_POWER ?? 0;
  player.strength += powers.STRENGTH_POWER ?? 0;
  player.dexterity += powers.DEXTERITY_POWER ?? 0;
  player.tender += powers.TENDER_POWER ?? 0;
  if ((powers.SMOGGY_POWER ?? 0) !== 0) player.smoggy = true;
  player.tangledNext += powers.TANGLED_POWER ?? 0;
  player.chains = Math.max(player.chains, powers.CHAINS_OF_BINDING_POWER ?? 0);
  if (powers.SHRINK_POWER) player.shrinkTurns = Math.max(player.shrinkTurns, turnsOf(powers.SHRINK_POWER));
  if ((powers.RINGING_POWER ?? 0) !== 0) player.ringingNext = true;
  if ((powers.SLOTH_POWER ?? 0) > 0) player.playCap = Math.min(player.playCap ?? Infinity, powers.SLOTH_POWER!);
  player.disintegration += powers.DISINTEGRATION_POWER ?? 0;
  player.constrict += powers.CONSTRICT_POWER ?? 0;
  player.mindRot += powers.MIND_ROT_POWER ?? 0;
  player.wasteAway += powers.WASTE_AWAY_POWER ?? 0;
}

/** A played card's lasting effects on the simulated player: a Power's (POWER_EFFECTS), Feel No Pain, Plating. */
function applyLasting(card: CardModel, player: SimPlayer, playerPowers: Record<string, number>): void {
  const effect = POWER_EFFECTS[card.cardId];
  if (effect && card.type === "Power") {
    const amount = card.powerAmount ?? (card.inferno || undefined) ?? effect.amount[card.upgraded ? 1 : 0];
    if (effect.effect === "keepsBlock") player.keepsBlock = true;
    else if (effect.effect === "unmovable") player.unmovable = true;
    else if (effect.effect === "hellraiser") player.hellraiser = true;
    else player[effect.effect] += amount;
    playerPowers[effect.power] = (playerPowers[effect.power] ?? 0) + amount;
  }
  if (card.feelNoPain) player.feelNoPain += card.feelNoPain;
  if (card.plating) player.plating += card.plating;
}

/** The solver index of the first card a draw card is known to draw (knownDraws): past the hand, Music Box copies and potions. */
export const KNOWN_DRAW_INDEX = 600;

/**
 * Whole fights: the cards each draw card in the hand draws, from the top of the sampled pile (in hand order, the first
 * draw card the pile's first cards), as known cards (CardModel.drawn) instead of expected draws. The live loop re-plans
 * once a draw card has drawn, so the drawn cards get played; the rollout's draws only cycled the pile, their use a flat
 * value in the score, so a whole fight played ~0.8 cards a turn fewer than the logged boss fights (3.5 draw cards in a
 * 23.5-card deck). Past what the pile holds, the rest stays an expected draw. The policy knows what it will draw (the
 * loop decides the draw card blind): a little optimistic.
 */
function knownDraws(hand: CardModel[], piles: Piles, player: SimPlayer, targets: number[]): { hand: CardModel[]; known: Map<number, { card: CardModel; base: CardModel }> } {
  const known = new Map<number, { card: CardModel; base: CardModel }>();
  let depth = 0;
  const out = hand.map((card) => {
    if (card.type === "Potion" || card.draw <= 0 || card.drawn || card.drawsUntil) return card;
    const drawn: CardModel[] = [];
    for (let k = 0; k < card.draw && depth < piles.draw.length; k += 1, depth += 1) {
      const base = piles.draw[piles.draw.length - 1 - depth]!;
      const index = KNOWN_DRAW_INDEX + depth;
      const model = { ...withStrength(base, player, index, targets), key: `drawn${index}` };
      known.set(index, { card: model, base });
      drawn.push(model);
    }
    return drawn.length > 0 ? { ...card, drawn, draw: card.draw - drawn.length } : card;
  });
  return { hand: out, known };
}

/** Apply a played line's outcome to the simulated state; returns the turn record. */
function applyPlan(
  turn: number,
  plan: Plan,
  hand: CardModel[],
  handBase: (CardModel | null)[],
  player: SimPlayer,
  enemies: SimEnemy[],
  piles: Piles,
  input: RolloutInput,
  random: () => number,
  playerPowers: Record<string, number>,
  /** A whole fight (simulateFight): the enemies' moves follow fightNextMove's scripts. */
  fullFight = false,
  /** Whole fights: the cards the hand's draw cards draw, known from the pile (knownDraws), by their solver index. */
  known?: Map<number, { card: CardModel; base: CardModel }>,
): TurnRecord {
  const o = plan.outcome;
  const startHp = player.hp;
  // A line saved by a revive: its hpLoss counts the revive's HP; our own turn's loss is apart.
  const ownLoss = o.revived ? o.revived.ownLoss : Math.max(0, o.hpLoss - o.incomingAfterBlock);
  let regenDrunk = 0;
  // Cards: played ones to the discard pile (exhausted and powers gone), the rest of the hand discarded too.
  const played = new Set<number>();
  // Known draws (whole fights) played this turn that leave the fight or the piles (exhausted, a Power).
  const knownGone = new Set<CardModel>();
  const knownPlayed = new Set<number>();
  // Thrashes that took one of several Attacks at random: put back once the pick is made (below).
  const thrashPending: { back: CardModel; grown: number; picks: { strength: number }[] }[] = [];
  for (const step of plan.steps) {
    if (isPotion(step)) {
      player.potions = Math.max(0, player.potions - 1);
      if (step.cardId.startsWith("POTION:RADIANT_TINCTURE:")) player.radiance += RADIANCE_LATER_ENERGY;
      if (step.cardId.startsWith("POTION:SOLDIERS_STEW:")) player.strikeReplay += 1;
      // What the potion leaves for the later turns (its turn is the solver's outcome already).
      const potion = hand.find((card) => card.type === "Potion" && card.cardId === step.cardId);
      if (potion) {
        player.plating += potion.plating ?? 0;
        player.thorns += potion.thorns ?? 0;
        if (potion.special === "dexterity") player.dexterity += DEX_POTION;
        if (potion.special === "regen") regenDrunk += potion.regen ?? 0;
        if (potion.special === "ritual") player.ritual += 1;
        if (potion.special === "clarity") player.clarityTurns += CLARITY_LATER_DRAWS;
        if (potion.special === "retain_hand") player.retainTurns += STABLE_SERUM_TURNS;
      }
      continue;
    }
    const at = hand.findIndex((card, i) => !played.has(i) && card.index === step.cardIndex && card.cardId === step.cardId);
    if (at < 0) {
      // A card a draw card drew this turn (known from the pile, whole fights): its lasting effects; exhausted or a
      // Power, it does not go to the discard pile with the others drawn (below).
      const drawn = known?.get(step.cardIndex);
      if (drawn && drawn.card.cardId === step.cardId && !knownPlayed.has(step.cardIndex)) {
        knownPlayed.add(step.cardIndex);
        applyLasting(drawn.card, player, playerPowers);
        if (drawn.card.exhausts || drawn.card.type === "Power") knownGone.add(drawn.base);
        continue;
      }
      // Music Box's copy of the turn's first Attack (turn-solver musicBoxCopy, index MUSIC_BOX_INDEX + the original's):
      // not a card of the hand, but played it goes to the discard pile as an Ethereal copy and can be drawn again
      // (YVYZ F48: T7 drew back the T5 Pommel Strike copy). Unplayed, it is exhausted at the turn's end: gone.
      const original = step.cardIndex >= MUSIC_BOX_INDEX ? hand.findIndex((card) => card.index === step.cardIndex - MUSIC_BOX_INDEX && card.cardId === step.cardId) : -1;
      if (original >= 0 && !hand[original]!.exhausts) piles.discard.push(musicBoxCopy(handBase[original] ?? hand[original]!));
      continue;
    }
    played.add(at);
    const card = hand[at]!;
    applyLasting(card, player, playerPowers);
    if (card.exhausts || card.type === "Power") continue;
    // Frantic Escape: 「这张牌的耗能加1」, for the fight: it comes back dearer.
    const back = handBase[at] ?? card;
    // Thrash: the damage it absorbed this turn is added to it for its later plays (3SBPKG9603WD).
    const grown = (o.thrashGrowth ?? []).filter((growth) => growth.index === card.index).reduce((sum, growth) => sum + growth.amount, 0);
    const picks = (o.thrashRandom ?? []).filter((entry) => entry.index === card.index);
    if (picks.length > 0 && back.damage !== null) {
      thrashPending.push({ back, grown, picks });
      continue;
    }
    if (grown > 0 && back.damage !== null) {
      piles.discard.push({ ...back, damage: back.damage + grown, ...(back.damageBase !== undefined ? { damageBase: back.damageBase + grown } : {}) });
      continue;
    }
    piles.discard.push(card.special === "frantic_escape" ? { ...back, cost: Math.max(back.cost, card.cost) + 1 } : back);
  }
  // Cards the line's effects exhausted (Fiend Fire's whole hand, Burning Pact's pick, a random True Grit
  // exhaust) leave the fight; the rest of the hand is discarded (FSPK F48 T1: Fiend Fire's hand came back
  // through the discard pile, "fight over 8/8", actual -60 and death).
  const exhausted = new Set(o.exhausted ?? []);
  const unplayed = hand.map((_card, i) => i).filter((i) => !played.has(i) && hand[i]!.type !== "Potion" && !exhausted.has(hand[i]!.index));
  // Thrash takes an Attack (「消耗你的手牌中随机一张攻击牌，并将它的伤害添加给这张牌」): one of the unplayed Attacks,
  // and that Thrash grows by its shown damage (plus the Strength gained by then), as the solver counts one.
  for (const pending of thrashPending) {
    let added = 0;
    for (const pick of pending.picks) {
      const attacks = unplayed.filter((i) => hand[i]!.type === "Attack");
      if (attacks.length === 0) break;
      const taken = attacks[Math.floor(random() * attacks.length)]!;
      unplayed.splice(unplayed.indexOf(taken), 1);
      added += Math.max(0, Math.floor((hand[taken]!.damage ?? 0) + pick.strength));
    }
    const total = pending.grown + added;
    const back = pending.back;
    piles.discard.push(total > 0 ? { ...back, damage: back.damage! + total, ...(back.damageBase !== undefined ? { damageBase: back.damageBase + total } : {}) } : back);
  }
  for (let k = 0; k < (o.randomExhausts ?? 0) && unplayed.length > 0; k += 1) unplayed.splice(Math.floor(random() * unplayed.length), 1);
  // Ethereal cards left in hand are exhausted at the end of the turn (their Feel No Pain Block is in the solver's
  // outcome): they leave the fight, not back through the discard pile.
  // Stable Serum: the rest of the hand is kept for the next turn instead (Ethereal cards still go).
  const keep = player.retainTurns > 0 && !o.winsFight;
  for (const i of unplayed) if (!hand[i]!.ethereal) (keep ? player.retained : piles.discard).push(handBase[i] ?? hand[i]!);
  player.retainTurns = Math.max(0, player.retainTurns - 1);
  // Cards drawn during the line: taken from the pile, counted as discarded (their use is in the solver's
  // outcome), except those an exhaust effect took after they were drawn. Under Stable Serum the ones the line
  // cannot play stay in hand like the rest of it: the solver's use of a draw is one per energy left at the end,
  // earlier draws first (drawScoreAt), so past that many they were held (batch K; they went to the discard pile).
  const exhaustedDraws = o.drawnExhausted ?? 0;
  const usedDraws = keep ? Math.max(0, Math.floor(o.energyLeft)) : Number.POSITIVE_INFINITY;
  for (let i = 0; i < o.cardsDrawn; i += 1) {
    const card = drawOne(piles, random);
    if (!card || i < exhaustedDraws || knownGone.has(card)) continue;
    (i - exhaustedDraws < usedDraws || card.ethereal ? piles.discard : player.retained).push(card);
  }
  // Dark Embrace: each ethereal card exhausted at the end of the turn draws a card, discarded with the hand
  // (not in a won fight: there is no end of turn).
  const etherealEnd = o.winsFight ? 0 : unplayed.filter((i) => hand[i]!.ethereal).length;
  for (let k = 0; k < etherealEnd * player.darkEmbrace; k += 1) {
    const card = drawOne(piles, random);
    if (card) piles.discard.push(card);
  }
  // Status cards the line's turn made (the solver priced them, the piles never got them): Dazed from hits
  // on a Personal Hive into the draw pile, Wounds from unblocked Painful Stabs and the Withers held at the
  // end of the turn into the discard pile.
  const made = (id: string) => input.statusCards?.[id] ?? input.statusCards?.[UNKNOWN_STATUS];
  const addMade = (id: string, count: number, pile: "draw" | "discard") => {
    const card = count > 0 ? made(id) : undefined;
    if (card) addToPile(piles, card, count, pile, random);
  };
  addMade("DAZED", o.dazedAdded ?? 0, "draw");
  addMade("WOUND", o.woundsAdded ?? 0, "discard");
  addMade("WITHER", o.withersAdded, "discard");
  // Our end-of-turn snapshot (before the enemy turn), for the terminal estimate.
  player.strength += o.strengthGained;
  player.freeAttacks = o.freeAttacksLeft ?? 0;
  // Pael's Tear: this turn's unspent energy gives the next turn its extra energy.
  player.paelsNext = o.nextTurnEnergy ?? 0;
  // Self-Forming Clay: this turn's HP losses give the next turn's block.
  player.clayNext = o.clayBlockNext ?? 0;
  const after = new Map(o.enemyHpAfter.map((e) => [e.index, e]));
  // Shriek/Plow: taken to its threshold this turn (the first time), it is stunned and this turn's move is lost
  // (the solver already left its hit out); it goes on from STUNNED (Terror Eel: Terror next), and a move it
  // did not make neither spends its Vigor nor gains Strength or Block (XLJQ F7 T5: stunned at 65 with
  // Vigor 6 up, Terror T6, Crash 18 + 6 T7). Once crossed it is spent.
  const shrieked = new Set<number>();
  for (const e of enemies) {
    const a = after.get(e.index);
    const threshold = e.base.shriek ?? 0;
    if (e.shriekArmed && a && e.alive && threshold > 0 && e.hp > threshold && a.hp <= threshold && a.hp > 0) shrieked.add(e.index);
    if (a && a.hp <= threshold) e.shriekArmed = false;
    // Stunned by the line itself (a Corpse Slug eating a corpse; MECH_RULES: a learned strip-stun, the Hopper's last
    // Flutter), on any turn.
    if (a?.stunned && a.hp > 0) shrieked.add(e.index);
  }
  // THIEF_FACTS: Flutter before the line; a line that strips the last stack stuns the enemy (its move cancelled).
  const flutterBefore = input.escapes ? new Map(enemies.map((e) => [e.index, e.flutter])) : null;
  // Retaliation (Flame Barrier, Thorns) on the enemy turn, by attacker: off its HP too.
  const retaliated = new Map((o.retaliated ?? []).map((r) => [r.index, r.amount]));
  // Slippery stacks the retaliation took (a stack per hit it hurt).
  const slipperyUsed = new Map((o.retaliated ?? []).map((r) => [r.index, r.slipperyUsed ?? 0]));
  for (const e of enemies) {
    const a = after.get(e.index);
    if (!a || !e.alive) continue;
    const hit = a.hp < e.hp;
    e.hp = a.hp - (a.hp > 0 && !a.husk ? Math.min(a.hp, retaliated.get(e.index) ?? 0) : 0);
    if (fullFight) e.hurt = e.hurt === true || hit || e.hp < a.hp;
    e.vulnerable = a.vulnerable;
    e.weak = a.weak;
    if (a.artifact !== undefined) e.artifact = a.artifact;
    if (a.slippery !== undefined) e.slippery = Math.max(0, a.slippery - (slipperyUsed.get(e.index) ?? 0));
    if (a.curlUp !== undefined) e.curlUp = a.curlUp;
    if (a.flutter !== undefined) e.flutter = a.flutter;
    if (a.shrink !== undefined) e.shrink = a.shrink;
    // Demise the line put on it (the outcome carries it only when up).
    e.demise = a.demise ?? e.demise;
    // Strength it gained for good this turn (Fight Me!, Enrage per Skill, Crab Rage on the survivor).
    e.strength += a.strengthGained ?? 0;
    if (a.block !== undefined) e.block = a.block;
    else if (hit) e.block = 0;
    if (e.hp <= 0) enemyDown(e, turn, input, enemies, fullFight);
  }
  // Sandpit (The Insatiable): the count after this turn's enemy turn, Frantic Escapes included; the solver
  // already calls a line that ends it at 0 a death. The rollout kept the starting count every turn, so in
  // a Sandpit fight the best line was just the one losing the least HP (LXB3 F33: eaten at 81 HP).
  if (o.sandpitAfter !== null) {
    for (const e of enemies) if ((e.base.sandpit ?? 0) > 0) e.base = { ...e.base, sandpit: o.sandpitAfter };
  }
  // A segment killed alone reattaches (63CP F25: the head died T2 and came back at 25 HP on T4); the
  // solver already scores this, the rollout ended the fight's threat at the kill.
  const segmentsLeft = enemies.some((e) => e.alive && e.base.reattach);
  for (const e of enemies) {
    if (e.alive || !e.base.reattach) continue;
    if (!segmentsLeft) e.reattachIn = undefined;
    else if (e.reattachIn === undefined) e.reattachIn = REATTACH_TURNS;
  }
  const handLeft = Math.max(0, hand.filter((c) => c.type !== "Potion").length - played.size + o.cardsDrawn);
  const blockEnd = player.block + o.blockGained;
  const snap = snapshotOf(player, enemies, startHp - ownLoss, blockEnd, o.energyLeft, handLeft, playerPowers);
  const hpLeft = Object.fromEntries(enemies.map((e) => [e.index, remainingHp(e, input)]));
  // Regen healed at this turn's end (in the outcome): one less next turn. Ritual: Strength at the end of it.
  player.regen = Math.max(0, player.regen + regenDrunk - 1);
  player.strength += player.ritual;
  // This turn's temporary Strength/Dexterity ends with it (Setup Strike's +3 was every later turn's).
  player.strength -= player.tempStrength;
  player.dexterity -= player.tempDexterity;
  player.tempStrength = 0;
  player.tempDexterity = 0;
  const allDown = () => enemies.every((e) => !e.alive || e.base.illusion === true || (e.base.minion === true && enemies.some((x) => !x.base.minion && !x.alive)));
  let won = o.winsFight || allDown();
  // The enemy turn: HP from the outcome; enemies gain their move's Strength and Block, debuffs wear off, next move.
  // A revive the line spent (Fairy in a Bottle, Lizard Tail): we go on at its HP, and it is gone for the sample
  // (a Fairy leaves the belt).
  player.hp = o.revived?.hp ?? o.hpAfter;
  if (o.revived) {
    const spent = o.revived.sources.length;
    player.potions = Math.max(0, player.potions - player.revives.slice(0, spent).filter((revive) => revive.source === "FAIRY_IN_A_BOTTLE").length);
    player.revives = player.revives.slice(spent);
  }
  // Barricade keeps block every turn; Blur N only at the start of the next N turns.
  // Sturdy Clamp (whole fights, B2): up to its amount of the block left is kept.
  player.block = player.keepsBlock || player.blurTurns > turn ? o.blockWasted ?? 0 : fullFight ? Math.min(input.fightRelics?.blockKeep ?? 0, o.blockWasted ?? 0) : 0;
  const died = !won && (o.dies || player.hp <= 0);
  // A husk whose blast was this turn's (in the outcome's enemy turn): gone, and the fight with it once we live.
  if (!won && !died) {
    for (const e of enemies) if (e.alive && e.explodeAt === turn) e.alive = false;
    won = allDown();
  }
  if (!won && !died) {
    // Debuffs the enemies' moves put on us this enemy turn (XLJQ6FPQAU7N F7 T6: Terror's 99 Vulnerable;
    // the rollout said "next turn -4.5, 8/8 alive", the Crash after it hit 36 and every line died).
    const applied: EnemyMove[] = [];
    // Imbalanced enemies whose hits this turn's line fully blocked (the solver's stuns).
    const blockStunned = new Set(o.stunIndexes ?? []);
    for (const e of enemies) {
      if (!e.alive || e.explodeAt !== undefined) continue;
      const table = input.tables[e.id];
      const m = e.move && table ? table.moves[e.move] : undefined;
      // Burrowed with all its block gone this turn: stunned, the move is lost (the solver already left its
      // hit out) and it surfaces; after the stun it goes on as the move model saw it (Tunneler: Bite).
      const stunned = (e.burrowed && e.block <= 0) || shrieked.has(e.index);
      // THIEF_FACTS: an Escape / Flee that resolves takes it out of the fight (no kill, nothing comes back). Stunned
      // by its last Flutter stripped this turn, the Escape is cancelled and comes again next turn (XMY29WWQDC1Y F19:
      // STUNNED on T5, Escape on T6; the move model's Escape -> Escape).
      // MECH_RULES generalises this: a learned strip-stun rule on the enemy (EnemySim.stunOnStrip, any power) is the
      // solver's own stun (`stunned`: its move lost, the Escape too), so this hand check of Flutter stands down for it.
      const learned = e.base.stunOnStrip?.some((rule) => rule.power === "FLUTTER_POWER") === true;
      const fluttered = flutterBefore !== null && !learned && (flutterBefore.get(e.index) ?? 0) > 0 && e.flutter <= 0;
      if (e.move !== null && input.escapes?.moves[e.id]?.includes(e.move) && !stunned && !fluttered) {
        e.alive = false;
        e.gone = true;
        continue;
      }
      if (stunned) e.burrowed = false;
      else {
        // An attack spends the Vigor it had (its hits carried it); the move's own Vigor is for the next one.
        if (e.base.attacks.some((attack) => attack.damage * attack.hits > 0)) e.vigor = 0;
        e.vigor += m?.vigor ?? 0;
        e.strength += m?.strength ?? 0;
        // Ritual, Territorial, High Voltage: Strength at the end of its turn (Cultists' T2 loss was short
        // 1.3 a turn, Byrdonis 2); a Ritual this move gives starts on its next turn (Incantation gains none).
        e.strength += e.growth;
        e.growth += m?.selfPowers?.RITUAL_POWER ?? 0;
        // A move's Thorns / Soar is spent by the next move; then this move's self-buffs.
        if (e.moveBuffs.thorns) e.thorns = 0;
        if (e.moveBuffs.soar) e.halved = (e.powers["GUARDED_POWER"] ?? 0) > 0;
        e.moveBuffs = { thorns: false, soar: false };
        const gained = m?.selfPowers ?? {};
        if (gained.THORNS_POWER) {
          e.thorns += gained.THORNS_POWER;
          e.moveBuffs.thorns = true;
        }
        if (gained.SOAR_POWER) {
          e.halved = true;
          e.moveBuffs.soar = true;
        }
        e.flutter += gained.FLUTTER_POWER ?? 0;
        e.dazedPerHit += gained.PERSONAL_HIVE_POWER ?? 0;
        e.vitalSpark += gained.VITAL_SPARK_POWER ?? 0;
        // The Giant's eruption grows with every move (it was frozen at the decision's: a kill on a later
        // simulated turn exploded up to 12 low), and Siphon / Ponder heal.
        if (gained.STEAM_ERUPTION_POWER) e.base = { ...e.base, eruption: (e.base.eruption ?? 0) + gained.STEAM_ERUPTION_POWER };
        if (m?.heal) e.hp = Math.min(e.maxHp, e.hp + m.heal);
        // Status cards into our piles (no code added any: Beckons, Wounds, Toxic, Dazed … only cycled when
        // already there; ~800 logged fights had them added). B4, whole fights: some of them into the draw pile.
        for (const status of m?.statusCards ?? []) {
          const card = input.statusCards?.[status.cardId ?? UNKNOWN_STATUS] ?? input.statusCards?.[UNKNOWN_STATUS];
          const intoDraw = fullFight && e.move ? Math.min(status.count, STATUS_INTO_DRAW[e.move] ?? 0) : 0;
          if (card && intoDraw > 0) addToPile(piles, card, intoDraw, "draw", random);
          if (card) addToPile(piles, card, status.count - intoDraw, status.pile, random);
        }
        if (fullFight) {
          // B4 whole-fight scripts: the Sandpit Liquify Ground starts, the curses used.
          if (m?.sandpit) e.base = { ...e.base, sandpit: m.sandpit };
          if (e.id === "KNOWLEDGE_DEMON" && e.move === "CURSE_OF_KNOWLEDGE_MOVE") e.curses = (e.curses ?? 0) + 1;
        }
        if (m?.playerPowers) applied.push(m);
        // Burrowed: the block is not removed at the start of its turn (RWWG F20: 32 block T6-T10, the
        // rollout dropped it after one simulated turn and read pure-block lines as "~2 turns to the end").
        e.block = (e.burrowed ? e.block : 0) + (m?.block ?? 0);
        if (m?.burrows) e.burrowed = true;
        // Plating: a stack less at the start of its turn (not its first), its block at the end.
        if (e.plating > 0 && input.meta.t + turn >= 2) e.plating -= 1;
        e.block += e.plating;
      }
      e.vulnerable = Math.max(0, e.vulnerable - 1);
      e.weak = Math.max(0, e.weak - 1);
      e.shrink = Math.max(0, e.shrink - 1);
      e.intangibleTurns = Math.max(0, e.intangibleTurns - 1);
      // Fade (Soul Fysh): Intangible through our next turn (93 of 577 logged Soul Fysh turns).
      if (!stunned) e.intangibleTurns += m?.selfPowers?.INTANGIBLE_POWER ?? 0;
      if (e.nemesisIn !== undefined) {
        e.nemesisIn -= 1;
        if (e.nemesisIn <= 0) {
          e.intangibleTurns += 1;
          e.nemesisIn = 2;
        }
      }
      // Still burrowed: it keeps using its burrowed move (Below) until the block breaks.
      // Imbalanced (Bowlbug Rock, 「如果这名敌人的攻击被完全格挡，它会被眩晕」): its hit fully blocked this turn, its next
      // move is the stun; otherwise never a stun (the move model's HEADBUTT -> STUNNED 110/367 was a free 30%
      // stun each turn whatever we blocked: KTRT1M2SVVL3 F23 T3, leaving the Rock alive read safer than killing it).
      const imbalanced = (e.powers["IMBALANCED_POWER"] ?? 0) > 0;
      // A whole fight draws each enemy's moves from its own stream (common random numbers across lines).
      const pick = e.random ?? random;
      if (stunned) e.move = table?.next["STUNNED"] ? nextMove(table, "STUNNED", pick) : nextMove(table, e.move, pick);
      else if (imbalanced && blockStunned.has(e.index)) e.move = STUNNED_MOVE;
      else if (fullFight && !(e.burrowed && m && !m.burrows)) {
        // The growing move's next use has a hit more (Multi Claw) or more damage (Pressure Gun); the script picks the next move.
        if (e.move !== null && e.move === GROWING_HITS[e.id]) e.extraHits = (e.extraHits ?? 0) + 1;
        if (e.move !== null && m?.growth) e.uses = { ...e.uses, [e.move]: (e.uses?.[e.move] ?? 0) + 1 };
        e.move = fightNextMove(e, table, pick, enemies, imbalanced ? STUNNED_MOVE : undefined);
      } else if (!(e.burrowed && m && !m.burrows)) e.move = nextMove(table, e.move, random, imbalanced ? STUNNED_MOVE : undefined);
      e.hurt = false;
      // A Plow threshold that comes up later (the Beast's after Stamp): armed from its turn on, once.
      const later = fullFight ? table?.shriekFrom : undefined;
      if (later && !(e.base.shriek ?? 0) && (input.solver.turn ?? input.meta.t) + turn + 1 >= later.turn) {
        e.base = { ...e.base, shriek: later.amount };
        e.shriekArmed = e.hp > later.amount;
      }
    }
    // Demise: HP lost at the end of each of its turns, stunned or not, until it dies (the solver only priced about
    // three turns of it; ARKG3JFT26HC F17: 9 a turn on the Soul Fysh never counted in any later turn).
    for (const e of enemies) {
      if (!e.alive || e.explodeAt !== undefined || e.demise <= 0) continue;
      e.hp -= e.demise;
      if (e.hp <= 0) enemyDown(e, turn, input, enemies, fullFight);
    }
    won = allDown();
    // Rampart (Living Shield, RAMPART_POWER: 「在玩家回合开始时，高塔炮手获得25点格挡」): the Turret Operator's
    // block at the start of each of our turns while the Shield lives (40 logged fights, 25 every turn).
    for (const holder of enemies) {
      const rampart = holder.alive ? holder.powers["RAMPART_POWER"] ?? 0 : 0;
      if (rampart > 0) for (const e of enemies) if (e.alive && e.id === RAMPART_TARGET) e.block += rampart;
    }
    for (const e of enemies) {
      if (e.alive || e.reviveIn === undefined) continue;
      e.reviveIn -= 1;
      if (e.reviveIn > 0) continue;
      e.alive = true;
      e.reviveIn = undefined;
      e.hp = e.maxHp;
      e.block = 0;
      e.vulnerable = 0;
      e.weak = 0;
      // A new body: its own once-a-fight powers again.
      e.artifact = e.base.artifact;
      e.slippery = e.base.slippery ?? 0;
      e.curlUp = e.base.curlUp ?? 0;
      e.flutter = e.base.flutter ?? 0;
      e.move = usualMove(input.tables[e.id]) ?? e.move;
    }
    for (const e of enemies) {
      if (e.alive || e.reattachIn === undefined) continue;
      e.reattachIn -= 1;
      if (e.reattachIn > 0) continue;
      e.alive = true;
      e.reattachIn = undefined;
      e.hp = Math.min(e.maxHp, e.base.reattachHp || REATTACH_HP);
      e.block = 0;
      e.vulnerable = 0;
      e.weak = 0;
    }
    player.weakTurns = Math.max(0, player.weakTurns - 1);
    player.vulnTurns = Math.max(0, player.vulnTurns - 1);
    player.frailTurns = Math.max(0, player.frailTurns - 1);
    player.shrinkTurns = Math.max(0, player.shrinkTurns - 1);
    // Put on us by this enemy turn's moves: they last through our next turn and its enemy turn.
    for (const move of applied) applyPlayerDebuffs(player, chosenDebuffs(move, player));
    player.strength += player.demonForm;
  }
  const carried = player.startDealt;
  player.startDealt = 0;
  if (!won && !died) {
    player.startDealt = startOfTurn(turn, player, enemies, input, fullFight);
    won = allDown();
  }
  // The potions this turn drinks and their cost (the solver's outcome: potion-cost.ts), for the line's effective loss.
  const drunk = plan.steps.filter(isPotion).map((step) => step.cardId.split(":")[1] ?? "");
  const thieves = input.escapes && Object.keys(input.escapes.carriers).length > 0 ? thiefStatus(enemies) : null;
  const gone = input.escapes ? enemies.filter((e) => e.gone).map((e) => e.index) : [];
  return {
    loss: startHp - player.hp + (o.revived?.reviveHp ?? 0),
    enemyPart: o.incomingAfterBlock,
    dmg: o.damageDealt + carried,
    snap,
    won,
    died,
    ...(o.revived ? { revived: o.revived.sources.length } : {}),
    hpLeft,
    ...(drunk.length > 0 ? { drunk, potionCost: o.potionCost ?? 0 } : {}),
    ...(thieves ? { thieves } : {}),
    ...(gone.length > 0 ? { gone } : {}),
    // Whole fights (B2's fight plan): the Powers played and the block gained this turn.
    ...(fullFight
      ? {
          powers: plan.steps.map((step) => hand.find((card) => card.index === step.cardIndex && card.cardId === step.cardId) ?? known?.get(step.cardIndex)?.card).filter((card): card is CardModel => card?.type === "Power").map((card) => card.cardId),
          blockGained: o.blockGained,
        }
      : {}),
  };
}

/**
 * Each carrier tag's loot after a turn (RolloutInput.escapes): open while a holder lives, gone once one left with it,
 * else back (every holder killed: a Merc and the Fat Gremlin it spawned both dead).
 */
function thiefStatus(enemies: SimEnemy[]): Record<string, "back" | "gone" | "open"> {
  const out: Record<string, "back" | "gone" | "open"> = {};
  for (const tag of new Set(enemies.map((e) => e.carrier).filter((tag): tag is string => tag !== undefined))) {
    const holders = enemies.filter((e) => e.carrier === tag);
    out[tag] = holders.some((e) => e.alive && !e.gone) ? "open" : holders.some((e) => e.gone) ? "gone" : "back";
  }
  return out;
}

/** `count` copies of a card into the discard pile, or shuffled into the draw pile at random places. */
function addToPile(piles: Piles, card: CardModel, count: number, pile: "draw" | "discard", random: () => number): void {
  for (let k = 0; k < count; k += 1) {
    if (pile === "discard") piles.discard.push(card);
    else piles.draw.splice(Math.floor(random() * (piles.draw.length + 1)), 0, card);
  }
}

function drawOne(piles: Piles, random: () => number): CardModel | undefined {
  if (piles.draw.length === 0) {
    if (piles.discard.length === 0) return undefined;
    piles.draw = shuffle(piles.discard, random);
    piles.discard = [];
    if (piles.onShuffle) piles.draw.splice(Math.floor(random() * (piles.draw.length + 1)), 0, piles.onShuffle);
  }
  return piles.draw.pop();
}

/** Static per-enemy flags that do not carry into simulated turns (they depend on this turn's board). */
function laterTurnSim(base: EnemySim): EnemySim {
  const { asleep: _a, slumber: _s, imbalanced: _i, shriek: _sh, burrowed: _b, skittish: _sk, ...rest } = base;
  return rest;
}

interface Budget {
  now: () => number;
  start: number;
  budgetMs: number;
  policyTurns: number;
  policyMs: number;
  policyNodes: number;
}

/** One sample of one line: the line itself, then up to horizon-1 policy turns. Returns the per-turn records. */
function simulate(
  input: RolloutInput,
  /** The start turn's line; null (whole fights only, simulateFight): the policy plays the start turn too. */
  plan: Plan | null,
  horizon: number,
  seed: number,
  budget: Budget,
  deadline = Infinity,
  order: KillOrder | null = null,
  /** Set to how many of the order's groups the policy looked at (the trajectory depends on no others). */
  used: { depth: number } = { depth: 0 },
  /** The "no potion this fight" line (RolloutOptions.noPotionLine): the later turns hold no potion either. */
  noPotions = false,
  /** A whole fight (simulateFight): the enemies' scripts (fightNextMove), sleepers and phases carried turn to turn. */
  fullFight = false,
): TurnRecord[] | null {
  const random = rng(seed);
  const s = input.solver;
  const opts = input.options ?? {};
  const handSize = opts.handSize ?? 5;
  const policyNodes = opts.policyNodes ?? 1500;
  const base = s.player;
  const player: SimPlayer = {
    hp: base.hp,
    maxHp: base.maxHp,
    strength: base.strengthNow ?? input.playerPowers["STRENGTH_POWER"] ?? 0,
    dexterity: input.playerPowers["DEXTERITY_POWER"] ?? 0,
    weakTurns: input.playerPowers["WEAK_POWER"] ?? (base.weak ? 1 : 0),
    vulnTurns: input.playerPowers["VULNERABLE_POWER"] ?? (base.vulnerable ? 1 : 0),
    frailTurns: input.playerPowers["FRAIL_POWER"] ?? 0,
    block: base.block,
    // Barricade for the fight; a Blur behind the decision's keepsBlock lasts its turns (blurTurns).
    keepsBlock: (input.playerPowers["BARRICADE_POWER"] ?? 0) > 0 || (base.keepsBlock === true && (input.playerPowers["BLUR_POWER"] ?? 0) <= 0),
    demonForm: input.playerPowers["DEMON_FORM_POWER"] ?? 0,
    // The decision's end-of-turn block is Plating + Metallicize (combat-plan): Plating wears off, split it out.
    endTurnBlock: Math.max(0, (base.endTurnBlock ?? 0) - (input.playerPowers["PLATING_POWER"] ?? 0)),
    plating: Math.min(base.endTurnBlock ?? 0, input.playerPowers["PLATING_POWER"] ?? 0),
    juggernaut: base.juggernaut ?? 0,
    feelNoPain: base.feelNoPain ?? 0,
    potions: input.potions,
    inferno: base.inferno ?? 0,
    mantle: input.playerPowers["CRIMSON_MANTLE_POWER"] ?? 0,
    rupture: base.rupture ?? 0,
    pyre: input.playerPowers["PYRE_POWER"] ?? 0,
    thorns: input.playerPowers["THORNS_POWER"] ?? 0,
    redSkull: base.redSkull ?? 0,
    skullUp: (base.redSkull ?? 0) > 0 && base.hp * 2 <= base.maxHp,
    clayNext: 0,
    radiance: input.playerPowers["RADIANCE_POWER"] ?? 0,
    strikeReplay: base.strikeReplay ?? 0,
    unmovable: (input.playerPowers["UNMOVABLE_POWER"] ?? 0) > 0,
    relicAoe: 0,
    boulder: input.playerPowers["ROLLING_BOULDER_POWER"] ?? 0,
    hellraiser: (input.playerPowers["HELLRAISER_POWER"] ?? 0) > 0,
    freeAttacks: 0,
    paelsNext: 0,
    darkEmbrace: input.playerPowers["DARK_EMBRACE_POWER"] ?? 0,
    otherStartLoss: 0,
    startDealt: 0,
    playCap: (input.playerPowers["SLOTH_POWER"] ?? 0) > 0 ? input.playerPowers["SLOTH_POWER"]! : null,
    intangibleTurns: input.playerPowers["INTANGIBLE_POWER"] ?? (base.intangible ? 1 : 0),
    blurTurns: input.playerPowers["BLUR_POWER"] ?? 0,
    // Shrink -1 (the Shrinker Beetle's, logged -1 every turn) is for the fight.
    shrinkTurns: turnsOf(input.playerPowers["SHRINK_POWER"] ?? (base.shrunk ? 1 : 0)),
    disintegration: input.playerPowers["DISINTEGRATION_POWER"] ?? 0,
    constrict: input.playerPowers["CONSTRICT_POWER"] ?? 0,
    // Tender's -1 a card played so far this turn is temporary too (logged Strength 6, 5, 4, 3 over a turn, 6 again next).
    tempStrength: sumOf(input.playerPowers, TEMP_STRENGTH_POWERS) - (base.tender ?? 0) * (s.cardsPlayedThisTurn ?? 0),
    tempDexterity: sumOf(input.playerPowers, TEMP_DEXTERITY_POWERS) - (base.tender ?? 0) * (s.cardsPlayedThisTurn ?? 0),
    tender: input.playerPowers["TENDER_POWER"] ?? base.tender ?? 0,
    smoggy: (input.playerPowers["SMOGGY_POWER"] ?? 0) > 0,
    tangledNext: 0,
    chains: input.playerPowers["CHAINS_OF_BINDING_POWER"] ?? 0,
    ringingNext: false,
    mindRot: input.playerPowers["MIND_ROT_POWER"] ?? 0,
    wasteAway: input.playerPowers["WASTE_AWAY_POWER"] ?? 0,
    regen: base.regen ?? input.playerPowers["REGEN_POWER"] ?? 0,
    ritual: input.playerPowers["RITUAL_POWER"] ?? 0,
    clarityTurns: input.playerPowers["CLARITY_POWER"] ?? 0,
    retainTurns: input.playerPowers["RETAIN_HAND_POWER"] ?? 0,
    retained: [],
    revives: base.revives ?? [],
  };
  // An end-of-turn loss the decision reads that is neither (a solver input without the powers): kept as is.
  if (player.disintegration + player.constrict === 0) player.disintegration = base.endTurnHpLoss ?? 0;
  // What of the start-of-turn loss and AoE is not Mantle or Inferno (relics, other powers): kept as is.
  player.relicAoe = Math.max(0, (base.turnStartAoe ?? 0) - player.inferno * startLossEvents(player) - player.boulder);
  player.otherStartLoss = Math.max(0, (base.startTurnHpLoss ?? 0) - mantleHpCost(player.mantle) - (player.inferno > 0 ? 1 : 0));
  const byIndex = new Map(input.enemies.map((e) => [e.index, e]));
  const enemies: SimEnemy[] = s.enemies.map((e) => {
    const info = byIndex.get(e.index);
    // A Giant husk already on the board: it explodes this turn when its intent shows the blast, else next turn.
    // On the blast turn its Steam Eruption power is gone (only the DeathBlow intent shows the number): the
    // husk is known by its HP alone (YQL8D59999AX F17 T8: simulated as a live 999,999,977-HP enemy, every line
    // "dead within 5 turns 8/8"; it blew for 35 and we won at 21).
    const shownBlast = e.attacks.reduce((sum, a) => sum + a.damage * a.hits, 0);
    const husk = e.maxHp >= HUSK_HP && ((e.eruption ?? 0) > 0 || shownBlast > 0);
    return {
      ...(husk ? { explodeAt: shownBlast > 0 ? 0 : 1, blast: shownBlast > 0 ? shownBlast : e.eruption ?? 0 } : {}),
      index: e.index,
      id: info?.id ?? e.name,
      move: info?.move ?? null,
      hp: e.hp,
      maxHp: e.maxHp,
      block: e.block,
      // A temporary loss (Mangle, Shackling Potion) is gone by its next move: the later turns hit at full Strength.
      strength: (info?.strength ?? 0) + sumOf(info?.powers, ENEMY_TEMP_STRENGTH_LOSS_POWERS),
      vigor: info?.powers?.["VIGOR_POWER"] ?? 0,
      vulnerable: e.vulnerable,
      weak: e.weak,
      alive: e.hp > 0,
      // Intangible now lasts its stacks; Nemesis re-grants it at the end of every 2nd enemy turn, so it is
      // on every other turn (VQKX F48 T6: "win 88%" with Intangible never coming back, T7 212 -> 208).
      intangibleTurns: e.intangible ? Math.max(1, info?.powers?.["INTANGIBLE_POWER"] ?? 1) : 0,
      ...((info?.powers?.["NEMESIS_POWER"] ?? 0) > 0 ? { nemesisIn: e.intangible ? 2 : 1 } : {}),
      burrowed: e.burrowed === true,
      artifact: e.artifact,
      slippery: e.slippery ?? 0,
      curlUp: e.curlUp ?? 0,
      flutter: e.flutter ?? 0,
      growth: sumOf(info?.powers, STRENGTH_GROWTH_POWERS),
      shrink: e.shrink ?? 0,
      demise: e.demise ?? 0,
      shriekArmed: (e.shriek ?? 0) > 0 && e.hp > (e.shriek ?? 0),
      plating: info?.powers?.["PLATING_POWER"] ?? 0,
      thorns: e.thorns ?? 0,
      halved: e.halved === true,
      dazedPerHit: e.dazedPerHit ?? 0,
      vitalSpark: e.vitalSpark ?? 0,
      // Thorns / Soar up now from one of its moves (its table has a move giving them): gone after its next move.
      moveBuffs: {
        thorns: (e.thorns ?? 0) > 0 && gainsSelf(input.tables[info?.id ?? ""], "THORNS_POWER"),
        soar: (info?.powers?.["SOAR_POWER"] ?? 0) > 0 && gainsSelf(input.tables[info?.id ?? ""], "SOAR_POWER"),
      },
      powers: info?.powers ?? {},
      ...(input.escapes?.carriers[e.index] !== undefined ? { carrier: input.escapes.carriers[e.index] } : {}),
      base: e,
      shown: e.attacks,
      shownScale: (e.weak > 0 ? 0.75 : 1) * ((e.shrink ?? 0) > 0 ? SHRINK_DAMAGE_FACTOR : 1) * (base.vulnerable ? 1.5 : 1),
      // Killed before this decision, it revives on this enemy turn (QUG1DSDARAXU F23 T3: the rollout left
      // it out and read "4.9 loss, win 97%"; it came back at 21 HP and T4 cost 12).
      ...(e.illusion && e.hp <= 0 ? { reviveIn: 1 } : {}),
      // A whole fight: a sleeper's Asleep turns, a phase boss's phase (from its max HP) and its growing move's hits.
      ...(fullFight ? { ...fullFightState(info, e, input), random: rng((Math.imul(seed, 0x9e3779b1) ^ Math.imul(e.index + 1, 0x85ebca6b)) >>> 0) } : {}),
    };
  });
  const piles: Piles = { draw: sampledDrawPile(input.piles, random), discard: input.piles.discard.slice(), ...(input.onShuffle ? { onShuffle: input.onShuffle } : {}) };
  const records: TurnRecord[] = [];
  const powers = { ...input.playerPowers };
  // Modelled potions still held in this sample: 0-energy cards that exist once (drunk: gone), each carrying its cost
  // (card.potionCost: the solver drinks one only when its turn gains more than that). None for the no-potion line.
  let held = noPotions ? [] : s.hand.filter((card) => card.type === "Potion");
  const drink = (line: Plan) => {
    for (const step of line.steps) if (isPotion(step)) held = held.filter((card) => card.cardId !== step.cardId);
  };
  // A time limit (Battleworn Dummy: turns left, this one included) ends the fight after its last turn.
  const limit = turnsLeftOf(s);
  const timeUp = (h: number) => {
    const last = records[records.length - 1]!;
    if (limit !== null && h + 1 >= limit && !last.won && !last.died) last.timeUp = true;
  };
  // Withering Presence counts every card played in the fight: the later turns go on from this line's count.
  const cardPlays = (line: Plan) => line.steps.filter((step) => !isPotion(step)).length;
  // Turn 0: the candidate line as the solver scored it. None (a whole fight from the policy's own start turn): the policy
  // plays it from the hand given, after drawing `drawFirst` cards into it (a pre-fight start's hand is empty).
  let first = plan;
  let firstHand = s.hand;
  let firstBase = input.piles.handBase;
  let firstKnown: Map<number, { card: CardModel; base: CardModel }> | undefined;
  if (!first) {
    const targets = enemies.filter((e) => e.alive).map((e) => e.index);
    const cards = s.hand.filter((card) => card.type !== "Potion");
    const bases = s.hand.map((card, i) => [card, input.piles.handBase[i] ?? null] as const).filter(([card]) => card.type !== "Potion").map(([, b]) => b);
    for (let i = 0; i < (opts.drawFirst ?? 0) && cards.length < HAND_LIMIT; i += 1) {
      const card = drawOne(piles, random);
      if (!card) break;
      bases.push(card);
      cards.push(withStrength(card, player, cards.length, targets));
    }
    const drawing = fullFight ? knownDraws(cards, piles, player, targets) : null;
    const potions = noPotions ? [] : fullFight ? sampledPotions(held, input, seed, 0, cards, piles, player, targets, drawing?.known) : held;
    firstHand = [...(drawing?.hand ?? cards), ...potions];
    firstBase = [...bases, ...potions.map(() => null)];
    firstKnown = drawing?.known;
    // The decision turn's known pile top (SL_RETRY_KNOWN_DRAWS) is not this turn's: its draws come off the sample's pile.
    const { drawPile: _d, knownTop: _k, ...rest } = s;
    // B5: the one-turn lookahead (whole fights, when set) replaces the decision's nextIncoming with the sim's own forecast.
    const ahead = fullFight ? lookaheadOf(opts, enemies, input, player, s.player.hp) : null;
    const solved = solveTurn({ ...rest, ...(fullFight ? { player: { ...s.player, ...endBlockRelics(input) } } : {}), ...withLookahead(policyWeights(opts, s.player, s.enemies), ahead), hand: firstHand, maxNodes: policyNodes });
    budget.policyTurns += 1;
    budget.policyNodes += solved.nodes;
    first = solved.plans[0] ?? null;
    if (!first) return records;
  }
  let witherPlayed = (s.wither?.played ?? 0) + cardPlays(first);
  // Whole fights (B2): Surrounded's facing carried turn to turn (the last enemy a line targeted; the solver's own rule).
  let facing: number | null = s.player.facing ?? null;
  const turnTo = (line: Plan) => {
    for (const step of line.steps) if (typeof step.target === "number") facing = step.target;
  };
  records.push(applyPlan(0, first, firstHand, firstBase, player, enemies, piles, input, random, powers, fullFight, firstKnown));
  turnTo(first);
  timeUp(0);
  drink(first);
  for (let h = 1; h < horizon; h += 1) {
    // Past the hard deadline the sample is dropped (the caller keeps the waves already complete).
    if (budget.now() - budget.start > deadline) return null;
    const last = records[records.length - 1]!;
    if (last.won || last.died || last.timeUp) break;
    const hand: CardModel[] = [];
    const handBase: CardModel[] = [];
    const targets = enemies.filter((e) => e.alive).map((e) => e.index);
    // Mind Rot draws fewer; Tangled makes this turn's Attacks dearer; Chains of Binding binds the first cards drawn.
    const clarity = player.clarityTurns > 0 ? 1 : 0;
    player.clarityTurns = Math.max(0, player.clarityTurns - 1);
    // Stable Serum: the hand kept at the last turn's end first; the draw goes on top of it, up to the hand limit.
    for (const card of player.retained) {
      handBase.push(card);
      hand.push(withStrength(card, player, hand.length, targets));
    }
    player.retained = [];
    const relicDraws = fullFight ? fightRelicDrawsAt(input, (s.turn ?? input.meta.t) + h) : 0;
    for (let i = 0; i < Math.max(0, handSize + clarity + relicDraws - player.mindRot) && hand.length < HAND_LIMIT; i += 1) {
      const card = drawOne(piles, random);
      if (!card) break;
      handBase.push(card);
      const drawn = withStrength(card, player, hand.length, targets);
      if (player.hellraiser && isStrikeCard(card)) {
        hand.push({ ...hellraised(drawn), ...(i < player.chains ? { soulbound: true } : {}) });
        continue;
      }
      hand.push({
        ...drawn,
        ...(player.tangledNext > 0 && drawn.type === "Attack" && !drawn.xCost && drawn.cost >= 0 ? { cost: drawn.cost + player.tangledNext } : {}),
        ...(i < player.chains ? { soulbound: true } : {}),
      });
    }
    // Surrounded (whole fights, B2): an enemy we do not face hits for +50%, as the game shows it (turn-solver backAttack
    // takes it off when the line turns to it); the rollout keeps every later hit as the move model's.
    const behind = (index: number, attacks: { damage: number; hits: number }[]) =>
      fullFight && base.surrounded && facing !== null && index !== facing ? attacks.map((a) => ({ ...a, damage: Math.floor(a.damage * 1.5) })) : attacks;
    const sims: EnemySim[] = enemies
      .filter((e) => e.alive)
      .map((e) => ({
        ...laterTurnSim(e.base),
        intangible: e.intangibleTurns > 0,
        hp: e.hp,
        maxHp: e.maxHp,
        block: e.block,
        vulnerable: e.vulnerable,
        weak: e.weak,
        artifact: e.artifact,
        slippery: e.slippery,
        curlUp: e.curlUp,
        flutter: e.flutter,
        thorns: e.thorns,
        halved: e.halved,
        shrink: e.shrink,
        demise: e.demise,
        dazedPerHit: e.dazedPerHit,
        vitalSpark: e.vitalSpark,
        // Burrowed is this simulated turn's own state, not the decision's (laterTurnSim drops the latter).
        burrowed: e.burrowed,
        // A whole fight's sleeper still asleep: the solver prices waking it (laterTurnSim drops the decision's).
        ...(e.asleep !== undefined && e.asleep > 0 ? { asleep: e.asleep } : {}),
        // Shriek / Plow still to come (laterTurnSim drops the decision's).
        ...(e.shriekArmed && (e.base.shriek ?? 0) > 0 ? { shriek: e.base.shriek! } : {}),
        // Hardened Shell: a new turn, the whole cap again (the decision's is what was left of that turn's).
        ...((e.powers["HARDENED_SHELL_POWER"] ?? 0) > 0 ? { hpLossCap: e.powers["HARDENED_SHELL_POWER"]! } : {}),
        ...(e.base.timeLimit !== undefined ? { timeLimit: Math.max(1, e.base.timeLimit - h) } : {}),
        attacks: e.explodeAt !== undefined ? (e.explodeAt === h ? [{ damage: e.blast ?? 0, hits: 1 }] : []) : behind(e.index, moveAttack(e, input.tables[e.id], e.move, player.vulnTurns > 0, { fullFight, faced: fullFight && base.surrounded === true && facing !== null })),
      }))
      // Imbalanced on this simulated turn too (laterTurnSim drops the decision's): a hit fully blocked stuns it,
      // its next hit (about this one) saved.
      .map((sim) => {
        const e = enemies.find((entry) => entry.index === sim.index);
        const imbalanced = e && (e.powers["IMBALANCED_POWER"] ?? 0) > 0 ? sim.attacks.reduce((sum, attack) => sum + attack.damage * attack.hits, 0) : 0;
        return imbalanced > 0 ? { ...sim, imbalanced } : sim;
      });
    for (const e of enemies) e.base = { ...e.base, attacks: sims.find((x) => x.index === e.index)?.attacks ?? [] };
    // Ice Cream (whole fights, B2): the last turn's unspent energy carries over.
    const carried = fullFight && input.fightRelics?.iceCream ? Math.max(0, Math.floor(last.snap.en)) : 0;
    const pSim: PlayerSim = {
      ...base,
      hp: player.hp,
      block: player.block,
      energy: Math.max(0, input.meta.max_en + relicEnergyAt(input, (s.turn ?? input.meta.t) + h) + (fullFight ? fightRelicEnergyAt(input, (s.turn ?? input.meta.t) + h) + carried : 0) + player.pyre + (player.radiance > 0 ? 1 : 0) + player.paelsNext - player.wasteAway),
      weak: player.weakTurns > 0,
      vulnerable: player.vulnTurns > 0,
      strengthNow: player.strength,
      // FREE_ATTACK_POWER stays up across turns (Unrelenting as the last Attack): the last turn's leftover.
      freeAttacks: player.freeAttacks,
      // Self-Forming Clay: what the last turn owed is in this turn's block already; this turn's start losses (Crimson
      // Mantle's, Inferno's) owe the next turn's (2VW5 F17: SELF_FORMING_CLAY_POWER 3 at every turn start with the
      // Mantle up, 7 + 3 block at the next).
      clayPending: (base.clayBlock ?? 0) * startLossEvents(player),
      duplicate: 0,
      buffer: 0,
      vigor: 0,
      regen: player.regen,
      facing: fullFight ? facing : null,
      ...(fullFight ? endBlockRelics(input) : {}),
      unmovableArmed: player.unmovable,
      strikeReplay: player.strikeReplay,
      exhaustedThisTurn: false,
      noBlock: false,
      tender: player.tender,
      maxSkills: player.smoggy ? 1 : null,
      revives: player.revives,
      // This turn's own state, by the game's rules, not the decision's (`...base`): Sloth's cap per turn
      // (Ringing was the decision turn's only), Intangible/Blur/Shrink for the turns they last, Constrict
      // while its Strangler lives.
      maxPlays: player.ringingNext ? Math.min(player.playCap ?? Infinity, 1) : player.playCap,
      intangible: player.intangibleTurns > h,
      shrunk: player.shrinkTurns > 0,
      endTurnHpLoss: player.disintegration + (player.constrict > 0 && enemies.some((e) => e.alive && e.id === CONSTRICTOR) ? player.constrict : 0),
      keepsBlock: player.keepsBlock || player.blurTurns > h,
      endTurnBlock: player.endTurnBlock + player.plating,
      juggernaut: player.juggernaut,
      feelNoPain: player.feelNoPain,
      // Mid-turn draws: Hellraiser plays the Strikes, Dark Embrace draws for each exhaust (the solver's own turn).
      hellraiser: player.hellraiser,
      darkEmbrace: player.darkEmbrace,
      // Lasting powers up by now, played in the line or before (0B5Y F33 T1: Inferno was T1's 0 every turn).
      inferno: player.inferno,
      rupture: player.rupture,
      startTurnHpLoss: startTurnHpLossOf(player),
      turnStartAoe: turnStartAoeOf(player),
      drawable: piles.draw.length + piles.discard.length,
      rage: 0,
      colossus: false,
      gambit: false,
      // Thorns up by now (Liquid Bronze drunk in the line or before); Flame Barrier's was the decision turn's only.
      retaliate: player.thorns,
      ...(base.kusarigama ? { kusarigama: { ...base.kusarigama, count: 0 } } : {}),
      // Shuriken: a new turn, the count starts again (the Strength it gave is in player.strength already).
      ...(base.shuriken ? { shuriken: { ...base.shuriken, count: 0 } } : {}),
      // Music Box: a new turn, its first Attack card makes a copy again.
      ...(base.musicBox ? { musicBox: { count: 0 } } : {}),
    };
    // Radiance: this turn's extra energy is in pSim; one turn of it used. Ringing and Tangled were this turn's.
    player.radiance = Math.max(0, player.radiance - 1);
    player.ringingNext = false;
    player.tangledNext = 0;
    const started = budget.now();
    const { drawPile: _d, wither: _w, focusIndex: _f, focusWeight: _fw, nextIncoming: _n, laterIncoming: _l, knownTop: _k, ...rest } = s;
    const potions = held.map((card) => ({ ...card, validTargets: card.target === "single" ? targets : [] }));
    // A kill order: this turn's target is the first of its groups with a member alive (the lowest-HP
    // member of it); none left, or none given, and the solver's own score picks.
    const aim = order ? orderTarget(order, enemies) : null;
    if (aim) used.depth = Math.max(used.depth, aim.depth);
    const target = aim?.target;
    const focus = target === undefined ? {} : { focusIndex: target, focusWeight: opts.orderFocusBonus ?? ORDER_FOCUS_BONUS };
    const wither = s.wither ? { wither: { ...s.wither, played: witherPlayed } } : {};
    // B5: the one-turn lookahead (whole fights, when set): the next turn's forecast attacks.
    const scale = withLookahead(policyWeights(opts, pSim, sims), fullFight ? lookaheadOf(opts, enemies, input, player, pSim.hp) : null);
    // A whole fight: the draw cards draw known cards (knownDraws), which the line can play.
    const drawing = fullFight ? knownDraws(hand, piles, player, targets) : null;
    const played = drawing?.hand ?? hand;
    const potionsNow = fullFight ? sampledPotions(potions, input, seed, h, played, piles, player, targets, drawing?.known) : potions;
    const solved = solveTurn({ ...rest, ...focus, ...wither, ...scale, hand: [...played, ...potionsNow], player: pSim, enemies: sims, turn: (s.turn ?? 1) + h, cardsPlayedThisTurn: 0, maxNodes: policyNodes });
    budget.policyMs += budget.now() - started;
    budget.policyTurns += 1;
    budget.policyNodes += solved.nodes;
    const best = solved.plans[0];
    if (!best) break;
    records.push(applyPlan(h, best, [...played, ...potionsNow], handBase, player, enemies, piles, input, random, powers, fullFight, drawing?.known));
    turnTo(best);
    witherPlayed += cardPlays(best);
    timeUp(h);
    drink(best);
  }
  return records;
}

/**
 * The policy's weight knobs (turn-solver damageScale / hpScale) from the options: the whole-fight simulator's
 * (policyDamageScale, policyHpScale, policyThreat); none of them set (the rollout, the live planner): nothing.
 */
export function policyWeights(opts: RolloutOptions, player: Pick<PlayerSim, "hp">, enemies: Pick<EnemySim, "attacks" | "hp">[]): { damageScale?: number; hpScale?: number } {
  const out: { damageScale?: number; hpScale?: number } = {};
  if (opts.policyDamageScale !== undefined) out.damageScale = opts.policyDamageScale;
  const threat = opts.policyThreat ?? 0;
  if (opts.policyHpScale === undefined && threat === 0) return out;
  const incoming = enemies.reduce((sum, e) => sum + (e.hp > 0 ? e.attacks.reduce((s, a) => s + a.damage * a.hits, 0) : 0), 0);
  out.hpScale = (opts.policyHpScale ?? 1) * (1 + (threat * incoming) / Math.max(1, player.hp));
  return out;
}

/** Evenly spaced draws of an enemy's next move for the lookahead's expectation (nextAttacks). */
const LOOKAHEAD_DRAWS = 8;

/**
 * B5 (docs/boss-sim.md §14), whole fights only: each living enemy's expected attack on its next turn after the coming
 * one, the one-turn lookahead of the policy (RolloutOptions.policyLookahead). Its next move is drawn as its turn draws
 * it (fightNextMove: the move model's successors of its intent through the fight's scripts, on a copy), at
 * LOOKAHEAD_DRAWS evenly spaced points instead of its own random stream: the forecast a player reading the move model
 * makes (the live planner's nextIncoming), never the sample's own next move. The hit is at its Strength after the coming
 * move (Charge Up, Adapt, growth) and our Vulnerable then; its own Weak is left to the solver (the Weak still up after
 * the line); a Surrounded hit is its average over the facings (the facing then is not known yet).
 */
function nextAttacks(enemies: SimEnemy[], input: RolloutInput, playerVulnerable: boolean): { index: number; damage: number }[] {
  const out: { index: number; damage: number }[] = [];
  for (const e of enemies) {
    if (!e.alive || e.explodeAt !== undefined) continue;
    const table = input.tables[e.id];
    const now = e.move && table ? table.moves[e.move] : undefined;
    const strength = e.strength + (now?.strength ?? 0) + e.growth;
    let total = 0;
    for (let k = 0; k < LOOKAHEAD_DRAWS; k += 1) {
      const u = (k + 0.5) / LOOKAHEAD_DRAWS;
      const copy: SimEnemy = { ...e };
      const move = fightNextMove(copy, table, () => u, enemies);
      total += moveAttack({ ...copy, move, strength, weak: 0, shrink: 0 }, table, move, playerVulnerable, { fullFight: true, faced: false }).reduce((sum, a) => sum + a.damage * a.hits, 0);
    }
    out.push({ index: e.index, damage: total / LOOKAHEAD_DRAWS });
  }
  return out;
}

/**
 * A policy turn's one-turn lookahead (RolloutOptions.policyLookahead), whole fights only: the solver fields (the next
 * turn's forecast attack as nextIncoming, and nextHit when `lethal` is on) and the HP weight's factor from `threat`;
 * null without the option.
 */
function lookaheadOf(opts: RolloutOptions, enemies: SimEnemy[], input: RolloutInput, player: SimPlayer, hp: number): { fields: Pick<SolverInput, "nextIncoming" | "nextHit">; hpFactor: number } | null {
  const look = opts.policyLookahead;
  if (!look || (look.lethal === 0 && look.threat === 0)) return null;
  const attacks = nextAttacks(enemies, input, player.vulnTurns > 1);
  const next = attacks.reduce((sum, a) => sum + a.damage, 0);
  return {
    fields: { ...(next > 0 ? { nextIncoming: next } : {}), ...(look.lethal > 0 ? { nextHit: { attacks, handBlock: ERUPTION_NEXT_BLOCK, weight: look.lethal } } : {}) },
    hpFactor: 1 + (look.threat * next) / Math.max(1, hp),
  };
}

/** The solver input fields of a lookahead (lookaheadOf) over the policy's weights. */
function withLookahead(scale: { damageScale?: number; hpScale?: number }, ahead: ReturnType<typeof lookaheadOf>): Partial<SolverInput> {
  if (!ahead) return scale;
  return { ...scale, ...ahead.fields, ...(ahead.hpFactor !== 1 ? { hpScale: (scale.hpScale ?? 1) * ahead.hpFactor } : {}) };
}

/**
 * A whole fight's per-enemy state at the decision (simulate's fullFight): Asleep, phase, the growing move's hits, the
 * Knowledge Demon's curses used (B4: one per curse we hold; a Disintegration taken twice counts once).
 */
function fullFightState(info: RolloutEnemy | undefined, e: EnemySim, input: RolloutInput): Pick<SimEnemy, "asleep" | "phase" | "extraHits" | "curses"> {
  const id = info?.id ?? e.name;
  const phases = PHASE_MOVES[id];
  const asleep = info?.powers?.["ASLEEP_POWER"] ?? e.asleep ?? 0;
  // Multi Claw shown now: its hits over the move's base are the uses before this one.
  const table = input.tables[id];
  const growing = GROWING_HITS[id];
  const shownHits = growing && info?.move === growing ? Math.max(0, ...e.attacks.map((a) => a.hits)) : 0;
  const baseHits = growing ? table?.moves[growing]?.hits ?? 0 : 0;
  return {
    ...(asleep > 0 ? { asleep } : {}),
    ...(phases ? { phase: Math.max(0, phases.length - 1 - laterPhaseHps(e.maxHp, input.meta.asc).length) } : {}),
    ...(growing ? { extraHits: Math.max(0, shownHits - baseHits) } : {}),
    ...(id === "KNOWLEDGE_DEMON" ? { curses: KNOWLEDGE_CURSE_POWERS.filter((power) => (input.playerPowers[power] ?? 0) > 0).length } : {}),
  };
}

/** The Knowledge Demon's curses (Curse of Knowledge puts one of them on us a use). */
const KNOWLEDGE_CURSE_POWERS = ["SLOTH_POWER", "MIND_ROT_POWER", "WASTE_AWAY_POWER", "DISINTEGRATION_POWER"];

/** A whole-fight sample (simulateFight): the per-turn records and the policy's work. */
export interface FightTrajectory {
  records: TurnRecord[];
  policyTurns: number;
  policyNodes: number;
}

/**
 * One sample of a whole fight (src/sim/boss-sim.ts): the given line as turn 1, then the policy (the solver with
 * options.policyNodes) turn after turn until the fight is won, lost, out of time, or `maxTurns` turns were played.
 * The rollout's own mechanics without its horizon, plus the whole-fight scripts (fightNextMove, PHASE_MOVES,
 * GROWING_HITS, Asleep turns, each enemy's own move stream; `scripts` false leaves them out). No time budget: a pure
 * function of the input, the line and the seed.
 */
export function simulateFight(input: RolloutInput, plan: Plan | null, maxTurns: number, seed: number, scripts = true, order: KillOrder | null = null): FightTrajectory {
  const budget: Budget = { now: () => 0, start: 0, budgetMs: Infinity, policyTurns: 0, policyMs: 0, policyNodes: 0 };
  // scripts = false: the rollout's simulation exactly, only without its horizon (the backtest's ablation). `order`: the
  // later turns aim at its first group alive (the rollout's kill orders), null: the solver's own targets.
  const records = simulate(input, plan, maxTurns, seed, budget, Infinity, order, { depth: 0 }, false, scripts) ?? [];
  return { records, policyTurns: budget.policyTurns, policyNodes: budget.policyNodes };
}

interface SampleValue {
  loss: number;
  win: number;
  turns: number;
  died: boolean;
  lossModel: number | null;
  winModel: number | null;
  /** The potions the sample drank up to the fight's end or the horizon, their cost in HP (potion-cost.ts). */
  cost: number;
  /** THIEF_COST: the loot this sample loses, in HP (RolloutInput.escapes.lootHp), and the tags it pays for. */
  loot: number;
  lost: string[];
}

/** The potion cost of the first `n` records of a sample (potion-cost.ts; 0 without drinks). */
function costOf(records: TurnRecord[], n: number): number {
  let cost = 0;
  for (let i = 0; i < Math.min(n, records.length); i += 1) cost += records[i]!.potionCost ?? 0;
  return cost;
}

/**
 * THIEF_COST: the loot a sample loses at its last record (RolloutInput.escapes.lootHp): each tag gone, or still open
 * when later turns were rolled out (`open`: a 1-turn estimate simulates no later turn, so only an escape this turn
 * counts), at its HP. A sample that dies pays nothing (valueAt).
 */
function lootOf(last: TurnRecord, lootHp: Record<string, number> | undefined, open: boolean): { loot: number; lost: string[] } {
  if (!lootHp) return { loot: 0, lost: [] };
  let loot = 0;
  const lost: string[] = [];
  for (const [tag, hp] of Object.entries(lootHp)) {
    const status = last.thieves?.[tag];
    if (status === "gone" || (open && status === "open")) {
      loot += hp;
      lost.push(tag);
    }
  }
  return { loot, lost };
}

/** Per carrier tag, the samples whose loot is back or gone at their last record (RolloutInput.escapes), or null without. */
function thiefCounts(lasts: TurnRecord[]): Record<string, { back: number; gone: number }> | null {
  if (!lasts.some((record) => record.thieves)) return null;
  const out: Record<string, { back: number; gone: number }> = {};
  for (const record of lasts) {
    for (const [tag, status] of Object.entries(record.thieves ?? {})) {
      const entry = (out[tag] ??= { back: 0, gone: 0 });
      if (status === "back") entry.back += 1;
      else if (status === "gone") entry.gone += 1;
    }
  }
  return out;
}

/** The living enemies' HP in a snapshot (a won fight: 0). */
function enemyHpOf(record: TurnRecord): number {
  if (record.won) return 0;
  if (record.hpLeft) return Object.values(record.hpLeft).reduce((sum, hp) => sum + hp, 0);
  return record.snap.E.reduce((sum, e) => sum + (e[5] ? Math.max(0, e[2]) : 0), 0);
}

/** The HP left of the enemies at `indices` (a leader) in a snapshot (a won fight: 0), counted as enemyHpOf does. */
function groupHpOf(record: TurnRecord, indices: number[]): number {
  if (record.won) return 0;
  return indices.reduce((sum, index) => {
    if (record.hpLeft) return sum + (record.hpLeft[index] ?? 0);
    const e = record.snap.E.find((x) => x[0] === index);
    return sum + (e && e[5] ? Math.max(0, e[2]) : 0);
  }, 0);
}

/**
 * An enemy's HP still to take off before it is gone for good (the "enemy HP left" that tells saturated lines
 * apart): a phase boss's later phases too (a line finishing Test Subject's phase 1 read worse than one leaving
 * it at 50, the next phase's 212 counted only once there: 7XK6DUJYMYY3 F48 T1-T3, 0-18 damage lines best), an
 * Axebot's stock at its max HP, an illusion always at its max HP (it revives at full: damage into it is
 * wasted, 115b517), a dead segment that will reattach at its Reattach HP, a spawner's spawns (Phrog Parasite).
 * A Giant husk is no HP to take off (its blast is survived, not dealt with).
 */
function remainingHp(e: SimEnemy, input: RolloutInput): number {
  if (e.explodeAt !== undefined) return 0;
  if (e.base.illusion) return e.maxHp;
  if (!e.alive) return e.reattachIn !== undefined ? Math.min(e.maxHp, e.base.reattachHp || REATTACH_HP) : 0;
  const phases = e.base.revives ? (e.phasesLeft ?? laterPhaseHps(e.maxHp, input.meta.asc)).reduce((sum, hp) => sum + hp, 0) : 0;
  const stock = Math.max(0, e.base.stock ?? 0) * e.maxHp;
  const spawns = e.base.spawnsOnDeath ? (input.spawns?.[e.id] ?? []).reduce((sum, spawn) => sum + spawn.hp * spawn.count, 0) : 0;
  return Math.max(0, e.hp) + phases + stock + spawns;
}

/**
 * A sample's value at horizon h (h <= records simulated): losses before it, own loss on turn h-1, terminal after.
 * `lossCap`: the most a sample can lose, our HP plus the revives held (their HP counts as lost when spent).
 * `cost`: the potions drunk on the way, apart (the loss stays HP: capped at lossCap, shown as HP); 0 in a sample that
 * dies (a potion is HP paid later, and there is no later).
 */
function valueAt(records: TurnRecord[], h: number, ctx: TerminalContext, t0: number, lossCap: number, lootHp?: Record<string, number>): SampleValue & { n: number } {
  let loss = 0;
  const upto = Math.min(h, records.length);
  for (let i = 0; i < upto; i += 1) {
    const r = records[i]!;
    // A sample that dies pays nothing for its potions (nor its loot): there is no later for them (the run is over).
    if (r.died) return { loss: lossCap, win: 0, turns: i + 1, died: true, lossModel: lossCap, winModel: 0, n: 0, cost: 0, loot: 0, lost: [] };
    if (r.won) {
      loss += r.loss;
      return { loss, win: 1, turns: i + 1, died: false, lossModel: loss, winModel: 1, n: 0, cost: costOf(records, i + 1), ...lootOf(r, lootHp, h > 1) };
    }
    // Out of time (Battleworn Dummy): the fight is over, not won, and costs nothing more.
    if (r.timeUp) {
      loss += r.loss;
      return { loss, win: 0, turns: i + 1, died: false, lossModel: loss, winModel: 0, n: 0, cost: costOf(records, i + 1), ...lootOf(r, lootHp, h > 1) };
    }
    if (i < upto - 1) loss += r.loss;
  }
  const last = records[upto - 1]!;
  const own = last.loss - last.enemyPart;
  const term = terminal(ctx, last.snap, t0 + upto - 1);
  const base = loss + Math.max(0, own);
  return {
    // No line loses more than the HP we have (GG0Y F33: 144.9 "further loss" at 59 HP), revives included.
    loss: Math.min(lossCap, base + term.gated.hpLoss),
    win: term.gated.winProb,
    turns: upto + term.gated.turns,
    died: false,
    lossModel: term.model ? Math.min(lossCap, base + term.model.hpLoss) : null,
    winModel: term.model ? term.model.winProb : null,
    n: term.n,
    cost: costOf(records, upto),
    ...lootOf(last, lootHp, h > 1),
  };
}

// ---------------------------------------------------------------- kill orders

/** One position of a kill order: the living enemies of one id (identical enemies are not ordered among themselves). */
export interface KillGroup {
  id: string;
  name: string;
  /** Enemy indices of the group's living members. */
  indices: number[];
  /** Their HP together. */
  hp: number;
  /** An illusion (Parafright): back at full HP next turn when killed, so never "dead" for an order. */
  illusion?: boolean;
  /** Its death ends the fight: every other group is minions (MINION_POWER), which leave with it. */
  leader?: boolean;
}

/** An order to kill the enemy groups in: the later turns' policy targets the first group with a member alive. */
export interface KillOrder {
  /** Enemy ids joined by ">". */
  key: string;
  /** Names joined by " > " ("Louse x3" for a group). */
  label: string;
  groups: number[][];
  /** The first group is an illusion: it revives, so no "first target dead" count is kept for it. */
  firstRevives?: boolean;
  /** The group whose death ends the fight (KillGroup.leader), the same in every order of a board. */
  leader?: { indices: number[]; name: string };
}

/** Every permutation is compared up to this many groups (3! = 6 orders); past it, each group first. */
export const MAX_FULL_ORDER_GROUPS = 3;

/**
 * The kill orders a line is rolled out under. A line that aims at an illusion (Parafright) and puts no damage
 * into any other enemy is rolled out with that illusion first: the later turns do what this turn does. Its best
 * order was "summoner first" (the illusion's hit saved now, the summoner's progress after), so it read as the
 * best line turn after turn while that "after" never came (ZY3992X5VEVS F23 T3-T5: the Parafright-kill lines
 * were the rollout's best, The Obscura took 0 three turns running; the illusion-first rollout is what doing it
 * again each turn costs). Any other line: every order.
 */
export function illusionFocusOrders(plan: Plan, orders: (KillOrder | null)[], enemies: EnemySim[]): (KillOrder | null)[] {
  const targets = plan.steps.filter((step) => step.target !== null).map((step) => step.target!);
  if (targets.length === 0) return orders;
  const own = orders.filter((order): order is KillOrder => order !== null && order.firstRevives === true && targets.every((target) => order.groups[0]!.includes(target)));
  if (own.length === 0) return orders;
  const focus = own[0]!.groups[0]!;
  const after = new Map(plan.outcome.enemyHpAfter.map((enemy) => [enemy.index, enemy.hp]));
  const elsewhere = enemies.some((enemy) => !focus.includes(enemy.index) && enemy.hp > 0 && (after.get(enemy.index) ?? enemy.hp) < enemy.hp);
  return elsewhere ? orders : own;
}
/**
 * The kill-order policy's extra damage weight on its target (turn-solver focusWeight). On 60 recorded
 * multi-enemy boards (158 option lines, 5 turns x 8 samples) the order's first target was dead by T5 in
 * 79.7% / 81.1% / 81.9% of samples at 0.5 (the fight plan's FOCUS_BONUS) / 1.5 / 3, the spread of further HP
 * loss between a line's orders 0.9 / 1.6 / 2.5, deaths 18.7% / 19.5% / 20.2%: 1.5 makes the orders differ
 * without the policy giving up its block.
 */
export const ORDER_FOCUS_BONUS = 1.5;

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  return items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}

function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

/**
 * The kill orders to compare: every permutation of the groups up to `maxFull` groups; past it, each group
 * first and the rest by HP (lowest first), `dropped` saying how many permutations were left out. Fewer than
 * two groups: no orders.
 */
export function killOrders(groups: KillGroup[], maxFull = MAX_FULL_ORDER_GROUPS): { orders: KillOrder[]; dropped: number } {
  if (groups.length < 2) return { orders: [], dropped: 0 };
  const nameOf = (group: KillGroup) => (group.indices.length > 1 ? `${group.name} x${group.indices.length}` : group.name);
  const leader = groups.find((group) => group.leader);
  const make = (seq: KillGroup[]): KillOrder => ({
    key: seq.map((group) => group.id).join(">"),
    label: seq.map(nameOf).join(" > "),
    groups: seq.map((group) => group.indices.slice()),
    ...(seq[0]?.illusion ? { firstRevives: true } : {}),
    ...(leader ? { leader: { indices: leader.indices.slice(), name: nameOf(leader) } } : {}),
  });
  if (groups.length <= maxFull) return { orders: permutations(groups).map(make), dropped: 0 };
  const byHp = [...groups].sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id));
  const orders = byHp.map((first) => make([first, ...byHp.filter((group) => group !== first)]));
  return { orders, dropped: factorial(groups.length) - orders.length };
}

/**
 * The enemy a kill order hits this turn: the lowest-HP living member of its first group with one, else none;
 * `depth` is how many of the order's groups were looked at to find it.
 */
function orderTarget(order: KillOrder, enemies: SimEnemy[]): { target: number | undefined; depth: number } {
  for (let i = 0; i < order.groups.length; i += 1) {
    const group = order.groups[i]!;
    const living = enemies.filter((e) => group.includes(e.index) && e.alive && e.hp > 0 && e.explodeAt === undefined);
    if (living.length > 0) return { target: living.reduce((a, b) => (b.hp < a.hp || (b.hp === a.hp && b.index < a.index) ? b : a)).index, depth: i + 1 };
  }
  return { target: undefined, depth: order.groups.length };
}

/** Two orders agree on their first `depth` groups. */
/** Leader HP left at the horizon within this much of the lowest counts as the same progress (then value decides). */
export const LEADER_HP_TIE = 5;

/**
 * A line's kill orders, best first. By value (ties: the orders' own order), except under the leader rule:
 * every order has a leader whose death ends the fight and none ended the fight in any sample within the
 * horizon. Then fight-ending progress goes first: the least expected leader HP left (within LEADER_HP_TIE
 * of the lowest), then value. Without it, a leader too big to kill in the horizon never counts: HP lost and
 * deaths within the horizon alone rank its minions first (The Kin, 2CCM6XK4PB37 F17: 6 of 7 best orders
 * "Followers x2 > Priest", the Priest at 156 of 199 when we died on T10). Deaths are not a separate key:
 * a minions-first order that survives the horizon with the leader untouched has only moved the death later
 * (the replayed Kin board: Priest first dies within 5 turns in 2-8/8 samples, Followers first in fewer, and
 * the Priest is left at ~150-175 instead of ~50-120); they stay in the value, and every order's deaths are
 * shown beside it.
 */
export function rankOrders<T extends { value: number; wins: number; leader: { hpLeft: number } | null }>(entries: T[]): { ranked: T[]; byLeader: boolean } {
  const indexed = entries.map((entry, k) => ({ entry, k }));
  const byLeader = entries.length >= 2 && entries.every((entry) => entry.leader !== null && entry.wins === 0);
  if (!byLeader) return { ranked: indexed.sort((a, b) => b.entry.value - a.entry.value || a.k - b.k).map(({ entry }) => entry), byLeader };
  const leastLeft = Math.min(...entries.map((entry) => entry.leader!.hpLeft));
  const key = (entry: T) => [entry.leader!.hpLeft > leastLeft + LEADER_HP_TIE ? 1 : 0, -entry.value];
  const ranked = indexed
    .sort((a, b) => {
      const ka = key(a.entry);
      const kb = key(b.entry);
      for (let i = 0; i < ka.length; i += 1) if (ka[i] !== kb[i]) return ka[i]! - kb[i]!;
      return a.k - b.k;
    })
    .map(({ entry }) => entry);
  return { ranked, byLeader };
}

function samePrefix(a: KillOrder, b: KillOrder, depth: number): boolean {
  for (let i = 0; i < depth; i += 1) if ((a.groups[i] ?? []).join(",") !== (b.groups[i] ?? []).join(",")) return false;
  return true;
}

const SCHEDULE: { horizon: number; samples: number }[] = [
  { horizon: 5, samples: 8 },
  { horizon: 3, samples: 8 },
  { horizon: 3, samples: 4 },
  { horizon: 3, samples: 2 },
];
/** The horizon the first wave drops to when it cannot finish at the full one in the time left. */
const SHORT_HORIZON = 3;
/** With kill orders, samples go before the horizon: an order only shows once its first target is dead. */
const ORDER_SCHEDULE: { horizon: number; samples: number }[] = [
  { horizon: 5, samples: 8 },
  { horizon: 5, samples: 6 },
  { horizon: 5, samples: 4 },
  { horizon: 3, samples: 4 },
  { horizon: 3, samples: 2 },
];

/** Evaluate a decision's candidate lines: (i) current score, (ii) the line + gated terminal, (iii) the rollout. */
export function rolloutDecision(input: RolloutInput): RolloutResult {
  const opts = input.options ?? {};
  const now = opts.now ?? (() => performance.now());
  const budget: Budget = { now, start: now(), budgetMs: opts.budgetMs ?? 1500, policyTurns: 0, policyMs: 0, policyNodes: 0 };
  const maxHorizon = opts.horizon ?? 5;
  const maxSamples = opts.samples ?? 8;
  const seed = opts.seed ?? 1;
  const candidates = selectCandidates(input.plans, opts.k ?? 6, opts.include ?? []);
  // The "no potion this fight" line: its own candidate (a copy of a shown line), with no potion in its later turns.
  const noPotionLine = opts.noPotionLine && !opts.noPotionLine.steps.some(isPotion) ? opts.noPotionLine : undefined;
  if (noPotionLine) {
    const at = candidates.findIndex((entry) => entry.plan === noPotionLine);
    if (at >= 0) candidates[at] = { plan: noPotionLine, tags: [...new Set([...candidates[at]!.tags, "offered", "no-potion"])] };
    else candidates.push({ plan: noPotionLine, tags: ["offered", "no-potion"] });
  }
  // The board's leader (its death ends the fight; the same in every kill order of the board), if any.
  const boardLeader = (opts.orders ?? []).find((order) => order.leader)?.leader?.indices ?? null;
  const gate = gateFor(input.gates, input.meta.enc, input.meta.act, input.meta.kind);
  const ctx: TerminalContext = { meta: input.meta, mm: input.mm, model: input.model, gates: input.gates, w: gate.w };
  const ctxModel: TerminalContext = { ...ctx, w: 1 };
  const t0 = input.meta.t;
  const startHp = input.solver.player.hp;
  // What a sample can lose at most: our HP, and the HP of the revives held (counted as lost when spent).
  const lossCap = startHp + (input.solver.player.revives ?? []).reduce((sum, revive) => sum + revive.hp, 0);
  const hpWeight = solverHpWeight(startHp, input.solver.player.maxHp);
  const degraded: string[] = [];
  // THIEF_COST: the HP of each thief's loot (absent: no loot cost, the value as before).
  const lootHp = input.escapes?.lootHp && Object.keys(input.escapes.lootHp).length > 0 ? input.escapes.lootHp : undefined;
  /** Per tag, the samples paying for it (THIEF_COST). */
  const lostCounts = (vals: { lost: string[] }[]): Record<string, number> => {
    const out: Record<string, number> = Object.fromEntries(Object.keys(lootHp ?? {}).map((tag) => [tag, 0]));
    for (const v of vals) for (const tag of v.lost) out[tag] = (out[tag] ?? 0) + 1;
    return out;
  };

  // (ii) one turn: the line's own outcome + terminal of its end-of-turn state (no simulation of later turns).
  const one = candidates.map(({ plan }) => {
    const records = simulate(input, plan, 1, seed, budget)!;
    const v = valueAt(records, 1, ctx, t0, lossCap, lootHp);
    const vm = valueAt(records, 1, ctxModel, t0, lossCap, lootHp);
    // The drink's cost: in the solver's score already (current), taken off the model's value here; the loot's too
    // (THIEF_COST: not in the solver's score, so off the model's value only).
    const modelValue = vm.lossModel === null ? null : -vm.lossModel - v.cost - v.loot - DEATH_HP * (1 - (vm.winModel ?? 0));
    const current = plan.score / hpWeight;
    return {
      cost: v.cost,
      loot: v.loot,
      lost: v.lost,
      hpLoss: v.loss,
      winProb: v.win,
      turns: v.turns,
      modelValue,
      value: modelValue === null ? current : blend(gate.w, modelValue, current),
      n: v.n,
      lossModel: vm.lossModel,
      winModel: vm.winModel,
      enemyHpLeft: enemyHpOf(records[0]!),
      leaderHpLeft: boardLeader ? groupHpOf(records[0]!, boardLeader) : null,
      survived: v.died ? v.turns : 1,
      thieves: thiefCounts([records[0]!]),
    };
  });

  // (iii) rollout, sample by sample across all lines (common random numbers per sample index), and with
  // kill orders across every (line, order) pair: the same draws and enemy moves for every order.
  const orders: (KillOrder | null)[] = opts.orders && opts.orders.length >= 2 ? opts.orders : [null];
  // Orders are compared for the lines shown (tagged "offered"); the other candidates, there only to find a
  // better line to add, keep the solver's own later turns. A line that aims only at an illusion this turn
  // keeps aiming at it (illusionFocusOrders).
  const units = candidates.flatMap(({ plan, tags }, line) =>
    (orders.length > 1 && !tags.includes("offered") ? [null] : illusionFocusOrders(plan, orders, input.solver.enemies)).map((order) => ({ line, plan, order, noPotions: plan === noPotionLine })),
  );
  const trajectories: TurnRecord[][][] = units.map(() => []);
  // One sample of one (line, order): an order agreeing with an order already run on every group that run
  // looked at gets the same trajectory (same line, seed and horizon; the policy is deterministic), e.g.
  // A > B > C and A > C > B while A lives through the horizon.
  const shared = new Map<string, { order: KillOrder; depth: number; records: TurnRecord[] }[]>();
  const run = (unit: { line: number; plan: Plan; order: KillOrder | null; noPotions: boolean }, h: number, j: number): TurnRecord[] | null => {
    const key = `${unit.line}:${h}:${j}`;
    const done = unit.order ? (shared.get(key) ?? []) : [];
    const hit = unit.order ? done.find((entry) => samePrefix(entry.order, unit.order!, entry.depth)) : undefined;
    if (hit) return hit.records;
    const used = { depth: 0 };
    const records = simulate(input, unit.plan, h, seed * 7919 + 1 + j, budget, budget.budgetMs, unit.order, used, unit.noPotions);
    if (unit.order && records) shared.set(key, [...done, { order: unit.order, depth: used.depth, records }]);
    return records;
  };
  let horizon = maxHorizon;
  let samples = maxSamples;
  const elapsed = () => now() - budget.start;
  if (maxHorizon > 1) {
    const turnsBefore = budget.policyTurns;
    const t = now();
    // First wave at the full horizon, timing the policy. Past the budget it is abandoned: 1 turn for all.
    // Shrunk on demand: when the first unit's time says the wave cannot finish at the full horizon in the time
    // left, the rest of it (and the samples after) run at SHORT_HORIZON turns, so the lines still get a rollout
    // instead of the 1-turn fallback (ZGZ0EQDDNJPT boss T1/T3: 16 and 10 lines x 2 kill orders after a 400 ms
    // random-potion sample, both fell back; 3 of the fight's 5 questions).
    let firstHorizon = maxHorizon;
    const first: (TurnRecord[] | null)[] = [];
    for (const unit of units) {
      const records = run(unit, firstHorizon, 0);
      first.push(records);
      // The first unit's time says the rest would not finish at this horizon in the time left (one clock reading).
      const rest = units.length - first.length;
      if (first.length === 1 && records !== null && rest > 0 && firstHorizon > SHORT_HORIZON) {
        const at = now();
        if ((at - t) * rest > budget.budgetMs - (at - budget.start)) firstHorizon = SHORT_HORIZON;
      }
    }
    if (firstHorizon < maxHorizon) degraded.push(`first wave at ${firstHorizon} turns`);
    const waveMs = now() - t;
    const perTurn = waveMs / Math.max(1, budget.policyTurns - turnsBefore);
    const left = budget.budgetMs - elapsed();
    // With kill orders, a sample shared by orders that agree as far as it went is simulated once: the first
    // wave's own time is the measure of a wave.
    const cost = (h: number, m: number) => (orders.length > 1 ? (waveMs * (h - 1)) / Math.max(1, firstHorizon - 1) : perTurn * units.length * (h - 1)) * (m - 1);
    // The schedule at the asked sizes: each step clamped to maxHorizon x maxSamples (asking for fewer than 8
    // samples, or fewer than 3 turns, used to drop every step above it: 6 samples ran at 3 turns, 2 turns at 1);
    // after a shrunk first wave, no step longer than it (plus its one sample, which always fits).
    // SL_RETRY_COMPUTE asks for more samples than the schedule's top step: steps at the full horizon with those samples
    // (and 2/3, 1/2 of them) come first, then the schedule as before (unchanged at 8 samples or fewer).
    const base = orders.length > 1 ? ORDER_SCHEDULE : SCHEDULE;
    const topSamples = base[0]!.samples;
    const more = maxSamples > topSamples ? [...new Set([maxSamples, Math.round((maxSamples * 2) / 3), Math.round(maxSamples / 2)])].filter((m) => m > topSamples).map((m) => ({ horizon: maxHorizon, samples: m })) : [];
    const schedule = [...more, ...base]
      .map((s) => ({ horizon: Math.min(s.horizon, firstHorizon), samples: Math.min(s.samples, maxSamples) }))
      .concat(firstHorizon < maxHorizon ? [{ horizon: firstHorizon, samples: 1 }] : [])
      .filter((s, i, all) => all.findIndex((t) => t.horizon === s.horizon && t.samples === s.samples) === i);
    const fit = schedule.find((s) => cost(s.horizon, s.samples) <= left);
    if (first.some((r) => r === null)) {
      horizon = 1;
      samples = 1;
      degraded.push("1-turn");
    } else if (elapsed() > budget.budgetMs || !fit) {
      // The first wave finished, just past the budget: its one sample per line is kept (it was thrown away for
      // the 1-turn fallback), no more waves.
      first.forEach((records, i) => trajectories[i]!.push(records!));
      horizon = firstHorizon;
      samples = 1;
      if (firstHorizon < maxHorizon) degraded.push(`horizon ${firstHorizon}`);
      degraded.push("samples 1 (clock)");
    } else {
      first.forEach((records, i) => trajectories[i]!.push(records!));
      if (fit.horizon < maxHorizon) degraded.push(`horizon ${fit.horizon}`);
      if (fit.samples < maxSamples) degraded.push(orders.length > 1 ? `samples ${fit.samples} per kill order` : `samples ${fit.samples}`);
      horizon = fit.horizon;
      samples = fit.samples;
      for (let j = 1; j < samples; j += 1) {
        const wave = units.map((unit) => run(unit, horizon, j));
        // A wave cut by the deadline is dropped: every line keeps the same number of complete samples.
        if (wave.some((r) => r === null)) {
          samples = j;
          degraded.push(`samples ${samples} (clock)`);
          break;
        }
        wave.forEach((records, i) => trajectories[i]!.push(records!));
      }
    }
  } else {
    horizon = 1;
    samples = 1;
  }

  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
  /** The rollout numbers of one (line, order) pair's samples. */
  const estimate = (runs: TurnRecord[][], order: KillOrder | null) => {
    const kept = runs.slice(0, samples);
    const first = order?.groups[0] ?? [];
    // An enemy that left (RolloutInput.escapes) is not dead: the order's first group gone is no kill.
    const firstDown = order?.firstRevives
      ? null
      : kept.filter((records) => {
          const last = records[Math.min(horizon, records.length) - 1]!;
          const gone = new Set(last.gone ?? []);
          if (first.some((index) => gone.has(index))) return false;
          return last.won || first.every((index) => last.snap.E.every((e) => e[0] !== index || !e[5]));
        }).length;
    const wins = kept.filter((records) => records.slice(0, horizon).some((r) => r.won)).length;
    const timeUps = kept.filter((records) => records.slice(0, horizon).some((r) => r.timeUp)).length;
    const revived = kept.filter((records) => records.slice(0, horizon).some((r) => (r.revived ?? 0) > 0)).length;
    const leaderIndices = order?.leader?.indices;
    const leaderLeft = leaderIndices ? kept.map((records) => groupHpOf(records[Math.min(horizon, records.length) - 1]!, leaderIndices)) : null;
    const leader = leaderLeft ? { hpLeft: mean(leaderLeft), dead: leaderLeft.filter((hp) => hp <= 0).length } : null;
    // The board's leader, for every line (one rolled out with the solver's own later turns has no order).
    const leaderHpLeft = boardLeader ? mean(kept.map((records) => groupHpOf(records[Math.min(horizon, records.length) - 1]!, boardLeader))) : null;
    const vals = kept.map((records) => valueAt(records, horizon, ctx, t0, lossCap, lootHp));
    const valsM = kept.map((records) => valueAt(records, horizon, ctxModel, t0, lossCap, lootHp));
    const loss = mean(vals.map((v) => v.loss));
    const win = mean(vals.map((v) => v.win));
    // A dying sample's turn count is when we die, not when we win (69HW F33: "turns to win ~2" at 0/8).
    const alive = vals.filter((v) => !v.died);
    const dead = vals.filter((v) => v.died);
    const enemyHpLeft = mean(kept.map((records) => enemyHpOf(records[Math.min(horizon, records.length) - 1]!)));
    const turnsSurvived = mean(vals.map((v) => (v.died ? v.turns : horizon)));
    const model = valsM.every((v) => v.lossModel !== null) ? { hpLoss: mean(valsM.map((v) => v.lossModel!)), winProb: mean(valsM.map((v) => v.winModel!)) } : null;
    // The potions drunk (this turn and later, up to the fight's end or the horizon), at their cost: off the value.
    const cost = mean(vals.map((v) => v.cost));
    // THIEF_COST: the loot lost, off the value like the potions' cost (0 without lootHp).
    const loot = lootHp ? mean(vals.map((v) => v.loot)) : 0;
    const laterDrinks: Record<string, number> = {};
    for (const records of kept) {
      const ids = new Set(records.slice(1, horizon).flatMap((record) => record.drunk ?? []));
      for (const id of ids) laterDrinks[id] = (laterDrinks[id] ?? 0) + 1;
    }
    const thieves = thiefCounts(kept.map((records) => records[Math.min(horizon, records.length) - 1]!));
    return {
      potionCost: cost,
      laterDrinks,
      ...(thieves ? { thieves } : {}),
      ...(lootHp ? { thiefCost: loot, thiefLost: lostCounts(vals) } : {}),
      hpLoss: loss,
      turnsToWin: alive.length > 0 ? mean(alive.map((v) => v.turns)) : null,
      deaths: dead.length,
      turnsToDeath: dead.length > 0 ? mean(dead.map((v) => v.turns)) : null,
      winProb: win,
      wins,
      timeUps,
      value: -loss - cost - loot - DEATH_HP * (1 - win),
      valueModelTerminal: model === null ? null : -model.hpLoss - cost - loot - DEATH_HP * (1 - model.winProb),
      modelForecast: model,
      perTurn: turnSpreads(kept, horizon),
      firstDown,
      leader,
      enemyHpLeft,
      turnsSurvived,
      revived,
      leaderHpLeft,
    };
  };

  const lines: LineEstimate[] = candidates.map(({ plan, tags }, i) => {
    const current = plan.score / hpWeight;
    const o = one[i]!;
    const basis = { rolloutSamples: horizon > 1 ? samples : 0, horizon, modelN: o.n, w: gate.w, segment: gate.segment, gateN: gate.n };
    const common = {
      plan,
      tags,
      ...(plan === noPotionLine ? { noPotionFight: true } : {}),
      score: plan.score,
      currentValue: current,
      oneTurn: { hpLoss: o.hpLoss, winProb: o.winProb, turns: o.turns, modelValue: o.modelValue, value: o.value },
      horizon,
      samples,
      basis,
    };
    if (horizon <= 1) {
      const wins = plan.outcome.winsFight ? 1 : 0;
      return {
        ...common,
        ...(plan.outcome.revived ? { revived: 1 } : {}),
        order: null,
        orders: [],
        ...(o.thieves ? { thieves: o.thieves } : {}),
        ...(lootHp ? { thiefCost: o.loot, thiefLost: lostCounts([o]) } : {}),
        hpLoss: o.hpLoss,
        potionCost: o.cost,
        laterDrinks: {},
        enemyHpLeft: o.enemyHpLeft,
        leaderHpLeft: o.leaderHpLeft,
        turnsSurvived: o.survived,
        turnsToWin: o.turns,
        deaths: 0,
        turnsToDeath: null,
        winProb: o.winProb,
        wins,
        value: -o.hpLoss - o.cost - o.loot - DEATH_HP * (1 - o.winProb),
        valueModelTerminal: o.lossModel === null ? null : -o.lossModel - o.cost - o.loot - DEATH_HP * (1 - (o.winModel ?? 0)),
        modelForecast: { oneTurn: o.lossModel === null ? null : { hpLoss: o.lossModel, winProb: o.winModel ?? 0 }, rollout: o.lossModel === null ? null : { hpLoss: o.lossModel, winProb: o.winModel ?? 0 } },
        perTurn: [],
      };
    }
    // Every order of the line, best first (rankOrders; ties keep the orders' own order: deterministic).
    const { ranked: byOrder, byLeader } = rankOrders(
      units
        .map((unit, u) => ({ unit, u }))
        .filter(({ unit }) => unit.line === i)
        .map(({ unit, u }) => ({ order: unit.order, ...estimate(trajectories[u]!, unit.order) })),
    );
    const best = byOrder[0]!;
    return {
      ...common,
      order: best.order,
      orders: byOrder.filter((entry): entry is typeof entry & { order: KillOrder } => entry.order !== null),
      ...(byLeader ? { ordersByLeader: true } : {}),
      hpLoss: best.hpLoss,
      potionCost: best.potionCost,
      laterDrinks: best.laterDrinks,
      ...(best.thieves ? { thieves: best.thieves } : {}),
      ...(best.thiefCost !== undefined ? { thiefCost: best.thiefCost, thiefLost: best.thiefLost } : {}),
      enemyHpLeft: best.enemyHpLeft,
      leaderHpLeft: best.leaderHpLeft,
      turnsSurvived: best.turnsSurvived,
      turnsToWin: best.turnsToWin,
      deaths: best.deaths,
      turnsToDeath: best.turnsToDeath,
      winProb: best.winProb,
      wins: best.wins,
      ...(best.timeUps > 0 ? { timeUps: best.timeUps } : {}),
      ...(best.revived > 0 ? { revived: best.revived } : {}),
      value: best.value,
      valueModelTerminal: best.valueModelTerminal,
      modelForecast: { oneTurn: o.lossModel === null ? null : { hpLoss: o.lossModel, winProb: o.winModel ?? 0 }, rollout: best.modelForecast },
      perTurn: best.perTurn,
    };
  });
  return { lines, orders: orders.filter((order): order is KillOrder => order !== null), horizon, samples, elapsedMs: elapsed(), degraded, policyTurns: budget.policyTurns, policyMs: budget.policyMs, policyNodes: budget.policyNodes };
}

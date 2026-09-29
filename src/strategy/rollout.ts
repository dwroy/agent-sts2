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
 *          potions still held are in its hand like 0-cost cards that exist once (Dai 2026-09-28: no special
 *          potion logic): drunk when its best line drinks one, gone for the rest of that sample.
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
 * Values are on one HP-equivalent scale: -(expected HP lost from now to the fight's end) - DEATH_HP x
 * (1 - win probability). The current solver score is put on it as score / its HP weight.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { TEMP_STRENGTH_LOSS_POWERS } from "../knowledge/move-model.js";
import type { CardModel } from "./card-model.js";
import { laterPhaseHps } from "./boss-clock.js";
import { valueOf, type FightValueModel } from "./fight-value.js";
import { CLARITY_LATER_DRAWS, DEX_POTION, mantleHpCost, RADIANCE_LATER_ENERGY, SHRINK_DAMAGE_FACTOR, solveTurn, turnsLeftOf, type EnemySim, type Plan, type PlayerSim, type Revive, type SolverInput } from "./turn-solver.js";

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
  piles: { draw: CardModel[]; discard: CardModel[]; handBase: (CardModel | null)[] };
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
   * What an enemy spawns when it dies, by its id (monster-db ON_DEATH_SPAWNS: the Phrog Parasite's 4 Wrigglers,
   * the Gremlin Merc's two gremlins): each spawn's id, name, HP and first move. Their move tables are in `tables`.
   */
  spawns?: Record<string, SpawnTemplate[]>;
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
  /** Samples that spent a revive (Fairy in a Bottle, Lizard Tail) within the horizon; absent when none. */
  revived?: number;
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
type LastingPower = "demonForm" | "endTurnBlock" | "juggernaut" | "keepsBlock" | "inferno" | "mantle" | "rupture" | "pyre" | "unmovable";

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
};

/** HP lost at the start of our next turn (Crimson Mantle's per copy, Inferno's 1, anything else already up). */
function startTurnHpLossOf(player: SimPlayer): number {
  return player.otherStartLoss + mantleHpCost(player.mantle) + (player.inferno > 0 ? 1 : 0);
}

/** HP-loss events at the start of our turn: each one triggers Inferno and Rupture. */
function startLossEvents(player: SimPlayer): number {
  return (player.inferno > 0 ? 1 : 0) + (player.mantle > 0 ? 1 : 0);
}

/** Damage to every enemy at the start of our next turn (combat-plan turnStartAoe): relics plus Inferno per loss event. */
function turnStartAoeOf(player: SimPlayer): number {
  return player.relicAoe + player.inferno * startLossEvents(player);
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
  powers: Record<string, number>;
  base: EnemySim;
  /** Fallback attack when the move model does not know the enemy: the intents shown at the decision. */
  shown: { damage: number; hits: number }[];
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
  /** Unmovable: the first card Block each turn is doubled. */
  unmovable: boolean;
  /** Start-of-turn damage to every enemy from relics (Mercury Hourglass): turnStartAoe without Inferno. */
  relicAoe: number;
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
}

function moveAttack(enemy: SimEnemy, table: EnemyTable | undefined, move: string | null, playerVulnerable: boolean): { damage: number; hits: number }[] {
  const m = move && table ? table.moves[move] : undefined;
  const scale = (enemy.weak > 0 ? 0.75 : 1) * (enemy.shrink > 0 ? SHRINK_DAMAGE_FACTOR : 1) * (playerVulnerable ? 1.5 : 1);
  if (!m) return enemy.shown.map((a) => ({ damage: Math.floor(a.damage * scale), hits: a.hits }));
  if (m.damage <= 0) return [];
  if (m.shown) return [{ damage: Math.max(0, Math.floor((m.damage + enemy.vigor) * (enemy.weak > 0 ? 0.75 : 1) * (enemy.shrink > 0 ? SHRINK_DAMAGE_FACTOR : 1))), hits: Math.max(1, m.hits) }];
  return [{ damage: Math.max(0, Math.floor((m.damage + enemy.strength + enemy.vigor) * scale)), hits: Math.max(1, m.hits) }];
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

function nextMove(table: EnemyTable | undefined, move: string | null, random: () => number): string | null {
  if (!table || !move) return move;
  const successors = table.next[move];
  if (!successors) return move;
  const entries = Object.entries(successors);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  let r = random() * total;
  for (const [m, n] of entries) {
    r -= n;
    if (r < 0) return m;
  }
  return entries[entries.length - 1]![0];
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
function enemyDown(e: SimEnemy, turn: number, input: RolloutInput, enemies: SimEnemy[]): void {
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
  } else {
    e.alive = false;
    // An on-death spawn (Phrog Parasite, Gremlin Merc): its spawns join the fight (the rollout called the
    // Phrog's death a win: "over within 5 turns" 0.95 vs 0.47 in the logs, 4LC3YKCZV218 F9 T3 forecast 0,
    // actual 23).
    const spawns = e.base.spawnsOnDeath ? input.spawns?.[e.id] ?? [] : [];
    let next = Math.max(...enemies.map((x) => x.index)) + 1;
    for (const template of spawns) for (let k = 0; k < template.count; k += 1) enemies.push(spawnedEnemy(template, next++));
  }
}

/**
 * The start of our next turn: Crimson Mantle's block, Rupture's Strength per HP-loss event, and the
 * start-of-turn AoE (Inferno per loss event, Mercury Hourglass) through each enemy's block. The HP those
 * losses cost is already in the line's outcome (the solver's startTurnHpLoss). Returns the damage dealt.
 */
function startOfTurn(turn: number, player: SimPlayer, enemies: SimEnemy[], input: RolloutInput): number {
  player.plating = Math.max(0, player.plating - 1);
  player.block += player.mantle;
  player.strength += player.rupture * startLossEvents(player);
  const aoe = turnStartAoeOf(player);
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
    if (e.hp <= 0) enemyDown(e, turn, input, enemies);
  }
  return dealt;
}

/** Energy the relics give at the start of fight turn `turn` (RolloutInput.relicEnergy). */
function relicEnergyAt(input: RolloutInput, turn: number): number {
  return (input.relicEnergy ?? []).reduce((sum, relic) => sum + (turn >= relic.from ? relic.amount : 0), 0);
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
): TurnRecord {
  const o = plan.outcome;
  const startHp = player.hp;
  // A line saved by a revive: its hpLoss counts the revive's HP; our own turn's loss is apart.
  const ownLoss = o.revived ? o.revived.ownLoss : Math.max(0, o.hpLoss - o.incomingAfterBlock);
  let regenDrunk = 0;
  // Cards: played ones to the discard pile (exhausted and powers gone), the rest of the hand discarded too.
  const played = new Set<number>();
  for (const step of plan.steps) {
    if (isPotion(step)) {
      player.potions = Math.max(0, player.potions - 1);
      if (step.cardId.startsWith("POTION:RADIANT_TINCTURE:")) player.radiance += RADIANCE_LATER_ENERGY;
      if (step.cardId.startsWith("POTION:SOLDIERS_STEW:")) player.strikeReplay += 1;
      // What the potion leaves for the later turns (its turn is the solver's outcome already).
      const potion = hand.find((card) => card.type === "Potion" && card.cardId === step.cardId);
      if (potion) {
        player.plating += potion.plating ?? 0;
        if (potion.special === "dexterity") player.dexterity += DEX_POTION;
        if (potion.special === "regen") regenDrunk += potion.regen ?? 0;
        if (potion.special === "ritual") player.ritual += 1;
        if (potion.special === "clarity") player.clarityTurns += CLARITY_LATER_DRAWS;
      }
      continue;
    }
    const at = hand.findIndex((card, i) => !played.has(i) && card.index === step.cardIndex && card.cardId === step.cardId);
    if (at < 0) continue;
    played.add(at);
    const card = hand[at]!;
    const effect = POWER_EFFECTS[card.cardId];
    if (effect && card.type === "Power") {
      const amount = card.powerAmount ?? (card.inferno || undefined) ?? effect.amount[card.upgraded ? 1 : 0];
      if (effect.effect === "keepsBlock") player.keepsBlock = true;
      else if (effect.effect === "unmovable") player.unmovable = true;
      else player[effect.effect] += amount;
      playerPowers[effect.power] = (playerPowers[effect.power] ?? 0) + amount;
    }
    if (card.feelNoPain) player.feelNoPain += card.feelNoPain;
    if (card.plating) player.plating += card.plating;
    if (card.exhausts || card.type === "Power") continue;
    // Frantic Escape: 「这张牌的耗能加1」, for the fight: it comes back dearer.
    const back = handBase[at] ?? card;
    piles.discard.push(card.special === "frantic_escape" ? { ...back, cost: Math.max(back.cost, card.cost) + 1 } : back);
  }
  // Cards the line's effects exhausted (Fiend Fire's whole hand, Burning Pact's pick, a random True Grit
  // exhaust) leave the fight; the rest of the hand is discarded (FSPK F48 T1: Fiend Fire's hand came back
  // through the discard pile, "fight over 8/8", actual -60 and death).
  const exhausted = new Set(o.exhausted ?? []);
  const unplayed = hand.map((_card, i) => i).filter((i) => !played.has(i) && hand[i]!.type !== "Potion" && !exhausted.has(hand[i]!.index));
  for (let k = 0; k < (o.randomExhausts ?? 0) && unplayed.length > 0; k += 1) unplayed.splice(Math.floor(random() * unplayed.length), 1);
  for (const i of unplayed) piles.discard.push(handBase[i] ?? hand[i]!);
  // Cards drawn during the line: taken from the pile, counted as discarded (their use is in the solver's
  // outcome), except those an exhaust effect took after they were drawn.
  for (let i = 0; i < o.cardsDrawn; i += 1) {
    const card = drawOne(piles, random);
    if (card && i >= (o.drawnExhausted ?? 0)) piles.discard.push(card);
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
  const after = new Map(o.enemyHpAfter.map((e) => [e.index, e]));
  // Shriek/Plow: taken to its threshold on the decision's turn, it is stunned and this turn's move is lost
  // (the solver already left its hit out); it goes on from STUNNED (Terror Eel: Terror next), and a move it
  // did not make neither spends its Vigor nor gains Strength or Block (XLJQ F7 T5: stunned at 65 with
  // Vigor 6 up, Terror T6, Crash 18 + 6 T7). Later turns' solver calls do not model Shriek (laterTurnSim).
  const shrieked = new Set<number>();
  for (const e of enemies) {
    const a = after.get(e.index);
    const threshold = e.base.shriek ?? 0;
    if (turn === 0 && a && e.alive && threshold > 0 && e.hp > threshold && a.hp <= threshold && a.hp > 0) shrieked.add(e.index);
    // Stunned by the line itself (a Corpse Slug eating a corpse), on any turn.
    if (a?.stunned && a.hp > 0) shrieked.add(e.index);
  }
  for (const e of enemies) {
    const a = after.get(e.index);
    if (!a || !e.alive) continue;
    const hit = a.hp < e.hp;
    e.hp = a.hp;
    e.vulnerable = a.vulnerable;
    e.weak = a.weak;
    if (a.artifact !== undefined) e.artifact = a.artifact;
    if (a.slippery !== undefined) e.slippery = a.slippery;
    if (a.curlUp !== undefined) e.curlUp = a.curlUp;
    if (a.flutter !== undefined) e.flutter = a.flutter;
    if (a.shrink !== undefined) e.shrink = a.shrink;
    // Strength it gained for good this turn (Fight Me!, Enrage per Skill, Crab Rage on the survivor).
    e.strength += a.strengthGained ?? 0;
    if (a.block !== undefined) e.block = a.block;
    else if (hit) e.block = 0;
    if (e.hp <= 0) enemyDown(e, turn, input, enemies);
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
  player.block = player.keepsBlock || player.blurTurns > turn ? o.blockWasted ?? 0 : 0;
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
    for (const e of enemies) {
      if (!e.alive || e.explodeAt !== undefined) continue;
      const table = input.tables[e.id];
      const m = e.move && table ? table.moves[e.move] : undefined;
      // Burrowed with all its block gone this turn: stunned, the move is lost (the solver already left its
      // hit out) and it surfaces; after the stun it goes on as the move model saw it (Tunneler: Bite).
      const stunned = (e.burrowed && e.block <= 0) || shrieked.has(e.index);
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
        // already there; ~800 logged fights had them added).
        for (const status of m?.statusCards ?? []) {
          const card = input.statusCards?.[status.cardId ?? UNKNOWN_STATUS] ?? input.statusCards?.[UNKNOWN_STATUS];
          if (card) addToPile(piles, card, status.count, status.pile, random);
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
      if (stunned) e.move = table?.next["STUNNED"] ? nextMove(table, "STUNNED", random) : nextMove(table, e.move, random);
      else if (!(e.burrowed && m && !m.burrows)) e.move = nextMove(table, e.move, random);
    }
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
    player.startDealt = startOfTurn(turn, player, enemies, input);
    won = allDown();
  }
  return { loss: startHp - player.hp + (o.revived?.reviveHp ?? 0), enemyPart: o.incomingAfterBlock, dmg: o.damageDealt + carried, snap, won, died, ...(o.revived ? { revived: o.revived.sources.length } : {}) };
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
  plan: Plan,
  horizon: number,
  seed: number,
  budget: Budget,
  deadline = Infinity,
  order: KillOrder | null = null,
  /** Set to how many of the order's groups the policy looked at (the trajectory depends on no others). */
  used: { depth: number } = { depth: 0 },
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
    radiance: input.playerPowers["RADIANCE_POWER"] ?? 0,
    strikeReplay: base.strikeReplay ?? 0,
    unmovable: (input.playerPowers["UNMOVABLE_POWER"] ?? 0) > 0,
    relicAoe: 0,
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
    revives: base.revives ?? [],
  };
  // An end-of-turn loss the decision reads that is neither (a solver input without the powers): kept as is.
  if (player.disintegration + player.constrict === 0) player.disintegration = base.endTurnHpLoss ?? 0;
  // What of the start-of-turn loss and AoE is not Mantle or Inferno (relics, other powers): kept as is.
  player.relicAoe = Math.max(0, (base.turnStartAoe ?? 0) - player.inferno * startLossEvents(player));
  player.otherStartLoss = Math.max(0, (base.startTurnHpLoss ?? 0) - mantleHpCost(player.mantle) - (player.inferno > 0 ? 1 : 0));
  const byIndex = new Map(input.enemies.map((e) => [e.index, e]));
  const enemies: SimEnemy[] = s.enemies.map((e) => {
    const info = byIndex.get(e.index);
    // A Giant husk already on the board: it explodes this turn when its intent shows the blast, else next turn.
    const husk = e.maxHp >= HUSK_HP && (e.eruption ?? 0) > 0;
    const shownBlast = e.attacks.reduce((sum, a) => sum + a.damage * a.hits, 0);
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
      base: e,
      shown: e.attacks,
      // Killed before this decision, it revives on this enemy turn (QUG1DSDARAXU F23 T3: the rollout left
      // it out and read "4.9 loss, win 97%"; it came back at 21 HP and T4 cost 12).
      ...(e.illusion && e.hp <= 0 ? { reviveIn: 1 } : {}),
    };
  });
  const piles: Piles = { draw: shuffle(input.piles.draw, random), discard: input.piles.discard.slice() };
  const records: TurnRecord[] = [];
  const powers = { ...input.playerPowers };
  // Modelled potions still held in this sample: 0-cost cards that exist once (drunk: gone).
  let held = s.hand.filter((card) => card.type === "Potion");
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
  let witherPlayed = (s.wither?.played ?? 0) + cardPlays(plan);
  // Turn 0: the candidate line as the solver scored it.
  records.push(applyPlan(0, plan, s.hand, input.piles.handBase, player, enemies, piles, input, random, powers));
  timeUp(0);
  drink(plan);
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
    for (let i = 0; i < Math.max(0, handSize + clarity - player.mindRot); i += 1) {
      const card = drawOne(piles, random);
      if (!card) break;
      handBase.push(card);
      const drawn = withStrength(card, player, i, targets);
      hand.push({
        ...drawn,
        ...(player.tangledNext > 0 && drawn.type === "Attack" && !drawn.xCost && drawn.cost >= 0 ? { cost: drawn.cost + player.tangledNext } : {}),
        ...(i < player.chains ? { soulbound: true } : {}),
      });
    }
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
        dazedPerHit: e.dazedPerHit,
        vitalSpark: e.vitalSpark,
        // Burrowed is this simulated turn's own state, not the decision's (laterTurnSim drops the latter).
        burrowed: e.burrowed,
        // Hardened Shell: a new turn, the whole cap again (the decision's is what was left of that turn's).
        ...((e.powers["HARDENED_SHELL_POWER"] ?? 0) > 0 ? { hpLossCap: e.powers["HARDENED_SHELL_POWER"]! } : {}),
        ...(e.base.timeLimit !== undefined ? { timeLimit: Math.max(1, e.base.timeLimit - h) } : {}),
        attacks: e.explodeAt !== undefined ? (e.explodeAt === h ? [{ damage: e.blast ?? 0, hits: 1 }] : []) : moveAttack(e, input.tables[e.id], e.move, player.vulnTurns > 0),
      }));
    for (const e of enemies) e.base = { ...e.base, attacks: sims.find((x) => x.index === e.index)?.attacks ?? [] };
    const pSim: PlayerSim = {
      ...base,
      hp: player.hp,
      block: player.block,
      energy: Math.max(0, input.meta.max_en + relicEnergyAt(input, (s.turn ?? input.meta.t) + h) + player.pyre + (player.radiance > 0 ? 1 : 0) - player.wasteAway),
      weak: player.weakTurns > 0,
      vulnerable: player.vulnTurns > 0,
      strengthNow: player.strength,
      freeAttacks: 0,
      duplicate: 0,
      buffer: 0,
      vigor: 0,
      regen: player.regen,
      facing: null,
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
      // Lasting powers up by now, played in the line or before (0B5Y F33 T1: Inferno was T1's 0 every turn).
      inferno: player.inferno,
      rupture: player.rupture,
      startTurnHpLoss: startTurnHpLossOf(player),
      turnStartAoe: turnStartAoeOf(player),
      drawable: piles.draw.length + piles.discard.length,
      rage: 0,
      colossus: false,
      gambit: false,
      retaliate: input.playerPowers["THORNS_POWER"] ?? 0,
      ...(base.kusarigama ? { kusarigama: { ...base.kusarigama, count: 0 } } : {}),
    };
    // Radiance: this turn's extra energy is in pSim; one turn of it used. Ringing and Tangled were this turn's.
    player.radiance = Math.max(0, player.radiance - 1);
    player.ringingNext = false;
    player.tangledNext = 0;
    const started = budget.now();
    const { drawPile: _d, wither: _w, focusIndex: _f, focusWeight: _fw, nextIncoming: _n, laterIncoming: _l, ...rest } = s;
    const potions = held.map((card) => ({ ...card, validTargets: card.target === "single" ? targets : [] }));
    // A kill order: this turn's target is the first of its groups with a member alive (the lowest-HP
    // member of it); none left, or none given, and the solver's own score picks.
    const aim = order ? orderTarget(order, enemies) : null;
    if (aim) used.depth = Math.max(used.depth, aim.depth);
    const target = aim?.target;
    const focus = target === undefined ? {} : { focusIndex: target, focusWeight: opts.orderFocusBonus ?? ORDER_FOCUS_BONUS };
    const wither = s.wither ? { wither: { ...s.wither, played: witherPlayed } } : {};
    const solved = solveTurn({ ...rest, ...focus, ...wither, hand: [...hand, ...potions], player: pSim, enemies: sims, turn: (s.turn ?? 1) + h, cardsPlayedThisTurn: 0, potionLimit: null, maxNodes: policyNodes });
    budget.policyMs += budget.now() - started;
    budget.policyTurns += 1;
    budget.policyNodes += solved.nodes;
    const best = solved.plans[0];
    if (!best) break;
    records.push(applyPlan(h, best, [...hand, ...potions], handBase, player, enemies, piles, input, random, powers));
    witherPlayed += cardPlays(best);
    timeUp(h);
    drink(best);
  }
  return records;
}

interface SampleValue {
  loss: number;
  win: number;
  turns: number;
  died: boolean;
  lossModel: number | null;
  winModel: number | null;
}

/** The living enemies' HP in a snapshot (a won fight: 0). */
function enemyHpOf(record: TurnRecord): number {
  if (record.won) return 0;
  return record.snap.E.reduce((sum, e) => sum + (e[5] ? Math.max(0, e[2]) : 0), 0);
}

/**
 * A sample's value at horizon h (h <= records simulated): losses before it, own loss on turn h-1, terminal after.
 * `lossCap`: the most a sample can lose, our HP plus the revives held (their HP counts as lost when spent).
 */
function valueAt(records: TurnRecord[], h: number, ctx: TerminalContext, t0: number, lossCap: number): SampleValue & { n: number } {
  let loss = 0;
  const upto = Math.min(h, records.length);
  for (let i = 0; i < upto; i += 1) {
    const r = records[i]!;
    if (r.died) return { loss: lossCap, win: 0, turns: i + 1, died: true, lossModel: lossCap, winModel: 0, n: 0 };
    if (r.won) {
      loss += r.loss;
      return { loss, win: 1, turns: i + 1, died: false, lossModel: loss, winModel: 1, n: 0 };
    }
    // Out of time (Battleworn Dummy): the fight is over, not won, and costs nothing more.
    if (r.timeUp) {
      loss += r.loss;
      return { loss, win: 0, turns: i + 1, died: false, lossModel: loss, winModel: 0, n: 0 };
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
  const gate = gateFor(input.gates, input.meta.enc, input.meta.act, input.meta.kind);
  const ctx: TerminalContext = { meta: input.meta, mm: input.mm, model: input.model, gates: input.gates, w: gate.w };
  const ctxModel: TerminalContext = { ...ctx, w: 1 };
  const t0 = input.meta.t;
  const startHp = input.solver.player.hp;
  // What a sample can lose at most: our HP, and the HP of the revives held (counted as lost when spent).
  const lossCap = startHp + (input.solver.player.revives ?? []).reduce((sum, revive) => sum + revive.hp, 0);
  const hpWeight = solverHpWeight(startHp, input.solver.player.maxHp);
  const degraded: string[] = [];

  // (ii) one turn: the line's own outcome + terminal of its end-of-turn state (no simulation of later turns).
  const one = candidates.map(({ plan }) => {
    const records = simulate(input, plan, 1, seed, budget)!;
    const v = valueAt(records, 1, ctx, t0, lossCap);
    const vm = valueAt(records, 1, ctxModel, t0, lossCap);
    const modelValue = vm.lossModel === null ? null : -vm.lossModel - DEATH_HP * (1 - (vm.winModel ?? 0));
    const current = plan.score / hpWeight;
    return {
      hpLoss: v.loss,
      winProb: v.win,
      turns: v.turns,
      modelValue,
      value: modelValue === null ? current : blend(gate.w, modelValue, current),
      n: v.n,
      lossModel: vm.lossModel,
      winModel: vm.winModel,
      enemyHpLeft: enemyHpOf(records[0]!),
      survived: v.died ? v.turns : 1,
    };
  });

  // (iii) rollout, sample by sample across all lines (common random numbers per sample index), and with
  // kill orders across every (line, order) pair: the same draws and enemy moves for every order.
  const orders: (KillOrder | null)[] = opts.orders && opts.orders.length >= 2 ? opts.orders : [null];
  // Orders are compared for the lines shown (tagged "offered"); the other candidates, there only to find a
  // better line to add, keep the solver's own later turns.
  const units = candidates.flatMap(({ plan, tags }, line) => (orders.length > 1 && !tags.includes("offered") ? [null] : orders).map((order) => ({ line, plan, order })));
  const trajectories: TurnRecord[][][] = units.map(() => []);
  // One sample of one (line, order): an order agreeing with an order already run on every group that run
  // looked at gets the same trajectory (same line, seed and horizon; the policy is deterministic), e.g.
  // A > B > C and A > C > B while A lives through the horizon.
  const shared = new Map<string, { order: KillOrder; depth: number; records: TurnRecord[] }[]>();
  const run = (unit: { line: number; plan: Plan; order: KillOrder | null }, h: number, j: number): TurnRecord[] | null => {
    const key = `${unit.line}:${h}:${j}`;
    const done = unit.order ? (shared.get(key) ?? []) : [];
    const hit = unit.order ? done.find((entry) => samePrefix(entry.order, unit.order!, entry.depth)) : undefined;
    if (hit) return hit.records;
    const used = { depth: 0 };
    const records = simulate(input, unit.plan, h, seed * 7919 + 1 + j, budget, budget.budgetMs, unit.order, used);
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
    const first = units.map((unit) => run(unit, maxHorizon, 0));
    const waveMs = now() - t;
    const perTurn = waveMs / Math.max(1, budget.policyTurns - turnsBefore);
    const left = budget.budgetMs - elapsed();
    // With kill orders, a sample shared by orders that agree as far as it went is simulated once: the first
    // wave's own time is the measure of a wave.
    const cost = (h: number, m: number) => (orders.length > 1 ? (waveMs * (h - 1)) / Math.max(1, maxHorizon - 1) : perTurn * units.length * (h - 1)) * (m - 1);
    // The schedule at the asked sizes: each step clamped to maxHorizon x maxSamples (asking for fewer than 8
    // samples, or fewer than 3 turns, used to drop every step above it: 6 samples ran at 3 turns, 2 turns at 1).
    const schedule = (orders.length > 1 ? ORDER_SCHEDULE : SCHEDULE)
      .map((s) => ({ horizon: Math.min(s.horizon, maxHorizon), samples: Math.min(s.samples, maxSamples) }))
      .filter((s, i, all) => all.findIndex((t) => t.horizon === s.horizon && t.samples === s.samples) === i);
    const fit = schedule.find((s) => cost(s.horizon, s.samples) <= left);
    if (first.some((r) => r === null) || elapsed() > budget.budgetMs || !fit) {
      horizon = 1;
      samples = 1;
      degraded.push("1-turn");
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
    const firstDown = order?.firstRevives
      ? null
      : kept.filter((records) => {
          const last = records[Math.min(horizon, records.length) - 1]!;
          return last.won || first.every((index) => last.snap.E.every((e) => e[0] !== index || !e[5]));
        }).length;
    const wins = kept.filter((records) => records.slice(0, horizon).some((r) => r.won)).length;
    const timeUps = kept.filter((records) => records.slice(0, horizon).some((r) => r.timeUp)).length;
    const revived = kept.filter((records) => records.slice(0, horizon).some((r) => (r.revived ?? 0) > 0)).length;
    const leaderIndices = order?.leader?.indices;
    const leaderLeft = leaderIndices
      ? kept.map((records) => {
          const last = records[Math.min(horizon, records.length) - 1]!;
          if (last.won) return 0;
          return leaderIndices.reduce((sum, index) => {
            const e = last.snap.E.find((x) => x[0] === index);
            return sum + (e && e[5] ? Math.max(0, e[2]) : 0);
          }, 0);
        })
      : null;
    const leader = leaderLeft ? { hpLeft: mean(leaderLeft), dead: leaderLeft.filter((hp) => hp <= 0).length } : null;
    const vals = kept.map((records) => valueAt(records, horizon, ctx, t0, lossCap));
    const valsM = kept.map((records) => valueAt(records, horizon, ctxModel, t0, lossCap));
    const loss = mean(vals.map((v) => v.loss));
    const win = mean(vals.map((v) => v.win));
    // A dying sample's turn count is when we die, not when we win (69HW F33: "turns to win ~2" at 0/8).
    const alive = vals.filter((v) => !v.died);
    const dead = vals.filter((v) => v.died);
    const enemyHpLeft = mean(kept.map((records) => enemyHpOf(records[Math.min(horizon, records.length) - 1]!)));
    const turnsSurvived = mean(vals.map((v) => (v.died ? v.turns : horizon)));
    const model = valsM.every((v) => v.lossModel !== null) ? { hpLoss: mean(valsM.map((v) => v.lossModel!)), winProb: mean(valsM.map((v) => v.winModel!)) } : null;
    return {
      hpLoss: loss,
      turnsToWin: alive.length > 0 ? mean(alive.map((v) => v.turns)) : null,
      deaths: dead.length,
      turnsToDeath: dead.length > 0 ? mean(dead.map((v) => v.turns)) : null,
      winProb: win,
      wins,
      timeUps,
      value: -loss - DEATH_HP * (1 - win),
      valueModelTerminal: model === null ? null : -model.hpLoss - DEATH_HP * (1 - model.winProb),
      modelForecast: model,
      perTurn: turnSpreads(kept, horizon),
      firstDown,
      leader,
      enemyHpLeft,
      turnsSurvived,
      revived,
    };
  };

  const lines: LineEstimate[] = candidates.map(({ plan, tags }, i) => {
    const current = plan.score / hpWeight;
    const o = one[i]!;
    const basis = { rolloutSamples: horizon > 1 ? samples : 0, horizon, modelN: o.n, w: gate.w, segment: gate.segment, gateN: gate.n };
    const common = {
      plan,
      tags,
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
        hpLoss: o.hpLoss,
        enemyHpLeft: o.enemyHpLeft,
        turnsSurvived: o.survived,
        turnsToWin: o.turns,
        deaths: 0,
        turnsToDeath: null,
        winProb: o.winProb,
        wins,
        value: -o.hpLoss - DEATH_HP * (1 - o.winProb),
        valueModelTerminal: o.lossModel === null ? null : -o.lossModel - DEATH_HP * (1 - (o.winModel ?? 0)),
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
      enemyHpLeft: best.enemyHpLeft,
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

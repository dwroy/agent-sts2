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
 *        - our turns are played by the solver itself with a small node cap (the fast policy), no potions.
 *   3. At the horizon (or the fight's end) the terminal estimate of the end-of-our-turn state is added:
 *      w x model (calibrated win probability) + (1 - w) x a deck-damage clock, w from the gate of the
 *      encounter's segment (0 when the model's ranking advantage is not established).
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

import type { CardModel } from "./card-model.js";
import { valueOf, type FightValueModel } from "./fight-value.js";
import { solveTurn, type EnemySim, type Plan, type PlayerSim, type SolverInput } from "./turn-solver.js";

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
}

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
}

export interface LineEstimate {
  plan: Plan;
  /** Why it is a candidate: top (by score), damage, safe (least HP lost), setup. */
  tags: string[];
  score: number;
  /** (i) the current score on the HP scale. */
  currentValue: number;
  /** (ii) the line + terminal: expected own-turn loss + further loss, win prob, value (gated blend with the current score). */
  oneTurn: { hpLoss: number; winProb: number; turns: number; modelValue: number | null; value: number };
  /** (iii) the rollout: expected HP lost from now to the fight's end, turns to the fight's end, win prob. */
  hpLoss: number;
  /** Mean turns to the fight's end over the samples that survive the horizon; null when every sample dies. */
  turnsToWin: number | null;
  /** Samples (of `samples`) in which we die within the horizon, and the mean turn of death among them. */
  deaths: number;
  turnsToDeath: number | null;
  winProb: number;
  /** Samples (of `samples`) in which the fight was won within the horizon. */
  wins: number;
  value: number;
  /** The same trajectories with the ungated model as terminal (w = 1), for comparison. */
  valueModelTerminal: number | null;
  /** Forecasts with the model terminal (w = 1): (ii) and (iii) expected HP loss and win probability. */
  modelForecast: { oneTurn: { hpLoss: number; winProb: number } | null; rollout: { hpLoss: number; winProb: number } | null };
  horizon: number;
  samples: number;
  /** modelN: the model's support (logged turns in the matching cell) at the line's end-of-turn state. */
  basis: { rolloutSamples: number; horizon: number; modelN: number; w: number; segment: string; gateN: number };
}

export interface RolloutResult {
  lines: LineEstimate[];
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

/** Power cards whose lasting effect the rollout carries (amounts: base / upgraded). */
const POWER_EFFECTS: Record<string, { demonForm?: [number, number]; metallicize?: [number, number]; juggernaut?: [number, number]; barricade?: boolean }> = {
  DEMON_FORM: { demonForm: [2, 3] },
  METALLICIZE: { metallicize: [3, 4] },
  JUGGERNAUT: { juggernaut: [5, 7] },
  BARRICADE: { barricade: true },
};

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
  vulnerable: number;
  weak: number;
  alive: boolean;
  /** A dead Decimillipede segment: enemy turns left until it reattaches (while another segment lives). */
  reattachIn?: number;
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
  block: number;
  keepsBlock: boolean;
  demonForm: number;
  endTurnBlock: number;
  juggernaut: number;
  feelNoPain: number;
  potions: number;
}

interface Piles {
  draw: CardModel[];
  discard: CardModel[];
}

/** One sample's trajectory: per simulated turn, the HP lost that turn and the end-of-our-turn snapshot. */
interface TurnRecord {
  /** HP lost this turn (our own + the enemy turn), as the solver outcome counts it. */
  loss: number;
  /** Of it, the enemy turn's hits after block. */
  enemyPart: number;
  snap: Snapshot;
  won: boolean;
  died: boolean;
}

function moveAttack(enemy: SimEnemy, table: EnemyTable | undefined, move: string | null, playerVulnerable: boolean): { damage: number; hits: number }[] {
  const m = move && table ? table.moves[move] : undefined;
  const scale = (enemy.weak > 0 ? 0.75 : 1) * (playerVulnerable ? 1.5 : 1);
  if (!m) return enemy.shown.map((a) => ({ damage: Math.floor(a.damage * scale), hits: a.hits }));
  if (m.damage <= 0) return [];
  return [{ damage: Math.max(0, Math.floor((m.damage + enemy.strength) * scale)), hits: Math.max(1, m.hits) }];
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
    block: card.block > 0 ? Math.max(0, card.block + player.dexterity) : card.block,
    validTargets: card.target === "single" ? targets : [],
  };
}

function snapshotOf(player: SimPlayer, enemies: SimEnemy[], hpEnd: number, blockEnd: number, energyLeft: number, handLeft: number, playerPowers: Record<string, number>): Snapshot {
  const pw: Record<string, number> = { ...playerPowers };
  if (player.strength !== 0) pw["STRENGTH_POWER"] = player.strength;
  else delete pw["STRENGTH_POWER"];
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
      for (const [id, v] of [["STRENGTH_POWER", e.strength], ["VULNERABLE_POWER", e.vulnerable], ["WEAK_POWER", e.weak]] as const) {
        if (v) powers[id] = v;
        else delete powers[id];
      }
      const intent = e.base.attacks.reduce((s, a) => s + a.damage * a.hits, 0);
      return [e.index, e.id, e.hp, e.maxHp, e.block, e.alive && e.hp > 0, e.base.minion === true, intent, e.move, powers] as SnapEnemy;
    }),
  };
}

/** Apply a played line's outcome to the simulated state; returns the turn record. */
function applyPlan(
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
  const ownLoss = Math.max(0, o.hpLoss - o.incomingAfterBlock);
  // Cards: played ones to the discard pile (exhausted and powers gone), the rest of the hand discarded too.
  const played = new Set<number>();
  for (const step of plan.steps) {
    if (isPotion(step)) {
      player.potions = Math.max(0, player.potions - 1);
      continue;
    }
    const at = hand.findIndex((card, i) => !played.has(i) && card.index === step.cardIndex && card.cardId === step.cardId);
    if (at < 0) continue;
    played.add(at);
    const card = hand[at]!;
    const effect = POWER_EFFECTS[card.cardId];
    if (effect?.demonForm) player.demonForm += effect.demonForm[card.upgraded ? 1 : 0];
    if (effect?.metallicize) player.endTurnBlock += effect.metallicize[card.upgraded ? 1 : 0];
    if (effect?.juggernaut) player.juggernaut += effect.juggernaut[card.upgraded ? 1 : 0];
    if (effect?.barricade) player.keepsBlock = true;
    if (card.feelNoPain) player.feelNoPain += card.feelNoPain;
    if (card.plating) player.endTurnBlock += card.plating;
    if (card.exhausts || card.type === "Power") continue;
    piles.discard.push(handBase[at] ?? card);
  }
  hand.forEach((card, i) => {
    if (!played.has(i) && card.type !== "Potion") piles.discard.push(handBase[i] ?? card);
  });
  // Cards drawn during the line: taken from the pile, counted as discarded (their use is in the solver's outcome).
  for (let i = 0; i < o.cardsDrawn; i += 1) {
    const card = drawOne(piles, random);
    if (card) piles.discard.push(card);
  }
  // Our end-of-turn snapshot (before the enemy turn), for the terminal estimate.
  player.strength += o.strengthGained;
  const after = new Map(o.enemyHpAfter.map((e) => [e.index, e]));
  for (const e of enemies) {
    const a = after.get(e.index);
    if (!a || !e.alive) continue;
    const hit = a.hp < e.hp;
    e.hp = a.hp;
    e.vulnerable = a.vulnerable;
    e.weak = a.weak;
    if (hit) e.block = 0;
    if (e.hp <= 0) {
      if ((e.base.stock ?? 0) > 0) {
        e.hp = e.maxHp;
        e.base = { ...e.base, stock: (e.base.stock ?? 1) - 1 };
      } else if (e.base.revives) {
        e.hp = e.maxHp;
        e.base = { ...e.base, revives: false };
      } else {
        e.alive = false;
      }
    }
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
  const won = o.winsFight || enemies.every((e) => !e.alive || (e.base.minion === true && enemies.some((x) => !x.base.minion && !x.alive)));
  // The enemy turn: HP from the outcome; enemies gain their move's Strength and Block, debuffs wear off, next move.
  player.hp = o.hpAfter;
  player.block = player.keepsBlock ? o.blockWasted ?? 0 : 0;
  const died = !won && (o.dies || player.hp <= 0);
  if (!won && !died) {
    for (const e of enemies) {
      if (!e.alive) continue;
      const table = input.tables[e.id];
      const m = e.move && table ? table.moves[e.move] : undefined;
      e.strength += m?.strength ?? 0;
      e.block = m?.block ?? 0;
      e.vulnerable = Math.max(0, e.vulnerable - 1);
      e.weak = Math.max(0, e.weak - 1);
      e.move = nextMove(table, e.move, random);
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
    player.strength += player.demonForm;
  }
  return { loss: startHp - player.hp, enemyPart: o.incomingAfterBlock, snap, won, died };
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
function simulate(input: RolloutInput, plan: Plan, horizon: number, seed: number, budget: Budget, deadline = Infinity): TurnRecord[] | null {
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
    block: base.block,
    keepsBlock: base.keepsBlock === true,
    demonForm: input.playerPowers["DEMON_FORM_POWER"] ?? 0,
    endTurnBlock: base.endTurnBlock ?? 0,
    juggernaut: base.juggernaut ?? 0,
    feelNoPain: base.feelNoPain ?? 0,
    potions: input.potions,
  };
  const byIndex = new Map(input.enemies.map((e) => [e.index, e]));
  const enemies: SimEnemy[] = s.enemies.map((e) => {
    const info = byIndex.get(e.index);
    return {
      index: e.index,
      id: info?.id ?? e.name,
      move: info?.move ?? null,
      hp: e.hp,
      maxHp: e.maxHp,
      block: e.block,
      strength: info?.strength ?? 0,
      vulnerable: e.vulnerable,
      weak: e.weak,
      alive: e.hp > 0,
      powers: info?.powers ?? {},
      base: e,
      shown: e.attacks,
    };
  });
  const piles: Piles = { draw: shuffle(input.piles.draw, random), discard: input.piles.discard.slice() };
  const records: TurnRecord[] = [];
  const powers = { ...input.playerPowers };
  // Turn 0: the candidate line as the solver scored it.
  records.push(applyPlan(plan, s.hand, input.piles.handBase, player, enemies, piles, input, random, powers));
  for (let h = 1; h < horizon; h += 1) {
    // Past the hard deadline the sample is dropped (the caller keeps the waves already complete).
    if (budget.now() - budget.start > deadline) return null;
    const last = records[records.length - 1]!;
    if (last.won || last.died) break;
    const hand: CardModel[] = [];
    const handBase: CardModel[] = [];
    const targets = enemies.filter((e) => e.alive).map((e) => e.index);
    for (let i = 0; i < handSize; i += 1) {
      const card = drawOne(piles, random);
      if (!card) break;
      handBase.push(card);
      hand.push(withStrength(card, player, i, targets));
    }
    const sims: EnemySim[] = enemies
      .filter((e) => e.alive)
      .map((e) => ({
        ...laterTurnSim(e.base),
        hp: e.hp,
        maxHp: e.maxHp,
        block: e.block,
        vulnerable: e.vulnerable,
        weak: e.weak,
        attacks: moveAttack(e, input.tables[e.id], e.move, player.vulnTurns > 0),
      }));
    for (const e of enemies) e.base = { ...e.base, attacks: sims.find((x) => x.index === e.index)?.attacks ?? [] };
    const pSim: PlayerSim = {
      ...base,
      hp: player.hp,
      block: player.block,
      energy: input.meta.max_en,
      weak: player.weakTurns > 0,
      vulnerable: player.vulnTurns > 0,
      strengthNow: player.strength,
      freeAttacks: 0,
      duplicate: 0,
      buffer: 0,
      vigor: 0,
      regen: 0,
      facing: null,
      unmovableArmed: false,
      exhaustedThisTurn: false,
      noBlock: false,
      tender: 0,
      keepsBlock: player.keepsBlock,
      endTurnBlock: player.endTurnBlock,
      juggernaut: player.juggernaut,
      feelNoPain: player.feelNoPain,
      drawable: piles.draw.length + piles.discard.length,
      rage: 0,
      colossus: false,
      gambit: false,
      retaliate: input.playerPowers["THORNS_POWER"] ?? 0,
      ...(base.kusarigama ? { kusarigama: { ...base.kusarigama, count: 0 } } : {}),
    };
    const started = budget.now();
    const { drawPile: _d, wither: _w, focusIndex: _f, nextIncoming: _n, ...rest } = s;
    const solved = solveTurn({ ...rest, hand, player: pSim, enemies: sims, turn: (s.turn ?? 1) + h, cardsPlayedThisTurn: 0, potionLimit: 0, maxNodes: policyNodes });
    budget.policyMs += budget.now() - started;
    budget.policyTurns += 1;
    budget.policyNodes += solved.nodes;
    const best = solved.plans.find((p) => !p.steps.some(isPotion)) ?? solved.plans[0];
    if (!best) break;
    records.push(applyPlan(best, hand, handBase, player, enemies, piles, input, random, powers));
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

/** A sample's value at horizon h (h <= records simulated): losses before it, own loss on turn h-1, terminal after. */
function valueAt(records: TurnRecord[], h: number, ctx: TerminalContext, t0: number, startHp: number): SampleValue & { n: number } {
  let loss = 0;
  const upto = Math.min(h, records.length);
  for (let i = 0; i < upto; i += 1) {
    const r = records[i]!;
    if (r.died) return { loss: startHp, win: 0, turns: i + 1, died: true, lossModel: startHp, winModel: 0, n: 0 };
    if (r.won) {
      loss += r.loss;
      return { loss, win: 1, turns: i + 1, died: false, lossModel: loss, winModel: 1, n: 0 };
    }
    if (i < upto - 1) loss += r.loss;
  }
  const last = records[upto - 1]!;
  const own = last.loss - last.enemyPart;
  const term = terminal(ctx, last.snap, t0 + upto - 1);
  const base = loss + Math.max(0, own);
  return {
    // No line loses more than the HP we have (GG0Y F33: 144.9 "further loss" at 59 HP).
    loss: Math.min(startHp, base + term.gated.hpLoss),
    win: term.gated.winProb,
    turns: upto + term.gated.turns,
    died: false,
    lossModel: term.model ? Math.min(startHp, base + term.model.hpLoss) : null,
    winModel: term.model ? term.model.winProb : null,
    n: term.n,
  };
}

const SCHEDULE: { horizon: number; samples: number }[] = [
  { horizon: 5, samples: 8 },
  { horizon: 3, samples: 8 },
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
  const hpWeight = solverHpWeight(startHp, input.solver.player.maxHp);
  const degraded: string[] = [];

  // (ii) one turn: the line's own outcome + terminal of its end-of-turn state (no simulation of later turns).
  const one = candidates.map(({ plan }) => {
    const records = simulate(input, plan, 1, seed, budget)!;
    const v = valueAt(records, 1, ctx, t0, startHp);
    const vm = valueAt(records, 1, ctxModel, t0, startHp);
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
    };
  });

  // (iii) rollout, sample by sample across all lines (common random numbers per sample index).
  const trajectories: TurnRecord[][][] = candidates.map(() => []);
  let horizon = maxHorizon;
  let samples = maxSamples;
  const elapsed = () => now() - budget.start;
  if (maxHorizon > 1) {
    const turnsBefore = budget.policyTurns;
    const t = now();
    // First wave at the full horizon, timing the policy. Past the budget it is abandoned: 1 turn for all.
    const first = candidates.map(({ plan }) => simulate(input, plan, maxHorizon, seed * 7919 + 1, budget, budget.budgetMs));
    const perTurn = (now() - t) / Math.max(1, budget.policyTurns - turnsBefore);
    const left = budget.budgetMs - elapsed();
    const cost = (h: number, m: number) => perTurn * candidates.length * (h - 1) * (m - 1);
    const fit = SCHEDULE.filter((s) => s.horizon <= maxHorizon && s.samples <= maxSamples).find((s) => cost(s.horizon, s.samples) <= left);
    if (first.some((r) => r === null) || elapsed() > budget.budgetMs || !fit) {
      horizon = 1;
      samples = 1;
      degraded.push("1-turn");
    } else {
      first.forEach((records, i) => trajectories[i]!.push(records!));
      if (fit.horizon < maxHorizon) degraded.push(`horizon ${fit.horizon}`);
      if (fit.samples < maxSamples) degraded.push(`samples ${fit.samples}`);
      horizon = fit.horizon;
      samples = fit.samples;
      for (let j = 1; j < samples; j += 1) {
        const wave = candidates.map(({ plan }) => simulate(input, plan, horizon, seed * 7919 + 1 + j, budget, budget.budgetMs));
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

  const lines: LineEstimate[] = candidates.map(({ plan, tags }, i) => {
    const current = plan.score / hpWeight;
    const o = one[i]!;
    let loss = o.hpLoss;
    let win = o.winProb;
    let turns: number | null = o.turns;
    let deaths = 0;
    let turnsToDeath: number | null = null;
    let lossM: number | null = null;
    let winM: number | null = null;
    let wins = plan.outcome.winsFight ? 1 : 0;
    if (horizon > 1) {
      wins = trajectories[i]!.slice(0, samples).filter((records) => records.slice(0, horizon).some((r) => r.won)).length;
      const vals = trajectories[i]!.slice(0, samples).map((records) => valueAt(records, horizon, ctx, t0, startHp));
      const valsM = trajectories[i]!.slice(0, samples).map((records) => valueAt(records, horizon, ctxModel, t0, startHp));
      const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
      loss = mean(vals.map((v) => v.loss));
      win = mean(vals.map((v) => v.win));
      // A dying sample's turn count is when we die, not when we win (69HW F33: "turns to win ~2" at 0/8).
      const alive = vals.filter((v) => !v.died);
      const dead = vals.filter((v) => v.died);
      turns = alive.length > 0 ? mean(alive.map((v) => v.turns)) : null;
      deaths = dead.length;
      turnsToDeath = dead.length > 0 ? mean(dead.map((v) => v.turns)) : null;
      if (valsM.every((v) => v.lossModel !== null)) {
        lossM = mean(valsM.map((v) => v.lossModel!));
        winM = mean(valsM.map((v) => v.winModel!));
      }
    } else {
      lossM = o.lossModel;
      winM = o.winModel;
    }
    return {
      plan,
      tags,
      score: plan.score,
      currentValue: current,
      oneTurn: { hpLoss: o.hpLoss, winProb: o.winProb, turns: o.turns, modelValue: o.modelValue, value: o.value },
      hpLoss: loss,
      turnsToWin: turns,
      deaths,
      turnsToDeath,
      winProb: win,
      wins,
      value: -loss - DEATH_HP * (1 - win),
      valueModelTerminal: lossM === null ? null : -lossM - DEATH_HP * (1 - (winM ?? 0)),
      modelForecast: {
        oneTurn: o.lossModel === null ? null : { hpLoss: o.lossModel, winProb: o.winModel ?? 0 },
        rollout: lossM === null ? null : { hpLoss: lossM, winProb: winM ?? 0 },
      },
      horizon,
      samples,
      basis: { rolloutSamples: horizon > 1 ? samples : 0, horizon, modelN: o.n, w: gate.w, segment: gate.segment, gateN: gate.n },
    };
  });
  return { lines, horizon, samples, elapsedMs: elapsed(), degraded, policyTurns: budget.policyTurns, policyMs: budget.policyMs, policyNodes: budget.policyNodes };
}

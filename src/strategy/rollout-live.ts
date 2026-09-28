/**
 * The 5-turn rollout (rollout.ts) on the live board, as FACTS for Jev's combat question (combat-plan.ts).
 *
 * It never ranks, filters or auto-plays anything: code's options, their order and every safety auto-act
 * are decided before it runs. What it adds per option shown to Jev:
 *   - `rollout`: expected further HP loss, how often the fight is over within the horizon, expected turns,
 *     with the horizon and samples actually used (degraded to fit the time budget);
 *   - `history_estimate`: the fight-value model's calibrated forecast (the rollout with the model as
 *     terminal, w = 1: the best forecast in notes/rollout-backtest.md), with the gate segment's n and the
 *     measured typical error for the fight kind; only when the segment has enough similar states. The gate
 *     weight w itself is never shown.
 * and the rollout's best line, which combat-plan.ts adds to the options when code did not show it.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../mod/schema.js";
import type { ScreenMemory } from "../project/types.js";
import { asArray, asRecord, str, type JsonValue } from "../util/json.js";
import { modelHandCard, type CardModel } from "./card-model.js";
import { loadFightValueModel, type FightValueModel } from "./fight-value.js";
import {
  gateFor,
  loadFightValueGates,
  rolloutDecision,
  type DeckSummary,
  type EnemyTable,
  type FightKindName,
  type FightMeta,
  type FightValueGates,
  type Gate,
  type LineEstimate,
  type MoveModelData,
  type RolloutEnemy,
  type RolloutResult,
} from "./rollout.js";
import type { Plan, SolverInput } from "./turn-solver.js";

/** Wall-clock budget of the whole rollout step of one decision (input building included). */
export const ROLLOUT_BUDGET_MS = 1500;
/** Kept back from the rollout's own budget: its deadline is checked between simulated turns. */
const ROLLOUT_MARGIN_MS = 100;
export const ROLLOUT_HORIZON = 5;
export const ROLLOUT_SAMPLES = 8;
/**
 * Typical error (MAE, HP) of the model-terminal rollout forecast of HP lost to the fight's end, per fight
 * kind: notes/rollout-backtest.md, "Forecast of the played line", column MAE (iii') model (out of fold).
 */
export const HISTORY_MAE: Record<FightKindName, number> = { hallway: 5.5, elite: 11.0, boss: 9.9 };

/** Test hooks: the clock, the budget, and a switch (ROLLOUT_FACTS=off turns the facts off). */
export const rolloutLiveOptions: { enabled: boolean; now: (() => number) | null; budgetMs: number } = {
  enabled: process.env["ROLLOUT_FACTS"] !== "off",
  now: null,
  budgetMs: ROLLOUT_BUDGET_MS,
};

// ---------------------------------------------------------------- knowledge

export interface MonsterDbMove {
  next?: Record<string, number>;
  damage_by_asc?: Record<string, { base_per_hit?: Record<string, number>; hits?: Record<string, number> }>;
  self_powers_gained?: Record<string, Record<string, number>>;
  block_gained?: Record<string, number>;
  avg_total_shown?: number;
}

type MonsterMoves = Record<string, { moves?: Record<string, MonsterDbMove> }>;

const KNOWLEDGE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "knowledge");
let dbCache: MonsterMoves | undefined;
let mmCache: MoveModelData | undefined;

function readJson<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(join(KNOWLEDGE_DIR, name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

function monsterMoves(): MonsterMoves {
  return (dbCache ??= readJson<{ monsters?: MonsterMoves }>("monster-db.json", {}).monsters ?? {});
}

function moveModelData(): MoveModelData {
  return (mmCache ??= readJson<MoveModelData>("move-model.json", {}));
}

function mode(counts: Record<string, number> | undefined): number | null {
  if (!counts) return null;
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best ? Number(best[0]) : null;
}

/** An enemy's move table for the rollout: monster DB damage/hits/Strength/Block per move, move-model successors. */
export function enemyTable(id: string, asc: number, db: MonsterMoves, mm: MoveModelData): EnemyTable | undefined {
  const moves = db[id]?.moves;
  const learned = mm[id];
  if (!moves && !learned) return undefined;
  const table: EnemyTable = { moves: {}, next: {} };
  for (const [move, entry] of Object.entries(moves ?? {})) {
    const byAsc = entry.damage_by_asc ?? {};
    const key = byAsc[String(asc)] ? String(asc) : Object.keys(byAsc).sort((a, b) => Math.abs(Number(a) - asc) - Math.abs(Number(b) - asc))[0];
    const d = key ? byAsc[key] : undefined;
    const base = mode(d?.base_per_hit);
    const hits = mode(d?.hits) ?? 1;
    const avg = learned?.damage[move] ?? entry.avg_total_shown ?? 0;
    table.moves[move] = {
      damage: base ?? (avg > 0 ? avg / hits : 0),
      hits,
      strength: mode(entry.self_powers_gained?.["STRENGTH_POWER"]) ?? 0,
      block: mode(entry.block_gained) ?? 0,
    };
  }
  for (const [move, damage] of Object.entries(learned?.damage ?? {})) {
    if (!table.moves[move]) table.moves[move] = { damage, hits: 1, strength: 0, block: 0 };
  }
  table.next = learned?.next ?? Object.fromEntries(Object.entries(moves ?? {}).map(([m, e]) => [m, e.next ?? {}]));
  return table;
}

// ---------------------------------------------------------------- board

export function powersOf(holder: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of asArray(holder["powers"])) {
    const power = asRecord(p);
    const id = str(power["power_id"]);
    if (id) out[id] = typeof power["amount"] === "number" ? power["amount"] : 1;
  }
  return out;
}

/** deck_summary() of tools/build-fight-value.py. */
export function deckSummary(runRaw: Record<string, unknown>): DeckSummary {
  const out: DeckSummary = { n: 0, atk: 0, skl: 0, pow: 0, junk: 0, dmg: 0, blk: 0, up: 0 };
  for (const entry of asArray(runRaw["deck"])) {
    const card = asRecord(entry);
    if (Object.keys(card).length === 0) continue;
    out.n += 1;
    const type = card["card_type"];
    if (type === "Attack") out.atk += 1;
    else if (type === "Skill") out.skl += 1;
    else if (type === "Power") out.pow += 1;
    else out.junk += 1;
    if (card["upgraded"] === true) out.up += 1;
    for (const raw of asArray(card["dynamic_values"])) {
      const value = asRecord(raw);
      const amount = value["current_value"];
      if (typeof amount !== "number") continue;
      if (value["name"] === "Damage") out.dmg += amount;
      else if (value["name"] === "Block") out.blk += amount;
    }
  }
  return out;
}

/** The deck as base cards (no Strength/Weak), for the hand's base versions. */
export function deckModels(state: GameState, knowledge: Knowledge): CardModel[] {
  return asArray(asRecord(state.run?.raw)["deck"]).map((raw, i) => {
    const own = asRecord(raw);
    const info = knowledge.card(str(own["card_id"]));
    const model = modelHandCard({ ...own, target_type: info?.target ?? "", requires_target: info?.target === "AnyEnemy", playable: true, index: 900 + i }, 900 + i, knowledge);
    return { ...model, playable: model.type !== "Curse" && model.type !== "Status" && (model.xCost || model.cost >= 0) };
  });
}

const cardKey = (c: { cardId: string; upgraded: boolean }) => `${c.cardId}${c.upgraded ? "+" : ""}`;

function fightId(state: GameState): string {
  return `${str(state.raw["run_id"])}:${str(asRecord(state.run?.raw)["act_id"])}:${state.run?.floor ?? "?"}`;
}

/** The fight's constants as the fight-value rows have them (encounter = the first enemies seen, sorted). */
export function fightMetaOf(state: GameState, knowledge: Knowledge, memory: ScreenMemory): FightMeta {
  const combat = asRecord(state.raw["combat"]);
  const all = asArray(combat["enemies"]).map(asRecord).map((e) => str(e["enemy_id"])).filter((id) => id !== "");
  const fight = fightId(state);
  if (memory.rolloutEncounter?.fight !== fight) memory.rolloutEncounter = { fight, enc: [...all].sort().join("+") };
  const enc = memory.rolloutEncounter.enc;
  const types = enc.split("+").map((id) => knowledge.monster(id)?.type ?? "");
  const kind: FightKindName = types.includes("Boss") ? "boss" : types.includes("Elite") ? "elite" : "hallway";
  const runRaw = asRecord(state.run?.raw);
  const actRaw = str(runRaw["act_id"]);
  const maxEn = runRaw["max_energy"];
  return {
    act: /^\d+$/.test(actRaw) ? Number(actRaw) + 1 : 1,
    t: state.turn ?? 1,
    asc: state.run?.ascension ?? 0,
    kind,
    enc,
    deck: deckSummary(runRaw),
    relics: asArray(runRaw["relics"]).length,
    max_en: typeof maxEn === "number" && maxEn > 0 ? maxEn : 3,
  };
}

function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) || 1;
}

// ---------------------------------------------------------------- the rollout of one decision

export interface LiveRolloutArgs {
  state: GameState;
  knowledge: Knowledge;
  memory: ScreenMemory;
  /** The solver input of this turn, as the planner built it. */
  solver: SolverInput;
  /** Code's surviving lines, best first (no dying line, hard rules applied): what the rollout may pick. */
  plans: Plan[];
  /** The options code shows Jev (always evaluated). */
  shown: Plan[];
  /** Base draw and discard piles from the state, or null when the state has none. */
  piles: { draw: CardModel[]; discard: CardModel[] } | null;
  /** Overrides (tests): the model, the gates. */
  model?: FightValueModel | null;
  gates?: FightValueGates | null;
}

export type LiveRollout =
  | { available: false; reason: string; elapsedMs: number }
  | {
      available: true;
      result: RolloutResult;
      byPlan: Map<Plan, LineEstimate>;
      /** The best line by the backtest's scoring (value = -E[HP loss] - 40 x (1 - win)), among those it may add. */
      best: Plan | null;
      meta: FightMeta;
      gate: Gate;
      /** Similar states the gate needs before the history estimate is shown. */
      minRows: number;
      elapsedMs: number;
    };

const drinks = (plan: Plan) => plan.steps.some((step) => step.cardId.startsWith("POTION:"));

export function liveRollout(args: LiveRolloutArgs): LiveRollout {
  const now = rolloutLiveOptions.now ?? (() => performance.now());
  const start = now();
  const elapsed = () => now() - start;
  if (!args.piles || args.piles.draw.length + args.piles.discard.length === 0) return { available: false, reason: "no draw/discard piles in the state", elapsedMs: elapsed() };
  if (args.plans.length === 0) return { available: false, reason: "no line to roll out", elapsedMs: elapsed() };
  try {
    const { state, knowledge } = args;
    const meta = fightMetaOf(state, knowledge, args.memory);
    const combat = asRecord(state.raw["combat"]);
    const enemies: RolloutEnemy[] = asArray(combat["enemies"])
      .map(asRecord)
      .filter((e) => e["is_alive"] !== false)
      .map((e, i) => {
        const powers = powersOf(e);
        return { index: typeof e["index"] === "number" ? e["index"] : i, id: str(e["enemy_id"]), move: e["move_id"] ? str(e["move_id"]) : null, strength: powers["STRENGTH_POWER"] ?? 0, powers };
      });
    const mm = moveModelData();
    const db = monsterMoves();
    const tables: Record<string, EnemyTable> = {};
    for (const e of enemies) {
      const table = enemyTable(e.id, meta.asc, db, mm);
      if (table) tables[e.id] = table;
    }
    const baseByKey = new Map(deckModels(state, knowledge).map((c) => [cardKey(c), c]));
    const handBase = args.solver.hand.map((card) => (card.type === "Potion" ? null : baseByKey.get(cardKey(card)) ?? null));
    const potions = asArray(asRecord(state.run?.raw)["potions"]).filter((p) => asRecord(p)["occupied"]).length;
    const model = args.model !== undefined ? args.model : loadFightValueModel();
    const gates = args.gates !== undefined ? args.gates : loadFightValueGates();
    const budgetMs = Math.max(0, rolloutLiveOptions.budgetMs - ROLLOUT_MARGIN_MS - elapsed());
    const result = rolloutDecision({
      solver: args.solver,
      plans: args.plans,
      enemies,
      tables,
      piles: { draw: args.piles.draw, discard: args.piles.discard, handBase },
      meta,
      playerPowers: powersOf(asRecord(combat["player"])),
      potions,
      mm,
      model,
      gates,
      options: { horizon: ROLLOUT_HORIZON, samples: ROLLOUT_SAMPLES, budgetMs, seed: seedOf(`${fightId(state)}:${state.turn ?? "?"}`), now, include: args.shown },
    });
    const byPlan = new Map(result.lines.map((line) => [line.plan, line]));
    // A line code did not show is only added when it drinks no potion (the potion rules stay code's).
    const eligible = result.lines.filter((line) => args.shown.includes(line.plan) || !drinks(line.plan));
    const best = eligible.reduce<LineEstimate | null>((a, b) => (a === null || b.value > a.value ? b : a), null)?.plan ?? null;
    return {
      available: true,
      result,
      byPlan,
      best,
      meta,
      gate: gateFor(gates, meta.enc, meta.act, meta.kind),
      minRows: gates?.params.min_rows ?? Infinity,
      elapsedMs: elapsed(),
    };
  } catch (error) {
    return { available: false, reason: `error: ${String(error).slice(0, 120)}`, elapsedMs: elapsed() };
  }
}

// ---------------------------------------------------------------- facts

const round1 = (x: number) => Math.round(x * 10) / 10;

/** The facts of one shown line. */
export function rolloutFacts(plan: Plan, r: LiveRollout): Record<string, JsonValue> {
  if (!r.available) return { rollout: `rollout unavailable (${r.reason})` };
  const line = r.byPlan.get(plan);
  if (!line) return { rollout: "rollout unavailable (line not evaluated)" };
  const { horizon, samples } = line;
  const cut = r.result.degraded.length > 0 ? ` [cut to fit the time budget: ${r.result.degraded.join(", ")}]` : "";
  const head = horizon > 1 ? `${horizon}-turn rollout (${samples} sample${samples === 1 ? "" : "s"})` : "1-turn estimate (no rollout)";
  const facts: Record<string, JsonValue> = {
    rollout: `${head}: expected further HP loss ${round1(line.hpLoss)}, fight over within ${horizon} turn${horizon === 1 ? "" : "s"} in ${line.wins}/${samples}, expected turns to win ~${round1(line.turnsToWin)}${cut}`,
  };
  const forecast = line.modelForecast.rollout;
  if (!forecast) facts["history_estimate"] = "unavailable (no fight-value model)";
  else if (r.gate.n < r.minRows) facts["history_estimate"] = `few similar states (n=${r.gate.n})`;
  else {
    facts["history_estimate"] = `further HP loss ${Math.round(forecast.hpLoss)}, win ${Math.round(forecast.winProb * 100)}% (similar states n=${r.gate.n}, typical error ±${HISTORY_MAE[r.meta.kind]} HP for ${r.meta.kind} fights)`;
  }
  return facts;
}

/** The fact on a "drink first, then re-plan" option: its turn is unknown until the potion is drunk. */
export const DRINK_FIRST_ROLLOUT = "not rolled out: this potion's effect is not modelled, the turn is re-planned after drinking";

/** The decision's log entry (decision log field `rollout`). */
export function rolloutLog(r: LiveRollout, bestKey: string | null, added: boolean): Record<string, JsonValue> {
  if (!r.available) return { available: false, reason: r.reason, ms: Math.round(r.elapsedMs) };
  return {
    available: true,
    ms: Math.round(r.elapsedMs),
    horizon: r.result.horizon,
    samples: r.result.samples,
    degraded: r.result.degraded,
    lines: r.result.lines.length,
    best: bestKey,
    best_added: added,
  };
}

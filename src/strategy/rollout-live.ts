/**
 * The 5-turn rollout (rollout.ts) on the live board, as FACTS for Jev's combat question (combat-plan.ts).
 *
 * It never ranks, filters or auto-plays anything: code's options, their order and every safety auto-act
 * are decided before it runs. What it adds per option shown to Jev:
 *   - `rollout`: expected further HP loss, how often the fight is over within the horizon, expected turns,
 *     with the horizon and samples actually used (degraded to fit the time budget);
 *   - `rollout_turns`: turn by turn, the line's own turn (exact), then each simulated turn's HP lost and
 *     damage dealt (mean and [min-max] over the samples) and how many samples are alive / have won;
 *   - `history_estimate`: the fight-value model's calibrated forecast (the rollout with the model as
 *     terminal, w = 1: the best forecast in notes/rollout-backtest.md), with the gate segment's n and the
 *     measured typical error for the fight kind; only when the segment has enough similar states. The gate
 *     weight w itself is never shown;
 *   - with two or more distinct enemies (by id), `rollout_kill_order` and `rollout_other_orders`: every line is
 *     rolled out under each kill order (rollout.ts killOrders: the later turns hit that enemy first), the
 *     facts above are its best order's, and the other orders' numbers are listed compactly beside them. With a
 *     leader (its death ends the fight, the others are minions) each order also shows the leader's HP left at
 *     the horizon, and the orders are ranked by that progress when none ends the fight (rollout.ts rankOrders).
 * and the rollout's best (line, order) pair, whose line combat-plan.ts adds to the options when code did not
 * show it.
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
  killOrders,
  loadFightValueGates,
  rolloutDecision,
  type DeckSummary,
  type EnemyTable,
  type FightKindName,
  type FightMeta,
  type FightValueGates,
  type Gate,
  type KillGroup,
  type KillOrder,
  type LineEstimate,
  type OrderEstimate,
  type MoveModelData,
  type RolloutEnemy,
  type RolloutResult,
} from "./rollout.js";
import type { EnemySim, Plan, SolverInput } from "./turn-solver.js";

/** Kill orders come from here too: decision code reaches rollout.ts only through this module. */
export { killOrders, type KillGroup, type KillOrder };

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

/**
 * Test hooks: the clock, the budget, a switch (ROLLOUT_FACTS=off turns the facts off), and the kill-order
 * policy's focus weight (measurements; rollout.ts ORDER_FOCUS_BONUS when unset).
 */
export const rolloutLiveOptions: { enabled: boolean; now: (() => number) | null; budgetMs: number; orderFocusBonus?: number } = {
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
      ...(entry.self_powers_gained?.["BURROWED_POWER"] ? { burrows: true } : {}),
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
  /** Wall clock already spent on this decision's budget (the random potions' Monte Carlo). */
  spentMs?: number;
  /** Kill orders for the later turns (rollout.ts killOrders; two or more distinct enemies), and how many were left out. */
  orders?: KillOrder[];
  ordersDropped?: number;
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
      /**
       * The best line by the backtest's scoring (value = -E[HP loss] - 40 x (1 - win)), among those it may
       * add; ties and saturated boards by enemy HP left, then turns survived; null when that ties too
       * (pickRolloutBest).
       */
      best: Plan | null;
      /** Every line loses all our HP within the horizon (and wins in no sample): the HP numbers tell them nothing. */
      saturated: boolean;
      meta: FightMeta;
      gate: Gate;
      /** This encounter's own decision points in the gates file (its `enc:` segment; 0 when absent). */
      encounterN: number;
      /** Similar states an encounter needs for its own gate (the gates' min_rows). */
      minRows: number;
      /** Modelled potions in the belt: the policy's later turns may drink them. */
      potionsHeld: boolean;
      /** Kill-order permutations left out (more than MAX_FULL_ORDER_GROUPS groups). */
      ordersDropped: number;
      elapsedMs: number;
    };

const drinks = (plan: Plan) => plan.steps.some((step) => step.cardId.startsWith("POTION:"));

/** A line whose expected further loss is within this much of the HP we have, winning in no sample, is saturated. */
export const SATURATED_HP = 1;
/** Enemy HP left within this much, and turns survived within ROLLOUT_TURNS_TIE, is a tie. */
export const ROLLOUT_ENEMY_HP_TIE = 1;
export const ROLLOUT_TURNS_TIE = 0.1;

/**
 * The rollout's best line: the highest value (-E[HP loss] - 40 x (1 - win)); lines tied on it are told
 * apart by the enemy HP left at the horizon (least first), then the turns we stay alive (most first),
 * then code's order. When every line is saturated (its loss capped at the HP we have, no sample won) the
 * value says nothing: the enemy HP left and turns alive alone decide, and when they tie too there is no
 * best line (HEACJRY5LEVD F17 T2: all three lines "further loss 69" = our HP; T6: 49 vs 48.9 by one
 * sample's HP; 8V0HD9Y207WY F17 T1-T2: all ten lines 62, and the first was tagged best).
 */
export function pickRolloutBest(lines: LineEstimate[], startHp: number): { best: LineEstimate | null; saturated: boolean } {
  if (lines.length === 0) return { best: null, saturated: false };
  const saturated = lines.every((line) => line.wins === 0 && line.hpLoss >= startHp - SATURATED_HP);
  const top = Math.max(...lines.map((line) => line.value));
  const contenders = saturated ? lines : lines.filter((line) => line.value === top);
  // The least enemy HP left and every line within ROLLOUT_ENEMY_HP_TIE of it; among those the most turns
  // alive (a stable sort: code's order among equals).
  const least = Math.min(...contenders.map((line) => line.enemyHpLeft));
  const near = contenders.filter((line) => line.enemyHpLeft < least + ROLLOUT_ENEMY_HP_TIE).sort((a, b) => b.turnsSurvived - a.turnsSurvived);
  if (saturated && near.length >= 2 && near[0]!.turnsSurvived - near[1]!.turnsSurvived < ROLLOUT_TURNS_TIE) return { best: null, saturated };
  return { best: near[0]!, saturated };
}

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
    const raw = asArray(combat["enemies"]).map(asRecord);
    // An illusion killed before this decision (is_alive false, ILLUSION_POWER) is back at full HP next
    // turn while its summoner lives: it stays in the rollout at 0 HP and revives (rollout.ts reviveIn).
    const leaderAlive = raw.some((e) => e["is_alive"] !== false && !powersOf(e)["MINION_POWER"]);
    const reviving = (e: Record<string, unknown>) => e["is_alive"] === false && (powersOf(e)["ILLUSION_POWER"] ?? 0) > 0 && leaderAlive;
    const enemies: RolloutEnemy[] = raw
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e["is_alive"] !== false || reviving(e))
      .map(({ e, i }) => {
        const powers = powersOf(e);
        return { index: typeof e["index"] === "number" ? e["index"] : i, id: str(e["enemy_id"]), move: e["move_id"] ? str(e["move_id"]) : null, strength: powers["STRENGTH_POWER"] ?? 0, powers };
      });
    const revivers: EnemySim[] = raw
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => reviving(e) && !args.solver.enemies.some((sim) => sim.index === (typeof e["index"] === "number" ? e["index"] : -1)))
      .map(({ e, i }) => ({
        index: typeof e["index"] === "number" ? e["index"] : i,
        name: str(e["name"], str(e["enemy_id"])),
        hp: 0,
        maxHp: typeof e["max_hp"] === "number" ? e["max_hp"] : 0,
        block: 0,
        vulnerable: 0,
        weak: 0,
        artifact: 0,
        intangible: false,
        illusion: true,
        minion: (powersOf(e)["MINION_POWER"] ?? 0) > 0,
        attacks: [],
      }));
    const solver = revivers.length > 0 ? { ...args.solver, enemies: [...args.solver.enemies, ...revivers] } : args.solver;
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
    const budgetMs = Math.max(0, rolloutLiveOptions.budgetMs - ROLLOUT_MARGIN_MS - (args.spentMs ?? 0) - elapsed());
    const result = rolloutDecision({
      solver,
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
      options: {
        horizon: ROLLOUT_HORIZON,
        samples: ROLLOUT_SAMPLES,
        budgetMs,
        seed: seedOf(`${fightId(state)}:${state.turn ?? "?"}`),
        now,
        include: args.shown,
        ...(args.orders && args.orders.length >= 2 ? { orders: args.orders } : {}),
        ...(rolloutLiveOptions.orderFocusBonus !== undefined ? { orderFocusBonus: rolloutLiveOptions.orderFocusBonus } : {}),
      },
    });
    const byPlan = new Map(result.lines.map((line) => [line.plan, line]));
    // A line code did not show is only added when it drinks no potion (every modelled potion already
    // has its shown line; the rollout does not add a second drink). With kill orders a line's value is its
    // best order's: the best line is the best (line, order) pair.
    const eligible = result.lines.filter((line) => args.shown.includes(line.plan) || !drinks(line.plan));
    const picked = pickRolloutBest(eligible, args.solver.player.hp);
    return {
      available: true,
      result,
      byPlan,
      best: picked.best?.plan ?? null,
      saturated: picked.saturated,
      meta,
      gate: gateFor(gates, meta.enc, meta.act, meta.kind),
      encounterN: gates?.segments[`enc:${meta.enc}`]?.n_rows ?? 0,
      minRows: gates?.params.min_rows ?? Infinity,
      potionsHeld: args.solver.hand.some((card) => card.type === "Potion"),
      ordersDropped: args.ordersDropped ?? 0,
      elapsedMs: elapsed(),
    };
  } catch (error) {
    return { available: false, reason: `error: ${String(error).slice(0, 120)}`, elapsedMs: elapsed() };
  }
}

// ---------------------------------------------------------------- facts

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Saturated boards: the HP numbers are the same for every line, so the enemy HP left and turns alive are shown. */
function saturatedNote(line: LineEstimate, r: LiveRollout & { available: true }): string {
  if (!r.saturated) return "";
  return `; every line loses all our HP here, so the loss does not separate them: enemy HP left ~${Math.round(line.enemyHpLeft)} (at T${line.horizon} or at our death), alive ~${round1(line.turnsSurvived)} turns`;
}

/** The facts of one shown line. */
export function rolloutFacts(plan: Plan, r: LiveRollout): Record<string, JsonValue> {
  if (!r.available) return { rollout: `rollout unavailable (${r.reason})` };
  const line = r.byPlan.get(plan);
  if (!line) return { rollout: "rollout unavailable (line not evaluated)" };
  const { horizon, samples } = line;
  const cut = r.result.degraded.length > 0 ? ` [cut to fit the time budget: ${r.result.degraded.join(", ")}]` : "";
  const head = horizon > 1 ? `${horizon}-turn rollout (${samples} sample${samples === 1 ? "" : "s"})` : "1-turn estimate (no rollout)";
  const potions = r.potionsHeld ? " (later turns may use the potions still held)" : "";
  const facts: Record<string, JsonValue> = {
    rollout: `${head}${potions}: expected further HP loss ${round1(line.hpLoss)}, fight over within ${horizon} turn${horizon === 1 ? "" : "s"} in ${line.wins}/${samples}${line.turnsToWin === null ? "" : `, expected turns to the end (surviving samples) ~${round1(line.turnsToWin)}`}${line.deaths > 0 ? `, dead within ${horizon} turns in ${line.deaths}/${samples} (~turn ${round1(line.turnsToDeath ?? 0)})` : ""}${saturatedNote(line, r)}${cut}`,
    rollout_turns: turnsText(plan, line, samples),
  };
  if (line.order) {
    // Orders with the same numbers and the same first target are one entry ("A > B > C | A > C > B": the
    // samples never got past A, or went the same way after it).
    const first = (entry: OrderEstimate) => entry.order.label.split(" > ")[0]!;
    // An illusion first (Parafright) revives each turn: its "dead" count would read as a kill it never is.
    const firstFate = (entry: OrderEstimate) => (entry.firstDown === null ? `${first(entry)} is an illusion (revives at full HP; never dead for good)` : `${first(entry)} dead ${entry.firstDown}/${samples}`);
    // A leader (its death ends the fight; the others are minions): its HP left at the horizon, every order.
    const leaderName = line.order.leader?.name ?? null;
    const leaderFate = (entry: OrderEstimate) => (entry.leader && leaderName ? `, ${leaderName} HP left at T${horizon} ~${Math.round(entry.leader.hpLeft)} (dead ${entry.leader.dead}/${samples})` : "");
    const numbers = (entry: OrderEstimate) => `further HP loss ${round1(entry.hpLoss)}, over ${entry.wins}/${samples}, dead ${entry.deaths}/${samples}, ${firstFate(entry)}${leaderFate(entry)}`;
    const merged: { labels: string[]; entry: OrderEstimate; text: string }[] = [];
    for (const entry of line.orders) {
      const text = numbers(entry);
      const same = merged.find((m) => m.text === text);
      if (same) same.labels.push(entry.order.label);
      else merged.push({ labels: [entry.order.label], entry, text });
    }
    const [best, ...others] = merged;
    const dropped = r.ordersDropped > 0 ? `; ${r.ordersDropped} other orders not tried` : "";
    const sameLeader = (m: (typeof merged)[number]) => Math.abs((m.entry.leader?.hpLeft ?? 0) - (best!.entry.leader?.hpLeft ?? 0)) < 0.5;
    const tied = others.length > 0 && others.every((m) => Math.abs(m.entry.value - best!.entry.value) < 0.05 && sameLeader(m)) ? "; the orders came out the same here" : "";
    const leaderNote =
      leaderName && best!.entry.leader
        ? `; ${leaderName}'s death ends the fight (the others are minions): HP left at T${horizon} ~${Math.round(best!.entry.leader.hpLeft)}, dead ${best!.entry.leader.dead}/${samples}${line.ordersByLeader ? `; no order ends the fight within ${horizon} turns, so the orders are ranked by least ${leaderName} HP left, then HP lost and deaths` : ""}`
        : "";
    facts["rollout_kill_order"] = `${best!.labels.join(" | ")}: the later turns aim at ${first(best!.entry)} first (${best!.entry.firstDown === null ? `${first(best!.entry)} is an illusion: it revives at full HP, so it is never dead for good` : `${first(best!.entry)} dead by T${horizon} in ${best!.entry.firstDown}/${samples}`}); best of ${line.orders.length} kill orders compared${dropped}${tied}${leaderNote}`;
    if (others.length > 0) facts["rollout_other_orders"] = others.map((m) => `${m.labels.join(" | ")}: ${m.text}`).join("; ");
  }
  const forecast = line.modelForecast.rollout;
  if (!forecast) facts["history_estimate"] = "unavailable (no fight-value model)";
  else {
    // The encounter's own support, and the segment the estimate's gate actually comes from (never a
    // backed-off segment's n presented as this encounter's).
    const source = r.gate.segment === `enc:${r.meta.enc}` ? "" : `; estimate from ${segmentName(r.gate.segment)} n=${r.gate.n}`;
    const few = r.encounterN < r.minRows ? "; few similar states for this encounter" : "";
    facts["history_estimate"] = `further HP loss ${Math.round(forecast.hpLoss)}, win ${Math.round(forecast.winProb * 100)}% (this encounter n=${r.encounterN}${source}, typical error ±${HISTORY_MAE[r.meta.kind]}${few})`;
  }
  return facts;
}

/**
 * The turn-by-turn picture of one line: turn 1 is the line itself, exact; later turns are the samples'
 * HP lost and damage dealt that turn (mean, [min-max] over the samples still fighting it), and how many
 * samples are alive / have won by its end. No discount: the spread shows how uncertain later turns are.
 */
export function turnsText(plan: Plan, line: LineEstimate, samples: number): string {
  const o = plan.outcome;
  const first = `T1 exact: hp -${o.hpLoss}, dmg ${o.damageDealt}${o.winsFight ? ", won" : o.dies ? ", dead" : ""}`;
  const later = line.perTurn.map((t) =>
    t.fighting === 0
      ? `T${t.turn}: over (alive ${t.alive}/${samples}, won ${t.won}/${samples})`
      : `T${t.turn}: hp -${round1(t.loss.mean)} [${Math.round(t.loss.min)}-${Math.round(t.loss.max)}], dmg ${round1(t.dmg.mean)} [${Math.round(t.dmg.min)}-${Math.round(t.dmg.max)}], alive ${t.alive}/${samples}, won ${t.won}/${samples}`,
  );
  return [first, ...later].join("; ");
}

/** A gate segment key in words: "ak:1|hallway" -> "act-1 hallway fights". */
export function segmentName(segment: string): string {
  const ak = /^ak:(\d+)\|(\w+)$/.exec(segment);
  if (ak) return `act-${ak[1]} ${ak[2]} fights`;
  const k = /^k:(\w+)$/.exec(segment);
  if (k) return `${k[1]} fights`;
  if (segment.startsWith("enc:")) return `encounter ${segment.slice(4)}`;
  return segment === "global" ? "all fights" : segment;
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
    ...(r.saturated ? { saturated: true } : {}),
    ...(r.result.orders.length > 0
      ? {
          orders: r.result.orders.length,
          orders_dropped: r.ordersDropped,
          best_order: r.best ? (r.byPlan.get(r.best)?.order?.label ?? null) : null,
        }
      : {}),
  };
}

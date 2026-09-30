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
import { appliedPowerIds, countsAt, moveDamageAt, nearestAscension, regularEffect, selfGainAt, shownDamageAt, spawnsAt, type MoveEntry } from "../knowledge/monster-db.js";
import type { GameState } from "../mod/schema.js";
import type { ScreenMemory } from "../project/types.js";
import { asArray, asRecord, str, type JsonValue } from "../util/json.js";
import { ENERGY_RELICS, PONDER_HEAL, SIPHON_HEAL } from "./boss-clock.js";
import { offHandCardModel, type CardModel } from "./card-model.js";
import { loadFightValueModel, type FightValueModel } from "./fight-value.js";
import {
  gateFor,
  ENEMY_SELF_POWERS,
  LEADER_HP_TIE,
  killOrders,
  UNKNOWN_STATUS,
  loadFightValueGates,
  PLAYER_DEBUFFS,
  rolloutDecision,
  type DeckSummary,
  type EnemyMove,
  type EnemySelfPower,
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
  type PlayerDebuff,
  type RolloutEnemy,
  type RolloutInput,
  type RolloutResult,
  type SpawnTemplate,
} from "./rollout.js";
import { hpText, type EnemySim, type Plan, type SolverInput } from "./turn-solver.js";

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

export interface MonsterDbMove extends MoveEntry {
  block_gained?: Record<string, number>;
  /** The same by ascension (the Matriarch's Slash 2: 12 up to A7, 14 from A8; pooled a 30/30 tie). */
  block_gained_by_asc?: Record<string, Record<string, number>>;
  avg_total_shown?: number;
}

export type MonsterMoves = Record<string, { moves?: Record<string, MonsterDbMove>; name?: { zh?: string }; hp_by_asc?: Record<string, { median?: number }> }>;

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

/**
 * The powers a move puts on us (rollout.ts PLAYER_DEBUFFS): the most common amount of each in the monster
 * DB's player_powers_applied at this ascension, the nearest logged one else, the pooled counts when the
 * DB has no per-ascension split (Terror Eel's Terror: Vulnerable 99 at every ascension).
 */
export function playerPowersOf(entry: MoveEntry, asc: number): Pick<EnemyMove, "playerPowers" | "playerPowerChoice"> {
  const found = nearestAscension(entry.player_powers_applied_by_asc, asc);
  const counts = found ? entry.player_powers_applied_by_asc![found.key]! : entry.player_powers_applied ?? {};
  const all: Partial<Record<PlayerDebuff, number>> = {};
  for (const id of PLAYER_DEBUFFS) {
    const amount = mode(counts[id]);
    if (amount) all[id] = amount;
  }
  if (Object.keys(all).length === 0) return {};
  // Alternatives (each use put one of them on us: the Knowledge Demon's Curse of Knowledge), in the order they
  // were picked here; not a choice: only what the move does itself, not a rare leak (monster-db appliedPowerIds).
  const uses = (id: string, table: Record<string, Record<string, number>> | undefined) => Object.values(table?.[id] ?? {}).reduce((sum, n) => sum + n, 0);
  const applied = appliedPowerIds(entry, Object.keys(all));
  const alternatives = applied.choice;
  const ids = applied.ids as PlayerDebuff[];
  const out: Partial<Record<PlayerDebuff, number>> = Object.fromEntries(ids.map((id) => [id, all[id]!]));
  if (ids.length === 0) return {};
  if (!alternatives) return { playerPowers: out };
  const order = [...ids].sort((a, b) => uses(b, counts) - uses(a, counts) || uses(b, entry.player_powers_applied) - uses(a, entry.player_powers_applied));
  return { playerPowers: out, playerPowerChoice: order };
}

/** The rollout's other self-buffs of a move (rollout.ts ENEMY_SELF_POWERS) at this ascension (selfGainAt). */
export function selfPowersOf(entry: MoveEntry, asc: number): { selfPowers?: Partial<Record<EnemySelfPower, number>> } {
  const out: Partial<Record<EnemySelfPower, number>> = {};
  for (const id of ENEMY_SELF_POWERS) {
    const amount = selfGainAt(entry, id, asc);
    if (amount) out[id] = amount;
  }
  return Object.keys(out).length > 0 ? { selfPowers: out } : {};
}

/**
 * HP a Heal move gives its user at this ascension: the monster DB's heal_by_asc (the nearest logged
 * ascension), else the boss clock's logged numbers for the two bosses that heal (Siphon 10, 15 from A8;
 * Ponder 30), else none.
 */
export function healOf(id: string, move: string, entry: MoveEntry | undefined, asc: number): number {
  const logged = mode(countsAt(entry?.heal_by_asc, undefined, asc));
  if (logged) return logged;
  if (id === "WATERFALL_GIANT" && move === "SIPHON_MOVE") return asc >= 8 ? SIPHON_HEAL.a8 : SIPHON_HEAL.base;
  if (id === "KNOWLEDGE_DEMON" && move === "PONDER_MOVE") return PONDER_HEAL;
  return 0;
}

/**
 * The status cards a move puts in our piles (rollout.ts EnemyMove.statusCards): the intent's most common
 * count (status_cards), the most common card it added (status_card_ids; null when the DB has none) and pile
 * (status_card_pile, the discard pile when unknown).
 */
export function statusCardsOf(entry: MoveEntry): Pick<EnemyMove, "statusCards"> {
  const count = mode(entry.status_cards);
  if (!count) return {};
  const cardId = Object.entries(entry.status_card_ids ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const pile = (entry.status_card_pile?.["draw"] ?? 0) > (entry.status_card_pile?.["discard"] ?? 0) ? "draw" : "discard";
  return { statusCards: [{ cardId, count, pile }] };
}

/**
 * A status card as a pile card (combat-plan pileCardModels' model of the ones already in the piles): its
 * game text's held penalty (Beckon 6, Burn 2), never played.
 */
export function statusCardModel(cardId: string, knowledge: Knowledge, index: number): CardModel {
  return { ...offHandCardModel(null, cardId, false, index, knowledge), validTargets: [] };
}

/** An enemy's move table for the rollout: monster DB damage/hits/Strength/Block per move, move-model successors. */
export function enemyTable(id: string, asc: number, db: MonsterMoves, mm: MoveModelData): EnemyTable | undefined {
  const moves = db[id]?.moves;
  const learned = mm[id];
  if (!moves && !learned) return undefined;
  const table: EnemyTable = { moves: {}, next: {} };
  for (const [move, entry] of Object.entries(moves ?? {})) {
    // At this ascension when logged there; else the nearest logged one's scaled by the measured ratio
    // (A9 hits harder than A8: 110 of 122 moves), marked estimated. A move whose base was never measured
    // (every logged turn had a debuff in the way: the Queen's Off With Your Head and Execution, the Amalgam's
    // Beam and Tackles) is its most common shown hit, Strength and our Vulnerable already in it, with its
    // own hits (7x5, not one 43 re-scaled to 67; consistency #4).
    const logged = moveDamageAt(db, id, move, asc);
    const shown = logged ? null : shownDamageAt(db, id, move, asc);
    const hits = logged?.hits ?? shown?.hits ?? 1;
    const avg = learned?.damage[move] ?? entry.avg_total_shown ?? 0;
    table.moves[move] = {
      damage: logged?.perHit ?? shown?.perHit ?? (avg > 0 ? avg / hits : 0),
      hits,
      ...(shown ? { shown: true } : {}),
      // Buffs at this ascension (nearest logged; A9 Ritual/Charge Up/Salivate +3 where A8 is +2), not pooled.
      strength: selfGainAt(entry, "STRENGTH_POWER", asc) ?? 0,
      block: regularEffect(entry, entry.block_gained) ? (mode(countsAt(entry.block_gained_by_asc, entry.block_gained, asc)) ?? 0) : 0,
      ...(entry.self_powers_gained?.["BURROWED_POWER"] ? { burrows: true } : {}),
      ...(selfGainAt(entry, "VIGOR_POWER", asc) ? { vigor: selfGainAt(entry, "VIGOR_POWER", asc)! } : {}),
      ...selfPowersOf(entry, asc),
      ...(healOf(id, move, entry, asc) > 0 ? { heal: healOf(id, move, entry, asc) } : {}),
      ...statusCardsOf(entry),
      ...playerPowersOf(entry, asc),
      ...(logged?.estimated || shown?.estimated ? { estimated: true } : {}),
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

/** The fight turn an energy relic starts giving on (「从你的第3回合开始」, Bread's first turn a loss). */
const RELIC_ENERGY_FROM: Record<string, number> = { PAELS_FLESH: 3, BREAD: 2 };

/**
 * The energy relics held (boss-clock ENERGY_RELICS: 1 energy a turn that run.max_energy does not show), as
 * the rollout's later turns get them (rollout.ts RolloutInput.relicEnergy). A Pumpkin Candle that has gone out
 * (stack 0: logged 3 energy, 4 while lit) gives none.
 */
export function relicEnergyOf(runRaw: Record<string, unknown>): { amount: number; from: number }[] {
  return asArray(runRaw["relics"])
    .map(asRecord)
    .filter((relic) => ENERGY_RELICS.has(str(relic["relic_id"])) && !(str(relic["relic_id"]) === "PUMPKIN_CANDLE" && relic["stack"] === 0))
    .map((relic) => ({ amount: 1, from: RELIC_ENERGY_FROM[str(relic["relic_id"])] ?? 1 }));
}

/**
 * Captain's Wheel: 「在你的第三回合开始时，获得{Block}点格挡」 — 18 (logged over 4 runs holding it: 19 of 20 third turns
 * began with 18 block before any card, 23 once with 5 from elsewhere; turns 1, 2, 4-12 with none). DHGT6Z3Q7VAP F33:
 * T3 began with the Wheel's 18; the rollouts from T1 and T2 had that turn at -9.6.
 */
export const CAPTAINS_WHEEL_BLOCK = 18;
export const CAPTAINS_WHEEL_TURN = 3;

/** The relics that give block at the start of one fight turn, as the rollout's later turns get it (RolloutInput.relicBlock). */
export function relicBlockOf(runRaw: Record<string, unknown>): { amount: number; turn: number }[] {
  return asArray(runRaw["relics"])
    .map(asRecord)
    .filter((relic) => str(relic["relic_id"]) === "CAPTAINS_WHEEL")
    .map(() => ({ amount: CAPTAINS_WHEEL_BLOCK, turn: CAPTAINS_WHEEL_TURN }));
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
    return offHandCardModel(own, str(own["card_id"]), own["upgraded"] === true, 900 + i, knowledge);
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
       * add; ties by enemy HP left, then turns survived; saturated boards by deaths, HP lost this turn, then
       * enemy HP left and turns survived; null when that ties too (pickRolloutBest).
       */
      best: Plan | null;
      /**
       * Shown lines that tie for the best as Jev reads them (rolloutTies: the same expected further HP loss as
       * shown and the same deaths), two or more, `best` then null; empty when one line is the best.
       */
      tied: Plan[];
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
      /** The revives held (Fairy in a Bottle, Lizard Tail) by name: a sample reaching 0 HP goes on at theirs. */
      revives: string[];
      /** The most a line can lose: our HP now plus the revives' HP (the estimates are capped at it). */
      lossCap: number;
      /** Kill-order permutations left out (more than MAX_FULL_ORDER_GROUPS groups). */
      ordersDropped: number;
      elapsedMs: number;
    };

const drinks = (plan: Plan) => plan.steps.some((step) => step.cardId.startsWith("POTION:"));

/**
 * The line a drink line is without its potion(s) when the drink changes nothing: every drink's effect is this
 * turn's alone (turnOnlyDrink), the same card steps (card, hand index, target) and the same outcome (3SBPKG9603WD boss T3: Flex
 * after the last attack, 62.5 vs 64.1 by sampling noise, and Jev drank it). Null when there is none. The drink
 * line stays an option (Dai: potions are never filtered); it is only told apart.
 */
export function noEffectTwin(plan: Plan, plans: Plan[]): Plan | null {
  if (!drinks(plan)) return null;
  // Only a drink whose whole effect is this turn's can be told "no effect" by this turn's outcome: one that lasts
  // (Powdered Demise, a debuff, a power: turn-solver turnOnlyDrink) never is (ARKG3JFT26HC F17 boss: Demise
  // marked no effect on 30 of 34 questions and given the dry line's rollout).
  if ((plan.outcome.lastingDrinks ?? 0) > 0) return null;
  const cards = (line: Plan): string =>
    line.steps
      .filter((step) => !step.cardId.startsWith("POTION:"))
      .map((step) => `${step.cardId}|${step.cardIndex}|${step.target ?? "-"}`)
      .join(">");
  const turn = (line: Plan): string => JSON.stringify(line.outcome);
  return plans.find((other) => other !== plan && !drinks(other) && cards(other) === cards(plan) && turn(other) === turn(plan)) ?? null;
}

/** rollout.ts's `degraded` tag when the time budget left no rollout, only the 1-turn estimate. */
const FALLBACK_TAG = "1-turn";

/** A line whose expected further loss is within this much of the HP we have, winning in no sample, is saturated. */
export const SATURATED_HP = 1;
/** Enemy HP left within this much, and turns survived within ROLLOUT_TURNS_TIE, is a tie. */
export const ROLLOUT_ENEMY_HP_TIE = 1;
export const ROLLOUT_TURNS_TIE = 0.1;

/** Our own HP lost this turn (the line's exact first turn): a saturated board's second key, after deaths. */
const turnLoss = (line: LineEstimate): number => line.plan.outcome?.hpLoss ?? 0;

/**
 * The rollout's best line: the highest value (-E[HP loss] - 40 x (1 - win)); lines tied on it are told
 * apart by the enemy HP left at the horizon (least first), then the turns we stay alive (most first),
 * then code's order. When every line is saturated (its loss capped at the HP we have, no sample won) the
 * value says nothing: the samples dead within the horizon decide first (fewest), then the HP this turn
 * loses (least), then the enemy HP left and turns alive; when they all tie there is no best line and the
 * lines tied are returned (HEACJRY5LEVD F17 T2: all three lines "further loss 69" = our HP; T6: 49 vs 48.9
 * by one sample's HP; 8V0HD9Y207WY F17 T1-T2: all ten lines 62, and the first was tagged best;
 * CJ88575SQS6H F17 T2: "-14, dead 5/8" was tagged best over "-2, dead 1/8" by enemy HP left).
 * With a leader (its death ends the fight, the others are minions: The Kin's Priest; not the Queen) its HP
 * left comes first among those, within LEADER_HP_TIE of the least, as the kill orders are ranked (rankOrders):
 * summed enemy HP counted the minions as progress (W2TBR2YUMQ5Y F17 T2: Fiend Fire into a Follower was the best).
 */
export function pickRolloutBest(lines: LineEstimate[], startHp: number): { best: LineEstimate | null; saturated: boolean; tied?: LineEstimate[] } {
  if (lines.length === 0) return { best: null, saturated: false };
  const saturated = lines.every((line) => line.wins === 0 && line.hpLoss >= startHp - SATURATED_HP);
  const top = Math.max(...lines.map((line) => line.value));
  let contenders = saturated ? lines : lines.filter((line) => line.value === top);
  if (saturated) {
    // Deaths within the horizon, then this turn's loss: what still differs when the expected loss is capped.
    const fewest = Math.min(...contenders.map((line) => line.deaths));
    contenders = contenders.filter((line) => line.deaths === fewest);
    const least = Math.min(...contenders.map(turnLoss));
    contenders = contenders.filter((line) => turnLoss(line) === least);
  }
  if (contenders.every((line) => line.leaderHpLeft !== null && line.leaderHpLeft !== undefined)) {
    const leastLeader = Math.min(...contenders.map((line) => line.leaderHpLeft!));
    contenders = contenders.filter((line) => line.leaderHpLeft! <= leastLeader + LEADER_HP_TIE);
  }
  // The least enemy HP left and every line within ROLLOUT_ENEMY_HP_TIE of it; among those the most turns
  // alive (a stable sort: code's order among equals).
  const least = Math.min(...contenders.map((line) => line.enemyHpLeft));
  const near = contenders.filter((line) => line.enemyHpLeft < least + ROLLOUT_ENEMY_HP_TIE).sort((a, b) => b.turnsSurvived - a.turnsSurvived);
  if (saturated && near.length >= 2 && near[0]!.turnsSurvived - near[1]!.turnsSurvived < ROLLOUT_TURNS_TIE) {
    return { best: null, saturated, tied: near.filter((line) => near[0]!.turnsSurvived - line.turnsSurvived < ROLLOUT_TURNS_TIE) };
  }
  return { best: near[0]!, saturated };
}

/** Two lines read the same to Jev: the expected further HP loss as shown (one decimal) and the share of samples dead. */
export function sameShownResult(a: LineEstimate, b: LineEstimate): boolean {
  return round1(a.hpLoss) === round1(b.hpLoss) && a.deaths * b.samples === b.deaths * a.samples;
}

/**
 * The rollout's best among the shown options, or the shown options tied for it (Dai 2026-09-29; consistency
 * #6: in 380 of 2775 flagged questions another option showed the same numbers, and the flag fell on code's
 * first line by float noise). On a board that is not saturated, the eligible lines that read the same as the
 * best (sameShownResult; enemy HP left and damage do not break it): two or more of them shown, none is the
 * best and they are all tied; one shown, it is the best (an unshown line as good adds nothing); none shown,
 * the best as before (added alone). A saturated board keeps pickRolloutBest's order; the shown lines it
 * leaves tied on every key are tied the same way.
 */
export function rolloutTies(picked: { best: LineEstimate | null; saturated: boolean; tied?: LineEstimate[] }, eligible: LineEstimate[], shown: Plan[]): { best: LineEstimate | null; tied: LineEstimate[] } {
  const best = picked.best;
  if (picked.saturated) {
    // Saturated lines tied on every key (pickRolloutBest): the shown ones are tied; one shown, it is the best.
    const shownTies = (picked.tied ?? []).filter((line) => shown.includes(line.plan));
    if (best === null && shownTies.length >= 2) return { best: null, tied: shownTies };
    if (best === null && shownTies.length === 1) return { best: shownTies[0]!, tied: [] };
    return { best, tied: [] };
  }
  if (best === null) return { best, tied: [] };
  const ties = eligible.filter((line) => sameShownResult(line, best));
  if (ties.length < 2) return { best, tied: [] };
  const shownTies = ties.filter((line) => shown.includes(line.plan));
  if (shownTies.length >= 2) return { best: null, tied: shownTies };
  return { best: shownTies[0] ?? best, tied: [] };
}

/**
 * The board's part of a rollout's input, one builder for the live facts and tools/rollout-backtest.ts (which
 * had no status cards, energy relics, spawns nor reviving illusions): the enemies (an illusion killed before
 * this decision, is_alive false with ILLUSION_POWER, stays at 0 HP and revives while its summoner lives), their
 * move tables at `asc` and their on-death spawns' (with those spawns), the status cards their moves add, the
 * energy relics, our powers and potions, and the hand's base cards (null: keep the hand card).
 */
export function boardRolloutInput(
  state: GameState,
  knowledge: Knowledge,
  solverInput: SolverInput,
  asc: number,
  db: MonsterMoves = monsterMoves(),
  mm: MoveModelData = moveModelData(),
): Pick<RolloutInput, "solver" | "enemies" | "tables" | "statusCards" | "relicEnergy" | "relicBlock" | "spawns" | "playerPowers" | "potions" | "onShuffle"> & { handBase: (CardModel | null)[] } {
  const combat = asRecord(state.raw["combat"]);
  const raw = asArray(combat["enemies"]).map(asRecord);
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
    .filter(({ e }) => reviving(e) && !solverInput.enemies.some((sim) => sim.index === (typeof e["index"] === "number" ? e["index"] : -1)))
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
  const solver = revivers.length > 0 ? { ...solverInput, enemies: [...solverInput.enemies, ...revivers] } : solverInput;
  const tables: Record<string, EnemyTable> = {};
  // On-death spawns (Phrog Parasite, Gremlin Merc): what comes, at this ascension, and their move tables.
  const spawns: Record<string, SpawnTemplate[]> = {};
  for (const e of enemies) {
    const found = spawnsAt(e.id, asc, db);
    if (found) spawns[e.id] = found;
  }
  for (const id of new Set([...enemies.map((e) => e.id), ...Object.values(spawns).flatMap((list) => list.map((spawn) => spawn.id))])) {
    const table = enemyTable(id, asc, db, mm);
    if (table) tables[id] = table;
  }
  // The status cards the enemies' moves can add (and the stand-in for one the DB does not name).
  const statusIds = new Set<string>([UNKNOWN_STATUS, "DAZED", "WOUND", "WITHER"]);
  for (const table of Object.values(tables)) for (const move of Object.values(table.moves)) for (const status of move.statusCards ?? []) if (status.cardId) statusIds.add(status.cardId);
  // Biiig Hug: a Soot into the draw pile at every shuffle.
  const hug = asArray(asRecord(state.run?.raw)["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === "BIIIG_HUG");
  if (hug) statusIds.add("SOOT");
  const statusCards = Object.fromEntries([...statusIds].map((id, k) => [id, statusCardModel(id, knowledge, 800 + k)]));
  const baseByKey = new Map(deckModels(state, knowledge).map((c) => [cardKey(c), c]));
  return {
    solver,
    enemies,
    tables,
    statusCards,
    relicEnergy: relicEnergyOf(asRecord(state.run?.raw)),
    ...(relicBlockOf(asRecord(state.run?.raw)).length > 0 ? { relicBlock: relicBlockOf(asRecord(state.run?.raw)) } : {}),
    ...(Object.keys(spawns).length > 0 ? { spawns } : {}),
    ...(hug && statusCards["SOOT"] ? { onShuffle: statusCards["SOOT"] } : {}),
    playerPowers: powersOf(asRecord(combat["player"])),
    potions: asArray(asRecord(state.run?.raw)["potions"]).filter((p) => asRecord(p)["occupied"]).length,
    handBase: solverInput.hand.map((card) => (card.type === "Potion" ? null : baseByKey.get(cardKey(card)) ?? null)),
  };
}

export function liveRollout(args: LiveRolloutArgs): LiveRollout {
  const now = rolloutLiveOptions.now ?? (() => performance.now());
  const start = now();
  const elapsed = () => now() - start;
  // Both piles empty is a real board (Glowwater drew the whole deck, ULQP F6 T2): the later turns draw what this
  // turn discards (nothing to reshuffle: no draw). Only a state without the piles has nothing to roll out from.
  if (!args.piles) return { available: false, reason: "no draw/discard piles in the state", elapsedMs: elapsed() };
  if (args.plans.length === 0) return { available: false, reason: "no line to roll out", elapsedMs: elapsed() };
  try {
    const { state, knowledge } = args;
    const meta = fightMetaOf(state, knowledge, args.memory);
    const board = boardRolloutInput(state, knowledge, args.solver, meta.asc);
    const model = args.model !== undefined ? args.model : loadFightValueModel();
    const gates = args.gates !== undefined ? args.gates : loadFightValueGates();
    const budgetMs = Math.max(0, rolloutLiveOptions.budgetMs - ROLLOUT_MARGIN_MS - (args.spentMs ?? 0) - elapsed());
    const { handBase, ...boardInput } = board;
    const result = rolloutDecision({
      ...boardInput,
      plans: args.plans,
      piles: { draw: args.piles.draw, discard: args.piles.discard, handBase },
      meta,
      mm: moveModelData(),
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
    // A drink that changes nothing this turn: its line reads the dry line's rollout numbers (they tie), not
    // numbers of its own that differ only by sampling noise.
    const plans = result.lines.map((line) => line.plan);
    const reused = result.lines.map((line): LineEstimate => {
      const twin = noEffectTwin(line.plan, plans);
      const dry = twin ? result.lines.find((other) => other.plan === twin) : undefined;
      return dry ? { ...dry, plan: line.plan, tags: line.tags, score: line.score, currentValue: line.currentValue, sameAsDry: twin! } : line;
    });
    if (reused.some((line, i) => line !== result.lines[i])) result.lines = reused;
    const byPlan = new Map(result.lines.map((line) => [line.plan, line]));
    // A line code did not show is only added when it drinks no potion (every modelled potion already
    // has its shown line; the rollout does not add a second drink). With kill orders a line's value is its
    // best order's: the best line is the best (line, order) pair.
    const eligible = result.lines.filter((line) => args.shown.includes(line.plan) || !drinks(line.plan));
    // A revive's HP counts as lost when spent: a line that spends it can lose more than the HP we have now.
    // The time budget's 1-turn fallback is a clock estimate, not a forecast: no best, never "saturated" (X7LU
    // F7 T1: 13 lines "further loss 54 = our HP, every line loses all our HP", history 26-32 and 99% wins).
    const lossCap = args.solver.player.hp + (args.solver.player.revives ?? []).reduce((sum, revive) => sum + revive.hp, 0);
    const picked = result.degraded.includes(FALLBACK_TAG) ? { best: null, saturated: false } : pickRolloutBest(eligible, lossCap);
    const ties = rolloutTies(picked, eligible, args.shown);
    return {
      available: true,
      result,
      byPlan,
      best: ties.best?.plan ?? null,
      tied: ties.tied.map((line) => line.plan),
      saturated: picked.saturated,
      meta,
      gate: gateFor(gates, meta.enc, meta.act, meta.kind),
      encounterN: gates?.segments[`enc:${meta.enc}`]?.n_rows ?? 0,
      minRows: gates?.params.min_rows ?? Infinity,
      potionsHeld: args.solver.hand.some((card) => card.type === "Potion"),
      revives: (args.solver.player.revives ?? []).map((revive) => revive.name),
      lossCap,
      ordersDropped: args.ordersDropped ?? 0,
      elapsedMs: elapsed(),
    };
  } catch (error) {
    return { available: false, reason: `error: ${String(error).slice(0, 120)}`, elapsedMs: elapsed() };
  }
}

// ---------------------------------------------------------------- facts

const round1 = (x: number) => Math.round(x * 10) / 10;

/**
 * Saturated boards: the expected loss is the same for every line, so what ranks them is shown: deaths
 * within the horizon, HP lost this turn, then the enemy HP left and turns alive (the leader's HP left first
 * when its death ends the fight).
 */
function saturatedNote(line: LineEstimate, r: LiveRollout & { available: true }): string {
  if (!r.saturated) return "";
  const leader = r.result.orders.find((order) => order.leader)?.leader?.name;
  const leaderText = leader && line.leaderHpLeft !== null && line.leaderHpLeft !== undefined ? `${leader} HP left ~${Math.round(line.leaderHpLeft)} (its death ends the fight), ` : "";
  return `; every line loses all our HP here, so the expected loss does not separate them: the lines are ranked by fewest dead within ${line.horizon} turns (this line ${line.deaths}/${line.samples}), then least HP lost this turn (this line ${turnLoss(line) < 0 ? `gains ${-turnLoss(line)}` : turnLoss(line)}), then ${leaderText}enemy HP left ~${Math.round(line.enemyHpLeft)} (at T${line.horizon} or at our death), alive ~${round1(line.turnsSurvived)} turns`;
}

/** The facts of one shown line. */
export function rolloutFacts(plan: Plan, r: LiveRollout): Record<string, JsonValue> {
  if (!r.available) return { rollout: `rollout unavailable (${r.reason})` };
  const line = r.byPlan.get(plan);
  if (!line) return { rollout: "rollout unavailable (line not evaluated)" };
  const { horizon, samples } = line;
  // The rollout ran past its time budget: this turn exactly and the clock's estimate of the rest. Not a
  // forecast: the estimate is capped at our HP, so a cap reached says nothing of the line dying.
  const fallback = r.result.degraded.includes(FALLBACK_TAG);
  const capped = line.hpLoss >= r.lossCap - SATURATED_HP;
  const fallbackText = `no rollout (it ran past its time budget; a fallback, not a forecast): this turn as shown, then a rough clock estimate of the rest of the fight, further HP loss ~${round1(line.hpLoss)}${capped ? " (the estimate's cap, our HP now: it does not mean this line dies, and does not tell the lines apart)" : ""}`;
  const cut = r.result.degraded.length > 0 ? ` [cut to fit the time budget: ${r.result.degraded.join(", ")}]` : "";
  const head = horizon > 1 ? `${horizon}-turn rollout (${samples} sample${samples === 1 ? "" : "s"})` : "1-turn estimate (no rollout)";
  const potions = r.potionsHeld ? " (later turns may use the potions still held)" : "";
  const facts: Record<string, JsonValue> = {
    rollout: fallback ? fallbackText : `${head}${potions}: expected further HP loss ${round1(line.hpLoss)}, fight over within ${horizon} turn${horizon === 1 ? "" : "s"} in ${line.wins}/${samples}${line.turnsToWin === null ? "" : `, expected turns to the end (surviving samples) ~${round1(line.turnsToWin)}`}${line.deaths > 0 ? `, dead within ${horizon} turns in ${line.deaths}/${samples} (~turn ${round1(line.turnsToDeath ?? 0)})` : ""}${line.timeUps ? `, out of time (the turn limit ended it unwon) in ${line.timeUps}/${samples}` : ""}${line.revived ? `, spends ${r.revives.join(" / ") || "a revive"} (back from 0 HP) in ${line.revived}/${samples} (the loss then counts all our HP now, and after the revive only what it loses)` : ""}${saturatedNote(line, r)}${cut}`,
    rollout_turns: turnsText(plan, line, samples),
  };
  if (line.order && !fallback) {
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
    // A line aiming only at an illusion is rolled out aiming at it on the later turns too (illusionFocusOrders).
    const kept = line.order.firstRevives === true && line.orders.length < r.result.orders.length;
    const compared = kept ? `this line aims only at ${first(best!.entry)} now, so its later turns keep aiming at it first (what doing this again each turn costs)` : `best of ${line.orders.length} kill orders compared`;
    facts["rollout_kill_order"] = `${best!.labels.join(" | ")}: the later turns aim at ${first(best!.entry)} first (${best!.entry.firstDown === null ? `${first(best!.entry)} is an illusion: it revives at full HP, so it is never dead for good` : `${first(best!.entry)} dead by T${horizon} in ${best!.entry.firstDown}/${samples}`}); ${compared}${dropped}${tied}${leaderNote}`;
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
  const first = `T1 exact: ${hpText(o.hpLoss)}, dmg ${o.damageDealt}${o.winsFight ? ", won" : o.dies ? ", dead" : o.revived ? `, revived at ${o.revived.hp} HP` : ""}`;
  const later = line.perTurn.map((t) =>
    t.fighting === 0
      ? `T${t.turn}: over (alive ${t.alive}/${samples}, won ${t.won}/${samples})`
      : `T${t.turn}: ${hpText(round1(t.loss.mean))} [${Math.round(t.loss.min)}-${Math.round(t.loss.max)}], dmg ${round1(t.dmg.mean)} [${Math.round(t.dmg.min)}-${Math.round(t.dmg.max)}], alive ${t.alive}/${samples}, won ${t.won}/${samples}`,
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
export function rolloutLog(r: LiveRollout, bestKey: string | null, added: boolean, tiedKeys: string[] = []): Record<string, JsonValue> {
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
    // The options tied for the best (no single best): their keys.
    ...(tiedKeys.length > 0 ? { tied: tiedKeys } : {}),
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

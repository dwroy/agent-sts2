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
import { appliedPowerIds, countsAt, moveBaseDamages, moveDamageAt, nearestAscension, regularEffect, selfGainAt, shownDamageAt, spawnsAt, type MoveEntry } from "../knowledge/monster-db.js";
import type { GameState } from "../mod/schema.js";
import type { ScreenMemory } from "../project/types.js";
import { asArray, asRecord, str, type JsonValue } from "../util/json.js";
import { ENERGY_RELICS, PONDER_HEAL, SIPHON_HEAL } from "./boss-clock.js";
import { offHandCardModel, type CardModel } from "./card-model.js";
import { loadFightValueModel, type FightValueModel } from "./fight-value.js";
import {
  DEATH_HP,
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
import { backShare, escapeInput, lootHpOf, thiefTag, type Thief, type ThiefSamples } from "./thief.js";
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
 * Test hooks: the clock, the budget, a switch (ROLLOUT_FACTS=off turns the facts off), the kill-order
 * policy's focus weight (measurements; rollout.ts ORDER_FOCUS_BONUS when unset), and a salt for the samples' seed
 * (tools/sl-retry-replay.ts: the same board on other random numbers, the sampling noise; unset: the board's own seed).
 */
export const rolloutLiveOptions: { enabled: boolean; now: (() => number) | null; budgetMs: number; orderFocusBonus?: number; seedSalt?: string } = {
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

export type MonsterMoves = Record<
  string,
  {
    moves?: Record<string, MonsterDbMove>;
    name?: { zh?: string };
    hp_by_asc?: Record<string, { median?: number }>;
    powers?: Record<string, { amount_at_first_sight_by_asc?: Record<string, Record<string, number>>; turn_at_first_sight_by_asc?: Record<string, Record<string, number>> }>;
  }
>;

/** Moves whose hit grows with each use (EnemyMove.growth; the step from monster-db moveBaseDamages). */
export const GROWING_DAMAGE_MOVES: Record<string, string[]> = { WATERFALL_GIANT: ["PRESSURE_GUN_MOVE"] };

/** Stun-threshold powers (Shriek, Plow) an enemy gets after its first turn (EnemyTable.shriekFrom). */
const LATER_SHRIEK_POWERS = ["PLOW_POWER", "SHRIEK_POWER"];

/**
 * A Shriek / Plow threshold first seen after turn 1 (the Ceremonial Beast's Plow: 150 at A8, 160 at A9, on turn 2): the
 * amount and turn most often first seen at this ascension (the nearest logged one else), or undefined.
 */
export function shriekFromOf(id: string, asc: number, db: MonsterMoves): { amount: number; turn: number } | undefined {
  for (const power of LATER_SHRIEK_POWERS) {
    const entry = db[id]?.powers?.[power];
    const found = nearestAscension(entry?.amount_at_first_sight_by_asc, asc);
    if (!entry || !found) continue;
    const amount = mode(entry.amount_at_first_sight_by_asc?.[found.key]);
    const turn = mode(entry.turn_at_first_sight_by_asc?.[found.key]);
    if (amount !== null && amount > 0 && turn !== null && turn > 1) return { amount, turn };
  }
  return undefined;
}

/** The damage a growing move's hit gains a use (GROWING_DAMAGE_MOVES): the most common step of its logged bases, or 0. */
export function growthOf(id: string, move: string, asc: number): number {
  if (!GROWING_DAMAGE_MOVES[id]?.includes(move)) return 0;
  const bases = moveBaseDamages(id, move, asc);
  const steps: Record<string, number> = {};
  for (let i = 1; i < bases.length; i += 1) steps[String(bases[i]! - bases[i - 1]!)] = (steps[String(bases[i]! - bases[i - 1]!)] ?? 0) + 1;
  return Math.max(0, mode(steps) ?? 0);
}

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
    const sandpit = selfGainAt(entry, "SANDPIT_POWER", asc);
    table.moves[move] = {
      damage: logged?.perHit ?? shown?.perHit ?? (avg > 0 ? avg / hits : 0),
      hits,
      ...(shown ? { shown: true } : {}),
      // B4, read by whole fights only: a Surrounded move's faced hit, a Sandpit it starts.
      ...(logged?.backAttackShare !== undefined && logged.base !== undefined ? { faceDamage: logged.base } : {}),
      ...(sandpit ? { sandpit } : {}),
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
      ...(growthOf(id, move, asc) > 0 ? { growth: growthOf(id, move, asc) } : {}),
    };
  }
  for (const [move, damage] of Object.entries(learned?.damage ?? {})) {
    if (!table.moves[move]) table.moves[move] = { damage, hits: 1, strength: 0, block: 0 };
  }
  table.next = learned?.next ?? Object.fromEntries(Object.entries(moves ?? {}).map(([m, e]) => [m, e.next ?? {}]));
  const shriekFrom = shriekFromOf(id, asc, db);
  if (shriekFrom) table.shriekFrom = shriekFrom;
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

/**
 * B2's turn relics for whole fights (fightRelicsOf), measured in the logs (logdb turns): Orichalcum's block when a turn
 * ends with none (13 of 18 enemy turns after a 0-block end took the intent less 6), Ripple Basin's when no Attack was
 * played (5 of 7: 4), Sturdy Clamp's block kept (turn-start block peaks at 10 without Barricade), Pendulum's card.
 */
export const ORICHALCUM_BLOCK = 6;
export const RIPPLE_BASIN_BLOCK = 4;
export const STURDY_CLAMP_BLOCK = 10;
export const PENDULUM_DRAW = 1;

/**
 * Relics whose energy or block comes on given fight turns and that relicEnergyOf / relicBlockOf leave out, for the whole
 * boss fight simulator only (RolloutInput.fightRelics; src/sim/boss-sim.ts, docs/boss-sim.md B1.5): the live planner and
 * the 5-turn rollout do not read them. Amounts as logged over the A7-A9 boss fights holding them (turn start energy /
 * block against the fights without): Candelabra 2 energy on turn 2 (22 fights: 5.2 against 3.1), Chandelier 3 on turn
 * 3 (15: 6.3), Horn Cleat 14 block on turn 2 (13: 14.5). Happy Flower: 1 energy every 3rd turn, its counter (stack) the
 * turns counted so far at `turn`, the decision's fight turn. Turns listed up to `upto`.
 */
export function fightRelicsOf(runRaw: Record<string, unknown>, turn: number, upto = 40): NonNullable<RolloutInput["fightRelics"]> {
  const energy: { amount: number; turn: number }[] = [];
  const block: { amount: number; turn: number }[] = [];
  const draws: { amount: number; turn: number }[] = [];
  let orichalcum = 0;
  let rippleBasin = 0;
  let blockKeep = 0;
  let iceCream = false;
  for (const relic of asArray(runRaw["relics"]).map(asRecord)) {
    const id = str(relic["relic_id"]);
    if (id === "CANDELABRA") energy.push({ amount: 2, turn: 2 });
    else if (id === "CHANDELIER") energy.push({ amount: 3, turn: 3 });
    else if (id === "HORN_CLEAT") block.push({ amount: 14, turn: 2 });
    else if (id === "HAPPY_FLOWER") {
      const counted = typeof relic["stack"] === "number" ? Math.max(0, Math.min(2, relic["stack"] as number)) : 0;
      for (let t = turn + 3 - counted; t <= upto; t += 3) energy.push({ amount: 1, turn: t });
    } else if (id === "PENDULUM") {
      // B2: every 3rd turn 1 card more (logged: the counter 0 on the turn it drew, a 6-card hand; 1 or 2 otherwise, 5).
      const counted = typeof relic["stack"] === "number" ? Math.max(0, Math.min(2, relic["stack"] as number)) : 0;
      for (let t = turn + 3 - counted; t <= upto; t += 3) draws.push({ amount: PENDULUM_DRAW, turn: t });
    } else if (id === "ORICHALCUM") orichalcum = ORICHALCUM_BLOCK;
    else if (id === "RIPPLE_BASIN") rippleBasin = RIPPLE_BASIN_BLOCK;
    else if (id === "STURDY_CLAMP") blockKeep = STURDY_CLAMP_BLOCK;
    else if (id === "ICE_CREAM") iceCream = true;
  }
  return {
    energy,
    block,
    ...(draws.length > 0 ? { draws } : {}),
    ...(orichalcum > 0 ? { orichalcum } : {}),
    ...(rippleBasin > 0 ? { rippleBasin } : {}),
    ...(blockKeep > 0 ? { blockKeep } : {}),
    ...(iceCream ? { iceCream } : {}),
  };
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
  /**
   * SL_RETRY_KNOWN_DRAWS (docs/sl.md §10): the draw pile's top cards in draw order, as indices into `piles.draw`, known
   * from an earlier attempt at this fight (RolloutInput.piles.drawTop). Absent: the pile shuffled, as before.
   */
  drawTop?: number[];
  /**
   * SL_RETRY_COMPUTE (docs/sl.md §10): the samples and the time budget of a retried fight's rollout (default
   * ROLLOUT_SAMPLES and rolloutLiveOptions.budgetMs).
   */
  samples?: number;
  budgetMs?: number;
  /** Wall clock already spent on this decision's budget (the random potions' Monte Carlo). */
  spentMs?: number;
  /** Kill orders for the later turns (rollout.ts killOrders; two or more distinct enemies), and how many were left out. */
  orders?: KillOrder[];
  ordersDropped?: number;
  /**
   * The "no potion this fight" line (Dai 2026-09-30): `line` a copy of the potion-free `base` (a shown line), rolled
   * out with no potion in its later turns. When the base line's own rollout drinks nothing later in any sample the
   * two are the same line: the copy is dropped (merged) and the base line is the no-potion line.
   */
  noPotion?: { line: Plan; base: Plan };
  /**
   * THIEF_FACTS (thief.ts): the thieves carrying our card or gold now. Given (an empty list included), an enemy whose
   * Escape / Flee resolves leaves the rollout's fight, and each line's samples count the loot back or gone
   * (RolloutInput.escapes); absent, the rollout as before (the enemy stays, doing nothing).
   */
  thieves?: Thief[];
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
       * add; ties by enemy HP left, then turns survived; saturated boards by deaths, then the fight's progress
       * (enemy HP left), turns survived and HP lost this turn; null when that ties too (pickRolloutBest).
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
      /** Some of them cost HP to drink (card.potionCost: potion-cost.ts): the policy weighs it. */
      potionCostsHeld: boolean;
      /** The revives held (Fairy in a Bottle, Lizard Tail) by name: a sample reaching 0 HP goes on at theirs. */
      revives: string[];
      /** The most a line can lose: our HP now plus the revives' HP (the estimates are capped at it). */
      lossCap: number;
      /** Kill-order permutations left out (more than MAX_FULL_ORDER_GROUPS groups). */
      ordersDropped: number;
      /**
       * The "no potion this fight" line: its own `line` (merged false: shown as an option of its own) or, merged, the
       * base line it is the same as (its own rollout drinks no potion later either). Null when none was asked for.
       */
      noPotion: { line: Plan; base: Plan; merged: boolean } | null;
      /** Wall clock the random potions' Monte Carlo took out of this decision's budget before the rollout (spentMs). */
      spentMs: number;
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
  // The drink's cost is not an effect: the outcome without it (potionCost) is what must be the same.
  const turn = (line: Plan): string => JSON.stringify({ ...line.outcome, potionCost: undefined });
  return plans.find((other) => other !== plan && !drinks(other) && cards(other) === cards(plan) && turn(other) === turn(plan)) ?? null;
}

/** rollout.ts's `degraded` tag when the time budget left no rollout, only the 1-turn estimate. */
const FALLBACK_TAG = "1-turn";

/** A line whose expected further loss is within this much of the HP we have, winning in no sample, is saturated. */
export const SATURATED_HP = 1;
/**
 * Fewer samples than this never make a board saturated: one sample (the time budget's cut, F4K88F267RCX F48 T1 "3-turn
 * rollout (1 sample)"; W80JV2YVC8UZ F48 T1) is one draw order, not "every line loses all our HP".
 */
export const SATURATED_MIN_SAMPLES = 2;
/** Enemy HP left within this much, and turns survived within ROLLOUT_TURNS_TIE, is a tie. */
export const ROLLOUT_ENEMY_HP_TIE = 1;
export const ROLLOUT_TURNS_TIE = 0.1;

/**
 * Our own HP lost this turn (the line's exact first turn): a saturated board's last key, after deaths and the fight's
 * progress. No potion cost here: when every line loses all our HP a potion kept has no later to be worth anything in
 * (potion-cost.ts). A healing drink's HP is not taken off (W80JV2YVC8UZ F48 T1: Blood Potion at 84/88 for +4 read as
 * the line losing the least): what the line loses to the turn, not the potion spent to refill it.
 */
const turnLoss = (line: LineEstimate): number => (line.plan.outcome?.hpLoss ?? 0) + (line.plan.outcome?.potionHeal ?? 0);

/**
 * The rollout's best line: the highest value (-E[HP loss] - 40 x (1 - win)); lines tied on it are told
 * apart by the enemy HP left at the horizon (least first), then the turns we stay alive (most first),
 * then code's order.
 *
 * Saturated boards (every line's loss capped at the HP we have, no sample won, SATURATED_MIN_SAMPLES samples or more):
 * the value says nothing, and what ranks
 * the lines is the fight's progress (fix-queue-v4, CDR0Q6929CKR F33, F4K88F267RCX F48, HME0FA7VA0J6 F33: in the clock
 * boss fights, the Insatiable's Sandpit, the Queen's Off With Your Head, the Knowledge Demon, every line is judged dead
 * from T1, and ranking by this turn's HP loss picked the turtle line turn after turn; CDR0 T5: -9 HP leaving the worm
 * ~116 over -16 leaving ~66). The keys, in order:
 *   1. the samples dead within the horizon (fewest): the only survival signal left (CJ88575SQS6H F17 T2: "-14, dead
 *      5/8" over "-2, dead 1/8" was wrong);
 *   2. with a leader (its death ends the fight, the others are minions: The Kin's Priest; not the Queen) its HP left,
 *      within LEADER_HP_TIE of the least, as the kill orders are ranked (rankOrders): summed enemy HP counted the
 *      minions as progress (W2TBR2YUMQ5Y F17 T2: Fiend Fire into a Follower was the best);
 *   3. the enemy HP left at the horizon or at our death (least, within ROLLOUT_ENEMY_HP_TIE): the damage the line and
 *      its later turns deal before the death the rollout forecasts. Every line loses the fight unless the enemy dies
 *      first, so this is the one number that measures a way out; it already counts what a power set up now deals
 *      later (Demon Form, Inferno) and what staying alive longer lets us deal;
 *   4. the turns we stay alive (most, within ROLLOUT_TURNS_TIE): more turns to draw an answer;
 *   5. the HP this turn loses (least): only when the fight's progress is the same.
 * When they all tie there is no best line and the lines tied are returned (HEACJRY5LEVD F17 T2: all three lines
 * "further loss 69" = our HP; 8V0HD9Y207WY F17 T1-T2: all ten lines 62, and the first was tagged best).
 * A boss the whole-fight simulation is trusted on (B2, docs/boss-sim.md) is ranked by that simulation instead
 * (combat-plan simRanks); this order is the rollout's own, for the low-trust bosses and every other fight.
 *
 * Not saturated, with a leader, its HP left comes first among the lines tied on the value, as above.
 * Potion costs (potion-cost.ts, Dai 2026-09-30): the value has each line's drinks taken off at their cost; when some
 * line pays one, the fewest deaths within the horizon come first, then the value (a cost never picks a line that dies
 * more often). A saturated board (every line loses all our HP) ranks without costs: a potion kept there has no
 * later. A sample that dies pays no cost either (rollout.ts valueAt). No cost (a boss fight, no potion): as before.
 * The thieves' loot (THIEF_COST, docs/thief.md §7) is a cost the same way: in the value, and deaths first when some
 * line pays it.
 */
export function pickRolloutBest(lines: LineEstimate[], startHp: number): { best: LineEstimate | null; saturated: boolean; tied?: LineEstimate[] } {
  if (lines.length === 0) return { best: null, saturated: false };
  const saturated = lines.every((line) => line.samples >= SATURATED_MIN_SAMPLES && line.wins === 0 && line.hpLoss >= startHp - SATURATED_HP);
  // With potion costs in play (some line pays for a drink: potion-cost.ts, never in a boss fight) deaths come first,
  // then the value (it has the cost taken off): a cost never makes a line that dies more often the best (Dai
  // 2026-09-30: a drink that keeps us alive is drunk whatever it costs). Without costs, the value alone, as before.
  const costs = lines.some((line) => (line.potionCost ?? 0) > 0 || (line.thiefCost ?? 0) > 0);
  const fewestDead = Math.min(...lines.map((line) => line.deaths));
  const pool = costs && !saturated ? lines.filter((line) => line.deaths === fewestDead) : lines;
  const top = Math.max(...pool.map((line) => line.value));
  let contenders = saturated ? lines.filter((line) => line.deaths === fewestDead) : pool.filter((line) => line.value === top);
  if (contenders.every((line) => line.leaderHpLeft !== null && line.leaderHpLeft !== undefined)) {
    const leastLeader = Math.min(...contenders.map((line) => line.leaderHpLeft!));
    contenders = contenders.filter((line) => line.leaderHpLeft! <= leastLeader + LEADER_HP_TIE);
  }
  // The least enemy HP left and every line within ROLLOUT_ENEMY_HP_TIE of it; among those the most turns
  // alive (a stable sort: code's order among equals).
  const least = Math.min(...contenders.map((line) => line.enemyHpLeft));
  const near = contenders.filter((line) => line.enemyHpLeft < least + ROLLOUT_ENEMY_HP_TIE).sort((a, b) => b.turnsSurvived - a.turnsSurvived);
  if (!saturated) return { best: near[0]!, saturated };
  // Saturated: the lines as alive as the longest-lived, then the least HP lost this turn; still two or more, a tie.
  const alive = near.filter((line) => near[0]!.turnsSurvived - line.turnsSurvived < ROLLOUT_TURNS_TIE);
  const leastLoss = Math.min(...alive.map(turnLoss));
  const last = alive.filter((line) => turnLoss(line) === leastLoss);
  return last.length >= 2 ? { best: null, saturated, tied: last } : { best: last[0]!, saturated };
}

/**
 * Two lines read the same to Jev: the expected further HP loss with the potions' (and the loot's) cost (the total shown, one decimal),
 * the share of samples dead, and the win chance the ranking counts (shown in whole percent: rankingNote).
 */
export function sameShownResult(a: LineEstimate, b: LineEstimate): boolean {
  return round1(effectiveFightLoss(a)) === round1(effectiveFightLoss(b)) && a.deaths * b.samples === b.deaths * a.samples && winPercent(a) === winPercent(b);
}

/** The win chance a line's ranking value counts, as shown: whole percent. */
const winPercent = (line: Pick<LineEstimate, "winProb">): number => Math.round((line.winProb ?? 0) * 100);

/**
 * How the rollout ranks a line that is not saturated, with the one number of it Jev did not see (fix-queue-v4 #12:
 * Z3DFG85QDRCD F46, the shown total said drinking was worse and the drink line was still the rollout's best): the
 * value is -(further loss + potion cost) - DEATH_HP x (1 - win chance), the win chance counting the samples that won
 * within the horizon and, for the rest, the end-of-horizon estimate (history model or clock). Shown, the ranking's
 * numbers are the question's.
 */
export function rankingNote(line: LineEstimate, deathsFirst = false): string {
  const cost = line.potionCost ?? 0;
  // THIEF_COST: the loot's cost in the value (absent with the switch off: the note as before).
  const loot = line.thiefCost !== undefined ? ` + loot cost ${round1(line.thiefCost)}` : "";
  const why = line.thiefCost !== undefined ? "some line pays a potion or loot cost" : "some line pays a potion cost";
  return `; ranked on ${deathsFirst ? `fewest dead first (${why}), then ` : ""}-(further loss${cost > 0 ? " + potion cost" : ""}${loot}) - ${DEATH_HP} x (1 - win chance): win chance ~${winPercent(line)}% (fights won in the samples, the others by the end-of-horizon estimate), value ${round1(line.value)}`;
}

/** A line's expected HP lost to the fight's end plus the potions it drinks at their cost (potion-cost.ts) and the loot it loses (THIEF_COST). */
export function effectiveFightLoss(line: Pick<LineEstimate, "hpLoss" | "potionCost" | "thiefCost">): number {
  return line.hpLoss + (line.potionCost ?? 0) + (line.thiefCost ?? 0);
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
    const budgetMs = Math.max(0, (args.budgetMs ?? rolloutLiveOptions.budgetMs) - ROLLOUT_MARGIN_MS - (args.spentMs ?? 0) - elapsed());
    const { handBase, ...boardInput } = board;
    const result = rolloutDecision({
      ...boardInput,
      // THIEF_COST: each thief's loot HP (thief.loot, set only with the switch on) is a cost in the value.
      ...(args.thieves ? { escapes: { ...escapeInput(args.thieves, monsterMoves()), ...(Object.keys(lootHpOf(args.thieves)).length > 0 ? { lootHp: lootHpOf(args.thieves) } : {}) } } : {}),
      plans: args.plans,
      piles: { draw: args.piles.draw, discard: args.piles.discard, handBase, ...(args.drawTop && args.drawTop.length > 0 ? { drawTop: args.drawTop } : {}) },
      meta,
      mm: moveModelData(),
      model,
      gates,
      options: {
        horizon: ROLLOUT_HORIZON,
        samples: args.samples ?? ROLLOUT_SAMPLES,
        budgetMs,
        seed: seedOf(`${fightId(state)}:${state.turn ?? "?"}${rolloutLiveOptions.seedSalt ?? ""}`),
        now,
        include: args.shown,
        ...(args.orders && args.orders.length >= 2 ? { orders: args.orders } : {}),
        ...(rolloutLiveOptions.orderFocusBonus !== undefined ? { orderFocusBonus: rolloutLiveOptions.orderFocusBonus } : {}),
        ...(args.noPotion ? { noPotionLine: args.noPotion.line } : {}),
      },
    });
    // The no-potion line is the base line itself when the base's rollout drinks nothing in its later turns (and this
    // turn: it is potion-free): merged, the copy is dropped. Otherwise the copy stays, an option of its own.
    let noPotion: { line: Plan; base: Plan; merged: boolean } | null = null;
    if (args.noPotion) {
      const base = result.lines.find((line) => line.plan === args.noPotion!.base);
      const merged = base !== undefined && Object.keys(base.laterDrinks ?? {}).length === 0;
      if (merged) result.lines = result.lines.filter((line) => line.plan !== args.noPotion!.line);
      if (merged || result.lines.some((line) => line.plan === args.noPotion!.line)) noPotion = { ...args.noPotion, merged };
    }
    // A drink that changes nothing this turn: its line reads the dry line's rollout numbers (they tie), not
    // numbers of its own that differ only by sampling noise.
    // (The no-potion copy is no drink line's twin: its later turns hold no potion, the twin's may.)
    const plans = result.lines.map((line) => line.plan).filter((plan) => plan !== args.noPotion?.line);
    const reused = result.lines.map((line): LineEstimate => {
      const twin = noEffectTwin(line.plan, plans);
      const dry = twin ? result.lines.find((other) => other.plan === twin) : undefined;
      // Its own drinks' cost stays its own (this turn's potion, and whatever its later turns drink): the HP numbers
      // are the dry line's, the value is theirs less this line's cost.
      if (!dry) return line;
      const cost = line.potionCost ?? 0;
      return { ...dry, plan: line.plan, tags: line.tags, score: line.score, currentValue: line.currentValue, sameAsDry: twin!, potionCost: cost, laterDrinks: line.laterDrinks ?? {}, value: dry.value + (dry.potionCost ?? 0) - cost };
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
      potionCostsHeld: args.solver.hand.some((card) => card.type === "Potion" && (card.potionCost ?? 0) > 0),
      revives: (args.solver.player.revives ?? []).map((revive) => revive.name),
      lossCap,
      ordersDropped: args.ordersDropped ?? 0,
      noPotion,
      spentMs: args.spentMs ?? 0,
      elapsedMs: elapsed(),
    };
  } catch (error) {
    return { available: false, reason: `error: ${String(error).slice(0, 120)}`, elapsedMs: elapsed() };
  }
}

// ---------------------------------------------------------------- facts

const round1 = (x: number) => Math.round(x * 10) / 10;

/**
 * Saturated boards: the expected loss is the same for every line, so what ranks them is shown (pickRolloutBest):
 * deaths within the horizon, then the fight's progress (the leader's HP left first when its death ends the fight, the
 * enemy HP left), the turns alive, and only then the HP lost this turn.
 */
function saturatedNote(line: LineEstimate, r: LiveRollout & { available: true }): string {
  if (!r.saturated) return "";
  const leader = r.result.orders.find((order) => order.leader)?.leader?.name;
  const leaderText = leader && line.leaderHpLeft !== null && line.leaderHpLeft !== undefined ? `${leader} HP left ~${Math.round(line.leaderHpLeft)} (its death ends the fight), ` : "";
  return `; every line loses all our HP here, so the expected loss does not separate them: the lines are ranked by fewest dead within ${line.horizon} turns (this line ${line.deaths}/${line.samples}), then the fight's progress: ${leaderText}least enemy HP left (this line ~${Math.round(line.enemyHpLeft)}, at T${line.horizon} or at our death), then most turns alive (this line ~${round1(line.turnsSurvived)}), then least HP lost this turn (this line ${turnLoss(line) < 0 ? `gains ${-turnLoss(line)}` : turnLoss(line)}${line.plan.outcome?.potionHeal ? `, before the ${line.plan.outcome.potionHeal} HP its potion heals` : ""})`;
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
  // The budget is shared with the random potions' Monte Carlo, run first: say when it took a share (DT1H1URTUAD8 F42).
  const mcShare = r.spentMs >= 1 ? `, ${Math.round(r.spentMs)} ms of it taken by the random potions' Monte Carlo` : "";
  const fallbackText = `no rollout (it ran past its time budget${mcShare}; a fallback, not a forecast): this turn as shown, then a rough clock estimate of the rest of the fight, further HP loss ~${round1(line.hpLoss)}${capped ? " (the estimate's cap, our HP now: it does not mean this line dies, and does not tell the lines apart)" : ""}`;
  const cut = r.result.degraded.length > 0 ? ` [cut to fit the time budget: ${r.result.degraded.join(", ")}]` : "";
  const head = horizon > 1 ? `${horizon}-turn rollout (${samples} sample${samples === 1 ? "" : "s"})` : "1-turn estimate (no rollout)";
  // The later turns drink a potion still held only when the turn gains more than its cost (potion-cost.ts); the
  // no-potion line's later turns hold none.
  const potions = line.noPotionFight
    ? " (the no-potion line: its later turns drink no potion)"
    : r.potionsHeld
      ? r.potionCostsHeld
        ? " (later turns may drink the potions still held, each when its turn gains more than the potion's cost)"
        : " (later turns may use the potions still held)"
      : "";
  const facts: Record<string, JsonValue> = {
    rollout: fallback ? fallbackText : `${head}${potions}: expected further HP loss ${round1(line.hpLoss)}, fight over within ${horizon} turn${horizon === 1 ? "" : "s"} in ${line.wins}/${samples}${line.turnsToWin === null ? "" : `, expected turns to the end (surviving samples) ~${round1(line.turnsToWin)}`}${line.deaths > 0 ? `, dead within ${horizon} turns in ${line.deaths}/${samples} (~turn ${round1(line.turnsToDeath ?? 0)})` : ""}${line.timeUps ? `, out of time (the turn limit ended it unwon) in ${line.timeUps}/${samples}` : ""}${line.revived ? `, spends ${r.revives.join(" / ") || "a revive"} (back from 0 HP) in ${line.revived}/${samples} (the loss then counts all our HP now, and after the revive only what it loses)` : ""}${r.saturated ? saturatedNote(line, r) : rankingNote(line, r.result.lines.some((other) => (other.potionCost ?? 0) > 0 || (other.thiefCost ?? 0) > 0))}${cut}`,
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
export function rolloutLog(r: LiveRollout, bestKey: string | null, added: boolean, tiedKeys: string[] = [], noPotionKey: string | null = null): Record<string, JsonValue> {
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
    // Potion costs in play (potion-cost.ts): some line pays for a drink; the no-potion line's option and whether it
    // was merged into a shown line.
    ...(r.result.lines.some((line) => (line.potionCost ?? 0) > 0) ? { potion_costs: true } : {}),
    ...(r.noPotion ? { no_potion: { key: noPotionKey, merged: r.noPotion.merged } } : {}),
    ...(r.result.orders.length > 0
      ? {
          orders: r.result.orders.length,
          orders_dropped: r.ordersDropped,
          best_order: r.best ? (r.byPlan.get(r.best)?.order?.label ?? null) : null,
        }
      : {}),
  };
}

// ---------------------------------------------------------------- thieves (THIEF_FACTS, thief.ts)

/**
 * A line's rollout numbers for a thief (RolloutInput.escapes: the samples whose loot is back or gone by the horizon,
 * under the line's best kill order), with the order whose later turns get it back most often when that is another
 * one; null without a rollout of the line.
 */
export function thiefSamples(line: LineEstimate | null | undefined, thief: Thief): ThiefSamples | null {
  const tag = thiefTag(thief);
  const counts = line?.thieves?.[tag];
  if (!line || !counts) return null;
  const others = line.orders.filter((entry) => entry.order !== line.order && (entry.thieves?.[tag]?.back ?? 0) > counts.back);
  const most = others.reduce<(typeof others)[number] | null>((a, b) => (a === null || (b.thieves?.[tag]?.back ?? 0) > (a.thieves?.[tag]?.back ?? 0) ? b : a), null);
  return { ...counts, samples: line.samples, ...(most ? { order: { label: most.order.label, back: most.thieves![tag]!.back } } : {}) };
}

/**
 * The rollout's line most often getting a thief's loot back before it leaves, under any of its kill orders (thief.ts
 * backShare; ties: the higher rollout value, then code's order), among the lines it may show (`eligible`), for a thief
 * that does not leave this turn (that one is thief.ts lastTurnKillLine's). A line in `shown` at that count is the one
 * (kept, not replaced); null when no sample of any line gets it back.
 */
export function rolloutKillLine(lines: LineEstimate[], eligible: (line: LineEstimate) => boolean, shown: Plan[], thieves: Thief[]): Plan | null {
  for (const thief of thieves) {
    if (thief.turnsLeft === 1) continue;
    const pool = lines.filter((line) => eligible(line) && thiefSamples(line, thief) !== null);
    if (pool.length === 0) continue;
    const back = (line: LineEstimate) => backShare(thiefSamples(line, thief)!);
    const most = Math.max(...pool.map(back));
    if (most <= 0) continue;
    const top = pool.filter((line) => back(line) === most);
    const inShown = shown.find((plan) => top.some((line) => line.plan === plan));
    if (inShown) return inShown;
    return [...top].sort((a, b) => b.value - a.value)[0]!.plan;
  }
  return null;
}

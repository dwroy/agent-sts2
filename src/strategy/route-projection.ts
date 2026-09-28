/**
 * HP projection along a map path for DeepSeek's route facts (BUILD_DECIDER=deepseek).
 *
 * The old projection priced every act-2 hallway at 22% of max HP and an elite at 2.5x that (55%), so on
 * QZQU F18 (69/80) all 8 candidate routes reached the boss at "~0/80" and DeepSeek picked 0 elites, as in
 * SFCE (projected 46/87 at the act-2 boss, arrived 82/97). Here a room costs the median logged HP change
 * of that room type in that act at this ascension (room-costs.json; the monster DB's won-fight losses when
 * a fight type is not logged), n on every number; the p75 cost is shown only as the risk line. Dead is
 * dead: HP that reaches 0 is not healed by a later rest.
 */

import { roomHpCost } from "../knowledge/monster-db.js";
import { measuredRoom } from "../knowledge/room-costs.js";

/** A rest heals 30% of max HP (the projection assumes resting, not smithing). */
export const REST_HEAL = 0.3;
/**
 * Share of a hallway fight's HP cost a "?" room carries when no "?" rooms are measured for the act (the
 * route model's old figure, 4V5T F20); measured "?" rooms replace it.
 */
export const UNKNOWN_HP_SHARE = 0.4;
/** Hallway cost as a fraction of max HP when nothing is measured for the act (the old model). */
const FALLBACK_HALLWAY_BY_ACT = [0.1, 0.22, 0.28];
const FALLBACK_ELITE_FACTOR = 2.5;

export interface RoomCostEntry {
  median: number;
  p75: number;
  /** Where the numbers come from, with n. */
  source: string;
}

export interface RoomCostModel {
  act: number;
  maxHp: number;
  monster: RoomCostEntry;
  elite: RoomCostEntry;
  unknown: RoomCostEntry;
}

const where = (at: number, asc: number): string => (at === asc ? `A${asc}` : `A${at} (A${asc} has too few)`);

/**
 * A room type's cost: the logged HP change across such rooms (room-costs.json, deaths counted as all the
 * entry HP); for fights without that, the monster DB's won-fight losses pooled over the act's
 * encounters; else the old fixed model.
 */
function entry(act: number, asc: number, room: "Monster" | "Elite" | "Unknown", fallback: () => RoomCostEntry): RoomCostEntry {
  const measured = measuredRoom(act, asc, room);
  if (measured) return { median: Math.max(0, measured.median), p75: Math.max(0, measured.p75), source: `logged ${where(measured.asc, asc)} act-${act} ${room} rooms, n=${measured.n}${measured.deaths ? ` incl. ${measured.deaths} deaths` : ""}` };
  if (room !== "Unknown") {
    const db = roomHpCost(act, asc, room);
    if (db) return { median: db.median, p75: db.p75, source: `monster DB ${where(db.asc, asc)} won fights, n=${db.n} over ${db.encounters} encounters` };
  }
  return fallback();
}

export function roomCostModel(act: number, asc: number, maxHp: number): RoomCostModel {
  const base = FALLBACK_HALLWAY_BY_ACT[Math.min(Math.max(act, 1), FALLBACK_HALLWAY_BY_ACT.length) - 1]! * maxHp;
  const old = (cost: number): RoomCostEntry => ({ median: cost, p75: cost, source: "nothing logged: old fixed model" });
  const monster = entry(act, asc, "Monster", () => old(base));
  return {
    act,
    maxHp,
    monster,
    elite: entry(act, asc, "Elite", () => old(base * FALLBACK_ELITE_FACTOR)),
    unknown: entry(act, asc, "Unknown", () => ({ median: UNKNOWN_HP_SHARE * monster.median, p75: UNKNOWN_HP_SHARE * monster.p75, source: `nothing logged: ${Math.round(UNKNOWN_HP_SHARE * 100)}% of a hallway fight` })),
  };
}

/** HP lost in a room of this type (0 for rooms that are not fights), at the median or p75 cost. */
export function roomCost(type: string, model: RoomCostModel, which: "median" | "p75"): number {
  if (type === "Monster") return model.monster[which];
  if (type === "Elite") return model.elite[which];
  if (type === "Unknown") return model.unknown[which];
  return 0;
}

/** HP after a room entered with `hp` (absolute). Rests heal, but never raise the dead. */
export function hpAfterRoom(type: string, hp: number, model: RoomCostModel, which: "median" | "p75"): number {
  if (hp <= 0) return hp;
  if (type === "RestSite" || type === "Rest") return Math.min(model.maxHp, hp + REST_HEAL * model.maxHp);
  return hp - roomCost(type, model, which);
}

export interface PathProjection {
  /** HP on arrival at each step, at median room costs (<= 0: ran out before this step). */
  arrival: number[];
  /**
   * HP after each room if that one room costs its p75 (every room before it at the median): the risk of
   * a single bad fight. p75 is not compounded over the path (a sum of p75s is far rarer than p75).
   */
  riskAfter: number[];
  /** Step index (0-based) of the room at which the median projection runs out, else null. */
  runsOut: number | null;
  /** The room whose p75 cost leaves the least HP (fights and "?" rooms only), else null. */
  riskLow: { hp: number; step: number } | null;
  /** HP after the last room (median). */
  end: number;
}

export function projectPath(types: string[], startHp: number, model: RoomCostModel): PathProjection {
  const arrival: number[] = [];
  const riskAfter: number[] = [];
  let hp = startHp;
  let runsOut: number | null = null;
  let riskLow: { hp: number; step: number } | null = null;
  types.forEach((type, step) => {
    arrival.push(hp);
    const after = hpAfterRoom(type, hp, model, "median");
    const risky = hp > 0 ? hpAfterRoom(type, hp, model, "p75") : hp;
    riskAfter.push(risky);
    if (hp > 0 && roomCost(type, model, "p75") > 0 && (riskLow === null || risky < riskLow.hp)) riskLow = { hp: risky, step };
    if (runsOut === null && hp > 0 && after <= 0) runsOut = step;
    hp = after;
  });
  return { arrival, riskAfter, runsOut, riskLow, end: hp };
}

/** The per-room costs the projection used, with their sources and n (the route plan's note). */
export function roomCostNote(model: RoomCostModel): string {
  const r = (value: number): string => String(Math.round(value * 10) / 10);
  const one = (label: string, cost: RoomCostEntry): string => `${label} ${r(cost.median)} HP (p75 ${r(cost.p75)}; ${cost.source})`;
  return (
    `HP projection per room, act ${model.act}: ${one("hallway fight", model.monster)}, ${one("elite", model.elite)}, ${one('"?" room', model.unknown)}; ` +
    `logged costs are entry HP minus HP on the next floor (after Burning Blood, potions, events); a room the run died in counts as all its entry HP; ` +
    `a rest site is assumed to heal ${Math.round(REST_HEAL * 100)}% of max HP (smithing instead heals nothing). ` +
    "hp figures chain the median costs; hp_risk is the one room on the path whose p75 cost (the rooms before it at the median) leaves the least HP; HP that runs out is not healed by a later rest."
  );
}

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
 * The HP a rest heals before relics: 30% of max HP rounded down (the rest screen's HEAL text, 「回复最大生命值的30%
 * （N）」: N = floor(0.3 x max) at all 52 max HPs logged in states.jsonl to 09-29; 92 -> 27, 85 -> 25).
 */
export function baseRestHeal(maxHp: number): number {
  return Math.floor((maxHp * 3) / 10);
}

/**
 * Relics that change what resting does, measured in states.jsonl (09-29): Regal Pillow heals 15 more (74 HEAL
 * texts 「皇家枕头提供+15点生命。」; TQCZFBK7T09Y F25 45 -> 86/87 = 26 + 15, the rests at F9/F16 capped at max);
 * Stone Humidifier raises max HP by 5, HP with it (29 HEAL texts 「提升5点你的最大生命值。」; WFR4AUP2CWDT F8
 * 50/80 -> 79/85 = 24 + 5, Y0KJC2MQ57Z4 F9 15/80 -> 44/85). Eternal Feather heals on entering a rest site,
 * whatever is chosen there, by deck size: not modelled here.
 */
export const REST_RELICS: Record<string, { heal?: number; maxHp?: number; name: string }> = {
  REGAL_PILLOW: { heal: 15, name: "Regal Pillow" },
  STONE_HUMIDIFIER: { maxHp: 5, name: "Stone Humidifier" },
};

/** What a rest (HEAL) adds beyond the base heal. */
export interface RestHeal {
  /** HP healed on top of the base heal, capped at max HP like it (Regal Pillow). */
  bonus: number;
  /** Max HP gained by resting, HP with it (Stone Humidifier). */
  maxGain: number;
  /** "Regal Pillow +15 HP", "Stone Humidifier +5 max HP": for the notes. */
  sources: string[];
}

export const NO_REST_RELICS: RestHeal = { bonus: 0, maxGain: 0, sources: [] };

/** The rest relics among these relic ids. */
export function restHealOf(relicIds: readonly string[]): RestHeal {
  const out: RestHeal = { bonus: 0, maxGain: 0, sources: [] };
  for (const id of relicIds) {
    const relic = REST_RELICS[id];
    if (!relic) continue;
    out.bonus += relic.heal ?? 0;
    out.maxGain += relic.maxHp ?? 0;
    out.sources.push(`${relic.name} ${relic.heal ? `+${relic.heal} HP` : `+${relic.maxHp} max HP`}`);
  }
  return out;
}

/** HP and max HP after resting at `hp`/`max`: the base heal (the game's own number when known) and the relics. */
export function restedHp(hp: number, max: number, rest: RestHeal = NO_REST_RELICS, base = baseRestHeal(max)): { hp: number; max: number } {
  return { hp: Math.min(max, hp + base + rest.bonus) + rest.maxGain, max: max + rest.maxGain };
}

/** "30% of max HP (rounded down)", with the rest relics. */
function restHealText(rest: RestHeal | undefined): string {
  return `${Math.round(REST_HEAL * 100)}% of max HP${rest && rest.sources.length > 0 ? ` plus ${rest.sources.join(", ")}` : ""}`;
}
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
  /** Rest relics (Regal Pillow, Stone Humidifier): what every rest on the path adds; none when unset. */
  rest?: RestHeal;
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

export function roomCostModel(act: number, asc: number, maxHp: number, rest: RestHeal = NO_REST_RELICS): RoomCostModel {
  const base = FALLBACK_HALLWAY_BY_ACT[Math.min(Math.max(act, 1), FALLBACK_HALLWAY_BY_ACT.length) - 1]! * maxHp;
  const old = (cost: number): RoomCostEntry => ({ median: cost, p75: cost, source: "nothing logged: old fixed model" });
  const monster = entry(act, asc, "Monster", () => old(base));
  return {
    act,
    maxHp,
    monster,
    elite: entry(act, asc, "Elite", () => old(base * FALLBACK_ELITE_FACTOR)),
    unknown: entry(act, asc, "Unknown", () => ({ median: UNKNOWN_HP_SHARE * monster.median, p75: UNKNOWN_HP_SHARE * monster.p75, source: `nothing logged: ${Math.round(UNKNOWN_HP_SHARE * 100)}% of a hallway fight` })),
    ...(rest.sources.length > 0 ? { rest } : {}),
  };
}

/** HP lost in a room of this type (0 for rooms that are not fights), at the median or p75 cost. */
export function roomCost(type: string, model: RoomCostModel, which: "median" | "p75"): number {
  if (type === "Monster") return model.monster[which];
  if (type === "Elite") return model.elite[which];
  if (type === "Unknown") return model.unknown[which];
  return 0;
}

const isRest = (type: string): boolean => type === "RestSite" || type === "Rest";

/** HP after a room entered with `hp` (absolute) at max HP `max`. Rests heal (with the rest relics), but never raise the dead. */
export function hpAfterRoom(type: string, hp: number, model: RoomCostModel, which: "median" | "p75", max = model.maxHp): number {
  if (hp <= 0) return hp;
  if (isRest(type)) return restedHp(hp, max, model.rest).hp;
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
  /** Max HP on arrival at each step and after the last room: the start's, raised by rests with Stone Humidifier. */
  maxArrival: number[];
  maxEnd: number;
}

/** `startMax`: max HP at the start (an option that changes it); the model's by default. */
export function projectPath(types: string[], startHp: number, model: RoomCostModel, startMax = model.maxHp): PathProjection {
  const arrival: number[] = [];
  const riskAfter: number[] = [];
  const maxArrival: number[] = [];
  let hp = startHp;
  let max = startMax;
  let runsOut: number | null = null;
  let riskLow: { hp: number; step: number } | null = null;
  types.forEach((type, step) => {
    arrival.push(hp);
    maxArrival.push(max);
    const after = hpAfterRoom(type, hp, model, "median", max);
    const risky = hp > 0 ? hpAfterRoom(type, hp, model, "p75", max) : hp;
    riskAfter.push(risky);
    if (hp > 0 && roomCost(type, model, "p75") > 0 && (riskLow === null || risky < riskLow.hp)) riskLow = { hp: risky, step };
    if (runsOut === null && hp > 0 && after <= 0) runsOut = step;
    if (hp > 0 && isRest(type)) max = restedHp(hp, max, model.rest).max;
    hp = after;
  });
  return { arrival, riskAfter, runsOut, riskLow, end: hp, maxArrival, maxEnd: max };
}

/** The per-room costs the projection used, with their sources and n (the route plan's note). */
export function roomCostNote(model: RoomCostModel): string {
  const r = (value: number): string => String(Math.round(value * 10) / 10);
  const one = (label: string, cost: RoomCostEntry): string => `${label} ${r(cost.median)} HP (p75 ${r(cost.p75)}; ${cost.source})`;
  return (
    `HP projection per room, act ${model.act}: ${one("hallway fight", model.monster)}, ${one("elite", model.elite)}, ${one('"?" room', model.unknown)}; ` +
    `logged costs are entry HP minus HP on the next floor (after Burning Blood, potions, events); a room the run died in counts as all its entry HP; ` +
    `a rest site is assumed to heal ${restHealText(model.rest)} (smithing instead heals nothing). ` +
    "hp figures chain the median costs; hp_risk is the one room on the path whose p75 cost (the rooms before it at the median) leaves the least HP; HP that runs out is not healed by a later rest."
  );
}

/** The per-room costs in one line (the route review on card rewards and rest sites). */
export function roomCostBrief(model: RoomCostModel): string {
  const r = (cost: RoomCostEntry): string => `${Math.round(cost.median)}/${Math.round(cost.p75)}`;
  return (
    `HP a room costs in act ${model.act} (median/p75): hallway fight ${r(model.monster)}, elite ${r(model.elite)}, "?" room ${r(model.unknown)}; ` +
    `hp figures chain the medians and assume every later rest site heals ${restHealText(model.rest)} (smithing heals nothing).`
  );
}

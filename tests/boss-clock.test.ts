/**
 * Boss clock: the act boss's damage a turn, the deck's estimate, and what the gap changes (damage-card
 * bonus, smith preference, the run plan's input). The logged boards are the ones whose post-mortems
 * blamed the clock (notes/lessons.md, 2026-09-28): 64ZB Vantom, ERPH Waterfall Giant, 02L4 Ceremonial
 * Beast, D3X1 Test Subject, NZWR Knowledge Demon.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import {
  averageStrength,
  bossClock,
  bossClockJson,
  bossHp,
  bossProfile,
  calibrated,
  damageGap,
  deckDamagePerTurn,
  deckProfileForBoss,
  eruptionTurns,
  gapCardBonus,
  gapRestShift,
  GAP_BONUS_MAX,
  expectedEntryHp,
  mechanicFactor,
  REGAL_PILLOW_HEAL,
  ringingTurns,
} from "../src/strategy/boss-clock.js";
import { loggedKnowledge } from "./logged.js";
import { baseState, runPayload, testKnowledge } from "./scenarios.js";

type Raw = Record<string, unknown>;
const attack = (index: number, id: string, damage: number, cost = 1, extra: Raw = {}): Raw => ({
  index, card_id: id, name: id, upgraded: false, card_type: "Attack", rarity: "Common", costs_x: false, star_costs_x: false,
  energy_cost: cost, star_cost: 0, rules_text: "", resolved_rules_text: "", dynamic_values: [{ name: "Damage", base_value: damage, current_value: damage }], ...extra,
});
const skill = (index: number, id: string, cost = 1, dyn: Raw[] = []): Raw => ({
  index, card_id: id, name: id, upgraded: false, card_type: "Skill", rarity: "Common", costs_x: false, star_costs_x: false,
  energy_cost: cost, star_cost: 0, rules_text: "", resolved_rules_text: "", dynamic_values: dyn,
});
const power = (index: number, id: string, dyn: Raw[] = []): Raw => ({ ...skill(index, id, 3, dyn), card_type: "Power" });
const starter = (): Raw[] => [0, 1, 2, 3, 4].map((i) => attack(i, "STRIKE_IRONCLAD", 6)).concat([5, 6, 7, 8].map((i) => skill(i, "DEFEND_IRONCLAD")));
const mapState = (deck: Raw[], bossId = "KAISER_CRAB_BOSS", over: Raw = {}) =>
  parseGameState(baseState("MAP", { run: runPayload({ deck, boss_id: bossId, floor: 25, act_id: "1", ...over }) }));

const DIR = join(dirname(fileURLToPath(import.meta.url)), "logged-states");
const boards = JSON.parse(readFileSync(join(DIR, "boss-clock-boards.json"), "utf8")) as Record<string, { source: string; run: Raw }>;
const board = (key: string) => {
  const fx = boards[key];
  if (!fx) throw new Error(`no board ${key}`);
  return parseGameState(baseState("MAP", { run: runPayload(fx.run) }));
};

describe("boss clock", () => {
  it("uses A8 HP from ascension 8 (logged max_hp)", () => {
    const hp = (id: string, asc: number) => bossHp(bossProfile(id)!, asc);
    expect(hp("VANTOM_BOSS", 8)).toBe(183);
    expect(hp("VANTOM_BOSS", 7)).toBe(173);
    expect(hp("CEREMONIAL_BEAST_BOSS", 8)).toBe(262);
    expect(hp("KNOWLEDGE_DEMON_BOSS", 8)).toBe(399);
    expect(hp("THE_INSATIABLE_BOSS", 8)).toBe(341);
    expect(hp("KAISER_CRAB_BOSS", 8)).toBe(428);
    expect(hp("LAGAVULIN_MATRIARCH_BOSS", 8)).toBe(233);
    expect(hp("SOUL_FYSH_BOSS", 8)).toBe(221);
    expect(bossProfile("SLIME_BOSS")).toBeNull();
  });

  it("estimates more damage for a stronger deck, and counts energy relics (7DFB)", () => {
    const weak = deckDamagePerTurn(mapState(starter()), testKnowledge);
    const strong = deckDamagePerTurn(mapState([...starter(), attack(9, "CARNAGE", 20, 2), attack(10, "BLUDGEON", 32, 3)]), testKnowledge);
    expect(weak).toBeGreaterThan(0);
    expect(strong).toBeGreaterThan(weak);
    const heavy = [...starter(), attack(9, "BLUDGEON", 32, 3), attack(10, "BLUDGEON", 32, 3), attack(11, "BLUDGEON", 32, 3)];
    const antler = deckDamagePerTurn(mapState(heavy, "KAISER_CRAB_BOSS", { relics: [{ index: 0, relic_id: "BLESSED_ANTLER" }] }), testKnowledge);
    expect(antler).toBeGreaterThan(deckDamagePerTurn(mapState(heavy), testKnowledge));
  });

  it("counts growing Strength over the fight: Demon Form from its play turn, Toasty Mittens from T1, fed Rupture", () => {
    const plain = deckProfileForBoss(mapState(starter()), testKnowledge)!;
    const demon = deckProfileForBoss(mapState([...starter(), power(9, "DEMON_FORM", [{ name: "StrengthPower", base_value: 3, current_value: 3 }])]), testKnowledge)!;
    expect(demon.demonFormRate).toBe(3);
    // Played on turn 2 (9-card deck): +3 from T3; over 9 turns 3+6+…+21 = 84 -> 9.3 average.
    expect(averageStrength(demon, 9)).toBeCloseTo((3 * 7 * 8) / 2 / 9, 5);
    // Longer fights give more: the average is a ramp, not a flat 7.
    expect(averageStrength(demon, 12)).toBeGreaterThan(averageStrength(demon, 6));
    const mittens = deckProfileForBoss(mapState(starter(), "KNOWLEDGE_DEMON_BOSS", { relics: [{ index: 0, relic_id: "TOASTY_MITTENS" }] }), testKnowledge)!;
    expect(averageStrength(mittens, 10)).toBeCloseTo(5.5, 5);
    expect(averageStrength(plain, 10)).toBe(0);
    // Brimstone: +2 a turn from T1 (EZ2L F48: ignored, the gap read 99 while the deck dealt ~45).
    const brimstone = deckProfileForBoss(mapState(starter(), "QUEEN_BOSS", { relics: [{ index: 0, relic_id: "BRIMSTONE" }] }), testKnowledge)!;
    expect(averageStrength(brimstone, 10)).toBeCloseTo(11, 5);
    const rupture = deckProfileForBoss(mapState([...starter(), power(9, "RUPTURE"), attack(10, "HEMOKINESIS", 15, 1, { dynamic_values: [{ name: "Damage", base_value: 15, current_value: 15 }, { name: "HpLoss", base_value: 2, current_value: 2 }] })]), testKnowledge)!;
    expect(rupture.ruptureRate).toBeGreaterThan(0);
  });

  it("boss mechanics: Ringing turns, Knowledge Demon curses, Queen's Weak, the Giant's eruption", () => {
    expect(ringingTurns(5)).toBe(0);
    expect(ringingTurns(10)).toBe(2); // 02L4: T6 and T9
    const deck = deckProfileForBoss(mapState(starter()), testKnowledge)!;
    expect(mechanicFactor("CEREMONIAL_BEAST", deck, 10)).toBeLessThan(1);
    expect(mechanicFactor("KNOWLEDGE_DEMON", { ...deck, plays: 4 }, 10)).toBeLessThan(0.8);
    expect(mechanicFactor("QUEEN", deck, 6)).toBeCloseTo((2 + 4 * 0.75) / 6, 5);
    // ERPH: 66 HP, ~5 a turn -> killed by T8-T9, not 11.
    expect(eruptionTurns(66, 4.3)).toBe(9);
    expect(eruptionTurns(66, 5.1)).toBe(8);
    expect(calibrated(0)).toBe(0);
  });

  it("caps the fight by the turns we survive at the entry HP", () => {
    const full = bossClock(mapState(starter(), "KAISER_CRAB_BOSS", { ascension: 8 }), testKnowledge, 80)!;
    const low = bossClock(mapState(starter(), "KAISER_CRAB_BOSS", { ascension: 8 }), testKnowledge, 40)!;
    expect(low.fightTurns).toBeLessThan(full.fightTurns);
    expect(low.need).toBeGreaterThan(full.need);
    expect(full.survivableTurns).toBe(8);
  });

  it("64ZB Vantom: A8 HP plus Slippery's 1-damage turns; F7 reads short (old: gap 1)", () => {
    const f7 = bossClock(board("64ZBJGP6MYZ3:7"), loggedKnowledge)!;
    expect(f7.boss).toBe("VANTOM");
    expect(f7.hpNote).toMatch(/183 \(A8\) \+ \d+ \(Slippery/);
    // 66/87 plus the F16 rest's 26: a full-HP entry (the fights before it not taken off).
    expect(f7.entryHp).toBe(87);
    expect(f7.need).toBeGreaterThanOrEqual(27);
    expect(f7.gap).toBeGreaterThanOrEqual(3);
    const f16 = bossClock(board("64ZBJGP6MYZ3:16"), loggedKnowledge)!;
    expect(f16.need).toBeGreaterThanOrEqual(28);
    expect(f16.gap).toBeGreaterThan(0);
  });

  it("ERPH Waterfall Giant: the eruption caps the fight at ~T8; F14 gap >= 8 (old: 3)", () => {
    const clock = bossClock(board("ERPHN3SRCRC3:14"), loggedKnowledge)!;
    expect(clock.fightTurns).toBeLessThanOrEqual(9);
    expect(clock.turnsNote).toMatch(/eruption/);
    expect(clock.gap).toBeGreaterThanOrEqual(8);
  });

  it("02L4 Ceremonial Beast: 262 HP over ~10 turns, ~26 a turn; F6 reads short (old: 19, gap 0)", () => {
    const clock = bossClock(board("02L476J8QWGH:6"), loggedKnowledge)!;
    expect(clock.hp).toBe(262);
    // 26/80 plus one rest (24): a 50 HP entry survives ~8 turns (it was read as 68, 10 turns, 26 a turn).
    expect(clock.entryHp).toBe(50);
    expect(clock.fightTurns).toBe(8);
    expect(clock.need).toBe(33);
    expect(clock.gap).toBeGreaterThan(0);
    expect(clock.mechanic).toMatch(/Ringing/);
  });

  it("D3X1 Test Subject: phase 2 is the deadline (~53 a turn), not a flat 600/14", () => {
    const clock = bossClock(board("D3X1T7KBGK5T:41"), loggedKnowledge)!;
    const phase2 = clock.phases!.find((phase) => phase.phase === 2)!;
    expect(phase2.hp).toBe(212);
    // 68/85 plus the F47 rest: an 85 HP entry lasts ~5 turns of Multi Claw.
    expect(phase2.turns).toBe(5);
    expect(phase2.need).toBe(42);
    expect(clock.need).toBeGreaterThanOrEqual(53);
    expect(clock.gap).toBeGreaterThanOrEqual(10);
    const json = bossClockJson(board("D3X1T7KBGK5T:41"), loggedKnowledge)!;
    expect(json["phases"]).toBeDefined();
    expect(String(json["harder_because"])).toMatch(/Multi Claw/);
  });

  it("NZWR Knowledge Demon: Toasty Mittens' Strength counted (old estimate 22, realised 38); heals in the HP", () => {
    const clock = bossClock(board("NZWRZWY0URJJ:25"), loggedKnowledge)!;
    expect(clock.hp).toBe(459);
    expect(clock.growth.join(" ")).toMatch(/Toasty Mittens/);
    expect(clock.deck).toBeGreaterThanOrEqual(30);
    expect(clock.gap).toBeLessThan(15);
  });

  it("a short deck gets a damage-card bonus, a smith lean, and the run plan sees the gap and the mechanic", () => {
    const state = mapState(starter(), "KAISER_CRAB_BOSS", { ascension: 8 });
    const gap = damageGap(state, testKnowledge)!;
    expect(gap.gap).toBeGreaterThan(8);
    expect(gapCardBonus(gap, "INFLAME").bonus).toBeGreaterThan(0);
    expect(gapCardBonus(gap, "INFLAME").bonus).toBeLessThanOrEqual(GAP_BONUS_MAX);
    expect(gapCardBonus(gap, "THUNDERCLAP").bonus).toBeGreaterThan(0);
    expect(gapCardBonus(gap, "SHRUG_IT_OFF").bonus).toBe(0);
    // AoE only counts against two-part bosses.
    const demon = damageGap(mapState(starter(), "KNOWLEDGE_DEMON_BOSS"), testKnowledge)!;
    expect(gapCardBonus(demon, "THUNDERCLAP").bonus).toBe(0);
    expect(gapRestShift(gap, "SMITH", 0.8, false)).toBe(2);
    expect(gapRestShift(gap, "SMITH", 0.5, false)).toBe(0);
    expect(gapRestShift(gap, "SMITH", 0.8, true)).toBe(0);
    const json = bossClockJson(state, testKnowledge)!;
    expect(json).toMatchObject({ boss: "KAISER_CRAB", boss_hp: 428 });
    for (const key of ["need_damage_per_turn", "deck_damage_per_turn_estimate", "survivable_turns", "fight_turns", "harder_because", "gap_per_turn"]) expect(json[key]).toBeDefined();
    expect(gapCardBonus({ ...gap, gap: 0 }, "INFLAME").bonus).toBe(0);
  });

  it("no gap on a boss floor (the boss id is the dead one)", () => {
    const onBoss = parseGameState(baseState("MAP", { run: runPayload({ deck: starter(), boss_id: "KAISER_CRAB_BOSS", floor: 33 }) }));
    expect(damageGap(onBoss, testKnowledge)).toBeNull();
  });
});

describe("The Insatiable's mechanic factor, against the logged A8 fights", () => {
  interface Fight { key: string; outcome: string; turns: number; realised: number; raw: number }
  const fights = (JSON.parse(readFileSync(join(DIR, "..", "boss-fights", "insatiable-a8.json"), "utf8")) as { fights: Fight[] }).fights;
  const deck = deckProfileForBoss(mapState(starter(), "THE_INSATIABLE_BOSS"), testKnowledge)!;
  const median = (values: number[]): number => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]! ) / 2;
  };
  const ratios = (factor: (fight: Fight) => number) => fights.map((fight) => fight.realised / (calibrated(fight.raw) * factor(fight)));

  it("keeps the estimate unbiased over the 23 fights (VNWR/981W's ~0.5 were play, not the Sandpit)", () => {
    expect(fights.length).toBeGreaterThanOrEqual(20);
    const factor = (fight: Fight) => mechanicFactor("THE_INSATIABLE", deck, fight.turns);
    const bias = median(ratios(factor));
    expect(bias).toBeGreaterThan(0.9);
    expect(bias).toBeLessThan(1.25);
    const logErr = median(ratios(factor).map((ratio) => Math.abs(Math.log(ratio))));
    const logErrHalved = median(ratios((fight) => factor(fight) * 0.54).map((ratio) => Math.abs(Math.log(ratio))));
    expect(logErr).toBeLessThan(logErrHalved);
    for (const key of ["VNWR16YEJASM", "981WMX8MQ7DK"]) {
      const fight = fights.find((row) => row.key === key)!;
      expect(fight.realised / calibrated(fight.raw)).toBeLessThan(0.6);
    }
  });
});

describe("expected boss entry HP: current HP plus the pre-boss rest's heal", () => {
  const at = (floor: number, hp: number, max: number, over: Raw = {}, screen = "MAP", raw: Raw = {}) =>
    parseGameState(baseState(screen, { run: runPayload({ deck: starter(), boss_id: "KNOWLEDGE_DEMON_BOSS", act_id: "1", floor, current_hp: hp, max_hp: max, ...over }), ...raw }));

  it("Z6AMPPWHQ5CV F31 30/80: 30 + 24 = 54, not 85% (68); the demon's need rises to match", () => {
    expect(expectedEntryHp(at(31, 30, 80))).toBe(54);
    expect(expectedEntryHp(at(20, 59, 80))).toBe(80); // capped at max
    const low = bossClock(at(31, 30, 80), testKnowledge)!;
    const high = bossClock(at(31, 30, 80), testKnowledge, 68)!;
    expect(low.entryHp).toBe(54);
    expect(low.need).toBeGreaterThan(high.need);
  });

  it("Regal Pillow adds its heal (981WMX8MQ7DK F32: 37 -> 79 of 91)", () => {
    expect(expectedEntryHp(at(31, 37, 91, { relics: [{ index: 0, relic_id: "REGAL_PILLOW" }] }))).toBe(37 + 27 + REGAL_PILLOW_HEAL);
  });

  it("on the pre-boss rest floor: counted while its heal is still offered, not after", () => {
    const rest = { rest: { options: [{ index: 0, option_id: "HEAL", title: "休息", is_enabled: true }, { index: 1, option_id: "SMITH", title: "锻造", is_enabled: true }] } };
    expect(expectedEntryHp(at(32, 30, 80, {}, "REST", rest))).toBe(54);
    expect(expectedEntryHp(at(32, 54, 80))).toBe(54);
    expect(expectedEntryHp(at(33, 54, 80))).toBe(54);
  });
});

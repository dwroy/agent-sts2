/**
 * Boss clock: the act boss's damage a turn, the deck's estimate, and what the gap changes (damage-card
 * bonus, smith preference, the run plan's input). The logged boards are the ones whose post-mortems
 * blamed the clock (notes/lessons.md, 2026-09-28): 64ZB Vantom, ERPH Waterfall Giant, 02L4 Ceremonial
 * Beast, D3X1 Test Subject, NZWR Knowledge Demon.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import {
  averageStrength,
  bossClock,
  bossClockJson,
  bossHp,
  bossLossPerTurn,
  bossNote,
  bossProfile,
  survivableTurns,
  testSubjectPhases,
  unblockedShare,
  calibrated,
  damageGap,
  deckDamagePerTurn,
  deckProfileForBoss,
  eruptionAt,
  eruptionFormula,
  eruptionSchedule,
  eruptionTurns,
  gapCardBonus,
  gapRestShift,
  GAP_BONUS_MAX,
  expectedEntryHp,
  mechanicFactor,
  rawDeckDamage,
  REGAL_PILLOW_HEAL,
  ringingTurns,
} from "../src/strategy/boss-clock.js";
import { powerScheduleAt, setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { bossNote as journalBossNote } from "../src/project/run-journal.js";
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

  it("counts relic Strength from T1 (Vajra, Girya lifts), Seal of Gold's energy and Pyre's (RBJ402TKQZ6F)", () => {
    const relics = (list: Raw[]) => ({ relics: list.map((relic, index) => ({ index, ...relic })) });
    // RBJ402TKQZ6F F48: 3 lifts + Vajra = 4 Strength at T1.
    const lifted = deckProfileForBoss(mapState(starter(), "QUEEN_BOSS", relics([{ relic_id: "GIRYA", stack: 3 }, { relic_id: "VAJRA" }])), testKnowledge)!;
    expect(averageStrength(lifted, 7)).toBeCloseTo(4, 5);
    expect(lifted.growth.join("; ")).toContain("Girya +3");
    const unlifted = deckProfileForBoss(mapState(starter(), "QUEEN_BOSS", relics([{ relic_id: "GIRYA", stack: 0 }])), testKnowledge)!;
    expect(averageStrength(unlifted, 7)).toBe(0);
    // Sparkling Rouge: +1 from T3 (10 turns -> 8/10).
    const rouge = deckProfileForBoss(mapState(starter(), "QUEEN_BOSS", relics([{ relic_id: "SPARKLING_ROUGE" }])), testKnowledge)!;
    expect(averageStrength(rouge, 10)).toBeCloseTo(0.8, 5);
    // Seal of Gold: +1 energy while the gold pays 3 a turn.
    const plain = deckProfileForBoss(mapState(starter(), "QUEEN_BOSS"), testKnowledge)!;
    const seal = deckProfileForBoss(mapState(starter(), "QUEEN_BOSS", { gold: 296, ...relics([{ relic_id: "SEAL_OF_GOLD" }]) }), testKnowledge)!;
    expect(seal.energy).toBe(plain.energy + 1);
    const broke = deckProfileForBoss(mapState(starter(), "QUEEN_BOSS", { gold: 2, ...relics([{ relic_id: "SEAL_OF_GOLD" }]) }), testKnowledge)!;
    expect(broke.energy).toBe(plain.energy);
    // Pyre: energy at the start of each turn from the turn after it is played.
    const pyreCard = { ...power(9, "PYRE", [{ name: "Energy", base_value: 2, current_value: 2 }]), energy_cost: 2, rules_text: "在回合开始时，获得{Energy:energyIcons()}。" };
    const pyre = deckProfileForBoss(mapState([...starter(), pyreCard], "QUEEN_BOSS"), testKnowledge)!;
    expect(pyre.lateEnergy).toBe(2);
    expect(pyre.lateEnergyScale).toBeGreaterThan(1);
    const noPyre = deckProfileForBoss(mapState([...starter(), { ...pyreCard, rules_text: "", dynamic_values: [] }], "QUEEN_BOSS"), testKnowledge)!;
    expect(rawDeckDamage(pyre, "QUEEN_BOSS", 8)).toBeGreaterThan(rawDeckDamage(noPyre, "QUEEN_BOSS", 8));
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
    // Survivable turns: the entry HP over the loss a turn (the crab's from the monster DB, refreshed after runs).
    expect(full.survivableTurns).toBe(Math.floor(80 / full.lossPerTurn));
    expect(full.survivableTurns).toBeGreaterThanOrEqual(7);
    expect(full.survivableTurns).toBeLessThanOrEqual(10);
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
    // 26/80 plus one rest (24): a 50 HP entry survives ~7 turns at ~6.5 a turn (its A8 attack ~16 x 42%
    // unblocked; the A8 constant 6.2 read 8) (it was read as 68, 10 turns, 26 a turn).
    expect(clock.entryHp).toBe(50);
    expect(clock.fightTurns).toBe(7);
    expect(clock.need).toBe(37);
    expect(clock.gap).toBeGreaterThan(0);
    expect(clock.mechanic).toMatch(/Ringing/);
  });

  it("D3X1 Test Subject: per-phase deadlines (phase 2 ~42 a turn, phase 3 ~104 under Nemesis), not a flat 600/14", () => {
    const clock = bossClock(board("D3X1T7KBGK5T:41"), loggedKnowledge)!;
    const phase2 = clock.phases!.find((phase) => phase.phase === 2)!;
    expect(phase2.hp).toBe(212);
    // 68/85 plus the F47 rest: an 85 HP entry lasts ~5 turns of Multi Claw.
    expect(phase2.turns).toBe(5);
    expect(phase2.need).toBe(42);
    expect(clock.gap).toBeGreaterThanOrEqual(10);
    const json = bossClockJson(board("D3X1T7KBGK5T:41"), loggedKnowledge)!;
    expect(json["phases"]).toBeDefined();
    // Phase 3 (313 at A8 in the monster DB; it was assumed ~318) under Nemesis: Intangible every other turn,
    // so 3 of the 6 turns deal damage (VQKX F48: 3 / 88 / 5 over T5-T7), 104 a turn, not 52.
    const phase3 = clock.phases!.find((phase) => phase.phase === 3)!;
    expect(phase3.hp).toBe(313);
    expect(phase3.need).toBe(104);
    expect(clock.need).toBe(104);
    expect(clock.hpNote).toMatch(/111\/212\/313 \(A8\)/);
    expect(clock.turnsNote).toMatch(/3 of them without Nemesis' Intangible/);
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

describe("The Kaiser Crab's mechanic factor, against the logged A8 fights", () => {
  interface Fight { key: string; outcome: string; turns: number; realised: number; raw: number }
  const fights = (JSON.parse(readFileSync(join(DIR, "..", "boss-fights", "kaiser-crab-a8.json"), "utf8")) as { fights: Fight[] }).fights;
  const deck = deckProfileForBoss(mapState(starter(), "KAISER_CRAB_BOSS"), testKnowledge)!;
  const median = (values: number[]): number => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  };
  const ratios = (factor: (fight: Fight) => number) => fights.map((fight) => fight.realised / (calibrated(fight.raw) * factor(fight)));

  it("keeps the estimate unbiased over the 23 fights (0B5Y/RWWG's ~0.7 are not the crab's rule)", () => {
    expect(fights.length).toBeGreaterThanOrEqual(20);
    const factor = (fight: Fight) => mechanicFactor("KAISER_CRAB", deck, fight.turns);
    expect(factor(fights[0]!)).toBe(1);
    const bias = median(ratios(factor));
    expect(bias).toBeGreaterThan(0.85);
    expect(bias).toBeLessThan(1.15);
    const logErr = median(ratios(factor).map((ratio) => Math.abs(Math.log(ratio))));
    const logErrDiscounted = median(ratios((fight) => factor(fight) * 0.7).map((ratio) => Math.abs(Math.log(ratio))));
    expect(logErr).toBeLessThan(logErrDiscounted);
    for (const key of ["0B5YKJFM0E8B", "RWWGRRYKD6LT"]) {
      const fight = fights.find((row) => row.key === key)!;
      expect(fight.realised / calibrated(fight.raw)).toBeLessThan(0.8);
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

describe("boss HP and HP loss a turn from the monster DB at the run's ascension", () => {
  const profile = (id: string) => bossProfile(`${id}_BOSS`)!;

  it("HP: the DB's parts at this ascension (else the nearest logged), plus what the mechanic adds", () => {
    // Logged at A9: as logged; the Kin counts the priest plus ~60 of followers, the Queen her own HP plus ~60 block.
    expect(bossHp(profile("KNOWLEDGE_DEMON"), 9)).toBe(399);
    expect(bossHp(profile("THE_KIN"), 9)).toBe(199 + 60);
    expect(bossHp(profile("THE_KIN"), 7)).toBe(190 + 60);
    expect(bossHp(profile("QUEEN"), 8)).toBe(419 + 60);
    expect(bossHp(profile("AEONGLASS"), 3)).toBe(512 + 66);
    // Not logged at A9: A8's, and the note says so (a fixture DB: the real one gains A9 fights with every
    // refresh; The Insatiable's first came with KY3Y).
    setMonsterDbForTests({ bosses: { THE_INSATIABLE: { "8": { fights: 23, parts: { THE_INSATIABLE: { median: 341, n: 23 } } } } }, encounters: {}, monsters: {} } as never);
    try {
      expect(bossHp(profile("THE_INSATIABLE"), 9)).toBe(341);
      const clock = bossClock(mapState(starter(), "THE_INSATIABLE_BOSS", { ascension: 9, floor: 25 }), testKnowledge, 80)!;
      expect(clock.hpNote).toMatch(/^341 \(A9 not logged: A8's\)/);
    } finally {
      setMonsterDbForTests(null);
    }
    expect(bossHp(profile("THE_INSATIABLE"), 8)).toBe(341);
    // The Test Subject's phases as logged (A8 111 > 212 > 313; A0 100 > 200 > 300).
    expect(testSubjectPhases(8)).toEqual([111, 212, 313]);
    expect(testSubjectPhases(0)).toEqual([100, 200, 300]);
    expect(bossHp(profile("TEST_SUBJECT"), 8)).toBe(636);
    // The Kin's note carries the DB's numbers.
    expect(bossNote(profile("THE_KIN"), 8)).toMatch(/^priest 199 plus two followers ~6[23]:/);
    expect(bossNote(profile("TEST_SUBJECT"), 8)).toMatch(/three phases \(111\/212\/313 HP\)/);
  });

  it("HP loss a turn: its own attack at this ascension times the logged unblocked share; the A8 constant only without DB data", () => {
    const demon = profile("KNOWLEDGE_DEMON");
    const a8 = bossLossPerTurn(demon, 8);
    const a9 = bossLossPerTurn(demon, 9);
    // A9 moves hit harder (Slap 17 -> 18, Overwhelming 11 -> 13 a hit).
    expect(a9.value).toBeGreaterThan(a8.value);
    expect(a9.source).toMatch(/unblocked/);
    const share = unblockedShare("KNOWLEDGE_DEMON")!;
    expect(share.unblocked_share).toBeGreaterThan(0.2);
    expect(share.unblocked_share).toBeLessThan(0.8);
    // A boss with no DB moves keeps the constant.
    expect(bossLossPerTurn({ ...demon, id: "NO_SUCH_BOSS" }, 9)).toMatchObject({ value: demon.lossPerTurn, estimated: false });
    // LY0N909D4A0V F33: 77 HP at A9; the old clock (6.3 a turn) read 12 survivable turns, it died on T8 (9.6 a turn).
    expect(survivableTurns(demon, 77)).toBe(12);
    const clock = bossClock(mapState(starter(), "KNOWLEDGE_DEMON_BOSS", { ascension: 9, floor: 25 }), testKnowledge, 77)!;
    expect(clock.survivableTurns).toBeLessThan(12);
    expect(clock.lossPerTurn).toBe(a9.value);
    expect(bossClockJson(mapState(starter(), "KNOWLEDGE_DEMON_BOSS", { ascension: 9, floor: 25 }), testKnowledge)).toMatchObject({ hp_loss_per_turn: a9.value, hp_loss_per_turn_note: expect.stringMatching(/unblocked/) });
  });
});


describe("Waterfall Giant eruption at the run's ascension (1VX145UJM8RZ: A9 20 stacks on T2, 47 on T11)", () => {
  // The monster DB as logged (states.jsonl: first seen on T2 at 15 at A0-A8 and 20 at A9, +3 with every
  // later move), as a fixture: the real file is refreshed after every run.
  const steam = (counts: Record<string, Record<string, number>>) => Object.fromEntries(Object.entries(counts).map(([asc, c]) => [asc, { STEAM_ERUPTION_POWER: c }]));
  const hpAt = (id: string, hp: number, phases?: string) => ({ fights: 5, parts: { [id]: { median: hp, n: 5 } }, ...(phases ? { phases: { [phases]: 1 } } : {}) });
  const BOSS_HP = {
    WATERFALL_GIANT: { "7": hpAt("WATERFALL_GIANT", 240), "8": hpAt("WATERFALL_GIANT", 250), "9": hpAt("WATERFALL_GIANT", 250) },
    TEST_SUBJECT: { "7": hpAt("TEST_SUBJECT", 100, "100 > 200 > 300 (TEST_SUBJECT)"), "8": hpAt("TEST_SUBJECT", 111, "111 > 212 > 313 (TEST_SUBJECT)") },
  };
  const GIANT_DB = {
    bosses: {},
    encounters: {},
    monsters: {
      WATERFALL_GIANT: {
        powers: { STEAM_ERUPTION_POWER: { amount_at_first_sight_by_asc: { "8": { "15": 27 }, "9": { "20": 4 } }, turn_at_first_sight_by_asc: { "8": { "2": 27 }, "9": { "2": 4 } } } },
        moves: {
          PRESSURIZE_MOVE: { turns_seen: { "1": 31 }, self_powers_gained_by_asc: steam({ "8": { "15": 27 }, "9": { "20": 4 } }) },
          STOMP_MOVE: { turns_seen: { "2": 31, "7": 20 }, self_powers_gained_by_asc: steam({ "8": { "3": 50 }, "9": { "3": 8 } }) },
          RAM_MOVE: { turns_seen: { "3": 31, "8": 18 }, self_powers_gained_by_asc: steam({ "8": { "3": 46 }, "9": { "3": 8 } }) },
          // Pressure Gun grows 5 a use: A8 20/25/30, A9 23/28/33 (monster DB base_per_hit).
          PRESSURE_GUN_MOVE: { turns_seen: { "5": 31, "10": 20 }, damage_by_asc: { "8": { base_per_hit: { "20": 27, "25": 14, "30": 4 } }, "9": { base_per_hit: { "23": 3, "28": 3, "33": 1 } } } },
        },
      },
    },
  };
  beforeAll(() => setMonsterDbForTests(GIANT_DB as never));
  afterAll(() => setMonsterDbForTests(null));

  it("reads the stacks and their gain a turn from the monster DB per ascension", () => {
    expect(eruptionSchedule(8)).toMatchObject({ first: 15, firstTurn: 2, perTurn: 3 });
    expect(eruptionSchedule(9)).toMatchObject({ first: 20, firstTurn: 2, perTurn: 3 });
    // 6189FSNEN1MZ (A8): 15 on T2, 36 on T9; N7SAK (A8) killed on T14 at 51; 1VX1 (A9) killed on T11 at 47.
    expect(eruptionAt(9, 8)).toBe(36);
    expect(eruptionAt(14, 8)).toBe(51);
    expect(eruptionAt(2, 9)).toBe(20);
    expect(eruptionAt(11, 9)).toBe(47);
    expect(eruptionFormula(8)).toMatch(/^12\+3\(T-1\)/);
    expect(eruptionFormula(9)).toMatch(/^17\+3\(T-1\)/);
  });

  it("an ascension with no logged Giant takes the nearest logged one's numbers, and says so", () => {
    const monsters = {
      WATERFALL_GIANT: {
        powers: { STEAM_ERUPTION_POWER: { amount_at_first_sight_by_asc: { "7": { "15": 3 } }, turn_at_first_sight_by_asc: { "7": { "2": 3 } } } },
        moves: {
          PRESSURIZE_MOVE: { turns_seen: { "1": 3 }, self_powers_gained_by_asc: { "7": { STEAM_ERUPTION_POWER: { "15": 3 } } } },
          STOMP_MOVE: { turns_seen: { "2": 3, "7": 2 }, self_powers_gained_by_asc: { "7": { STEAM_ERUPTION_POWER: { "3": 5 } } } },
        },
      },
    };
    expect(powerScheduleAt("WATERFALL_GIANT", "STEAM_ERUPTION_POWER", 9, monsters)).toEqual({ first: 15, firstTurn: 2, perTurn: 3, asc: 7, exact: false, n: 3 });
    // Without per-ascension numbers there is nothing to read.
    expect(powerScheduleAt("WATERFALL_GIANT", "STEAM_ERUPTION_POWER", 9, { WATERFALL_GIANT: { powers: { STEAM_ERUPTION_POWER: { amount_at_first_sight: { "15": 3 } } } } })).toBeNull();
  });

  it("caps the clock's fight by the ascension's eruption: A9's kill turn comes a turn earlier", () => {
    // 1VX1: 82 HP entry at 5.1 a turn: A8 (82 + 3) / 8.1 -> T10; A9 (82 - 2) / 8.1 -> T9.
    expect(eruptionTurns(82, 5.1, 8)).toBe(10);
    expect(eruptionTurns(82, 5.1, 9)).toBe(9);
    const a8 = bossClock(mapState(starter(), "WATERFALL_GIANT_BOSS", { ascension: 8, floor: 5, act_id: "0" }), testKnowledge, 82)!;
    const a9 = bossClock(mapState(starter(), "WATERFALL_GIANT_BOSS", { ascension: 9, floor: 5, act_id: "0" }), testKnowledge, 82)!;
    expect(a8.turnsNote).toContain(`eruption kill by T${eruptionTurns(82, a8.lossPerTurn, 8)}`);
    expect(a9.turnsNote).toContain(`eruption kill by T${eruptionTurns(82, a9.lossPerTurn, 9)}`);
    expect(a9.fightTurns).toBeLessThan(a8.fightTurns);
    // What DeepSeek reads: the ascension's formula, not A8's "12+3".
    expect(a9.mechanic).toMatch(/^eruption 17\+3\(T-1\) when killed on turn T \(A9, n=\d+\)/);
    expect(journalBossNote("WATERFALL_GIANT_BOSS", 9)).toContain("A9：第 2 回合 20，每回合 +3");
    expect(journalBossNote("WATERFALL_GIANT_BOSS", 8)).toContain("A8：第 2 回合 15，每回合 +3");
  });

  it("the Giant's and the Test Subject's notes carry the ascension's numbers and the experience base's advice", () => {
    setMonsterDbForTests({ ...GIANT_DB, bosses: BOSS_HP } as never);
    // Run journal (DeepSeek): HP, Siphon's heal, Pressure Gun's shots at this ascension; early kill.
    const a9 = journalBossNote("WATERFALL_GIANT_BOSS", 9)!;
    expect(a9).toMatch(/^250 血，/);
    expect(a9).toContain("虹吸回合回血 15");
    expect(a9).toContain("依次 23→28→33");
    expect(a9).toContain("A8 T10 前击杀 13/15 赢");
    expect(journalBossNote("WATERFALL_GIANT_BOSS", 8)).toContain("依次 20→25→30");
    const a7 = journalBossNote("WATERFALL_GIANT_BOSS", 7)!;
    expect(a7).toMatch(/^240 血，/);
    expect(a7).toContain("虹吸回合回血 10");
    // ts-phase3: phase 3's Intangible comes every other turn; big hits on the open turns, not many small ones.
    const ts = journalBossNote("TEST_SUBJECT_BOSS", 8)!;
    expect(ts).toContain("三阶段 HP 111/212/313");
    expect(ts).toContain("开放回合全力输出");
    expect(ts).not.toMatch(/三阶段无实体，靠多段/);
    expect(journalBossNote("TEST_SUBJECT_BOSS", 7)).toContain("三阶段 HP 100/200/300");
    // Boss clock (DeepSeek's boss_note and harder_because).
    const giant = bossProfile("WATERFALL_GIANT_BOSS")!;
    expect(bossNote(giant, 9)).toContain("Siphon heals 15 HP; Pressure Gun on T5/T10/T15 (23/28/33)");
    expect(bossNote(giant, 7)).toContain("Siphon heals 10 HP; Pressure Gun on T5/T10/T15 (20/25/30)");
    const clock = bossClock(mapState(starter(), "WATERFALL_GIANT_BOSS", { ascension: 8, floor: 5, act_id: "0" }), testKnowledge, 80)!;
    expect(clock.mechanic).toContain("kill it early (A8: killed by T10 13/15 won, T13-T15 5/7, T16 or later 0/3");
    setMonsterDbForTests(GIANT_DB as never);
  });
});

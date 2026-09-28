/**
 * Boss clock: the act boss's damage a turn, the deck's rough estimate, and what the gap changes
 * (damage-card bonus, smith preference, the run plan's input).
 */

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import { awakeDamagePerTurn } from "../src/knowledge/move-model.js";
import { ASSUMED_ENTRY_HP, bossClockJson, bossNeed, cappedBossNeed, clockEntryHp, damageGap, deckDamagePerTurn, gapCardBonus, gapRestShift, GAP_BONUS_MAX, GAP_BONUS_BIG_MAX, relicDamagePerTurn, survivableBossTurns } from "../src/strategy/boss-clock.js";
import { logged, loggedKnowledge } from "./logged.js";
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
const mapState = (deck: Raw[], bossId = "KAISER_CRAB_BOSS", run: Raw = {}) =>
  parseGameState(baseState("MAP", { run: runPayload({ deck, boss_id: bossId, floor: 25, act_id: "1", ascension: 8, ...run }) }));

describe("boss clock", () => {
  it("knows the act bosses' HP and damage a turn", () => {
    expect(bossNeed("KAISER_CRAB_BOSS", 8)).toMatchObject({ id: "KAISER_CRAB", hp: 428, perTurn: 54 });
    // 399 at A8 (94FP F33 states; the dossier), not 459 (399 + two Ponder heals): 399 / 9.
    expect(bossNeed("KNOWLEDGE_DEMON_BOSS", 8)?.hp).toBe(399);
    expect(bossNeed("KNOWLEDGE_DEMON_BOSS", 8)?.perTurn).toBe(44);
    // A8 HP from the A8 states (XWPV, WB02, YNMB, CWU9); A7 and below keep the old numbers.
    expect(bossNeed("VANTOM_BOSS", 8)?.hp).toBe(183);
    expect(bossNeed("THE_INSATIABLE_BOSS", 8)?.hp).toBe(341);
    expect(bossNeed("QUEEN_BOSS", 8)?.hp).toBe(690);
    expect(bossNeed("VANTOM_BOSS", 7)?.hp).toBe(173);
    expect(bossNeed("THE_INSATIABLE_BOSS")?.hp).toBe(321);
    expect(bossNeed("SLIME_BOSS")).toBeNull();
  });

  it("estimates more damage for a stronger deck", () => {
    const starter = [0, 1, 2, 3, 4].map((i) => attack(i, "STRIKE_IRONCLAD", 6)).concat([5, 6, 7, 8].map((i) => skill(i, "DEFEND_IRONCLAD")));
    const weak = deckDamagePerTurn(mapState(starter), testKnowledge);
    const strong = deckDamagePerTurn(mapState([...starter, attack(9, "CARNAGE", 20, 2), attack(10, "BLUDGEON", 32, 3)]), testKnowledge);
    expect(weak).toBeGreaterThan(0);
    expect(strong).toBeGreaterThan(weak);
  });

  it("a short deck gets a damage-card bonus, a smith lean, and the run plan sees the gap", () => {
    const starter = [0, 1, 2, 3, 4].map((i) => attack(i, "STRIKE_IRONCLAD", 6)).concat([5, 6, 7, 8].map((i) => skill(i, "DEFEND_IRONCLAD")));
    const state = mapState(starter);
    const gap = damageGap(state, testKnowledge)!;
    expect(gap.gap).toBeGreaterThan(8);
    expect(gapCardBonus(gap, "INFLAME").bonus).toBeGreaterThan(0);
    expect(gapCardBonus(gap, "INFLAME").bonus).toBeLessThanOrEqual(GAP_BONUS_BIG_MAX);
    expect(gapCardBonus(gap, "THUNDERCLAP").bonus).toBeGreaterThan(0);
    // A block card only while the entry HP caps the fight's turns (each turn it adds lowers the need).
    expect(gap.cappedTurns).toBeDefined();
    expect(gapCardBonus(gap, "SHRUG_IT_OFF").bonus).toBeGreaterThan(0);
    expect(gapCardBonus({ ...gap, cappedTurns: undefined }, "SHRUG_IT_OFF").bonus).toBe(0);
    expect(gapCardBonus(gap, "DEFEND_IRONCLAD").bonus).toBe(0);
    // AoE only counts against two-part bosses.
    const demon = damageGap(mapState(starter, "KNOWLEDGE_DEMON_BOSS"), testKnowledge)!;
    expect(gapCardBonus(demon, "THUNDERCLAP").bonus).toBe(0);
    expect(gapRestShift(gap, "SMITH", 0.8, false)).toBe(2);
    expect(gapRestShift(gap, "SMITH", 0.5, false)).toBe(0);
    expect(gapRestShift(gap, "SMITH", 0.8, true)).toBe(0);
    // The crab's hits (its claws' move models) cap the fight at the turns 85% HP lasts: 54 a turn or more.
    expect(bossClockJson(state, testKnowledge)).toMatchObject({ boss: "KAISER_CRAB", boss_hp: 428 });
    expect(Number(bossClockJson(state, testKnowledge)!["need_damage_per_turn"])).toBeGreaterThanOrEqual(54);
    expect(gapCardBonus({ ...gap, gap: 0 }, "INFLAME").bonus).toBe(0);
  });

  it("no clock on a boss floor (the boss id is the dead one), and energy relics count (7DFB)", () => {
    const starter = [0, 1, 2, 3, 4].map((i) => attack(i, "STRIKE_IRONCLAD", 6)).concat([5, 6, 7, 8].map((i) => skill(i, "DEFEND_IRONCLAD")));
    const onBoss = mapState(starter, "KAISER_CRAB_BOSS", { floor: 33 });
    expect(damageGap(onBoss, testKnowledge)).toBeNull();
    const heavy = [...starter, attack(9, "BLUDGEON", 32, 3), attack(10, "BLUDGEON", 32, 3), attack(11, "BLUDGEON", 32, 3)];
    const plain = deckDamagePerTurn(mapState(heavy), testKnowledge);
    const antler = deckDamagePerTurn(mapState(heavy, "KAISER_CRAB_BOSS", { relics: [{ index: 0, relic_id: "BLESSED_ANTLER" }] }), testKnowledge);
    expect(antler).toBeGreaterThan(plain);
  });

  it("scales the estimate by what the boss lets through (JF8N Soul Fysh, H7W0 Queen) and counts Seal of Gold (KFPC F18)", () => {
    const starter = [0, 1, 2, 3, 4].map((i) => attack(i, "STRIKE_IRONCLAD", 6)).concat([5, 6, 7, 8].map((i) => skill(i, "DEFEND_IRONCLAD")));
    const heavy = [...starter, attack(9, "BLUDGEON", 32, 3), attack(10, "CARNAGE", 20, 2)];
    // Knowledge Demon and Soul Fysh both run 9 turns: only the realised share differs.
    const demon = deckDamagePerTurn(mapState(heavy, "KNOWLEDGE_DEMON_BOSS"), testKnowledge);
    const fysh = deckDamagePerTurn(mapState(heavy, "SOUL_FYSH_BOSS"), testKnowledge);
    expect(fysh).toBe(Math.round(demon * 0.65));
    expect(bossNeed("QUEEN_BOSS", 8)?.realised).toBe(0.75);
    const plain = deckDamagePerTurn(mapState(heavy), testKnowledge);
    const seal = deckDamagePerTurn(mapState(heavy, "KAISER_CRAB_BOSS", { relics: [{ index: 0, relic_id: "SEAL_OF_GOLD" }] }), testKnowledge);
    expect(seal).toBeGreaterThan(plain);
  });

  it("counts Strength that grows every turn: Toasty Mittens, Rupture fed by Crimson Mantle (XWPV F48)", () => {
    const starter = [0, 1, 2, 3, 4].map((i) => attack(i, "STRIKE_IRONCLAD", 6)).concat([5, 6, 7, 8].map((i) => skill(i, "DEFEND_IRONCLAD")));
    const plain = deckDamagePerTurn(mapState(starter, "AEONGLASS_BOSS"), testKnowledge);
    const mittens = deckDamagePerTurn(mapState(starter, "AEONGLASS_BOSS", { relics: [{ index: 0, relic_id: "TOASTY_MITTENS" }] }), testKnowledge);
    expect(mittens).toBeGreaterThan(plain);
    const power = (index: number, id: string): Raw => ({ ...skill(index, id), card_type: "Power" });
    const ruptureOnly = deckDamagePerTurn(mapState([...starter, power(9, "RUPTURE")], "AEONGLASS_BOSS"), testKnowledge);
    const withMantle = deckDamagePerTurn(mapState([...starter, power(9, "RUPTURE"), power(10, "CRIMSON_MANTLE")], "AEONGLASS_BOSS"), testKnowledge);
    expect(withMantle).toBeGreaterThan(ruptureOnly);
  });
});

describe("relic damage in the deck estimate (EJXC F33: clock 23/turn, dealt 44 with ~8.3 from relics)", () => {
  it("adds Mercury Hourglass, Mr. Struggles and Festive Popper per turn; both claws for the crab", () => {
    // 7 turns: 3x7 + (1+...+7) + 9 = 58, ~8 a turn.
    expect(relicDamagePerTurn(["MERCURY_HOURGLASS", "MR_STRUGGLES", "FESTIVE_POPPER"], 7)).toBe(8);
    expect(relicDamagePerTurn(["MERCURY_HOURGLASS"], 8, true)).toBe(6);
    expect(relicDamagePerTurn(["BURNING_BLOOD"], 7)).toBe(0);
  });

  it("the deck estimate and the run plan's note include it", () => {
    const deck = [0, 1, 2, 3, 4].map((i) => attack(i, "STRIKE_IRONCLAD", 6)).concat([5, 6, 7, 8].map((i) => skill(i, "DEFEND_IRONCLAD")));
    const relic = (id: string) => ({ index: 0, relic_id: id, name: id, description: "", stack: null, is_melted: false });
    const without = deckDamagePerTurn(mapState(deck, "THE_INSATIABLE_BOSS"), testKnowledge);
    const withRelics = mapState(deck, "THE_INSATIABLE_BOSS", { relics: [relic("MERCURY_HOURGLASS"), relic("MR_STRUGGLES")] });
    expect(deckDamagePerTurn(withRelics, testKnowledge) - without).toBe(7);
    expect(String(bossClockJson(withRelics, testKnowledge)?.["estimate_note"])).toMatch(/relic damage \(~7\/turn/);
  });
});

describe("damage gap bonus, and DeepSeek's needs as a fact (UP1C F6: Taunt +14 over Anger +4; GZ24)", () => {
  it("from a gap of 8 a turn damage gets gap/2; a needed role is a fact, not a bonus", async () => {
    const { mustHaveFact } = await import("../src/strategy/run-plan.js");
    const gap = (n: number) => ({ boss: "WATERFALL_GIANT", need: 25, deck: 25 - n, gap: n });
    // Below 8: the old 0.4 slope.
    expect(gapCardBonus(gap(7), "BLUDGEON").bonus).toBe(3);
    expect(gapCardBonus(gap(9), "BLUDGEON").bonus).toBe(5);
    expect(gapCardBonus(gap(9), "INFLAME").bonus).toBe(7);
    expect(gapCardBonus(gap(40), "INFLAME").bonus).toBe(GAP_BONUS_BIG_MAX);
    const plan = { needs: ["block"] } as never;
    expect(mustHaveFact(plan, "TAUNT", ["STRIKE_R"])).toBe("fills DeepSeek's need block (deck has 0)");
    expect(mustHaveFact({ needs: ["block"], blockTarget: 4 } as never, "TAUNT", ["STRIKE_R", "SHRUG_IT_OFF"])).toBe("fills DeepSeek's need block (deck has 1 of target 4)");
    expect(mustHaveFact({ needs: ["strength"] } as never, "INFLAME", ["STRIKE_R"])).toBe("fills DeepSeek's need strength (deck has 0)");
    expect(mustHaveFact({ needs: ["strength"] } as never, "TAUNT", ["STRIKE_R"])).toBeNull();
  });
});

describe("the clock's turns are the turns we survive (HCBJ F16: gap 1 at 12 turns; 52 HP lasted 9)", () => {
  it("the Matriarch's awake hit and sleep turns come from the move model", () => {
    const moves = awakeDamagePerTurn("LAGAVULIN_MATRIARCH")!;
    expect(moves.perTurn).toBeGreaterThan(13);
    expect(moves.perTurn).toBeLessThan(17);
    expect(moves.sleepTurns).toBeGreaterThan(2);
    expect(moves.sleepTurns).toBeLessThan(3);
  });

  it("the logged F16 board (52/80, boss next): turns capped near 8, the gap stays open (not 1; Inferno's turn-start hit counted since EHJZ)", () => {
    const state = parseGameState(logged("hcbj-map-f16").state);
    const need = cappedBossNeed(state, loggedKnowledge)!;
    expect(need.entryHp).toBe(52);
    expect(need.turns).toBeLessThan(9);
    expect(need.turns).toBeGreaterThan(7);
    const gap = damageGap(state, loggedKnowledge)!;
    expect(gap.need).toBeGreaterThanOrEqual(28);
    expect(gap.gap).toBeGreaterThanOrEqual(3);
    expect(String(bossClockJson(state, loggedKnowledge)?.["turns_note"])).toMatch(/12 turns in the table, capped at 8/);
  });

  it("before the boss's floor the clock assumes the usual entry HP, and never caps above the table", () => {
    const raw = structuredClone(logged("hcbj-map-f16").state) as Record<string, Record<string, unknown>>;
    raw["run"]!["floor"] = 10;
    const state = parseGameState(raw);
    expect(clockEntryHp(state)).toBe(Math.round(ASSUMED_ENTRY_HP * 80));
    expect(survivableBossTurns("LAGAVULIN_MATRIARCH", 500, 0)!).toBeGreaterThan(12);
    expect(cappedBossNeed(parseGameState({ ...raw, run: { ...raw["run"], current_hp: 80, max_hp: 80 } }), loggedKnowledge)!.turns).toBeLessThanOrEqual(12);
  });
});

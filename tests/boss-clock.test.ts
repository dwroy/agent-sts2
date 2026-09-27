/**
 * Boss clock: the act boss's damage a turn, the deck's rough estimate, and what the gap changes
 * (damage-card bonus, smith preference, the run plan's input).
 */

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import { bossClockJson, bossNeed, damageGap, deckDamagePerTurn, gapCardBonus, gapRestShift, GAP_BONUS_MAX } from "../src/strategy/boss-clock.js";
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
    expect(bossNeed("KNOWLEDGE_DEMON_BOSS", 8)?.perTurn).toBe(51);
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
    expect(gapCardBonus(gap, "INFLAME").bonus).toBeLessThanOrEqual(GAP_BONUS_MAX);
    expect(gapCardBonus(gap, "THUNDERCLAP").bonus).toBeGreaterThan(0);
    expect(gapCardBonus(gap, "SHRUG_IT_OFF").bonus).toBe(0);
    // AoE only counts against two-part bosses.
    const demon = damageGap(mapState(starter, "KNOWLEDGE_DEMON_BOSS"), testKnowledge)!;
    expect(gapCardBonus(demon, "THUNDERCLAP").bonus).toBe(0);
    expect(gapRestShift(gap, "SMITH", 0.8, false)).toBe(2);
    expect(gapRestShift(gap, "SMITH", 0.5, false)).toBe(0);
    expect(gapRestShift(gap, "SMITH", 0.8, true)).toBe(0);
    expect(bossClockJson(state, testKnowledge)).toMatchObject({ boss: "KAISER_CRAB", boss_hp: 428, need_damage_per_turn: 54 });
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

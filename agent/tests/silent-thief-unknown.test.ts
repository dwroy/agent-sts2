/** LY83ZMTFVKJH A10 F20 T2, silent-0314/0315: preserve the measured progress and the unknown HP conversion. */
import { describe, expect, it } from "vitest";
import evidence from "./silent-thief-unknown-evidence.json";
import { parseGameState } from "../src/hand/mod/schema.js";
import { createScreenMemory } from "../src/memory/types.js";
import type { ThiefCardValue } from "../src/sim/thief-card-hp.js";
import { cardHpOf } from "../src/sim/thief-card-hp.js";
import { lastTurnLoot, lootHpOf, noteFightStart, thievesOf, thiefContextJson, thiefFact, withLoot } from "../src/reflex/thief.js";
import type { Plan } from "../src/reflex/turn-solver.js";

type Raw = Record<string, any>;
function setup(character = "SILENT", ascension = 10, change?: Partial<ThiefCardValue>) {
  const rawAt = (line: number): Raw => structuredClone(evidence.frames.find((entry) => entry.line === line)!.row.state);
  const start = rawAt(307971);
  const current = rawAt(307973);
  for (const raw of [start, current]) Object.assign(raw.run, { character_id: character, ascension });
  const state = parseGameState(current);
  const memory = createScreenMemory("COMBAT");
  noteFightStart(memory, parseGameState(start));
  const row = evidence.frames.find((entry) => entry.line === 300426)!.row as Raw;
  const value = { ...structuredClone(row.thief_card_value), ...change } as ThiefCardValue;
  return { state, thieves: withLoot(thievesOf(state, memory), state, value), value };
}
// A fixed end-turn candidate: these are the real current enemy HP/Flutter, with no actions asserted executed.
function endLine(state: ReturnType<typeof parseGameState>): Plan {
  const enemies = (state.raw.combat as Raw).enemies as Raw[];
  return { steps: [], outcome: { wins: false, enemyHpAfter: enemies.map((enemy) => ({ index: enemy.index,
    hp: enemy.current_hp, flutter: enemy.powers.find((p: Raw) => p.power_id === "FLUTTER_POWER")?.amount ?? 0 })) } } as Plan;
}

describe("Silent's unknown stolen-card HP value", () => {
  it("the frozen estimate has positive progress, a negative HP slope and no HP price", () => {
    const { value } = setup();
    expect(value.measures!.bossLeft.card).toEqual({ value: 21.464, se: 0.9731 });
    expect(value.measures!.bossLeft.perHp).toEqual({ value: -0.2843, se: 0.0417 });
    expect(cardHpOf(value.measures!)).toMatchObject({ hp: null, status: "flat" });
  });

  it("the existing live formatter path shows unknown HP, progress and escape counts without inventing a price", () => {
    const { state, thieves } = setup();
    const line = endLine(state);
    const text = thiefFact(line, thieves, () => ({ back: 0, gone: 8, samples: 8 }), state.turn,
      undefined, () => ({ lost: 8, samples: 8 }));
    expect(thieves[0]!.cards).toEqual(["无休手斧+"]);
    expect(text).toContain("loot cost unknown HP");
    expect(text).not.toContain("loot cost 0");
    expect(text).toContain("21.5");
    expect(text).toContain("lost in 8/8 samples");
    expect(text).toContain("no conversion to HP");
    expect(thiefContextJson(thieves, state.turn)[thieves[0]!.name]).toMatchObject({
      loot_hp: expect.stringContaining("no HP value") });
    expect(lootHpOf(thieves)).toEqual({});
    expect(lastTurnLoot(line, thieves)).toBe(0);
  });

  it("without later samples, it keeps the missing loss forecast explicit", () => {
    const { state, thieves } = setup();
    expect(thiefFact(endLine(state), thieves, () => null, state.turn)).toContain("后续丢牌样本未知");
  });

  it.each([["IRONCLAD", 10], ["SILENT", 11]] as const)("synthetic %s A%i preserves the existing text", (character, ascension) => {
    const { state, thieves } = setup(character, ascension);
    expect(thiefFact(endLine(state), thieves, () => null, state.turn)).toContain("loot cost 0 (");
  });

  it.each([0, 12])("synthetic known HP value %i preserves numeric costing", (hp) => {
    const { state, thieves } = setup("SILENT", 10, { hp, status: hp === 0 ? "not_significant" : "ok" });
    expect(thiefFact(endLine(state), thieves, () => null, state.turn)).toContain("loot cost 0 HP:");
    expect(Object.values(lootHpOf(thieves))).toEqual(hp === 0 ? [] : [12]);
  });
});

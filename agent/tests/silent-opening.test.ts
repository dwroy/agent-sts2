/** TXZ6RVMQA09D A10 F43/45/46/48/49, silent-0255/0228; no generated knowledge or model calls. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-opening-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { syntheticBossState, syntheticBossStart, type BossOpening } from "../src/sim/boss-start.js";
import { observedRoyalPoisonOpeningLoss } from "../src/sim/silent-opening.js";
import { continuationInput, fightSample, slimInput } from "../src/sim/boss-sim.js";
import { continuationUtility } from "../src/reflex/continuation-value.js";
import { withDoubleBossStart } from "../src/sim/double-boss-start.js";
import { type DoubleBossModel } from "../src/knowledge/double-boss.js";
import type { MonsterDb } from "../src/knowledge/monster-db.js";
import { board } from "./boss-sim-fixture.js";
import * as bossStart from "../src/sim/boss-start.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed opening test has no generated reference data"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [], relics: [] }, "cache");
const db = { monsters: {}, bosses: {}, encounters: {} };
const opening: BossOpening = { key: "TEST_SUBJECT", name: "实验体", asc: 10, exact: true,
  parts: [{ index: 0, id: "TEST_SUBJECT", name: "实验体", hp: 111, move: null, powers: {} }] };

it("reproduces the five pre-action HP transitions, including 4 to 0 without clamping back to 1", () => {
  for (const row of evidence) {
    const state = parseGameState(row.state);
    expect(observedRoyalPoisonOpeningLoss(state)).toBe(4);
    const synth = syntheticBossState(state, knowledge, opening, row.before_hp, db, {});
    expect(synth.state.run!.current_hp).toBe(row.after_hp);
    expect((synth.state.raw["combat"] as any).player.cards_played_this_turn).toBe(0);
    expect(synth.relics.applied.some((r) => r.includes("开场失去4"))).toBe(true);
  }
});

it("the fresh-start adapter carries opening metadata and the F49 zero-action death into whole-fight sampling", () => {
  const row = evidence.find((r) => r.floor === 49)!;
  const range = { min: 111, max: 111, median: 111, n: 1 };
  const fixedDb: MonsterDb = {
    monsters: {
      TEST_SUBJECT: {
        name: { zh: "实验体" }, hp_by_asc: { "10": range },
        moves: { FIXED_OPENING: { intents: { Attack: 1 }, turns_seen: { "1": 1 }, next: { FIXED_OPENING: 1 },
          damage_by_asc: { "10": { base_per_hit: { "22": 1 }, hits: { "1": 1 }, shown: { "22x1": 1 } } } } },
      },
    },
    bosses: { TEST_SUBJECT: { "10": { fights: 1, parts: { TEST_SUBJECT: { ...range, count_per_fight: 1 } } } } }, encounters: {},
  };
  const own = makeKnowledge({ cards: row.state.run.deck.map((c) => ({ id: c.card_id, name: c.name,
    type: c.card_type, cost: c.energy_cost, description: c.resolved_rules_text, description_raw: c.rules_text, vars: c.dynamic_values })) }, "cache");
  const start = syntheticBossStart(parseGameState(row.state), own, "TEST_SUBJECT_BOSS", 4, { db: fixedDb, mm: {} });
  expect(start.input.openingHpLoss).toBe(4);
  expect(start.input.solver.player.hp).toBe(0);
  expect(fightSample(start.input, null, 1, 3, false)).toMatchObject({ died: true, turns: 0, enemyHpLeft: 111, drunk: [] });
});

it("applies the cost once to each sample's transferred HP and records death before any second-fight action", () => {
  const firstInput = board();
  firstInput.continuation = { variants: [], potions: [], source: "fixed", limitation: "fixed" };
  const template = { ...board({ playerHp: 56, bossHp: 111 }), openingHpLoss: 4 };
  const base = fightSample(board(), null, 1, 1, false);
  for (const [before, after] of [[60, 56], [56, 52], [4, 0]]) {
    const next = continuationInput(firstInput, { ...base, won: true, resources: { hp: before!, revives: [], drunkKeys: [] } }, template);
    expect(next.input.solver.player.hp).toBe(after);
    expect(next.openingHpLoss).toBe(4);
    if (after === 0) {
      const result = fightSample(next.input, null, 1, 5, false);
      expect(result).toMatchObject({ died: true, won: false, turns: 0, enemyHpLeft: 111, policyTurns: 0, drunk: [], dmgByTurn: [], incomingByTurn: [] });
    }
  }
  expect(slimInput(template).openingHpLoss).toBe(4);
  // A normal observed combat/SL board has no fresh-opening metadata and stays at its actual 56 HP.
  expect(continuationInput(firstInput, { ...base, won: true, resources: { hp: 56, revives: [], drunkKeys: [] } }, board()).input.solver.player.hp).toBe(56);
});

it("shifts only the following-fight utility input, preserving its existing fitted values", () => {
  const raw = structuredClone(evidence.find((r) => r.floor === 48)!.state);
  const state = parseGameState(raw);
  const value = { hp: [[0, 0], [60, 40]] as [number, number][], source: "fixed utility, not a learned new weight" };
  const model: DoubleBossModel = { character: "silent", ascension: 10, act: 3, firstFloor: 48, secondFloor: 49,
    effect: "LEVEL_10", evidence: [{ run: "TXZ6RVMQA09D", floor: 49, turn: 1 }], value, potionHp: {}, poisonPotionAmount: 6,
    secondBosses: [{ boss: "TEST_SUBJECT", count: 1 }], limitation: "fixed model" };
  const start = vi.spyOn(bossStart, "syntheticBossStart").mockReturnValue({ input: board(), boss: opening,
    relics: { applied: [], unmodelled: [] }, entryHp: 56, maxHp: 62 });
  try {
    const input = withDoubleBossStart(state, knowledge, board(), model, { db, mm: {} });
    const shifted = input.solver.continuationValue!;
    expect(shifted.openingHpLoss).toBe(4);
    for (const hp of [1, 4, 5, 60]) expect(continuationUtility(shifted, hp)).toBe(continuationUtility(value, Math.max(0, hp - 4)));
    expect(value).not.toHaveProperty("openingHpLoss");
  } finally { start.mockRestore(); }
});

it("leaves blood-vial, unknown relic, automatic revive, melted and foreign-character/level combinations unchanged", () => {
  for (const change of [
    (r: any) => { r.character_id = "IRONCLAD"; }, (r: any) => { r.ascension = 9; },
    (r: any) => { r.relics.push({ relic_id: "BLOOD_VIAL" }); },
    (r: any) => { r.relics.push({ relic_id: "UNOBSERVED_OPENING_RELIC" }); },
    (r: any) => { r.potions.push({ occupied: true, potion_id: "FAIRY_IN_A_BOTTLE", usage: "Automatic" }); },
    (r: any) => { r.relics.find((p: any) => p.relic_id === "ROYAL_POISON").is_melted = true; },
  ]) {
    const raw = structuredClone(evidence[0]!.state); change(raw.run);
    const state = parseGameState(raw);
    expect(observedRoyalPoisonOpeningLoss(state)).toBe(0);
    expect(syntheticBossState(state, knowledge, opening, 4, db, {}).state.run!.current_hp).toBe(4);
  }
});

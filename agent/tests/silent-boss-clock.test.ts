/** C48LLXBGKXQ9 F18/F32, ledger silent-0003. Empty role statistics and one fixed common HP sample. */
import { afterEach, beforeEach, expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { bossClock, bossClockJson, bossLossPerTurn, bossProfile, calibrated, damageGap, deckDamagePerTurn,
  deckEstimate, deckProfileForBoss, setUnblockedSharesForTests, testSubjectPhase2Loss } from "../src/sim/boss-clock.js";
import { baseState, runPayload } from "./scenarios.js";

const knowledge = makeKnowledge({ cards: [{ id: "STRIKE_SILENT", type: "Attack", damage: 6 }] }, "cache");
const state = (character = "SILENT") => parseGameState(baseState("MAP", { run: runPayload({
  character_id: character, character_name: character, boss_id: "THE_INSATIABLE_BOSS", ascension: 0, floor: 18,
  relics: [], potions: [], deck: [{ card_id: "STRIKE_SILENT", card_type: "Attack", energy_cost: 1,
    dynamic_values: [{ name: "Damage", base_value: 6, current_value: 6 }] }],
}) }));

beforeEach(() => {
  setKnowledgeCharacter("silent");
  setMonsterDbForTests({ monsters: { THE_INSATIABLE: { hp_by_asc: { "0": { min: 200, median: 200, max: 200, n: 1 } } } },
    bosses: { THE_INSATIABLE: { "0": { fights: 1, parts: { THE_INSATIABLE: { median: 200, n: 1, count_per_fight: 1 } } } } }, encounters: {} });
  setUnblockedSharesForTests({});
});
afterEach(() => { setMonsterDbForTests(null); setUnblockedSharesForTests(null); setKnowledgeCharacter(null); });

it("marks Silent calibration unknown and retains the first common monster HP sample", () => {
  expect(bossClock(state(), knowledge)).toBeNull();
  expect(damageGap(state(), knowledge)).toBeNull();
  expect(deckDamagePerTurn(state(), knowledge)).toBeNull();
  expect(deckEstimate(deckProfileForBoss(state(), knowledge)!, "THE_INSATIABLE", 9)).toBeNull();
  const facts = bossClockJson(state(), knowledge)!;
  expect(facts).toMatchObject({ boss_hp: 200, deck_damage_per_turn_estimate: null, hp_loss_per_turn: null,
    survivable_turns: null, gap_per_turn: null, estimate_note: expect.stringContaining("尚无 silent") });
  expect(JSON.stringify(facts)).not.toMatch(/215|11 \+|0\.92|A8/);
  // The state character takes precedence even when a replay process defaults to Ironclad.
  setKnowledgeCharacter("ironclad");
  expect(bossClock(state(), knowledge)).toBeNull();
  expect(deckDamagePerTurn(state(), knowledge)).toBeNull();
});

it("does not substitute Ironclad A8 HP-loss constants for missing Silent statistics", () => {
  expect(bossLossPerTurn(bossProfile("THE_INSATIABLE")!, 0)).toMatchObject({ value: null, source: expect.stringContaining("silent") });
  expect(testSubjectPhase2Loss(0)).toMatchObject({ value: null, source: expect.stringContaining("silent") });
  setMonsterDbForTests({ monsters: { THE_INSATIABLE: { moves: { HIT: {
    n_seen: 1, turns_seen: { "1": 1 }, next: { HIT: 1 }, damage_by_asc: { "0": { base_per_hit: { "20": 1 }, hits: { "1": 1 } } },
  } } } }, bosses: { THE_INSATIABLE: { "0": { fights: 1, parts: { THE_INSATIABLE: { count_per_fight: 1 } } } } }, encounters: {} });
  setUnblockedSharesForTests({ THE_INSATIABLE: { unblocked_share: 0.25, fights: 1 } });
  expect(bossLossPerTurn(bossProfile("THE_INSATIABLE")!, 0)).toMatchObject({ value: 5, estimated: false });
});

it("keeps the existing Ironclad fit and fallback numbers", () => {
  setKnowledgeCharacter("ironclad");
  expect(calibrated(20)).toBeCloseTo(29.4);
  expect(bossLossPerTurn(bossProfile("THE_INSATIABLE")!, 0).value).toBe(bossProfile("THE_INSATIABLE")!.lossPerTurn);
  expect(testSubjectPhase2Loss(0).value).toBe(15);
  expect(deckEstimate(deckProfileForBoss(state("IRONCLAD"), knowledge)!, "THE_INSATIABLE", 9)).toBeGreaterThan(0);
});

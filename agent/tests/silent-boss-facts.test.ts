/** ZZMYZ5UBCG72 F34, 9YBKCNBFP0X5 F34, 1LMBFGSMCWKU F48 T1/T9; clock facts, not a fitted deck policy. */
import { afterEach, beforeEach, expect, it } from "vitest";
import { parseGameState } from "../src/hand/mod/schema.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { type MonsterDb, roomHpCost, setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { bossClockJson, bossHp, bossProfile } from "../src/sim/boss-clock.js";
import { baseState, runPayload } from "./scenarios.js";

const knowledge = makeKnowledge({}, "cache");
const state = (ascension = 4, boss = "QUEEN_BOSS") => parseGameState(baseState("MAP", { run: runPayload({
  character_id: "SILENT", character_name: "静默猎手", boss_id: boss, ascension, floor: 34, relics: [], potions: [], deck: [],
}) }));
const hp = (median: number) => ({ min: median, median, max: median, n: 1 });
const fixture = (): MonsterDb => ({
  monsters: {
    QUEEN: { hp_by_asc: { "4": hp(400) }, moves: {
      // T9's observed 10 x 5 includes Strength and Vulnerable: it must never be labelled base damage.
      OFF_WITH_YOUR_HEAD_MOVE: { damage_by_asc: {
        "2": { base_per_hit: { "3": 1 }, hits: { "5": 1 } },
        "4": { shown: { "10x5": 1 }, hits: { "5": 1 } },
      } },
    } },
    TORCH_HEAD_AMALGAM: { hp_by_asc: { "4": hp(199) }, moves: {
      STRONG_TACKLE_MOVE: { damage_by_asc: { "4": { base_per_hit: { "26": 1 }, hits: { "1": 1 } } } },
    } },
  },
  // A stale character encounter must not hide a current-ascension common monster observation.
  bosses: { QUEEN: { "2": { fights: 1, parts: { QUEEN: hp(400), TORCH_HEAD_AMALGAM: hp(199) } } } },
  encounters: {},
});
beforeEach(() => { setKnowledgeCharacter("silent"); setMonsterDbForTests(fixture()); });
afterEach(() => { setMonsterDbForTests(null); setKnowledgeCharacter(null); });

it("uses the first A4 Queen body sample without the legacy 60 block allowance or mandatory minion damage", () => {
  const facts = bossClockJson(state(), knowledge)!;
  expect(facts).toMatchObject({ boss_hp: 400, boss_hp_parts: ["QUEEN"],
    deck_damage_per_turn_estimate: null, hp_loss_per_turn: null, survivable_turns: null, gap_per_turn: null });
  expect(facts.boss_enemies).toEqual(expect.arrayContaining([
    expect.objectContaining({ enemy: "QUEEN", hp: 400, hp_samples: 1, hp_from_ascension: 4, hp_estimated: false }),
    expect.objectContaining({ enemy: "TORCH_HEAD_AMALGAM", hp: 199, hp_samples: 1 }),
  ]));
});

it("shows first-sample attacks even without a calibrated deck, distinguishing base and observed modified hits", () => {
  const facts = bossClockJson(state(), knowledge)!;
  expect(facts.boss_enemies).toEqual(expect.arrayContaining([
    expect.objectContaining({ enemy: "QUEEN", attacks: [expect.objectContaining({ move: "OFF_WITH_YOUR_HEAD_MOVE",
      per_hit: 10, hits: 5, basis: "shown", samples: 1, from_ascension: 4, estimated: false })] }),
    expect.objectContaining({ enemy: "TORCH_HEAD_AMALGAM", attacks: [expect.objectContaining({ move: "STRONG_TACKLE_MOVE",
      per_hit: 26, hits: 1, basis: "base", samples: 1, from_ascension: 4, estimated: false })] }),
  ]));
  expect(facts.boss_enemy_note).toContain("不是逐回合预测或玩家掉血");
});

it("labels borrowing an unseen ascension and leaves completely unobserved HP and attacks unknown", () => {
  const borrowed = bossClockJson(state(5), knowledge)!;
  expect(borrowed.boss_enemies).toEqual(expect.arrayContaining([
    expect.objectContaining({ enemy: "QUEEN", hp_from_ascension: 4, hp_estimated: true,
      attacks: [expect.objectContaining({ from_ascension: 4, estimated: true, scaled_through_ascension: 4 })] }),
  ]));
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  expect(bossClockJson(state(), knowledge)).toMatchObject({ boss_hp: null, boss_enemies: [], gap_per_turn: null });
});

it("prefers base damage when it too is observed at the current ascension", () => {
  const db = fixture();
  db.monsters.QUEEN!.moves!.OFF_WITH_YOUR_HEAD_MOVE!.damage_by_asc!["4"]!.base_per_hit = { "3": 1 };
  setMonsterDbForTests(db);
  expect(bossClockJson(state(), knowledge)?.boss_enemies).toEqual(expect.arrayContaining([
    expect.objectContaining({ enemy: "QUEEN", attacks: [expect.objectContaining({ per_hit: 3,
      basis: "base", samples: 1, from_ascension: 4, estimated: false })] }),
  ]));
});

it("keeps an incomplete two-body boss HP unknown (CSBR5CRDWQNB F33 T1: 199 plus 209)", () => {
  const db: MonsterDb = { monsters: { ROCKET: { hp_by_asc: { "2": hp(199) } },
    CRUSHER: { hp_by_asc: { "2": hp(209) } } }, bosses: {}, encounters: {} };
  setMonsterDbForTests(db);
  expect(bossClockJson(state(2, "KAISER_CRAB_BOSS"), knowledge)?.boss_hp).toBe(408);
  delete db.monsters.CRUSHER;
  setMonsterDbForTests(db);
  expect(bossClockJson(state(2, "KAISER_CRAB_BOSS"), knowledge)).toMatchObject({ boss_hp: null,
    boss_enemies: [expect.objectContaining({ enemy: "ROCKET", hp: 199 })] });
});

it("retains observed Test Subject phases rather than treating its first phase as the whole body", () => {
  setMonsterDbForTests({ monsters: { TEST_SUBJECT: { hp_by_asc: { "3": hp(100) } } },
    bosses: { TEST_SUBJECT: { "3": { fights: 1, parts: { TEST_SUBJECT: hp(100) }, phases: { "100 > 200 > 300": 1 } } } }, encounters: {} });
  expect(bossClockJson(state(3, "TEST_SUBJECT_BOSS"), knowledge)).toMatchObject({ boss_hp: 600,
    boss_hp_phases: [100, 200, 300], boss_hp_phases_from_ascension: 3 });
});

it("preserves the five-sample room-cost gate while accepting one monster sample", () => {
  const db = fixture();
  db.encounters = { hallway: { acts: { "3": 1 }, rooms: { hallway: 4 },
    by_asc: { "4": { net_hp_loss_won: { n: 4, median: 9, p75: 12 } } } } };
  setMonsterDbForTests(db);
  expect(roomHpCost(3, 4, "Monster")).toBeNull();
  expect(bossClockJson(state(), knowledge)?.boss_hp).toBe(400);
  db.encounters.hallway!.by_asc!["4"]!.net_hp_loss_won!.n = 5;
  setMonsterDbForTests(db);
  expect(roomHpCost(3, 4, "Monster")).toMatchObject({ n: 5, median: 9 });
});

it("leaves the existing calibrated-character HP estimate unchanged", () => {
  setMonsterDbForTests({ monsters: {}, bosses: { QUEEN: { "4": { parts: { QUEEN: hp(400) } } } }, encounters: {} });
  setKnowledgeCharacter("ironclad");
  expect(bossHp(bossProfile("QUEEN")!, 4)).toBe(460);
});

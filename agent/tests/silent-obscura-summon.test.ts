/** C48LLXBGKXQ9 F30 T1 / 1HC609GTLGN3 F22 T1, ledger silent-0029. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { summonsAt, type MonsterEntry } from "../src/knowledge/monster-db.js";
import { boardRolloutInput, summonThreatAt } from "../src/reflex/rollout-live.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import type { GameState } from "../src/hand/mod/schema.js";
import { board } from "./boss-sim-fixture.js";

const db = { PARAFRIGHT: { name: { zh: "寄生惧魔" }, hp_by_asc: { "0": { n: 1, median: 21 }, "9": { n: 1, median: 33 } }, moves: {
  SLAM_MOVE: { n_seen: 1, damage_by_asc: { "0": { base_per_hit: { "16": 1 }, hits: { "1": 1 } } }, next: { SLAM_MOVE: 1 } },
} } } as unknown as Record<string, MonsterEntry>;

it("uses the current ascension's first HP sample for the observed living summon", () => {
  expect(summonsAt("THE_OBSCURA", "ILLUSION_MOVE", 0, db)?.[0]).toMatchObject({ hp: 21, illusion: true, minion: true, move: "SLAM_MOVE" });
  expect(summonsAt("THE_OBSCURA", "ILLUSION_MOVE", 9, db)?.[0].hp).toBe(33);
  expect(summonsAt("THE_OBSCURA", "ILLUSION_MOVE", 0, {})).toBeNull();
  expect(summonThreatAt("THE_OBSCURA", "ILLUSION_MOVE", 0, [], false, db, {})).toBe(16);
});

it("a living Obscura summons a fresh illusion whose 16 attack joins the next turn's six", () => {
  const input = board();
  input.solver.hand = [];
  input.solver.enemies[0]!.attacks = [];
  input.enemies = [{ index: 0, id: "THE_OBSCURA", move: "ILLUSION_MOVE", strength: 0, powers: {} }];
  input.tables = {
    THE_OBSCURA: { moves: { ILLUSION_MOVE: { damage: 0, hits: 1, strength: 0, block: 0 }, HIT: { damage: 6, hits: 1, strength: 0, block: 0 } }, next: { ILLUSION_MOVE: { HIT: 1 }, HIT: { HIT: 1 } } },
    PARAFRIGHT: { moves: { SLAM_MOVE: { damage: 16, hits: 1, strength: 0, block: 0 } }, next: { SLAM_MOVE: { SLAM_MOVE: 1 } } },
  };
  input.summons = { THE_OBSCURA: { ILLUSION_MOVE: summonsAt("THE_OBSCURA", "ILLUSION_MOVE", 0, db)! } };
  input.piles = { handBase: [], draw: [], discard: [] };
  const plan = replaySteps(input.solver, [])!;
  input.plans = [plan];
  const records = simulateFight(input, plan, 2, 1, false).records;
  expect(records[0]!.loss).toBe(0); // The summoned body does not attack on arrival.
  expect(records[1]!.enemyPart).toBe(22);
  expect(records[1]!.snap.E.find((e) => e[1] === "PARAFRIGHT")?.[3]).toBe(21);
});

it("live input includes the summon and its table without duplicating an existing illusion", () => {
  const solver = board().solver;
  const raw = { combat: { enemies: [{ index: 0, enemy_id: "THE_OBSCURA", move_id: "ILLUSION_MOVE", powers: [] }] }, run: {} };
  const state = { raw, run: { raw: raw.run }, agentView: {} } as unknown as GameState;
  const input = boardRolloutInput(state, makeKnowledge({ cards: [] }, "cache"), solver, 0, db, {});
  expect(input.summons?.THE_OBSCURA?.ILLUSION_MOVE?.[0].hp).toBe(21);
  expect(input.tables.PARAFRIGHT).toBeDefined();
  expect(input.tables.PARAFRIGHT?.moves.SLAM_MOVE?.damage).toBe(16);
  raw.combat.enemies.push({ index: 1, enemy_id: "PARAFRIGHT", move_id: "SLAM_MOVE", powers: [] });
  expect(boardRolloutInput(state, makeKnowledge({ cards: [] }, "cache"), solver, 0, db, {}).summons).toBeUndefined();
});

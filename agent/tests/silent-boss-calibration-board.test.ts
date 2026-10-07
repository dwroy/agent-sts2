/** Fixed DB fixtures check normalization, not mechanics learned from another character's fights. */
import { expect, it } from "vitest";
import { normalizeCalibrationOpening } from "../tools/boss-sim/calibration-board.js";
import type { MonsterDb } from "../src/knowledge/monster-db.js";

it("uses nearest ascension HP/damage while retaining actual player resources and opening modifiers", () => {
  const enemy = { enemy_id: "FIXTURE", move_id: "ATTACK", current_hp: 99, max_hp: 99,
    powers: [{ power_id: "STRENGTH_POWER", amount: 2 }, { power_id: "WEAK_POWER", amount: 1 }],
    intents: [{ damage: 99, hits: 1, total_damage: 99 }] };
  const raw = { run: { current_hp: 35, deck: ["fixed"], relics: ["fixture"], potions: ["fixture"] }, combat: { enemies: [enemy] } };
  const before = structuredClone(raw.run);
  const db: MonsterDb = { bosses: {}, encounters: {}, monsters: { FIXTURE: { hp_by_asc: { "9": { median: 60 } },
    moves: { ATTACK: { damage_by_asc: { "9": { base_per_hit: { "10": 1 }, hits: { "2": 1 } } } } } } } };
  const opening = { key: "FIXTURE", name: "fixture", asc: 9, exact: false,
    parts: [{ index: 0, id: "FIXTURE", name: "fixture", hp: 60, move: "ATTACK", powers: {} }] };
  const source = normalizeCalibrationOpening(raw, opening, db, 10);
  expect(raw.run).toEqual(before);
  expect(enemy.current_hp).toBe(60);
  expect(enemy.intents).toEqual([{ damage: 9, hits: 2, total_damage: 18 }]);
  expect(source[0]).toMatchObject({ hpAsc: "9", openingAsc: 9, exactOpening: false, shown: 9 });
});

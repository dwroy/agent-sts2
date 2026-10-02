/**
 * The learner's mechanics audit (notes/mechanics-proposals.md, 2026-10-02): the residual tool's measurement fixes and the
 * solver bugs it found. One describe per fix, on the logged board of its evidence (tests/logged-states/fix3/, states.jsonl
 * lines as the mod sent them) or the logged numbers written into the test; the knowledge is the fixed test data
 * (tests/logged-states/game-data.json), never the refreshing files; no model call, nothing written under logs/.
 */

import { describe, expect, it } from "vitest";

import { alignEnemies, enemyIndexMaps, type FrameEnemy } from "../tools/mechanics-align.js";

const enemy = (idx: number, id: string, hp: number, maxHp: number): FrameEnemy => ({ idx, id, hp, max_hp: maxHp });

describe("1. residual tool: a play's target mapped back to the decision's index after a death compacts the list (proposal §2)", () => {
  it("H7W047ZCEBSA F29 T5: Fight Me killed egg [1], so the next frame's [2] is the Ovicopter, the decision's [3]", () => {
    // trace: [0] egg 11/20 [1] egg 21/21 [2] egg 21/21 [3] Ovicopter 20/129 -> [0] egg 11/20 [1] egg 21/21 [2] Ovicopter.
    const start = [enemy(0, "TOUGH_EGG", 20, 20), enemy(1, "TOUGH_EGG", 21, 21), enemy(2, "TOUGH_EGG", 21, 21), enemy(3, "OVICOPTER", 20, 129)];
    const afterSetup = [enemy(0, "TOUGH_EGG", 11, 20), enemy(1, "TOUGH_EGG", 21, 21), enemy(2, "TOUGH_EGG", 21, 21), enemy(3, "OVICOPTER", 20, 129)];
    const afterKill = [enemy(0, "TOUGH_EGG", 11, 20), enemy(1, "TOUGH_EGG", 21, 21), enemy(2, "OVICOPTER", 20, 129)];
    // The plays: Setup Strike > 0, Fight Me > 1 (the kill), Strike > 2.
    const maps = enemyIndexMaps([start, afterSetup, afterKill], [0, 1, 2]);
    expect(maps[2]!.get(2)).toBe(3);
    // The surviving egg is the one the kill did not target: the decision's [2], not [1].
    expect(maps[2]!.get(1)).toBe(2);
    expect(maps[2]!.get(0)).toBe(0);
    // Before the kill every index is its own.
    expect([...maps[1]!.entries()]).toEqual([[0, 0], [1, 1], [2, 2], [3, 3]]);
  });

  it("NX48MBG3SPRJ F30 T3: Sword Boomerang's random hits killed egg [0] (4 HP) and chipped the others: HP and max HP pair them", () => {
    const before = [enemy(0, "TOUGH_EGG", 4, 22), enemy(1, "TOUGH_EGG", 22, 22), enemy(2, "TOUGH_EGG", 20, 20), enemy(3, "OVICOPTER", 44, 126)];
    const after = [enemy(0, "TOUGH_EGG", 16, 22), enemy(1, "TOUGH_EGG", 14, 20), enemy(2, "OVICOPTER", 44, 126)];
    expect(alignEnemies(before, after, null)).toEqual([1, 2, 3]);
  });

  it("an enemy that was not there (a spawn) maps to nothing; no death keeps every index", () => {
    expect(alignEnemies([enemy(0, "A", 10, 10)], [enemy(0, "A", 8, 10), enemy(1, "B", 30, 30)], null)).toEqual([0, null]);
    expect(alignEnemies([enemy(0, "A", 10, 10), enemy(1, "A", 10, 10)], [enemy(0, "A", 4, 10), enemy(1, "A", 10, 10)], 0)).toEqual([0, 1]);
  });
});

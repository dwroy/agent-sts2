/**
 * Next-turn enemy damage (move-model expectedNextDamage / damageForecast / meanMoveDamage) at the run's
 * ascension: the monster DB's base per hit there plus the enemy's Strength, x1.5 while our Vulnerable lasts;
 * the move model's pooled shown average only as the fallback (Roy: monster damage at the current ascension).
 * Fixtures only: the knowledge files are swapped out.
 */

import { afterEach, describe, expect, it } from "vitest";

import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { boardDamageContext, damageForecast, expectedNextDamage, meanMoveDamage, moveDamage, setMoveModelForTests } from "../src/knowledge/move-model.js";

const MODEL = {
  KNIGHT: {
    // Pooled over A0-A9 with Strength and our Vulnerable of the logged turns in it: 20 for Flail.
    next: { SLASH: { FLAIL: 3, SLASH: 1 }, FLAIL: { SLASH: 1 } },
    damage: { SLASH: 8, FLAIL: 20, ROAR: 0 },
  },
  QUEEN: { next: { PREP: { HEAD: 1 } }, damage: { PREP: 0, HEAD: 43 } },
};

const DB = {
  bosses: {},
  encounters: {},
  monsters: {
    KNIGHT: {
      moves: {
        SLASH: { damage_by_asc: { "9": { base_per_hit: { "10": 5 }, hits: { "1": 5 } } } },
        FLAIL: { damage_by_asc: { "9": { base_per_hit: { "12": 7 }, hits: { "3": 7 } } } },
      },
    },
    QUEEN: { moves: { HEAD: { damage_by_asc: { "9": { base_per_hit: {}, shown: { "7x5": 4 }, hits: { "5": 4 } } } } } },
  },
};

describe("next-turn enemy damage at the run's ascension (consistency #15; review item 6)", () => {
  afterEach(() => {
    setMoveModelForTests(null);
    setMonsterDbForTests(null);
  });
  const setup = () => {
    setMoveModelForTests(MODEL);
    setMonsterDbForTests(DB as never);
  };

  it("a move's damage: the DB's base at this ascension plus Strength, times hits; x1.5 only while our Vulnerable lasts", () => {
    setup();
    expect(moveDamage("KNIGHT", "FLAIL", { asc: 9 })).toBe(36);
    expect(moveDamage("KNIGHT", "FLAIL", { asc: 9, strength: 2 })).toBe(42);
    // Vulnerable 2 now: still up on the next enemy turn; Vulnerable 1 is gone by then.
    expect(moveDamage("KNIGHT", "FLAIL", { asc: 9, strength: 2, vulnerable: 2 })).toBe(63);
    expect(moveDamage("KNIGHT", "FLAIL", { asc: 9, strength: 2, vulnerable: 1 })).toBe(42);
    // No base ever measured: the shown hit (Strength and Vulnerable in it), not re-scaled.
    expect(moveDamage("QUEEN", "HEAD", { asc: 9, strength: 4, vulnerable: 3 })).toBe(35);
    // Not in the DB at all: the pooled average; no context: the pooled average as before.
    expect(moveDamage("KNIGHT", "ROAR", { asc: 9 })).toBe(0);
    expect(moveDamage("KNIGHT", "FLAIL")).toBe(20);
  });

  it("expectedNextDamage weighs the successors by the move model, each at the DB's damage", () => {
    setup();
    // After Slash: Flail 3/4 (36), Slash 1/4 (10).
    expect(expectedNextDamage("KNIGHT", "SLASH", { asc: 9 })).toBeCloseTo(0.75 * 36 + 0.25 * 10);
    expect(expectedNextDamage("KNIGHT", "SLASH")).toBeCloseTo(0.75 * 20 + 0.25 * 8);
    expect(damageForecast("KNIGHT", "FLAIL", 2, 0, { asc: 9, vulnerable: 2 })).toEqual([15, 0.75 * 36 + 0.25 * 10]);
    expect(meanMoveDamage("KNIGHT", { asc: 9 })).toBeCloseTo((10 + 36 + 0) / 3);
  });

  it("boardDamageContext: the enemy's Strength with a temporary loss added back, our Vulnerable", () => {
    const enemy = { powers: [{ power_id: "STRENGTH_POWER", amount: -7 }, { power_id: "SHACKLING_POTION_POWER", amount: 7 }] };
    const player = { powers: [{ power_id: "VULNERABLE_POWER", amount: 2 }] };
    expect(boardDamageContext(enemy, player, 9)).toEqual({ asc: 9, strength: 0, vulnerable: 2 });
  });
});

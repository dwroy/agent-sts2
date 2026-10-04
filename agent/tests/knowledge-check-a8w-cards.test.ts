/**
 * Knowledge check 2026-09-30 (the A8 window's runs 1-11: RRMY 5LRZ 5PHF UNRL YVYZ Q8XR 3RME NH8A 2WRU 79YR 86C3; Dai's
 * rule: the guide, the handbook, Jev's hints, the card tiers, the boss notes and the experience base are one
 * knowledge base; where our data says otherwise, the data's version with its n; counts filled from the data).
 * See paper/materials/experience-changelog.md「第九次增量」.
 *
 * Card tiers the A8 outcome data contradicts (outcome-stats, 161 A8 runs to 86C3; taken vs offered and not taken,
 * the act's boss pass): both sides n >= 15, the gap >= 1.5 standard errors, the mean final floor agreeing, and no
 * n >= 15 comparison the other way.
 */

import { describe, expect, it } from "vitest";

import { cardValue, type DeckProfile } from "../src/hand/screens/card-value.js";

describe("card tiers from the A8 outcome data", () => {
  const deck: DeckProfile = { size: 15, aoe: 1, draw: 2, scaling: 1, frontload: 3, block: 2, exhaust: 0, basics: 8, copies: new Map() };

  it("Anger 50 -> 58, Feel No Pain 54 -> 46 (its exhaust payoff still +10), Sword Boomerang 46 -> 54", () => {
    expect(cardValue("ANGER", "Common", "Attack", deck, 2, 20).value).toBe(58);
    expect(cardValue("FEEL_NO_PAIN", "Uncommon", "Power", deck, 2, 20).value).toBe(46);
    expect(cardValue("FEEL_NO_PAIN", "Uncommon", "Power", { ...deck, exhaust: 3 }, 2, 20).value).toBe(56);
    expect(cardValue("SWORD_BOOMERANG", "Common", "Attack", deck, 2, 20).value).toBe(54);
  });
});

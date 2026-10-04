/**
 * Knowledge check 2026-09-29 (Dai: the guide, the handbook, Jev's hints, the card tiers and the boss notes are
 * knowledge like the experience base; where our data says otherwise, the data's version, with its ascension and
 * n; counts filled from the data, not hand-written). See paper/materials/experience-changelog.md「知识库核对」.
 */

import { describe, expect, it } from "vitest";

import { cardValue, type DeckProfile } from "../src/strategy/card-value.js";

describe("card tiers the outcome data contradicts (A8 outcome-stats, n >= 15 each way)", () => {
  const deck: DeckProfile = { size: 15, aoe: 1, draw: 2, scaling: 1, frontload: 3, block: 2, exhaust: 0, basics: 8, copies: new Map() };

  it("Taunt 62 -> 50, Molten Fist 54 -> 44, Twin Strike 58 -> 64", () => {
    expect(cardValue("TAUNT", "Common", "Skill", deck, 2, 20).value).toBe(50);
    expect(cardValue("MOLTEN_FIST", "Common", "Attack", deck, 2, 20).value).toBe(44);
    expect(cardValue("TWIN_STRIKE", "Common", "Attack", deck, 2, 20).value).toBe(64);
  });

  it("Aeonglass: plain True Grit gets no Wither bonus (random exhaust); Burning Pact still does", () => {
    const grit = cardValue("TRUE_GRIT", "Common", "Skill", deck, 3, 40);
    expect(cardValue("TRUE_GRIT", "Common", "Skill", deck, 3, 40, "AEONGLASS_BOSS").reasons).not.toContain("exhausts Aeonglass's Withers");
    expect(cardValue("TRUE_GRIT", "Common", "Skill", deck, 3, 40, "AEONGLASS_BOSS").value).toBe(grit.value);
    expect(cardValue("BURNING_PACT", "Common", "Skill", deck, 3, 40, "AEONGLASS_BOSS").reasons).toContain("exhausts Aeonglass's Withers");
  });
});

import { describe, expect, it } from "vitest";

import { cardValue, type DeckProfile } from "../src/strategy/card-value.js";

function deck(size: number): DeckProfile {
  return { size, aoe: 1, draw: 2, scaling: 1, frontload: 3, block: 2, basics: 8, copies: new Map() };
}

describe("cardValue", () => {
  it("starts the bloat penalty past 22 cards, not 18 (0NG took no card in Act 2)", () => {
    expect(cardValue("TWIN_STRIKE", "Common", "Attack", deck(22), 2, 20).value).toBe(58);
    expect(cardValue("TWIN_STRIKE", "Common", "Attack", deck(24), 2, 20).value).toBe(55);
  });

  it("Waterfall Giant favours block and front-loaded damage", () => {
    const plain = cardValue("FLAME_BARRIER", "Uncommon", "Skill", deck(15), 1, 10).value;
    expect(cardValue("FLAME_BARRIER", "Uncommon", "Skill", deck(15), 1, 10, "WATERFALL_GIANT").value).toBe(plain + 6);
    const hit = cardValue("HEADBUTT", "Common", "Attack", deck(15), 1, 10).value;
    expect(cardValue("HEADBUTT", "Common", "Attack", deck(15), 1, 10, "WATERFALL_GIANT").value).toBe(hit + 6);
  });

  it("Knowledge Demon favours Strength/scaling", () => {
    const plain = cardValue("INFLAME", "Uncommon", "Power", deck(15), 2, 20).value;
    expect(cardValue("INFLAME", "Uncommon", "Power", deck(15), 2, 20, "KNOWLEDGE_DEMON").value).toBe(plain + 6);
    expect(cardValue("HEADBUTT", "Common", "Attack", deck(15), 2, 20, "KNOWLEDGE_DEMON").value).toBe(cardValue("HEADBUTT", "Common", "Attack", deck(15), 2, 20).value);
  });
});

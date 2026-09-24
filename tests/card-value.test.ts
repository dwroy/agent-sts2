import { describe, expect, it } from "vitest";

import { cardValue, deckProfile, type DeckProfile } from "../src/strategy/card-value.js";

function deck(size: number): DeckProfile {
  return { size, aoe: 1, draw: 2, scaling: 1, frontload: 3, block: 2, exhaust: 0, basics: 8, copies: new Map() };
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

  it("Dark Embrace / Feel No Pain only pay with 3+ exhausting cards (Z2H3 F12: Dark Embrace 67 over True Grit, one exhauster)", () => {
    const entry = (card_id: string, index: number) => ({ index, card_id, name: card_id, upgraded: false, type: "Skill", rarity: "Common", cost: 1, description: "" });
    const thin = deckProfile([entry("MOLTEN_FIST", 0), entry("STRIKE_R", 1), entry("PACTS_END", 2), entry("EVIL_EYE", 3)]);
    const fed = deckProfile([entry("TRUE_GRIT", 0), entry("BURNING_PACT", 1), entry("SECOND_WIND", 2)]);
    expect(thin.exhaust).toBe(1);
    expect(fed.exhaust).toBe(3);
    const embraceThin = cardValue("DARK_EMBRACE", "Uncommon", "Power", { ...deck(19), exhaust: thin.exhaust }, 1, 12).value;
    const embraceFed = cardValue("DARK_EMBRACE", "Uncommon", "Power", { ...deck(19), exhaust: fed.exhaust }, 1, 12).value;
    expect(embraceThin).toBeLessThan(50);
    expect(embraceFed - embraceThin).toBe(20);
    expect(embraceThin).toBeLessThan(cardValue("TRUE_GRIT", "Common", "Skill", deck(19), 1, 12).value);
    const painThin = cardValue("FEEL_NO_PAIN", "Uncommon", "Power", { ...deck(19), exhaust: 1 }, 2, 20).value;
    expect(cardValue("FEEL_NO_PAIN", "Uncommon", "Power", { ...deck(19), exhaust: 3 }, 2, 20).value - painThin).toBe(10);
    expect(cardValue("DARK_EMBRACE", "Uncommon", "Power", deck(19), 1, 12, "", ["TOASTY_MITTENS"]).value).toBe(embraceFed);
  });
});

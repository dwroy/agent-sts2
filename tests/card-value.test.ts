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

  it("Fight Me! is valued like Inflame from our own outcome stats, not the F tier (RBJ4, 6189: code rank last)", () => {
    const fightMe = cardValue("FIGHT_ME", "Uncommon", "Attack", deck(15), 1, 6).value;
    expect(fightMe).toBeGreaterThanOrEqual(cardValue("INFLAME", "Uncommon", "Power", deck(15), 1, 6).value);
    const noScaling = { ...deck(15), scaling: 0 };
    expect(cardValue("FIGHT_ME", "Uncommon", "Attack", noScaling, 1, 6).reasons).toContain("no scaling for bosses");
    // In the deck it counts as scaling.
    expect(deckProfile([{ index: 0, card_id: "FIGHT_ME", name: "Fight Me!", upgraded: false, type: "Attack", rarity: "Uncommon", cost: 2, description: "" }]).scaling).toBe(1);
  });

  it("Knowledge Demon favours Strength/scaling", () => {
    const plain = cardValue("INFLAME", "Uncommon", "Power", deck(15), 2, 20).value;
    expect(cardValue("INFLAME", "Uncommon", "Power", deck(15), 2, 20, "KNOWLEDGE_DEMON").value).toBe(plain + 10);
    expect(cardValue("HEADBUTT", "Common", "Attack", deck(15), 2, 20, "KNOWLEDGE_DEMON").value).toBe(cardValue("HEADBUTT", "Common", "Attack", deck(15), 2, 20).value + 4);
    expect(cardValue("SHRUG_IT_OFF", "Common", "Skill", deck(15), 2, 20, "KNOWLEDGE_DEMON").value).toBe(cardValue("SHRUG_IT_OFF", "Common", "Skill", deck(15), 2, 20).value);
  });

  it("boss HP in the reasons is the A8 table's (RWWG: the crab said 408, it is 428 at A8)", () => {
    const reasons = (cardId: string, type: string, bossId: string) => cardValue(cardId, "Uncommon", type, deck(15), 2, 20, bossId).reasons;
    expect(reasons("INFLAME", "Power", "KAISER_CRAB_BOSS")).toContain("scaling for the Kaiser Crab's 428 HP");
    expect(reasons("HEADBUTT", "Attack", "KAISER_CRAB_BOSS")).toContain("damage for the Kaiser Crab's 428 HP");
    expect(reasons("INFLAME", "Power", "KNOWLEDGE_DEMON_BOSS")).toContain("Strength/scaling for the Knowledge Demon's 399 HP");
    expect(reasons("INFLAME", "Power", "VANTOM_BOSS")).toContain("scaling for Vantom's 183 HP");
    expect(reasons("HEADBUTT", "Attack", "CEREMONIAL_BEAST_BOSS")).toContain("damage for the Beast's 262 HP");
    expect(reasons("INFLAME", "Power", "KAISER_CRAB_BOSS").join(" ")).not.toContain("408");
  });

  it("Aeonglass: the big-hit bonus goes to real big hits only (L34T: Setup Strike, a 3rd Pommel Strike)", () => {
    const pommel = cardValue("POMMEL_STRIKE", "Common", "Attack", deck(15), 3, 40).value;
    expect(cardValue("POMMEL_STRIKE", "Common", "Attack", deck(15), 3, 40, "AEONGLASS_BOSS").value).toBe(pommel);
    const bludgeon = cardValue("BLUDGEON", "Uncommon", "Attack", deck(15), 3, 40).value;
    expect(cardValue("BLUDGEON", "Uncommon", "Attack", deck(15), 3, 40, "AEONGLASS_BOSS").value).toBe(bludgeon + 4);
  });

  it("Test Subject favours Strength scaling (7DFB, ZANM: 16 Strength or none, both died in phase 2-3)", () => {
    const plain = cardValue("INFLAME", "Uncommon", "Power", deck(15), 3, 40).value;
    expect(cardValue("INFLAME", "Uncommon", "Power", deck(15), 3, 40, "TEST_SUBJECT_BOSS").value).toBe(plain + 10);
  });

  it("Kaiser Crab favours AoE, then scaling (WLY1 F31: Thunderclap skipped, 21.6 damage a turn into 408 HP)", () => {
    const plain = cardValue("THUNDERCLAP", "Common", "Attack", deck(15), 2, 20).value;
    expect(cardValue("THUNDERCLAP", "Common", "Attack", deck(15), 2, 20, "KAISER_CRAB").value).toBe(plain + 12);
    const inflame = cardValue("INFLAME", "Uncommon", "Power", deck(15), 2, 20).value;
    expect(cardValue("INFLAME", "Uncommon", "Power", deck(15), 2, 20, "KAISER_CRAB").value).toBe(inflame + 8);
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

  it("Act 1 boss stats: AoE and permanent Strength earlier (wins 81% vs 47% AoE, 50% vs 27% Strength)", () => {
    const bare = { ...deck(15), aoe: 0, scaling: 0 };
    expect(cardValue("BREAKTHROUGH", "Common", "Attack", bare, 1, 2).value).toBe(62 + 14);
    expect(cardValue("INFLAME", "Uncommon", "Power", bare, 1, 3).value).toBe(74);
    expect(cardValue("INFLAME", "Uncommon", "Power", bare, 1, 4).value).toBe(74 + 10);
    const entry = (card_id: string, index: number) => ({ index, card_id, name: card_id, upgraded: false, type: "Attack", rarity: "Common", cost: 1, description: "" });
    expect(deckProfile([entry("SETUP_STRIKE", 0), entry("STRIKE_R", 1)]).scaling).toBe(0);
    expect(deckProfile([entry("INFLAME", 0)]).scaling).toBe(1);
  });

  it("Soul Fysh: exhaust and damage up, Battle Trance down; Matriarch: scaling and damage up", () => {
    const at = (cardId: string, type: string, boss = "") => cardValue(cardId, "Common", type, deck(15), 1, 10, boss).value;
    expect(at("BURNING_PACT", "Skill", "SOUL_FYSH_BOSS")).toBe(at("BURNING_PACT", "Skill") + 8);
    expect(at("HEADBUTT", "Attack", "SOUL_FYSH_BOSS")).toBe(at("HEADBUTT", "Attack") + 6);
    expect(at("BATTLE_TRANCE", "Skill", "SOUL_FYSH_BOSS")).toBe(at("BATTLE_TRANCE", "Skill") - 10);
    expect(at("INFLAME", "Power", "LAGAVULIN_MATRIARCH_BOSS")).toBe(at("INFLAME", "Power") + 10);
    expect(at("HEADBUTT", "Attack", "LAGAVULIN_MATRIARCH_BOSS")).toBe(at("HEADBUTT", "Attack") + 6);
  });
});

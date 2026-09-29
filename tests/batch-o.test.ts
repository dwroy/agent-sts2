/**
 * Fix batch O (the leftovers of batch N). Fixtures in tests/logged-states/batch-o/.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { calibrated, deckEstimate, deckProfileForBoss, ESTIMATE_SLOPE, mechanicFactor, rawDeckDamage, type DeckProfile } from "../src/strategy/boss-clock.js";
import { baseState, runPayload } from "./scenarios.js";

type Raw = Record<string, unknown>;
const DIR = join(dirname(fileURLToPath(import.meta.url)), "logged-states", "batch-o");
const fixture = <T>(name: string): T => JSON.parse(readFileSync(join(DIR, name), "utf8")) as T;

describe("boss clock: the Knowledge Demon's Sloth caps card plays, not the powers' own triggers", () => {
  const fx = fixture<{ boards: Record<string, { run: Raw }>; game_data: Record<string, unknown[]> }>("boss-clock-kd-sloth.json");
  // The game data those decks reference, fixed with the fixture (not the refreshed knowledge).
  const knowledge = makeKnowledge(fx.game_data, "cache");
  const deckOf = (key: string): DeckProfile => deckProfileForBoss(parseGameState(baseState("MAP", { run: runPayload(fx.boards[key]!.run) })), knowledge)!;
  const KD = "KNOWLEDGE_DEMON_BOSS";
  const unrounded = (deck: DeckProfile, turns: number) => calibrated(rawDeckDamage(deck, KD, turns)) * mechanicFactor("KNOWLEDGE_DEMON", deck, turns);

  it("the turn-start power hits are told apart: 5HHL F32 Juggernaut 6 on Crimson Mantle's block, S1MU F32 Inferno+ 9 on its own HP loss", () => {
    expect(deckOf("5HHLMV2DZ5AZ:32").passiveTurnStart).toBe(6);
    expect(deckOf("S1MURCR8DGPT:32").passiveTurnStart).toBe(9);
  });

  it("5HHL F32 (3.7 plays a turn, Sloth binds): the turn-start Juggernaut hits go through whole, the card part is capped (29.4 -> 30.3 at 8 turns)", () => {
    const deck = deckOf("5HHLMV2DZ5AZ:32");
    const turns = 8;
    const sloth = 3 / deck.plays;
    expect(sloth).toBeLessThan(1);
    // Mind Rot from T5: one card of five less on turns 6-8.
    const cap = (sloth * 5 + sloth * 0.8 * 3) / turns;
    const total = calibrated(rawDeckDamage(deck, KD, turns));
    const free = ESTIMATE_SLOPE * 6 * ((turns - deck.setupTurn) / turns);
    expect(unrounded(deck, turns)).toBeCloseTo(cap * (total - free) + free, 6);
    // The whole estimate capped was 29.45.
    expect(unrounded(deck, turns)).toBeGreaterThan(total * cap + 0.5);
    expect(deckEstimate(deck, KD, turns)).toBe(30);
  });

  it("more turn-start power damage adds its full calibrated value; the same damage from card plays adds only the capped share", () => {
    const deck = deckOf("5HHLMV2DZ5AZ:32");
    const turns = 8;
    const inPlay = (turns - deck.setupTurn) / turns;
    const base = unrounded(deck, turns);
    const powers = unrounded({ ...deck, passiveDamage: deck.passiveDamage! + 10, passiveTurnStart: deck.passiveTurnStart! + 10 }, turns);
    expect(powers - base).toBeCloseTo(ESTIMATE_SLOPE * 10 * inPlay, 6);
    const cards = unrounded({ ...deck, passiveDamage: deck.passiveDamage! + 10 }, turns);
    expect(cards - base).toBeLessThan(ESTIMATE_SLOPE * 10 * inPlay * 0.8);
  });

  it("power damage is not raised by Vulnerable (logged: Inferno and Juggernaut hits on Vulnerable enemies took their plain amount)", () => {
    const deck = deckOf("5HHLMV2DZ5AZ:32");
    const plain = { ...deck, vulnerableSources: 0 };
    const vulnerable = { ...deck, vulnerableSources: 2 };
    const powers = (d: DeckProfile) => rawDeckDamage(d, "QUEEN_BOSS", 8) - rawDeckDamage({ ...d, passiveDamage: 0, passiveAoe: 0 }, "QUEEN_BOSS", 8);
    expect(powers(vulnerable)).toBeCloseTo(powers(plain), 9);
    expect(powers(plain)).toBeGreaterThan(0);
  });

  it("a deck with no turn-start power damage reads as before (the cap on the whole estimate)", () => {
    const deck = { ...deckOf("5HHLMV2DZ5AZ:32"), passiveDamage: 0, passiveAoe: 0, passiveTurnStart: 0 };
    const sloth = 3 / deck.plays;
    expect(mechanicFactor("KNOWLEDGE_DEMON", deck, 8)).toBeCloseTo((sloth * 5 + sloth * 0.8 * 3) / 8, 9);
  });
});

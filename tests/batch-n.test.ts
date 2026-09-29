/**
 * Fix batch N (post-mortems MZFV S1MU 5HHL, the A8 window's runs 12-14; the leftovers of batch M). Fixtures in
 * tests/logged-states/batch-n/.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { deckEstimate, deckProfileForBoss } from "../src/strategy/boss-clock.js";
import { baseState, runPayload } from "./scenarios.js";

type Raw = Record<string, unknown>;
const DIR = join(dirname(fileURLToPath(import.meta.url)), "logged-states", "batch-n");
const fixture = <T>(name: string): T => JSON.parse(readFileSync(join(DIR, name), "utf8")) as T;

describe("boss clock: self-damage engines (S1MU, 5HHL)", () => {
  const fx = fixture<{ boards: Record<string, { run: Raw }>; game_data: Record<string, unknown[]> }>("boss-clock-self-damage.json");
  // The game data those decks reference, fixed with the fixture (not the refreshed knowledge).
  const knowledge = makeKnowledge(fx.game_data, "cache");
  const deckOf = (key: string) => {
    const run = fx.boards[key]!.run;
    return { deck: deckProfileForBoss(parseGameState(baseState("MAP", { run: runPayload(run) })), knowledge)!, boss: String(run["boss_id"]) };
  };

  it("Rupture+ gives 2 per HP loss and Inferno's turn-start loss feeds it every turn (S1MU F33: Strength +2 a turn from T4)", () => {
    const { deck } = deckOf("S1MURCR8DGPT:32");
    // Inferno alone: one HP loss a turn x 2 = +2; the two self-damage cards add their share of the plays.
    expect(deck.ruptureRate).toBeGreaterThanOrEqual(2);
    expect(deck.ruptureRate).toBeLessThan(3);
    expect(deck.growth.join("; ")).toMatch(/Rupture \+2 per HP loss, fed by Inferno each turn \+ 2 self-damage cards/);
  });

  it("Inferno's hit to all per HP loss is in the estimate (S1MU F33 Inferno+ 9; F48 two Infernos stack to 18, Crimson Mantle adds a loss a turn)", () => {
    const kd = deckOf("S1MURCR8DGPT:32").deck;
    expect(kd.passiveAoe).toBeGreaterThanOrEqual(9);
    const aeon = deckOf("S1MURCR8DGPT:47").deck;
    // Two turn-start losses (Inferno, Crimson Mantle) x 18, plus the four self-damage cards' share.
    expect(aeon.passiveAoe).toBeGreaterThanOrEqual(36);
    expect(aeon.ruptureRate).toBeGreaterThanOrEqual(4);
    expect((aeon.passive ?? []).join("; ")).toMatch(/Inferno 18 to all per HP loss/);
  });

  it("Juggernaut's damage per block gained is in the estimate (5HHL)", () => {
    const { deck } = deckOf("5HHLMV2DZ5AZ:32");
    // 7 block cards of 24 and Crimson Mantle's block each turn: ~2.4 gains a turn x 6.
    expect(deck.passiveDamage).toBeGreaterThan(10);
    expect(deck.passiveAoe).toBe(0);
    expect((deck.passive ?? []).join("; ")).toMatch(/Juggernaut 6 per block gain/);
  });

  it("the calibrated estimates at 8 turns move toward the realised damage and stay under it (calibration unchanged)", () => {
    // Before (v3 8b24187): 21 / 21 / 23 / 36; realised 51.0 / 76.4 / 41.7 / 57.3 a turn.
    const at8 = (key: string) => {
      const { deck, boss } = deckOf(key);
      return deckEstimate(deck, boss, 8);
    };
    expect(at8("S1MURCR8DGPT:32")).toBeGreaterThanOrEqual(28);
    expect(at8("S1MURCR8DGPT:32")).toBeLessThan(51);
    expect(at8("S1MURCR8DGPT:47")).toBeGreaterThanOrEqual(35);
    expect(at8("S1MURCR8DGPT:47")).toBeLessThan(76);
    expect(at8("5HHLMV2DZ5AZ:32")).toBeGreaterThanOrEqual(27);
    expect(at8("5HHLMV2DZ5AZ:32")).toBeLessThan(42);
    expect(at8("5HHLMV2DZ5AZ:47")).toBeGreaterThanOrEqual(39);
    expect(at8("5HHLMV2DZ5AZ:47")).toBeLessThan(57);
  });
});

/**
 * Rules from the A8 post-mortems of VUV4, T86W, X8R8 and M9PL (notes/lessons.md): three act-1 boss
 * deaths in a row behind the clock with an unmodelled potion carried to the death, and an act-2 crab
 * fought on a deck estimate twice what it dealt. Replayed on the logged boards (tests/logged-states).
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import { averagePowerStrength, damageGap, expectedPlayTurn } from "../src/strategy/boss-clock.js";
import { cardRoles, damageRole } from "../src/strategy/card-value.js";
import { logged, loggedKnowledge } from "./logged.js";

describe("boss clock: a power counts from its expected play turn (M9PL F32)", () => {
  it("a 28-card deck plays a drawn power around T4", () => {
    expect(expectedPlayTurn(28)).toBeCloseTo(3.8, 1);
    // Demon Form from ~T3.8 over the crab's 8 turns: ~4 Strength a turn on average, not 7.
    expect(averagePowerStrength(3, true, expectedPlayTurn(28), 8)).toBeCloseTo(4.1, 1);
    // Inflame: its 2 Strength for the turns after it is up.
    expect(averagePowerStrength(2, false, 3, 8)).toBeCloseTo(1.25, 2);
    expect(averagePowerStrength(3, true, 9, 8)).toBe(0);
  });

  it("the Demon Form + Exterminate deck no longer reads the crab gap as closed", () => {
    // Logged: "need 54 deck 53 gap 1"; the fight dealt 24.5 a turn.
    const gap = damageGap(parseGameState(logged("m9pl-f32-rest").state), loggedKnowledge)!;
    expect(gap.boss).toBe("KAISER_CRAB");
    expect(gap.deck).toBeLessThanOrEqual(46);
    expect(gap.gap).toBeGreaterThanOrEqual(8);
  });
});

describe("Pyre is energy, not Strength (T86W F9)", () => {
  it("does not fill the run plan's strength role", () => {
    expect(cardRoles("PYRE").has("strength")).toBe(false);
    expect(cardRoles("INFLAME").has("strength")).toBe(true);
    // Still scaling damage for the boss clock's gap bonus.
    expect(damageRole("PYRE")).toBe("scaling");
  });

  it("the game data says so", () => {
    const data = JSON.parse(readFileSync(new URL("./logged-states/game-data.json", import.meta.url), "utf8")) as { cards: { id: string; vars: { name: string }[] }[] };
    const vars = data.cards.find((card) => card.id === "PYRE")!.vars.map((entry) => entry.name);
    expect(vars).toEqual(["Energy"]);
  });
});

describe("The Kin: the guide DeepSeek reads agrees with the validator's minions-last rule (VUV4, X8R8)", () => {
  it("no longer tells DeepSeek to kill the followers first", () => {
    const guide = readFileSync(new URL("../src/knowledge/ironclad-guide.md", import.meta.url), "utf8");
    expect(guide).not.toMatch(/先杀信徒/);
    expect(guide).toMatch(/神官一死战斗就结束/);
  });
});

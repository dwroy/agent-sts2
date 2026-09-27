/**
 * Rules from the A8 post-mortems of VUV4, T86W, X8R8 and M9PL (notes/lessons.md): three act-1 boss
 * deaths in a row behind the clock with an unmodelled potion carried to the death, and an act-2 crab
 * fought on a deck estimate twice what it dealt. Replayed on the logged boards (tests/logged-states).
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import { eventHpCost, eventHpGuard, eventOptionScore, planEvent } from "../src/screens/event.js";
import { rememberMap } from "../src/screens/rest.js";
import { averagePowerStrength, damageGap, expectedPlayTurn } from "../src/strategy/boss-clock.js";
import { cardRoles, damageRole } from "../src/strategy/card-value.js";
import { logged, loggedEnv, loggedKnowledge } from "./logged.js";

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

describe("event HP guard: a fight is an HP cost, and a small cost at high HP stays (VUV4 F13)", () => {
  const event = () => {
    const fx = logged("vuv4-f13-event");
    const env = loggedEnv(fx);
    const map = logged("vuv4-map-f12");
    rememberMap(env.screenMemory, parseGameState(map.state));
    return { fx, env };
  };

  it("the rest-and-fight option costs a hallway fight less what it heals", () => {
    const { fx } = event();
    const options = ((fx.state["event"] as Record<string, unknown>)["options"] as Record<string, unknown>[]).map((option) => String(option["description"]));
    expect(eventHpCost(options[0]!, { act: 1, hp: 80, maxHp: 80 })).toEqual({ hp: 8, maxHp: 0 });
    // 「回复24点生命。进入战斗。」 at full HP heals 0: the fight's ~8 (act 1, 10% of max HP).
    expect(eventHpCost(options[1]!, { act: 1, hp: 80, maxHp: 80 }).hp).toBe(8);
    expect(eventHpCost(options[1]!, { act: 1, hp: 50, maxHp: 80 }).hp).toBe(0);
    expect(eventHpCost(options[1]!).hp).toBe(0);
  });

  it("the forced-elite guard scales with HP: 80/80 pays 8, 55/80 does not", () => {
    expect(eventHpGuard({ hp: 8, maxHp: 0 }, 80, 80, "Elite within 3 nodes", 13, 1)).toBeNull();
    expect(eventHpGuard({ hp: 8, maxHp: 0 }, 55, 80, "Elite within 3 nodes", 13, 1)).toMatch(/forced Elite/);
    expect(eventHpGuard({ hp: 8, maxHp: 0 }, 80, 80, "Boss", 16, 1)).toMatch(/forced Boss/);
  });

  it("the logged board: Trudge On (-8 HP, +77 gold) is no longer removed for the fight", () => {
    const { env } = event();
    // The remembered map has the forced elite 3 nodes out (F14 was a forced Phrog Parasite).
    const decision = planEvent(env)!;
    expect(JSON.stringify(decision)).not.toMatch(/only option left after the HP guard/);
    if (decision.kind === "ask") expect(Object.keys((Object.values(decision.questions)[0] as { criteria: Record<string, unknown> }).criteria)).toContain("o0");
    else expect(decision.intent).toEqual({ action: "choose_event_option", option_index: 0 });
    // The code fallback prefers it too: the fight heals nothing at full HP.
    const ctx = { hp: 80, maxHp: 80, forced: true, act: 1 };
    expect(eventOptionScore("获得[blue]77[/blue] [gold]金币[/gold]。失去[red]8[/red]点生命。", ctx)).toBeGreaterThan(eventOptionScore("回复[green]24[/green]点生命。[red]进入战斗[/red]。", ctx));
  });
});

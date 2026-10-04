/**
 * Pantograph's real heal of resting at the rest site whose next fight is the act boss (Dai 2026-10-03, experience
 * relic-pantograph): min(heal, max HP - HP - 25), decided from the map path. Fixed data only: the numbers on fixed
 * inputs and a logged board (MCK9SMSK40ZY F32, with the map remembered from F31).
 */

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/hand/mod/schema.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { bossIsNextFight, bossStartHealFacts, planRest } from "../src/hand/screens/rest.js";
import { logged, loggedEnv } from "./logged.js";

type Raw = Record<string, unknown>;

describe("Pantograph at the rest site before the boss: resting's real heal (experience relic-pantograph)", () => {
  const PANTOGRAPH = ["BURNING_BLOOD", "PANTOGRAPH"];

  it("the number: min(heal, max - HP - 25); nothing when Pantograph alone fills HP; only with the boss as the next fight", () => {
    const facts = (hp: number, max: number, heal: number) => String(bossStartHealFacts(PANTOGRAPH, true, heal, { hp: Math.min(max, hp + heal), max }, hp, max)["boss_start_heal"]);
    expect(facts(52, 89, 26)).toBe(
      "Pantograph (缩放仪) heals 25 HP when the boss fight starts (up to max HP), and the next fight after this rest site is the act boss: resting here heals 26 (78/89) and enters the boss at 89/89; smithing (or any option that does not heal) enters it at 77/89. Resting's real heal for the boss: min(26, 89 - 52 - 25) = 12 HP.",
    );
    // 22/80: the whole heal counts (3RMEW7ZXS8TF F32: 46 + 25 = 71 into the crab after resting).
    expect(facts(22, 80, 24)).toMatch(/enters the boss at 71\/80; smithing .* enters it at 47\/80\. Resting's real heal for the boss: min\(24, 80 - 22 - 25\) = 24 HP\.$/);
    // 60/80 (5NFGDU7BQPD3 F16): resting gives the boss nothing.
    expect(facts(60, 80, 24)).toMatch(/Resting's real heal for the boss: 0 HP \(80 - 60 - 25 <= 0: Pantograph \(缩放仪\) alone fills HP to max at the boss's start\)\.$/);
    expect(bossStartHealFacts(PANTOGRAPH, false, 26, { hp: 78, max: 89 }, 52, 89)).toEqual({});
    expect(bossStartHealFacts(["BURNING_BLOOD"], true, 26, { hp: 78, max: 89 }, 52, 89)).toEqual({});
    // Stone Humidifier (max HP +5 with HP): the two entry HPs give the number.
    expect(String(bossStartHealFacts(PANTOGRAPH, true, 24, { hp: 79, max: 85 }, 50, 80)["boss_start_heal"])).toMatch(/enters the boss at 85\/85; smithing .* enters it at 75\/80\. Resting's real heal for the boss: 85 - 75 = 10 HP\.$/);
  });

  it("MCK9SMSK40ZY F32 (A8, 52/89, logged board and the map remembered from F31): the fact the rest question now carries", () => {
    const fx = logged("route-rest/mck9-f32-rest");
    const env = loggedEnv(fx, { buildDecider: "deepseek" });
    expect(bossIsNextFight(env.screenMemory, env.state)).toBe(true);
    const decision = planRest(env) as AskDecision;
    expect(decision.kind).toBe("ask");
    const rest = ((decision.state as Raw)["facts"] as Record<string, Raw>)["rest_site"]!;
    expect(rest["heal_amount"]).toBe("26 HP: 26 (30% of max HP, rounded down)");
    expect(rest["boss_start_heal"]).toBe(
      "Pantograph (缩放仪) heals 25 HP when the boss fight starts (up to max HP), and the next fight after this rest site is the act boss: resting here heals 26 (78/89) and enters the boss at 89/89; smithing (or any option that does not heal) enters it at 77/89. Resting's real heal for the boss: min(26, 89 - 52 - 25) = 12 HP.",
    );
  });

  it("decided from the map path: a fight, ? room or rest site between it and the boss: not shown; a shop or treasure room: shown", () => {
    const withNext = (type: string): DecisionEnv => {
      // A fresh copy each time: the logged screen memory is shared by reference.
      const env = loggedEnv(logged("route-rest/mck9-f32-rest"), { buildDecider: "deepseek" });
      const map = env.screenMemory.lastMap!;
      // The chosen rest site r14c4 leads to a `type` room at r15c0, then the boss moved to r16c3.
      map.nodes = [
        ...map.nodes.filter((node) => !(node.row === 14 && node.col === 4) && node.type !== "Boss"),
        { row: 14, col: 4, type: "RestSite", children: [{ row: 15, col: 0 }] },
        { row: 15, col: 0, type, children: [{ row: 16, col: 3 }] },
        { row: 16, col: 3, type: "Boss", children: [] },
      ];
      map.boss = { row: 16, col: 3 };
      map.bosses = [{ row: 16, col: 3 }];
      return env;
    };
    const next = (type: string): boolean => {
      const env = withNext(type);
      return bossIsNextFight(env.screenMemory, env.state);
    };
    for (const type of ["Monster", "Elite", "Unknown", "RestSite"]) expect(next(type)).toBe(false);
    for (const type of ["Shop", "Treasure"]) expect(next(type)).toBe(true);
    const shown = (env: DecisionEnv) => (((planRest(env) as AskDecision).state as Raw)["facts"] as Record<string, Raw>)["rest_site"]!["boss_start_heal"];
    expect(shown(withNext("Unknown"))).toBeUndefined();
    expect(shown(withNext("Shop"))).toMatch(/real heal for the boss: min\(26, 89 - 52 - 25\) = 12 HP/);
  });

  it("without the remembered map: shown only when the boss is the very next floor", () => {
    const fx = logged("route-rest/mck9-f32-rest");
    const bare = (floor: number) => {
      const state = parseGameState({ ...fx.state, run: { ...(fx.state["run"] as Raw), floor } });
      return bossIsNextFight(createScreenMemory("REST"), state);
    };
    expect(bare(32)).toBe(true);
    expect(bare(31)).toBe(false);
    expect(bare(16)).toBe(true);
    expect(bare(15)).toBe(false);
  });
});

/**
 * RUN_PLAN=v1: checkpoints, parsing against the game data, and the weights the plan puts on build,
 * route and rest decisions (card play is untouched).
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { parseGameState } from "../src/mod/schema.js";
import { briefJson, buildRunBrief } from "../src/project/run-brief.js";
import {
  loadRunPlan,
  logRunPlan,
  parseRunPlan,
  runPlanCardBonus,
  runPlanLine,
  runPlanTrigger,
  RUN_PLAN_AVOID_MALUS,
  RUN_PLAN_WANT_BONUS,
  type RunPlan,
} from "../src/strategy/run-plan.js";
import { mapShift, restShift } from "../src/strategy/intent.js";
import { baseState, runPayload, testKnowledge } from "./scenarios.js";

const plan = (over: Partial<RunPlan> = {}): RunPlan => ({
  runId: "TESTRUN123",
  act: 2,
  floor: 9,
  hpPct: 55 / 80,
  trigger: "start",
  archetype: "Strength",
  want: ["INFLAME"],
  avoid: ["ANGER"],
  remove: ["STRIKE_R"],
  blockTarget: 6,
  hpPolicy: "balanced",
  routeRisk: "normal",
  entryHp: null,
  reserve: [],
  needs: [],
  avoidRoles: [],
  bossPrep: "",
  summary: "scale with Strength",
  version: 1,
  changes: [],
  validator: [],
  ...over,
});

const mapState = (run: Record<string, unknown> = {}) => parseGameState(baseState("MAP", { run: runPayload(run) }));

describe("RUN_PLAN config", () => {
  it("is off by default and v1 when set", () => {
    expect(loadConfig({} as NodeJS.ProcessEnv).runPlan).toBe("off");
    expect(loadConfig({ RUN_PLAN: "v1" } as NodeJS.ProcessEnv).runPlan).toBe("v1");
    expect(() => loadConfig({ RUN_PLAN: "yes" } as NodeJS.ProcessEnv)).toThrow(/RUN_PLAN/);
  });
});

describe("runPlanTrigger", () => {
  it("asks at the run start, a new act, a heavy HP loss and every 8 floors", () => {
    const state = mapState();
    expect(runPlanTrigger(null, state)).toBe("start");
    expect(runPlanTrigger(plan({ runId: "OTHER" }), state)).toBe("start");
    expect(runPlanTrigger(plan({ act: 1 }), state)).toBe("act");
    expect(runPlanTrigger(plan({ hpPct: 1 }), state)).toBe("hp_drop");
    expect(runPlanTrigger(plan({ hpPct: 0.45 }), mapState({ current_hp: 30 }))).toBe("hp_drop");
    expect(runPlanTrigger(plan({ floor: 1 }), state)).toBe("review");
    expect(runPlanTrigger(plan(), state)).toBeNull();
  });
});

describe("parseRunPlan", () => {
  it("keeps real card ids, deck-only removals, and valid enums; unknown values are logged", () => {
    const parsed = parseRunPlan(
      {
        archetype: "Strength scaling",
        want: ["INFLAME", "Inflame", "NOT_A_CARD", "Shrug It Off"],
        avoid: ["ANGER", "draw"],
        remove: ["STRIKE_R", "ANGER"],
        block_target: 7.4,
        hp_policy: "yolo",
        route_risk: "seek_elites",
        boss_prep: "block for the big hit",
        summary: "take Strength, remove Strikes",
      },
      mapState(),
      testKnowledge,
      "start",
    );
    expect(parsed.want).toEqual(["INFLAME", "SHRUG_IT_OFF"]);
    expect(parsed.avoid).toEqual(["ANGER"]);
    expect(parsed.avoidRoles).toEqual(["draw"]);
    expect(parsed.remove).toEqual(["STRIKE_R"]);
    expect(parsed.blockTarget).toBe(7);
    expect(parsed.routeRisk).toBe("seek_elites");
    expect(parsed.hpPolicy).toBe("balanced");
    expect(parsed.act).toBe(2);
    expect(parsed.version).toBe(1);
    expect(parsed.validator.join(" | ")).toMatch(/hp_policy: unknown value "yolo"/);
    expect(parsed.validator.join(" | ")).toMatch(/want: dropped unknown "NOT_A_CARD"/);
  });

  it("reads the old reply fields (elites, rest, save_potions, must_have) as the new intents", () => {
    const parsed = parseRunPlan({ elites: "avoid", rest: "heal", save_potions: ["block"], must_have: ["aoe"] }, mapState(), testKnowledge, "start");
    expect(parsed.routeRisk).toBe("avoid_elites");
    expect(parsed.hpPolicy).toBe("preserve");
    expect(parsed.reserve).toEqual(["block"]);
    expect(parsed.needs).toEqual(["aoe"]);
  });
});

describe("plan weights", () => {
  it("rates wanted cards up, avoided cards down, block cards up below the target", () => {
    expect(runPlanCardBonus(plan(), "INFLAME", 6, false).bonus).toBe(RUN_PLAN_WANT_BONUS);
    expect(runPlanCardBonus(plan(), "ANGER", 6, false).bonus).toBe(-RUN_PLAN_AVOID_MALUS);
    expect(runPlanCardBonus(plan(), "SHRUG_IT_OFF", 3, true).bonus).toBe(6);
    expect(runPlanCardBonus(plan(), "SHRUG_IT_OFF", 6, true).bonus).toBe(0);
    expect(runPlanCardBonus(null, "INFLAME", 0, false).bonus).toBe(0);
  });
  it("shifts elites and rest sites by route_risk and hp_policy, never against a pre-boss heal", () => {
    expect(mapShift(plan({ routeRisk: "avoid_elites" }), "Elite", 0.9)).toBe(-6);
    expect(mapShift(plan({ routeRisk: "seek_elites" }), "Elite", 0.9)).toBe(2);
    expect(mapShift(plan({ routeRisk: "seek_elites" }), "Elite", 0.5)).toBe(0);
    expect(mapShift(plan({ hpPolicy: "preserve" }), "Unknown", 0.5)).toBe(-0.88);
    expect(restShift(plan({ hpPolicy: "push" }), "SMITH", 0.7, false)).toBe(3);
    expect(restShift(plan({ hpPolicy: "push" }), "SMITH", 0.4, false)).toBe(0);
    expect(restShift(plan({ hpPolicy: "push" }), "SMITH", 0.9, true)).toBe(0);
    expect(restShift(plan({ hpPolicy: "preserve" }), "HEAL", 0.6, false)).toBe(4);
    expect(restShift(plan({ hpPolicy: "preserve" }), "HEAL", 0.9, false)).toBe(0);
  });
  it("shows the plan's intents in the run brief", () => {
    const state = mapState();
    const brief = { ...buildRunBrief(state, testKnowledge), plan: runPlanLine(plan({ reserve: ["block"] })) ?? undefined };
    expect(String(briefJson(brief)["run_plan"])).toContain("want INFLAME");
    expect(String(briefJson(brief)["run_plan"])).toContain("reserve block potions");
  });
});

describe("run plan log", () => {
  it("restores the last plan of this run", () => {
    const dir = mkdtempSync(join(tmpdir(), "run-plan-"));
    try {
      const file = join(dir, "run-plans.jsonl");
      logRunPlan(file, { run: "TESTRUN123", plan: plan({ summary: "old" }) as never });
      logRunPlan(file, { run: "TESTRUN123", error: "timeout" });
      logRunPlan(file, { run: "TESTRUN123", plan: plan({ summary: "new" }) as never });
      expect(loadRunPlan(file, "TESTRUN123")?.summary).toBe("new");
      expect(loadRunPlan(file, "NOPE")).toBeNull();
      // A plan logged before the intent vocabulary is read as the new intents.
      logRunPlan(file, { run: "OLDRUN", plan: { runId: "OLDRUN", act: 1, floor: 3, want: [], avoid: [], remove: [], elites: "avoid", rest: "auto", savePotions: ["block", "weak"], mustHave: ["aoe"], summary: "old" } as never });
      const old = loadRunPlan(file, "OLDRUN")!;
      expect(old).toMatchObject({ routeRisk: "avoid_elites", hpPolicy: "balanced", reserve: ["block", "weak"], needs: ["aoe"], version: 1, changes: [] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("run plan commitments (entry HP, saved potions, must-have roles)", () => {
  it("parses them from the reply, every reserve role (the old parser kept 2)", () => {
    const parsed = parseRunPlan({ archetype: "x", entry_hp_pct: 0.9, reserve: ["block", "weak", "damage"], needs: ["aoe", "strength", "nonsense"] }, mapState(), testKnowledge, "act");
    expect(parsed.entryHp).toBe(0.9);
    expect(parsed.reserve).toEqual(["block", "weak", "damage"]);
    expect(parsed.needs).toEqual(["aoe", "strength"]);
  });
  it("turns them into weights: heal and avoid elites below the entry HP near the boss, saved potions, must-have roles", async () => {
    const { planSavesPotion, mustHaveBonus, MUST_HAVE_BONUS, floorsToBoss } = await import("../src/strategy/run-plan.js");
    const committed = plan({ entryHp: 0.85, reserve: ["block"], needs: ["aoe"] });
    expect(restShift(committed, "HEAL", 0.6, false, 4)).toBe(8);
    expect(restShift(committed, "HEAL", 0.6, false, 12)).toBe(0);
    expect(mapShift(committed, "Elite", 0.8, 5)).toBe(-8);
    expect(mapShift(committed, "Elite", 1, 5)).toBe(0);
    expect(planSavesPotion(committed, "BLOCK_POTION", "获得 12 点格挡。")).toBe(true);
    expect(planSavesPotion(committed, "FIRE_POTION", "造成 20 点伤害。")).toBe(false);
    // GZ24 F8: the Dexterity Potion's text is 「获得{DexterityPower}点敏捷」; Regen heals over turns.
    expect(planSavesPotion(committed, "DEXTERITY_POTION", "获得[blue]{DexterityPower}[/blue]点[gold]敏捷[/gold]。")).toBe(true);
    expect(planSavesPotion(committed, "DEXTERITY_POTION", "")).toBe(true);
    expect(planSavesPotion({ ...committed, reserve: ["heal"] }, "REGEN_POTION", "")).toBe(true);
    expect(planSavesPotion({ ...committed, reserve: ["heal"] }, "REGEN_POTION", "获得[green]{RegenPower}[/green]层[gold]再生[/gold]。")).toBe(true);
    expect(mustHaveBonus(committed, "THUNDERCLAP", ["STRIKE_R"]).bonus).toBe(MUST_HAVE_BONUS);
    expect(mustHaveBonus(committed, "THUNDERCLAP", ["STOMP", "INFERNO"]).bonus).toBe(4);
    expect(mustHaveBonus(committed, "DEFEND_R", []).bonus).toBe(0);
    expect(floorsToBoss(29)).toBe(4);
  });
});

describe("enemy dossiers", () => {
  it("find the crab by boss id and by claw id, and list an act's threats", async () => {
    const { dossierFor, actThreats } = await import("../src/knowledge/dossiers.js");
    expect(dossierFor("KAISER_CRAB_BOSS")?.id).toBe("KAISER_CRAB");
    expect(dossierFor("ROCKET")?.id).toBe("KAISER_CRAB");
    expect(actThreats(2).length).toBeGreaterThan(0);
  });
});


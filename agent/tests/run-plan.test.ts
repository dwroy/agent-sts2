/**
 * RUN_PLAN=v1: checkpoints, parsing against the game data, and the weights the plan puts on build,
 * route and rest decisions (card play is untouched).
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { briefJson, buildRunBrief } from "../src/memory/run-brief.js";
import {
  loadRunPlan,
  logRunPlan,
  parseRunPlan,
  runPlanCardBonus,
  runPlanEliteShift,
  runPlanLine,
  runPlanRestShift,
  runPlanTrigger,
  RUN_PLAN_AVOID_MALUS,
  RUN_PLAN_WANT_BONUS,
  type RunPlan,
} from "../src/memory/run-plan.js";
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
  elites: "normal",
  rest: "auto",
  bossPrep: "",
  summary: "scale with Strength",
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
  it("keeps real card ids, deck-only removals, and valid enums", () => {
    const parsed = parseRunPlan(
      {
        archetype: "Strength scaling",
        want: ["INFLAME", "Inflame", "NOT_A_CARD", "Shrug It Off"],
        avoid: ["ANGER"],
        remove: ["STRIKE_R", "ANGER"],
        block_target: 7.4,
        elites: "seek",
        rest: "nap",
        boss_prep: "block for the big hit",
        summary: "take Strength, remove Strikes",
      },
      mapState(),
      testKnowledge,
      "start",
    );
    expect(parsed.want).toEqual(["INFLAME", "SHRUG_IT_OFF"]);
    expect(parsed.avoid).toEqual(["ANGER"]);
    expect(parsed.remove).toEqual(["STRIKE_R"]);
    expect(parsed.blockTarget).toBe(7);
    expect(parsed.elites).toBe("seek");
    expect(parsed.rest).toBe("auto");
    expect(parsed.act).toBe(2);
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
  it("shifts elites and rest sites, never against a low-HP or pre-boss heal", () => {
    expect(runPlanEliteShift(plan({ elites: "avoid" }), 0.9)).toBe(-3);
    expect(runPlanEliteShift(plan({ elites: "seek" }), 0.9)).toBe(2);
    expect(runPlanEliteShift(plan({ elites: "seek" }), 0.5)).toBe(0);
    expect(runPlanRestShift(plan({ rest: "smith" }), "SMITH", 0.7, false)).toBe(3);
    expect(runPlanRestShift(plan({ rest: "smith" }), "SMITH", 0.4, false)).toBe(0);
    expect(runPlanRestShift(plan({ rest: "smith" }), "SMITH", 0.9, true)).toBe(0);
    expect(runPlanRestShift(plan({ rest: "heal" }), "HEAL", 0.9, false)).toBe(3);
  });
  it("shows the plan in the run brief", () => {
    const state = mapState();
    const brief = { ...buildRunBrief(state, testKnowledge), plan: runPlanLine(plan()) ?? undefined };
    expect(String(briefJson(brief)["run_plan"])).toContain("want INFLAME");
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
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

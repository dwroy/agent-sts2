/**
 * FIGHT_PLAN=v1: DeepSeek's strategic intents for a fight (objective, kill priority) — parsing and
 * validation against the board and the run plan, re-plans, the log round trip (old-format plans
 * included), and how code and Jev carry the intents out: solver weights, the HP guard, the reserve,
 * compliance labels (no per-turn escalation).
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { planCombat } from "../src/screens/combat.js";
import { fightHpCost, LIKELY_DEATH, nodeWeight } from "../src/screens/map.js";
import {
  fightKey,
  fightPlanInput,
  loadFightPlan,
  logFightPlan,
  needsReplan,
  normalizeFightPlan,
  parseFightPlan,
  type FightPlan,
} from "../src/strategy/fight-plan.js";
import { combatFit, CONTEXT_CHARS, intentLines, objectiveDamage } from "../src/strategy/intent.js";
import type { RunPlan } from "../src/strategy/run-plan.js";
import { combatPayload, testKnowledge } from "./scenarios.js";
import { questionOf } from "./logged.js";

const config = loadConfig({} as NodeJS.ProcessEnv);

type Raw = Record<string, unknown>;

function env(raw: Raw, overrides: Partial<DecisionEnv> = {}): DecisionEnv {
  const state: GameState = parseGameState(raw);
  return {
    state,
    knowledge: testKnowledge,
    brief: buildRunBrief(state, testKnowledge),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    screenMemory: createScreenMemory(state.screen),
    shopDiscardPotions: ["FOUL_POTION"],
    ...overrides,
  };
}

/** Turn 1 of a boss fight: a small hit incoming, Inflame in hand next to Strike, Defend and Bash. */
function bossTurnOne(): Raw {
  const raw = combatPayload();
  raw["turn"] = 1;
  const combat = raw["combat"] as Raw;
  const enemies = combat["enemies"] as Raw[];
  combat["enemies"] = [
    {
      ...enemies[0],
      enemy_id: "LAGAVULIN_MATRIARCH",
      name: "Lagavulin Matriarch",
      current_hp: 222,
      max_hp: 222,
      intents: [{ index: 0, intent_type: "Attack", label: "6", damage: 6, hits: 1, total_damage: 6 }],
    },
  ];
  const hand = combat["hand"] as Raw[];
  combat["hand"] = [
    ...hand,
    {
      ...hand[1],
      index: 3,
      card_id: "INFLAME",
      name: "Inflame",
      card_type: "Power",
      target_type: "Self",
      requires_target: false,
      valid_target_indices: [],
      energy_cost: 1,
      dynamic_values: [{ name: "StrengthPower", base_value: 2, current_value: 2 }],
    },
  ];
  return raw;
}

const plan = (over: Partial<FightPlan> = {}): FightPlan => ({
  runId: "TESTRUN123",
  fight: "1:9",
  kind: "boss",
  enemyIds: ["LAGAVULIN_MATRIARCH"],
  objective: "scale_then_kill",
  killPriority: ["LAGAVULIN_MATRIARCH"],
  threat: "",
  summary: "set up Strength, then race",
  replans: 0,
  validator: [],
  ...over,
});

/** A run plan of the test run (the combat planner ignores plans of other runs). */
const runPlan = (over: Partial<RunPlan> = {}): RunPlan => ({
  runId: "TESTRUN123", act: 2, floor: 9, hpPct: 0.69, trigger: "start", archetype: "", want: [], avoid: [], remove: [], blockTarget: null,
  hpPolicy: "balanced", routeRisk: "normal", entryHp: null, reserve: [], needs: [], avoidRoles: [], bossPrep: "", summary: "", version: 1, changes: [], validator: [],
  ...over,
});

/** A copy of the test knowledge where the Jaw Worm is an Elite. */
const eliteKnowledge = { ...testKnowledge, monster: (id: string) => (id === "JAW_WORM" ? { ...testKnowledge.monster(id)!, type: "Elite" } : testKnowledge.monster(id)) } as typeof testKnowledge;

describe("FIGHT_PLAN config", () => {
  it("is off by default, v1 when set, and rejects other values", () => {
    expect(loadConfig({} as NodeJS.ProcessEnv).fightPlan).toBe("off");
    expect(loadConfig({ FIGHT_PLAN: "v1" } as NodeJS.ProcessEnv).fightPlan).toBe("v1");
    expect(() => loadConfig({ FIGHT_PLAN: "on" } as NodeJS.ProcessEnv)).toThrow(/FIGHT_PLAN/);
  });
});

describe("parseFightPlan", () => {
  const state = parseGameState(bossTurnOne());
  const base = { runId: "TESTRUN123", fight: fightKey(state), kind: "boss", replans: 0 };

  it("reads the objective, kill priority and potion guidance; unknown enemies and card orders are dropped with a reason", () => {
    const parsed = parseFightPlan(
      {
        objective: "Scale_Then_Kill",
        kill_priority: ["Lagavulin Matriarch", "NOBODY"],
        potions: { FIRE_POTION: "hold for the phase-2 burst", NOT_IN_BELT: "early" },
        potion_plan: "keep the Fire Potion for the burst turn; spend it below 40% HP",
        setup_cards: ["INFLAME"],
        threat: "T3 big hit",
        summary: "set up, then race",
      },
      state,
      testKnowledge,
      base,
    );
    expect(parsed.objective).toBe("scale_then_kill");
    expect(parsed.killPriority).toEqual(["LAGAVULIN_MATRIARCH"]);
    expect(parsed.threat).toBe("T3 big hit");
    expect(parsed.enemyIds).toEqual(["LAGAVULIN_MATRIARCH"]);
    const notes = parsed.validator.join(" | ");
    expect(notes).toMatch(/kill_priority: NOBODY not in this fight, dropped/);
    expect(notes).toMatch(/setup_cards ignored/);
    // Potion timing is guidance now: kept for Jev (belt potions only), never an order to code.
    expect(parsed.potions).toEqual({ FIRE_POTION: "hold for the phase-2 burst" });
    expect(parsed.potionPlan).toBe("keep the Fire Potion for the burst turn; spend it below 40% HP");
    expect(intentLines(null, parsed, 9)).toEqual(expect.arrayContaining(["DeepSeek potion plan (guidance): keep the Fire Potion for the burst turn; spend it below 40% HP", "DeepSeek on FIRE_POTION: hold for the phase-2 burst"]));
  });

  it("falls back to an objective from HP on unusable values, and reads old-format replies", () => {
    const parsed = parseFightPlan({ objective: "yolo", focus_enemy: "NOBODY" }, state, testKnowledge, base);
    expect(parsed.objective).toBe("kill_fast");
    expect(parsed.killPriority).toEqual([]);
    expect(parsed.validator.join(" | ")).toMatch(/objective "yolo" unknown/);
    const old = parseFightPlan({ approach: "setup", focus_enemy: "Lagavulin Matriarch", key_turns: "T3" }, state, testKnowledge, base);
    expect(old.objective).toBe("scale_then_kill");
    expect(old.killPriority).toEqual(["LAGAVULIN_MATRIARCH"]);
  });
});

describe("fight plan validator (不乱指挥)", () => {
  const board = (hp: number, incoming = 6): GameState => {
    const raw = bossTurnOne();
    ((raw["combat"] as Raw)["player"] as Raw)["current_hp"] = hp;
    (raw["run"] as Raw)["current_hp"] = hp;
    ((raw["combat"] as Raw)["enemies"] as Raw[])[0]!["intents"] = [{ index: 0, intent_type: "Attack", label: String(incoming), damage: incoming, hits: 1, total_damage: incoming }];
    return parseGameState(raw);
  };
  const parse = (state: GameState, json: Record<string, unknown>, kind = "boss", run: RunPlan | null = null) =>
    parseFightPlan(json, state, testKnowledge, { runId: "TESTRUN123", fight: fightKey(state), kind, replans: 0 }, run);

  it("setup at low HP or against a huge hit is kept and logged as a disagreement (no judgment repairs)", () => {
    const low = parse(board(14), { objective: "scale_then_kill" });
    expect(low.objective).toBe("scale_then_kill");
    expect((low.disagreements ?? []).join(" | ")).toMatch(/scale_then_kill at 18% HP \(code would defend below 25%\)/);
    const hit = parse(board(55, 40), { objective: "scale_then_kill" });
    expect(hit.objective).toBe("scale_then_kill");
    expect((hit.disagreements ?? []).join(" | ")).toMatch(/scale_then_kill with 40 incoming at 55 HP/);
    expect(parse(board(55), { objective: "scale_then_kill" }).disagreements ?? []).toEqual([]);
  });

  it("a fight plan spending a potion the run plan holds for the boss is a logged disagreement, and both reach Jev", () => {
    const state = parseGameState(combatPayload());
    const parsed = parse(state, { objective: "kill_fast", potions: { FIRE_POTION: "drink early" } }, "elite", runPlan({ reserve: ["damage"] }));
    expect((parsed.disagreements ?? []).join(" | ")).toMatch(/potion FIRE_POTION "drink early": the run plan holds it for the act boss/);
    expect(parsed.potions).toEqual({ FIRE_POTION: "drink early" });
  });

  it("kill_fast under hp_policy preserve stays only when code expects a fast win", async () => {
    const { validateFightPlan } = await import("../src/strategy/plan-validator.js");
    const ctx = { hpPct: 0.7, hp: 56, incoming: 6, enemyIds: ["JAW_WORM"], together: [], potions: [], kind: "elite" };
    const check = (turnsToKill: number | null, kind = "elite") => {
      const fight = plan({ objective: "kill_fast", killPriority: [] });
      const notes = validateFightPlan(fight, {}, runPlan({ hpPolicy: "preserve" }), { ...ctx, turnsToKill, kind });
      return { objective: fight.objective, notes: notes.join(" | ") };
    };
    expect(check(2).objective).toBe("kill_fast");
    // A judgment call at 70% HP: DeepSeek's kill_fast is kept, code's estimate logged as a disagreement.
    expect(check(6)).toMatchObject({ objective: "kill_fast", notes: expect.stringMatching(/^disagreement \(kept\): kill_fast under run hp_policy preserve, code expects 6 turns; kept because HP 70% is above 40%/) });
    expect(check(null).objective).toBe("kill_fast");
    // A boss is fought to its end whatever the policy.
    expect(check(9, "boss").objective).toBe("kill_fast");
  });

  it("keeps kill_fast under preserve; only notes it at low HP against enemies that do not scale (5JU3 F9/F11)", async () => {
    const { validateFightPlan } = await import("../src/strategy/plan-validator.js");
    const ctx = { hp: 30, incoming: 6, turnsToKill: 5, enemyIds: ["CORPSE_SLUG"], together: [], potions: [], kind: "monster" };
    const check = (hpPct: number, scaling: string[], reasons: FightPlan["reasons"] = []) => {
      const fight = plan({ objective: "kill_fast", killPriority: [], reasons });
      const notes = validateFightPlan(fight, {}, runPlan({ hpPolicy: "preserve" }), { ...ctx, hpPct, scaling });
      return { objective: fight.objective, reasons: fight.reasons, notes: notes.join(" | ") };
    };
    // 5JU3 F11: 30/80 against three Ravenous slugs: kept (the slugs scale), and the fact becomes the reason.
    expect(check(0.375, ["CORPSE_SLUG RAVENOUS_POWER"])).toMatchObject({ objective: "kill_fast", reasons: ["enemy_scales"], notes: expect.stringMatching(/kept because the enemy scales \(CORPSE_SLUG RAVENOUS_POWER\)/) });
    // DeepSeek's own reason counts even when code sees no scaling (logged).
    const told = check(0.375, [], ["enemy_scales"]);
    expect(told.objective).toBe("kill_fast");
    expect(told.notes).toMatch(/reason enemy_scales, but code sees no growth power/);
    // 30% HP, nothing scales, 5 turns: kept, code's estimate logged as a disagreement.
    expect(check(0.3, [])).toMatchObject({ objective: "kill_fast", notes: expect.stringMatching(/^disagreement \(kept\): objective kill_fast under run hp_policy preserve at 30% HP, no enemy scales, fight not winnable in 3 turns \(code estimate 5\)/) });
  });

  it("parses the reason tag, reads the board's scaling and logs disagreements apart from repairs", () => {
    const raw = combatPayload();
    const enemies = (raw["combat"] as Raw)["enemies"] as Raw[];
    enemies[0]!["enemy_id"] = "FOSSIL_STALKER";
    enemies[0]!["powers"] = [{ index: 0, power_id: "SUCK_POWER", name: "Suck", amount: 3, is_debuff: false }];
    const state = parseGameState(raw);
    const parsed = parse(state, { objective: "kill_fast", reason: ["scaling", "vibes"] }, "monster", runPlan({ hpPolicy: "preserve" }));
    expect(parsed.reasons).toEqual(["enemy_scales"]);
    expect(parsed.validator.join(" | ")).toMatch(/reason: dropped unknown "vibes"/);
    expect(parsed.objective).toBe("kill_fast");
    expect(parsed.validator.join(" | ")).not.toMatch(/disagreement/);
    expect((parsed.disagreements ?? []).join(" | ")).toMatch(/FOSSIL_STALKER SUCK_POWER/);
  });

  it("drops an unknown enemy and enemies that must die together from the kill priority", () => {
    const raw = combatPayload();
    const enemies = (raw["combat"] as Raw)["enemies"] as Raw[];
    enemies[1]!["enemy_id"] = "ROCKET";
    enemies[1]!["powers"] = [{ index: 0, power_id: "CRAB_RAGE_POWER", name: "Rage", amount: 1, is_debuff: false }];
    const first = String(enemies[0]!["enemy_id"]);
    const parsed = parse(parseGameState(raw), { objective: "kill_fast", kill_priority: ["GHOST", "ROCKET", first] }, "elite");
    expect(parsed.killPriority).toEqual([first]);
    expect(parsed.validator.join(" | ")).toMatch(/GHOST not in this fight/);
    expect(parsed.validator.join(" | ")).toMatch(/ROCKET must die together/);
  });
});

describe("fightPlanInput", () => {
  it("shows the whole deck, the potions by id and each enemy with its type", () => {
    const state = parseGameState(bossTurnOne());
    const input = fightPlanInput(state, testKnowledge, "boss", { LAGAVULIN_MATRIARCH: { next: { SLEEP: { SLAM: 2 } }, damage: { SLAM: 19 } } });
    expect(input["deck"]).toEqual(expect.arrayContaining([expect.stringMatching(/^2x STRIKE_R /), expect.stringMatching(/^INFLAME /)]));
    expect(input["potions"]).toEqual([expect.stringMatching(/^FIRE_POTION /)]);
    const enemies = input["enemies"] as Raw[];
    expect(enemies[0]).toMatchObject({ enemy_id: "LAGAVULIN_MATRIARCH", type: "Boss", moves_seen: "SLAM 19" });
    expect(String(enemies[0]!["boss_note"])).toContain("222");
  });
});

describe("combatFit (reference facts and the tempo note against DeepSeek's objective)", () => {
  const field = { minLoss: 4, maxDamage: 30, maxSetup: 1, focusName: "Louse", best: { hpLoss: 4, damage: 30, setup: 0 } };
  const line = (over: Partial<Parameters<typeof combatFit>[2]> = {}) => ({ hpLoss: 4, damage: 30, setup: 0, winsFight: false, focusDamage: null, ...over });
  it("says where a line sits against code's reference line, and how it fits the objective", () => {
    expect(combatFit("preserve_hp", "balanced", line({ rank: 1, scoreGap: 0 }), field)).toEqual({ label: "code's reference line (balanced weights)", tempo: "fits DeepSeek's preserve_hp: least HP lost of the lines", breaks: false, grade: "fits" });
    expect(combatFit("preserve_hp", "balanced", line({ hpLoss: 12, rank: 3, scoreGap: 11 }), field)).toEqual({
      label: "code rank 3 (score -11.0): vs the reference line 8 more HP",
      tempo: "departs from DeepSeek's preserve_hp: 8 HP more than the safest line",
      breaks: true,
      grade: "costs",
    });
    expect(combatFit("kill_fast", "balanced", line({ damage: 10, hpLoss: 1, rank: 2, scoreGap: 20 }), field)).toMatchObject({ label: "code rank 2 (score -20.0): vs the reference line 3 less HP, 20 less damage", tempo: "departs from DeepSeek's kill_fast: 20 less damage than the most-damage line (it is the safest line)", breaks: true });
    expect(combatFit("kill_fast", "balanced", line({ damage: 27, rank: 2 }), field)).toMatchObject({ tempo: "fits DeepSeek's kill_fast: within 3 of the most damage", breaks: false });
    expect(combatFit("scale_then_kill", "balanced", line({ setup: 1, rank: 1 }), field).tempo).toBe("fits DeepSeek's scale_then_kill: most setup (powers / permanent Strength) of the lines");
    expect(combatFit("scale_then_kill", "balanced", line({ rank: 2 }), field)).toMatchObject({ tempo: "departs from DeepSeek's scale_then_kill: another line sets up more (powers / permanent Strength)", breaks: true });
    expect(combatFit(null, "preserve", line({ hpLoss: 12, focusDamage: 6, rank: 2 }), field)).toMatchObject({ label: "code rank 2: vs the reference line 8 more HP; hits kill-priority Louse for 6", tempo: "departs from DeepSeek's hp_policy preserve: 8 HP more than the safest line" });
    expect(combatFit(null, "balanced", line({ rank: 2, scoreGap: 30 }), field)).toMatchObject({ tempo: null, breaks: false, grade: "neutral" });
    expect(combatFit("race", "balanced", line({ winsFight: true, damage: 0 }), field)).toMatchObject({ label: "wins the fight", breaks: false });
  });

  it("code's reference line can still depart from DeepSeek's tempo: the note says so, whatever the rank", () => {
    // 9V09 F33 T3 "Burning, Whirlwind+": code's rank 1 with less damage than another line.
    const top = combatFit("race", "preserve", line({ damage: 10, hpLoss: 12, rank: 1 }), field);
    expect(top.label).toBe("code's reference line (balanced weights)");
    expect(top).toMatchObject({ breaks: true, tempo: "departs from DeepSeek's race: 20 less damage than the most-damage line" });
  });

  it("counts Sandpit turns bought as damage (9V09 F33 T2)", () => {
    // T2, pit 4, boss 300: rank 1 "Pommel Strike+, Frantic Escape, Sword Boomerang+" 46 damage, rank 2
    // "Pommel Strike+, Sword Boomerang+, Feast+" 67. A pit turn is worth 49; 7 turns needed.
    const sandpit = { turnValue: 49, behind: true, now: 4, turnsNeeded: 7, maxEscapes: 1 };
    const pit = { ...field, maxDamage: Math.max(objectiveDamage({ damage: 46, escapes: 1 }, sandpit), 67), maxSetup: 0, sandpit, best: { hpLoss: 4, damage: 95, setup: 0 } };
    expect(pit.maxDamage).toBe(95);
    const escapeLine = combatFit("race", "balanced", line({ damage: 46, escapes: 1, rank: 1 }), pit);
    expect(escapeLine).toEqual({ label: "code's reference line (balanced weights); +1 Sandpit turn, ~49 damage each", tempo: "fits DeepSeek's race: most damage of the lines (Sandpit turns bought counted as damage)", breaks: false, grade: "fits" });
    const noEscape = combatFit("race", "balanced", line({ damage: 67, rank: 2, scoreGap: 20 }), pit);
    expect(noEscape.breaks).toBe(true);
    expect(noEscape.tempo).toBe(
      "departs from DeepSeek's race: 28 less damage than the most-damage line (it is the safest line); departs from the Sandpit race: 1 Frantic Escape fewer than another line while the Sandpit (4) is no longer than the kill (~7 turns)",
    );
  });

  it("the Queen's YOU_ARE_MINE turn is judged by damage into the Amalgam (H7W0 F48 T2)", () => {
    // Rank 4 "Colossus, Pommel Strike+ -> Amalgam, Crimson Mantle" 15 vs rank 2 "Bludgeon, Pommel Strike+ -> Amalgam" 63.
    const queen = { ...field, burst: { target: "Torch Head Amalgam", maxDamage: 63, why: "YOU_ARE_MINE" } };
    expect(combatFit("scale_then_kill", "balanced", line({ burstDamage: 15, setup: 1, rank: 1 }), queen)).toMatchObject({
      tempo: "departs from the burst turn: 48 less damage to Torch Head Amalgam than the best line (YOU_ARE_MINE)", breaks: true, grade: "costs",
    });
    expect(combatFit("scale_then_kill", "balanced", line({ burstDamage: 48, rank: 2, scoreGap: 9 }), queen)).toMatchObject({ breaks: false, grade: "costs" });
    expect(combatFit("scale_then_kill", "balanced", line({ burstDamage: 63, rank: 3 }), queen)).toMatchObject({ tempo: "fits the burst turn: 63 damage to Torch Head Amalgam (YOU_ARE_MINE)", grade: "fits" });
  });
});

describe("intentLines: the plans' own words reach Jev (9V09 F33)", () => {
  it("shows the fight plan's summary and threat and the run plan's boss_prep, short, as context", () => {
    const fight = plan({ objective: "race", summary: "Play every affordable Frantic Escape early; race the Insatiable.", threat: "each unplayed Frantic Escape wastes a needed turn" });
    const lines = intentLines(runPlan({ bossPrep: "play every affordable Frantic Escape early" }), fight, 33);
    expect(lines).toContain("DeepSeek fight plan: Play every affordable Frantic Escape early; race the Insatiable.");
    expect(lines).toContain("DeepSeek threat: each unplayed Frantic Escape wastes a needed turn");
    expect(lines).toContain("DeepSeek boss prep: play every affordable Frantic Escape early");
    expect(lines.find((entry) => entry.startsWith("DeepSeek fight objective race"))).toMatch(/Frantic Escape\) is worth a full turn of damage/);
    const long = intentLines(null, plan({ summary: "x ".repeat(400) }), 33).find((entry) => entry.startsWith("DeepSeek fight plan"))!;
    expect(long.length).toBeLessThanOrEqual("DeepSeek fight plan: ".length + CONTEXT_CHARS);
  });
});

describe("needsReplan", () => {
  it("re-plans once for a new boss or elite, not for normal monsters", () => {
    const state = parseGameState(bossTurnOne());
    expect(needsReplan(plan({ enemyIds: [] }), state, testKnowledge)).toBe(true);
    expect(needsReplan(plan({ enemyIds: [], replans: 1 }), state, testKnowledge)).toBe(false);
    expect(needsReplan(plan(), state, testKnowledge)).toBe(false);
    const hallway = parseGameState(combatPayload());
    expect(needsReplan(plan({ enemyIds: [] }), hallway, testKnowledge)).toBe(false);
  });
});

describe("fight plan log", () => {
  it("restores the last plan of this run and fight", () => {
    const dir = mkdtempSync(join(tmpdir(), "fight-plan-"));
    try {
      const file = join(dir, "fight-plans.jsonl");
      logFightPlan(file, { run: "TESTRUN123", fight: "1:9", plan: plan({ summary: "old" }) as unknown as Raw as never });
      logFightPlan(file, { run: "TESTRUN123", fight: "1:9", error: "timeout" });
      logFightPlan(file, { run: "TESTRUN123", fight: "1:9", plan: plan({ summary: "new" }) as unknown as Raw as never });
      logFightPlan(file, { run: "OTHER", fight: "1:9", plan: plan({ runId: "OTHER", summary: "other run" }) as unknown as Raw as never });
      expect(loadFightPlan(file, "TESTRUN123", "1:9")?.summary).toBe("new");
      expect(loadFightPlan(file, "TESTRUN123", "1:10")).toBeNull();
      expect(loadFightPlan(join(dir, "missing.jsonl"), "TESTRUN123", "1:9")).toBeNull();
      // A plan logged in the old format (approach, setup cards, focus, potion timings) is read as intents.
      const old = { runId: "TESTRUN123", fight: "1:11", kind: "elite", enemyIds: [], approach: "defend", setup: ["INFLAME"], focus: "JAW_WORM", potions: { FIRE_POTION: "early" }, keyTurns: "T3 hits hard", summary: "old", replans: 0 };
      logFightPlan(file, { run: "TESTRUN123", fight: "1:11", plan: old as never });
      expect(loadFightPlan(file, "TESTRUN123", "1:11")).toEqual({
        runId: "TESTRUN123", fight: "1:11", kind: "elite", enemyIds: [], objective: "preserve_hp", killPriority: ["JAW_WORM"], threat: "T3 hits hard", summary: "old", potions: { FIRE_POTION: "early" }, replans: 0, validator: [],
      });
      expect(normalizeFightPlan({ approach: "race" }).objective).toBe("race");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("turn planner with a fight plan", () => {
  it("does not escalate per-turn choices when FIGHT_PLAN=v1", () => {
    const raw = bossTurnOne();
    // A dangerous boss turn: 40 incoming at 55 HP.
    const combat = raw["combat"] as Raw;
    (combat["enemies"] as Raw[])[0]!["intents"] = [{ index: 0, intent_type: "Attack", label: "40", damage: 40, hits: 1, total_damage: 40 }];
    const off = planCombatTurn(env(raw));
    const on = planCombatTurn(env(raw, { fightPlan: "v1" }));
    expect(off?.kind).toBe("ask");
    expect((off as AskDecision).escalate).toBeDefined();
    expect(on?.kind).toBe("ask");
    expect((on as AskDecision).escalate).toBeUndefined();
  });

  it("puts a setup line in front of Jev under scale_then_kill, with DeepSeek's guidance and tempo notes", () => {
    const e = env(bossTurnOne(), { fightPlan: "v1" });
    e.screenMemory.fightPlan = plan({ fight: fightKey(e.state) });
    const decision = planCombatTurn(e);
    if (decision?.kind === "act") {
      // Code already plays Inflame on its own: the plan changes nothing.
      expect(decision.intent).toMatchObject({ action: "play_card", card_index: 3 });
      return;
    }
    expect(decision?.kind).toBe("ask");
    const ask = decision as AskDecision;
    expect(String((ask.state["strategy"] as string[])[0])).toMatch(/^DeepSeek fight objective scale_then_kill: play powers/);
    expect(ask.guidance).toEqual(ask.state["strategy"]);
    expect(String(ask.state["roles"])).toMatch(/DeepSeek sets the run's strategy and tempo.*Code gives facts.*You decide/);
    const criteria = ask.questions["plan"]?.type === "choice" ? ask.questions["plan"].criteria : {};
    expect(Object.values(criteria).some((text) => /fits DeepSeek's scale_then_kill: most setup/.test(String(text)))).toBe(true);
  });

  it("ignores a plan made for another fight", () => {
    const e = env(bossTurnOne(), { fightPlan: "v1" });
    e.screenMemory.fightPlan = plan({ fight: "0:3" });
    const decision = planCombatTurn(e);
    if (decision?.kind === "ask") expect(decision.state["strategy"]).toBeUndefined();
  });

  it("scale_then_kill offers the line with both powers (CAYK F48 T3: one of two played is not the setup)", () => {
    const raw = bossTurnOne();
    const combat = raw["combat"] as Raw;
    const hand = combat["hand"] as Raw[];
    const inflame = hand[3]!;
    combat["hand"] = [...hand, { ...inflame, index: 4, card_id: "DEMON_FORM", name: "Demon Form", energy_cost: 1 }];
    const e = env(raw, { fightPlan: "v1" });
    e.screenMemory.fightPlan = plan({ fight: fightKey(e.state) });
    const decision = planCombatTurn(e);
    expect(decision?.kind).toBe("ask");
    const ask = decision as AskDecision;
    const criteria = ask.questions["plan"]?.type === "choice" ? ask.questions["plan"].criteria : {};
    expect(Object.values(criteria).some((text) => /Inflame, then Demon Form|Demon Form, then Inflame/.test(String(text)) && String(text).includes("fits DeepSeek's scale_then_kill"))).toBe(true);
  });

  it("a hallway kill that a dry line also makes keeps the potion without asking (CAYK F37-F40: lethal, dominated)", () => {
    const raw = combatPayload({ enemyHp: 25 });
    const combat = raw["combat"] as Raw;
    combat["enemies"] = [{ ...(combat["enemies"] as Raw[])[0]!, intents: [{ index: 0, intent_type: "Attack", label: "4", damage: 4, hits: 1, total_damage: 4 }] }];
    const e = env(raw);
    const decision = planCombatTurn(e);
    // Either a lethal without the potion, or Jev is asked with the dry line on offer and the potion's facts.
    if (decision?.kind === "act") {
      const steps = [decision.intent, ...(e.screenMemory.combatPlan?.remaining ?? []).map((step) => step.cardId)];
      expect(JSON.stringify(steps)).not.toContain("use_potion");
      return;
    }
    const text = JSON.stringify(decision?.questions);
    expect(text).toMatch(/potion_facts/);
    expect(Object.values(questionOf(decision).options).some((option) => !String(option["plays"] ?? "").includes("potion"))).toBe(true);
  });

  it("per-card fallback never offers a card whose HP cost kills us (C2WY F22 T6: Blood Wall at 1 HP)", () => {
    const raw = combatPayload();
    const combat = raw["combat"] as Raw;
    (combat["player"] as Raw)["current_hp"] = 2;
    const hand = combat["hand"] as Raw[];
    const bloodWall = { ...hand[1], index: 3, card_id: "BLOOD_WALL", name: "Blood Wall", dynamic_values: [{ name: "Block", base_value: 16, current_value: 16 }, { name: "HpLoss", base_value: 2, current_value: 2 }] };
    combat["hand"] = [...hand, bloodWall];
    const decision = planCombat(env(raw, { combatPlanner: "card" }));
    const options = decision?.kind === "ask" ? Object.keys(decision.questions[Object.keys(decision.questions)[0]!]?.type === "choice" ? (decision.questions[Object.keys(decision.questions)[0]!] as { criteria: Raw }).criteria : {}) : [];
    expect(decision?.kind).toBe("ask");
    expect(options).not.toContain("c3");
    (combat["player"] as Raw)["current_hp"] = 30;
    const healthy = planCombat(env(raw, { combatPlanner: "card" }));
    const healthyOptions = healthy?.kind === "ask" ? JSON.stringify(healthy.questions) : "";
    expect(healthyOptions).toContain("hp_cost");
  });

  it("lets Jev's potion pick stand on a hallway turn that costs a lot whatever is played (C2WY F22 T4-T5)", () => {
    const raw = combatPayload();
    const combat = raw["combat"] as Raw;
    (combat["player"] as Raw)["current_hp"] = 27;
    combat["enemies"] = (combat["enemies"] as Raw[]).map((enemy) => ({ ...enemy, intents: [{ index: 0, intent_type: "Attack", label: "14", damage: 14, hits: 1, total_damage: 14 }] }));
    ((raw["run"] as Raw)["potions"] as Raw[])[0]!["potion_id"] = "ENTROPIC_BREW";
    const decision = planCombatTurn(env(raw));
    expect(decision?.kind).toBe("ask");
    const ask = decision as AskDecision;
    const criteria = ask.questions["plan"]?.type === "choice" ? ask.questions["plan"].criteria : {};
    const potionKey = Object.keys(criteria).find((key) => !key.startsWith("plan"))!;
    const picked = ask.resolve({ plan: { type: "choice", choice: potionKey, probabilities: { [potionKey]: 0.4 }, confidence: 0.4, raw: {} } });
    expect(picked.intent?.action).toBe("use_potion");
  });

  it("routes: an elite at low HP is worse than a monster, and a fight at HP below its cost is a likely death (K39J F28)", () => {
    expect(nodeWeight("Elite", 0.26, 100, 8, 2)).toBeLessThan(nodeWeight("Monster", 0.26, 100, 8, 2));
    expect(nodeWeight("Elite", 0.26, 100, 8, 2)).toBeLessThan(-7);
    expect(nodeWeight("Elite", 0.69, 100, 8, 2)).toBe(-3);
    // A likely death scales with the shortfall: 20% HP against an act-2 elite (NJSZ F29, K7G9 F43).
    const elite = fightHpCost("Elite", 2);
    expect(nodeWeight("Elite", 0.2, 100, 8, 2)).toBeCloseTo(LIKELY_DEATH * (1 + (elite - 0.2) / elite));
    expect(nodeWeight("Elite", 0.5, 100, 8, 2)).toBeGreaterThan(nodeWeight("Elite", 0.2, 100, 8, 2));
    expect(nodeWeight("Monster", 0.9, 100, 8, 2)).toBeGreaterThan(0);
    // Act 1 before the mid-act: starter deck, elites only at near-full HP (CWMP F6).
    expect(nodeWeight("Elite", 0.7, 100, 6, 1)).toBe(-3);
    expect(nodeWeight("Elite", 0.9, 100, 6, 1)).toBeGreaterThan(0);
  });

  it("a potion DeepSeek holds for the boss is offered with the fact of what it saves and what the boss then lacks (MGJ8 F11 T1, EJXC F28)", () => {
    const raw = combatPayload();
    ((raw["combat"] as Raw)["player"] as Raw)["current_hp"] = 30;
    const shown = (reserve: RunPlan["reserve"]): string => {
      const e = env(raw, { knowledge: eliteKnowledge });
      e.screenMemory.runPlan = runPlan({ reserve });
      const decision = planCombatTurn(e);
      if (decision?.kind !== "ask") return JSON.stringify([decision?.kind === "act" ? [decision.intent, decision.rationale] : null, e.screenMemory.combatPlan?.remaining]);
      const criteria = decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {};
      // Every option Jev could pick, and what the HP guard would play instead.
      const resolved = Object.keys(criteria).map((key) => decision.resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.4 }, confidence: 0.4, raw: {} } }));
      return JSON.stringify([criteria, resolved.map((entry) => [entry.intent, entry.guard])]);
    };
    // Without a reserve the elite fight drinks the Fire Potion (RVL2 F31 below).
    expect(shown([])).toMatch(/Fire Potion|use_potion/);
    // Held for the boss: still offered (no hard filter), with the reserve fact and a tempo note.
    const held = shown(["damage"]);
    expect(held).toMatch(/Fire Potion/);
    expect(held).toMatch(/the act boss fight then has one fewer damage potion \(DeepSeek plan holds damage potions for the boss/);
    expect(held).toMatch(/departs from DeepSeek's reserve: drinks a potion it holds for the act boss/);
    expect(shown(["any"])).toMatch(/Fire Potion/);
  });

  it("code's own elite/boss pick meets the HP guard bound (7DXA F33 T1-T2)", () => {
    const raw = bossTurnOne();
    const combat = raw["combat"] as Raw;
    (combat["enemies"] as Raw[])[0]!["intents"] = [{ index: 0, intent_type: "Attack", label: "14", damage: 14, hits: 1, total_damage: 14 }];
    ((raw["run"] as Raw)["potions"] as Raw[])[0]!["can_use"] = false;
    const e = env(raw);
    const decision = planCombatTurn(e);
    if (decision?.kind !== "act") return;
    const lost = Number(/hp -(\d+)/.exec(decision.rationale)?.[1] ?? "0");
    // Defend alone blocks 5 of 14: the cheapest line loses 9; the boss bound is max(4, 10% of 55).
    expect(lost).toBeLessThanOrEqual(9 + 5.5);
  });

  it("per-card fallback counts held Beckons at the end of the turn (F6NT F17 T11)", () => {
    const raw = combatPayload();
    const combat = raw["combat"] as Raw;
    const player = combat["player"] as Raw;
    player["current_hp"] = 8;
    player["energy"] = 0;
    combat["enemies"] = (combat["enemies"] as Raw[]).map((enemy) => ({ ...enemy, intents: [{ index: 0, intent_type: "Buff", label: "" }] }));
    const hand = combat["hand"] as Raw[];
    const beckon = (index: number): Raw => ({ ...hand[1], index, card_id: "BECKON", name: "Beckon", card_type: "Status", energy_cost: 1, playable: false, resolved_rules_text: "在你的回合结束时，如果这张牌在你的手牌中， 你失去6点生命。", dynamic_values: [] });
    combat["hand"] = [beckon(0), beckon(1)];
    const decision = planCombat(env(raw, { combatPlanner: "card" }));
    const text = JSON.stringify(decision?.kind === "ask" ? decision.questions : decision);
    expect(text).toMatch(/12|lethal/i);
    expect(text).not.toContain('"hp_after_enemy_turn":8');
  });

  it("at low HP in a hallway fight a potion line is offered beside the dry line, with what it gains (B6AC F30)", () => {
    const raw = combatPayload();
    const combat = raw["combat"] as Raw;
    (combat["player"] as Raw)["current_hp"] = 26;
    (combat["player"] as Raw)["max_hp"] = 94;
    combat["enemies"] = (combat["enemies"] as Raw[]).map((enemy, i) => ({ ...enemy, intents: [{ index: 0, intent_type: "Attack", label: String(4 - i), damage: 4 - i, hits: 1, total_damage: 4 - i }] }));
    const e = env(raw);
    const decision = planCombatTurn(e);
    const { options } = questionOf(decision);
    const drinking = Object.values(options).filter((option) => String(option["plays"]).includes("Fire Potion"));
    const dry = Object.values(options).filter((option) => !String(option["plays"]).includes("potion"));
    expect(dry.length).toBeGreaterThan(0);
    expect(drinking.length).toBeGreaterThan(0);
    // The fact: the potion saves no HP here, only damage (it used to be filtered out: a dry line lost <= 5).
    expect(String(drinking[0]!["potion_facts"])).toMatch(/drinking Fire Potion now: \+20 damage vs the best line without it/);
  });

  it("a setup line Jev picks is played as picked: the old HP guard's swap is a fact on it (JF99 F33 T4, 5BXM F33)", () => {
    /** 14 incoming; Demon Form (3 energy) takes all of it, Defend (10 block) + Bash loses 4. */
    const board = (hp: number): Raw => {
      const raw = bossTurnOne();
      const combat = raw["combat"] as Raw;
      (combat["player"] as Raw)["current_hp"] = hp;
      (combat["enemies"] as Raw[])[0]!["intents"] = [{ index: 0, intent_type: "Attack", label: "14", damage: 14, hits: 1, total_damage: 14 }];
      ((raw["run"] as Raw)["potions"] as Raw[])[0]!["can_use"] = false;
      combat["hand"] = (combat["hand"] as Raw[]).map((card) =>
        card["card_id"] === "DEFEND_R" ? { ...card, dynamic_values: [{ name: "Block", base_value: 10, current_value: 10 }] } :
        card["card_id"] === "INFLAME" ? { ...card, card_id: "DEMON_FORM", name: "Demon Form", energy_cost: 3 } : card);
      return raw;
    };
    /** Code's own play, or what is played when Jev picks the Demon Form line at 0.4. */
    const play = (hp: number, objective: FightPlan["objective"] | null) => {
      const e = env(board(hp), { fightPlan: "v1" });
      if (objective) e.screenMemory.fightPlan = plan({ fight: fightKey(e.state), objective });
      const decision = planCombatTurn(e);
      if (decision?.kind === "act") return { played: decision.rationale, intent: decision.intent, deviation: undefined, facts: {} as Raw };
      const criteria = (decision as AskDecision).questions["plan"]?.type === "choice" ? ((decision as AskDecision).questions["plan"] as { criteria: Record<string, string> }).criteria : {};
      const key = Object.keys(criteria).find((k) => /"plays":"Demon Form"/.test(criteria[k]!))!;
      const resolved = (decision as AskDecision).resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.4 }, confidence: 0.4, raw: {} } });
      const facts = JSON.parse(criteria[key]!) as Raw;
      return { played: resolved.rationale, intent: resolved.intent, deviation: resolved.deviation, facts };
    };
    // No objective: Jev's Demon Form (-14) is played; the facts say it costs 10 HP more than the safest line.
    const free = play(55, null);
    expect(free.played).toMatch(/Jev chose plan \d\/\d \(Demon Form\)/);
    expect(free.intent).toMatchObject({ action: "play_card", card_index: 3 });
    expect(String(free.facts["hp_vs_safest"])).toMatch(/^10 HP more than the safest line \(4\)/);
    // scale_then_kill: Demon Form fits the tempo.
    expect(String(play(55, "scale_then_kill").facts["tempo"])).toMatch(/^fits DeepSeek's scale_then_kill/);
    // preserve_hp: played as picked, logged as a tempo deviation.
    const preserve = play(55, "preserve_hp");
    expect(preserve.intent).toMatchObject({ action: "play_card", card_index: 3 });
    expect(String(preserve.facts["tempo"])).toBe("departs from DeepSeek's preserve_hp: 10 HP more than the safest line");
    expect(preserve.deviation?.intent).toMatch(/departs from DeepSeek's preserve_hp/);
  });

});

describe("a potion DeepSeek holds for the boss is never filtered on a costly hallway turn (WB02 F29)", () => {
  const hallway = (hp: number): Raw => {
    const raw = combatPayload();
    (raw["run"] as Raw)["floor"] = 29;
    Object.assign(((raw["run"] as Raw)["potions"] as Raw[])[0]!, { potion_id: "BLOCK_POTION", name: "Block Potion", description: "获得 12 点格挡。", requires_target: false, valid_target_indices: [] });
    const combat = raw["combat"] as Raw;
    (combat["player"] as Raw)["current_hp"] = hp;
    combat["enemies"] = (combat["enemies"] as Raw[]).map((enemy) => ({ ...enemy, intents: [{ index: 0, intent_type: "Attack", label: "12", damage: 12, hits: 1, total_damage: 12 }] }));
    return raw;
  };
  const shown = (hp: number, reserve: RunPlan["reserve"]): string => {
    const e = env(hallway(hp));
    e.screenMemory.runPlan = runPlan({ reserve });
    const decision = planCombatTurn(e);
    return JSON.stringify(decision?.kind === "ask" ? decision.questions : [decision?.kind === "act" ? [decision.intent, decision.rationale] : null, e.screenMemory.combatPlan?.remaining]);
  };
  it("a costly turn offers it with or without a reserve; the reserve is a fact, at any HP", () => {
    expect(shown(60, [])).toMatch(/Block Potion|use_potion/);
    expect(shown(60, ["block"])).toMatch(/Block Potion/);
    expect(shown(60, ["block"])).toMatch(/one fewer block potion/);
    expect(shown(18, ["block"])).toMatch(/Block Potion|use_potion/);
    // 30 HP, 24 incoming (VF5C F27 T4, Z7D7 F28 T3).
    expect(shown(30, ["block"])).toMatch(/Block Potion|use_potion/);
  });
});

describe("Tender turns off the lethal shortcut (LSWU F21 T5)", () => {
  it("a lethal line is still played, but not through combat/lethal", () => {
    const raw = combatPayload({ enemyHp: 5 });
    const combat = raw["combat"] as Raw;
    (combat["enemies"] as Raw[])[1]!["is_alive"] = false;
    expect(planCombatTurn(env(raw))?.kind === "act" ? (planCombatTurn(env(raw)) as { label: string }).label : "ask").toBe("combat/lethal");
    (combat["player"] as Raw)["powers"] = [{ index: 0, power_id: "TENDER_POWER", name: "Tender", amount: 1, is_debuff: true }];
    const decision = planCombatTurn(env(raw));
    expect(decision?.kind === "act" ? decision.label : "ask").not.toBe("combat/lethal");
  });
});

describe("default kill-first target without a plan (CWU9 F48, WYF0 F17)", () => {
  /** Every attack target of code's pick (act and remaining steps) or of every option asked. */
  const targets = (raw: Raw): string => {
    const e = env(raw);
    const decision = planCombatTurn(e);
    return JSON.stringify(decision?.kind === "ask" ? decision.questions : [decision?.kind === "act" ? decision.rationale : null, e.screenMemory.combatPlan?.remaining]);
  };
  const fight = (enemies: Raw[]): Raw => {
    const raw = combatPayload();
    ((raw["run"] as Raw)["potions"] as Raw[])[0]!["can_use"] = false;
    const combat = raw["combat"] as Raw;
    const base = (combat["enemies"] as Raw[])[0]!;
    combat["enemies"] = enemies.map((enemy) => ({ ...base, ...enemy }));
    return raw;
  };
  const minion = [{ index: 0, power_id: "MINION_POWER", name: "Minion", amount: 1, is_debuff: false }];
  const buff = [{ index: 0, intent_type: "Buff", label: "" }];
  const hit = (damage: number) => [{ index: 0, intent_type: "Attack", label: String(damage), damage, hits: 1, total_damage: damage }];

  it("the Queen fight hits the Torch Head Amalgam, not the Queen", () => {
    const raw = fight([
      { index: 0, enemy_id: "QUEEN", name: "QUEEN", current_hp: 419, max_hp: 419, powers: [], intents: buff },
      { index: 1, enemy_id: "TORCH_HEAD_AMALGAM", name: "TORCH_HEAD_AMALGAM", current_hp: 199, max_hp: 199, powers: minion, intents: hit(13) },
    ]);
    const text = targets(raw);
    expect(text).toContain("-> TORCH_HEAD_AMALGAM");
    expect(text).not.toContain("-> QUEEN");
  });

  it("the Kin fight still hits the priest (the followers are minions)", () => {
    const raw = fight([
      { index: 0, enemy_id: "KIN_FOLLOWER", name: "KIN_FOLLOWER", current_hp: 59, max_hp: 59, powers: minion, intents: hit(5) },
      { index: 1, enemy_id: "KIN_PRIEST", name: "KIN_PRIEST", current_hp: 199, max_hp: 199, powers: [], intents: hit(8) },
      { index: 2, enemy_id: "KIN_FOLLOWER", name: "KIN_FOLLOWER", current_hp: 59, max_hp: 59, powers: minion, intents: hit(5) },
    ]);
    const text = targets(raw);
    expect(text).toContain("-> KIN_PRIEST");
    expect(text).not.toContain("-> KIN_FOLLOWER");
  });
});

describe("setup counts Dominate only after the Vulnerable (WR2Y F33 T1)", () => {
  it("under scale_then_kill code plays Bash before Dominate", () => {
    const raw = bossTurnOne();
    ((raw["run"] as Raw)["potions"] as Raw[])[0]!["can_use"] = false;
    const combat = raw["combat"] as Raw;
    const hand = combat["hand"] as Raw[];
    const bash = hand.find((card) => card["card_id"] === "BASH")!;
    bash["dynamic_values"] = [{ name: "Damage", base_value: 8, current_value: 8 }, { name: "VulnerablePower", base_value: 2, current_value: 2 }];
    combat["hand"] = [
      ...hand.filter((card) => card["card_id"] !== "INFLAME"),
      { ...bash, index: 3, card_id: "DOMINATE", name: "Dominate", card_type: "Skill", energy_cost: 1, dynamic_values: [{ name: "VulnerablePower", base_value: 1, current_value: 1 }] },
    ];
    const e = env(raw, { fightPlan: "v1" });
    e.screenMemory.fightPlan = plan({ fight: fightKey(e.state) });
    const decision = planCombatTurn(e);
    const text = JSON.stringify(decision?.kind === "ask" ? decision.questions : [decision, e.screenMemory.combatPlan?.remaining]);
    expect(text).toMatch(/BASH[^"]*Dominate/);
  });
});

describe("Withering Presence count with Throwing Axe (XWPV F48)", () => {
  it("counts the axe's replay of the fight's first card", async () => {
    const { witherInput } = await import("../src/screens/combat-plan.js");
    const raw = combatPayload();
    const combat = raw["combat"] as Raw;
    (combat["enemies"] as Raw[])[0]!["powers"] = [{ index: 0, power_id: "WITHERING_PRESENCE_POWER", name: "Withering", amount: 1, is_debuff: false }];
    const plain = witherInput(env(raw), combat, [], 3);
    ((raw["run"] as Raw)["relics"] as Raw[] | undefined) ?? ((raw["run"] as Raw)["relics"] = []);
    ((raw["run"] as Raw)["relics"] as Raw[]).push({ index: 9, relic_id: "THROWING_AXE", name: "Throwing Axe" });
    const axe = witherInput(env(raw), combat, [], 3);
    expect(plain?.played).toBe(3);
    expect(axe?.played).toBe(4);
  });
});

describe("no HP guard swap in a Sandpit race or out of one (WB02 F33)", () => {
  it("Jev's most-damage pick is played as picked; its extra HP is a fact on it", () => {
    const board = (sandpit: boolean): Raw => {
      const raw = bossTurnOne();
      ((raw["run"] as Raw)["potions"] as Raw[])[0]!["can_use"] = false;
      const boss = ((raw["combat"] as Raw)["enemies"] as Raw[])[0]!;
      // The test knowledge knows the Matriarch as a Boss; the Sandpit power is what matters here.
      Object.assign(boss, { current_hp: 300, max_hp: 341 });
      boss["intents"] = [{ index: 0, intent_type: "Attack", label: "14", damage: 14, hits: 1, total_damage: 14 }];
      boss["powers"] = sandpit ? [{ index: 0, power_id: "SANDPIT_POWER", name: "Sandpit", amount: 3, is_debuff: false }] : [];
      boss["intents"] = [{ index: 0, intent_type: "Attack", label: "20", damage: 20, hits: 1, total_damage: 20 }];
      // A second Defend: the cheapest line (-10) is 10 HP under Strike + Bash (-20).
      const hand = (raw["combat"] as Raw)["hand"] as Raw[];
      const defend = hand.find((card) => card["card_id"] === "DEFEND_R")!;
      (raw["combat"] as Raw)["hand"] = [...hand.filter((card) => card["card_id"] !== "INFLAME"), { ...defend, index: 3 }];
      return raw;
    };
    /** Whether the guard replaces the most-damage line (code's own pick, or Jev's pick of it). */
    const guarded = (raw: Raw): boolean => {
      const decision = planCombatTurn(env(raw));
      if (decision?.kind === "act") return decision.label === "combat/plan-guarded";
      const ask = decision as AskDecision;
      const criteria = ask.questions["plan"]?.type === "choice" ? ask.questions["plan"].criteria : {};
      const key = Object.keys(criteria)
        .filter((k) => k.startsWith("plan"))
        .sort((a, b) => Number(JSON.parse(String(criteria[b]))["damage_dealt"] ?? 0) - Number(JSON.parse(String(criteria[a]))["damage_dealt"] ?? 0))[0]!;
      const resolved = ask.resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.4 }, confidence: 0.4, raw: {} } });
      return resolved.guard !== undefined || /guard/i.test(resolved.rationale);
    };
    expect(guarded(board(false))).toBe(false);
    expect(guarded(board(true))).toBe(false);
    expect(JSON.stringify((planCombatTurn(env(board(false))) as AskDecision).questions)).toMatch(/HP more than the safest line/);
  });
});

describe("no playable card (CY8U F25 T7)", () => {
  it("drinks a potion before ending the turn into a lethal hit", async () => {
    const { noPlayRescuePotion } = await import("../src/screens/combat-plan.js");
    const raw = combatPayload();
    Object.assign(((raw["run"] as Raw)["potions"] as Raw[])[0]!, { potion_id: "BLOCK_POTION", name: "Block Potion", description: "获得 12 点格挡。", requires_target: false, valid_target_indices: [] });
    const e = env(raw);
    const bees = [{ index: 0, name: "Entomancer", hp: 55, maxHp: 145, block: 0, alive: true, vulnerable: 0, weak: 0, strengthDelta: 0, attacks: [{ damage: 5, hits: 7 }] }];
    const player = { hp: 30, maxHp: 80, block: 0, energy: 3, strength: 0, dexterity: 0, weak: false, vulnerable: false, frail: false, intangible: false };
    const decision = noPlayRescuePotion(e, bees as never, player as never);
    expect(decision?.kind).toBe("act");
    expect(decision && decision.kind === "act" ? decision.intent.action : null).toBe("use_potion");
    // A light hit: end the turn as before.
    expect(noPlayRescuePotion(e, [{ ...bees[0], attacks: [{ damage: 3, hits: 1 }] }] as never, player as never)).toBeNull();
  });
});

describe("plan continuation after a kill (NEVM F23 T2)", () => {
  it("the living-enemy signature changes when an enemy dies, so the plan is re-made", async () => {
    const { livingEnemySignature } = await import("../src/screens/combat-plan.js");
    const raw = combatPayload();
    const before = livingEnemySignature(raw);
    const combat = raw["combat"] as Raw;
    (combat["enemies"] as Raw[])[0]!["is_alive"] = false;
    expect(livingEnemySignature(raw)).not.toBe(before);
  });
});

describe("Multi Claw next hit (YFG5, ZANM)", () => {
  it("is this Multi Claw plus one hit", async () => {
    const { multiClawNext } = await import("../src/screens/combat-plan.js");
    expect(multiClawNext({ move_id: "MULTI_CLAW", intents: [{ damage: 10, hits: 4 }] })).toBe(50);
    expect(multiClawNext({ move_id: "BITE", intents: [{ damage: 20, hits: 1 }] })).toBeNull();
    // Kin Priest: Beam after Orb of Weakness, 3 hits of 3 + Strength (P78Z, PPKT T11: 21).
    expect(multiClawNext({ enemy_id: "KIN_PRIEST", move_id: "ORB_OF_WEAKNESS", powers: [{ power_id: "STRENGTH_POWER", amount: 4 }], intents: [] })).toBe(21);
  });
});


describe("least-loss drinks a modelled draw potion first (X8HF F33 T6: Swift Potion never drunk, Sandpit 1)", () => {
  const dying = (potionId: string, name: string, description: string, withPiles = true): Raw => {
    const raw = combatPayload();
    Object.assign(((raw["run"] as Raw)["potions"] as Raw[])[0]!, { potion_id: potionId, name, description, requires_target: false, valid_target_indices: [] });
    const combat = raw["combat"] as Raw;
    (combat["player"] as Raw)["current_hp"] = 4;
    combat["enemies"] = (combat["enemies"] as Raw[]).map((enemy) => ({ ...enemy, intents: [{ index: 0, intent_type: "Attack", label: "20", damage: 20, hits: 1, total_damage: 20 }] }));
    if (withPiles) raw["agent_view"] = { combat: { draw: [{ line: "狂乱逃离*6 [1费]：沙坑+1。", card_ids: ["FRANTIC_ESCAPE"] }, { line: "打击*4 [1费]：造成6点伤害。", card_ids: ["STRIKE_IRONCLAD"] }], discard: [] } };
    return raw;
  };

  it("drinks Swift before playing the line, then re-plans", () => {
    const e = env(dying("SWIFT_POTION", "Swift Potion", "抽[blue]3[/blue]张牌。"));
    const decision = planCombatTurn(e);
    expect(decision?.kind === "act" ? decision.label : "ask").toBe("combat/least-loss");
    expect(decision?.kind === "act" ? decision.intent : null).toEqual({ action: "use_potion", option_index: 0 });
    expect(e.screenMemory.combatPlan).toBeNull();
  });

  it("not with empty piles, and not a potion that draws nothing", () => {
    const empty = planCombatTurn(env(dying("SWIFT_POTION", "Swift Potion", "抽[blue]3[/blue]张牌。", false)));
    expect(empty?.kind === "act" ? empty.intent.action : null).not.toBe("use_potion");
    const block = planCombatTurn(env(dying("WEAK_POTION", "Weak Potion", "给予3层虚弱。")));
    expect(block?.kind === "act" && block.label === "combat/least-loss" && block.intent.action === "use_potion").toBe(false);
  });
});

describe("no potion at 0 energy for nothing (GZ24 F8 T1: Dexterity Potion, 0 block from it)", () => {
  it("drops a 0-energy potion line that gains no block or damage over a dry line", () => {
    const raw = combatPayload();
    Object.assign(((raw["run"] as Raw)["potions"] as Raw[])[0]!, { potion_id: "DEXTERITY_POTION", name: "Dexterity Potion", description: "获得[blue]2[/blue]点[gold]敏捷[/gold]。", requires_target: false, valid_target_indices: [] });
    const combat = raw["combat"] as Raw;
    (combat["player"] as Raw)["energy"] = 0;
    combat["hand"] = (combat["hand"] as Raw[]).map((card) => ({ ...card, playable: false, unplayable_reason: "not_enough_energy" }));
    const decision = planCombatTurn(env(raw));
    expect(JSON.stringify(decision?.kind === "ask" ? decision.questions : decision?.kind === "act" ? decision.intent : null)).not.toMatch(/use_potion|Dexterity/);
  });

  it("keeps a line where the potion adds something", async () => {
    const { zeroEnergyDrinkIdle } = await import("../src/screens/combat-plan.js");
    const outcome = (hpLoss: number, damageDealt: number) => ({ hpLoss, damageDealt, winsFight: false }) as never;
    const dry = { steps: [], outcome: outcome(17, 0) } as never;
    const idle = { steps: [{ cardId: "POTION:DEXTERITY_POTION:0" }], outcome: outcome(17, 0) } as never;
    const blocks = { steps: [{ cardId: "POTION:BLOCK_POTION:0" }], outcome: outcome(5, 0) } as never;
    expect(zeroEnergyDrinkIdle(idle, [dry])).toBe(true);
    expect(zeroEnergyDrinkIdle(blocks, [dry])).toBe(false);
    expect(zeroEnergyDrinkIdle(idle, [])).toBe(false);
  });
});

describe("franticEscapesLeft counts escapes in hand, not the piles (X8HF F33 T5)", () => {
  it("six in the discard pile are no turns without a draw source; affordable ones in hand are", async () => {
    const { franticEscapesLeft } = await import("../src/screens/combat-plan.js");
    const raw = { agent_view: { combat: { draw: [], discard: [{ line: "狂乱逃离*6 [1费]：沙坑+1。", card_ids: ["FRANTIC_ESCAPE"] }] } } };
    const escape = (index: number, cost: number) => ({ index, cardId: "FRANTIC_ESCAPE", cost, playable: true }) as never;
    expect(franticEscapesLeft(raw, [])).toBe(0);
    expect(franticEscapesLeft(raw, [], 3, true)).toBe(1);
    expect(franticEscapesLeft({}, [escape(0, 1), escape(1, 2)], 2)).toBe(1);
    expect(franticEscapesLeft({}, [escape(0, 1), escape(1, 2)], 3)).toBe(2);
    // X8HF T5: Sandpit 2, boss 218, best line ~79: 218 / 2 = 109 > 79, the race is lost (was 218 / 8).
    expect(218 / (2 + franticEscapesLeft(raw, [], 4, false))).toBeGreaterThan(79);
  });
});

describe("DeepSeek's boss keep is guidance, and Jev's potion pick stands (EJXC F28 T1, GZ24 F8 T1)", () => {
  const fireLine = (decision: ReturnType<typeof planCombatTurn>): boolean =>
    /Fire Potion|use_potion/.test(JSON.stringify(decision?.kind === "ask" ? decision.questions : decision?.kind === "act" ? [decision.intent, decision.rationale] : null));
  const hallway = (floor: number): Raw => {
    const raw = combatPayload();
    (raw["run"] as Raw)["floor"] = floor;
    return raw;
  };

  it("a potion DeepSeek holds for the boss stays on offer in a non-boss fight, labelled as such", () => {
    const keep = (floor: number, reserve: RunPlan["reserve"] = ["damage"]) => {
      const e = env(hallway(floor));
      e.screenMemory.runPlan = runPlan({ reserve });
      return planCombatTurn(e);
    };
    // Without the reserve the Fire Potion line (+20 damage) is offered.
    expect(fireLine(planCombatTurn(env(hallway(29))))).toBe(true);
    expect(fireLine(keep(29))).toBe(true);
    expect(JSON.stringify(keep(29))).toMatch(/one fewer damage potion/);
    expect(fireLine(keep(5, ["block"]))).toBe(true);
    expect(JSON.stringify(keep(5, ["block"]))).not.toMatch(/one fewer/);
    // A plan of another run is not this run's strategy.
    const other = env(hallway(5));
    other.screenMemory.runPlan = runPlan({ runId: "OTHER", reserve: ["damage"] });
    expect(JSON.stringify(planCombatTurn(other))).not.toMatch(/one fewer/);
  });

  it("Jev's potion line is played even at low confidence: no hallway potion veto", () => {
    const e = env(hallway(5));
    const decision = planCombatTurn(e);
    expect(decision?.kind).toBe("ask");
    const ask = decision as AskDecision;
    const criteria = (ask.questions["plan"] as { criteria: Record<string, string> }).criteria;
    const key = Object.keys(criteria).find((k) => /Fire Potion/.test(criteria[k]!))!;
    const resolved = ask.resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.2 }, confidence: 0.2, raw: {} } });
    expect(resolved.fallback).toBe(false);
    expect(resolved.rationale).toMatch(/^Jev chose plan/);
    expect(resolved.reference?.rank).toBeGreaterThan(0);
  });
});

describe("attack-potion veto when code's rank 1 drinks the same potion (RVL2 F31 T1)", () => {
  it("is not applied: nothing would be kept, it only swaps lines", () => {
    const raw = combatPayload();
    ((raw["combat"] as Raw)["player"] as Raw)["current_hp"] = 30;
    const decision = planCombatTurn(env(raw, { knowledge: eliteKnowledge })) as AskDecision;
    const criteria = (decision.questions["plan"] as { criteria: Record<string, string> }).criteria;
    // Rank 1 and rank 2 both drink the Fire Potion; the dry line costs 12 of 30 HP (no dry override).
    expect(criteria["plan1"]).toMatch(/Fire Potion/);
    expect(criteria["plan2"]).toMatch(/Fire Potion/);
    const resolved = decision.resolve({ plan: { type: "choice", choice: "plan2", probabilities: { plan2: 0.4 }, confidence: 0.4, raw: {} } });
    expect(resolved.fallback).toBe(false);
    expect(resolved.rationale).not.toMatch(/attack potion below code rank 1/);
  });
});

describe("per-card fallback: no draw/buff potion at 0 energy (S6AG F25 T6: Gambler's Brew, nothing playable after)", () => {
  const lethalZero = (): Raw => {
    const raw = combatPayload({ lethalEndTurn: true });
    const combat = raw["combat"] as Raw;
    (combat["player"] as Raw)["energy"] = 0;
    combat["hand"] = (combat["hand"] as Raw[]).map((card) => ({ ...card, playable: false, unplayable_reason: "not_enough_energy" }));
    const potions = (raw["run"] as Raw)["potions"] as Raw[];
    Object.assign(potions[0]!, { potion_id: "GAMBLERS_BREW", name: "Gambler's Brew", description: "丢弃任意张牌，然后抽相同数量的牌。", requires_target: false, valid_target_indices: [] });
    Object.assign(potions[1]!, { index: 1, potion_id: "BLOCK_POTION", name: "Block Potion", description: "获得12点格挡。", occupied: true, usage: "CombatOnly", can_use: true, requires_target: false, valid_target_indices: [] });
    return raw;
  };
  const text = (raw: Raw) => {
    const decision = planCombat(env(raw, { combatPlanner: "card" }));
    return JSON.stringify(decision?.kind === "ask" ? decision.questions["play"] : decision?.kind === "act" ? decision.intent : null);
  };

  it("drops Gambler's Brew at 0 energy; the Block Potion keeps its emergency note", () => {
    const shown = text(lethalZero());
    expect(shown).not.toMatch(/Gambler/);
    expect(shown).toMatch(/Block Potion[^}]*emergency/);
  });

  it("offers a potion DeepSeek holds for the boss with that fact, lethal turn or not", () => {
    const shown = (lethal: boolean, reserve: RunPlan["reserve"] = ["damage"]): string => {
      const e = env(combatPayload({ lethalEndTurn: lethal }), { combatPlanner: "card" });
      e.screenMemory.runPlan = runPlan({ reserve });
      const decision = planCombat(e);
      return JSON.stringify(decision?.kind === "ask" ? decision.questions : decision);
    };
    expect(shown(false, [])).toMatch(/Fire Potion/);
    expect(shown(false, [])).not.toMatch(/holds this potion's role/);
    expect(shown(false)).toMatch(/Fire Potion[^}]*holds this potion's role for the act boss/);
    expect(shown(true)).toMatch(/Fire Potion/);
  });

  it("offers it with energy left, without the emergency note", () => {
    const raw = lethalZero();
    ((raw["combat"] as Raw)["player"] as Raw)["energy"] = 2;
    const shown = text(raw);
    expect(shown).toMatch(/Gambler[^}]*only helps through cards played after it/);
  });
});

describe("act-boss race: Jev's damage line stands, the race's exchange rate is a fact (N28L, WB02, R2H1, EJXC F33 T5)", () => {
  /** Boss at 300, 20 incoming; Bash (3 energy, 30) -20 vs Defend, Defend, Strike (4 block each) -12. */
  const board = (bossId: string, escape = false): Raw => {
    const raw = bossTurnOne();
    (raw["run"] as Raw)["boss_id"] = bossId;
    ((raw["run"] as Raw)["potions"] as Raw[])[0]!["can_use"] = false;
    const boss = ((raw["combat"] as Raw)["enemies"] as Raw[])[0]!;
    Object.assign(boss, { current_hp: 300, max_hp: 341 });
    boss["intents"] = [{ index: 0, intent_type: "Attack", label: "20", damage: 20, hits: 1, total_damage: 20 }];
    const hand = (raw["combat"] as Raw)["hand"] as Raw[];
    const strike = hand.find((card) => card["card_id"] === "STRIKE_R")!;
    const defend = hand.find((card) => card["card_id"] === "DEFEND_R")!;
    const bash = hand.find((card) => card["card_id"] === "BASH")!;
    const def4 = { ...defend, dynamic_values: [{ name: "Block", base_value: 4, current_value: 4 }] };
    (raw["combat"] as Raw)["hand"] = [
      strike,
      { ...def4, index: 1 },
      { ...bash, energy_cost: escape ? 2 : 3, dynamic_values: [{ name: "Damage", base_value: 30, current_value: 30 }] },
      { ...def4, index: 3 },
    ];
    if (escape) {
      // The Insatiable at 100 with Sandpit 3, a 1-cost Frantic Escape in hand.
      Object.assign(boss, { current_hp: 100 });
      boss["powers"] = [{ index: 0, power_id: "SANDPIT_POWER", name: "Sandpit", amount: 3, is_debuff: false }];
      ((raw["combat"] as Raw)["hand"] as Raw[]).push({ ...defend, index: 4, card_id: "FRANTIC_ESCAPE", name: "Frantic Escape", energy_cost: 1, dynamic_values: [] });
    }
    return raw;
  };
  const played = (raw: Raw, pick: (criteria: Record<string, string>) => string): string => {
    const decision = planCombatTurn(env(raw));
    if (decision?.kind === "act") return `${decision.label} ${decision.rationale}`;
    const ask = decision as AskDecision;
    const criteria = (ask.questions["plan"] as { criteria: Record<string, string> }).criteria;
    const key = pick(criteria);
    const resolved = ask.resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.4 }, confidence: 0.4, raw: {} } });
    return `${resolved.guard ? "guarded" : "kept"} ${resolved.rationale}`;
  };
  const byPlays = (pattern: RegExp) => (criteria: Record<string, string>) => Object.keys(criteria).find((k) => pattern.test(criteria[k]!))!;

  it("keeps 24 more damage for 8 HP with or without a clock; behind the clock the line says it pays", () => {
    // Lagavulin Matriarch: 222 over 12 turns; 300 left over 12 is 25 a turn, more than the 6 of the safe line.
    const behind = played(board("LAGAVULIN_MATRIARCH"), byPlays(/"plays":"BASH/));
    expect(behind).toMatch(/^kept Jev chose/);
    expect(played(board("SLIME_BOSS"), byPlays(/"plays":"BASH/))).toMatch(/^kept Jev chose/);
    const decision = planCombatTurn(env(board("LAGAVULIN_MATRIARCH"))) as AskDecision;
    const bash = Object.values((decision.questions["plan"] as { criteria: Record<string, string> }).criteria).find((text) => /"plays":"BASH/.test(text))!;
    expect(JSON.parse(bash)["boss_race"]).toMatch(/behind the boss clock .*its extra damage pays for its extra HP/);
  });

  it("does not swap a Frantic Escape line for one without it", () => {
    const shown = played(board("SLIME_BOSS", true), byPlays(/"plays":"(FRANTIC_ESCAPE, then BASH|BASH[^"]*, then FRANTIC_ESCAPE)/));
    expect(shown).not.toMatch(/HP guard|guard bound/);
  });
});

describe("The Insatiable race: labels, Sandpit turn value, Radiant Tincture (9V09 F33)", () => {
  /** T2: boss 300/341, Sandpit 4, 6x2 incoming, 3 energy; Strike, Bash (2, 30), two 1-cost Frantic Escapes. */
  const board = (): Raw => {
    const raw = bossTurnOne();
    raw["turn"] = 2;
    Object.assign(raw["run"] as Raw, { boss_id: "THE_INSATIABLE", ascension: 8 });
    const pots = (raw["run"] as Raw)["potions"] as Raw[];
    Object.assign(pots[0]!, { potion_id: "RADIANT_TINCTURE", name: "Radiant Tincture", description: "Gain 1 Energy.", requires_target: false, valid_target_indices: [] });
    // An unmodelled potion so the turn goes to Jev (boss fights offer it).
    pots[1] = { ...pots[0], index: 1, potion_id: "LIQUID_BRONZE", name: "Liquid Bronze", description: "Gain 3 Thorns." };
    const boss = ((raw["combat"] as Raw)["enemies"] as Raw[])[0]!;
    Object.assign(boss, { enemy_id: "THE_INSATIABLE", name: "The Insatiable", current_hp: 300, max_hp: 341 });
    boss["powers"] = [{ index: 0, power_id: "SANDPIT_POWER", name: "Sandpit", amount: 4, is_debuff: false }];
    boss["intents"] = [{ index: 0, intent_type: "Attack", label: "6x2", damage: 6, hits: 2, total_damage: 12 }];
    const hand = (raw["combat"] as Raw)["hand"] as Raw[];
    const strike = hand.find((card) => card["card_id"] === "STRIKE_R")!;
    const defend = hand.find((card) => card["card_id"] === "DEFEND_R")!;
    const bash = hand.find((card) => card["card_id"] === "BASH")!;
    const escape = (index: number) => ({ ...defend, index, card_id: "FRANTIC_ESCAPE", name: "Frantic Escape", energy_cost: 1, dynamic_values: [] });
    (raw["combat"] as Raw)["hand"] = [strike, { ...bash, index: 1, energy_cost: 2, dynamic_values: [{ name: "Damage", base_value: 30, current_value: 30 }] }, escape(2), escape(3)];
    // The HP clock well past the pit, as in 9V09 (eaten by the pit at 48 HP): every Escape buys a turn
    // we live to use (9LSQ, the other way round, is in postmortem-a8-batch2).
    Object.assign((raw["combat"] as Raw)["player"] as Raw, { current_hp: 120, max_hp: 120 });
    Object.assign(raw["run"] as Raw, { current_hp: 120, max_hp: 120 });
    return raw;
  };

  it("code's reference line plays the Escapes, fits race, and lines with fewer Escapes depart from the Sandpit race", () => {
    const e = env(board(), { fightPlan: "v1" });
    e.screenMemory.fightPlan = plan({ fight: fightKey(e.state), objective: "race", enemyIds: ["THE_INSATIABLE"], killPriority: [], summary: "Play every affordable Frantic Escape early." });
    const decision = planCombatTurn(e) as AskDecision;
    expect(decision.kind).toBe("ask");
    const criteria = (decision.questions["plan"] as { criteria: Record<string, string> }).criteria;
    const plans = Object.keys(criteria).filter((key) => key.startsWith("plan")).map((key) => JSON.parse(criteria[key]!) as Record<string, string>);
    const escapes = (entry: Record<string, string>) => (entry["plays"]!.match(/Frantic Escape/g) ?? []).length;
    // The reference line plays both Escapes (the Tincture pays for Bash too) and fits race.
    const reference = plans.find((entry) => /^code's reference line/.test(entry["reference"]!))!;
    expect(escapes(reference)).toBe(2);
    expect(reference["tempo"]).toMatch(/^fits DeepSeek's race/);
    for (const entry of plans) {
      if (escapes(entry) < 2) expect(entry["tempo"]).toMatch(/departs from the Sandpit race: \d Frantic Escapes? fewer/);
    }
    // The fight plan's own words are in the strategy lines.
    expect(decision.state["strategy"]).toContain("DeepSeek fight plan: Play every affordable Frantic Escape early.");
  });
});

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
import { LIKELY_DEATH, nodeWeight } from "../src/screens/map.js";
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
import { combatFit } from "../src/strategy/intent.js";
import type { RunPlan } from "../src/strategy/run-plan.js";
import { combatPayload, testKnowledge } from "./scenarios.js";

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

  it("reads the objective and kill priority; unknown enemies and tactical orders are dropped with a reason", () => {
    const parsed = parseFightPlan(
      {
        objective: "Scale_Then_Kill",
        kill_priority: ["Lagavulin Matriarch", "NOBODY"],
        potions: { FIRE_POTION: "early" },
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
    expect(notes).toMatch(/potion timing FIRE_POTION: early ignored/);
    expect(notes).toMatch(/setup_cards ignored/);
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

  it("setup at low HP or against a huge hit becomes preserve_hp (DeepSeek planned setup at 14 HP)", () => {
    const low = parse(board(14), { objective: "scale_then_kill" });
    expect(low.objective).toBe("preserve_hp");
    expect(low.validator.join(" | ")).toMatch(/scale_then_kill at 18% HP → preserve_hp/);
    const hit = parse(board(55, 40), { objective: "scale_then_kill" });
    expect(hit.objective).toBe("preserve_hp");
    expect(parse(board(55), { objective: "scale_then_kill" }).objective).toBe("scale_then_kill");
  });

  it("a fight plan cannot release a potion the run plan reserves (run plan wins)", () => {
    const state = parseGameState(combatPayload());
    const parsed = parse(state, { objective: "kill_fast", potions: { FIRE_POTION: "early" } }, "elite", runPlan({ reserve: ["damage"] }));
    expect(parsed.validator.join(" | ")).toMatch(/FIRE_POTION "early" ignored: the run plan reserves it for the act boss/);
    // The plan has no potion field at all: nothing reaches the solver.
    expect(Object.keys(parsed)).not.toContain("potions");
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
    expect(check(6)).toMatchObject({ objective: "preserve_hp", notes: expect.stringMatching(/under run hp_policy preserve, fight not winnable in 3 turns \(code estimate 6\)/) });
    expect(check(null).objective).toBe("preserve_hp");
    // A boss is fought to its end whatever the policy.
    expect(check(9, "boss").objective).toBe("kill_fast");
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

describe("combatFit (compliance labels for Jev)", () => {
  const field = { minLoss: 4, maxDamage: 30, maxSetup: 1, slack: 5, focusName: "Louse" };
  const line = (over: Partial<Parameters<typeof combatFit>[2]> = {}) => ({ hpLoss: 4, damage: 30, setup: 0, winsFight: false, focusDamage: null, ...over });
  it("says which intent a line fits or breaks", () => {
    expect(combatFit("preserve_hp", "balanced", line(), field)).toEqual({ label: "fits preserve_hp: loses the least HP", breaks: false });
    expect(combatFit("preserve_hp", "balanced", line({ hpLoss: 12 }), field)).toEqual({ label: "breaks preserve_hp: loses 8 more HP than the safest line", breaks: true });
    expect(combatFit("scale_then_kill", "balanced", line({ setup: 1 }), field).label).toBe("fits scale_then_kill: sets up (powers / Strength)");
    expect(combatFit("scale_then_kill", "balanced", line(), field)).toEqual({ label: "breaks scale_then_kill: skips setup another line plays", breaks: true });
    expect(combatFit("kill_fast", "balanced", line({ damage: 10 }), field).label).toBe("breaks kill_fast: 20 less damage than the best line");
    expect(combatFit(null, "preserve", line({ hpLoss: 12, focusDamage: 6 }), field).label).toBe("breaks hp_policy preserve: loses 8 more HP than the safest line; hits kill-priority Louse for 6");
    expect(combatFit("race", "balanced", line({ winsFight: true, damage: 0 }), field).breaks).toBe(false);
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
        runId: "TESTRUN123", fight: "1:11", kind: "elite", enemyIds: [], objective: "preserve_hp", killPriority: ["JAW_WORM"], threat: "T3 hits hard", summary: "old", replans: 0, validator: [],
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

  it("puts a setup line in front of Jev under scale_then_kill, with the intents and compliance labels", () => {
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
    expect(String((ask.state["strategy"] as string[])[0])).toMatch(/^fight objective scale_then_kill: play powers/);
    const criteria = ask.questions["plan"]?.type === "choice" ? ask.questions["plan"].criteria : {};
    expect(Object.values(criteria).some((text) => String(text).includes("fits scale_then_kill: sets up"))).toBe(true);
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
    expect(Object.values(criteria).some((text) => /Inflame, then Demon Form|Demon Form, then Inflame/.test(String(text)) && String(text).includes("fits scale_then_kill"))).toBe(true);
  });

  it("keeps a potion instead of drinking it for a hallway kill when a dry line costs little (CAYK F37-F40)", () => {
    const raw = combatPayload({ enemyHp: 25 });
    const combat = raw["combat"] as Raw;
    combat["enemies"] = [{ ...(combat["enemies"] as Raw[])[0]!, intents: [{ index: 0, intent_type: "Attack", label: "4", damage: 4, hits: 1, total_damage: 4 }] }];
    const e = env(raw);
    const decision = planCombatTurn(e);
    const steps = [decision?.kind === "act" ? decision.intent : null, ...(e.screenMemory.combatPlan?.remaining ?? []).map((step) => step.cardId)];
    expect(JSON.stringify(steps)).not.toContain("use_potion");
    expect(JSON.stringify(steps)).not.toContain("POTION:");
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
    ((raw["run"] as Raw)["potions"] as Raw[])[0]!["potion_id"] = "LIQUID_MEMORIES";
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
    expect(nodeWeight("Elite", 0.2, 100, 8, 2)).toBe(LIKELY_DEATH);
    expect(nodeWeight("Monster", 0.9, 100, 8, 2)).toBeGreaterThan(0);
    // Act 1 before the mid-act: starter deck, elites only at near-full HP (CWMP F6).
    expect(nodeWeight("Elite", 0.7, 100, 6, 1)).toBe(-3);
    expect(nodeWeight("Elite", 0.9, 100, 6, 1)).toBeGreaterThan(0);
  });

  it("reserved potions are in no line or option of code's or Jev's before the boss (MGJ8 F11 T1, EJXC F28)", () => {
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
    expect(shown(["damage"])).not.toMatch(/Fire Potion|use_potion/);
    expect(shown(["any"])).not.toMatch(/Fire Potion|use_potion/);
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

  it("keeps potions at low HP in a hallway fight when a dry line loses <= 5 (B6AC F30)", () => {
    const raw = combatPayload();
    const combat = raw["combat"] as Raw;
    (combat["player"] as Raw)["current_hp"] = 26;
    (combat["player"] as Raw)["max_hp"] = 94;
    combat["enemies"] = (combat["enemies"] as Raw[]).map((enemy, i) => ({ ...enemy, intents: [{ index: 0, intent_type: "Attack", label: String(4 - i), damage: 4 - i, hits: 1, total_damage: 4 - i }] }));
    const e = env(raw);
    const decision = planCombatTurn(e);
    const text = JSON.stringify(decision?.kind === "ask" ? decision.questions : [decision?.kind === "act" ? decision.intent : null, e.screenMemory.combatPlan?.remaining]);
    expect(text).not.toContain("Fire Potion");
    expect(text).not.toContain("use_potion");
  });

  it("scale_then_kill protects a setup line from the HP guard unless it risks death (JF99 F33 T4, 5BXM F33)", () => {
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
      if (decision?.kind === "act") return { played: decision.rationale, deviation: undefined, label: undefined };
      const criteria = (decision as AskDecision).questions["plan"]?.type === "choice" ? ((decision as AskDecision).questions["plan"] as { criteria: Record<string, string> }).criteria : {};
      const key = Object.keys(criteria).find((k) => /"plays":"Demon Form"/.test(criteria[k]!))!;
      const resolved = (decision as AskDecision).resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.4 }, confidence: 0.4, raw: {} } });
      return { played: resolved.guard ? `guarded to ${resolved.guard.plan}` : resolved.rationale, deviation: resolved.deviation, label: JSON.parse(criteria[key]!)["intent_fit"] as string | undefined };
    };
    // No objective: the guard swaps Demon Form (-14) for Defend + Bash (-4).
    expect(play(55, null).played).toMatch(/guarded to DEFEND_R, BASH/);
    // scale_then_kill: the setup line is played (code's own pick, lasting value x1.5, not guarded).
    expect(play(55, "scale_then_kill").played).toMatch(/Demon Form; hp -14/);
    // preserve_hp: swapped, and Jev's pick is logged as a deviation of the objective.
    const preserve = play(55, "preserve_hp");
    expect(preserve.played).toMatch(/guarded to DEFEND_R, BASH/);
    expect(preserve.deviation).toMatchObject({ intent: "breaks preserve_hp: loses 10 more HP than the safest line", fightObjective: "preserve_hp" });
    // At 17 HP the setup line leaves 3 against a 14-ish next hit: it risks death, the guard swaps it.
    expect(play(17, "scale_then_kill").played).toMatch(/guarded to DEFEND_R, BASH/);
  });

});

describe("elite/boss potion veto (M812 F28/F33, 9YR9 F17, F3SS F33)", () => {
  it("refuses a drink-first pick only when the dry line is nearly free, and never when pressed", async () => {
    const { dryLineOverridesPotion } = await import("../src/screens/combat-plan.js");
    // Drink-first at 24 HP: the dry line losing 6 no longer vetoes it (it used to: min loss of any line).
    expect(dryLineOverridesPotion(undefined, 6, 24)).toBe(false);
    expect(dryLineOverridesPotion(undefined, 2, 60)).toBe(true);
    // A drinking line losing as much as the dry line is still refused, unless the dry line costs 30% HP.
    expect(dryLineOverridesPotion(5, 5, 60)).toBe(true);
    expect(dryLineOverridesPotion(10, 10, 21)).toBe(false);
  });
});

describe("the reserve is hard even on a costly turn, and released below 25% HP (WB02 F29)", () => {
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
  it("a costly turn drinks it without a reserve, never with one, and again below 25% HP", () => {
    expect(shown(30, [])).toMatch(/Block Potion|use_potion/);
    expect(shown(30, ["block"])).not.toMatch(/Block Potion|use_potion/);
    expect(shown(18, ["block"])).toMatch(/Block Potion|use_potion/);
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

describe("HP guard in a lost Sandpit race (WB02 F33)", () => {
  it("does not swap damage for HP when the Sandpit ends the fight first anyway", () => {
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
    expect(guarded(board(false))).toBe(true);
    expect(guarded(board(true))).toBe(false);
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

describe("run-plan boss keep and same-turn veto hold potions back (EJXC F28 T1, GZ24 F8 T1)", () => {
  const fireLine = (decision: ReturnType<typeof planCombatTurn>): boolean =>
    /Fire Potion|use_potion/.test(JSON.stringify(decision?.kind === "ask" ? decision.questions : decision?.kind === "act" ? [decision.intent, decision.rationale] : null));
  const hallway = (floor: number): Raw => {
    const raw = combatPayload();
    (raw["run"] as Raw)["floor"] = floor;
    return raw;
  };

  it("a potion the run plan reserves for the boss is not on offer in any non-boss fight (not only +20)", () => {
    const keep = (floor: number, reserve: RunPlan["reserve"] = ["damage"]) => {
      const e = env(hallway(floor));
      e.screenMemory.runPlan = runPlan({ reserve });
      return planCombatTurn(e);
    };
    // Without the reserve the Fire Potion line (+20 damage) is offered.
    expect(fireLine(planCombatTurn(env(hallway(29))))).toBe(true);
    expect(fireLine(keep(29))).toBe(false);
    // Far from the boss too (the old 10-floor window let 16 of 17 broken keeps through).
    expect(fireLine(keep(5))).toBe(false);
    expect(fireLine(keep(5, ["block"]))).toBe(true);
    // A plan of another run is not this run's strategy.
    const other = env(hallway(5));
    other.screenMemory.runPlan = runPlan({ runId: "OTHER", reserve: ["damage"] });
    expect(fireLine(planCombatTurn(other))).toBe(true);
  });

  it("a potion refused this turn is not offered again on the same turn's re-plan", () => {
    const e = env(hallway(5));
    const decision = planCombatTurn(e);
    expect(decision?.kind).toBe("ask");
    const ask = decision as AskDecision;
    const criteria = (ask.questions["plan"] as { criteria: Record<string, string> }).criteria;
    const key = Object.keys(criteria).find((k) => /Fire Potion/.test(criteria[k]!))!;
    // Hallway bar: a potion line below rank 1 at 0.4 is refused, and remembered for this turn.
    const resolved = ask.resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.4 }, confidence: 0.4, raw: {} } });
    expect(resolved.fallback).toBe(true);
    resolved.apply?.();
    expect(e.screenMemory.potionVeto?.ids).toEqual(["FIRE_POTION"]);
    e.screenMemory.combatPlan = null;
    expect(fireLine(planCombatTurn(e))).toBe(false);
    // Next turn it is on offer again.
    const next = env({ ...hallway(5), turn: 4 });
    next.screenMemory.potionVeto = e.screenMemory.potionVeto;
    expect(fireLine(planCombatTurn(next))).toBe(true);
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

  it("holds a reserved potion back unless the turn is lethal", () => {
    const shown = (lethal: boolean, reserve: RunPlan["reserve"] = ["damage"]): string => {
      const e = env(combatPayload({ lethalEndTurn: lethal }), { combatPlanner: "card" });
      e.screenMemory.runPlan = runPlan({ reserve });
      const decision = planCombat(e);
      return JSON.stringify(decision?.kind === "ask" ? decision.questions : decision);
    };
    expect(shown(false, [])).toMatch(/Fire Potion/);
    expect(shown(false)).not.toMatch(/Fire Potion/);
    expect(shown(true)).toMatch(/Fire Potion/);
  });

  it("offers it with energy left, without the emergency note", () => {
    const raw = lethalZero();
    ((raw["combat"] as Raw)["player"] as Raw)["energy"] = 2;
    const shown = text(raw);
    expect(shown).toMatch(/Gambler[^}]*only helps through cards played after it/);
  });
});

describe("HP guard in an act-boss race (N28L, WB02, R2H1, EJXC F33 T5)", () => {
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

  it("keeps 24 more damage for 8 HP while the clock says we are behind; swaps it without a clock", () => {
    // Lagavulin Matriarch: 222 over 12 turns; 300 left over 12 is 25 a turn, more than the 6 of the swap.
    const behind = played(board("LAGAVULIN_MATRIARCH"), byPlays(/"plays":"BASH/));
    expect(behind).not.toMatch(/guard/i);
    const noClock = played(board("SLIME_BOSS"), byPlays(/"plays":"BASH/));
    expect(noClock).toMatch(/guard/i);
  });

  it("does not swap a Frantic Escape line for one without it", () => {
    const shown = played(board("SLIME_BOSS", true), byPlays(/"plays":"(FRANTIC_ESCAPE, then BASH|BASH[^"]*, then FRANTIC_ESCAPE)/));
    expect(shown).not.toMatch(/HP guard|guard bound/);
  });
});

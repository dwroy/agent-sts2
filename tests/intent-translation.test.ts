/**
 * How DeepSeek's intents are read (intent.ts): the reason tag picks the translation, a low_hp preserve
 * lapses when HP is back, labels on map and rest come from the same scores that rank the options,
 * re-plans after heals, and the reserve (burst potions by id, rocks never, no save cost once released).
 */

import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { planMap } from "../src/screens/map.js";
import { planRest } from "../src/screens/rest.js";
import type { FightPlan } from "../src/strategy/fight-plan.js";
import {
  combatPolicy,
  intentLines,
  isReserved,
  mapFit,
  parseReasons,
  policyAt,
  potionRole,
  restFit,
  routeRiskAt,
  solverScale,
} from "../src/strategy/intent.js";
import { parseRunPlan, runPlanTrigger, snapshotOf, type RunPlan } from "../src/strategy/run-plan.js";
import { baseState, combatPayload, mapPayload, restPayload, runPayload, testKnowledge } from "./scenarios.js";

type Raw = Record<string, unknown>;
const config = loadConfig({} as NodeJS.ProcessEnv);

const runPlan = (over: Partial<RunPlan> = {}): RunPlan => ({
  runId: "TESTRUN123", act: 2, floor: 9, hpPct: 55 / 80, trigger: "start", archetype: "Strength", want: [], avoid: [], remove: [], blockTarget: null,
  hpPolicy: "balanced", routeRisk: "normal", entryHp: null, reserve: [], needs: [], avoidRoles: [], bossPrep: "", summary: "", version: 1, changes: [], validator: [],
  ...over,
});
const fightPlan = (over: Partial<FightPlan> = {}): FightPlan => ({
  runId: "TESTRUN123", fight: "1:9", kind: "monster", enemyIds: [], objective: "kill_fast", killPriority: [], threat: "", summary: "", replans: 0, validator: [], ...over,
});

function env(raw: Raw, plan: RunPlan | null, over: Partial<DecisionEnv> = {}): DecisionEnv {
  const state: GameState = parseGameState(raw);
  const screenMemory = createScreenMemory(state.screen);
  screenMemory.runPlan = plan;
  return {
    state, knowledge: testKnowledge, brief: buildRunBrief(state, testKnowledge), thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", screenMemory, shopDiscardPotions: [], ...over,
  };
}

const mapState = (run: Raw = {}, map?: Raw) => parseGameState(baseState("MAP", { run: runPayload(run), ...(map ? { map } : {}) }));

describe("reason tags", () => {
  it("parses a closed list with synonyms, at most two, unknown ones returned", () => {
    expect(parseReasons(["enemy_scales", "burst_window", "low_hp"]).reasons).toEqual(["enemy_scales", "burst_window"]);
    expect(parseReasons("Scaling, vibes")).toEqual({ reasons: ["enemy_scales"], dropped: [" vibes"] });
    expect(parseReasons(undefined)).toEqual({ reasons: [], dropped: [] });
  });

  it("kill_fast because the enemy scales puts damage first under hp_policy preserve (5JU3 F9 Fossil Stalker)", () => {
    const preserve = runPlan({ hpPolicy: "preserve" });
    const plain = combatPolicy(preserve, fightPlan(), 0.8);
    expect(plain.policy).toBe("preserve");
    const scaling = combatPolicy(preserve, fightPlan({ reasons: ["enemy_scales"] }), 0.8);
    expect(scaling.policy).toBe("balanced");
    expect(scaling.why).toMatch(/kill_fast because enemy_scales: damage first/);
    // The solver's HP weight is the objective's alone then (preserve's x1.25 dropped).
    expect(solverScale("kill_fast", scaling.policy, 0.8).hp).toBeCloseTo(0.9);
    expect(solverScale("kill_fast", plain.policy, 0.8).hp).toBeCloseTo(1.125);
    // preserve_hp for a scaling enemy is not damage-first.
    expect(combatPolicy(preserve, fightPlan({ objective: "preserve_hp", reasons: ["enemy_scales"] }), 0.8).policy).toBe("preserve");
  });

  it("a preserve / avoid_elites chosen for low HP lapses once HP is back at the target (NX48 F35: 86% under a 35% preserve)", () => {
    const plan = runPlan({ hpPolicy: "preserve", routeRisk: "avoid_elites", entryHp: 0.85, reasons: { hp_policy: "low_hp", route_risk: "low_hp" } });
    expect(policyAt(plan, 0.35)).toBe("preserve");
    expect(policyAt(plan, 0.86)).toBe("balanced");
    expect(routeRiskAt(plan, 0.86)).toBe("normal");
    // Kept for the boss: holds at any HP.
    expect(policyAt(runPlan({ hpPolicy: "preserve", reasons: { hp_policy: "boss_prep" } }), 0.95)).toBe("preserve");
    const lines = intentLines(plan, null, 35, 0.86);
    expect(lines[0]).toMatch(/^hp_policy preserve because low_hp/);
    expect(lines).toContain("in force now: hp_policy balanced (hp_policy preserve was for low HP; HP 86% is back at the 85% target)");
  });

  it("run plan replies carry reasons per intent, kept across re-plans that leave them out", () => {
    const state = mapState();
    const first = parseRunPlan({ hp_policy: "preserve", reasons: { hp_policy: "low_hp", reserve: "boss", nonsense: "x" } }, state, testKnowledge, "start");
    expect(first.reasons).toEqual({ hp_policy: "low_hp", reserve: "boss_prep" });
    expect(first.validator.join(" | ")).toMatch(/reasons: dropped "nonsense"/);
    const again = parseRunPlan({ summary: "same" }, mapState({ floor: 10 }), testKnowledge, "review", { ...first, snapshot: snapshotOf(state, testKnowledge) });
    expect(again.reasons).toEqual({ hp_policy: "low_hp", reserve: "boss_prep" });
  });
});

describe("re-plan flexibility", () => {
  it("re-plans when HP is back up (hp_rise), and waits for the Ancient before an act re-plan (NX48 F17/F33)", () => {
    // Plan made at 35% under preserve; the Ancient healed to 86%.
    const low = runPlan({ hpPct: 0.35, hpPolicy: "preserve", entryHp: 0.9, act: 1 });
    expect(runPlanTrigger({ ...low, act: 2 }, mapState({ current_hp: 69 }))).toBe("hp_rise");
    // Under preserve made below the target, back at it: re-plan too.
    expect(runPlanTrigger(runPlan({ hpPct: 0.6, hpPolicy: "preserve", entryHp: 0.8, act: 2 }), mapState({ current_hp: 66 }))).toBe("hp_rise");
    // New act, only the Ancient open: wait.
    const ancient = { ...(mapPayload()["map"] as Raw), available_nodes: [{ index: 0, row: 0, col: 3, node_type: "Ancient" }] };
    expect(runPlanTrigger(low, mapState({ current_hp: 28 }, ancient))).toBeNull();
    expect(runPlanTrigger(low, mapState({ current_hp: 28 }))).toBe("act");
  });

  it("accepts the re-plan's own name for a trigger when the facts show it (KQK2 F6: hp_drop)", () => {
    const previous = runPlan({ entryHp: 0.85, snapshot: snapshotOf(mapState({ current_hp: 72 }), testKnowledge) });
    const plan = parseRunPlan(
      { hp_policy: "preserve", route_risk: "avoid_elites", changes: [{ field: "hp_policy", trigger: "hp_drop" }, { field: "route_risk", trigger: "HP drop" }] },
      mapState({ floor: 11, current_hp: 40 }), testKnowledge, "hp_drop", previous,
    );
    expect(plan.hpPolicy).toBe("preserve");
    expect(plan.routeRisk).toBe("avoid_elites");
    expect(plan.changes.map((change) => change.trigger)).toEqual(["hp_below_target", "hp_below_target"]);
    expect(plan.validator.join(" | ")).toMatch(/trigger "hp_drop" read as hp_below_target/);
  });
});

describe("map and rest labels from the same scores", () => {
  it("labels every node by its route value against the best one; none breaks while near the top (5JU3 F10)", () => {
    // "card" planner: no code margin, every node goes to Jev with its label.
    const decision = planMap(env(mapPayload(), runPlan({ hpPolicy: "preserve" }), { strictJev: false, combatPlanner: "card" })) as Decision;
    expect(decision.kind).toBe("ask");
    const criteria = (decision as AskDecision).questions["pick"] as { criteria: Record<string, string> };
    const nodes = Object.values(criteria.criteria).map((text) => JSON.parse(text) as Record<string, unknown>);
    const best = Math.max(...nodes.map((node) => Number(node["route_value"])));
    for (const node of nodes) {
      const label = String(node["intent_fit"]);
      if (best - Number(node["route_value"]) <= 2.5) expect(label).toMatch(/^fits hp_policy preserve/);
      else expect(label).toMatch(/^costs \d+\.\d route value vs the best node under hp_policy preserve/);
    }
    // 5JU3 F10 at 30/80 (act 1): '?' 7.12 and Monster 7.0 are both near code's best; preserve moves each by
    // its expected HP cost, the '?' less than the Monster (NJSZ F29).
    expect(mapFit(runPlan({ hpPolicy: "preserve" }), "Unknown", 0.375, { value: 7.12, best: 7.12 }, 99, undefined, 1)).toBe("fits hp_policy preserve: code's best route under the plan (the plan moves this Unknown -0.56)");
    expect(mapFit(runPlan({ hpPolicy: "preserve" }), "Monster", 0.375, { value: 7.0, best: 7.12 }, 99, undefined, 1)).toBe("fits hp_policy preserve: within 0.1 of code's best route under the plan (the plan moves this Monster -1.4)");
    expect(mapFit(runPlan(), "Monster", 0.375, { value: 1, best: 7.12 })).toBeNull();
  });

  it("rest labels follow the rest scores", () => {
    const plan = runPlan({ hpPolicy: "preserve" });
    expect(restFit(plan, "HEAL", 0.5, { value: 14, best: 14 })).toBe("fits hp_policy preserve: code's best option (heals toward the 80% target from 50%)");
    expect(restFit(plan, "SMITH", 0.5, { value: 4, best: 14 })).toBe("costs 10.0 score vs the best option under hp_policy preserve (HP 50% is below the 80% target)");
    const decision = planRest(env(baseState("REST", { ...restPayload(), run: runPayload({ current_hp: 50 }) }), plan, { strictJev: false, combatPlanner: "card" })) as AskDecision;
    const texts = JSON.stringify(decision.kind === "ask" ? decision.questions : decision);
    expect(texts).toMatch(/fits hp_policy preserve: code's best option/);
  });
});

describe("reserve roles", () => {
  it("burst potions are 'damage' by id, rocks are never reserved (JF8N F13, KFPC F29, H7W0)", () => {
    for (const id of ["ENERGY_POTION", "RADIANT_TINCTURE", "ATTACK_POTION", "POWER_POTION", "SKILL_POTION", "COLORLESS_POTION", "DUPLICATOR"]) {
      expect(potionRole(id, "获得{Energy}")).toBe("damage");
      expect(isReserved(["damage"], id, "")).toBe(true);
    }
    expect(potionRole("POTION_SHAPED_ROCK", "Deal 10 damage.")).toBeNull();
    expect(isReserved(["any"], "POTION_SHAPED_ROCK", "Deal 10 damage.")).toBe(false);
  });

  it("a released reserved potion costs nothing extra (5JU3 F11 T3: Gigantification released at 16% HP, still priced +20)", () => {
    /** Hallway, two attackers (17 incoming), the Fire Potion in the belt; HP as given. */
    const board = (hp: number): Raw => {
      const raw = combatPayload();
      ((raw["combat"] as Raw)["player"] as Raw)["current_hp"] = hp;
      (raw["run"] as Raw)["current_hp"] = hp;
      return raw;
    };
    const play = (hp: number, plan: RunPlan | null): string => {
      const e = env(board(hp), plan, { strictJev: false });
      const decision = planCombatTurn(e);
      if (decision?.kind === "ask") return JSON.stringify(Object.values(decision.questions).map((q) => (q.type === "choice" ? Object.keys(q.criteria).map((key) => JSON.parse(q.criteria[key]!)["plays"]) : null)));
      return JSON.stringify([decision?.kind === "act" ? decision.intent : null, e.screenMemory.combatPlan?.remaining?.map((step) => step.cardId)]);
    };
    // 12/80 = 15% HP: released, played exactly as if nothing were reserved.
    expect(play(12, runPlan({ reserve: ["damage"] }))).toBe(play(12, null));
    // 30/80: still held for the boss.
    expect(play(30, runPlan({ reserve: ["damage"] }))).not.toMatch(/Fire Potion|use_potion|POTION:/);
  });
});

describe("Potion-Shaped Rocks under Petrified Toad (H7W0 F42-F48)", () => {
  it("a Toad's rock is free to drink in a hallway and never kept back like a real potion", () => {
    const board = (toad: boolean): Raw => {
      const raw = combatPayload({ enemyHp: 10 });
      const run = raw["run"] as Raw;
      const pots = run["potions"] as Raw[];
      Object.assign(pots[0]!, { potion_id: "POTION_SHAPED_ROCK", name: "Potion-Shaped Rock", description: "Deal 10 damage to target enemy." });
      if (toad) run["relics"] = [...(run["relics"] as Raw[]), { index: 1, relic_id: "PETRIFIED_TOAD", name: "Petrified Toad", description: "", stack: null, is_melted: false }];
      return raw;
    };
    const drinks = (toad: boolean): boolean => {
      const e = env(board(toad), runPlan({ reserve: ["damage"] }), { strictJev: false });
      const decision = planCombatTurn(e);
      const text = JSON.stringify([decision?.kind === "act" ? decision.intent : decision?.kind === "ask" ? decision.questions : null, e.screenMemory.combatPlan?.remaining]);
      return /use_potion|POTION_SHAPED_ROCK|Potion-Shaped Rock/.test(text);
    };
    expect(drinks(true)).toBe(true);
    // Without the Toad the rock is a potion like any other: kept on a cheap hallway turn.
    expect(drinks(false)).toBe(false);
    expect(potionRole("POTION_SHAPED_ROCK", "Deal 10 damage to target enemy.")).toBeNull();
  });
});

describe("the Queen's YOU_ARE_MINE turn (H7W0 F48 T2)", () => {
  it("is found only while the Amalgam lives and the Queen's move is YOU_ARE_MINE", async () => {
    const { youAreMineTurn } = await import("../src/screens/combat-plan.js");
    const combat = (move: string, amalgamHp: number) => ({
      enemies: [
        { index: 0, enemy_id: "TORCH_HEAD_AMALGAM", current_hp: amalgamHp, is_alive: amalgamHp > 0 },
        { index: 1, enemy_id: "QUEEN", current_hp: 419, move_id: move, is_alive: true },
      ],
    });
    expect(youAreMineTurn(combat("YOU_ARE_MINE_MOVE", 211))).toEqual({ amalgamIndex: 0 });
    expect(youAreMineTurn(combat("BURN_BRIGHT_FOR_ME_MOVE", 211))).toBeNull();
    expect(youAreMineTurn(combat("YOU_ARE_MINE_MOVE", 0))).toBeNull();
  });
});

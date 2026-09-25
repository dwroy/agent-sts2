/**
 * FIGHT_PLAN=v1: DeepSeek's one plan per elite/boss fight — parsing against the board, what it does to
 * potion costs and offers, the plan-fit tag, re-plans, the log round trip, and its effect on the turn
 * planner (no per-turn escalation; a setup line becomes a question for Jev).
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
  parseFightPlan,
  planFit,
  planOffersPotion,
  planPotionCost,
  type FightPlan,
} from "../src/strategy/fight-plan.js";
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
  approach: "setup",
  setup: ["INFLAME"],
  focus: "LAGAVULIN_MATRIARCH",
  potions: { FIRE_POTION: "save" },
  keyTurns: "",
  summary: "Inflame first, then race",
  replans: 0,
  ...over,
});

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

  it("keeps deck cards, board enemies and belt potions; drops the rest", () => {
    const parsed = parseFightPlan(
      {
        approach: "SETUP",
        setup_cards: ["INFLAME+", "DEMON_FORM", "Bash", "INFLAME"],
        focus_enemy: "Lagavulin Matriarch",
        potions: { FIRE_POTION: "big_hit", BLOCK_POTION: "early", "Fire Potion": "nonsense" },
        key_turns: "T3 big hit",
        summary: "set up, then race",
      },
      state,
      testKnowledge,
      base,
    );
    expect(parsed.approach).toBe("setup");
    expect(parsed.setup).toEqual(["INFLAME", "BASH"]);
    expect(parsed.focus).toBe("LAGAVULIN_MATRIARCH");
    expect(parsed.potions).toEqual({ FIRE_POTION: "big_hit" });
    expect(parsed.enemyIds).toEqual(["LAGAVULIN_MATRIARCH"]);
    expect(parsed.fight).toBe("1:9");
  });

  it("falls back to race and no focus on unusable values", () => {
    const parsed = parseFightPlan({ approach: "yolo", focus_enemy: "NOBODY", setup_cards: "INFLAME" }, state, testKnowledge, base);
    expect(parsed.approach).toBe("race");
    expect(parsed.focus).toBeNull();
    expect(parsed.setup).toEqual([]);
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

describe("plan potion rules", () => {
  const ctx = { turn: 1, bigHit: false, pressed: false };
  it("frees early potions in turns 1-2, prices saved ones up, leaves unlisted ones alone", () => {
    expect(planPotionCost(plan({ potions: { X: "early" } }), "X", ctx)).toEqual({ free: true, extra: 0 });
    expect(planPotionCost(plan({ potions: { X: "early" } }), "X", { ...ctx, turn: 3 })).toBeNull();
    expect(planPotionCost(plan({ potions: { X: "save" } }), "X", ctx)).toEqual({ free: false, extra: 20 });
    expect(planPotionCost(plan({ potions: { X: "big_hit" } }), "X", { ...ctx, bigHit: true })).toEqual({ free: true, extra: 0 });
    expect(planPotionCost(plan(), "OTHER", ctx)).toBeNull();
    expect(planPotionCost(null, "X", ctx)).toBeNull();
  });
  it("never stands between a pressed turn and a potion", () => {
    expect(planPotionCost(plan({ potions: { X: "save" } }), "X", { ...ctx, pressed: true })).toBeNull();
    expect(planOffersPotion(plan({ potions: { X: "save" } }), "X", { ...ctx, costly: false, pressed: true })).toBe(true);
  });
  it("offers unmodelled potions by plan: early now, save never, unlisted by the default rule", () => {
    const offer = { ...ctx, costly: false };
    expect(planOffersPotion(plan({ potions: { X: "early" } }), "X", offer)).toBe(true);
    expect(planOffersPotion(plan({ potions: { X: "save" } }), "X", offer)).toBe(false);
    expect(planOffersPotion(plan({ potions: { X: "emergency" } }), "X", { ...offer, costly: true })).toBe(true);
    expect(planOffersPotion(plan(), "Y", offer)).toBeNull();
  });
});

describe("planFit", () => {
  it("names planned setup cards, focus damage and potions drunk against the plan", () => {
    const fit = planFit(plan(), [
      { cardId: "INFLAME", name: "Inflame" },
      { cardId: "POTION:FIRE_POTION:0", name: "potion Fire Potion" },
    ], 12);
    expect(fit).toBe("plays planned setup Inflame; 12 damage to the kill-first enemy; drinks Fire Potion the plan keeps for a later fight");
    expect(planFit(plan(), [{ cardId: "STRIKE_R", name: "Strike" }], 0)).toBe("neutral");
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

  it("puts a planned setup line in front of Jev with the plan and its fit tag", () => {
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
    expect(ask.state["fight_plan"]).toMatchObject({ approach: "setup", setup_first: ["INFLAME"] });
    const criteria = ask.questions["plan"]?.type === "choice" ? ask.questions["plan"].criteria : {};
    expect(Object.values(criteria).some((text) => String(text).includes("plays planned setup"))).toBe(true);
  });

  it("ignores a plan made for another fight", () => {
    const e = env(bossTurnOne(), { fightPlan: "v1" });
    e.screenMemory.fightPlan = plan({ fight: "0:3" });
    const decision = planCombatTurn(e);
    if (decision?.kind === "ask") expect(decision.state["fight_plan"]).toBeUndefined();
  });

  it("counts planned setup cards: one of two played is not the plan (CAYK F48 T3)", () => {
    const raw = bossTurnOne();
    const combat = raw["combat"] as Raw;
    const hand = combat["hand"] as Raw[];
    const inflame = hand[3]!;
    combat["hand"] = [...hand, { ...inflame, index: 4, card_id: "DEMON_FORM", name: "Demon Form", energy_cost: 1 }];
    const e = env(raw, { fightPlan: "v1" });
    e.screenMemory.fightPlan = plan({ fight: fightKey(e.state), setup: ["INFLAME", "DEMON_FORM"] });
    const decision = planCombatTurn(e);
    expect(decision?.kind).toBe("ask");
    const ask = decision as AskDecision;
    const criteria = ask.questions["plan"]?.type === "choice" ? ask.questions["plan"].criteria : {};
    expect(Object.values(criteria).some((text) => String(text).includes("Inflame, Demon Form") || String(text).includes("Demon Form, Inflame"))).toBe(true);
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
  });

  it("the HP guard never swaps into a line drinking a potion the plan keeps (MGJ8 F11 T1)", () => {
    const raw = bossTurnOne();
    const combat = raw["combat"] as Raw;
    (combat["enemies"] as Raw[])[0]!["intents"] = [{ index: 0, intent_type: "Attack", label: "30", damage: 30, hits: 1, total_damage: 30 }];
    const e = env(raw, { fightPlan: "v1" });
    e.screenMemory.fightPlan = plan({ fight: fightKey(e.state), setup: [], potions: { FIRE_POTION: "emergency" } });
    const decision = planCombatTurn(e);
    if (decision?.kind !== "ask") return;
    const criteria = decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {};
    for (const key of Object.keys(criteria).filter((k) => k.startsWith("plan"))) {
      const resolved = decision.resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.4 }, confidence: 0.4, raw: {} } });
      if (resolved.guard) expect(resolved.guard.plan).not.toContain("Fire Potion");
    }
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
});


/**
 * The 2026-09-28 division of labour (paper/materials/discussions/2026-09-28-old-vs-new-logic.md, "Dai 的决定"):
 * DeepSeek sets strategy and tempo as guidance, code gives every option its facts and a reference rank,
 * Jev decides. Code acts alone only on a single legal option, a dominated field, or a lethal line; the one
 * hard safety left is "no line that certainly dies while one survives". Plus the Evil Eye and Glowwater
 * models (Q97B F23 T3; logged Glowwater drinks: 5 -> 10 cards, 3 -> 10).
 */

import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { planMap } from "../src/screens/map.js";
import { buildPickDecision } from "../src/screens/pick.js";
import { planRest } from "../src/screens/rest.js";
import { planShop } from "../src/screens/shop.js";
import { modelPotion, type CardModel } from "../src/strategy/card-model.js";
import type { RunPlan } from "../src/strategy/run-plan.js";
import { solveTurn } from "../src/strategy/turn-solver.js";
import { logged, loggedEnv, questionOf, referencePick } from "./logged.js";
import { baseState, combatPayload, restPayload, runPayload, testKnowledge } from "./scenarios.js";

type Raw = Record<string, unknown>;
const config = loadConfig({} as NodeJS.ProcessEnv);

const runPlan = (over: Partial<RunPlan> = {}): RunPlan => ({
  runId: "TESTRUN123", act: 2, floor: 9, hpPct: 0.69, trigger: "start", archetype: "Strength", want: [], avoid: [], remove: [], blockTarget: null,
  hpPolicy: "balanced", routeRisk: "normal", entryHp: null, reserve: [], needs: [], avoidRoles: [], bossPrep: "", summary: "", version: 1, changes: [], validator: [],
  ...over,
});

function env(raw: Raw, plan: RunPlan | null = null, over: Partial<DecisionEnv> = {}): DecisionEnv {
  const state: GameState = parseGameState(raw);
  const screenMemory = createScreenMemory(state.screen);
  screenMemory.runPlan = plan;
  return {
    state, knowledge: testKnowledge, brief: buildRunBrief(state, testKnowledge), thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", screenMemory, shopDiscardPotions: [],
    ...over,
  };
}

/** A copy of the test knowledge where the Jaw Worm is an Elite. */
const eliteKnowledge = { ...testKnowledge, monster: (id: string) => (id === "JAW_WORM" ? { ...testKnowledge.monster(id)!, type: "Elite" } : testKnowledge.monster(id)) } as typeof testKnowledge;

describe("(a) a line drinking a potion DeepSeek holds for the boss is offered, with the fact of what it saves and costs", () => {
  it("elite fight at 30/80 under reserve [damage]: the Fire Potion line is on offer, labelled, and Jev's pick of it is played", () => {
    const raw = combatPayload();
    ((raw["combat"] as Raw)["player"] as Raw)["current_hp"] = 30;
    const plan = runPlan({ reserve: ["damage"], reasons: { reserve: "boss_prep" }, bossPrep: "Strength for the crab" });
    const decision = planCombatTurn(env(raw, plan, { knowledge: eliteKnowledge })) as AskDecision;
    expect(decision.kind).toBe("ask");
    const { options } = questionOf(decision);
    const [key, fire] = Object.entries(options).find(([, option]) => String(option["plays"]).includes("Fire Potion"))!;
    expect(String(fire["potion_facts"])).toMatch(/^drinking Fire Potion now: .*vs the best line without it; the act boss fight then has one fewer damage potion \(DeepSeek plan holds damage potions for the boss because boss_prep; boss prep: Strength for the crab\)/);
    expect(String(fire["tempo"])).toMatch(/departs from DeepSeek's reserve: drinks a potion it holds for the act boss/);
    // DeepSeek's guidance is in the question and in the log record.
    expect(decision.guidance?.join("\n")).toMatch(/DeepSeek holds damage potions for the act boss because boss_prep/);
    const resolved = decision.resolve({ plan: { type: "choice", choice: key, confidence: 0.3, probabilities: {}, raw: {} } });
    expect(resolved.fallback).toBe(false);
    expect(JSON.stringify(resolved.intent)).toMatch(/use_potion|play_card/);
    expect(resolved.deviation?.intent).toMatch(/drinks a potion DeepSeek holds for the act boss/);
    expect(resolved.reference).toMatchObject({ of: Object.keys(options).filter((entry) => entry.startsWith("plan")).length });
  });
});

describe("(b) an optional elite at low HP is offered with its arrival-HP facts", () => {
  it("EN55 F7 at 41/80: the Elite is an option, with the HP bar, the deck's damage and its route facts", () => {
    const fx = logged("en55-map-f7");
    Object.assign(fx.state["run"] as Raw, { current_hp: 41 });
    const decision = planMap(loggedEnv(fx));
    expect(decision?.kind).toBe("ask");
    const elite = Object.values(questionOf(decision).options).find((option) => option["node_type"] === "Elite")!;
    expect(elite).toBeDefined();
    expect(String(elite["elite_hp"])).toMatch(/^HP 51% without heal potions/);
    expect(String(elite["elite_deck_damage"])).toMatch(/^deck ~\d+ damage a turn vs this act's elites' ~\d+\+/);
    expect(String(elite["route_survival"])).toMatch(/^alive .* ~\d+% of the time/);
    expect(typeof elite["code_rank"]).toBe("number");
    expect(elite["why"]).toBeTruthy();
  });
});

describe("(c) rest options carry HP and upgrade facts, and code does not pick between them", () => {
  it("80% HP five floors before the boss under an 85% entry target: asked, both options with facts", () => {
    const raw = { ...restPayload(), run: runPayload({ floor: 28, current_hp: 64, max_hp: 80 }) };
    const decision = planRest(env(baseState("REST", raw), runPlan({ entryHp: 0.85, restLean: "smith" }))) as AskDecision;
    expect(decision.kind).toBe("ask");
    const { options } = questionOf(decision);
    const heal = Object.values(options).find((option) => option["kind"] === "HEAL")!;
    const smith = Object.values(options).find((option) => option["kind"] === "SMITH")!;
    expect(String(heal["heal_facts"])).toMatch(/^\+\d+ HP: 80% -> 100% .*boss in 5 floors; DeepSeek's entry target 85% reached/);
    expect(String(smith["upgrade_facts"])).toMatch(/^best upgrades: /);
    expect(String(smith["hp_if_not_healing"])).toMatch(/^80% HP carried on \(DeepSeek's entry target 85%, boss in 5 floors\)/);
    expect(String(smith["tempo"])).toBe("fits DeepSeek's rest lean smith");
    expect(String(heal["tempo"])).toBe("departs from DeepSeek's rest lean smith");
    for (const option of [heal, smith]) {
      expect(typeof option["code_value"]).toBe("number");
      expect(option["code_rank"]).toBeGreaterThanOrEqual(1);
      expect(option["why"]).toBeTruthy();
    }
    expect(decision.state["roles"]).toMatch(/You decide/);
    expect(decision.guidance).toEqual(expect.arrayContaining(["rest lean: smith"]));
  });
});

describe("(d) the shop always offers leaving, with the unspent-gold fact", () => {
  it("EHJZ F31 (277 gold two floors before the boss): leave is there, and every buy says why", () => {
    const decision = planShop(loggedEnv(logged("ehjz-shop-f31"))) as AskDecision;
    expect(decision.kind).toBe("ask");
    const { options } = questionOf(decision);
    expect(String(options["leave"]!["unspent_gold"])).toMatch(/^~277 of the 277 gold is likely unspendable before the F33 boss/);
    expect(String(options["leave"]!["why"])).toMatch(/likely unspendable/);
    for (const option of Object.values(options)) {
      expect(typeof option["code_value"]).toBe("number");
      expect(option["why"]).toBeTruthy();
    }
  });
});

describe("(e) the one hard safety: a line that certainly dies is not offered while one survives", () => {
  it("30 HP against 32: ending the turn dies; only surviving lines are options", () => {
    const raw = combatPayload();
    const combat = raw["combat"] as Raw;
    (combat["player"] as Raw)["current_hp"] = 30;
    combat["enemies"] = [{ ...(combat["enemies"] as Raw[])[0]!, intents: [{ index: 0, intent_type: "Attack", label: "32", damage: 32, hits: 1, total_damage: 32 }] }];
    ((raw["run"] as Raw)["potions"] as Raw[])[0]!["can_use"] = false;
    const decision = planCombatTurn(env(raw));
    const lines = decision?.kind === "ask" ? Object.values(questionOf(decision).options).filter((option) => option["plays"] !== undefined && !String(option["plays"]).startsWith("drink")) : [];
    if (decision?.kind === "act") {
      expect(decision.intent.action).not.toBe("end_turn");
      return;
    }
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(String(line["result"])).not.toMatch(/I DIE/);
      expect(String(line["plays"])).not.toBe("nothing (end the turn now)");
    }
  });
});

describe("(f) code still acts alone on a lethal, a single option and a dominated field", () => {
  it("lethal this turn: played without asking", () => {
    const raw = combatPayload({ enemyHp: 5 });
    const combat = raw["combat"] as Raw;
    combat["enemies"] = [(combat["enemies"] as Raw[])[0]!];
    const decision = planCombatTurn(env(raw));
    expect(decision?.kind).toBe("act");
    expect(decision?.label).toBe("combat/lethal");
  });

  it("a single line (every other dominated): played without asking", () => {
    const raw = combatPayload();
    const combat = raw["combat"] as Raw;
    // One Strike and nothing else: "Strike" beats "end turn" on every outcome.
    combat["hand"] = [(combat["hand"] as Raw[])[0]!];
    combat["enemies"] = [{ ...(combat["enemies"] as Raw[])[0]!, intents: [{ index: 0, intent_type: "Buff", label: "" }] }];
    ((raw["run"] as Raw)["potions"] as Raw[])[0]!["can_use"] = false;
    const decision = planCombatTurn(env(raw));
    expect(decision?.kind).toBe("act");
    expect(decision?.label).toBe("combat/plan");
  });

  it("pick screens: one option, or options identical or marked dominated, are acted on", () => {
    const option = (key: string, score: number, label = key, over: Record<string, unknown> = {}) => ({ key, label, score, intent: { action: "choose_rest_option", option_index: Number(key.slice(1)) }, summary: { option: label }, ...over });
    const base = { label: "t", instructions: "?", state: {}, actThreshold: 0.5, strictJev: true };
    expect(buildPickDecision({ ...base, options: [option("o0", 1)] }).kind).toBe("act");
    // Two plain Strikes to remove: the same choice.
    expect(buildPickDecision({ ...base, options: [option("o0", 5, "Strike"), option("o1", 5, "Strike")] }).kind).toBe("act");
    const dominated = buildPickDecision({ ...base, options: [option("o0", 5), option("o1", 9, "o1", { dominatedBy: "o0 gives the same for less" })] });
    expect(dominated.kind === "act" && dominated.intent).toEqual({ action: "choose_rest_option", option_index: 0 });
    // A clear margin alone is no longer code's to act on.
    const margin = buildPickDecision({ ...base, options: [option("o0", 50), option("o1", 1)] });
    expect(margin.kind).toBe("ask");
    expect(referencePick(margin).intent).toEqual({ action: "choose_rest_option", option_index: 0 });
  });
});

/** A minimal hand card for the solver. */
const card = (index: number, cardId: string, over: Partial<CardModel>): CardModel => ({
  index, key: `c${index}`, cardId, name: cardId, type: "Skill", upgraded: false, cost: 1, xCost: false, playable: true, target: "self", validTargets: [],
  damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0,
  draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...over,
});
const worm = { index: 0, name: "Worm", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 30, hits: 1 }] };

describe("Evil Eye doubles only after a card was exhausted this turn, earlier in the line included (Q97B F23 T3)", () => {
  const solve = (exhaustedThisTurn: boolean) =>
    solveTurn({
      hand: [card(0, "EVIL_EYE", { block: 8 }), card(1, "OFFERING_LIKE", { cost: 0, exhausts: true, flatValue: 1 })],
      player: { hp: 60, maxHp: 80, block: 0, energy: 1, weak: false, vulnerable: false, intangible: false, exhaustedThisTurn },
      enemies: [worm],
      fightKind: "monster",
    }).plans;
  const blockOf = (plans: ReturnType<typeof solve>, order: string) => plans.find((plan) => plan.steps.map((step) => step.cardId).join(",") === order)?.outcome.blockGained;

  it("an exhaust earlier in the line doubles it; one after it does not", () => {
    const plans = solve(false);
    expect(blockOf(plans, "OFFERING_LIKE,EVIL_EYE")).toBe(16);
    expect(blockOf(plans, "EVIL_EYE")).toBe(8);
  });

  it("an exhaust before this decision (or Toasty Mittens) doubles it from the first card", () => {
    expect(blockOf(solve(true), "EVIL_EYE")).toBe(16);
  });
});

describe("Glowwater: the hand exhausted, a new hand drawn (logged: 5 -> 10, 3 -> 10)", () => {
  const draw = card(90, "EXPECTED", { type: "Attack", target: "single", validTargets: [0], damage: 6 });

  it("is modelled only with a known pile to draw from", () => {
    expect(modelPotion("GLOWWATER_POTION", "Glowwater", 0, [], 0)).toBeNull();
    expect(modelPotion("GLOWWATER_POTION", "Glowwater", 0, [], 0, { enemyTargets: [0], strength: 0, weak: false, expectedDraw: draw })?.special).toBe("glowwater");
  });

  it("a line drinks it, exhausts the hand and plays the drawn cards", () => {
    const potion = modelPotion("GLOWWATER_POTION", "Glowwater", 0, [], 0, { enemyTargets: [0], strength: 0, weak: false, expectedDraw: draw })!;
    const plans = solveTurn({
      hand: [card(0, "DEFEND", { block: 5, cost: 2 }), potion],
      player: { hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, drawable: 12 },
      enemies: [{ ...worm, hp: 20, attacks: [{ damage: 4, hits: 1 }] }],
      fightKind: "monster",
    }).plans;
    const glow = plans.find((plan) => plan.steps[0]?.cardId.startsWith("POTION:GLOWWATER_POTION"));
    expect(glow).toBeDefined();
    expect(glow!.outcome.cardsDrawn).toBe(10);
    expect(glow!.outcome.damageDealt).toBe(18);
    expect(glow!.steps.some((step) => step.cardId === "DEFEND")).toBe(false);
  });
});

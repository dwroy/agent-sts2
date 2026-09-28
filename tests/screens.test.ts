/**
 * Decision-layer tests: every screen must turn a real-shaped state into either a legal action or an
 * explicit "wait". No game and no network are involved.
 */

import { describe, expect, it } from "vitest";

import { fingerprint, gate } from "../src/act/gate.js";
import type { AnswerSet } from "../src/jev/answers.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import type { Decision, DecisionEnv } from "../src/project/types.js";
import { createScreenMemory } from "../src/project/types.js";
import { planDecision, type PlanOutcome } from "../src/screens/index.js";
import { fightHpCost, nodeWeight, shopWeight, SURVIVAL_WEIGHT } from "../src/screens/map.js";
import { fightSurvival, roomProjectedCost } from "../src/strategy/route-cost.js";
import { rememberMap } from "../src/screens/rest.js";
import { eventOptionScore } from "../src/screens/event.js";
import { questionOf, referencePick } from "./logged.js";
import { loadConfig } from "../src/config.js";
import {
  baseState,
  characterSelectPayload,
  chestPayload,
  combatPayload,
  crystalPayload,
  eventPayload,
  gameOverPayload,
  mainMenuPayload,
  mapPayload,
  modalPayload,
  restPayload,
  rewardCardPayload,
  rewardAfterSkipPayload,
  rewardAfterSkipWithGoldPayload,
  rewardClaimPayload,
  runPayload,
  selectionPayload,
  shopPayload,
  testKnowledge,
} from "./scenarios.js";

const config = loadConfig({} as NodeJS.ProcessEnv);

function env(raw: Record<string, unknown>, overrides: Partial<DecisionEnv> = {}): DecisionEnv {
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
    combatPlanner: "card",
    screenMemory: createScreenMemory(state.screen),
    shopDiscardPotions: ["FOUL_POTION"],
    ...overrides,
  };
}

function plan(raw: Record<string, unknown>, overrides: Partial<DecisionEnv> = {}): PlanOutcome {
  return planDecision(env(raw, overrides));
}

function mustDecision(outcome: PlanOutcome): Decision {
  if (outcome.kind !== "decision") throw new Error(`expected a decision, got ${outcome.kind}: ${outcome.reason}`);
  return outcome.decision;
}

function choiceAnswer(choice: string, confidence = 0.9): AnswerSet {
  return { play: { type: "choice", choice, probabilities: { [choice]: confidence }, confidence, raw: {} } };
}

function pickAnswer(choice: string, confidence = 0.9): AnswerSet {
  return { pick: { type: "choice", choice, probabilities: { [choice]: confidence }, confidence, raw: {} } };
}

describe("combat", () => {
  it("trusts Jev: a low-confidence answer is still the action taken", () => {
    const decision = mustDecision(plan(combatPayload()));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const resolved = decision.resolve(choiceAnswer("c2->e0", 0.12));
    expect(resolved.intent).toEqual({ action: "play_card", card_index: 2, target_index: 0 });
    expect(resolved.fallback).toBe(false);
    expect(resolved.confidence).toBeCloseTo(0.12, 5);
    expect(resolved.reask).toBeUndefined();
  });

  it("trusts Jev: an unusable answer waits instead of choosing in code", () => {
    const decision = mustDecision(plan(combatPayload()));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const resolved = decision.resolve(choiceAnswer("not-an-option", 0.9));
    expect(resolved.intent).toBeNull();
    expect(resolved.fallback).toBe(false);
    expect(resolved.rationale).toContain("trust-jev");
  });

  it("trusts Jev: a lethal end_turn is offered and flagged, and its choice is honoured", () => {
    const raw = combatPayload({ lethalEndTurn: true });
    const decision = mustDecision(plan(raw));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["play"]?.type === "choice" ? decision.questions["play"].criteria : {};
    expect(Object.keys(criteria)).toContain("end_turn");
    expect(String(criteria["end_turn"])).toContain('"lethal":true');
    expect((decision.state["situation"] as Record<string, unknown>)["ending_turn_would_kill_me"]).toBe(true);
    const resolved = decision.resolve(choiceAnswer("end_turn", 0.9));
    expect(resolved.intent).toEqual({ action: "end_turn" });
    expect(resolved.fallback).toBe(false);
  });

  it("shows what each buff/debuff does, not just its name", () => {
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    combat["enemies"] = [
      {
        index: 0,
        enemy_id: "JAW_WORM",
        name: "Jaw Worm",
        current_hp: 42,
        max_hp: 42,
        block: 0,
        is_alive: true,
        is_hittable: true,
        powers: [{ index: 0, power_id: "VULNERABLE", name: "Vulnerable", amount: 2, is_debuff: true }],
        intent: "ATTACK",
        move_id: "ATTACK",
        intents: [{ index: 0, intent_type: "Attack", label: "11", damage: 11, hits: 1, total_damage: 11, status_card_count: null }],
      },
    ];
    const decision = mustDecision(plan(raw));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const enemies = decision.state["enemies"] as { powers: string[] }[];
    expect(enemies[0]?.powers[0]).toContain("Vulnerable 2");
    expect(enemies[0]?.powers[0]).toContain("[debuff]");
    // The description comes from the knowledge cache, so Jev never has to guess what a power does.
    expect(enemies[0]?.powers[0]).toContain("50% more damage");
  });

  it("explains placeholders it cannot render", () => {
    const raw = combatPayload();
    const run = raw["run"] as Record<string, unknown>;
    run["relics"] = [{ index: 0, relic_id: "BURNING_BLOOD", name: "Burning Blood", description: "", stack: null, is_melted: false }];
    const decision = mustDecision(plan(raw));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const brief = decision.state["run_brief"] as Record<string, unknown>;
    expect(brief["relic_effects"]).toEqual(["Burning Blood: At the end of combat, heal 6 HP."]);
    expect(brief["relic_effects_note"]).toBeUndefined();
  });

  it("offers every card × target plus end_turn, with code-computed outcomes", () => {
    const decision = mustDecision(plan(combatPayload()));
    expect(decision.kind).toBe("ask");
    if (decision.kind !== "ask") return;
    const criteria = decision.questions["play"]?.type === "choice" ? decision.questions["play"].criteria : {};
    expect(Object.keys(criteria)).toEqual(["c0->e0", "c0->e1", "c1", "c2->e0", "c2->e1", "p0->e0", "p0->e1", "end_turn"]);
    expect(String(criteria["c0->e0"])).toContain('"kills_target":false');
    expect(String(criteria["c2->e0"])).toContain('"damage":8');
    expect(String(criteria["end_turn"])).toContain('"incoming_damage":17');
    // Hand and enemies are in the state payload, so the model can see the board it is choosing for.
    expect(decision.state["situation"]).toMatchObject({ screen: "COMBAT", enemies_alive: 2, incoming_damage_if_turn_ends: 17 });
  });

  it("resolves a confident answer straight to an action", () => {
    const decision = mustDecision(plan(combatPayload()));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const resolved = decision.resolve(choiceAnswer("c0->e0", 0.82));
    expect(resolved.intent).toEqual({ action: "play_card", card_index: 0, target_index: 0 });
    expect(resolved.fallback).toBe(false);
  });

  it("re-asks on a shortlist when confidence is low, and never a third time", () => {
    const decision = mustDecision(plan(combatPayload(), { strictJev: false }));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const resolved = decision.resolve(choiceAnswer("c0->e0", 0.31));
    expect(resolved.intent).toBeNull();
    expect(resolved.reask).toBeDefined();
    const shortlist = Object.keys(resolved.reask?.criteria ?? {});
    expect(shortlist.length).toBeGreaterThanOrEqual(2);
    expect(shortlist).toContain("c0->e0");
  });

  it("falls back to code when the answer is unusable", () => {
    const decision = mustDecision(plan(combatPayload(), { strictJev: false }));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const resolved = decision.resolve(choiceAnswer("not-an-option", 0.9));
    expect(resolved.fallback).toBe(true);
    expect(resolved.intent).not.toBeNull();
  });

  it("does not burn a potion in the code fallback when the turn is not lethal", () => {
    const decision = mustDecision(plan(combatPayload(), { strictJev: false }));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const resolved = decision.resolve({});
    expect(resolved.fallback).toBe(true);
    expect(resolved.intent?.action).not.toBe("use_potion");
  });

  it("applies the safety floor: end_turn is removed when it would be lethal", () => {
    const decision = mustDecision(plan(combatPayload({ lethalEndTurn: true }), { strictJev: false }));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["play"]?.type === "choice" ? decision.questions["play"].criteria : {};
    expect(Object.keys(criteria)).not.toContain("end_turn");
  });

  it("overrides a lethal end_turn answer even if Jev picked it", () => {
    const raw = combatPayload({ lethalEndTurn: true });
    const decision = mustDecision(plan(raw, { strictJev: false }));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const forced = { ...decision, questions: { ...decision.questions, play: { type: "choice" as const, instructions: "x", criteria: { end_turn: null, "c0->e0": null } } } };
    const resolved = forced.resolve(choiceAnswer("end_turn", 0.99));
    expect(resolved.fallback).toBe(true);
    expect(resolved.intent?.action).toBe("play_card");
  });

  it("ends the turn in code when nothing is playable", () => {
    const decision = mustDecision(plan(combatPayload({ noPlayableCards: true })));
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "end_turn" });
  });

  it("waits while the mod's combat gate is closed", () => {
    const raw = combatPayload();
    (raw["combat"] as Record<string, unknown>)["action_readiness"] = { can_use_combat_actions: false, reason: "game_action_running" };
    const outcome = plan(raw);
    expect(outcome.kind).toBe("wait");
  });
});

describe("map", () => {
  it("trusts Jev on a pick screen too: a 0.2-confidence choice is still taken", () => {
    const decision = mustDecision(plan(mapPayload()));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const resolved = decision.resolve(pickAnswer("n2", 0.2));
    expect(resolved.intent).toEqual({ action: "choose_map_node", option_index: 2 });
    expect(resolved.fallback).toBe(false);
  });

  it("describes each reachable node with a code-computed lookahead", () => {
    // At full HP: under twice an elite's cost the optional Elite is not offered (EN55 F7).
    const raw = mapPayload();
    (raw["run"] as Record<string, unknown>)["current_hp"] = 80;
    const decision = mustDecision(plan(raw));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
    expect(Object.keys(criteria)).toEqual(["n0", "n1", "n2"]);
    expect(String(criteria["n0"])).toContain("Elite");
    expect(String(criteria["n0"])).toContain("likely_continuation");
  });

  it("maps a choice back onto the mod's node index", () => {
    const decision = mustDecision(plan(mapPayload()));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    expect(decision.resolve(pickAnswer("n2")).intent).toEqual({ action: "choose_map_node", option_index: 2 });
  });

  it("values an elite behind a fight at the HP left after that fight (0NG F27)", () => {
    const raw = mapPayload();
    (raw["run"] as Record<string, unknown>)["current_hp"] = 68; // 85%: an elite now would be +4
    const map = raw["map"] as Record<string, unknown>;
    const node = (row: number, col: number, type: string, children: { row: number; col: number }[] = []) => ({ row, col, node_type: type, children });
    map["available_nodes"] = [
      { index: 0, row: 5, col: 1, node_type: "Monster" },
      { index: 1, row: 5, col: 3, node_type: "Monster" },
    ];
    map["nodes"] = [
      node(5, 1, "Monster", [{ row: 6, col: 1 }]),
      node(5, 3, "Monster", [{ row: 6, col: 3 }]),
      node(6, 1, "Elite"),
      node(6, 3, "Monster"),
    ];
    const decision = mustDecision(plan(raw));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
    const value = (key: string): number => JSON.parse(String(criteria[key]))["route_value"];
    // Monster -> Elite: the elite is reached at ~78% (the hallway's median cost), where it is worth 0,
    // not +4; every option pays its chance of death over the same stretch, fight by fight (77QX F18).
    const arrival = 0.85 - roomProjectedCost("Monster", 1);
    const first = fightSurvival(0.85, fightHpCost("Monster", 1));
    expect(value("n0")).toBeCloseTo(1.2 - SURVIVAL_WEIGHT * (1 - first * fightSurvival(arrival, fightHpCost("Elite", 1))));
    expect(value("n1")).toBeCloseTo(2.4 - SURVIVAL_WEIGHT * (1 - first * fightSurvival(arrival, fightHpCost("Monster", 1))));
  });

  it("shop weight grows with gold, keeps the low-gold steps as a floor, +3 late in Act 1 (8LQG 565, G6YV 630 gold)", () => {
    expect(shopWeight(30, 5, 1)).toBe(0.8);
    expect(shopWeight(120, 5, 1)).toBe(2.4);
    expect(shopWeight(360, 5, 1)).toBeCloseTo(7.2);
    expect(shopWeight(577, 5, 1)).toBeCloseTo(11.54);
    expect(shopWeight(900, 5, 1)).toBe(12);
    expect(shopWeight(577, 12, 1)).toBeCloseTo(14.54);
    expect(shopWeight(577, 12, 2)).toBeCloseTo(11.54);
    expect(shopWeight(250, 12, 1)).toBe(5);
    expect(nodeWeight("Shop", 1, 577, 12, 1)).toBeCloseTo(14.54);
  });

  it("G6YV F12: 577 gold at 60% HP, Shop -> Monster -> Elite beats Rest -> Elite -> Monster", () => {
    const raw = mapPayload();
    const run = raw["run"] as Record<string, unknown>;
    run["floor"] = 12;
    run["gold"] = 577;
    run["current_hp"] = 48;
    run["max_hp"] = 80;
    const map = raw["map"] as Record<string, unknown>;
    const node = (row: number, col: number, type: string, children: { row: number; col: number }[] = []) => ({ row, col, node_type: type, children });
    map["available_nodes"] = [
      { index: 0, row: 11, col: 1, node_type: "Shop" },
      { index: 1, row: 11, col: 3, node_type: "RestSite" },
    ];
    map["nodes"] = [
      node(11, 1, "Shop", [{ row: 12, col: 1 }]),
      node(11, 3, "RestSite", [{ row: 12, col: 3 }]),
      node(12, 1, "Monster", [{ row: 13, col: 2 }]),
      node(12, 3, "Elite", [{ row: 13, col: 3 }]),
      node(13, 2, "Elite"),
      node(13, 3, "Monster"),
    ];
    const decision = mustDecision(plan(raw));
    const value = (key: string): number => {
      if (decision.kind !== "ask") return key === "n0" ? 1 : 0;
      const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
      return JSON.parse(String(criteria[key]))["route_value"];
    };
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "choose_map_node", option_index: 0 });
    expect(value("n0")).toBeGreaterThan(value("n1"));
  });

  it("PFBK F18: elites a route cannot avoid after its likely death still count", () => {
    const raw = mapPayload();
    const run = raw["run"] as Record<string, unknown>;
    run["floor"] = 18;
    run["current_hp"] = 76;
    run["max_hp"] = 80;
    run["gold"] = 50;
    const map = raw["map"] as Record<string, unknown>;
    map["current_node"] = { row: 0, col: 3 };
    const node = (row: number, col: number, type: string, children: { row: number; col: number }[] = []) => ({ row, col, node_type: type, children });
    const at = (row: number, col: number) => ({ row, col });
    map["available_nodes"] = [
      { index: 0, row: 1, col: 1, node_type: "Monster" },
      { index: 1, row: 1, col: 5, node_type: "Shop" },
    ];
    map["nodes"] = [
      node(0, 3, "Ancient", [at(1, 1), at(1, 5)]),
      // One elite, then a way round every other one.
      node(1, 1, "Monster", [at(2, 1)]),
      node(2, 1, "Monster", [at(3, 1)]),
      node(3, 1, "Elite", [at(4, 1)]),
      node(4, 1, "Monster", [at(5, 1)]),
      node(5, 1, "RestSite"),
      // Shop, "?", rest and a chest first, then four forced elites with no branch (F25/F27/F29).
      node(1, 5, "Shop", [at(2, 5)]),
      node(2, 5, "Unknown", [at(3, 5)]),
      node(3, 5, "RestSite", [at(4, 5)]),
      node(4, 5, "Treasure", [at(5, 5)]),
      node(5, 5, "Elite", [at(6, 5)]),
      node(6, 5, "Unknown", [at(7, 5)]),
      node(7, 5, "Elite", [at(8, 5)]),
      node(8, 5, "Treasure", [at(9, 5)]),
      node(9, 5, "Elite", [at(10, 5)]),
      node(10, 5, "Unknown", [at(11, 5)]),
      node(11, 5, "Elite", [at(12, 5)]),
      node(12, 5, "RestSite"),
    ];
    const decision = mustDecision(plan(raw));
    const value = (key: string): number => {
      if (decision.kind !== "ask") return key === "n0" ? 1 : 0;
      const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
      return JSON.parse(String(criteria[key]))["route_value"];
    };
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "choose_map_node", option_index: 0 });
    expect(value("n0")).toBeGreaterThan(value("n1"));
  });

  it("RVL2 F26: a forced elite down the line is a likely death at low-HP urgency; a Blood Potion counts as HP", () => {
    const routeValues = (bloodPotion: boolean): Record<string, number> => {
      const raw = mapPayload();
      const run = raw["run"] as Record<string, unknown>;
      run["floor"] = 26;
      run["current_hp"] = 14;
      run["max_hp"] = 74;
      run["gold"] = 60;
      if (bloodPotion) Object.assign((run["potions"] as Record<string, unknown>[])[0]!, { potion_id: "BLOOD_POTION", name: "Blood Potion", occupied: true });
      else (run["potions"] as Record<string, unknown>[])[0]!["occupied"] = false;
      const map = raw["map"] as Record<string, unknown>;
      map["current_node"] = { row: 8, col: 3 };
      const node = (row: number, col: number, type: string, children: { row: number; col: number }[] = []) => ({ row, col, node_type: type, children });
      const at = (row: number, col: number) => ({ row, col });
      map["available_nodes"] = [
        { index: 0, row: 9, col: 2, node_type: "Monster" },
        { index: 2, row: 9, col: 4, node_type: "RestSite" },
      ];
      map["nodes"] = [
        node(8, 3, "Treasure", [at(9, 2), at(9, 4)]),
        // (9,2): no elite on the way to the boss.
        node(9, 2, "Monster", [at(10, 2)]),
        node(10, 2, "RestSite", [at(11, 3)]),
        node(11, 3, "Unknown", [at(12, 4)]),
        node(12, 4, "Unknown", [at(13, 3)]),
        node(13, 3, "Monster", [at(14, 3)]),
        node(14, 3, "RestSite"),
        // (9,4): rest, then one line into a forced elite at F31.
        node(9, 4, "RestSite", [at(10, 5)]),
        node(10, 5, "Unknown", [at(11, 6)]),
        node(11, 6, "Unknown", [at(12, 6)]),
        node(12, 6, "Monster", [at(13, 5)]),
        node(13, 5, "Elite", [at(14, 3)]),
      ];
      const decision = mustDecision(plan(raw));
      if (decision.kind !== "ask") return { n0: decision.intent.option_index === 0 ? 1 : 0, n2: decision.intent.option_index === 2 ? 1 : 0 };
      const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
      return { n0: JSON.parse(String(criteria["n0"]))["route_value"], n2: JSON.parse(String(criteria["n2"]))["route_value"] };
    };
    const withPotion = routeValues(true);
    expect(withPotion.n0).toBeGreaterThan(withPotion.n2);
    // Without it the forced elite still weighs like the Monster now (both likely deaths x3).
    const without = routeValues(false);
    expect(without.n2).toBeLessThan(-30);
  });

  it("RC9A F24: a likely death at the next node ends the route there too (38/80: Elite now vs a later forced elite)", () => {
    const raw = mapPayload();
    const run = raw["run"] as Record<string, unknown>;
    run["floor"] = 24;
    run["current_hp"] = 38;
    run["max_hp"] = 80;
    run["gold"] = 150;
    (run["potions"] as Record<string, unknown>[])[0]!["occupied"] = false;
    const map = raw["map"] as Record<string, unknown>;
    map["current_node"] = { row: 6, col: 5 };
    const node = (row: number, col: number, type: string, children: { row: number; col: number }[] = []) => ({ row, col, node_type: type, children });
    const at = (row: number, col: number) => ({ row, col });
    map["available_nodes"] = [
      { index: 0, row: 7, col: 5, node_type: "Elite" },
      { index: 1, row: 7, col: 6, node_type: "Unknown" },
    ];
    map["nodes"] = [
        node(6, 0, "Unknown", [at(7, 0)]),
        node(6, 2, "Monster", [at(7, 2)]),
        node(6, 4, "Elite", [at(7, 4)]),
        node(6, 5, "RestSite", [at(7, 5), at(7, 6)]),
        node(6, 6, "Unknown", [at(7, 6)]),
        node(7, 0, "Monster", [at(8, 0)]),
        node(7, 2, "Monster", [at(8, 2)]),
        node(7, 4, "Unknown", [at(8, 4)]),
        node(7, 5, "Elite", [at(8, 4)]),
        node(7, 6, "Unknown", [at(8, 6)]),
        node(8, 0, "Treasure", [at(9, 0)]),
        node(8, 2, "Treasure", [at(9, 2)]),
        node(8, 4, "Treasure", [at(9, 4), at(9, 5)]),
        node(8, 6, "Treasure", [at(9, 5), at(9, 6)]),
        node(9, 0, "RestSite", [at(10, 0)]),
        node(9, 2, "Monster", [at(10, 1)]),
        node(9, 4, "RestSite", [at(10, 3)]),
        node(9, 5, "Monster", [at(10, 4), at(10, 6)]),
        node(9, 6, "RestSite", [at(10, 6)]),
        node(10, 0, "Elite", [at(11, 0)]),
        node(10, 1, "Monster", [at(11, 0)]),
        node(10, 3, "Monster", [at(11, 3)]),
        node(10, 4, "Monster", [at(11, 3)]),
        node(10, 6, "Monster", [at(11, 5), at(11, 6)]),
        node(11, 0, "RestSite", [at(12, 0), at(12, 1)]),
        node(11, 3, "RestSite", [at(12, 2)]),
        node(11, 5, "Unknown", [at(12, 4)]),
        node(11, 6, "Elite", [at(12, 6)]),
        node(12, 0, "Monster", [at(13, 0)]),
        node(12, 1, "Elite", [at(13, 2)]),
        node(12, 2, "Unknown", [at(13, 2), at(13, 3)]),
        node(12, 4, "Monster", [at(13, 4)]),
        node(12, 6, "Monster", [at(13, 6)]),
        node(13, 0, "Shop", [at(14, 0)]),
        node(13, 2, "Monster", [at(14, 2)]),
        node(13, 3, "Elite", [at(14, 2)]),
        node(13, 4, "Elite", [at(14, 4)]),
        node(13, 6, "Elite", [at(14, 6)]),
        node(14, 0, "RestSite", [at(15, 3)]),
        node(14, 2, "RestSite", [at(15, 3)]),
        node(14, 4, "RestSite", [at(15, 3)]),
        node(14, 6, "RestSite", [at(15, 3)]),
        node(15, 3, "Boss", []),
    ];
    const decision = mustDecision(plan(raw));
    if (decision.kind === "act") {
      expect(decision.intent).toEqual({ action: "choose_map_node", option_index: 1 });
      return;
    }
    const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
    const value = (key: string): number => JSON.parse(String(criteria[key]))["route_value"];
    expect(value("n1")).toBeGreaterThan(value("n0"));
  });

  it("an optional mid-act elite needs more than 80% HP (UJS25 F24: Swarm Caster at 58/80)", () => {
    expect(nodeWeight("Elite", 0.85, 100, 8)).toBe(4);
    expect(nodeWeight("Elite", 0.8, 100, 8)).toBe(0);
    expect(nodeWeight("Elite", 0.725, 100, 8)).toBe(0);
    expect(nodeWeight("Elite", 0.7, 100, 8)).toBe(-3);
    expect(nodeWeight("Elite", 0.6, 100, 5)).toBe(-3);
    // Early floors and the pre-boss elite keep their rules.
    expect(nodeWeight("Elite", 1, 100, 4)).toBe(-3);
    expect(nodeWeight("Elite", 0.85, 100, 12)).toBe(4);
    expect(nodeWeight("Elite", 0.75, 100, 12)).toBe(-3);
    // From act 2 the pre-boss elite needs full HP (UMX6 F31: Decimillipede at 67/80).
    expect(nodeWeight("Elite", 0.84, 100, 14, 2)).toBe(-5);
    expect(nodeWeight("Elite", 0.96, 100, 14, 2)).toBe(1);
  });

  it("below half HP a shop is worth no more than a rest (2VW5 F26/F27: 698 gold, died at F28)", () => {
    expect(nodeWeight("Shop", 0.42, 698, 10, 2)).toBeLessThanOrEqual(nodeWeight("RestSite", 0.42, 698, 10, 2));
    expect(nodeWeight("Shop", 0.8, 698, 10, 2)).toBe(12);
  });

  it("Act 3 at 40% HP: Monster -> Rest beats Monster -> Monster -> Monster (MD3F F34-F39)", () => {
    const raw = mapPayload();
    const run = raw["run"] as Record<string, unknown>;
    run["floor"] = 38; // Act 3
    run["current_hp"] = 32; // 40% of 80
    const map = raw["map"] as Record<string, unknown>;
    const node = (row: number, col: number, type: string, children: { row: number; col: number }[] = []) => ({ row, col, node_type: type, children });
    map["available_nodes"] = [
      { index: 0, row: 5, col: 1, node_type: "Monster" },
      { index: 1, row: 5, col: 3, node_type: "Monster" },
    ];
    map["nodes"] = [
      node(5, 1, "Monster", [{ row: 6, col: 1 }]),
      node(5, 3, "Monster", [{ row: 6, col: 3 }]),
      node(6, 1, "RestSite"),
      node(6, 3, "Monster", [{ row: 7, col: 3 }]),
      node(7, 3, "Monster"),
    ];
    const decision = mustDecision(plan(raw));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
    const value = (key: string): number => JSON.parse(String(criteria[key]))["route_value"];
    expect(value("n0")).toBeGreaterThan(value("n1"));
    // Fights reached below 35% HP are a cost, not +1.2 each.
    expect(value("n1")).toBeLessThan(0);
  });

  it("avoids a 3rd+ hallway fight in a row when the fork had a rest (QE4K/XJWF F18, MD3F F34)", () => {
    const raw = mapPayload();
    const run = raw["run"] as Record<string, unknown>;
    run["floor"] = 18; // Act 2, full HP
    run["current_hp"] = run["max_hp"];
    const map = raw["map"] as Record<string, unknown>;
    const node = (row: number, col: number, type: string, children: { row: number; col: number }[] = []) => ({ row, col, node_type: type, children });
    map["current_node"] = { row: 0, col: 3 };
    map["available_nodes"] = [
      { index: 0, row: 1, col: 1, node_type: "Monster" },
      { index: 1, row: 1, col: 5, node_type: "Monster" },
    ];
    map["nodes"] = [
      { ...node(0, 3, "Ancient", [{ row: 1, col: 1 }, { row: 1, col: 5 }]), visited: true },
      node(1, 1, "Monster", [{ row: 2, col: 1 }]),
      node(2, 1, "Monster", [{ row: 3, col: 1 }]),
      node(3, 1, "Monster", [{ row: 4, col: 1 }]),
      node(4, 1, "Monster"),
      node(1, 5, "Monster", [{ row: 2, col: 5 }]),
      node(2, 5, "RestSite", [{ row: 3, col: 5 }]),
      node(3, 5, "Monster", [{ row: 4, col: 5 }]),
      node(4, 5, "Monster"),
    ];
    const decision = mustDecision(plan(raw));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
    const value = (key: string): number => JSON.parse(String(criteria[key]))["route_value"];
    // Four fights (4 x 1.2) used to edge out fight -> rest -> fight -> fight (4.6).
    expect(value("n1")).toBeGreaterThan(value("n0"));
  });

  it("counts fights already walked into the chain", () => {
    const raw = mapPayload();
    const map = raw["map"] as Record<string, unknown>;
    const nodes = map["nodes"] as Record<string, unknown>[];
    // Current Monster (4,2) came from a visited Monster (3,2): the next Monster is the 3rd in a row.
    nodes[0]!["parents"] = [{ row: 3, col: 2 }];
    nodes.push({ row: 3, col: 2, node_type: "Monster", visited: true, parents: [], children: [{ row: 4, col: 2 }] });
    const valueOf = (payload: typeof raw): number => {
      const decision = mustDecision(plan(payload));
      if (decision.kind !== "ask") throw new Error("expected an ask");
      const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
      return JSON.parse(String(criteria["n1"]))["route_value"];
    };
    expect(valueOf(raw)).toBeLessThan(valueOf(mapPayload()) - 1.4);
  });

  it("charges the fight-chain penalty from the 3rd fight, more below 60% HP", async () => {
    const { fightChainPenalty } = await import("../src/screens/map.js");
    expect(fightChainPenalty(1, 0.9)).toBe(0);
    expect(fightChainPenalty(2, 0.9)).toBe(1.5);
    expect(fightChainPenalty(4, 0.3)).toBe(3);
    expect(fightChainPenalty(2, 0.45)).toBeCloseTo(2.25);
  });

  it("scales hallway HP cost by act and Monster weight by HP on arrival", async () => {
    const { fightHpCost, monsterWeight } = await import("../src/screens/map.js");
    // The p75 of logged A8 losses (route-cost.ts): dearer each act, an elite dearer than a hallway.
    const hallways = [1, 2, 3].map((act) => fightHpCost("Monster", act));
    expect(hallways[0]).toBeLessThan(hallways[1]!);
    expect(hallways[1]).toBeLessThan(hallways[2]!);
    for (const act of [1, 2, 3]) expect(fightHpCost("Elite", act)).toBeGreaterThan(2 * fightHpCost("Monster", act));
    expect(monsterWeight(0.8)).toBe(1.2);
    expect(monsterWeight(0.35)).toBeCloseTo(0);
    expect(monsterWeight(0.2)).toBeLessThan(0);
  });

  it("waits when a vote is already recorded", () => {
    const raw = mapPayload();
    (raw["map"] as Record<string, unknown>)["local_vote"] = { row: 5, col: 3 };
    expect(plan(raw).kind).toBe("wait");
  });
});

describe("reward", () => {
  it("asks about the card reward and always offers skipping", () => {
    const decision = mustDecision(plan(rewardCardPayload()));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
    expect(Object.keys(criteria)).toEqual(["card0", "card1", "card2", "skip"]);
    expect(decision.resolve(pickAnswer("skip")).intent).toEqual({ action: "skip_reward_cards" });
  });

  it("offers below the skip bar are still shown to Jev, and the skip says they are under it (0NG Act 2)", () => {
    const raw = rewardCardPayload();
    const reward = raw["reward"] as Record<string, unknown>;
    reward["card_options"] = [
      { index: 0, card_id: "HAVOC", name: "Havoc", upgraded: false, rules_text: "", resolved_rules_text: "", dynamic_values: [] },
      { index: 1, card_id: "TANK", name: "Tank", upgraded: false, rules_text: "", resolved_rules_text: "", dynamic_values: [] },
    ];
    const decision = mustDecision(plan(raw, { combatPlanner: "turn" }));
    expect(decision.kind).toBe("ask");
    if (decision.kind !== "ask") return;
    const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
    expect(Object.keys(criteria)).toEqual(["card0", "card1", "skip"]);
    const skip = JSON.parse(criteria["skip"]!) as Record<string, unknown>;
    expect(skip["code_rank"]).toBe(1);
    expect(String(skip["why"])).toMatch(/^the skip bar: a card code values under 50 makes the deck worse \(under it: Havoc .*, Tank .*\)$/);
  });

  it("claims non-card rewards in code", () => {
    const decision = mustDecision(plan(rewardClaimPayload()));
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "claim_reward", option_index: 0 });
  });

  it("advances with the action the mod actually advertises once rewards are done", () => {
    // Live finding: the reward screen advertises `collect_rewards_and_proceed`, not `proceed`.
    const raw = baseState("REWARD", {
      available_actions: ["save_and_quit", "resolve_rewards", "collect_rewards_and_proceed"],
      reward: { pending_card_choice: false, can_proceed: true, rewards: [], card_options: [], alternatives: [] },
    });
    const decision = mustDecision(plan(raw));
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "collect_rewards_and_proceed" });
  });

  it("does not re-claim a card reward it already skipped", () => {
    // Live finding: skip_reward_cards leaves the card reward claimable, so the planner claimed it
    // again, reopened the card choice, and skipped again — forever.
    const decision = mustDecision(
      plan(rewardAfterSkipPayload(), {
        screenMemory: { ...createScreenMemory("REWARD"), cardRewardSkipped: true },
      }),
    );
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent.action).toBe("collect_rewards_and_proceed");
  });

  it("still collects the other rewards after skipping the card one", () => {
    const decision = mustDecision(
      plan(rewardAfterSkipWithGoldPayload(), {
        screenMemory: { ...createScreenMemory("REWARD"), cardRewardSkipped: true },
      }),
    );
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "claim_reward", option_index: 0 });
  });

  it("falls back to resolve_rewards when that is the only way forward", () => {
    const raw = baseState("REWARD", {
      available_actions: ["save_and_quit", "resolve_rewards"],
      reward: { pending_card_choice: false, can_proceed: true, rewards: [], card_options: [], alternatives: [] },
    });
    const decision = mustDecision(plan(raw));
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "resolve_rewards" });
  });

  it("skips a pending card choice that offers nothing", () => {
    const raw = baseState("REWARD", {
      available_actions: ["skip_reward_cards"],
      reward: { pending_card_choice: true, can_proceed: false, rewards: [], card_options: [], alternatives: [] },
    });
    const decision = mustDecision(plan(raw));
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "skip_reward_cards" });
  });
});

describe("card selection", () => {
  it("offers only cards that can be upgraded", () => {
    const decision = mustDecision(plan(selectionPayload()));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
    // card 1 is already upgraded and must not be offered
    expect(Object.keys(criteria)).toEqual(["card0", "card2"]);
  });

  it("confirms once the minimum selection is reached", () => {
    const decision = mustDecision(plan(selectionPayload(1)));
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "confirm_selection" });
  });
});

describe("shop", () => {
  it("opens the inventory first", () => {
    const decision = mustDecision(plan(shopPayload(false)));
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "open_shop_inventory" });
  });

  it("only offers affordable items, plus removal and leaving", () => {
    const decision = mustDecision(plan(shopPayload(true)));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
    expect(Object.keys(criteria).sort()).toEqual(["buy_card0", "buy_relic0", "leave", "remove"]);
    expect(decision.resolve(pickAnswer("leave")).intent).toEqual({ action: "close_shop_inventory" });
  });

  it("opens the inventory on arrival, even with nothing affordable", () => {
    const decision = mustDecision(plan(shopPayload(false, { broke: true })));
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "open_shop_inventory" });
  });

  it("proceeds to the map instead of re-opening once the visit is done", () => {
    // Live finding: the loop flapped open -> close -> open because affordable stock still existed
    // after the decision to leave. The per-visit flag is what breaks that cycle.
    const decision = mustDecision(
      plan(shopPayload(false), { screenMemory: { ...createScreenMemory("SHOP"), shopOpened: true } }),
    );
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "proceed" });
  });

  it("discards the junk potion before opening the shop", () => {
    const decision = mustDecision(plan(shopPayload(false, { foulPotion: true })));
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "discard_potion", option_index: 0 });
  });

  it("does not discard anything once the shop visit has been opened", () => {
    const decision = mustDecision(
      plan(shopPayload(false, { foulPotion: true }), {
        screenMemory: { ...createScreenMemory("SHOP"), shopOpened: true },
      }),
    );
    if (decision.kind === "act") expect(decision.intent.action).not.toBe("discard_potion");
  });

  it("shows card energy cost and type, and keeps a potion in view with an empty slot (B98P F15, CWU9 F31)", () => {
    const raw = shopPayload(true);
    const shop = raw["shop"] as Record<string, unknown>;
    const relic = (index: number, id: string) => ({ index, name: id, price: 150, is_stocked: true, enough_gold: true, relic_id: id, rarity: "Common" });
    shop["relics"] = [relic(0, "VAJRA"), relic(1, "ANCHOR"), relic(2, "LANTERN"), relic(3, "BAG_OF_MARBLES"), relic(4, "ODDLY_SMOOTH_STONE"), relic(5, "BRONZE_SCALES")];
    shop["potions"] = [{ index: 0, potion_id: "BLOOD_POTION", name: "Blood Potion", rarity: "Common", usage: "CombatOnly", price: 49, is_stocked: true, enough_gold: true }];
    (raw["run"] as Record<string, unknown>)["gold"] = 900;
    const decision = mustDecision(plan(raw, { combatPlanner: "turn" }));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
    expect(Object.keys(criteria)).toContain("buy_potion0");
    const pommel = Object.values(criteria).map((text) => JSON.parse(String(text))).find((entry) => entry["buy"] === "Pommel Strike");
    expect(pommel).toMatchObject({ cost: 1, type: "Attack" });
  });

  it("closes an open inventory with nothing affordable", () => {
    const decision = mustDecision(plan(shopPayload(true, { broke: true })));
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "close_shop_inventory" });
  });
});

describe("event", () => {
  it("filters locked and lethal options", () => {
    const decision = mustDecision(plan(eventPayload()));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
    // option 1 is locked, option 2 would kill the player
    expect(Object.keys(criteria)).toEqual(["o0", "o3"]);
  });
  const hpEvent = (hp: number, maxHp: number, options: [string, string][], floor = 14) => ({
    ...eventPayload(),
    run: runPayload({ floor, current_hp: hp, max_hp: maxHp }),
    event: {
      event_id: "TEST_EVENT", title: "Test", description: "", is_finished: false,
      options: options.map(([title, description], index) => ({ index, text_key: title, title, description, is_locked: false, is_proceed: false, will_kill_player: false, has_relic_preview: false })),
    },
  });
  const shown = (decision: Decision): string[] =>
    decision.kind === "ask" && decision.questions["pick"]?.type === "choice" ? Object.keys(decision.questions["pick"].criteria) : [];
  /** The options code cautions about (hp_caution: it used to remove them). */
  const cautioned = (decision: Decision): string[] =>
    decision.kind === "ask" && decision.questions["pick"]?.type === "choice"
      ? Object.entries(decision.questions["pick"].criteria).filter(([, text]) => JSON.parse(text!)["hp_caution"] !== undefined).map(([key]) => key)
      : [];
  const cautionOf = (decision: Decision, key: string): string =>
    decision.kind === "ask" && decision.questions["pick"]?.type === "choice" ? String(JSON.parse(decision.questions["pick"].criteria[key]!)["hp_caution"] ?? "") : "";
  const mapBefore = (childType: string) => {
    const memory = createScreenMemory("EVENT");
    rememberMap(memory, parseGameState(baseState("MAP", {
      run: runPayload({ floor: 13 }),
      map: {
        nodes: [
          { row: 12, col: 0, node_type: "Unknown", children: [{ row: 13, col: 0 }] },
          { row: 13, col: 0, node_type: childType, children: [] },
          { row: 12, col: 2, node_type: "Monster", children: [] },
        ],
        available_nodes: [{ index: 0, row: 12, col: 0, node_type: "Unknown" }, { index: 1, row: 12, col: 2, node_type: "Monster" }],
      },
    })));
    return memory;
  };

  it("names what a relic in the option does (EJXC F13: Chosen Cheese guessed as Strength)", () => {
    const decision = mustDecision(plan(hpEvent(72, 80, [["Cheese", "失去[red]4[/red]点生命，获得[gold]天选芝士[/gold]。"], ["Cards", "获得两张普通牌。"]])));
    const text = JSON.stringify(decision.kind === "ask" ? decision.questions : decision);
    expect(text).toMatch(/relic_notes[^\]]*max HP at the end of every combat/);
    expect(text.match(/relic_notes/g)?.length ?? 0).toBe(1);
  });

  it("HP caution: an 8+ max-HP cost is offered with the caution (1K5G F8: -13 max HP for Fresnel Lens)", () => {
    const decision = mustDecision(plan(hpEvent(60, 80, [["Bottle", "获得一瓶[aqua]发光水[/aqua]。"], ["Climb", "获得[gold]菲涅耳透镜[/gold]。失去[red]13[/red]点最大生命。"]])));
    expect(shown(decision)).toEqual(["o0", "o1"]);
    expect(cautionOf(decision, "o1")).toBe("costs 13 max HP");
  });

  it("HP caution: HP paid right before a forced elite (XPA4 F14: -8 HP, then -17 at the elite), or below half HP", () => {
    const options: [string, string][] = [["Relic", "失去8点生命。获得一件被遗忘的旧日遗物。"], ["Potion", "获得1瓶随机药水。"], ["Leave", "离开。"]];
    const forced = mustDecision(plan(hpEvent(62, 80, options), { screenMemory: mapBefore("Elite") }));
    expect(shown(forced)).toEqual(["o0", "o1", "o2"]);
    expect(cautioned(forced)).toEqual(["o0"]);
    expect(cautionOf(forced, "o0")).toMatch(/costs HP right before a forced Elite/);
    expect(cautioned(mustDecision(plan(hpEvent(62, 80, options), { screenMemory: mapBefore("Monster") })))).toEqual([]);
    // 45 - 8 = 37 < 40.
    expect(cautionOf(mustDecision(plan(hpEvent(45, 80, options))), "o0")).toBe("leaves 37/80 HP (below half)");
  });

  it("HP guard: a forced Elite within 3 nodes on every path, no rest or shop before it, counts as forced (NZR7 F4: -18 HP, Monster, Monster, Elite)", () => {
    const options: [string, string][] = [["Alone", "获得150金币。失去18点生命。"], ["Together", "获得51金币。"]];
    const chain = (types: string[], branch?: string) => {
      const memory = createScreenMemory("EVENT");
      const nodes: Record<string, unknown>[] = [{ row: 12, col: 0, node_type: "Unknown", children: [{ row: 13, col: 0 }] }];
      types.forEach((type, index) => {
        const children = index + 1 < types.length ? [{ row: 14 + index, col: 0 }] : [];
        if (index === 0 && branch) children.push({ row: 14, col: 1 });
        nodes.push({ row: 13 + index, col: 0, node_type: type, children });
      });
      if (branch) nodes.push({ row: 14, col: 1, node_type: branch, children: [] });
      rememberMap(memory, parseGameState(baseState("MAP", {
        run: runPayload({ floor: 13 }),
        map: { nodes, available_nodes: [{ index: 0, row: 12, col: 0, node_type: "Unknown" }] },
      })));
      return memory;
    };
    const at = (memory: ReturnType<typeof chain>) => cautioned(mustDecision(plan(hpEvent(62, 80, options), { screenMemory: memory })));
    const guarded = mustDecision(plan(hpEvent(62, 80, options), { screenMemory: chain(["Monster", "Monster", "Elite"]) }));
    expect(shown(guarded)).toEqual(["o0", "o1"]);
    expect(cautionOf(guarded, "o0")).toMatch(/forced Elite within 3 nodes/);
    // A rest site before the Elite, the Elite 4 nodes out, or a branch that avoids it: no caution.
    expect(at(chain(["Monster", "RestSite", "Elite"]))).toEqual([]);
    expect(at(chain(["Monster", "Monster", "Monster", "Elite"]))).toEqual([]);
    expect(at(chain(["Monster", "Monster", "Elite"], "Unknown"))).toEqual([]);
  });

  it("HP caution: on Act 1 floors 1-3 an HP cost of 20%+ of max HP (6A36 F1: Loose Shears -16 at 64/80)", () => {
    const options: [string, string][] = [
      ["Oyster", "获得[blue]11[/blue]点最大生命值。"],
      ["Holster", "获得[blue]1[/blue]个药水栏位并获得[blue]2[/blue]瓶随机[gold]药水[/gold]。"],
      ["Shears", "从你的[gold]牌组[/gold]中移除[blue]2[/blue]张牌，然后失去[red]16[/red]点生命。"],
    ];
    // 64 - 16 = 48 is above half: only the early-floor rule cautions it.
    expect(cautioned(mustDecision(plan(hpEvent(64, 80, options, 1))))).toEqual(["o2"]);
    expect(cautioned(mustDecision(plan(hpEvent(64, 80, options, 14))))).toEqual([]);
    // 15 of 80 is under 20%: no caution on floor 2.
    const smaller: [string, string][] = [options[0]!, ["Mushroom", "失去[red]15[/red]点生命，然后随机[gold]升级[/gold][blue]2[/blue]张牌。"]];
    expect(cautioned(mustDecision(plan(hpEvent(64, 80, [...smaller, options[1]!], 2))))).toEqual([]);
  });

  it("keeping the Lantern Key below 80% HP carries the elite-fight caution; Jev decides (X8HF F21 55/80 -> 5; ZWX5 F28; 4V5T F23)", () => {
    const lantern = (hp: number) => ({
      ...hpEvent(hp, 80, []),
      event: {
        event_id: "THE_LANTERN_KEY", title: "灯火钥匙", description: "", is_finished: false,
        options: [
          { index: 0, text_key: "THE_LANTERN_KEY.pages.INITIAL.options.RETURN_THE_KEY", title: "交还钥匙", description: "获得[blue]100[/blue][gold]金币[/gold]。", is_locked: false, is_proceed: false, will_kill_player: false, has_relic_preview: false },
          { index: 1, text_key: "THE_LANTERN_KEY.pages.INITIAL.options.KEEP_THE_KEY", title: "留下钥匙", description: "战斗来取得钥匙。", is_locked: false, is_proceed: false, will_kill_player: false, has_relic_preview: false },
        ],
      },
    });
    const low = mustDecision(plan(lantern(55)));
    expect(shown(low)).toEqual(["o0", "o1"]);
    expect(cautionOf(low, "o1")).toMatch(/Mysterious Knight/);
    // 64/80 is exactly 80%: no caution.
    expect(cautioned(mustDecision(plan(lantern(64))))).toEqual([]);
  });

  it("HP guard: nothing is removed when every option costs HP", () => {
    const decision = mustDecision(plan(hpEvent(30, 80, [["A", "失去5点生命。获得65金币。"], ["B", "变化你的1张打击和1张防御，然后失去12点最大生命。"]])));
    expect(shown(decision)).toEqual(["o0", "o1"]);
  });
});

describe("event fallback scores (90JG, BUUY, 7048, WYF0, YNMB)", () => {
  const at = (hp: number, maxHp: number, forced = false) => ({ hp, maxHp, forced });
  it("no longer ties every option at 0: the fallback takes the best one, not option 0", () => {
    // 7048 F8 Abyssal Baths at 49/82 before a forced elite: +2 max HP and -3 HP vs heal 10.
    const baths = eventOptionScore("获得[blue]2[/blue]点最大生命。失去[red]3[/red]点生命。", at(49, 82, true));
    const leave = eventOptionScore("回复[blue]10[/blue]点生命。", at(49, 82, true));
    expect(leave).toBeGreaterThan(baths);
    // 90JG F9: an unplayable card vs -8 HP for a potion at 53/80.
    expect(eventOptionScore("获得[gold]藏宝图[/gold]，一张不能被打出的牌。", at(53, 80))).toBeLessThan(eventOptionScore("失去8点生命。获得1瓶随机药水。", at(53, 80)));
    // YNMB F1: Lava Rock pays only on a boss kill; Lost Coffer is a card reward and a potion.
    expect(eventOptionScore("第一阶段的Boss敌人额外掉落2件遗物。", at(80, 80))).toBeLessThan(eventOptionScore("获得1次卡牌奖励和1瓶随机药水。", at(80, 80)));
    // A potion slot beats a relic-less nothing; removal and upgrade are worth something.
    expect(eventOptionScore("获得1个药水栏位并获得2瓶随机药水。", at(60, 80))).toBeGreaterThan(8);
    expect(eventOptionScore("从你的牌组中移除1张牌。", at(60, 80))).toBeGreaterThan(0);
  });

  it("a removal naming a valued deck card scores below a small HP cost (WYF0 F27: Slippery Bridge took Demon Form+)", () => {
    const ctx = { ...at(63, 80), deck: [{ name: "恶魔形态+", valued: true }, { name: "打击", valued: false }] };
    expect(eventOptionScore("恶魔形态+将从你的牌组中被移除。", ctx)).toBeLessThan(eventOptionScore("失去3点生命，重新随机要删的牌。", ctx));
  });

  it("the fallback of a real event ask picks the best-scored option", () => {
    const raw = {
      ...eventPayload(),
      run: runPayload({ floor: 9, current_hp: 53, max_hp: 80 }),
      event: {
        event_id: "TEST_EVENT", title: "Test", description: "", is_finished: false,
        options: [
          { index: 0, text_key: "MAP", title: "Map", description: "获得藏宝图，一张不能被打出的牌。", is_locked: false, is_proceed: false, will_kill_player: false, has_relic_preview: false },
          { index: 1, text_key: "POTION", title: "Potion", description: "获得1瓶随机药水。", is_locked: false, is_proceed: false, will_kill_player: false, has_relic_preview: false },
        ],
      },
    };
    const decision = mustDecision(plan(raw, { strictJev: false }));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    expect(decision.resolve({}).intent).toEqual({ action: "choose_event_option", option_index: 1 });
  });
});

describe("stale event end page (YNMB F4/F7, X226 F6)", () => {
  const frame = (eventId: string, floor: number, finished: boolean) => ({
    ...eventPayload(),
    run: runPayload({ floor }),
    event: {
      event_id: eventId, title: eventId, description: "", is_finished: finished,
      options: finished
        ? [{ index: 0, text_key: "PROCEED", title: "Proceed", description: "", is_locked: false, is_proceed: true, will_kill_player: false, has_relic_preview: false }]
        : [
            { index: 0, text_key: "A", title: "A", description: "失去18点生命。获得152金币。", is_locked: false, is_proceed: false, will_kill_player: false, has_relic_preview: false },
            { index: 1, text_key: "B", title: "B", description: "离开。", is_locked: false, is_proceed: false, will_kill_player: false, has_relic_preview: false },
          ],
    },
  });
  it("waits out the last floor's end page instead of clicking option 0 of the next event", () => {
    const memory = createScreenMemory("EVENT");
    const leave = mustDecision(plan(frame("SELF_HELP_BOOK", 3, true), { screenMemory: memory }));
    expect(leave.kind === "act" && leave.label).toBe("event/leave");
    // Floor 4, the same end page still shown: wait.
    expect(plan(frame("SELF_HELP_BOOK", 4, true), { screenMemory: memory }).kind).toBe("wait");
    // The new event arrives: chosen normally.
    expect(plan(frame("JUNGLE_MAZE_ADVENTURE", 4, false), { screenMemory: memory }).kind).toBe("decision");
    // The same end page on the same floor (a page reload) is still left as before.
    const again = createScreenMemory("EVENT");
    mustDecision(plan(frame("SELF_HELP_BOOK", 3, true), { screenMemory: again }));
    expect(mustDecision(plan(frame("SELF_HELP_BOOK", 3, true), { screenMemory: again })).kind).toBe("act");
  });
});

describe("rest", () => {
  it("offers only enabled options", () => {
    const decision = mustDecision(plan(restPayload()));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
    expect(Object.keys(criteria)).toEqual(["o0", "o1"]);
    expect(decision.resolve(pickAnswer("o1")).intent).toEqual({ action: "choose_rest_option", option_index: 1 });
  });

  it("ranks heal first before a forced elite like before a boss, and asks Jev (G8AQ F24: 49/80, the only exit was an Elite)", () => {
    const raw = { ...restPayload(), run: runPayload({ floor: 24, current_hp: 49, max_hp: 80 }) };
    const map = (childType: string) => {
      const memory = createScreenMemory("REST");
      rememberMap(memory, parseGameState(baseState("MAP", {
        run: runPayload({ floor: 23 }),
        map: {
          nodes: [
            { row: 5, col: 0, node_type: "Monster", children: [{ row: 6, col: 1 }] },
            { row: 6, col: 1, node_type: "RestSite", children: [{ row: 7, col: 2 }] },
            { row: 7, col: 2, node_type: childType, children: [] },
          ],
          available_nodes: [{ index: 0, row: 6, col: 1, node_type: "RestSite" }],
        },
      })));
      return memory;
    };
    const forced = mustDecision(plan(raw, { combatPlanner: "turn", screenMemory: map("Elite") }));
    expect(forced.kind).toBe("ask");
    expect(referencePick(forced).intent).toEqual({ action: "choose_rest_option", option_index: 0 });
    expect(JSON.stringify(forced.kind === "ask" ? forced.questions : null)).toMatch(/boss or forced elite next/);
    // A Monster next: 61% is not low enough to heal outright, the model is asked.
    expect(mustDecision(plan(raw, { combatPlanner: "turn", screenMemory: map("Monster") })).kind).toBe("ask");
    // A map from another floor (stale memory) says nothing.
    const stale = map("Elite");
    stale.lastMap!.floor = 20;
    expect(mustDecision(plan(raw, { combatPlanner: "turn", screenMemory: stale })).kind).toBe("ask");
  });
});

describe("rest before the boss with Pantograph (UP1C F16: healed 60 -> 80, Pantograph's 25 would have done it)", () => {
  it("code's reference smiths at 60/80 on F16 with Pantograph, heals without it", () => {
    const pick = (relics: string[]) => {
      const raw = { ...restPayload(), run: runPayload({ floor: 16, current_hp: 60, max_hp: 80, relics: relics.map((id, index) => ({ index, relic_id: id, name: id, description: "", stack: null, is_melted: false })) }) };
      const decision = mustDecision(plan(raw, { combatPlanner: "turn" }));
      expect(decision.kind).toBe("ask");
      return referencePick(decision).intent?.option_index === 0 ? "HEAL" : "SMITH";
    };
    expect(pick(["BURNING_BLOOD"])).toBe("HEAL");
    expect(pick(["BURNING_BLOOD", "PANTOGRAPH"])).toBe("SMITH");
  });
});

describe("event card add uses the reward valuation (UP1C F3: Shrug It Off 106 vs Inflame 104)", () => {
  it("a card DeepSeek's needs ask for says so next to code_value and why (no bonus)", () => {
    const card = (index: number, cardId: string, name: string, type: string) => ({
      index, selected: false, card_id: cardId, name, upgraded: false, card_type: type, rarity: "Uncommon", costs_x: false, star_costs_x: false,
      energy_cost: 1, star_cost: 0, rules_text: "", resolved_rules_text: "", dynamic_values: [],
    });
    const raw = baseState("CARD_SELECTION", {
      available_actions: ["select_deck_card"],
      selection: { kind: "deck_card_select", prompt: "选择一张牌加入你的牌组。", min_select: 1, max_select: 1, selected_count: 0, can_confirm: false, cards: [card(0, "SHRUG_IT_OFF", "Shrug It Off", "Skill"), card(1, "INFLAME", "Inflame", "Power")] },
    });
    // UP1C's deck had no Strength card.
    const run = raw["run"] as Record<string, unknown>;
    run["deck"] = (run["deck"] as Record<string, unknown>[]).filter((entry) => entry["card_id"] !== "INFLAME");
    const memory = createScreenMemory("CARD_SELECTION");
    memory.runPlan = { runId: String(raw["run_id"] ?? ""), want: ["SHRUG_IT_OFF", "INFLAME"], avoid: [], remove: [], needs: ["strength"], avoidRoles: [], blockTarget: null } as never;
    const decision = mustDecision(plan(raw, { screenMemory: memory }));
    if (decision.kind === "act") {
      expect(decision.intent).toEqual({ action: "select_deck_card", option_index: 1 });
      return;
    }
    const criteria = (decision.questions["pick"] as { criteria: Record<string, string> }).criteria;
    const value = (key: string) => JSON.parse(criteria[key]!)["code_value"] as number;
    expect(typeof value("card0")).toBe("number");
    expect(typeof value("card1")).toBe("number");
    expect(JSON.parse(criteria["card1"]!)["deepseek_plan"]).toMatch(/DeepSeek plan wants this card \(want #2\); fills DeepSeek's need strength \(deck has 0\)/);
    expect(JSON.parse(criteria["card0"]!)["deepseek_plan"]).toMatch(/want #1/);
  });
});

describe("in-combat selections", () => {
  const selectCard = (index: number, cardId: string, name: string, type: string, cost: number, text: string, dynamic: { name: string; value: number }[] = []) => ({
    index, selected: false, card_id: cardId, name, upgraded: false, card_type: type, rarity: "Common", costs_x: false, star_costs_x: false,
    energy_cost: cost, star_cost: 0, rules_text: text, resolved_rules_text: text,
    dynamic_values: dynamic.map((entry) => ({ name: entry.name, base_value: entry.value, current_value: entry.value, enchanted_value: entry.value, is_modified: false, was_just_upgraded: false })),
  });
  const combatSelection = (kind: string, prompt: string, cards: unknown[], combat: { hp: number; maxHp: number; enemyHp: number; enemyMaxHp: number; turn: number }) =>
    baseState("CARD_SELECTION", {
      in_combat: true,
      turn: combat.turn,
      available_actions: ["select_deck_card"],
      combat: {
        player: { current_hp: combat.hp, max_hp: combat.maxHp, block: 0, energy: 3, powers: [] },
        enemies: [{ index: 0, enemy_id: "KNOWLEDGE_DEMON", name: "Knowledge Demon", current_hp: combat.enemyHp, max_hp: combat.enemyMaxHp, block: 0, is_alive: true, powers: [], intents: [] }],
        hand: [],
      },
      selection: { kind, prompt, min_select: 1, max_select: 1, selected_count: 0, requires_confirmation: false, can_confirm: false, cards },
    });

  it("Touch of Insanity makes the most expensive card free (G8AQ T4: the model picked a 1-cost Twin Strike)", () => {
    const cards = [
      selectCard(0, "TWIN_STRIKE", "Twin Strike", "Attack", 1, "Deal 5 damage twice.", [{ name: "Damage", value: 5 }]),
      selectCard(1, "BLUDGEON", "Bludgeon+", "Attack", 3, "Deal 44 damage.", [{ name: "Damage", value: 44 }]),
      selectCard(2, "PYRE", "Pyre", "Power", 2, "Gain 1 energy at the start of your turn."),
    ];
    const decision = mustDecision(plan(combatSelection("combat_hand_select", "[center]选择一张牌使其免费。[/center]", cards, { hp: 30, maxHp: 80, enemyHp: 74, enemyMaxHp: 145, turn: 3 })));
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "select_deck_card", option_index: 1 });
  });

  const curses = [
    selectCard(0, "DISINTEGRATION", "Disintegration", "Status", -1, "在你的回合结束时，受到8点伤害。", [{ name: "DisintegrationPower", value: 8 }]),
    selectCard(1, "WASTE_AWAY", "Waste Away", "Status", -1, "每回合失去1点能量。", [{ name: "WasteAwayPower", value: 1 }]),
  ];

  it("Knowledge Demon: Waste Away (-1 energy every turn) is the worst curse while HP can pay for Disintegration", () => {
    // 80 HP, demon at 100/379 after 8 turns (~35 a turn): 3 turns x 8 + 20 = 44 < 80.
    const decision = mustDecision(plan(combatSelection("choose_card_select", "选择一张牌", curses, { hp: 80, maxHp: 89, enemyHp: 100, enemyMaxHp: 379, turn: 9 })));
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "select_deck_card", option_index: 0 });
  });

  it("Knowledge Demon: Waste Away only when Disintegration would outlast the HP (PU21 T9: 33 HP, demon 182/379)", () => {
    const decision = mustDecision(plan(combatSelection("choose_card_select", "选择一张牌", curses, { hp: 33, maxHp: 89, enemyHp: 182, enemyMaxHp: 379, turn: 9 })));
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "select_deck_card", option_index: 1 });
  });

  // 6A36 F3: Burning Pact's exhaust took Strikes by the removal ranking (Strike 80 > Defend 70).
  const exhaustHand = [
    selectCard(0, "STRIKE_IRONCLAD", "Strike", "Attack", 1, "造成6点伤害。", [{ name: "Damage", value: 6 }]),
    selectCard(1, "DEFEND_IRONCLAD", "Defend", "Skill", 1, "获得5点格挡。", [{ name: "Block", value: 5 }]),
    selectCard(2, "STRIKE_IRONCLAD", "Strike", "Attack", 1, "造成6点伤害。", [{ name: "Damage", value: 6 }]),
  ];
  const exhaustState = (cards: unknown[], draw: string[], incoming: number) => {
    const raw = combatSelection("combat_hand_select", "[center]选择[blue]1[/blue]张牌来[gold]消耗[/gold]。[/center]", cards, { hp: 40, maxHp: 80, enemyHp: 30, enemyMaxHp: 38, turn: 3 });
    const combat = raw["combat"] as Record<string, unknown>;
    combat["enemies"] = [{ ...(combat["enemies"] as Record<string, unknown>[])[0], enemy_id: "SLUDGE_SPINNER", intents: incoming > 0 ? [{ intent_type: "Attack", damage: incoming, hits: 1 }] : [] }];
    return { ...raw, agent_view: { combat: { draw: draw.map((line) => ({ line, card_ids: [line.startsWith("打击") ? "STRIKE_IRONCLAD" : line.startsWith("痛击") ? "BASH" : "DEFEND_IRONCLAD"] })), discard: [] } } };
  };
  const exhausted = (raw: Record<string, unknown>): number | undefined => {
    const decision = mustDecision(plan(raw, { combatPlanner: "turn" }));
    expect(decision.kind).toBe("act");
    return decision.kind === "act" ? (decision.intent as { option_index?: number }).option_index : undefined;
  };

  it("in-combat exhaust keeps the attacks of a small deck (6A36: 4 attacks in 9 cards): a Defend goes", () => {
    const raw = exhaustState(exhaustHand, ["打击 [1费]：造成6点伤害。", "痛击 [2费]：造成8点伤害。", "防御*3 [1费]：获得5点格挡。"], 17);
    expect(exhausted(raw)).toBe(1);
  });

  it("in-combat exhaust: a Status first; with attacks to spare, a Defend when little is coming, a Strike into a big hit", () => {
    const wound = selectCard(3, "WOUND", "Wound", "Status", -1, "不能被打出。");
    expect(exhausted(exhaustState([...exhaustHand, wound], ["打击*4 [1费]：造成6点伤害。"], 17))).toBe(3);
    const many = ["打击*4 [1费]：造成6点伤害。", "防御*2 [1费]：获得5点格挡。"];
    expect(exhausted(exhaustState(exhaustHand, many, 6))).toBe(1);
    expect([0, 2]).toContain(exhausted(exhaustState(exhaustHand, many, 17)));
  });

  it("in-combat exhaust keeps a card the turn's plan still plays (F3SS F33 T5: Brand took the Bash+)", () => {
    const many = ["打击*4 [1费]：造成6点伤害。", "防御*2 [1费]：获得5点格挡。"];
    const screenMemory = { ...createScreenMemory("CARD_SELECT"), planBeforeSelection: [{ cardIndex: 1, cardId: "DEFEND_IRONCLAD", upgraded: false, name: "Defend", target: null, targetName: null }] };
    const decision = mustDecision(plan(exhaustState(exhaustHand, many, 6), { combatPlanner: "turn", screenMemory }));
    expect(decision.kind === "act" && (decision.intent as { option_index?: number }).option_index).not.toBe(1);
  });

  // U6W7 F42: at 12 HP Defend++ was exhausted on a quiet turn; the Frog Knight's next hit was 21.
  const frogTurn = (hp: number) => {
    const raw = exhaustState(exhaustHand, ["打击*4 [1费]：造成6点伤害。", "防御*2 [1费]：获得5点格挡。"], 5);
    const combat = raw["combat"] as Record<string, unknown>;
    (combat["player"] as Record<string, unknown>)["current_hp"] = hp;
    combat["enemies"] = [{ ...(combat["enemies"] as Record<string, unknown>[])[0], enemy_id: "FROG_KNIGHT", move_id: "TONGUE_LASH" }];
    return raw;
  };

  it("in-combat exhaust weighs next turn's expected hit, not just this turn's (U6W7 F42)", () => {
    // 5 now, ~22 next (Tongue Lash -> Strike Down Evil): a Strike goes, not the Defend.
    expect([0, 2]).toContain(exhausted(frogTurn(40)));
  });

  it("in-combat exhaust never takes a block card when HP is at or below the hit coming (U6W7 F42: 12 HP, 21 next)", async () => {
    expect([0, 2]).toContain(exhausted(frogTurn(12)));
    const { combatExhaustScore } = await import("../src/screens/selection.js");
    // Even with the attacks at the fight's minimum, the Defend is kept.
    const tight = { attacks: 3, incoming: 21, hp: 12 };
    expect(combatExhaustScore("DEFEND_IRONCLAD", "Skill", tight)).toBeLessThan(combatExhaustScore("STRIKE_IRONCLAD", "Attack", tight));
    expect(combatExhaustScore("SHRUG_IT_OFF", "Skill", tight, true)).toBeLessThan(combatExhaustScore("STRIKE_IRONCLAD", "Attack", tight));
    expect(combatExhaustScore("DEFEND_IRONCLAD", "Skill", { ...tight, hp: 40 })).toBeGreaterThan(0);
  });

  it("Toasty Mittens keeps Strength-scaled attacks, AoE into two bodies, Fight Me and debuffs under Artifact (6HRZ F33 T6, XWPV F48 T4)", async () => {
    const { combatExhaustScore } = await import("../src/screens/selection.js");
    const pick = (context: Record<string, unknown>, hand: [string, string, { hits?: number; aoe?: boolean; debuff?: boolean }, boolean?][]) =>
      hand.map(([id, type, card, upgraded]) => ({ id, score: combatExhaustScore(id, type, { attacks: 12, incoming: 10, hp: 60, ...context }, false, card) - (upgraded ? 8 : 0) }))
        .sort((a, b) => b.score - a.score)[0]!.id;
    // 6HRZ T6: Strength 6, both claws alive; Exterminate (4 hits, all enemies) was exhausted at 55.
    const crab = { strength: 6, multiEnemy: true };
    const t6: [string, string, { hits?: number; aoe?: boolean; debuff?: boolean }, boolean?][] = [
      ["EXTERMINATE", "Attack", { hits: 4, aoe: true }],
      ["BREAKTHROUGH", "Attack", { aoe: true }],
      ["DISMANTLE", "Attack", {}],
      ["BASH", "Attack", { debuff: true }, true],
      ["BATTLE_TRANCE", "Skill", {}],
    ];
    expect(pick(crab, t6)).not.toBe("EXTERMINATE");
    // XWPV F48 T4: Fight Me scored 75 and went first; Artifact up, Bash is kept too.
    const aeon = { strength: 4, artifact: true };
    const t4: [string, string, { hits?: number; aoe?: boolean; debuff?: boolean }, boolean?][] = [
      ["TWIN_STRIKE", "Attack", { hits: 2 }],
      ["BLUDGEON", "Attack", {}],
      ["FIGHT_ME", "Attack", { hits: 2 }],
      ["SPITE", "Attack", {}],
      ["BATTLE_TRANCE", "Skill", {}, true],
    ];
    expect(["SPITE", "BATTLE_TRANCE"]).toContain(pick(aeon, t4));
    expect(combatExhaustScore("BASH", "Attack", { attacks: 12, incoming: 10, hp: 60, artifact: true }, false, { debuff: true })).toBeLessThanOrEqual(10);
    // A plain Strike is still the first attack to go.
    expect(pick({ strength: 2 }, [["STRIKE_IRONCLAD", "Attack", {}], ["DISMANTLE", "Attack", {}]])).toBe("STRIKE_IRONCLAD");
  });

  it("in-combat exhaust never takes Frantic Escape while the Sandpit is up (THMG F33 T4: 'scores 90 vs Strike 70')", async () => {
    const { combatExhaustScore } = await import("../src/screens/selection.js");
    const context = { attacks: 8, incoming: 10, hp: 50 };
    expect(combatExhaustScore("FRANTIC_ESCAPE", "Status", context)).toBe(90);
    const sandpit = { ...context, sandpit: true };
    const escape = combatExhaustScore("FRANTIC_ESCAPE", "Status", sandpit);
    for (const [id, type] of [["STRIKE_IRONCLAD", "Attack"], ["DEFEND_IRONCLAD", "Skill"], ["BASH", "Attack"], ["WOUND", "Status"]] as const) {
      expect(escape).toBeLessThan(combatExhaustScore(id, type, sandpit));
    }
  });
});

describe("chest", () => {
  it("opens an unopened chest in code", () => {
    const decision = mustDecision(plan(chestPayload(false)));
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "open_chest" });
  });

  it("asks which relic to take", () => {
    const decision = mustDecision(plan(chestPayload(true)));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    expect(decision.resolve(pickAnswer("r1")).intent).toEqual({ action: "choose_treasure_relic", option_index: 1 });
  });
});

describe("crystal sphere", () => {
  it("solves the grid in code, targeting good items", () => {
    const decision = mustDecision(plan(crystalPayload()));
    expect(decision.kind).toBe("act");
    if (decision.kind !== "act") return;
    expect(decision.intent.action).toBe("crystal_clear_cell");
    expect(decision.intent.tool).toBe("big");
    // The 2x2 good item sits at (1,1); a 3x3 placement must overlap it.
    expect(decision.intent.x).toBeLessThanOrEqual(1);
    expect(decision.intent.y).toBeLessThanOrEqual(1);
  });
});

describe("menus and overlays", () => {
  it("refuses to answer a prompt that would turn tutorials on", () => {
    const raw = modalPayload();
    (raw["modal"] as Record<string, unknown>)["type_name"] = "NAcceptTutorialsFtue";
    const outcome = plan(raw);
    expect(outcome.kind).toBe("blocked");
    expect(outcome.kind === "blocked" ? outcome.reason : "").toContain("NAcceptTutorialsFtue");
  });

  it("still dismisses an informational FTUE popup", () => {
    const raw = modalPayload();
    (raw["modal"] as Record<string, unknown>)["type_name"] = "NCombatRulesFtue";
    const decision = mustDecision(plan(raw));
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "confirm_modal" });
  });

  it("can be told to answer it anyway", () => {
    const raw = modalPayload();
    (raw["modal"] as Record<string, unknown>)["type_name"] = "NAcceptTutorialsFtue";
    const decision = mustDecision(plan(raw, { allowFtueModals: true }));
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "confirm_modal" });
  });

  it("continues an existing run by default", () => {
    const decision = mustDecision(plan(mainMenuPayload()));
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "continue_run" });
  });

  it("starts a new run when RUN_START is new", () => {
    const decision = mustDecision(plan(mainMenuPayload(), { runStart: "new" }));
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "open_character_select" });
  });

  it("embarks once a character is chosen", () => {
    const decision = mustDecision(plan(characterSelectPayload(true)));
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "embark" });
  });

  it("selects the configured character", () => {
    const decision = mustDecision(plan(characterSelectPayload(false), { characterPreference: "IRONCLAD" }));
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "select_character", option_index: 0 });
  });

  it("confirms a modal", () => {
    const decision = mustDecision(plan(modalPayload()));
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "confirm_modal" });
  });

  it("continues past the score screen", () => {
    const decision = mustDecision(plan(gameOverPayload()));
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "continue_game_over" });
  });

  it("waits on a human pause page", () => {
    const outcome = plan(baseState("PAUSE_MENU", { available_actions: [] }));
    expect(outcome.kind).toBe("wait");
  });

  it("steps back out of a pause submenu when that is the only action", () => {
    const outcome = plan(baseState("CARD_LIBRARY", { available_actions: ["close_main_menu_submenu"] }));
    const decision = mustDecision(outcome);
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "close_main_menu_submenu" });
  });
});

describe("routing", () => {
  it("reports an unsupported screen instead of guessing", () => {
    const outcome = plan(baseState("SOMETHING_NEW", { available_actions: ["mystery_action"] }));
    expect(outcome.kind).toBe("unsupported");
  });

  it("refuses to act in a multiplayer run", () => {
    const raw = combatPayload();
    raw["session"] = { mode: "multiplayer", phase: "run", control_scope: "local_player" };
    const outcome = plan(raw);
    expect(outcome.kind).toBe("wait");
    expect(outcome.kind === "wait" ? outcome.reason : "").toContain("single-player");
  });
});

describe("fingerprint: event pages and max HP (KFPC F4)", () => {
  it("changes when the event page or max HP changes, HP and actions unchanged", () => {
    const page = eventPayload();
    const next = eventPayload();
    ((next["event"] as Record<string, unknown>)["options"] as Record<string, unknown>[])[0]!["title"] = "Decipher (-6 Max HP)";
    expect(fingerprint(parseGameState(next))).not.toBe(fingerprint(parseGameState(page)));
    const lower = eventPayload();
    lower["run"] = { ...(lower["run"] as Record<string, unknown>), max_hp: 77 };
    expect(fingerprint(parseGameState(lower))).not.toBe(fingerprint(parseGameState(page)));
    expect(fingerprint(parseGameState(eventPayload()))).toBe(fingerprint(parseGameState(page)));
  });
});

describe("gate and fingerprint", () => {
  it("rejects an action that is no longer advertised", () => {
    const state = parseGameState(combatPayload());
    expect(gate(state, { action: "end_turn" }).ok).toBe(true);
    expect(gate(state, { action: "open_chest" }).ok).toBe(false);
  });

  it("rejects an unplayable card and an invalid target", () => {
    const state = parseGameState(combatPayload());
    expect(gate(state, { action: "play_card", card_index: 0, target_index: 0 }).ok).toBe(true);
    expect(gate(state, { action: "play_card", card_index: 0, target_index: 5 }).ok).toBe(false);
    expect(gate(state, { action: "play_card", card_index: 99 }).ok).toBe(false);
  });

  it("rejects a stale map index", () => {
    const state = parseGameState(mapPayload());
    expect(gate(state, { action: "choose_map_node", option_index: 1 }).ok).toBe(true);
    expect(gate(state, { action: "choose_map_node", option_index: 7 }).ok).toBe(false);
  });

  it("changes when the hand changes", () => {
    const before = parseGameState(combatPayload());
    const after = parseGameState(combatPayload({ noPlayableCards: true }));
    expect(fingerprint(before)).not.toBe(fingerprint(after));
  });

  it("is stable for the same state", () => {
    expect(fingerprint(parseGameState(combatPayload()))).toBe(fingerprint(parseGameState(combatPayload())));
  });
});

describe("turn-start settle guard", () => {
  it("waits while a new turn shows 0 energy, then acts after 3 s", async () => {
    const { turnStartUnsettled } = await import("../src/screens/index.js");
    const raw = combatPayload();
    ((raw["combat"] as Record<string, unknown>)["player"] as Record<string, unknown>)["energy"] = 0;
    const e = env(raw, { combatPlanner: "turn" });
    expect(turnStartUnsettled(e, 1_000)).toBe(true);
    expect(turnStartUnsettled(e, 2_500)).toBe(true);
    expect(turnStartUnsettled(e, 4_100)).toBe(false);
  });

  it("waits on a fight's first frame that still shows the last fight's counters (M75J F37 T1)", async () => {
    const { turnStartUnsettled } = await import("../src/screens/index.js");
    const raw = combatPayload();
    raw["turn"] = 1;
    const combat = raw["combat"] as Record<string, unknown>;
    const player = combat["player"] as Record<string, unknown>;
    player["energy"] = 0;
    player["cards_played_this_turn"] = 1;
    combat["hand"] = [];
    const e = env(raw, { combatPlanner: "turn" });
    expect(turnStartUnsettled(e, 1_000)).toBe(true);
    expect(turnStartUnsettled(e, 4_000)).toBe(true);
    expect(turnStartUnsettled(e, 6_100)).toBe(false);
  });

  it("does not wait on a normal turn start", async () => {
    const { turnStartUnsettled } = await import("../src/screens/index.js");
    const e = env(combatPayload(), { combatPlanner: "turn" });
    expect(turnStartUnsettled(e, 1_000)).toBe(true); // 3-card hand: the draw may still be landing
    expect(turnStartUnsettled(e, 2_600)).toBe(false);
  });

  it("times the wait from the last hand change, not from the turn number (G7EJ T9)", async () => {
    const { turnStartUnsettled } = await import("../src/screens/index.js");
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    const hand = combat["hand"] as unknown[];
    combat["hand"] = hand.slice(0, 1);
    const e = env(raw, { combatPlanner: "turn" });
    // Turn number seen during the enemy turn, one card already in: long past the old 1.5 s by now.
    expect(turnStartUnsettled(e, 1_000)).toBe(true);
    // The rest of the draw lands at 5 s: the clock restarts.
    const e2 = env(combatPayload(), { combatPlanner: "turn", screenMemory: e.screenMemory });
    expect(turnStartUnsettled(e2, 5_000)).toBe(true);
    expect(turnStartUnsettled(e2, 6_000)).toBe(true);
    expect(turnStartUnsettled(e2, 6_600)).toBe(false);
  });

  it("trusts a full hand after 700 ms of no change, and an energy change restarts the clock", async () => {
    const { turnStartUnsettled } = await import("../src/screens/index.js");
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    const hand = combat["hand"] as Record<string, unknown>[];
    combat["hand"] = [...hand, { ...hand[0], index: 3 }, { ...hand[1], index: 4 }];
    const e = env(raw, { combatPlanner: "turn" });
    expect(turnStartUnsettled(e, 1_000)).toBe(true);
    expect(turnStartUnsettled(e, 1_750)).toBe(false);
    (combat["player"] as Record<string, unknown>)["energy"] = 4;
    const e2 = env(raw, { combatPlanner: "turn", screenMemory: e.screenMemory });
    expect(turnStartUnsettled(e2, 1_800)).toBe(true);
    expect(turnStartUnsettled(e2, 2_600)).toBe(false);
  });

  it("never waits once a card has been played this turn", async () => {
    const { turnStartUnsettled } = await import("../src/screens/index.js");
    const raw = combatPayload();
    ((raw["combat"] as Record<string, unknown>)["player"] as Record<string, unknown>)["cards_played_this_turn"] = 1;
    expect(turnStartUnsettled(env(raw, { combatPlanner: "turn" }), 1_000)).toBe(false);
  });
});

describe("committed combat plan", () => {
  const signature = (ids: string[]): string => [...ids].sort().join(",");
  const step = (cardId: string, upgraded = false) => ({ cardIndex: 0, cardId, upgraded, name: cardId, target: null, targetName: null });

  it("keeps playing the plan when the hand is as expected", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const e = env(combatPayload(), { combatPlanner: "turn" });
    e.screenMemory.combatPlan = { turn: 3, remaining: [step("DEFEND_R"), step("STRIKE_R")], expectedHand: signature(["STRIKE_R", "DEFEND_R", "BASH"]), handLen: 3, via: "code" };
    const decision = planCombatTurn(e);
    expect(decision?.label).toBe("combat/plan-continue");
    expect(decision && decision.kind === "act" ? decision.intent : null).toEqual({ action: "play_card", card_index: 1 });
  });

  it("drops the plan when the hand grew since it was made (the draw was still landing)", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const e = env(combatPayload(), { combatPlanner: "turn" });
    e.screenMemory.combatPlan = { turn: 3, remaining: [step("DEFEND_R")], expectedHand: signature(["STRIKE_R", "DEFEND_R", "BASH"]), handLen: 2, via: "code" };
    expect(planCombatTurn(e)?.label).not.toBe("combat/plan-continue");
  });

  it("plays the upgraded copy the plan named (0NG F17: Defend+ planned, Defend played)", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    const hand = combat["hand"] as Record<string, unknown>[];
    combat["hand"] = [...hand, { ...hand[1], index: 3, upgraded: true }];
    const e = env(raw, { combatPlanner: "turn" });
    const expected = signature(["STRIKE_R", "DEFEND_R", "BASH", "DEFEND_R+"]);
    e.screenMemory.combatPlan = { turn: 3, remaining: [step("DEFEND_R", true)], expectedHand: expected, handLen: 4, via: "code" };
    const decision = planCombatTurn(e);
    expect(decision && decision.kind === "act" ? decision.intent : null).toEqual({ action: "play_card", card_index: 3 });
    // Falls back to the id alone when no copy has the planned upgrade level.
    e.screenMemory.combatPlan = { turn: 3, remaining: [step("STRIKE_R", true), step("BASH")], expectedHand: expected, handLen: 4, via: "code" };
    const again = planCombatTurn(e);
    expect(again?.label).toBe("combat/plan-continue");
    expect(again && again.kind === "act" ? again.intent : null).toMatchObject({ action: "play_card", card_index: 0 });
  });
});

describe("Waterfall Giant modelling", () => {
  it("is modelled (no damage discount), not scaling, and carries its eruption stacks", async () => {
    const { enemySims } = await import("../src/screens/combat-plan.js");
    const [giant] = enemySims({
      enemies: [
        {
          index: 0, enemy_id: "WATERFALL_GIANT", name: "Waterfall Giant", current_hp: 197, max_hp: 240, block: 0, is_alive: true,
          powers: [{ power_id: "VULNERABLE_POWER", amount: 2 }, { power_id: "STEAM_ERUPTION_POWER", amount: 15 }],
          intents: [{ intent_type: "Attack", damage: 20, hits: 1 }, { intent_type: "Buff" }],
        },
      ],
    });
    expect(giant!.unmodelled).toBe(false);
    expect(giant!.scaling).toBe(false);
    expect(giant!.eruption).toBe(15);
  });
});

describe("Sandpit guard", () => {
  const sandpitCombat = (sandpit: number, escapeCost: number): Record<string, unknown> => {
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    combat["enemies"] = [
      {
        index: 0, enemy_id: "THE_INSATIABLE", name: "The Insatiable", current_hp: 186, max_hp: 321, block: 0, is_alive: true, is_hittable: true,
        powers: [{ index: 0, power_id: "SANDPIT_POWER", name: "Sandpit", amount: sandpit, is_debuff: false }],
        intent: "THRASH_MOVE", move_id: "THRASH_MOVE",
        intents: [{ index: 0, intent_type: "Attack", label: "10x2", damage: 10, hits: 2, total_damage: 20 }],
      },
    ];
    const hand = combat["hand"] as Record<string, unknown>[];
    combat["hand"] = [
      hand[1],
      { ...hand[1], index: 1, card_id: "FRANTIC_ESCAPE", name: "Frantic Escape", energy_cost: escapeCost, dynamic_values: [], rules_text: "Sandpit +1" },
    ];
    return raw;
  };
  const endTurn: Decision = { kind: "act", label: "combat/end_turn", intent: { action: "end_turn" }, rationale: "test" };

  it("plays an affordable Frantic Escape instead of ending the turn at Sandpit 1", async () => {
    const { guardSandpit } = await import("../src/screens/combat-plan.js");
    const decision = guardSandpit(env(sandpitCombat(1, 1), { combatPlanner: "turn" }), endTurn);
    expect(decision?.label).toBe("combat/sandpit-guard");
    expect(decision && decision.kind === "act" ? decision.intent : null).toEqual({ action: "play_card", card_index: 1 });
  });

  it("leaves end_turn alone when the count survives or the Escape is unaffordable", async () => {
    const { guardSandpit } = await import("../src/screens/combat-plan.js");
    expect(guardSandpit(env(sandpitCombat(2, 1), { combatPlanner: "turn" }), endTurn)).toBe(endTurn);
    expect(guardSandpit(env(sandpitCombat(1, 4), { combatPlanner: "turn" }), endTurn)).toBe(endTurn);
  });

  it("overrides an end_turn answer from Jev/DeepSeek too", async () => {
    const { guardSandpit } = await import("../src/screens/combat-plan.js");
    const ask: Decision = {
      kind: "ask", label: "combat/plan-choice", state: {}, questions: {},
      resolve: () => ({ intent: { action: "end_turn" }, rationale: "Jev chose plan 2", confidence: 0.6, fallback: false }),
    };
    const guarded = guardSandpit(env(sandpitCombat(1, 1), { combatPlanner: "turn" }), ask);
    const resolved = guarded && guarded.kind === "ask" ? guarded.resolve({}) : null;
    expect(resolved?.intent).toEqual({ action: "play_card", card_index: 1 });
  });

  it("the turn planner plays the Escape at Sandpit 1", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    // Without the Fire Potion: The Insatiable ramps (Buff moves), so a potion line is a real second option.
    const raw = sandpitCombat(1, 1);
    (raw["run"] as Record<string, unknown>)["potions"] = [];
    const decision = planCombatTurn(env(raw, { combatPlanner: "turn" }));
    expect(decision && decision.kind === "act" ? decision.intent : null).toEqual({ action: "play_card", card_index: 1 });
  });

  it("THMG F33 T5/T6: lines ending at Sandpit 1 are not offered while one keeps it at 2", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const raw = sandpitCombat(1, 1);
    const combat = raw["combat"] as Record<string, unknown>;
    const enemy = (combat["enemies"] as Record<string, unknown>[])[0]!;
    enemy["intents"] = [{ index: 0, intent_type: "Attack", label: "20x2", damage: 20, hits: 2, total_damage: 40 }];
    const hand = combat["hand"] as Record<string, unknown>[];
    const escape = hand[1]!;
    combat["hand"] = [
      { ...escape, index: 0 },
      { ...escape, index: 1 },
      { ...escape, index: 2 },
      { ...hand[0], index: 3 },
      { ...(combatPayload()["combat"] as { hand: Record<string, unknown>[] }).hand[0], index: 4 },
    ];
    ((raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[])[0]!["potion_id"] = "ENTROPIC_BREW";
    const decision = planCombatTurn(env(raw, { combatPlanner: "turn" }));
    if (!decision) throw new Error("expected a decision");
    const shown: Record<string, unknown>[] =
      decision.kind === "ask"
        ? Object.entries(decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {})
            .filter(([key]) => key.startsWith("plan"))
            .map(([, text]) => JSON.parse(String(text)))
        : [];
    if (decision.kind === "act") expect(decision.intent).toMatchObject({ action: "play_card" });
    for (const plan of shown) expect(Number(plan["sandpit_after_enemy_turn"])).toBeGreaterThanOrEqual(2);
    expect(decision.kind === "ask" ? shown.length : 1).toBeGreaterThan(0);
  });

  it("shows enemy powers (the Sandpit countdown) in the plan-choice question", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const raw = sandpitCombat(2, 1);
    const enemy = ((raw["combat"] as Record<string, unknown>)["enemies"] as Record<string, unknown>[])[0]!;
    enemy["intents"] = [{ index: 0, intent_type: "Attack", label: "20x2", damage: 20, hits: 2, total_damage: 40 }];
    // An unmodelled potion on a dangerous turn: the plan goes to Jev.
    ((raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[])[0]!["potion_id"] = "ENTROPIC_BREW";
    const decision = planCombatTurn(env(raw, { combatPlanner: "turn" }));
    expect(decision?.label).toMatch(/^combat\/plan-choice/);
    const enemies = decision && decision.kind === "ask" ? (decision.state["enemies"] as { powers: string[] }[]) : [];
    expect(enemies[0]!.powers[0]).toMatch(/^SANDPIT_POWER 2 \(countdown/);
  });
});

describe("combat plan guards (batch 2)", () => {
  const card = (index: number, cardId: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    index, card_id: cardId, name: cardId, upgraded: false, target_type: "Self", requires_target: false, valid_target_indices: [],
    costs_x: false, star_costs_x: false, energy_cost: 1, star_cost: 0, rules_text: "", resolved_rules_text: "", playable: true, dynamic_values: [], ...extra,
  });

  it("does not commit a score-best plan that is missing from the options as the 'only line' (YP9 T3)", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    (combat["player"] as Record<string, unknown>)["energy"] = 1;
    // Crimson Mantle scores best on its flat power value, but Defend is better on every shown axis.
    combat["hand"] = [
      card(0, "CRIMSON_MANTLE"),
      card(1, "DEFEND_R", { dynamic_values: [{ name: "Block", base_value: 5, current_value: 5 }] }),
    ];
    const decision = planCombatTurn(env(raw, { combatPlanner: "turn" }));
    // Since the lasting-value axis (9NE1) the Mantle line is no longer dominated, so both lines may go
    // to the model; what must never happen is committing a hidden plan as the "only line".
    expect(["act", "ask"]).toContain(decision?.kind);
    if (decision?.kind !== "act") return;
    expect(decision.intent).toEqual({ action: "play_card", card_index: 1 });
    expect(decision.rationale).not.toMatch(/only line/);
  });

  const guardCombat = (): Record<string, unknown> => {
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    (combat["player"] as Record<string, unknown>)["current_hp"] = 30;
    const enemies = combat["enemies"] as Record<string, unknown>[];
    combat["enemies"] = [{ ...enemies[0], intents: [{ index: 0, intent_type: "Attack", label: "32", damage: 32, hits: 1, total_damage: 32 }] }];
    const hand = combat["hand"] as Record<string, unknown>[];
    const block10 = { dynamic_values: [{ name: "Block", base_value: 10, current_value: 10 }] };
    combat["hand"] = [hand[0], { ...hand[1], ...block10 }, { ...hand[1], index: 3, ...block10 }, { ...hand[2], index: 2 }];
    // An unmodelled potion on a dangerous turn: the plan goes to Jev.
    ((raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[])[0]!["potion_id"] = "ENTROPIC_BREW";
    return raw;
  };

  it("no HP guard swap: a plan losing far more HP than the cheapest one is played as picked, with that fact on it", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const decision = planCombatTurn(env(guardCombat(), { combatPlanner: "turn" }));
    if (decision?.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {};
    const plans = Object.entries(criteria)
      .filter(([key]) => key.startsWith("plan"))
      .map(([key, text]) => ({ key, hpLost: Number(JSON.parse(String(text))["hp_lost"]) }));
    const minLoss = Math.min(...plans.map((entry) => entry.hpLost));
    const greedy = plans.reduce((a, b) => (b.hpLost > a.hpLost ? b : a));
    expect(greedy.hpLost - minLoss).toBeGreaterThan(6);
    const escalated = { plan: { type: "choice", choice: greedy.key, probabilities: { [greedy.key]: 1 }, confidence: 1, raw: { escalated: "deepseek" } } } as AnswerSet;
    const resolved = decision.resolve(escalated);
    expect(resolved.guard).toBeUndefined();
    expect(resolved.rationale).not.toMatch(/HP guard/);
    expect(JSON.parse(String(criteria[greedy.key]))["hp_vs_safest"]).toMatch(new RegExp(`^${greedy.hpLost - minLoss} HP more than the safest line \\(${minLoss}\\)`));
  });

  it("HP guard leaves a plan within the slack alone", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const decision = planCombatTurn(env(guardCombat(), { combatPlanner: "turn" }));
    if (decision?.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {};
    const cheapest = Object.entries(criteria)
      .filter(([key]) => key.startsWith("plan"))
      .reduce((a, b) => (Number(JSON.parse(String(b[1]))["hp_lost"]) < Number(JSON.parse(String(a[1]))["hp_lost"]) ? b : a))[0];
    const resolved = decision.resolve({ plan: { type: "choice", choice: cheapest, probabilities: { [cheapest]: 0.9 }, confidence: 0.9, raw: {} } } as AnswerSet);
    expect(resolved.guard).toBeUndefined();
  });

  it("reads Kaiser Crab's Crab Rage and Crimson Mantle's HP cost", async () => {
    const { enemySims, mantleHpCost } = await import("../src/screens/combat-plan.js");
    const [rocket] = enemySims({
      enemies: [{ index: 1, enemy_id: "ROCKET", name: "Rocket", current_hp: 14, max_hp: 199, block: 0, is_alive: true, powers: [{ power_id: "CRAB_RAGE_POWER", amount: 1 }], intents: [] }],
    });
    expect(rocket!.crabRage).toBe(true);
    // Plow: stunned at 150 like Shriek (RAWT F17 T6).
    const [beast] = enemySims({
      enemies: [{ index: 0, enemy_id: "CEREMONIAL_BEAST", name: "Beast", current_hp: 160, max_hp: 252, block: 0, is_alive: true, powers: [{ power_id: "PLOW_POWER", amount: 150 }], intents: [] }],
    });
    expect(beast!.shriek).toBe(150);
    expect(rocket!.unmodelled).toBe(false);
    expect([mantleHpCost(0), mantleHpCost(7), mantleHpCost(10), mantleHpCost(14), mantleHpCost(20)]).toEqual([0, 1, 1, 2, 2]);
  });
});

describe("potions at low HP outside boss fights", () => {
  // Two small attackers (4 + 3): not a dangerous turn, so only the low-HP rule offers the potion.
  const pressedCombat = (hp: number, potionId: string): Record<string, unknown> => {
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    (combat["player"] as Record<string, unknown>)["current_hp"] = hp;
    const enemies = combat["enemies"] as Record<string, unknown>[];
    combat["enemies"] = enemies.map((enemy, i) => ({
      ...enemy,
      intents: [{ index: 0, intent_type: "Attack", label: String(4 - i), damage: 4 - i, hits: 1, total_damage: 4 - i }],
    }));
    ((raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[])[0]!["potion_id"] = potionId;
    return raw;
  };

  it("offers an unmodelled potion below 40% HP against two attackers (7Q5G T5, Y83U F30)", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const low = planCombatTurn(env(pressedCombat(25, "ENTROPIC_BREW"), { combatPlanner: "turn" }));
    expect(low?.label).toBe("combat/plan-choice+potion");
    // At 55 HP the potion alone makes no question; when Jev is asked anyway it rides along with its facts.
    const high = planCombatTurn(env(pressedCombat(55, "ENTROPIC_BREW"), { combatPlanner: "turn" }));
    if (high?.kind === "ask" && high.label === "combat/plan-choice+potion") {
      expect(Object.keys(questionOf(high).options).filter((key) => key.startsWith("plan")).length).toBeGreaterThan(1);
      expect(JSON.stringify(high.questions)).toMatch(/potion_facts/);
    }
  });

  it("a modelled potion costs nothing to use below 40% HP against two attackers", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    // Fire Potion's 20 damage is worth less than the hallway use cost of 15; at low HP it is free.
    // Enough incoming that no potion-free line is cheap (a dry line losing <= 5 keeps the potion even
    // when pressed: B6AC F30).
    const heavier = (hp: number) => {
      const raw = pressedCombat(hp, "FIRE_POTION");
      const combat = raw["combat"] as Record<string, unknown>;
      combat["enemies"] = (combat["enemies"] as Record<string, unknown>[]).map((enemy) => ({
        ...enemy,
        intents: [{ index: 0, intent_type: "Attack", label: "8", damage: 8, hits: 1, total_damage: 8 }],
      }));
      return raw;
    };
    const drinks = (hp: number): boolean => {
      const e = env(heavier(hp), { combatPlanner: "turn" });
      const decision = planCombatTurn(e);
      if (decision?.kind === "act") return decision.intent.action === "use_potion" || (e.screenMemory.combatPlan?.remaining ?? []).some((step) => step.cardId.startsWith("POTION:"));
      const criteria = decision?.kind === "ask" && decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {};
      // plan1 is the score-best line.
      return String(criteria["plan1"]).includes("Fire Potion");
    };
    expect(drinks(25)).toBe(true);
    expect(drinks(55)).toBe(false);
  });
});

describe("hallway potion lines (NZR7 F6, JGJS F23, VC4L F23 T1)", () => {
  const pressedCombat = (hp: number, potionId: string): Record<string, unknown> => {
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    (combat["player"] as Record<string, unknown>)["current_hp"] = hp;
    const enemies = combat["enemies"] as Record<string, unknown>[];
    combat["enemies"] = enemies.map((enemy, i) => ({
      ...enemy,
      intents: [{ index: 0, intent_type: "Attack", label: String(4 - i), damage: 4 - i, hits: 1, total_damage: 4 - i }],
    }));
    ((raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[])[0]!["potion_id"] = potionId;
    return raw;
  };
  const planAnswer = (choice: string, confidence: number): AnswerSet => ({
    plan: { type: "choice", choice, probabilities: { [choice]: confidence }, confidence, raw: {} },
  });

  it("Jev's unmodelled potion pick stands at any confidence (no hallway potion veto); only an unusable answer falls back", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const decision = planCombatTurn(env(pressedCombat(25, "ENTROPIC_BREW"), { combatPlanner: "turn" }));
    if (decision?.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {};
    const potionKey = Object.keys(criteria).find((key) => !key.startsWith("plan"))!;
    expect(potionKey).toBeDefined();
    // VC4L F23 T1: Gambler's Brew at 0.05 (it used to fall back below 0.75): Jev's call now.
    const guess = decision.resolve(planAnswer(potionKey, 0.05));
    expect(guess.fallback).toBe(false);
    expect(guess.intent?.action).toBe("use_potion");
    expect(guess.reference).toMatchObject({ rank: null, matched: false });
    const unusable = decision.resolve({});
    expect(unusable.fallback).toBe(true);
    expect(unusable.intent?.action).not.toBe("use_potion");
    // An escalator's pick stands.
    const escalated = decision.resolve({ plan: { type: "choice", choice: potionKey, probabilities: {}, confidence: 0.6, raw: { escalated: "deepseek" } } });
    expect(escalated.intent?.action).toBe("use_potion");
  });

  it("the hallway potion cost doubles right before a forced Elite", async () => {
    const { potionUseCostFor, HALLWAY_POTION_COST } = await import("../src/screens/combat-plan.js");
    const { forcedEliteWithin } = await import("../src/screens/rest.js");
    const eliteNext = (childType: string) => {
      const memory = createScreenMemory("COMBAT");
      rememberMap(memory, parseGameState(baseState("MAP", {
        run: runPayload({ floor: 8 }),
        map: {
          nodes: [
            { row: 7, col: 0, node_type: "Monster", children: [{ row: 8, col: 0 }] },
            { row: 8, col: 0, node_type: childType, children: [] },
            { row: 7, col: 1, node_type: "Unknown", children: [{ row: 8, col: 1 }] },
            { row: 8, col: 1, node_type: "Shop", children: [] },
          ],
          available_nodes: [{ index: 0, row: 7, col: 0, node_type: "Monster" }],
        },
      })));
      return memory;
    };
    const fight = parseGameState(combatPayload());
    expect(forcedEliteWithin(eliteNext("Elite"), fight, ["Monster", "Unknown"], 1)).toBe(true);
    expect(forcedEliteWithin(eliteNext("Monster"), fight, ["Monster", "Unknown"], 1)).toBe(false);
    expect(potionUseCostFor("monster", false, false)).toBe(HALLWAY_POTION_COST);
    expect(potionUseCostFor("monster", false, true)).toBe(2 * HALLWAY_POTION_COST);
    expect(potionUseCostFor("unknown", false, true)).toBe(2 * HALLWAY_POTION_COST);
    expect(potionUseCostFor("elite", false, true)).toBe(5);
    expect(potionUseCostFor("monster", true, true)).toBe(0);
  });
});

describe("potions when even the cheapest line costs a lot of HP", () => {
  // One attacker (not "pressed"), hallway fight, 22/80 HP against 8: Defend keeps 19 HP, below 25% of max.
  const costlyCombat = (hp: number, damage: number, potionId: string): Record<string, unknown> => {
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    (combat["player"] as Record<string, unknown>)["current_hp"] = hp;
    const enemies = combat["enemies"] as Record<string, unknown>[];
    combat["enemies"] = enemies.map((enemy, i) => ({
      ...enemy,
      intents: i === 0 ? [{ index: 0, intent_type: "Attack", label: String(damage), damage, hits: 1, total_damage: damage }] : [{ index: 0, intent_type: "Buff", label: "" }],
    }));
    ((raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[])[0]!["potion_id"] = potionId;
    return raw;
  };

  it("offers an unmodelled potion in a hallway fight when the min-loss line leaves HP below 25% (7Q5G, MD3F)", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const low = planCombatTurn(env(costlyCombat(22, 8, "ENTROPIC_BREW"), { combatPlanner: "turn" }));
    expect(low?.label).toBe("combat/plan-choice+potion");
    // At 60 HP the potion alone makes no question; asked anyway, it rides along.
    const high = planCombatTurn(env(costlyCombat(60, 8, "ENTROPIC_BREW"), { combatPlanner: "turn" }));
    if (high?.label === "combat/plan-choice+potion") expect(Object.keys(questionOf(high).options).filter((key) => key.startsWith("plan")).length).toBeGreaterThan(1);
  });

  it("a modelled potion is free when the min-loss line loses 30% of current HP", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const drinks = (hp: number, damage: number): boolean => {
      const e = env(costlyCombat(hp, damage, "FIRE_POTION"), { combatPlanner: "turn" });
      const decision = planCombatTurn(e);
      if (decision?.kind === "act") return decision.intent.action === "use_potion" || (e.screenMemory.combatPlan?.remaining ?? []).some((step) => step.cardId.startsWith("POTION:"));
      const reference = Object.values(questionOf(decision).options).find((option) => /^same as reference/.test(String(option["reference"])));
      return String(reference?.["plays"]).includes("Fire Potion");
    };
    // 50 HP against 22: Defend still loses 17 (34%).
    expect(drinks(50, 22)).toBe(true);
    // 50 HP against 8: Defend loses 3. Whatever code ranks first, a Fire Potion line says what it buys.
    const cheap = planCombatTurn(env(costlyCombat(50, 8, "FIRE_POTION"), { combatPlanner: "turn" }));
    const fire = Object.values(questionOf(cheap).options).find((option) => String(option["plays"]).includes("Fire Potion"));
    if (fire) expect(String(fire["potion_facts"])).toMatch(/drinking Fire Potion now: .*vs the safest line without it/);
  });
});

describe("Crimson Mantle already in play", () => {
  it("its start-of-turn HP shows in the plan's HP loss (Y83U F30 T3: hp_lost 0)", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const hpLost = (mantle: number): number => {
      const raw = combatPayload();
      const player = (raw["combat"] as Record<string, unknown>)["player"] as Record<string, unknown>;
      if (mantle > 0) player["powers"] = [{ index: 0, power_id: "CRIMSON_MANTLE_POWER", name: "Crimson Mantle", amount: mantle, is_debuff: false }];
      const decision = planCombatTurn(env(raw, { combatPlanner: "turn" }));
      if (decision?.kind === "act") return Number(/hp -(\d+)/.exec(decision.rationale)![1]);
      const criteria = decision?.kind === "ask" && decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {};
      return Math.min(...Object.entries(criteria).filter(([key]) => key.startsWith("plan")).map(([, text]) => Number(JSON.parse(String(text))["hp_lost"])));
    };
    expect(hpLost(7) - hpLost(0)).toBe(1);
    expect(hpLost(14) - hpLost(0)).toBe(2);
  });
});

describe("map: the elite before the boss", () => {
  const preBoss = (hp: number): number => {
    const raw = mapPayload();
    const run = raw["run"] as Record<string, unknown>;
    run["floor"] = 14;
    run["current_hp"] = hp;
    const map = raw["map"] as Record<string, unknown>;
    map["available_nodes"] = [
      { index: 0, row: 13, col: 1, node_type: "Elite" },
      { index: 1, row: 13, col: 3, node_type: "Unknown" },
    ];
    map["nodes"] = [
      { row: 13, col: 1, node_type: "Elite", children: [] },
      { row: 13, col: 3, node_type: "Unknown", children: [] },
    ];
    const decision = mustDecision(plan(raw));
    if (decision.kind === "act") return Number.NaN;
    const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
    return JSON.parse(String(criteria["n0"]))["route_value"];
  };

  it("needs more than 80% HP (BG4W F14: 47/80 took it and lost 33)", () => {
    const run = mapPayload()["run"] as Record<string, unknown>;
    const max = Number(run["max_hp"]);
    expect(preBoss(Math.round(max * 0.75))).toBeLessThan(0);
    expect(preBoss(Math.round(max * 0.9))).toBeGreaterThan(0);
  });
});

describe("combat plan guards (batch 3)", () => {
  const guardCombat = (enemyId = "JAW_WORM"): Record<string, unknown> => {
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    (combat["player"] as Record<string, unknown>)["current_hp"] = 30;
    const enemies = combat["enemies"] as Record<string, unknown>[];
    combat["enemies"] = [{ ...enemies[0], enemy_id: enemyId, intents: [{ index: 0, intent_type: "Attack", label: "32", damage: 32, hits: 1, total_damage: 32 }] }];
    const hand = combat["hand"] as Record<string, unknown>[];
    const block10 = { dynamic_values: [{ name: "Block", base_value: 10, current_value: 10 }] };
    combat["hand"] = [hand[0], { ...hand[1], ...block10 }, { ...hand[1], index: 3, ...block10 }, { ...hand[2], index: 2 }];
    ((raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[])[0]!["potion_id"] = "ENTROPIC_BREW";
    return raw;
  };
  const planLosses = (decision: Decision): { key: string; hpLost: number }[] => {
    const criteria = decision.kind === "ask" && decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {};
    return Object.entries(criteria)
      .filter(([key]) => key.startsWith("plan"))
      .map(([key, text]) => ({ key, hpLost: Number(JSON.parse(String(text))["hp_lost"]) }));
  };
  const escalated = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: { escalated: "deepseek" } } }) as AnswerSet;

  it("boss fight: a choice more than 4 HP over the cheapest plan is played as picked, with its extra HP as a fact", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const decision = planCombatTurn(env(guardCombat("LAGAVULIN_MATRIARCH"), { combatPlanner: "turn" }));
    if (decision?.kind !== "ask") throw new Error("expected an ask");
    const plans = planLosses(decision);
    const minLoss = Math.min(...plans.map((entry) => entry.hpLost));
    const greedy = plans.reduce((a, b) => (b.hpLost > a.hpLost ? b : a));
    expect(greedy.hpLost - minLoss).toBeGreaterThan(4);
    const resolved = decision.resolve(escalated(greedy.key));
    expect(resolved.guard).toBeUndefined();
    expect(resolved.rationale).toMatch(new RegExp(`plan ${greedy.key.slice(4)}/`));
    const facts = JSON.parse(String((decision.questions["plan"] as { criteria: Record<string, string> }).criteria[greedy.key]));
    expect(facts["hp_vs_safest"]).toMatch(/HP more than the safest line/);
  });

  it("no per-fight HP budget: the extra HP a pick accepts is not recorded, and a later pick is not swapped (Z2H3 is a fact now)", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const first = env(guardCombat(), { combatPlanner: "turn" });
    const decision = planCombatTurn(first);
    if (decision?.kind !== "ask") throw new Error("expected an ask");
    const plans = planLosses(decision);
    const greedy = plans.reduce((a, b) => (b.hpLost > a.hpLost ? b : a));
    const resolved = decision.resolve(escalated(greedy.key));
    resolved.apply?.();
    expect(JSON.stringify(first.screenMemory)).not.toMatch(/hpGuard/);
    expect(first.screenMemory.combatPlan?.via ?? "deepseek").toBe("deepseek");
  });

  it("boss fight: a second potion in a turn is Jev's call, offered with its facts (1R3C F17 T1 is no longer code's auto-drink)", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    const enemies = combat["enemies"] as Record<string, unknown>[];
    combat["enemies"] = [{ ...enemies[0], enemy_id: "LAGAVULIN_MATRIARCH", current_hp: 150, max_hp: 222, intents: [{ index: 0, intent_type: "Attack", label: "7", damage: 7, hits: 1, total_damage: 7 }] }];
    const potions = (raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[];
    potions[1] = { ...potions[0], index: 1, potion_id: "ENTROPIC_BREW", name: "Entropic Brew", requires_target: false, valid_target_indices: [] };
    // No per-turn potion cap any more: the first and the second look of a turn are the same question.
    const decide = (_startCount: number) => planCombatTurn(env(raw, { combatPlanner: "turn" }));
    const usesPotion = (decision: Decision | null): boolean => {
      if (!decision) return false;
      if (decision.kind === "act") return decision.intent.action === "use_potion";
      const criteria = decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {};
      return Object.entries(criteria).some(([key, text]) => !key.startsWith("plan") || /potion/i.test(String(text)));
    };
    // First look this turn, and after one potion: potions are on the table (boss fight), never code's alone.
    expect(usesPotion(decide(2))).toBe(true);
    const after = decide(3);
    expect(usesPotion(after)).toBe(true);
    expect(after?.kind).toBe("ask");
  });
});

describe("in-combat card choices are for this turn (7Q5G T5: Bloodletting at 11 HP facing 28)", () => {
  const offered = (index: number, cardId: string, cost: number, dynamic: [string, number][]): Record<string, unknown> => ({
    index, selected: false, card_id: cardId, name: cardId, upgraded: false, card_type: "Skill", rarity: "Uncommon", costs_x: false, star_costs_x: false,
    energy_cost: cost, star_cost: 0, rules_text: "", resolved_rules_text: "", target_type: "Self", requires_target: false, valid_target_indices: [],
    dynamic_values: dynamic.map(([name, value]) => ({ name, base_value: value, current_value: value })),
  });
  const choice = (cards: Record<string, unknown>[]): Record<string, unknown> => {
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    (combat["player"] as Record<string, unknown>)["current_hp"] = 11;
    const enemies = combat["enemies"] as Record<string, unknown>[];
    combat["enemies"] = [{ ...enemies[0], intents: [{ index: 0, intent_type: "Attack", label: "28", damage: 28, hits: 1, total_damage: 28 }] }];
    return { ...raw, screen: "CARD_SELECTION", available_actions: ["select_deck_card"], selection: { kind: "choose_card_select", prompt: "选择一张牌", min_select: 1, max_select: 1, selected_count: 0, can_confirm: false, cards } };
  };

  it("code takes the card that blocks the incoming attack over the deck-building pick", async () => {
    const { planSelection } = await import("../src/screens/selection.js");
    const decision = planSelection(env(choice([
      offered(0, "BLOODLETTING", 0, [["HpLoss", 3], ["Energy", 2]]),
      offered(1, "IMPERVIOUS", 2, [["Block", 30]]),
      offered(2, "BATTLE_TRANCE", 0, [["Cards", 3]]),
    ]), { combatPlanner: "turn" }));
    expect(decision?.kind).toBe("act");
    if (decision?.kind !== "act") return;
    expect(decision.intent).toEqual({ action: "select_deck_card", option_index: 1 });
  });

  it("Headbutt puts a block card on top when next turn's hit is big (Y27B F33 T10)", async () => {
    const { planSelection } = await import("../src/screens/selection.js");
    const raw = choice([
      { ...offered(0, "POMMEL_STRIKE", 1, [["Damage", 9]]), card_type: "Attack", upgraded: true },
      offered(1, "FLAME_BARRIER", 2, [["Block", 12]]),
    ]);
    (raw["selection"] as Record<string, unknown>)["kind"] = "deck_card_select";
    (raw["selection"] as Record<string, unknown>)["prompt"] = "选择一张牌放到你的抽牌堆顶。";
    const combat = raw["combat"] as Record<string, unknown>;
    (combat["player"] as Record<string, unknown>)["current_hp"] = 36;
    const decision = planSelection(env(raw, { combatPlanner: "turn" }));
    expect(decision?.kind).toBe("act");
    if (decision?.kind !== "act") return;
    expect(decision.intent).toEqual({ action: "select_deck_card", option_index: 1 });
  });

  it("a close call goes to the model with a this-turn note", async () => {
    const { planSelection } = await import("../src/screens/selection.js");
    const decision = planSelection(env(choice([
      offered(0, "SHRUG_IT_OFF", 1, [["Block", 8], ["Cards", 1]]),
      offered(1, "TRUE_GRIT", 1, [["Block", 7]]),
    ]), { combatPlanner: "turn" }));
    if (decision?.kind !== "ask") throw new Error("expected an ask");
    expect(JSON.stringify(decision.questions)).toMatch(/only for this turn/);
    expect(JSON.stringify(decision.state)).toMatch(/incoming_attack/);
  });

  it("thisTurnScore: AoE counts every enemy, block past the attack counts little", async () => {
    const { thisTurnScore } = await import("../src/screens/selection.js");
    const { modelHandCard } = await import("../src/strategy/card-model.js");
    const aoe = modelHandCard({ index: 0, card_id: "THUNDERCLAP", energy_cost: 1, target_type: "AllEnemies", dynamic_values: [{ name: "Damage", base_value: 4, current_value: 4 }] }, 0, testKnowledge);
    expect(thisTurnScore(aoe, 0, 3)).toBe(12 - 2);
    const wall = modelHandCard({ index: 0, card_id: "IMPERVIOUS", energy_cost: 2, target_type: "Self", dynamic_values: [{ name: "Block", base_value: 30, current_value: 30 }] }, 0, testKnowledge);
    expect(thisTurnScore(wall, 10, 1)).toBe(Math.round(10 + 0.3 * 20 - 4));
  });
});

describe("Test Subject phases (2WUMK6PK5QHD)", () => {
  it("its powers are modelled: Enrage, Adaptable (revives), Painful Stabs wounds, Nemesis", async () => {
    const { enemySims } = await import("../src/screens/combat-plan.js");
    const [phase1] = enemySims({
      enemies: [
        {
          index: 0, enemy_id: "TEST_SUBJECT", name: "Test Subject", current_hp: 100, max_hp: 100, block: 0, is_alive: true,
          powers: [{ power_id: "ADAPTABLE_POWER", amount: 1 }, { power_id: "ENRAGE_POWER", amount: 2 }, { power_id: "PAINFUL_STABS_POWER", amount: 1 }, { power_id: "NEMESIS_POWER", amount: 1 }],
          intents: [{ intent_type: "Attack", damage: 20, hits: 1 }],
        },
      ],
    });
    expect(phase1!.unmodelled).toBe(false);
    expect(phase1!.enrage).toBe(2);
    expect(phase1!.revives).toBe(true);
    expect(phase1!.woundsPerHit).toBe(1);
  });

  it("Axebot's Stock is modelled: no unmodelled 20% damage cut, the revives are counted (U6W7 F39)", async () => {
    const { enemySims } = await import("../src/screens/combat-plan.js");
    const [axebot] = enemySims({
      enemies: [
        {
          index: 0, enemy_id: "AXEBOT", name: "Axebot", current_hp: 31, max_hp: 76, block: 0, is_alive: true,
          powers: [{ power_id: "STOCK_POWER", amount: 2 }],
          intents: [{ intent_type: "Attack", damage: 14, hits: 1 }, { intent_type: "Debuff" }],
        },
      ],
    });
    expect(axebot!.unmodelled).toBe(false);
    expect(axebot!.stock).toBe(2);
  });

  const reviveTurn = (hand: Record<string, unknown>[]): Record<string, unknown> => {
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    const enemies = combat["enemies"] as Record<string, unknown>[];
    combat["enemies"] = [{ ...enemies[0], enemy_id: "TEST_SUBJECT", current_hp: 0, max_hp: 200, is_alive: false, intents: [{ intent_type: "Heal" }, { intent_type: "Buff" }] }];
    (combat["player"] as Record<string, unknown>)["energy"] = 4;
    combat["hand"] = hand;
    return raw;
  };
  const inHand = (index: number, cardId: string, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    index, card_id: cardId, name: cardId, upgraded: false, target_type: "Self", requires_target: false, valid_target_indices: [], costs_x: false,
    energy_cost: 1, rules_text: "", resolved_rules_text: "", dynamic_values: [], playable: true, ...overrides,
  });
  const decideAfterSettle = async (raw: Record<string, unknown>): Promise<Decision | null> => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const e = env(raw, { combatPlanner: "turn" });
    e.screenMemory.noEnemiesSince = Date.now() - 5_000;
    return planCombatTurn(e);
  };

  it("revive turn (T9): True Grit+ exhausts a Wound before the turn ends", async () => {
    const decision = await decideAfterSettle(reviveTurn([
      inHand(0, "DEFEND_R", { dynamic_values: [{ name: "Block", base_value: 5, current_value: 5 }] }),
      inHand(1, "TRUE_GRIT", { upgraded: true, dynamic_values: [{ name: "Block", base_value: 9, current_value: 9 }] }),
      inHand(2, "WOUND", { playable: false, energy_cost: -1, target_type: "None" }),
      inHand(3, "WOUND", { playable: false, energy_cost: -1, target_type: "None" }),
      inHand(4, "STRIKE_R", { target_type: "AnyEnemy", requires_target: true, energy_cost: 0 }),
    ]));
    expect(decision?.kind).toBe("act");
    if (decision?.kind !== "act") return;
    expect(decision.label).toBe("combat/phase-setup");
    expect(decision.intent).toEqual({ action: "play_card", card_index: 1 });
  });

  it("revive turn: a power is played; with nothing of value the turn ends", async () => {
    const withPower = await decideAfterSettle(reviveTurn([inHand(0, "DEFEND_R"), inHand(1, "INFLAME")]));
    expect(withPower?.kind === "act" && withPower.intent).toEqual({ action: "play_card", card_index: 1 });
    // Unupgraded True Grit exhausts at random: not with a Defend beside the Wound.
    const nothing = await decideAfterSettle(reviveTurn([inHand(0, "DEFEND_R"), inHand(1, "TRUE_GRIT"), inHand(2, "WOUND", { playable: false, energy_cost: -1 })]));
    expect(nothing?.kind === "act" && nothing.intent).toEqual({ action: "end_turn" });
  });
});

describe("Waterfall Giant kill speed (1ZQJXQ53KSBG)", () => {
  const giant = (hp: number, eruption: number): Record<string, unknown> => ({
    enemy_id: "WATERFALL_GIANT", is_alive: true, current_hp: hp, max_hp: 240, powers: eruption > 0 ? [{ power_id: "STEAM_ERUPTION_POWER", amount: eruption }] : [],
  });

  it("races when the projected eruption at death reaches HP plus a hand of block", async () => {
    const { eruptionRace } = await import("../src/screens/combat-plan.js");
    // T9, 160 HP left after 80 dealt in 8 turns: 16 more turns, eruption 36 + 48 = 84 vs 40 HP + 12.
    expect(eruptionRace(giant(160, 36), 40, 9)).toBe(true);
    // A fast deck: 150 dealt in 4 turns, 90 left = 3 turns, eruption 24 + 9 = 33 vs 50 + 12.
    expect(eruptionRace(giant(90, 24), 50, 5)).toBe(false);
    // T1 (16 a turn assumed): 15 turns, 12 + 45 = 57 vs 80 + 12.
    expect(eruptionRace(giant(240, 0), 80, 1)).toBe(false);
    // The husk after "death" is not raced.
    expect(eruptionRace({ ...giant(999_999_999, 40), max_hp: 999_999_999 }, 10, 12)).toBe(false);
  });
});

describe("Gambler's Brew: discard any number (1ZQJ T4: confirmed with 0 selected)", () => {
  const brew = (hand: Record<string, unknown>[], selectedIndices: number[] = [], intents: Record<string, unknown>[] = [{ intent_type: "Heal" }, { intent_type: "Buff" }]): Record<string, unknown> => {
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    (combat["player"] as Record<string, unknown>)["energy"] = 2;
    const enemies = combat["enemies"] as Record<string, unknown>[];
    combat["enemies"] = [{ ...enemies[0], intents }];
    combat["hand"] = hand;
    const cards = hand.map((card) => ({ ...card, selected: selectedIndices.includes(Number(card["index"])) }));
    return {
      ...raw,
      screen: "CARD_SELECTION",
      available_actions: ["select_deck_card", "confirm_selection"],
      selection: { kind: "combat_hand_select", prompt: "[center]选择任意张牌进行替换。[/center]", min_select: 0, max_select: 999999999, selected_count: selectedIndices.length, can_confirm: true, cards },
    };
  };
  const c = (index: number, cardId: string, dynamic: [string, number][] = [], overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    index, card_id: cardId, name: cardId, upgraded: false, target_type: cardId.startsWith("STRIKE") ? "AnyEnemy" : "Self", requires_target: cardId.startsWith("STRIKE"),
    valid_target_indices: [0], costs_x: false, energy_cost: 1, rules_text: "", resolved_rules_text: "", playable: true,
    dynamic_values: dynamic.map(([name, value]) => ({ name, base_value: value, current_value: value })), ...overrides,
  });
  const hand = [
    c(0, "STRIKE_R", [["Damage", 6]]),
    c(1, "DEFEND_R", [["Block", 5]]),
    c(2, "PILLAGE", [["Damage", 6]]),
    c(3, "COLOSSUS", [["Block", 4]]),
    c(4, "DEFEND_R", [["Block", 5]]),
  ];
  const pick = async (raw: Record<string, unknown>): Promise<Decision | null> => {
    const { planSelection } = await import("../src/screens/selection.js");
    return planSelection(env(raw, { combatPlanner: "turn" }));
  };

  it("no attack coming: discards the Defends and Colossus, then confirms", async () => {
    const picked: number[] = [];
    for (let step = 0; step < 6; step += 1) {
      const decision = await pick(brew(hand, picked));
      if (decision?.kind !== "act") throw new Error("expected an act");
      if (decision.intent.action === "confirm_selection") break;
      picked.push(Number(decision.intent.option_index));
    }
    expect(picked.sort()).toEqual([1, 3, 4]);
  });

  it("Status/Curse and unplayable cards go first; a hand worth keeping is confirmed as is", async () => {
    const first = await pick(brew([c(0, "STRIKE_R", [["Damage", 6]]), c(1, "WOUND", [], { playable: false, energy_cost: -1, unplayable_reason: "unplayable" })]));
    expect(first?.kind === "act" && first.intent).toEqual({ action: "select_deck_card", option_index: 1 });
    const attack = [{ intent_type: "Attack", damage: 12, hits: 1 }];
    const keep = await pick(brew([c(0, "STRIKE_R", [["Damage", 6]]), c(1, "DEFEND_R", [["Block", 5]])], [], attack));
    expect(keep?.kind === "act" && keep.intent).toEqual({ action: "confirm_selection" });
  });

  it("the combat plan's Gambler's Brew discards come first, then the selection is confirmed (77UJ F33 T5)", async () => {
    const { planSelection } = await import("../src/screens/selection.js");
    const attack = [{ intent_type: "Attack", damage: 12, hits: 1 }];
    const picked: number[] = [];
    for (let step = 0; step < 4; step += 1) {
      const raw = brew(hand, picked, attack);
      const e = env(raw, { combatPlanner: "turn" });
      e.screenMemory.gambleDiscards = { turn: e.state.turn, cardIds: ["STRIKE_R", "PILLAGE"] };
      const decision = planSelection(e);
      if (decision?.kind !== "act") throw new Error("expected an act");
      if (decision.intent.action === "confirm_selection") break;
      picked.push(Number(decision.intent.option_index));
    }
    expect(picked.sort()).toEqual([0, 2]);
  });

  it("basics the energy cannot reach are redrawn", async () => {
    const attack = [{ intent_type: "Attack", damage: 12, hits: 1 }];
    const decision = await pick(brew([
      c(0, "POMMEL_STRIKE", [["Damage", 9], ["Cards", 1]], { target_type: "AnyEnemy", requires_target: true }),
      c(1, "SHRUG_IT_OFF", [["Block", 8], ["Cards", 1]]),
      c(2, "STRIKE_R", [["Damage", 6]]),
    ], [], attack));
    expect(decision?.kind === "act" && decision.intent).toEqual({ action: "select_deck_card", option_index: 2 });
  });
});

describe("sleeping Matriarch through the whole plan path (1K5G F17 T1: a dominance switch woke it)", () => {
  const card = (index: number, cardId: string, cost: number, dynamic: [string, number][], self = false): Record<string, unknown> => ({
    index, card_id: cardId, name: cardId, upgraded: false, target_type: self ? "Self" : "AnyEnemy", requires_target: !self, costs_x: false, star_costs_x: false,
    energy_cost: cost, star_cost: 0, rules_text: "", resolved_rules_text: "", playable: cost >= 0, unplayable_reason: cost >= 0 ? null : "unplayable",
    can_play_result: cost >= 0, target_index_space: "combat.enemies[].index", valid_target_indices: self ? [] : [0],
    dynamic_values: dynamic.map(([name, value]) => ({ name, base_value: value, current_value: value })),
  });
  const board = (): Record<string, unknown> => {
    const raw = combatPayload();
    raw["turn"] = 1;
    (raw["run"] as Record<string, unknown>)["floor"] = 17;
    // Clarity (unmodelled) as in the live run; the Fire Potion slot emptied.
    const potions = (raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[];
    potions[0]!["can_use"] = false;
    const combat = raw["combat"] as Record<string, unknown>;
    combat["player"] = { ...(combat["player"] as Record<string, unknown>), current_hp: 53, max_hp: 67 };
    combat["hand"] = [
      card(0, "PILLAGE", 1, [["Damage", 6]]),
      card(1, "TAUNT", 1, [["Block", 8], ["VulnerablePower", 1]]),
      card(2, "SPOILS_MAP", -1, [["Gold", 600]], true),
      card(3, "DEFEND_R", 1, [["Block", 5]], true),
      card(4, "SETUP_STRIKE", 1, [["Damage", 7], ["StrengthPower", 3]]),
      card(5, "EXPECT_A_FIGHT", 3, [["Block", 15]], true),
    ];
    combat["enemies"] = [{
      index: 0, enemy_id: "LAGAVULIN_MATRIARCH", name: "Lagavulin Matriarch", current_hp: 222, max_hp: 222, block: 12, is_alive: true, is_hittable: true,
      powers: [{ index: 0, power_id: "PLATING_POWER", amount: 12, is_debuff: false }, { index: 1, power_id: "ASLEEP_POWER", amount: 3, is_debuff: false }],
      intent: "SLEEP_MOVE", move_id: "SLEEP_MOVE",
      intents: [{ index: 0, intent_type: "Sleep", label: null, damage: null, hits: null, total_damage: null, status_card_count: null }],
    }];
    return raw;
  };

  it("PYTG F17 T2: lines that wake it are not offered to Jev at all (Jev took the waking rank 2 at 0.69)", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const raw = board();
    raw["turn"] = 2;
    const potions = (raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[];
    potions[0]!["can_use"] = true;
    potions[0]!["potion_id"] = "ENTROPIC_BREW";
    const combat = raw["combat"] as Record<string, unknown>;
    combat["hand"] = [
      card(0, "POMMEL_STRIKE", 1, [["Damage", 9]]),
      card(1, "TAUNT", 1, [["Block", 7], ["VulnerablePower", 1]]),
      card(2, "STRIKE_R", 1, [["Damage", 6]]),
    ];
    const decision = planCombatTurn(env(raw, { combatPlanner: "turn" }));
    if (!decision) throw new Error("expected a decision");
    if (decision.kind !== "ask") throw new Error(`expected an ask (boss + potion), got ${decision.rationale}`);
    const criteria = decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {};
    const plans = Object.entries(criteria).filter(([key]) => key.startsWith("plan"));
    expect(plans.length).toBeGreaterThan(0);
    for (const [, text] of plans) expect(JSON.parse(String(text))["wakes_sleeping_enemy"]).toBeUndefined();
  });

  it("the committed (or top-ranked) line leaves it asleep", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const e = env(board(), { combatPlanner: "turn" });
    const decision = planCombatTurn(e);
    if (!decision) throw new Error("expected a decision");
    if (decision.kind === "act") {
      expect(decision.rationale).toMatch(/dmg 0\b/);
    } else {
      const criteria = decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {};
      expect(JSON.parse(String(criteria["plan1"]))["damage_dealt"]).toBe(0);
    }
  });

  it("a line that wakes it is never shown as dominating one that does not", async () => {
    const { solveTurn, distinctPlans, dominates } = await import("../src/strategy/turn-solver.js");
    const { modelHandCard } = await import("../src/strategy/card-model.js");
    const combat = board()["combat"] as Record<string, unknown>;
    const hand = (combat["hand"] as unknown[]).map((entry, index) => modelHandCard(entry, index, testKnowledge));
    const result = solveTurn({
      hand,
      player: { hp: 53, maxHp: 67, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false },
      enemies: [{ index: 0, name: "Lagavulin Matriarch", hp: 222, maxHp: 222, block: 12, vulnerable: 0, weak: 0, artifact: 0, intangible: false, asleep: 3, attacks: [] }],
      fightKind: "boss",
      turn: 1,
    });
    const best = result.plans[0]!;
    expect(best.outcome.sleepCost).toBe(0);
    const waking = result.plans.filter((plan) => plan.outcome.sleepCost > 0);
    expect(waking.length).toBeGreaterThan(0);
    for (const plan of waking) expect(dominates(plan, best)).toBe(false);
    expect(distinctPlans(result.plans.filter((plan) => !plan.outcome.dies), 4)).toContain(best);
  });
});

describe("Vigor is spent by the first Attack (KFP1 F17 T1: Akabeko's 8 counted on every hit, 54 planned, 18 dealt)", () => {
  const card = (index: number, cardId: string, cost: number, dynamic: [string, number, number][], target = "AnyEnemy"): Record<string, unknown> => ({
    index, card_id: cardId, name: cardId, upgraded: cardId === "BASH", target_type: target, requires_target: target === "AnyEnemy", costs_x: false, star_costs_x: false,
    energy_cost: cost, star_cost: 0, rules_text: target === "RandomEnemy" ? "随机对敌人造成{Damage:diff()}点伤害{Repeat:diff()}次。" : "", resolved_rules_text: "", playable: true, unplayable_reason: null,
    can_play_result: true, target_index_space: "combat.enemies[].index", valid_target_indices: target === "AnyEnemy" ? [0] : [],
    dynamic_values: dynamic.map(([name, base, current]) => ({ name, base_value: base, current_value: current })),
  });
  // The live T1 hand: every Attack shows +8 (Strike 14, Bash+ 18, Sword Boomerang 11x3).
  const board = (): Record<string, unknown> => {
    const raw = combatPayload();
    raw["turn"] = 1;
    (raw["run"] as Record<string, unknown>)["floor"] = 17;
    const potions = (raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[];
    potions[0]!["can_use"] = false;
    const combat = raw["combat"] as Record<string, unknown>;
    combat["player"] = { ...(combat["player"] as Record<string, unknown>), current_hp: 73, max_hp: 80, powers: [{ index: 0, power_id: "VIGOR_POWER", name: "活力", amount: 8, is_debuff: false }] };
    combat["hand"] = [
      card(0, "STRIKE_R", 1, [["Damage", 6, 14]]),
      card(1, "BASH", 2, [["Damage", 10, 18], ["VulnerablePower", 3, 3]]),
      card(2, "DEFEND_R", 1, [["Block", 5, 10]], "Self"),
      card(3, "DEFEND_R", 1, [["Block", 5, 10]], "Self"),
      card(4, "SWORD_BOOMERANG", 1, [["Damage", 3, 11], ["Repeat", 3, 3]], "RandomEnemy"),
    ];
    combat["enemies"] = [{
      index: 0, enemy_id: "LAGAVULIN_MATRIARCH", name: "Lagavulin Matriarch", current_hp: 222, max_hp: 222, block: 12, is_alive: true, is_hittable: true,
      powers: [{ index: 0, power_id: "PLATING_POWER", amount: 12, is_debuff: false }, { index: 1, power_id: "ASLEEP_POWER", amount: 3, is_debuff: false }],
      intent: "SLEEP_MOVE", move_id: "SLEEP_MOVE",
      intents: [{ index: 0, intent_type: "Sleep", label: null, damage: null, hits: null, total_damage: null, status_card_count: null }],
    }];
    return raw;
  };

  it("Bash+ then Sword Boomerang deals the real 18, and letting it sleep ranks first", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const { solveTurn } = await import("../src/strategy/turn-solver.js");
    const { modelHandCard, stripVigor } = await import("../src/strategy/card-model.js");
    const combat = board()["combat"] as Record<string, unknown>;
    const hand = (combat["hand"] as unknown[]).map((entry, index) => modelHandCard(entry, index, testKnowledge));
    stripVigor(hand, 8, false);
    expect(hand.map((entry) => entry.damage)).toEqual([6, 10, null, null, 3]);
    const result = solveTurn({
      hand,
      player: { hp: 73, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, vigor: 8 },
      enemies: [{ index: 0, name: "Lagavulin Matriarch", hp: 222, maxHp: 222, block: 12, vulnerable: 0, weak: 0, artifact: 0, intangible: false, asleep: 3, attacks: [] }],
      fightKind: "boss",
      turn: 1,
    });
    const waking = result.plans.find((plan) => plan.steps.map((step) => step.cardId).join(",") === "BASH,SWORD_BOOMERANG")!;
    // Bash+ 10 + 8 Vigor into 12 Plating block: 6; then 3 x floor(3 x 1.5) = 12.
    expect(waking.outcome.damageDealt).toBe(18);
    expect(waking.outcome.sleepCost).toBeGreaterThan(0);
    const best = result.plans[0]!;
    expect(best.outcome.sleepCost).toBe(0);
    expect(best.score).toBeGreaterThan(waking.score);

    const decision = planCombatTurn(env(board(), { combatPlanner: "turn" }));
    if (!decision) throw new Error("expected a decision");
    if (decision.kind === "act") {
      expect(decision.rationale).toMatch(/dmg 0\b/);
    } else {
      const criteria = decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {};
      expect(JSON.parse(String(criteria["plan1"]))["damage_dealt"]).toBe(0);
    }
  });

  it("the first Attack's first hit carries the Vigor, later hits and Attacks do not", async () => {
    const { solveTurn } = await import("../src/strategy/turn-solver.js");
    const { modelHandCard, stripVigor } = await import("../src/strategy/card-model.js");
    const hand = [
      modelHandCard(card(0, "STRIKE_R", 1, [["Damage", 6, 14]]), 0, testKnowledge),
      modelHandCard(card(1, "STRIKE_R", 1, [["Damage", 6, 14]]), 1, testKnowledge),
    ];
    stripVigor(hand, 8, false);
    const result = solveTurn({
      hand,
      player: { hp: 50, maxHp: 80, block: 0, energy: 2, weak: false, vulnerable: false, intangible: false, vigor: 8 },
      enemies: [{ index: 0, name: "Jaw Worm", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 5, hits: 1 }] }],
      fightKind: "monster",
    });
    expect(result.plans.find((plan) => plan.steps.length === 2)!.outcome.damageDealt).toBe(14 + 6);
    expect(result.plans.find((plan) => plan.steps.length === 1)!.outcome.damageDealt).toBe(14);
  });
});

describe("least-loss draws first when every line dies (VP5F F48 T8: 12 HP, 0-cost Battle Trance+ left in hand)", () => {
  const card = (index: number, cardId: string, cost: number, dynamic: [string, number][], self = false): Record<string, unknown> => ({
    index, card_id: cardId, name: cardId, upgraded: false, target_type: self ? "Self" : "AnyEnemy", requires_target: !self, costs_x: false, star_costs_x: false,
    energy_cost: cost, star_cost: 0, rules_text: "", resolved_rules_text: "", playable: true, unplayable_reason: null,
    can_play_result: true, target_index_space: "combat.enemies[].index", valid_target_indices: self ? [] : [0],
    dynamic_values: dynamic.map(([name, value]) => ({ name, base_value: value, current_value: value })),
  });
  const board = (withTrance: boolean): Record<string, unknown> => {
    const raw = combatPayload();
    raw["turn"] = 8;
    const potions = (raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[];
    potions[0]!["can_use"] = false;
    const combat = raw["combat"] as Record<string, unknown>;
    combat["player"] = { ...(combat["player"] as Record<string, unknown>), current_hp: 12, max_hp: 94, energy: 3, powers: [{ index: 0, power_id: "STRENGTH_POWER", amount: 20, is_debuff: false }] };
    combat["hand"] = [
      card(0, "BASH", 2, [["Damage", 28], ["VulnerablePower", 2]]),
      card(1, "DEFEND_R", 1, [["Block", 5]], true),
      card(2, "STRIKE_R", 1, [["Damage", 26]]),
      ...(withTrance ? [card(3, "BATTLE_TRANCE", 0, [["Cards", 4]], true)] : []),
    ];
    combat["enemies"] = [{
      index: 0, enemy_id: "TEST_SUBJECT", name: "Test Subject", current_hp: 127, max_hp: 200, block: 0, is_alive: true, is_hittable: true,
      powers: [
        { index: 0, power_id: "ADAPTABLE_POWER", amount: 1, is_debuff: false },
        { index: 1, power_id: "PAINFUL_STABS_POWER", amount: 1, is_debuff: false },
        { index: 2, power_id: "VULNERABLE_POWER", amount: 1, is_debuff: true },
      ],
      intent: "MULTI_CLAW_MOVE", move_id: "MULTI_CLAW_MOVE",
      intents: [{ index: 0, intent_type: "Attack", label: "10x5", damage: 10, hits: 5, total_damage: 50, status_card_count: null }],
    }];
    combat["end_turn_will_kill_player"] = true;
    return raw;
  };

  it("plays the 0-cost draw first, then re-plans", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const e = env(board(true), { combatPlanner: "turn" });
    const decision = planCombatTurn(e);
    expect(decision?.kind).toBe("act");
    if (decision?.kind !== "act") return;
    expect(decision.label).toBe("combat/least-loss");
    expect(decision.intent).toEqual({ action: "play_card", card_index: 3 });
    // Nothing committed past the draw: the drawn cards are planned with.
    expect(e.screenMemory.combatPlan).toBeNull();
  });

  it("a paid draw over the block that only delays death (Pommel Strike over Defend at 1 energy)", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const raw = board(false);
    const combat = raw["combat"] as Record<string, unknown>;
    (combat["player"] as Record<string, unknown>)["energy"] = 1;
    combat["hand"] = [card(0, "DEFEND_R", 1, [["Block", 5]], true), card(1, "POMMEL_STRIKE", 1, [["Damage", 29], ["Cards", 1]])];
    const decision = planCombatTurn(env(raw, { combatPlanner: "turn" }));
    expect(decision?.kind === "act" && decision.label).toBe("combat/least-loss");
    expect(decision?.kind === "act" && decision.intent).toEqual({ action: "play_card", card_index: 1, target_index: 0 });
  });

  it("without a draw card it still keeps the most HP", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const decision = planCombatTurn(env(board(false), { combatPlanner: "turn" }));
    expect(decision?.kind === "act" && decision.label).toBe("combat/least-loss");
    expect(decision?.kind === "act" && decision.rationale).toMatch(/keeps the most HP/);
  });

  it("a phase kill is no death: the revive turn has no attack", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const raw = board(true);
    const enemies = (raw["combat"] as Record<string, unknown>)["enemies"] as Record<string, unknown>[];
    enemies[0]!["current_hp"] = 60;
    const decision = planCombatTurn(env(raw, { combatPlanner: "turn" }));
    expect(decision?.kind === "act" && decision.label).not.toBe("combat/least-loss");
  });
});

describe("draw pile from agent_view (XPA4 T8: 3 Beckons in a 6-card draw pile)", () => {
  it("expands grouped lines and reads the held penalty; falls back to the discard pile", async () => {
    const { drawPileCards } = await import("../src/screens/combat-plan.js");
    const view = (draw: unknown[], discard: unknown[] = []) => ({ agent_view: { combat: { draw, discard } } });
    const beckon = { line: "呼唤*3 [1费]：在你的回合结束时，如果这张牌在你的手牌中， 你失去6点生命。", card_ids: ["BECKON"] };
    const strike = { line: "打击*2 [1费]：造成6点伤害。", card_ids: ["STRIKE_IRONCLAD"] };
    const map = { line: "藏宝图 [-1费]：不能被打出。 在下一阶段的地图上，标记一个有600额外金币的地点。", card_ids: ["SPOILS_MAP"] };
    const pile = drawPileCards(view([beckon, strike, map]))!;
    expect(pile).toHaveLength(6);
    expect(pile.filter((card) => card.heldPenalty === 6)).toHaveLength(3);
    expect(pile.filter((card) => !card.playable)).toHaveLength(1);
    expect(drawPileCards(view([], [strike]))).toHaveLength(2);
    expect(drawPileCards({})).toBeUndefined();
    // Block cards are marked (a quiet turn gives them no draw value, JGJS F24 T1).
    const defend = { line: "防御*3 [1费]：获得5点格挡。", card_ids: ["DEFEND_IRONCLAD"] };
    const ironWave = { line: "铁斩波 [1费]：获得5点格挡。 造成5点伤害。", card_ids: ["IRON_WAVE"] };
    const marked = drawPileCards(view([defend, ironWave, strike]))!;
    expect(marked.filter((card) => card.block)).toHaveLength(3);
  });
});

describe("turnStartAoe (9XZX: Inferno 6 at each turn start killed a 3 HP Crusher)", () => {
  it("adds Mercury Hourglass and the INFERNO_POWER amount", async () => {
    const { turnStartAoe } = await import("../src/screens/combat-plan.js");
    const inferno = { powers: [{ power_id: "INFERNO_POWER", amount: 6 }] };
    expect(turnStartAoe([], {})).toBe(0);
    expect(turnStartAoe(["MERCURY_HOURGLASS"], {})).toBe(3);
    expect(turnStartAoe([], inferno)).toBe(6);
    expect(turnStartAoe(["MERCURY_HOURGLASS"], inferno)).toBe(9);
    // A Crimson Mantle's HP loss at the turn start is a second Inferno trigger.
    expect(turnStartAoe([], { powers: [...inferno.powers, { power_id: "CRIMSON_MANTLE_POWER", amount: 7 }] })).toBe(12);
  });
});

describe("ramping enemies count as scaling (6A36: Sludge Spinner, Rage +3 Strength, damage weight stayed at 0.45)", () => {
  const spinner = (enemyId: string, powers: { power_id: string; amount: number }[] = []) => ({
    index: 0, enemy_id: enemyId, name: enemyId, current_hp: 38, max_hp: 38, block: 0, is_alive: true, powers,
    intents: [{ index: 0, intent_type: "Attack", damage: 11, hits: 1 }],
  });

  it("any Strength makes it scaling; a Buff move elsewhere in the cycle alone does not", async () => {
    const { enemySims } = await import("../src/screens/combat-plan.js");
    expect(enemySims({ enemies: [spinner("SLUDGE_SPINNER", [{ power_id: "STRENGTH_POWER", amount: 3 }])] })[0]!.scaling).toBe(true);
    expect(enemySims({ enemies: [spinner("NOT_A_KNOWN_ENEMY", [{ power_id: "STRENGTH_POWER", amount: 3 }])] })[0]!.scaling).toBe(true);
    expect(enemySims({ enemies: [spinner("NOT_A_KNOWN_ENEMY")] })[0]!.scaling).toBe(false);
  });
});

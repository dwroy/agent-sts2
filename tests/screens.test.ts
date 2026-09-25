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
import { nodeWeight } from "../src/screens/map.js";
import { rememberMap } from "../src/screens/rest.js";
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
    const decision = mustDecision(plan(mapPayload()));
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
    // Monster -> Elite: the elite is reached at ~75%, where it is worth 0, not +4.
    expect(value("n0")).toBeCloseTo(1.2);
    expect(value("n1")).toBeCloseTo(2.4);
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
    expect([1, 2, 3].map((act) => fightHpCost("Monster", act))).toEqual([0.1, 0.14, 0.18]);
    expect(fightHpCost("Elite", 3)).toBeCloseTo(0.36);
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

  it("says the offers were below the skip bar instead of 'only one legal option' (0NG Act 2)", () => {
    const raw = rewardCardPayload();
    const reward = raw["reward"] as Record<string, unknown>;
    reward["card_options"] = [
      { index: 0, card_id: "HAVOC", name: "Havoc", upgraded: false, rules_text: "", resolved_rules_text: "", dynamic_values: [] },
      { index: 1, card_id: "TANK", name: "Tank", upgraded: false, rules_text: "", resolved_rules_text: "", dynamic_values: [] },
    ];
    const decision = mustDecision(plan(raw, { combatPlanner: "turn" }));
    expect(decision.kind).toBe("act");
    if (decision.kind !== "act") return;
    expect(decision.intent).toEqual({ action: "skip_reward_cards" });
    expect(decision.rationale).toMatch(/^all offers below skip bar 50 \(Havoc .*\d+, Tank .*\d+\)$/);
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

  it("HP guard: an 8+ max-HP cost is not offered (1K5G F8: -13 max HP for Fresnel Lens)", () => {
    const decision = mustDecision(plan(hpEvent(60, 80, [["Bottle", "获得一瓶[aqua]发光水[/aqua]。"], ["Climb", "获得[gold]菲涅耳透镜[/gold]。失去[red]13[/red]点最大生命。"]])));
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "choose_event_option", option_index: 0 });
  });

  it("HP guard: no HP paid right before a forced elite (XPA4 F14: -8 HP, then -17 at the elite), or below half HP", () => {
    const options: [string, string][] = [["Relic", "失去8点生命。获得一件被遗忘的旧日遗物。"], ["Potion", "获得1瓶随机药水。"], ["Leave", "离开。"]];
    const forced = mustDecision(plan(hpEvent(62, 80, options), { screenMemory: mapBefore("Elite") }));
    expect(shown(forced)).toEqual(["o1", "o2"]);
    expect(shown(mustDecision(plan(hpEvent(62, 80, options), { screenMemory: mapBefore("Monster") })))).toEqual(["o0", "o1", "o2"]);
    // 45 - 8 = 37 < 40: out whatever comes next.
    expect(shown(mustDecision(plan(hpEvent(45, 80, options))))).toEqual(["o1", "o2"]);
  });

  it("HP guard: on Act 1 floors 1-3 an HP cost of 20%+ of max HP is out (6A36 F1: Loose Shears -16 at 64/80)", () => {
    const options: [string, string][] = [
      ["Oyster", "获得[blue]11[/blue]点最大生命值。"],
      ["Holster", "获得[blue]1[/blue]个药水栏位并获得[blue]2[/blue]瓶随机[gold]药水[/gold]。"],
      ["Shears", "从你的[gold]牌组[/gold]中移除[blue]2[/blue]张牌，然后失去[red]16[/red]点生命。"],
    ];
    // 64 - 16 = 48 is above half: only the early-floor rule takes it out.
    expect(shown(mustDecision(plan(hpEvent(64, 80, options, 1))))).toEqual(["o0", "o1"]);
    expect(shown(mustDecision(plan(hpEvent(64, 80, options, 14))))).toEqual(["o0", "o1", "o2"]);
    // 15 of 80 is under 20%: still offered on floor 2.
    const smaller: [string, string][] = [options[0]!, ["Mushroom", "失去[red]15[/red]点生命，然后随机[gold]升级[/gold][blue]2[/blue]张牌。"]];
    expect(shown(mustDecision(plan(hpEvent(64, 80, [...smaller, options[1]!], 2))))).toEqual(["o0", "o1", "o2"]);
  });

  it("HP guard: nothing is removed when every option costs HP", () => {
    const decision = mustDecision(plan(hpEvent(30, 80, [["A", "失去5点生命。获得65金币。"], ["B", "变化你的1张打击和1张防御，然后失去12点最大生命。"]])));
    expect(shown(decision)).toEqual(["o0", "o1"]);
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

  it("heals before a forced elite like before a boss (G8AQ F24: 49/80, the only exit was an Elite)", () => {
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
    expect(forced.kind).toBe("act");
    if (forced.kind === "act") expect(forced.intent).toEqual({ action: "choose_rest_option", option_index: 0 });
    // A Monster next: 61% is not low enough to heal outright, the model is asked.
    expect(mustDecision(plan(raw, { combatPlanner: "turn", screenMemory: map("Monster") })).kind).toBe("ask");
    // A map from another floor (stale memory) says nothing.
    const stale = map("Elite");
    stale.lastMap!.floor = 20;
    expect(mustDecision(plan(raw, { combatPlanner: "turn", screenMemory: stale })).kind).toBe("ask");
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
    const decision = planCombatTurn(env(sandpitCombat(1, 1), { combatPlanner: "turn" }));
    expect(decision && decision.kind === "act" ? decision.intent : null).toEqual({ action: "play_card", card_index: 1 });
  });

  it("shows enemy powers (the Sandpit countdown) in the plan-choice question", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const raw = sandpitCombat(2, 1);
    const enemy = ((raw["combat"] as Record<string, unknown>)["enemies"] as Record<string, unknown>[])[0]!;
    enemy["intents"] = [{ index: 0, intent_type: "Attack", label: "20x2", damage: 20, hits: 2, total_damage: 40 }];
    // An unmodelled potion on a dangerous turn: the plan goes to Jev.
    ((raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[])[0]!["potion_id"] = "LIQUID_MEMORIES";
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
    ((raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[])[0]!["potion_id"] = "LIQUID_MEMORIES";
    return raw;
  };

  it("HP guard: a plan losing far more HP than the cheapest one is replaced (DeepSeek 'HP buffer is comfortable')", async () => {
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
    expect(resolved.guard?.kind).toBe("hp");
    expect(resolved.guard?.choice).not.toBe(greedy.key);
    const used = plans.find((entry) => entry.key === resolved.guard?.choice)!;
    expect(used.hpLost).toBeLessThanOrEqual(minLoss + 6);
    expect(resolved.rationale).toMatch(/HP guard/);
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
    const low = planCombatTurn(env(pressedCombat(25, "LIQUID_MEMORIES"), { combatPlanner: "turn" }));
    expect(low?.label).toBe("combat/plan-choice+potion");
    const high = planCombatTurn(env(pressedCombat(55, "LIQUID_MEMORIES"), { combatPlanner: "turn" }));
    expect(high?.label).not.toBe("combat/plan-choice+potion");
  });

  it("a modelled potion costs nothing to use below 40% HP against two attackers", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    // Fire Potion's 20 damage is worth less than the hallway use cost of 15; at low HP it is free.
    const drinks = (hp: number): boolean => {
      const e = env(pressedCombat(hp, "FIRE_POTION"), { combatPlanner: "turn" });
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
    const low = planCombatTurn(env(costlyCombat(22, 8, "LIQUID_MEMORIES"), { combatPlanner: "turn" }));
    expect(low?.label).toBe("combat/plan-choice+potion");
    const high = planCombatTurn(env(costlyCombat(60, 8, "LIQUID_MEMORIES"), { combatPlanner: "turn" }));
    expect(high?.label).not.toBe("combat/plan-choice+potion");
  });

  it("a modelled potion is free when the min-loss line loses 30% of current HP", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const drinks = (hp: number, damage: number): boolean => {
      const e = env(costlyCombat(hp, damage, "FIRE_POTION"), { combatPlanner: "turn" });
      const decision = planCombatTurn(e);
      if (decision?.kind === "act") return decision.intent.action === "use_potion" || (e.screenMemory.combatPlan?.remaining ?? []).some((step) => step.cardId.startsWith("POTION:"));
      const criteria = decision?.kind === "ask" && decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {};
      return String(criteria["plan1"]).includes("Fire Potion");
    };
    // 50 HP against 22: Defend still loses 17 (34%).
    expect(drinks(50, 22)).toBe(true);
    // 50 HP against 8: Defend loses 3.
    expect(drinks(50, 8)).toBe(false);
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
    ((raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[])[0]!["potion_id"] = "LIQUID_MEMORIES";
    return raw;
  };
  const planLosses = (decision: Decision): { key: string; hpLost: number }[] => {
    const criteria = decision.kind === "ask" && decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {};
    return Object.entries(criteria)
      .filter(([key]) => key.startsWith("plan"))
      .map(([key, text]) => ({ key, hpLost: Number(JSON.parse(String(text))["hp_lost"]) }));
  };
  const escalated = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: { escalated: "deepseek" } } }) as AnswerSet;

  it("HP guard slack: max(4, 10% HP) in boss/elite fights, max(6, 20%) otherwise, 0 past the fight budget", async () => {
    const { hpGuardSlack, HP_GUARD_FIGHT_BUDGET } = await import("../src/screens/combat-plan.js");
    expect(hpGuardSlack(30, "boss")).toBe(4);
    expect(hpGuardSlack(70, "elite")).toBe(7);
    expect(hpGuardSlack(30, "monster")).toBe(6);
    expect(hpGuardSlack(70)).toBe(14);
    expect(hpGuardSlack(70, "boss", HP_GUARD_FIGHT_BUDGET)).toBe(7);
    expect(hpGuardSlack(70, "boss", HP_GUARD_FIGHT_BUDGET + 1)).toBe(0);
    expect(hpGuardSlack(70, "monster", HP_GUARD_FIGHT_BUDGET + 1)).toBe(0);
  });

  it("boss fight: a choice more than 4 HP over the cheapest plan is replaced", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const decision = planCombatTurn(env(guardCombat("LAGAVULIN_MATRIARCH"), { combatPlanner: "turn" }));
    if (decision?.kind !== "ask") throw new Error("expected an ask");
    const plans = planLosses(decision);
    const minLoss = Math.min(...plans.map((entry) => entry.hpLost));
    const greedy = plans.reduce((a, b) => (b.hpLost > a.hpLost ? b : a));
    expect(greedy.hpLost - minLoss).toBeGreaterThan(4);
    const resolved = decision.resolve(escalated(greedy.key));
    expect(resolved.guard?.kind).toBe("hp");
    expect(plans.find((entry) => entry.key === resolved.guard?.choice)!.hpLost).toBeLessThanOrEqual(minLoss + 4);
  });

  it("tracks the extra HP accepted in a fight, and past 12 plays the cheapest plan (Z2H3 T7/T8: the trade split across re-plans)", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const first = env(guardCombat(), { combatPlanner: "turn" });
    const decision = planCombatTurn(first);
    if (decision?.kind !== "ask") throw new Error("expected an ask");
    const plans = planLosses(decision);
    const minLoss = Math.min(...plans.map((entry) => entry.hpLost));
    const greedy = plans.reduce((a, b) => (b.hpLost > a.hpLost ? b : a));
    const resolved = decision.resolve(escalated(greedy.key));
    // resolve() is pure; the loop applies the played resolution.
    expect(first.screenMemory.hpGuard).toBeUndefined();
    resolved.apply?.();
    const used = plans.find((entry) => entry.key === (resolved.guard?.choice ?? greedy.key))!;
    expect(first.screenMemory.hpGuard).toEqual({ fight: "1:9", turns: { "3": used.hpLost - minLoss } });

    // The same fight with the budget spent: anything above the cheapest plan is replaced.
    const spent = env(guardCombat(), { combatPlanner: "turn" });
    spent.screenMemory.hpGuard = { fight: "1:9", turns: { "1": 13 } };
    const again = planCombatTurn(spent);
    if (again?.kind !== "ask") throw new Error("expected an ask");
    const over = plans.filter((entry) => entry.hpLost > minLoss).reduce((a, b) => (b.hpLost < a.hpLost ? b : a));
    const guarded = again.resolve(escalated(over.key));
    expect(guarded.guard?.kind).toBe("hp");
    expect(plans.find((entry) => entry.key === guarded.guard?.choice)!.hpLost).toBe(minLoss);
    expect(guarded.rationale).toMatch(/this fight already took/);
    // Another fight (another floor) starts a fresh budget.
    const next = guardCombat();
    (next["run"] as Record<string, unknown>)["floor"] = 10;
    const fresh = env(next, { combatPlanner: "turn" });
    fresh.screenMemory.hpGuard = { fight: "1:9", turns: { "1": 13 } };
    const freshDecision = planCombatTurn(fresh);
    if (freshDecision?.kind !== "ask") throw new Error("expected an ask");
    freshDecision.resolve(escalated(plans.find((entry) => entry.hpLost === minLoss)!.key)).apply?.();
    expect(fresh.screenMemory.hpGuard).toEqual({ fight: "1:10", turns: { "3": 0 } });
  });

  it("HP guard budget: resolving twice (Jev, then the escalator) and re-planning in a turn count once (b63e836 regression)", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    // A boss at 100 HP: the guard's slack (10) lets the next-cheapest plan through, so the turn accepts extra HP.
    const board = (): Record<string, unknown> => {
      const raw = guardCombat("LAGAVULIN_MATRIARCH");
      const player = (raw["combat"] as Record<string, unknown>)["player"] as Record<string, unknown>;
      player["current_hp"] = 100;
      player["max_hp"] = 100;
      return raw;
    };
    const e = env(board(), { combatPlanner: "turn" });
    const decision = planCombatTurn(e);
    if (decision?.kind !== "ask") throw new Error("expected an ask");
    const plans = planLosses(decision);
    const minLoss = Math.min(...plans.map((entry) => entry.hpLost));
    const pricier = plans.filter((entry) => entry.hpLost > minLoss).reduce((a, b) => (b.hpLost < a.hpLost ? b : a));
    const jevAnswer: AnswerSet = { plan: { type: "choice", choice: pricier.key, probabilities: { [pricier.key]: 0.4 }, confidence: 0.4, raw: {} } } as AnswerSet;
    decision.resolve(jevAnswer);
    const played = decision.resolve(escalated(pricier.key));
    expect(e.screenMemory.hpGuard).toBeUndefined();
    played.apply?.();
    const used = plans.find((entry) => entry.key === (played.guard?.choice ?? pricier.key))!;
    expect(used.hpLost - minLoss).toBeGreaterThan(0);
    const once = { fight: "1:9", turns: { "3": used.hpLost - minLoss } };
    expect(e.screenMemory.hpGuard).toEqual(once);
    if (e.screenMemory.combatPlan) expect(e.screenMemory.combatPlan.via).toBe("deepseek");
    // A re-plan of the same turn replaces the turn's entry rather than adding to it.
    const again = planCombatTurn(env(board(), { combatPlanner: "turn", screenMemory: e.screenMemory }));
    if (again?.kind !== "ask") throw new Error("expected an ask");
    again.resolve(escalated(pricier.key)).apply?.();
    expect(e.screenMemory.hpGuard).toEqual(once);
  });

  it("boss fight: no second potion in a turn while HP is high (1R3C F17 T1)", async () => {
    const { planCombatTurn } = await import("../src/screens/combat-plan.js");
    const raw = combatPayload();
    const combat = raw["combat"] as Record<string, unknown>;
    const enemies = combat["enemies"] as Record<string, unknown>[];
    combat["enemies"] = [{ ...enemies[0], enemy_id: "LAGAVULIN_MATRIARCH", current_hp: 150, max_hp: 222, intents: [{ index: 0, intent_type: "Attack", label: "7", damage: 7, hits: 1, total_damage: 7 }] }];
    const potions = (raw["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[];
    potions[1] = { ...potions[0], index: 1, potion_id: "LIQUID_MEMORIES", name: "Liquid Memories", requires_target: false, valid_target_indices: [] };
    const decide = (startCount: number) => {
      const e = env(raw, { combatPlanner: "turn" });
      e.screenMemory.potionTurn = { fight: "1:9", turn: 3, startCount };
      return planCombatTurn(e);
    };
    const usesPotion = (decision: Decision | null): boolean => {
      if (!decision) return false;
      if (decision.kind === "act") return decision.intent.action === "use_potion";
      const criteria = decision.questions["plan"]?.type === "choice" ? decision.questions["plan"].criteria : {};
      return Object.entries(criteria).some(([key, text]) => !key.startsWith("plan") || /potion/i.test(String(text)));
    };
    // First look this turn: potions are on the table (boss fight).
    expect(usesPotion(decide(2))).toBe(true);
    // One already drunk this turn (3 at the start, 2 now): none offered, none planned.
    expect(usesPotion(decide(3))).toBe(false);
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

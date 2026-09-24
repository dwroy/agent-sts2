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
    (raw["run"] as Record<string, unknown>)["current_hp"] = 60; // 75%: an elite now would be +4
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
    // Monster -> Elite: the elite is reached at ~63%, where it is worth +0.5, not +4.
    expect(value("n0")).toBeCloseTo(1.7);
    expect(value("n1")).toBeCloseTo(2.4);
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
});

describe("rest", () => {
  it("offers only enabled options", () => {
    const decision = mustDecision(plan(restPayload()));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["pick"]?.type === "choice" ? decision.questions["pick"].criteria : {};
    expect(Object.keys(criteria)).toEqual(["o0", "o1"]);
    expect(decision.resolve(pickAnswer("o1")).intent).toEqual({ action: "choose_rest_option", option_index: 1 });
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

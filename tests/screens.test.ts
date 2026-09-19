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
    const decision = mustDecision(plan(combatPayload()));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const resolved = decision.resolve(choiceAnswer("c0->e0", 0.31));
    expect(resolved.intent).toBeNull();
    expect(resolved.reask).toBeDefined();
    const shortlist = Object.keys(resolved.reask?.criteria ?? {});
    expect(shortlist.length).toBeGreaterThanOrEqual(2);
    expect(shortlist).toContain("c0->e0");
  });

  it("falls back to code when the answer is unusable", () => {
    const decision = mustDecision(plan(combatPayload()));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const resolved = decision.resolve(choiceAnswer("not-an-option", 0.9));
    expect(resolved.fallback).toBe(true);
    expect(resolved.intent).not.toBeNull();
  });

  it("applies the safety floor: end_turn is removed when it would be lethal", () => {
    const decision = mustDecision(plan(combatPayload({ lethalEndTurn: true })));
    if (decision.kind !== "ask") throw new Error("expected an ask");
    const criteria = decision.questions["play"]?.type === "choice" ? decision.questions["play"].criteria : {};
    expect(Object.keys(criteria)).not.toContain("end_turn");
  });

  it("overrides a lethal end_turn answer even if Jev picked it", () => {
    const raw = combatPayload({ lethalEndTurn: true });
    const decision = mustDecision(plan(raw));
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

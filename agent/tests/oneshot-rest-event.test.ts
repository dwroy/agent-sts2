/**
 * One-shot build decisions (BUILD_DECIDER=deepseek, BUILD_ONESHOT; Dai 2026-09-29): a rest site (heal, or
 * smith a named card) and an event option that picks from the deck are decided in one DeepSeek question with
 * the card(s) the follow-up screen takes; code plays both; another screen than expected, or a card it does
 * not offer, is asked as before.
 *
 * Boards are logged A9 states (tests/logged-states/oneshot/*.json).
 */

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/hand/mod/schema.js";
import { createScreenMemory } from "../src/memory/types.js";
import { deckCards } from "../src/hand/screens/oneshot.js";
import { loggedKnowledge } from "./logged.js";
import type { JsonValue } from "../src/core/util/json.js";
import { act, ask, board, choose, decide, env, FakeDeepSeek, keyOf, optionsOf, play, setupOneshotTests, type Raw } from "./oneshot-support.js";
import { eventPayload, mainMenuPayload } from "./scenarios.js";

setupOneshotTests();

/* ---- rest site ----------------------------------------------------------------------------------- */

const REST = "7b0d-f8-rest";

describe("rest site: heal or smith a named card in one question", () => {
  it("one option per upgradable card with what the upgrade changes and the card's outcome statistics; no code value or rank (V4 M2)", () => {
    const decision = decide(env(board(REST, "rest")));
    expect(decision.label).toBe("rest/plan");
    const options = optionsOf(decision);
    expect(options["o0"]).toMatchObject({ kind: "HEAL" });
    const smith = Object.keys(options).filter((key) => key.startsWith("o1:"));
    // 17 cards, 8 distinct upgradable ones (the curse is not).
    expect(smith).toHaveLength(8);
    expect(options[`o1:${keyOf(board(REST, "rest"), "BASH")}`]).toMatchObject({ card: "痛击", upgrade: "造成8点伤害。 给予2层易伤。 -> 造成10点伤害。 给予3层易伤。", card_outcome_stats: expect.any(String) });
    for (const option of Object.values(options)) for (const key of ["code_value", "code_rank", "why"]) expect(option[key]).toBeUndefined();
    // The rest actions' outcome statistics by HP band, with the band this rest site is in.
    const restSite = (ask(decision).state["facts"] as Record<string, Record<string, JsonValue>>)["rest_site"]!;
    expect(Object.keys(restSite["option_outcome_stats"] as Record<string, JsonValue>)).toEqual(expect.arrayContaining(["HEAL", "SMITH"]));
    expect(restSite["hp_band_now"]).toEqual(expect.any(String));
    expect(options[`o1:${keyOf(board(REST, "rest"), "STRIKE_IRONCLAD")}`]).toMatchObject({ copies: 5, upgrade: "造成6点伤害。 -> 造成9点伤害。" });
    expect(Object.values(options).some((option) => option["card"] === "进阶之灾")).toBe(false);
    const question = ask(decision);
    expect(question.deepseek.baseline.label).toBe("rest/choose");
    expect(question.deepseek.oneshot).toBeDefined();
    expect(question.deepseek.offeredCards).toEqual(expect.arrayContaining(["BASH", "TAUNT"]));
  });

  it("smith Bash: the rest action now, Bash on the upgrade screen as step 2", () => {
    const memory = createScreenMemory("REST");
    const bash = keyOf(board(REST, "rest"), "BASH");
    const resolved = choose(decide(env(board(REST, "rest"), memory)), `o1:${bash}`);
    expect(resolved.intent).toEqual({ action: "choose_rest_option", option_index: 1 });
    expect(resolved.plan).toEqual({ id: "7B0D6XKP0BAZ:F8:rest#1", steps: ["o1", bash] });
    expect(resolved.journal).toBe("锻造 (SMITH): upgrade 痛击");
    resolved.apply?.();
    const pick = act(decide(env(board(REST, "upgrade_select"), memory)));
    expect(pick).toMatchObject({ label: "selection/upgrade", intent: { action: "select_deck_card", option_index: 9 }, plan: { ref: "7B0D6XKP0BAZ:F8:rest#1", step: 2, choice: "痛击" } });
    expect(memory.pendingPick).toBeUndefined();
  });

  it("heal names no card; the next plan gets the next reference", () => {
    const memory = createScreenMemory("REST");
    const resolved = choose(decide(env(board(REST, "rest"), memory)), "o0");
    expect(resolved.plan).toEqual({ id: "7B0D6XKP0BAZ:F8:rest#1", steps: ["o0"] });
    resolved.apply?.();
    expect(memory.pendingPick).toBeUndefined();
    expect(memory.planSeq).toEqual({ runId: "7B0D6XKP0BAZ", n: 1 });
  });

  it("a follow-up screen other than the one expected is asked as before (the named card is dropped)", () => {
    const memory = createScreenMemory("REST");
    choose(decide(env(board(REST, "rest"), memory)), `o1:${keyOf(board(REST, "rest"), "BASH")}`).apply?.();
    const other = board(REST, "upgrade_select");
    Object.assign(other["selection"] as Raw, { kind: "deck_card_select", prompt: "选择[blue]1[/blue]张牌来[gold]移除[/gold]。" });
    const decision = decide(env(other, memory));
    expect(decision.kind).toBe("ask");
    expect(decision.label).toBe("selection/remove");
    expect(memory.pendingPick).toBeUndefined();
  });

  it("an unusable answer falls back to today's rest question, then today's card question", () => {
    const memory = createScreenMemory("REST");
    ask(decide(env(board(REST, "rest"), memory))).deepseek.oneshot?.fallback();
    const next = decide(env(board(REST, "rest"), memory));
    expect(next.label).toBe("rest/choose");
    expect(Object.keys(optionsOf(next))).toEqual(["o0", "o1"]);
    expect(decide(env(board(REST, "upgrade_select"), memory)).label).toBe("selection/upgrade");
  });
});


/* ---- events -------------------------------------------------------------------------------------- */

describe("events: an option that picks from the deck is decided with its card(s)", () => {
  it("Doors of Light and Dark: the random-upgrade door stays one option, the removal door one option per removable card", () => {
    const raw = board("u6ru-f7-doors", "event");
    const decision = decide(env(raw));
    expect(decision.label).toBe("event/plan");
    const options = optionsOf(decision);
    expect(options["o0"]).toMatchObject({ option: "光之门" });
    const removals = Object.keys(options).filter((key) => key.startsWith("o1:"));
    expect(removals.length).toBeGreaterThan(3);
    // Eternal cards are not offered for removal.
    expect(Object.values(options).some((option) => option["card"] === "进阶之灾")).toBe(false);
    expect(ask(decision).deepseek.baseline.label).toBe("event/choose");
  });

  it("the removal door with a Strike: the option now, the Strike on the removal screen", () => {
    const memory = createScreenMemory("EVENT");
    const raw = board("u6ru-f7-doors", "event");
    const strike = keyOf(raw, "STRIKE_IRONCLAD");
    const resolved = choose(decide(env(raw, memory)), `o1:${strike}`);
    expect(resolved.intent).toEqual({ action: "choose_event_option", option_index: 1 });
    resolved.apply?.();
    const select = board("u6ru-f7-doors", "remove_select");
    const pick = act(decide(env(select, memory)));
    const offered = ((select["selection"] as Raw)["cards"] as Raw[]).find((card) => card["card_id"] === "STRIKE_IRONCLAD")!;
    expect(pick).toMatchObject({ label: "selection/remove", intent: { option_index: offered["index"] }, plan: { step: 2 } });
  });

  it("the game resolves the pick itself (another page comes first): the named card is dropped; the same page again keeps it", () => {
    const memory = createScreenMemory("EVENT");
    const raw = board("u6ru-f7-doors", "event");
    choose(decide(env(raw, memory)), `o1:${keyOf(raw, "STRIKE_IRONCLAD")}`).apply?.();
    // A stale frame of the same page: still waiting for the removal screen.
    decide(env(board("u6ru-f7-doors", "event"), memory));
    expect(memory.pendingPick).toBeDefined();
    const done = board("u6ru-f7-doors", "event");
    Object.assign(done["event"] as Raw, { is_finished: true, options: [{ index: 0, title: "离开", description: "", is_locked: false, is_proceed: true, will_kill_player: false }] });
    expect(decide(env(done, memory))).toMatchObject({ kind: "act", label: "event/leave" });
    expect(memory.pendingPick).toBeUndefined();
  });

  it("Field of Man-Sized Holes: remove 2 names its cards in the answer's list; enchant 1 is one option per card", () => {
    const memory = createScreenMemory("EVENT");
    const raw = board("yql8-f22-holes", "event");
    const decision = decide(env(raw, memory));
    const options = optionsOf(decision);
    const strike = keyOf(raw, "STRIKE_IRONCLAD");
    const injury = keyOf(raw, "INJURY");
    // V4 M2: each eligible card as it is and its outcome statistics; no code value as a target, no why.
    expect(options["o0"]).toMatchObject({
      then: "remove 2 card(s) from your deck",
      eligible_cards: expect.objectContaining({ [strike]: expect.stringMatching(/×5 \(Attack, 1E\): 造成6点伤害。$/), [injury]: expect.not.stringMatching(/code/) }),
      card_outcome_stats: expect.objectContaining({ [strike]: expect.any(String), [injury]: expect.any(String) }),
    });
    expect(options["o0"]!["target_why"]).toBeUndefined();
    expect(options[`o1:${strike}`]?.["why"]).toBeUndefined();
    expect(options[`o1:${strike}`]).toMatchObject({ then: "enchant 打击", card_outcome_stats: expect.any(String) });
    expect(Object.keys(options).filter((key) => key.startsWith("o1:")).length).toBeGreaterThan(5);
    const resolved = choose(decision, "o0", [injury, strike]);
    expect(resolved.plan?.steps).toEqual(["o0", injury, strike]);
    expect(resolved.journal).toBe("抵抗诱惑: remove 受伤, 打击");
    resolved.apply?.();
    const select = board("yql8-f22-holes", "remove_select");
    const first = act(decide(env(select, memory)));
    expect(first).toMatchObject({ intent: { option_index: 0 }, plan: { step: 2, choice: "受伤" } });
    // The screen after the first pick: Injury selected, one to go.
    const selection = select["selection"] as Raw;
    ((selection["cards"] as Raw[])[0]!)["selected"] = true;
    selection["selected_count"] = 1;
    const second = act(decide(env(select, memory)));
    expect(second).toMatchObject({ intent: { option_index: 1 }, plan: { step: 3, choice: "打击" } });
    expect(memory.pendingPick).toBeUndefined();
  });

  it("cards that do not fit the option (unknown key, too many copies, wrong count): the option is played and its screen asked as before", () => {
    const raw = board("yql8-f22-holes", "event");
    const bash = keyOf(raw, "BASH");
    for (const cards of [["c999", bash], [bash, bash], [bash], []]) {
      const memory = createScreenMemory("EVENT");
      const resolved = choose(decide(env(raw, memory)), "o0", cards);
      expect(resolved.intent).toEqual({ action: "choose_event_option", option_index: 0 });
      expect(resolved.plan?.steps).toEqual(["o0"]);
      resolved.apply?.();
      expect(memory.pendingPick).toBeUndefined();
    }
  });

  it("Self-Help Book: each enchant option lists only the card type its text names", () => {
    const raw = board("8v0h-f22-selfhelp", "event");
    const options = optionsOf(decide(env(raw)));
    const deck = deckCards(parseGameState(raw), loggedKnowledge);
    const typeOf = (key: string): string => deck.find((card) => card.key === key.split(":")[1])?.type ?? "";
    const byOption = (prefix: string): string[] => [...new Set(Object.keys(options).filter((key) => key.startsWith(`${prefix}:`)).map(typeOf))];
    expect(byOption("o0")).toEqual(["Attack"]);
    expect(byOption("o1")).toEqual(["Skill"]);
    expect(byOption("o2")).toEqual(["Power"]);
  });

  it("an event with no deck pick keeps today's question", () => {
    expect(decide(env(eventPayload())).label).toBe("event/choose");
  });
});


/* ---- the loop ------------------------------------------------------------------------------------ */

describe("rest and event plans in the loop", () => {
  it("rest: one DeepSeek call; the smith and the named card are two rows, the second a reused plan step", async () => {
    const bash = keyOf(board(REST, "rest"), "BASH");
    const deepseek = new FakeDeepSeek(() => `o1:${bash}`);
    const { stats, actions, records } = await play([board(REST, "rest"), board(REST, "upgrade_select"), mainMenuPayload()], deepseek);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["rest/plan"]);
    expect(stats.deepseekCalls).toBe(1);
    expect(actions).toEqual([{ action: "choose_rest_option", option_index: 1 }, { action: "select_deck_card", option_index: 9 }]);
    expect(records.find((row) => row["label"] === "rest/plan")).toMatchObject({ decider: "deepseek", deepseek: { choice: `o1:${bash}`, plan_id: "7B0D6XKP0BAZ:F8:rest#1", plan: ["o1", bash], plan_step: 1 } });
    expect(records.find((row) => row["label"] === "selection/upgrade")).toMatchObject({ decider: "deepseek", deepseek: { reused: true, plan_ref: "7B0D6XKP0BAZ:F8:rest#1", plan_step: 2, choice: "痛击" }, usage: { input_tokens: 0 } });
  });

  it("rest: an answer that names no option key falls back to today's two questions", async () => {
    const deepseek = new FakeDeepSeek((_criteria, label) => (label === "rest/plan" ? "o1" : label === "rest/choose" ? "o1" : "card9"));
    const { stats, actions, records } = await play([board(REST, "rest"), board(REST, "upgrade_select"), mainMenuPayload()], deepseek);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["rest/plan", "rest/choose", "selection/upgrade"]);
    expect(stats.deepseekCalls).toBe(3);
    expect(actions).toEqual([{ action: "choose_rest_option", option_index: 1 }, { action: "select_deck_card", option_index: 9 }]);
    expect(records.find((row) => row["label"] === "rest/plan")?.["result"]).toBe("not dispatched: one-shot answer unusable, re-planned step by step");
  });

  it("event: remove 2 named in the answer's cards; both picks are plan steps", async () => {
    const raw = board("yql8-f22-holes", "event");
    const cards = [keyOf(raw, "INJURY"), keyOf(raw, "STRIKE_IRONCLAD")];
    const deepseek = new FakeDeepSeek(() => ({ choice: "o0", cards }));
    const select = board("yql8-f22-holes", "remove_select");
    const second = JSON.parse(JSON.stringify(select)) as Raw;
    ((second["selection"] as Raw)["cards"] as Raw[])[0]!["selected"] = true;
    (second["selection"] as Raw)["selected_count"] = 1;
    const { stats, actions, records } = await play([raw, select, second, mainMenuPayload()], deepseek);
    expect(stats.deepseekCalls).toBe(1);
    expect(actions).toEqual([{ action: "choose_event_option", option_index: 0 }, { action: "select_deck_card", option_index: 0 }, { action: "select_deck_card", option_index: 1 }]);
    expect(records.find((row) => row["label"] === "event/plan")).toMatchObject({ deepseek: { choice: "o0", cards, plan: ["o0", ...cards], plan_step: 1 } });
    expect(records.filter((row) => row["label"] === "selection/remove").map((row) => (row["deepseek"] as Raw)["plan_step"])).toEqual([2, 3]);
  });

  it("BUILD_ONESHOT=off: the old step-by-step questions", async () => {
    const deepseek = new FakeDeepSeek((_criteria, label) => (label === "rest/choose" ? "o1" : "card9"));
    const { stats } = await play([board(REST, "rest"), board(REST, "upgrade_select"), mainMenuPayload()], deepseek, { buildOneshot: "off" });
    expect(deepseek.calls.map((call) => call.label)).toEqual(["rest/choose", "selection/upgrade"]);
    expect(stats.deepseekCalls).toBe(2);
  });
});

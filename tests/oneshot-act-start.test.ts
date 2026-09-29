/**
 * Act start in one question (BUILD_DECIDER=deepseek, BUILD_ONESHOT; Dai 2026-09-29): the act-start Ancient's
 * option and the act's route together, the map from the MAP screen before the Ancient (the EVENT state has
 * none); the route stored as the act's route plan and followed from the first map, whose first move is a
 * step of the plan; one review (keep or change) after an option whose outcome was random; the two questions
 * of before when the answer names no valid route.
 *
 * Boards: U6RUE7LBUFJF F17-F18 (Tezcatara) and YQL8D59999AX F17-F18 (Delicious Cookies, upgrade 4), A9.
 */

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import { createScreenMemory, type ScreenMemory } from "../src/project/types.js";
import { revealsLater, routeEffect } from "../src/screens/act-start.js";
import { rememberMap } from "../src/screens/rest.js";
import type { JsonValue } from "../src/util/json.js";
import { act, ask, board, choose, decide, env, FakeDeepSeek, keyOf, optionsOf, play, scriptedDeepSeek, setupOneshotTests, type Raw } from "./oneshot-support.js";
import { mainMenuPayload } from "./scenarios.js";

setupOneshotTests();

const ANCIENT = "u6ru-f18-ancient";
const COOKIES = "yql8-f18-cookies";

/** The memory after the MAP screen before the Ancient (the loop remembers every MAP screen's map). */
function afterMap(file: string): ScreenMemory {
  const memory = createScreenMemory("MAP");
  rememberMap(memory, parseGameState(board(file, "map_before")));
  return memory;
}

/** The first node of a route from the question's act_routes, and its index on the map after the event. */
function firstIndex(route: Record<string, JsonValue>, mapAfter: Raw): number {
  const [, row, col] = /row (\d+), column (\d+)/.exec(String(route["first_node"]))!;
  const nodes = ((mapAfter["map"] as Raw)["available_nodes"] as Raw[]).filter((node) => node["row"] === Number(row) && node["col"] === Number(col));
  return nodes[0]!["index"] as number;
}

describe("what an option changes for the route, and whether its outcome is known", () => {
  it.each([
    ["获得[blue]31[/blue]点最大生命值。", "HP 60/87 -> 91/118"],
    ["回复25点生命。将一张羽化添加到你的牌组。", "HP 60/87 -> 85/87"],
    ["回复全部生命值。获得睡眠不佳。", "HP 60/87 -> 87/87"],
    ["失去9点最大生命值，将3张许愿加入你的牌组。", "HP 60/87 -> 60/78"],
    ["支付200金币。获得律动残余。", "gold 250 -> 50"],
    ["失去所有金币。变化2张牌。", "gold 250 -> 0"],
  ])("%s", (text, expected) => {
    expect(routeEffect(text, 60, 87, 250)?.text).toBe(expected);
  });

  it("names nothing: no effect", () => {
    expect(routeEffect("在你的回合开始时，额外抽1张牌", 60, 87, 250)).toBeNull();
  });

  it("random or picked later: reviewed once; a relic or named cards: not", () => {
    expect(revealsLater("获得[blue]2[/blue]件随机[gold]遗物[/gold]。")).toMatch(/random/);
    expect(revealsLater("从3张稀有牌中选择1张加入你的牌组。")).toMatch(/picked from/);
    expect(revealsLater("在你的回合开始时，消耗你手牌中的1张牌并获得1点力量。")).toBeNull();
    expect(revealsLater("升级4张牌。")).toBeNull();
    expect(revealsLater("随机获得一瓶药水。")).toMatch(/random/);
    expect(revealsLater("将2张随机诅咒牌和3张灵体加入你的牌组。")).toMatch(/random/);
    expect(revealsLater("从2个卡牌包中选择1包加入你的牌组。")).toMatch(/picked from/);
    // A pick from your own deck, or a random effect later on: known now.
    expect(revealsLater("从牌组中选择一张牌，为其附魔：克隆。")).toBeNull();
    expect(revealsLater("从你的牌组中选择5张牌移除。在每场战斗结束时，将其中随机1牌升级然后返还。")).toBeNull();
  });
});

describe("act-start Ancient: its option and the act's route in one question", () => {
  it("asks once with the Ancient's options and the act's whole routes (the map from the MAP screen before)", () => {
    const decision = decide(env(board(ANCIENT, "event"), afterMap(ANCIENT)));
    expect(decision.label).toBe("event/act-plan");
    expect(Object.keys(optionsOf(decision))).toEqual(["o0", "o1", "o2"]);
    const question = ask(decision);
    const routes = question.state["act_routes"] as Record<string, Record<string, JsonValue>>;
    expect(Object.keys(routes).length).toBeGreaterThanOrEqual(2);
    for (const route of Object.values(routes)) {
      expect(route).toMatchObject({ path: expect.stringMatching(/Boss$/), first_node: expect.stringMatching(/^row 1,/), hp_at_boss: expect.any(String), code_value: expect.any(Number), code_rank: expect.any(Number) });
    }
    expect(String(question.state["route_note"])).toMatch(/HP projection per room, act 2/);
    expect(String(question.questions["pick"]?.instructions)).toMatch(/"route": "<route key from act_routes>"/);
    expect(question.deepseek.baseline.label).toBe("event/choose");
    expect(question.deepseek.oneshot).toBeDefined();
  });

  it("an option that changes HP shows it, and every route its boss HP with that option", () => {
    const raw = board(ANCIENT, "event");
    const option = ((raw["event"] as Raw)["options"] as Raw[])[2]!;
    option["description"] = "获得[blue]31[/blue]点最大生命值。";
    const decision = decide(env(raw, afterMap(ANCIENT)));
    expect(optionsOf(decision)["o2"]).toMatchObject({ route_effect: expect.stringMatching(/^HP \d+\/80 -> \d+\/111$/) });
    const routes = ask(decision).state["act_routes"] as Record<string, Record<string, JsonValue>>;
    expect(Object.values(routes)[0]?.["hp_at_boss_if_option"]).toEqual({ o2: expect.stringMatching(/\/111$/) });
  });

  it("not this question: no map yet (act 1's Neow), another floor's map, or the act already planned", () => {
    expect(decide(env(board(ANCIENT, "event"))).label).toBe("event/choose");
    const stale = afterMap(ANCIENT);
    stale.lastMap!.floor = 12;
    expect(decide(env(board(ANCIENT, "event"), stale)).label).toBe("event/choose");
    const planned = afterMap(ANCIENT);
    planned.routePlan = { runId: "U6RUE7LBUFJF", act: 2, floor: 18, hpPct: 0.9, path: [], summary: "old" };
    expect(decide(env(board(ANCIENT, "event"), planned)).label).toBe("event/choose");
    expect(decide(env(board(ANCIENT, "event"), afterMap(ANCIENT), { oneshot: "off" })).label).toBe("event/choose");
  });

  it("option + route: the option now, the route stored as the act's plan; its first map move is the plan's step 2", () => {
    const memory = afterMap(ANCIENT);
    const decision = decide(env(board(ANCIENT, "event"), memory));
    const routes = ask(decision).state["act_routes"] as Record<string, Record<string, JsonValue>>;
    const resolved = choose(decision, "o0", undefined, "p2");
    expect(resolved.intent).toEqual({ action: "choose_event_option", option_index: 0 });
    expect(resolved.plan).toEqual({ id: "U6RUE7LBUFJF:F18:act#1", steps: ["o0", "p2"] });
    // The route DeepSeek picked by key (p2), whatever path the refreshed room costs rank second.
    expect(resolved.journal).toBe(`营养汤; route ${String(routes["p2"]?.["path"])}`);
    expect(String(routes["p2"]?.["path"])).toMatch(/^Monster -> .* -> Boss$/);
    resolved.apply?.();
    expect(memory.routePlan).toMatchObject({ act: 2, summary: routes["p2"]?.["path"], oneshot: { ref: "U6RUE7LBUFJF:F18:act#1", firstStep: 2, firstPending: true } });
    expect(memory.routePlan?.review).toBeUndefined();
    const mapAfter = board(ANCIENT, "map_after");
    const first = act(decide(env(mapAfter, memory)));
    expect(first).toMatchObject({ label: "map/route-follow", intent: { action: "choose_map_node", option_index: firstIndex(routes["p2"]!, mapAfter) }, plan: { ref: "U6RUE7LBUFJF:F18:act#1", step: 2 } });
    // Later moves are code's follows, as with any route plan.
    const again = decide(env(mapAfter, memory));
    expect(again.kind === "act" && again.plan).toBeFalsy();
  });

  it("no valid route in the answer: unusable (the loop falls back to the two questions of before)", () => {
    const decision = decide(env(board(ANCIENT, "event"), afterMap(ANCIENT)));
    for (const route of [undefined, "p99"]) {
      const resolved = choose(decision, "o1", undefined, route);
      expect(resolved).toMatchObject({ intent: null, fallback: true });
      expect(resolved.rationale).toMatch(/names no route/);
    }
  });

  it("Delicious Cookies (upgrade 4) with a route: four named upgrades, then the first map move as step 6", () => {
    const memory = afterMap(COOKIES);
    const event = board(COOKIES, "event");
    const decision = decide(env(event, memory));
    expect(decision.label).toBe("event/act-plan");
    // The logged picks: Shrug It Off, Fight Me, Pommel Strike, the other Fight Me.
    const cards = [keyOf(event, "SHRUG_IT_OFF"), keyOf(event, "FIGHT_ME"), keyOf(event, "POMMEL_STRIKE"), keyOf(event, "FIGHT_ME")];
    const resolved = choose(decision, "o0", cards, "p1");
    expect(resolved.plan?.steps).toEqual(["o0", ...cards, "p1"]);
    resolved.apply?.();
    expect(memory.pendingPick).toMatchObject({ task: "upgrade", step: 2, names: ["耸肩无视", "与我一战！", "剑柄打击", "与我一战！"] });
    expect(memory.routePlan?.oneshot).toMatchObject({ firstStep: 6, firstPending: true });
    const steps = ["upgrade1", "upgrade2", "upgrade3", "upgrade4"].map((key) => act(decide(env(board(COOKIES, key), memory))));
    expect(steps.map((step) => step.plan?.step)).toEqual([2, 3, 4, 5]);
    expect(steps.map((step) => step.intent.option_index)).toEqual([9, 11, 16, 13]);
    // A card already upgraded is not offered (Bash+ is).
    expect(() => choose(decision, "o0", [keyOf(event, "BASH"), ...cards.slice(1)], "p1").plan).not.toThrow();
    expect(choose(decision, "o0", [keyOf(event, "BASH"), ...cards.slice(1)], "p1").plan?.steps).toEqual(["o0", "p1"]);
    expect(steps.every((step) => step.label === "selection/upgrade")).toBe(true);
    expect(memory.pendingPick).toBeUndefined();
    const first = act(decide(env(board(COOKIES, "map_after"), memory)));
    expect(first).toMatchObject({ label: "map/route-follow", plan: { step: 6 } });
  });

  it("a random outcome: the route is reviewed once at the first map (keep or change; default keep)", () => {
    const memory = afterMap(ANCIENT);
    const raw = board(ANCIENT, "event");
    ((raw["event"] as Raw)["options"] as Raw[])[1]!["description"] = "获得[blue]2[/blue]件随机[gold]遗物[/gold]。";
    const decision = decide(env(raw, memory));
    expect(optionsOf(decision)["o1"]).toMatchObject({ outcome: expect.stringMatching(/review the route once/) });
    choose(decision, "o1", undefined, "p1").apply?.();
    expect(memory.routePlan?.review).toMatchObject({ why: expect.stringMatching(/random/), before: { relics: expect.any(Array) } });
    const mapAfter = board(ANCIENT, "map_after");
    const review = decide(env(mapAfter, memory));
    expect(review.label).toBe("map/route-review");
    const options = optionsOf(review);
    expect(options["keep"]).toMatchObject({ keep: expect.any(String), path: memory.routePlan?.summary });
    expect(Object.keys(options).length).toBeGreaterThan(1);
    expect((ask(review).state["facts"] as Record<string, JsonValue>)["route_review"]).toMatchObject({ revealed_outcome: expect.any(String) });
    // Default keep: without DeepSeek the plan is followed.
    expect(ask(review).deepseek.baseline).toMatchObject({ kind: "act", label: "map/route-follow" });
    const kept = choose(review, "keep");
    expect(kept.intent).toEqual((ask(review).deepseek.baseline as { intent: unknown }).intent);
    kept.apply?.();
    expect(memory.routePlan?.review).toBeUndefined();
    expect(decide(env(mapAfter, memory)).label).toBe("map/route-follow");
  });

  it("the review changes the route: the new path becomes the act's plan", () => {
    const memory = afterMap(ANCIENT);
    const raw = board(ANCIENT, "event");
    ((raw["event"] as Raw)["options"] as Raw[])[1]!["description"] = "获得[blue]2[/blue]件随机[gold]遗物[/gold]。";
    choose(decide(env(raw, memory)), "o1", undefined, "p1").apply?.();
    const kept = memory.routePlan?.summary;
    const review = decide(env(board(ANCIENT, "map_after"), memory));
    const other = Object.keys(optionsOf(review)).find((key) => key !== "keep")!;
    const changed = choose(review, other);
    changed.apply?.();
    expect(memory.routePlan?.summary).not.toBe(kept);
    expect(memory.routePlan?.review).toBeUndefined();
    expect(memory.routePlan?.why).toMatch(/review after the act-start Ancient/);
  });
});

describe("act start in the loop", () => {
  const sequence = (event: Raw = board(ANCIENT, "event")): Raw[] => [board(ANCIENT, "map_before"), event, board(ANCIENT, "event_done"), board(ANCIENT, "map_after"), mainMenuPayload()];

  it("one DeepSeek call for the Ancient and the route; the route's first move is a reused plan step", async () => {
    const deepseek = new FakeDeepSeek(() => ({ choice: "o0", route: "p2" }));
    const { stats, actions, records } = await play(sequence(), deepseek);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["event/act-plan"]);
    expect(stats.deepseekCalls).toBe(1);
    expect(actions.map((action) => action["action"])).toEqual(["choose_map_node", "choose_event_option", "choose_event_option", "choose_map_node"]);
    const plan = records.find((row) => row["label"] === "event/act-plan")!;
    expect(plan).toMatchObject({ decider: "deepseek", deepseek: { choice: "o0", route: "p2", plan_id: "U6RUE7LBUFJF:F18:act#1", plan: ["o0", "p2"], plan_step: 1 }, route_plan: { act: 2 } });
    expect(records.find((row) => row["label"] === "map/route-follow")).toMatchObject({ decider: "deepseek", deepseek: { reused: true, plan_ref: "U6RUE7LBUFJF:F18:act#1", plan_step: 2 } });
    expect(records.some((row) => row["label"] === "map/route-plan")).toBe(false);
  });

  it("an answer without a route: logged, then the two questions of before (the event, then the route plan)", async () => {
    const deepseek = new FakeDeepSeek((criteria, label) => (label === "map/route-plan" ? Object.keys(criteria)[0]! : "o0"));
    const { stats, records } = await play(sequence(), deepseek);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["event/act-plan", "event/choose", "map/route-plan"]);
    expect(stats.deepseekCalls).toBe(3);
    expect(records.find((row) => row["label"] === "event/act-plan")?.["result"]).toBe("not dispatched: one-shot answer unusable, re-planned step by step");
  });

  it("a random outcome: two calls (the joint question, then the review), the review keeping the route", async () => {
    const event = board(ANCIENT, "event");
    ((event["event"] as Raw)["options"] as Raw[])[0]!["description"] = "获得[blue]2[/blue]件随机[gold]遗物[/gold]。";
    const deepseek = new FakeDeepSeek((_criteria, label) => (label === "map/route-review" ? "keep" : { choice: "o0", route: "p1" }));
    const { stats, records } = await play(sequence(event), deepseek);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["event/act-plan", "map/route-review"]);
    expect(stats.deepseekCalls).toBe(2);
    expect(records.find((row) => row["label"] === "map/route-review")).toMatchObject({ decider: "deepseek", deepseek: { choice: "keep" } });
  });

  it("the real client reads the answer's route (and cards)", async () => {
    const { client } = await scriptedDeepSeek([{ content: '{"choice": "o0", "route": "p2", "reason": "soup for the strikes; shop route"}', reasoning: "Decisive: o0 with p2." }]);
    const { stats, records } = await play(sequence(), client);
    expect(stats.deepseekCalls).toBe(1);
    expect(records.find((row) => row["label"] === "event/act-plan")).toMatchObject({ decider: "deepseek", deepseek: { choice: "o0", route: "p2", plan: ["o0", "p2"] } });
    expect(records.find((row) => row["label"] === "map/route-follow")).toMatchObject({ deepseek: { plan_step: 2 } });
  });
});

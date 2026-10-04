/**
 * Act start in one question (BUILD_DECIDER=deepseek, BUILD_ONESHOT; Dai 2026-09-29; M2: the whole map): the
 * act-start Ancient's option and the act's route (a node sequence) together, the map from the MAP screen before the
 * Ancient (the EVENT state has none); the route stored as the act's route plan and followed from the first map,
 * whose first move is a step of the plan; one review (keep or change) after an option whose outcome was random; an
 * answer without a legal route (after one re-ask) takes the option and leaves the route to the first map.
 *
 * Boards: U6RUE7LBUFJF F17-F18 (Tezcatara) and YQL8D59999AX F17-F18 (Delicious Cookies, upgrade 4), A9.
 */

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/hand/mod/schema.js";
import { createScreenMemory, type ScreenMemory } from "../src/memory/types.js";
import { revealsLater, routeEffect } from "../src/hand/screens/act-start.js";
import { rememberMap } from "../src/hand/screens/rest.js";
import type { JsonValue } from "../src/core/util/json.js";
import { act, ask, board, choose, decide, env, FakeDeepSeek, keyOf, optionsOf, play, scriptedDeepSeek, setupOneshotTests, type Raw } from "./oneshot-support.js";
import { legalRoutes } from "./route-fixture.js";
import { checkRoute, routeMapFromView } from "../src/sim/route-map.js";
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

/** The index of a route's first node on the map after the event. */
function firstIndex(route: string, mapAfter: Raw): number {
  const [, row, col] = /^r(\d+)c(\d+)/.exec(route)!;
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
  it("asks once with the Ancient's options and the act's whole map (from the MAP screen before), standing on the Ancient", () => {
    const decision = decide(env(board(ANCIENT, "event"), afterMap(ANCIENT)));
    expect(decision.label).toBe("event/act-plan");
    expect(Object.keys(optionsOf(decision))).toEqual(["o0", "o1", "o2"]);
    const question = ask(decision);
    const view = question.state["act_route"] as Record<string, JsonValue>;
    const raw = board(ANCIENT, "map_before")["map"] as { nodes: Raw[] };
    expect((view["map"] as string[]).length).toBe(raw.nodes.length);
    expect(String(view["position"])).toMatch(/^你在 r0c\d（F18 远古）；下一步可走：/);
    const ancient = raw.nodes.find((node) => node["row"] === 0)!;
    expect(view["next_nodes"]).toEqual((ancient["children"] as Raw[]).map((child) => `r${String(child["row"])}c${String(child["col"])}`));
    expect(String(view["boss"])).toMatch(/（F33 Boss）$/);
    expect(String(view["room_costs"])).toMatch(/^第 2 幕每个房间掉血/);
    expect(legalRoutes(view).length).toBeGreaterThanOrEqual(2);
    // No code values or ranks; candidate routes as facts (Dai 2026-10-04): a few legal routes to the boss with their
    // projected HP (the numbers: tests/act-route-candidates.test.ts, on fixed costs).
    expect(JSON.stringify(view)).not.toMatch(/code_value|code_rank|hp_at_boss|act_routes/);
    const candidates = view["candidate_routes"] as { about: string; routes: string[] };
    expect(candidates.about).toMatch(/从现在的 HP \d+\/80 起；改变 HP 的选项按它的 route_effect 加减/);
    expect(candidates.routes.length).toBeGreaterThanOrEqual(1);
    expect(candidates.routes.length).toBeLessThanOrEqual(6);
    const map = routeMapFromView(view)!;
    for (const line of candidates.routes) {
      expect(line).toMatch(/^【[^】]+】r\d+c\d+[^：]*：.*F33 boss /);
      expect(checkRoute(map, /】([^：]+)：/.exec(line)![1]!.split(" "))).toEqual([]);
    }
    expect(String(question.questions["pick"]?.instructions)).toContain("state.act_route.candidate_routes");
    expect(String(question.questions["pick"]?.instructions)).toContain('"route": "<节点 id，用空格分隔：从 next_nodes 之一出发');
    expect(question.deepseek.baseline.label).toBe("event/choose");
    expect(question.deepseek.oneshot).toBeDefined();
  });

  it("an option that changes HP shows it in its route_effect", () => {
    const raw = board(ANCIENT, "event");
    const option = ((raw["event"] as Raw)["options"] as Raw[])[2]!;
    option["description"] = "获得[blue]31[/blue]点最大生命值。";
    const decision = decide(env(raw, afterMap(ANCIENT)));
    expect(optionsOf(decision)["o2"]).toMatchObject({ route_effect: expect.stringMatching(/^HP \d+\/80 -> \d+\/111$/) });
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
    const route = legalRoutes(ask(decision).state["act_route"])[1]!.join(" ");
    const resolved = choose(decision, "o0", undefined, route);
    expect(resolved.intent).toEqual({ action: "choose_event_option", option_index: 0 });
    expect(resolved.plan).toEqual({ id: "U6RUE7LBUFJF:F18:act#1", steps: ["o0", route] });
    resolved.apply?.();
    expect(resolved.journal).toBe(`营养汤; route ${memory.routePlan!.summary}`);
    expect(memory.routePlan!.path.map((step) => `r${step.row}c${step.col}`).join(" ")).toBe(route);
    expect(memory.routePlan).toMatchObject({ act: 2, oneshot: { ref: "U6RUE7LBUFJF:F18:act#1", firstStep: 2, firstPending: true } });
    expect(memory.routePlan?.review).toBeUndefined();
    const mapAfter = board(ANCIENT, "map_after");
    const first = act(decide(env(mapAfter, memory)));
    expect(first).toMatchObject({ label: "map/route-follow", intent: { action: "choose_map_node", option_index: firstIndex(route, mapAfter) }, plan: { ref: "U6RUE7LBUFJF:F18:act#1", step: 2 } });
    // Later moves are code's follows, as with any route plan.
    const again = decide(env(mapAfter, memory));
    expect(again.kind === "act" && again.plan).toBeFalsy();
  });

  it("no legal route in the answer: the option is still taken, no plan is stored (the first map asks for the route)", () => {
    const memory = afterMap(ANCIENT);
    const decision = decide(env(board(ANCIENT, "event"), memory));
    for (const route of [undefined, "p1", "r1c0 r3c0"]) {
      const resolved = choose(decision, "o1", undefined, route);
      expect(resolved).toMatchObject({ intent: { action: "choose_event_option", option_index: 1 }, fallback: false });
      expect(resolved.plan?.steps).toEqual(["o1"]);
      expect(resolved.journal).toMatch(/no legal route \((illegal|none given)\): the first map asks for it$/);
      resolved.apply?.();
      expect(memory.routePlan).toBeUndefined();
    }
    const next = decide(env(board(ANCIENT, "map_after"), memory));
    expect(next.label).toBe("map/route-plan");
  });

  it("Delicious Cookies (upgrade 4) with a route: four named upgrades, then the first map move as step 6", () => {
    const memory = afterMap(COOKIES);
    const event = board(COOKIES, "event");
    const decision = decide(env(event, memory));
    expect(decision.label).toBe("event/act-plan");
    const route = legalRoutes(ask(decision).state["act_route"])[0]!.join(" ");
    // The logged picks: Shrug It Off, Fight Me, Pommel Strike, the other Fight Me.
    const cards = [keyOf(event, "SHRUG_IT_OFF"), keyOf(event, "FIGHT_ME"), keyOf(event, "POMMEL_STRIKE"), keyOf(event, "FIGHT_ME")];
    const resolved = choose(decision, "o0", cards, route);
    expect(resolved.plan?.steps).toEqual(["o0", ...cards, route]);
    resolved.apply?.();
    expect(memory.pendingPick).toMatchObject({ task: "upgrade", step: 2, names: ["耸肩无视", "与我一战！", "剑柄打击", "与我一战！"] });
    expect(memory.routePlan?.oneshot).toMatchObject({ firstStep: 6, firstPending: true });
    const steps = ["upgrade1", "upgrade2", "upgrade3", "upgrade4"].map((key) => act(decide(env(board(COOKIES, key), memory))));
    expect(steps.map((step) => step.plan?.step)).toEqual([2, 3, 4, 5]);
    expect(steps.map((step) => step.intent.option_index)).toEqual([9, 11, 16, 13]);
    // A card already upgraded is not offered (Bash+ is).
    expect(() => choose(decision, "o0", [keyOf(event, "BASH"), ...cards.slice(1)], route).plan).not.toThrow();
    expect(choose(decision, "o0", [keyOf(event, "BASH"), ...cards.slice(1)], route).plan?.steps).toEqual(["o0", route]);
    expect(steps.every((step) => step.label === "selection/upgrade")).toBe(true);
    expect(memory.pendingPick).toBeUndefined();
    const first = act(decide(env(board(COOKIES, "map_after"), memory)));
    expect(first).toMatchObject({ label: "map/route-follow", plan: { step: 6 } });
  });

  /** An option with a random outcome and a legal route: the plan, reviewed at the first map. */
  function randomOutcome(memory: ScreenMemory): string {
    const raw = board(ANCIENT, "event");
    ((raw["event"] as Raw)["options"] as Raw[])[1]!["description"] = "获得[blue]2[/blue]件随机[gold]遗物[/gold]。";
    const decision = decide(env(raw, memory));
    expect(optionsOf(decision)["o1"]).toMatchObject({ outcome: expect.stringMatching(/review the route once/) });
    const route = legalRoutes(ask(decision).state["act_route"])[0]!.join(" ");
    choose(decision, "o1", undefined, route).apply?.();
    return route;
  }

  it("a random outcome: the route is reviewed once at the first map, on the whole map with the plan's facts (keep or change; default keep)", () => {
    const memory = afterMap(ANCIENT);
    randomOutcome(memory);
    expect(memory.routePlan?.review).toMatchObject({ why: expect.stringMatching(/random/), before: { relics: expect.any(Array) } });
    const mapAfter = board(ANCIENT, "map_after");
    const review = decide(env(mapAfter, memory));
    expect(review.label).toBe("map/route-review");
    const view = ask(review).state["route_map"] as Record<string, JsonValue>;
    // Standing on the Ancient: the whole plan is ahead.
    expect(view).toMatchObject({ plan: memory.routePlan!.summary, revealed_outcome: expect.stringMatching(/random/), plan_facts: { arrival: expect.any(Array) } });
    expect(Object.keys((ask(review).questions["pick"] as { criteria: Record<string, string> }).criteria)[0]).toBe("keep");
    // Default keep: without DeepSeek the plan is followed.
    expect(ask(review).deepseek.baseline).toMatchObject({ kind: "act", label: "map/route-follow" });
    const kept = ask(review).deepseek.plan!.resolve({ route: "keep", reason: "the relics fit" });
    if ("invalid" in kept) throw new Error(kept.invalid);
    expect(kept.intent).toEqual((ask(review).deepseek.baseline as { intent: unknown }).intent);
    kept.apply?.();
    expect(memory.routePlan?.review).toBeUndefined();
    expect(decide(env(mapAfter, memory)).label).toBe("map/route-follow");
  });

  it("the review changes the route: the new route becomes the act's plan", () => {
    const memory = afterMap(ANCIENT);
    randomOutcome(memory);
    const kept = memory.routePlan?.summary;
    const review = decide(env(board(ANCIENT, "map_after"), memory));
    const view = ask(review).state["route_map"];
    const planned = String((view as Record<string, JsonValue>)["plan"]).split(" → ").map((step) => step.split(" ")[0]).join(" ");
    const other = legalRoutes(view).map((ids) => ids.join(" ")).find((ids) => ids !== planned)!;
    const changed = ask(review).deepseek.plan!.resolve({ route: other, reason: "shops for the gold" });
    if ("invalid" in changed) throw new Error(changed.invalid);
    changed.apply?.();
    expect(memory.routePlan?.summary).not.toBe(kept);
    expect(memory.routePlan?.review).toBeUndefined();
    expect(memory.routePlan?.why).toMatch(/review after the act-start Ancient/);
    // An illegal one is not a plan (the spec re-asks it first).
    expect(ask(review).deepseek.plan!.resolve({ route: "r9c9", reason: "x" })).toEqual({ invalid: "第 1 步 r9c9：地图上没有这个节点" });
  });
});

describe("act start in the loop", () => {
  const sequence = (event: Raw = board(ANCIENT, "event")): Raw[] => [board(ANCIENT, "map_before"), event, board(ANCIENT, "event_done"), board(ANCIENT, "map_after"), mainMenuPayload()];
  const joint = (event: Raw = board(ANCIENT, "event")): string => legalRoutes(ask(decide(env(event, afterMap(ANCIENT)))).state["act_route"])[1]!.join(" ");

  it("one DeepSeek call for the Ancient and the route; the route's first move is a reused plan step", async () => {
    const route = joint();
    const deepseek = new FakeDeepSeek(() => ({ choice: "o0", route }));
    const { stats, actions, records } = await play(sequence(), deepseek);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["event/act-plan"]);
    expect(stats.deepseekCalls).toBe(1);
    expect(actions.map((action) => action["action"])).toEqual(["choose_map_node", "choose_event_option", "choose_event_option", "choose_map_node"]);
    const plan = records.find((row) => row["label"] === "event/act-plan")!;
    expect(plan).toMatchObject({ decider: "deepseek", deepseek: { choice: "o0", route, plan_id: "U6RUE7LBUFJF:F18:act#1", plan: ["o0", route], plan_step: 1 }, route_plan: { act: 2 } });
    expect(records.find((row) => row["label"] === "map/route-follow")).toMatchObject({ decider: "deepseek", deepseek: { reused: true, plan_ref: "U6RUE7LBUFJF:F18:act#1", plan_step: 2 } });
    expect(records.some((row) => row["label"] === "map/route-plan")).toBe(false);
  });

  it("an answer without a route: re-asked once; still none: the option is taken and the first map asks for the route", async () => {
    const route = legalRoutes(ask(decide(env(board(ANCIENT, "map_after"), createScreenMemory("MAP")))).state["route_map"])[0]!.join(" ");
    const deepseek = new FakeDeepSeek(() => "o0", (label) => (label === "map/route-plan" ? { route, reason: "planned at the map" } : { plan: [], reason: "nothing" }));
    const { stats, records } = await play(sequence(), deepseek);
    expect(deepseek.calls.map((call) => `${call.label}${call.reask ? " (re-ask)" : ""}`)).toEqual(["event/act-plan", "event/act-plan (re-ask)", "map/route-plan"]);
    expect(stats.deepseekCalls).toBe(3);
    expect(records.find((row) => row["label"] === "event/act-plan")).toMatchObject({ decider: "deepseek", chosen: { action: "choose_event_option", option_index: 0 } });
    expect(records.find((row) => row["label"] === "map/route-plan")).toMatchObject({ decider: "deepseek", route_plan: { act: 2 } });
  });

  it("a random outcome: two calls (the joint question, then the review), the review keeping the route", async () => {
    const event = board(ANCIENT, "event");
    ((event["event"] as Raw)["options"] as Raw[])[0]!["description"] = "获得[blue]2[/blue]件随机[gold]遗物[/gold]。";
    const route = joint(event);
    const deepseek = new FakeDeepSeek(() => ({ choice: "o0", route }), (label) => (label === "map/route-review" ? { route: "keep", reason: "fine" } : { plan: [], reason: "nothing" }));
    const { stats, records } = await play(sequence(event), deepseek);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["event/act-plan", "map/route-review"]);
    expect(stats.deepseekCalls).toBe(2);
    expect(records.find((row) => row["label"] === "map/route-review")).toMatchObject({ decider: "deepseek", rationale: expect.stringMatching(/keep/) });
  });

  it("the real client reads the answer's route (and cards); the candidate routes ride in the question, not the system prefix", async () => {
    const route = joint();
    const { client, bodies } = await scriptedDeepSeek([{ content: JSON.stringify({ choice: "o0", route, reason: "soup for the strikes; shop route" }), reasoning: "Decisive: o0." }]);
    const { stats, records } = await play(sequence(), client);
    const messages = bodies[0]!["messages"] as { role: string; content: string }[];
    expect(messages[0]!.role).toBe("system");
    expect(messages[0]!.content).not.toContain("candidate_routes");
    expect(messages[1]!.content).toContain('"candidate_routes"');
    expect(stats.deepseekCalls).toBe(1);
    expect(records.find((row) => row["label"] === "event/act-plan")).toMatchObject({ decider: "deepseek", deepseek: { choice: "o0", route, plan: ["o0", route] } });
    expect(records.find((row) => row["label"] === "map/route-follow")).toMatchObject({ deepseek: { plan_step: 2 } });
  });
});

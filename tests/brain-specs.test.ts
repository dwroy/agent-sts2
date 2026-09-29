/** V4 brain answer specs (src/brain/specs.ts) and the shared message layout (src/brain/message.ts). */

import { describe, expect, it } from "vitest";

import { normalisePick, parseAnswerText, reaskMessage, userMessage } from "../src/brain/message.js";
import { fightPlanFromSchema, fightPlanSpec, pickSpec, routePlanSpec, runPlanSpec, shopPlanSpec, stableSchema } from "../src/brain/specs.js";
import type { BrainRequest } from "../src/brain/types.js";
import { choiceMessage, taskMessage } from "../src/llm/deepseek-message.js";
import { buildRouteMap, routeView } from "../src/strategy/route-map.js";
import { isRunPlanReply } from "../src/strategy/run-plan.js";
import type { JsonValue } from "../src/util/json.js";
import { input } from "./route-fixture.js";

describe("pick spec", () => {
  const options = {
    o0: JSON.stringify({ option: "离开" }),
    o1: JSON.stringify({ option: "变化", eligible_cards: { c1: "打击", c2: "防御" }, cards_to_name: 'answer "cards": [2 keys from eligible_cards, repeat a key for several copies]' }),
    "o2:discard": JSON.stringify({ option: "拿药水" }),
  };

  /** The act-start joint question's map (state.act_route) and a card reward's route block (state.route_review). */
  const view = (over: Parameters<typeof input>[0] = {}) => JSON.parse(JSON.stringify(routeView(buildRouteMap(input(over))))) as Record<string, unknown>;

  it("builds a strict schema with the fields the question needs", () => {
    const spec = pickSpec("event/act-plan", options, { act_route: view() });
    expect(spec.kind).toBe("pick");
    expect(spec.reask).toBe(true);
    expect(spec.schema.required).toEqual(["choice", "reason", "route", "cards", "discard"]);
    expect(spec.schema.additionalProperties).toBe(false);
    expect(spec.schema.properties!["choice"]!.enum).toEqual(["o0", "o1", "o2:discard"]);
    expect(spec.schema.properties!["route"]).toMatchObject({ type: "string" });
    expect(spec.schema.properties!["route"]!.enum).toBeUndefined();
    expect(spec.schema.properties!["cards"]!.items!.enum).toEqual(["c1", "c2"]);
    const review = pickSpec("reward/card", { a: null }, { route_review: { ...view(), plan: "r1c2 精英 → …" } });
    expect(review.schema.properties!["route"]!.description).toMatch(/^"keep"/);
    expect(review.schema.required).toEqual(["choice", "reason", "route", "route_reason"]);
    // No route block: no route field, no forced re-ask.
    const plain = pickSpec("reward/card", { a: null }, {});
    expect(plain.schema.required).toEqual(["choice", "reason"]);
    expect(plain.reask).toBeUndefined();
    expect(plain.softValidate!({ choice: "a", reason: "x", route: "r9c9" })).toEqual([]);
  });

  it("names each problem specifically; a bad route is a soft problem (re-asked, the choice stands)", () => {
    const spec = pickSpec("event/act-plan", options, { act_route: view() });
    const ok = "r1c2 r2c2 r3c2 r4c1";
    expect(spec.validate({ choice: "o0", reason: "x", route: ok, cards: [], discard: [] })).toEqual([]);
    expect(spec.softValidate!({ choice: "o0", reason: "x", route: ok })).toEqual([]);
    expect(spec.validate({ choice: "o9", reason: "x", route: ok })).toEqual(["choice \"o9\" is not one of o0, o1, o2:discard"]);
    expect(spec.validate({ choice: "o1", reason: "x", route: ok, cards: ["c1"] })).toEqual(["o1 takes 2 card(s) from its eligible_cards, got 1"]);
    expect(spec.validate({ choice: "o1", reason: "x", route: ok, cards: ["c1", "c9"] })).toEqual(['cards ["c9"] are not in o1\'s eligible_cards (c1, c2)']);
    expect(spec.validate({ choice: "o2:discard", reason: "x", route: ok, discard: [] })).toEqual(['o2:discard discards potions first: "discard" must name 1 or more potion slot numbers']);
    expect(spec.validate({ reason: "x", route: ok })).toEqual(['missing "choice"']);
    expect(spec.validate("o0")).toEqual(["the answer is not a JSON object"]);
    // The route: checked on the map the question showed, step by step; never a hard problem.
    expect(spec.validate({ choice: "o0", reason: "x", route: "r1c2 r2c0 r3c1 r4c1" })).toEqual([]);
    expect(spec.softValidate!({ choice: "o0", reason: "x", route: "r1c2 r2c0 r3c1 r4c1" })).toEqual(["route: 第 2 步 r1c2 → r2c0：没有连线（r1c2 只连到 r2c1、r2c2；没有飞行靴次数）"]);
    expect(spec.softValidate!({ choice: "o0", reason: "x", route: "p1" })).toEqual(['route "p1" names no node ids (the node ids from one of next_nodes to the boss, e.g. "r4c1 r5c2 … r16c3")']);
    expect(spec.softValidate!({ choice: "o0", reason: "x", route: "keep" })[0]).toMatch(/^route "keep" names no node ids/);
    expect(spec.softValidate!({ choice: "o0", reason: "x" })).toEqual(['missing "route": the node ids from one of state.act_route.next_nodes to the boss']);
    // A list of ids reads as the ids.
    expect(spec.softValidate!({ choice: "o0", reason: "x", route: ["r1c2", "r2c2", "r3c2", "r4c1"] })).toEqual([]);
    // A route review: keep is fine; no route keeps the plan (not re-asked); boots on the review's map.
    const review = pickSpec("reward/card", { a: null }, { route_review: { ...view({ boots: 1 }), plan: "…" } });
    expect(review.softValidate!({ choice: "a", reason: "x", route: "keep", route_reason: "y" })).toEqual([]);
    expect(review.softValidate!({ choice: "a", reason: "x" })).toEqual([]);
    expect(review.softValidate!({ choice: "a", reason: "x", route: "r1c2 r2c0 r3c1 r4c1" })).toEqual([]);
    expect(review.softValidate!({ choice: "a", reason: "x", route: "r1c2 r2c0 r3c2 r4c1" })).toEqual(["route: 飞行靴只剩 1 次，这条路线不沿连线跳了 2 次（第 2、3 步）"]);
    expect(review.softValidate!({ choice: "a", reason: "x", route: "r1c2 r2c2 r3c2" })).toEqual(["route: 终点 r3c2（普通战）不是 boss：路线要一直走到 boss（r4c1、r5c1）"]);
  });
});

describe("route plan spec (map/route-plan, map/route-review)", () => {
  const state = (over: Parameters<typeof input>[0] = {}, extra: Record<string, unknown> = {}) => ({ route_map: { ...JSON.parse(JSON.stringify(routeView(buildRouteMap(input(over))))), ...extra } });

  it("{route, reason}: the route checked on the map; an illegal one is a hard problem, re-asked once", () => {
    const spec = routePlanSpec("map/route-plan", state());
    expect(spec.kind).toBe("plan");
    expect(spec.reask).toBe(true);
    expect(spec.schema.required).toEqual(["route", "reason"]);
    expect(spec.validate({ route: "r1c0 r2c0 r3c1 r4c1 r5c1", reason: "rests" })).toEqual([]);
    expect(spec.validate({ route: ["r1c2", "r2c2", "r3c2", "r4c1"], reason: "elite" })).toEqual([]);
    expect(spec.validate({ route: "r1c2 r2c1 r3c1 r4c9", reason: "x" })).toEqual(["route: 第 4 步 r4c9：地图上没有这个节点"]);
    expect(spec.validate({ route: "r1c2 r2c1 r3c2 r4c1", reason: "x" })).toEqual(["route: 第 3 步 r2c1 → r3c2：没有连线（r2c1 只连到 r3c1；没有飞行靴次数）"]);
    expect(spec.validate({ route: "keep", reason: "x" })[0]).toMatch(/^route "keep" names no node ids/);
    expect(spec.validate({ reason: "x" })).toEqual(['missing "route" (the node ids from one of next_nodes to the boss)']);
    expect(spec.validate("r1c0")).toEqual(["the answer is not a JSON object"]);
    // The review after the act-start Ancient: keep is an answer.
    const review = routePlanSpec("map/route-review", state({}, { plan: "r1c2 精英 → …" }));
    expect(review.validate({ route: "keep", reason: "still fine" })).toEqual([]);
    expect(review.validate({ route: "r1c0 r2c0 r3c1 r4c1", reason: "rest" })).toEqual([]);
  });
});

describe("stable schemas (one per question kind)", () => {
  it("picks share one superset schema; a shop list drops its step enum; plans stay as they are", () => {
    const one = stableSchema(pickSpec("reward/card", { card0: null, skip: null }, {}));
    const other = stableSchema(pickSpec("event/act-plan", { o0: null, "o1:discard": null }, { act_route: JSON.parse(JSON.stringify(routeView(buildRouteMap(input())))) }));
    expect(other).toEqual(one);
    expect(one.required).toEqual(["choice", "reason"]);
    expect(Object.keys(one.properties!)).toEqual(["choice", "reason", "route", "route_reason", "cards", "discard"]);
    expect(JSON.stringify(one)).not.toContain('"enum"');
    const shop = stableSchema(shopPlanSpec("shop/plan", { buy_card0: null, leave: null }, {}));
    expect(shop.properties!["plan"]!.items).toEqual({ type: "string" });
    expect(stableSchema(runPlanSpec())).toEqual(runPlanSpec().schema);
    expect(stableSchema(fightPlanSpec())).toEqual(fightPlanSpec().schema);
  });
});

describe("plan specs", () => {
  it("shop list: valid steps, one removal, affordable first step", () => {
    const options = { buy_card0: JSON.stringify({ price: 49, affordable_now: true }), buy_relic0: JSON.stringify({ price: 300, affordable_now: false }), remove: JSON.stringify({ price: 75 }), leave: null };
    const spec = shopPlanSpec("shop/plan", options, { facts: { your_cards: { c0: "打击", c1: "防御" } } });
    expect(spec.schema.properties!["plan"]!.items!.enum).toEqual(["buy_card0", "buy_relic0", "leave", "remove:c0", "remove:c1"]);
    expect(spec.validate({ plan: ["buy_card0", "remove:c0", "leave"], reason: "ok" })).toEqual([]);
    expect(spec.validate({ plan: ["buy_relic0"], reason: "x" })).toEqual(["first step buy_relic0 is not affordable now"]);
    expect(spec.validate({ plan: ["remove:c0", "remove:c1"], reason: "x" })).toEqual(["more than one card removal"]);
    expect(spec.validate({ reason: "x" })).toEqual(['missing "plan" list']);
  });

  it("run plan: accepted exactly when v3's isRunPlanReply accepts it", () => {
    const spec = runPlanSpec();
    for (const answer of [{ archetype: "block" }, { want: [] }, { choice: "review", reason: "x" }, {}, { summary: "  " }, { block_target: 5 }]) {
      expect(spec.validate(answer).length === 0).toBe(isRunPlanReply(answer));
    }
  });

  it("fight plan: potions as a list in the schema, a map for the loop", () => {
    expect(fightPlanSpec().schema.properties!["potions"]!.type).toBe("array");
    expect(fightPlanFromSchema({ approach: "race", potions: [{ potion: "BLOOD_POTION", use: "emergency" }, { potion: 3 }] })).toEqual({ approach: "race", potions: { BLOOD_POTION: "emergency" } });
    expect(fightPlanFromSchema({ potions: { A: "any" } })).toEqual({ potions: { A: "any" } });
  });
});

describe("message layout", () => {
  const memory: Record<string, JsonValue> = { act: "a", history: "", knowledge: "k" };
  const spec = pickSpec("x", { a: null }, {});

  it("a choice question is v3's choice message; a task is v3's task message", () => {
    const state: Record<string, JsonValue> = { hp: 3 };
    const options = { a: "A", b: null };
    const choice: BrainRequest = { label: "x", system: "", memory, question: "Q?", options, payload: state, spec };
    expect(userMessage(choice)).toBe(choiceMessage(state, "Q?", options, memory));
    const task: BrainRequest = { label: "run-plan", system: "", memory, question: "TASK", payload: { run_state: { act: 1 }, previous_plan: null }, spec };
    expect(userMessage(task)).toBe(taskMessage({ task: "TASK", run_state: { act: 1 }, memory, previous_plan: null }));
    expect(userMessage({ ...task, memory: undefined })).toBe(taskMessage({ task: "TASK", run_state: { act: 1 }, previous_plan: null }));
    expect(reaskMessage(choice, ["p1", "p2"])).toBe("Your previous answer cannot be used: p1; p2. Valid choices: a, b. Reply again with the whole corrected answer as one JSON object in the same format.");
    // A plan answer (a route) is not an option key: no "valid choices".
    const route: BrainRequest = { ...choice, label: "map/route-plan", spec: routePlanSpec("map/route-plan", {}) };
    expect(reaskMessage(route, ["route: 第 2 步 …"])).toBe("Your previous answer cannot be used: route: 第 2 步 …. Reply again with the whole corrected answer as one JSON object in the same format.");
  });

  it("reads an answer out of fenced, doubled or drafted replies and maps option names to keys", () => {
    expect(parseAnswerText('```json\n{"choice": "a"}\n```')).toEqual({ choice: "a" });
    expect(parseAnswerText('{"choice": "review", "reason": "x"} {"archetype": "y"}')).toEqual({ archetype: "y" });
    expect(parseAnswerText('I pick {"choice": "b", "reason": "z"} now')).toEqual({ choice: "b", reason: "z" });
    expect(parseAnswerText("nothing here")).toBeNull();
    const options = { o0: JSON.stringify({ option: "拒绝" }), o1: JSON.stringify({ option: "沉溺" }), "o2:c5": JSON.stringify({ option: "变化" }) };
    const req: BrainRequest = { label: "event/choose", system: "", question: "", options, payload: {}, spec: pickSpec("event/choose", options, {}) };
    expect(normalisePick(req, { choice: "沉溺", reason: "x" })).toEqual({ choice: "o1", reason: "x" });
    expect(normalisePick(req, { choice: "o2", cards: ["c5"] })).toEqual({ choice: "o2:c5", cards: ["c5"] });
    expect(normalisePick(req, { choice: "nope" })).toEqual({ choice: "nope" });
  });
});

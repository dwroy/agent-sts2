/** V4 brain answer specs (src/brain/specs.ts) and the shared message layout (src/brain/message.ts). */

import { describe, expect, it } from "vitest";

import { normalisePick, parseAnswerText, reaskMessage, userMessage } from "../src/brain/message.js";
import { fightPlanFromSchema, fightPlanSpec, pickSpec, runPlanSpec, shopPlanSpec } from "../src/brain/specs.js";
import type { BrainRequest } from "../src/brain/types.js";
import { choiceMessage, taskMessage } from "../src/llm/deepseek-message.js";
import { isRunPlanReply } from "../src/strategy/run-plan.js";
import type { JsonValue } from "../src/util/json.js";

describe("pick spec", () => {
  const options = {
    o0: JSON.stringify({ option: "离开" }),
    o1: JSON.stringify({ option: "变化", eligible_cards: { c1: "打击", c2: "防御" }, cards_to_name: 'answer "cards": [2 keys from eligible_cards, repeat a key for several copies]' }),
    "o2:discard": JSON.stringify({ option: "拿药水" }),
  };

  it("builds a strict schema with the fields the question needs", () => {
    const spec = pickSpec("event/choose", options, { act_routes: { r0: "左", r1: "右" } });
    expect(spec.kind).toBe("pick");
    expect(spec.schema.required).toEqual(["choice", "reason", "route", "cards", "discard"]);
    expect(spec.schema.additionalProperties).toBe(false);
    expect(spec.schema.properties!["choice"]!.enum).toEqual(["o0", "o1", "o2:discard"]);
    expect(spec.schema.properties!["route"]!.enum).toEqual(["r0", "r1"]);
    expect(spec.schema.properties!["cards"]!.items!.enum).toEqual(["c1", "c2"]);
    const review = pickSpec("reward/card", { a: null }, { route_review: { routes: { r2: "x" } } });
    expect(review.schema.properties!["route"]!.enum).toEqual(["keep", "r2"]);
    expect(review.schema.required).toEqual(["choice", "reason", "route", "route_reason"]);
  });

  it("names each problem specifically", () => {
    const spec = pickSpec("event/choose", options, { act_routes: { r0: "左", r1: "右" } });
    expect(spec.validate({ choice: "o0", reason: "x", route: "r1", cards: [], discard: [] })).toEqual([]);
    expect(spec.validate({ choice: "o9", reason: "x", route: "r1" })).toEqual(["choice \"o9\" is not one of o0, o1, o2:discard"]);
    expect(spec.validate({ choice: "o1", reason: "x", route: "r1", cards: ["c1"] })).toEqual(["o1 takes 2 card(s) from its eligible_cards, got 1"]);
    expect(spec.validate({ choice: "o1", reason: "x", route: "r1", cards: ["c1", "c9"] })).toEqual(['cards ["c9"] are not in o1\'s eligible_cards (c1, c2)']);
    expect(spec.validate({ choice: "o2:discard", reason: "x", route: "r1", discard: [] })).toEqual(['o2:discard discards potions first: "discard" must name 1 or more potion slot numbers']);
    expect(spec.validate({ choice: "o0", reason: "x", route: "r7" })).toEqual(["route \"r7\" is not one of r0, r1"]);
    expect(spec.validate({ reason: "x", route: "r0" })).toEqual(['missing "choice"']);
    expect(spec.validate("o0")).toEqual(["the answer is not a JSON object"]);
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

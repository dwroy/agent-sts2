/** Strict-format contract and legacy-scope controls; fixed interface data only. */
import { expect, it } from "vitest";
import { codexKindSchema, codexSchema, dropNulls } from "../src/brain/engines/codex.js";
import { pickSpec } from "../src/brain/specs.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeRoutePlan, routeBlockState } from "../src/hand/screens/route-plan.js";
import { ROUTE_REVIEW_NOTE, withRouteReview } from "../src/hand/screens/route-review.js";
import { endgameQuestion, endgameTask } from "../src/memory/endgame-plan.js";
import { buildRouteMap } from "../src/sim/route-map.js";
import type { AskDecision } from "../src/memory/types.js";
import { costs, input } from "./route-fixture.js";
import { env } from "./oneshot-support.js";
import { changedRoute, previousRoute, routeBoard, routeReason } from "./route-reason-fixture.js";

const map = buildRouteMap(input());
const review = routeBlockState({ map, plan: previousRoute.split(" "), start: { hp: 40, max: 80 }, costs });
const payload = (character = "SILENT", ascension = 10) => {
  const state = parseGameState(routeBoard("reward", character, ascension));
  return { route_review: review, ...(endgameQuestion(state, "reward/card") ? { run_plan_task: endgameTask(state, "reward/card", true) } : {}) };
};

it.each(["used", "all"] as const)("keeps the changed-route reason in %s fields with either field order and text cap", fields => {
  const spec = pickSpec("reward/card", { a: null }, payload());
  expect(spec.routeReasonOnChange).toBe(true);
  expect(spec.schema.required).not.toContain("route_reason");
  for (const reasonLast of [false, true]) for (const maxFieldChars of [600, 20, null]) {
    const kind = codexKindSchema(spec, { fields, reasonLast });
    const strict = codexSchema(kind, { routeReason: "drop", routeReasonOnChange: spec.routeReasonOnChange, maxFieldChars, routePattern: true })!;
    expect((strict.properties as any).route_reason).toMatchObject({ type: ["string", "null"] });
    expect((strict.properties as any).route_reason.maxLength).toBe(maxFieldChars === null ? undefined : Math.min(maxFieldChars, 60));
    expect(strict.additionalProperties).toBe(false);
    expect(dropNulls({ choice: "a", reason: "格式", route: null, route_reason: null, run_plan: null }, kind)).toEqual({ choice: "a", reason: "格式" });
    expect(spec.softValidate?.({ choice: "a", route: changedRoute, route_reason: routeReason })).toEqual([]);
  }
});

it("leaves the legacy drop/keep schemas unchanged outside the existing target contract", () => {
  for (const [character, ascension] of [["IRONCLAD", 10], ["SILENT", 9], ["SILENT", 11], ["REGENT", 10]] as const) {
    const spec = pickSpec("reward/card", { a: null }, payload(character, ascension));
    expect(spec.routeReasonOnChange).toBeUndefined();
    const kind = codexKindSchema(spec, { fields: "used", reasonLast: false });
    expect((codexSchema(kind, { routeReason: "drop", maxFieldChars: 600 })!.properties as any).route_reason).toBeUndefined();
    expect((codexSchema(kind, { routeReason: "keep", maxFieldChars: 600 })!.properties as any).route_reason).toMatchObject({ maxLength: 60 });
  }
  const noReview = pickSpec("reward/card", { a: null }, { run_plan_task: payload().run_plan_task });
  expect(noReview.routeReasonOnChange).toBeUndefined();
});

it.each([undefined, null, "", "   ", 12])("rejects a changed route with unusable reason %j in validation and the consumer", route_reason => {
  const spec = pickSpec("reward/card", { a: null }, payload());
  const answer = { choice: "a", route: changedRoute, route_reason, run_plan: { change_reason: routeReason } };
  expect(spec.softValidate?.(answer).join()).toContain("route_reason");
  const e = env(routeBoard("reward"));
  const plan = makeRoutePlan(e, map, previousRoute.split(" "), { hp: 40, max: 80 }, costs);
  e.screenMemory.routePlan = plan;
  const decision: AskDecision = { kind: "ask", label: "reward/card", state: {}, questions: {},
    deepseek: { question: "pick", baseline: { kind: "act", label: "fixture", intent: { action: "choose_reward_card", option_index: 0 }, rationale: "格式" } },
    resolve: () => ({ intent: { action: "choose_reward_card", option_index: 0 }, rationale: "格式", confidence: null, fallback: false }) };
  const reviewed = withRouteReview(e, decision, { kind: "card", state: review, note: ROUTE_REVIEW_NOTE, map, plan, remaining: previousRoute.split(" "), costs });
  if (reviewed.kind !== "ask") throw Error("fixture");
  const result = reviewed.resolve({ pick: { type: "choice", choice: "a", probabilities: { a: 1 }, confidence: 1, raw: answer } });
  expect(result.routeReview?.outcome).toBe("invalid"); result.apply?.();
  expect(e.screenMemory.routePlan).toBe(plan);
});

// Read original frozen evidence without modifying it; publish only aggregate contract checks.
// Run from agent/: node --import tsx ../paper/materials/20261025-issue64-route-reason/replay.mts
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { closeSync, openSync, readSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { pickSpec } from "../../../agent/src/brain/specs.ts";
import { codexKindSchema, codexSchema, dropNulls } from "../../../agent/src/brain/engines/codex.ts";
import { parseAnswerText } from "../../../agent/src/brain/message.ts";
import { routeIds, routeMapFromView, checkRoute } from "../../../agent/src/sim/route-map.ts";
import { makeRoutePlan } from "../../../agent/src/hand/screens/route-plan.ts";
import { withRouteReview, ROUTE_REVIEW_NOTE } from "../../../agent/src/hand/screens/route-review.ts";
import { loadConfig } from "../../../agent/src/core/config.ts";
import { parseGameState } from "../../../agent/src/hand/mod/schema.ts";
import { createScreenMemory } from "../../../agent/src/memory/types.ts";
import { buildRunBrief } from "../../../agent/src/memory/run-brief.ts";
import { testKnowledge } from "../../../agent/tests/scenarios.ts";
import { costs } from "../../../agent/tests/route-fixture.ts";
import { routeBoard, routeReason } from "../../../agent/tests/route-reason-fixture.ts";

const root = resolve(process.env.ISSUE64_ORIGINAL_ROOT ?? fileURLToPath(new URL("../../../../..", import.meta.url)));
const original = resolve(root, ".artifacts/ops-issue58-route-reason-20261025");
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const frozen = readFileSync(resolve(original, "inventory.json"));
const inventory = JSON.parse(frozen.toString());
const reasonProblem = "route_reason must explain current facts, tradeoff and expected win benefit";
let answers = 0, consumers = 0, controls = 0;
const refs = new Set<string>();
for (const entry of inventory.rows) {
  const ref = entry.ref, bytes = Buffer.alloc(ref.bytes);
  const fd = openSync(resolve(root, ref.path), "r");
  try { assert.equal(readSync(fd, bytes, 0, ref.bytes, ref.offset), ref.bytes); } finally { closeSync(fd); }
  assert.equal(bytes.length, ref.bytes); assert.equal(sha(bytes), ref.sha256);
  refs.add(`${ref.path}:${ref.offset}`);
}
for (const hit of inventory.hits) {
  const row = JSON.parse(readFileSync(resolve(root, hit.local), "utf8"));
  const spec = pickSpec(row.label, row.options, row.payload);
  const kind = codexKindSchema(spec, { fields: "used", reasonLast: false });
  const schema = codexSchema(kind, { routeReason: "drop", routeReasonOnChange: spec.routeReasonOnChange, maxFieldChars: 600, routePattern: true })!;
  assert.deepEqual((schema.properties as any).route_reason.type, ["string", "null"]);
  assert.equal(schema.additionalProperties, false);
  const map = routeMapFromView(row.payload.route_review)!;
  const previous = routeIds(row.payload.route_review.plan)!;
  for (const answer of [row.first.answer, JSON.parse(row.raw)]) {
    assert.deepEqual(spec.validate(answer), []);
    assert.deepEqual(spec.softValidate!(answer), [reasonProblem]);
    assert.deepEqual(checkRoute(map, routeIds(answer.route)!), []);
    // A synthetic explanation exercises transport only; do not repurpose the independent construction reason.
    const wire = { ...answer, route_reason: routeReason };
    for (const key of Object.keys(wire)) assert(Object.hasOwn((schema.properties as object), key));
    const parsed = dropNulls(parseAnswerText(JSON.stringify(wire)), kind) as Record<string, any>;
    assert.deepEqual(spec.validate(parsed), []); assert.deepEqual(spec.softValidate!(parsed), []);
    for (const route of [undefined, "keep", previous.join(" ")]) {
      assert.deepEqual(spec.softValidate!({ ...answer, route }), []); controls++;
    }
    const state = parseGameState(routeBoard("reward"));
    const env: any = { state, screenMemory: createScreenMemory(), knowledge: testKnowledge,
      thresholds: loadConfig({}).thresholds, brief: buildRunBrief(state, testKnowledge) };
    const plan = makeRoutePlan(env, map, previous, { hp: 40, max: 80 }, costs);
    env.screenMemory.routePlan = plan;
    const review = withRouteReview(env, { kind: "ask", label: row.label, state: {}, questions: {},
      deepseek: { question: "pick", baseline: { kind: "act", label: "fixture", intent: { action: "choose_reward_card", option_index: 0 }, rationale: "格式" } },
      resolve: () => ({ intent: { action: "choose_reward_card", option_index: 0 }, rationale: "格式", confidence: null, fallback: false }) },
    { kind: "card", state: row.payload.route_review, note: ROUTE_REVIEW_NOTE, map, plan, remaining: previous, costs });
    assert.equal(review.kind, "ask");
    const result = (review as any).resolve({ pick: { type: "choice", choice: parsed.choice, probabilities: { [parsed.choice]: 1 }, confidence: 1, raw: parsed } });
    assert.equal(result.routeReview.outcome, "change"); assert.equal(result.routeReview.reason, routeReason);
    result.apply();
    assert.equal(env.screenMemory.routePlan.path.map((n: any) => `r${n.row}c${n.col}`).join(" "), routeIds(parsed.route)!.join(" "));
    assert(env.screenMemory.routePlan.why.includes(routeReason));
    answers++; consumers++;
  }
}
const result = { fixture_only: true, model_or_game_calls: 0, original_artifacts_modified: false,
  inventory_sha256: sha(frozen), original_slices_verified: refs.size, original_answers_still_rejected_without_route_reason: answers,
  schemas_with_nullable_reason: inventory.hits.length, legal_changes_with_synthetic_separate_reason_consumed: consumers,
  omission_keep_repeated_controls: controls, explanation_semantics_or_win_benefit_verified: false,
  strict_session_persistence_and_cold_restore: "agent/tests/brain-codex-session.test.ts: #64 strict (8 scenarios)" };
writeFileSync(new URL("replay-summary.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
process.stdout.write(JSON.stringify(result) + "\n");

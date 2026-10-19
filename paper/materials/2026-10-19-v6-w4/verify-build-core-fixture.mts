/** Offline synthetic contract only; no model, game action or knowledge publication. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { directionPlanSpec, directionSummaries, directionTask } from "../../../agent/src/v6/direction-plan.js";
import { comboProjection, coreFixture } from "../../../agent/tests/v6-direction-core-fixtures.js";

const dir = dirname(fileURLToPath(import.meta.url));
const answer = { schema: "direction-weights-v1", direction_weights: { TEST_A: 1 }, ideal_overrides: { TEST_A: ["TEST_CARD"] },
  potion_directions: [], route: "keep", rest: "auto", checkpoint: 20, reason: "Synthetic fixture only" };
const payload = directionTask({ summaries: directionSummaries("silent", 0, [coreFixture()], [], null), entries: [comboProjection()],
  appearedCards: [], potionIds: [], floor: 8, current: { synthetic: true }, previous: answer });
const spec = directionPlanSpec(payload)!;
assert.deepEqual(spec.validate!(answer), []);
const wire = { payload, answer_schema: spec.schema, accepted_answer: answer };
const bytes = JSON.stringify(wire, null, 2) + "\n";
if (process.argv[2] === "freeze") writeFileSync(join(dir, "build-core-fixture.json"), bytes);
else assert.equal(readFileSync(join(dir, "build-core-fixture.json"), "utf8"), bytes);
const receipt = { checked_at: new Date().toISOString(), exact_match: true,
  sha256: createHash("sha256").update(bytes).digest("hex"), bytes: Buffer.byteLength(bytes), network_requests: 0 };
writeFileSync(join(dir, "build-core-fixture-readback.json"), JSON.stringify(receipt, null, 2) + "\n");
process.stdout.write(JSON.stringify(receipt) + "\n");

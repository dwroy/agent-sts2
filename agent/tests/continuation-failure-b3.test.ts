/** Fixed fault injection checks diagnostic delivery, not the original missing sample's mechanism. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { withBossSim, bossEvaluationPending } from "../src/sim/build-sim-facts.js";
import { captureContinuationFailure, ContinuationSampleError } from "../src/sim/continuation-failure.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { board, decide, env, setupOneshotTests } from "./oneshot-support.js";
setupOneshotTests();
beforeAll(() => setMonsterDbForTests(FIXTURE_DB));
afterAll(() => setMonsterDbForTests(null));
const directory = mkdtempSync(join(tmpdir(), "continuation-b3-"));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

it("retains C1 pending/degraded and no numbers while saving a separate question-bound complete envelope", async () => {
  const e = env(board("xljq-f5-reward", "reward"), undefined, { requiredBossEvaluation: true });
  const decision = decide(e);
  e.state.run!.raw["character_id"] = "SILENT";
  const failure = captureContinuationFailure("nonpositive-hp", 76490739, { synthetic: true, first: { won: true, died: false, resources: { hp: -2 } }, full: "x".repeat(4000) });
  const setup = { runner: { run: async () => { throw new ContinuationSampleError("missing successful first-fight resources: nonpositive-hp; seed=76490739; " + "x".repeat(3000), failure); } },
    samples: 1000, db: FIXTURE_DB, mm: FIXTURE_MM, now: () => 0, failureDirectory: directory };
  let path: string | undefined;
  for (let i = 1; i <= 3; i++) {
    const out = await withBossSim(decision, e, setup);
    expect(out.record).toMatchObject({ completion: { status: i < 3 ? "pending" : "degraded", attempts: i, samples: 0 } });
    expect(bossEvaluationPending(out.decision, e.state, out.record!)).toBe(i < 3 ? out.record!.error : null);
    expect(out.record!.base).toBeUndefined();
    expect(out.record!.options).toBeUndefined();
    expect(String(out.record!.error).length).toBeLessThanOrEqual(164);
    const ref = out.record!.resource_failure as Record<string, unknown>;
    expect(ref).toMatchObject({ status: i === 1 ? "saved" : "deduplicated", complete: true });
    path ??= String(ref.path);
    expect(ref.path).toBe(path);
    const saved = JSON.parse(readFileSync(path, "utf8"));
    expect(saved.question).toMatchObject({ character: "silent", label: decision.label, question_key: (out.record!.completion as Record<string, unknown>).key });
    expect(saved.sample.payload.length).toBeGreaterThan(3000);
    expect(JSON.stringify(out.decision)).not.toContain(saved.sample.payload);
  }
});

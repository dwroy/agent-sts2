import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { deserialize } from "node:v8";
import { gunzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";
import { fightSample } from "../../../../agent/src/sim/boss-sim.js";
import type { RolloutInput } from "../../../../agent/src/reflex/rollout.js";
import type { Plan } from "../../../../agent/src/reflex/turn-solver.js";

const root = new URL("../", import.meta.url);
const data = JSON.parse(gunzipSync(readFileSync(new URL("../../../../agent/tests/fixtures/continuation-retaliation-cen1.json.gz", import.meta.url))).toString());
const results = data.fixtures.map((fixture: { source: string; original: unknown; floor: number; label: string; fixture_payload: string; fixture_sha256: string }) => {
  const bytes = Buffer.from(fixture.fixture_payload, "base64");
  if (createHash("sha256").update(bytes).digest("hex") !== fixture.fixture_sha256) throw Error("fixture digest mismatch");
  const { input, sample } = deserialize(bytes) as { input: RolloutInput; sample: { plan: Plan | null; seed: number; maxTurns: number; scripts: boolean; order: Parameters<typeof fightSample>[5] } };
  const start = performance.now();
  const result = fightSample(input, sample.plan, sample.seed, sample.maxTurns, sample.scripts, sample.order);
  const elapsed_ms = performance.now() - start;
  const original = JSON.parse(gunzipSync(readFileSync(new URL(`evidence/${fixture.source}.gz`, root))).toString());
  const saved = deserialize(Buffer.from(original.sample.payload, "base64"));
  const audit = saved.first.failureTrajectory.at(-1).resourceAudit;
  return { source: fixture.source, floor: fixture.floor, label: fixture.label, seed: sample.seed,
    before: fixture.original, outcome: { startHp: audit.startHp, hpAfter: audit.outcome.hpAfter,
      dies: audit.outcome.dies, winsFight: audit.outcome.winsFight, enemyHpAfter: audit.outcome.enemyHpAfter,
      retaliated: audit.outcome.retaliated, wonBeforeResources: audit.wonBeforeResources },
    after: { won: result.won, died: result.died, hp: result.resources?.hp, turns: result.turns,
      capped: result.capped, timeUp: result.timeUp, sequence: result.sequence }, elapsed_ms };
});
writeFileSync(new URL("checks/replay.json", root), JSON.stringify({ run: data.run, mode: "serial fightSample; no factory, worker, cache, model or live mutation", results }, null, 2) + "\n");
console.log(JSON.stringify({ count: results.length, first_losses: results.filter((r: { after: { won: boolean; died: boolean } }) => !r.after.won && r.after.died).length }));

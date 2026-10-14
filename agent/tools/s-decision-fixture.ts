/** Re-evaluate one existing immutable B3 input; this is a current-model replay, not historical sample recovery. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deserialize } from "node:v8";
import { gunzipSync, gzipSync } from "node:zlib";
import { compareOptions, type DeckOption } from "../src/sim/build-sim.js";
import { BuildSimPool, type DeckSimRunner } from "../src/sim/build-sim-pool.js";
import type { RolloutInput } from "../src/reflex/rollout.js";
import { signAudit, type SignCase } from "./s-sign-audit.js";

const [input, expectedSha, output] = process.argv.slice(2);
if (!input || !expectedSha || !output) throw new Error("usage: s-decision-fixture.ts input.bin[.gz] sha256 output-directory");
const file = readFileSync(input), bytes = input.endsWith(".gz") ? gunzipSync(file) : file;
const sha = createHash("sha256").update(bytes).digest("hex");
if (sha !== expectedSha) throw new Error("frozen input changed");
const fixture = deserialize(bytes) as { base: RolloutInput; options: DeckOption[] };
if (!fixture.base?.meta || !Array.isArray(fixture.options)) throw new Error("not a frozen B3 input");
const cases: SignCase[] = [];
const pool = new BuildSimPool(4);
let phase = 0;
const runner: DeckSimRunner = { run: async (request) => {
  const result = await pool.run(request);
  phase += 1;
  result.outcomes.forEach((orders, deck) => orders.forEach((samples, order) => {
    cases.push({ id: `${phase}:${deck}:${order}`, boss: request.base.enemies.map((enemy) => enemy.id).sort().join("+"),
      ascension: request.base.meta.asc, lane: "b3", source: sha,
      samples: result.complete.flatMap((index) => {
        const sample = samples[index];
        return sample ? [{ won: sample.won, died: sample.died, capped: sample.capped, timeUp: sample.timeUp,
          turns: sample.turns, revived: sample.revived, ...(sample.sequence ? { sequence: sample.sequence } : {}), bossMargin: sample.bossMargin }] : [];
      }) });
  }));
  return result;
} };
mkdirSync(output, { recursive: true });
writeFileSync(join(output, "binding.json"), JSON.stringify({ input, sha256: sha, samples: 1000, seed: 7, workers: 4,
  started_at: new Date().toISOString(), scope: "Frozen historical B3 input under current model; no API or game actions; original owner data unchanged" }, null, 2) + "\n");
try {
  const result = await compareOptions(runner, fixture.base, fixture.options, {
    samples: 1000, seed: 7, deadlineMs: 11000, requireComplete: true, quantitative: true, readiness: true,
  });
  writeFileSync(join(output, "samples.json.gz"), gzipSync(JSON.stringify(cases)));
  writeFileSync(join(output, "sign-audit.json"), JSON.stringify(signAudit(cases), null, 2) + "\n");
  writeFileSync(join(output, "result.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ samples: result.samples, options: result.options.length, ms: result.elapsedMs,
    readinessMs: result.readinessMs, audits: cases.length, eligible: result.readiness?.trust.rankingEligible }));
} finally { await pool.close(); }

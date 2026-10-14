import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { deserialize } from "node:v8";
import { gzipSync } from "node:zlib";
import { compareOptions } from "../../../.worktrees/v5-required-boss-evaluation-20261014/agent/src/sim/build-sim.ts";
import { SerialDeckRunner } from "../../../.worktrees/v5-required-boss-evaluation-20261014/agent/src/sim/build-sim-pool.ts";

const source = "/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261014-114302/learner/runs/20261014-123935-fix-batch/prepared/d98f1d44-2b13-44f5-9c55-300d78211c4a.bin";
const expected = "f83a204f64cbb80bad56f49d963e1083af8e2f363b2da74cc0c3368b2224b04b";
const raw = readFileSync(source);
const hash = (x: Buffer) => createHash("sha256").update(x).digest("hex");
if (hash(raw) !== expected) throw new Error("original frozen input changed");
const request = deserialize(raw);
writeFileSync(new URL("./historical-probe-r2-input.bin.gz", import.meta.url), gzipSync(raw));
const knowledge = [];
for (const dir of ["../knowledge/common", "../knowledge/characters/silent"]) {
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) knowledge.push({ path: `${dir}/${file}`, sha256: hash(readFileSync(`${dir}/${file}`)) });
}
writeFileSync(new URL("./historical-probe-r2-binding.json", import.meta.url), JSON.stringify({ source, input_sha256: expected,
  kind: "Historical frozen input under current development model, not exact old-model reproduction",
  character: process.env.CHARACTER, samples: 1000, seed: 7, workers: 1, knowledge,
  started_at: new Date().toISOString(), original_R2_owner_outputs_unchanged: true }, null, 2) + "\n");
const start = performance.now();
const result = await compareOptions(new SerialDeckRunner(), request.base, request.options, {
  samples: 1000, seed: 7, deadlineMs: 11000, requireComplete: true, quantitative: true, diagnostics: true,
});
writeFileSync(new URL("./historical-probe-r2-result.json", import.meta.url), JSON.stringify({
  ...result, actual_wall_ms: performance.now() - start, input_sha256: expected,
  scope: "Current-model offline computation/consumer coverage only; not old-model equality or actual boss win rate",
}, null, 2) + "\n");
console.log(JSON.stringify({ samples: result.samples, requested: result.requested, timedOut: result.timedOut,
  ms: performance.now() - start, candidates: result.options.length, completion: result.completion,
  margin: result.options.map((o) => ({ key: o.key, margin: (o.quantitative as any)?.boss_relative_margin })) }));

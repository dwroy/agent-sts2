import { writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { board } from "../../../.worktrees/v5-required-boss-evaluation-20261014/agent/tests/boss-sim-fixture.ts";
import { compareOptions } from "../../../.worktrees/v5-required-boss-evaluation-20261014/agent/src/sim/build-sim.ts";
import { SerialDeckRunner } from "../../../.worktrees/v5-required-boss-evaluation-20261014/agent/src/sim/build-sim-pool.ts";

const input = board({ bossHp: 12 });
const options = [{ key: "skip", change: null }, ...Array.from({ length: 12 }, (_, i) => ({
  key: `same_candidate_${i}`, change: { piles: { ...input.piles, draw: [] } },
}))];
const run = async (required: boolean) => {
  const runner = new SerialDeckRunner();
  const start = performance.now();
  const result = await compareOptions(runner, input, options, { samples: 1000, seed: 7, quantitative: true,
    diagnostics: true, requireComplete: required, ...(required ? { deadlineMs: 0 } : {}) });
  return { result, runner, ms: performance.now() - start };
};
const baseline = await run(false);
const required = await run(true);
if (!isDeepStrictEqual(baseline.result.base, required.result.base) || !isDeepStrictEqual(baseline.result.options, required.result.options)) {
  throw new Error("candidate measurements changed");
}
const start = performance.now();
const reused = await compareOptions(required.runner, input, options, { samples: 1000, seed: 7, quantitative: true,
  diagnostics: true, requireComplete: true, deadlineMs: 0 });
const summary = {
  scope: "fixed synthetic engineering fixture; not historical gameplay, win-rate efficacy or production latency",
  samples: required.result.samples, requested: required.result.requested, candidates_preserved: options.length,
  baseline_ms: baseline.ms, required_ms: required.ms, reuse_ms: performance.now() - start,
  baseline_decks: baseline.result.diagnostics?.decks, required_decks: required.result.diagnostics?.decks,
  numerical_options_identical: true, all_samples_complete_despite_zero_latency_target: !required.result.timedOut,
  completion: required.result.completion, reuse: reused.completion,
};
writeFileSync(new URL("./benchmark-result.json", import.meta.url), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary));

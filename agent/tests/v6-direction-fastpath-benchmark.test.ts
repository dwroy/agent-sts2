import { writeFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { measureExecutionSequences } from "./v6-direction-fastpath-fixture.js";
import { setupOneshotTests } from "./oneshot-support.js";

setupOneshotTests();
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
it("measures frozen execution sequences with a deterministic 5000 ms provider allowance", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const result = await measureExecutionSequences("on", 5_000);
  vi.useRealTimers();
  const realClock = await measureExecutionSequences("on");
  const output = process.env.V6_FASTPATH_BENCH_OUT;
  if (output) writeFileSync(output, JSON.stringify({ allowance_5000_ms: result, real_clock: realClock }, null, 2) + "\n");
  expect(result.reward.errors).toBe(0); expect(result.shop.errors).toBe(0);
  expect(result.reward.calls).toHaveLength(0); expect(result.shop.calls).toHaveLength(1);
  for (const row of [...result.reward.rows, ...result.shop.rows.slice(1)]) {
    expect(Number(row.pre_ms ?? 0) + Number(row.planner_ms ?? 0)).toBeLessThan(1_000);
  }
});

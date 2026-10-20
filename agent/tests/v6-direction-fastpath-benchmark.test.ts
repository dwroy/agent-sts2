import { writeFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { measureExecutionSequences } from "./v6-direction-fastpath-fixture.js";
import { setupOneshotTests } from "./oneshot-support.js";

setupOneshotTests();
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
it("keeps the V5 shop request and execution budget without standalone direction work", async () => {
  vi.stubEnv("V6_DIRECTION_REPLAN", "off");
  vi.useFakeTimers({ toFake: ["Date"] });
  const result = await measureExecutionSequences("on", 5_000);
  vi.useRealTimers();
  const realClock = await measureExecutionSequences("on");
  const baseline = await measureExecutionSequences("off");
  const output = process.env.V6_FASTPATH_BENCH_OUT;
  if (output) writeFileSync(output, JSON.stringify({ allowance_5000_ms: result, real_clock: realClock, baseline_off: baseline }, null, 2) + "\n");
  const payloads = (rows: typeof result.shop.rows) => JSON.stringify(rows.map(({ label, chosen, questions }) => ({ label, chosen, questions })));
  for (const measured of [result, realClock]) {
    expect(measured.reward.errors).toBe(0); expect(measured.shop.errors).toBe(0);
    // Roy's 18:4x contract removes direction work, while keeping the original V5 brain request.
    expect(measured.reward.calls).toEqual([]); expect(measured.shop.calls).toEqual([]);
    expect(measured.reward.brain_calls).toEqual([]);
    expect(measured.shop.brain_calls.map(({ label, plan }) => ({ label, plan }))).toEqual([{ label: "shop/plan", plan: true }]);
    expect(measured.reward.rows.map(row => row.label)).toEqual(["reward/claim", "reward/claim", "reward/claim", "reward/proceed"]);
    expect(measured.shop.rows.map(row => row.label)).toEqual(["shop/plan", "shop/buy", "shop/buy", "shop/buy", "shop/buy", "shop/buy", "shop/leave"]);
    for (const kind of ["reward", "shop"] as const) {
      expect(measured[kind].actions).toEqual(baseline[kind].actions);
      expect(payloads(measured[kind].rows)).toBe(payloads(baseline[kind].rows));
      for (const row of measured[kind].rows) {
        expect(Number(row.pre_ms ?? 0) + Number(row.planner_ms ?? 0)).toBeLessThan(1_000);
      }
    }
  }
});

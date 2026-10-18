/** Fixed paired outcomes only; no refreshed knowledge, worker, game or model. */
import { expect, it } from "vitest";
import { AdaptiveSampler, isAdaptiveComplete } from "../src/sim/adaptive-sampler.js";
import { ADAPTIVE_RULE, humanPaceSampling, type AdaptiveCandidate, type AdaptiveSample } from "../src/sim/adaptive-shadow.js";
const samples = (n: number, win: (i: number) => boolean): AdaptiveSample[] => Array.from({ length: n }, (_, i) => ({
  won: win(i), died: !win(i), capped: false, timeUp: false, turns: 2, hpLoss: win(i) ? 2 : 70, enemyHpLeft: win(i) ? 0 : 50,
}));
function run(lane: "b2" | "b3", rows: AdaptiveCandidate[], low = false) {
  const p = humanPaceSampling(lane, low), sampler = new AdaptiveSampler(rows, { lane, requested: p.cap, allowS: false, ...p.adaptive });
  const ranges: number[][] = [];
  for (let next = sampler.next(); next; next = sampler.next()) {
    ranges.push([next.from, next.to]);
    sampler.observe(rows.filter((r) => next!.active.includes(r.key)).map((r) => ({ ...r, samples: r.samples.slice(0, next!.to) })));
  }
  const result = sampler.result();
  expect(isAdaptiveComplete(result, lane, p.cap, new Map(result.candidates.map((r) => [r.key, r.samples])))).toBe(true);
  return { result, ranges };
}
it("leaves the legacy C2 defaults unchanged and exposes the four approved Silent profiles", () => {
  expect(ADAPTIVE_RULE).toMatchObject({ b3First: 300, b2First: 200, batch: 100 });
  expect(humanPaceSampling("b3", false)).toMatchObject({ cap: 300, adaptive: { first: 100, batch: 100 } });
  expect(humanPaceSampling("b2", false)).toMatchObject({ cap: 200, adaptive: { first: 50, batch: 50 } });
  for (const lane of ["b2", "b3"] as const) expect(humanPaceSampling(lane, true)).toMatchObject({ cap: 100, adaptive: { first: 50, batch: 50 } });
});
it("stops B3 below 3 points without comparing the nonselectable baseline or inspecting future outcomes", () => {
  const a = samples(300, (i) => i < 80), b = samples(300, (i) => i < 81);
  const { result, ranges } = run("b3", [{ key: "@current", baseline: true, samples: samples(300, () => false) },
    { key: "a", samples: a }, { key: "b", samples: b }]);
  expect(ranges).toEqual([[0, 100]]);
  expect(result).toMatchObject({ stop_reason: "indifferent", indifference_spread: .01 });
  expect(result.candidates.every((c) => c.samples === 100 && c.stop === "indifferent")).toBe(true);
});
it("does not treat exactly 3 points as indifferent, and extends B3 in 100-sample ranges", () => {
  const { ranges, result } = run("b3", [{ key: "@current", baseline: true, samples: samples(300, () => false) },
    { key: "a", samples: samples(300, (i) => i % 100 < 80) }, { key: "b", samples: samples(300, (i) => i % 100 < 83) }]);
  expect(ranges).toEqual([[0, 100], [100, 200], [200, 300]]);
  expect(result.stop_reason).not.toBe("indifferent");
});
it("uses 50-sample B2 ranges and stops when the leader exceeds 3 paired standard errors", () => {
  const { ranges, result } = run("b2", [{ key: "a", samples: samples(200, (i) => i % 10 < 8) },
    { key: "b", samples: samples(200, (i) => i % 10 < 7) }]);
  expect(ranges).toEqual([[0, 50], [50, 100]]);
  expect(result.stop_reason).toBe("leader");
});
it.each([false, true])("caps unresolved B2 at the approved limit (low trust %s)", (low) => {
  const { ranges, result } = run("b2", [{ key: "a", samples: samples(200, (i) => i % 50 < 25) },
    { key: "b", samples: samples(200, (i) => i % 50 >= 23) }], low);
  expect(ranges).toEqual(low ? [[0, 50], [50, 100]] : [[0, 50], [50, 100], [100, 150], [150, 200]]);
  expect(result.stop_reason).toBe("max");
});
it("keeps a mid-round deadline partial and rejects an invented indifference or oversized cap", () => {
  const p = humanPaceSampling("b2", false), sampler = new AdaptiveSampler([{ key: "a" }, { key: "b" }],
    { lane: "b2", requested: p.cap, allowS: false, ...p.adaptive });
  sampler.observePartial([{ key: "a", samples: samples(17, () => false) }, { key: "b", samples: samples(17, () => false) }], 17);
  const result = sampler.result(true), counts = new Map(result.candidates.map((r) => [r.key, r.samples]));
  expect(result).toMatchObject({ status: "partial", stop_reason: "budget" });
  expect(isAdaptiveComplete({ ...result, status: "complete_adaptive", stop_reason: "indifferent" }, "b2", p.cap, counts)).toBe(false);
  expect(isAdaptiveComplete({ ...result, rule: { ...result.rule, requested: 1000 } }, "b2", 1000, counts)).toBe(false);
});

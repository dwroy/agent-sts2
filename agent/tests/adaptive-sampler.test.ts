import { expect, it } from "vitest";
import { AdaptiveSampler } from "../src/sim/adaptive-sampler.js";
import { adaptiveShadow, type AdaptiveCandidate, type AdaptiveSample } from "../src/sim/adaptive-shadow.js";

const rows = (n: number, wins: (i: number) => boolean): AdaptiveSample[] => Array.from({ length: n }, (_, i) => ({
  won: wins(i), died: !wins(i), capped: false, timeUp: false, turns: 2, hpLoss: wins(i) ? 2 : 10, enemyHpLeft: wins(i) ? 0 : 5,
}));
function incremental(candidates: AdaptiveCandidate[], lane: "b2" | "b3") {
  const options = { lane, requested: candidates[0]!.samples.length, allowS: false };
  const sampler = new AdaptiveSampler(candidates, options), requests: ReturnType<AdaptiveSampler["next"]>[] = [];
  for (let request = sampler.next(); request; request = sampler.next()) {
    requests.push(request);
    sampler.observe(candidates.filter((c) => request!.active.includes(c.key)).map((c) => ({ ...c, samples: c.samples.slice(0, request!.to),
      ...(c.orders ? { orders: c.orders.map((order) => order.slice(0, request!.to)) } : {}) })));
  }
  return { result: sampler.result(), shadow: adaptiveShadow(candidates, options), requests };
}

it("matches shadow stopping while requesting only active absolute ranges and keeping the B3 baseline", () => {
  const bad = rows(1000, (i) => i % 10 < 2), good = rows(1000, (i) => i % 10 < 8);
  const value = incremental([{ key: "base", samples: bad, baseline: true, workGroup: "base" },
    { key: "skip", samples: bad, workGroup: "base" }, { key: "good", samples: good }], "b3");
  expect(value.requests).toEqual([{ from: 0, to: 300, active: ["base", "skip", "good"] }]);
  expect(value.result.candidates).toEqual(value.shadow.candidates);
  expect(value.result.final).toEqual(value.shadow.shadow);
  expect(value.result.work).toMatchObject({ full: 2000, actual: 600, savedFraction: .7 });
});
it("extends unresolved B2 ties by100 to the cap and never restarts their earlier samples", () => {
  const a = rows(600, (i) => i % 2 === 0);
  const value = incremental([{ key: "a", samples: a }, { key: "b", samples: a }], "b2");
  expect(value.requests.map((r) => [r!.from, r!.to])).toEqual([[0, 200], [200, 300], [300, 400], [400, 500], [500, 600]]);
  expect(value.result.candidates).toEqual(value.shadow.candidates);
  expect(value.result.work.savedFraction).toBe(0);
});
it("chooses each B2 order using only supplied prefixes and rejects future/incomplete data", () => {
  const early = rows(600, (i) => i < 200), late = rows(600, (i) => i >= 200);
  const value = incremental([{ key: "a", samples: late, orders: [early, late] }, { key: "b", samples: rows(600, (i) => i % 2 === 0) }], "b2");
  expect(value.result.final.leader).toBe("a");
  const sampler = new AdaptiveSampler([{ key: "a" }], { lane: "b2", requested: 600, allowS: false });
  expect(() => sampler.observe([{ key: "a", samples: early }])).toThrow("future");
  expect(() => sampler.result()).toThrow("not complete");
});

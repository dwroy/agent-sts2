import { expect, it } from "vitest";
import { adaptiveShadow, safeAdaptiveShadow } from "../src/sim/adaptive-shadow.js";
import { simAdaptivePolicy } from "../src/core/config.js";
import type { FightSampleResult } from "../src/sim/boss-sim.js";

/** Abstract numeric fixtures; these do not assert any card or game mechanic. */
function sample(won: boolean, left = won ? 0 : 10, loss = won ? 3 : 10): FightSampleResult {
  return { won, died: !won, capped: false, timeUp: false, turns: 2, enemyHpLeft: left, hpLoss: loss,
    bossMargin: { reference: { bossHp: 10, myHp: 10, enemyIds: ["FIXTURE"], unknown: [] },
      outgoingHp: 10 - left, receivedHp: loss } } as FightSampleResult;
}
const rows = (n: number, wins: (i: number) => boolean) => Array.from({ length: n }, (_, i) => sample(wins(i)));

it("stops losing candidates at the first batch, keeps the B3 baseline, and deduplicates equivalent work", () => {
  const good = rows(1000, (i) => i % 10 < 8), bad = rows(1000, (i) => i % 10 < 2);
  const value = adaptiveShadow([
    { key: "current", samples: bad, baseline: true, workGroup: "base" },
    { key: "skip", samples: bad, workGroup: "base" },
    { key: "better", samples: good, workGroup: "better" },
  ], { lane: "b3", requested: 1000, allowS: false });
  expect(value).toMatchObject({ agreement: true, work: { full: 2000, shadow: 600, savedFraction: 0.7 }, shadow: { group: ["better"] } });
  expect(value.candidates).toEqual([
    { key: "current", samples: 300, stop: "leader", rounds: 1, baseline: true },
    { key: "skip", samples: 300, stop: "eliminated", rounds: 1, baseline: false },
    { key: "better", samples: 300, stop: "leader", rounds: 1, baseline: false },
  ]);
  expect(good).toHaveLength(1000);
});

it("retains disagreements caused by an unrepresentative prefix", () => {
  const value = adaptiveShadow([{ key: "early", samples: rows(600, (i) => i < 200) },
    { key: "steady", samples: rows(600, (i) => i % 10 < 5) }], { lane: "b2", requested: 600, allowS: false });
  expect(value).toMatchObject({ agreement: false, shadow: { group: ["early"] }, full: { group: ["steady"] } });
});

it("chooses each B2 kill order from the current prefix rather than leaking the full-run winning order", () => {
  const early = rows(600, (i) => i < 200), late = rows(600, (i) => i >= 200);
  const value = adaptiveShadow([{ key: "A", samples: late, orders: [early, late] },
    { key: "B", samples: rows(600, (i) => i % 2 === 0) }], { lane: "b2", requested: 600, allowS: false });
  expect(value.rounds[0]!.leader).toBe("A");
  expect(value.shadow.group).toEqual(["A"]);
  expect(value.full.group).toEqual(["A"]);
});

it("uses S only with prefix sign and model trust gates, and does not invent a median SE", () => {
  const bad = Array.from({ length: 600 }, () => sample(false, 10));
  const close = Array.from({ length: 600 }, () => sample(false, 2));
  const candidates = [{ key: "bad", samples: bad }, { key: "close", samples: close }];
  const s = adaptiveShadow(candidates, { lane: "b2", requested: 600, allowS: true });
  expect(s.rounds[0]!.eliminated[0]!.metric.key).toBe("S");
  expect(s.work.savedFraction).toBeCloseTo(2 / 3);
  const low = adaptiveShadow(candidates, { lane: "b2", requested: 600, allowS: false });
  expect(low.work.savedFraction).toBe(0);
  expect(low.shadow.group).toEqual(["bad", "close"]);
  const winners = [{ key: "cheap", samples: Array.from({ length: 600 }, () => sample(true, 0, 1)) },
    { key: "costly", samples: Array.from({ length: 600 }, () => sample(true, 0, 7)) }];
  const median = adaptiveShadow(winners, { lane: "b2", requested: 600, allowS: false });
  expect(median.work.savedFraction).toBe(0);
  expect(median.full.group).toEqual(["cheap"]);
  expect(median.agreement).toBe(true);
});

it("keeps unresolved ties to the sample cap and rejects non-paired inputs", () => {
  const same = rows(1000, (i) => i % 2 === 0);
  const value = adaptiveShadow([{ key: "a", samples: same }, { key: "b", samples: same }], { lane: "b3", requested: 1000, allowS: true });
  expect(value.work.savedFraction).toBe(0);
  expect(value.candidates.every((c) => c.samples === 1000 && c.stop === "max")).toBe(true);
  expect(() => adaptiveShadow([{ key: "a", samples: same.slice(1) }], { lane: "b3", requested: 1000, allowS: true })).toThrow();
});


it("records shadow errors without throwing and keeps admitted on, rollback and role switches explicit", () => {
  expect(safeAdaptiveShadow([], { lane: "b3", requested: 1000, allowS: false })).toMatchObject({ status: "error", mode: "shadow" });
  expect(simAdaptivePolicy("SILENT", {})).toEqual({ mode: "on", requested: "on", admission: "accepted" });
  expect(simAdaptivePolicy("SILENT", { SIM_ADAPTIVE: "on" })).toEqual({ mode: "on", requested: "on", admission: "accepted" });
  expect(simAdaptivePolicy("SILENT", { SIM_ADAPTIVE: "shadow" })).toEqual({ mode: "shadow", requested: "shadow", admission: "accepted" });
  expect(simAdaptivePolicy("SILENT", { SIM_ADAPTIVE: "off" }).mode).toBe("off");
  expect(simAdaptivePolicy("SILENT", { SIM_ADAPTIVE: "invalid" }).mode).toBe("off");
  for (const role of ["IRONCLAD", "REGENT"]) expect(simAdaptivePolicy(role, { SIM_ADAPTIVE: "on" }))
    .toEqual({ mode: "off", requested: "off", admission: "not_applicable" });
});

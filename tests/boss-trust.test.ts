/**
 * B4's trusted bosses (docs/boss-sim.md §13): the data file src/sim/boss-trust.json (tools/boss-sim/trust.py, from the
 * validation backtest) against its own criteria, and the lists B2 (boss-lines LOW_TRUST_BOSSES) and B3 (build-sim-facts
 * LOW_CONFIDENCE) read from it. No knowledge data, no model call, nothing written.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { LOW_TRUST_BOSSES } from "../src/sim/boss-lines.js";
import { BOSS_KEYS, BOSS_TRUST_PATH, LOW_CONFIDENCE_B3, LOW_TRUST_B2, loadBossTrust } from "../src/sim/boss-trust.js";
import { LOW_CONFIDENCE } from "../src/sim/build-sim-facts.js";

describe("B4 the trusted bosses, from the validation data", () => {
  it("the data file's lists follow its own criteria, per consumer's start point; the few-fight bosses stay low", () => {
    const data = loadBossTrust()!;
    expect(data).not.toBeNull();
    const raw = JSON.parse(readFileSync(BOSS_TRUST_PATH, "utf8")) as {
      overall: Record<string, { brier: number }>;
      bosses: Record<string, Record<string, { n: number; brier: number; mean_pred: number; actual_win: number; leak_ratio: number | null; failed: string[] }>>;
    };
    const c = data.criteria;
    for (const [use, start] of [["b2", "t1"], ["b3", "pre"]] as const) {
      const low = use === "b2" ? data.low_trust_b2 : data.low_confidence_b3;
      for (const key of BOSS_KEYS) {
        const b = raw.bosses[key]![start]!;
        const fails =
          b.n < c.min_fights ||
          b.brier > Math.round(c.brier_ratio * raw.overall[start]!.brier * 1e4) / 1e4 ||
          Math.abs(b.mean_pred - b.actual_win) > c.max_gap ||
          (b.leak_ratio !== null && (b.leak_ratio < c.leak_range[0] || b.leak_ratio > c.leak_range[1]));
        expect([key, start, fails]).toEqual([key, start, b.failed.length > 0]);
        expect([key, start, key in low]).toEqual([key, start, fails]);
      }
      expect(low["AEONGLASS"]).toBeDefined();
      expect(low["TEST_SUBJECT"]).toBeDefined();
    }
    expect(LOW_TRUST_BOSSES).toEqual(data.low_trust_b2);
    expect(LOW_CONFIDENCE).toEqual(data.low_confidence_b3);
    expect(LOW_TRUST_B2).toEqual(data.low_trust_b2);
    expect(LOW_CONFIDENCE_B3).toEqual(data.low_confidence_b3);
  });

  it("without the data file every boss is low trust", () => {
    expect(loadBossTrust("/nonexistent/boss-trust.json")).toBeNull();
  });
});

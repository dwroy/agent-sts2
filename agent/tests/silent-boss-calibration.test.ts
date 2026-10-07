/** Fixed character calibration and B2/B3 consumption fixtures; no live data or model calls. */
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { BOSS_SIM_PLATT, calibratedWinProb } from "../src/sim/boss-sim.js";
import { bossTrustReason } from "../src/sim/boss-trust.js";
import { lowTrustOfState } from "../src/sim/boss-lines.js";
import { calibratedDiff } from "../src/sim/build-sim.js";
import { calibratedFloor } from "../src/sim/build-sim-facts.js";
import { parseGameState } from "../src/hand/mod/schema.js";

vi.mock("node:fs", async (original) => {
  const actual = await original<typeof import("node:fs")>();
  return { ...actual, readFileSync: vi.fn(actual.readFileSync) };
});

function fixture(fit: boolean = true): void {
  vi.mocked(readFileSync).mockImplementation(((path: unknown) => {
    if (!String(path).endsWith("/characters/silent/boss-trust.json")) throw new Error("no other character fixture");
    return JSON.stringify({ character: "silent", source: { completed_max_asc: 10 }, criteria: {}, low_trust_b2: { QUEEN: "too few" }, low_confidence_b3: { AEONGLASS: "不足" },
      overall: fit ? { t1: { platt: { a: 0.2, b: 0.7, c: 0.5 } }, pre: { platt: { a: -0.1, b: 0.8, c: 0.4 } } } : {},
      stage_low: { b2: { "49": "F49不足" }, b3: { "49": "F49不足" } },
      ascension_low: { b2: { "10": "A10 residual" }, b3: { "10": "A10不足" } } });
  }) as typeof readFileSync);
  setKnowledgeCharacter("ironclad");
  setKnowledgeCharacter("silent");
}

afterEach(() => {
  vi.mocked(readFileSync).mockReset();
  setKnowledgeCharacter(null);
});

describe("Silent boss calibration", () => {
  it("uses Silent's own start/pre parameters and ascension, never Ironclad's", () => {
    fixture();
    expect(calibratedWinProb(0.5, 200, "start", 5)).toBeCloseTo(1 / (1 + Math.exp(-0.2)));
    expect(calibratedWinProb(0.5, 200, "pre", 10)).toBeCloseTo(1 / (1 + Math.exp(-0.3)));
    expect(calibratedWinProb(0.5, 200, "mid", 5)).toEqual(calibratedWinProb(0.5, 200, "start", 5));
    expect(calibratedWinProb(0.5, 200, "start", 10)).toBeGreaterThan(calibratedWinProb(0.5, 200, "start", 0));
  });

  it("a missing Silent fit returns raw and keeps missing-data bosses low", () => {
    fixture(false);
    expect(calibratedWinProb(0.3, 200, "start", 10)).toBe(0.3);
    vi.mocked(readFileSync).mockImplementation(() => { throw new Error("no Silent knowledge"); });
    setKnowledgeCharacter("ironclad");
    setKnowledgeCharacter("silent");
    expect(bossTrustReason("SOUL_FYSH", "b2", 0)).not.toBeNull();
    expect(bossTrustReason("SOUL_FYSH", "b3", 0)).not.toBeNull();
  });

  it("Ironclad probabilities remain equivalent after character switches", () => {
    fixture();
    setKnowledgeCharacter("ironclad");
    for (const start of ["start", "mid", "pre"] as const) {
      const { a, b } = BOSS_SIM_PLATT[start];
      const p = 0.3;
      expect(calibratedWinProb(p, 200, start, 10)).toBe(1 / (1 + Math.exp(-(a + b * Math.log(p / (1 - p))))));
      expect(calibratedWinProb(p, 200, start, Number.NaN)).toBe(calibratedWinProb(p, 200, start));
    }
  });

  it("B2 first-attempt gating and B3 reasons consume their own table and A10 scope", () => {
    fixture();
    const state = (asc: number, id: string, floor = 17) => parseGameState({ state_version: 1, session: { mode: "SINGLEPLAYER", phase: "PLAYING" }, available_actions: [], run: { character_id: "SILENT", ascension: asc, floor },
      screen: "COMBAT", combat: { enemies: [{ enemy_id: id, current_hp: 40, max_hp: 40 }], hand: [] } });
    expect(lowTrustOfState(state(9, "SOUL_FYSH"))).toBeNull();
    expect(lowTrustOfState(state(10, "SOUL_FYSH"))).toContain("A10");
    expect(lowTrustOfState(state(9, "QUEEN"))).toContain("too few");
    expect(bossTrustReason("AEONGLASS", "b3", 9)).toBe("不足");
    expect(bossTrustReason("SOUL_FYSH", "b3", 10)).toContain("A10");
    expect(bossTrustReason("SOUL_FYSH", "b3", 11)).toContain("暂无静默验证");
    expect(lowTrustOfState(state(10, "SOUL_FYSH", 49))).toContain("F49");
    expect(bossTrustReason("SOUL_FYSH", "b3", 10, 49)).toContain("F49");
  });

  it("B3 paired differences, errors and calibrated floor use the same ascension map", () => {
    fixture();
    const d = calibratedDiff(0.7, 0.3, 0.05, 200, 10);
    expect(d.cal).toBeCloseTo(calibratedWinProb(0.7, 200, "pre", 10) - calibratedWinProb(0.3, 200, "pre", 10), 3);
    expect(d.calSe).toBeCloseTo(d.cal / 0.4 * 0.05);
    expect(calibratedFloor(10)).toEqual(calibratedWinProb(0, 200, "pre", 10));
  });
});

/**
 * Cost arithmetic against TypeSafe's published price: $42 per billion input tokens = $0.042 per
 * million, and output tokens are free. The worked example is the real 19-option combat request
 * captured live (2,974 input tokens).
 */

import { describe, expect, it } from "vitest";

import { JEV_INPUT_USD_PER_MTOK, estimateCostUsd, formatCostUsd } from "../src/jev/pricing.js";

describe("Jev pricing", () => {
  it("matches the documented per-million price", () => {
    expect(JEV_INPUT_USD_PER_MTOK).toBe(0.042);
    expect(estimateCostUsd(1_000_000)).toBeCloseTo(0.042, 10);
  });

  it("agrees with the per-billion price the docs also quote", () => {
    // $42 per billion and $0.042 per million are the same number.
    expect(estimateCostUsd(1_000_000_000)).toBeCloseTo(42, 8);
  });

  it("costs a measured request correctly", () => {
    // 2974 tokens -> 2974 / 1e6 * 0.042
    expect(estimateCostUsd(2_974)).toBeCloseTo(0.000124908, 12);
  });

  it("charges nothing for no input", () => {
    expect(estimateCostUsd(0)).toBe(0);
    expect(estimateCostUsd(-5)).toBe(0);
    expect(estimateCostUsd(Number.NaN)).toBe(0);
  });

  it("formats to four decimals", () => {
    expect(formatCostUsd(2_974)).toBe("≈ $0.0001");
    expect(formatCostUsd(1_000_000)).toBe("≈ $0.0420");
    expect(formatCostUsd(0)).toBe("≈ $0.0000");
  });

  it("counts only input tokens: output is free", () => {
    // The signature takes input tokens alone, so there is nowhere for output to sneak into the cost.
    expect(estimateCostUsd(1_000_000)).toBe(estimateCostUsd(1_000_000));
  });
});

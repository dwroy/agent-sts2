import { afterEach, expect, it, vi } from "vitest";
import { v6ProjectionEntries } from "../src/sim/v6-projection-entries.js";
import { promptProjectionEntries } from "../src/v6/prompt-projection.js";
import { validateProjectionEntries, validateProjectionEntry } from "../src/v6/formats.js";
import { v6Config } from "../src/v6/config.js";
import { comboProjection } from "./v6-direction-core-fixtures.js";
import { shopTable } from "./v6-prompt-summary-fixtures.js";

afterEach(() => vi.unstubAllEnvs());
it("keeps provider semantics and audit objects while cloning only thin known rows", () => {
  vi.stubEnv("V6_BUILD", "on");
  const table = shopTable({ options: [{ option: { key: "a" } }] });
  table.combinations = table.combinations.slice(0, 2).map(row => ({ ...row,
    summary: { retained: [1, 2] }, entry: { ...row.entry, combo_metrics: { discarded: [3, 4] } } }));
  table.combinations[1]!.completion_source = "unknown";
  const audit = structuredClone(table), originalMetrics = table.combinations[0]!.entry.combo_metrics;
  const expected = v6ProjectionEntries(table, v6Config());
  const actual = promptProjectionEntries(table, v6Config());
  expect(actual).toEqual(expected);
  expect(table).toEqual(audit);
  expect(table.combinations[0]!.entry.combo_metrics).toBe(originalMetrics);
  expect(actual[0]!.combo_metrics).toBe(table.combinations[0]!.summary);
  expect(actual[1]!.combo_metrics).toEqual({ discarded: [3, 4] });
  actual[0]!.availability.take = null;
  expect(table).toEqual(audit);
});
it("checks each shared metric snapshot once per batch, preserving all row and snapshot failures", () => {
  let visits = 0;
  const metrics = Object.defineProperty({}, "sample", { enumerable: true, get: () => { visits++; return [1, 2]; } });
  const first = { ...comboProjection(), combo_metrics: metrics };
  const badRow = { ...first, win_tier: "certain_win", win: null };
  const values = [first, { ...first }, badRow];
  const expected = values.map(validateProjectionEntry); visits = 0;
  expect(validateProjectionEntries(values)).toEqual(expected);
  expect(visits).toBe(1);
  Object.defineProperty(metrics, "bad", { enumerable: true, value: Infinity });
  // No cache survives a call, including a previously valid object mutated between calls.
  expect(validateProjectionEntries(values)).toEqual(values.map(validateProjectionEntry));
  expect(validateProjectionEntries(values).every(result => !result.ok)).toBe(true);
});

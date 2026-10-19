import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateBuildCore } from "../src/v6/build-core.js";

const builderTests = fileURLToPath(new URL("../../knowledge/builders/test_combo_metrics.py", import.meta.url));

describe("offline combo metrics builder", () => {
  it("passes fixed-data tests for raw evidence, censoring, sampling and unknowns", () => {
    expect(() => execFileSync("python3", [builderTests], { encoding: "utf8", stdio: "pipe" })).not.toThrow();
  });

  it("produces metrics accepted by the real build-core-v1 consumer contract", () => {
    const metrics: unknown = JSON.parse(execFileSync("python3", [builderTests, "--contract-fixture"], { encoding: "utf8" }));
    const evidence = [{ run_id: "FIXTURE", floor: 48 }];
    const result = validateBuildCore({
      schema: "build-core-v1", direction: "fixture", name: "fixed fixture", status: "candidate",
      scope: { character: "silent", ascensions: [0] },
      card_pool: { ALPHA: { roles: ["fixture"], contribution: "固定数据", upgraded_matters: false, combos: ["fixture-combo"], evidence } },
      combos: [{ id: "fixture-combo", types: ["fixture"], boss: null,
        cards: [{ id: "ALPHA", count: 1, upgraded: false }], metrics,
        fits: { bosses_positive: [], bosses_negative: [], routes: [], situations: [] }, evidence,
        confidence: "low", linked_experience: [] }],
      pivot_signals: [], failure_modes: [], linked_experience: [], linked_reflex: [],
    });
    expect(result).toMatchObject({ ok: true });
  });
});

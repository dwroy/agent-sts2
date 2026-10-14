import { expect, it } from "vitest";
import { replayAdaptive, type FrozenAdaptiveQuestion } from "../tools/adaptive-replay.js";
import type { AdaptiveSample } from "../src/sim/adaptive-shadow.js";

it("lists every mismatch and excludes limited old exports from the admission denominator", () => {
  const rows = (win: (i: number) => boolean): AdaptiveSample[] => Array.from({ length: 600 }, (_, i) => ({
    won: win(i), died: !win(i), capped: false, timeUp: false, turns: 1, hpLoss: win(i) ? 2 : 10, enemyHpLeft: win(i) ? 0 : 10,
  }));
  const question: FrozenAdaptiveQuestion = { id: "fixture", source: { path: "fixed-fixture", sha256: "0".repeat(64) },
    lane: "b2", requested: 600, allowS: false,
    candidates: [{ key: "early", samples: rows((i) => i < 200) }, { key: "steady", samples: rows((i) => i % 2 === 0) }] };
  const result = replayAdaptive([question, { ...question, id: "limited", limitation: "Incomplete original export" }]);
  expect(result).toMatchObject({ questions: 2, eligible: 1, agreement: 0, mismatches: ["fixture", "limited"] });
  expect(result.admission).toContain("pending");
  expect(() => replayAdaptive([question, question])).toThrow("duplicate");
});

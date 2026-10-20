import { describe, expect, it } from "vitest";
import { v6Config } from "../src/v6/config.js";
import { validateProjectionEntry } from "../src/v6/formats.js";
import { detectReplan, freshReplanState, reserveReplan, type DirectionEvaluation } from "../src/v6/replan-triggers.js";
import { projection } from "./v6-fixtures.js";

const config = v6Config({ V6_BUILD: "on" });
function row(direction_id: string, trust: "trusted" | "unknown" = "unknown") {
  const parsed = validateProjectionEntry({ ...projection, direction_id, trust });
  if (!parsed.ok) throw Error(parsed.issues.join());
  return parsed.value;
}
const missing = [row("A"), row("B"), row("C")];
const healthy = missing.map(p => ({ ...p, trust: "trusted" as const }));
function fixture() {
  const s = freshReplanState("RUN"); s.act = 1;
  const detect = (floor: number, extra: Partial<DirectionEvaluation> = {}, act = 1) => detectReplan(s, {
    act, floor, turnKey: `RUN:${act}:${floor}`, requirementIds: new Set(), evaluation: { id: `eval:${floor}`, entries: missing, ...extra },
  }, config);
  const reserve = (floor: number, act = 1) => reserveReplan(s, act, `RUN:${act}:${floor}`);
  return { s, detect, reserve };
}

describe("act-scoped T6 causes", () => {
  it("records eighteen all-unknown evaluations across floors but reserves only one brain call", () => {
    const { s, detect, reserve } = fixture();
    for (let floor = 1; floor <= 18; floor++) {
      const result = detect(floor);
      expect(result.triggers).toEqual(["T6"]);
      expect(result.ask).toBe(floor === 1);
      expect(result.skipped).toEqual(floor === 1 ? [] : ["T6"]);
      expect(result.t6).toEqual({ reasons: ["systemic:projection_unknown"], suppressed: floor === 1 ? [] : ["systemic:projection_unknown"] });
      if (result.ask) reserve(floor);
    }
    expect(s.calls).toBe(1);
  });

  it("waits for usable projections, not empty or still mostly unknown tables, before rearming", () => {
    const { detect, reserve } = fixture();
    expect(detect(1).ask).toBe(true); reserve(1);
    expect(detect(2, { entries: [] }).ask).toBe(false);
    expect(detect(3).ask).toBe(false);
    expect(detect(4, { entries: [healthy[0]!, ...missing.slice(1)] }).ask).toBe(false);
    expect(detect(5, { entries: [healthy[0]!, missing[1]!] }).triggers).toEqual([]);
    expect(detect(6).ask).toBe(true); reserve(6);
    expect(detect(7).ask).toBe(false);
    expect(detect(8, {}, 2)).toMatchObject({ triggers: ["act_start", "T6"], ask: true }); reserve(8, 2);
    expect(detect(9, {}, 2)).toMatchObject({ triggers: ["T6"], skipped: ["T6"], ask: false });
  });

  it("distinguishes local direction/target gaps without treating option IDs or evaluation IDs as new causes", () => {
    const { detect, reserve } = fixture();
    const entries = [healthy[0]!, ...missing.slice(1)];
    const first = detect(1, { entries });
    expect(first.t6?.reasons[0]).toMatch(/^situation:projection_unknown:/); reserve(1);
    expect(detect(2, { entries: entries.map(p => ({ ...p, option_id: "different_reward" })) }).ask).toBe(false);
    expect(detect(3, { entries: entries.map(p => p.trust === "unknown" ? { ...p, target_id: "OTHER_TARGET" } : p) }).ask).toBe(true); reserve(3);
    expect(detect(4, { entries }).ask).toBe(false);
    // A new global failure is separate from the earlier local missing targets.
    expect(detect(5).t6?.reasons).toEqual(["systemic:projection_unknown"]);
    expect(detect(5).ask).toBe(true); reserve(5);
    expect(detect(6, { entries }).ask).toBe(false);
  });

  it("coalesces global unknown handovers across four kinds and keeps a separate Jev failure", () => {
    const { s, detect, reserve } = fixture();
    expect(detect(1).ask).toBe(true); reserve(1);
    for (const [i, kind] of ["card_pick", "potion", "shop", "rest"].entries()) {
      expect(detect(i + 2, { entries: i % 2 ? [] : missing, constructionHandover: true, constructionIssue: {
        kind, reason: "insufficient_known_options", known: 0, total: 28, unknownOptions: ["different_options"],
      } })).toMatchObject({ ask: false, skipped: ["T6"], t6: { reasons: ["systemic:projection_unknown"] } });
    }
    expect(detect(6, { consecutiveJevFallbacks: 2 }).ask).toBe(true); reserve(6);
    expect(detect(7, { consecutiveJevFallbacks: 3 }).ask).toBe(false);
    expect(detect(8, { consecutiveJevFallbacks: 0 }).ask).toBe(false);
    expect(detect(9, { consecutiveJevFallbacks: 2 }).ask).toBe(true);
    expect(s.calls).toBe(2);
  });

  it("rearms a construction source only on its own coverage recovery, not an unrelated healthy table", () => {
    const { detect, reserve } = fixture();
    const issue = { kind: "potion", reason: "insufficient_known_options", known: 0, total: 3, unknownOptions: ["a", "b", "c"] };
    const extra = { entries: healthy, constructionHandover: true, constructionIssue: issue };
    expect(detect(1, extra).ask).toBe(true); reserve(1);
    expect(detect(2, { entries: healthy }).triggers).toEqual([]);
    expect(detect(3, extra).ask).toBe(false);
    expect(detect(4, { ...extra, recoveredConstructionKinds: ["shop"] }).ask).toBe(false);
    expect(detect(5, { entries: healthy, recoveredConstructionKinds: ["potion"] }).ask).toBe(false);
    expect(detect(6, extra).ask).toBe(true); reserve(6);
    expect(detect(7, extra).ask).toBe(false);
    const local = { ...issue, known: 1, unknownOptions: ["a", "b"] };
    expect(detect(8, { ...extra, constructionIssue: local }).t6?.reasons[0]).toMatch(/^situation:construction:potion:/);
    expect(detect(8, { ...extra, constructionIssue: local }).ask).toBe(true); reserve(8);
    expect(detect(9, { ...extra, constructionIssue: { ...local, unknownOptions: ["b", "a"] } }).ask).toBe(false);
    expect(detect(10, { ...extra, constructionIssue: { ...local, unknownOptions: ["different_gap"] } }).ask).toBe(true);
  });

  it("does not consume a cause at the soft cap or on a duplicate turn, and still allows T5/T7", () => {
    const { s, detect, reserve } = fixture();
    s.lastTurn = "RUN:1:1";
    expect(detect(1).ask).toBe(false);
    expect(s.t6?.handled).toEqual([]);
    expect(detect(2).ask).toBe(true); reserve(2);
    expect(detect(3, { bossEntryHp: 5, hazardHp: 10 })).toMatchObject({ ask: true, triggers: ["T5", "T6"], skipped: ["T6"], merged: [] });
    s.calls = 15;
    const plan = { schema: "direction-weights-v1" as const, direction_weights: { A: 1 }, potion_directions: [], route: "keep", rest: "auto" as const, checkpoint: 4, reason: "fixture" };
    const result = detectReplan(s, { act: 1, floor: 4, turnKey: "RUN:1:4", plan, requirementIds: new Set(),
      evaluation: { id: "capped", entries: missing, bossEntryHp: 5, hazardHp: 10, consecutiveJevFallbacks: 2 } }, config);
    expect(result).toMatchObject({ ask: true, triggers: ["T5", "T6", "T7"], skipped: ["T6"], merged: ["T7"] });
    reserve(4);
    expect(s.t6?.handled).not.toContain("jev:construction_failure");
  });
});

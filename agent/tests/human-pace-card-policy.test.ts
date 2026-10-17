import { expect, it } from "vitest";
import { rankShadowCards, shadowPlanCoverage, type ShadowCardPolicyRow } from "../src/sim/human-pace-card-policy.js";
import { projectActPlan, shadowCardList } from "../src/sim/human-pace-plan-shadow.js";
import type { RunPlan } from "../src/memory/run-plan.js";
const row = (key: string, mean: number | null, member = false): ShadowCardPolicyRow => ({ key,
  core_component: member, template_membership: member ? ["P"] : [], target_delta_win: null,
  next_boss_delta_win: mean === null ? null : { mean, se: 0.01 } });
it("uses paired next-Boss win when the target group is unknown, including a justified skip", () => {
  expect(rankShadowCards([row("card0", 0.2), row("skip", 0)], "uncommitted")).toMatchObject({ first: "card0", basis: "next_boss_paired_win_then_template_S_excluded" });
  expect(rankShadowCards([row("card0", -0.2), row("skip", 0)], "P").first).toBe("skip");
});
it("uses learned membership only inside an unresolved MC comparison, never over a clear loss", () => {
  expect(rankShadowCards([row("card0", 0.01, true), row("skip", 0.02)], "P").first).toBe("card0");
  expect(rankShadowCards([row("card0", -0.3, true), row("skip", 0.2)], "P").first).toBe("skip");
});
it("retains the full target group as primary and excludes any unavailable numeric candidates", () => {
  const rows = [row("card0", 0.5), row("skip", 0)]; rows[0]!.target_delta_win = { mean: -0.2, se: 0.01 }; rows[1]!.target_delta_win = { mean: 0, se: 0.01 };
  expect(rankShadowCards(rows, "P").first).toBe("skip");
  expect(rankShadowCards([row("card0", 0.9), row("card1", null), row("skip", 0)], "P").first).toBeNull();
});
it("does not prefer skip, offer order or an arbitrary direction when all evidence is missing or tied", () => {
  expect(rankShadowCards([row("skip", null), row("card0", null)], "uncommitted")).toMatchObject({ first: null, basis: "defer_to_brain" });
  expect(rankShadowCards([row("card0", 0), row("skip", 0)], "P").first).toBeNull();
  expect(rankShadowCards([row("card0", null, true), row("skip", null)], "uncommitted")).toMatchObject({ first: "card0", confidence: "template_only" });
});
it("distinguishes uncommitted and missing plans from an uncovered committed plan", () => {
  expect(shadowPlanCoverage("uncommitted", true, false)).toEqual({ status: "uncommitted", uncovered: null, initial_direction_needed: true });
  expect(shadowPlanCoverage("P", true, false).uncovered).toBe(true);
  expect(shadowPlanCoverage("uncommitted", true, true).uncovered).toBe(false);
  expect(shadowPlanCoverage("P", false, false).status).toBe("missing");
});
it("projects concrete brain lists and keeps absent commitments and free text explicitly unresolved", () => {
  const plan = { construction: { primary: "uncommitted", alternatives: ["P"], checkpoint: 8, pivot_if: "original" },
    want: ["FOOTWORK", "conditional card text"], avoid: ["FOOTWORK"], remove: [], rest: "auto", bossPrep: "original conditional rest rule", elites: "normal" } as unknown as RunPlan;
  const before = JSON.stringify(plan), result = projectActPlan(plan);
  expect(result.direction).toBeNull(); expect(result.candidate_directions[0]?.source).toContain("not_commitment");
  expect(result.take_rules[0]).toMatchObject({ priority: 1, card_id: "FOOTWORK", source: "accepted_brain_list" });
  expect(result.coverage).toMatchObject({ usable: false, unresolved: ["conditional card text"] });
  expect(result.conflicts).toEqual(["FOOTWORK"]); expect(JSON.stringify(plan)).toBe(before);
  expect(shadowCardList(["not a specific ID"])[0]?.card_id).toBeNull();
});

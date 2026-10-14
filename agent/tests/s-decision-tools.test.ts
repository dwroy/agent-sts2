import { expect, it } from "vitest";
import { compareJevCase } from "../tools/jev-vs-code-replay.js";
import { signAudit } from "../tools/s-sign-audit.js";

function frozen() {
  const criteria = { plan1: JSON.stringify({ rollout: "3-turn rollout: expected further HP loss 12", potions_used: "none" }),
    plan2: JSON.stringify({ rollout: "3-turn rollout: expected further HP loss 8", potions_used: "none" }) };
  const decision = { decision_id: "fixed", run_id: "FIXTURE", label: "combat/plan-choice", questions: { plan: { criteria } },
    answers: { plan: { choice: "plan2", confidence: 0.6 } },
    boss_sim: { best: "plan1", lines: { plan1: { win: 0.5, d: 0, se: 0 }, plan2: { win: 0.55, d: 0.05, se: 0.02 } } },
    selection_audit: { answer: { planned_steps: [{ card_id: "FIXTURE" }] }, after_sl: { planned_steps: [{ card_id: "FIXTURE" }] } },
    selection_dispatch: { returned_status: "completed", whole_plan_executed: null } };
  const prompt = { decision_id: "fixed", run_id: "FIXTURE", request: { state: { run_brief: { character: "SILENT" }, fight: "boss" } } };
  return { decision, prompt };
}

it("separates simulated best, code first, paired deltas and actual execution", () => {
  const { decision, prompt } = frozen(), row = compareJevCase(decision, prompt);
  expect(row).toMatchObject({ jev_choice: "plan2", code_first: "plan1", b2_best: "plan1", deviated: true });
  expect(row.difference_chosen_minus_code.rollout_expected_hp_loss).toEqual({ mean: -4, se: null });
  expect(row.difference_chosen_minus_code.boss_win).toMatchObject({ paired: 0.05, se: 0.02 });
  expect(row.execution).toMatchObject({ planned_after_guards: "plan2", returned_status: "completed", whole_plan_executed: null });
});

it("does not subtract two standard errors against a different baseline", () => {
  const { decision, prompt } = frozen();
  decision.boss_sim.best = "plan3";
  expect(compareJevCase(decision, prompt).difference_chosen_minus_code.boss_win).toMatchObject({ paired: null, se: null });
  expect(() => compareJevCase(decision, { ...prompt, decision_id: "other" })).toThrow("identity");
});

it("does not combine sign-audit evidence across Bosses, ascensions or B2/B3", () => {
  const base = { id: "a", boss: "FIXTURE", ascension: 1, lane: "b2" as const, source: "fixed-test-input", samples: [] };
  const result = signAudit([base, { ...base, id: "b", lane: "b3" }, { ...base, id: "c", ascension: 2 }]);
  expect(result.groups).toHaveLength(3);
  expect(result.groups.every((group) => group.audit.rankingEligible === false)).toBe(true);
  expect(() => signAudit([base, base])).toThrow("duplicate");
});

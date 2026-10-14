import { expect, it } from "vitest";
import evidence from "./silent-selection-potions-evidence.json";
import { auditSelectionExecution } from "../../learner/lib/selection-execution.js";

const input = () => structuredClone(evidence);
const action = (result: ReturnType<typeof auditSelectionExecution>, line: number) =>
  result.observed_actions.find((row) => row.source_line === line)!;

it("GXN F45 preserves the Fairy slot disappearance separately from the 3/13 HP endpoints", () => {
  const result = auditSelectionExecution(input());
  for (const [line, hp, block] of [[283644, 3, 0], [283683, 13, 7]]) {
    const row = action(result, line!);
    expect(row.before?.potions).toEqual(expect.arrayContaining([expect.objectContaining({
      index: 1, potion_id: "FAIRY_IN_A_BOTTLE", occupied: true, usage: "Automatic",
    })]));
    expect(row.observed_interval).toMatchObject({ status: "observed_endpoints", facts: {
      after: { hp, block }, logged_potion_request: null,
      potion_slot_changes: [{ slot: 1, before_potion_id: "FAIRY_IN_A_BOTTLE", after_potion_id: null,
        before_reported_usage: "Automatic", causal_source: null }],
      causal_action_result: null, full_candidate_result: null,
    } });
  }
});

it("GXN F45 T3 binds the explicit poison request and empty slot without certifying a causal effect", () => {
  const result = auditSelectionExecution(input()), row = action(result, 283690);
  expect(row.observed_interval).toMatchObject({ status: "observed_endpoints", facts: {
    after: { hp: 13, block: 23 },
    potion_slot_changes: [{ slot: 0, before_potion_id: "POISON_POTION", after_potion_id: null,
      before_reported_usage: "CombatOnly", causal_source: null }],
    logged_potion_request: { action: "use_potion", slot: 0, expected_potion_id: "POISON_POTION",
      observed_potion_id: "POISON_POTION", identity_matches: true, state_effect_verified: false },
  } });
  expect(row.before?.hp).toBe(13);
  expect(result.segments.every((segment) => segment.actual_full_candidate_result === null)).toBe(true);
});

it("missing, duplicate, omitted or inconsistent potion slots stay unknown instead of becoming consumption", () => {
  for (const change of [
    (potions: unknown[]) => potions.push(structuredClone(potions[0])),
    (potions: unknown[]) => potions.pop(),
    (potions: unknown[]) => { (potions[0] as { occupied: boolean }).occupied = true; },
  ]) {
    const data = input();
    change(data.states.find((row) => row._line === 290213)!.state.run.potions);
    expect(action(auditSelectionExecution(data), 283690).observed_interval.facts?.potion_slot_changes).toBeNull();
  }
  const data = JSON.parse(JSON.stringify(evidence));
  delete data.states.find((row: { _line: number }) => row._line === 290213).state.run.potions;
  const row = action(auditSelectionExecution(data), 283690);
  expect(row.observed_interval.facts?.after).toMatchObject({ potions: null });
  expect(row.observed_interval.facts?.potion_slot_changes).toBeNull();
});

it("cross-attempt SL restoration and source gaps cannot be counted as potion acquisition", () => {
  const data = input();
  data.decisions.find((row) => row._line === 283691)!.sl_attempt = 5;
  expect(action(auditSelectionExecution(data), 283690).observed_interval).toMatchObject({
    status: "unknown", reason: "room_or_attempt_changed_or_unknown", facts: null,
  });
  const result = auditSelectionExecution(input());
  expect(action(result, 283645).observed_interval).toMatchObject({ status: "unknown", reason: "source_decision_gap", facts: null });
});

it("queued/rejected potion requests and mismatched identities do not become verified use", () => {
  const data = input(), decision = data.decisions.find((row) => row._line === 283690)!;
  decision.result = "pending (unstable): fixed request";
  decision.expect!.potion!.id = "FAIRY_IN_A_BOTTLE";
  const original = structuredClone(data);
  const row = action(auditSelectionExecution(data), 283690);
  expect(row.dispatch).toBe("queued_unconfirmed");
  expect(row.observed_interval.facts?.logged_potion_request).toMatchObject({ identity_matches: false, state_effect_verified: false });
  expect(data).toEqual(original);
  const rejected = JSON.parse(JSON.stringify(data));
  rejected.decisions.find((d: { _line: number }) => d._line === 283690).gate_reject = { reason: "fixed mismatch" };
  expect(action(auditSelectionExecution(rejected), 283690).dispatch).toBe("rejected");
  expect(action(auditSelectionExecution(rejected), 283690).observed_interval.facts?.logged_potion_request).toMatchObject({
    gate_reject: { reason: "fixed mismatch" }, state_effect_verified: false,
  });
});

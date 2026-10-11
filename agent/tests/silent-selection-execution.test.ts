import { expect, it } from "vitest";
import evidence from "./silent-selection-execution-evidence.json";
import { auditSelectionExecution } from "../../learner/lib/selection-execution.js";

const audit = (index: number) => auditSelectionExecution(structuredClone(evidence[index]));

it("MTQ0 F11 separates the 14/6 HP forecasts from the discard and the next question", () => {
  const result = audit(0);
  const first = result.segments[0]!;
  expect(first.predictions.answer).toMatchObject({ key: "plan6", facts: { hp_lost: 14, damage_dealt: 14 } });
  expect(first.predictions.final_candidate).toMatchObject({ key: "plan1", facts: { hp_lost: 6, damage_dealt: 16 } });
  expect(first.actions.map((row) => row.source_line)).toEqual([282138, 282139]);
  expect(first.actions[0]).toMatchObject({ dispatch: "queued_unconfirmed", before: { hp: 67 } });
  expect(first.actions[1]).toMatchObject({ expected_identity: { option: { id: "RICOCHET" } } });
  expect(first.interruptions).toHaveLength(1);
  expect(first.boundary).toMatchObject({ kind: "superseded_by_question", decision_id: result.segments[1]!.decision_id });
  expect(first.actual_full_candidate_result).toBeNull();
  expect(result.segments[1]!.actions[0]).toMatchObject({ expected_identity: { card: { id: "HAZE" } } });
});

it("KFR F12 stops the guarded forecast when the generated hand causes another question", () => {
  const result = audit(2), first = result.segments[0]!;
  expect(first.predictions.answer?.facts).toMatchObject({ hp_lost: 12, damage_dealt: 19 });
  expect(first.predictions.final_candidate?.facts).toMatchObject({ hp_lost: 0, damage_dealt: 12 });
  expect(first.actions).toHaveLength(1);
  expect(first.boundary.kind).toBe("superseded_by_question");
  expect(first.actions[0]!.expected_identity).toMatchObject({ card: { id: "CLOAK_AND_DAGGER" } });
  expect(result.segments[1]!.actions[0]!.expected_identity).toMatchObject({ card: { id: "SNAKEBITE" } });
  expect(first.actual_rollout_best).toBeNull();
});

it("KFR F33 T6 uses the SL replacement, not the stale pre-SL journal", () => {
  const changed = audit(3).segments.find((row) => row.source_line === 282929)!;
  expect(changed.predictions.answer).toMatchObject({ key: "plan1", facts: { hp_lost: 6, damage_dealt: 83 } });
  expect(changed.predictions.final_candidate).toMatchObject({ key: "plan2", facts: { hp_lost: 12, damage_dealt: 93 } });
  expect(changed.predictions.original_rollout_best_chosen).toBe(true);
  expect(changed.predictions.predicted_final_rollout_best).toBe(false);
  expect(changed.actions[0]!.expected_identity).toMatchObject({ card: { id: "DEADLY_POISON" } });
});

it("MTQ0 F23 preserves the saturated SL comparison as predictions only", () => {
  const result = audit(1), first = result.segments[0]!;
  expect(first.source_line).toBe(282434);
  expect(first.attempt).toBe(4);
  expect(first.predictions.answer?.facts).toMatchObject({ hp_lost: 0, damage_dealt: 13 });
  expect(first.predictions.final_candidate?.facts).toMatchObject({ hp_lost: 8, damage_dealt: 19 });
  expect(first.actions[0]!.expected_identity).toMatchObject({ card: { id: "STRIKE_SILENT" } });
  expect(result.segments.every((row) => row.actual_full_candidate_result === null && row.actual_rollout_best === null)).toBe(true);
});

it("missing and ambiguous state matches stay unknown, even when the board fingerprint repeats", () => {
  const input = structuredClone(evidence[0]!);
  input.states.push(structuredClone(input.states[0]!));
  expect(auditSelectionExecution(input).segments[0]!.actions[0]).toMatchObject({ state_match: "ambiguous", before: null });
  input.states = [];
  expect(auditSelectionExecution(input).segments[0]!.actions[0]).toMatchObject({ state_match: "missing", before: null });
});

it("missing rankings and duplicate candidate text never turn into a false comparable best", () => {
  const input = JSON.parse(JSON.stringify(evidence[0]!));
  const criteria = input.decisions[0].questions.plan.criteria;
  criteria.copy = criteria.plan1;
  const ambiguous = auditSelectionExecution(input).segments[0]!.predictions;
  expect(ambiguous.final_match).toBe("ambiguous_logged_text");
  expect(ambiguous.predicted_final_rollout_best).toBeNull();
  delete criteria.copy;
  for (const key of Object.keys(criteria)) {
    const value = JSON.parse(criteria[key]); delete value.rollout_best; criteria[key] = JSON.stringify(value);
  }
  expect(auditSelectionExecution(input).segments[0]!.predictions.predicted_final_rollout_best).toBeNull();
});

it("a gate rejection is not dispatched; a later SL attempt cannot continue the same forecast", () => {
  const input = JSON.parse(JSON.stringify(evidence[2]!));
  input.decisions[0].gate_reject = { reason: "fixed identity mismatch" };
  input.decisions[1].sl_attempt = 2;
  const first = auditSelectionExecution(input).segments[0]!;
  expect(first.actions[0]!.dispatch).toBe("rejected");
  expect(first.actions).toHaveLength(1);
  expect(first.boundary.kind).toBe("turn_room_or_attempt_changed");
});

it("refuses mixed runs, characters, ascensions and duplicate decision ids without mutating inputs", () => {
  const original = structuredClone(evidence[0]!);
  auditSelectionExecution(original);
  expect(original).toEqual(evidence[0]);
  for (const modify of [
    (x: typeof original) => { x.run.character = "IRONCLAD"; },
    (x: typeof original) => { x.run.ascension = 9; },
    (x: typeof original) => { x.decisions[0]!.run_id = "FOREIGN00000"; },
    (x: typeof original) => { x.states[0]!.state.run.character_id = "IRONCLAD"; },
    (x: typeof original) => { x.decisions.push(x.decisions[0]!); },
  ]) {
    const input = structuredClone(original); modify(input);
    expect(() => auditSelectionExecution(input)).toThrow();
  }
});

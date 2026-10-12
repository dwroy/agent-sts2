import { expect, it } from "vitest";
import evidence from "./silent-observed-intervals-evidence.json";
import { auditSelectionExecution } from "../../learner/lib/selection-execution.js";

const audit = () => auditSelectionExecution(structuredClone(evidence));
const interval = (line: number) => audit().observed_intervals.find((row) => row.source_line === line)!;

it("YF F48 T4 separates a held Fumes from the Accelerant established after a new question", () => {
  const gamble = interval(271498);
  expect(gamble).toMatchObject({ reason: "adjacent_logged_observations", boundary: "next_question" });
  expect(gamble.before!.hand).toContainEqual({ index: 3, id: "NOXIOUS_FUMES", upgraded: true });
  const accelerant = interval(271499);
  expect(accelerant.before!.player_powers).not.toEqual(expect.arrayContaining([
    expect.objectContaining({ power_id: "ACCELERANT_POWER" }),
  ]));
  expect(accelerant.after!.player_powers).toEqual(expect.arrayContaining([
    expect.objectContaining({ power_id: "ACCELERANT_POWER", amount: 2 }),
  ]));
  expect(accelerant.after!.enemies[0]!.powers).not.toEqual(expect.arrayContaining([
    expect.objectContaining({ power_id: "POISON_POWER" }),
  ]));
  expect(accelerant.actual_action_effect).toBeNull();
  expect(accelerant.actual_full_candidate_result).toBeNull();
});

it("YF T3 to T4 keeps phase HP 4 to 212 and the cleared poison as separate snapshots", () => {
  const transition = interval(271494);
  expect(transition.boundary).toBe("next_turn_after_end_request");
  expect(transition.before!.enemies[0]).toMatchObject({ id: "TEST_SUBJECT", hp: 4 });
  expect(transition.before!.enemies[0]!.powers).toEqual(expect.arrayContaining([
    expect.objectContaining({ power_id: "POISON_POWER", amount: 4 }),
  ]));
  expect(transition.after!.enemies[0]).toMatchObject({ id: "TEST_SUBJECT", hp: 212 });
  expect(transition.after!.enemies[0]!.powers).not.toEqual(expect.arrayContaining([
    expect.objectContaining({ power_id: "POISON_POWER" }),
  ]));
  expect(transition.actual_action_effect).toBeNull();
});

it("YF T5 keeps 23 existing block when Kunai adds Dexterity from 5 to 6", () => {
  const thirdShiv = interval(271507);
  expect(thirdShiv.before!.block).toBe(23);
  expect(thirdShiv.after!.block).toBe(23);
  expect(thirdShiv.before!.player_powers).toEqual(expect.arrayContaining([
    expect.objectContaining({ power_id: "DEXTERITY_POWER", amount: 5 }),
  ]));
  expect(thirdShiv.after!.player_powers).toEqual(expect.arrayContaining([
    expect.objectContaining({ power_id: "DEXTERITY_POWER", amount: 6 }),
  ]));
  expect(thirdShiv.before!.enemies[0]!.hp).toBe(178);
  expect(thirdShiv.after!.enemies[0]!.hp).toBe(169);
});

it("a pending Survivor response remains unconfirmed even with the next card-selection snapshot", () => {
  const survivor = interval(271501);
  expect(survivor).toMatchObject({ dispatch: "queued_unconfirmed", boundary: "card_selection" });
  expect(survivor.after).not.toBeNull();
  expect(survivor.actual_action_effect).toBeNull();
  expect(interval(271509)).toMatchObject({ reason: "input_exhausted", after: null });
});

it("SL restoration, missing source rows and unverified turn jumps never form an observed interval", () => {
  for (const [mutate, reason] of [
    [(x: any) => { x.decisions[1].sl_reloads++; }, "room_or_attempt_changed_or_unknown"],
    [(x: any) => { delete x.decisions[0].sl_attempt; }, "room_or_attempt_changed_or_unknown"],
    [(x: any) => { x.decisions.splice(1, 1); }, "source_decisions_not_adjacent"],
    [(x: any) => { delete x.decisions[0]._line; }, "source_decisions_not_adjacent"],
    [(x: any) => { x.decisions[1].turn += 2; }, "turn_boundary_unverified"],
    [(x: any) => { x.decisions[1].observed_ts = x.decisions[0].observed_ts; }, "observation_time_not_increasing"],
  ] as const) {
    const input = structuredClone(evidence); mutate(input);
    expect(auditSelectionExecution(input).observed_intervals[0]).toMatchObject({ reason, after: null });
  }
});

it("missing, ambiguous or inconsistent endpoints stay unknown; no powers field means unknown", () => {
  for (const mutate of [
    (x: any) => { x.states.splice(1, 1); },
    (x: any) => { x.states.push(structuredClone(x.states[1])); },
    (x: any) => { x.states[1].state.turn += 1; },
  ]) {
    const input = structuredClone(evidence); mutate(input);
    expect(auditSelectionExecution(input).observed_intervals[0]).toMatchObject({
      reason: "state_match_unavailable", after: null,
    });
  }
  const input: any = structuredClone(evidence);
  delete input.states[0].state.combat.player.powers;
  delete input.states[0].state.combat.hand;
  expect(auditSelectionExecution(input).observed_intervals[0]!.before).toMatchObject({ player_powers: null, hand: null });
});

it("does not mutate the frozen evidence or certify a full forecast", () => {
  const input = structuredClone(evidence), result = auditSelectionExecution(input);
  expect(input).toEqual(evidence);
  expect(result.observed_intervals.every((row) => row.actual_action_effect === null)).toBe(true);
  expect(result.segments.every((row) => row.actual_full_candidate_result === null)).toBe(true);
});

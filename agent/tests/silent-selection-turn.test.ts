import { expect, it } from "vitest";
import evidence from "./silent-selection-turn-evidence.json";
import { auditSelectionExecution } from "../../learner/lib/selection-execution.js";

const input = (): any => structuredClone(evidence);
const result = (source = input()) => auditSelectionExecution(source);
const at = (attempt: number, turn: number, source = input()) => result(source).observed_turns
  .find((row) => row.attempt === attempt && row.turn === turn)!;
const facts = (attempt: number, turn: number, source = input()): any => at(attempt, turn, source).facts;

it("9Z T7 keeps original/SL forecasts apart from both replanned actual turn windows", () => {
  const audit = result();
  const segment = audit.segments.find((row) => row.source_line === 281550)!;
  expect(segment.predictions.sl).toMatchObject({ numbers: {
    original: expect.stringContaining("hp -8, dmg 42"), replacement: expect.stringContaining("hp -15, dmg 58"),
  } });
  const second = facts(2, 7), third = facts(3, 7);
  expect(second).toMatchObject({ before: { hp: 20 }, after: { hp: 9 }, player_hp_delta: -11,
    enemy_hp_changes: [{ hp_before: 393, hp_after: 344, hp_delta: -49 }] });
  expect(third).toMatchObject({ before: { hp: 20 }, after: { hp: 11 }, player_hp_delta: -9,
    enemy_hp_changes: [{ hp_before: 393, hp_after: 322, hp_delta: -71 }] });
  expect(second.replanning_decisions).toHaveLength(2);
  expect(third.replanning_decisions).toHaveLength(3);
  for (const row of [second, third]) expect(row).toMatchObject({
    actual_uncapped_hp_loss: null, actual_full_candidate_result: null, causal_candidate_result: null,
  });
});

it("T8 records zero HP followed by 20 HP separately from the positive net change", () => {
  const row = facts(3, 8);
  expect(row).toMatchObject({ player_hp_delta: 9, state_path_status: "contiguous_source_states",
    enemy_hp_changes: [{ hp_before: 322, hp_after: 269, hp_delta: -53 }],
    player_hp_changes: [
      { before_source_line: 287989, after_source_line: 287990, hp_before: 11, hp_after: 0, hp_delta: -11, causal_source: null },
      { before_source_line: 287990, after_source_line: 287991, hp_before: 0, hp_after: 20, hp_delta: 20, causal_source: null },
    ], actual_uncapped_hp_loss: null,
  });
  expect(row.player_hp_path.find((frame: any) => frame.source_line === 287989).potions[0])
    .toMatchObject({ potion_id: "FAIRY_IN_A_BOTTLE", occupied: true });
  expect(row.player_hp_path.find((frame: any) => frame.source_line === 287991).potions[0].occupied).toBe(false);
});

it("T10 preserves the early forecast, subsequent least-loss re-plan and observed 18 to 3", () => {
  const audit = result();
  expect(audit.segments.find((row) => row.source_line === 281568)!.predictions.answer!.facts.hp_after).toBe(16);
  const turn = at(3, 10);
  expect(turn.decisions.find((row) => row.source_line === 281569)!.rationale).toContain("most HP (-9)");
  expect(turn.facts).toMatchObject({ before: { hp: 18 }, after: { hp: 3 }, player_hp_delta: -15,
    enemy_hp_changes: [{ hp_before: 198, hp_after: 112, hp_delta: -86 }], actual_full_candidate_result: null });
});

it("partial openings, exhausted windows and the unverified terminal timestamp stay unknown", () => {
  for (const [attempt, turn, reason] of [[2, 6, "turn_opening_unverified"], [2, 9, "turn_end_unverified"],
    [3, 11, "turn_end_unverified"]] as const) {
    expect(at(attempt, turn)).toMatchObject({ status: "unknown", reason, facts: null });
  }
});

it.each(["decision_gap", "missing_state", "duplicate_state", "attempt", "reload", "time"])(
  "%s cannot certify a complete observed turn window", (mode) => {
    const source = input(), decision = source.decisions.find((row: any) => row._line === 281552);
    const index = source.states.findIndex((row: any) => row.observed_ts === decision.observed_ts && row.fingerprint === decision.fingerprint);
    if (mode === "decision_gap") source.decisions.splice(source.decisions.indexOf(decision), 1);
    if (mode === "missing_state") source.states.splice(index, 1);
    if (mode === "duplicate_state") source.states.push(structuredClone(source.states[index]));
    if (mode === "attempt") decision.sl_attempt++;
    if (mode === "reload") decision.sl_reloads++;
    if (mode === "time") {
      const previous = source.decisions.find((row: any) => row._line === 281551);
      source.states[index].observed_ts = decision.observed_ts = previous.observed_ts;
    }
    const windows = result(source).observed_turns.filter((row) => row.turn === 7 && row.attempt === 3);
    expect(windows.length).toBeGreaterThan(0);
    expect(windows.every((row) => row.status === "unknown" && row.facts === null)).toBe(true);
  });

it("a missing non-decision revival frame leaves the state path unknown while endpoints remain observed", () => {
  const source = input(); source.states = source.states.filter((row: any) => row._line !== 287990);
  expect(facts(3, 8, source)).toMatchObject({ player_hp_delta: 9, state_path_status: "unverified_source_state_path",
    player_hp_path: null, player_hp_changes: null, actual_uncapped_hp_loss: null });
});

it.each(["repeated_type", "changed_roster", "changed_max_hp"])("%s leaves enemy turn comparison unknown", (mode) => {
  const source = input(), decision = source.decisions.find((row: any) => row._line === 281552);
  const frame = source.states.find((row: any) => row.observed_ts === decision.observed_ts && row.fingerprint === decision.fingerprint);
  const enemies = frame.state.combat.enemies;
  if (mode === "repeated_type") enemies.push(structuredClone(enemies[0]));
  if (mode === "changed_roster") enemies[0].enemy_id = "UNVERIFIED_ENTITY";
  if (mode === "changed_max_hp") enemies[0].max_hp++;
  expect(facts(3, 7, source)).toMatchObject({ player_hp_delta: -9,
    enemy_comparison: "ambiguous_or_changed_roster", enemy_hp_changes: null });
});

it("preserves the frozen input and existing character/ascension boundary", () => {
  const source = input(); result(source); expect(source).toEqual(evidence);
  source.run.character = "IRONCLAD"; expect(() => result(source)).toThrow();
  source.run.character = "SILENT"; source.run.ascension = 9; expect(() => result(source)).toThrow();
});

import { expect, it } from "vitest";
import evidence from "./silent-selection-observation-evidence.json";
import { auditSelectionExecution } from "../../learner/lib/selection-execution.js";

const input = () => JSON.parse(JSON.stringify(evidence));
const actions = (source = input()) => auditSelectionExecution(source).segments.flatMap((segment) => segment.actions);
const at = (line: number, source = input()) => actions(source).find((action) => action.source_line === line)!;

it("8JRE F33 T1/T4 links observed power appearance to the original dispatch and later state", () => {
  for (const [line, id, amount] of [[270213, "AFTERIMAGE_POWER", 1], [270214, "DEXTERITY_POWER", 2],
    [270225, "ACCELERANT_POWER", 1]] as const) {
    const action = at(line);
    expect(action.observed_interval).toMatchObject({ status: "observed_endpoints", facts: {
      next_source_line: line + 1, player_hp_delta: 0,
      player_power_changes: [{ power_id: id, before: null, after: amount }],
      causal_action_result: null, full_candidate_result: null,
    } });
  }
});

it("first and third attempt end-turn observations retain distinct actual HP costs and residual poison", () => {
  const first = at(270219).observed_interval.facts!;
  const third = at(270285).observed_interval.facts!;
  expect(first.player_hp_delta).toBe(-3);
  expect(third.player_hp_delta).toBe(-15);
  for (const facts of [first, third]) {
    expect(facts.enemy_changes).toMatchObject([{ enemy_id: "THE_INSATIABLE", hp_delta: -3 }]);
    expect(facts.after.enemies).toEqual(expect.arrayContaining([expect.objectContaining({
      powers: expect.arrayContaining([expect.objectContaining({ power_id: "POISON_POWER", amount: 2 })]),
    })]));
  }
});

it("a re-ask keeps an observed prefix while actual candidate attribution stays unknown", () => {
  const result = auditSelectionExecution(input());
  const segment = result.segments.find((row) => row.source_line === 270307)!;
  expect(segment.boundary.kind).toBe("superseded_by_question");
  expect(segment.actions).toHaveLength(1);
  expect(segment.actions[0]!.observed_interval.facts?.next_source_line).toBe(270308);
  expect(at(270308).observed_interval.facts?.player_power_changes).toContainEqual({
    power_id: "AFTERIMAGE_POWER", before: null, after: 1,
  });
  expect(result.segments.every((row) => row.actual_full_candidate_result === null)).toBe(true);
  // The held Accelerant in attempt six's T5 never becomes an observed power here.
  expect(at(270409).observed_interval.facts?.player_power_changes?.some((p) => p.power_id === "ACCELERANT_POWER")).toBe(false);
});

it("pending remains unconfirmed despite a later endpoint; rejected dispatches get no causal credit", () => {
  expect(at(270211)).toMatchObject({ dispatch: "queued_unconfirmed", observed_interval: {
    status: "observed_endpoints", facts: { causal_action_result: null },
  } });
  const source = input(); source.decisions.find((d: any) => d._line === 270213).gate_reject = {};
  expect(at(270213, source)).toMatchObject({ dispatch: "rejected", observed_interval: { facts: { causal_action_result: null } } });
});

it.each(["missing", "duplicate", "powers_missing", "powers_duplicate"])("%s observations never invent state effects", (mode) => {
  const source = input(), decision = source.decisions.find((d: any) => d._line === 270214);
  const index = source.states.findIndex((s: any) => s.observed_ts === decision.observed_ts && s.fingerprint === decision.fingerprint);
  if (mode === "missing") source.states.splice(index, 1);
  if (mode === "duplicate") source.states.push(structuredClone(source.states[index]));
  if (mode === "powers_missing") delete source.states[index].state.combat.player.powers;
  if (mode === "powers_duplicate") source.states[index].state.combat.player.powers.push(source.states[index].state.combat.player.powers[0]);
  const interval = at(270213, source).observed_interval;
  if (mode.startsWith("powers")) expect(interval.facts?.player_power_changes).toBeNull();
  else expect(interval).toMatchObject({ status: "unknown", facts: null });
});

it.each(["gap", "attempt", "reload", "unknown_attempt", "turn", "time"])("%s boundaries do not turn missing execution or SL restoration into recovery", (mode) => {
  const source = input(), next = source.decisions.find((d: any) => d._line === 270214);
  if (mode === "gap") next._line += 10;
  if (mode === "attempt") next.sl_attempt++;
  if (mode === "reload") next.sl_reloads++;
  if (mode === "unknown_attempt") delete next.sl_attempt;
  if (mode === "turn") next.turn++;
  if (mode === "time") {
    const previous = source.decisions.find((d: any) => d._line === 270213);
    const state = source.states.find((s: any) => s.observed_ts === next.observed_ts && s.fingerprint === next.fingerprint);
    state.observed_ts = next.observed_ts = previous.observed_ts;
  }
  expect(at(270213, source).observed_interval).toMatchObject({ status: "unknown", facts: null });
});

it("enemy index changes retain type labels; repeated types and roster changes remain unresolved", () => {
  const source = input(), next = source.decisions.find((d: any) => d._line === 270220);
  const state = source.states.find((s: any) => s.observed_ts === next.observed_ts && s.fingerprint === next.fingerprint);
  state.state.combat.enemies[0].index = 4;
  expect(at(270219, source).observed_interval.facts?.enemy_changes).toMatchObject([{ before_index: 0, after_index: 4, hp_delta: -3 }]);
  state.state.combat.enemies.push(structuredClone(state.state.combat.enemies[0]));
  expect(at(270219, source).observed_interval.facts?.enemy_changes).toBeNull();
  state.state.combat.enemies.pop(); state.state.combat.enemies[0].enemy_id = "UNKNOWN_INSTANCE";
  expect(at(270219, source).observed_interval.facts?.enemy_changes).toBeNull();
});

it("keeps input immutable and refuses another character or ascension", () => {
  const source = input(); auditSelectionExecution(source); expect(source).toEqual(evidence);
  source.run.character = "IRONCLAD"; expect(() => auditSelectionExecution(source)).toThrow();
  source.run.character = "SILENT"; source.run.ascension = 9; expect(() => auditSelectionExecution(source)).toThrow();
});

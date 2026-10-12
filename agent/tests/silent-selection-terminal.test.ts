import { expect, it } from "vitest";
import evidence from "./silent-selection-terminal-evidence.json";
import { auditSelectionExecution } from "../../learner/lib/selection-execution.js";

const input = (): any => structuredClone(evidence);
const terminal = (source = input()) => auditSelectionExecution(source).observed_actions[0]!.terminal_observation;

it("8JRE F33 attempt six T11 retains the terminal net loss without calling it uncapped damage", () => {
  const result = auditSelectionExecution(input());
  expect(result.segments).toHaveLength(0); // The final code-only end turn has no plan-choice segment.
  const action = result.observed_actions[0]!;
  expect(action).toMatchObject({ source_line: 270441, dispatch: "completed_response" });
  expect(action.observed_interval.status).toBe("unknown"); // The ordinary same-attempt rule stays intact.
  expect(action.terminal_observation).toMatchObject({ status: "observed_terminal_endpoints", facts: {
    attempt: 6, reloads: 5, next_source_line: 270442,
    before: { source_line: 276433, hp: 5, block: 22, screen: "COMBAT" },
    after: { source_line: 276434, hp: 0, screen: "GAME_OVER" },
    player_hp_delta: -5,
    displayed_attack_reference: { total_attack: 37, current_block: 22, attack_minus_block: 15 },
    enemy_hp_changes: [{ enemy_id: "THE_INSATIABLE", hp_before: 154, hp_after: 130, hp_delta: -24 }],
    actual_uncapped_damage: null, causal_action_result: null, full_candidate_result: null,
  } });
  expect(result.observed_actions[1]!.terminal_observation).toBeNull();
});

it.each(["pending", "rejected", "not_dispatched", "not_end_turn"])("%s cannot certify a terminal end-turn observation", (mode) => {
  const source = input(), row = source.decisions[0];
  if (mode === "pending") row.result = "pending (unstable): Action queued";
  if (mode === "rejected") row.gate_reject = { reason: "fixed refusal" };
  if (mode === "not_dispatched") row.result = "not dispatched: SL reloaded the fight";
  if (mode === "not_end_turn") row.chosen = { action: "play_card", card_index: 0 };
  expect(terminal(source)).toMatchObject({ status: "unknown", reason: "end_turn_dispatch_unconfirmed", facts: null });
});

it.each(["decision_gap", "state_gap", "reload", "attempt", "end_time", "victory", "completion_time"])("%s does not join a terminal state to the wrong action or attempt", (mode) => {
  const source = input();
  if (mode === "decision_gap") source.decisions[1]._line++;
  if (mode === "state_gap") source.states[1]._line++;
  if (mode === "reload") source.decisions[1].sl_reloads++;
  if (mode === "attempt") source.decisions[1].sl_attempt = 7;
  if (mode === "end_time") source.run.ended = source.decisions[0].observed_ts;
  if (mode === "victory") source.run.victory = true;
  if (mode === "completion_time") source.decisions[0].ts = source.decisions[1].observed_ts;
  expect(terminal(source)).toMatchObject({ status: "unknown", facts: null });
});

it.each(["missing", "duplicate", "positive_hp"])("%s terminal evidence stays unknown", (mode) => {
  const source = input();
  if (mode === "missing") source.states.pop();
  if (mode === "duplicate") source.states.push(structuredClone(source.states[1]));
  if (mode === "positive_hp") source.states[1].state.combat.player.current_hp = 1;
  expect(terminal(source)).toMatchObject({ status: "unknown", facts: null });
});

it("keeps missing intent totals unknown and does not infer damage from a card name or terminal cleanup", () => {
  const source = input();
  delete source.states[0].state.combat.enemies[0].intents[0].total_damage;
  const facts = terminal(source)!.facts!;
  expect(facts.player_hp_delta).toBe(-5);
  expect(facts.displayed_attack_reference).toEqual({ total_attack: null, current_block: 22, attack_minus_block: null });
  expect(facts.actual_uncapped_damage).toBeNull();
  expect(facts).not.toHaveProperty("player_power_changes");
});

it.each(["repeated_type", "changed_roster", "changed_max_hp"])("%s keeps terminal enemy identity unresolved", (mode) => {
  const source = input(), enemies = source.states[1].state.combat.enemies;
  if (mode === "repeated_type") enemies.push(structuredClone(enemies[0]));
  if (mode === "changed_roster") enemies[0].enemy_id = "UNVERIFIED_ENTITY";
  if (mode === "changed_max_hp") enemies[0].max_hp++;
  expect(terminal(source)!.facts).toMatchObject({ player_hp_delta: -5,
    enemy_comparison: "ambiguous_or_changed_roster", enemy_hp_changes: null });
});

it("preserves input and the existing role/ascension boundary", () => {
  const source = input(); auditSelectionExecution(source); expect(source).toEqual(evidence);
  source.run.character = "IRONCLAD"; expect(() => auditSelectionExecution(source)).toThrow();
  source.run.character = "SILENT"; source.run.ascension = 9; expect(() => auditSelectionExecution(source)).toThrow();
});

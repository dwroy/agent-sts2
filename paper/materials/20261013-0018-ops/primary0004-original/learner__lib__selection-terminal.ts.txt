import { asArray, asRecord, numOrNull, str } from "../../agent/src/core/util/json.js";

type Row = Record<string, unknown>;

/** 8JRE F33 T11, silent-0079: finalization drops the attempt number, not the terminal HP observation. */
export function terminalSelectionObservation(run: Row, row: Row, next: Row | undefined, before: Row | null, after: Row | null) {
  if (!next || next.label !== "run/finalize") return null;
  const unknown = (reason: string) => ({ status: "unknown", reason, facts: null });
  if (asRecord(row.chosen).action !== "end_turn" || asRecord(next.chosen).action !== "continue_game_over" ||
    row.gate_reject || !str(row.result).startsWith("completed:")) return unknown("end_turn_dispatch_unconfirmed");
  const line = numOrNull(row._line), attempt = numOrNull(row.sl_attempt), reloads = numOrNull(row.sl_reloads);
  if (line === null || !Number.isInteger(line) || line < 1 || next._line !== line + 1) return unknown("source_decision_gap");
  if (attempt === null || !Number.isInteger(attempt) || attempt < 1 ||
    reloads === null || !Number.isInteger(reloads) || reloads < 0 || next.sl_reloads !== reloads ||
    next.sl_attempt !== null || row.run_id !== run.run_id || next.run_id !== run.run_id ||
    row.floor !== run.floor || next.floor !== row.floor || numOrNull(row.turn) === null || next.turn !== row.turn) {
    return unknown("terminal_context_unverified");
  }
  if (run.victory !== false || !str(run.ended) || run.ended !== next.observed_ts) return unknown("run_end_unverified");
  if (!before || !after) return unknown("state_match_unavailable");
  const stateLine = numOrNull(before.source_line);
  if (stateLine === null || !Number.isInteger(stateLine) || stateLine < 1 || after.source_line !== stateLine + 1) {
    return unknown("source_state_gap");
  }
  const start = Date.parse(str(before.observed_ts)), end = Date.parse(str(after.observed_ts));
  const completed = Date.parse(str(row.ts));
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(completed) ||
    completed < start || completed >= end) return unknown("terminal_time_unverified");
  const hp = numOrNull(before.hp);
  if (before.screen !== "COMBAT" || after.screen !== "GAME_OVER" || hp === null || hp <= 0 || after.hp !== 0) {
    return unknown("terminal_hp_endpoint_unavailable");
  }
  const enemiesBefore = asArray(before.enemies).map(asRecord), enemiesAfter = asArray(after.enemies).map(asRecord);
  const unique = (enemies: Row[]) => enemies.length > 0 && enemies.every((enemy) => !!str(enemy.id)) &&
    new Set(enemies.map((enemy) => enemy.id)).size === enemies.length;
  const comparable = unique(enemiesBefore) && unique(enemiesAfter) && enemiesBefore.length === enemiesAfter.length &&
    enemiesBefore.every((enemy) => numOrNull(enemy.max_hp) !== null &&
      enemiesAfter.some((other) => other.id === enemy.id && other.max_hp === enemy.max_hp));
  const living = enemiesBefore.filter((enemy) => enemy.alive === true);
  const displayed = living.flatMap((enemy) => asArray(enemy.intents).map(asRecord));
  const attack = enemiesBefore.every((enemy) => typeof enemy.alive === "boolean") && living.length > 0 &&
    living.every((enemy) => Array.isArray(enemy.intents) && enemy.intents.length > 0) &&
    displayed.every((intent) => numOrNull(intent.total_damage) !== null)
    ? displayed.reduce((sum, intent) => sum + numOrNull(intent.total_damage)!, 0) : null;
  const block = numOrNull(before.block);
  return {
    status: "observed_terminal_endpoints", reason: null,
    facts: {
      scope: "adjacent_end_turn_and_run_finalization",
      attempt, reloads, next_decision_id: next.decision_id, next_source_line: next._line,
      before, after, player_hp_delta: -hp,
      // This arithmetic is a displayed-board reference, not uncapped actual damage or card attribution.
      displayed_attack_reference: { total_attack: attack, current_block: block,
        attack_minus_block: attack !== null && block !== null ? attack - block : null },
      enemy_comparison: comparable ? "unique_type_same_roster_not_instance_identity" : "ambiguous_or_changed_roster",
      enemy_hp_changes: comparable ? enemiesBefore.map((enemy) => {
        const other = enemiesAfter.find((item) => item.id === enemy.id)!;
        const a = numOrNull(enemy.hp), b = numOrNull(other.hp);
        return { enemy_id: enemy.id, before_index: enemy.index, after_index: other.index,
          hp_before: a, hp_after: b, hp_delta: a === null || b === null ? null : b - a };
      }) : null,
      // Game-over cleanup is not an observed power expiry; zero HP caps the observed loss.
      actual_uncapped_damage: null, causal_action_result: null, full_candidate_result: null,
    },
  };
}

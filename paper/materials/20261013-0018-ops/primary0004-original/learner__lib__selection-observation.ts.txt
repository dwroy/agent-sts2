import { asArray, asRecord, numOrNull, str } from "../../agent/src/core/util/json.js";

type Row = Record<string, unknown>;
const delta = (before: unknown, after: unknown): number | null => {
  const a = numOrNull(before), b = numOrNull(after);
  return a === null || b === null ? null : b - a;
};

function powerChanges(before: unknown, after: unknown) {
  const index = (value: unknown) => {
    if (!Array.isArray(value)) return null;
    const powers = new Map<string, number>();
    for (const item of value) {
      const row = asRecord(item), id = str(row.power_id), amount = numOrNull(row.amount);
      if (!id || amount === null || powers.has(id)) return null;
      powers.set(id, amount);
    }
    return powers;
  };
  const a = index(before), b = index(after);
  if (!a || !b) return null;
  return [...new Set([...a.keys(), ...b.keys()])].sort().filter((id) => a.get(id) !== b.get(id))
    .map((id) => ({ power_id: id, before: a.get(id) ?? null, after: b.get(id) ?? null }));
}

/** 8JRE F33 T1/T4, silent-0021/0079: endpoints show observed changes, never causal card credit. */
export function selectionObservation(row: Row, next: Row | undefined, before: Row | null, after: Row | null) {
  const unknown = (reason: string) => ({ status: "unknown", reason, facts: null });
  if (!next) return unknown("no_next_decision");
  // Adjacent positions in a filtered input do not prove adjacent source decisions.
  const line = numOrNull(row._line);
  if (line === null || !Number.isInteger(line) || line < 1 || next._line !== line + 1) return unknown("source_decision_gap");
  if (["run_id", "floor", "sl_attempt", "sl_reloads"].some((key) => row[key] == null || row[key] !== next[key])) {
    return unknown("room_or_attempt_changed_or_unknown");
  }
  const turn = numOrNull(row.turn), nextTurn = numOrNull(next.turn);
  if (turn === null || nextTurn === null || !(nextTurn === turn ||
    (nextTurn === turn + 1 && asRecord(row.chosen).action === "end_turn"))) return unknown("turn_boundary_unverified");
  if (!before || !after) return unknown("state_match_unavailable");
  if (!(Date.parse(str(after.observed_ts)) > Date.parse(str(before.observed_ts)))) return unknown("observation_time_not_increasing");
  if (![before.screen, after.screen].every((screen) => screen === "COMBAT" || screen === "CARD_SELECTION")) {
    return unknown("combat_endpoint_unavailable");
  }
  const a = asArray(before.enemies).map(asRecord), b = asArray(after.enemies).map(asRecord);
  // enemy_id identifies a type, not an instance. Duplicate types or changed rosters stay unresolved.
  const unique = (enemies: Row[]) => enemies.every((enemy) => !!str(enemy.id)) &&
    new Set(enemies.map((enemy) => enemy.id)).size === enemies.length;
  const comparable = unique(a) && unique(b) && a.length === b.length && a.every((enemy) => b.some((other) => other.id === enemy.id));
  return {
    status: "observed_endpoints", reason: null,
    facts: {
      scope: "between_adjacent_decision_observations",
      next_decision_id: next.decision_id, next_source_line: next._line,
      after,
      player_hp_delta: delta(before.hp, after.hp),
      player_power_changes: powerChanges(before.powers, after.powers),
      enemy_comparison: comparable ? "unique_type_same_roster_not_instance_identity" : "ambiguous_or_changed_roster",
      enemy_changes: comparable ? a.map((enemy) => {
        const other = b.find((item) => item.id === enemy.id)!;
        return { enemy_id: enemy.id, before_index: enemy.index, after_index: other.index,
          hp_delta: delta(enemy.hp, other.hp), power_changes: powerChanges(enemy.powers, other.powers) };
      }) : null,
      // Net HP is neither uncapped incoming damage nor proof that a pending action completed.
      causal_action_result: null, full_candidate_result: null,
    },
  };
}

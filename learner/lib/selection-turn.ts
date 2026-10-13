import { asArray, asRecord, numOrNull, str } from "../../agent/src/core/util/json.js";

type Row = Record<string, unknown>;
type ObservedAction = {
  before: Row | null;
  observed_interval: { status: string; reason: string | null; facts: Row | null };
  terminal_observation: { status: string; reason: string | null; facts: Row | null } | null;
};
const context = (row: Row) => JSON.stringify([row.run_id, row.floor, row.turn, row.sl_attempt, row.sl_reloads]);

/** 9Z9H2EXKLF3T F48 T7-T10, silent-0079/0021: a turn's endpoints include every logged re-plan. */
export function observedSelectionTurns(decisions: Row[], states: Row[], actions: ObservedAction[]) {
  const turns = [];
  for (let start = 0; start < decisions.length; start++) {
    const first = decisions[start]!;
    if (!["COMBAT", "CARD_SELECTION"].includes(str(first.screen))) continue;
    let end = start;
    while (end + 1 < decisions.length && context(decisions[end + 1]!) === context(first)) end++;
    const last = decisions[end]!, next = decisions[end + 1], previous = decisions[start - 1];
    const before = actions[start]!.before;
    const incoming = actions[start - 1]?.observed_interval;
    const outgoing = actions[end]!.observed_interval;
    const terminal = actions[end]!.terminal_observation;
    const after = outgoing.status === "observed_endpoints" ? asRecord(outgoing.facts?.after)
      : terminal?.status === "observed_terminal_endpoints" ? asRecord(terminal.facts?.after) : null;
    const members = decisions.slice(start, end + 1);
    // First supplied action is not necessarily the opening. Require an observed preceding end-turn boundary.
    const opening = previous && incoming?.status === "observed_endpoints" &&
      asRecord(previous.chosen).action === "end_turn" && numOrNull(previous.turn) !== null &&
      first.turn === numOrNull(previous.turn)! + 1 && before?.screen === "COMBAT";
    const closed = next && asRecord(last.chosen).action === "end_turn" &&
      ((outgoing.status === "observed_endpoints" && numOrNull(first.turn) !== null && next.turn === numOrNull(first.turn)! + 1)
        || terminal?.status === "observed_terminal_endpoints");
    const reason = !opening ? "turn_opening_unverified"
      : !closed || !after ? "turn_end_unverified"
      : members.some((_row, i) => i < members.length - 1 && actions[start + i]!.observed_interval.status !== "observed_endpoints")
        ? "intermediate_observation_unverified" : null;
    const refs = members.map((row) => ({ decision_id: row.decision_id, source_line: numOrNull(row._line),
      label: row.label ?? null, requested_action: row.chosen ?? null, dispatch_result: row.result ?? null,
      logged_forecast: row.journal ?? null, rationale: row.rationale ?? null, sl: row.sl_explore ?? null }));
    let facts: Row | null = null;
    if (reason === null && before && after) {
      const snapshots = [...actions.slice(start, end + 1).map((action) => action.before!), after];
      const roster = (snapshot: Row) => asArray(snapshot.enemies).map(asRecord);
      const enemies = roster(before);
      const comparable = enemies.length > 0 && enemies.every((enemy) => !!str(enemy.id) && numOrNull(enemy.max_hp) !== null) &&
        new Set(enemies.map((enemy) => enemy.id)).size === enemies.length && snapshots.every((snapshot) => {
          const list = roster(snapshot);
          return list.length === enemies.length && new Set(list.map((enemy) => enemy.id)).size === list.length &&
            enemies.every((enemy) => list.some((other) => other.id === enemy.id && other.max_hp === enemy.max_hp));
        });
      const changes = comparable ? enemies.map((enemy) => {
        const other = roster(after).find((item) => item.id === enemy.id)!;
        const a = numOrNull(enemy.hp), b = numOrNull(other.hp);
        return { enemy_id: enemy.id, hp_before: a, hp_after: b, hp_delta: a === null || b === null ? null : b - a };
      }) : null;
      // Non-decision frames can show HP dropping to zero and then returning (9Z T8). Never replace this with net loss.
      const lo = numOrNull(before.source_line), hi = numOrNull(after.source_line);
      const path = lo !== null && hi !== null ? states.filter((row) => {
        const line = numOrNull(row._line);
        return line !== null && line >= lo && line <= hi;
      }).sort((a, b) => numOrNull(a._line)! - numOrNull(b._line)!) : [];
      const pathVerified = path.length > 0 && lo !== null && hi !== null && path.length === hi - lo + 1 &&
        path.every((row, i) => row._line === lo + i && asRecord(asRecord(row.state).run).floor === first.floor &&
          [first.turn, next!.turn].includes(asRecord(row.state).turn));
      const hpPath = pathVerified ? path.map((row) => {
        const state = asRecord(row.state), run = asRecord(state.run), player = asRecord(asRecord(state.combat).player);
        return { source_line: row._line, observed_ts: row.observed_ts ?? null, turn: state.turn ?? null,
          hp: numOrNull(player.current_hp) ?? numOrNull(run.current_hp), max_hp: numOrNull(player.max_hp) ?? numOrNull(run.max_hp),
          potions: run.potions ?? null, player_powers: player.powers ?? null };
      }) : null;
      const hpChanges = hpPath?.slice(1).flatMap((frame, i) => {
        const prior = hpPath[i]!;
        return prior.hp === null || frame.hp === null || prior.hp === frame.hp ? [] : [{
          before_source_line: prior.source_line, after_source_line: frame.source_line,
          hp_before: prior.hp, hp_after: frame.hp, hp_delta: frame.hp - prior.hp,
          // The observation does not assign a heal/revival/attack source or reconstruct uncapped incoming damage.
          causal_source: null,
        }];
      }) ?? null;
      const a = numOrNull(before.hp), b = numOrNull(after.hp);
      facts = { scope: "observed_turn_window", before, after,
        player_hp_delta: a === null || b === null ? null : b - a,
        enemy_comparison: comparable ? "unique_type_same_roster_not_instance_identity" : "ambiguous_or_changed_roster",
        enemy_hp_changes: changes, state_path_status: pathVerified ? "contiguous_source_states" : "unverified_source_state_path",
        player_hp_path: hpPath, player_hp_changes: hpChanges,
        replanning_decisions: members.filter((row, i) => i > 0 &&
          (str(row.label).startsWith("combat/plan-choice") || row.label === "combat/least-loss")).map((row) => row.decision_id),
        actual_uncapped_hp_loss: null, actual_full_candidate_result: null, causal_candidate_result: null };
    }
    turns.push({ floor: first.floor ?? null, turn: first.turn ?? null, attempt: first.sl_attempt ?? null,
      reloads: first.sl_reloads ?? null, status: reason === null ? "observed_turn_endpoints" : "unknown",
      reason, decisions: refs, facts });
    start = end;
  }
  return turns;
}

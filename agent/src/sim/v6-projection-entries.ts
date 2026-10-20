/** Explicit per-combination W4 bridge; direction maxima never stand in for every combination. */
import type { V6Config } from "../v6/config.js";
import type { ProjectionEntry } from "../v6/formats.js";
import { v6DeltaTier, v6WinTier, type V6ProjectionTable } from "./v6-projection.js";

export function v6ProjectionEntries(table: V6ProjectionTable, config: V6Config, optionId?: string): ProjectionEntry[] {
  if (!table.enabled || config.mode === "off") return [];
  return table.combinations.filter(r => optionId === undefined || r.entry.option_id === optionId).map(r => {
    const e = structuredClone(r.entry), chain = table.targets.find(t => t.id === e.target_id)?.kind === "chain";
    const maximum = table.entries.find(m => m.option_id === e.option_id && m.direction_id === e.direction_id && m.target_id === e.target_id);
    if (chain) { e.win = e.joint_win; e.paired_delta = e.joint_paired_delta; }
    e.win_tier = v6WinTier(e.win?.value ?? null, config); e.delta_tier = v6DeltaTier(e.paired_delta, config);
    e.direction_value = (chain ? maximum?.joint_win : maximum?.win)?.value ?? null;
    e.weighted_current_boss_delta = maximum?.weighted_current_boss_delta ?? null;
    e.weighted_joint_delta = maximum?.weighted_joint_delta ?? null;
    if (r.combination_id !== null && r.completion_source !== "unknown") {
      e.combo_id = r.combination_id;
      e.combo_source = r.completion_source === "build_core" ? "build-core-v1" : r.completion_source === "brain" ? "brain" : "construction-transition";
      e.win_complete = chain ? r.completed_joint_win : r.completed_win;
      e.win_incomplete = chain ? r.general_joint_win : r.general_win;
      e.incomplete_source = e.win_incomplete ? "empirical" : "unknown";
      e.expected_win = e.win?.value ?? null;
      e.combo_metrics = r.summary;
      if (r.general_source === "not_computed") e.formula = "formation_times_completed";
    }
    return e;
  });
}

import { fileURLToPath } from "node:url";
import { vi } from "vitest";
import { directionSummaries } from "../src/v6/direction-plan.js";
import { loadV6Knowledge } from "../src/v6/knowledge.js";
import { comboProjection } from "./v6-direction-core-fixtures.js";
import { board, env, type Raw } from "./oneshot-support.js";
import type { V6ProjectionTable } from "../src/sim/v6-projection.js";

export const knowledge = fileURLToPath(new URL("../../knowledge", import.meta.url));
// Use the published R2 file, not a small synthetic replacement that hides the production size.
export const loaded = loadV6Knowledge(knowledge, "silent").cores;
if (loaded.status !== "loaded") throw Error("Published Silent build cores required");
export const cores = loaded.value;
export const summaries = directionSummaries("silent", 10, cores, [], null);
export const weights = { P: .1, D: .1, S: .1, R: .7 };
export const entries = summaries.flatMap(d => d.combos.flatMap(c => ["f48:AEONGLASS", "chain:unknown"].map(target_id => ({ ...comboProjection(),
  direction_id: d.id, combo_id: c.id, combo_metrics: c.metrics, target_id, expected_win: d.id === "R" ? .7 : .56 }))));
export const size = (v: unknown) => Buffer.byteLength(JSON.stringify(v));
export function on() {
  vi.stubEnv("CHARACTER", "silent"); vi.stubEnv("V6_BUILD", "on");
  for (const name of ["CARD", "POTION", "SHOP", "REST"]) vi.stubEnv(`V6_${name}_DECIDER`, "jev");
}
export function situation(kind: "card" | "shop" | "rest") {
  const raw = kind === "card" ? board("xljq-f5-reward", "reward") : kind === "shop" ? board("u6ru-f22-shop", "open") : board("w2tb-f7-rest", "rest");
  Object.assign(raw.run as Raw, { character_id: "SILENT", ascension: 10 });
  if (kind === "card") {
    raw.available_actions = ["choose_reward_card", "skip_reward_cards"];
    raw.reward = { pending_card_choice: true, card_options: [0, 1, 2].map(index => ({ index, card_id: "TEST_CARD", upgraded: false })) };
  }
  const e = env(raw);
  e.screenMemory.runPlan = { runId: String(raw.run_id), act: 1, v6: { direction_weights: weights, potion_directions: [], checkpoint: 40 } } as typeof e.screenMemory.runPlan;
  return e;
}

export function shopTable(input: { options: readonly { option: { key: string } }[] }): V6ProjectionTable {
  const table: V6ProjectionTable = { schema: "v6-projection-table-v1", enabled: true, phase: "pick",
    entries: [], combinations: [], act_evaluations: [], weighted: [], rankings: {}, pick_direction_comparisons: [],
    target_mixtures: [], targets: [
      { id: "f48:AEONGLASS", boss: "AEONGLASS", act: 3, floor: 48, kind: "current", probability: 1, labels: [] },
      { id: "chain:unknown", boss: "AEONGLASS", act: 3, floor: 49, kind: "chain", probability: 1, labels: [] }],
    telemetry: { elapsed_ms: 1, cache_hits: 0, cache_misses: 0, simulations: 0, timed_out: 0,
      degradation: ["synthetic_comparison_contract"], unknown_entries: 0, total_entries: 0, unknown_fraction: 0, act_cache_hit: false } };
  for (const [i, o] of input.options.entries()) {
    for (const kind of ["clearance", "current_gate"] as const) table.target_mixtures.push({ option_id: o.option.key, kind,
      value: null, paired_delta: i === 27 ? null : { mean: kind === "clearance" ? .02 : -.01, se: .001, n: 20 },
      known_mass: i === 27 ? .25 : 1, known_value: 0, labels: i === 27 ? ["fixture_incomplete_target_mass"] : [] });
    for (const entry of entries) {
      const row = { ...entry, option_id: o.option.key };
      table.combinations.push({ entry: row, combination_id: row.combo_id!, completion_source: "build_core", general_source: "empirical",
        scope: "combination_expectation", completed_win: row.win_complete!, general_win: row.win_incomplete!,
        completed_joint_win: row.win_complete!, general_joint_win: row.win_incomplete!, formation_n: 200, formation_se: .01,
        summary: row.combo_metrics!, role: "unknown", role_labels: [], model_labels: [], completion_sample_ids: [],
        unknown_reasons: ["fixture_opening_limitation"], continuous: null });
    }
  }
  return table;
}

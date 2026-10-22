import { fileURLToPath } from "node:url";
import { vi } from "vitest";
import { directionSummaries } from "../src/v6/direction-plan.js";
import { loadV6Knowledge } from "../src/v6/knowledge.js";
import { observeV6CardReward } from "../src/v6/card-reward-scope.js";
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
  if (kind === "card") {
    const fight = structuredClone(e.state);
    fight.in_combat = true; fight.screen = "COMBAT";
    observeV6CardReward(e.screenMemory, fight);
    observeV6CardReward(e.screenMemory, e.state);
  }
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

/** One fixed grid shared by the transport contract and its separate host-performance measurement. */
export function realisticCardGrid() {
  const e = situation("card");
  const metrics = { hp_loss: { mean: 17.123456789123, se: .123456789123, n: 100 }, turns: { mean: 8.5123456789, se: .25123456789, n: 100 },
    damage_per_turn: { mean: 19.123456789123, se: .987654321987, n: 100 }, death_rate: { mean: .123456789, se: .02123456789, n: 100 },
    losing_enemy_hp_fraction: { mean: .35123456789123, se: .03123456789123, n: 12 } };
  const targets = Array.from({ length: 19 }, (_, i) => ({ id: `target${i}:FIXED_ENCOUNTER`, boss: `BOSS${i}`, act: i < 7 ? 1 : i < 10 ? 2 : 3,
    floor: i === 0 ? 17 : i < 7 ? 8 : i < 10 ? 33 : 48,
    kind: i === 0 ? "current" as const : i < 7 ? "elite" as const : i < 13 ? "future" as const : "chain" as const,
    probability: i === 0 ? 1 : null, labels: [i < 7 ? "fixed_actual_boss_or_observed_elite_pool" : "fixed_uncalibrated_future_target"] }));
  const row = { option_id: "skip", target_id: targets[0]!.id, metrics, paired_delta: metrics, samples: 100, requested_samples: 100,
    capped: 0, time_up: 0, missing: 0, trust: { value: "unknown" as const, labels: ["fixed_untrusted_model"], details: { n: 43, brier: .2, bias: .1, passed: false } },
    labels: [], unknown_reasons: [] };
  const combos = summaries.flatMap(d => d.combos.map(c => ({ direction: d.id, combo: c })));
  e.v6CardResults = { schema: "v6-card-combat-results-v1", targets,
    immediate: ["card0", "card1", "card2", "skip"].flatMap(option_id => targets.slice(0, 7).map(t => ({ ...row, option_id, target_id: t.id,
      ...(t.id === targets[6]!.id ? { unknown_reasons: ["fixed_partial_opening_limitation"] } : {}) }))),
    long_term: combos.flatMap(({ direction, combo }) => targets.slice(7).map(t => ({ ...row, target_id: t.id,
      direction_id: direction, combo_id: combo.id, added_cards: [] }))),
    progress: { card0: combos.map(({ direction, combo }) => ({ direction, combo: combo.id, advanced: 1, missing_before: 3, missing_after: 2 })) }, labels: [],
    telemetry: { elapsed_ms: 1, preparation_ms: 0, simulation_ms: 1, cache_hits: 0, simulations: 0,
      long_term_cache: "hit", long_term_computed: 204, long_term_total: 204, pending_work: false } };
  return { e, combos, targets };
}

/** Log-only summaries of existing continuous samples. Never schedules or scores a fight. */
import { createHash } from "node:crypto";
import { serialize } from "node:v8";
import type { GameState } from "../hand/mod/schema.js";
import type { RolloutInput } from "../reflex/rollout.js";
import type { FightSampleResult } from "./boss-sim.js";
import { continuousBossResult, type ContinuousSample } from "./continuous-boss-result.js";

export interface F48JointScope {
  character: string;
  floor: number | null;
  ascension: number | null;
}
export interface F48JointCandidate {
  key: string;
  outcomes: FightSampleResult[];
  /** Original goal, including samples C2 did not run. */
  requested: number;
  order: string | null;
  input?: unknown;
}
type RecordValue = Record<string, unknown>;

export function f48JointScope(state: GameState): F48JointScope | undefined {
  // Paused by default for the system-health investigation; never changes existing B2/B3 computation.
  if (process.env["F48_JOINT_SHADOW"] !== "shadow") return undefined;
  const character = String(state.run?.raw["character_id"] ?? "").toLowerCase();
  return character === "silent" && state.run?.floor === 48
    ? { character, floor: 48, ascension: state.run.ascension ?? null } : undefined;
}

function digest(value: unknown): string {
  // Unlike JSON, the hash retains undefined and nonfinite input values.
  return createHash("sha256").update(serialize(value)).digest("hex");
}
function distribution(values: unknown[]): { state: unknown; n: number }[] {
  const counts = new Map<string, { state: unknown; n: number }>();
  for (const value of values) {
    const key = JSON.stringify(value);
    const entry = counts.get(key) ?? { state: value, n: 0 };
    entry.n++; counts.set(key, entry);
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
}
function hpDistribution(values: number[]): RecordValue {
  const sorted = values.slice().sort((a, b) => a - b);
  const q = (p: number): number | null => {
    if (!sorted.length) return null;
    const at = (sorted.length - 1) * p, lo = Math.floor(at), hi = Math.ceil(at);
    return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (at - lo);
  };
  return { n: sorted.length, min: sorted[0] ?? null, p10: q(.1), p50: q(.5), p90: q(.9) };
}
function resourcesValid(r: ContinuousSample["firstResources"], positive: boolean): boolean {
  return !!r && Number.isFinite(r.hp) && (positive ? r.hp > 0 : r.hp >= 0)
    && Array.isArray(r.potionSlots) && r.potionSlots.every((p) => typeof p === "string" && /^POTION:[^:]+:\d+$/.test(p))
    && new Set(r.potionSlots).size === r.potionSlots.length
    && Array.isArray(r.revives) && r.revives.every((v) => typeof v.source === "string" && Number.isFinite(v.hp) && v.hp > 0);
}
function same(a: unknown, b: unknown): boolean { return digest(a) === digest(b); }

/** Invalid resources never acquire a numeric probability or an invented fresh resource state. */
function sampleStatus(o: FightSampleResult): { reason: string | null; joint: number | null } {
  const s = o.sequence;
  if (!s) return { reason: "missing_continuous_sample", joint: null };
  if (!Number.isInteger(s.seed) || s.seed! < 0 || s.seed! > 0xffffffff) return { reason: "missing_sample_seed", joint: null };
  if (s.firstCapped !== false || s.firstTimeUp !== false) return { reason: "unfinished_first_fight", joint: null };
  if (!s.firstWon) return s.firstDied === true
    ? { reason: null, joint: 0 } : { reason: "unknown_first_fight", joint: null };
  if (s.firstDied !== false || !resourcesValid(s.firstResources, true)
      || !Number.isFinite(s.firstHp) || s.firstHp !== s.firstResources!.hp) {
    return { reason: "invalid_first_resource_contract", joint: null };
  }
  if (!resourcesValid(s.secondEntry, false) || !Number.isFinite(s.openingHpLoss) || s.openingHpLoss! < 0
      || s.secondEntry!.hp !== s.firstResources!.hp - s.openingHpLoss!
      || !same(s.secondEntry!.revives, s.firstResources!.revives)
      || !same(s.secondEntry!.potionSlots, s.firstResources!.potionSlots)
      || !same(s.firstPotions, s.firstResources!.potionSlots)) {
    return { reason: "invalid_second_entry_contract", joint: null };
  }
  if (!s.secondBoss) return { reason: "missing_second_boss_variant", joint: null };
  if (o.capped || o.timeUp) return { reason: o.timeUp ? "second_time_up" : "second_capped", joint: null };
  if (s.secondWon === s.secondDied || s.secondWon !== o.won || s.secondDied !== o.died) {
    return { reason: "unknown_second_outcome", joint: null };
  }
  if (!o.resources || !resourcesValid({ ...o.resources, potionSlots: [] }, o.won)) {
    return { reason: "invalid_second_exit_contract", joint: null };
  }
  return { reason: null, joint: s.secondWon ? 1 : 0 };
}

const trust = {
  F49: "low_trust", production_calibration: "unknown", joint_calibration: "unknown", joint_S: "unknown",
  reason: "learner_quality_objection; frozen_model_validation_does_not_calibrate_current_production",
} as const;
const unknownResources = ["unobserved_transition_rewards", "actual_second_opening_unknown", "unmodelled_opening_charges",
  "physical_spent_slots_not_captured_by_G1a", "actual_resource_use_not_inferred_from_holdings"];

/** Best-effort logging cannot change a completed decision into a failed computation. */
export function f48JointShadow(scope: F48JointScope | undefined, candidates: F48JointCandidate[], input?: RolloutInput,
  failure?: { reason: string; reference?: unknown }): RecordValue | undefined {
  if (scope?.character !== "silent" || scope.floor !== 48) return undefined;
  const header = { schema: "f48-joint-shadow-v1", mode: "shadow", delivered: false, scope,
    trust, extra_simulation_samples: 0, extra_workers: 0,
    runtime_binding: "enclosing_run_config_and_decision_record; no retrospective_identity_fill",
    actual_run_result: "unknown" };
  try {
    if (failure || !input?.continuation || !candidates.length) return { ...header, status: "unknown",
      reason: failure?.reason ?? "existing_continuous_computation_unavailable", candidates: [],
      failure: failure ?? null, paired_comparison: null, continuous: null };
    const inputHash = digest(input);
    const checked = candidates.map((c) => {
      const seen = new Set<number>();
      const statuses = c.outcomes.map((o) => {
        const status = sampleStatus(o), seed = o.sequence?.seed;
        if (seed !== undefined && seen.has(seed)) return { reason: "duplicate_sample_seed", joint: null };
        if (seed !== undefined) seen.add(seed);
        return status;
      });
      const good = c.outcomes.filter((_, i) => !statuses[i]!.reason);
      // F49 censoring must not discard a valid F48 exit from the resource distribution.
      const firstWins = c.outcomes.flatMap((o, i) => o.sequence?.firstWon
        && (statuses[i]!.reason === null || ["second_capped", "second_time_up", "unknown_second_outcome", "invalid_second_exit_contract"].includes(statuses[i]!.reason!))
        ? [o.sequence] : []);
      const continuous = continuousBossResult(c.outcomes, c.requested, true)!;
      const bad = statuses.filter((s) => s.reason).length;
      const missing = Math.max(0, c.requested - c.outcomes.length);
      // Preserve the G1a denominators/counts. Suppress values and unsafe traces for invalid samples.
      const safeContinuous = { ...continuous, traces: good.flatMap((o) => o.sequence ? [o.sequence] : []).slice(0, 3),
        ...(bad ? Object.fromEntries((["first", "secondGivenFirstWin", "joint"] as const).map((key) => [key,
          { ...continuous[key], value: null, unknown: Math.max(continuous[key].unknown, bad), reason: "invalid_or_unknown_sample_contract" }])) : {}) };
      const reasons = distribution(statuses.flatMap((s) => s.reason ? [s.reason] : []));
      return { c, statuses, continuous: safeContinuous, record: {
        candidate_key: c.key, candidate_input_sha256: digest({ inputHash, candidate: c.input ?? c.key, order: c.order }),
        policy: { order: c.order, source: "unchanged_existing_solver_and_continuation_policy" },
        sample_seed_manifest_sha256: digest(c.outcomes.map((o) => o.sequence?.seed ?? null)),
        samples: c.outcomes.length, requested: c.requested, missing_samples: missing, unknown_samples: bad,
        unknown_reasons: reasons, status: safeContinuous.joint.value === null ? "unknown" : "produced",
        continuous: safeContinuous,
        exit_resources: { scope: "F48_winning_complete_samples", n: firstWins.length,
          hp: hpDistribution(firstWins.map((s) => s.firstResources!.hp)), max_hp: null,
          potion_slot_states: distribution(firstWins.map((s) => s.firstResources!.potionSlots)),
          remaining_revive_states: distribution(firstWins.map((s) => s.firstResources!.revives)),
          opening_hp_loss: distribution(firstWins.map((s) => s.openingHpLoss)),
          simulated_F49_entry_hp: hpDistribution(firstWins.map((s) => s.secondEntry!.hp)),
          spent_slots: null, actual_revive_use: null, opening_charge_states: null,
          unknown: [...unknownResources, "max_hp_not_returned_by_G1a"] },
        second_outcomes: distribution(c.outcomes.map((o, i) => statuses[i]!.reason ?? (!o.sequence!.firstWon ? "not_entered"
          : o.won ? "won" : "died"))),
        second_exit_resources: { scope: "existing_F49_returned_state", traces: good.filter((o) => o.sequence!.firstWon).slice(0, 3)
          .map((o) => ({ seed: o.sequence!.seed, boss: o.sequence!.secondBoss, won: o.won, died: o.died,
            resources: o.resources ?? null, actual_potion_or_revive_use: "unknown" })) },
      } };
    });
    const reference = checked[0]!;
    const records = checked.map((row) => {
      const bySeed = new Map(reference.c.outcomes.map((o, i) => [o.sequence?.seed, i]));
      const differences: number[] = [];
      let mismatch = 0;
      row.c.outcomes.forEach((o, i) => {
        const ri = bySeed.get(o.sequence?.seed), other = ri === undefined ? undefined : reference.c.outcomes[ri];
        const a = row.statuses[i]!, b = ri === undefined ? undefined : reference.statuses[ri];
        if (!other || a.joint === null || b?.joint == null) return;
        if (o.sequence!.firstWon && other.sequence!.firstWon && o.sequence!.secondBoss !== other.sequence!.secondBoss) { mismatch++; return; }
        differences.push(a.joint - b.joint);
      });
      const n = differences.length;
      const complete = n === row.c.requested && n === reference.c.requested && !mismatch
        && row.continuous.joint.value !== null && reference.continuous.joint.value !== null;
      const mean = n ? differences.reduce((s, d) => s + d, 0) / n : null;
      const se = n > 1 ? Math.sqrt(differences.reduce((s, d) => s + (d - mean!) ** 2, 0) / (n - 1) / n) : null;
      return { ...row.record, paired_comparison: { reference: reference.c.key, complete_pairs: n,
        missing_pairs: Math.max(0, row.c.requested - n), reference_unmatched: Math.max(0, reference.c.outcomes.length - n),
        candidate_unmatched: Math.max(0, row.c.outcomes.length - n), variant_mismatches: mismatch,
        status: complete && n > 1 ? "produced" : "unknown",
        reason: complete && n > 1 ? null : "insufficient_complete_paired_coverage_or_unknown_joint",
        delta_joint_raw: complete && n > 1 ? mean : null, mc_se: complete && n > 1 ? se : null,
        delta_joint_vector: differences, interval_scope: "frozen_simulation_MC_error_only; not_production_calibration" } };
    });
    return { ...header, status: records.every((r) => r.status === "produced" && r.paired_comparison.status === "produced") ? "produced" : "unknown",
      input_sha256: inputHash, variant_distribution_sha256: digest(input.continuation.variants.map((v) => ({ boss: v.boss, count: v.count }))),
      source: input.continuation.source, limitations: input.continuation.limitation, candidates: records, failure: null };
  } catch {
    return { ...header, status: "unknown", reason: "shadow_aggregation_failed", candidates: [], continuous: null, paired_comparison: null };
  }
}

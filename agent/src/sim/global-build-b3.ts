import { currentDecisionBudget, shadowBudgetAvailable, DecisionBudgetExpired } from "../core/decision-budget.js";
/** Silent's supplementary G2 shadow path never changes the current B3 question or its completion gate. */
import { globalBuildPolicy } from "../core/global-build-config.js";
import { asRecord, str, toJsonValue, type JsonValue } from "../core/util/json.js";
import type { DecisionEnv } from "../memory/types.js";
import type { MonsterDb } from "../knowledge/monster-db.js";
import type { MoveModelData, RolloutInput } from "../reflex/rollout.js";
import { mapActOf } from "../hand/screens/route-plan.js";
import { BUILD_SIM_CALIBRATION_SAMPLES, BUILD_SIM_SAMPLES, BUILD_SIM_SEED, compareOptions, type CompareResult, type DeckOption } from "./build-sim.js";
import type { DeckSimRunner } from "./build-sim-pool.js";
import { bossTrustReason } from "./boss-trust.js";
import { bossKey } from "./boss-start.js";
import { calibratedWinProb } from "./boss-sim.js";
import { BOSS_LINES_TIE_SE } from "./boss-lines.js";
import { simAdaptivePolicy } from "../core/config.js";
import { observeGlobalBuild, type GlobalBuildMemory } from "./global-build-observer.js";
import type { GlobalBossPool } from "./global-build-pool.js";
import type { GlobalBossTarget } from "./global-build.js";

export function globalBuildFailure(env: DecisionEnv, required: boolean, reason: string): JsonValue | null {
  if (!required || globalBuildPolicy(str(asRecord(env.state.run?.raw)["character_id"])).mode === "off") return null;
  return { schema: "global-build-v1", mode: "shadow", delivered: false, status: "unknown", primary: "paired_win_probability",
    s_sort: false, reason, final_sequence: { status: "unknown", reason: "G1a_natural_consumer_pending" } };
}

export async function globalBuildForB3(args: {
  env: DecisionEnv; required: boolean; degraded: boolean; label: string; bossId: string;
  input: RolloutInput; options: DeckOption[]; keys: string[]; current: CompareResult;
  setup: { runner: DeckSimRunner; samples?: number; seed?: number; now?: () => number;
    db?: MonsterDb; mm?: MoveModelData; globalPool?: GlobalBossPool };
  progress?: import("./computation-wait.js").SimProgress;
  makeComparison: (target: GlobalBossTarget) => { input: RolloutInput; options: DeckOption[] };
}): Promise<JsonValue | null> {
  const { env, setup } = args;
  const policy = globalBuildPolicy(str(asRecord(env.state.run?.raw)["character_id"]));
  if (!args.required || policy.mode === "off") return null;
  const adaptiveMode = simAdaptivePolicy("silent").mode;
  const ascension = env.state.run?.ascension ?? 0;
  try {
    const observed = await observeGlobalBuild({ runner: setup.runner, memory: env.screenMemory as GlobalBuildMemory,
      runId: str(env.state.raw["run_id"]), floor: env.state.run?.floor ?? null, label: args.label, ascension,
      currentAct: mapActOf(env.state), currentBoss: bossKey(args.bossId), input: args.input,
      options: args.options, keys: args.keys, current: args.current,
      sampling: { requested: setup.samples ?? BUILD_SIM_SAMPLES, seed: setup.seed ?? BUILD_SIM_SEED, adaptiveMode },
      visible: new Map([[mapActOf(env.state), bossKey(args.bossId)]]),
      trustReason: (boss, act) => bossTrustReason(boss, "b3", ascension, act === mapActOf(env.state) ? env.state.run?.floor : undefined),
      ...(setup.globalPool ? { pool: setup.globalPool } : {}), ...(setup.now ? { now: setup.now } : {}),
      ...(args.degraded ? { unavailableReason: "current_C1_degraded_global_not_requested" }
        : (setup.db || setup.mm) && !setup.globalPool ? { unavailableReason: "custom_inputs_need_matching_observed_silent_pool" } : {}),
      evaluate: async (target, runner) => {
        if (!shadowBudgetAvailable("G2_global_shadow")) throw new DecisionBudgetExpired("G2_global_shadow");
        const next = args.makeComparison(target);
        const result = await compareOptions(runner, next.input, next.options, {
          samples: setup.samples ?? BUILD_SIM_SAMPLES, seed: setup.seed ?? BUILD_SIM_SEED,
          quantitative: true, diagnostics: true, requireComplete: true,
          ...(currentDecisionBudget() ? { deadlineMs: Math.max(0, currentDecisionBudget()!.remaining() - 1000) } : {}),
          ...(setup.now ? { now: setup.now } : {}), ...(args.progress ? { onProgress: args.progress } : {}),
          // Only the new future-Boss lane is win-only; current B3's existing C2 policy is untouched.
          ...(adaptiveMode !== "off" ? { adaptive: { mode: adaptiveMode, allowS: false } } : {}),
          // This table supplies paired S diagnostics only. G2 never consumes its ordering.
          buildRank: { sSort: "shadow", lowTrust: bossTrustReason(target.boss, "b3", ascension),
            calibratedFloor: Math.round(calibratedWinProb(0, BUILD_SIM_CALIBRATION_SAMPLES, "pre", ascension) * 100) / 100,
            tieSe: BOSS_LINES_TIE_SE },
        });
        if ([result.base, ...result.options].some((value) => {
          const dpr = asRecord(asRecord(value.quantitative)["effective_damage_per_turn"]);
          return typeof dpr["n"] !== "number" || dpr["n"] <= 0 || typeof dpr["mean"] !== "number" || !Number.isFinite(dpr["mean"]);
        })) throw new Error("global_required_paired_DPR_missing");
        return result;
      },
    });
    return toJsonValue({ ...observed, requested_mode: policy.requested, admission: policy.admission,
      future_entry_basis: "fixed_current_HP_deck_resources; future_route_rewards_and_actual_entry_unknown" });
  } catch (error) {
    // A supplementary observer failure cannot suppress a completed original B3 result.
    return { schema: "global-build-v1", mode: "shadow", delivered: false, status: "unknown", primary: "paired_win_probability",
      s_sort: false, reason: `global_observer_failed:${String(error instanceof Error ? error.message : error).slice(0, 300)}`,
      final_sequence: { status: "unknown", reason: "G1a_natural_consumer_pending" } };
  }
}

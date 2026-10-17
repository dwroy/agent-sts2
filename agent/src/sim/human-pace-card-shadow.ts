/** Five-second card facts and a separate one-second Jev observation. No dispatch capability. */
import { DecisionBudget, withDecisionBudget, withinDecisionBudget } from "../core/decision-budget.js";
import { asArray, asRecord, str, type JsonValue } from "../core/util/json.js";
import { constructionOptions, constructionState } from "../construction/adapter.js";
import type { CoreTemplate, BuildState } from "../construction/types.js";
import { missingRequirements } from "../construction/planner.js";
import type { AskDecision, DecisionEnv } from "../memory/types.js";
import type { RunPlan } from "../memory/run-plan.js";
import type { JevClient } from "../reflex/jev/client.js";
import { choiceQ, type QuestionSet } from "../reflex/jev/questions.js";
import { compareOptions, BUILD_SIM_SEED, BUILD_SIM_SAMPLES } from "./build-sim.js";
import type { BuildSimSetup } from "./build-sim-facts.js";
import { globalBossTargets, type GlobalBossTarget } from "./global-build.js";
import type { GlobalBossPool } from "./global-build-pool.js";
import { bossTrustReason } from "./boss-trust.js";
import { directionStart, humanPaceShadowRunner, validDirectionInventory } from "./human-pace-comparison.js";
import { simAdaptivePolicy } from "../core/config.js";
import { BOSS_LINES_TIE_SE } from "./boss-lines.js";
import { createHash } from "node:crypto";
import { rankShadowCards, shadowPlanCoverage } from "./human-pace-card-policy.js";
import { shadowCardList } from "./human-pace-plan-shadow.js";

export interface CardShadowInput {
  options: { key: string; id: string | null; state: BuildState | null }[]; current: BuildState; priorPlan: RunPlan | null;
}
export function captureCardShadow(decision: AskDecision, env: DecisionEnv): CardShadowInput {
  const current = constructionState(env), offers = asArray(asRecord(env.state.raw["reward"])["card_options"]).map(asRecord);
  const listed = decision.deepseek?.options?.() ?? [];
  return { current, priorPlan: env.screenMemory.runPlan?.runId === str(env.state.raw["run_id"]) ? structuredClone(env.screenMemory.runPlan) : null,
    options: constructionOptions(decision, env, current).map((option) => {
    const intent = listed.find((row) => row.key === option.key)?.intent;
    const card = intent?.action === "choose_reward_card" ? offers.find((row, i) => (row["index"] ?? i) === intent.option_index) : undefined;
    return { ...option, id: card ? str(card["card_id"]) : null };
  }) };
}
export interface ShadowDifference { mean: number; se: number }
export interface CardTargetPrediction {
  target: GlobalBossTarget; rows: { key: string; delta_win: ShadowDifference | null; delta_s: ShadowDifference | null;
    samples: number | null; unknown: string | null; model_limits?: string[] }[]; source: "same_question_G2_cache" | "budgeted_B3" | "unknown";
}
function delta(value: unknown): ShadowDifference | null {
  const raw = asRecord(value), mean = raw["mean"], se = raw["se"] ?? raw["meanSe"];
  return typeof mean === "number" && Number.isFinite(mean) && typeof se === "number" && Number.isFinite(se) && se >= 0 ? { mean, se } : null;
}
function unknownTarget(target: GlobalBossTarget, keys: readonly string[], reason: string): CardTargetPrediction {
  return { target, source: "unknown", rows: keys.map((key) => ({ key, delta_win: null, delta_s: null, samples: null, unknown: reason })) };
}
function aggregate(targets: readonly CardTargetPrediction[], key: string, metric: "delta_win" | "delta_s") {
  const rows = targets.map((target) => ({ weight: target.target.frequency, row: target.rows.find((row) => row.key === key) }));
  if (!rows.length || Math.abs(rows.reduce((sum, row) => sum + row.weight, 0) - 1) > 1e-9
    || rows.some(({ row }) => !row || row.unknown || !row[metric])) return null;
  // The same seeds can correlate Boss estimates. This is an upper bound, not independent errors in quadrature.
  return { mean: rows.reduce((sum, { row, weight }) => sum + weight * row![metric]!.mean, 0),
    se: rows.reduce((sum, { row, weight }) => sum + Math.abs(weight) * row![metric]!.se, 0),
    model_limits: [...new Set(rows.flatMap(({ row }) => row?.model_limits ?? []))],
    error_scope: "conservative_MC_standard_error_bound_excludes_model_error" };
}

export async function evaluateCardShadow(args: {
  input: CardShadowInput; env: DecisionEnv; cores: readonly CoreTemplate[]; plan: RunPlan | null;
  pool: GlobalBossPool; originalB3: unknown; setup: BuildSimSetup | null; now?: () => number;
}) {
  const { input, env } = args, keys = input.options.map((row) => row.key), ascension = env.state.run?.ascension ?? 0;
  const budget = new DecisionBudget("H2_card", "routine", args.now, 5000);
  return withDecisionBudget(budget, async () => {
    const targets = globalBossTargets(args.pool, 2, new Map(), (boss) => bossTrustReason(boss, "b3", ascension)).map((target) =>
      args.pool.character !== "silent" || args.pool.ascension !== ascension ? { ...target, unknown: "observed_pool_role_or_ascension_mismatch" } : target);
    const predictions: CardTargetPrediction[] = [];
    const b3 = asRecord(args.originalB3), cached = asArray(asRecord(b3["global_build"])["targets"]).map(asRecord);
    for (const target of targets) {
      if (target.unknown) { predictions.push(unknownTarget(target, keys, target.unknown)); continue; }
      const existing = cached.find((row) => asRecord(row["target"])["boss"] === target.boss && asRecord(row["target"])["act"] === target.act);
      const cachedRows = asArray(existing?.["rows"]).map(asRecord);
      if (existing && ["computed", "reused_current", "budgeted_partial"].includes(str(existing["status"]))
        && keys.every((key) => cachedRows.some((row) => row["key"] === key))) {
        predictions.push({ target, source: "same_question_G2_cache", rows: keys.map((key) => {
          const row = cachedRows.find((row) => row["key"] === key)!;
          const validResources = validDirectionInventory(input.current) && validDirectionInventory(input.options.find((option) => option.key === key)?.state ?? null);
          const sufficient = validResources && typeof row["samples"] === "number" && row["samples"] >= 2 && delta(row["delta_win"]) !== null;
          return { key, delta_win: sufficient ? delta(row["delta_win"]) : null, delta_s: sufficient ? delta(row["delta_s"]) : null,
            samples: typeof row["samples"] === "number" ? row["samples"] : null,
            unknown: !validResources ? "option_resource_contract_unknown" : typeof row["unknown"] === "string" ? row["unknown"] : sufficient ? null : "paired_delta_or_samples_missing" };
        }) }); continue;
      }
      if (!args.setup || budget.remaining() <= 1000 || !validDirectionInventory(input.current) || input.options.some((row) => !validDirectionInventory(row.state))) {
        predictions.push(unknownTarget(target, keys, !validDirectionInventory(input.current) || input.options.some((row) => !validDirectionInventory(row.state))
          ? "option_resource_contract_unknown" : !args.setup ? "shared_runner_unavailable" : "card_budget_exhausted")); continue;
      }
      try {
        const setup = args.setup;
        const modelLimits: string[] = [];
        const result = await withinDecisionBudget("H2_card_comparison", async () => {
          const base = directionStart(env, input.current, target, setup, modelLimits);
          const options = input.options.map((row) => ({ key: row.key, change: directionStart(env, row.state!, target, setup, modelLimits) }));
          const mode = simAdaptivePolicy("silent").mode;
          return compareOptions(humanPaceShadowRunner(setup.runner), base, options, { samples: setup.samples ?? BUILD_SIM_SAMPLES,
            seed: setup.seed ?? BUILD_SIM_SEED, deadlineMs: Math.max(0, budget.remaining() - 1000), requireComplete: true, quantitative: true,
            ...(mode !== "off" ? { adaptive: { mode, allowS: false } } : {}), ...(setup.now ? { now: setup.now } : {}) });
        });
        predictions.push({ target, source: "budgeted_B3", rows: keys.map((key) => {
          const row = result.options.find((row) => row.key === key), margin = asRecord(asRecord(row?.quantitative)["boss_relative_margin"]);
          const difference = asRecord(asRecord(margin["paired"])["difference"]);
          return { key, delta_win: row?.samples && row.samples >= 2 && row.diff ? { mean: row.diff.raw, se: row.diff.se } : null,
            delta_s: !modelLimits.length && margin["rankingEligible"] === true ? delta(difference) : null, samples: row?.samples ?? null,
            model_limits: [...new Set(modelLimits)],
            unknown: result.timedOut ? "budgeted_model_prefix" : !row || row.samples < 2 ? "no_paired_model_samples" : null };
        }) });
      } catch (error) { predictions.push(unknownTarget(target, keys, `card_computation_unknown:${String(error instanceof Error ? error.message : error).slice(0, 140)}`)); }
    }
    budget.pause();
    const primary = args.plan?.construction?.primary ?? "uncommitted", currentCore = args.cores.find((core) => core.id === primary);
    const belongs = (core: CoreTemplate, id: string) => core.requirements.some((r) => r.any.some((c) => c.kind === "card" && c.id === id));
    const planReferences = shadowCardList([...(args.plan?.want ?? []), ...(args.plan?.avoid ?? [])], env.knowledge);
    const nextOptions = asRecord(b3["options"]), degraded = ["pending", "degraded"].includes(str(asRecord(b3["completion"])["status"]));
    const rows = input.options.map((option) => {
      const matching = option.id ? args.cores.filter((core) => belongs(core, option.id!)).map((core) => core.id) : [];
      const next = asRecord(nextOptions[option.key]), n = next["samples"] ?? b3["samples"];
      const resourcesKnown = validDirectionInventory(input.current) && validDirectionInventory(option.state);
      const nextDelta = resourcesKnown && !degraded && typeof n === "number" && n >= 2 ? delta({ mean: next["diff_raw"], se: next["se_raw"] }) : null;
      const targetDelta = aggregate(predictions.filter((row) => row.target.act === 2), option.key, "delta_win");
      const targetS = aggregate(predictions.filter((row) => row.target.act === 2), option.key, "delta_s");
      const covered = option.id === null || !!args.plan && (planReferences.some((ref) => ref.card_id === option.id)
        || !!currentCore && belongs(currentCore, option.id));
      const coverage = shadowPlanCoverage(primary, !!args.plan, covered);
      return { key: option.key, card: option.id, core_component: option.id === null ? false : currentCore ? belongs(currentCore, option.id) : null,
        support_component: null, support_reason: "learner_templates_have_no_separate_support_mapping", template_membership: matching,
        target_delta_win: targetDelta, target_delta_S: targetS, next_boss_delta_win: nextDelta,
        next_boss_trust: bossTrustReason(str(b3["boss"]), "b3", ascension),
        dilution: { deck_before: input.current.cards.length, deck_after: option.state?.cards.length ?? null,
          added_slot_fraction: !resourcesKnown ? null : option.state!.cards.length > input.current.cards.length ? (option.state!.cards.length - input.current.cards.length) / option.state!.cards.length : 0,
          functional_draw_or_damage_effect: "unknown" },
        wake: { uncovered_by_plan: coverage.uncovered, plan_status: coverage.status,
          initial_direction_needed: coverage.initial_direction_needed,
          another_core_component: matching.filter((id) => id !== primary),
          possible_direction_change: coverage.status === "committed" && option.id && matching.some((id) => id !== primary) && targetDelta
            ? targetDelta.mean > BOSS_LINES_TIE_SE * targetDelta.se : null,
          limits: "只记录反事实叫醒条件；目标差的MC显著性不证明另一方向整体更优。" } };
    });
    const ranking = rankShadowCards(rows, primary);
    return { schema: "human-pace-card-facts-v1", mode: "shadow", delivered: false, primary, missing: currentCore
      ? missingRequirements(input.current, currentCore) : [],
      prior_plan_sha256: createHash("sha256").update(JSON.stringify(input.priorPlan)).digest("hex"),
      module_first: ranking.first, module_first_basis: ranking.basis, module_first_confidence: ranking.confidence,
      module_order: ranking.ordered, defer_to_brain: ranking.first === null,
      plan_preferences: { take: shadowCardList(args.plan?.want ?? [], env.knowledge), avoid: shadowCardList(args.plan?.avoid ?? [], env.knowledge) },
      plan_status: shadowPlanCoverage(primary, !!args.plan, false).status,
      initial_direction_needed: primary === "uncommitted" || !args.plan,
      rows, predictions, budget_ms: 5000, time_budget: budget.record(), target_basis: "Act2_until_H0_H3_admission; Act3_and_joint_unknown",
      limits: "反事实只读；目标组按本角色观察记录加权（含重试），非生成概率。S不参与排序；组件标签仅沿学习者模板，支撑件定义未给则unknown。新增槽比例不是实际抽牌/稀释因果。候选差只对当前完整资源快照有效，不预测实际整局结果。" };
  });
}

export async function askCardShadow(facts: Awaited<ReturnType<typeof evaluateCardShadow>>, jev: Pick<JevClient, "ask"> | null,
  actual: string | null, now = () => performance.now()) {
  const started = now(), budget = new DecisionBudget("H2_jev_card", "routine", now, 1000);
  const state = { direction: facts.primary, missing: facts.missing, facts: facts.rows.map((row) => ({
    key: row.key, card: row.card, core: row.core_component, support: row.support_component,
    template_membership: row.template_membership,
    target_win_delta: row.target_delta_win, target_S_delta_record_only: row.target_delta_S,
    next_boss_win_delta: row.next_boss_delta_win, next_boss_trust: row.next_boss_trust ? "low_trust" : "table_pass_only_production_trust_unknown", dilution: row.dilution })),
    ranking: { first: facts.module_first, basis: facts.module_first_basis, confidence: facts.module_first_confidence },
    prior_plan_preferences: facts.plan_preferences,
    plan_status: facts.plan_status,
    unknown: "Unknown is missing evidence, never zero. A null card ID is the skip option. A null module first means defer to the brain, not skip. An uncommitted direction is not a preference for skipping.",
    limits: "Raw simulation and MC errors exclude model error. S is diagnostic only; do not rank by S." };
  const questions: QuestionSet = { card: choiceQ("Choose one offered card or skip for the stated direction. Use only supplied facts; do not calculate or infer missing scores. This is shadow: the brain still makes the real choice.",
    Object.fromEntries(facts.rows.map((row) => [row.key, row.card ?? "Skip: add no card."]))) };
  let choice = facts.module_first, failure: string | null = jev ? null : "Jev_unavailable", meta: JsonValue | null = null;
  await withDecisionBudget(budget, async () => {
    if (!jev) return;
    try {
      const response = await withinDecisionBudget("H2_Jev_shadow", () => jev.ask(state, questions, 1000));
      const answer = response.answers["card"];
      if (answer?.type !== "choice" || !facts.rows.some((row) => row.key === answer.choice)) throw new Error("invalid_or_unoffered_shadow_choice");
      choice = answer.choice;
      meta = { model: response.model, request_id: response.requestId, input_tokens: response.inputTokens, output_tokens: response.outputTokens };
    } catch (error) { failure = String(error instanceof Error ? error.message : error).slice(0, 180); }
  });
  budget.pause();
  return { schema: "human-pace-jev-card-shadow-v1", mode: "shadow", delivered: false, state, questions,
    module_first: facts.module_first, actual_brain_choice: actual, jev_choice: choice, fallback: failure,
    agreement: actual === null || choice === null ? null : actual === choice,
    module_agreement: actual === null || facts.module_first === null ? null : actual === facts.module_first,
    latency_ms: Math.max(0, Math.round(now() - started)), budget_ms: 1000, time_budget: budget.record(), meta };
}

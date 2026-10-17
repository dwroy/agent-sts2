/** Private H2 sidecar. Never enters ScreenMemory, model prompts, ranking or dispatch. */
import { mkdirSync } from "node:fs";
import { appendJsonLine } from "../core/util/jsonl.js";
import { dirname, join } from "node:path";
import { humanPaceH2Policy } from "../core/human-pace-shadow-config.js";
import { asRecord, str } from "../core/util/json.js";
import { loadConstructionData } from "../construction/data.js";
import { constructionState } from "../construction/adapter.js";
import type { Decision, DecisionEnv } from "../memory/types.js";
import { actOf, hpFraction, RUN_PLAN_HP_DROP, RUN_PLAN_LOW_HP, RUN_PLAN_REVIEW_FLOORS, type RunPlan } from "../memory/run-plan.js";
import type { DecisionRecord } from "../eye/decision-log.js";
import type { BuildSimSetup } from "./build-sim-facts.js";
import { evaluateDirections } from "./human-pace-direction.js";
import { compareDirection, compareDirectionBatch } from "./human-pace-comparison.js";
import { loadGlobalBossPool } from "./global-build-pool.js";
import type { GlobalBossPool } from "./global-build-pool.js";
import { bossTrustReason } from "./boss-trust.js";
import { globalBossTargets } from "./global-build.js";
import { askCardShadow, captureCardShadow, evaluateCardShadow, type CardShadowInput } from "./human-pace-card-shadow.js";
import type { JevClient } from "../reflex/jev/client.js";

export function structuredActPlan(plan: RunPlan) {
  return { schema: "human-pace-act-plan-v1", source: "existing_accepted_brain_run_plan", delivered: false,
    run: plan.runId, act: plan.act, floor: plan.floor, trigger: plan.trigger,
    direction: plan.construction?.primary ?? "uncommitted", archetype: plan.archetype,
    alternatives: plan.construction?.alternatives ?? null,
    take_priority: [...plan.want], avoid: [...plan.avoid], remove: [...plan.remove],
    rest_and_upgrade: plan.rest, route_preference: { elites: plan.elites }, boss_preparation: plan.bossPrep,
    wake: { checkpoint: plan.construction?.checkpoint ?? null, pivot_if: plan.construction?.pivot_if ?? null },
    reason: plan.construction?.reason ?? null, summary: plan.summary,
    limits: "既有大脑已接受计划的只读投影；缺少结构化方向/叫醒条件时unknown。不新增提示或调用，不冒称大脑已经读取H2分数。" };
}

export class HumanPaceShadow {
  readonly path: string;
  private planKey = "";
  private checkpoint: { run: string; act: number; floor: number; hp: number } | null = null;
  private previous: Awaited<ReturnType<typeof evaluateDirections>> | null = null;
  constructor(decisionLog: string, private readonly write?: (row: unknown) => void) {
    this.path = join(dirname(decisionLog), "human-pace-shadow.jsonl");
    this.disabled = decisionLog === "off";
  }
  private readonly disabled: boolean;
  private enabled(env: DecisionEnv): boolean {
    return !this.disabled && humanPaceH2Policy(str(asRecord(env.state.run?.raw)["character_id"])).mode === "shadow";
  }
  private append(row: unknown): void {
    try {
      if (this.write) this.write(row);
      else { mkdirSync(dirname(this.path), { recursive: true }); appendJsonLine(this.path, row); }
    } catch { /* An observer/log failure must never reject a real decision. */ }
  }
  capture(decision: Decision, env: DecisionEnv): CardShadowInput | null {
    if (!this.enabled(env) || decision.kind !== "ask" || decision.label !== "reward/card") return null;
    try { return captureCardShadow(decision, env); } catch { return null; }
  }
  async observe(env: DecisionEnv, record: DecisionRecord, plan: RunPlan | null | undefined,
    input: CardShadowInput | null, setup: BuildSimSetup | null | undefined, jev: Pick<JevClient, "ask"> | null): Promise<void> {
    if (!this.enabled(env)) return;
    const run = str(env.state.raw["run_id"]), act = actOf(env.state), floor = env.state.run?.floor;
    if (!run || floor == null || floor < 1) return;
    const base = { ts: record.ts, run, act, floor, decision_id: record.decision_id ?? null, fingerprint: record.fingerprint,
      schema: "human-pace-h2-shadow-v1", mode: "shadow", delivered: false, actual_decision_unchanged: true };
    try {
      if (this.checkpoint?.run !== run) { this.previous = null; this.checkpoint = null; this.planKey = ""; }
      const accepted = plan?.runId === run ? plan : null;
      const planKey = accepted ? JSON.stringify(accepted) : "";
      if (accepted && planKey !== this.planKey) { this.append({ ...base, act_plan: structuredActPlan(accepted) }); this.planKey = planKey; }
      const data = loadConstructionData("silent"), ascension = env.state.run?.ascension ?? 0;
      const cores = data?.templates.filter((core) => core.ascensions.includes(ascension)) ?? [];
      let pool: GlobalBossPool;
      try { pool = setup?.globalPool ?? loadGlobalBossPool(ascension); }
      catch { pool = { character: "silent", ascension, stages: [], unknown: [{ boss: "unknown", reason: "observed_pool_unavailable" }],
        source: { path: "unavailable", sha256: "unknown", generated: null }, unit: "observed_fight_records_including_retries" }; }
      if (input?.options.length) {
        const facts = await evaluateCardShadow({ input, env, cores, plan: input.priorPlan, pool, originalB3: record.boss_sim,
          setup: (setup?.db || setup?.mm) && !setup.globalPool ? null : setup ?? null });
        const intent = asRecord(record.chosen);
        const key = intent["action"] === "skip_reward_cards" ? "skip" : intent["action"] === "choose_reward_card" ? `card${intent["option_index"]}` : null;
        const actual = input.options.some((row) => row.key === key) ? key : null;
        const judgment = await askCardShadow(facts, jev, actual);
        this.append({ ...base, actual_decider: record.decider ?? null, card_facts: facts, jev_shadow: judgment });
      } else if (record.label === "reward/card") {
        this.append({ ...base, card_facts: { status: "unknown", reason: "offered_candidate_capture_unavailable" } });
      }
      // Combat entries are not direction checkpoints, even when a pending plan update is old.
      if (env.state.in_combat) return;
      const last = this.checkpoint, hp = hpFraction(env.state);
      const reason = !last ? "start" : act !== last.act ? "act" : last.hp - hp >= RUN_PLAN_HP_DROP
        || hp < RUN_PLAN_LOW_HP && last.hp >= RUN_PLAN_LOW_HP ? "hp_drop" : floor - last.floor >= RUN_PLAN_REVIEW_FLOORS
        || accepted?.construction && floor > last.floor && floor >= accepted.construction.checkpoint ? "review" : null;
      if (!reason) return;
      this.checkpoint = { run, act, floor, hp };
      const targets = globalBossTargets(pool, 2, new Map(), (boss) => bossTrustReason(boss, "b3", ascension));
      if (!data || !setup || (setup.db || setup.mm) && !setup.globalPool) {
        this.append({ ...base, direction: { status: "unknown", reason: !data ? "learner_templates_unavailable" : "matching_shared_runner_or_pool_unavailable",
          checkpoint: reason, previous: this.previous ? { stale: true, result: this.previous } : null } }); return;
      }
      const initial = constructionState(env);
      const result = await evaluateDirections({ state: initial, cores, ascension, pool, targets,
        evaluate: (target, variant, budget) => compareDirection(env, initial, target, variant, budget, setup),
        evaluateBatch: (target, variants, budget, cap) => compareDirectionBatch(env, initial, target, variants, budget, cap, setup) });
      const expired = result.time_budget.timed_out || result.predictions.some((row) => row.result.status === "partial" || row.result.reason?.includes("budget_exhausted"));
      this.append({ ...base, direction: { ...result, checkpoint: reason, data_signature: data.signature,
        target_basis: "Act2_fixed_snapshot_benchmark_until_H0_H3; Act3_and_joint_unknown",
        previous: expired && this.previous ? { stale: true, result: this.previous } : null } });
      if (!expired) this.previous = result;
    } catch (error) {
      this.append({ ...base, status: "unknown", reason: `H2_observer_failed:${String(error instanceof Error ? error.message : error).slice(0, 200)}` });
    }
  }
}

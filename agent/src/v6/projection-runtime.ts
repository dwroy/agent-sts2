import type { DecisionEnv } from "../memory/types.js";
import { SerialDeckRunner, type DeckSimRunner } from "../sim/build-sim-pool.js";
import { V6ProjectionEngine, type V6ProjectionRequest, type V6ProjectionTable } from "../sim/v6-projection.js";
import { V6IdlePrecomputer } from "../sim/v6-precompute.js";
import { v6Config } from "./config.js";
import { v6ProjectionInputs, type V6ProjectionInput } from "./projection-input.js";
import { currentDecisionBudget, withIndependentDecisionBudget, withDecisionBudget, DecisionBudget } from "../core/decision-budget.js";
import { dirname, join } from "node:path";
import { v6ProjectionLog } from "../sim/v6-projection-log.js";
import { V6BuildLog } from "./log.js";
import { PROJECT_ROOT } from "../core/paths.js";
import { appendJsonLine } from "../core/util/jsonl.js";
import { mkdirSync } from "node:fs";
import { str } from "../core/util/json.js";
import { characterSchema } from "./formats.js";
import { validate } from "./schema.js";
import { v6Digest } from "../sim/v6-completion.js";
import { V6CardResultsEngine, coreProgress, type V6CardResults, type CardResultsContext,
  type CoreCombatRow, type CoreProgress, type CardCombatTarget } from "../sim/v6-card-results.js";
import { cardResultsContext } from "./card-results-input.js";
import { postCombatCardReward } from "./card-reward-scope.js";

export interface V6ProjectionEvaluationContext { budget_ms: number; signal: AbortSignal }
export interface V6CompletedCoreSnapshot {
  long_term: CoreCombatRow[]; progress: CoreProgress[]; targets: CardCombatTarget[]; unknown_reasons: string[];
}
export interface V6CoreCacheEvent {
  fingerprint: string | null; elapsed_ms: number; preparation_ms: number; allowance_ms: number; aborted: boolean;
  rows: number; sampled_rows: number; unknown_reasons: Record<string, number>; error?: string;
}
/** Only live facts are hashed here. Published knowledge/models belong to the immutable run factory. */
function coreEnvironmentFingerprint(env: DecisionEnv): string {
  const route = env.screenMemory.routePlan, plan = env.screenMemory.runPlan;
  return v6Digest([env.state.raw.run_id, env.state.run?.raw, env.state.run?.current_hp, env.state.run?.max_hp,
    env.state.run?.floor, env.state.run?.ascension, env.state.raw.map,
    route && [route.runId, route.act, route.path], plan?.v6?.ideal_overrides, env.knowledge.catalog]);
}

/** The provider owns frozen evidence/model versions; this boundary owns live scheduling only. */
export class V6ProjectionRuntime {
  private idle: V6IdlePrecomputer;
  private pending: Promise<V6ProjectionTable | null> | null = null;
  private cardPending: Promise<void> | null = null;
  private cardAbort: AbortController | null = null;
  private coreSnapshot: { guard: string; knowledge: DecisionEnv["knowledge"]; fingerprint: string;
    progress: CoreProgress[]; targets: CardCombatTarget[]; expected_rows: number } | null = null;
  private nextIdleCard = true;
  constructor(private engine: Pick<V6ProjectionEngine, "evaluate" | "precompute">,
    private request: (env: DecisionEnv, phase: "act" | "pick") => Promise<V6ProjectionRequest | null>,
    private record: (env: DecisionEnv, request: V6ProjectionRequest, table: V6ProjectionTable) => void = () => {},
    private input?: (env: DecisionEnv, phase: "act" | "pick", idleCombat?: boolean) => Promise<V6ProjectionInput | null>,
    private card?: { engine: V6CardResultsEngine; context: typeof cardResultsContext;
      record: (env: DecisionEnv, table: V6CardResults) => void;
      recordBackground?: (env: DecisionEnv, event: V6CoreCacheEvent) => void }) { this.idle = new V6IdlePrecomputer(engine); }
  private async cardRequest(env: DecisionEnv, idleCombat = false): Promise<{ request: V6ProjectionRequest; context: CardResultsContext } | null> {
    const guard = coreEnvironmentFingerprint(env), knowledge = env.knowledge;
    this.coreSnapshot = null;
    const input = await this.input?.(env, "pick", idleCombat); if (!input || !this.card) return null;
    const result = input.factory.create(input.situation); if (result.status !== "ready") return null;
    const request = result.request, context = this.card.context(env, input, request);
    const targets = request.targets.filter(t => t.kind !== "current");
    this.coreSnapshot = { guard, knowledge, fingerprint: context.fingerprint, progress: coreProgress(request),
      targets: structuredClone(targets), expected_rows: request.directions.reduce((n, d) => n + d.combos.length, 0) * targets.length };
    return { request, context };
  }
  /** Pure lookup for existing brain questions. Misses never start background or foreground work. */
  peekCompletedCore(env: DecisionEnv): V6CompletedCoreSnapshot | null {
    const snapshot = this.coreSnapshot;
    if (v6Config().mode === "off" || !this.card || !snapshot || snapshot.knowledge !== env.knowledge
      || snapshot.guard !== coreEnvironmentFingerprint(env)) return null;
    const rows = this.card.engine.peekCompletedCore(snapshot.fingerprint); if (!rows) return null;
    return { long_term: rows, progress: structuredClone(snapshot.progress), targets: structuredClone(snapshot.targets),
      unknown_reasons: [...new Set([...rows.flatMap(row => row.unknown_reasons),
        ...snapshot.targets.flatMap(t => t.unknown ? [t.unknown] : []),
        ...(rows.length < snapshot.expected_rows ? ["completed_core_targets_incomplete"] : [])])] };
  }
  /** Reward A is the only foreground simulation; completed cores are read from B's cache. */
  async evaluateCard(env: DecisionEnv): Promise<V6CardResults | null> {
    const config = v6Config();
    if (!this.card || config.mode === "off" || config.deciders.card !== "jev" || env.v6BrainFallback
      || !postCombatCardReward(env.screenMemory, env.state)) return null;
    this.idle.invalidate();
    this.cardAbort?.abort();
    if (this.cardPending) await this.cardPending.catch(() => undefined);
    const release = await this.idle.acquireForeground();
    try {
      return await withIndependentDecisionBudget("V6_card_results", "direction", config.budgets.pick_ms, "L2", async () => {
        const started = performance.now(), input = await this.cardRequest(env); if (!input) return null;
        const preparation = performance.now() - started;
        // Reserve bounded prompt packing/audit time inside the five-second data-preparation goal.
        const table = await this.card!.engine.evaluate(input.request, input.context, Math.max(0, config.budgets.pick_ms - 750 - (performance.now() - started)));
        table.telemetry.elapsed_ms = performance.now() - started;
        table.telemetry.preparation_ms += preparation;
        this.card!.record(env, table); return table;
      });
    } finally { release(); }
  }
  /** W7 can replace situation.options while keeping this loop's frozen factory and actual route. */
  async context(env: DecisionEnv, phase: "act" | "pick"): Promise<V6ProjectionInput | null> {
    if (v6Config().mode === "off" || env.state.in_combat) return null;
    return this.input ? this.input(env, phase) : null;
  }
  async evaluate(env: DecisionEnv, phase: "act" | "pick"): Promise<V6ProjectionTable | null> {
    return this.foreground(env, () => this.request(env, phase));
  }
  /** All constructed requests share the idle lease, engine/pool and independent compute budget. */
  async evaluateRequest(env: DecisionEnv, request: V6ProjectionRequest, context?: V6ProjectionEvaluationContext): Promise<V6ProjectionTable | null> {
    return this.foreground(env, async () => request, context);
  }
  private async foreground(env: DecisionEnv, request: () => Promise<V6ProjectionRequest | null>,
    context?: V6ProjectionEvaluationContext): Promise<V6ProjectionTable | null> {
    if (v6Config().mode === "off" || env.state.in_combat) return null;
    const budget = currentDecisionBudget(), now = budget?.now ?? (() => performance.now()), started = now();
    const remaining = () => context ? Math.max(0, Math.min(context.budget_ms - (now() - started), budget?.remaining() ?? Infinity)) : Infinity;
    const expired = () => context && (context.signal.aborted || !Number.isFinite(remaining()) || remaining() <= 0);
    if (expired()) return null;
    this.idle.invalidate();
    this.cardAbort?.abort();
    if (this.cardPending) await this.cardPending.catch(() => undefined);
    // External room requests already own their allowance; waiting must not replenish it.
    const release = await this.idle.acquireForeground();
    try {
      if (expired()) return null;
      const r = await request();
      if (!r || r.config.mode === "off" || expired()) return null;
      const milliseconds = Math.min(remaining(), r.phase === "act" ? r.config.budgets.act_ms : r.config.budgets.pick_ms);
      const bounded = context ? { ...r, config: { ...r.config, budgets: { ...r.config.budgets,
        ...(r.phase === "act" ? { act_ms: milliseconds } : { pick_ms: milliseconds }) } } } : r;
      const table = context ? await this.engine.evaluate(bounded)
        : await withIndependentDecisionBudget("V6_projection", "direction", milliseconds, "L2", () => this.engine.evaluate(r));
      if (expired()) return null;
      if (table) this.record(env, bounded, table);
      return table;
    } finally { release(); }
  }
  /** Only the loop's existing idle boundary drives preparation, with no timer or extra pool. */
  async precompute(env: DecisionEnv, idleMs: number): Promise<V6ProjectionTable | null> {
    if (v6Config().mode === "off" || env.state.in_combat || idleMs <= 0) return null;
    if (this.pending) return this.pending;
    if (this.cardPending) { await this.cardPending; return null; }
    // Alternate with the existing room/act cache, rather than starving the other consumers.
    if (this.card && v6Config().deciders.card === "jev" && this.nextIdleCard) {
      this.nextIdleCard = false;
      await this.startCardBackground(env, idleMs);
      return null;
    }
    this.nextIdleCard = true;
    this.pending = (async () => {
      const r = await this.request(env, "pick"); if (!r) return null;
      const bounded = { ...r, config: { ...r.config, budgets: { ...r.config.budgets, pick_ms: Math.min(r.config.budgets.pick_ms, idleMs) } } };
      this.idle.schedule(bounded);
      const result = await withIndependentDecisionBudget("V6_precompute", "routine", bounded.config.budgets.pick_ms, "L2",
        () => this.idle.runIdle({ contextDigest: r.contextDigest, isIdle: true, available_ms: idleMs }));
      const table = result.status === "computed" ? result.table! : null;
      if (table) this.record(env, bounded, table);
      return table;
    })();
    try { return await this.pending; } finally { this.pending = null; }
  }
  /** Called during an existing model wait; an isolated budget cannot pause or debit that model's allowance. */
  startCardBackground(env: DecisionEnv, idleMs: number): Promise<void> {
    if (!this.card || v6Config().mode === "off" || idleMs <= 0) return Promise.resolve();
    if (this.cardPending) return this.cardPending;
    const allowance = Math.min(idleMs, v6Config().budgets.pick_ms), controller = new AbortController();
    this.cardAbort = controller;
    const work = withDecisionBudget(new DecisionBudget("V6_core_cache", "routine", () => performance.now(), allowance, 0), async () => {
      const release = await this.idle.acquireForeground();
      const started = performance.now();
      let fingerprint: string | null = null, preparation = 0, error: string | undefined;
      try {
        if (controller.signal.aborted) return;
        const input = await this.cardRequest(env, true); preparation = performance.now() - started;
        if (!input) return;
        fingerprint = input.context.fingerprint;
        await this.card!.engine.precompute(input.request, input.context, Math.max(0, allowance - preparation), controller.signal);
      } catch (cause) { error = String(cause).slice(0, 240); }
      finally {
        release();
        if (this.card?.recordBackground) {
          const rows = fingerprint ? this.card.engine.peekCompletedCore(fingerprint) ?? [] : [];
          this.card.recordBackground(env, { fingerprint, elapsed_ms: performance.now() - started, preparation_ms: preparation,
            allowance_ms: allowance, aborted: controller.signal.aborted, rows: rows.length,
            sampled_rows: rows.filter(row => row.samples >= 2).length,
            unknown_reasons: rows.reduce<Record<string, number>>((counts, row) => {
              for (const reason of new Set(row.unknown_reasons)) counts[reason] = (counts[reason] ?? 0) + 1;
              return counts;
            }, {}), ...(error ? { error } : {}) });
        }
      }
    }).catch(() => { /* Missing evidence or failed background work never blocks the foreground choice. */ });
    this.cardPending = work;
    void work.finally(() => { if (this.cardPending === work) { this.cardPending = null; this.cardAbort = null; } });
    return work;
  }
  /** The original request starts first. Its completion cancels unused background allowance, without joining it. */
  async duringModelWait<T>(env: DecisionEnv, result: Promise<T>): Promise<T> {
    void this.startCardBackground(env, v6Config().budgets.pick_ms);
    const controller = this.cardAbort;
    try { return await result; }
    finally { controller?.abort(); }
  }
}
/** Off mode does not allocate a runner or read any V6 files. */
export function productionV6Projection(runner?: DeckSimRunner, runPlanLog?: string): V6ProjectionRuntime | undefined {
  if (v6Config().mode === "off") return undefined;
  const input = v6ProjectionInputs(undefined, undefined, row => {
    const directory = runPlanLog ? dirname(runPlanLog) : join(PROJECT_ROOT, "logs");
    mkdirSync(directory, { recursive: true });
    appendJsonLine(join(directory, "v6-history-snapshots.jsonl"), { schema: "v6-history-snapshot-v1", ...row });
  });
  return new V6ProjectionRuntime(new V6ProjectionEngine(runner ?? new SerialDeckRunner()), async (env, phase) => {
    const context = await input(env, phase); if (!context) return null;
    const result = context.factory.create(context.situation);
    return result.status === "ready" ? result.request : null;
  }, (env, r, table) => {
    const character = validate(characterSchema, r.character); if (!character.ok) return;
    const context = { ts: new Date().toISOString(), run_id: str(env.state.raw.run_id), character: character.value,
      question_id: `projection_${r.phase}_${env.state.run?.floor ?? 0}_${r.contextDigest.slice(0, 16)}`, stage: "projection" as const, triggers: [] };
    v6ProjectionLog(r.config, table, context, new V6BuildLog(r.config, runPlanLog ? join(dirname(runPlanLog), "v6-build.jsonl") : undefined));
  }, input, { engine: new V6CardResultsEngine(runner ?? new SerialDeckRunner()), context: cardResultsContext,
    recordBackground(env, event) {
      const directory = runPlanLog ? dirname(runPlanLog) : join(PROJECT_ROOT, "logs");
      mkdirSync(directory, { recursive: true });
      appendJsonLine(join(directory, "v6-core-cache.jsonl"), { ts: new Date().toISOString(), run_id: str(env.state.raw.run_id),
        floor: env.state.run?.floor, ...event });
    }, record(env, table) {
      const directory = runPlanLog ? dirname(runPlanLog) : join(PROJECT_ROOT, "logs");
      mkdirSync(directory, { recursive: true });
      appendJsonLine(join(directory, "v6-card-results.jsonl"), { ts: new Date().toISOString(), run_id: str(env.state.raw.run_id),
        floor: env.state.run?.floor, table });
    } });
}

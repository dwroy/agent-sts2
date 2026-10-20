import type { DecisionEnv } from "../memory/types.js";
import { SerialDeckRunner, type DeckSimRunner } from "../sim/build-sim-pool.js";
import { V6ProjectionEngine, type V6ProjectionRequest, type V6ProjectionTable } from "../sim/v6-projection.js";
import { V6IdlePrecomputer } from "../sim/v6-precompute.js";
import { v6Config } from "./config.js";
import { v6ProjectionInputs, type V6ProjectionInput } from "./projection-input.js";
import { currentDecisionBudget, withIndependentDecisionBudget } from "../core/decision-budget.js";
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
import { currentBossKnown } from "./target-values.js";
import { copyV6Table } from "../sim/v6-table-copy.js";

export interface V6ProjectionEvaluationContext { budget_ms: number; signal: AbortSignal }

/** The provider owns frozen evidence/model versions; this boundary owns live scheduling only. */
export class V6ProjectionRuntime {
  private idle: V6IdlePrecomputer;
  private tables = new Map<string, V6ProjectionTable>();
  private pending: Promise<V6ProjectionTable | null> | null = null;
  constructor(private engine: Pick<V6ProjectionEngine, "evaluate" | "precompute">,
    private request: (env: DecisionEnv, phase: "act" | "pick", idleCombat?: boolean) => Promise<V6ProjectionRequest | null>,
    private record: (env: DecisionEnv, request: V6ProjectionRequest, table: V6ProjectionTable) => void = () => {},
    private input?: (env: DecisionEnv, phase: "act" | "pick") => Promise<V6ProjectionInput | null>) { this.idle = new V6IdlePrecomputer(engine); }
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
    // External room requests already own their allowance; waiting must not replenish it.
    const release = await this.idle.acquireForeground();
    try {
      if (expired()) return null;
      const r = await request();
      if (!r || r.config.mode === "off" || expired()) return null;
      const cacheKey = v6Digest([r.contextDigest, r.modelVersion, r.phase, r.seed, r.weights,
        [r.baseline, ...r.options].map(o => [o.id, o.state, o.preparationKey]), r.targets,
        r.directions.map(d => [d.id, d.signature]), r.idealOverrides, r.appearedCards, { ...r.config, budgets: undefined }]);
      const cached = this.tables.get(cacheKey);
      if (cached) {
        const hit = copyV6Table(cached);
        hit.telemetry = { ...hit.telemetry, elapsed_ms: 0, simulations: 0, cache_hits: hit.telemetry.cache_hits + 1 };
        this.record(env, r, hit); return hit;
      }
      const milliseconds = Math.min(remaining(), r.phase === "act" ? r.config.budgets.act_ms : r.config.budgets.pick_ms);
      const foreground = { ...r, ...(r.phase === "pick" ? { currentBossFirst: true } : {}) };
      const bounded = context ? { ...foreground, config: { ...r.config, budgets: { ...r.config.budgets,
        ...(r.phase === "act" ? { act_ms: milliseconds } : { pick_ms: milliseconds }) } } } : foreground;
      const table = context ? await this.engine.evaluate(bounded)
        : await withIndependentDecisionBudget("V6_projection", "direction", milliseconds, "L2", () => this.engine.evaluate(bounded));
      if (context?.signal.aborted) return null;
      if (table) {
        // Include resources, offers, route and brain weights; later unknown targets
        // must not invalidate an otherwise usable current-Boss table.
        const selectable = [r.baseline, ...r.options], known = selectable.filter(o => currentBossKnown(table, o.id)).length;
        if (table.enabled && known >= 2 && known / selectable.length >= r.config.min_known_option_ratio) {
          this.tables.set(cacheKey, copyV6Table(table));
          while (this.tables.size > 8) this.tables.delete(this.tables.keys().next().value!);
        }
        this.record(env, bounded, table);
      }
      return table;
    } finally { release(); }
  }
  /** Only the loop's existing idle boundary drives preparation, with no timer or extra pool. */
  async precompute(env: DecisionEnv, idleMs: number): Promise<V6ProjectionTable | null> {
    if (v6Config().mode === "off" || idleMs <= 0) return null;
    if (this.pending) return this.pending;
    this.pending = (async () => {
      const r = await this.request(env, "pick", true); if (!r) return null;
      const bounded = { ...r, config: { ...r.config, budgets: { ...r.config.budgets, pick_ms: Math.min(r.config.budgets.pick_ms, idleMs) } } };
      this.idle.schedule(bounded);
      const result = await withIndependentDecisionBudget("V6_precompute", "routine", bounded.config.budgets.pick_ms, "L2",
        () => this.idle.runIdle({ contextDigest: r.contextDigest, isIdle: true, available_ms: idleMs }));
      const table = result.status === "computed" ? result.table! : null;
      if (table) {
        // New idle results can complete optional targets. Do not let a usable
        // foreground snapshot hide that progress for the rest of the floor.
        this.tables.clear();
        this.record(env, bounded, table);
      }
      return table;
    })();
    try { return await this.pending; } finally { this.pending = null; }
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
  return new V6ProjectionRuntime(new V6ProjectionEngine(runner ?? new SerialDeckRunner()), async (env, phase, idleCombat) => {
    const context = await input(env, phase, idleCombat); if (!context) return null;
    const result = context.factory.create(context.situation);
    return result.status === "ready" ? result.request : null;
  }, (env, r, table) => {
    const character = validate(characterSchema, r.character); if (!character.ok) return;
    const context = { ts: new Date().toISOString(), run_id: str(env.state.raw.run_id), character: character.value,
      question_id: `projection_${r.phase}_${env.state.run?.floor ?? 0}_${r.contextDigest.slice(0, 16)}`, stage: "projection" as const, triggers: [] };
    v6ProjectionLog(r.config, table, context, new V6BuildLog(r.config, runPlanLog ? join(dirname(runPlanLog), "v6-build.jsonl") : undefined));
  }, input);
}

import type { DecisionEnv } from "../memory/types.js";
import { SerialDeckRunner, type DeckSimRunner } from "../sim/build-sim-pool.js";
import { V6ProjectionEngine, type V6ProjectionRequest, type V6ProjectionTable } from "../sim/v6-projection.js";
import { V6IdlePrecomputer } from "../sim/v6-precompute.js";
import { v6Config } from "./config.js";
import { v6ProjectionInputs, type V6ProjectionInput } from "./projection-input.js";
import { withIndependentDecisionBudget } from "../core/decision-budget.js";
import { dirname, join } from "node:path";
import { v6ProjectionLog } from "../sim/v6-projection-log.js";
import { V6BuildLog } from "./log.js";
import { str } from "../core/util/json.js";
import { characterSchema } from "./formats.js";
import { validate } from "./schema.js";

/** The provider owns frozen evidence/model versions; this boundary owns live scheduling only. */
export class V6ProjectionRuntime {
  private idle: V6IdlePrecomputer;
  private pending: Promise<V6ProjectionTable | null> | null = null;
  constructor(private engine: Pick<V6ProjectionEngine, "evaluate" | "precompute">,
    private request: (env: DecisionEnv, phase: "act" | "pick") => Promise<V6ProjectionRequest | null>,
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
  async evaluateRequest(env: DecisionEnv, request: V6ProjectionRequest): Promise<V6ProjectionTable | null> {
    return this.foreground(env, async () => request);
  }
  private async foreground(env: DecisionEnv, request: () => Promise<V6ProjectionRequest | null>): Promise<V6ProjectionTable | null> {
    if (v6Config().mode === "off" || env.state.in_combat) return null;
    this.idle.invalidate();
    // Waiting for an old bounded idle task must not consume the new question's compute allowance.
    const release = await this.idle.acquireForeground();
    try {
      const r = await request();
      if (!r || r.config.mode === "off") return null;
      const table = await withIndependentDecisionBudget("V6_projection", "direction", r.phase === "act" ? r.config.budgets.act_ms : r.config.budgets.pick_ms, "L2", () => this.engine.evaluate(r));
      if (table) this.record(env, r, table);
      return table;
    } finally { release(); }
  }
  /** Only the loop's existing idle boundary drives preparation, with no timer or extra pool. */
  async precompute(env: DecisionEnv, idleMs: number): Promise<V6ProjectionTable | null> {
    if (v6Config().mode === "off" || env.state.in_combat || idleMs <= 0) return null;
    if (this.pending) return this.pending;
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
}
/** Off mode does not allocate a runner or read any V6 files. */
export function productionV6Projection(runner?: DeckSimRunner, runPlanLog?: string): V6ProjectionRuntime | undefined {
  if (v6Config().mode === "off") return undefined;
  const input = v6ProjectionInputs();
  return new V6ProjectionRuntime(new V6ProjectionEngine(runner ?? new SerialDeckRunner()), async (env, phase) => {
    const context = await input(env, phase); if (!context) return null;
    const result = context.factory.create(context.situation);
    return result.status === "ready" ? result.request : null;
  }, (env, r, table) => {
    const character = validate(characterSchema, r.character); if (!character.ok) return;
    const context = { ts: new Date().toISOString(), run_id: str(env.state.raw.run_id), character: character.value,
      question_id: `projection_${r.phase}_${env.state.run?.floor ?? 0}_${r.contextDigest.slice(0, 16)}`, stage: "projection" as const, triggers: [] };
    v6ProjectionLog(r.config, table, context, new V6BuildLog(r.config, runPlanLog ? join(dirname(runPlanLog), "v6-build.jsonl") : undefined));
  }, input);
}

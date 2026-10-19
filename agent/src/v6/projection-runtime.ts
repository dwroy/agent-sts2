import type { DecisionEnv } from "../memory/types.js";
import type { V6ProjectionEngine, V6ProjectionRequest, V6ProjectionTable } from "../sim/v6-projection.js";
import { v6Config } from "./config.js";
import { withIndependentDecisionBudget } from "../core/decision-budget.js";

/** The provider owns frozen evidence/model versions; this boundary owns live scheduling only. */
export class V6ProjectionRuntime {
  private pending: Promise<V6ProjectionTable | null> | null = null;
  constructor(private engine: Pick<V6ProjectionEngine, "evaluate" | "precompute">,
    private request: (env: DecisionEnv, phase: "act" | "pick") => Promise<V6ProjectionRequest | null>) {}
  async evaluate(env: DecisionEnv, phase: "act" | "pick"): Promise<V6ProjectionTable | null> {
    if (v6Config().mode === "off" || env.state.in_combat) return null;
    if (this.pending) await this.pending;
    const r = await this.request(env, phase);
    return r ? withIndependentDecisionBudget("V6_projection", "direction", phase === "act" ? r.config.budgets.act_ms : r.config.budgets.pick_ms, "L2", () => this.engine.evaluate(r)) : null;
  }
  /** Poll/transition preparation uses only the exact observed resources and caller's frozen key. */
  async precompute(env: DecisionEnv, idleMs: number): Promise<V6ProjectionTable | null> {
    if (v6Config().mode === "off" || env.state.in_combat || idleMs <= 0) return null;
    if (this.pending) return this.pending;
    const r = await this.request(env, "pick"); if (!r) return null;
    const bounded = { ...r, config: { ...r.config, budgets: { ...r.config.budgets, pick_ms: Math.min(r.config.budgets.pick_ms, idleMs) } } };
    this.pending = withIndependentDecisionBudget("V6_precompute", "routine", bounded.config.budgets.pick_ms, "L2", () => this.engine.precompute(bounded));
    try { return await this.pending; } finally { this.pending = null; }
  }
}

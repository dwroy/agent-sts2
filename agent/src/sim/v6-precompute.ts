/** Caller-driven idle work. No timer, game advancement, model request or background polling. */
import { v6Digest } from "./v6-completion.js";
import type { V6ProjectionEngine, V6ProjectionRequest, V6ProjectionTable } from "./v6-projection.js";
export type V6IdleResult = { status: "idle" | "busy" | "disabled" | "stale" | "computed" | "discarded";
  key?: string; table?: V6ProjectionTable };
type Job = { key: string; request: V6ProjectionRequest; generation: number };
export class V6IdlePrecomputer {
  private pending: Job | null = null;
  private active: Promise<V6IdleResult> | null = null;
  private foreground = 0;
  private generation = 0;
  constructor(private readonly engine: Pick<V6ProjectionEngine, "precompute">) {}
  /** Replace obsolete queued work. The active job remains bounded by its existing computation budget. */
  schedule(request: V6ProjectionRequest): "queued" | "disabled" {
    this.generation++;
    if (request.config.mode === "off") { this.pending = null; return "disabled"; }
    const { prepare, cachedPreparation, trust, completionSources, directions, ...data } = request;
    // Direction metrics are immutable run-start evidence, shared with foreground work.
    const snapshot = { ...structuredClone(data), options: [], directions, prepare, cachedPreparation, trust, completionSources: [...completionSources] };
    const key = v6Digest({ ...snapshot, directions: directions.map(d => [d.id, d.signature]), prepare: undefined, trust: undefined,
      completionSources: snapshot.completionSources.map(s => [s.kind, s.signature]) });
    this.pending = { key, request: snapshot, generation: this.generation }; return "queued";
  }
  invalidate(): void { this.generation++; this.pending = null; }
  get running(): boolean { return this.active !== null; }
  /** The caller awaits this lease before evaluating a foreground question on the same engine/pool. */
  async acquireForeground(): Promise<() => void> {
    this.foreground++;
    try { if (this.active) await this.active.catch(() => undefined); }
    catch (error) { this.foreground--; throw error; }
    let released = false;
    return () => { if (!released) { released = true; this.foreground--; } };
  }
  /** Called at an existing idle boundary with enough time for the ordinary bounded evaluation budget. */
  async runIdle(context: { contextDigest: string; isIdle: boolean; available_ms: number }): Promise<V6IdleResult> {
    if (!context.isIdle || this.foreground || this.active) return { status: "busy" };
    const job = this.pending; if (!job) return { status: "idle" };
    if (job.request.config.mode === "off") { this.pending = null; return { status: "disabled" }; }
    if (job.request.contextDigest !== context.contextDigest) { this.pending = null; return { status: "stale", key: job.key }; }
    const budget = job.request.phase === "act" ? job.request.config.budgets.act_ms : job.request.config.budgets.pick_ms;
    if (!Number.isFinite(context.available_ms) || context.available_ms < budget) return { status: "busy", key: job.key };
    this.pending = null;
    const active = Promise.resolve().then(async (): Promise<V6IdleResult> => {
      const table = await this.engine.precompute(job.request);
      if (job.generation !== this.generation) return { status: "discarded", key: job.key };
      // The next existing idle boundary continues cached absolute samples. Never spin or
      // retry permanent missing evidence, and never overwrite a newer snapshot.
      if (table?.telemetry?.pending_work && !this.pending) this.pending = job;
      return { status: "computed", key: job.key, table };
    });
    this.active = active;
    try { return await active; } finally { if (this.active === active) this.active = null; }
  }
}

/** The room caller supplies changes only; W3 owns history, route projection, pairing and simulation. */
import type { V6ProjectionFactory, V6ProjectionSituation } from "../../sim/v6-request-factory.js";
import type { V6ProjectionEngine, V6ProjectionRequest, V6ProjectionTable } from "../../sim/v6-projection.js";
import { currentDecisionBudget } from "../../core/decision-budget.js";
import type { DecisionEnv } from "../../memory/types.js";
import { v6RoomActive, type V6RoomOptions } from "./v6-room-options.js";
import type { V6RoomProjection } from "./v6-room.js";

export type V6RoomSituation = (env: DecisionEnv, input: V6RoomOptions) =>
  Omit<V6ProjectionSituation, "state" | "phase" | "options" | "baselineId">;
export interface V6RoomProjectionBinding {
  factory: V6ProjectionFactory;
  situation: ReturnType<V6RoomSituation>;
}
type EvaluationContext = { budget_ms: number; signal: AbortSignal };
/** A structural boundary keeps the room caller independent of the production snapshot loader. */
export interface V6RoomRuntime {
  context(env: DecisionEnv, phase: "pick"): Promise<V6RoomProjectionBinding | null>;
  evaluateRequest(env: DecisionEnv, request: V6ProjectionRequest, context: EvaluationContext): Promise<V6ProjectionTable | null>;
}
export function runtimeV6RoomProjection(runtime: V6RoomRuntime): V6RoomProjection {
  return (env, input, context) => bindV6RoomProjection(actual => runtime.context(actual, "pick"),
    (request, limits) => runtime.evaluateRequest(env, request, limits))(env, input, context);
}
/** The common production provider owns the run snapshot, live route and foreground lease. */
export function bindV6RoomProjection(
  source: (env: DecisionEnv) => V6RoomProjectionBinding | null | Promise<V6RoomProjectionBinding | null>,
  evaluate: (request: V6ProjectionRequest, context: EvaluationContext) => Promise<V6ProjectionTable | null>,
): V6RoomProjection {
  return async (env, input, context) => {
    if (!v6RoomActive(env, input.kind) || context.signal.aborted) return null;
    const budget = currentDecisionBudget(), now = budget?.now ?? (() => performance.now()), started = now();
    const remaining = () => Math.max(0, Math.min(context.budget_ms - (now() - started), budget?.remaining() ?? Infinity));
    if (remaining() <= 0) return null;
    const local = input.options.filter(o => !o.changes).map(o => ({ id: o.option.key, reason: o.unknown_reason ?? "inventory_change_not_modeled" }));
    const binding = await source(env);
    if (context.signal.aborted || remaining() <= 0) return null;
    if (!binding) return { table: null, reason: "projection_context_unavailable", labels: [], rejected_options: local };
    const result = binding.factory.create({ ...binding.situation, state: env.state, phase: "pick", baselineId: "__room_baseline__",
      options: input.options.flatMap(o => o.changes ? [{ id: o.option.key, changes: o.changes }] : []) });
    if (result.status !== "ready") return { table: null, reason: result.reason, labels: [], rejected_options: local };
    if (context.signal.aborted || remaining() <= 0) return null;
    const milliseconds = Math.min(remaining(), result.request.config.budgets.pick_ms);
    const request = { ...result.request, config: { ...result.request.config, budgets: {
      ...result.request.config.budgets, pick_ms: milliseconds } } };
    const table = await evaluate(request, { budget_ms: milliseconds, signal: context.signal });
    if (context.signal.aborted) return null;
    return { table, reason: table ? "ready" : "projection_evaluation_unavailable", labels: result.labels, rejected_options: [...local, ...result.rejected_options] };
  };
}

/** Fixed snapshots remain injectable in tests and tools; production binds the common run provider. */
export function createV6RoomProjection(factory: V6ProjectionFactory, engine: Pick<V6ProjectionEngine, "evaluate">,
  situation: V6RoomSituation): V6RoomProjection {
  return (env, input, context) => bindV6RoomProjection(() => ({ factory, situation: situation(env, input) }),
    request => engine.evaluate(request))(env, input, context);
}

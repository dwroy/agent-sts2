import type { DirectionWeights, ProjectionEntry } from "./formats.js";
import { v6Config, type V6Config } from "./config.js";

export type ReplanTrigger = "act_start" | "T1" | "T2" | "T3" | "T4" | "T5" | "T6" | "T7";
/** A paired comparison between directions, not the take-minus-skip pair in ProjectionEntry. */
export interface DirectionComparison {
  direction: string; leader: string; mean: number; se: number; n: number;
  offeredCore?: boolean;
}
export interface DirectionEvaluation {
  id: string;
  entries: ProjectionEntry[];
  comparisons?: DirectionComparison[];
  coreCompletion?: Record<string, number | null>;
  acquiredComponentIds?: string[];
  pivotMatched?: boolean;
  /** Supplied by the existing route projection. Null means no calibrated hazard assessment. */
  bossEntryHp?: number | null;
  hazardHp?: number | null;
  consecutiveJevFallbacks?: number;
}
export interface ReplanState {
  run: string; act: number; calls: number; lastEvaluation?: string;
  streaks: Record<string, number>; lastTurn?: string;
}
export interface TriggerResult { triggers: ReplanTrigger[]; merged: ReplanTrigger[]; skipped: ReplanTrigger[]; ask: boolean }
export function freshReplanState(run: string): ReplanState { return { run, act: 0, calls: 0, streaks: {} }; }
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Mutates only this run's scheduler. Re-polling a frozen evaluation never advances T2. */
export function detectReplan(s: ReplanState, input: {
  act: number; floor: number; turnKey: string; plan?: DirectionWeights;
  evaluation: DirectionEvaluation; requirementIds: ReadonlySet<string>;
}, config: V6Config = v6Config()): TriggerResult {
  const { evaluation: e, plan } = input;
  const triggers: ReplanTrigger[] = [];
  if (s.act !== input.act) triggers.push("act_start");
  const leader = plan && Object.keys(plan.direction_weights).sort((a, b) => plan.direction_weights[b]! - plan.direction_weights[a]! || a.localeCompare(b))[0];
  const completion = leader ? e.coreCompletion?.[leader] : null;
  if (finite(completion) && completion >= 0 && completion < config.triggers.t1_core_min) triggers.push("T1");
  const fresh = s.lastEvaluation !== e.id;
  const next: Record<string, number> = {};
  for (const p of e.comparisons ?? []) {
    if (!plan || p.leader !== leader || p.direction === leader || !Object.hasOwn(plan.direction_weights, p.direction)
      || !finite(p.mean) || !finite(p.se) || p.se < 0 || !Number.isInteger(p.n) || p.n < 2
      || p.mean <= Math.max(config.triggers.t2_se * p.se, config.triggers.t2_min_delta)) continue;
    const key = `${p.leader}:${p.direction}`;
    next[key] = fresh ? (s.streaks[key] ?? 0) + 1 : s.streaks[key] ?? 0;
    if (next[key]! >= config.triggers.t2_consecutive && !triggers.includes("T2")) triggers.push("T2");
    if (p.offeredCore && plan.direction_weights[p.direction]! < config.triggers.t3_weight_max && !triggers.includes("T3")) triggers.push("T3");
  }
  if (fresh) { s.streaks = next; s.lastEvaluation = e.id; }
  if (e.pivotMatched || e.acquiredComponentIds?.some(id => input.requirementIds.has(id))) triggers.push("T4");
  if (finite(e.bossEntryHp) && finite(e.hazardHp) && e.bossEntryHp < e.hazardHp) triggers.push("T5");
  const unknown = e.entries.filter(p => p.trust === "unknown").length;
  if ((e.entries.length > 0 && unknown / e.entries.length > config.triggers.t6_unknown_max)
    || (e.consecutiveJevFallbacks ?? 0) >= config.triggers.t6_fallbacks) triggers.push("T6");
  if (plan && input.floor >= plan.checkpoint) triggers.push("T7");
  const capped = s.calls >= config.budgets.brain_soft_cap;
  const eligible = triggers.filter(t => !capped || ["act_start", "T5", "T7"].includes(t));
  const duplicateTurn = s.lastTurn === input.turnKey;
  return { triggers, merged: eligible.slice(1), skipped: triggers.filter(t => !eligible.includes(t) || duplicateTurn), ask: eligible.length > 0 && !duplicateTurn };
}
/** Reserve before the request: errors still consume a call and cannot cause a polling storm. */
export function reserveReplan(s: ReplanState, act: number, turnKey: string): void {
  s.calls++; s.act = act; s.lastTurn = turnKey;
}
